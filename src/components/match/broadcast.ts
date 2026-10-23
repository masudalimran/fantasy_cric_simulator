import type { BallEvent } from '../../engine/types'

/**
 * The broadcast view's maths: a small pretend 3D world (metres) seen through a TV camera. Nothing here touches the match engine: it only reads
 * the finished ball (what was bowled, where the shot went, who was involved) and works out where everything is at each moment of the clip.
 *
 * World: X to the right of a camera that stands behind the bowler, Y up, Z from the bowler towards the batsman. The batsman's stumps are at
 * Z = 0 and the bowler's at Z = -20.12. The top-down field of the normal view is stretched onto it so the fielders keep their places.
 */
export interface V3 { x: number; y: number; z: number }
export interface Cam { p: V3; yaw: number; pitch: number; hfov: number }
export interface Screen { x: number; y: number; d: number }

export const PITCH_LEN = 20.12
export const BOWL_Z = -PITCH_LEN
/** The rope, an ellipse on the ground. */
export const ROPE = { cx: 0, cz: (50 - 70) * 0.78, rx: 66 * 0.72, rz: 40 * 0.78 }

/** The top-down field (160 x 100) onto the ground in metres, with the batsman's stumps as the origin. */
export function toWorld(x: number, y: number): V3 { return { x: -(x - 80) * 0.72, y: 0, z: (y - 70) * 0.78 } }

/** A fielder's place on the ground; the people close to the bat are set by hand because the top-down map stretches them. */
export function fielderWorld(x: number, y: number, spot: string): V3 {
  if (spot === 'Wicketkeeper') return { x: 0, y: 0, z: y < 80 ? 1.7 : 1.7 + ((y - 78.5) / 3.5) * 6.4 }
  // (x is already mirrored for a left-hander, so the off side is whichever side of the middle the fielder is on)
  if (spot === 'Slip') return { x: x > 80 ? -2.4 : 2.4, y: 0, z: 9.2 }
  if (spot === 'Short leg') return { x: 2.9 * (x < 80 ? 1 : -1), y: 0, z: -1.4 }
  if (spot === 'Gully') return { x: (x > 80 ? -1 : 1) * 6, y: 0, z: 8 }
  return toWorld(x, y)
}

export const camWide: Cam = { p: { x: 0, y: 7, z: -43 }, yaw: 0, pitch: 0.12, hfov: (46 * Math.PI) / 180 }
export const camReverse: Cam = { p: { x: 0, y: 7, z: 13.5 }, yaw: Math.PI, pitch: 0.12, hfov: (40 * Math.PI) / 180 }

const NEAR = 0.3

interface CamR { c: Cam; sy: number; cy: number; sp: number; cp: number; F: number; W: number; H: number }
export function prep(c: Cam, W: number, H: number): CamR {
  return { c, sy: Math.sin(c.yaw), cy: Math.cos(c.yaw), sp: Math.sin(c.pitch), cp: Math.cos(c.pitch), F: W / 2 / Math.tan(c.hfov / 2), W, H }
}

/** A world point in the camera's own space: x to the right, y up, z straight ahead. */
export function toCam(r: CamR, p: V3): V3 {
  const rx = p.x - r.c.p.x, ry = p.y - r.c.p.y, rz = p.z - r.c.p.z
  const xr = rx * r.cy - rz * r.sy
  const zr = rx * r.sy + rz * r.cy
  return { x: xr, y: ry * r.cp + zr * r.sp, z: zr * r.cp - ry * r.sp }
}

export function screenOf(r: CamR, q: V3): Screen { return { x: r.W / 2 + (r.F * q.x) / q.z, y: r.H / 2 - (r.F * q.y) / q.z, d: q.z } }

/** Where a world point appears on screen, or null if it is behind the camera. */
export function project(r: CamR, p: V3): Screen | null {
  const q = toCam(r, p)
  return q.z < NEAR ? null : screenOf(r, q)
}

/** A polygon in camera space cut at the near plane, then put on screen. */
export function projectPoly(r: CamR, pts: V3[]): Screen[] {
  const q = pts.map((p) => toCam(r, p))
  const out: V3[] = []
  for (let i = 0; i < q.length; i++) {
    const a = q[i], b = q[(i + 1) % q.length]
    const ain = a.z >= NEAR, bin = b.z >= NEAR
    if (ain) out.push(a)
    if (ain !== bin) {
      const t = (NEAR - a.z) / (b.z - a.z)
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: NEAR })
    }
  }
  return out.map((v) => screenOf(r, v))
}

// ---- The clip of one ball ----------------------------------------------------------------------------------------------

export interface FielderIn { id: string; x: number; y: number; spot: string }

export interface Plan {
  /** Seconds (before the speed factor): the run-up, the ball in the air to the bat, the ball after the bat, a pause at the end. */
  tRun: number; tDeliver: number; tFlight: number; tHold: number
  total: number
  /** Where the bowler's run starts, and where he lets go. */
  runFrom: V3; runTo: V3
  /** The ball: released, pitches, and meets the bat (or goes past it). */
  release: V3; bounce: V3; meet: V3
  /** Where the ball ends up, how high it climbs on the way, and what kind of flight it is. */
  end: V3; peak: number; kind: 'ground' | 'air' | 'stumps' | 'pad' | 'keeper'
  /** The camera after the bat: behind the batsman looking back, or the one behind the bowler. */
  reverse: boolean
  swing: boolean
  wicketFlies: boolean
  /** Index in the fielders list of the one who takes the catch / fields it, and the part of the way he goes. */
  catcher: number
  chaser: number
  six: boolean
  boundary: boolean
}

/** The clip now on screen (set by the broadcast view as it plans a ball), so the animation screens can wait for it to end. */
export const clipNow = { seq: -1, ms: 0, until: 0 }

const hash01 = (n: number) => { const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s) }

/** Works out the clip for a ball. `end` is where the top-down field says the ball finished. */
export function planBall(ev: BallEvent, fielders: FielderIn[], endTop: { x: number; y: number }, leftHand: boolean): Plan {
  const w = ev.wicket
  const wide = ev.extraType === 'wide'
  const bowlerX = 0.5
  // the line the ball took: a chosen one, otherwise a small stable spread around off stump
  const line = ev.delivery ? ev.delivery.line / 50 : (hash01(ev.seq * 3.1) - 0.5) * 0.9
  const lineX = wide ? (hash01(ev.seq) > 0.5 ? 2.7 : -2.7) : line * 1.1
  const release: V3 = { x: bowlerX, y: 2.05, z: BOWL_Z - 0.4 }
  const lenZ = ev.delivery ? (ev.delivery.length === 'yorker' ? -1.2 : ev.delivery.length === 'full' ? -3.2 : ev.delivery.length === 'good' ? -6 : -9.5) : -3 - hash01(ev.seq * 1.7) * 6
  const bounce: V3 = { x: lineX * 0.8 + bowlerX * 0.2, y: 0, z: lenZ }
  const stanceX = leftHand ? -0.75 : 0.75
  const toStumps = !!w && (w.kind === 'bowled' || w.kind === 'hit wicket' || w.kind === 'lbw')
  const meet: V3 = { x: wide ? lineX : toStumps ? lineX * 0.15 : lineX * 0.6, y: toStumps ? 0.5 : 0.85, z: -0.45 }
  const six = ev.boundary === 6
  const boundary = !!ev.boundary
  let end = toWorld(endTop.x, endTop.y)
  let peak = 0
  let kind: Plan['kind'] = 'ground'
  let swing = !wide && (ev.runsBat > 0 || (!!w && w.kind !== 'bowled' && w.kind !== 'lbw'))
  let catcher = -1, chaser = -1
  let wicketFlies = false
  if (w) {
    if (w.kind === 'bowled' || w.kind === 'hit wicket') { end = { x: 0, y: 0.35, z: 0.5 }; kind = 'stumps'; wicketFlies = true; swing = false }
    else if (w.kind === 'lbw') { end = { x: stanceX * 0.7, y: 0.4, z: -0.2 }; kind = 'pad'; swing = false }
    else if (w.kind === 'stumped') { end = { x: 0, y: 0.9, z: 1.8 }; kind = 'keeper'; wicketFlies = true; swing = false }
    else if (w.kind === 'caught and bowled') { end = { x: bowlerX, y: 1.1, z: BOWL_Z + 4 }; kind = 'air'; peak = 3 }
    else {
      const k = fielders.findIndex((f) => f.id === w.fielderId)
      if (k >= 0) { const fw = fielderWorld(fielders[k].x, fielders[k].y, fielders[k].spot); end = { x: fw.x, y: 1.2, z: fw.z }; catcher = k }
      kind = 'air'
      peak = Math.min(11, 1 + Math.hypot(end.x - meet.x, end.z - meet.z) * 0.32)
      if (k === 0) kind = 'keeper'
    }
  } else if (wide) {
    end = { x: lineX * 1.2, y: 0.5, z: 8 }
    kind = 'keeper'
  } else {
    end = { x: end.x, y: 0, z: end.z }
    const dist = Math.hypot(end.x - meet.x, end.z - meet.z)
    if (six) { peak = 14 + dist * 0.12; kind = 'air'; end.y = 0 }
    else if (ev.shot?.loft && dist > 14) { peak = Math.min(9, dist * 0.22); kind = 'air' }
    else kind = 'ground'
    // the nearest fielder (not the keeper) runs towards where the ball is going
    if (!six && ev.runsBat > 0) {
      let best = 1e9
      fielders.forEach((f, i) => { if (i === 0) return; const fw = fielderWorld(f.x, f.y, f.spot); const d = Math.hypot(fw.x - end.x, fw.z - end.z); if (d < best) { best = d; chaser = i } })
    }
  }
  const dist = Math.hypot(end.x - meet.x, end.z - meet.z)
  const tFlight = six ? 2 : Math.max(0.7, Math.min(1.6, 0.6 + dist / 42))
  // after the bat the ball goes towards the bowler's end: show it from behind the batsman, where it travels away from the camera
  const behind = kind === 'stumps' || kind === 'keeper' || kind === 'pad' || end.z > -6
  return {
    tRun: 0.95, tDeliver: 0.5, tFlight, tHold: 0.55, total: 0.95 + 0.5 + tFlight + 0.55,
    runFrom: { x: bowlerX, y: 0, z: BOWL_Z - 10 }, runTo: { x: bowlerX, y: 0, z: BOWL_Z - 0.7 },
    release, bounce, meet, end, peak, kind, reverse: !behind && dist > 7, swing, wicketFlies, catcher, chaser, six, boundary,
  }
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const lerp3 = (a: V3, b: V3, t: number): V3 => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t) })
const ease = (t: number) => { const c = Math.max(0, Math.min(1, t)); return c * c * (3 - 2 * c) }
const clamp01 = (t: number) => Math.max(0, Math.min(1, t))

export interface Frame {
  /** The bowler's feet, the ball, and how far through the arm swing, the bat swing and the stumps' flight the clip is (0 to 1). */
  bowler: V3; bowlerArm: number
  ball: V3 | null
  batSwing: number
  stumps: number
  reverse: boolean
  /** The place the camera is looking, and how wide. */
  aim: V3; hfov: number
  /** The fielder who is moving, with where he is, by index in the fielders list. */
  moving: Map<number, V3>
  /** Hop for joy (0 to 1) of whoever just took a wicket or hit a boundary. */
  joy: number
  phase: 'run' | 'deliver' | 'flight' | 'hold'
}

/** Everything's place `t` seconds into the clip. `fielderAt` gives the resting place of a fielder by index. */
export function frameAt(plan: Plan, t: number, fielderAt: (i: number) => V3): Frame {
  const moving = new Map<number, V3>()
  const t1 = plan.tRun, t2 = t1 + plan.tDeliver, t3 = t2 + plan.tFlight
  const phase: Frame['phase'] = t < t1 ? 'run' : t < t2 ? 'deliver' : t < t3 ? 'flight' : 'hold'
  // the bowler: runs in to the crease, then follows through
  const rs = clamp01(t / t1)
  const bowlerPos = t < t1 ? lerp3(plan.runFrom, plan.runTo, rs) : lerp3(plan.runTo, { x: plan.runTo.x + 2.2, y: 0, z: plan.runTo.z + 1.8 }, ease((t - t1) / 0.6))
  const bowlerArm = clamp01((t - (t1 - 0.3)) / 0.32)
  // the ball
  let ball: V3 | null = null
  if (t >= t1 - 0.02) {
    if (t < t2) {
      const u = clamp01((t - t1) / plan.tDeliver)
      const ub = 0.72
      const z = lerp(plan.release.z, plan.meet.z, u)
      const x = lerp(plan.release.x, plan.meet.x, u)
      const y = u < ub ? plan.release.y * (1 - (u / ub) ** 1.7) : plan.meet.y * Math.sin(((u - ub) / (1 - ub)) * (Math.PI / 2))
      ball = { x, y: Math.max(0.05, y), z }
    } else {
      const s = clamp01((t - t2) / plan.tFlight)
      const e = plan.kind === 'ground' ? 1 - (1 - s) * (1 - s) : s
      const p = lerp3(plan.meet, plan.end, e)
      let y = lerp(plan.meet.y, plan.end.y, e)
      if (plan.kind === 'air') y += plan.peak * 4 * s * (1 - s)
      else if (plan.kind === 'ground') y = 0.12 + (plan.boundary ? 0.35 * Math.abs(Math.sin(s * 9)) * (1 - s) : 0.12 * Math.abs(Math.sin(s * 6)) * (1 - s))
      ball = { x: p.x, y: Math.max(0.05, y), z: p.z }
    }
  }
  const hitT = t2
  const batSwing = plan.swing ? clamp01((t - (hitT - 0.2)) / 0.45) : clamp01((t - (hitT - 0.12)) / 0.3) * 0.25
  const stumps = plan.wicketFlies ? clamp01((t - hitT) / 0.8) : 0
  // fielders on the move
  const sf = clamp01((t - t2) / plan.tFlight)
  if (plan.catcher >= 0) { const a = fielderAt(plan.catcher); moving.set(plan.catcher, lerp3(a, { x: plan.end.x, y: 0, z: plan.end.z }, ease(sf * 1.15))) }
  if (plan.chaser >= 0) { const a = fielderAt(plan.chaser); moving.set(plan.chaser, lerp3(a, { x: plan.end.x, y: 0, z: plan.end.z }, ease(sf) * (plan.boundary ? 0.8 : 0.9))) }
  // where the camera looks
  const b = ball ?? bowlerPos
  const stump = { x: 0, y: 0.5, z: -6 }
  let aim: V3, hfov: number
  const deg = Math.PI / 180
  if (phase === 'run') { aim = lerp3({ ...bowlerPos, y: 1.2 }, stump, ease(rs) * 0.6); hfov = lerp(46, 32, ease(rs)) * deg }
  else if (phase === 'deliver') { aim = lerp3(stump, b, 0.7); hfov = lerp(32, 21, ease((t - t1) / plan.tDeliver)) * deg }
  else {
    const away = Math.hypot(b.x - plan.meet.x, b.z - plan.meet.z)
    aim = plan.reverse ? { x: b.x, y: Math.max(0.5, b.y * 0.7), z: b.z } : lerp3(plan.meet, b, 0.85)
    hfov = (plan.reverse ? Math.min(60, 26 + away * 0.75) : Math.min(52, 22 + away * 0.55)) * deg
  }
  const joy = plan.boundary || plan.wicketFlies || plan.catcher >= 0 ? clamp01((t - t3) / 0.5) : 0
  return { bowler: bowlerPos, bowlerArm, ball, batSwing, stumps, reverse: plan.reverse && t >= t2, aim, hfov, moving, joy, phase }
}

/** The camera turned to look at a point, from where it stands. */
export function lookAt(from: V3, aim: V3): { yaw: number; pitch: number } {
  const dx = aim.x - from.x, dz = aim.z - from.z, dy = from.y - aim.y
  return { yaw: Math.atan2(dx, dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) }
}

/** Moves an angle towards another by the shortest way. */
export function approach(a: number, b: number, k: number): number {
  let d = b - a
  while (d > Math.PI) d -= 2 * Math.PI
  while (d < -Math.PI) d += 2 * Math.PI
  return a + d * k
}
