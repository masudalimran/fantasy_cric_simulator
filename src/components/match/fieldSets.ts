import { phaseOf } from '../../engine/types'
import type { BowlType, Hand, MatchFormat } from '../../types'

/**
 * Where the fielders stand at different stages of a match. This is scenery only: the engine never reads it, so no result,
 * replay or old save changes. Each slot keeps the same direction from the bat in every set (only the depth and a name change),
 * so a fielder walks a short way when the field is reset.
 */
export type FieldStage = 'powerplay' | 'middle' | 'death' | 'freehit' | 'lockdown'
export interface FieldSpot { x: number; y: number; spot: string }

type Row = [x: number, y: number, spot: string]

/** Slot 0 is the keeper, then slip, point, cover, mid-off, mid-on, midwicket, square leg, fine leg, long-on. For a right-hander (off side to the right). */
const SETS: Record<FieldStage, Row[]> = {
  // the first six overs: catchers in, only two out on the rope
  powerplay: [
    [80, 82, 'Wicketkeeper'], [90, 80, 'Slip'], [103, 72, 'Gully'], [100, 54, 'Short cover'], [99, 40, 'Mid-off'],
    [61, 40, 'Mid-on'], [57, 52, 'Midwicket'], [55, 66, 'Short square leg'], [62, 87, 'Fine leg (deep)'], [66, 17, 'Long-on (deep)'],
  ],
  // the usual ring with a few out
  middle: [
    [80, 82, 'Wicketkeeper'], [90, 81, 'Slip'], [111, 64, 'Point'], [107, 48, 'Cover'], [112, 30, 'Mid-off'],
    [48, 30, 'Mid-on'], [53, 49, 'Midwicket'], [49, 65, 'Square leg'], [63, 83, 'Fine leg'], [66, 17, 'Long-on'],
  ],
  // the last overs: most of the field back on the rope
  death: [
    [80, 82, 'Wicketkeeper'], [102, 84, 'Third man'], [110, 66, 'Point'], [138, 46, 'Deep cover'], [114, 16, 'Long-off'],
    [46, 16, 'Long-on'], [22, 46, 'Deep midwicket'], [50, 66, 'Square leg'], [62, 87, 'Fine leg (deep)'], [64, 32, 'Mid-on'],
  ],
  // after a no-ball, or when a few runs win it in the last over: everyone on the rope
  freehit: [
    [80, 82, 'Wicketkeeper'], [102, 84, 'Third man'], [134, 66, 'Deep point'], [138, 46, 'Deep cover'], [112, 17, 'Long-off'],
    [48, 17, 'Long-on'], [22, 46, 'Deep midwicket'], [26, 70, 'Deep square leg'], [62, 87, 'Fine leg (deep)'], [134, 30, 'Deep extra cover'],
  ],
  lockdown: [
    [80, 82, 'Wicketkeeper'], [102, 84, 'Third man'], [134, 66, 'Deep point'], [138, 46, 'Deep cover'], [112, 17, 'Long-off'],
    [48, 17, 'Long-on'], [22, 46, 'Deep midwicket'], [26, 70, 'Deep square leg'], [62, 87, 'Fine leg (deep)'], [134, 30, 'Deep extra cover'],
  ],
}

/** The names that swap sides when the field is mirrored for a left-hander. */
const SWAP: Record<string, string> = {
  'Mid-off': 'Mid-on', 'Mid-on': 'Mid-off', Cover: 'Midwicket', Midwicket: 'Cover',
  'Short cover': 'Short midwicket', 'Short midwicket': 'Short cover', Point: 'Square leg', 'Square leg': 'Point',
  'Short square leg': 'Backward point', 'Backward point': 'Short square leg', 'Long-off': 'Long-on', 'Long-on': 'Long-off',
  'Long-on (deep)': 'Long-off (deep)', 'Deep cover': 'Deep midwicket', 'Deep midwicket': 'Deep cover', 'Deep point': 'Deep square leg',
  'Deep square leg': 'Deep point', 'Deep extra cover': 'Deep backward square', 'Third man': 'Fine leg', 'Fine leg': 'Third man',
  'Fine leg (deep)': 'Third man (deep)', 'Short leg': 'Silly point',
}

export interface FieldCtx {
  format: MatchFormat
  /** The over being bowled, from 0. */
  over: number
  /** Overs in the innings. */
  maxOvers: number
  /** The score and legal balls before the ball in question, and the target when chasing. */
  runs: number
  legalBalls: number
  target: number | null
  /** The ball is, or follows, a no-ball: a free hit. */
  freeHit: boolean
  bowlType: BowlType | null
  hand: Hand
  /** Draw the right-hander's field even for a left-hander (when a person is aiming shots at it). */
  noMirror?: boolean
}

export interface FieldPlan {
  stage: FieldStage
  /** The small tag shown on the field, and a few words saying why the fielders stand there. */
  label: string
  note: string
  spots: FieldSpot[]
}

const TAGS: Record<FieldStage, { label: string; note: string }> = {
  powerplay: { label: 'Powerplay field', note: 'catchers in, only two on the rope' },
  middle: { label: 'Middle overs field', note: 'a ring with a few out' },
  death: { label: 'Death overs field', note: 'the field drops back to the rope' },
  freehit: { label: 'Free hit field', note: 'everyone out on the rope' },
  lockdown: { label: 'Last over field', note: 'everyone guards the boundary' },
}

/** Few enough runs to win that the fielding side spreads out to stop the boundary. */
const LOCKDOWN_RUNS = 12

export function fieldStage(c: FieldCtx): FieldStage {
  if (c.freeHit) return 'freehit'
  // a Test: slips and a close ring while the ball is new, a spread field after that (never the slog-over field)
  if (c.format === 'test') return c.over < 20 ? 'powerplay' : 'middle'
  if (c.target !== null) {
    const ballsLeft = c.maxOvers * 6 - c.legalBalls
    const need = c.target - c.runs
    if (ballsLeft > 0 && ballsLeft <= 6 && need > 0 && need <= LOCKDOWN_RUNS) return 'lockdown'
  }
  return phaseOf(c.format, c.over)
}

const isSpin = (t: BowlType | null) => t === 'offspin' || t === 'legspin' || t === 'leftspin'

export function fieldPlan(c: FieldCtx): FieldPlan {
  const stage = fieldStage(c)
  let rows: Row[] = SETS[stage].map((r) => [...r] as Row)
  let note = TAGS[stage].note
  // against spin in the early and middle overs the keeper stands up to the stumps and a man crouches at short leg
  if (isSpin(c.bowlType) && (stage === 'powerplay' || stage === 'middle')) {
    rows[0] = [80, 78.5, 'Wicketkeeper']
    rows[1] = [69, 77, 'Short leg']
    note = stage === 'powerplay' ? 'spin on: keeper up, a man at short leg' : 'spin on: keeper up to the stumps'
  }
  // a left-hander turns the whole field around
  if (c.hand === 'L' && !c.noMirror) rows = rows.map(([x, y, s]) => [160 - x, y, SWAP[s] ?? s])
  return { stage, label: TAGS[stage].label, note, spots: rows.map(([x, y, spot]) => ({ x, y, spot })) }
}
