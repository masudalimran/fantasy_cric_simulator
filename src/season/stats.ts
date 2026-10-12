import { FORMATS } from '../engine/types'
import type { MatchFormat, Team } from '../types'
import type { Fixture, Season } from './types'

export interface Scope {
  competitionId?: string
  format?: MatchFormat
  teamId?: string
}

export interface BatStat {
  id: string
  matches: number
  innings: number
  notOuts: number
  runs: number
  balls: number
  fours: number
  sixes: number
  high: number
  highNotOut: boolean
  fifties: number
  hundreds: number
  ducks: number
  /** In how many matches he batted. (`matches` counts every match he was in the XI for, batting or not.) */
  batApps: number
  /** The longest six he has hit, in metres (0 if none is on record). */
  longSix: number
}

export interface BowlStat {
  id: string
  matches: number
  balls: number
  runs: number
  wickets: number
  maidens: number
  bestW: number
  bestR: number
  fiveW: number
  /** In how many matches he bowled. (`matches` counts every match he was in the XI for.) */
  bowlApps: number
}

export interface PlayerRef {
  id: string
  name: string
  team: Team
}

export const average = (s: BatStat) => (s.innings - s.notOuts > 0 ? s.runs / (s.innings - s.notOuts) : null)
export const strikeRate = (s: BatStat) => (s.balls ? (s.runs / s.balls) * 100 : null)
export const economy = (s: BowlStat) => (s.balls ? (s.runs / s.balls) * 6 : null)
export const bowlAverage = (s: BowlStat) => (s.wickets ? s.runs / s.wickets : null)
export const bowlStrikeRate = (s: BowlStat) => (s.wickets ? s.balls / s.wickets : null)

export interface Collected {
  bat: Map<string, BatStat>
  bowl: Map<string, BowlStat>
  potm: Map<string, number>
  matches: number
  /** Matches each player was in the XI for, whether or not he batted or bowled. */
  played: Map<string, number>
}

const inScope = (f: Fixture, scope: Scope, winnerTeams: (string | null)[]) =>
  (!scope.competitionId || f.competitionId === scope.competitionId) &&
  (!scope.format || f.format === scope.format) &&
  (!scope.teamId || winnerTeams.includes(scope.teamId))

/** Adds up every played match in scope into per-player batting and bowling totals. */
export function collect(season: Season, scope: Scope = {}, ownTeamOf?: (playerId: string) => string | undefined): Collected {
  const bat = new Map<string, BatStat>()
  const bowl = new Map<string, BowlStat>()
  const potm = new Map<string, number>()
  const roster = season.roster ?? []
  const byId = new Map(season.fixtures.map((f) => [f.id, f]))
  const seen = new Map<string, Set<string>>() // matches he was in the XI for
  const batSeen = new Map<string, Set<string>>() // matches he batted in
  const bowlSeen = new Map<string, Set<string>>() // matches he bowled in
  let matches = 0

  const note = (m: Map<string, Set<string>>, id: string, fixtureId: string) => {
    let set = m.get(id)
    if (!set) m.set(id, (set = new Set()))
    set.add(fixtureId)
  }

  for (const res of Object.values(season.results)) {
    const f = byId.get(res.fixtureId)
    if (!f || !inScope(f, scope, [f.homeId, f.awayId])) continue
    matches++
    if (res.playerOfMatchId) potm.set(res.playerOfMatchId, (potm.get(res.playerOfMatchId) ?? 0) + 1)
    // everyone in the XI was in the match (older saves only know about those who batted or bowled)
    for (const i of res.played ?? []) { const id = roster[i]; if (id && !(scope.teamId && ownTeamOf && ownTeamOf(id) !== scope.teamId)) note(seen, id, res.fixtureId) }

    for (const line of res.bat ?? []) {
      const id = roster[line[0]]
      if (!id || (scope.teamId && ownTeamOf && ownTeamOf(id) !== scope.teamId)) continue
      const [, runs, balls, fours, sixes, out] = line
      let s = bat.get(id)
      if (!s) bat.set(id, (s = { id, matches: 0, innings: 0, notOuts: 0, runs: 0, balls: 0, fours: 0, sixes: 0, high: 0, highNotOut: false, fifties: 0, hundreds: 0, ducks: 0, batApps: 0, longSix: 0 }))
      note(seen, id, res.fixtureId); note(batSeen, id, res.fixtureId)
      s.innings++
      if (!out) s.notOuts++
      s.runs += runs; s.balls += balls; s.fours += fours; s.sixes += sixes
      if (runs > s.high || (runs === s.high && !out && !s.highNotOut)) { s.high = runs; s.highNotOut = !out }
      if (runs >= 100) s.hundreds++
      else if (runs >= 50) s.fifties++
      if (runs === 0 && out) s.ducks++
    }
    for (const [i, m] of res.six ?? []) { const id = roster[i]; const s = id ? bat.get(id) : undefined; if (s && m > s.longSix) s.longSix = m }
    for (const line of res.bowl ?? []) {
      const id = roster[line[0]]
      if (!id || (scope.teamId && ownTeamOf && ownTeamOf(id) !== scope.teamId)) continue
      const [, balls, runs, wickets, maidens] = line
      let s = bowl.get(id)
      if (!s) bowl.set(id, (s = { id, matches: 0, balls: 0, runs: 0, wickets: 0, maidens: 0, bestW: 0, bestR: 0, fiveW: 0, bowlApps: 0 }))
      note(seen, id, res.fixtureId); note(bowlSeen, id, res.fixtureId)
      s.balls += balls; s.runs += runs; s.wickets += wickets; s.maidens += maidens
      if (wickets > s.bestW || (wickets === s.bestW && runs < s.bestR)) { s.bestW = wickets; s.bestR = runs }
      if (wickets >= 5) s.fiveW++
    }
  }
  for (const [id, s] of bat) { s.matches = seen.get(id)?.size ?? 0; s.batApps = batSeen.get(id)?.size ?? 0 }
  for (const [id, s] of bowl) { s.matches = seen.get(id)?.size ?? 0; s.bowlApps = bowlSeen.get(id)?.size ?? 0 }
  return { bat, bowl, potm, matches, played: new Map([...seen].map(([id, set]) => [id, set.size])) }
}

export const topBatsmen = (c: Collected, n = 10) => [...c.bat.values()].sort((a, b) => b.runs - a.runs || (strikeRate(b) ?? 0) - (strikeRate(a) ?? 0)).slice(0, n)
export const topBowlers = (c: Collected, n = 10) =>
  [...c.bowl.values()].sort((a, b) => b.wickets - a.wickets || (economy(a) ?? 99) - (economy(b) ?? 99)).slice(0, n)

/** A rough all-round impact score, used for "player of the tournament". */
export function impactPoints(c: Collected, id: string): number {
  const b = c.bat.get(id)
  const w = c.bowl.get(id)
  return (
    (b ? b.runs + b.fours * 0.5 + b.sixes + b.fifties * 10 + b.hundreds * 25 : 0) +
    (w ? w.wickets * 22 + w.maidens * 4 + w.fiveW * 15 : 0) +
    (c.potm.get(id) ?? 0) * 20
  )
}

export function mostValuable(c: Collected, n = 10): { id: string; points: number }[] {
  const ids = new Set([...c.bat.keys(), ...c.bowl.keys()])
  return [...ids].map((id) => ({ id, points: impactPoints(c, id) })).sort((a, b) => b.points - a.points).slice(0, n)
}

// ---- Team records ---------------------------------------------------------

export interface TeamRecord {
  teamId: string
  played: number
  won: number
  lost: number
  tied: number
  titles: number
  /** The finals those titles were won in (fixture ids). */
  titleFixtures: string[]
  /** 2 for a win, 1 for a tie. */
  points: number
  /** Net run rate across every match counted. */
  nrr: number
}

export function teamRecords(season: Season, scope: Scope = {}): TeamRecord[] {
  const rows = new Map<string, TeamRecord>(season.teamIds.map((id) => [id, { teamId: id, played: 0, won: 0, lost: 0, tied: 0, titles: 0, titleFixtures: [], points: 0, nrr: 0 }]))
  const runs = new Map<string, { rf: number; bf: number; ra: number; ba: number }>(season.teamIds.map((id) => [id, { rf: 0, bf: 0, ra: 0, ba: 0 }]))
  const byId = new Map(season.fixtures.map((f) => [f.id, f]))
  for (const res of Object.values(season.results)) {
    const f = byId.get(res.fixtureId)
    if (!f || !f.homeId || !f.awayId || !inScope(f, scope, [f.homeId, f.awayId])) continue
    const quota = FORMATS[f.format].overs * 6
    const sides = [f.homeId, f.awayId]
    for (const [i, id] of sides.entries()) {
      const r = rows.get(id)
      if (!r) continue
      r.played++
      if (res.winnerId === id) { r.won++; r.points += 2 }
      else if (res.winnerId === null) { r.tied++; r.points += 1 }
      else r.lost++
      const me = res.scores[id]
      const opp = res.scores[sides[1 - i]]
      const a = runs.get(id)
      if (a && me && opp) {
        a.rf += me.runs
        a.bf += me.allOut ? quota : me.balls
        a.ra += opp.runs
        a.ba += opp.allOut ? quota : opp.balls
      }
    }
    if (f.stage === 'Final' && res.winnerId) {
      const r = rows.get(res.winnerId)
      if (r) { r.titles++; r.titleFixtures.push(f.id) }
    }
  }
  for (const [id, a] of runs) { const r = rows.get(id); if (r) r.nrr = a.bf && a.ba ? (a.rf / a.bf - a.ra / a.ba) * 6 : 0 }
  // Standings order: most points first; teams level on points are split by net run rate.
  return [...rows.values()].filter((r) => r.played > 0).sort((a, b) => b.points - a.points || b.nrr - a.nrr || a.teamId.localeCompare(b.teamId))
}

// ---- Records --------------------------------------------------------------

export interface RecordEntry {
  label: string
  value: string
  detail: string
  fixtureId: string
  teamId?: string
  playerId?: string
  /** An extra line about the player, e.g. how many of the sixes he hit. */
  playerNote?: string
}

export function seasonRecords(season: Season, scope: Scope = {}): RecordEntry[] {
  const out: RecordEntry[] = []
  const roster = season.roster ?? []
  const byId = new Map(season.fixtures.map((f) => [f.id, f]))
  let high: RecordEntry | null = null, low: RecordEntry | null = null
  let bigRuns: RecordEntry | null = null, tight: RecordEntry | null = null, bigChase: RecordEntry | null = null
  let topScore: RecordEntry | null = null, bestBowl: RecordEntry | null = null, mostSixes: RecordEntry | null = null, longestSix: RecordEntry | null = null
  let longestSixM = 0
  let highSixes = 0, highRuns = -1, bestW = -1, bestR = 1e9, bigRunMargin = -1, tightMargin = 1e9, chaseRuns = -1, lowRuns = 1e9, highTotal = -1
  for (const res of Object.values(season.results)) {
    const f = byId.get(res.fixtureId)
    if (!f || !f.homeId || !f.awayId || !inScope(f, scope, [f.homeId, f.awayId])) continue
    const first = Object.entries(res.scores)
    for (const [teamId, sc] of first) {
      if (sc.runs > highTotal) { highTotal = sc.runs; high = { label: 'Highest team total', value: `${sc.runs}/${sc.wickets}`, detail: f.stage, fixtureId: f.id, teamId } }
      if (sc.allOut && sc.runs < lowRuns) { lowRuns = sc.runs; low = { label: 'Lowest all-out total', value: `${sc.runs}`, detail: f.stage, fixtureId: f.id, teamId } }
    }
    if (res.winnerId) {
      const winner = res.scores[res.winnerId]
      const loserId = res.winnerId === f.homeId ? f.awayId : f.homeId
      const loser = res.scores[loserId]
      if (winner && loser) {
        const margin = winner.runs - loser.runs
        if (res.margin === 'runs' && margin > bigRunMargin) { bigRunMargin = margin; bigRuns = { label: 'Biggest win by runs', value: `${margin} runs`, detail: f.stage, fixtureId: f.id, teamId: res.winnerId } }
        if (res.margin === 'runs' && margin < tightMargin) { tightMargin = margin; tight = { label: 'Narrowest win by runs', value: `${margin} run${margin === 1 ? '' : 's'}`, detail: f.stage, fixtureId: f.id, teamId: res.winnerId } }
        if (res.margin === 'wickets' && winner.runs > chaseRuns) { chaseRuns = winner.runs; bigChase = { label: 'Highest successful chase', value: `${winner.runs}`, detail: f.stage, fixtureId: f.id, teamId: res.winnerId } }
      }
    }
    for (const [i, m] of res.six ?? []) if (m > longestSixM) { longestSixM = m; longestSix = { label: 'Longest six', value: `${m} m`, detail: f.stage, fixtureId: f.id, playerId: roster[i] } }
    let sixes = 0
    let topSix = { id: '', n: 0 }
    for (const line of res.bat ?? []) {
      const id = roster[line[0]]
      sixes += line[4]
      if (line[4] > topSix.n) topSix = { id, n: line[4] }
      if (line[1] > highRuns) { highRuns = line[1]; topScore = { label: 'Highest individual score', value: `${line[1]}${line[5] ? '' : '*'} (${line[2]})`, detail: f.stage, fixtureId: f.id, playerId: id } }
    }
    if (sixes > highSixes) { highSixes = sixes; mostSixes = { label: 'Most sixes in a match', value: `${sixes}`, detail: f.stage, fixtureId: f.id, playerId: topSix.id || undefined, playerNote: topSix.id ? `hit ${topSix.n} of them` : undefined } }
    for (const line of res.bowl ?? []) {
      const id = roster[line[0]]
      const [, , runs, wk] = line
      if (wk > bestW || (wk === bestW && runs < bestR)) { bestW = wk; bestR = runs; bestBowl = { label: 'Best bowling figures', value: `${wk}/${runs}`, detail: f.stage, fixtureId: f.id, playerId: id } }
    }
  }
  for (const r of [high, low, bigRuns, tight, bigChase, topScore, bestBowl, mostSixes, longestSix]) if (r) out.push(r)
  return out
}

export const playerRef = (index: Map<string, PlayerRef>, id: string | undefined) => (id ? index.get(id) : undefined)

/** Adds one player's batting lines from several seasons into a single career line. */
export function mergeBat(list: BatStat[]): BatStat | undefined {
  if (list.length === 0) return undefined
  const out: BatStat = { id: list[0].id, matches: 0, innings: 0, notOuts: 0, runs: 0, balls: 0, fours: 0, sixes: 0, high: 0, highNotOut: false, fifties: 0, hundreds: 0, ducks: 0, batApps: 0, longSix: 0 }
  for (const s of list) {
    out.batApps += s.batApps; out.matches += s.matches; out.innings += s.innings; out.notOuts += s.notOuts; out.runs += s.runs; out.balls += s.balls
    out.fours += s.fours; out.sixes += s.sixes; out.fifties += s.fifties; out.hundreds += s.hundreds; out.ducks += s.ducks
    out.longSix = Math.max(out.longSix, s.longSix)
    if (s.high > out.high || (s.high === out.high && s.highNotOut)) { out.high = s.high; out.highNotOut = s.highNotOut }
  }
  return out
}

/** Adds one player's bowling lines from several seasons into a single career line. */
export function mergeBowl(list: BowlStat[]): BowlStat | undefined {
  if (list.length === 0) return undefined
  const out: BowlStat = { id: list[0].id, matches: 0, balls: 0, runs: 0, wickets: 0, maidens: 0, bestW: 0, bestR: 0, fiveW: 0, bowlApps: 0 }
  for (const s of list) {
    out.bowlApps += s.bowlApps; out.matches += s.matches; out.balls += s.balls; out.runs += s.runs; out.wickets += s.wickets; out.maidens += s.maidens; out.fiveW += s.fiveW
    if (s.bestW > out.bestW || (s.bestW === out.bestW && s.bestW > 0 && s.bestR < out.bestR)) { out.bestW = s.bestW; out.bestR = s.bestR }
  }
  return out
}
