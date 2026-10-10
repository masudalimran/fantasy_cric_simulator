import type { MatchFormat, Player, Team } from '../types'

export type Phase = 'powerplay' | 'middle' | 'death'

/** Batting intent as a number: -1 defend, 0 normal for the phase, +1 attack, +2 slog. */
export type Intent = 'defend' | 'normal' | 'attack' | 'slog'
export const INTENT_VALUE: Record<Intent, number> = { defend: -1, normal: 0, attack: 1, slog: 2 }

/** How hard the computer-run teams make it for the player. Only matches involving your own team are affected. */
export type Difficulty = 'easy' | 'normal' | 'hard' | 'legend'

export const DIFFICULTIES: Record<Difficulty, { label: string; blurb: string; /** rating points added to every computer player */ boost: number; /** how often the computer makes a poor tactical call (0 = never) */ blunder: number }> = {
  easy: { label: 'Easy', blurb: 'The computer plays a little worse and sometimes makes poor calls.', boost: -6, blunder: 0.45 },
  normal: { label: 'Normal', blurb: 'A fair contest. Ratings decide it.', boost: 0, blunder: 0.2 },
  hard: { label: 'Hard', blurb: 'The computer plays a bit above its ratings with sharper tactics.', boost: 5, blunder: 0.08 },
  legend: { label: 'Legend', blurb: 'The computer plays well above its ratings and never gets tactics wrong.', boost: 10, blunder: 0 },
}

export interface FormatConfig {
  overs: number
  maxBowlerOvers: number
  partTimerMaxOvers: number
  phases: Record<Phase, [firstOver: number, lastOver: number]>
}

export const FORMATS: Record<MatchFormat, FormatConfig> = {
  t20: { overs: 20, maxBowlerOvers: 4, partTimerMaxOvers: 2, phases: { powerplay: [0, 5], middle: [6, 14], death: [15, 19] } },
  odi: { overs: 50, maxBowlerOvers: 10, partTimerMaxOvers: 5, phases: { powerplay: [0, 9], middle: [10, 39], death: [40, 49] } },
}

export const phaseOf = (format: MatchFormat, over: number): Phase => {
  const p = FORMATS[format].phases
  return over <= p.powerplay[1] ? 'powerplay' : over <= p.middle[1] ? 'middle' : 'death'
}

export interface Pitch {
  ease: number // + helps batting, - helps bowling
  pace: number // seam/bounce assist for fast bowlers
  spin: number // turn for spinners
}

export type DismissalKind = 'bowled' | 'caught' | 'lbw' | 'run out' | 'stumped' | 'caught and bowled' | 'hit wicket'

export interface Dismissal {
  kind: DismissalKind
  bowlerId: string | null // credited bowler (null for run outs)
  fielderId: string | null
}

export type ExtraType = 'wide' | 'noball' | 'bye' | 'legbye'

export interface BallEvent {
  seq: number
  innings: 0 | 1
  over: number // 0-based
  ballInOver: number // legal balls bowled in the over before this delivery
  legal: boolean
  strikerId: string
  nonStrikerId: string
  bowlerId: string
  runsBat: number
  extraType: ExtraType | null
  extraRuns: number
  total: number
  boundary: 0 | 4 | 6
  wicket: (Dismissal & { playerId: string }) | null
  intent: number
  freeHit: boolean
  /** Score once this delivery is complete. */
  score: { runs: number; wickets: number; legalBalls: number }
  /** Moments worth a callout: fifty, hundred, hat-trick, maiden, etc. */
  tags: string[]
}

export interface BatterLine {
  id: string
  runs: number
  balls: number
  fours: number
  sixes: number
  dismissal: Dismissal | null
}

export interface BowlerLine {
  id: string
  legalBalls: number
  runs: number
  wickets: number
  maidens: number
  dots: number
  wides: number
  noballs: number
}

export interface Innings {
  index: 0 | 1
  battingSide: 0 | 1
  runs: number
  wickets: number
  legalBalls: number
  extras: { wides: number; noballs: number; byes: number; legByes: number }
  batters: BatterLine[]
  strikerId: string
  nonStrikerId: string
  nextBatsman: number // index into the batting order
  bowlers: Map<string, BowlerLine>
  bowlerId: string | null
  prevBowlerId: string | null
  overRuns: number // runs conceded in the current over (for maidens)
  fow: { runs: number; wickets: number; playerId: string; over: number; balls: number }[]
  target: number | null
  freeHit: boolean
  done: boolean
  log: BallEvent[]
}

export interface Side {
  team: Team
  xi: Player[]
}

export interface MatchResult {
  winnerSide: 0 | 1 | null // null = tie
  margin: { type: 'runs' | 'wickets'; value: number; ballsLeft?: number } | null
  text: string
}

export interface TossResult {
  callerSide: 0 | 1
  call: 'heads' | 'tails'
  coin: 'heads' | 'tails'
  winnerSide: 0 | 1
  decision: 'bat' | 'bowl'
}
