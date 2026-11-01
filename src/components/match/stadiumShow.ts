import { cardGrid, type CheerVariant } from './CheerScreen'
import { BAT_END_Z, BOWL_Z, camWide, lookAt, ROPE, type Cam, type V3 } from './broadcast'
import { clamp01, mixPose, standing, type Pose } from './bodyPose'
import { shade } from '../../engine/stadium'
import { CEREMONY_BEATS, type SpeechLine } from './ceremonyScript'
import { REVIEW_VERDICT_AT, SCREEN_R, STAGE, slopePoint, type Ball3, type BigScreen, type BoardInfo, type Confetti, type CrowdClose, type FanSign, type ReviewBoard, type ScreenPost, type Spark } from './crowdDraw'

/**
 * The stadium shows: the camera leaves the live picture and travels round the ground to the cheerleaders dancing at the boundary with the crowd behind
 * them, the people in the stands, the fielders in a huddle in the middle, or up into the night sky for the fireworks. Everything here is plain numbers:
 * where the camera is at each moment, what the crowd and the sky are doing, and how the cheerleaders and the huddle stand. Looks only.
 */

export type ShowKind = 'cheer' | 'stands' | 'huddle' | 'fireworks' | 'social' | 'entrance' | 'trophy' | 'board' | 'studio' | 'flyover' | 'bowler' | 'hug' | 'walkoff' | 'landing' | 'lights' | 'lineup' | 'motm' | 'review' | 'rain' | 'milestone' | 'ceremony'

/** The title strip in the corner while a show plays: a name, a few lines under it and a small chip ("CHAMPIONS"). */
export interface Lower { title: string; lines: string[]; chip?: string; /** Figures under the words (a batsman's season: apps, runs, average...) and his overall rating. */ tiles?: { label: string; value: string }[]; rating?: number }

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
  /** A notice on the giant screen (the timeout, the super over, the studio). */
  board?: BoardInfo
  /** The batsman walking in is left-handed (which end of the crease he walks to). */
  left?: boolean
  /** The strip of words in the corner. */
  lower?: Lower
  /** Two batsmen come out side by side (the openers). */
  pair?: boolean
  /** The trophy lifted (its kind: cup, shield, globe...), or null for a team that celebrates without one. */
  trophy?: string | null
  /** The wicket celebration: where it happens (the bowler's follow-through, or the fielder who took the catch) and who is at its middle (the bowler, or the fielder at this place in the field). */
  focus?: V3
  celebrant?: 'bowler' | number
  /** The dismissed batsman's walk off: what he scored (the strip says the rest), whether the ground stands to applaud him (a fifty or more) and whether it was a duck. */
  walk?: { ovation: boolean; duck: boolean }
  /** A six: where it came down in the stands (its height says how high up), whether a fan caught it and whether it went out of the stadium altogether. */
  landing?: V3
  caught?: boolean
  gone?: boolean
  /** A review on the giant screen. */
  review?: ReviewBoard
  /** The rain: how hard it falls (1 drizzle, 2 rain). */
  rain?: 1 | 2
  /** The milestone: the batsman's score (50 or 100, or more). */
  score?: number
  /** The toss: who won it and what they chose, for the strip and the coin. */
  toss?: { winner: 0 | 1; bat: boolean }
  /** The post-match presentation: who says what and when, which men are the two captains and the Man of the Match, the prize on the cheque, and the title on the backdrop. */
  ceremony?: { script: SpeechLine[]; winCaptainId: string; loseCaptainId: string; motmId: string; cheque: string; title: string; hostName: string }
}

/** How long each show lasts at full speed (the camera flight is the first part of it). */
export const SHOW_SECONDS: Record<ShowKind, number> = { cheer: 7, stands: 6.6, huddle: 6.6, fireworks: 7, social: 9.2, entrance: 8.6, trophy: 9.6, board: 8.2, studio: 4.6, flyover: 6, bowler: 7.8, hug: 4.8, walkoff: 5.8, landing: 4.8, lights: 7.4, lineup: 11.5, motm: 9, review: 12, rain: 9.4, milestone: 7.2, ceremony: CEREMONY_BEATS.end }

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
const HUDDLE_R = 11
const huddleCam = (seed: number, phi: number): V3 => { const h = huddleCentre(seed); return { x: h.x + Math.sin(phi) * HUDDLE_R, y: 5.4, z: h.z - Math.cos(phi) * HUDDLE_R } }
const huddlePhi = (hold: number) => -0.9 + 1.8 * ease(hold)

interface Flight { keys: [Key, Key, Key]; fly: number }

// ---- the entrance of a new batsman -------------------------------------------------------------------------------------------

/** The gate the batsmen come out of: the middle of the far stand, at the rope. */
export const gatePos = (): V3 => ringPt(Math.PI / 2, 0.985)
/** When he comes out of the gate, how long the walk takes, and when the camera is in front of him. */
export const ENTRANCE = { start: 2.0, walk: 5.4, track: 3.0 }
const creaseOf = (show: StadiumShow): V3 => ({ x: show.left ? -0.75 : 0.75, y: 0, z: BAT_END_Z })

/** Where the `i`th walker is `t` seconds in: in the gate, then across the ground (fast at first, slowing as he gets to the crease). Two openers come out side by side; the second stops a couple of metres from the first. */
export function walkerPos(show: StadiumShow, t: number, i = 0): V3 {
  const g = gatePos(), c = creaseOf(show)
  const end = i === 0 ? c : { x: c.x - Math.sign(c.x) * 1.95, y: 0, z: c.z - 0.4 }
  const start = { x: g.x + (i === 0 ? 0.6 : -0.6), y: 0, z: g.z }
  const s = clamp01((t - ENTRANCE.start) / ENTRANCE.walk)
  const e = 1 - Math.pow(1 - s, 1.3)
  return { x: lerp(start.x, end.x, e), y: 0, z: lerp(start.z, end.z, e) }
}
/** The camera that goes in front of him (or between the two of them), ten metres ahead, looking back at him coming. */
function trackKey(show: StadiumShow, t: number): Key {
  const w0 = walkerPos(show, Math.max(t, ENTRANCE.track)), w1 = show.pair ? walkerPos(show, Math.max(t, ENTRANCE.track), 1) : w0
  const w = { x: (w0.x + w1.x) / 2, y: 0, z: (w0.z + w1.z) / 2 }
  return { p: { x: 2.4 + w.x * 0.4, y: 1.75, z: Math.max(w.z - 10, -13) }, aim: { x: w.x, y: 1.3, z: w.z }, hfov: (show.pair ? 46 : 38) * rad }
}

// ---- a new bowler comes on ---------------------------------------------------------------------------------------------------

/** Where he marks out his run-up: twelve metres behind the stumps at the bowler's end. */
export const bowlerMark = (): V3 => ({ x: 0.6, y: 0, z: BOWL_Z - 12 })
/** Where he jogs in from: out in the deep on one side. */
export const bowlerFrom = (seed: number): V3 => ({ x: sideOf(seed + 3) * 28, y: 0, z: -24 })
/** When he sets off, how long the jog takes, then he rubs the ball on his trousers, takes his first run-up steps and settles. */
export const BOWLER_IN = { start: 1.0, shine: 1.4, steps: 0.9, fly: 2.6 }
const bowlerDist = (show: StadiumShow): number => { const a = bowlerFrom(show.seed), b = bowlerMark(); return Math.hypot(a.x - b.x, a.z - b.z) }
const bowlerWalk = (show: StadiumShow): number => Math.max(2.4, Math.min(3.6, bowlerDist(show) / 8))
/** The moment he reaches his mark. */
export const bowlerArrives = (show: StadiumShow): number => BOWLER_IN.start + bowlerWalk(show)
/** What he is doing: jogging in, rubbing the ball, taking his first steps, or ready. */
export function bowlerPhase(show: StadiumShow, t: number): 'jog' | 'shine' | 'steps' | 'ready' {
  const a = bowlerArrives(show)
  return t < a ? 'jog' : t < a + BOWLER_IN.shine ? 'shine' : t < a + BOWLER_IN.shine + BOWLER_IN.steps ? 'steps' : 'ready'
}
/** Where he is `t` seconds in. */
export function bowlerPos(show: StadiumShow, t: number): V3 {
  const from = bowlerFrom(show.seed), m = bowlerMark()
  const w = clamp01((t - BOWLER_IN.start) / bowlerWalk(show))
  const e = 1 - Math.pow(1 - w, 1.5) // quick at first, slowing as he reaches his mark
  const stepK = ease((t - bowlerArrives(show) - BOWLER_IN.shine) / BOWLER_IN.steps)
  return { x: lerp(from.x, m.x, e), y: 0, z: lerp(from.z, m.z, e) + 3 * stepK }
}
/** The ball rubbed on the trousers: the right hand goes up and down the thigh, the head looks down at it. */
export function shinePose(t: number): Pose {
  const b = t * 9
  return { ...standing(), ball: true, hip: { x: 30, y: 87 }, lean: 2, head: { dx: 0, dy: 3, tilt: 5 }, handL: { x: -8, y: 30 }, handR: { x: 9 + 3 * Math.sin(b), y: 44 + 4 * Math.cos(b) } }
}
/** The camera runs ahead of him along the way he comes, looking back at him (and keeps the same place when he stops, pushing in on his face). */
function bowlerKey(show: StadiumShow, t: number): Key {
  const w = bowlerPos(show, Math.min(t, bowlerArrives(show)))
  const from = bowlerFrom(show.seed), m = bowlerMark()
  const d = Math.hypot(m.x - from.x, m.z - from.z) || 1
  const dir = { x: (m.x - from.x) / d, z: (m.z - from.z) / d }
  const arrived = ease((t - bowlerArrives(show)) / 1.2)
  return { p: { x: w.x + dir.x * 8, y: 1.7, z: w.z + dir.z * 8 }, aim: { x: w.x, y: 1.35, z: w.z + 3 * ease((t - bowlerArrives(show) - BOWLER_IN.shine) / BOWLER_IN.steps) }, hfov: lerp(38, 29, arrived) * rad }
}

// ---- the wicket celebration and the walk off --------------------------------------------------------------------------------

/** How the team mobs the one who took the wicket: they run in until 2.3 seconds, then jump together. */
export const HUG = { start: 0.3, arrive: 1.9 }
const hugCam = (show: StadiumShow, hold: number): V3 => {
  const f = show.focus ?? { x: 0, y: 0, z: -12 }
  const phi = -0.7 + 1.6 * ease(hold)
  return { x: f.x + Math.sin(phi) * 8.5, y: 3.0 + 2.4 * ease(hold), z: f.z - Math.cos(phi) * 8.5 }
}
/** Which of the fielders (by the order of their starting places) run to the celebration: the nearest six. */
export function hugJoiners(show: StadiumShow, froms: V3[], exclude = -1): number[] {
  const f = show.focus ?? { x: 0, y: 0, z: -12 }
  return froms.map((p, i) => ({ i, d: Math.hypot(p.x - f.x, p.z - f.z) })).filter((x) => x.i !== exclude).sort((a, b) => a.d - b.d).slice(0, 6).map((x) => x.i)
}
/** Where the `k`th of `n` who join stands in the cluster round the celebrant. */
export function hugSpot(show: StadiumShow, k: number, n: number): V3 {
  const f = show.focus ?? { x: 0, y: 0, z: -12 }
  const a = (k / Math.max(1, n)) * Math.PI * 2 + 0.5
  return { x: f.x + Math.cos(a) * 1.5, y: 0, z: f.z + Math.sin(a) * 1.5 }
}
/** One of them `t` seconds in: running in with both arms up, then jumping together with their arms round each other. */
export function hugPerson(t: number, from: V3, to: V3, joins: boolean): { pos: V3; arrived: boolean; pose: Pose | null } {
  const b = beatAt(t) * 0.9
  if (!joins) {
    // those too far away stay where they are and cheer, both arms up
    const pose: Pose = { ...standing(), hip: { x: 30, y: 85.3 - 4 * Math.max(0, Math.sin(b + from.x)) }, handL: { x: -24, y: -22 }, handR: { x: 24, y: -22 } }
    return { pos: from, arrived: true, pose }
  }
  const w = ease((t - HUG.start) / (HUG.arrive - HUG.start))
  const pos = lerp3(from, to, w)
  if (w < 1) return { pos, arrived: false, pose: null }
  const jump = Math.max(0, Math.sin(b))
  const pose: Pose = { ...standing(), hip: { x: 30, y: 85.3 - 12 * jump }, lean: 3 * Math.sin(b), handL: { x: -27, y: 2 }, handR: { x: 27, y: 2 }, head: { dx: 0, dy: 1, tilt: 4 * Math.sin(b) }, footL: { x: 24, y: 117 - 4 * jump }, footR: { x: 36, y: 117 - 4 * jump } }
  return { pos: { ...pos, y: 0.4 * jump }, arrived: true, pose }
}
/** The celebrant in the middle: jumping, both arms up. */
export function hugCelebrant(t: number): Pose {
  const jump = Math.max(0, Math.sin(beatAt(t) * 0.9 + 1))
  return { ...standing(), hip: { x: 30, y: 85.3 - 13 * jump }, handL: { x: -18, y: -26 }, handR: { x: 18, y: -26 }, head: { dx: 0, dy: -1, tilt: 0 } }
}

/** When the dismissed batsman starts to walk, when the picture cuts to the last stretch before the gate, and when he goes in. */
export const WALKOFF = { start: 1.0, cut: 3.3, end: 5.3, fly: 1.6 }
/** Where he is `t` seconds in (null once he has gone through the gate): the first stretch from the crease, then, after the cut, the last metres to the gate. */
export function walkoffPos(show: StadiumShow, t: number): V3 | null {
  const c = creaseOf(show), g = gatePos()
  if (t >= WALKOFF.end) return null
  if (t < WALKOFF.cut) {
    const s = clamp01((t - WALKOFF.start) / (WALKOFF.cut - WALKOFF.start))
    return { x: lerp(c.x, 1.4, s), y: 0, z: lerp(c.z, c.z + 16, s) }
  }
  const s = clamp01((t - WALKOFF.cut) / (WALKOFF.end - WALKOFF.cut))
  return { x: lerp(1.2, g.x, s), y: 0, z: lerp(g.z - 13, g.z, s) }
}
const walkoffKey = (show: StadiumShow, t: number): Key => {
  const w = walkoffPos(show, Math.min(t, WALKOFF.end - 0.01)) ?? gatePos()
  return { p: { x: 2.2 + w.x * 0.3, y: 1.9, z: Math.min(w.z + 13, 56) }, aim: { x: w.x, y: 1.3, z: w.z }, hfov: 38 * rad }
}

// ---- a six coming down in the stands ----------------------------------------------------------------------------------------

/** When the ball is over the field, when it comes down, and when the fans have reacted. */
export const LANDING = { launch: 0.5, land: 2.2, fly: 1.7 }
const landingAngle = (show: StadiumShow): number => {
  const l = show.landing ?? { x: 70, y: 6, z: -10 }
  return Math.atan2((l.z - ROPE.cz) / ROPE.rz, (l.x - ROPE.cx) / ROPE.rx)
}
const landingU = (show: StadiumShow): number => Math.max(0.05, Math.min(0.95, ((show.landing?.y ?? 6) - 0.9) / 11.1))
/** The ball `t` seconds in: a high arc down from over the field into the seats; then it is held up by a fan, or bounces down the steps; or, if it went out, it clears the roof. */
export function landingBall(show: StadiumShow, t: number): Ball3 | null {
  const L = show.landing ?? { x: 70, y: 6, z: -10 }
  const a = landingAngle(show)
  const dir = { x: Math.cos(a) * ROPE.rx, z: Math.sin(a) * ROPE.rz }
  const dl = Math.hypot(dir.x, dir.z) || 1
  const d = { x: dir.x / dl, z: dir.z / dl } // the way the ball is travelling: from the middle out to the stands
  const flightT = LANDING.land - LANDING.launch
  const u = (t - LANDING.launch) / flightT
  if (u < 0) return null
  if (u <= 1) {
    const back = 44
    const x = L.x - d.x * back * (1 - u), z = L.z - d.z * back * (1 - u)
    const y = L.y + 30 * (1 - u) * (1 - u) + 8 * Math.sin(Math.PI * Math.min(1, u * 0.9)) * (1 - u)
    return { p: { x, y, z }, tail: { x: x - d.x * 3.5, y: y + 3.5 * (1 - u), z: z - d.z * 3.5 }, size: 0.5 }
  }
  const tau = t - LANDING.land
  if (show.gone) {
    // it keeps going, up over the roof and away
    const gy = (k: number) => L.y + 22 * k + 14 * k * k
    return { p: { x: L.x + d.x * 16 * tau, y: gy(tau), z: L.z + d.z * 16 * tau }, tail: { x: L.x + d.x * 16 * (tau - 0.1), y: gy(Math.max(0, tau - 0.1)), z: L.z + d.z * 16 * (tau - 0.1) }, size: 0.5 * Math.max(0.3, 1 - tau * 0.2) }
  }
  if (show.caught) {
    // in the fan's hands, held over his head
    return { p: { x: L.x - d.x * 0.1, y: L.y + 2.1 + 0.25 * Math.abs(Math.sin(tau * 7)), z: L.z - d.z * 0.1 }, size: 0.3 }
  }
  // it hits the seats and bounces back down the steps towards the field
  const hop = (k: number, h: number, len: number) => (tau < k ? 0 : tau < k + len ? 4 * h * ((tau - k) / len) * (1 - (tau - k) / len) : 0)
  const roll = Math.min(tau, 2.2) * 3.2
  const y = L.y + 0.14 + hop(0, 1.6, 0.9) + hop(0.9, 0.7, 0.55) + hop(1.45, 0.3, 0.35) - roll * 0.5
  return { p: { x: L.x - d.x * roll, y: Math.max(1, y), z: L.z - d.z * roll }, size: 0.3 }
}
// ---- the floodlights coming on ---------------------------------------------------------------------------------------------

/** When the first tower lights, and how long each takes (they go one after another, then the whole ground brightens). */
export const LIGHTS = { fly: 1.8, start: 1.9, each: 1.1, gap: 1.2 }
/** How lit each of the four towers is `t` seconds in. */
export function towersAt(t: number): { on: number[]; dusk: number } {
  const on = [0, 1, 2, 3].map((k) => clamp01((t - LIGHTS.start - [0, 1, 1.7, 1.7][k] * LIGHTS.gap) / LIGHTS.each)) // (the far two are the ones the camera sees; the near two come on as it swings round)
  return { on, dusk: ease((t - LIGHTS.start) / (LIGHTS.gap * 3 + LIGHTS.each)) } // (the evening gets darker as the lamps come on)
}
/** The camera in the show: it tilts up from the live picture to the towers and the darkening sky. */
const lightsKey = (): Key => ({ p: { x: 0, y: 3, z: -20 }, aim: { x: 46, y: 25, z: 42 }, hfov: 72 * rad })

// ---- the balcony: a fifty or a hundred --------------------------------------------------------------------------------------

/** The push-in on the batsman, then the cut to the dressing room. */
export const MILESTONE = { push: 2.4, cut: 2.5 }
/** Where the team sits: a row on the terrace of the near stand (behind the broadcast camera), a few metres up. */
export const balconyAngle = (): number => -Math.PI / 2
export function balconySpot(i: number, n: number): V3 {
  const a = balconyAngle() + ((i - (n - 1) / 2) / Math.max(1, n)) * 0.17
  const p = slopePoint(a, 0.2)
  return { x: p.x, y: p.y, z: p.z }
}
/** The team clapping: sitting for a moment, then on their feet with their hands together over their heads. */
export function balconyPose(t: number, i: number): Pose {
  const stand = ease((t - MILESTONE.cut - 0.3 - (i % 4) * 0.12) / 0.5)
  const b = beatAt(t) * 1.4 + i
  const clap = Math.abs(Math.sin(b))
  return mixPose({ ...standing(), hip: { x: 30, y: 100 }, handL: { x: -16, y: 18 }, handR: { x: 16, y: 18 }, footL: { x: 22, y: 117 }, footR: { x: 38, y: 117 } },
    { ...standing(), hip: { x: 30, y: 85.3 }, handL: { x: -3 - 12 * clap, y: -6 - 12 * clap }, handR: { x: 3 + 12 * clap, y: -6 - 12 * clap }, head: { dx: 0, dy: 0, tilt: 3 * Math.sin(b) } }, stand)
}

// ---- rain stops play ---------------------------------------------------------------------------------------------------------

/** How much of the pitch the covers have got over (0 to 1), pulled out from the bowler's end. */
export const COVER = { start: 1.8, end: 6.4 }
export const coverAt = (t: number): number => ease((t - COVER.start) / (COVER.end - COVER.start))
/** Where the `i`th of `n` ground staff is: along the two sides of the front edge of the sheet, running with it (a few stand at the back and push the roll). */
export function crewPos(i: number, n: number, t: number): V3 {
  const k = coverAt(t), z = BOWL_Z - 4 + k * 8.4
  const side = i % 2 ? 1 : -1
  const row = Math.floor(i / 2) / Math.max(1, Math.ceil(n / 2) - 1)
  const out = lerp(BOWL_Z - 9, 0, ease((t - 0.2 - row * 0.4) / 1.6)) // they run in from the boundary side first
  return { x: side * 3.4, y: 0, z: Math.max(out, z - 0.8 - row * 3.2) }
}

// ---- the Man of the Match ------------------------------------------------------------------------------------------------------

export const podiumPos = (): V3 => ({ x: 0, y: 0, z: -8 })
/** The photographers' flashes round the rope: each goes off now and then, brightest in the first seconds. Returns where and how bright. */
export function photoFlashes(seed: number, t: number): Spark[] {
  const out: Spark[] = []
  for (let i = 0; i < 24; i++) {
    const per = 0.55 + hash01(seed + i * 1.3) * 0.7
    const phase = (t + hash01(i * 2.7) * 3) % per
    if (phase < 0.09 && t > 1.2) {
      const a = (i / 24) * Math.PI * 2 + hash01(i * 4.1) * 0.2
      out.push({ p: ringPt(a, 0.99, 1.4), rgb: [255, 255, 255], a: 1 - phase / 0.09, size: 1.6 })
    }
  }
  return out
}

// ---- the toss and the line-up ---------------------------------------------------------------------------------------------------

/** When the captains meet, the coin goes up, the teams run out, and the line-up is complete. */
export const LINEUP = { meet: 3.2, coin: 3.6, coinEnd: 5.0, run: 5.2, lined: 8.2 }
/** A captain: walks from his side to the middle, waits for the coin, then back to his place in the line. */
export function captainPos(side: 0 | 1, t: number, home: V3): V3 {
  const x = side === 0 ? -1.4 : 1.4, z = -9
  const away = { x: side === 0 ? -9 : 9, y: 0, z }
  const w = ease((t - 0.8) / (LINEUP.meet - 0.8))
  const back = ease((t - LINEUP.coinEnd) / 1.8)
  const mid = lerp3(away, { x, y: 0, z }, w)
  return lerp3(mid, home, back)
}
/** A player's place in his team's line: eleven across, the batting order from the left. */
export function lineSpot(side: 0 | 1, i: number): V3 {
  const x = (side === 0 ? -1 : 1) * (1.7 + i * 0.98)
  return { x, y: 0, z: -6.5 }
}
export function linePerson(side: 0 | 1, i: number, t: number): { pos: V3; arrived: boolean } {
  const spot = lineSpot(side, i), from: V3 = { x: spot.x + (side === 0 ? -34 : 34), y: 0, z: -9 }
  const w = ease((t - LINEUP.run - i * 0.1) / 2.4)
  return { pos: lerp3(from, spot, w), arrived: w >= 1 }
}
/** The coin: how high it is above the captains (metres) and how far it has turned, at `t` (null when it is not in the air). */
export function coinAt(t: number): { y: number; turn: number } | null {
  if (t < LINEUP.coin || t > LINEUP.coinEnd) return null
  const u = (t - LINEUP.coin) / (LINEUP.coinEnd - LINEUP.coin)
  return { y: 1.9 + 3.6 * 4 * u * (1 - u) * (u < 1 ? 1 : 0), turn: u * Math.PI * 14 }
}

// ---- the post-match presentation ---------------------------------------------------------------------------------------------

const HOST_SPOT: V3 = { x: -1.9, y: STAGE.h, z: -7.7 }
const SPEAK_SPOT: V3 = { x: 1.4, y: STAGE.h, z: -7.7 }
/** Where the winners (side 0) and the losers (side 1) stand at the sides of the stage, in two rows, clapping. */
export function ceremonyLine(side: 0 | 1, i: number): V3 {
  const x = (side === 0 ? -1 : 1) * (6.4 + (i % 6) * 0.9)
  return { x, y: 0, z: i < 6 ? -8.7 : -7.2 }
}
/** The host walks on, and each speaker walks to the microphone for his turn, then back to the line (the Man of the Match stays). */
const WALK = 1.5
export const hostPos = (t: number): V3 => {
  const k = ease((t - 0.8) / 2.2)
  return lerp3({ x: -11, y: 0, z: -8.2 }, HOST_SPOT, k)
}
/** Whose turn at the microphone: his own first and last moment on the stage. */
export function turnsOf(show: StadiumShow, id: string): { start: number; end: number }[] {
  const c = show.ceremony
  if (!c) return []
  const B = CEREMONY_BEATS
  const out: { start: number; end: number }[] = []
  if (id === c.winCaptainId) out.push({ start: B.win - 0.4, end: B.win + 9.8 })
  if (id === c.loseCaptainId) out.push({ start: B.lose - 0.4, end: B.lose + 9.0 })
  if (id === c.motmId) out.push({ start: B.motm - 1.0, end: Infinity })
  return out
}
/** One of the players `t` seconds in: running on to the line, standing there clapping, or up on the stage. */
export function ceremonyPerson(show: StadiumShow, t: number, id: string, line: V3, side: 0 | 1, i: number): { pos: V3; arrived: boolean; onStage: boolean } {
  const run = ease((t - 2.4 - (i % 6) * 0.12) / 2.2)
  const from: V3 = { x: line.x + (side === 0 ? -34 : 34), y: 0, z: line.z }
  let pos = lerp3(from, line, run)
  let onStage = false
  for (const tn of turnsOf(show, id)) {
    if (t >= tn.start && t < tn.start + WALK) { pos = lerp3(line, SPEAK_SPOT, ease((t - tn.start) / WALK)); onStage = true }
    else if (t >= tn.start + WALK && t < tn.end) { pos = SPEAK_SPOT; onStage = true }
    else if (t >= tn.end && t < tn.end + WALK) { pos = lerp3(SPEAK_SPOT, line, ease((t - tn.end) / WALK)); onStage = true }
  }
  return { pos, arrived: run >= 1, onStage }
}
/** The camera: wide on the whole stage, in on the host and the captain, then closer for the Man of the Match, then wide again to finish. */
function ceremonyKey(t: number): Key {
  const B = CEREMONY_BEATS
  const wide: Key = { p: { x: 0, y: 2.9, z: -27 }, aim: { x: 0, y: 1.6, z: -8 }, hfov: 62 * rad }
  const duo: Key = { p: { x: 0.8, y: 2.3, z: -20 }, aim: { x: -0.2, y: 1.65, z: -8 }, hfov: 40 * rad }
  const close: Key = { p: { x: 2.0, y: 2.1, z: -16.5 }, aim: { x: 0.3, y: 1.6, z: -8 }, hfov: 33 * rad }
  const mix = (a: Key, b: Key, k: number): Key => ({ p: lerp3(a.p, b.p, k), aim: lerp3(a.aim, b.aim, k), hfov: lerp(a.hfov, b.hfov, k) })
  let key = wide
  key = mix(key, duo, ease((t - (B.win - 1.4)) / 1.6))
  key = mix(key, { ...duo, p: { ...duo.p, x: 1.4 }, aim: { ...duo.aim, x: 0.6 } }, ease((t - (B.lose - 1.0)) / 1.6) * 0.0 + ease((t - (B.lose - 1.0)) / 1.6))
  key = mix(key, close, ease((t - (B.motm - 1.4)) / 1.8))
  key = mix(key, wide, ease((t - (B.close - 0.6)) / 2.0))
  return key
}

// ---- the trophy -------------------------------------------------------------------------------------------------------------------

/** Where the team gathers: the middle of the ground, just off the pitch. */
export const trophyCentre = (): V3 => ({ x: 0, y: 0, z: -8 })
const trophyStands = (seed: number): number => standAngle(seed + 5)
const trophyCam = (seed: number, hold: number): V3 => {
  const c = trophyCentre(), a = trophyStands(seed)
  const to = ringPt(a, 1)
  const d = Math.hypot(to.x - c.x, to.z - c.z) || 1
  const dir = { x: (to.x - c.x) / d, z: (to.z - c.z) / d } // towards the stands behind the team
  const phi = -0.5 + 1.0 * ease(hold) // the camera swings a little round the team
  const R = 14 - 2.5 * ease(hold)
  const bx = -dir.x, bz = -dir.z
  return { x: c.x + (bx * Math.cos(phi) - bz * Math.sin(phi)) * R, y: 2.4 + 4.2 * ease(hold), z: c.z + (bx * Math.sin(phi) + bz * Math.cos(phi)) * R }
}

function flightOf(show: StadiumShow): Flight {
  const s0 = startKey()
  const mid = (end: Key, lift: number, extraFov = 4): Key => ({ p: add3(lerp3(s0.p, end.p, 0.5), { x: 0, y: lift, z: 0 }), aim: lerp3(s0.aim, end.aim, 0.5), hfov: lerp(s0.hfov, end.hfov, 0.5) + extraFov * rad })
  if (show.kind === 'cheer' && show.variant === 'cards') {
    const a = standAngle(show.seed + 7)
    const end: Key = { p: ringPt(a, 0.72, 5.5), aim: slopePoint(a, 0.44), hfov: 38 * rad }
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
    const end: Key = { p: huddleCam(show.seed, huddlePhi(0)), aim: { x: h.x, y: 0.9, z: h.z }, hfov: 38 * rad }
    return { keys: [s0, mid(end, 3, 0), end], fly: 2.4 }
  }
  if (show.kind === 'social' || show.kind === 'board') {
    const a = screenAngle(show.seed + (show.kind === 'board' ? 5 : 0))
    const end: Key = { p: ringPt(a, 0.8, 8), aim: ringPt(a, SCREEN_R, 15), hfov: 34 * rad }
    return { keys: [s0, mid(end, 8), end], fly: 2.8 }
  }
  if (show.kind === 'studio') {
    const a = screenAngle(show.seed + 9)
    const end: Key = { p: ringPt(a, 0.9, 7), aim: ringPt(a, SCREEN_R, 16.5), hfov: 29 * rad }
    return { keys: [s0, mid(end, 7), end], fly: 3.5 }
  }
  if (show.kind === 'entrance') {
    const end = trackKey(show, ENTRANCE.track)
    return { keys: [s0, { p: { x: 6, y: 9, z: 8 }, aim: lerp3(s0.aim, end.aim, 0.6), hfov: 50 * rad }, end], fly: ENTRANCE.track }
  }
  if (show.kind === 'ceremony') {
    const end = ceremonyKey(0)
    return { keys: [s0, { p: { x: 12, y: 8, z: -34 }, aim: lerp3(s0.aim, end.aim, 0.6), hfov: 56 * rad }, end], fly: 2.6 }
  }
  if (show.kind === 'review') {
    const a = screenAngle(show.seed + 5)
    const end: Key = { p: ringPt(a, 0.8, 8), aim: ringPt(a, SCREEN_R, 15), hfov: 34 * rad }
    return { keys: [s0, mid(end, 8), end], fly: 2.6 }
  }
  if (show.kind === 'rain') {
    const end: Key = { p: { x: 9, y: 5.5, z: -36 }, aim: { x: 0, y: 0.5, z: -17 }, hfov: 46 * rad }
    return { keys: [s0, mid(end, 3), end], fly: 2.2 }
  }
  if (show.kind === 'milestone') {
    const end: Key = { p: { x: 1.6, y: 1.7, z: -9 }, aim: { x: 0.75, y: 1.45, z: -0.95 }, hfov: 22 * rad }
    return { keys: [s0, mid(end, 0, 0), end], fly: MILESTONE.push }
  }
  if (show.kind === 'motm') {
    const c = podiumPos()
    const end: Key = { p: { x: 4.5, y: 2.1, z: c.z - 9 }, aim: { x: 0, y: 1.9, z: c.z }, hfov: 44 * rad }
    return { keys: [s0, mid(end, 9), end], fly: 2.8 }
  }
  if (show.kind === 'lineup') {
    // the other way round, like the fly-over: down from above the stadium to the pitch where the captains meet
    const start: Key = { p: { x: 58, y: 48, z: 30 }, aim: { x: 0, y: 0, z: -8 }, hfov: 64 * rad }
    const end: Key = { p: { x: 0, y: 2.4, z: -27 }, aim: { x: 0, y: 1.4, z: -9 }, hfov: 46 * rad }
    return { keys: [start, { p: { x: 22, y: 16, z: -52 }, aim: { x: 0, y: 1, z: -9 }, hfov: 52 * rad }, end], fly: 3 }
  }
  if (show.kind === 'lights') {
    const end = lightsKey()
    return { keys: [s0, { p: { x: 0, y: 4, z: -32 }, aim: { x: 20, y: 18, z: 14 }, hfov: 60 * rad }, end], fly: LIGHTS.fly }
  }
  if (show.kind === 'landing') {
    const a = landingAngle(show)
    const end: Key = { p: ringPt(a, 0.8, 4.6), aim: add3(slopePoint(a, landingU(show)), { x: 0, y: show.gone ? 5 : 0.6, z: 0 }), hfov: (show.gone ? 44 : 40) * rad }
    return { keys: [s0, mid(end, 6), end], fly: LANDING.fly }
  }
  if (show.kind === 'hug') {
    const f = show.focus ?? { x: 0, y: 0, z: -12 }
    const end: Key = { p: hugCam(show, 0), aim: { x: f.x, y: 1.3, z: f.z }, hfov: 40 * rad }
    return { keys: [s0, mid(end, 5), end], fly: 2.4 }
  }
  if (show.kind === 'walkoff') {
    const end = walkoffKey(show, WALKOFF.fly)
    return { keys: [s0, { p: { x: 3.5, y: 6, z: -17 }, aim: lerp3(s0.aim, end.aim, 0.6), hfov: 48 * rad }, end], fly: WALKOFF.fly }
  }
  if (show.kind === 'bowler') {
    const end = bowlerKey(show, BOWLER_IN.fly)
    return { keys: [s0, { p: { x: 8, y: 6, z: -20 }, aim: lerp3(s0.aim, end.aim, 0.6), hfov: 46 * rad }, end], fly: BOWLER_IN.fly }
  }
  if (show.kind === 'trophy') {
    const c = trophyCentre()
    const end: Key = { p: trophyCam(show.seed, 0), aim: { x: c.x, y: 1.5, z: c.z }, hfov: 44 * rad }
    return { keys: [s0, mid(end, 7), end], fly: 2.6 }
  }
  if (show.kind === 'flyover') {
    // the other way round: it comes down from high above the far stand and ends exactly where the broadcast camera stands, so the first ball follows on
    const start: Key = { p: { x: -60, y: 46, z: 18 }, aim: { x: 0, y: 0, z: -8 }, hfov: 62 * rad }
    return { keys: [start, { p: { x: -26, y: 24, z: -62 }, aim: { x: 0, y: 2, z: -6 }, hfov: 54 * rad }, s0], fly: SHOW_SECONDS.flyover }
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
  let hfov = s < 0.5 ? lerp(k0.hfov, k1.hfov, s * 2) : lerp(k1.hfov, k2.hfov, (s - 0.5) * 2)
  const hold = clamp01((t - fl.fly) / Math.max(0.1, T - fl.fly))
  const dh = ease(hold)
  if (show.kind === 'flyover') return { p, ...lookAt(p, aim), hfov }
  if (show.kind === 'entrance') {
    // after the flight the camera runs ahead of him, looking back
    if (t >= ENTRANCE.track) { const k = trackKey(show, t); p = k.p; aim = k.aim; hfov = k.hfov }
  } else if (show.kind === 'ceremony') {
    if (s >= 1) { const k = ceremonyKey(t); p = k.p; aim = k.aim; hfov = k.hfov }
  } else if (show.kind === 'review') {
    // (the screen holds still)
  } else if (show.kind === 'rain') {
    if (s >= 1) { const k = ease((t - COVER.start - 3.6) / 2.6); p = { x: lerp(9, -4, k), y: lerp(5.5, 2.4, k), z: lerp(-36, -28, k) }; aim = { x: lerp(0, -6, k), y: lerp(0.5, 9, k), z: lerp(-17, 46, k) } }
  } else if (show.kind === 'milestone') {
    if (t >= MILESTONE.cut) {
      const b = balconySpot(3, 8), hold = ease((t - MILESTONE.cut) / 3)
      p = { x: lerp(-5, 5, hold), y: 3, z: -34 }
      aim = { x: b.x * 0.5, y: b.y + 1, z: b.z }
      hfov = lerp(30, 26, hold) * rad
    }
  } else if (show.kind === 'motm') {
    if (s >= 1) { const c = podiumPos(), k = ease((t - 2.8) / 4.5); p = { x: lerp(4.5, -4.5, k), y: lerp(2.1, 2.9, k), z: c.z - lerp(9, 8, k) }; aim = { x: 0, y: 1.9, z: c.z } }
  } else if (show.kind === 'lineup') {
    if (s >= 1) {
      // it stays on the captains for the coin, then glides to the sweep along the two lines, one name after another
      const sk = ease((t - LINEUP.coinEnd - 2.2) / 5.2), b = ease((t - LINEUP.coinEnd - 0.2) / 1.8)
      const sw = { p: { x: lerp(-7, 7, sk), y: 2.3, z: -21 }, aim: { x: lerp(-7.5, 7.5, sk), y: 1.3, z: -6.5 }, hfov: 40 * rad }
      p = lerp3({ x: 0, y: 2.4, z: -27 }, sw.p, b); aim = lerp3({ x: 0, y: 1.4, z: -9 }, sw.aim, b); hfov = lerp(46 * rad, sw.hfov, b)
    }
  } else if (show.kind === 'lights') {
    if (s >= 1) { const k = ease((t - LIGHTS.start) / 3.4); aim = add3(aim, { x: -92, y: 0, z: 0 }, k); aim = add3(aim, { x: 0, y: -22, z: -50 }, ease((t - LIGHTS.start - 3.6) / 1.4)) } // it sweeps from the first tower to the second, then tilts down to the ground, now lit
  } else if (show.kind === 'hug') {
    if (s >= 1) { const f = show.focus ?? { x: 0, y: 0, z: -12 }; p = hugCam(show, hold); aim = { x: f.x, y: 1.3 + 0.5 * dh, z: f.z } }
  } else if (show.kind === 'walkoff') {
    if (t >= WALKOFF.fly) { const k = walkoffKey(show, t); p = k.p; aim = k.aim; hfov = k.hfov }
  } else if (show.kind === 'bowler') {
    if (t >= BOWLER_IN.fly) { const k = bowlerKey(show, t); p = k.p; aim = k.aim; hfov = k.hfov }
  } else if (show.kind === 'trophy') {
    if (s >= 1) { p = trophyCam(show.seed, hold); aim = { x: trophyCentre().x, y: 1.5 + 0.8 * dh, z: trophyCentre().z } }
  } else if (show.kind === 'cheer' && show.variant !== 'cards') aim = add3(aim, { x: 0, y: 0, z: sideOf(show.seed) * 1.6 }, dh)
  else if (show.kind === 'cheer' || show.kind === 'stands') {
    const a = show.kind === 'stands' ? standAngle(show.seed) : standAngle(show.seed + 7)
    const tan = { x: -Math.sin(a) * ROPE.rx, y: 0, z: Math.cos(a) * ROPE.rz }
    const l = Math.hypot(tan.x, tan.z) || 1
    aim = add3(aim, { x: tan.x / l, y: 0, z: tan.z / l }, (show.kind === 'stands' ? 5 : 2) * (dh - 0.5) * s)
  } else if (show.kind === 'huddle') {
    if (s >= 1) p = huddleCam(show.seed, huddlePhi(hold))
  } else if (show.kind === 'fireworks') aim = add3(aim, { x: 1, y: 0, z: 0 }, 16 * (dh - 0.5) * s)
  return { p, ...lookAt(p, aim), hfov }
}

// ---- the crowd -------------------------------------------------------------------------------------------------------------------

/** The stands drawn person by person (null when the camera has no use for them: the huddle). */
export function crowdAt(show: StadiumShow, t: number): CrowdClose | null {
  const k = 0.45 + 0.55 * clamp01(t / 2.4)
  if (show.kind === 'huddle' || show.kind === 'fireworks' || show.kind === 'flyover' || show.kind === 'bowler' || show.kind === 'lights') return null
  // the fans where the ball comes down
  if (show.kind === 'landing') {
    const a = landingAngle(show)
    return { a0: a - 0.2, a1: a + 0.2, u0: 0.02, u1: 0.98, rows: 13, per: 46, k: 0.8 + 0.2 * clamp01((t - LANDING.land) / 0.6), seed: show.seed, fanReact: show.gone ? undefined : { a: a + (hash01(show.seed * 1.9) - 0.5) * 0.05, u: landingU(show), t0: LANDING.land, caught: !!show.caught } }
  }
  if (show.kind === 'review') {
    const a = screenAngle(show.seed + 5)
    const out = !!show.review?.out
    return { a0: a - 0.2, a1: a + 0.2, u0: 0.03, u1: 0.99, rows: 12, per: 46, k: t >= REVIEW_VERDICT_AT ? 1 : 0.35, seed: show.seed, mood: t >= REVIEW_VERDICT_AT && !out ? 'groan' : undefined }
  }
  if (show.kind === 'rain') return { a0: Math.PI / 2 - 0.5, a1: Math.PI / 2 + 0.5, u0: 0.03, u1: 0.9, rows: 9, per: 44, k: 0.15, seed: show.seed, umbrellas: 0.6 }
  if (show.kind === 'milestone') { const a = balconyAngle(); return t >= MILESTONE.cut ? { a0: a - 0.4, a1: a + 0.4, u0: 0.03, u1: 0.97, rows: 12, per: 60, k: 1, seed: show.seed } : null }
  if (show.kind === 'ceremony') return { a0: Math.PI / 2 - 0.6, a1: Math.PI / 2 + 0.6, u0: 0.03, u1: 0.97, rows: 12, per: 70, k: t >= CEREMONY_BEATS.motm ? 1 : 0.55, seed: show.seed }
  if (show.kind === 'motm') return { a0: Math.PI / 2 - 0.6, a1: Math.PI / 2 + 0.6, u0: 0.03, u1: 0.97, rows: 12, per: 70, k: 1, seed: show.seed }
  if (show.kind === 'lineup') return { a0: Math.PI / 2 - 0.6, a1: Math.PI / 2 + 0.6, u0: 0.03, u1: 0.97, rows: 12, per: 70, k: 0.7, seed: show.seed }
  // the stand behind the dismissed batsman: on its feet if he made a big score, quiet and sorry otherwise
  if (show.kind === 'walkoff') return { a0: -Math.PI / 2 - 0.55, a1: -Math.PI / 2 + 0.55, u0: 0.03, u1: 0.97, rows: 12, per: 70, k: show.walk?.ovation ? 0.9 : 0.25, seed: show.seed }
  // the far stand behind the gate: on their feet as the batsman walks out
  if (show.kind === 'entrance') return { a0: Math.PI / 2 - 0.55, a1: Math.PI / 2 + 0.55, u0: 0.03, u1: 0.97, rows: 12, per: 70, k: 0.55 + 0.45 * clamp01((t - 1) / 2), seed: show.seed }
  // the stands behind the team as they lift the cup
  if (show.kind === 'trophy') { const a = trophyStands(show.seed); return { a0: a - 0.32, a1: a + 0.32, u0: 0.03, u1: 0.97, rows: 12, per: 64, k: 0.7 + 0.3 * clamp01((t - 2) / 2), seed: show.seed } }
  if (show.kind === 'board' || show.kind === 'studio') { const a = screenAngle(show.seed + (show.kind === 'board' ? 5 : 9)); return { a0: a - 0.2, a1: a + 0.2, u0: 0.03, u1: 0.99, rows: 12, per: 46, k: 0.6, seed: show.seed } }
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
export const crowdCheer = (show: StadiumShow, t: number): number => (show.kind === 'hug' || show.kind === 'landing' || show.kind === 'motm' ? 1 : show.kind === 'ceremony' ? (t >= CEREMONY_BEATS.motm ? 1 : 0.5) : show.kind === 'rain' ? 0.1 : show.kind === 'milestone' ? 1 : show.kind === 'walkoff' ? (show.walk?.ovation ? 1 : 0.15) : clamp01(0.5 + t / 3))

/** The giant screen `t` seconds in (null for the other shows). */
export function screenAt(show: StadiumShow, t: number): BigScreen | null {
  if (show.kind === 'review' && show.review) return { a: screenAngle(show.seed + 5), half: 0.085, y0: 10.5, y1: 25, hashtag: '', posts: [], review: show.review, t, colors: show.colors }
  if ((show.kind === 'board' || show.kind === 'studio') && show.board) {
    return { a: screenAngle(show.seed + (show.kind === 'board' ? 5 : 9)), half: 0.085, y0: 10.5, y1: 25, hashtag: '', posts: [], board: show.board, t, colors: show.colors }
  }
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
  const trophy = show.kind === 'trophy'
  return Array.from({ length: trophy ? 6 : BURSTS }, (_, i) => {
    const h = (n: number) => hash01(show.seed * 3.1 + i * n)
    const c: V3 = { x: lerp(-50, 50, h(1.7)), y: lerp(30, 56, h(2.9)), z: lerp(4, 36, h(4.3)) }
    const a = palette[Math.floor(h(5.9) * palette.length)], b = palette[Math.floor(h(6.7) * palette.length)]
    return { t0: (trophy ? 3.6 : 1.0) + i * 0.52 + h(7.9) * 0.2, c, r: lerp(17, 28, h(8.3)), col: [bright(a), bright(b)], from: { x: c.x + (h(9.1) - 0.5) * 12, y: 12, z: c.z + (h(9.7) - 0.5) * 10 } }
  })
}

/** The sparks in the sky `t` seconds into the show, and how bright the flash of the newest burst is (0 to 1). */
export function sparksAt(show: StadiumShow, t: number): { sparks: Spark[]; flash: number } {
  const sparks: Spark[] = []
  if (show.kind !== 'fireworks' && show.kind !== 'trophy') return { sparks, flash: 0 } // (only these two have a sky to light up)
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
export const beatAt = (t: number) => t * Math.PI * 2 * 1.8

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
  const r = 2.3 + n * 0.05 + widen
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
  const huddled: Pose = { ...standing(), hip: { x: 30, y: 91 + 1.2 * Math.sin(b + i) }, lean, head: { dx: 0, dy: 5, tilt: lean }, handL: { x: -27, y: 6 + Math.sin(b + i) * 2 }, handR: { x: 27, y: 6 - Math.sin(b + i) * 2 }, footL: { x: 21, y: 117 }, footR: { x: 39, y: 117 } }
  if (brk <= 0) return { pos, walking, pose: huddled }
  // the break: everybody jumps with both arms up
  const cheer: Pose = { ...standing(), hip: { x: 30, y: 85.3 - 14 * Math.max(0, Math.sin(Math.PI * clamp01((t - huddleBreakAt() - 0.1) / 0.6))) }, handL: { x: -17, y: -26 }, handR: { x: 17, y: -26 }, head: { dx: 0, dy: -1, tilt: 0 } }
  return { pos: { ...pos, y: 0.5 * Math.max(0, Math.sin(Math.PI * clamp01((t - huddleBreakAt() - 0.1) / 0.6))) }, walking: false, pose: mixPose(huddled, cheer, ease(brk)) }
}

// ---- the trophy celebration --------------------------------------------------------------------------------------------------

/** The confetti in the air: cannons at the sides of the ground fire it up in two volleys, and it flutters down. */
export function confettiAt(show: StadiumShow, t: number): Confetti[] {
  if (show.kind !== 'trophy' && show.kind !== 'motm' && show.kind !== 'ceremony') return []
  const out: Confetti[] = []
  const cols: [number, number, number][] = [rgbOf(show.colors[0]), rgbOf(show.colors[1]), [255, 255, 255], [255, 214, 80], [239, 68, 68], [56, 189, 248]]
  const cannons: V3[] = [{ x: -16, y: 0, z: -17 }, { x: 16, y: 0, z: -17 }, { x: -16, y: 0, z: 1 }, { x: 16, y: 0, z: 1 }]
  ;(show.kind === 'ceremony' ? [CEREMONY_BEATS.cheque + 0.3, CEREMONY_BEATS.cheque + 2.6] : [3.2, 5.6]).forEach((tv, vi) => {
    const tau = t - tv
    if (tau < 0) return
    cannons.forEach((c, ci) => {
      for (let i = 0; i < 55; i++) {
        const h = (n: number) => hash01(vi * 131 + ci * 17 + i * n + show.seed)
        const ang = h(1.3) * Math.PI * 2, spread = 0.25 + 0.6 * h(2.1)
        const vx = -Math.sign(c.x) * 11 + Math.cos(ang) * spread * 9, vz = (c.z < -8 ? 3 : -3) + Math.sin(ang) * spread * 9
        const vy = 17 + h(3.7) * 9
        const k = 1 - Math.exp(-1.3 * tau)
        const y = Math.max(0.05, (vy / 1.3) * k - 1.7 * tau) // it goes up, then flutters down
        out.push({ p: { x: c.x + (vx / 1.3) * k + Math.sin(tau * 3 + h(5.1) * 6) * 0.5, y, z: c.z + (vz / 1.3) * k + Math.cos(tau * 2.7 + h(6.3) * 6) * 0.4 }, rot: tau * (3 + h(7.7) * 5) + h(8.9) * 6, rgb: cols[Math.floor(h(9.3) * cols.length)], size: 0.2 })
      }
    })
  })
  return out
}

/** Where person `i` of `n` stands for the picture: the captain (0) in the middle with the cup, the rest in two rings round him. */
export function trophySpot(i: number, n: number): V3 {
  const c = trophyCentre()
  if (i === 0) return c
  const a = ((i - 1) / Math.max(1, n - 1)) * Math.PI * 2 + 0.3
  const r = 3.1 + (i % 2) * 1.1
  return { x: c.x + Math.cos(a) * r, y: 0, z: c.z + Math.sin(a) * r }
}
/** Where they run in from. */
export const trophyStart = (i: number, n: number): V3 => { const c = trophyCentre(), s = trophySpot(i, n); return { x: c.x + (s.x - c.x) * 4.6, y: 0, z: c.z + (s.z - c.z) * 4.6 } }
/** When the captain lifts the cup. */
export const LIFT_AT = 3.0

/** One of the winners `t` seconds in: running in, then jumping with both arms up; the captain holds the cup at his chest, then lifts it over his head. */
export function trophyPerson(t: number, i: number, n: number): { pos: V3; arrived: boolean; pose: Pose | null; lift: number } {
  const to = trophySpot(i, n), from = trophyStart(i, n)
  const w = ease((t - 0.2 - (i % 5) * 0.08) / 2.3)
  const pos = lerp3(from, to, w)
  const lift = i === 0 ? ease((t - LIFT_AT) / 0.7) : 0
  if (w < 1) return { pos, arrived: false, pose: null, lift }
  const b = beatAt(t) * 0.8 + i * 0.9
  if (i === 0) {
    const up = standing()
    const chest: Pose = { ...up, hip: { x: 30, y: 86 }, handL: { x: -9, y: 8 }, handR: { x: 9, y: 8 } }
    const high: Pose = { ...up, hip: { x: 30, y: 85.3 - 2 * Math.max(0, Math.sin(b)) }, lean: 2 * Math.sin(b), handL: { x: -22, y: -28 }, handR: { x: 22, y: -28 } }
    return { pos, arrived: true, pose: mixPose(chest, high, lift), lift }
  }
  const jump = Math.max(0, Math.sin(b))
  const pose: Pose = { ...standing(), hip: { x: 30, y: 85.3 - 11 * jump }, lean: 4 * Math.sin(b), handL: { x: -29, y: -20 + 4 * Math.sin(b + 1) }, handR: { x: 29, y: -20 - 4 * Math.sin(b + 1) }, head: { dx: 0, dy: -1, tilt: 5 * Math.sin(b) }, footL: { x: 24, y: 117 - 3 * jump }, footR: { x: 36, y: 117 - 3 * jump } }
  return { pos: { ...pos, y: 0.35 * jump }, arrived: true, pose, lift }
}
