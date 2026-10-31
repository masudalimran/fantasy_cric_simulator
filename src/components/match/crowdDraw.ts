import type { StadiumLook } from '../../engine/stadium'
import { ROPE, project, type CamR, type V3 } from './broadcast'

/**
 * The crowd up close, and the sky at night: what the stadium cameras of the cheerleader, stands, card-stunt and fireworks screens look at. Pure drawing on the
 * broadcast view's canvas (the camera reads it, nothing else does), so no result can change.
 */

const hash01 = (n: number) => { const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s) }
const clamp01 = (t: number) => Math.max(0, Math.min(1, t))

/** A point on the slope of the stands: `a` is the angle round the ground, `u` how far up (0 at the boards, 1 at the top). */
export const slopePoint = (a: number, u: number): V3 => {
  const s = 1.03 + 0.31 * u
  return { x: ROPE.cx + Math.cos(a) * ROPE.rx * s, y: 0.9 + 11.1 * u, z: ROPE.cz + Math.sin(a) * ROPE.rz * s }
}

/** A board held up in the crowd: "SIX!", "4", a player's name. */
export interface FanSign { a: number; u: number; text: string; color: string; ink: string }

/** A stand of people doing the card stunt: each holds up a card, and together the cards spell a word. */
export interface CardStunt {
  a0: number; a1: number; u0: number; u1: number
  /** The dots of the word (rows of columns). */
  grid: boolean[][]
  on: string
  off: string
  /** Seconds into the stunt: the cards flip over one after another. */
  t: number
}

/** Part of the stands drawn person by person, close up. */
export interface CrowdClose {
  a0: number; a1: number; u0: number; u1: number
  rows: number; per: number
  /** 0 to 1: how wild they are (sitting and clapping, to on their feet with both arms up). */
  k: number
  seed: number
  signs?: FanSign[]
  cards?: CardStunt
}

/** A glowing spark in the sky: where it is, a short tail behind it, its colour and size (metres). */
export interface Spark { p: V3; tail?: V3; rgb: [number, number, number]; a: number; size: number }

const SKINS = ['#f1c9a5', '#e0ac82', '#c98f66', '#8d5a3b', '#6b4429', '#f5d0b0']
const HAIRS = ['#1b1b2a', '#3b2a1d', '#7a4a2a', '#d94f3d', '#f2c94c', '#0f0b0a']

interface Fan { x: number; y: number; d: number; m: number; i: number; row: number; col: number }

/** Draws the people. `r` is the prepared camera, `tick` real seconds (so they move to the beat), `night` whether phones and flashes light up. */
export function drawCrowdClose(ctx: CanvasRenderingContext2D, r: CamR, W: number, H: number, cr: CrowdClose, look: StadiumLook, tick: number) {
  const palette = [...look.crowd, '#e5e7eb', '#fbbf24', '#94a3b8', '#334155']
  const night = look.time !== 'day'
  const fans: Fan[] = []
  for (let row = 0; row < cr.rows; row++) {
    const u = cr.u0 + (cr.u1 - cr.u0) * ((row + 0.5) / cr.rows)
    for (let col = 0; col < cr.per; col++) {
      const i = row * cr.per + col
      const a = cr.a0 + (cr.a1 - cr.a0) * ((col + 0.5 + (hash01(i * 2.3 + cr.seed) - 0.5) * 0.7) / cr.per)
      const sp = slopePoint(a, u + (hash01(i * 4.1) - 0.5) * 0.01)
      const p = project(r, sp)
      if (!p || p.x < -40 || p.x > W + 40 || p.y < -60 || p.y > H + 120) continue
      fans.push({ x: p.x, y: p.y, d: p.d, m: r.F / p.d, i, row, col })
    }
  }
  fans.sort((p, q) => q.d - p.d) // far to near
  ctx.save()
  for (const f of fans) {
    const h = hash01(f.i * 1.9 + cr.seed)
    const h2 = hash01(f.i * 5.3 + 1)
    const wild = clamp01(cr.k * 1.5 - h2 * 0.5)
    const beat = tick * (5.2 + h * 2.4) + h2 * 9
    const jump = Math.max(0, Math.sin(beat)) * 0.16 * wild * f.m
    const m = f.m
    const shirt = palette[Math.floor(h * 997) % palette.length]
    const skin = SKINS[Math.floor(h2 * 997) % SKINS.length]
    const hair = HAIRS[Math.floor(hash01(f.i * 7.7) * 997) % HAIRS.length]
    const baseY = f.y - jump
    // the body
    ctx.fillStyle = shirt
    const bw = 0.5 * m, bh = 0.58 * m
    ctx.beginPath()
    ctx.roundRect(f.x - bw / 2, baseY - bh, bw, bh, bw * 0.3)
    ctx.fill()
    // the arms: down and clapping when sitting, both up and waving when wild
    if (wild > 0.25 || h > 0.8) {
      const lift = wild > 0.25 ? 1 : 0.55
      const wave = Math.sin(beat * 1.3) * 0.12 * m
      ctx.strokeStyle = skin; ctx.lineWidth = Math.max(1.2, 0.11 * m); ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(f.x - bw * 0.46, baseY - bh * 0.85); ctx.lineTo(f.x - bw * 0.78 + wave, baseY - bh * (0.85 + 0.9 * lift))
      ctx.moveTo(f.x + bw * 0.46, baseY - bh * 0.85); ctx.lineTo(f.x + bw * 0.78 - wave, baseY - bh * (0.85 + 0.9 * lift * (h2 > 0.4 ? 1 : 0.4)))
      ctx.stroke()
    }
    // the head and hair
    const hr = 0.15 * m
    ctx.fillStyle = skin
    ctx.beginPath(); ctx.arc(f.x, baseY - bh - hr * 0.85, hr, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = hair
    ctx.beginPath(); ctx.arc(f.x, baseY - bh - hr * 1.05, hr * 1.02, Math.PI, Math.PI * 2); ctx.fill()
    // a few wave a scarf, and at night some hold up a phone that lights their faces
    if (wild > 0.3 && h > 0.86) {
      ctx.strokeStyle = palette[(f.i * 3) % palette.length]; ctx.lineWidth = Math.max(1.5, 0.12 * m)
      ctx.beginPath(); ctx.moveTo(f.x + bw * 0.75, baseY - bh * 1.8); ctx.quadraticCurveTo(f.x + bw * (1.1 + Math.sin(beat) * 0.4), baseY - bh * 2.2, f.x + bw * (1.5 + Math.sin(beat + 1) * 0.5), baseY - bh * 1.9); ctx.stroke()
    }
    if (night && h2 > 0.93) {
      ctx.fillStyle = Math.sin(beat * 0.7 + f.i) > 0.5 ? '#ffffff' : '#bae6fd'
      ctx.fillRect(f.x - 0.1 * m, baseY - bh * 2.05, 0.2 * m, 0.14 * m)
    }
  }
  ctx.restore()

  // the card stunt: a grid of cards held up, flipping over to show the word. The grid is laid out between the four corners of the block as the camera sees
  // them, so the rows and columns stay straight and the letters can be read.
  if (cr.cards) {
    const cs = cr.cards
    const rows = cs.grid.length, cols = cs.grid[0]?.length ?? 0
    const bl = project(r, slopePoint(cs.a0, cs.u0)), br = project(r, slopePoint(cs.a1, cs.u0)), tl = project(r, slopePoint(cs.a0, cs.u1)), tr = project(r, slopePoint(cs.a1, cs.u1))
    if (bl && br && tl && tr) {
      // the letters face the field: if this side of the stands is seen back to front, read the word the other way round
      const mirror = bl.x > br.x
      const at = (fx: number, fy: number) => {
        const x0 = bl.x + (br.x - bl.x) * fx, x1 = tl.x + (tr.x - tl.x) * fx
        const y0 = bl.y + (br.y - bl.y) * fx, y1 = tl.y + (tr.y - tl.y) * fx
        return { x: x0 + (x1 - x0) * fy, y: y0 + (y1 - y0) * fy }
      }
      const cw = Math.hypot(br.x - bl.x, br.y - bl.y) / cols, chh = Math.hypot(tl.x - bl.x, tl.y - bl.y) / rows
      const size = Math.min(cw, chh * 1.05) * 0.82
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const c = mirror ? cols - 1 - col : col
          const on = cs.grid[rows - 1 - row]?.[c] ?? false // (the top of the word is the top of the stand)
          const p = at((col + 0.5) / cols, (row + 0.5) / rows)
          const start = 0.4 + (col * 0.045 + row * 0.03)
          const k = clamp01((cs.t - start) / 0.3)
          const squash = k < 1 ? Math.abs(Math.cos(Math.PI * k)) : 1
          const face = k < 0.5 ? cs.off : on ? cs.on : cs.off
          const w = size * Math.max(0.12, squash)
          // the person behind the card, then the card in front of the chest
          ctx.fillStyle = '#1e293b'
          ctx.beginPath(); ctx.roundRect(p.x - size * 0.46, p.y + size * 0.1, size * 0.92, size * 0.55, size * 0.12); ctx.fill()
          ctx.fillStyle = SKINS[(row * 7 + col) % SKINS.length]
          ctx.beginPath(); ctx.arc(p.x, p.y - size * 0.62, size * 0.2, 0, Math.PI * 2); ctx.fill()
          ctx.fillStyle = face
          ctx.fillRect(p.x - w / 2, p.y - size * 0.5, w, size)
          ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 0.8; ctx.strokeRect(p.x - w / 2, p.y - size * 0.5, w, size)
        }
      }
    }
  }

  // boards held up high: SIX!, 4, a name
  for (const s of cr.signs ?? []) {
    const sp = slopePoint(s.a, s.u)
    const p = project(r, { x: sp.x, y: sp.y + 1.55, z: sp.z })
    const foot = project(r, sp)
    if (!p || !foot) continue
    const m = r.F / p.d
    const bw = Math.max(0.9, s.text.length * 0.26) * m, bh = 0.78 * m
    const sway = Math.sin(tick * 3 + s.a * 9) * 0.05 * m
    ctx.save()
    ctx.strokeStyle = '#78350f'; ctx.lineWidth = Math.max(1.5, 0.07 * m); ctx.beginPath(); ctx.moveTo(p.x + sway, p.y + bh * 0.5); ctx.lineTo(foot.x, foot.y - 0.6 * m); ctx.stroke()
    ctx.translate(p.x + sway, p.y); ctx.rotate(Math.sin(tick * 2.2 + s.u * 5) * 0.05)
    ctx.fillStyle = s.color; ctx.strokeStyle = '#0f172a'; ctx.lineWidth = Math.max(1.5, 0.06 * m)
    ctx.beginPath(); ctx.roundRect(-bw / 2, -bh / 2, bw, bh, 0.08 * m); ctx.fill(); ctx.stroke()
    ctx.fillStyle = s.ink; ctx.font = `900 ${Math.max(8, 0.6 * m)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(s.text, 0, 0.03 * m, bw * 0.92)
    ctx.restore()
  }
}

/** The fireworks, glowing: drawn with the colours added to what is behind them. */
export function drawSparks(ctx: CanvasRenderingContext2D, r: CamR, sparks: Spark[]) {
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (const s of sparks) {
    const p = project(r, s.p)
    if (!p) continue
    const px = Math.max(1.2, (s.size * r.F) / p.d)
    const col = `${s.rgb[0]},${s.rgb[1]},${s.rgb[2]}`
    if (s.tail) {
      const q = project(r, s.tail)
      if (q) { ctx.strokeStyle = `rgba(${col},${(s.a * 0.55).toFixed(3)})`; ctx.lineWidth = Math.max(1, px * 0.7); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(p.x, p.y); ctx.stroke() }
    }
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, px * 2.4)
    g.addColorStop(0, `rgba(255,255,255,${s.a.toFixed(3)})`)
    g.addColorStop(0.25, `rgba(${col},${(s.a * 0.85).toFixed(3)})`)
    g.addColorStop(1, `rgba(${col},0)`)
    ctx.fillStyle = g
    ctx.beginPath(); ctx.arc(p.x, p.y, px * 2.4, 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()
}

/** One fan's post on the giant screen. */
export interface ScreenPost { name: string; handle: string; side: 0 | 1; text: string; likes: number; shares: number; replies: number; age: string }

/** The stadium's giant screen, up above the stands: the fan wall with the posts coming in. */
export interface BigScreen {
  /** The angle round the ground it hangs at, and how wide it is (half, in radians), and how high it runs (metres). */
  a: number; half: number; y0: number; y1: number
  hashtag: string
  posts: ScreenPost[]
  /** Seconds into the show: the posts come in one after another. */
  t: number
  /** The batting team's two colours. */
  colors: [string, string]
}

/** How far out from the middle the screen hangs (over the back of the stands). */
export const SCREEN_R = 1.3

const kfmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n))

/** Draws the giant screen: a bright panel in a dark frame, glowing on the stands under it, with the fan wall on it. */
export function drawBigScreen(ctx: CanvasRenderingContext2D, r: CamR, bs: BigScreen, tick: number) {
  const pt = (a: number, y: number) => project(r, { x: ROPE.cx + Math.cos(a) * ROPE.rx * SCREEN_R, y, z: ROPE.cz + Math.sin(a) * ROPE.rz * SCREEN_R })
  let pl = pt(bs.a - bs.half, bs.y1), pr = pt(bs.a + bs.half, bs.y1), ql = pt(bs.a - bs.half, bs.y0), qr = pt(bs.a + bs.half, bs.y0)
  if (!pl || !pr || !ql || !qr) return
  // the panel is seen from the field, so its left is whichever side of the picture that is
  if (pl.x > pr.x) { [pl, pr] = [pr, pl]; [ql, qr] = [qr, ql] }
  const VW = 480, VH = 460
  // the frame and the glow
  const grow = (a: { x: number; y: number }, b: { x: number; y: number }, k: number) => ({ x: a.x + (a.x - b.x) * k, y: a.y + (a.y - b.y) * k })
  const f = [grow(pl, qr, 0.05), grow(pr, ql, 0.05), grow(qr, pl, 0.05), grow(ql, pr, 0.05)]
  ctx.save()
  ctx.shadowColor = 'rgba(147,197,253,0.75)'; ctx.shadowBlur = 50
  ctx.fillStyle = '#0b1220'
  ctx.beginPath(); ctx.moveTo(f[0].x, f[0].y); ctx.lineTo(f[1].x, f[1].y); ctx.lineTo(f[2].x, f[2].y); ctx.lineTo(f[3].x, f[3].y); ctx.closePath(); ctx.fill()
  ctx.restore()
  // the picture, drawn on a flat 480 x 380 page stretched onto the four corners
  const ex = { x: (pr.x - pl.x) / VW, y: (pr.y - pl.y) / VW }, ey = { x: (ql.x - pl.x) / VH, y: (ql.y - pl.y) / VH }
  ctx.save()
  ctx.transform(ex.x, ex.y, ey.x, ey.y, pl.x, pl.y)
  ctx.beginPath(); ctx.rect(0, 0, VW, VH); ctx.clip()
  const bg = ctx.createLinearGradient(0, 0, 0, VH)
  bg.addColorStop(0, '#0f1b36'); bg.addColorStop(1, '#070d1c')
  ctx.fillStyle = bg; ctx.fillRect(0, 0, VW, VH)
  // the header: the hashtag and a LIVE light
  const hg = ctx.createLinearGradient(0, 0, VW, 0)
  hg.addColorStop(0, bs.colors[0]); hg.addColorStop(1, '#1e3a8a')
  ctx.fillStyle = hg; ctx.fillRect(0, 0, VW, 64)
  ctx.fillStyle = '#ffffff'; ctx.font = '900 34px sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'
  ctx.fillText(`#${bs.hashtag}`, 18, 33)
  ctx.fillStyle = Math.sin(tick * 5) > 0 ? '#ef4444' : '#7f1d1d'
  ctx.beginPath(); ctx.arc(VW - 92, 33, 9, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#ffffff'; ctx.font = '800 24px sans-serif'; ctx.fillText('LIVE', VW - 76, 34)
  // the posts, coming in one after another
  const posts = bs.posts.slice(0, 3)
  const card = 120
  posts.forEach((po, i) => {
    const k = Math.max(0, Math.min(1, (bs.t - (0.9 + i * 1.15)) / 0.5))
    if (k <= 0) return
    const y = 76 + i * (card + 6) + (1 - k) * 36
    ctx.globalAlpha = k
    ctx.fillStyle = 'rgba(255,255,255,0.08)'
    ctx.beginPath(); ctx.roundRect(10, y, VW - 20, card, 14); ctx.fill()
    // the picture: a coloured circle with the first letter
    ctx.fillStyle = po.side === 0 ? bs.colors[0] : '#475569'
    ctx.beginPath(); ctx.arc(46, y + 36, 26, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#ffffff'; ctx.font = '900 28px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(po.name.charAt(0).toUpperCase(), 46, y + 38)
    ctx.textAlign = 'left'
    ctx.fillStyle = '#93c5fd'; ctx.font = '800 23px sans-serif'; ctx.fillText(po.handle, 84, y + 22)
    ctx.fillStyle = '#94a3b8'; ctx.font = '600 18px sans-serif'; ctx.fillText(po.age, VW - 92, y + 22)
    // the words, on up to two lines
    ctx.fillStyle = '#f8fafc'; ctx.font = '700 25px sans-serif'
    const words = po.text.split(' ')
    const lines: string[] = []
    let cur = ''
    for (const w of words) { const t = cur ? `${cur} ${w}` : w; if (ctx.measureText(t).width > VW - 110 && cur) { lines.push(cur); cur = w } else cur = t }
    if (cur) lines.push(cur)
    lines.slice(0, 2).forEach((ln, j) => ctx.fillText(ln, 84, y + 50 + j * 27, VW - 104))
    // the counts grow as the post is seen
    ctx.fillStyle = '#f472b6'; ctx.font = '700 18px sans-serif'
    ctx.fillText(`\u2665 ${kfmt(Math.round(po.likes * k))}   \u21bb ${kfmt(Math.round(po.shares * k))}`, 84, y + card - 11)
    ctx.globalAlpha = 1
  })
  ctx.restore()
}
