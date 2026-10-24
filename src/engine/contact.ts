import type { BallEvent } from './types'

/**
 * What the shot looked like at the moment of contact: where on the bat the ball hit, how fast the bat was moving, and how well timed it was. It is
 * worked out from the ball (how far a six went, how a catch happened) and the batsman's power, with a small spread from the ball number, so the same
 * ball always gives the same picture. A big six is a ball middled by a fast bat on the sweet spot at the perfect moment; a catch is an edge, a
 * top edge, a toe end or a mistimed shot. Scenery only: the engine never reads it, so no result changes.
 */
export interface Contact {
  /** Where on the face: along the bat from the toe (-1) through the sweet spot (0) to the shoulder (+1), and across it from the inside edge (-1) to the outside edge (+1). */
  along: number
  across: number
  /** Bat speed in km/h. */
  speed: number
  /** Timing in milliseconds: 0 is perfect, negative is early, positive is late. */
  timing: number
  /** 0 (a miscue) to 1 (middled). */
  quality: number
  /** Where it hit, in words. */
  spot: 'Middle' | 'Off centre' | 'Toe end' | 'Top edge' | 'Outside edge' | 'Inside edge'
  timingLabel: string
  speedLabel: string
  /** The bat was slow or the timing was poor: a reason why. */
  weak: boolean
}

const hash = (n: number) => { const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s) }
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const signOf = (h: number) => (h < 0.5 ? -1 : 1)

export const speedLabel = (kmh: number) => (kmh < 88 ? 'Slow bat' : kmh < 102 ? 'Medium pace' : kmh < 116 ? 'Fast bat' : 'Blistering')
export function timingLabel(ms: number): string {
  const a = Math.abs(ms)
  if (a <= 6) return 'Perfect timing'
  if (ms < 0) return a > 26 ? 'Far too early' : 'A touch early'
  return a > 26 ? 'Far too late' : 'A touch late'
}
function spotOf(along: number, across: number, quality: number): Contact['spot'] {
  if (quality >= 0.8) return 'Middle'
  if (along >= 0.6) return 'Top edge'
  if (along <= -0.55) return 'Toe end'
  if (across >= 0.55) return 'Outside edge'
  if (across <= -0.55) return 'Inside edge'
  return 'Off centre'
}

function build(quality: number, speed: number, timing: number, along: number, across: number): Contact {
  const q = clamp(quality, 0, 1)
  const sp = Math.round(clamp(speed, 62, 134))
  const tm = Math.round(clamp(timing, -60, 60))
  const a = clamp(along, -1, 1), c = clamp(across, -1, 1)
  return { along: +a.toFixed(2), across: +c.toFixed(2), speed: sp, timing: tm, quality: +q.toFixed(2), spot: spotOf(a, c, q), timingLabel: timingLabel(tm), speedLabel: speedLabel(sp), weak: sp < 88 || Math.abs(tm) > 26 }
}

/**
 * A six: the further it went, the better it was hit. The distance sets how well it was middled, how fast the bat was and how close to perfect the
 * timing was (a harder hitter, by his power rating, swings faster for the same distance).
 */
export function sixContact(ev: Pick<BallEvent, 'seq' | 'distance'>, power: number): Contact {
  const q = clamp(((ev.distance ?? 70) - 55) / 120, 0, 1)
  const p = clamp((power - 40) / 55, 0, 1)
  const speed = 88 + 28 * q + 8 * p + (hash(ev.seq * 1.3) - 0.5) * 5
  const off = (1 - q) * 0.78 + 0.04
  const timing = signOf(hash(ev.seq * 2.1)) * (1 - q) * 30 * (0.6 + hash(ev.seq * 3.7) * 0.6)
  return build(0.55 + 0.45 * q, speed, timing, signOf(hash(ev.seq * 4.3)) * off * 0.85, signOf(hash(ev.seq * 5.9)) * off * 0.5)
}

/**
 * A four: well hit but not as perfectly as the biggest sixes. How well comes from how attacking the batsman was and his power; a harder hit is nearer the
 * sweet spot with a faster bat, a ball that merely found the gap is hit off a part of the bat and a touch early or late.
 */
export function fourContact(ev: Pick<BallEvent, 'seq' | 'intent'>, power: number): Contact {
  const p = clamp((power - 40) / 55, 0, 1)
  const a = clamp((ev.intent + 1) / 3, 0, 1)
  const q = clamp(0.42 + 0.3 * p + 0.15 * a + (hash(ev.seq * 1.9) - 0.5) * 0.3, 0.2, 0.92)
  const off = (1 - q) * 0.9
  return build(q, 86 + 14 * q + 8 * p + (hash(ev.seq * 2.7) - 0.5) * 6, signOf(hash(ev.seq * 3.3)) * (1 - q) * 28, signOf(hash(ev.seq * 4.9)) * off * 0.8, signOf(hash(ev.seq * 5.7)) * off * 0.55)
}

export type CatchCause = 'edge' | 'skier' | 'toe' | 'mistimed'
/** How a catch came about, from the kind of catch: a catch behind or at slip is an edge, a high one a top edge, a low one in the ring a toe end, and one in the deep a mistimed shot. */
export function catchCause(g: { seq: number; byKeeper: boolean; peak: number; dist: number }): CatchCause {
  if (g.byKeeper || (g.dist < 12 && g.peak < 3)) return 'edge'
  if (g.peak >= 6) return hash(g.seq * 2.2) < 0.7 ? 'skier' : 'mistimed'
  if (g.dist > 28) return hash(g.seq * 2.2) < 0.65 ? 'mistimed' : 'skier'
  return hash(g.seq * 2.2) < 0.55 ? 'toe' : 'mistimed'
}

/** The contact for a catch, by its cause. An edge nicks the outside of the bat; a skier is off the top edge; a toe end is low down; a mistimed shot is early or late, with a slow bat. */
export function catchContact(seq: number, cause: CatchCause, power: number): Contact {
  const p = clamp((power - 40) / 55, 0, 1)
  const r = (k: number) => hash(seq * k)
  switch (cause) {
    case 'edge': return build(0.12 + r(1.7) * 0.15, 86 + p * 14 + r(2.9) * 8, signOf(r(3.1)) * (4 + r(3.3) * 10), (r(4.1) - 0.5) * 0.7, signOf(r(5.3)) * (0.82 + r(6.1) * 0.16))
    case 'skier': return build(0.18 + r(1.9) * 0.14, 92 + p * 14 + r(2.7) * 8, 14 + r(3.5) * 16, 0.82 + r(4.3) * 0.16, (r(5.1) - 0.5) * 0.6)
    case 'toe': return build(0.2 + r(1.3) * 0.14, 78 + p * 12 + r(2.3) * 8, -(6 + r(3.7) * 14), -(0.78 + r(4.9) * 0.2), (r(5.7) - 0.5) * 0.5)
    case 'mistimed': return build(0.3 + r(1.1) * 0.18, 72 + p * 10 + r(2.5) * 10, signOf(r(3.9)) * (30 + r(4.5) * 24), (r(5.5) - 0.5) * 0.7, (r(6.5) - 0.5) * 0.6)
  }
}

/** One line on why the batsman was out, from where the ball met the bat, how fast the bat was and the timing. */
export function catchVerdict(cause: CatchCause, c: Contact, caughtBy: string): string {
  const slow = c.speed < 88 ? ' The bat speed was poor.' : ''
  switch (cause) {
    case 'edge': return `An edge off the ${c.across > 0 ? 'outside' : 'inside'} of the bat, taken by ${caughtBy}.${slow}`
    case 'skier': return `Off the top edge, and it goes up and up for ${caughtBy}.${slow}`
    case 'toe': return `Down at the toe of the bat with little power behind it, held by ${caughtBy}.${slow}`
    case 'mistimed': return `${c.timing < 0 ? 'Early' : 'Late'} on the shot, under-timed, and ${caughtBy} takes it.${slow}`
  }
}
