import type { Match } from '../../engine/match'
import { FORMATS, type BallEvent } from '../../engine/types'
import { fieldPlan } from './fieldSets'
import { placeFielders, type Placed } from './Stage'

/** Where the bowling side stood for a ball: the field of that stage of the game. */
export function placedFor(match: Match, ev: BallEvent, noMirror = false): Placed[] {
  const inn = match.innings[ev.innings]
  const bowler = match.player(ev.bowlerId)
  const plan = fieldPlan({
    format: match.format, over: ev.over, maxOvers: FORMATS[match.format].overs, runs: ev.score.runs - ev.total, legalBalls: ev.score.legalBalls - (ev.legal ? 1 : 0),
    target: inn.target, freeHit: ev.freeHit, bowlType: bowler.bowling?.type ?? null, hand: match.player(ev.strikerId).hand, noMirror,
  })
  return placeFielders(match.sides[1 - inn.battingSide].xi, ev.bowlerId, plan.spots)
}
