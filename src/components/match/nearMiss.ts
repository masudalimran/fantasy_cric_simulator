import type { BallEvent } from '../../engine/types'
import { beatenDot, hash01Pub as hash01, missHeight } from './broadcast'

/** A ball that beat the bat and was close to something: the stumps, or the edge of the bat. For the replay screen only (it changes no result). */
export interface Miss {
  kind: 'stumps' | 'bat'
  /** How close, in centimetres. */
  cm: number
  /** Where the ball passed the stumps, in metres from the middle stump (to the right of the screen) and above the ground. */
  x: number
  y: number
  /** The side of the stumps it missed on, from the batsman's point of view, or over the top. */
  side: 'off' | 'leg' | 'over'
  /** Which way the batsman is facing (the leg side is to the right of the screen for a right-hander). */
  left: boolean
}

export const STUMP_HALF = 0.1143
export const STUMP_HEIGHT = 0.711
export const BALL_R = 0.036
/** Close enough to be shown again: a ball this near the stumps, or a bat this near the ball. */
export const CLOSE_STUMPS_CM = 3
export const CLOSE_BAT_CM = 2

/** Where a played-and-missed ball went past the stumps (the same line the broadcast picture draws it on). */
export function stumpPass(ev: BallEvent): { x: number; y: number } {
  const lineX = ev.delivery ? ev.delivery.line / 50 : (hash01(ev.seq * 3.1) - 0.5) * 0.9
  return { x: lineX * 0.6 * 0.975, y: missHeight(ev) }
}

/** How far a ball at (x, y) at the stumps is from them, in metres (0 would be a hit). */
export function stumpGap(x: number, y: number): { dx: number; dy: number; gap: number } {
  const dx = Math.max(0, Math.abs(x) - STUMP_HALF - BALL_R)
  const dy = Math.max(0, y - STUMP_HEIGHT - BALL_R)
  return { dx, dy, gap: Math.hypot(dx, dy) }
}

export function nearMiss(ev: BallEvent, leftHand: boolean): Miss | null {
  // only some of the close ones are shown, so they stay special (a couple an innings)
  if (!beatenDot(ev) || hash01(ev.seq * 2.9) > 0.4) return null
  const { x, y } = stumpPass(ev)
  const g = stumpGap(x, y)
  const cm = Math.round(g.gap * 100)
  const legSide = x * (leftHand ? -1 : 1) > 0
  if (cm <= CLOSE_STUMPS_CM) return { kind: 'stumps', cm: Math.max(1, cm), x, y, side: g.dx > g.dy ? (legSide ? 'leg' : 'off') : 'over', left: leftHand }
  // played and missed away from the stumps: how near the edge of his bat the ball went (only worth a replay when it was very near)
  const bat = Math.round(1 + hash01(ev.seq * 9.7) * 14)
  if (bat <= CLOSE_BAT_CM) return { kind: 'bat', cm: bat, x, y, side: legSide ? 'leg' : 'off', left: leftHand }
  return null
}
