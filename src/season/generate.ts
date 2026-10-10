import { teamStrength } from '../data/builders'
import { TOURNAMENTS } from '../data/tournaments'
import { Rng } from '../engine/rng'
import type { MatchFormat, Team, TournamentDef } from '../types'
import { addDays, daysBetween as daysBetweenISO, daysInYear, endOfYear, startOfYear } from './dates'
import type { Difficulty } from '../engine/types'
import type { Competition, Fixture, PlayerShift, Season, Slot } from './types'

/**
 * Builds a whole year of cricket. Each tournament (founded by one team) takes a balanced share
 * of the teams; afterwards, every pair of teams that hasn't met is given a short bilateral
 * series, so by December everyone has played everyone. Dates are packed so a team never
 * plays on consecutive days and the calendar stays busy without long gaps.
 */

const TEAMS_PER_TOURNAMENT = 8
const SPARE_DAYS_AT_END = 24

interface Limits { globalPerDay: number; compPerDay: number }
const LIMIT_STEPS: Limits[] = [
  { globalPerDay: 6, compPerDay: 3 },
  { globalPerDay: 8, compPerDay: 4 },
  { globalPerDay: 14, compPerDay: 6 },
  { globalPerDay: 40, compPerDay: 20 },
]

const team = (teamId: string): Slot => ({ kind: 'team', teamId })

class Calendar {
  private busy = new Map<string, Set<string>>()
  private perDay = new Map<string, number>()
  private compDay = new Map<string, number>()
  private readonly limits: Limits
  private readonly last: string
  constructor(limits: Limits, last: string) {
    this.limits = limits
    this.last = last
  }

  private free(date: string, teams: string[]): boolean {
    for (const off of [-1, 0, 1]) {
      const set = this.busy.get(addDays(date, off))
      if (set && teams.some((t) => set.has(t))) return false
    }
    return true
  }

  /** Middle of the longest stretch of days with no matches between `from` and `to`. */
  midOfLargestGap(from: string, to: string): string {
    const days = [...this.perDay.keys()].filter((d) => d >= from && d <= to).sort()
    const edges = [addDays(from, -1), ...days, addDays(to, 1)]
    let best = { start: edges[0], len: 0 }
    for (let i = 1; i < edges.length; i++) {
      const len = daysBetweenISO(edges[i - 1], edges[i])
      if (len > best.len) best = { start: edges[i - 1], len }
    }
    return addDays(best.start, Math.max(1, Math.floor(best.len / 2)))
  }

  firstFit(from: string, teams: string[], compId: string): string | null {
    for (let d = from; d <= this.last; d = addDays(d, 1)) {
      if ((this.perDay.get(d) ?? 0) >= this.limits.globalPerDay) continue
      if ((this.compDay.get(`${compId}|${d}`) ?? 0) >= this.limits.compPerDay) continue
      if (!this.free(d, teams)) continue
      return d
    }
    return null
  }

  book(date: string, teams: string[], compId: string) {
    const set = this.busy.get(date) ?? new Set<string>()
    teams.forEach((t) => set.add(t))
    this.busy.set(date, set)
    this.perDay.set(date, (this.perDay.get(date) ?? 0) + 1)
    this.compDay.set(`${compId}|${date}`, (this.compDay.get(`${compId}|${date}`) ?? 0) + 1)
  }
}

function roundRobin(ids: string[]): [string, string][][] {
  const list: (string | null)[] = [...ids]
  if (list.length % 2) list.push(null)
  const n = list.length
  const rounds: [string, string][][] = []
  for (let r = 0; r < n - 1; r++) {
    const round: [string, string][] = []
    for (let i = 0; i < n / 2; i++) {
      const a = list[i]
      const b = list[n - 1 - i]
      if (a && b) round.push(r % 2 ? [b, a] : [a, b])
    }
    rounds.push(round)
    list.splice(1, 0, list.pop() as string | null) // rotate everything except the first
  }
  return rounds
}

interface Plan {
  comp: Competition
  /** Fixtures in stages. Each stage must finish before the next begins. */
  stages: Fixture[][]
  desiredStart: string
}

const fx = (comp: { id: string; format: MatchFormat }, n: number, stage: string, phase: Fixture['phase'], group: string | null, home: Slot, away: Slot): Fixture => ({
  id: `${comp.id}:${n}`,
  date: '',
  format: comp.format,
  competitionId: comp.id,
  stage,
  phase,
  group,
  homeRef: home,
  awayRef: away,
  homeId: home.kind === 'team' ? home.teamId : null,
  awayId: away.kind === 'team' ? away.teamId : null,
})

function buildTournament(def: TournamentDef, participants: string[], strength: Map<string, number>, desiredStart: string, rng: Rng): Plan {
  const sorted = [...participants].sort((a, b) => (strength.get(b) ?? 0) - (strength.get(a) ?? 0))
  const kind = def.kind === 'cup' && participants.length !== 8 ? 'league' : def.kind
  const base = { id: def.id, format: def.format }
  const comp: Competition = {
    id: def.id, name: def.name, kind, format: def.format, originTeamId: def.originTeamId,
    teamIds: participants, groups: null, blurb: def.blurb, startDate: '', endDate: '',
  }
  let n = 0
  const stages: Fixture[][] = []
  const rank = (group: string | null, r: number): Slot => ({ kind: 'rank', competitionId: def.id, group, rank: r })

  if (kind === 'league') {
    const shuffled = rng.shuffle([...participants])
    const rounds = roundRobin(shuffled)
    stages.push(rounds.flatMap((round, ri) => round.map(([a, b]) => fx(base, n++, `Round ${ri + 1}`, 'league', null, team(a), team(b)))))
    if (participants.length >= 4) {
      const sf1 = fx(base, n++, 'Semi-final 1', 'knockout', null, rank(null, 1), rank(null, 4))
      const sf2 = fx(base, n++, 'Semi-final 2', 'knockout', null, rank(null, 2), rank(null, 3))
      stages.push([sf1, sf2])
      stages.push([fx(base, n++, 'Final', 'knockout', null, { kind: 'winner', of: sf1.id }, { kind: 'winner', of: sf2.id })])
    }
  } else if (kind === 'cup') {
    const groups: Record<string, string[]> = { A: [], B: [] }
    sorted.forEach((id, i) => groups[i % 4 === 0 || i % 4 === 3 ? 'A' : 'B'].push(id))
    comp.groups = groups
    const gStage: Fixture[] = []
    const perGroup = Object.entries(groups).map(([g, ids]) => ({ g, rounds: roundRobin(rng.shuffle([...ids])) }))
    for (let r = 0; r < 3; r++) {
      for (const { g, rounds } of perGroup) for (const [a, b] of rounds[r]) gStage.push(fx(base, n++, `Group ${g}`, 'group', g, team(a), team(b)))
    }
    stages.push(gStage)
    const sf1 = fx(base, n++, 'Semi-final 1', 'knockout', null, rank('A', 1), rank('B', 2))
    const sf2 = fx(base, n++, 'Semi-final 2', 'knockout', null, rank('B', 1), rank('A', 2))
    stages.push([sf1, sf2])
    stages.push([fx(base, n++, 'Final', 'knockout', null, { kind: 'winner', of: sf1.id }, { kind: 'winner', of: sf2.id })])
  } else {
    // knockout, seeded 1v8, 4v5, 3v6, 2v7
    comp.teamIds = sorted.slice(0, sorted.length >= 8 ? 8 : 4)
    const pairs: [number, number][] = participants.length >= 8 ? [[0, 7], [3, 4], [2, 5], [1, 6]] : [[0, 3], [1, 2]]
    const first = pairs.map(([a, b], i) => fx(base, n++, participants.length >= 8 ? `Quarter-final ${i + 1}` : `Semi-final ${i + 1}`, 'knockout', null, team(sorted[a]), team(sorted[b])))
    stages.push(first)
    let prev = first
    if (prev.length === 4) {
      const sfs = [0, 1].map((i) => fx(base, n++, `Semi-final ${i + 1}`, 'knockout', null, { kind: 'winner', of: prev[i * 2].id }, { kind: 'winner', of: prev[i * 2 + 1].id }))
      stages.push(sfs)
      prev = sfs
    }
    stages.push([fx(base, n++, 'Final', 'knockout', null, { kind: 'winner', of: prev[0].id }, { kind: 'winner', of: prev[1].id })])
  }
  return { comp, stages, desiredStart }
}

function buildSeries(a: Team, b: Team, format: MatchFormat, desiredStart: string, matches: number): Plan {
  const id = `series-${a.id}-${b.id}`
  const comp: Competition = {
    id, name: `${a.name} v ${b.name} ${format.toUpperCase()} Series`, kind: 'series', format, originTeamId: null,
    teamIds: [a.id, b.id], groups: null, blurb: `A friendly series between ${a.name} and ${b.name}.`, startDate: '', endDate: '',
  }
  const stages = Array.from({ length: matches }, (_, i) => [
    fx({ id, format }, i, `Match ${i + 1} of ${matches}`, 'series', null, team(i % 2 ? b.id : a.id), team(i % 2 ? a.id : b.id)),
  ])
  return { comp, stages, desiredStart }
}

function schedule(plans: Plan[], calendar: Calendar): boolean {
  for (const plan of plans) {
    let floor = plan.desiredStart
    for (const stage of plan.stages) {
      let latest = floor
      for (const f of stage) {
        // A fixture whose teams aren't known yet reserves the date for everyone who could be in it.
        const involved = f.homeId && f.awayId ? [f.homeId, f.awayId] : plan.comp.teamIds
        const date = calendar.firstFit(floor, involved, plan.comp.id)
        if (!date) return false
        calendar.book(date, involved, plan.comp.id)
        f.date = date
        if (date > latest) latest = date
      }
      floor = addDays(latest, 1)
    }
  }
  return true
}

export interface GenerateOptions {
  year: number
  teams: Team[]
  seed: number
  tournaments?: TournamentDef[]
  /** Career mode: your team and how hard the computer plays. */
  myTeamId?: string | null
  difficulty?: Difficulty
  /** Career gains and losses carried over from earlier years. */
  shifts?: Record<string, PlayerShift>
  lineup?: Season['lineup']
}

const structuredCloneShifts = (s: Record<string, PlayerShift>): Record<string, PlayerShift> => JSON.parse(JSON.stringify(s))

export function generateSeason({ year, teams, seed, tournaments = TOURNAMENTS, myTeamId = null, difficulty = 'normal', shifts, lineup }: GenerateOptions): Season {
  if (teams.length < 4) throw new Error('A season needs at least 4 teams.')
  const rng = new Rng(seed)
  const strength = new Map(teams.map((t) => [t.id, teamStrength(t)]))
  const teamById = new Map(teams.map((t) => [t.id, t]))
  const perTournament = Math.min(TEAMS_PER_TOURNAMENT, teams.length - (teams.length % 2))
  const yearDays = daysInYear(year)
  const lastDay = endOfYear(year)

  // Balance: every tournament takes the teams with the fewest guaranteed games so far.
  const guaranteed = new Map(teams.map((t) => [t.id, 0]))
  // Roughly one tournament per team, so a small league of teams isn't buried in fixtures.
  // Tournaments founded by teams that are playing come first.
  const wanted = Math.min(tournaments.length, Math.max(4, teams.length))
  const founders = tournaments.filter((t) => teamById.has(t.originTeamId))
  const others = tournaments.filter((t) => !teamById.has(t.originTeamId))
  const defs = rng.shuffle([...rng.shuffle([...founders]), ...rng.shuffle([...others])].slice(0, wanted))
  const spacing = (yearDays - SPARE_DAYS_AT_END) / Math.max(defs.length, 1)

  const draw = (def: TournamentDef): string[] => {
    const chosen: string[] = []
    if (teamById.has(def.originTeamId)) chosen.push(def.originTeamId)
    const rest = rng.shuffle([...teams.map((t) => t.id)].filter((id) => !chosen.includes(id)))
    rest.sort((a, b) => (guaranteed.get(a) ?? 0) - (guaranteed.get(b) ?? 0))
    for (const id of rest) if (chosen.length < perTournament) chosen.push(id)
    return chosen
  }
  const gamesFor = (kind: TournamentDef['kind'], n: number) => (kind === 'league' ? n - 1 : kind === 'cup' ? 3 : 1)

  // Draw the heavy tournaments (leagues) first so lighter ones can even things out afterwards.
  const drawn = new Map<string, string[]>()
  for (const def of [...defs].sort((a, b) => gamesFor(b.kind, perTournament) - gamesFor(a.kind, perTournament))) {
    const participants = draw(def)
    for (const id of participants) guaranteed.set(id, (guaranteed.get(id) ?? 0) + gamesFor(def.kind, participants.length))
    drawn.set(def.id, participants)
  }
  const tournamentPlans: Plan[] = defs.map((def, i) =>
    buildTournament(def, drawn.get(def.id) as string[], strength, addDays(startOfYear(year), 2 + Math.floor(i * spacing)), rng),
  )

  // Pairs that already meet in a table, group or bracket.
  const met = new Set<string>()
  const key = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`)
  for (const plan of tournamentPlans) {
    for (const stage of plan.stages) for (const f of stage) if (f.homeId && f.awayId) met.add(key(f.homeId, f.awayId))
  }
  const unmet: [Team, Team][] = []
  for (let i = 0; i < teams.length; i++) for (let j = i + 1; j < teams.length; j++) if (!met.has(key(teams[i].id, teams[j].id))) unmet.push([teams[i], teams[j]])
  rng.shuffle(unmet)
  const seriesPlans = unmet.map(([a, b], i) => buildSeries(a, b, i % 2 ? 'odi' : 't20', startOfYear(year), 2))

  const seriesWindowEnd = addDays(lastDay, -SPARE_DAYS_AT_END)
  for (const limits of LIMIT_STEPS) {
    // Fresh copies each attempt, since scheduling writes dates into the fixtures.
    const copy = (p: Plan): Plan => ({ ...p, stages: p.stages.map((st) => st.map((f) => ({ ...f }))) })
    const calendar = new Calendar(limits, lastDay)
    const attempt = tournamentPlans.map(copy)
    if (!schedule(attempt, calendar)) continue
    // Friendly series go wherever the calendar is emptiest.
    let ok = true
    for (const base of seriesPlans) {
      const plan = copy(base)
      plan.desiredStart = calendar.midOfLargestGap(startOfYear(year), seriesWindowEnd)
      if (!schedule([plan], calendar)) { ok = false; break }
      attempt.push(plan)
    }
    if (!ok) continue
    const competitions: Competition[] = []
    const fixtures: Fixture[] = []
    for (const plan of attempt) {
      const all = plan.stages.flat()
      fixtures.push(...all)
      const dates = all.map((f) => f.date).sort()
      competitions.push({ ...plan.comp, startDate: dates[0], endDate: dates[dates.length - 1] })
    }
    fixtures.sort((a, b) => a.date.localeCompare(b.date) || a.competitionId.localeCompare(b.competitionId) || a.id.localeCompare(b.id, undefined, { numeric: true }))
    competitions.sort((a, b) => a.startDate.localeCompare(b.startDate) || a.id.localeCompare(b.id))
    return {
      id: `s${year}-${seed}`,
      year, seed, teamIds: teams.map((t) => t.id), myTeamId: myTeamId && teams.some((t) => t.id === myTeamId) ? myTeamId : null, difficulty, roster: [], competitions, fixtures, results: {}, today: startOfYear(year), graded: true, ...(shifts ? { shifts, startShifts: structuredCloneShifts(shifts) } : {}), ...(lineup ? { lineup } : {}),
    }
  }
  throw new Error('Could not fit the season into the year.')
}
