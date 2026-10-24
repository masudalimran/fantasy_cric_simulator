import type { Difficulty } from '../engine/types'
import type { Season } from './types'

/**
 * The boost token: every 5 matches your team wins in a career (on Easy or Normal) earns one. Using it makes the whole team 50% better for one
 * match: every batting, bowling and fielding rating is multiplied by 1.5 (see `BOOST_MULT`, which the match engine reads). Tokens pile up, are
 * armed from the squad screen or the toss screen, and are spent at the toss (so cancelling the match before the coin is flipped keeps the token).
 * Everything here is worked out from the saved results, so careers that began before boosts existed simply have the tokens they have earned.
 */
export const BOOST_EVERY = 5
export const BOOST_MULT = 1.5

/** What a career has saved about boosts: how many tokens have been spent, and whether one is armed for the next match. */
export interface BoostState { used: number; armed: boolean }

/** Only Easy and Normal careers get boosts. */
export const boostAllowed = (d: Difficulty | undefined) => d === 'easy' || d === 'normal'

/** Every match your team has won in this career, across all its years. */
export function careerWins(seasons: Season[]): number {
  let n = 0
  for (const s of seasons) {
    if (!s.myTeamId) continue
    for (const r of Object.values(s.results)) if (r.winnerId === s.myTeamId) n++
  }
  return n
}

export interface BoostSummary {
  allowed: boolean
  wins: number
  earned: number
  used: number
  /** Tokens in hand now. */
  available: number
  /** Wins still needed for the next token (1 to 5). */
  toNext: number
  armed: boolean
}

export function boostSummary(seasons: Season[], state: BoostState | undefined, difficulty: Difficulty | undefined): BoostSummary {
  const allowed = boostAllowed(difficulty)
  const wins = careerWins(seasons)
  const earned = allowed ? Math.floor(wins / BOOST_EVERY) : 0
  const used = state?.used ?? 0
  const available = Math.max(0, earned - used)
  return { allowed, wins, earned, used, available, toNext: BOOST_EVERY - (wins % BOOST_EVERY), armed: !!state?.armed && available > 0 }
}
