import type { MoveStyle } from '../../data/moves'
import { project, type prep, type V3 } from './broadcast'

/**
 * The drawing of a signature move on the broadcast canvas: a beam, a sphere, a slash and so on, made of glowing strokes and circles only.
 * It reads where the ball has been since the move began and nothing else, so it can never touch a result.
 */
export interface MoveDraw {
  style: MoveStyle
  c1: string
  c2: string
  /** Seconds since the move began, and how long it lasts. */
  k: number
  life: number
  /** 1 for a six, less for a four. */
  size: number
  /** Where it began (the bat, or the stumps), the places the ball has been since, and where it is now. */
  from: V3
  path: V3[]
  ball: V3 | null
  seed: number
}

type Prep = ReturnType<typeof prep>

const hash01 = (n: number) => { const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s) }
const clamp01 = (t: number) => Math.max(0, Math.min(1, t))

/** '#rrggbb' as an rgba() string. */
export function rgba(hex: string, a: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!m) return hex
  const n = parseInt(m[1], 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a)).toFixed(3)})`
}

/** How bright a '#rrggbb' colour is, 0 to 1. */
const lum = (hex: string) => {
  const m = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!m) return 1
  const n = parseInt(m[1], 16)
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
}

/** How strong the move is at this moment: it flashes in, holds, and dies away. */
export const moveAlpha = (k: number, life: number) => clamp01(k / 0.08) * clamp01((life - k) / 0.4)

export function drawMove(ctx: CanvasRenderingContext2D, r: Prep, m: MoveDraw): void {
  const a = moveAlpha(m.k, m.life)
  if (a <= 0) return
  const pf = project(r, m.from)
  const pts = m.path.map((v) => project(r, v)).filter((p): p is NonNullable<typeof p> => !!p)
  const tip = m.ball ? project(r, m.ball) : pts[pts.length - 1] ?? null
  if (!pf && !tip) return
  const F = r.F
  const px = (metres: number, d: number) => Math.max(1.5, (metres * F) / d)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  // bright colours add light to the picture; dark ones (a black slash) are painted over it, or they would not show at all
  const comp = (col: string) => { ctx.globalCompositeOperation = lum(col) < 0.3 ? 'source-over' : 'lighter' }
  const glow = (x: number, y: number, rad: number, col: string, alpha: number) => {
    comp(col)
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad)
    g.addColorStop(0, rgba(col, alpha)); g.addColorStop(1, rgba(col, 0))
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill()
  }
  const line = (list: { x: number; y: number }[], w: number, col: string, alpha: number) => {
    if (list.length < 2) return
    comp(col)
    ctx.strokeStyle = rgba(col, alpha); ctx.lineWidth = w
    ctx.beginPath(); ctx.moveTo(list[0].x, list[0].y); for (let i = 1; i < list.length; i++) ctx.lineTo(list[i].x, list[i].y); ctx.stroke()
  }
  const ring = (x: number, y: number, rad: number, flat: number, w: number, col: string, alpha: number, spin = 0, arc = Math.PI * 2) => {
    comp(col)
    ctx.strokeStyle = rgba(col, alpha); ctx.lineWidth = w
    ctx.beginPath(); ctx.ellipse(x, y, rad, rad * flat, 0, spin, spin + arc); ctx.stroke()
  }

  // every move starts with the same flash and ring where it begins
  if (pf && m.k < 0.6) {
    const kk = m.k / 0.6
    const rad = px((0.4 + kk * 3.2) * m.size, pf.d)
    glow(pf.x, pf.y, px(1.6 * m.size, pf.d) * (1 - kk * 0.5), '#ffffff', 0.85 * (1 - kk))
    ring(pf.x, pf.y, rad, 0.45, Math.max(2, 5 * (1 - kk)), m.c2, 0.9 * (1 - kk))
    ring(pf.x, pf.y, rad * 0.7, 0.45, Math.max(1.5, 3 * (1 - kk)), m.c1, 0.8 * (1 - kk))
  }

  // the ground cracks where the bat met the ball: dark fissures that glow in the move's colour, spreading from the spot
  if (m.k < 1.0) {
    const grow = clamp01(m.k / 0.25), fade = 1 - clamp01((m.k - 0.5) / 0.5)
    for (let i = 0; i < 10; i++) {
      const ang = (i / 10) * Math.PI * 2 + hash01(m.seed + i) * 0.5
      const len = (1.4 + hash01(m.seed * 1.7 + i) * 3) * m.size * grow
      const a0 = project(r, { x: m.from.x, y: 0, z: m.from.z }), a1 = project(r, { x: m.from.x + Math.cos(ang) * len, y: 0, z: m.from.z + Math.sin(ang) * len })
      if (!a0 || !a1) continue
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = `rgba(15,10,5,${0.7 * fade})`; ctx.lineWidth = Math.max(1.5, (0.14 * F) / a0.d)
      ctx.beginPath(); ctx.moveTo(a0.x, a0.y); ctx.lineTo(a1.x, a1.y); ctx.stroke()
      comp(m.c1)
      ctx.strokeStyle = rgba(m.c1, 0.6 * fade); ctx.lineWidth = Math.max(1, (0.07 * F) / a0.d)
      ctx.beginPath(); ctx.moveTo(a0.x, a0.y); ctx.lineTo(a1.x, a1.y); ctx.stroke()
    }
  }
  const dTip = tip?.d ?? pf?.d ?? 20
  const w = px(0.5 * m.size, dTip)
  const flick = 1 + 0.08 * Math.sin(m.k * 55)
  const heading = (() => {
    const n = pts.length
    if (n < 2) return 0
    const p = pts[Math.max(0, n - 4)], q = pts[n - 1]
    return Math.atan2(q.y - p.y, q.x - p.x)
  })()

  switch (m.style) {
    case 'beam': {
      line(pts, w * 3.2 * flick, m.c1, 0.28 * a)
      line(pts, w * 1.7 * flick, m.c1, 0.65 * a)
      line(pts, w * 0.8 * flick, m.c2, 0.95 * a)
      if (tip) glow(tip.x, tip.y, w * 3.4, m.c2, 0.9 * a)
      if (pf && m.k < 0.5) glow(pf.x, pf.y, px(1.2 * m.size, pf.d), m.c2, 0.7 * a)
      break
    }
    case 'sphere': {
      if (!tip) break
      const R = px(0.85 * m.size, tip.d)
      line(pts, w * 0.9, m.c1, 0.35 * a)
      glow(tip.x, tip.y, R * 1.9, m.c1, 0.7 * a)
      glow(tip.x, tip.y, R, m.c2, 0.95 * a)
      for (let i = 0; i < 4; i++) {
        const s = m.k * 16 + (i * Math.PI) / 2
        ring(tip.x, tip.y, R * (0.5 + 0.18 * i), 1, Math.max(1.5, R * 0.1), i % 2 ? m.c2 : '#ffffff', 0.85 * a, s, 1.7)
      }
      break
    }
    case 'slash': {
      const n = pts.length
      const at = (f: number) => pts[Math.max(0, Math.min(n - 1, Math.round((n - 1) * f)))]
      for (const [f, sc, al] of [[1, 1, 1], [0.66, 0.8, 0.55], [0.36, 0.62, 0.3]] as const) {
        const p = at(f)
        if (!p) continue
        const R = px(2.4 * m.size * sc, p.d)
        const cx = p.x - Math.cos(heading) * R * 0.55, cy = p.y - Math.sin(heading) * R * 0.55
        comp(m.c1)
        ctx.strokeStyle = rgba(m.c1, 0.9 * a * al); ctx.lineWidth = R * 0.34
        ctx.beginPath(); ctx.arc(cx, cy, R, heading - 1.0, heading + 1.0); ctx.stroke()
        comp(m.c2)
        ctx.strokeStyle = rgba(m.c2, 0.95 * a * al); ctx.lineWidth = R * 0.12
        ctx.beginPath(); ctx.arc(cx, cy, R * 0.97, heading - 0.9, heading + 0.9); ctx.stroke()
      }
      if (tip) glow(tip.x, tip.y, w * 2, m.c2, 0.5 * a)
      break
    }
    case 'lightning': {
      const frame = Math.floor(m.k * 22)
      const step = Math.max(1, Math.floor(pts.length / 12))
      for (let b = 0; b < 3; b++) {
        const jag: { x: number; y: number }[] = []
        for (let i = 0; i < pts.length; i += step) {
          const p = pts[i]
          const off = px(0.45 * m.size, p.d) * (hash01(m.seed + b * 7.3 + i * 1.9 + frame * 3.1) - 0.5) * 2
          jag.push({ x: p.x + off * 0.4, y: p.y + off })
        }
        if (tip) jag.push({ x: tip.x, y: tip.y })
        line(jag, w * 1.1, m.c1, 0.55 * a)
        line(jag, w * 0.35, m.c2, 0.95 * a)
      }
      if (tip) glow(tip.x, tip.y, w * 2.6, m.c1, 0.75 * a)
      break
    }
    case 'flame': {
      const n = pts.length
      for (let i = 0; i < n; i++) {
        const p = pts[i]
        const age = (n - 1 - i) / Math.max(1, n - 1)
        const rad = px(0.62 * m.size * (1 - age * 0.65), p.d)
        const jx = (hash01(m.seed + i * 2.1 + Math.floor(m.k * 18) * 5.7) - 0.5) * rad * 0.8
        const jy = (hash01(m.seed + i * 3.7 + Math.floor(m.k * 18) * 1.3) - 0.5) * rad * 0.8 - age * rad * 0.6
        glow(p.x + jx, p.y + jy, rad * 1.5, m.c1, (1 - age) * 0.55 * a)
        glow(p.x + jx * 0.5, p.y + jy * 0.5, rad * 0.7, m.c2, (1 - age) * 0.7 * a)
      }
      if (tip) glow(tip.x, tip.y, w * 2.4, m.c2, 0.85 * a)
      break
    }
    case 'rune': {
      const circle = (p: { x: number; y: number; d: number }, rM: number, spin: number) => {
        const R = px(rM * m.size, p.d)
        ring(p.x, p.y, R, 0.5, Math.max(2, R * 0.08), m.c1, 0.55 * a)
        ring(p.x, p.y, R, 0.5, Math.max(1.2, R * 0.03), m.c2, 0.95 * a)
        ring(p.x, p.y, R * 0.72, 0.5, Math.max(1, R * 0.03), m.c2, 0.8 * a)
        for (let i = 0; i < 8; i++) {
          const t = spin + (i * Math.PI) / 4
          ctx.strokeStyle = rgba(m.c2, 0.9 * a); ctx.lineWidth = Math.max(1, R * 0.04)
          ctx.beginPath(); ctx.moveTo(p.x + Math.cos(t) * R * 0.72, p.y + Math.sin(t) * R * 0.36); ctx.lineTo(p.x + Math.cos(t) * R, p.y + Math.sin(t) * R * 0.5); ctx.stroke()
        }
        // a triangle turning inside
        ctx.strokeStyle = rgba(m.c2, 0.8 * a); ctx.lineWidth = Math.max(1, R * 0.035)
        ctx.beginPath()
        for (let i = 0; i <= 3; i++) { const t = -spin * 1.3 + (i * 2 * Math.PI) / 3; const x = p.x + Math.cos(t) * R * 0.7, y = p.y + Math.sin(t) * R * 0.35; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y) }
        ctx.stroke()
        glow(p.x, p.y, R, m.c1, 0.25 * a)
      }
      if (pf) circle(pf, 1.7, m.k * 3)
      if (tip) { line(pts, w * 0.8, m.c1, 0.45 * a); circle(tip, 0.9, -m.k * 5) }
      break
    }
    case 'rush': {
      if (pf) {
        for (let i = 0; i < 26; i++) {
          const t = (i / 26) * Math.PI * 2 + hash01(m.seed + i) * 0.2
          const r0 = px((0.5 + m.k * 1.8) * m.size, pf.d), r1 = r0 + px((0.8 + hash01(m.seed + i * 1.7) * 1.8) * m.size, pf.d)
          ctx.strokeStyle = rgba(i % 3 ? m.c1 : '#ffffff', 0.85 * a * (1 - clamp01(m.k / 0.9) * 0.6)); ctx.lineWidth = Math.max(1.5, w * 0.22)
          ctx.beginPath(); ctx.moveTo(pf.x + Math.cos(t) * r0, pf.y + Math.sin(t) * r0 * 0.7); ctx.lineTo(pf.x + Math.cos(t) * r1, pf.y + Math.sin(t) * r1 * 0.7); ctx.stroke()
        }
      }
      line(pts, w * 2.2, m.c1, 0.35 * a)
      line(pts, w * 0.9, m.c2, 0.8 * a)
      if (tip) glow(tip.x, tip.y, w * 2.4, m.c2, 0.8 * a)
      break
    }
    case 'pulse': {
      if (pf) {
        for (let j = 0; j < 3; j++) {
          const kk = m.k - j * 0.16
          if (kk <= 0) continue
          const R = px((0.5 + kk * 5) * m.size, pf.d)
          ring(pf.x, pf.y, R, 0.42, Math.max(1.5, 6 * (1 - clamp01(kk / 1.2)) * m.size), j % 2 ? m.c1 : m.c2, 0.85 * a * (1 - clamp01(kk / 1.3)))
        }
      }
      line(pts, w * 0.7, m.c1, 0.4 * a)
      if (tip) {
        const R = px(0.7 * m.size, tip.d)
        ring(tip.x, tip.y, R * (1 + 0.2 * Math.sin(m.k * 20)), 1, Math.max(2, R * 0.16), m.c2, 0.9 * a)
        glow(tip.x, tip.y, R * 1.8, m.c1, 0.55 * a)
      }
      break
    }
  }
  // sparks and embers thrown off along the way, flickering
  if (pts.length > 2) {
    const frame = Math.floor(m.k * 24)
    const count = Math.round(26 * m.size)
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(hash01(m.seed + i * 3.1 + frame * 0.7) * pts.length)
      const p = pts[Math.min(pts.length - 1, idx)]
      const sx = p.x + (hash01(m.seed + i * 7.7 + frame) - 0.5) * px(2.4 * m.size, p.d)
      const sy = p.y + (hash01(m.seed + i * 5.3 + frame * 1.3) - 0.5) * px(2.4 * m.size, p.d) - (m.k * 14)
      const sz = Math.max(1.2, px(0.12 + hash01(m.seed + i) * 0.14, p.d))
      comp(m.c2)
      ctx.fillStyle = rgba(i % 3 === 0 ? '#ffffff' : m.c2, 0.85 * a * (1 - idx / (pts.length * 1.4)))
      ctx.beginPath(); ctx.arc(sx, sy, sz, 0, Math.PI * 2); ctx.fill()
    }
  }
  ctx.restore()
}
