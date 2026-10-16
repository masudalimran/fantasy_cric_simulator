import { DISMISSAL_KINDS } from '../engine/model'
import type { BallEvent, DismissalKind } from '../engine/types'

/**
 * A highlight reel kept with a finished match: the best batsman's or bowler's best balls, so the strategic timeout can replay them on
 * the real field view. Each ball is one small whole number: seq * 100 + runsBat * 10 + (dismissal kind + 1, or 0). The ball's shot
 * direction comes from its seq, so the footage looks just like it did on the day.
 */
export interface Reel { /** The player (a roster position in a saved summary, an id before). */ p: number; k: 'bat' | 'bowl'; e: number[] }
export interface RawReel { p: string; k: 'bat' | 'bowl'; e: number[] }

/** The most balls a reel keeps. */
export const REEL_MAX = 14

export const encodeBall = (e: BallEvent): number => e.seq * 100 + Math.min(e.runsBat, 9) * 10 + (e.wicket ? DISMISSAL_KINDS.indexOf(e.wicket.kind) + 1 : 0)

export interface ReelBall { seq: number; runsBat: number; boundary: 0 | 4 | 6; wicket: DismissalKind | null }
export function decodeBall(n: number): ReelBall {
  const wk = n % 10
  const runs = Math.floor(n / 10) % 10
  return { seq: Math.floor(n / 100), runsBat: runs, boundary: runs === 6 ? 6 : runs === 4 ? 4 : 0, wicket: wk > 0 ? (DISMISSAL_KINDS[wk - 1] as DismissalKind) : null }
}


/**
 * The reel for one finished match: the best performance of either kind (a big innings or a bowling spell), or null if nobody stood out.
 * Batsmen: the fours, sixes and 2s and 3s. Bowlers: the wickets and the dot balls.
 */
export function buildReel(innings: { log: BallEvent[] }[]): RawReel | null {
  const log = innings.flatMap((i) => i.log)
  const bat = new Map<string, { runs: number; sixes: number }>()
  for (const e of log) {
    const b = bat.get(e.strikerId) ?? { runs: 0, sixes: 0 }
    b.runs += e.runsBat; if (e.boundary === 6) b.sixes++
    bat.set(e.strikerId, b)
  }
  // only batting makes a good highlight: the best innings of the match (25 or more)
  let best: { score: number; id: string } | null = null
  for (const [id, b] of bat) {
    const score = b.runs + b.sixes * 2 + (b.runs >= 100 ? 25 : b.runs >= 50 ? 10 : 0)
    if (b.runs >= 25 && (!best || score > best.score)) best = { score, id }
  }
  if (!best) return null
  const balls = log.filter((e) => e.strikerId === best!.id && e.runsBat >= 2 && !e.wicket)
  // sixes first, then fours, then the rest, then back in the order they were hit
  const ranked = [...balls].sort((a, b) => b.runsBat - a.runsBat).slice(0, REEL_MAX).sort((a, b) => a.seq - b.seq)
  return ranked.length ? { p: best.id, k: 'bat', e: ranked.map(encodeBall) } : null
}

const frac = (n: number) => n - Math.floor(n)

/**
 * Footage for an innings whose balls were not saved (a match played before reels existed, or one without a reel): the fours and sixes his
 * line says he hit, and a few 2s and 3s, in a stable order and with shots going where the ball number says. Always the same for the same match.
 */
export function synthesizeBat(fixtureId: string, runs: number, fours: number, sixes: number): ReelBall[] {
  let seed = 0
  for (let i = 0; i < fixtureId.length; i++) seed = (seed * 31 + fixtureId.charCodeAt(i)) % 100003
  const rest = Math.max(0, runs - fours * 4 - sixes * 6)
  const picks: number[] = [...Array(sixes).fill(6), ...Array(fours).fill(4), ...Array(Math.min(4, Math.floor(rest / 3))).fill(2)].slice(0, REEL_MAX)
  const used = new Set<number>()
  const balls = picks.map((r, i) => {
    let seq = 20 + Math.floor(frac(Math.sin(seed + i * 7.31) * 43758.5453) * 380)
    while (used.has(seq)) seq++
    used.add(seq)
    return { seq, runsBat: r, boundary: (r === 6 ? 6 : r === 4 ? 4 : 0) as 0 | 4 | 6, wicket: null } as ReelBall
  })
  return balls.sort((a, b) => a.seq - b.seq)
}

/** A saved ball as a full ball event, so the real field view can play it. The fielder is not kept; a catch is drawn going out to the rope. */
export function toEvent(b: ReelBall, ids: { striker: string; nonStriker: string; bowler: string }, n: number): BallEvent {
  return {
    seq: b.seq, innings: 0, over: Math.floor(n / 6), ballInOver: n % 6, legal: true, strikerId: ids.striker, nonStrikerId: ids.nonStriker, bowlerId: ids.bowler,
    runsBat: b.runsBat, extraType: null, extraRuns: 0, total: b.runsBat, boundary: b.boundary,
    wicket: b.wicket ? ({ kind: b.wicket, playerId: ids.striker } as BallEvent['wicket']) : null,
    intent: 0, freeHit: false, score: { runs: 0, wickets: 0, legalBalls: n + 1 }, tags: [],
  }
}
