import type { BallEvent } from '../../engine/types'

/**
 * The broadcast view's maths: a small pretend 3D world (metres) seen through a TV camera. Nothing here touches the match engine: it only reads
 * the finished ball (what was bowled, where the shot went, who was involved) and works out where everything is at each moment of the clip.
 *
 * World: X to the right of a camera that stands behind the bowler, Y up, Z from the bowler towards the batsman. The batsman's stumps are at
 * Z = 0 and the bowler's at Z = -20.12. The top-down field of the normal view is stretched onto it so the fielders keep their places.
 */
import { wideDirection, wideSide } from '../../engine/wide'
import { classifyShot, type ShotStyle } from './bodyPose'

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

/** How long one run takes between the wickets. */
export const RUN_SECONDS = 0.95
const NON_STRIKER_X = -3.2
const BAT_END_Z = 0.35
const BOWL_END_Z = BOWL_Z + 0.7

/**
 * The cameras a replay can use instead of the live one, so a replay does not look like the live picture shown again: from the side (square leg), from
 * high above the pitch, or from down at the stumps. Each stays where it is and turns to follow the ball, like the live cameras.
 */
export type ReplayCam = 'side' | 'high' | 'stump'
export function replayCamera(kind: ReplayCam, seq: number): { cam: Cam; minHfov: number; label: string; /** Stay wide even in the slow-motion moment (no close-up). */ keepWide?: boolean } {
  const deg = Math.PI / 180
  if (kind === 'high') return { cam: { p: { x: 0.01, y: 46, z: -10 }, yaw: 0, pitch: 1.2, hfov: 70 * deg }, minHfov: 68 * deg, label: 'Spider cam', keepWide: true }
  if (kind === 'stump') return { cam: { p: { x: -0.08, y: 0.55, z: 1.4 }, yaw: Math.PI, pitch: 0.02, hfov: 38 * deg }, minHfov: 32 * deg, label: 'Stump cam' }
  const dir = hash01(seq * 7.7) < 0.5 ? -1 : 1
  return { cam: { p: { x: dir * 34, y: 4.5, z: -9 }, yaw: dir > 0 ? -Math.PI / 2 : Math.PI / 2, pitch: 0.1, hfov: 34 * deg }, minHfov: 30 * deg, label: 'Side-on' }
}
/** Which camera a replay of this kind of moment uses, a stable pick from the ball number (the stump cam only for the ways of being bowled out). */
export function replayCamFor(kind: 'four' | 'six' | 'bowled' | 'lbw' | 'stumped' | 'hit wicket' | 'run out' | 'catch' | 'extra', seq: number): ReplayCam {
  const h = hash01(seq * 3.9)
  if (kind === 'bowled' || kind === 'lbw' || kind === 'hit wicket') return h < 0.6 ? 'stump' : 'side'
  if (kind === 'stumped') return 'side'
  if (kind === 'run out' || kind === 'catch') return h < 0.5 ? 'high' : 'side'
  if (kind === 'extra') return 'side'
  return h < 0.5 ? 'side' : 'high'
}
/** The same clip with a stretch of slow motion around the moment the bat meets the ball (unless the clip already has one). */
export function withReplaySlow(plan: Plan): Plan {
  if (plan.slow) return plan
  const slow = { at: plan.tRun + plan.tDeliver - 0.22, len: 0.75, factor: 0.35 }
  return { ...plan, slow, realTotal: plan.total + slow.len / slow.factor - slow.len }
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

/** What an umpire's arms say. */
export type SignalKind = 'wide' | 'noball' | 'four' | 'six' | 'out' | 'bye' | 'legbye' | 'notout'

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
  /** Runs the batsmen run between the wickets (1 to 3, or byes and leg byes), and the stance side of the striker. */
  runs: number
  stanceX: number
  /** A run out: how many runs were tried (the last one not finished), whether the striker was the one out, the end whose stumps were hit, and the throw. */
  runOut: { legs: number; outIsStriker: boolean; destEnd: 0 | 1; throwTo: V3; tThrow: number } | null
  /** How long one run takes in this clip. */
  runSeconds: number
  /** The bowler runs to take the catch off his own bowling; the batsman steps out of his crease to be stumped. */
  bowlerCatch: boolean
  stepOut: boolean
  /** The umpire's signal and when it starts (seconds into the clip), and which umpire gives it (1 at the bowler's end, 2 at square leg). */
  signal: { kind: SignalKind; at: number; who: 1 | 2 } | null
  /** A leg bye: the ball hits the batsman, who winces. */
  hurt: boolean
  /** The keeper dives for a wide or a bye (and whether he gets there), a fielder dives at the rope for a four. */
  keeperDive: { dir: number; at: number; miss: boolean } | null
  chaserDive: boolean
  /** The out batsman walks off after the wicket; and when a fifty or hundred is reached he raises his bat. */
  exitAt: number | null
  celebrateAt: number | null
  /** How fast the ball was bowled (km/h). */
  speed: number
  /** A nick: the moment of the bat is played again in slow motion, close up. `at` and `len` are in clip seconds; `factor` is how slow (0.3 is a third of the speed). */
  slow: { at: number; len: number; factor: number } | null
  /** The clip's length in real seconds: `total` plus the extra time the slow motion takes. */
  realTotal: number
  /** A word that pops up over somebody's head, and when. */
  react: { text: string; at: number; who: 'striker' | 'bowler' | 'keeper' } | null
  /** The shot the batsman is drawn playing (looks only). */
  shot: ShotStyle
}

/** The clip now on screen (set by the broadcast view as it plans a ball), so the animation screens can wait for it to end. */
export const clipNow = { seq: -1, ms: 0, until: 0 }

const hash01 = (n: number) => { const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s) }

/**
 * How high the ball goes after the bat, from a skimming drive to a towering six. A six climbs with how far it went (its distance), a four is either
 * driven along the ground or lofted over the infield (more often when the batsman was attacking, and always when he chose to loft it), and an
 * ordinary scoring shot is on the ground with the odd mis-hit in the air. Looks only.
 */
export function elevation(ev: Pick<BallEvent, 'seq' | 'boundary' | 'distance' | 'intent' | 'runsBat' | 'shot'>, dist: number): { kind: 'ground' | 'air'; peak: number } {
  const h = hash01(ev.seq * 5.3 + 1)
  const power = Math.max(0, Math.min(1, (ev.intent + 1) / 3))
  if (ev.boundary === 6) return { kind: 'air', peak: 7 + Math.max(0, (ev.distance ?? 80) - 55) * 0.16 + h * 3 }
  if (ev.boundary === 4) {
    const air = ev.shot ? ev.shot.loft : h < 0.3 + power * 0.3
    return air ? { kind: 'air', peak: 2.2 + h * 4.5 + power * 1.5 } : { kind: 'ground', peak: 0 }
  }
  if (ev.runsBat >= 1 && (ev.shot ? ev.shot.loft && dist > 10 : h > 0.86 && dist > 12)) return { kind: 'air', peak: 1.4 + h * 3 }
  return { kind: 'ground', peak: 0 }
}

/** Works out the clip for a ball. `end` is where the top-down field says the ball finished. */
export function planBall(ev: BallEvent, fielders: FielderIn[], endTop: { x: number; y: number }, leftHand: boolean, speed = 135): Plan {
  const w = ev.wicket
  const wide = ev.extraType === 'wide'
  const bowlerX = 0.5
  // the line the ball took: a chosen one, otherwise a small stable spread around off stump
  const line = ev.delivery ? ev.delivery.line / 50 : (hash01(ev.seq * 3.1) - 0.5) * 0.9
  const lineX = wide ? wideDirection(wideSide(ev), leftHand ? 'L' : 'R', 'behind-bowler') * 2.7 : line * 1.1
  const release: V3 = { x: bowlerX, y: 2.05, z: BOWL_Z - 0.4 }
  const lenZ = ev.delivery ? (ev.delivery.length === 'yorker' ? -1.2 : ev.delivery.length === 'full' ? -3.2 : ev.delivery.length === 'good' ? -6 : -9.5) : -3 - hash01(ev.seq * 1.7) * 6
  const bounce: V3 = { x: lineX * 0.8 + bowlerX * 0.2, y: 0, z: lenZ }
  const stanceX = leftHand ? -0.75 : 0.75
  const toStumps = !!w && (w.kind === 'bowled' || w.kind === 'hit wicket' || w.kind === 'lbw')
  const meet: V3 = { x: wide ? lineX : toStumps ? lineX * 0.15 : ev.extraType === 'legbye' ? stanceX * 0.55 : lineX * 0.6, y: toStumps ? 0.5 : ev.extraType === 'legbye' ? 0.45 : 0.85, z: -0.45 }
  const six = ev.boundary === 6
  // four byes or four leg byes: the ball races to the rope with nobody running
  const byeFour = (ev.extraType === 'bye' || ev.extraType === 'legbye') && ev.extraRuns >= 4
  const boundary = !!ev.boundary || byeFour
  let end = toWorld(endTop.x, endTop.y)
  let peak = 0
  let kind: Plan['kind'] = 'ground'
  let swing = !wide && (ev.runsBat > 0 || (!!w && w.kind !== 'bowled' && w.kind !== 'lbw'))
  let catcher = -1, chaser = -1
  let wicketFlies = false
  let runOut: Plan['runOut'] = null
  let bowlerCatch = false
  let hurt = false
  let keeperDive: Plan['keeperDive'] = null
  const noball = ev.extraType === 'noball'
  const bye = ev.extraType === 'bye', legbye = ev.extraType === 'legbye'
  if (w) {
    if (w.kind === 'bowled' || w.kind === 'hit wicket') { end = { x: 0, y: 0.35, z: 0.5 }; kind = 'stumps'; wicketFlies = true; swing = w.kind === 'hit wicket' }
    else if (w.kind === 'lbw') { end = { x: stanceX * 0.7, y: 0.4, z: -0.2 }; kind = 'pad'; swing = false }
    else if (w.kind === 'stumped') { end = { x: 0, y: 0.9, z: 1.8 }; kind = 'keeper'; wicketFlies = true; swing = false; catcher = 0 }
    else if (w.kind === 'caught and bowled') { end = { x: bowlerX + 1, y: 1.1, z: BOWL_Z + 4 }; kind = 'air'; peak = 3; bowlerCatch = true }
    else if (w.kind === 'run out') {
      // the ball is hit, the batsmen run, a fielder gathers it and throws at the stumps they are running to
      const k = fielders.findIndex((f) => f.id === w.fielderId)
      if (k >= 0) { const fw = fielderWorld(fielders[k].x, fielders[k].y, fielders[k].spot); end = { x: fw.x, y: 0.3, z: fw.z }; catcher = k }
      else end = { x: end.x, y: 0.3, z: end.z }
      kind = 'ground'
      swing = true
      const legs = Math.max(1, ev.runsBat + 1)
      const lastFromStriker = (legs - 1) % 2 === 0 // the striker starts the last run from his own end
      const outIsStriker = w.playerId === ev.strikerId
      const destEnd = (outIsStriker ? (lastFromStriker ? 1 : 0) : (lastFromStriker ? 0 : 1)) as 0 | 1
      runOut = { legs, outIsStriker, destEnd, throwTo: { x: 0, y: 0.45, z: destEnd === 0 ? 0 : BOWL_Z }, tThrow: 0.75 }
      wicketFlies = true
    }
    else {
      const k = fielders.findIndex((f) => f.id === w.fielderId)
      if (k >= 0) { const fw = fielderWorld(fielders[k].x, fielders[k].y, fielders[k].spot); end = { x: fw.x, y: 1.2, z: fw.z }; catcher = k }
      kind = 'air'
      // a catch can be a flat edge taken low or a skier: the height comes from the ball and how far it went
      peak = Math.min(12, 0.8 + Math.hypot(end.x - meet.x, end.z - meet.z) * 0.17 + hash01(ev.seq * 4.7) * 4)
      if (k === 0) kind = 'keeper'
    }
  } else if (wide) {
    end = { x: lineX * 1.2, y: 0.5, z: 8 }
    kind = 'keeper'
    catcher = 0
    keeperDive = { dir: lineX > 0 ? 1 : -1, at: 0, miss: false }
  } else if (bye) {
    // the ball beats the bat and the keeper, and runs away behind them
    end = byeFour ? { x: (lineX >= 0 ? 1 : -1) * 6, y: 0.1, z: 15.4 } : { x: lineX * 1.6 + (lineX >= 0 ? 2 : -2), y: 0.1, z: 15 }
    kind = 'ground'
    keeperDive = { dir: lineX >= 0 ? 1 : -1, at: 0, miss: true }
    swing = false
  } else if (legbye) {
    // it hits the batsman's pad or body and rolls off to the leg side
    hurt = true
    swing = false
    end = byeFour ? { x: stanceX > 0 ? 33 : -33, y: 0.1, z: 7 } : { x: stanceX > 0 ? 7 : -7, y: 0.1, z: 7 }
    kind = 'ground'
  } else {
    end = { x: end.x, y: 0, z: end.z }
    const dist = Math.hypot(end.x - meet.x, end.z - meet.z)
    end.y = 0
    const el = elevation(ev, dist)
    peak = el.peak
    kind = el.kind
    // a ball that is not scored off is either played and missed (it goes through to the keeper) or kept out by the bat
    if (ev.runsBat === 0 && ev.legal && hash01(ev.seq * 2.3) > 0.5) { end = { x: meet.x * 0.5, y: 1, z: 8.5 }; kind = 'keeper'; catcher = 0 }
  }
  // the nearest fielder (not the keeper) runs towards where the ball is going
  if (!w && !wide && !six && (ev.runsBat > 0 || bye || legbye) && kind !== 'keeper') {
    let best = 1e9
    fielders.forEach((f, i) => { if (i === 0) return; const fw = fielderWorld(f.x, f.y, f.spot); const d = Math.hypot(fw.x - end.x, fw.z - end.z); if (d < best) { best = d; chaser = i } })
  }
  const runs = runOut ? runOut.legs : !w && !boundary && !wide && !byeFour ? (ev.runsBat > 0 ? ev.runsBat : ev.extraType === 'bye' || ev.extraType === 'legbye' ? ev.extraRuns : 0) : 0
  const dist = Math.hypot(end.x - meet.x, end.z - meet.z)
  // a six hangs in the air for as long as its height asks for
  const tFlight = six ? Math.min(2.6, 1.5 + peak / 22) : Math.max(0.7, Math.min(1.6, 0.6 + dist / 42))
  // after the bat the ball goes towards the bowler's end: show it from behind the batsman, where it travels away from the camera
  const behind = !!runOut || kind === 'stumps' || kind === 'keeper' || kind === 'pad' || end.z > -6
  // the batsmen need time to run every run: the clip lasts until they have made them
  let tHold = runOut ? runOut.tThrow + 0.9 : Math.max(0.55, runs * RUN_SECONDS + 0.3 - tFlight)
  const runSeconds = runOut ? (tFlight + runOut.tThrow - 0.12) / (runOut.legs - 1 + 0.78) : RUN_SECONDS
  // a quicker ball reaches the bat sooner, a slow one hangs in the air
  const tDeliver = Math.max(0.36, Math.min(0.85, 0.5 * Math.pow(135 / Math.max(60, speed), 0.7)))
  const t2 = 0.95 + tDeliver, t3 = t2 + tFlight
  // when the wicket falls: a catch when the ball is taken, the stumps at once, a run out when they are hit; then the batsman walks off
  const wicketAt = !w ? null : runOut ? t3 + runOut.tThrow : w.kind === 'caught' || w.kind === 'caught and bowled' ? t3 : t2 + 0.25
  if (wicketAt !== null) tHold = Math.max(tHold, wicketAt + 1.6 - t3)
  // a fifty or a hundred: he raises his bat once the ball is done
  const milestone = !w && ev.tags.some((t) => t === 'fifty' || t === 'hundred' || t === '150' || t === '200')
  if (milestone) tHold = Math.max(tHold, runs * RUN_SECONDS + 1.3 - tFlight, 1.3)
  // a nick (a catch behind or a thin edge to the slips) is shown again, close up and in slow motion
  const nick = !!w && w.kind === 'caught' && (kind === 'keeper' || (peak < 3 && Math.hypot(end.x - meet.x, end.z - meet.z) < 14))
  const slow: Plan['slow'] = nick ? { at: t2 - 0.14, len: 0.5, factor: 0.3 } : null
  let signal: Plan['signal'] = null
  if (w) signal = { kind: 'out', at: (wicketAt ?? t3) + (w.kind === 'lbw' ? 0.7 : 0.15), who: 1 }
  else if (wide) signal = { kind: 'wide', at: t2 + 0.35, who: 1 }
  else if (noball) signal = { kind: 'noball', at: 0.95 + 0.12, who: 1 }
  else if (six) signal = { kind: 'six', at: t2 + 0.6, who: 2 }
  else if (ev.boundary === 4) signal = { kind: 'four', at: t3 - 0.2, who: 2 }
  else if (ev.appeal && !ev.appeal.out && ev.appeal.kind !== 'runout') signal = { kind: 'notout', at: t2 + 0.9, who: 1 }
  else if (byeFour) signal = { kind: 'four', at: t3 - 0.2, who: 2 }
  else if (bye) signal = { kind: 'bye', at: t2 + 0.4, who: 1 }
  else if (legbye) signal = { kind: 'legbye', at: t2 + 0.4, who: 2 }
  if (keeperDive) keeperDive.at = bye ? t2 - 0.05 : t2 + 0.1
  const appeal = (w && (w.kind === 'lbw' || (kind === 'keeper' && w.kind === 'caught'))) || (!!ev.appeal && ev.appeal.kind !== 'runout')
  const react: Plan['react'] = appeal ? { text: 'Howzat!', at: t2 + 0.15, who: 'bowler' } : legbye ? { text: 'Ouch!', at: t2 + 0.1, who: 'striker' } : wide ? { text: 'Wide!', at: t2 + 0.3, who: 'keeper' } : bye ? { text: 'Bye!', at: t2 + 0.3, who: 'keeper' }
    : noball ? { text: 'No ball!', at: 0.95 + 0.05, who: 'bowler' } : milestone ? { text: ev.tags.includes('hundred') || ev.tags.includes('150') || ev.tags.includes('200') ? '100!' : '50!', at: t3 + Math.max(0, runs * RUN_SECONDS - tFlight) + 0.4, who: 'striker' }
    : kind === 'keeper' && !w && ev.runsBat === 0 && ev.legal ? { text: 'Beaten!', at: t2 + 0.15, who: 'striker' } : null
  return {
    tRun: 0.95, tDeliver, tFlight, tHold, total: 0.95 + tDeliver + tFlight + tHold, speed, slow, realTotal: 0.95 + tDeliver + tFlight + tHold + (slow ? slow.len / slow.factor - slow.len : 0), runs, stanceX, runOut, runSeconds, bowlerCatch, stepOut: w?.kind === 'stumped',
    runFrom: { x: bowlerX, y: 0, z: BOWL_Z - (speed >= 130 ? 11.5 : speed >= 105 ? 8 : 4.5) }, runTo: { x: bowlerX, y: 0, z: noball ? BOWL_Z + 1.9 : BOWL_Z - 0.7 },
    release, bounce, meet, end, peak, kind, reverse: !behind && dist > 7 && runs === 0, swing, wicketFlies, catcher, chaser, six, boundary,
    shot: classifyShot({ swing, wide, runsBat: ev.runsBat, boundary: ev.boundary, air: kind === 'air', kind, side: (end.x - meet.x) * (leftHand ? -1 : 1), ahead: meet.z - end.z, length: lenZ, speed, seq: ev.seq }),
    signal, hurt, keeperDive, chaserDive: (ev.boundary === 4 || byeFour) && chaser >= 0, exitAt: wicketAt, celebrateAt: milestone ? react?.at ?? null : null, react,
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
  /** How far the stumps at the bowler's end have been knocked over (a run out there). */
  stumpsBowl: number
  /** The striker's own place when he is not running: stepping out of his crease to be stumped. */
  striker: V3 | null
  reverse: boolean
  /** The place the camera is looking, and how wide. */
  aim: V3; hfov: number
  /** The fielder who is moving, with where he is, by index in the fielders list. */
  moving: Map<number, V3>
  /** The two batsmen while they are running (the striker's and the non-striker's places), else null. */
  runners: { a: V3; b: V3 } | null
  /** An umpire's arms (which umpire, what signal, how far through it), a wince (0 to 1) after a leg bye, a bat raised high (0 to 1). */
  signal: { kind: SignalKind; k: number; who: 1 | 2 } | null
  hurt: number
  raise: number
  /** Fielders who are diving, by index (the keeper is 0): how far down (0 to 1) and to which side. */
  dives: Map<number, { k: number; dir: number; /** Which way the ball is from the diver on the ground (world metres), so the picture can drop him towards it whichever way the camera looks. */ dx: number; dz: number }>
  /** A word over somebody's head right now. */
  react: { text: string; who: 'striker' | 'bowler' | 'keeper' } | null
  /** The slow-motion close-up of a nick is on. */
  slowmo: boolean
  /** A boundary: where round the rope the ball went (an angle), what to write on the boards there, and how bright they are (0 to 1). */
  board: { a: number; text: string; k: number } | null
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
  let bowlerPos = t < t1 ? lerp3(plan.runFrom, plan.runTo, rs) : lerp3(plan.runTo, { x: plan.runTo.x + 2.2, y: 0, z: plan.runTo.z + 1.8 }, ease((t - t1) / 0.6))
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
  const ro = plan.runOut
  const hitAt = ro ? t2 + plan.tFlight + ro.tThrow : hitT
  const flyNow = plan.wicketFlies ? clamp01((t - hitAt) / 0.8) : 0
  const stumps = ro ? (ro.destEnd === 0 ? flyNow : 0) : flyNow
  const stumpsBowl = ro && ro.destEnd === 1 ? flyNow : 0
  // a run out: the fielder has the ball and throws it at the stumps
  if (ro && t >= t2 + plan.tFlight) {
    const s2 = clamp01((t - (t2 + plan.tFlight)) / ro.tThrow)
    ball = { x: lerp(plan.end.x, ro.throwTo.x, s2), y: Math.max(0.1, lerp(0.9, ro.throwTo.y, s2) + 0.6 * Math.sin(Math.PI * s2)), z: lerp(plan.end.z, ro.throwTo.z, s2) }
  }
  // the bowler takes the catch off his own bowling
  if (plan.bowlerCatch) { const k = ease((t - t2) / plan.tFlight); bowlerPos = lerp3(bowlerPos, { x: plan.end.x, y: 0, z: plan.end.z }, k) }
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
    // with runs being taken the picture settles on the pitch so the running can be seen
    if (plan.runOut) { const k = ease((t - t2) / Math.max(0.6, plan.tFlight)); aim = lerp3(lerp3(aim, b, 0.5), { x: 0, y: 0.8, z: -9 }, 0.55 * k + 0.2); hfov = Math.max(hfov, lerp(24, 40, k) * deg) }
    else if (plan.runs > 0) { const k = ease((t - t2) / Math.max(0.6, plan.tFlight)); aim = lerp3(aim, { x: 0, y: 0.8, z: -9 }, k * 0.8); hfov = Math.max(hfov, lerp(22, 36, k) * deg) }
  }
  // a nick in slow motion: right up close on the bat and ball
  const slowmo = !!plan.slow && t >= plan.slow.at && t <= plan.slow.at + plan.slow.len
  if (slowmo) { aim = { x: plan.meet.x, y: 0.85, z: plan.meet.z + 0.2 }; hfov = 9 * deg }
  // a fifty or hundred: once he has run his runs the picture goes in close on the batsman raising his bat, then tilts up to the sky
  if (plan.celebrateAt !== null && plan.celebrateAt !== undefined && t >= plan.celebrateAt - 0.15) {
    const atStrikerEnd = plan.runs % 2 === 0
    const head: V3 = { x: atStrikerEnd ? plan.stanceX : NON_STRIKER_X, y: 1.5, z: atStrikerEnd ? BAT_END_Z : BOWL_END_Z }
    const k = ease((t - (plan.celebrateAt - 0.15)) / 0.5)
    const sky = ease((t - plan.celebrateAt - 0.7) / 0.6)
    aim = lerp3(aim, { x: head.x, y: head.y + 1.6 * sky, z: head.z }, k)
    hfov = lerp(hfov, (10 + 8 * sky) * deg, k)
  }
  // running between the wickets: each run is a leg; they cross in the middle, and after an odd number they have swapped ends
  let runners: Frame['runners'] = null
  let striker: Frame['striker'] = null
  if (plan.runs > 0 && t >= t2) {
    const u0 = Math.max(0, (t - (t2 + 0.12)) / plan.runSeconds)
    const endZ = (end: number) => (end === 0 ? BAT_END_Z : BOWL_END_Z)
    const endX = (end: number) => (end === 0 ? plan.stanceX : NON_STRIKER_X)
    // one batsman, starting from `startEnd` (0: the striker's end), `u` runs into the clip
    const runner = (startEnd: number, sign: number, u: number): V3 => {
      const done = Math.min(plan.runs, Math.floor(u))
      const f = done >= plan.runs ? 1 : u - done
      const leg = done >= plan.runs ? plan.runs - 1 : done
      const from = (startEnd + leg) % 2, to = 1 - from
      const e = ease(f)
      return { x: lerp(endX(from), endX(to), e) + sign * 1.1 * Math.sin(Math.PI * e), y: Math.abs(Math.sin(f * Math.PI * 4)) * 0.08, z: lerp(endZ(from), endZ(to), e) }
    }
    // in a run out the one who is out stops where he is when the stumps are hit
    const cap = plan.runOut ? plan.runOut.legs - 1 + 0.78 : Infinity
    const ua = plan.runOut?.outIsStriker ? Math.min(u0, cap) : u0
    const ub = plan.runOut && !plan.runOut.outIsStriker ? Math.min(u0, cap) : u0
    runners = u0 <= 0 ? null : { a: runner(0, 1, ua), b: runner(1, -1, ub) }
  } else if (plan.stepOut) {
    // stumped: he comes down the pitch and is beaten
    striker = { x: plan.stanceX, y: 0, z: lerp(BAT_END_Z, -1.7, ease((t - (t2 - 0.45)) / 0.5)) }
  }
  // the out batsman walks off once the wicket has fallen
  if (plan.exitAt !== null && plan.exitAt !== undefined && t > plan.exitAt + 0.3) {
    const k = ease((t - plan.exitAt - 0.3) / 1.2)
    const exit: V3 = { x: plan.stanceX > 0 ? 11 : -11, y: 0, z: 17 }
    const walk = (p: V3): V3 => lerp3(p, exit, k)
    if (plan.runOut && runners) runners = plan.runOut.outIsStriker ? { a: walk(runners.a), b: runners.b } : { a: runners.a, b: walk(runners.b) }
    else if (!plan.runOut) striker = walk(striker ?? { x: plan.stanceX, y: 0, z: BAT_END_Z })
  }
  // the umpire's arms, the wince, the raised bat, the dives and the word over somebody's head
  const signal = plan.signal && t >= plan.signal.at ? { kind: plan.signal.kind, k: clamp01((t - plan.signal.at) / 0.3), who: plan.signal.who } : null
  const hurt = plan.hurt ? clamp01((t - t2) / 0.2) * (1 - clamp01((t - t2 - 1.0) / 0.6)) : 0
  const raise = plan.celebrateAt !== null && plan.celebrateAt !== undefined ? clamp01((t - plan.celebrateAt) / 0.3) : 0
  const dives = new Map<number, { k: number; dir: number; dx: number; dz: number }>()
  if (plan.keeperDive) { const d = plan.keeperDive; const k = clamp01((t - d.at) / 0.4) * (1 - clamp01((t - d.at - 1.1) / 0.5)); if (k > 0) dives.set(0, { k, dir: d.dir, dx: d.dir, dz: 0 }) }
  // a low catch is a dive; a high one is taken standing
  if (plan.catcher > 0 && plan.kind === 'air' && plan.peak < 3.4) { const k = clamp01((t - (t3 - 0.28)) / 0.28) * (1 - clamp01((t - t3 - 0.8) / 0.4)); if (k > 0) dives.set(plan.catcher, { k, dir: Math.sign(plan.end.x - fielderAt(plan.catcher).x) || 1, dx: plan.end.x - fielderAt(plan.catcher).x, dz: plan.end.z - fielderAt(plan.catcher).z }) }
  if (plan.chaserDive && plan.chaser >= 0) { const k = clamp01((sf - 0.8) / 0.18) * (1 - clamp01((t - t3 - 0.7) / 0.4)); if (k > 0) dives.set(plan.chaser, { k, dir: Math.sign(plan.end.x - fielderAt(plan.chaser).x) || 1, dx: plan.end.x - fielderAt(plan.chaser).x, dz: plan.end.z - fielderAt(plan.chaser).z }) }
  const react = plan.react && t >= plan.react.at && t < plan.react.at + 1.1 ? { text: plan.react.text, who: plan.react.who } : null
  // the boards at the boundary light up with FOUR or SIX where the ball went
  let board: Frame['board'] = null
  if (plan.boundary && t >= t3 - 0.15) {
    const k = clamp01((t - (t3 - 0.15)) / 0.2) * (1 - clamp01((t - t3 - 1.4) / 0.5))
    if (k > 0) board = { a: Math.atan2((plan.end.z - ROPE.cz) / ROPE.rz, (plan.end.x - ROPE.cx) / ROPE.rx), text: plan.six ? 'SIX' : 'FOUR', k }
  }
  const joy = plan.boundary || plan.wicketFlies || plan.catcher >= 0 ? clamp01((t - (plan.runOut ? hitAt : t3)) / 0.5) : 0
  return { slowmo, board, signal, hurt, raise, dives, react, runners, striker, stumpsBowl, bowler: bowlerPos, bowlerArm, ball, batSwing, stumps, reverse: plan.reverse && t >= t2 && !(plan.celebrateAt !== null && plan.celebrateAt !== undefined && t >= plan.celebrateAt - 0.15), aim, hfov, moving, joy, phase }
}

/** The camera turned to look at a point, from where it stands. */
export function lookAt(from: V3, aim: V3): { yaw: number; pitch: number } {
  const dx = aim.x - from.x, dz = aim.z - from.z, dy = from.y - aim.y
  return { yaw: Math.atan2(dx, dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) }
}

/** From real seconds into the clip to clip seconds: a nick's slow-motion window takes longer to play than it lasts. */
export function warpTime(plan: Pick<Plan, 'slow'>, real: number): number {
  const s = plan.slow
  if (!s) return real
  if (real <= s.at) return real
  const inside = (real - s.at) * s.factor
  if (inside <= s.len) return s.at + inside
  return s.at + s.len + (real - s.at - s.len / s.factor)
}

/** Which way a diver falls on the screen (+1 to the right, -1 to the left): towards the ball, whichever way the camera is looking (its yaw). */
export const screenSide = (dv: { dx: number; dz: number; dir: number }, yaw: number): number => Math.sign(dv.dx * Math.cos(yaw) - dv.dz * Math.sin(yaw)) || dv.dir

/** Moves an angle towards another by the shortest way. */
export function approach(a: number, b: number, k: number): number {
  let d = b - a
  while (d > Math.PI) d -= 2 * Math.PI
  while (d < -Math.PI) d += 2 * Math.PI
  return a + d * k
}
