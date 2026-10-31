import { cardGrid, type CheerVariant } from './CheerScreen'
import { camWide, lookAt, ROPE, type Cam, type V3 } from './broadcast'
import { clamp01, mixPose, standing, type Pose } from './bodyPose'
import { shade } from '../../engine/stadium'
import { SCREEN_R, slopePoint, type BigScreen, type CrowdClose, type FanSign, type ScreenPost, type Spark } from './crowdDraw'

/**
 * The stadium shows: the camera leaves the live picture and travels round the ground to the cheerleaders dancing at the boundary with the crowd behind
 * them, the people in the stands, the fielders in a huddle in the middle, or up into the night sky for the fireworks. Everything here is plain numbers:
 * where the camera is at each moment, what the crowd and the sky are doing, and how the cheerleaders and the huddle stand. Looks only.
 */

export type ShowKind = 'cheer' | 'stands' | 'huddle' | 'fireworks' | 'social'

export interface StadiumShow {
  kind: ShowKind
  /** For the cheerleaders: which show. The card stunt is done by the crowd in the stands. */
  variant?: CheerVariant
  /** A stable number from the ball, so a replay of the same ball gives the same show. */
  seed: number
  /** The team's two colours. */
  colors: [string, string]
  /** For the stands: the sign held up for a boundary, and the name on the board (the batsman, or the bowler after a wicket). */
  sign?: '4' | '6' | null
  name?: string | null
  /** The letters of the card stunt (the team's short name). */
  word?: string
  why?: 'boundary' | 'wicket'
  /** The fan wall on the stadium's giant screen: the posts and the hashtag. */
  posts?: ScreenPost[]
  hashtag?: string
}

/** How long each show lasts at full speed (the camera flight is the first part of it). */
export const SHOW_SECONDS: Record<ShowKind, number> = { cheer: 7, stands: 6.6, huddle: 6.4, fireworks: 7, social: 9.2 }

const hash01 = (n: number) => { const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s) }
const lerp = (a: number, b: number, k: number) => a + (b - a) * k
const lerp3 = (a: V3, b: V3, k: number): V3 => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k) })
const add3 = (a: V3, b: V3, k = 1): V3 => ({ x: a.x + b.x * k, y: a.y + b.y * k, z: a.z + b.z * k })
const ease = (t: number) => { const c = clamp01(t); return c * c * (3 - 2 * c) }
const rad = Math.PI / 180

/** A point on the ring of the ground: the angle round it and how far out (1 is the rope). */
export const ringPt = (a: number, s: number, y = 0): V3 => ({ x: ROPE.cx + Math.cos(a) * ROPE.rx * s, y, z: ROPE.cz + Math.sin(a) * ROPE.rz * s })

/** The way a camera faces, as a direction. */
const forward = (c: Cam): V3 => ({ x: Math.sin(c.yaw) * Math.cos(c.pitch), y: -Math.sin(c.pitch), z: Math.cos(c.yaw) * Math.cos(c.pitch) })

interface Key { p: V3; aim: V3; hfov: number }

/** Where every show starts: exactly where the live broadcast camera is, so the picture does not jump. */
export const startKey = (): Key => ({ p: camWide.p, aim: add3(camWide.p, forward(camWide), 50), hfov: camWide.hfov })

/** A smooth curve through three points (so the camera swings round in an arc, not a straight line). */
function curve(a: V3, b: V3, c: V3, s: number): V3 {
  const cr = (p0: number, p1: number, p2: number, p3: number, u: number) => 0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u)
  const f = (k: 'x' | 'y' | 'z') => (s < 0.5 ? cr(a[k], a[k], b[k], c[k], s * 2) : cr(a[k], b[k], c[k], c[k], (s - 0.5) * 2))
  return { x: f('x'), y: f('y'), z: f('z') }
}

// ---- where the show happens ------------------------------------------------------------------------------------------------------

/** Which side of the ground (-1 or 1) a show is on, from the ball. */
export const sideOf = (seed: number): 1 | -1 => (hash01(seed * 1.7 + 0.3) < 0.5 ? -1 : 1)

/** The angle round the ground of the cheerleaders' spot (at the side boundary, level with the middle of the pitch). */
export const cheerAngle = (seed: number): number => (sideOf(seed) > 0 ? 0.1 : Math.PI - 0.1)
/** The middle of the group of cheerleaders, just inside the rope. */
export const cheerSpot = (seed: number): V3 => ringPt(cheerAngle(seed), 0.945)

/** The sector of the stands the stands cam and the card stunt look at (never the one behind the camera at the start). */
const STAND_ANGLES = [0.35, 0.8, 1.3, 1.85, 2.4, 2.9, -0.3]
export const standAngle = (seed: number): number => STAND_ANGLES[Math.floor(hash01(seed * 2.9 + 1.1) * STAND_ANGLES.length) % STAND_ANGLES.length]

/** Where the giant screen hangs round the stands. */
export const screenAngle = (seed: number): number => STAND_ANGLES[Math.floor(hash01(seed * 3.7 + 2.3) * STAND_ANGLES.length) % STAND_ANGLES.length]

/** The middle of the huddle: a little way off the pitch, towards the bowler's end. */
export const huddleCentre = (seed: number): V3 => ({ x: sideOf(seed) * 5, y: 0, z: -12 })
const HUDDLE_R = 9
const huddleCam = (seed: number, phi: number): V3 => { const h = huddleCentre(seed); return { x: h.x + Math.sin(phi) * HUDDLE_R, y: 2.7, z: h.z - Math.cos(phi) * HUDDLE_R } }
const huddlePhi = (hold: number) => -0.55 + 1.1 * ease(hold)

interface Flight { keys: [Key, Key, Key]; fly: number }

function flightOf(show: StadiumShow): Flight {
  const s0 = startKey()
  const mid = (end: Key, lift: number, extraFov = 4): Key => ({ p: add3(lerp3(s0.p, end.p, 0.5), { x: 0, y: lift, z: 0 }), aim: lerp3(s0.aim, end.aim, 0.5), hfov: lerp(s0.hfov, end.hfov, 0.5) + extraFov * rad })
  if (show.kind === 'cheer' && show.variant === 'cards') {
    const a = standAngle(show.seed + 7)
    const end: Key = { p: ringPt(a, 0.8, 4.2), aim: add3(slopePoint(a, 0.4), { x: 0, y: 0, z: 0 }), hfov: 40 * rad }
    return { keys: [s0, mid(end, 9), end], fly: 2.6 }
  }
  if (show.kind === 'cheer') {
    const side = sideOf(show.seed), G = cheerSpot(show.seed)
    const end: Key = { p: { x: G.x - side * 11, y: 2.0, z: G.z - (show.variant === 'pyramid' ? 0.5 : 3.5) }, aim: { x: G.x, y: 2.7, z: G.z }, hfov: 38 * rad }
    return { keys: [s0, mid(end, 6), end], fly: 2.6 }
  }
  if (show.kind === 'stands') {
    const a = standAngle(show.seed)
    const end: Key = { p: ringPt(a, 0.935, 2.4), aim: add3(slopePoint(a, 0.45), { x: 0, y: 0.6, z: 0 }), hfov: 30 * rad }
    return { keys: [s0, mid(end, 8), end], fly: 2.4 }
  }
  if (show.kind === 'huddle') {
    const h = huddleCentre(show.seed)
    const end: Key = { p: huddleCam(show.seed, huddlePhi(0)), aim: { x: h.x, y: 1.05, z: h.z }, hfov: 40 * rad }
    return { keys: [s0, mid(end, 3, 0), end], fly: 2.2 }
  }
  if (show.kind === 'social') {
    const a = screenAngle(show.seed)
    const end: Key = { p: ringPt(a, 0.8, 8), aim: ringPt(a, SCREEN_R, 15), hfov: 34 * rad }
    return { keys: [s0, mid(end, 8), end], fly: 2.8 }
  }
  const end: Key = { p: { x: 0, y: 15, z: -50 }, aim: { x: 0, y: 33, z: 42 }, hfov: 60 * rad }
  return { keys: [s0, { p: { x: 0, y: 11, z: -47 }, aim: { x: 0, y: 14, z: 20 }, hfov: 52 * rad }, end], fly: 2.6 }
}

/** The camera `t` seconds into the show: it starts where the broadcast camera is, travels to the spot, then settles and drifts a little. */
export function cameraAt(show: StadiumShow, t: number): Cam {
  const fl = flightOf(show), T = SHOW_SECONDS[show.kind]
  const s = ease(t / fl.fly)
  const [k0, k1, k2] = fl.keys
  let p = curve(k0.p, k1.p, k2.p, s)
  let aim = curve(k0.aim, k1.aim, k2.aim, s)
  const hfov = s < 0.5 ? lerp(k0.hfov, k1.hfov, s * 2) : lerp(k1.hfov, k2.hfov, (s - 0.5) * 2)
  const hold = clamp01((t - fl.fly) / Math.max(0.1, T - fl.fly))
  const dh = ease(hold)
  if (show.kind === 'cheer' && show.variant !== 'cards') aim = add3(aim, { x: 0, y: 0, z: sideOf(show.seed) * 1.6 }, dh)
  else if (show.kind === 'cheer' || show.kind === 'stands') {
    const a = show.kind === 'stands' ? standAngle(show.seed) : standAngle(show.seed + 7)
    const tan = { x: -Math.sin(a) * ROPE.rx, y: 0, z: Math.cos(a) * ROPE.rz }
    const l = Math.hypot(tan.x, tan.z) || 1
    aim = add3(aim, { x: tan.x / l, y: 0, z: tan.z / l }, (show.kind === 'stands' ? 5 : 2) * (dh - 0.5) * s)
  } else if (show.kind === 'huddle') {
    if (s >= 1) p = huddleCam(show.seed, huddlePhi(hold))
  } else aim = add3(aim, { x: 1, y: 0, z: 0 }, 16 * (dh - 0.5) * s)
  return { p, ...lookAt(p, aim), hfov }
}

// ---- the crowd -------------------------------------------------------------------------------------------------------------------

/** The stands drawn person by person (null when the camera has no use for them: the huddle). */
export function crowdAt(show: StadiumShow, t: number): CrowdClose | null {
  const k = 0.45 + 0.55 * clamp01(t / 2.4)
  if (show.kind === 'huddle' || show.kind === 'fireworks') return null
  if (show.kind === 'social') { const a = screenAngle(show.seed); return { a0: a - 0.2, a1: a + 0.2, u0: 0.03, u1: 0.99, rows: 12, per: 46, k: 0.8, seed: show.seed } }
  if (show.kind === 'cheer' && show.variant !== 'cards') {
    const a = cheerAngle(show.seed)
    return { a0: a - 0.26, a1: a + 0.26, u0: 0.04, u1: 0.95, rows: 12, per: 52, k: Math.min(1, k + 0.1), seed: show.seed }
  }
  if (show.kind === 'cheer') {
    const a = standAngle(show.seed + 7)
    const word = (show.word ?? 'GO').toUpperCase()
    return {
      a0: a - 0.2, a1: a + 0.2, u0: 0.02, u1: 0.98, rows: 13, per: 48, k, seed: show.seed,
      cards: { a0: a - 0.075, a1: a + 0.075, u0: 0.12, u1: 0.62, grid: cardGrid(word), on: '#ffffff', off: shade(show.colors[0], -0.35), t },
    }
  }
  const a = standAngle(show.seed)
  const signs: FanSign[] = []
  if (show.sign) signs.push({ a: a - 0.012, u: 0.34, text: show.sign === '6' ? 'SIX!' : 'FOUR!', color: show.sign === '6' ? '#ec4899' : '#38bdf8', ink: '#ffffff' })
  if (show.name) signs.push({ a: a + 0.038, u: 0.5, text: show.name.split(' ')[0].toUpperCase() + '!', color: show.colors[0], ink: '#ffffff' })
  return { a0: a - 0.16, a1: a + 0.16, u0: 0.03, u1: 0.97, rows: 13, per: 36, k, seed: show.seed, signs }
}

/** How much the whole stadium is on its feet. */
export const crowdCheer = (_show: StadiumShow, t: number): number => clamp01(0.5 + t / 3)

/** The giant screen `t` seconds in (null for the other shows). */
export function screenAt(show: StadiumShow, t: number): BigScreen | null {
  if (show.kind !== 'social' || !show.posts) return null
  return { a: screenAngle(show.seed), half: 0.085, y0: 10.5, y1: 25, hashtag: show.hashtag ?? 'MATCHDAY', posts: show.posts, t, colors: show.colors }
}

// ---- the fireworks --------------------------------------------------------------------------------------------------------------

const BURSTS = 9
const LIFE = 2.0
const GRAVITY = 5.2

interface Burst { t0: number; c: V3; r: number; col: [number, number, number][]; from: V3 }

const rgbOf = (hex: string): [number, number, number] => {
  const m = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!m) return [255, 220, 120]
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** The bursts of a show: when each goes up, where it opens, how big, and its colours (the team's, with white and gold). */
export function bursts(show: StadiumShow): Burst[] {
  const palette: [number, number, number][] = [rgbOf(show.colors[0]), rgbOf(show.colors[1]), [255, 255, 255], [255, 214, 80], [255, 110, 70]]
  // (a dark team colour is no use against the night sky: brighten it)
  const bright = (c: [number, number, number]): [number, number, number] => { const m = Math.max(...c); const f = m < 150 ? 150 / Math.max(1, m) : 1; return [Math.min(255, c[0] * f + 20), Math.min(255, c[1] * f + 20), Math.min(255, c[2] * f + 20)] }
  return Array.from({ length: BURSTS }, (_, i) => {
    const h = (n: number) => hash01(show.seed * 3.1 + i * n)
    const c: V3 = { x: lerp(-50, 50, h(1.7)), y: lerp(30, 56, h(2.9)), z: lerp(4, 36, h(4.3)) }
    const a = palette[Math.floor(h(5.9) * palette.length)], b = palette[Math.floor(h(6.7) * palette.length)]
    return { t0: 1.0 + i * 0.52 + h(7.9) * 0.2, c, r: lerp(17, 28, h(8.3)), col: [bright(a), bright(b)], from: { x: c.x + (h(9.1) - 0.5) * 12, y: 12, z: c.z + (h(9.7) - 0.5) * 10 } }
  })
}

/** The sparks in the sky `t` seconds into the show, and how bright the flash of the newest burst is (0 to 1). */
export function sparksAt(show: StadiumShow, t: number): { sparks: Spark[]; flash: number } {
  const sparks: Spark[] = []
  let flash = 0
  for (const b of bursts(show)) {
    const rise = 0.75
    const tau = t - b.t0
    if (tau < -rise || tau > LIFE) continue
    if (tau < 0) {
      // the rocket going up
      const u = (tau + rise) / rise
      const p = lerp3(b.from, b.c, u * u), q = lerp3(b.from, b.c, Math.max(0, u - 0.12) ** 2)
      sparks.push({ p, tail: q, rgb: [255, 220, 150], a: 0.9, size: 0.9 })
      continue
    }
    flash = Math.max(flash, Math.exp(-tau * 4.5))
    const n = 70
    for (let i = 0; i < n; i++) {
      // directions spread evenly over a sphere
      const y = 1 - (i / (n - 1)) * 2, rr = Math.sqrt(Math.max(0, 1 - y * y)), th = i * 2.399963
      const dir = { x: Math.cos(th) * rr, y, z: Math.sin(th) * rr }
      const reach = b.r * (1 - Math.exp(-3.4 * tau)) * (0.85 + 0.15 * hash01(i * 3.3 + b.t0))
      const fall = GRAVITY * tau * tau
      const p: V3 = { x: b.c.x + dir.x * reach, y: b.c.y + dir.y * reach - fall, z: b.c.z + dir.z * reach }
      const tau2 = Math.max(0, tau - 0.17)
      const reach2 = b.r * (1 - Math.exp(-3.4 * tau2)) * (0.85 + 0.15 * hash01(i * 3.3 + b.t0))
      const tail: V3 = { x: b.c.x + dir.x * reach2, y: b.c.y + dir.y * reach2 - GRAVITY * tau2 * tau2, z: b.c.z + dir.z * reach2 }
      const fade = 1 - (tau / LIFE) ** 1.6
      const twinkle = tau > LIFE * 0.55 ? 0.55 + 0.45 * Math.sin(t * 40 + i * 5) : 1
      sparks.push({ p, tail, rgb: b.col[i % 2], a: Math.max(0, fade * twinkle), size: 0.55 })
    }
    // the middle of the burst glows for a moment
    sparks.push({ p: b.c, rgb: [255, 245, 220], a: Math.exp(-tau * 6), size: 4 + b.r * 0.2 })
  }
  return { sparks, flash }
}

// ---- the cheerleaders ----------------------------------------------------------------------------------------------------------

export interface Dancer { pos: V3; pose: Pose; /** A flag in the hand (the pole is the bat of the rig). */ flag: boolean; /** Pom-poms in both hands. */ pom: boolean }

const TEAM = 6

/** The beat the dancers keep: about 1.8 a second. */
const beatAt = (t: number) => t * Math.PI * 2 * 1.8

function dancePose(b: number, i: number, big: number, flags: boolean): Pose {
  const s = Math.sin(b), c = Math.cos(b)
  const up = i % 2 ? s : -s
  const p: Pose = {
    ...standing(),
    hip: { x: 30, y: 85.3 + 2.8 * Math.abs(c) }, lean: 6 * s * (i % 2 ? 1 : -1), head: { dx: 0, dy: 0, tilt: 7 * s },
    handL: { x: -20 - 4 * c, y: -8 - 18 * up * big }, handR: { x: 20 + 4 * c, y: -8 + 18 * up * big },
    footL: { x: 24 - 4 * Math.max(0, s), y: 117 - 6 * Math.max(0, s) }, footR: { x: 36 + 4 * Math.max(0, -s), y: 117 - 6 * Math.max(0, -s) },
  }
  if (flags) return { ...p, handR: { x: 24, y: -26 + 4 * c }, bat: 190 + 26 * s, two: false }
  return p
}

const baseKneel = (): Pose => ({ ...standing(), hip: { x: 30, y: 104 }, lean: 0, handL: { x: -22, y: 8 }, handR: { x: 22, y: 8 }, footL: { x: 18, y: 117 }, footR: { x: 42, y: 117 } })
const midStand = (b: number): Pose => ({ ...standing(), hip: { x: 30, y: 85.3 }, lean: 2 * Math.sin(b), handL: { x: -26, y: -2 }, handR: { x: 26, y: -2 }, footL: { x: 22, y: 117 }, footR: { x: 38, y: 117 } })
const topCheer = (b: number): Pose => ({ ...standing(), hip: { x: 30, y: 85.3 }, lean: 3 * Math.sin(b), handL: { x: -16, y: -26 + 3 * Math.sin(b) }, handR: { x: 16, y: -26 - 3 * Math.sin(b) }, head: { dx: 0, dy: 0, tilt: 4 * Math.sin(b) } })

/** The cheerleaders `t` seconds in: six dancing in a line at the boundary; for the pyramid they climb onto each other and cheer on the top. */
export function cheerleaders(show: StadiumShow, t: number): Dancer[] {
  const G = cheerSpot(show.seed), side = sideOf(show.seed)
  const b = beatAt(t)
  const flags = show.variant === 'flags'
  const pyramid = show.variant === 'pyramid'
  const line = (i: number): V3 => ({ x: G.x + ((i % 2) * 0.35) * side, y: 0, z: G.z + (i - (TEAM - 1) / 2) * 1.6 })
  if (!pyramid) {
    // (the dancers take a step to the side now and then: the line sways)
    return Array.from({ length: TEAM }, (_, i) => ({ pos: { ...line(i), x: line(i).x + Math.sin(b * 0.5 + i) * 0.12 }, pose: dancePose(b, i, 1, flags), flag: flags, pom: !flags }))
  }
  // the pyramid: three at the bottom, two above them, one on the top
  const slot: { z: number; lift: number }[] = [{ z: -1.5, lift: 0 }, { z: 0, lift: 0 }, { z: 1.5, lift: 0 }, { z: -0.75, lift: 1.05 }, { z: 0.75, lift: 1.05 }, { z: 0, lift: 2.0 }]
  const form = ease((t - 2.6) / 1.5) // they gather and climb between 2.6 and 4.1 seconds
  const jump = clamp01((t - 5.9) / 0.35) // and jump down with a cheer at the end
  return Array.from({ length: TEAM }, (_, i) => {
    const from = line(i), to: V3 = { x: G.x, y: 0, z: G.z + slot[i].z }
    const pos = lerp3(from, to, form)
    pos.y = slot[i].lift * ease((form - (i < 3 ? 0 : i < 5 ? 0.3 : 0.55)) / 0.4) * (1 - jump)
    const dance = dancePose(b, i, 1, false)
    const level = i < 3 ? baseKneel() : i < 5 ? midStand(b) : topCheer(b)
    let pose = mixPose(dance, level, ease((form - 0.25) / 0.6))
    if (jump > 0) pose = mixPose(pose, dancePose(b * 1.4, i, 1.3, false), jump)
    if (jump > 0 && jump < 1) pose = { ...pose, hip: { ...pose.hip, y: pose.hip.y - 12 * Math.sin(Math.PI * jump) } }
    return { pos: { x: pos.x, y: pos.y + (jump > 0 ? 0.25 * Math.sin(Math.PI * jump) : 0), z: pos.z }, pose, flag: false, pom: true }
  })
}

// ---- the huddle -------------------------------------------------------------------------------------------------------------------

/** Where person `i` of `n` stands in the huddle: a ring round the middle. */
export function huddleSpot(show: StadiumShow, i: number, n: number, widen = 0): V3 {
  const h = huddleCentre(show.seed)
  const a = (i / n) * Math.PI * 2 + 0.4
  const r = 1.35 + n * 0.04 + widen
  return { x: h.x + Math.cos(a) * r, y: 0, z: h.z + Math.sin(a) * r }
}

/** When they have all arrived, and when the huddle breaks. */
export const HUDDLE_WALK = { from: 0.3, to: 2.2 }
export const huddleBreakAt = (): number => SHOW_SECONDS.huddle - 1.5

/** One person in the huddle `t` seconds in: where he walks from and to, and how he stands once there (arms round the shoulders, then up in the air). */
export function huddlePerson(show: StadiumShow, t: number, i: number, n: number, from: V3): { pos: V3; walking: boolean; pose: Pose | null } {
  const spot = huddleSpot(show, i, n)
  const w = ease((t - HUDDLE_WALK.from - (i % 4) * 0.06) / (HUDDLE_WALK.to - HUDDLE_WALK.from))
  const brk = clamp01((t - huddleBreakAt()) / 0.35)
  const out = huddleSpot(show, i, n, 0.9 * ease((t - huddleBreakAt()) / 0.8))
  const pos = lerp3(lerp3(from, spot, w), out, brk > 0 ? 1 : 0)
  const walking = w < 1
  if (walking) return { pos, walking, pose: null }
  const b = beatAt(t) * 0.6
  const lean = (i % 2 ? 1 : -1) * 4
  const huddled: Pose = { ...standing(), hip: { x: 30, y: 91 + 1.2 * Math.sin(b + i) }, lean, head: { dx: 0, dy: 5, tilt: lean }, handL: { x: -25, y: -2 + Math.sin(b + i) * 2 }, handR: { x: 25, y: -2 - Math.sin(b + i) * 2 }, footL: { x: 21, y: 117 }, footR: { x: 39, y: 117 } }
  if (brk <= 0) return { pos, walking, pose: huddled }
  // the break: everybody jumps with both arms up
  const cheer: Pose = { ...standing(), hip: { x: 30, y: 85.3 - 14 * Math.max(0, Math.sin(Math.PI * clamp01((t - huddleBreakAt() - 0.1) / 0.6))) }, handL: { x: -17, y: -26 }, handR: { x: 17, y: -26 }, head: { dx: 0, dy: -1, tilt: 0 } }
  return { pos: { ...pos, y: 0.5 * Math.max(0, Math.sin(Math.PI * clamp01((t - huddleBreakAt() - 0.1) / 0.6))) }, walking: false, pose: mixPose(huddled, cheer, ease(brk)) }
}
