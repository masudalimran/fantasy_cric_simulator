/**
 * Where a scoring shot went. The engine decides runs, not directions, so the direction is a stable
 * pseudo-random pick from the ball number (mostly in front of the bat, occasionally behind it).
 * The field view and the wagon wheel both use this, so they always agree.
 */
const frac = (n: number) => n - Math.floor(n)

/** Angle in radians in screen coordinates (y down): straight back down the ground is -PI/2. */
export function shotAngle(seq: number): number {
  const u = frac(seq * 0.6180339887)
  const v = frac(seq * 0.3819660113 + 0.5)
  return v > 0.88 ? Math.PI * (0.1 + 0.8 * u) : -Math.PI * (0.05 + 0.9 * u)
}

/** Degrees clockwise from straight (0 = back over the bowler's head, + = off side for a right-hander). */
export function degreesFromStraight(angle: number, leftHanded = false): number {
  let d = ((angle + Math.PI / 2) * 180) / Math.PI
  while (d > 180) d -= 360
  while (d <= -180) d += 360
  return leftHanded ? -d : d
}

export const SECTORS = ['Straight', 'Cover', 'Point', 'Third man', 'Behind', 'Fine leg', 'Square leg', 'Midwicket'] as const

/** One of eight 45-degree zones, centred on 0, 45, 90, 135, 180, 225, 270 and 315 degrees. */
export function sectorIndex(deg: number): number {
  const d = ((deg % 360) + 360) % 360
  return Math.round(d / 45) % 8
}

/** How far down the ground a shot travels, as a share of the way to the boundary. */
export const reachFactor = (runs: number) => (runs >= 6 ? 1.12 : runs === 4 ? 1 : runs === 3 ? 0.78 : runs === 2 ? 0.56 : runs === 1 ? 0.34 : 0.1)
