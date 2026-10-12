import type { DeliveryAim, Length, ShotAim } from './types'

/**
 * What a player's own choices do to a ball. Used only when a person has set a shot (batting) or a delivery (bowling);
 * with nothing set the ball is simulated exactly as before. Every choice trades something for something, so no single
 * option is best: a lofted shot into a gap is worth sixes but loses the batsman now and then, a yorker is hard to hit but
 * costs a full toss if it is missed, and so on.
 */

// ---- The field, as the batsman sees it -------------------------------------------------------------------------

/** Where the fielders stand (the same spots the field view draws), and how deep each one is. */
const SPOTS = [
  { x: 90, y: 81, deep: 0.1 }, // slip
  { x: 111, y: 64, deep: 0.5 }, // point
  { x: 107, y: 48, deep: 0.55 }, // cover
  { x: 112, y: 30, deep: 0.6 }, // mid-off
  { x: 48, y: 30, deep: 0.6 }, // mid-on
  { x: 53, y: 49, deep: 0.55 }, // midwicket
  { x: 49, y: 65, deep: 0.5 }, // square leg
  { x: 63, y: 83, deep: 0.5 }, // fine leg
  { x: 66, y: 17, deep: 1 }, // long-on
]
const HIT = { x: 80, y: 66 }

/** Screen angle (radians) to degrees from straight: 0 = straight back, positive = off side. */
export const degOf = (angle: number) => {
  let d = ((angle + Math.PI / 2) * 180) / Math.PI
  while (d > 180) d -= 360
  while (d <= -180) d += 360
  return d
}

/** How crowded a direction is with fielders (0 = a clear gap, about 1 = well guarded). */
export function fieldCover(angle: number): number {
  let c = 0
  for (const s of SPOTS) {
    const a = Math.atan2(s.y - HIT.y, s.x - HIT.x)
    let d = Math.abs(a - angle)
    if (d > Math.PI) d = 2 * Math.PI - d
    c += Math.exp(-((d / 0.32) ** 2))
  }
  return c
}

// ---- Multipliers on the ball's outcome odds ----------------------------------------------------------------

export interface Mods { wicket: number; four: number; six: number; dot: number; one: number; wide: number }
const neutral = (): Mods => ({ wicket: 1, four: 1, six: 1, dot: 1, one: 1, wide: 1 })
const mul = (a: Mods, b: Partial<Mods>) => { for (const k of Object.keys(b) as (keyof Mods)[]) a[k] *= b[k] as number }

const LENGTH: Record<Length, Partial<Mods>> = {
  yorker: { wicket: 1.22, four: 0.86, six: 0.62, dot: 1.14 },
  full: { wicket: 1.04, four: 1.14, six: 1.0, dot: 0.9 },
  good: { wicket: 0.95, four: 0.92, six: 0.86, dot: 1.08 },
  short: { wicket: 0.95, four: 1.1, six: 1.38, dot: 0.97 },
}

/** The average crowding over the arc in front of the bat; gaps are measured against it so a random shot is neutral. */
const MEAN_COVER = (() => {
  let t = 0
  const n = 40
  for (let k = 0; k < n; k++) t += fieldCover(-Math.PI + ((k + 0.5) / n) * Math.PI)
  return t / n
})()

/**
 * The odds multipliers for one ball given the shot the batsman is playing and/or the delivery the bowler is bowling.
 * `repeat` is true when the bowler sends down the same line and length again: the batsman has read it.
 */
export function aimMods(shot: ShotAim | null | undefined, ball: DeliveryAim | null | undefined, bowlerAccuracy = 70, repeat = false): Mods {
  const m = neutral()

  if (ball) {
    mul(m, LENGTH[ball.length])
    const off = ball.line // +2 wide outside off ... 0 stumps ... -2 down the leg side
    if (off === 0) mul(m, { wicket: 1.1, four: 1.0 })
    else if (off === 1) mul(m, { dot: 1.05, wicket: 1.03, four: 0.94 })
    else if (off === 2) mul(m, { dot: 1.1, wicket: 0.9, four: 0.86, wide: 1.9 })
    else if (off === -1) mul(m, { four: 1.05, wicket: 0.95, one: 1.06 })
    else mul(m, { four: 1.14, six: 1.04, wicket: 0.72, one: 1.08, wide: 1.7 })
    if (ball.pace === 'fast') mul(m, { wicket: 1.05, four: 1.06, six: 1.04 })
    else if (ball.pace === 'slow') mul(m, { wicket: 0.98, four: 0.94, six: 0.94, dot: 1.04 })
    // an inaccurate bowler sometimes misses the spot (a yorker becomes a full toss), and the tighter the aim the more it hurts
    const miss = Math.max(0, (82 - bowlerAccuracy) / 260) * (ball.length === 'yorker' ? 1.8 : 1)
    mul(m, { four: 1 + miss * 1.4, six: 1 + miss * 1.4, dot: 1 - miss * 0.7, wicket: 1 - miss * 0.4, wide: 1 + miss })
    // the same ball again and again is read by the batsman
    if (repeat) mul(m, { wicket: 0.85, four: 1.12, six: 1.12, dot: 0.93 })
  }

  if (shot) {
    const deg = degOf(shot.angle)
    const away = Math.abs(deg)
    // straight is natural; behind square is awkward
    if (away > 105) mul(m, { wicket: 1.2, four: 0.8, six: 0.7 })
    else if (away < 35) mul(m, { wicket: 0.96 })
    // find the gap: boundaries and runs where the fielders are not, tight where they are
    const cover = fieldCover(shot.angle)
    const gap = Math.max(0.75, Math.min(1.3, 1 + 0.3 * (MEAN_COVER - cover)))
    mul(m, { four: gap, six: shot.loft ? 1 + (gap - 1) * 0.5 : 1, one: gap > 1 ? 1.05 : 0.95, dot: gap > 1 ? 0.95 : 1.07 })
    if (shot.loft) mul(m, { six: 1.5, four: 0.85, wicket: 1.2, dot: 0.92, one: 0.92 })
    else mul(m, { six: 0.6, four: 1.1, wicket: 0.9, dot: 1.02, one: 1.04 })
    // playing across the line of the delivery is the classic way to get out
    if (ball) {
      const across = (ball.line >= 1 && deg < -25) || (ball.line <= -1 && deg > 25)
      if (across) mul(m, { wicket: 1.18, four: 0.88 })
      else if (ball.line !== 0 && Math.abs(deg) > 25) mul(m, { four: 1.08 }) // along the line: cut or flick
    }
  }
  return m
}
