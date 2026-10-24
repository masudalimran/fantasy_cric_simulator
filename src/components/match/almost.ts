import { ballSpeed } from '../../engine/speed'
import type { BallEvent } from '../../engine/types'
import type { Player } from '../../types'
import { hash01Pub as hash01, planBall } from './broadcast'
import { endPoint, type Placed } from './Stage'

/** A lofted shot that fell just short of a fielder: for the "so nearly caught" replay screen (it changes no result). */
export interface AlmostCaught {
  /** How far in front of him it landed, in metres. */
  gap: number
  fielder: Player
  /** How far the ball went from the bat to where it landed, and how long it was in the air. */
  distance: number
  hang: number
  runs: number
}

/** Close enough to be a "so nearly" (the ball landed this near the fielder or less). */
export const ALMOST_CATCH_M = 1.8

export function almostCaught(ev: BallEvent, fielders: Placed[], leftHand: boolean, bowler: Player): AlmostCaught | null {
  if (ev.wicket || ev.boundary || ev.extraType || ev.runsBat < 1) return null
  // only some of them are shown, so they stay special
  if (hash01(ev.seq * 2.1) > 0.7) return null
  const plan = planBall(ev, fielders.map((f) => ({ id: f.player.id, x: f.x, y: f.y, spot: f.spot })), endPoint(ev, fielders), leftHand, ballSpeed(ev, bowler))
  if (!plan.fellShort || plan.fellShort.gap > ALMOST_CATCH_M || plan.chaser < 0) return null
  return {
    gap: Math.round(plan.fellShort.gap * 10) / 10, fielder: fielders[plan.chaser].player,
    distance: Math.round(Math.hypot(plan.end.x - plan.meet.x, plan.end.z - plan.meet.z)), hang: Math.round(plan.tFlight * 10) / 10, runs: ev.runsBat,
  }
}
