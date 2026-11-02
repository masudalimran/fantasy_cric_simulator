/**
 * The cut-aways for a six that leaves the stadium: where the ball ended up, drawn as a cartoon scene (looks only, nothing here touches a result).
 * Each is drawn full-frame on the canvas, `tau` seconds after the ball came down, and is deterministic from the seed.
 */
export type SixSceneKind = 'river' | 'glass' | 'plane' | 'wedding' | 'fireworks' | 'bell' | 'pizza'
export const SIX_SCENES: SixSceneKind[] = ['river', 'glass', 'plane', 'wedding', 'fireworks', 'bell', 'pizza']
export const isSixScene = (o: string | undefined): o is SixSceneKind => !!o && (SIX_SCENES as string[]).includes(o)

type C = CanvasRenderingContext2D
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const ease = (k: number) => { const t = clamp(k); return t * t * (3 - 2 * t) }
const lerp = (a: number, b: number, k: number) => a + (b - a) * k
const fract = (v: number) => v - Math.floor(v)
const rnd = (i: number, seed: number) => fract(Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453)

const circle = (c: C, x: number, y: number, r: number, fill: string, stroke?: string, lw = 1) => { c.beginPath(); c.arc(x, y, Math.max(0.1, r), 0, Math.PI * 2); c.fillStyle = fill; c.fill(); if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke() } }
const ellipse = (c: C, x: number, y: number, rx: number, ry: number, fill: string, rot = 0) => { c.beginPath(); c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2); c.fillStyle = fill; c.fill() }
const rect = (c: C, x: number, y: number, w: number, h: number, fill: string | CanvasGradient, r = 0) => { c.beginPath(); if (r > 0) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); c.fillStyle = fill; c.fill() }
const line = (c: C, x1: number, y1: number, x2: number, y2: number, col: string, lw: number) => { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.stroke() }
const ballAt = (c: C, x: number, y: number, r: number) => { circle(c, x, y, r, '#dc2626', '#7f1d1d', Math.max(1, r * 0.12)); c.beginPath(); c.arc(x, y, r * 0.72, -0.6, 0.9); c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = Math.max(0.8, r * 0.12); c.stroke() }
const text = (c: C, s: string, x: number, y: number, size: number, fill: string, stroke = '#0b1020') => { c.font = `900 ${Math.round(size)}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = Math.max(2, size / 7); c.strokeStyle = stroke; c.strokeText(s, x, y); c.fillStyle = fill; c.fillText(s, x, y) }
const face = (c: C, x: number, y: number, r: number, skin: string, mood: 'calm' | 'shock' | 'happy', look = 0) => {
  circle(c, x, y, r, skin, '#0f172a', Math.max(1, r * 0.08))
  const ey = y - r * 0.12, ex = r * 0.38
  if (mood === 'shock') { circle(c, x - ex, ey, r * 0.2, '#fff', '#0f172a', 1); circle(c, x + ex, ey, r * 0.2, '#fff', '#0f172a', 1); circle(c, x - ex + look * r * 0.05, ey, r * 0.08, '#0f172a'); circle(c, x + ex + look * r * 0.05, ey, r * 0.08, '#0f172a'); ellipse(c, x, y + r * 0.5, r * 0.18, r * 0.26, '#7f1d1d') }
  else { circle(c, x - ex, ey, r * 0.09, '#0f172a'); circle(c, x + ex, ey, r * 0.09, '#0f172a'); c.beginPath(); c.arc(x, y + r * (mood === 'happy' ? 0.2 : 0.38), r * 0.3, mood === 'happy' ? 0.1 : Math.PI + 0.3, mood === 'happy' ? Math.PI - 0.1 : -0.3); c.strokeStyle = '#7f1d1d'; c.lineWidth = Math.max(1, r * 0.09); c.stroke() }
}
const SKINS = ['#f1c9a5', '#d9a679', '#a86d44', '#7d4f2c', '#fadcc0']

// ---- the river: the ball goes under and sinks past the fish ----------------------------------------------------------------------------------

function river(c: C, W: number, H: number, tau: number, tick: number, seed: number) {
  const dive = ease((tau - 0.7) / 0.7) // the picture plunges under the surface
  const surfaceY = lerp(H * 0.45, -H * 0.1, dive)
  // above the water: the night sky and the far bank
  const sky = c.createLinearGradient(0, 0, 0, H * 0.5); sky.addColorStop(0, '#0b1020'); sky.addColorStop(1, '#27406b')
  rect(c, 0, 0, W, H, sky)
  for (let i = 0; i < 14; i++) { const bx = (i / 14) * W, bh = H * (0.08 + 0.12 * rnd(i, seed)); rect(c, bx, H * 0.45 - bh - dive * H * 0.4, W / 14 + 1, bh, '#101a30'); for (let k = 0; k < 3; k++) rect(c, bx + 4, H * 0.45 - bh + 8 + k * 14 - dive * H * 0.4, 4, 5, rnd(i * 3 + k, seed) > 0.5 ? '#fde68a' : '#101a30') }
  // below it: the water, dark teal going to deep blue
  const water = c.createLinearGradient(0, surfaceY, 0, H); water.addColorStop(0, '#22b8cf'); water.addColorStop(0.35, '#0e7490'); water.addColorStop(1, '#042f4a')
  rect(c, 0, surfaceY, W, H - surfaceY + 2, water)
  // the splash and the rings on the surface
  if (tau < 1.2) {
    const k = tau / 1.2
    for (let i = 0; i < 3; i++) { const rr = (k * 0.5 + i * 0.12) * W * 0.5; c.beginPath(); c.ellipse(W / 2, surfaceY + 4, rr, rr * 0.22, 0, 0, Math.PI * 2); c.strokeStyle = `rgba(255,255,255,${(0.7 * (1 - k)).toFixed(2)})`; c.lineWidth = 3; c.stroke() }
    for (let i = 0; i < 26; i++) { const a = rnd(i, seed) * 0.9 + 0.1, vx = (rnd(i + 40, seed) - 0.5) * W * 0.6, tt = tau * 1.4; const px = W / 2 + vx * tt, py = surfaceY - (a * H * 0.5 * tt - 0.5 * H * 0.9 * tt * tt); circle(c, px, py, 3 + 3 * rnd(i + 9, seed), 'rgba(230,250,255,0.85)') }
  }
  if (dive > 0) {
    // light rays from the surface, swaying
    for (let i = 0; i < 6; i++) { const x0 = W * (0.1 + i * 0.16) + Math.sin(tick * 0.7 + i) * 18; c.beginPath(); c.moveTo(x0, 0); c.lineTo(x0 + 50, 0); c.lineTo(x0 + 160, H); c.lineTo(x0 - 60, H); c.closePath(); c.fillStyle = `rgba(190,245,255,${(0.07 * dive).toFixed(3)})`; c.fill() }
    // sand, seaweed and a rock
    ellipse(c, W * 0.5, H * 1.02, W * 0.7, H * 0.1, '#c9a86a')
    for (let i = 0; i < 7; i++) { const bx = W * (0.05 + i * 0.15), bh = H * (0.12 + 0.1 * rnd(i, seed)); c.beginPath(); c.moveTo(bx, H * 0.97); c.bezierCurveTo(bx + Math.sin(tick * 1.6 + i) * 16, H * 0.97 - bh * 0.4, bx - Math.sin(tick * 1.3 + i) * 16, H * 0.97 - bh * 0.7, bx + Math.sin(tick * 1.5 + i) * 12, H * 0.97 - bh); c.strokeStyle = i % 2 ? '#15803d' : '#22c55e'; c.lineWidth = 7; c.lineCap = 'round'; c.stroke() }
    // the fish: a shoal swimming across at different depths, and a big one that goes for the ball
    const fishColors = ['#fb923c', '#facc15', '#f472b6', '#a3e635', '#60a5fa', '#f87171']
    for (let i = 0; i < 13; i++) {
      const dir = i % 2 ? 1 : -1, sp = 0.05 + 0.07 * rnd(i, seed), y0 = H * (0.2 + 0.62 * rnd(i + 20, seed))
      const x = fract(rnd(i + 5, seed) + dir * sp * tick * 0.5 + dir * tau * sp) * (W + 160) - 80, y = y0 + Math.sin(tick * 2 + i) * 8, sz = W * (0.035 + 0.04 * rnd(i + 7, seed))
      c.save(); c.translate(x, y); c.scale(dir, 1)
      ellipse(c, 0, 0, sz, sz * 0.55, fishColors[i % fishColors.length])
      c.beginPath(); c.moveTo(-sz * 0.8, 0); c.lineTo(-sz * 1.5, -sz * 0.55 + Math.sin(tick * 9 + i) * 4); c.lineTo(-sz * 1.5, sz * 0.55 + Math.sin(tick * 9 + i) * 4); c.closePath(); c.fillStyle = fishColors[i % fishColors.length]; c.fill()
      circle(c, sz * 0.5, -sz * 0.1, sz * 0.14, '#fff'); circle(c, sz * 0.54, -sz * 0.1, sz * 0.07, '#0f172a')
      c.restore()
    }
    // the ball sinking, with bubbles
    const by0 = -H * 0.05, by1 = H * 0.8
    const sink = ease((tau - 1.0) / 3.2)
    const bx = W / 2 + Math.sin(tau * 2.2) * W * 0.06 * (1 - sink * 0.5), by = lerp(by0, by1, sink)
    for (let i = 0; i < 12; i++) { const age = fract(tick * 0.9 + rnd(i, seed)); circle(c, bx + (rnd(i + 3, seed) - 0.5) * 30 + Math.sin(age * 9) * 6, by - age * H * 0.25, 2 + 4 * rnd(i + 11, seed), 'rgba(255,255,255,0.45)', 'rgba(255,255,255,0.7)', 1) }
    ballAt(c, bx, by, W * 0.045)
    // a big fish goes for the ball (and misses), then a crab picks it up from the sand
    const gulp = tau > 2.2 && tau < 3.4 ? ease((tau - 2.2) / 0.6) * (1 - ease((tau - 3.0) / 0.4)) : 0
    if (gulp > 0) {
      const fx = lerp(-W * 0.2, bx - W * 0.05, ease((tau - 2.2) / 0.7)), fy = by - 8
      c.save(); c.translate(fx, fy)
      ellipse(c, 0, 0, W * 0.16, W * 0.09, '#475569'); ellipse(c, 0, W * 0.02, W * 0.13, W * 0.05, '#cbd5e1')
      c.beginPath(); c.moveTo(-W * 0.14, 0); c.lineTo(-W * 0.26, -W * 0.08); c.lineTo(-W * 0.26, W * 0.08); c.closePath(); c.fillStyle = '#475569'; c.fill()
      c.beginPath(); c.moveTo(W * 0.12, -W * 0.01); c.lineTo(W * 0.2, W * 0.03 * gulp); c.lineTo(W * 0.12, W * 0.05); c.closePath(); c.fillStyle = '#7f1d1d'; c.fill()
      circle(c, W * 0.08, -W * 0.03, W * 0.025, '#fff', '#0f172a', 2); circle(c, W * 0.088, -W * 0.03, W * 0.012, '#0f172a')
      c.restore()
    }
    if (tau > 3.5) {
      const k = ease((tau - 3.5) / 0.6)
      const cx = lerp(W * 0.85, W * 0.5, k), cy = H * 0.93
      ellipse(c, cx, cy, W * 0.07, W * 0.045, '#ef4444'); circle(c, cx - 8, cy - W * 0.05, 4, '#fff'); circle(c, cx + 8, cy - W * 0.05, 4, '#fff')
      line(c, cx - W * 0.07, cy, cx - W * 0.11, cy - W * 0.05 - 6 * Math.sin(tick * 8), '#ef4444', 6); line(c, cx + W * 0.07, cy, cx + W * 0.11, cy - W * 0.07, '#ef4444', 6)
    }
  }
}

// ---- the glass: through a restaurant window onto someone's dinner ---------------------------------------------------------------------------

function glass(c: C, W: number, H: number, tau: number, tick: number, seed: number) {
  // the warm room: wall, window on the back wall with the night city, a table in front
  rect(c, 0, 0, W, H, '#3b1d1a'); rect(c, 0, H * 0.62, W, H * 0.38, '#5b2c22')
  const wx = W * 0.18, wy = H * 0.1, ww = W * 0.64, wh = H * 0.42
  rect(c, wx - 8, wy - 8, ww + 16, wh + 16, '#2a1410')
  const night = c.createLinearGradient(0, wy, 0, wy + wh); night.addColorStop(0, '#0b1020'); night.addColorStop(1, '#27406b')
  const broken = tau > 0.55
  if (!broken) { rect(c, wx, wy, ww, wh, night); for (let i = 0; i < 6; i++) rect(c, wx + 10 + i * (ww / 6), wy + wh * 0.55, ww / 8, wh * 0.45, '#101a30'); line(c, wx + ww / 2, wy, wx + ww / 2, wy + wh, '#2a1410', 6) }
  else { rect(c, wx, wy, ww, wh, night); for (let i = 0; i < 6; i++) rect(c, wx + 10 + i * (ww / 6), wy + wh * 0.55, ww / 8, wh * 0.45, '#101a30') }
  // a candle and a lamp glow
  const glow = c.createRadialGradient(W / 2, H * 0.72, 4, W / 2, H * 0.72, W * 0.7); glow.addColorStop(0, 'rgba(255,200,120,0.35)'); glow.addColorStop(1, 'rgba(255,200,120,0)'); rect(c, 0, 0, W, H, glow)
  // the table, the cloth and the dinner
  rect(c, W * 0.06, H * 0.7, W * 0.88, H * 0.06, '#f8fafc'); rect(c, W * 0.1, H * 0.76, W * 0.8, H * 0.24, '#e2e8f0')
  const hit = tau > 0.95
  const hop = hit ? Math.max(0, Math.sin(clamp((tau - 0.95) * 5, 0, Math.PI))) * 14 : 0
  // two diners
  const mood = tau > 0.55 ? 'shock' : 'calm'
  for (const [i, dx] of [[0, 0.3], [1, 0.7]] as const) {
    const px = W * dx, py = H * 0.58
    rect(c, px - W * 0.09, py + W * 0.07, W * 0.18, H * 0.16, i ? '#7c3aed' : '#0f766e', 14)
    face(c, px, py, W * 0.075, SKINS[(i * 2 + 1) % SKINS.length], mood, i ? -1 : 1)
    if (hit && tau > 1.3) ellipse(c, px, py - W * 0.07, W * 0.07, W * 0.025, '#fbbf24') // spaghetti on the head
    if (!hit) { line(c, px + (i ? -1 : 1) * W * 0.07, py + W * 0.12, px + (i ? -1 : 1) * W * 0.02, H * 0.69, '#e2e8f0', 6) } else { line(c, px - W * 0.1, py + W * 0.05, px - W * 0.12, py - W * 0.1, '#e2e8f0', 6); line(c, px + W * 0.1, py + W * 0.05, px + W * 0.12, py - W * 0.1, '#e2e8f0', 6) }
  }
  // plates, a soup bowl, wine glasses and the candle (they jump when the ball lands)
  for (const dx of [0.3, 0.7]) { ellipse(c, W * dx, H * 0.725 - hop * 0.4, W * 0.1, H * 0.018, '#ffffff'); ellipse(c, W * dx, H * 0.718 - hop * 0.4, W * 0.07, H * 0.012, '#fbbf24') }
  rect(c, W * 0.46, H * 0.69 - hop, W * 0.08, H * 0.04, '#f8fafc', 6); ellipse(c, W * 0.5, H * 0.69 - hop, W * 0.04, H * 0.012, '#f97316')
  for (const dx of [0.2, 0.8]) { const tip = hit ? ease((tau - 1.0) / 0.6) * 1.4 : 0; c.save(); c.translate(W * dx, H * 0.7); c.rotate(tip * (dx < 0.5 ? -1 : 1)); rect(c, -6, -H * 0.06, 12, H * 0.05, 'rgba(255,255,255,0.5)', 4); rect(c, -2, -H * 0.012, 4, H * 0.012, 'rgba(255,255,255,0.7)'); c.restore() }
  const flame = hit && tau > 1.1 ? 0 : 1; rect(c, W * 0.5 - 3, H * 0.66, 6, H * 0.04, '#fef3c7'); if (flame) { ellipse(c, W * 0.5, H * 0.655, 5, 9 + Math.sin(tick * 20) * 2, '#fb923c') }
  // the ball: it grows out of the window, bursts through the glass, and lands in the soup
  if (tau < 0.55) { const k = tau / 0.55; ballAt(c, lerp(W * 0.5, W * 0.5, k), lerp(wy + wh * 0.4, H * 0.42, k), W * lerp(0.01, 0.07, k * k)) }
  else if (tau < 0.95) { const k = (tau - 0.55) / 0.4; ballAt(c, W * 0.5, lerp(H * 0.42, H * 0.69, k * k), W * lerp(0.07, 0.045, k)) }
  else if (tau < 3.4) ballAt(c, W * 0.5, H * 0.69 - hop, W * 0.045)
  // the glass: a flash and shards flying towards us
  if (tau >= 0.5 && tau < 2.2) {
    const k = tau - 0.5
    if (k < 0.12) rect(c, wx, wy, ww, wh, `rgba(255,255,255,${(0.8 * (1 - k / 0.12)).toFixed(2)})`)
    for (let i = 0; i < 46; i++) {
      const ox = wx + rnd(i, seed) * ww, oy = wy + rnd(i + 50, seed) * wh, vx = (rnd(i + 100, seed) - 0.5) * W * 1.4, vy = (rnd(i + 150, seed) - 0.7) * H * 0.5
      const px = ox + vx * k * 0.6, py = oy + vy * k * 0.6 + 0.5 * H * 1.4 * k * k, s = 6 + 16 * rnd(i + 20, seed), a = Math.max(0, 1 - k / 1.7)
      c.save(); c.translate(px, py); c.rotate(rnd(i, seed) * 6 + k * 6 * (rnd(i + 8, seed) - 0.5)); c.beginPath(); c.moveTo(0, -s); c.lineTo(s * 0.7, s * 0.5); c.lineTo(-s * 0.6, s * 0.4); c.closePath(); c.fillStyle = `rgba(200,240,255,${(0.55 * a).toFixed(2)})`; c.fill(); c.strokeStyle = `rgba(255,255,255,${(0.8 * a).toFixed(2)})`; c.lineWidth = 1.2; c.stroke(); c.restore()
    }
  }
  // the soup and the spaghetti flying
  if (hit && tau < 2.8) {
    const k = tau - 0.95
    for (let i = 0; i < 40; i++) { const a = -Math.PI * (0.1 + 0.8 * rnd(i, seed)), v = W * (0.3 + 0.8 * rnd(i + 30, seed)); circle(c, W * 0.5 + Math.cos(a) * v * k, H * 0.69 + Math.sin(a) * v * k * 1.2 + 0.5 * H * 1.6 * k * k, 4 + 5 * rnd(i + 9, seed), i % 3 ? '#f97316' : '#fbbf24') }
    for (let i = 0; i < 6; i++) { const a = -Math.PI * (0.2 + 0.6 * rnd(i + 60, seed)); c.beginPath(); c.moveTo(W * 0.5, H * 0.69); c.quadraticCurveTo(W * 0.5 + Math.cos(a) * W * 0.3 * k, H * 0.69 + Math.sin(a) * H * 0.2 * k, W * 0.5 + Math.cos(a) * W * 0.5 * k, H * 0.69 + Math.sin(a) * H * 0.1 * k + 40 * k * k); c.strokeStyle = '#fde68a'; c.lineWidth = 4; c.stroke() }
  }
  // the waiter drops his tray
  if (tau > 1.8) { const k = clamp((tau - 1.8) / 0.7); const wxp = W * 0.92, wyp = H * 0.5 + k * H * 0.3; rect(c, wxp - W * 0.05, wyp, W * 0.1, H * 0.2, '#0f172a', 8); face(c, wxp, wyp - W * 0.03, W * 0.05, SKINS[2], 'shock'); rect(c, wxp - W * 0.08, wyp + H * 0.05 + k * H * 0.25, W * 0.12, 5, '#9ca3af') }
  if (tau > 3.0) text(c, 'DINNER IS SERVED!', W / 2, H * 0.9, W * 0.075, '#fde68a')
}

// ---- the plane: through a cabin window at 30,000 feet -------------------------------------------------------------------------------------------

function plane(c: C, W: number, H: number, tau: number, tick: number, seed: number) {
  rect(c, 0, 0, W, H, '#cbd5e1'); rect(c, 0, H * 0.78, W, H * 0.22, '#475569')
  // overhead bins and the aisle
  rect(c, 0, 0, W, H * 0.16, '#e2e8f0'); for (let i = 0; i < 4; i++) rect(c, 8 + i * (W / 4), H * 0.04, W / 4 - 16, H * 0.09, '#f1f5f9', 10)
  rect(c, W * 0.42, H * 0.2, W * 0.16, H * 0.6, '#64748b')
  // the window with the sky and the clouds rushing past
  const wx = W * 0.06, wy = H * 0.22, ww = W * 0.3, wh = H * 0.34
  rect(c, wx - 8, wy - 8, ww + 16, wh + 16, '#94a3b8', 36)
  const sky = c.createLinearGradient(0, wy, 0, wy + wh); sky.addColorStop(0, '#0ea5e9'); sky.addColorStop(1, '#bae6fd')
  c.save(); c.beginPath(); c.roundRect(wx, wy, ww, wh, 30); c.clip(); rect(c, wx, wy, ww, wh, sky)
  for (let i = 0; i < 5; i++) { const cx = fract(rnd(i, seed) - tick * 0.3 * (0.5 + rnd(i + 5, seed)) - tau * 0.1) * (ww + 80) + wx - 40; ellipse(c, cx, wy + wh * (0.15 + 0.7 * rnd(i + 9, seed)), 38, 14, 'rgba(255,255,255,0.9)') }
  c.restore()
  const burst = tau > 0.45
  if (burst) { // a neat hole in the window and the air rushing out
    circle(c, wx + ww * 0.5, wy + wh * 0.45, W * 0.04 + 10 * Math.min(1, (tau - 0.45) * 4), '#0b1020'); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; line(c, wx + ww * 0.5 + Math.cos(a) * 20, wy + wh * 0.45 + Math.sin(a) * 20, wx + ww * 0.5 + Math.cos(a) * 60, wy + wh * 0.45 + Math.sin(a) * 60, 'rgba(255,255,255,0.7)', 2) }
  }
  // the passenger by the window, a flight attendant and a trolley
  const pxp = W * 0.22, pyp = H * 0.62
  rect(c, pxp - W * 0.1, pyp + W * 0.03, W * 0.2, H * 0.16, '#1d4ed8', 16); face(c, pxp, pyp - W * 0.01, W * 0.075, SKINS[1], burst ? 'shock' : 'calm', 1)
  if (burst) for (let i = 0; i < 12; i++) { const k = clamp((tau - 0.45 + rnd(i, seed) * 0.3) * 1.2); c.save(); c.translate(lerp(W * 0.8, wx + ww * 0.5, k * k), lerp(H * (0.3 + 0.5 * rnd(i + 3, seed)), wy + wh * 0.45, k * k)); c.rotate(tick * 8 + i); rect(c, -8, -5, 16, 10, i % 3 ? '#fff' : '#fde68a'); c.restore() }
  const ax = W * 0.78, ay = H * 0.5
  rect(c, ax - W * 0.08, ay + W * 0.06, W * 0.16, H * 0.22, '#0f172a', 12); face(c, ax, ay, W * 0.07, SKINS[4], burst ? 'shock' : 'happy', -1); rect(c, ax - W * 0.1, ay + H * 0.08, W * 0.07, 8, '#cbd5e1')
  for (let i = 0; i < 3; i++) { const lift = burst ? ease((tau - 0.6) / 0.6) * 18 * (1 + i * 0.3) : 0; rect(c, ax - W * 0.09 + i * 18, ay + H * 0.07 - lift, 12, 16, 'rgba(255,255,255,0.8)', 3) }
  // the ball punches in and bounces down the aisle
  if (tau < 0.45) ballAt(c, lerp(wx - 10, wx + ww * 0.5, tau / 0.45), lerp(wy - 20, wy + wh * 0.45, tau / 0.45), W * 0.03)
  else if (tau < 2.2) { const k = (tau - 0.45) / 1.75; const bx = lerp(wx + ww * 0.5, W * 0.5, ease(k)), by = lerp(wy + wh * 0.45, H * 0.74, k) - Math.abs(Math.sin(k * 9)) * H * 0.12 * (1 - k); ballAt(c, bx, by, W * 0.04) }
  else ballAt(c, W * 0.5, H * 0.74, W * 0.04)
  // the oxygen masks drop down on their strings
  if (tau > 1.0) for (let i = 0; i < 6; i++) { const k = ease((tau - 1.0 - i * 0.08) / 0.5), bx = W * (0.12 + i * 0.15), by = H * 0.16 + k * H * 0.2 + Math.sin(tick * 3 + i) * 4; line(c, bx, H * 0.16, bx, by, '#e5e7eb', 2); ellipse(c, bx, by + 8, 14, 11, '#fde047'); }
  // the captain's announcement
  if (tau > 0.9 && tau < 3.8) { rect(c, W * 0.06, H * 0.88, W * 0.88, H * 0.09, 'rgba(0,0,0,0.78)', 12); text(c, tau < 2.4 ? 'Ladies and gentlemen, this is your captain...' : '...was that a cricket ball?', W / 2, H * 0.925, W * 0.042, '#fef3c7') }
  if (tau > 3.8) { circle(c, W * 0.5, H * 0.74, W * 0.045, 'rgba(0,0,0,0)'); text(c, 'THUMBS UP!', W / 2, H * 0.86, W * 0.085, '#fde68a'); const hx = W * 0.5; rect(c, hx - 12, H * 0.78, 24, 34, SKINS[3], 8); rect(c, hx - 4, H * 0.76, 8, 18, SKINS[3], 4) }
}

// ---- the wedding: into the cake -------------------------------------------------------------------------------------------------------------------

function wedding(c: C, W: number, H: number, tau: number, tick: number, seed: number) {
  const sky = c.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#1e1b4b'); sky.addColorStop(1, '#4c1d95'); rect(c, 0, 0, W, H, sky)
  // the marquee, the fairy lights and the lawn
  rect(c, 0, H * 0.7, W, H * 0.3, '#14532d')
  for (let i = 0; i < 14; i++) { const x = (i / 13) * W, y = H * 0.1 + Math.sin(i * 0.9) * 14 + 24 * Math.abs(Math.sin(i / 13 * Math.PI)); circle(c, x, y, 5, Math.sin(tick * 4 + i) > 0 ? '#fde68a' : '#fbbf24') }
  // the band at the back
  for (let i = 0; i < 3; i++) { const bx = W * (0.25 + i * 0.25), by = H * 0.5; rect(c, bx - W * 0.05, by, W * 0.1, H * 0.12, '#0f172a', 10); face(c, bx, by - 6, W * 0.045, SKINS[(i + 1) % 5], tau > 0.75 ? 'shock' : 'happy') }
  if (tau < 0.75) line(c, W * 0.75 - 18, H * 0.54 + Math.sin(tick * 24) * 8, W * 0.75 - 4, H * 0.5, '#fde68a', 4)
  // the cake: three tiers on a table
  const cx = W / 2, cy = H * 0.74
  const hitT = 0.8
  rect(c, cx - W * 0.28, cy, W * 0.56, H * 0.04, '#f8fafc'); rect(c, cx - W * 0.25, cy + H * 0.04, W * 0.5, H * 0.2, '#e2e8f0')
  const boom = tau > hitT, k = Math.max(0, tau - hitT)
  if (!boom) {
    for (const [i, w, h, col] of [[0, 0.34, 0.08, '#fbcfe8'], [1, 0.24, 0.075, '#f9a8d4'], [2, 0.14, 0.07, '#f472b6']] as const) { const y = cy - H * (0.08 + i * 0.075) + H * (i === 0 ? 0 : 0); rect(c, cx - W * w / 2, cy - H * 0.08 * (i + 1) + (i ? -H * 0.005 * i : 0), W * w, H * h, col, 10); for (let d = 0; d < 5; d++) circle(c, cx - W * w / 2 + (d + 0.5) * (W * w / 5), cy - H * 0.08 * (i + 1) + 6, 5, '#fff'); void y }
    rect(c, cx - 5, cy - H * 0.27, 10, 22, '#0f172a'); circle(c, cx - 8, cy - H * 0.29, 6, '#f8fafc'); circle(c, cx + 8, cy - H * 0.29, 6, '#0f172a')
  } else {
    // the cake goes up in a cloud of cream and icing, the little couple spinning off the top
    for (let i = 0; i < 70; i++) {
      const a = -Math.PI * (0.05 + 0.9 * rnd(i, seed)), v = W * (0.4 + 1.1 * rnd(i + 40, seed)), px = cx + Math.cos(a) * v * k, py = cy - H * 0.1 + Math.sin(a) * v * k * 1.3 + 0.5 * H * 1.8 * k * k
      const col = i % 4 === 0 ? '#fff' : i % 4 === 1 ? '#fbcfe8' : i % 4 === 2 ? '#f9a8d4' : '#fef3c7'
      ellipse(c, px, py, 7 + 9 * rnd(i + 11, seed), 5 + 6 * rnd(i + 12, seed), col, rnd(i, seed) * 3)
    }
    const tx = cx + 30 * k, ty = cy - H * 0.27 - 220 * k + 400 * k * k
    c.save(); c.translate(tx, ty); c.rotate(k * 9); rect(c, -5, 0, 10, 22, '#0f172a'); circle(c, -8, -4, 6, '#f8fafc'); circle(c, 8, -4, 6, '#0f172a'); c.restore()
    if (k > 0.8) rect(c, cx - W * 0.3, cy - H * 0.02, W * 0.6, H * 0.02, 'rgba(255,255,255,0.9)', 8) // the splat on the table
  }
  // the bride and the groom either side, taking it badly
  for (const [side, dx] of [['bride', 0.16], ['groom', 0.84]] as const) {
    const px = W * dx, py = H * 0.6
    rect(c, px - W * 0.1, py + W * 0.05, W * 0.2, H * 0.2, side === 'bride' ? '#fdf2f8' : '#111827', 16)
    face(c, px, py, W * 0.075, SKINS[side === 'bride' ? 0 : 3], boom ? 'shock' : 'happy')
    if (side === 'bride') rect(c, px - W * 0.08, py - W * 0.085, W * 0.16, W * 0.05, '#fff', 12)
    if (boom && k > 0.5) { ellipse(c, px, py + 4, W * 0.06, W * 0.04, 'rgba(255,255,255,0.92)'); ellipse(c, px + 8, py - 10, W * 0.025, W * 0.02, 'rgba(255,255,255,0.92)') } // cream in the face
  }
  // the ball dropping in from the top left
  if (tau < hitT) { const u = tau / hitT; ballAt(c, lerp(-W * 0.05, cx, u), lerp(-H * 0.05, cy - H * 0.1, u * u), W * 0.035); for (let i = 1; i < 6; i++) circle(c, lerp(-W * 0.05, cx, u - i * 0.03), lerp(-H * 0.05, cy - H * 0.1, (u - i * 0.03) ** 2), W * 0.02 * (1 - i / 7), 'rgba(255,255,255,0.35)') }
  else if (k < 1.5) ballAt(c, cx + 18 * k, cy - H * 0.12 - Math.abs(Math.sin(k * 6)) * 40 * (1 - k / 1.5) + k * 30, W * 0.035)
  else ballAt(c, cx + 27, cy + 6, W * 0.035)
  if (tau > 2.2) { text(c, 'TIME FOR SECONDS!', W / 2, H * 0.12, W * 0.07, '#fbcfe8'); for (let i = 0; i < 5; i++) { const hk = fract(tick * 0.5 + i * 0.2); text(c, '♥', W * (0.2 + 0.15 * i), H * 0.5 - hk * H * 0.3, W * 0.05, `rgba(251,113,133,${(1 - hk).toFixed(2)})`) } }
}

// ---- the fireworks: into a rooftop party's crate ---------------------------------------------------------------------------------------------

function fireworks(c: C, W: number, H: number, tau: number, tick: number, seed: number) {
  const hitT = 0.8
  const sky = c.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#02030a'); sky.addColorStop(1, '#1e1b4b'); rect(c, 0, 0, W, H, sky)
  // the show lights the whole sky
  const shows: { x: number; y: number; t0: number; col: string }[] = []
  for (let i = 0; i < 9; i++) shows.push({ x: W * (0.12 + 0.76 * rnd(i, seed)), y: H * (0.12 + 0.35 * rnd(i + 9, seed)), t0: hitT + 0.4 + i * 0.32, col: ['#f472b6', '#fbbf24', '#38bdf8', '#a3e635', '#fb7185', '#c084fc'][i % 6] })
  let glow = 0
  for (const s of shows) {
    const k = tau - s.t0
    if (k < -0.7 || k > 1.8) continue
    if (k < 0) { const u = (k + 0.7) / 0.7; line(c, s.x, H * 0.72, lerp(s.x, s.x, u), lerp(H * 0.72, s.y, u * u), '#fde68a', 3); continue }
    glow = Math.max(glow, 1 - k / 1.8)
    for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2, r0 = W * 0.26 * (1 - Math.exp(-k * 3.2)), px = s.x + Math.cos(a) * r0, py = s.y + Math.sin(a) * r0 + 30 * k * k; circle(c, px, py, 3.2 * (1 - k / 1.8) + 0.6, s.col); line(c, px, py, s.x + Math.cos(a) * r0 * 0.82, s.y + Math.sin(a) * r0 * 0.82 + 24 * k * k, s.col, 1.6) }
  }
  rect(c, 0, 0, W, H, `rgba(255,200,255,${(0.1 * glow).toFixed(3)})`)
  // the skyline and the roof
  for (let i = 0; i < 12; i++) { const bw = W / 12, bh = H * (0.12 + 0.16 * rnd(i + 30, seed)); rect(c, i * bw, H * 0.72 - bh * 0.4, bw + 1, bh, '#0b1020'); for (let k = 0; k < 4; k++) rect(c, i * bw + 5, H * 0.72 - bh * 0.4 + 6 + k * 12, 5, 5, rnd(i * 4 + k, seed) > 0.4 ? '#fde68a' : '#0b1020') }
  rect(c, 0, H * 0.78, W, H * 0.22, '#1f2937'); rect(c, 0, H * 0.78, W, 6, '#374151')
  for (let i = 0; i < 9; i++) circle(c, (i / 8) * W, H * 0.77 + Math.sin(i) * 3, 4, Math.sin(tick * 5 + i) > 0 ? '#fde68a' : '#fbbf24')
  // the party: people with their arms up
  for (let i = 0; i < 6; i++) { const px = W * (0.08 + i * 0.16), up = tau > hitT ? 1 : 0, hop = up ? Math.abs(Math.sin(tick * 7 + i)) * 10 : 0; rect(c, px - 12, H * 0.84 - hop, 24, 40, i % 2 ? '#7c3aed' : '#0f766e', 8); face(c, px, H * 0.82 - hop, 13, SKINS[i % 5], tau > hitT ? 'happy' : 'calm'); if (up) { line(c, px - 12, H * 0.85 - hop, px - 22, H * 0.78 - hop, SKINS[i % 5], 5); line(c, px + 12, H * 0.85 - hop, px + 22, H * 0.78 - hop, SKINS[i % 5], 5) } }
  // the crate marked FIREWORKS; the ball hits it and it lights up
  const crx = W * 0.5, cry = H * 0.8
  rect(c, crx - W * 0.12, cry, W * 0.24, H * 0.1, '#92400e', 4); rect(c, crx - W * 0.12, cry + H * 0.04, W * 0.24, 4, '#78350f'); text(c, 'FIREWORKS', crx, cry + H * 0.05, W * 0.04, '#fef3c7', '#451a03')
  if (tau < hitT) { const u = tau / hitT; ballAt(c, lerp(W * 0.1, crx, u), lerp(H * 0.05, cry, u * u), W * 0.035) }
  else { const k = tau - hitT; if (k < 0.5) for (let i = 0; i < 24; i++) { const a = rnd(i, seed) * Math.PI * 2; line(c, crx, cry, crx + Math.cos(a) * 160 * k * 2, cry + Math.sin(a) * 160 * k * 2, '#fde047', 3) }; rect(c, crx - W * 0.12, cry - 4, W * 0.24, 8, `rgba(251,146,60,${(0.8 * (1 - Math.min(1, k))).toFixed(2)})`); ballAt(c, crx + Math.min(k, 1.2) * 60, cry - Math.abs(Math.sin(k * 5)) * 50 * Math.max(0, 1 - k / 1.4) - 4, W * 0.035) }
  if (tau > 3.2) text(c, 'WHAT A SHOW!', W / 2, H * 0.1, W * 0.08, '#fde68a')
}

// ---- the bell tower ---------------------------------------------------------------------------------------------------------------------------------------

function bell(c: C, W: number, H: number, tau: number, tick: number, seed: number) {
  const hitT = 0.8
  const sky = c.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#312e81'); sky.addColorStop(1, '#fbbf24'); rect(c, 0, 0, W, H, sky)
  const k = Math.max(0, tau - hitT)
  const shake = tau > hitT && tau < hitT + 1.8 ? Math.sin(tick * 60) * 5 * (1 - (tau - hitT) / 1.8) : 0
  c.save(); c.translate(shake, shake * 0.4)
  for (let i = 0; i < 6; i++) rect(c, i * (W / 6), H * 0.78, W / 6 - 4, H * 0.22, i % 2 ? '#7c2d12' : '#9a3412')
  // the tower, the clock face and the open arch with the bell
  const tx = W * 0.3, tw = W * 0.4
  rect(c, tx, H * 0.08, tw, H * 0.74, '#a16207', 6); rect(c, tx - 10, H * 0.06, tw + 20, 16, '#713f12'); c.beginPath(); c.moveTo(tx - 10, H * 0.06); c.lineTo(tx + tw / 2, -H * 0.04); c.lineTo(tx + tw + 10, H * 0.06); c.closePath(); c.fillStyle = '#7c2d12'; c.fill()
  const fx = tx + tw / 2, fy = H * 0.24
  circle(c, fx, fy, tw * 0.36, '#fef3c7', '#451a03', 5)
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; line(c, fx + Math.cos(a) * tw * 0.3, fy + Math.sin(a) * tw * 0.3, fx + Math.cos(a) * tw * 0.34, fy + Math.sin(a) * tw * 0.34, '#451a03', 3) }
  const spin = tau > hitT ? (tau - hitT) * (10 - Math.min(8, (tau - hitT) * 2.5)) : 0
  line(c, fx, fy, fx + Math.cos(-1.2 + spin) * tw * 0.22, fy + Math.sin(-1.2 + spin) * tw * 0.22, '#451a03', 6); line(c, fx, fy, fx + Math.cos(0.9 + spin * 12 / 12 * 1.0) * tw * 0.3, fy + Math.sin(0.9 + spin) * tw * 0.3, '#451a03', 4)
  rect(c, tx + tw * 0.2, H * 0.44, tw * 0.6, H * 0.3, '#1c1917', 40)
  const swing = tau > hitT ? Math.sin(k * 11) * 0.5 * Math.exp(-k * 0.7) : 0
  c.save(); c.translate(fx, H * 0.45); c.rotate(swing); c.beginPath(); c.moveTo(-tw * 0.2, tw * 0.3); c.quadraticCurveTo(-tw * 0.2, 0, 0, -4); c.quadraticCurveTo(tw * 0.2, 0, tw * 0.2, tw * 0.3); c.closePath(); c.fillStyle = '#d97706'; c.fill(); c.strokeStyle = '#78350f'; c.lineWidth = 4; c.stroke(); circle(c, 0, tw * 0.33, 9, '#78350f'); c.restore()
  c.restore()
  // the ball flying in, the BONG, the rings and the pigeons
  if (tau < hitT) { const u = tau / hitT; ballAt(c, lerp(-W * 0.05, fx, u), lerp(H * 0.7, H * 0.5, u) - Math.sin(u * Math.PI) * H * 0.1, W * 0.035) }
  else {
    if (k < 1.6) for (let i = 0; i < 4; i++) { const rr = (k * 0.9 + i * 0.12) * W * 0.8; c.beginPath(); c.arc(fx, H * 0.55, rr, 0, Math.PI * 2); c.strokeStyle = `rgba(255,255,255,${Math.max(0, 0.7 - k * 0.45).toFixed(2)})`; c.lineWidth = 6; c.stroke() }
    if (k < 2) text(c, 'BONG!', fx, H * 0.55 - k * 40, W * (0.2 + 0.05 * Math.sin(k * 20)), '#fef3c7', '#7c2d12')
    ballAt(c, fx + 30 * k, H * 0.5 + k * k * 160, W * 0.035)
    for (let i = 0; i < 12; i++) { const a = -Math.PI * (0.1 + 0.8 * rnd(i, seed)), v = W * (0.3 + 0.5 * rnd(i + 8, seed)), px = fx + Math.cos(a) * v * k, py = H * 0.3 + Math.sin(a) * v * k - 20 * k; c.beginPath(); c.moveTo(px - 10, py); c.quadraticCurveTo(px, py - 8 + Math.sin(tick * 20 + i) * 6, px + 10, py); c.strokeStyle = '#0f172a'; c.lineWidth = 3; c.stroke() }
  }
  // the people below with their hands over their ears
  for (let i = 0; i < 5; i++) { const px = W * (0.08 + i * 0.2) + (i > 1 ? W * 0.1 : 0), py = H * 0.86; rect(c, px - 10, py, 20, 34, i % 2 ? '#0369a1' : '#be185d', 6); face(c, px, py - 4, 12, SKINS[i % 5], tau > hitT ? 'shock' : 'calm'); if (tau > hitT) { circle(c, px - 14, py - 4, 5, SKINS[i % 5]); circle(c, px + 14, py - 4, 5, SKINS[i % 5]) } }
  if (tau > 3.6) text(c, 'LOUD AND PROUD!', W / 2, H * 0.1, W * 0.07, '#fef3c7', '#451a03')
}

// ---- the pizza scooter ---------------------------------------------------------------------------------------------------------------------------------

function pizza(c: C, W: number, H: number, tau: number, _tick: number, seed: number) {
  const hitT = 0.7
  const sky = c.createLinearGradient(0, 0, 0, H * 0.6); sky.addColorStop(0, '#1e3a8a'); sky.addColorStop(1, '#f59e0b'); rect(c, 0, 0, W, H, sky)
  for (let i = 0; i < 7; i++) { const bw = W / 6, bh = H * (0.2 + 0.2 * rnd(i, seed)); rect(c, i * bw, H * 0.62 - bh, bw + 1, bh, i % 2 ? '#1f2937' : '#374151'); for (let k = 0; k < 4; k++) rect(c, i * bw + 8, H * 0.62 - bh + 10 + k * 18, 8, 8, rnd(i * 5 + k, seed) > 0.4 ? '#fde68a' : '#111827') }
  rect(c, 0, H * 0.62, W, H * 0.38, '#475569'); for (let i = 0; i < 6; i++) rect(c, ((i * 0.2 - tau * 0.25) % 1.2 + 1.2) % 1.2 * W - W * 0.1, H * 0.78, W * 0.1, 6, '#fde68a')
  // the hot-dog cart on the right
  const cartX = W * 0.8
  const crash = tau > 2.0, ck = Math.max(0, tau - 2.0)
  c.save(); c.translate(cartX + ck * 60, H * 0.66); c.rotate(crash ? ease(ck / 0.8) * 1.3 : 0)
  rect(c, -W * 0.1, 0, W * 0.2, H * 0.1, '#dc2626', 8); circle(c, -W * 0.06, H * 0.1, 12, '#111827'); circle(c, W * 0.06, H * 0.1, 12, '#111827'); line(c, 0, 0, 0, -H * 0.1, '#e5e7eb', 4)
  c.beginPath(); c.moveTo(-W * 0.14, -H * 0.1); c.lineTo(W * 0.14, -H * 0.1); c.lineTo(0, -H * 0.16); c.closePath(); c.fillStyle = '#facc15'; c.fill(); text(c, 'HOT DOGS', 0, H * 0.05, W * 0.035, '#fef3c7', '#450a0a')
  c.restore()
  if (crash) for (let i = 0; i < 22; i++) { const a = -Math.PI * (0.1 + 0.8 * rnd(i, seed)), v = W * (0.3 + 0.7 * rnd(i + 20, seed)); const px = cartX + Math.cos(a) * v * ck, py = H * 0.62 + Math.sin(a) * v * ck * 1.1 + 0.5 * H * 1.6 * ck * ck; c.save(); c.translate(px, py); c.rotate(ck * 9 + i); if (i % 3 === 0) { rect(c, -14, -4, 28, 8, '#b45309', 4); rect(c, -12, -2, 24, 3, '#dc2626') } else if (i % 3 === 1) line(c, -10, 0, 10, 0, '#facc15', 4); else line(c, -10, 0, 10, 0, '#dc2626', 4); c.restore() }
  // the scooter: it rides in from the left with the pizza box on the back
  const rideT = Math.min(tau, 2.0)
  const sx = lerp(-W * 0.2, W * 0.58, ease(rideT / 2.0) * 0.75 + rideT / 2.0 * 0.25), wob = tau > hitT ? Math.sin(tau * 14) * 0.18 * Math.min(1, (tau - hitT)) * (crash ? 0.3 : 1) : 0
  c.save(); c.translate(crash ? sx + ck * 20 : sx, H * 0.74 + (crash ? ck * 6 : 0)); c.rotate(wob + (crash ? -ease(ck / 0.6) * 0.5 : 0))
  circle(c, -W * 0.07, 0, W * 0.04, '#111827', '#9ca3af', 3); circle(c, W * 0.09, 0, W * 0.04, '#111827', '#9ca3af', 3)
  rect(c, -W * 0.08, -W * 0.07, W * 0.2, W * 0.05, '#ef4444', 10); rect(c, W * 0.05, -W * 0.16, 6, W * 0.1, '#9ca3af')
  rect(c, -W * 0.02, -W * 0.18, W * 0.07, W * 0.12, '#f59e0b', 10); face(c, W * 0.015, -W * 0.22, W * 0.04, SKINS[2], tau > hitT ? 'shock' : 'calm'); rect(c, -W * 0.03, -W * 0.265, W * 0.09, W * 0.03, '#ef4444', 10)
  const boxOpen = tau > hitT ? ease((tau - hitT) / 0.25) : 0
  rect(c, -W * 0.15, -W * 0.13, W * 0.11, W * 0.03, '#fef3c7'); c.save(); c.translate(-W * 0.15, -W * 0.13); c.rotate(-boxOpen * 1.4); rect(c, 0, -W * 0.012, W * 0.11, W * 0.012, '#fef3c7'); c.restore()
  c.restore()
  // the ball drops from the sky into the box; the slices fly
  if (tau < hitT) { const u = tau / hitT; ballAt(c, lerp(W * 0.1, sx - W * 0.1, u), lerp(-H * 0.05, H * 0.74 - W * 0.14, u * u), W * 0.035) }
  else { const k = tau - hitT; for (let i = 0; i < 8; i++) { const a = -Math.PI * (0.2 + 0.6 * rnd(i, seed)), v = W * (0.3 + 0.6 * rnd(i + 9, seed)), px = sx - W * 0.1 + Math.cos(a) * v * Math.min(k, 1.6), py = H * 0.6 + Math.sin(a) * v * Math.min(k, 1.6) + 0.5 * H * 1.4 * Math.min(k, 1.6) ** 2; c.save(); c.translate(px, py); c.rotate(k * 8 + i); c.beginPath(); c.moveTo(0, -16); c.lineTo(14, 12); c.lineTo(-14, 12); c.closePath(); c.fillStyle = '#fbbf24'; c.fill(); circle(c, 0, 2, 4, '#dc2626'); circle(c, 5, 8, 3, '#dc2626'); c.restore() }
    ballAt(c, sx - W * 0.1 + k * 40, H * 0.72 - Math.abs(Math.sin(k * 5)) * 40 * Math.max(0, 1 - k / 1.6) , W * 0.035) }
  if (tau > 3.4) text(c, 'EXTRA CHEESE!', W / 2, H * 0.12, W * 0.08, '#fef3c7', '#7c2d12')
}

const DRAW: Record<SixSceneKind, (c: C, W: number, H: number, tau: number, tick: number, seed: number) => void> = { river, glass, plane, wedding, fireworks, bell, pizza }

/** The cut-away for where the ball came down, `tau` seconds after it did. `tick` is a running clock (for things that wave about). */
export function drawSixScene(ctx: CanvasRenderingContext2D, W: number, H: number, kind: SixSceneKind, tau: number, tick: number, seed: number) {
  ctx.save()
  ctx.lineJoin = 'round'
  DRAW[kind](ctx, W, H, Math.max(0, tau), tick, (seed % 997) / 997)
  ctx.restore()
}

/** What the strip under the picture says about each one. */
export const SIX_SCENE_TEXT: Record<SixSceneKind, string> = {
  river: 'It splashes into the river and sinks past the fish',
  glass: 'It smashes a restaurant window and lands in somebody\'s dinner',
  plane: 'It punches through the window of a passing plane',
  wedding: 'It lands in the wedding cake',
  fireworks: 'It hits a crate of fireworks at a rooftop party',
  bell: 'It rings the great bell of the clock tower',
  pizza: 'It drops into a pizza box on a scooter',
}
