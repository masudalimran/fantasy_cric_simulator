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
  /** How the whole crowd feels: cheering (the default, by `k`), or groaning with their hands on their heads. */
  mood?: 'groan'
  /** A ball coming down among them: the fans round the spot reach for it (a fan takes it in both hands, or they all duck as it crashes into the seats). */
  fanReact?: { a: number; u: number; t0: number; caught: boolean }
  /** Umbrellas held up over this share of the fans (0 to 1). */
  umbrellas?: number
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
    let jump = Math.max(0, Math.sin(beat)) * 0.16 * wild * f.m
    // a fan close to where the ball comes down: arms up for it, then a catch or a duck
    let react: 'reach' | 'catch' | 'duck' | null = null
    let catcher = false
    if (cr.fanReact) {
      const fr = cr.fanReact
      const aDiff = Math.abs((cr.a0 + (cr.a1 - cr.a0) * ((f.col + 0.5) / cr.per)) - fr.a), uDiff = Math.abs(cr.u0 + (cr.u1 - cr.u0) * ((f.row + 0.5) / cr.rows) - fr.u)
      const near = Math.hypot(aDiff / 0.011, uDiff / 0.055)
      if (near < 2.4 && tick >= fr.t0 - 0.7) {
        react = fr.caught ? (tick >= fr.t0 ? 'catch' : 'reach') : (tick >= fr.t0 - 0.15 ? 'duck' : 'reach')
        catcher = fr.caught && near < 0.6
        if (react === 'catch') jump = Math.max(jump, Math.abs(Math.sin((tick - fr.t0) * 7)) * 0.22 * f.m)
      }
    }
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
    // the arms: down and clapping when sitting, both up and waving when wild; hands on the head when the crowd groans, or the reaction to the ball
    if (react === 'duck') {
      ctx.strokeStyle = skin; ctx.lineWidth = Math.max(1.2, 0.11 * m); ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(f.x - bw * 0.46, baseY - bh * 0.85); ctx.lineTo(f.x - bw * 0.2, baseY - bh * 1.25)
      ctx.moveTo(f.x + bw * 0.46, baseY - bh * 0.85); ctx.lineTo(f.x + bw * 0.2, baseY - bh * 1.25)
      ctx.stroke()
    } else if (react === 'reach' || react === 'catch') {
      ctx.strokeStyle = skin; ctx.lineWidth = Math.max(1.2, 0.12 * m); ctx.lineCap = 'round'
      const tilt = react === 'catch' ? 0.1 : 0.3
      ctx.beginPath()
      ctx.moveTo(f.x - bw * 0.46, baseY - bh * 0.85); ctx.lineTo(f.x - bw * tilt, baseY - bh * 2.05)
      ctx.moveTo(f.x + bw * 0.46, baseY - bh * 0.85); ctx.lineTo(f.x + bw * tilt, baseY - bh * 2.05)
      ctx.stroke()
      if (catcher && react === 'catch') { ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.arc(f.x, baseY - bh * 2.2, Math.max(2, 0.13 * m), 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#fecaca'; ctx.lineWidth = 1; ctx.stroke() }
    } else if (cr.mood === 'groan') {
      ctx.strokeStyle = skin; ctx.lineWidth = Math.max(1.2, 0.11 * m); ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(f.x - bw * 0.46, baseY - bh * 0.85); ctx.lineTo(f.x - bw * 0.62, baseY - bh * 1.5); ctx.lineTo(f.x - bw * 0.2, baseY - bh * 1.6)
      ctx.moveTo(f.x + bw * 0.46, baseY - bh * 0.85); ctx.lineTo(f.x + bw * 0.62, baseY - bh * 1.5); ctx.lineTo(f.x + bw * 0.2, baseY - bh * 1.6)
      ctx.stroke()
    } else if (wild > 0.25 || h > 0.8) {
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
    // umbrellas in the rain
    if (cr.umbrellas && h2 < cr.umbrellas) {
      const ucol = ['#ef4444', '#3b82f6', '#fde047', '#22c55e', '#f8fafc', '#a855f7'][Math.floor(h * 997) % 6]
      ctx.fillStyle = ucol
      ctx.beginPath(); ctx.arc(f.x, baseY - bh - hr * 2.4, hr * 3.2, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = Math.max(0.8, 0.02 * m); ctx.beginPath(); ctx.moveTo(f.x, baseY - bh - hr * 2.4); ctx.lineTo(f.x, baseY - bh - hr * 0.8); ctx.stroke()
    }
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

/** A review on the giant screen: where the ball pitched, hit the pad and was going (across the pitch, -1 leg to 1 off), or the sound graph, and the verdict. */
export interface ReviewBoard {
  kind: 'track' | 'edge'
  pitchX: number; impactX: number; stumpsX: number
  pitching: string; impact: string; wickets: string
  /** The decision after the review, and whether it was changed. */
  out: boolean
  overturned: boolean
  /** Who asked (the line under the title). */
  by: string
}

/** What a notice on the giant screen says: a title, a line under it, rows of facts that come in one by one, and perhaps one big figure. */
export interface BoardInfo {
  title: string
  sub?: string
  rows: { label: string; value: string }[]
  /** A big figure under the title (a score, a count down). */
  big?: string
}

/** The stadium's giant screen, up above the stands: the fan wall with the posts coming in, or a notice. */
export interface BigScreen {
  /** The angle round the ground it hangs at, and how wide it is (half, in radians), and how high it runs (metres). */
  a: number; half: number; y0: number; y1: number
  hashtag: string
  posts: ScreenPost[]
  /** A notice instead of the fan wall (the timeout, the super over, the studio). */
  board?: BoardInfo
  /** A review: the ball tracking (or the sound graph) and the verdict. */
  review?: ReviewBoard
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
  if (bs.review) { drawReview(ctx, bs, bs.review, VW); ctx.restore(); return }
  if (bs.board) { drawBoard(ctx, bs, VW, tick); ctx.restore(); return }
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


/** The notice on the giant screen: the title in the team's colour, a line under it, and the facts coming in one after another. */
function drawBoard(ctx: CanvasRenderingContext2D, bs: BigScreen, VW: number, tick: number) {
  const b = bs.board as BoardInfo
  const hg = ctx.createLinearGradient(0, 0, VW, 0)
  hg.addColorStop(0, bs.colors[0]); hg.addColorStop(1, '#1e3a8a')
  ctx.fillStyle = hg; ctx.fillRect(0, 0, VW, 96)
  ctx.fillStyle = '#ffffff'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center'
  ctx.font = '900 44px sans-serif'; ctx.fillText(b.title, VW / 2, 50, VW - 30)
  ctx.fillStyle = Math.sin(tick * 5) > 0 ? '#ef4444' : '#7f1d1d'
  ctx.beginPath(); ctx.arc(26, 26, 8, 0, Math.PI * 2); ctx.fill()
  if (b.sub) { ctx.fillStyle = '#bfdbfe'; ctx.font = '700 28px sans-serif'; ctx.fillText(b.sub, VW / 2, 128, VW - 30) }
  let y = b.sub ? 160 : 130
  if (b.big) {
    const k = Math.max(0, Math.min(1, (bs.t - 0.8) / 0.5))
    ctx.globalAlpha = k
    ctx.fillStyle = '#ffffff'; ctx.font = `900 ${Math.round(84 + (1 - k) * 30)}px sans-serif`; ctx.fillText(b.big, VW / 2, y + 52, VW - 30)
    ctx.globalAlpha = 1
    y += 116
  }
  b.rows.slice(0, 4).forEach((row, i) => {
    const k = Math.max(0, Math.min(1, (bs.t - (1.4 + i * 0.7)) / 0.4))
    if (k <= 0) return
    const yy = y + i * 62 + (1 - k) * 24
    ctx.globalAlpha = k
    ctx.fillStyle = 'rgba(255,255,255,0.09)'
    ctx.beginPath(); ctx.roundRect(16, yy, VW - 32, 54, 12); ctx.fill()
    ctx.textAlign = 'left'; ctx.fillStyle = '#cbd5e1'; ctx.font = '700 25px sans-serif'; ctx.fillText(row.label, 32, yy + 29, 230)
    ctx.textAlign = 'right'; ctx.fillStyle = '#ffffff'; ctx.font = '900 30px sans-serif'; ctx.fillText(row.value, VW - 32, yy + 29, 220)
    ctx.globalAlpha = 1
  })
}

/** A piece of confetti: where it is, how it is turned, its colour and size (metres). */
export interface Confetti { p: V3; rot: number; rgb: [number, number, number]; size: number }

/** Paper confetti, small coloured rectangles turning as they fall. */
export function drawConfetti(ctx: CanvasRenderingContext2D, r: CamR, pieces: Confetti[]) {
  ctx.save()
  for (const c of pieces) {
    const p = project(r, c.p)
    if (!p) continue
    const px = Math.max(1.6, (c.size * r.F) / p.d)
    ctx.fillStyle = `rgb(${c.rgb[0]},${c.rgb[1]},${c.rgb[2]})`
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(c.rot); ctx.scale(1, 0.45 + 0.55 * Math.abs(Math.cos(c.rot * 2.3)))
    ctx.fillRect(-px / 2, -px / 4, px, px / 2)
    ctx.restore()
  }
  ctx.restore()
}

/** The ball (and a short streak behind it), for the six that comes down in the stands. */
export interface Ball3 { p: V3; tail?: V3; size: number }
export function drawBall3(ctx: CanvasRenderingContext2D, r: CamR, b: Ball3) {
  const p = project(r, b.p)
  if (!p) return
  const px = Math.max(3, (b.size * r.F) / p.d)
  if (b.tail) {
    const q = project(r, b.tail)
    if (q) { ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = Math.max(1.5, px * 0.55); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(p.x, p.y); ctx.stroke(); ctx.restore() }
  }
  ctx.save()
  const g = ctx.createRadialGradient(p.x - px * 0.3, p.y - px * 0.3, px * 0.1, p.x, p.y, px)
  g.addColorStop(0, '#fecaca'); g.addColorStop(0.4, '#dc2626'); g.addColorStop(1, '#7f1d1d')
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, px, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = Math.max(0.8, px * 0.12); ctx.beginPath(); ctx.arc(p.x, p.y, px * 0.78, -0.6, 0.9); ctx.stroke()
  ctx.restore()
}


const REVIEW_T = { check: 2.0, path: 3.4, verdict: 6.4 }
/** When the verdict is shown on the giant screen (seconds into the show), for the crowd's reaction. */
export const REVIEW_VERDICT_AT = REVIEW_T.verdict

/** The ball tracking drawn on the giant screen: the pitch from behind, the ball's path down to the bounce and the pad, its projection to the stumps, then the verdict. */
function drawReview(ctx: CanvasRenderingContext2D, bs: BigScreen, rv: ReviewBoard, VW: number) {
  const t = bs.t
  const hg = ctx.createLinearGradient(0, 0, VW, 0)
  hg.addColorStop(0, '#0e7490'); hg.addColorStop(1, '#1e3a8a')
  ctx.fillStyle = hg; ctx.fillRect(0, 0, VW, 64)
  ctx.fillStyle = '#ffffff'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center'; ctx.font = '900 32px sans-serif'
  ctx.fillText(rv.kind === 'edge' ? 'SNICKO' : 'BALL TRACKING', VW / 2, 33, VW - 30)
  if (t < REVIEW_T.check) {
    // the T signal and "checking"
    ctx.fillStyle = '#fbbf24'; ctx.font = '900 150px sans-serif'; ctx.fillText('T', VW / 2, 190)
    ctx.fillStyle = '#fff'; ctx.font = '900 44px sans-serif'; ctx.fillText('REVIEW!', VW / 2, 300)
    ctx.fillStyle = '#bfdbfe'; ctx.font = '700 26px sans-serif'; ctx.fillText(`${rv.by} asks for a review`, VW / 2, 350, VW - 30)
    return
  }
  const k = Math.max(0, Math.min(1, (t - REVIEW_T.check) / (REVIEW_T.path - REVIEW_T.check + 1.4)))
  if (rv.kind === 'edge') {
    // the sound graph: a flat line with a spike where the ball passes the bat (or none)
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(20, 250); ctx.lineTo(VW - 20, 250); ctx.stroke()
    ctx.strokeStyle = '#34d399'; ctx.lineWidth = 3.5; ctx.beginPath()
    const upto = 20 + (VW - 40) * k
    for (let x = 20; x <= upto; x += 3) {
      const near = Math.abs(x - 300), spike = rv.out ? Math.max(0, 110 - near * 3.2) * Math.sin(x * 1.9) : 0
      ctx.lineTo(x, 250 + Math.sin(x * 0.9) * 3 + spike)
    }
    ctx.stroke()
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(upto, 120); ctx.lineTo(upto, 380); ctx.stroke()
    ctx.fillStyle = '#cbd5e1'; ctx.font = '700 24px sans-serif'; ctx.fillText(rv.out ? 'A spike as the ball passes the bat' : 'No spike: flat as it passes', VW / 2, 410, VW - 30)
  } else {
    // the pitch from behind the bowler: it narrows away from the camera
    const half = (y: number) => 30 + ((y - 90) / 330) * 120
    const X = (x: number, y: number) => VW / 2 + x * half(y) * 1.1
    ctx.fillStyle = '#7c5f35'; ctx.beginPath(); ctx.moveTo(VW / 2 - half(420), 420); ctx.lineTo(VW / 2 + half(420), 420); ctx.lineTo(VW / 2 + half(90), 90); ctx.lineTo(VW / 2 - half(90), 90); ctx.closePath(); ctx.fill()
    // the stumps and the zone round them
    ctx.fillStyle = rv.wickets.startsWith('Hitting') ? 'rgba(239,68,68,0.35)' : 'rgba(255,255,255,0.12)'
    ctx.fillRect(X(-0.18, 100), 78, X(0.18, 100) - X(-0.18, 100), 46)
    ctx.strokeStyle = '#fef3c7'; ctx.lineWidth = 3; for (const x of [-0.12, 0, 0.12]) { ctx.beginPath(); ctx.moveTo(X(x, 100), 84); ctx.lineTo(X(x, 100), 124); ctx.stroke() }
    const P = { x: X(rv.pitchX, 250), y: 250 }, I = { x: X(rv.impactX, 150), y: 150 }, S = { x: X(rv.stumpsX, 106), y: 106 }, H = { x: X(rv.pitchX * 0.5, 400), y: 400 }
    const seg = (a: { x: number; y: number }, b: { x: number; y: number }, c: string, dash: number[], from: number, to: number) => {
      const u = Math.max(0, Math.min(1, (k - from) / (to - from)))
      if (u <= 0) return
      ctx.strokeStyle = c; ctx.lineWidth = 5; ctx.setLineDash(dash); ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u); ctx.stroke(); ctx.setLineDash([])
    }
    seg(H, P, '#fbbf24', [], 0, 0.4)
    seg(P, I, '#fb923c', [], 0.4, 0.7)
    seg(I, S, rv.wickets.startsWith('Hitting') ? '#ef4444' : '#94a3b8', [10, 8], 0.7, 1)
    const col = (v: string) => (v === 'In line' || v === 'Hitting' ? '#34d399' : v.includes("umpire's call") ? '#fb923c' : '#f87171')
    const dot = (p: { x: number; y: number }, c: string, from: number) => { if (k < from) return; ctx.fillStyle = c; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke() }
    dot(P, col(rv.pitching), 0.4); dot(I, col(rv.impact), 0.7); dot(S, col(rv.wickets), 0.98)
    // the three readings
    ;(['Pitching', 'Impact', 'Wickets'] as const).forEach((label, i) => {
      const val = [rv.pitching, rv.impact, rv.wickets][i]
      if (t < REVIEW_T.path + i * 0.5) return
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.beginPath(); ctx.roundRect(14 + i * 150, 436, 142, 16 + 0, 6); ctx.fill()
      ctx.textAlign = 'left'; ctx.fillStyle = '#94a3b8'; ctx.font = '700 15px sans-serif'; ctx.fillText(label.toUpperCase(), 22 + i * 150, 444)
      ctx.fillStyle = col(val); ctx.font = '800 15px sans-serif'; ctx.textAlign = 'right'; ctx.fillText(val, 148 + i * 150, 444, 82)
      ctx.textAlign = 'center'
    })
  }
  if (t >= REVIEW_T.verdict) {
    const u = Math.max(0, Math.min(1, (t - REVIEW_T.verdict) / 0.4))
    ctx.globalAlpha = u
    ctx.fillStyle = 'rgba(0,0,0,0.62)'; ctx.fillRect(0, 150, VW, 150)
    ctx.fillStyle = rv.out ? '#f87171' : '#34d399'; ctx.font = `900 ${Math.round(110 - 22 * u)}px sans-serif`; ctx.textAlign = 'center'
    ctx.fillText(rv.out ? 'OUT' : 'NOT OUT', VW / 2, 222, VW - 30)
    ctx.fillStyle = '#e2e8f0'; ctx.font = '700 24px sans-serif'
    ctx.fillText(rv.overturned ? 'The decision is overturned' : 'The decision stands', VW / 2, 280, VW - 30)
    ctx.globalAlpha = 1
  }
}

/** The presentation stage in the middle of the ground: a low platform with the backdrop behind it (z grows away from the bowler's end, towards the far stand). */
export const STAGE = { x0: -5, x1: 5, z0: -9.4, z1: -6.2, h: 0.45, back: -6.0, top: 3.7 }

export interface StageDraw { colors: [string, string]; title: string; sub: string }

/** Draws the stage: the platform (front and top) and the backdrop with the title, in the team's colours, lit like a TV set. */
export function drawStage(ctx: CanvasRenderingContext2D, r: CamR, st: StageDraw) {
  const poly = (pts: V3[], fill: string) => {
    const q = pts.map((p) => project(r, p))
    if (q.some((p) => !p)) return
    ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(q[0]!.x, q[0]!.y); for (let i = 1; i < q.length; i++) ctx.lineTo(q[i]!.x, q[i]!.y); ctx.closePath(); ctx.fill()
  }
  const { x0, x1, z0, z1, h, back, top } = STAGE
  // the backdrop: a tall panel standing behind the stage, drawn on a flat page and stretched onto its four corners
  const bl = project(r, { x: x0, y: h, z: back }), br = project(r, { x: x1, y: h, z: back }), tl = project(r, { x: x0, y: top, z: back }), tr = project(r, { x: x1, y: top, z: back })
  if (bl && br && tl && tr) {
    const VW = 640, VH = 230
    ctx.save()
    ctx.shadowColor = 'rgba(147,197,253,0.6)'; ctx.shadowBlur = 40
    ctx.fillStyle = '#0b1220'; ctx.beginPath(); ctx.moveTo(tl.x, tl.y); ctx.lineTo(tr.x, tr.y); ctx.lineTo(br.x, br.y); ctx.lineTo(bl.x, bl.y); ctx.closePath(); ctx.fill()
    ctx.restore()
    ctx.save()
    ctx.transform((tr.x - tl.x) / VW, (tr.y - tl.y) / VW, (bl.x - tl.x) / VH, (bl.y - tl.y) / VH, tl.x, tl.y)
    ctx.beginPath(); ctx.rect(0, 0, VW, VH); ctx.clip()
    const g = ctx.createLinearGradient(0, 0, VW, VH)
    g.addColorStop(0, st.colors[0]); g.addColorStop(1, '#1e3a8a')
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH)
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; for (let i = -2; i < 8; i++) { ctx.beginPath(); ctx.moveTo(i * 110, VH); ctx.lineTo(i * 110 + 90, 0); ctx.lineTo(i * 110 + 130, 0); ctx.lineTo(i * 110 + 40, VH); ctx.closePath(); ctx.fill() }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'
    ctx.font = '900 54px sans-serif'; ctx.fillText(st.title, VW / 2, 78, VW - 60)
    ctx.fillStyle = '#fde68a'; ctx.font = '800 30px sans-serif'; ctx.fillText(st.sub, VW / 2, 140, VW - 60)
    ctx.restore()
  }
  // the platform
  poly([{ x: x0, y: 0, z: z0 }, { x: x1, y: 0, z: z0 }, { x: x1, y: h, z: z0 }, { x: x0, y: h, z: z0 }], '#1e293b')
  poly([{ x: x0, y: h, z: z0 }, { x: x1, y: h, z: z0 }, { x: x1, y: h, z: z1 }, { x: x0, y: h, z: z1 }], '#475569')
  // the microphone stand
  const m0 = project(r, { x: 0.15, y: h, z: -7.9 }), m1 = project(r, { x: 0.15, y: h + 1.45, z: -7.9 })
  if (m0 && m1) { ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = Math.max(1.5, (r.F * 0.05) / m0.d); ctx.beginPath(); ctx.moveTo(m0.x, m0.y); ctx.lineTo(m1.x, m1.y); ctx.stroke(); ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(m1.x, m1.y, Math.max(2.5, (r.F * 0.09) / m1.d), 0, Math.PI * 2); ctx.fill() }
}
