import type { BallEvent } from '../engine/types'
import { decodeBall, type ReelBall } from './reel'
import type { Season } from './types'

// ---- A highlight from an earlier match, for the strategic timeout ------------------------------------------------

export interface Highlight {
  playerId: string
  kind: 'bat' | 'bowl'
  /** "112 (58)" or "5/23". */
  headline: string
  /** "9 fours and 5 sixes", "in 3.4 overs". */
  detail: string
  homeId: string | null
  awayId: string | null
  date: string
}

/** The best single performance in the last few matches played in this season (not counting `excludeFixtureId`), or null if none yet. */
export function recentHighlight(season: Season, excludeFixtureId?: string, look = 8): Highlight | null {
  const byId = new Map(season.fixtures.map((f) => [f.id, f]))
  const recent = Object.values(season.results)
    .filter((r) => r.fixtureId !== excludeFixtureId && byId.has(r.fixtureId))
    .sort((a, b) => (byId.get(b.fixtureId)!.date.localeCompare(byId.get(a.fixtureId)!.date)))
    .slice(0, look)
  const roster = season.roster ?? []
  let best: { score: number; h: Highlight } | null = null
  for (const r of recent) {
    const f = byId.get(r.fixtureId)!
    const base = { homeId: f.homeId, awayId: f.awayId, date: f.date }
    for (const [p, runs, balls, fours, sixes] of r.bat) {
      const id = roster[p]
      const score = runs + sixes * 2 + (runs >= 100 ? 25 : runs >= 50 ? 10 : 0)
      if (id && runs > 0 && (!best || score > best.score)) best = { score, h: { ...base, playerId: id, kind: 'bat', headline: `${runs} (${balls})`, detail: `${fours} ${fours === 1 ? 'four' : 'fours'} and ${sixes} ${sixes === 1 ? 'six' : 'sixes'}` } }
    }
    for (const [p, balls, runs, wickets, maidens] of r.bowl) {
      const id = roster[p]
      const score = wickets * 22 - runs * 0.3 + maidens * 3 + (wickets >= 5 ? 20 : wickets >= 3 ? 8 : 0)
      if (id && wickets > 0 && (!best || score > best.score)) best = { score, h: { ...base, playerId: id, kind: 'bowl', headline: `${wickets}/${runs}`, detail: `in ${Math.floor(balls / 6)}.${balls % 6} overs` } }
    }
  }
  return best?.h ?? null
}

// ---- Partnerships -----------------------------------------------------------------------------------------------

export interface Partnership { runs: number; balls: number; a: { id: string; runs: number; balls: number }; b: { id: string; runs: number; balls: number } }

/**
 * The stand between the two batsmen at the crease as of `ev`: everything scored since the last wicket. `log` is the innings' ball log
 * up to and including `ev`.
 */
export function partnershipAt(log: BallEvent[], ev: BallEvent): Partnership {
  let from = 0
  let runsBefore = 0
  for (const e of log) { if (e.seq < ev.seq && e.wicket) { from = e.seq; runsBefore = e.score.runs } }
  const since = log.filter((e) => e.seq > from && e.seq <= ev.seq)
  const tally = new Map<string, { runs: number; balls: number }>()
  for (const id of [ev.strikerId, ev.nonStrikerId]) tally.set(id, { runs: 0, balls: 0 })
  for (const e of since) {
    const t = tally.get(e.strikerId)
    if (t) { t.runs += e.runsBat; if (e.extraType !== 'wide') t.balls += 1 }
  }
  const [a, b] = [ev.strikerId, ev.nonStrikerId]
  return { runs: ev.score.runs - runsBefore, balls: since.filter((e) => e.legal).length, a: { id: a, ...tally.get(a)! }, b: { id: b, ...tally.get(b)! } }
}

/** The 50, 100, 150... a stand has just passed on this ball, or null. */
export function partnershipMark(log: BallEvent[], ev: BallEvent): number | null {
  if (ev.wicket) return null
  const now = partnershipAt(log, ev).runs
  const before = now - ev.total
  const mark = Math.floor(now / 50) * 50
  return mark >= 50 && before < mark ? mark : null
}

// ---- Numbers for the third umpire and ball tracking -------------------------------------------------------------

const frac = (n: number) => n - Math.floor(n)
const hash = (seq: number, salt: number) => frac(Math.sin(seq * 12.9898 + salt * 78.233) * 43758.5453)

/** How far short of the crease a run out was: stable for a given ball, always a believable 2 to 70 cm. */
export function runOutGap(seq: number): { cm: number; text: string } {
  const cm = Math.round(2 + hash(seq, 1) * 68)
  return { cm, text: cm < 10 ? `${cm} cm short: a whisker` : cm < 35 ? `${cm} cm short of the crease` : `${cm} cm short: well out` }
}

export interface Track { pitchX: number; impactX: number; stumpsX: number; pitching: string; impact: string; wickets: string; umpiresCall: boolean }

/**
 * Where a ball tracked for an lbw appeal pitched, hit the pad and was heading. x is across the pitch in -1 (leg) to 1 (off), and the
 * stumps are +-0.18. `out` means the batsman was given out: the ball is then tracked as hitting (sometimes only just, an "umpire's call").
 */
export function trackFor(seq: number, out: boolean): Track {
  const inLine = (x: number) => Math.abs(x) <= 0.18
  const pitchX = out ? (hash(seq, 2) - 0.5) * 0.34 : (hash(seq, 2) - 0.5) * 1.1
  const impactX = out ? (hash(seq, 3) - 0.5) * 0.3 : (hash(seq, 3) - 0.5) * 0.9
  const stumpsX = out ? (hash(seq, 4) - 0.5) * 0.34 : (hash(seq, 4) > 0.5 ? 1 : -1) * (0.25 + hash(seq, 5) * 0.3)
  const edge = out && Math.abs(stumpsX) > 0.12
  const side = (x: number) => (inLine(x) ? 'In line' : x > 0 ? 'Outside off' : 'Outside leg')
  return {
    pitchX, impactX, stumpsX,
    pitching: side(pitchX),
    impact: out ? (edge ? 'In line' : side(impactX)) : side(impactX),
    wickets: out ? (edge ? "Hitting (umpire's call)" : 'Hitting') : inLine(stumpsX) ? 'Hitting' : 'Missing',
    umpiresCall: edge,
  }
}

/** True for the few balls (about one in 30) where a side asks for a review that is not an lbw out. */
export const isNotOutReview = (seq: number) => hash(seq, 6) < 0.034
/** True for about two in five caught-behind outs, where the batsman asks for a review (the sound graph) first. */
export const edgeWasReviewed = (seq: number) => hash(seq, 8) < 0.4
/** True for about one boundary or wicket in three, where the cheerleaders come out. */
export const cheersAfter = (seq: number) => hash(seq, 9) < 0.34
/** True for roughly a third of lbw outs, where the batsman asks for a review first. */
export const lbwWasReviewed = (seq: number) => hash(seq, 7) < 0.4

// ---- A highlight reel from an earlier match ---------------------------------------------------------------------

export interface ReelHighlight {
  fixtureId: string
  playerId: string
  kind: 'bat' | 'bowl'
  headline: string
  detail: string
  homeId: string | null
  awayId: string | null
  date: string
  balls: ReelBall[]
}

/** Every saved reel among the last few matches (not the one being played): the best play of each. Matches played before reels existed have none. */
export function reelCandidates(season: Season, excludeFixtureId?: string, look = 24): ReelHighlight[] {
  const byId = new Map(season.fixtures.map((f) => [f.id, f]))
  const roster = season.roster ?? []
  const recent = Object.values(season.results)
    .filter((r) => r.reel && r.fixtureId !== excludeFixtureId && byId.has(r.fixtureId))
    .sort((a, b) => byId.get(b.fixtureId)!.date.localeCompare(byId.get(a.fixtureId)!.date))
    .slice(0, look)
  const out: ReelHighlight[] = []
  for (const r of recent) {
    const reel = r.reel!
    const id = roster[reel.p]
    const f = byId.get(r.fixtureId)!
    if (!id || reel.e.length === 0) continue
    const base = { fixtureId: r.fixtureId, playerId: id, kind: reel.k, homeId: f.homeId, awayId: f.awayId, date: f.date, balls: reel.e.map(decodeBall) }
    if (reel.k === 'bat') {
      const line = r.bat.find((l) => l[0] === reel.p)
      if (!line) continue
      const [, runs, balls, fours, sixes] = line
      out.push({ ...base, headline: `${runs} (${balls})`, detail: `${fours} ${fours === 1 ? 'four' : 'fours'} and ${sixes} ${sixes === 1 ? 'six' : 'sixes'}` })
    } else {
      const line = r.bowl.find((l) => l[0] === reel.p)
      if (!line) continue
      const [, balls, runs, wickets] = line
      out.push({ ...base, headline: `${wickets}/${runs}`, detail: `in ${Math.floor(balls / 6)}.${balls % 6} overs` })
    }
  }
  return out
}

/** One reel picked from the candidates, never one in `used` (until every one has been shown), chosen at random from a seed. */
export function pickReel(cands: ReelHighlight[], used: Set<string>, seed: number): ReelHighlight | null {
  if (cands.length === 0) return null
  let pool = cands.filter((c) => !used.has(c.fixtureId))
  if (pool.length === 0) { used.clear(); pool = cands }
  const pick = pool[Math.floor(hash(seed, 11) * pool.length) % pool.length]
  used.add(pick.fixtureId)
  return pick
}

/** The best saved reel among the last few matches (not the one being played), or null. */
export function recentReel(season: Season, excludeFixtureId?: string, look = 10): ReelHighlight | null {
  const score = (h: ReelHighlight) => {
    const n = parseInt(h.headline, 10)
    return h.kind === 'bat' ? n : n * 22
  }
  return reelCandidates(season, excludeFixtureId, look).sort((a, b) => score(b) - score(a))[0] ?? null
}
