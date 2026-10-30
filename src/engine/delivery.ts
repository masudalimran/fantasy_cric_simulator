import { DRAGON_KMH } from './speed'
import type { BallEvent } from './types'

/**
 * How a ball was bowled, for show: where it pitched (a yorker, a full toss, a short one), how high it reached the batsman, and how much it swung in the air
 * (a seamer) or turned off the pitch (a spinner). All of it is worked out from the ball number, the bowler's own ratings and what happened to the ball,
 * and the engine never reads it, so no result changes: the same ball is just drawn bowled the way it would most likely have been bowled.
 */
export type LengthKind = 'beamer' | 'fullToss' | 'lowFullToss' | 'yorker' | 'full' | 'good' | 'short' | 'bouncer'

export interface DeliveryLook {
  length: LengthKind
  /** Metres from the batsman's stumps where it pitched (negative: towards the bowler); null when it did not bounce at all. */
  pitchZ: number | null
  /** How high the ball is as it reaches the batsman, in metres. */
  height: number
  /** Degrees the ball swung in the air or turned off the pitch: the sign is the side in the picture (+ to the right as seen from behind the bowler). */
  swing: number
  turn: number
  /** A seamer or a spinner. */
  pace: boolean
  /** Why a no ball was a no ball: the front foot over the line, or a ball above the batsman's waist. */
  noBallCause: 'overstep' | 'beamer' | null
}

/** A swing or a turn this big is worth a replay of its own. */
export const SWING_BIG = 2.6
export const TURN_BIG = 7.5

const hash01 = (n: number) => { const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s) }
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

export const LENGTH_WORDS: Record<LengthKind, string> = { beamer: 'Beamer', fullToss: 'Full toss', lowFullToss: 'Low full toss', yorker: 'Yorker', full: 'Full', good: 'Good length', short: 'Short', bouncer: 'Bouncer' }

type Bowler = { bowling?: { type: string; variation: number } | null }

export function deliveryOf(
  ev: Pick<BallEvent, 'seq' | 'delivery' | 'runsBat' | 'boundary' | 'wicket' | 'extraType' | 'legal'>,
  bowler: Bowler | null | undefined,
  cond: { overcast?: boolean } = {},
): DeliveryLook {
  const type = bowler?.bowling?.type ?? 'medium'
  const pace = type === 'fast' || type === 'medium'
  const vari = clamp(((bowler?.bowling?.variation ?? 50) - 35) / 55, 0, 1)
  const u = hash01(ev.seq * 2.37 + 0.11), u2 = hash01(ev.seq * 5.71 + 0.53)
  // a no ball is a front foot over the line most of the time, and now and then a ball above the waist
  const beamer = ev.extraType === 'noball' && hash01(ev.seq * 6.3) < 0.3
  let length: LengthKind
  if (beamer) length = 'beamer'
  else if (ev.delivery) length = ev.delivery.length === 'yorker' ? 'yorker' : ev.delivery.length === 'full' ? 'full' : ev.delivery.length === 'good' ? 'good' : 'short'
  else {
    // the mix of lengths a seamer and a spinner bowl
    const mix: [LengthKind, number][] = pace
      ? [['yorker', 0.08], ['full', 0.22], ['good', 0.38], ['short', 0.17], ['bouncer', 0.07], ['lowFullToss', 0.05], ['fullToss', 0.03]]
      : [['yorker', 0.02], ['full', 0.36], ['good', 0.47], ['short', 0.09], ['lowFullToss', 0.03], ['fullToss', 0.03]]
    const total = mix.reduce((n, m) => n + m[1], 0)
    let acc = 0
    length = 'good'
    for (const [k, w] of mix) { acc += w / total; if (u <= acc) { length = k; break } }
    // what happened to the ball says something about how it was bowled: a ball that was bowled or trapped was full or a yorker, one hit for four or six
    // was a poor length, one that was kept out was a good one
    const bowledLike = !!ev.wicket && (ev.wicket.kind === 'bowled' || ev.wicket.kind === 'lbw')
    if (bowledLike && u2 < 0.7) length = u2 < 0.3 ? 'yorker' : 'full'
    else if (ev.boundary && !ev.wicket && u2 < 0.55) length = u2 < 0.14 ? 'lowFullToss' : u2 < 0.22 ? 'fullToss' : u2 < 0.38 ? 'short' : 'full'
    else if (ev.runsBat === 0 && ev.legal && !ev.wicket && !ev.extraType && u2 < 0.3) length = u2 < 0.1 ? 'yorker' : 'good'
  }
  // (the bat meets the ball about 1.25 m in front of the stumps, so even a yorker pitches ahead of that, at the toes)
  const h9 = hash01(ev.seq * 1.9)
  const pitchZ = length === 'yorker' ? -(1.35 + h9 * 0.65) : length === 'full' ? -(2.2 + h9 * 2.2) : length === 'good' ? -(4.6 + h9 * 2.8)
    : length === 'short' ? -(7.6 + h9 * 2.4) : length === 'bouncer' ? -(10.4 + h9 * 2.5) : null
  const h = hash01(ev.seq * 4.9)
  const height = length === 'beamer' ? 1.8 + h * 0.5 : length === 'fullToss' ? 0.95 + h * 0.4 : length === 'lowFullToss' ? 0.35 + h * 0.3 : length === 'yorker' ? 0.1 + h * 0.12
    : length === 'full' ? 0.35 + h * 0.25 : length === 'good' ? 0.7 + h * 0.2 : length === 'short' ? 1.0 + h * 0.2 : 1.5 + h * 0.25
  // swing for a seamer (a little more under cloud), turn for a spinner; a seamer gets a touch of movement off the seam and a spinner a touch of drift
  // a spinner mostly turns the ball his usual way (an off-spinner one way, a leg-spinner and a left-armer the other) and now and then bowls the one that goes the other way (a doosra, a googly)
  const natural = type === 'offspin' ? 1 : -1
  const dirS = hash01(ev.seq * 8.1) < 0.5 ? -1 : 1, dirT = pace ? (hash01(ev.seq * 9.7) < 0.5 ? -1 : 1) : hash01(ev.seq * 9.7) < 0.8 ? natural : -natural
  const kick = ev.wicket && (ev.wicket.kind === 'bowled' || ev.wicket.kind === 'lbw' || ev.wicket.kind === 'caught') ? 1.3 : 1
  const swingMag = pace ? Math.pow(hash01(ev.seq * 3.3), 2.2) * (1.1 + vari * 2 + (cond.overcast ? 0.9 : 0)) * kick : hash01(ev.seq * 3.3) * 0.35
  const turnMag = pace ? Math.pow(hash01(ev.seq * 4.1), 2.4) * 1.4 : Math.pow(hash01(ev.seq * 4.1), 1.8) * (3 + vari * 8) * kick
  return {
    length, pitchZ, height, pace,
    swing: dirS * clamp(swingMag, 0, 4.2), turn: dirT * clamp(turnMag, 0, 11),
    noBallCause: ev.extraType === 'noball' ? (beamer ? 'beamer' : 'overstep') : null,
  }
}

/** Which replay screen a delivery earns, if any: a beamer always; a good yorker that was kept out; a swing or a turn that was really big. */
export function deliveryScreen(
  ev: Pick<BallEvent, 'seq' | 'runsBat' | 'boundary' | 'wicket' | 'extraType' | 'legal'>,
  dv: DeliveryLook,
  /** The speed of the ball: a dragon ball (see engine/speed.ts) always earns its screen. */
  kmh?: number,
): 'beamer' | 'yorker' | 'swing' | 'turn' | 'dragon' | null {
  if (dv.noBallCause === 'beamer') return 'beamer'
  if (kmh !== undefined && kmh >= DRAGON_KMH && ev.legal && !ev.extraType) return 'dragon'
  if (ev.extraType || ev.wicket || ev.boundary || !ev.legal) return null
  if (dv.length === 'yorker' && ev.runsBat === 0 && hash01(ev.seq * 5.9) < 0.7) return 'yorker'
  if (dv.pace && Math.abs(dv.swing) >= SWING_BIG && hash01(ev.seq * 7.3) < 0.85) return 'swing'
  if (!dv.pace && Math.abs(dv.turn) >= TURN_BIG && hash01(ev.seq * 7.7) < 0.85) return 'turn'
  return null
}

/** A poor length hit for runs (a full toss, a low full toss) is named on its four or six screen. */
export const isPoorLength = (dv: DeliveryLook) => dv.length === 'fullToss' || dv.length === 'lowFullToss'


/**
 * What kind of ball it was, in a word or two, for the label on the picture: a spinner's leg break, off break, googly or doosra (by which way it turned
 * against his usual way), arm ball or slider; a seamer's out swing, in swing, off cutter, leg cutter, slower ball, yorker, bouncer or full toss. Worked out
 * from how the ball was bowled (`dv`), so it always agrees with the picture. For show only.
 * `left` is whether the batsman is left-handed (which way is "in" turns round).
 */
export function ballName(dv: DeliveryLook, o: { type: string; pace?: string | null; left: boolean; kmh?: number }): string {
  if (o.kmh !== undefined && o.kmh >= DRAGON_KMH) return 'Dragon ball'
  if (dv.noBallCause === 'beamer') return 'Beamer'
  const into = (deg: number) => (deg > 0) !== o.left // towards the batsman's body (his leg side)
  if (!dv.pace) {
    const natural = o.type === 'offspin' ? 1 : -1
    const usual = Math.sign(dv.turn) === natural
    if (dv.length === 'fullToss' || dv.length === 'lowFullToss') return 'Full toss'
    if (o.pace === 'fast' && Math.abs(dv.turn) < 3) return 'Slider'
    if (Math.abs(dv.turn) < 1.2) return o.type === 'legspin' ? 'Top-spinner' : 'Arm ball'
    if (o.type === 'offspin') return usual ? 'Off break' : 'Doosra'
    if (o.type === 'legspin') return usual ? 'Leg break' : 'Googly'
    return usual ? 'Left-arm spin' : 'Wrong-un'
  }
  if (dv.length === 'yorker') return 'Yorker'
  if (dv.length === 'bouncer') return 'Bouncer'
  if (dv.length === 'fullToss' || dv.length === 'lowFullToss') return 'Full toss'
  if (o.pace === 'slow') return 'Slower ball'
  if (Math.abs(dv.swing) >= 1.1) return into(dv.swing) ? 'In swing' : 'Out swing'
  if (Math.abs(dv.turn) >= 0.8) return into(dv.turn) ? 'Off cutter' : 'Leg cutter'
  if (dv.length === 'short') return 'Short ball'
  return o.type === 'fast' ? 'Seam up' : 'Straight one'
}
