import type { MatchFormat } from '../types'

/**
 * Challenges (the decision review system). Each side gets a number of challenges in every innings (2 in a T20, 4 in a one-day match, 6 in a Test);
 * one that is upheld is kept and one that fails is lost, as in the real game. The batting side can challenge an lbw or a catch behind it has been
 * given out to; the fielding side can challenge a close not-out. What happens is decided here from the match seed and the state of the game, with
 * its own random stream (so the rest of the match rolls exactly as before). A side that is up against the wall challenges even when it probably
 * knows the umpire got it right, for the hope of a miracle.
 */
export const REVIEWS_PER_INNINGS: Record<MatchFormat, number> = { t20: 2, odi: 4, test: 6 }

/** How often the on-field decision was wrong, so a review can change it. */
export const WRONG_OUT = 0.14 // a batsman given out who was not
export const MISSED_OUT = 0.14 // a close not-out that was in fact out (of the close calls the fielding side takes upstairs)
/** Of legal dot balls, how many are close enough for the fielding side to think about a review (fewer in the longer formats, which have many more balls to an innings; tuned by simulation so wickets and runs hardly move). */
export const CLOSE_CALL: Record<MatchFormat, number> = { t20: 0.04, odi: 0.015, test: 0.0075 }

export interface DrsCtx {
  by: 'bat' | 'bowl'
  /** Challenges this side has left in the innings. */
  left: number
  /** The batsman at risk or at the crease: his runs and balls faced, and his place in the order (0 is the opener). */
  batRuns: number
  batBalls: number
  position: number
  wickets: number
  /** Balls left in the innings (null in a Test, where the innings has no end of its own). */
  ballsLeft: number | null
  /** Runs needed when chasing, else null. */
  need: number | null
  recentWickets: number
}

/** Whether the captain (or the batsman) takes it upstairs, and whether it is a last throw of the dice. */
export function wantsChallenge(c: DrsCtx, u: number): { yes: boolean; desperate: boolean } {
  if (c.left <= 0) return { yes: false, desperate: false }
  if (c.by === 'bat') {
    // up against the wall: nothing to lose, so he asks even if he knows it was out
    const wall = c.wickets >= 9 || (c.need !== null && c.wickets >= 7) || (c.need !== null && c.ballsLeft !== null && c.ballsLeft <= 12 && c.need > c.ballsLeft * 2) || (c.ballsLeft === null && c.wickets >= 8)
    if (wall) return { yes: u < 0.93, desperate: true }
    let p = 0.28 + (c.batBalls >= 15 ? 0.14 : 0) + (c.batRuns >= 30 ? 0.12 : 0) - (c.position >= 8 ? 0.12 : 0) - (c.left === 1 ? 0.1 : 0) + (c.recentWickets >= 2 ? 0.1 : 0)
    p = Math.max(0.05, Math.min(0.8, p))
    return { yes: u < p, desperate: false }
  }
  // the fielding side: a big wicket, a close chase, or reviews that will be lost with the innings
  const closeChase = c.need !== null && c.need <= 30 && c.ballsLeft !== null && c.ballsLeft <= 24
  if (closeChase) return { yes: u < 0.9, desperate: true }
  if (c.ballsLeft !== null && c.ballsLeft <= 12) return { yes: u < 0.85, desperate: false }
  let p = 0.4 + (c.batRuns >= 40 ? 0.2 : c.batRuns >= 25 ? 0.1 : 0) - (c.left === 1 ? 0.15 : 0) - (c.position >= 8 ? 0.1 : 0)
  p = Math.max(0.1, Math.min(0.85, p))
  return { yes: u < p, desperate: false }
}

/** What is saved on the ball: who asked, what it was about, how the decision stood, whether it was changed and how many challenges are left. */
export interface Review {
  by: 'bat' | 'bowl'
  kind: 'lbw' | 'edge'
  /** The decision on the field. */
  originalOut: boolean
  /** The decision after the review (the same as the original unless overturned). */
  finalOut: boolean
  overturned: boolean
  /** A last throw of the dice (see the intro), for the way the huddle talks. */
  desperate: boolean
  /** Challenges the asking side has left after this one, and how many it started the innings with. */
  left: number
  total: number
}
