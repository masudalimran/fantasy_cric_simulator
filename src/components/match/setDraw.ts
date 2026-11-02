import { ROPE, project, type CamR, type V3 } from './broadcast'
import { shade } from '../../engine/stadium'

/**
 * Things built at the side of the ground for the stadium shows, drawn on the broadcast canvas as solid boxes: the team's dugout with its bench and roof, the raised
 * platform the cheerleaders dance on, the DJ booth with its speakers, and (for a six out of the stadium) the city outside. Pure drawing: nothing here is read by the match.
 */

const hash01 = (n: number) => { const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s) }

export interface Box3 { x0: number; x1: number; y0: number; y1: number; z0: number; z1: number; top: string; side: string; /** A different colour for the faces that look along the pitch (+/-x), or at the camera end (+/-z). */ x?: string; z?: string; /** The face looking at the field (-x for a platform on the +x side) is an LED screen. */ led?: { colors: [string, string]; tick: number; face: 'nx' | 'px' } }

const quad = (ctx: CanvasRenderingContext2D, r: CamR, pts: V3[], fill: string) => {
  const q = pts.map((p) => project(r, p))
  if (q.some((p) => !p)) return null
  ctx.fillStyle = fill
  ctx.beginPath(); ctx.moveTo(q[0]!.x, q[0]!.y); for (let i = 1; i < q.length; i++) ctx.lineTo(q[i]!.x, q[i]!.y); ctx.closePath(); ctx.fill()
  return q as { x: number; y: number; d: number }[]
}

/** A solid axis-aligned box: the faces the camera can see, far to near. */
export function drawBox3(ctx: CanvasRenderingContext2D, r: CamR, b: Box3) {
  const c = r.c.p
  const faces: { key: 'top' | 'nx' | 'px' | 'nz' | 'pz'; pts: V3[]; fill: string; d: number }[] = []
  const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, cy = (b.y0 + b.y1) / 2
  if (c.y > b.y1) faces.push({ key: 'top', pts: [{ x: b.x0, y: b.y1, z: b.z0 }, { x: b.x1, y: b.y1, z: b.z0 }, { x: b.x1, y: b.y1, z: b.z1 }, { x: b.x0, y: b.y1, z: b.z1 }], fill: b.top, d: Math.hypot(c.x - cx, c.y - b.y1, c.z - cz) })
  if (c.x < b.x0) faces.push({ key: 'nx', pts: [{ x: b.x0, y: b.y0, z: b.z0 }, { x: b.x0, y: b.y0, z: b.z1 }, { x: b.x0, y: b.y1, z: b.z1 }, { x: b.x0, y: b.y1, z: b.z0 }], fill: b.x ?? b.side, d: Math.hypot(c.x - b.x0, c.y - cy, c.z - cz) })
  if (c.x > b.x1) faces.push({ key: 'px', pts: [{ x: b.x1, y: b.y0, z: b.z0 }, { x: b.x1, y: b.y0, z: b.z1 }, { x: b.x1, y: b.y1, z: b.z1 }, { x: b.x1, y: b.y1, z: b.z0 }], fill: b.x ?? b.side, d: Math.hypot(c.x - b.x1, c.y - cy, c.z - cz) })
  if (c.z < b.z0) faces.push({ key: 'nz', pts: [{ x: b.x0, y: b.y0, z: b.z0 }, { x: b.x1, y: b.y0, z: b.z0 }, { x: b.x1, y: b.y1, z: b.z0 }, { x: b.x0, y: b.y1, z: b.z0 }], fill: b.z ?? b.side, d: Math.hypot(c.x - cx, c.y - cy, c.z - b.z0) })
  if (c.z > b.z1) faces.push({ key: 'pz', pts: [{ x: b.x0, y: b.y0, z: b.z1 }, { x: b.x1, y: b.y0, z: b.z1 }, { x: b.x1, y: b.y1, z: b.z1 }, { x: b.x0, y: b.y1, z: b.z1 }], fill: b.z ?? b.side, d: Math.hypot(c.x - cx, c.y - cy, c.z - b.z1) })
  faces.sort((p, q) => q.d - p.d)
  for (const f of faces) {
    const q = quad(ctx, r, f.pts, f.fill)
    // an LED screen on the face that looks at the field: bands of the team's colours chasing along it
    if (q && b.led && f.key === b.led.face) {
      ctx.save()
      ctx.beginPath(); ctx.moveTo(q[0].x, q[0].y); for (let i = 1; i < q.length; i++) ctx.lineTo(q[i].x, q[i].y); ctx.closePath(); ctx.clip()
      const n = 12
      for (let i = 0; i < n; i++) {
        const k0 = i / n, k1 = (i + 1) / n
        const u = (Math.sin(b.led.tick * 5 + i * 0.9) + 1) / 2
        const a = { x: q[0].x + (q[1].x - q[0].x) * k0, y: q[0].y + (q[1].y - q[0].y) * k0 }, bb = { x: q[0].x + (q[1].x - q[0].x) * k1, y: q[0].y + (q[1].y - q[0].y) * k1 }
        const a2 = { x: q[3].x + (q[2].x - q[3].x) * k0, y: q[3].y + (q[2].y - q[3].y) * k0 }, bb2 = { x: q[3].x + (q[2].x - q[3].x) * k1, y: q[3].y + (q[2].y - q[3].y) * k1 }
        ctx.fillStyle = u > 0.5 ? b.led.colors[0] : b.led.colors[1]; ctx.globalAlpha = 0.55 + 0.45 * u
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(bb.x, bb.y); ctx.lineTo(bb2.x, bb2.y); ctx.lineTo(a2.x, a2.y); ctx.closePath(); ctx.fill()
      }
      ctx.restore(); ctx.globalAlpha = 1
    }
  }
}

/** A point on the ring of the ground. */
export const ringAt = (a: number, s: number): V3 => ({ x: ROPE.cx + Math.cos(a) * ROPE.rx * s, y: 0, z: ROPE.cz + Math.sin(a) * ROPE.rz * s })

// ---- the dugout ------------------------------------------------------------------------------------------------------------------

/** Where the dugout stands: on the ground behind the bowler's end, just inside the rope. */
export const DUGOUT_C: V3 = ringAt(-Math.PI / 2, 0.955)
export const DUGOUT = { half: 5.8, depth: 3.4, h: 2.7, bench: 0.46 }

/** The team's dugout: a concrete floor, a back wall, two side walls, a long bench, and a roof with a stripe in the team's colours, open at the front towards the field. */
export function drawDugout(ctx: CanvasRenderingContext2D, r: CamR, colors: [string, string]) {
  const C = DUGOUT_C, { half, depth, h, bench } = DUGOUT
  const zb = C.z - depth / 2, zf = C.z + depth / 2
  drawBox3(ctx, r, { x0: -half - 0.4, x1: half + 0.4, y0: 0, y1: 0.08, z0: zb - 0.2, z1: zf + 0.5, top: '#6b7280', side: '#4b5563' })
  drawBox3(ctx, r, { x0: -half, x1: half, y0: 0.08, y1: h, z0: zb - 0.25, z1: zb, top: '#0f172a', side: '#16233b', z: '#1b2d4d' })
  for (const sx of [-1, 1]) drawBox3(ctx, r, { x0: sx > 0 ? half - 0.2 : -half, x1: sx > 0 ? half : -half + 0.2, y0: 0.08, y1: h, z0: zb, z1: zf, top: '#1e293b', side: '#1e293b', x: '#223350', z: '#223350' })
  drawBox3(ctx, r, { x0: -half + 0.5, x1: half - 0.5, y0: 0.08, y1: bench, z0: zb + 0.4, z1: zb + 1.0, top: shade(colors[1], 0.1), side: shade(colors[1], -0.3), z: shade(colors[1], -0.2) })
  // the roof, with a stripe in the team's colour along its front edge and a lighter one under it
  drawBox3(ctx, r, { x0: -half - 0.3, x1: half + 0.3, y0: h, y1: h + 0.16, z0: zb - 0.3, z1: zf + 0.7, top: '#334155', side: '#1e293b', z: colors[0] })
  drawBox3(ctx, r, { x0: -half - 0.3, x1: half + 0.3, y0: h - 0.18, y1: h, z0: zf + 0.55, z1: zf + 0.7, top: colors[1], side: colors[1], z: colors[1] })
}

/** Where the `i`th of `n` sits on the bench, and (as `stand` goes 0 to 1) where he steps up to, in front of it. */
export function benchSpot(i: number, n: number, stand = 0): V3 {
  const C = DUGOUT_C
  const span = (DUGOUT.half - 1.2) * 2
  const x = n <= 1 ? 0 : -span / 2 + (span * i) / (n - 1)
  const zSit = C.z - DUGOUT.depth / 2 + 0.7
  return { x, y: DUGOUT.bench * (1 - stand), z: zSit + 1.0 * stand }
}

// ---- the cheerleaders' stand and the DJ ------------------------------------------------------------------------------------

export const PLATFORM = { h: 1.0, long: 6.4, deep: 2.0 }

/** The raised platform the cheerleaders dance on (long along the boundary, with an LED screen on the face that looks at the field and a few steps at one end). `side` is +1 for the right of the picture's ground (+x), -1 for the left. */
export function drawPlatform(ctx: CanvasRenderingContext2D, r: CamR, centre: V3, side: 1 | -1, colors: [string, string], tick: number) {
  const { h, long, deep } = PLATFORM
  const x0 = centre.x - deep, x1 = centre.x + deep
  drawBox3(ctx, r, { x0, x1, y0: 0, y1: h, z0: centre.z - long, z1: centre.z + long, top: '#475569', side: '#1e293b', x: '#0f172a', z: '#1e293b', led: { colors, tick, face: side > 0 ? 'nx' : 'px' } })
  // a lighter rim along the top edge
  drawBox3(ctx, r, { x0: x0 - 0.05, x1: x1 + 0.05, y0: h, y1: h + 0.06, z0: centre.z - long - 0.05, z1: centre.z + long + 0.05, top: shade(colors[0], 0.3), side: shade(colors[0], 0.1) })
  // the steps at the end towards the camera
  for (let k = 0; k < 3; k++) drawBox3(ctx, r, { x0: side > 0 ? x0 - 0.9 + 0.3 * k : x1 - 0.3 * k, x1: side > 0 ? x0 - 0.3 * k : x1 + 0.9 - 0.3 * k, y0: 0, y1: 0.3 * (k + 1), z0: centre.z + long - 1.0, z1: centre.z + long, top: '#64748b', side: '#334155' })
}

export const DJ = { long: 3.2, deep: 1.7, h: 1.0 }
/** The DJ's booth: its own raised box, sectioned off with a rail, a table, a speaker stack at each end and an arch of coloured lights over the table. */
export function drawDJBooth(ctx: CanvasRenderingContext2D, r: CamR, centre: V3, side: 1 | -1, colors: [string, string], tick: number) {
  const { long, deep, h } = DJ
  const x0 = centre.x - deep, x1 = centre.x + deep, z0 = centre.z - long, z1 = centre.z + long
  drawBox3(ctx, r, { x0, x1, y0: 0, y1: h, z0, z1, top: '#374151', side: '#111827', x: '#0b1020', z: '#111827' })
  // the rail round the front of it (the side that faces the field)
  const rx = side > 0 ? x0 + 0.1 : x1 - 0.1
  drawBox3(ctx, r, { x0: rx - 0.04, x1: rx + 0.04, y0: h, y1: h + 0.9, z0, z1: z0 + 0.08, top: '#9ca3af', side: '#9ca3af' })
  drawBox3(ctx, r, { x0: rx - 0.04, x1: rx + 0.04, y0: h, y1: h + 0.9, z0: z1 - 0.08, z1, top: '#9ca3af', side: '#9ca3af' })
  drawBox3(ctx, r, { x0: rx - 0.04, x1: rx + 0.04, y0: h + 0.85, y1: h + 0.92, z0, z1, top: '#d1d5db', side: '#d1d5db' })
  // the table with the decks
  drawBox3(ctx, r, { x0: centre.x - 0.6, x1: centre.x + 0.6, y0: h, y1: h + 0.95, z0: centre.z - 1.2, z1: centre.z + 1.2, top: '#1f2937', side: '#0b1020', x: '#111827' })
  // a speaker stack at each end, each with a cone that pulses to the beat
  for (const sz of [z0 + 0.55, z1 - 0.55]) {
    drawBox3(ctx, r, { x0: centre.x - 0.5, x1: centre.x + 0.5, y0: h, y1: h + 1.9, z0: sz - 0.45, z1: sz + 0.45, top: '#111827', side: '#0f172a', x: '#1f2937' })
    const cone = project(r, { x: side > 0 ? centre.x - 0.52 : centre.x + 0.52, y: h + 0.8, z: sz })
    if (cone) { const rad = Math.max(2, (r.F * 0.32) / cone.d) * (1 + 0.12 * Math.sin(tick * 11)); ctx.fillStyle = '#030712'; ctx.beginPath(); ctx.arc(cone.x, cone.y, rad, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#6b7280'; ctx.lineWidth = Math.max(1, rad * 0.14); ctx.stroke() }
  }
  // the arch of lights over the table
  for (const sz of [centre.z - 1.5, centre.z + 1.5]) drawBox3(ctx, r, { x0: centre.x - 0.06, x1: centre.x + 0.06, y0: h, y1: h + 2.8, z0: sz - 0.06, z1: sz + 0.06, top: '#9ca3af', side: '#6b7280' })
  drawBox3(ctx, r, { x0: centre.x - 0.06, x1: centre.x + 0.06, y0: h + 2.8, y1: h + 2.9, z0: centre.z - 1.56, z1: centre.z + 1.56, top: '#9ca3af', side: '#6b7280' })
  for (let i = 0; i < 6; i++) {
    const p = project(r, { x: centre.x + (side > 0 ? -0.2 : 0.2), y: h + 2.72, z: centre.z - 1.3 + i * 0.52 })
    if (!p) continue
    const on = (Math.sin(tick * 6 + i * 1.7) + 1) / 2
    const rad = Math.max(2, (r.F * 0.2) / p.d)
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad * 3)
    const col = i % 2 ? colors[0] : colors[1]
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, col); g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.globalAlpha = 0.35 + 0.65 * on; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, rad * 3, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1
  }
}

// ---- the city outside the stadium (for a six out of the ground) -----------------------------------------------------------------

export interface OutsideDraw {
  seed: number
  /** Where the ball comes down outside, and what it does there. */
  landing: V3
  outcome: 'car' | 'river' | 'blimp'
  /** Seconds since the ball came down (negative before it does). */
  since: number
  tick: number
}

/** The ground and buildings beyond the stands: a dark plain with a road ring, a river on one side, blocks of buildings with lit windows, and the thing the ball lands on. */
export function drawOutside(ctx: CanvasRenderingContext2D, r: CamR, o: OutsideDraw) {
  // the plain, far to near: a huge dark quad on the ground
  quad(ctx, r, [{ x: -900, y: -0.2, z: -900 }, { x: 900, y: -0.2, z: -900 }, { x: 900, y: -0.2, z: 900 }, { x: -900, y: -0.2, z: 900 }], '#0b1411')
  // the ring road round the stadium, with lamps and cars driving round it
  const ringPts = (s: number, y = 0): V3[] => Array.from({ length: 72 }, (_, i) => { const a = (i / 72) * Math.PI * 2; return { x: ROPE.cx + Math.cos(a) * ROPE.rx * s, y, z: ROPE.cz + Math.sin(a) * ROPE.rz * s } })
  ctx.save()
  const outer = ringPts(1.62).map((p) => project(r, p)), inner = ringPts(1.52).map((p) => project(r, p))
  ctx.fillStyle = '#273244'
  for (let i = 0; i < 72; i++) { const a = inner[i], b = inner[(i + 1) % 72], c = outer[(i + 1) % 72], d = outer[i]; if (!a || !b || !c || !d) continue; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath(); ctx.fill() }
  ctx.restore()
  for (let k = 0; k < 14; k++) {
    const a = ((k / 14) + o.tick * 0.012 * (k % 2 ? 1 : -1)) * Math.PI * 2, s = 1.55 + (k % 2) * 0.05
    const p = project(r, { x: ROPE.cx + Math.cos(a) * ROPE.rx * s, y: 0.7, z: ROPE.cz + Math.sin(a) * ROPE.rz * s })
    if (!p) continue
    ctx.fillStyle = k % 2 ? 'rgba(254,240,138,0.9)' : 'rgba(248,113,113,0.9)'; const sz = Math.max(1.5, (r.F * 0.5) / p.d); ctx.fillRect(p.x - sz, p.y - sz / 2, sz * 2, sz)
  }
  // a river on one side
  const rv = ((o.seed % 2) ? 1 : -1)
  quad(ctx, r, [{ x: rv * 150, y: -0.1, z: -500 }, { x: rv * 220, y: -0.1, z: -500 }, { x: rv * 220, y: -0.1, z: 500 }, { x: rv * 150, y: -0.1, z: 500 }], '#0c2a4d')
  // buildings: blocks of different heights, with lit windows, far to near
  const blocks: { x: number; z: number; w: number; d: number; h: number; i: number }[] = []
  for (let i = 0; i < 90; i++) {
    const a = (i / 90) * Math.PI * 2 + hash01(o.seed + i) * 0.03, s = 1.9 + hash01(o.seed * 3 + i * 1.3) * 1.3
    const x = ROPE.cx + Math.cos(a) * ROPE.rx * s, z = ROPE.cz + Math.sin(a) * ROPE.rz * s
    if (Math.abs(x - rv * 185) < 45) continue // (not in the river)
    blocks.push({ x, z, w: 9 + hash01(i * 2.1) * 14, d: 9 + hash01(i * 4.4) * 12, h: 14 + hash01(i * 5.3 + o.seed) ** 1.6 * 70, i })
  }
  blocks.sort((p, q) => Math.hypot(q.x - r.c.p.x, q.z - r.c.p.z) - Math.hypot(p.x - r.c.p.x, p.z - r.c.p.z))
  for (const b of blocks) {
    const base = '#111c2e', roof = '#1b2a42'
    drawBox3(ctx, r, { x0: b.x - b.w / 2, x1: b.x + b.w / 2, y0: 0, y1: b.h, z0: b.z - b.d / 2, z1: b.z + b.d / 2, top: roof, side: base, x: '#0e1828', z: '#14213a' })
    // the windows on the face that looks at the stadium: a grid of small lit squares
    const faceZ = b.z > ROPE.cz ? b.z - b.d / 2 : b.z + b.d / 2
    const cols = Math.max(2, Math.floor(b.w / 3)), rows = Math.max(2, Math.floor(b.h / 4))
    for (let rr = 0; rr < rows; rr++) for (let cc = 0; cc < cols; cc++) {
      if (hash01(b.i * 31 + rr * 7 + cc) < 0.45) continue
      const p = project(r, { x: b.x - b.w / 2 + (cc + 0.5) * (b.w / cols), y: 2 + rr * 4, z: faceZ })
      if (!p) continue
      const sz = Math.max(1, (r.F * 1.2) / p.d)
      if (sz < 1.2) continue
      ctx.fillStyle = hash01(b.i * 5 + rr * 3 + cc) < 0.2 ? '#fde68a' : '#fef3c7'; ctx.globalAlpha = 0.8; ctx.fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz); ctx.globalAlpha = 1
    }
  }
  // what the ball lands on
  const L = o.landing
  if (o.outcome === 'car') {
    drawBox3(ctx, r, { x0: L.x - 2.3, x1: L.x + 2.3, y0: 0.2, y1: 1.0, z0: L.z - 0.95, z1: L.z + 0.95, top: '#b91c1c', side: '#7f1d1d' })
    drawBox3(ctx, r, { x0: L.x - 1.2, x1: L.x + 1.1, y0: 1.0, y1: 1.6, z0: L.z - 0.85, z1: L.z + 0.85, top: '#450a0a', side: '#1e293b' })
    // the alarm: the lights flash orange for a few seconds after the ball lands on it
    if (o.since > 0 && o.since < 4) {
      const on = Math.sin(o.since * 14) > 0
      for (const sx of [-2.3, 2.3]) { const p = project(r, { x: L.x + sx, y: 0.6, z: L.z }); if (p && on) { const rad = Math.max(3, (r.F * 1.6) / p.d); const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad); g.addColorStop(0, 'rgba(251,146,60,0.95)'); g.addColorStop(1, 'rgba(251,146,60,0)'); ctx.fillStyle = g; ctx.fillRect(p.x - rad, p.y - rad, rad * 2, rad * 2) } }
    }
  } else if (o.outcome === 'river') {
    // the splash: rings spreading on the water and drops thrown up
    if (o.since > 0) {
      for (let k = 0; k < 3; k++) {
        const t = o.since - k * 0.35
        if (t < 0 || t > 2.4) continue
        const pc = project(r, { x: L.x, y: 0, z: L.z })
        if (!pc) continue
        const rad = Math.max(3, (r.F * (1.2 + t * 4)) / pc.d)
        ctx.strokeStyle = `rgba(186,230,253,${0.8 * (1 - t / 2.4)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(pc.x, pc.y, rad, rad * 0.32, 0, 0, Math.PI * 2); ctx.stroke()
      }
      for (let k = 0; k < 14; k++) {
        const t = o.since, a = (k / 14) * Math.PI * 2
        const p = project(r, { x: L.x + Math.cos(a) * 2.2 * Math.min(1, t * 2), y: Math.max(0, 7 * t - 9.8 * t * t / 2 * (0.6 + (k % 3) * 0.1)), z: L.z + Math.sin(a) * 2.2 * Math.min(1, t * 2) })
        if (p && t < 1.6) { ctx.fillStyle = 'rgba(224,242,254,0.9)'; const sz = Math.max(1.2, (r.F * 0.3) / p.d); ctx.beginPath(); ctx.arc(p.x, p.y, sz, 0, Math.PI * 2); ctx.fill() }
      }
    }
  } else {
    // a blimp hanging over the landing spot, lit, with an advert along its side
    const b0 = { x: L.x, y: 48, z: L.z }
    const p = project(r, b0)
    if (p) {
      const w = Math.max(14, (r.F * 22) / p.d), h = w * 0.34
      ctx.save(); ctx.translate(p.x, p.y)
      if (o.since > 0 && o.since < 1.4) ctx.rotate(Math.sin(o.since * 12) * 0.05 * (1 - o.since / 1.4)) // it wobbles where the ball hit it
      const g = ctx.createLinearGradient(0, -h, 0, h); g.addColorStop(0, '#e2e8f0'); g.addColorStop(1, '#64748b')
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, w, h, 0, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(-w, 0); ctx.lineTo(-w * 1.25, -h * 0.9); ctx.lineTo(-w * 0.9, 0); ctx.closePath(); ctx.fill()
      ctx.fillStyle = '#0f172a'; ctx.font = `900 ${Math.max(8, h * 0.8)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('SIX!', 0, 0)
      ctx.restore()
    }
  }
}

// ---- up in space (for a six of 180 metres or more) ------------------------------------------------------------------------------

export interface SpaceDraw {
  kind: 'satellite' | 'rocket'
  /** Where it is, the seconds since the ball hit it (negative before), how dark the sky is (0 to 1) and how far it has turned. */
  pos: V3
  hit: number
  dark: number
  spin: number
  tick: number
}

/** The sky going black with stars as the ball climbs, and the satellite or the rocket it hits. Drawn over the sky only (the ground is painted after it). */
export function drawSpace(ctx: CanvasRenderingContext2D, r: CamR, o: SpaceDraw) {
  const { width: W, height: H } = ctx.canvas
  if (o.dark > 0.01) {
    ctx.fillStyle = `rgba(2,4,12,${(o.dark * 0.98).toFixed(3)})`
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = '#ffffff'
    for (let i = 0; i < 150; i++) {
      const hx = Math.sin(i * 91.7 + 3.1) * 43758.5453, hy = Math.sin(i * 12.9 + 7.7) * 24634.6345
      const x = (hx - Math.floor(hx)) * W, y = (hy - Math.floor(hy)) * H
      ctx.globalAlpha = o.dark * (0.35 + 0.65 * Math.abs(Math.sin(o.tick * 1.7 + i)))
      const sz = 0.6 + ((i * 7) % 5) * 0.35
      ctx.fillRect(x, y, sz, sz)
    }
    ctx.globalAlpha = 1
  }
  const pt = project(r, o.pos)
  if (!pt) return
  const m = r.F / pt.d // pixels in a metre at the object
  ctx.save()
  ctx.translate(pt.x, pt.y)
  const struck = o.hit > 0
  if (o.kind === 'satellite') {
    ctx.rotate(0.35 + Math.sin(o.spin * 0.5) * 0.2 + (struck ? o.spin : 0))
    const panel = (side: 1 | -1, off: number) => {
      ctx.save(); ctx.translate(side * (2.6 + off) * m, off * m * (struck ? 0.6 : 0)); if (struck && off > 0) ctx.rotate(side * o.spin * 1.3)
      ctx.fillStyle = '#1d4ed8'; ctx.strokeStyle = '#93c5fd'; ctx.lineWidth = Math.max(0.6, m * 0.08)
      ctx.fillRect(-2.2 * m, -0.95 * m, 4.4 * m, 1.9 * m); ctx.strokeRect(-2.2 * m, -0.95 * m, 4.4 * m, 1.9 * m)
      for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo((-2.2 + k * 1.1) * m, -0.95 * m); ctx.lineTo((-2.2 + k * 1.1) * m, 0.95 * m); ctx.stroke() }
      ctx.restore()
    }
    panel(-1, 0); panel(1, struck ? Math.min(30, o.hit * 14) : 0)
    ctx.fillStyle = '#e2e8f0'; ctx.strokeStyle = '#64748b'; ctx.lineWidth = Math.max(0.6, m * 0.1)
    ctx.fillRect(-1.3 * m, -1.3 * m, 2.6 * m, 2.6 * m); ctx.strokeRect(-1.3 * m, -1.3 * m, 2.6 * m, 2.6 * m)
    ctx.fillStyle = '#fbbf24'; ctx.fillRect(-1.3 * m, -0.4 * m, 2.6 * m, 0.8 * m)
    ctx.beginPath(); ctx.arc(0, -1.9 * m, 0.9 * m, Math.PI, 0); ctx.fillStyle = '#cbd5e1'; ctx.fill()
    ctx.strokeStyle = '#cbd5e1'; ctx.beginPath(); ctx.moveTo(0, -1.3 * m); ctx.lineTo(0, -1.9 * m); ctx.stroke()
  } else {
    ctx.rotate(struck ? 0.5 * Math.sin(o.spin * 3) + o.hit * 0.25 : 0)
    // the exhaust flame, until it is hit
    if (!struck) {
      const f = 3.5 + Math.sin(o.tick * 40) * 0.8
      const g = ctx.createLinearGradient(0, 4.5 * m, 0, (4.5 + f) * m); g.addColorStop(0, '#fff7ae'); g.addColorStop(0.5, '#fb923c'); g.addColorStop(1, 'rgba(239,68,68,0)')
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-0.9 * m, 4.5 * m); ctx.lineTo(0, (4.5 + f) * m); ctx.lineTo(0.9 * m, 4.5 * m); ctx.closePath(); ctx.fill()
    }
    ctx.fillStyle = '#f8fafc'; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = Math.max(0.6, m * 0.1)
    ctx.beginPath(); ctx.moveTo(-1.1 * m, 4.5 * m); ctx.lineTo(-1.1 * m, -2.5 * m); ctx.quadraticCurveTo(0, -7 * m, 1.1 * m, -2.5 * m); ctx.lineTo(1.1 * m, 4.5 * m); ctx.closePath(); ctx.fill(); ctx.stroke()
    ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(-1.1 * m, -2.5 * m); ctx.quadraticCurveTo(0, -7 * m, 1.1 * m, -2.5 * m); ctx.closePath(); ctx.fill()
    ctx.fillStyle = '#ef4444'; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sd * 1.1 * m, 1.5 * m); ctx.lineTo(sd * 2.4 * m, 5 * m); ctx.lineTo(sd * 1.1 * m, 4.5 * m); ctx.closePath(); ctx.fill() }
    ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.arc(0, -0.6 * m, 0.7 * m, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#475569'; ctx.stroke()
    // smoke from the hit
    if (struck) for (let i = 0; i < 6; i++) { ctx.globalAlpha = Math.max(0, 0.5 - o.hit * 0.15 - i * 0.05); ctx.fillStyle = '#9ca3af'; ctx.beginPath(); ctx.arc((Math.sin(i * 2.3) * 1.2) * m, (4 + i * 1.5 + o.hit * 3) * m, (0.9 + i * 0.35 + o.hit * 0.4) * m, 0, Math.PI * 2); ctx.fill() }
    ctx.globalAlpha = 1
  }
  ctx.restore()
  // the blast where the ball hit it: a white flash, a fireball and sparks flying out
  if (o.hit > 0 && o.hit < 1.6) {
    const k = o.hit / 1.6
    ctx.save(); ctx.translate(pt.x, pt.y)
    const rad = (2 + k * 9) * m
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rad); g.addColorStop(0, `rgba(255,255,255,${(1 - k).toFixed(2)})`); g.addColorStop(0.4, `rgba(251,146,60,${(0.8 * (1 - k)).toFixed(2)})`); g.addColorStop(1, 'rgba(239,68,68,0)')
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rad, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = `rgba(254,240,138,${(1 - k).toFixed(2)})`; ctx.lineWidth = Math.max(1, m * 0.15); ctx.lineCap = 'round'
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2 + i, l0 = (1.5 + k * 8 + (i % 3)) * m, l1 = l0 + (1.2 + (i % 4)) * m * (1 - k); ctx.beginPath(); ctx.moveTo(Math.cos(a) * l0, Math.sin(a) * l0); ctx.lineTo(Math.cos(a) * l1, Math.sin(a) * l1); ctx.stroke() }
    ctx.restore()
  }
}
