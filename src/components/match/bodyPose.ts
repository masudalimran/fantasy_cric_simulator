/**
 * The bodies of the broadcast view: a small skeleton drawn in code (the player's picture is only the head).
 * A pose says where the hands and feet are; the elbows and knees are worked out so the arms and legs keep their length.
 * Everything here is plain numbers (no React, no DOM), and looks only: nothing in here is read by the engine.
 *
 * The figure is drawn in a 60 x 120 box, feet on the ground at the bottom, seen from the front (as from the bowler's end).
 * Angles are in degrees and 0 points straight down; a positive angle swings towards the left of the screen.
 */

import type { Flavor } from '../../data/flavors'

export interface P { x: number; y: number }

export interface Pose {
  /** The middle of the hips. */
  hip: P
  /** The body leaning sideways, in degrees (positive: the top goes right). */
  lean: number
  /** The head's own movement away from the top of the body, and its tilt. */
  head: { dx: number; dy: number; tilt: number }
  /** The hands, measured from the middle of the shoulders. */
  handL: P
  handR: P
  /** The feet, on the box. */
  footL: P
  footR: P
  /** A bat held by the right hand (both hands when `two`), at this angle. */
  bat: number | null
  two: boolean
  /** A ball in the right hand. */
  ball: boolean
}

export const SH = 12 // half the width of the shoulders
export const HW = 7 // half the width of the hips
export const TORSO = 30
export const UPPER = 15
export const FORE = 14
export const THIGH = 16
export const SHIN = 17
export const BAT_LEN = 36

const rad = (d: number) => (d * Math.PI) / 180
const lerp = (a: number, b: number, k: number) => a + (b - a) * k
const lerpP = (a: P, b: P, k: number): P => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) })
export const clamp01 = (t: number) => Math.max(0, Math.min(1, t))
const ease = (t: number) => { const c = clamp01(t); return c * c * (3 - 2 * c) }
/** The direction an angle points in (0 is straight down, a positive angle swings to the left of the screen). */
export const dirOf = (deg: number): P => ({ x: -Math.sin(rad(deg)), y: Math.cos(rad(deg)) })

export const standing = (): Pose => ({
  hip: { x: 30, y: 85.3 }, lean: 0, head: { dx: 0, dy: 0, tilt: 0 },
  handL: { x: -10, y: 24 }, handR: { x: 10, y: 24 }, footL: { x: 25, y: 117 }, footR: { x: 35, y: 117 }, bat: null, two: false, ball: false,
})

export function mixPose(a: Pose, b: Pose, k: number): Pose {
  return {
    hip: lerpP(a.hip, b.hip, k), lean: lerp(a.lean, b.lean, k),
    head: { dx: lerp(a.head.dx, b.head.dx, k), dy: lerp(a.head.dy, b.head.dy, k), tilt: lerp(a.head.tilt, b.head.tilt, k) },
    handL: lerpP(a.handL, b.handL, k), handR: lerpP(a.handR, b.handR, k), footL: lerpP(a.footL, b.footL, k), footR: lerpP(a.footR, b.footR, k),
    bat: a.bat === null ? b.bat : b.bat === null ? a.bat : lerp(a.bat, b.bat, k),
    two: k < 0.5 ? a.two : b.two, ball: k < 0.5 ? a.ball : b.ball,
  }
}

/**
 * A pose mixed the way a body really moves: the feet lead (the stride goes first), the hands and bat follow, and the head arrives last (it stays on the ball).
 * `k` may go a little below 0 (a wind-up) or above 1 (a follow-through that overshoots and then settles).
 */
export function mixFlow(a: Pose, b: Pose, k: number): Pose {
  const feet = k < 0 ? k : Math.min(1.08, k * 1.25), head = k < 0 ? k : k > 1 ? k : Math.pow(k, 1.35)
  const m = mixPose(a, b, k)
  return {
    ...m,
    footL: lerpP(a.footL, b.footL, feet), footR: lerpP(a.footR, b.footR, feet),
    head: { dx: lerp(a.head.dx, b.head.dx, head), dy: lerp(a.head.dy, b.head.dy, head), tilt: lerp(a.head.tilt, b.head.tilt, head) },
  }
}

/**
 * The stroke as one flowing movement (`s` is how far through it, 0 to 1; 0.44 is contact). The bat winds back a touch, speeds up into the ball so it
 * is going fastest at contact (it no longer stops there), then the follow-through carries a little past its finish and settles. The head stays down on the ball.
 */
export function strokePose(shot: { b: Pose; c: Pose; f: Pose }, s: number): Pose {
  let p: Pose
  if (s < 0.44) {
    const u = s / 0.44
    const wind = u < 0.3 ? -0.09 * Math.sin((Math.PI * u) / 0.3) : 0
    p = mixFlow(shot.b, shot.c, Math.pow(u, 1.7) + wind)
  } else {
    const u = (s - 0.44) / 0.56
    p = mixFlow(shot.c, shot.f, 1 - Math.pow(1 - u, 2.2) + 0.05 * Math.sin(Math.PI * u) * (1 - u))
  }
  const down = Math.sin(Math.PI * clamp01((s - 0.2) / 0.55))
  return { ...p, head: { ...p.head, dy: p.head.dy + 1.4 * down } }
}

/** The same pose as a left-handed person would strike it (everything turned about the middle of the box). */
export function mirrorPose(p: Pose): Pose {
  const m = (q: P): P => ({ x: 60 - q.x, y: q.y })
  const r = (q: P): P => ({ x: -q.x, y: q.y })
  return { hip: m(p.hip), lean: -p.lean, head: { dx: -p.head.dx, dy: p.head.dy, tilt: -p.head.tilt }, handL: r(p.handR), handR: r(p.handL), footL: m(p.footR), footR: m(p.footL), bat: p.bat === null ? null : -p.bat, two: p.two, ball: p.ball }
}

// ---- the skeleton --------------------------------------------------------------------------------------------------------

export interface Skeleton {
  head: P
  shoulderL: P; shoulderR: P; hipL: P; hipR: P
  elbowL: P; handL: P; elbowR: P; handR: P
  kneeL: P; footL: P; kneeR: P; footR: P
  batTip: P | null; batBlade: P | null; batEnd: P | null
}

/** Two bones from `root` that reach for `target` (as near as they can): where the joint and the end land. */
export function reach(root: P, target: P, a: number, b: number, bend: 1 | -1): { mid: P; end: P } {
  const dx = target.x - root.x, dy = target.y - root.y
  const raw = Math.hypot(dx, dy) || 0.001
  const d = Math.max(Math.abs(a - b) + 0.01, Math.min(a + b - 0.01, raw))
  const base = Math.atan2(dy, dx)
  const cosA = Math.max(-1, Math.min(1, (a * a + d * d - b * b) / (2 * a * d)))
  const ang = base + bend * Math.acos(cosA)
  return { mid: { x: root.x + Math.cos(ang) * a, y: root.y + Math.sin(ang) * a }, end: { x: root.x + (dx / raw) * d, y: root.y + (dy / raw) * d } }
}

export function solve(p: Pose, batLen = BAT_LEN): Skeleton {
  const l = rad(p.lean)
  const up = { x: Math.sin(l), y: -Math.cos(l) }
  const side = { x: Math.cos(l), y: Math.sin(l) }
  const S: P = { x: p.hip.x + up.x * TORSO, y: p.hip.y + up.y * TORSO }
  const shoulderL = { x: S.x - side.x * SH, y: S.y - side.y * SH }
  const shoulderR = { x: S.x + side.x * SH, y: S.y + side.y * SH }
  const hipL = { x: p.hip.x - HW, y: p.hip.y }
  const hipR = { x: p.hip.x + HW, y: p.hip.y }
  const armR = reach(shoulderR, { x: S.x + p.handR.x, y: S.y + p.handR.y }, UPPER, FORE, -1)
  let batTip: P | null = null, batBlade: P | null = null, batEnd: P | null = null
  let targetL: P = { x: S.x + p.handL.x, y: S.y + p.handL.y }
  if (p.bat !== null) {
    const d = dirOf(p.bat)
    const g = armR.end
    batEnd = { x: g.x - d.x * 5, y: g.y - d.y * 5 }
    batBlade = { x: g.x + d.x * 9, y: g.y + d.y * 9 }
    batTip = { x: g.x + d.x * batLen, y: g.y + d.y * batLen }
    if (p.two) targetL = { x: g.x - d.x * 3.5, y: g.y - d.y * 3.5 }
  }
  const armL = reach(shoulderL, targetL, UPPER, FORE, 1)
  const legL = reach(hipL, p.footL, THIGH, SHIN, 1)
  const legR = reach(hipR, p.footR, THIGH, SHIN, -1)
  const tilt = rad(p.head.tilt)
  void tilt
  return {
    head: { x: p.hip.x + up.x * (TORSO + 30) + p.head.dx, y: p.hip.y + up.y * (TORSO + 30) + p.head.dy },
    shoulderL, shoulderR, hipL, hipR, elbowL: armL.mid, handL: armL.end, elbowR: armR.mid, handR: armR.end,
    kneeL: legL.mid, footL: legL.end, kneeR: legR.mid, footR: legR.end, batTip, batBlade, batEnd,
  }
}

// ---- what kind of shot a ball got ------------------------------------------------------------------------------------------

export type ShotStyle = 'defend' | 'drive' | 'straight' | 'cut' | 'pull' | 'flick' | 'sweep' | 'reverse' | 'ramp' | 'scoop' | 'loft' | 'beaten' | 'leave'

/**
 * Which shot the batsman plays, from where the ball went and how it was bowled. For show only: the same ball, the same result, whatever he is
 * drawn doing. `side` is how far the ball went to the leg side of the batsman (negative: the off side), `ahead` how far down the ground towards the
 * bowler (negative: behind the wicket).
 */
export function classifyShot(c: { swing: boolean; wide: boolean; runsBat: number; boundary: 0 | 4 | 6; air: boolean; kind: string; side: number; ahead: number; length: number; speed: number; seq: number }): ShotStyle {
  if (c.wide) return 'leave'
  if (c.kind === 'stumps' || c.kind === 'pad' || (!c.swing && c.runsBat === 0)) return 'beaten'
  if (c.runsBat === 0 && c.kind === 'ground' && c.boundary === 0) return 'defend'
  if (c.kind === 'keeper' && c.runsBat === 0 && c.boundary === 0) return c.seq % 3 === 0 ? 'leave' : 'beaten'
  const short = c.length < -7.5
  const full = c.length > -4.5
  const dist = Math.hypot(c.side, c.ahead)
  if (c.runsBat === 0 && dist < 12) return 'defend'
  if (c.boundary === 6) return short && c.side > 4 ? 'pull' : 'loft'
  const behind = c.ahead < -3
  if (behind) {
    // behind the wicket: a ramp over the keeper off a quick short ball, a scoop off a full one down the leg side, a reverse sweep off a spinner, otherwise a cut, a glance or a pull
    if (c.air && short && c.speed >= 125 && c.side <= 6 && c.seq % 2 === 0) return 'ramp'
    if (c.air && c.length > -3.2 && c.side > 3 && c.ahead < -8 && c.seq % 2 === 1) return 'scoop'
    if (c.speed < 105 && c.side < -2 && c.seq % 3 === 0) return 'reverse'
    return c.side > 3 && short ? 'pull' : c.side > 3 ? 'flick' : 'cut'
  }
  if (c.side > 4) return short ? 'pull' : c.speed < 105 && !full && c.seq % 2 === 0 ? 'sweep' : 'flick'
  if (c.air && c.boundary === 4 && c.seq % 2 === 0) return 'loft'
  if (c.side < -9 && short) return 'cut'
  // down the ground: a straight drive, upright, otherwise a drive through the off side
  if (Math.abs(c.side) < 8 && c.ahead > 6) return 'straight'
  return 'drive'
}

// ---- batsmen ------------------------------------------------------------------------------------------------------------

const batPose = (hip: P, lean: number, grip: P, angle: number, footL: P, footR: P, tilt = 0): Pose => ({
  hip, lean, head: { dx: 0, dy: 0, tilt }, handL: { x: 0, y: 0 }, handR: grip, footL, footR, bat: angle, two: true, ball: false,
})

/** Waiting at the crease with the bat resting by the foot, one hand on the handle. */
const WAIT: Pose = { ...batPose({ x: 30, y: 85.5 }, -3, { x: 9, y: 22 }, -18, { x: 24, y: 117 }, { x: 36, y: 117 }, 3), two: false, handL: { x: -9, y: 23 } }
const STANCE = batPose({ x: 30, y: 88 }, 3, { x: -5, y: 21 }, 24, { x: 21, y: 117 }, { x: 39, y: 117 })
const LIFT = batPose({ x: 30, y: 88 }, 1, { x: -9, y: 10 }, 158, { x: 21, y: 117 }, { x: 39, y: 117 })

/** Where the bat and body are as the ball is met (`c`) and when the shot is finished (`f`), for each kind of shot, for a right-hander. */
const SHOTS: Record<ShotStyle, { b: Pose; c: Pose; f: Pose }> = {
  defend: {
    b: batPose({ x: 30, y: 88 }, 1, { x: -5, y: 15 }, 172, { x: 21, y: 117 }, { x: 39, y: 117 }),
    c: batPose({ x: 29, y: 91 }, 8, { x: -5, y: 23 }, 6, { x: 19, y: 118 }, { x: 40, y: 116 }, 4),
    f: batPose({ x: 29, y: 91 }, 8, { x: -5, y: 23 }, 4, { x: 19, y: 118 }, { x: 40, y: 116 }, 4),
  },
  drive: {
    b: LIFT,
    c: batPose({ x: 28, y: 92 }, 9, { x: -13, y: 20 }, 38, { x: 17, y: 118 }, { x: 41, y: 115 }, 3),
    f: batPose({ x: 30, y: 87 }, 3, { x: 3, y: -14 }, 208, { x: 20, y: 118 }, { x: 40, y: 112 }),
  },
  loft: {
    b: batPose({ x: 30, y: 88 }, -4, { x: -9, y: 2 }, 166, { x: 20, y: 117 }, { x: 40, y: 117 }, -3),
    c: batPose({ x: 30, y: 89 }, 0, { x: -9, y: 21 }, 18, { x: 19, y: 117 }, { x: 41, y: 116 }),
    f: batPose({ x: 31, y: 86 }, -12, { x: 9, y: -17 }, 218, { x: 24, y: 117 }, { x: 40, y: 111 }, -5),
  },
  cut: {
    b: batPose({ x: 30, y: 89 }, -2, { x: -8, y: 3 }, 168, { x: 20, y: 117 }, { x: 40, y: 117 }),
    c: batPose({ x: 31, y: 89 }, -8, { x: -15, y: 7 }, 96, { x: 14, y: 117 }, { x: 44, y: 114 }, -3),
    f: batPose({ x: 31, y: 89 }, -10, { x: -7, y: 15 }, 58, { x: 13, y: 117 }, { x: 45, y: 113 }, -4),
  },
  pull: {
    b: batPose({ x: 30, y: 89 }, -2, { x: -6, y: 2 }, 118, { x: 20, y: 117 }, { x: 40, y: 117 }),
    c: batPose({ x: 30, y: 89 }, -6, { x: 8, y: 5 }, -96, { x: 20, y: 116 }, { x: 40, y: 117 }, -3),
    f: batPose({ x: 30, y: 88 }, -9, { x: 11, y: -8 }, -152, { x: 24, y: 117 }, { x: 38, y: 113 }, -6),
  },
  flick: {
    b: LIFT,
    c: batPose({ x: 30, y: 90 }, 4, { x: 6, y: 19 }, -34, { x: 19, y: 118 }, { x: 40, y: 116 }),
    f: batPose({ x: 30, y: 89 }, 5, { x: 11, y: 11 }, -66, { x: 20, y: 118 }, { x: 40, y: 115 }),
  },
  sweep: {
    b: batPose({ x: 30, y: 102 }, 4, { x: -4, y: 16 }, 64, { x: 14, y: 117 }, { x: 45, y: 114 }),
    c: batPose({ x: 32, y: 105 }, 15, { x: 7, y: 27 }, -80, { x: 11, y: 117 }, { x: 47, y: 116 }, 5),
    f: batPose({ x: 32, y: 104 }, 14, { x: 15, y: 20 }, -122, { x: 11, y: 117 }, { x: 47, y: 116 }, 5),
  },
  straight: {
    b: LIFT,
    c: batPose({ x: 29, y: 91 }, 6, { x: -7, y: 23 }, 12, { x: 19, y: 118 }, { x: 41, y: 115 }, 3),
    f: batPose({ x: 30, y: 86 }, 2, { x: -2, y: -16 }, 198, { x: 22, y: 118 }, { x: 38, y: 111 }, -2),
  },
  reverse: {
    b: batPose({ x: 30, y: 101 }, -2, { x: 6, y: 16 }, -58, { x: 15, y: 117 }, { x: 45, y: 114 }),
    c: batPose({ x: 29, y: 104 }, -9, { x: -11, y: 26 }, 72, { x: 12, y: 117 }, { x: 46, y: 116 }, -4),
    f: batPose({ x: 29, y: 103 }, -10, { x: -19, y: 19 }, 84, { x: 12, y: 117 }, { x: 46, y: 116 }, -5),
  },
  ramp: {
    b: batPose({ x: 30, y: 89 }, -2, { x: -10, y: 2 }, 162, { x: 21, y: 117 }, { x: 39, y: 117 }),
    c: batPose({ x: 31, y: 88 }, -12, { x: -12, y: -8 }, 118, { x: 21, y: 117 }, { x: 40, y: 114 }, -5),
    f: batPose({ x: 31, y: 87 }, -14, { x: -16, y: -16 }, 98, { x: 22, y: 117 }, { x: 40, y: 112 }, -6),
  },
  scoop: {
    b: batPose({ x: 30, y: 99 }, 3, { x: -5, y: 22 }, 22, { x: 17, y: 117 }, { x: 43, y: 115 }),
    c: batPose({ x: 31, y: 101 }, -9, { x: -3, y: 27 }, 2, { x: 15, y: 117 }, { x: 45, y: 116 }, -5),
    f: batPose({ x: 31, y: 98 }, -14, { x: 7, y: -4 }, -148, { x: 17, y: 117 }, { x: 45, y: 114 }, -7),
  },
  beaten: {
    b: LIFT,
    c: batPose({ x: 29, y: 91 }, 9, { x: -12, y: 20 }, 34, { x: 18, y: 118 }, { x: 40, y: 116 }, 3),
    f: batPose({ x: 29, y: 91 }, 9, { x: -8, y: 18 }, 24, { x: 18, y: 118 }, { x: 40, y: 116 }, 3),
  },
  leave: {
    b: batPose({ x: 30, y: 88 }, -2, { x: -5, y: 6 }, 172, { x: 21, y: 117 }, { x: 39, y: 117 }),
    c: batPose({ x: 30, y: 89 }, -7, { x: -5, y: -6 }, 178, { x: 20, y: 117 }, { x: 40, y: 117 }, -4),
    f: batPose({ x: 30, y: 89 }, -7, { x: -5, y: -6 }, 178, { x: 20, y: 117 }, { x: 40, y: 117 }, -4),
  },
}

/**
 * How a team's heritage changes the way its batsmen stand, lift the bat, finish a big shot and celebrate (mixed over the ordinary shot, so a drive is
 * still a drive): a swordsman holds the bat like a sword, a fighter plants his feet wide, a ninja crouches, a mage leans on the bat like a staff.
 */
interface FlavorSet { stance: Pose; lift: Pose; finish: Pose; joy: Pose }
const FLAVORS: Record<Exclude<Flavor, 'plain'>, FlavorSet> = {
  samurai: {
    stance: batPose({ x: 30, y: 86.5 }, 0, { x: -3, y: 12 }, 168, { x: 22, y: 117 }, { x: 38, y: 117 }),
    lift: batPose({ x: 30, y: 87 }, 0, { x: -4, y: -4 }, 186, { x: 22, y: 117 }, { x: 38, y: 117 }),
    finish: batPose({ x: 30, y: 90 }, 6, { x: -10, y: 18 }, 52, { x: 18, y: 118 }, { x: 40, y: 114 }, 4),
    joy: batPose({ x: 30, y: 87 }, 0, { x: 2, y: 20 }, 86, { x: 22, y: 117 }, { x: 38, y: 117 }, 6),
  },
  fighter: {
    stance: batPose({ x: 30, y: 92 }, 4, { x: -9, y: 17 }, 34, { x: 16, y: 117 }, { x: 44, y: 117 }),
    lift: batPose({ x: 30, y: 93 }, 3, { x: -12, y: 8 }, 150, { x: 15, y: 117 }, { x: 45, y: 117 }),
    finish: { ...standing(), hip: { x: 30, y: 90 }, lean: -4, handR: { x: 16, y: -14 }, handL: { x: -15, y: 4 }, bat: 204, two: false, footL: { x: 17, y: 117 }, footR: { x: 43, y: 114 } },
    joy: { ...standing(), hip: { x: 30, y: 92 }, lean: -6, head: { dx: 0, dy: 0, tilt: -9 }, handR: { x: 17, y: 24 }, handL: { x: -17, y: 24 }, bat: 24, two: false, footL: { x: 16, y: 117 }, footR: { x: 44, y: 117 } },
  },
  ninja: {
    stance: batPose({ x: 30, y: 93 }, 8, { x: 6, y: 22 }, 148, { x: 20, y: 117 }, { x: 40, y: 117 }, 3),
    lift: batPose({ x: 30, y: 94 }, 9, { x: 8, y: 14 }, 128, { x: 20, y: 117 }, { x: 40, y: 117 }, 3),
    finish: batPose({ x: 30, y: 93 }, 10, { x: -14, y: 24 }, 28, { x: 16, y: 117 }, { x: 42, y: 115 }, 5),
    joy: { ...standing(), hip: { x: 30, y: 90 }, lean: 2, handR: { x: 3, y: 6 }, handL: { x: -3, y: 6 }, bat: null, two: false, footL: { x: 24, y: 117 }, footR: { x: 36, y: 117 } },
  },
  mage: {
    stance: { ...batPose({ x: 30, y: 85.5 }, 0, { x: -12, y: 16 }, 178, { x: 24, y: 117 }, { x: 36, y: 117 }), two: false, handL: { x: -12, y: 24 } },
    lift: { ...batPose({ x: 30, y: 85.5 }, -1, { x: -12, y: 4 }, 180, { x: 24, y: 117 }, { x: 36, y: 117 }), two: false, handL: { x: -13, y: 14 } },
    finish: { ...batPose({ x: 30, y: 86 }, -3, { x: 8, y: -22 }, 192, { x: 24, y: 117 }, { x: 36, y: 115 }, -4), two: false, handL: { x: -14, y: 12 } },
    joy: { ...batPose({ x: 30, y: 85.5 }, 0, { x: 13, y: -24 }, 186, { x: 24, y: 117 }, { x: 36, y: 117 }, -5), two: false, handL: { x: -14, y: -20 } },
  },
  hero: {
    stance: { ...batPose({ x: 30, y: 87 }, 2, { x: 4, y: 17 }, 56, { x: 22, y: 117 }, { x: 38, y: 117 }), two: false, handL: { x: -11, y: 22 } },
    lift: { ...batPose({ x: 30, y: 88 }, 2, { x: 6, y: 8 }, 100, { x: 21, y: 117 }, { x: 39, y: 117 }), two: false, handL: { x: -12, y: 20 } },
    finish: batPose({ x: 30, y: 88 }, 3, { x: -6, y: 10 }, 120, { x: 22, y: 117 }, { x: 38, y: 114 }, 2),
    joy: { ...batPose({ x: 30, y: 86 }, 0, { x: 4, y: 14 }, 70, { x: 22, y: 117 }, { x: 38, y: 117 }), two: false, handL: { x: -15, y: 10 } },
  },
}

export interface BatCtx {
  flavor?: Flavor
  style: ShotStyle
  /** Seconds into the clip, when the bowler lets go of the ball, and when the ball reaches the bat. */
  t: number; t1: number; t2: number
  /** How far through the stroke (0 to 1; 0.44 is the moment of contact). */
  swing: number
  hurt: number
  raise: number
  /** Hop for joy (0 to 1) and whether it is for a boundary. */
  joy: number
  /** Metres a second he is moving at (0 when standing), and the leg cycle. */
  speed: number
  cyc: number
  /** He walks off with his head down. */
  walkOff: boolean
}

export function batsmanPose(c: BatCtx): Pose {
  const base = SHOTS[c.style]
  const fl = c.flavor && c.flavor !== 'plain' ? FLAVORS[c.flavor] : null
  // the heritage mixes into the stance, the back-lift and the finish of a big shot; the contact stays the shot's own
  const big = c.style === 'loft' || c.style === 'drive' || c.style === 'straight' || c.style === 'pull'
  const shot = fl ? { b: mixPose(base.b, fl.lift, 0.5), c: base.c, f: big ? mixPose(base.f, fl.finish, 0.6) : base.f } : base
  const lift = ease((c.t - (c.t1 - 0.5)) / Math.max(0.2, c.t2 - 0.25 - (c.t1 - 0.5)))
  let p = mixPose(fl ? fl.stance : STANCE, shot.b, lift)
  if (c.swing > 0) p = strokePose(shot, c.swing)
  if (c.hurt > 0) p = mixPose(p, { ...standing(), hip: { x: 30, y: 94 }, lean: 12, head: { dx: 0, dy: 3, tilt: 8 }, handL: { x: -6, y: 24 }, handR: { x: 8, y: 26 }, bat: 40, two: false, footL: { x: 23, y: 117 }, footR: { x: 37, y: 117 } }, c.hurt * 0.8)
  // once the shot is done he settles, bat by his foot, until he runs or the next ball comes
  if (c.swing >= 1 && c.raise === 0 && c.joy === 0) p = mixPose(p, WAIT, ease((c.t - (c.t2 + 0.9)) / 0.5))
  if (c.speed > 0.5) p = locomotion(carryBat(p), c.speed, c.cyc, c.walkOff)
  if (c.walkOff) p = mixPose(p, { ...p, head: { dx: 0, dy: 3, tilt: 6 }, lean: 3 }, 1)
  if (c.raise > 0) p = mixPose(p, { ...standing(), hip: { x: 30, y: 88 }, lean: -3, head: { dx: 0, dy: 0, tilt: -3 }, handR: { x: 15, y: -24 }, handL: { x: -13, y: -19 }, bat: 188, two: false }, ease(c.raise))
  if (c.joy > 0) {
    const hop = Math.sin(Math.PI * clamp01(c.joy * 3)) * (c.joy < 0.34 ? 1 : 0)
    p = mixPose(p, fl ? fl.joy : { ...standing(), lean: 0, handR: { x: 14, y: -20 }, handL: { x: -14, y: -16 }, bat: 186, two: false }, ease(c.joy * 3) * 0.9)
    p.hip = { ...p.hip, y: p.hip.y - hop * 4 }
  }
  return p
}

/** One hand carries the bat, pointing down and a little forward. */
function carryBat(p: Pose): Pose {
  return { ...p, handR: { x: 11, y: 22 }, handL: { x: -10, y: 24 }, bat: 14, two: false, lean: 0, hip: { x: 30, y: 85.5 }, footL: { x: 24, y: 117 }, footR: { x: 36, y: 117 } }
}

/**
 * A person standing still is never quite still: he breathes, shifts his weight and nods a little. `t` is the time, `seed` makes each person different,
 * `amp` is how much (0 for none).
 */
export function breathe(p: Pose, t: number, seed: number, amp = 1): Pose {
  if (amp <= 0) return p
  const a = Math.sin(t * 2.1 + seed * 1.7), b = Math.sin(t * 1.3 + seed * 2.9)
  return {
    ...p,
    hip: { x: p.hip.x + b * 0.35 * amp, y: p.hip.y + a * 0.55 * amp },
    head: { dx: p.head.dx, dy: p.head.dy - a * 0.3 * amp, tilt: p.head.tilt + b * 0.8 * amp },
    handL: { x: p.handL.x, y: p.handL.y + a * 0.5 * amp },
    handR: { x: p.handR.x, y: p.handR.y + a * 0.5 * amp },
  }
}

/** Legs and arms going for a walk or a run: `speed` in metres a second, `cyc` the angle of the stride. */
export function locomotion(p: Pose, speed: number, cyc: number, slow = false): Pose {
  const k = clamp01(speed / 6)
  const lift = (slow ? 3 : 4) + 7 * k
  const a = Math.sin(cyc), b = Math.sin(cyc + Math.PI)
  const swing = (slow ? 3 : 5) + 6 * k
  return {
    ...p,
    hip: { x: p.hip.x, y: p.hip.y + k * 2 - Math.abs(a) * (1 + 2 * k) },
    footL: { x: p.footL.x + 3 * a, y: p.footL.y - Math.max(0, a) * lift },
    footR: { x: p.footR.x + 3 * b, y: p.footR.y - Math.max(0, b) * lift },
    handL: p.bat !== null && p.two ? p.handL : { x: p.handL.x - 1, y: p.handL.y - a * swing + 2 * k },
    handR: p.bat !== null ? p.handR : { x: p.handR.x + 1, y: p.handR.y - b * swing + 2 * k },
  }
}

export interface RunnerCtx { speed: number; cyc: number; bat: boolean; walkOff?: boolean }

/** The batsman at the other end: waiting with his bat, or running with it. */
export function nonStrikerPose(c: RunnerCtx & { t: number; t1: number; joy?: number }): Pose {
  return c.speed > 0.5 ? locomotion(carryBat(WAIT), c.speed, c.cyc, !!c.walkOff) : WAIT
}

// ---- bowlers -------------------------------------------------------------------------------------------------------------

export interface BowlCtx {
  /** Seconds in, and the moments the bowler lets go (t1) and the ball meets the bat (t2). */
  t: number; t1: number; t2: number
  /** The bowling arm's turn (0 to 1), his speed along the ground and the stride. */
  arm: number; speed: number; cyc: number
  /** Joy (0 to 1) after a wicket, and whether this ball had one. */
  joy: number; wicket: boolean
}

export function bowlerPose(c: BowlCtx): Pose {
  const run = c.t < c.t1 - 0.34
  let p: Pose = { ...standing(), ball: true }
  // running in, the ball held up at the chest, both fists pumping
  const runPose = () => locomotion({ ...p, hip: { x: 30, y: 86 }, handR: { x: 6, y: 12 }, handL: { x: -6, y: 14 }, lean: 0 }, Math.max(3, c.speed), c.cyc)
  if (run) {
    p = runPose()
  } else {
    // the jump and the whirl of the arm: the front arm points up and pulls down as the bowling arm comes over
    const a = clamp01(c.arm)
    const load = ease((c.t - (c.t1 - 0.34)) / 0.2)
    const ang = a * 330
    const dir = dirOf(-ang)
    const R = 25
    const handR: P = lerpP({ x: 6, y: 12 }, { x: dir.x * R, y: dir.y * R }, ease(a * 8))
    const front = 1 - ease((a - 0.35) / 0.5)
    p = {
      ...p,
      hip: { x: 30, y: 88 - 5 * Math.sin(Math.PI * clamp01(load)) + 5 * ease((a - 0.6) / 0.4) },
      lean: lerp(-4, 7, ease((a - 0.4) / 0.5)),
      handR, handL: { x: lerp(-12, -13, front), y: lerp(20, -18, front) },
      footL: { x: 20, y: lerp(117, 119, ease(a)) }, footR: { x: 40, y: lerp(117, 112, ease((a - 0.5) / 0.5)) },
      head: { dx: 0, dy: 2 * ease(a), tilt: 3 },
      ball: a < 0.7,
    }
    if (c.t > c.t1 + 0.1) {
      // after the follow-through he gets his breath back
      const k = ease((c.t - c.t1 - 0.1) / 0.5)
      p = mixPose(p, { ...standing(), hip: { x: 30, y: 86 }, lean: 4, handL: { x: -8, y: 26 }, handR: { x: 8, y: 26 } }, k)
      p.ball = false
    }
    if (c.speed > 1) p = locomotion(p, c.speed * 0.6, c.cyc, true)
    // the last strides melt into the jump instead of snapping to it
    const into = clamp01((c.t - (c.t1 - 0.34)) / 0.14)
    if (into < 1) p = mixFlow(runPose(), p, ease(into))
  }
  if (c.wicket && c.joy > 0) p = mixPose(p, { ...standing(), handL: { x: -17, y: -22 }, handR: { x: 17, y: -22 } }, ease(c.joy * 2.5))
  return p
}

// ---- fielders and the keeper -----------------------------------------------------------------------------------------------

export interface FieldCtx {
  speed: number; cyc: number
  /** How ready he is for the ball (0 at ease, 1 crouched at the moment of the shot). */
  ready: number
  /** A dive (0 to 1). */
  dive: number
  /** Hands up for a catch (0 to 1) and joy afterwards (0 to 1). */
  catchK: number; joy: number
  /** Down on one knee to stop the ball (0 to 1) and the throw (0 to 1, 0 when not throwing). */
  stop: number; throwK: number
  keeper: boolean
}

export function fielderPose(c: FieldCtx): Pose {
  const idle: Pose = c.keeper
    ? { ...standing(), hip: { x: 30, y: 97 }, footL: { x: 16, y: 117 }, footR: { x: 44, y: 117 }, handL: { x: -12, y: 26 }, handR: { x: 12, y: 26 }, head: { dx: 0, dy: 2, tilt: 0 } }
    : { ...standing(), handL: { x: -8, y: 24 }, handR: { x: 8, y: 24 } }
  const ready: Pose = c.keeper
    ? { ...idle, hip: { x: 30, y: 100 }, handL: { x: -9, y: 22 }, handR: { x: 9, y: 22 } }
    : { ...idle, hip: { x: 30, y: 90 }, footL: { x: 21, y: 117 }, footR: { x: 39, y: 117 }, handL: { x: -9, y: 22 }, handR: { x: 9, y: 22 }, head: { dx: 0, dy: 2, tilt: 0 } }
  let p = mixPose(idle, ready, ease(c.ready))
  if (c.speed > 0.8) p = locomotion({ ...p, hip: { x: 30, y: 85.5 } }, c.speed, c.cyc)
  if (c.stop > 0) p = mixPose(p, { ...standing(), hip: { x: 31, y: 105 }, lean: 6, head: { dx: 0, dy: 3, tilt: 0 }, footL: { x: 14, y: 117 }, footR: { x: 42, y: 116 }, handL: { x: -8, y: 28 }, handR: { x: 6, y: 30 } }, ease(c.stop))
  if (c.catchK > 0) p = mixPose(p, { ...standing(), hip: { x: 30, y: c.keeper ? 98 : 90 }, footL: { x: 20, y: 117 }, footR: { x: 40, y: 117 }, handL: { x: -5, y: -17 }, handR: { x: 5, y: -17 } }, ease(c.catchK))
  if (c.throwK > 0) {
    const k = clamp01(c.throwK)
    const ang = k < 0.4 ? lerp(-20, -150, ease(k / 0.4)) : lerp(-150, 60, ease((k - 0.4) / 0.6))
    const d = dirOf(180 + ang)
    p = { ...p, handR: { x: d.x * 24, y: d.y * 24 }, handL: { x: -14, y: -4 + 14 * k }, lean: lerp(-5, 8, ease((k - 0.4) / 0.6)), ball: k < 0.55 }
  }
  if (c.dive > 0) p = mixPose(p, { ...standing(), hip: { x: 30, y: 93 }, lean: 0, head: { dx: 0, dy: 0, tilt: 0 }, handL: { x: -7, y: -25 }, handR: { x: 7, y: -25 }, footL: { x: 25, y: 116 }, footR: { x: 35, y: 112 } }, ease(c.dive))
  if (c.joy > 0) p = mixPose(p, { ...standing(), handL: { x: -17, y: -22 }, handR: { x: 17, y: -22 } }, ease(c.joy * 2.5))
  return p
}

/** An umpire: hands clasped behind his back, or arms out in a signal (`la` and `ra` are the arm angles). */
export function umpirePose(la: number, ra: number): Pose {
  const p = standing()
  const armL = dirOf(la), armR = dirOf(ra)
  const out = la !== 0 || ra !== 0
  return {
    ...p, hip: { x: 30, y: 85.3 },
    handL: out && la !== 0 ? { x: -SH + armL.x * 25, y: armL.y * 25 } : { x: -6, y: 26 },
    handR: out && ra !== 0 ? { x: SH + armR.x * 25, y: armR.y * 25 } : { x: 6, y: 26 },
  }
}
