import { hash01Pub as hash01, ROPE, project, type CamR, type V3 } from './broadcast'

/**
 * The little moments that happen where a four crosses the rope (looks only: nothing here is read by the engine). Picked from the ball number, so a replay of the same
 * ball shows the same one. Some are small and common (the rope ripples, the board glitches, a shockwave from the bat), some are big and rare.
 */
export type FourFxKind = 'ripple' | 'board' | 'shock' | 'mascot' | 'cameraman' | 'popcorn' | 'sprinkler' | 'dog'
/** The ones that need a moment to play out: the clip is held for a little longer after the ball reaches the rope. */
export const FOUR_FX_BIG: FourFxKind[] = ['mascot', 'cameraman', 'popcorn', 'sprinkler', 'dog']

export function fourFxKind(seq: number): FourFxKind | null {
  const h = hash01(seq * 8.1 + 3.3)
  if (h < 0.12) return 'ripple'
  if (h < 0.24) return 'board'
  if (h < 0.30) return 'shock'
  if (h < 0.34) return 'mascot'
  if (h < 0.38) return 'cameraman'
  if (h < 0.42) return 'popcorn'
  if (h < 0.46) return 'sprinkler'
  if (h < 0.49) return 'dog'
  return null
}

export interface FourFxDraw {
  kind: FourFxKind
  /** Where round the rope the ball went (an angle on the ellipse), seconds since it reached the rope, and seconds since the bat met it. */
  a: number
  since: number
  hit: number
  seed: number
  colors: [string, string]
  /** 0 to 3: the style of the shockwave (leaves, a golden shock ring, blue lightning, petals), from the batting team. */
  flavor: number
}

const ring = (a: number, s: number, y = 0): V3 => ({ x: ROPE.cx + Math.cos(a) * ROPE.rx * s, y, z: ROPE.cz + Math.sin(a) * ROPE.rz * s })
const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v))
const ease = (k: number) => { const t = clamp(k); return t * t * (3 - 2 * t) }
const lerp = (a: number, b: number, k: number) => a + (b - a) * k
const rnd = (i: number, seed: number) => hash01(i * 3.7 + seed * 0.131)
/** Pixels in a metre at a point of the picture. */
const mpx = (r: CamR, p: { d: number }) => r.F / p.d

type C = CanvasRenderingContext2D

function ripple(c: C, r: CamR, fx: FourFxDraw) {
  if (fx.since < 0 || fx.since > 2.4) return
  const pts: ({ x: number; y: number } | null)[] = []
  for (let i = -40; i <= 40; i++) {
    const da = i * 0.012, front = fx.since * 0.7
    const wave = Math.abs(da) < front ? Math.sin(Math.abs(da) * 38 - fx.since * 15) * Math.exp(-fx.since * 1.3) * Math.exp(-Math.abs(da) * 2.5) * 0.5 : 0
    const p = project(r, ring(fx.a + da, 1.0, 0.1 + Math.max(0, wave)))
    pts.push(p)
  }
  c.save(); c.strokeStyle = `rgba(255,255,255,${(0.9 * (1 - fx.since / 2.4)).toFixed(2)})`; c.lineCap = 'round'; c.lineWidth = Math.max(2, 5 * (r.F / 600)); c.beginPath()
  let started = false
  for (const p of pts) { if (!p) { started = false; continue } if (!started) { c.moveTo(p.x, p.y); started = true } else c.lineTo(p.x, p.y) }
  c.stroke()
  const mid = project(r, ring(fx.a, 1.0, 0.2))
  if (mid) for (let i = 0; i < 10; i++) { const ang = rnd(i, fx.seed) * Math.PI, d = fx.since * mpx(r, mid) * 2.5 * (0.5 + rnd(i + 3, fx.seed)); c.beginPath(); c.arc(mid.x + Math.cos(ang) * d * (i % 2 ? 1 : -1), mid.y - Math.sin(ang) * d * 0.6, Math.max(1.5, mpx(r, mid) * 0.08), 0, Math.PI * 2); c.fillStyle = `rgba(214,190,140,${(0.7 * (1 - fx.since / 1.4)).toFixed(2)})`; c.fill() }
  c.restore()
}

/** The advertising boards where it crossed: five panels flip over, glitch in neon with a big FOUR, and bits fly off. */
function board(c: C, r: CamR, fx: FourFxDraw) {
  if (fx.since < 0 || fx.since > 2.0) return
  const k = fx.since
  for (let i = -2; i <= 2; i++) {
    const a = fx.a + i * 0.036, flip = Math.cos(Math.PI * clamp(k * 1.6 - Math.abs(i) * 0.12))
    const corners = [[-0.017, 0], [0.017, 0], [0.017, 1], [-0.017, 1]].map(([da, y]) => project(r, ring(a + da, 1.035, 0.1 + (0.5 + (y - 0.5) * flip) * 1.0 + (k < 0.15 ? Math.sin(k * 60) * 0.05 : 0))))
    if (corners.some((p) => !p)) continue
    c.beginPath(); c.moveTo(corners[0]!.x, corners[0]!.y); for (const p of corners.slice(1)) c.lineTo(p!.x, p!.y); c.closePath()
    const flick = Math.sin(k * 40 + i * 3) > 0.2
    c.fillStyle = flip < 0 ? (flick ? '#22d3ee' : '#e879f9') : (flick ? '#fde047' : '#fb7185'); c.globalAlpha = 0.92; c.fill(); c.globalAlpha = 1
    c.strokeStyle = '#0b1020'; c.lineWidth = 2; c.stroke()
    for (let s = 0; s < 4; s++) { const y = lerp(corners[0]!.y, corners[3]!.y, (s + 0.5) / 4); c.beginPath(); c.moveTo(corners[0]!.x, y); c.lineTo(corners[1]!.x, y); c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 1; c.stroke() }
  }
  const mid = project(r, ring(fx.a, 1.035, 0.6))
  if (mid && k > 0.25) {
    const px = Math.max(14, Math.min(60, mpx(r, mid) * 1.4)); c.save(); c.font = `900 ${px}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'
    for (const [dx, col] of [[-3, '#22d3ee'], [3, '#f43f5e'], [0, '#ffffff']] as const) { c.fillStyle = col; c.globalAlpha = 0.85; c.fillText('FOUR!', mid.x + dx + Math.sin(k * 50) * 2, mid.y) }
    c.restore()
  }
  if (mid) for (let i = 0; i < 12; i++) { const vx = (rnd(i, fx.seed) - 0.5) * 8, vy = 3 + rnd(i + 5, fx.seed) * 4, t = k; const p = project(r, ring(fx.a + vx * t * 0.01, 1.035, Math.max(0, 0.6 + vy * t - 4.9 * t * t))); if (p) { c.save(); c.translate(p.x, p.y); c.rotate(t * 8 + i); c.fillStyle = i % 2 ? '#fde047' : '#22d3ee'; const s = mpx(r, p) * 0.12; c.fillRect(-s, -s / 2, s * 2, s); c.restore() } }
}

/** The ground's own shockwave from the bat, in the style of the batting team: leaves, a golden ring, blue lightning or petals. */
function shock(c: C, r: CamR, fx: FourFxDraw) {
  const k = fx.hit
  if (k < 0 || k > 1.5) return
  const centre = { x: 0, y: 0.03, z: -0.9 }
  const R = 1 + 13 * (1 - Math.exp(-k * 3)), fade = 1 - k / 1.5
  const col = ['#86efac', '#fde047', '#7dd3fc', '#f9a8d4'][fx.flavor % 4]
  c.save()
  for (const [rr, lw] of [[R, 5], [R * 0.62, 3]] as const) {
    c.beginPath(); let first = true
    for (let i = 0; i <= 40; i++) { const a = (i / 40) * Math.PI * 2, p = project(r, { x: centre.x + Math.cos(a) * rr, y: 0.03, z: centre.z + Math.sin(a) * rr }); if (!p) continue; if (first) { c.moveTo(p.x, p.y); first = false } else c.lineTo(p.x, p.y) }
    c.strokeStyle = col; c.globalAlpha = 0.85 * fade; c.lineWidth = lw * (r.F / 500); c.stroke()
  }
  // cracks in the ground, jagged lines running out
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + rnd(i, fx.seed) * 0.5, len = R * (0.7 + 0.5 * rnd(i + 4, fx.seed)); c.beginPath(); let first = true
    for (let s = 0; s <= 6; s++) { const d = (s / 6) * len, j = (rnd(i * 7 + s, fx.seed) - 0.5) * 0.9, p = project(r, { x: centre.x + Math.cos(a) * d + Math.sin(a) * j, y: 0.03, z: centre.z + Math.sin(a) * d - Math.cos(a) * j }); if (!p) continue; if (first) { c.moveTo(p.x, p.y); first = false } else c.lineTo(p.x, p.y) }
    c.strokeStyle = 'rgba(15,23,42,0.8)'; c.globalAlpha = fade; c.lineWidth = 2.5 * (r.F / 500); c.stroke()
  }
  // the flavour: leaves spiral up, golden sparks fly, lightning zigzags, petals drift
  for (let i = 0; i < 34; i++) {
    const a = rnd(i, fx.seed) * Math.PI * 2, d = R * (0.3 + 0.8 * rnd(i + 11, fx.seed)), up = k * (1.2 + 3 * rnd(i + 17, fx.seed)), sw = fx.flavor === 0 ? k * 5 : 0
    const p = project(r, { x: centre.x + Math.cos(a + sw) * d, y: 0.1 + up, z: centre.z + Math.sin(a + sw) * d })
    if (!p) continue
    const s = Math.max(2, mpx(r, p) * 0.16); c.globalAlpha = 0.9 * fade; c.fillStyle = col; c.save(); c.translate(p.x, p.y); c.rotate(k * 7 + i)
    if (fx.flavor === 2) { c.strokeStyle = col; c.lineWidth = Math.max(1.5, s * 0.4); c.beginPath(); c.moveTo(-s * 1.5, -s); c.lineTo(0, 0); c.lineTo(-s * 0.6, s * 0.2); c.lineTo(s * 1.5, s); c.stroke() } else if (fx.flavor === 1) { c.fillRect(-s * 0.3, -s * 1.2, s * 0.6, s * 2.4) } else { c.beginPath(); c.ellipse(0, 0, s * 1.1, s * 0.6, 0, 0, Math.PI * 2); c.fill() }
    c.restore()
  }
  c.restore()
}

/** A person-sized thing standing at a spot by the boards: [metres across, metres up] to screen. */
const stand = (r: CamR, a: number, s: number, y = 0): { x: number; y: number; m: number } | null => { const p = project(r, ring(a, s, y)); return p ? { x: p.x, y: p.y, m: mpx(r, p) } : null }

function mascot(c: C, r: CamR, fx: FourFxDraw) {
  const p = stand(r, fx.a + 0.07, 1.06)
  if (!p) return
  const k = Math.max(0, fx.since - 0.15), tumble = ease(k / 1.1), m = p.m
  c.save(); c.translate(p.x + k * m * 0.8, p.y - Math.abs(Math.sin(k * 5)) * m * 0.6 * (1 - tumble * 0.6)); c.rotate(tumble * Math.PI * 2.5)
  c.fillStyle = fx.colors[0]; c.beginPath(); c.ellipse(0, -m * 0.7, m * 0.55, m * 0.7, 0, 0, Math.PI * 2); c.fill()   // the furry body
  c.fillStyle = fx.colors[1]; c.beginPath(); c.ellipse(0, -m * 0.55, m * 0.3, m * 0.4, 0, 0, Math.PI * 2); c.fill()  // the tummy
  c.fillStyle = fx.colors[0]; c.beginPath(); c.arc(0, -m * 1.55, m * 0.55, 0, Math.PI * 2); c.fill()                 // the big head
  for (const sd of [-1, 1]) { c.beginPath(); c.arc(sd * m * 0.4, -m * 2.05, m * 0.2, 0, Math.PI * 2); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(sd * m * 0.2, -m * 1.6, m * 0.17, 0, Math.PI * 2); c.fill(); c.fillStyle = '#0f172a'; c.beginPath(); c.arc(sd * m * 0.2 + (k > 0 ? m * 0.03 : 0), -m * 1.6, m * (k > 0.05 ? 0.05 : 0.08), 0, Math.PI * 2); c.fill(); c.fillStyle = fx.colors[0] }
  c.fillStyle = '#0f172a'; c.beginPath(); c.ellipse(0, -m * 1.35, m * 0.12, m * (k > 0.05 ? 0.14 : 0.07), 0, 0, Math.PI * 2); c.fill()
  c.restore()
  if (k > 0.1 && k < 1.8) for (let i = 0; i < 4; i++) { const a = k * 6 + (i / 4) * Math.PI * 2; c.fillStyle = '#fde047'; c.font = `900 ${Math.max(10, m * 0.4)}px sans-serif`; c.textAlign = 'center'; c.fillText('★', p.x + Math.cos(a) * m * 0.7, p.y - m * 2.4 + Math.sin(a) * m * 0.2) }
}

function cameraman(c: C, r: CamR, fx: FourFxDraw) {
  const p = stand(r, fx.a - 0.06, 1.05)
  if (!p) return
  const k = Math.max(0, fx.since - 0.2), fall = ease(k / 0.5) * (1 - ease((k - 1.3) / 0.6)), m = p.m
  c.save(); c.translate(p.x, p.y); c.rotate(-fall * 1.45)
  c.fillStyle = '#1e293b'; c.fillRect(-m * 0.28, -m * 1.1, m * 0.56, m * 1.1)
  c.fillStyle = '#d9a679'; c.beginPath(); c.arc(0, -m * 1.35, m * 0.26, 0, Math.PI * 2); c.fill()
  c.fillStyle = '#0f172a'; c.fillRect(-m * 0.3, -m * 1.62, m * 0.6, m * 0.12)
  c.fillStyle = '#374151'; c.fillRect(m * 0.1, -m * 1.5, m * 0.7, m * 0.38); c.fillStyle = '#111827'; c.beginPath(); c.arc(m * 0.85, -m * 1.31, m * 0.14, 0, Math.PI * 2); c.fill()
  c.restore()
  if (k > 0.1 && k < 0.5) { c.fillStyle = `rgba(255,255,255,${(0.9 * (1 - (k - 0.1) / 0.4)).toFixed(2)})`; c.beginPath(); c.arc(p.x + m * 0.8, p.y - m * 1.3, m * 1.4, 0, Math.PI * 2); c.fill() }
  if (k > 0.2 && k < 2) { c.font = `900 ${Math.max(10, m * 0.4)}px sans-serif`; c.textAlign = 'center'; c.fillStyle = '#fff'; c.strokeStyle = '#0f172a'; c.lineWidth = 3; c.strokeText('WHOA!', p.x, p.y - m * 2.2); c.fillText('WHOA!', p.x, p.y - m * 2.2) }
}

function popcorn(c: C, r: CamR, fx: FourFxDraw) {
  const p = stand(r, fx.a, 1.2, 2.4)
  if (!p) return
  const k = Math.max(0, fx.since - 0.1), m = p.m
  // a fan in the front row with a bucket
  c.fillStyle = '#7c3aed'; c.fillRect(p.x - m * 0.4, p.y, m * 0.8, m * 0.9); c.fillStyle = '#e0b48e'; c.beginPath(); c.arc(p.x, p.y - m * 0.25, m * 0.32, 0, Math.PI * 2); c.fill()
  c.fillStyle = '#fff'; c.beginPath(); c.arc(p.x - m * 0.12, p.y - m * 0.3, m * 0.06, 0, Math.PI * 2); c.arc(p.x + m * 0.12, p.y - m * 0.3, m * 0.06, 0, Math.PI * 2); c.fill()
  const bucketY = p.y + m * 0.45 - (k > 0 ? Math.min(1, k * 4) * m * 0.3 : 0)
  c.fillStyle = '#dc2626'; c.beginPath(); c.moveTo(p.x - m * 0.28, bucketY); c.lineTo(p.x + m * 0.28, bucketY); c.lineTo(p.x + m * 0.2, bucketY + m * 0.5); c.lineTo(p.x - m * 0.2, bucketY + m * 0.5); c.closePath(); c.fill()
  c.fillStyle = '#fff'; for (let s = -1; s <= 1; s++) c.fillRect(p.x + s * m * 0.1 - m * 0.03, bucketY, m * 0.06, m * 0.5)
  if (k <= 0) { c.fillStyle = '#fef3c7'; for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(p.x - m * 0.2 + i * m * 0.1, bucketY - m * 0.04, m * 0.08, 0, Math.PI * 2); c.fill() } return }
  for (let i = 0; i < 70; i++) {
    const a = -Math.PI * (0.1 + 0.8 * rnd(i, fx.seed)), v = (1.5 + 4 * rnd(i + 31, fx.seed)), x = p.x + Math.cos(a) * v * k * m, y = bucketY + (Math.sin(a) * v * k + 4 * k * k * (1 + rnd(i + 5, fx.seed))) * m
    c.fillStyle = i % 3 ? '#fef9c3' : '#fde68a'; c.beginPath(); c.arc(x, y, Math.max(1.5, m * 0.07 * (0.7 + rnd(i + 9, fx.seed))), 0, Math.PI * 2); c.fill()
  }
  // the ball held up, with a ring round it
  if (k > 0.9) { const bx = p.x + m * 0.55, by = p.y - m * 0.75 - Math.min(1, (k - 0.9) * 2) * m * 0.4; c.fillStyle = '#dc2626'; c.beginPath(); c.arc(bx, by, m * 0.16, 0, Math.PI * 2); c.fill(); c.strokeStyle = `rgba(253,224,71,${(0.5 + 0.5 * Math.sin(k * 12)).toFixed(2)})`; c.lineWidth = 3; c.beginPath(); c.arc(bx, by, m * 0.32, 0, Math.PI * 2); c.stroke() }
}

function sprinkler(c: C, r: CamR, fx: FourFxDraw) {
  const p = stand(r, fx.a, 0.97, 0)
  if (!p) return
  const k = Math.max(0, fx.since - 0.05), m = p.m
  c.fillStyle = '#374151'; c.fillRect(p.x - m * 0.12, p.y - m * 0.1, m * 0.24, m * 0.12)
  if (k <= 0) return
  const rain = ['#ef4444', '#f97316', '#facc15', '#22c55e', '#38bdf8', '#6366f1', '#a855f7']
  const a = Math.min(1, k * 2) * (k > 2 ? 1 - (k - 2) : 1)
  c.save(); c.lineWidth = Math.max(1.2, m * 0.06); c.globalAlpha = 0.3 * clamp(a)
  rain.forEach((col, i) => { c.strokeStyle = col; c.beginPath(); c.arc(p.x + m * 0.4, p.y - m * 0.2, m * (2.4 + i * 0.12), Math.PI * 1.08, Math.PI * 1.92); c.stroke() })
  c.restore()
  for (let j = 0; j < 3; j++) for (let i = 0; i < 24; i++) {
    const ang = -Math.PI * (0.3 + 0.2 * j) + (rnd(i, fx.seed) - 0.5) * 0.3, v = 4.2 + j * 0.5, age = ((k * 2.4 + i / 24 + j * 0.2) % 1) * 1.0
    const x = p.x + Math.cos(ang) * v * age * m * (j === 1 ? 0 : (j - 1)) * 0.6 + (j - 1) * age * m * 1.4, y = p.y - m * 0.1 - (Math.sin(-ang) * v * age - 6 * age * age) * m * 0.8
    c.fillStyle = `rgba(186,230,253,${(0.85 * clamp(a)).toFixed(2)})`; c.beginPath(); c.arc(x, y, Math.max(1.2, m * 0.05), 0, Math.PI * 2); c.fill()
  }
}

function dog(c: C, r: CamR, fx: FourFxDraw) {
  const k = fx.since + 0.7
  if (k < 0 || k > 3.6) return
  // it runs in from the side to the ball at the rope, picks it up and trots off the other way
  const a0 = fx.a + 0.2, a1 = fx.a, a2 = fx.a - 0.22
  const aim = k < 1.4 ? lerp(a0, a1, ease(k / 1.4)) : lerp(a1, a2, ease((k - 1.6) / 1.8))
  const p = stand(r, aim, 1.0, 0)
  if (!p) return
  const dir = k < 1.4 ? -1 : 1, m = p.m * 0.9, step = Math.sin(k * 22) * 0.12, carrying = k > 1.5
  c.save(); c.translate(p.x, p.y); c.scale(dir, 1)
  c.fillStyle = '#92400e'; c.beginPath(); c.ellipse(0, -m * 0.55, m * 0.6, m * 0.3, 0, 0, Math.PI * 2); c.fill()
  c.beginPath(); c.arc(m * 0.58, -m * 0.8, m * 0.26, 0, Math.PI * 2); c.fill(); c.fillStyle = '#78350f'; c.beginPath(); c.ellipse(m * 0.5, -m * 1.0, m * 0.1, m * 0.2, 0.4, 0, Math.PI * 2); c.fill()
  c.fillStyle = '#fff'; c.beginPath(); c.arc(m * 0.66, -m * 0.84, m * 0.06, 0, Math.PI * 2); c.fill(); c.fillStyle = '#0f172a'; c.beginPath(); c.arc(m * 0.68, -m * 0.84, m * 0.03, 0, Math.PI * 2); c.arc(m * 0.82, -m * 0.76, m * 0.05, 0, Math.PI * 2); c.fill()
  c.strokeStyle = '#92400e'; c.lineWidth = Math.max(2, m * 0.1); c.lineCap = 'round'
  for (const [lx, ph] of [[-0.4, 0], [-0.2, 1], [0.3, 0], [0.5, 1]] as const) { c.beginPath(); c.moveTo(m * lx, -m * 0.4); c.lineTo(m * lx + step * m * (ph ? 1 : -1) * 2, 0); c.stroke() }
  c.beginPath(); c.moveTo(-m * 0.58, -m * 0.65); c.quadraticCurveTo(-m * 0.9, -m * 0.95 + Math.sin(k * 25) * m * 0.12, -m * 0.8, -m * 1.1); c.stroke()
  if (carrying) { c.fillStyle = '#dc2626'; c.beginPath(); c.arc(m * 0.9, -m * 0.7, m * 0.13, 0, Math.PI * 2); c.fill() }
  c.restore()
}

/** Draws the moment, if there is one, over the ground (the DOM people are drawn above it). */
export function drawFourFx(ctx: CanvasRenderingContext2D, r: CamR, fx: FourFxDraw) {
  ctx.save()
  switch (fx.kind) {
    case 'ripple': ripple(ctx, r, fx); break
    case 'board': board(ctx, r, fx); break
    case 'shock': shock(ctx, r, fx); break
    case 'mascot': mascot(ctx, r, fx); break
    case 'cameraman': cameraman(ctx, r, fx); break
    case 'popcorn': popcorn(ctx, r, fx); break
    case 'sprinkler': sprinkler(ctx, r, fx); break
    case 'dog': dog(ctx, r, fx); break
  }
  ctx.restore()
}
