import type { Player } from '../types'
import type { BallEvent } from './types'

/**
 * How fast a ball was bowled, in km/h. It is worked out from the bowler (his kind and his ratings) and the delivery he chose, with a small
 * spread from the ball number, so a replay always gives the same figure. It is only for show: the match engine never reads it, so no result changes.
 */
const hash = (n: number) => { const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s) }

/** A very quick ball (145 km/h and up) is drawn as a fireball and a very slow one (under 80) as a snowball; the rest are plain. Looks only. */
export const FIRE_KMH = 145
export const ICE_KMH = 80
export type BallStyle = 'plain' | 'fire' | 'ice'
export const speedStyle = (kmh: number): BallStyle => (kmh >= FIRE_KMH ? 'fire' : kmh < ICE_KMH ? 'ice' : 'plain')

export function ballSpeed(ev: Pick<BallEvent, 'seq' | 'delivery'>, bowler: Pick<Player, 'bowling'>): number {
  const b = bowler.bowling
  const type = b?.type ?? 'medium'
  // better and fitter bowlers are quicker: a 0 to 1 figure from the ratings
  const q = b ? Math.max(0, Math.min(1, (b.variation * 0.5 + b.accuracy * 0.2 + b.stamina * 0.3 - 35) / 60)) : 0.3
  let base = type === 'fast' ? 126 + q * 26 : type === 'medium' ? 108 + q * 20 : type === 'offspin' ? 76 + q * 16 : type === 'legspin' ? 72 + q * 14 : 74 + q * 14
  // the pace he chose for this ball
  const pace = ev.delivery?.pace
  const spin = type !== 'fast' && type !== 'medium'
  if (pace === 'fast') base += spin ? 5 : 6
  else if (pace === 'slow') base -= spin ? 7 : 14
  const len = ev.delivery?.length
  if (len === 'yorker') base += 2
  else if (len === 'short') base += 1
  const spread = (hash(ev.seq * 1.37) - 0.5) * (spin ? 8 : 9)
  return Math.round(Math.max(60, Math.min(spin ? 105 : 158, base + spread)))
}
