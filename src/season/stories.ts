import { Rng } from '../engine/rng'
import type { BallEvent } from '../engine/types'
import type { Player, Team } from '../types'
import { impactPoints, mostValuable, topBatsmen, topBowlers, type Collected } from './stats'
import type { Competition, MatchDelta, Season } from './types'

// ---- Season records, for the RECORD! flash --------------------------------------------------------------------------------------

export interface SeasonBests {
  highScore: { runs: number; id: string } | null
  /** Most wickets, then fewest runs. */
  bestBowling: { wickets: number; runs: number; id: string } | null
  /** Fewest balls to reach 50. */
  fastestFifty: { balls: number; id: string } | null
}

/** The best of each, over the matches already played this season. */
export function seasonBests(season: Season): SeasonBests {
  const roster = season.roster ?? []
  let highScore: SeasonBests['highScore'] = null
  let bestBowling: SeasonBests['bestBowling'] = null
  let fastestFifty: SeasonBests['fastestFifty'] = null
  for (const r of Object.values(season.results)) {
    for (const [p, runs] of r.bat) if (roster[p] && (!highScore || runs > highScore.runs)) highScore = { runs, id: roster[p] }
    for (const [p, , runs, wickets] of r.bowl) if (roster[p] && wickets > 0 && (!bestBowling || wickets > bestBowling.wickets || (wickets === bestBowling.wickets && runs < bestBowling.runs))) bestBowling = { wickets, runs, id: roster[p] }
    if (r.ff && roster[r.ff[0]] && (!fastestFifty || r.ff[1] < fastestFifty.balls)) fastestFifty = { balls: r.ff[1], id: roster[r.ff[0]] }
  }
  return { highScore, bestBowling, fastestFifty }
}

/** The quickest fifty of a finished match: who, and how many balls he faced to reach it (null if nobody got there). */
export function fastestFiftyOf(innings: { log: BallEvent[] }[]): [string, number] | null {
  let best: [string, number] | null = null
  for (const inn of innings) {
    const tally = new Map<string, { runs: number; balls: number; done: boolean }>()
    for (const e of inn.log) {
      const t = tally.get(e.strikerId) ?? { runs: 0, balls: 0, done: false }
      t.runs += e.runsBat
      if (e.extraType !== 'wide') t.balls++
      if (!t.done && t.runs >= 50) { t.done = true; if (!best || t.balls < best[1]) best = [e.strikerId, t.balls] }
      tally.set(e.strikerId, t)
    }
  }
  return best
}

// ---- A tied knockout: the super over --------------------------------------------------------------------------------------------

/** Who wins the super over of a tied knockout and what each side scored: the same winner the saved result uses (see `summarizeMatch`). */
export function superOverOutcome(matchSeed: number): { winnerSide: 0 | 1; winnerRuns: number; loserRuns: number; loserWickets: number } {
  const winnerSide = new Rng(matchSeed ^ 0x9e3779b9).chance(0.5) ? 0 : 1
  const r = new Rng(matchSeed ^ 0x51ed270b)
  const loserRuns = 5 + r.int(9)
  return { winnerSide, winnerRuns: loserRuns + 1 + r.int(5), loserRuns, loserWickets: r.int(3) }
}

// ---- A tournament won ----------------------------------------------------------------------------------------------------------

export interface Campaign { played: number; won: number; resultText: string; runnerUpId: string | null }

/** How a team got through a tournament: its matches and wins in it, the final's result and who it beat. */
export function campaignOf(season: Season, comp: Competition, teamId: string): Campaign {
  const fs = season.fixtures.filter((f) => f.competitionId === comp.id && (f.homeId === teamId || f.awayId === teamId) && season.results[f.id])
  const final = season.fixtures.find((f) => f.competitionId === comp.id && f.stage === 'Final')
  const res = final ? season.results[final.id] : undefined
  return {
    played: fs.length,
    won: fs.filter((f) => season.results[f.id].winnerId === teamId).length,
    resultText: res?.text ?? '',
    runnerUpId: final ? (final.homeId === teamId ? final.awayId : final.homeId) : null,
  }
}

// ---- The playoff race -----------------------------------------------------------------------------------------------------------

export type PlayoffStatus = 'qualified' | 'eliminated' | null

/**
 * Where your team stands once a competition's league or group stage is over and the knockouts have teams: through to them, or out.
 * Null while the first stage is still going, or for competitions that have no knockouts.
 */
export function playoffStatus(season: Season, comp: Competition, teamId: string): PlayoffStatus {
  if (comp.kind === 'series' || !comp.teamIds.includes(teamId)) return null
  const fs = season.fixtures.filter((f) => f.competitionId === comp.id)
  const first = fs.filter((f) => f.phase === 'league' || f.phase === 'group')
  const ko = fs.filter((f) => f.phase === 'knockout')
  if (first.length === 0 || ko.length === 0 || !first.every((f) => season.results[f.id])) return null
  const seeded = ko.filter((f) => f.homeId && f.awayId)
  if (seeded.length === 0) return null
  return seeded.some((f) => f.homeId === teamId || f.awayId === teamId) ? 'qualified' : 'eliminated'
}

// ---- Rating upgrades after a match ----------------------------------------------------------------------------------------------

export interface Upgrade { playerId: string; before: number; after: number; gain: number }

/** Your players whose overall rating rose in a match, biggest first. `now` gives a player's rating as it stands after the match. */
export function upgradesFrom(changes: Record<string, MatchDelta> | undefined, mine: Set<string>, now: (id: string) => number | null): Upgrade[] {
  const out: Upgrade[] = []
  for (const [id, d] of Object.entries(changes ?? {})) {
    if (!mine.has(id) || d.o < 1) continue
    const after = now(id)
    if (after !== null) out.push({ playerId: id, before: after - d.o, after, gain: d.o })
  }
  return out.sort((a, b) => b.gain - a.gain).slice(0, 4)
}

// ---- Awards night ---------------------------------------------------------------------------------------------------------------

export interface AwardsNightData {
  goldenBat: { player: Player; team: Team; line: string } | null
  goldenBall: { player: Player; team: Team; line: string } | null
  player: { player: Player; team: Team; line: string } | null
  /** The best eleven of the season: a keeper, then batsmen, all-rounders and bowlers by what they did. */
  xi: { player: Player; team: Team; note: string }[]
}

/** The season's awards across the whole league, from the stats of every match. */
export function awardsNight(c: Collected, lookup: (id: string) => { player: Player; team: Team } | undefined): AwardsNightData {
  const bat = topBatsmen(c, 1)[0]
  const bowl = topBowlers(c, 1)[0]
  const mvp = mostValuable(c, 1)[0]
  const find = (id: string | undefined) => (id ? lookup(id) : undefined)
  const b = find(bat?.id)
  const w = find(bowl?.id)
  const m = find(mvp?.id)
  const ranked = mostValuable(c, 60).map((x) => ({ ...x, entry: lookup(x.id) })).filter((x): x is { id: string; points: number; entry: { player: Player; team: Team } } => !!x.entry)
  const pick = (n: number, pred: (p: Player) => boolean, used: Set<string>) => ranked.filter((x) => pred(x.entry.player) && !used.has(x.id)).slice(0, n)
  const used = new Set<string>()
  const chosen: typeof ranked = []
  for (const group of [pick(1, (p) => p.role === 'WK', used)]) for (const x of group) { used.add(x.id); chosen.push(x) }
  for (const group of [pick(4, (p) => p.role === 'BAT', used)]) for (const x of group) { used.add(x.id); chosen.push(x) }
  for (const group of [pick(2, (p) => p.role === 'AR', used)]) for (const x of group) { used.add(x.id); chosen.push(x) }
  for (const group of [pick(4, (p) => p.role === 'BOWL', used)]) for (const x of group) { used.add(x.id); chosen.push(x) }
  for (const x of ranked) { if (chosen.length >= 11) break; if (!used.has(x.id)) { used.add(x.id); chosen.push(x) } }
  return {
    goldenBat: b && bat ? { ...b, line: `${bat.runs} runs · high score ${bat.high}${bat.highNotOut ? '*' : ''}` } : null,
    goldenBall: w && bowl ? { ...w, line: `${bowl.wickets} wickets · best ${bowl.bestW}/${bowl.bestR}` } : null,
    player: m && mvp ? { ...m, line: `${Math.round(mvp.points)} impact points` } : null,
    xi: chosen.slice(0, 11).map((x) => ({ ...x.entry, note: `${Math.round(impactPoints(c, x.id))} pts` })),
  }
}
