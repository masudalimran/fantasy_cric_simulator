import type { Match } from '../engine/match'
import { Match as MatchClass } from '../engine/match'
import { Rng } from '../engine/rng'
import { computeAwards } from '../engine/awards'
import { FORMATS } from '../engine/types'
import type { Team } from '../types'
import { coverInjured } from './injuries'
import { applyMatchChanges, sessionTeam } from './progression'
import { cpuSelections, formTable } from './selection'
import type { Competition, Fixture, MatchSummary, RawSummary, Season, Slot, TableRow, TeamScore } from './types'

/** Same fixture, same seed: a replay or a quick sim of a fixture always plays out identically. */
export function fixtureSeed(season: Season, fixtureId: string): number {
  let h = season.seed >>> 0
  for (let i = 0; i < fixtureId.length; i++) h = Math.imul(h ^ fixtureId.charCodeAt(i), 0x45d9f3b) >>> 0
  return h >>> 0
}

export function summarizeMatch(match: Match, fixture: Fixture, tieBreakSeed: number): RawSummary {
  const scores: Record<string, TeamScore> = {}
  for (const inn of match.innings) {
    scores[match.sides[inn.battingSide].team.id] = { runs: inn.runs, wickets: inn.wickets, balls: inn.legalBalls, allOut: inn.wickets >= 10 }
  }
  const r = match.result
  if (!r) throw new Error('Match is not finished')
  let winnerId = r.winnerSide === null ? null : match.sides[r.winnerSide].team.id
  let text = r.text
  let superOver = false
  // Knockouts can't end level: settle with a super over.
  if (winnerId === null && fixture.phase === 'knockout') {
    const pick = new Rng(tieBreakSeed ^ 0x9e3779b9).chance(0.5) ? 0 : 1
    winnerId = match.sides[pick].team.id
    text = `Match tied. ${match.sides[pick].team.name} won the super over`
    superOver = true
  }
  const bat: RawSummary['bat'] = []
  const bowl: RawSummary['bowl'] = []
  for (const inn of match.innings) {
    for (const b of inn.batters) bat.push([b.id, b.runs, b.balls, b.fours, b.sixes, b.dismissal ? 1 : 0])
    for (const b of inn.bowlers.values()) bowl.push([b.id, b.legalBalls, b.runs, b.wickets, b.maidens])
  }
  const longest = new Map<string, number>()
  for (const inn of match.innings) for (const e of inn.log) if (e.boundary === 6 && e.distance) longest.set(e.strikerId, Math.max(longest.get(e.strikerId) ?? 0, e.distance))
  const six = [...longest]
  const motm = computeAwards(match).motm
  return { six, played: match.sides.flatMap((s) => s.xi.map((p) => p.id)), fixtureId: fixture.id, winnerId, text, margin: superOver ? null : (r.margin?.type ?? null), scores, superOver, playerOfMatchId: motm?.id ?? null, motmNote: motm?.line, bat, bowl }
}

export function simulateFixture(season: Season, fixture: Fixture, teams: Map<string, Team>): RawSummary {
  // `teams` are the teams as they start out; each match is played with the ratings earned up to that moment (and your lineup)
  const home0 = teams.get(fixture.homeId as string)
  const away0 = teams.get(fixture.awayId as string)
  if (!home0 || !away0) throw new Error(`Teams for ${fixture.id} are not available`)
  // your own side plays without anyone who is injured: the best fit player from the bench takes his place
  const cover = (t: Team) => (t.id === season.myTeamId ? coverInjured(t, season, fixture.date) : t)
  const home = cover(sessionTeam(home0, season))
  const away = cover(sessionTeam(away0, season))
  const seed = fixtureSeed(season, fixture.id)
  // the computer picks its own XI (form, injuries, batting order); your team plays as you set it
  const [h, a] = season.myTeamId ? cpuSelections(season, fixture, [home, away], season.myTeamId, formTable(season, teams)).map((x) => x.team) : [home, away]
  const match = new MatchClass({ teamA: h, teamB: a, format: fixture.format, seed, career: { myTeamId: season.myTeamId ?? null, difficulty: season.difficulty ?? 'normal' } })
  match.playMatch()
  return summarizeMatch(match, fixture, seed)
}

// ---- Tables ------------------------------------------------------------

/** Standings for a league, a cup group, or a whole series (win 2, tie 1, level teams split by NRR). */
export function tableFor(season: Season, comp: Competition, group: string | null = null): TableRow[] {
  const quota = FORMATS[comp.format].overs * 6
  const teamIds = group && comp.groups ? comp.groups[group] : comp.teamIds
  const acc = new Map<string, { row: TableRow; rf: number; bf: number; ra: number; ba: number }>()
  for (const id of teamIds) acc.set(id, { row: { teamId: id, played: 0, won: 0, lost: 0, tied: 0, points: 0, nrr: 0 }, rf: 0, bf: 0, ra: 0, ba: 0 })

  const phases = comp.kind === 'series' ? ['series'] : group ? ['group'] : ['league']
  for (const f of season.fixtures) {
    if (f.competitionId !== comp.id || !phases.includes(f.phase) || (group && f.group !== group)) continue
    const res = season.results[f.id]
    if (!res || !f.homeId || !f.awayId) continue
    const sides = [f.homeId, f.awayId]
    for (const [i, id] of sides.entries()) {
      const a = acc.get(id)
      if (!a) continue
      const me = res.scores[id]
      const opp = res.scores[sides[1 - i]]
      a.row.played++
      if (res.winnerId === id) { a.row.won++; a.row.points += 2 }
      else if (res.winnerId === null) { a.row.tied++; a.row.points += 1 }
      else a.row.lost++
      if (me && opp) {
        a.rf += me.runs
        a.bf += me.allOut ? quota : me.balls
        a.ra += opp.runs
        a.ba += opp.allOut ? quota : opp.balls
      }
    }
  }
  const rows = [...acc.values()].map(({ row, rf, bf, ra, ba }) => ({ ...row, nrr: bf && ba ? (rf / bf - ra / ba) * 6 : 0 }))
  return rows.sort((a, b) => b.points - a.points || b.nrr - a.nrr || a.teamId.localeCompare(b.teamId))
}

// ---- Bracket progression -----------------------------------------------

function stageComplete(season: Season, comp: Competition, phase: 'league' | 'group', group: string | null): boolean {
  const fs = season.fixtures.filter((f) => f.competitionId === comp.id && f.phase === phase && (group === null || f.group === group))
  return fs.length > 0 && fs.every((f) => season.results[f.id])
}

function resolveSlot(season: Season, slot: Slot): string | null {
  if (slot.kind === 'team') return slot.teamId
  if (slot.kind === 'winner') return season.results[slot.of]?.winnerId ?? null
  const comp = season.competitions.find((c) => c.id === slot.competitionId)
  if (!comp) return null
  const phase = slot.group ? 'group' : 'league'
  if (!stageComplete(season, comp, phase, slot.group)) return null
  return tableFor(season, comp, slot.group)[slot.rank - 1]?.teamId ?? null
}

/** Fills in semi-finals and finals as the results they depend on come in. Returns the same object if nothing changed. */
export function resolveSeason(season: Season): Season {
  let changed = false
  const fixtures = season.fixtures.map((f) => {
    if (f.homeId && f.awayId) return f
    const homeId = f.homeId ?? resolveSlot(season, f.homeRef)
    const awayId = f.awayId ?? resolveSlot(season, f.awayRef)
    if (homeId === f.homeId && awayId === f.awayId) return f
    changed = true
    return { ...f, homeId, awayId }
  })
  if (!changed) return season
  return resolveSeason({ ...season, fixtures })
}

/** Stores a finished match, swapping player ids for roster positions to keep the saved season small. */
export function recordResult(season: Season, raw: RawSummary, teams?: Map<string, Team>): Season {
  const roster = [...(season.roster ?? [])]
  const index = new Map(roster.map((id, i) => [id, i]))
  const idx = (id: string) => {
    let i = index.get(id)
    if (i === undefined) { i = roster.length; roster.push(id); index.set(id, i) }
    return i
  }
  const summary: MatchSummary = {
    ...raw,
    bat: raw.bat.map(([id, ...rest]) => [idx(id), ...rest] as MatchSummary['bat'][number]),
    bowl: raw.bowl.map(([id, ...rest]) => [idx(id), ...rest] as MatchSummary['bowl'][number]),
    played: raw.played?.map(idx),
    six: raw.six?.map(([id, m]) => [idx(id), m] as [number, number]),
  }
  const fixture = season.fixtures.find((f) => f.id === raw.fixtureId)
  const next = { ...season, roster, results: { ...season.results, [summary.fixtureId]: summary } }
  // with the teams to hand, every player in the match is graded and his ratings move a little
  let graded = next
  if (teams && fixture) {
    const pair = new Map<string, Team>()
    for (const id of [fixture.homeId, fixture.awayId]) { const t = id ? teams.get(id) : undefined; if (t && id) pair.set(id, sessionTeam(t, season)) } // the ratings the match was played with
    graded = applyMatchChanges(next, fixture, raw, pair)
  }
  return resolveSeason(graded)
}


/**
 * Your team cannot put out eleven fit players: the match is forfeited and the other side is given the win (no player is graded,
 * and a forfeit counts as being all out for the net run rate).
 */
export function forfeitFixture(season: Season, fixture: Fixture, teams: Map<string, Team>): Season {
  const me = season.myTeamId
  if (!me || !fixture.homeId || !fixture.awayId || season.results[fixture.id]) return season
  const other = fixture.homeId === me ? fixture.awayId : fixture.homeId
  const raw: RawSummary = {
    fixtureId: fixture.id, winnerId: other, margin: null, superOver: false, playerOfMatchId: null, bat: [], bowl: [], played: [],
    text: `${teams.get(me)?.name ?? 'Your team'} could not field a side and forfeited: ${teams.get(other)?.name ?? 'the other team'} are given the win`,
    scores: { [me]: { runs: 0, wickets: 10, balls: 0, allOut: true }, [other]: { runs: 0, wickets: 0, balls: 0, allOut: false } },
  }
  return recordResult(season, raw, teams)
}
// ---- Calendar queries ----------------------------------------------------

export const isPlayable = (f: Fixture) => !!f.homeId && !!f.awayId

export const fixturesOn = (season: Season, date: string) => season.fixtures.filter((f) => f.date === date)

/** Earliest date with a fixture still to play whose teams are known. */
export function nextMatchDate(season: Season): string | null {
  let best: string | null = null
  for (const f of season.fixtures) {
    if (season.results[f.id] || !isPlayable(f)) continue
    if (best === null || f.date < best) best = f.date
  }
  return best
}

/** A match involving the player's team. */
export const isMine = (season: Season, f: Fixture) => !!season.myTeamId && (f.homeId === season.myTeamId || f.awayId === season.myTeamId)

/**
 * The earlier match of yours that must be played before this one can be, or null if it's free to go.
 * Time can't move past a match of yours that is still waiting: not yours later on, and not anyone else's after it.
 */
export function mustPlayFirst(season: Season, f: Fixture): Fixture | null {
  const pending = myNextFixture(season)
  if (!pending || pending.id === f.id) return null
  return f.date > pending.date ? pending : null
}

/** The player's next match that hasn't been played yet (once its teams are known), earliest first. */
export function myNextFixture(season: Season): Fixture | null {
  let best: Fixture | null = null
  for (const f of season.fixtures) {
    if (season.results[f.id] || !isPlayable(f) || !isMine(season, f)) continue
    if (!best || f.date < best.date || (f.date === best.date && f.id < best.id)) best = f
  }
  return best
}

/** Every fixture has been played. */
export const seasonComplete = (season: Season) => season.fixtures.length > 0 && season.fixtures.every((f) => season.results[f.id])

/**
 * Plays every pending fixture on `date`, in order, so later rounds can resolve from earlier results.
 * With `leaveMine`, the player's own matches are left for the player to play or sim themselves.
 */
export function simDay(season: Season, date: string, teams: Map<string, Team>, leaveMine = false, skip?: string | null): Season {
  let s = season
  const today = s.fixtures.filter((f) => f.date === date).map((f) => f.id)
  for (const id of today) {
    const f = s.fixtures.find((x) => x.id === id)
    if (!f || s.results[f.id] || !isPlayable(f)) continue
    if (leaveMine && isMine(s, f)) continue
    if (skip && f.id === skip) continue // a match that is being played right now
    s = recordResult(s, simulateFixture(s, f, teams), teams)
  }
  return s
}

/**
 * Moves the season on until `date`, but never past the player's next match: everything before it is
 * simulated, then it stops so the player can play it (or sim it) themselves.
 */
export function simUntil(season: Season, date: string, teams: Map<string, Team>): { season: Season; stoppedAt: Fixture | null } {
  let cur = season
  for (let guard = 0; guard < 600; guard++) {
    const next = nextMatchDate(cur)
    if (!next || next > date) break
    const mine = myNextFixture(cur)
    if (mine && next === mine.date) {
      // everything before the player's match is done: play out the rest of that day and hand over
      cur = simDay(cur, mine.date, teams, true)
      return { season: { ...cur, today: mine.date > cur.today ? mine.date : cur.today }, stoppedAt: mine }
    }
    cur = simDay(cur, next, teams, true)
  }
  return { season: { ...cur, today: date > cur.today ? date : cur.today }, stoppedAt: null }
}

/** Is there any match before this date that hasn't been played yet? */
export const hasEarlierUnplayed = (season: Season, date: string) => season.fixtures.some((f) => f.date < date && !season.results[f.id] && isPlayable(f))

/**
 * Before a match is played, every match dated before it is played first (the computer plays them out), so the
 * season goes on in order. Matches on the same day are left alone.
 */
export function playEarlierMatches(season: Season, date: string, teams: Map<string, Team>): Season {
  let cur = season
  for (let guard = 0; guard < 600; guard++) {
    const next = nextMatchDate(cur)
    if (!next || next >= date) break
    cur = simDay(cur, next, teams, true)
  }
  const last = cur.fixtures.filter((f) => f.date < date && cur.results[f.id]).reduce((m, f) => (f.date > m ? f.date : m), cur.today)
  return { ...cur, today: last > cur.today ? last : cur.today }
}

export type CompetitionStatus = 'upcoming' | 'live' | 'done'

export function competitionStatus(season: Season, comp: Competition) {
  const fs = season.fixtures.filter((f) => f.competitionId === comp.id)
  const played = fs.filter((f) => season.results[f.id]).length
  const status: CompetitionStatus = played === 0 ? 'upcoming' : played === fs.length ? 'done' : 'live'
  let champion: string | null = null
  if (status === 'done') {
    if (comp.kind === 'series') champion = tableFor(season, comp)[0]?.teamId ?? null
    else champion = season.results[fs.find((f) => f.stage === 'Final')?.id ?? '']?.winnerId ?? null
  }
  return { played, total: fs.length, status, champion }
}
