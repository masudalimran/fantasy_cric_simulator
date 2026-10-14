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

/** The direction a ball's shot went: the one a person chose, or the stable pick from the ball number. */
export const eventAngle = (ev: { seq: number; shot?: { angle: number } }) => ev.shot?.angle ?? shotAngle(ev.seq)

/** How far a six went, in metres: a stable figure from the ball number and the batsman's power (no randomness, so a replay always agrees). */
export function sixDistance(seq: number, power: number): number {
  // 60 to 200 m. Most sixes land between 60 and 110; a big one clears 110 to 150; a monster (150 to 200, everything lined up the batsman's way) is very rare,
  // and a harder hitter gets both more often.
  const u = frac(seq * 0.7548776662 + 0.31)
  const pick = frac(seq * 0.5698402910 + 0.77)
  const depth = frac(seq * 0.8191725134 + 0.13)
  const pMonster = Math.max(0.004, Math.min(0.03, 0.01 + Math.max(0, power - 70) * 0.0007))
  const pBig = Math.max(0.04, Math.min(0.22, 0.1 + (power - 60) * 0.003))
  if (pick < pMonster) return Math.round(150 + 50 * depth ** 2)
  if (pick < pMonster + pBig) return Math.round(110 + 40 * depth ** 1.4)
  return Math.max(60, Math.min(125, Math.round(60 + 45 * u ** 1.3 + (power - 60) * 0.25)))
}
