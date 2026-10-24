import type { MatchFormat, Player, Team } from '../types'

export type Phase = 'powerplay' | 'middle' | 'death'

/** Batting intent as a number: -1 defend, 0 normal for the phase, +1 attack, +2 slog. */
/** How the bowling side sets out to bowl: safe (tidy, fewer wickets and boundaries), normal, or aggressive (wicket-hunting, more risk). */
export type BowlStyle = 'safe' | 'normal' | 'aggressive'
export const BOWL_STYLE_VALUE: Record<BowlStyle, number> = { safe: -1, normal: 0, aggressive: 1 }
/** Where in the pitch a delivery lands. */
export type Length = 'yorker' | 'full' | 'good' | 'short'
export type Pace = 'fast' | 'medium' | 'slow'
/** A delivery chosen by the bowling side: the line (+2 wide of off ... 0 stumps ... -2 down the leg side), length and pace. */
export interface DeliveryAim { line: -2 | -1 | 0 | 1 | 2; length: Length; pace: Pace }
/** A shot chosen by the batting side: the direction on the field view (radians, screen angle) and whether it goes in the air. */
export interface ShotAim { angle: number; loft: boolean }
export type Intent = 'defend' | 'normal' | 'attack' | 'slog'
export const INTENT_VALUE: Record<Intent, number> = { defend: -1, normal: 0, attack: 1, slog: 2 }

/** How hard the computer-run teams make it for the player. Only matches involving your own team are affected. */
export type Difficulty = 'easy' | 'normal' | 'hard' | 'legend'

export const DIFFICULTIES: Record<Difficulty, { label: string; blurb: string; /** rating points added to every computer player (negative = weaker) */ boost: number; /** rating points added to every player on YOUR team */ help: number; /** how often the computer makes a poor tactical call (0 = never) */ blunder: number }> = {
  easy: { label: 'Easy', blurb: 'Your team plays much better than its ratings and the computer slips up often.', boost: -6, help: 5, blunder: 0.45 },
  normal: { label: 'Normal', blurb: 'Friendly: your team gets a helping hand and the computer is fair.', boost: 0, help: 3, blunder: 0.2 },
  hard: { label: 'Hard', blurb: 'No help. Ratings decide it, and the computer has sharper tactics.', boost: 2, help: 0, blunder: 0.08 },
  legend: { label: 'Legend', blurb: 'The computer plays above its ratings and never gets tactics wrong.', boost: 6, help: 0, blunder: 0 },
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
  // a Test has no overs limit of its own: five days of about 90 overs, with the time kept by the match (see TEST_DAYS). overs is the most that can be bowled in all.
  test: { overs: 510, maxBowlerOvers: 45, partTimerMaxOvers: 14, phases: { powerplay: [0, 19], middle: [20, 79], death: [80, 999] } },
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
  innings: 0 | 1 | 2 | 3
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
  /** What the people in charge chose for this ball, when they chose anything. */
  shot?: ShotAim
  delivery?: DeliveryAim
  /** For a six: how far it went, in metres. */
  distance?: number
  /** Score once this delivery is complete. */
  score: { runs: number; wickets: number; legalBalls: number }
  /** Moments worth a callout: fifty, hundred, hat-trick, maiden, etc. */
  tags: string[]
  /** The bowling side appealed (an lbw, a catch behind) or a run out was checked, and what the umpire said on the field: `out` true means out, false means not out. A close call that was turned down is a not-out appeal. */
  appeal?: { kind: 'lbw' | 'edge' | 'runout'; out: boolean }
  /** A challenge was made on this ball (see drs.ts): the wicket in `wicket` is the decision after it. */
  review?: import('./drs').Review
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

/** What the sky does on a day of a Test, and how many overs it costs. */
export type Weather = 'clear' | 'overcast' | 'drizzle' | 'rain' | 'bad light' | 'washout'

/** One day of a Test as it was planned: how long the day is meant to be (88 to 102 overs) and how much the weather takes from it. */
export interface TestDay { day: number; weather: Weather; lost: number; scheduled: number }

/** Where a Test is on the clock. */
export interface TestClock { day: number; ballsToday: number; plan: TestDay; stumps: boolean }

export interface Innings {
  index: 0 | 1 | 2 | 3
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
  /** Test: the captain closed the innings. */
  declared?: boolean
  /** Test: this is the second innings of a side that was made to follow on. */
  followOn?: boolean
  /** Challenges each side has left in this innings (the batting side's and the fielding side's). */
  reviews?: { bat: number; bowl: number }
  log: BallEvent[]
}

export interface Side {
  team: Team
  xi: Player[]
}

export interface MatchResult {
  winnerSide: 0 | 1 | null // null = tie or draw
  /** A Test that ran out of time with nobody winning. */
  draw?: boolean
  margin: { type: 'runs' | 'wickets' | 'innings'; value: number; ballsLeft?: number } | null
  text: string
}

export interface TossResult {
  callerSide: 0 | 1
  call: 'heads' | 'tails'
  coin: 'heads' | 'tails'
  winnerSide: 0 | 1
  decision: 'bat' | 'bowl'
}
