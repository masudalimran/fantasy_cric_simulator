import { pitchColors, type PitchKind } from '../../engine/pitchInfo'
import { shade, type StadiumLook } from '../../engine/stadium'
import { BOWL_Z, ROPE, project, projectPoly, prep, toCam, type Cam, type V3 } from './broadcast'
import { drawMove, type MoveDraw } from './moveFx'

/** Paints the ground, stands, pitch and stumps of the broadcast view onto a canvas. Pure drawing: it reads the camera and nothing else. */

const hash01 = (n: number) => { const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s) }
const SECTORS = 64
const ringPoint = (a: number, s: number, y = 0): V3 => ({ x: ROPE.cx + Math.cos(a) * ROPE.rx * s, y, z: ROPE.cz + Math.sin(a) * ROPE.rz * s })

/** Fixed crowd members on the slope of the stands: where in the sector, how high up, which colour. */
const CROWD = Array.from({ length: SECTORS * 7 }, (_, i) => ({ sector: Math.floor(i / 7), u: hash01(i * 1.7), v: hash01(i * 3.3), c: Math.floor(hash01(i * 5.1) * 100) }))

export interface Scene {
  pitch: PitchKind
  /** The home ground's look: stands, boards, crowd, time of day and weather. */
  look: StadiumLook
  /** Seconds into the clip, so the rain falls and the crowd jumps. */
  tick: number
  /** 0 to 1: how much the crowd is on its feet (a boundary, a wicket). */
  cheer: number
  /** How worn the pitch is (0 to 1): footmarks and rough patches build up. */
  wear: number
  /** A boundary: the boards where the ball went light up with FOUR or SIX. */
  board: { a: number; text: string; k: number } | null
  /** The covers are on the pitch (rain stopped play, or a washed-out day). */
  covers: boolean
  /** 0 to 1: how far the batsman's stumps have been knocked over. */
  stumps: number
  /** The same for the stumps at the bowler's end (a run out there). */
  stumpsBowl: number
  /** The ball's last few places, oldest first, for the trail; and whether it is a fireball or a snowball. */
  trail: V3[]
  style: 'plain' | 'fire' | 'ice' | 'dragon'
  /** A signature move going on (a six off the bat, a bowler's wicket). */
  move?: MoveDraw | null
  /** TV graphics on the ground for a replay: the wide line, or the popping crease with how far over the front foot landed. */
  marks?: { wideLine?: number; crease?: { z: number; over: number }; /** The path the ball took in the air and off the pitch (orange), and the straight line it would have taken (white, dashed). */ trace?: { curve: V3[]; straight: [V3, V3] } }
}

const fillPoly = (ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[], fill: string) => {
  if (pts.length < 3) return
  ctx.beginPath()
  ctx.moveTo(pts[0].x, pts[0].y)
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
}

export function drawScene(ctx: CanvasRenderingContext2D, cam: Cam, W: number, H: number, sc: Scene) {
  const r = prep(cam, W, H)
  const colors = pitchColors(sc.pitch)

  const L = sc.look
  const grey = L.weather === 'overcast' || L.rain > 0 || L.weather === 'bad light'
  // the sky: blue by day, orange at dusk, black under the lights, and grey when it is overcast or wet
  const g = ctx.createLinearGradient(0, 0, 0, H)
  const sky = L.time === 'day' ? (grey ? ['#64748b', '#94a3b8'] : ['#38bdf8', '#bae6fd']) : L.time === 'dusk' ? (grey ? ['#475569', '#7c6f7f'] : ['#312e81', '#f59e0b']) : ['#05080f', '#101a30']
  g.addColorStop(0, sky[0]); g.addColorStop(0.55, sky[1]); g.addColorStop(1, '#0b3a22')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  const lift = L.time === 'day' ? (grey ? 0.1 : 0.26) : L.time === 'dusk' ? 0.1 : 0

  // the stands, far to near
  const sectors = Array.from({ length: SECTORS }, (_, i) => {
    const a0 = (i / SECTORS) * Math.PI * 2, a1 = ((i + 1) / SECTORS) * Math.PI * 2
    const mid = toCam(r, ringPoint((a0 + a1) / 2, 1.1, 4))
    return { i, a0, a1, d: mid.z }
  }).filter((s) => s.d > 0.5).sort((a, b) => b.d - a.d)
  for (const s of sectors) {
    const slope = projectPoly(r, [ringPoint(s.a0, 1.03, 0.9), ringPoint(s.a1, 1.03, 0.9), ringPoint(s.a1, 1.34, 12), ringPoint(s.a0, 1.34, 12)])
    fillPoly(ctx, slope, shade(s.i % 2 ? L.stand[0] : L.stand[1], lift))
    const board = projectPoly(r, [ringPoint(s.a0, 1.03, 0), ringPoint(s.a1, 1.03, 0), ringPoint(s.a1, 1.03, 0.9), ringPoint(s.a0, 1.03, 0.9)])
    // the boards where the ball crossed the rope flash bright
    let flash = 0
    if (sc.board) { const mid = (s.a0 + s.a1) / 2; let d = Math.abs(mid - sc.board.a) % (Math.PI * 2); if (d > Math.PI) d = Math.PI * 2 - d; flash = d < 0.55 ? (1 - d / 0.55) * sc.board.k * (0.65 + 0.35 * Math.sin(sc.tick * 18)) : 0 }
    fillPoly(ctx, board, flash > 0.05 ? `rgba(${255},${Math.round(215 + 40 * flash)},${Math.round(60 + 160 * flash)},${0.55 + 0.45 * flash})` : s.i % 3 === 0 ? '#e5e7eb' : s.i % 2 ? L.board[0] : L.board[1])
  }
  const palette = [...L.crowd, '#0f172a']
  for (const c of CROWD) {
    const a = ((c.sector + c.u) / SECTORS) * Math.PI * 2
    const p = project(r, ringPoint(a, 1.06 + c.v * 0.26, 1.2 + c.v * 10))
    if (!p) continue
    const size = Math.max(1.2, (r.F * 0.2) / p.d)
    ctx.fillStyle = palette[c.c % palette.length]
    ctx.globalAlpha = 0.8
    const jump = sc.cheer > 0 ? Math.abs(Math.sin(sc.tick * 14 + c.c)) * sc.cheer * size * 1.8 : 0
    ctx.fillRect(p.x - size / 2, p.y - size / 2 - jump, size, size * 1.3)
  }
  ctx.globalAlpha = 1

  // the grass: the ground ellipse, then mowing bands along the pitch
  const ground: V3[] = Array.from({ length: 72 }, (_, i) => ringPoint((i / 72) * Math.PI * 2, 1))
  const gp = projectPoly(r, ground)
  fillPoly(ctx, gp, colors.grass[0])
  if (gp.length > 2) {
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(gp[0].x, gp[0].y)
    for (let i = 1; i < gp.length; i++) ctx.lineTo(gp[i].x, gp[i].y)
    ctx.closePath()
    ctx.clip()
    for (let k = -12; k <= 12; k++) {
      if (k % 2) continue
      fillPoly(ctx, projectPoly(r, [{ x: k * 4, y: 0, z: -80 }, { x: k * 4 + 4, y: 0, z: -80 }, { x: k * 4 + 4, y: 0, z: 60 }, { x: k * 4, y: 0, z: 60 }]), colors.grass[1])
    }
    ctx.restore()
  }
  // the word on the boards where the ball went
  if (sc.board && sc.board.k > 0.2) {
    const p = project(r, ringPoint(sc.board.a, 1.12, 3.2))
    if (p) {
      const px = Math.max(12, Math.min(46, (r.F * 1.5) / p.d))
      ctx.save(); ctx.font = `900 ${px}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.lineWidth = Math.max(2, px / 7); ctx.strokeStyle = '#05070d'; ctx.strokeText(sc.board.text, p.x, p.y)
      ctx.fillStyle = `rgba(255,255,255,${Math.min(1, sc.board.k + 0.2)})`; ctx.fillText(sc.board.text, p.x, p.y); ctx.restore()
    }
  }
  // floodlights: a glow on each of four towers when the lights are on
  if (L.lights) {
    for (let k = 0; k < 4; k++) {
      const a = Math.PI / 4 + (k * Math.PI) / 2
      const p = project(r, ringPoint(a, 1.3, 26))
      if (!p) continue
      const rad = Math.max(14, (r.F * 14) / p.d)
      const lg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad)
      lg.addColorStop(0, 'rgba(255,250,220,0.95)'); lg.addColorStop(0.25, 'rgba(255,244,200,0.5)'); lg.addColorStop(1, 'rgba(255,244,200,0)')
      ctx.fillStyle = lg
      ctx.fillRect(p.x - rad, p.y - rad, rad * 2, rad * 2)
    }
  }
  // the rope
  ctx.strokeStyle = '#f8fafc'
  ctx.lineWidth = Math.max(1.5, r.F * 0.12 / 40)
  ctx.globalAlpha = 0.9
  const rope = projectPoly(r, ground)
  if (rope.length > 2) { ctx.beginPath(); ctx.moveTo(rope[0].x, rope[0].y); for (let i = 1; i < rope.length; i++) ctx.lineTo(rope[i].x, rope[i].y); ctx.closePath(); ctx.stroke() }
  ctx.globalAlpha = 1

  // wet grass: a sheen on the outfield and a few puddles
  if (L.rain > 0 && gp.length > 2) {
    ctx.save()
    ctx.beginPath(); ctx.moveTo(gp[0].x, gp[0].y); for (let i = 1; i < gp.length; i++) ctx.lineTo(gp[i].x, gp[i].y); ctx.closePath(); ctx.clip()
    for (let k = -8; k <= 8; k++) fillPoly(ctx, projectPoly(r, [{ x: k * 6, y: 0, z: -80 }, { x: k * 6 + 2.2, y: 0, z: -80 }, { x: k * 6 + 2.2, y: 0, z: 60 }, { x: k * 6, y: 0, z: 60 }]), `rgba(220,235,255,${0.05 * L.rain})`)
    for (let i = 0; i < 7; i++) {
      const c = projectPoly(r, Array.from({ length: 10 }, (_, j) => ({ x: -34 + hash01(i * 3.7) * 68 + Math.cos((j / 10) * Math.PI * 2) * (2.6 + hash01(i) * 2), y: 0, z: -34 + hash01(i * 5.9) * 52 + Math.sin((j / 10) * Math.PI * 2) * 1.4 })))
      fillPoly(ctx, c, 'rgba(186,215,245,0.22)')
    }
    ctx.restore()
  }
  // the pitch strip, with its creases
  fillPoly(ctx, projectPoly(r, [{ x: -1.53, y: 0, z: BOWL_Z - 2 }, { x: 1.53, y: 0, z: BOWL_Z - 2 }, { x: 1.53, y: 0, z: 2 }, { x: -1.53, y: 0, z: 2 }]), colors.strip[1])
  // wear: footmarks and rough patches where the bowlers land, more of them as the match goes on (a Test builds it up over five days)
  if (sc.wear > 0.03) {
    const n = Math.floor(sc.wear * 16)
    for (let i = 0; i < n; i++) {
      const bowlEnd = i % 2 === 0
      const cx = (hash01(i * 2.9) - 0.5) * 2.3
      const cz = bowlEnd ? BOWL_Z + 1.4 + hash01(i * 4.1) * 1.8 : -2.8 - hash01(i * 6.3) * 6
      const w = 0.28 + hash01(i * 1.3) * 0.34
      const patch = projectPoly(r, Array.from({ length: 8 }, (_, j) => ({ x: cx + Math.cos((j / 8) * Math.PI * 2) * w, y: 0.01, z: cz + Math.sin((j / 8) * Math.PI * 2) * w * 1.7 })))
      fillPoly(ctx, patch, i % 3 === 0 ? 'rgba(255,240,200,0.20)' : 'rgba(90,60,30,0.28)')
    }
  }
  const line = (a: V3, b: V3, w: number, col: string) => {
    const pa = project(r, a), pb = project(r, b)
    if (!pa || !pb) return
    ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, w * r.F / ((pa.d + pb.d) / 2)); ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke()
  }
  for (const z of [-1.22, BOWL_Z + 1.22]) line({ x: -1.5, y: 0, z }, { x: 1.5, y: 0, z }, 0.05, '#ffffff')
  for (const x of [-1.32, 1.32]) { line({ x, y: 0, z: -1.22 }, { x, y: 0, z: 0.9 }, 0.04, '#ffffff'); line({ x, y: 0, z: BOWL_Z + 1.22 }, { x, y: 0, z: BOWL_Z - 0.9 }, 0.04, '#ffffff') }

  // the boundary rope on the grass, and the 30-yard circle (dashed): a stadium shape round the pitch, as on TV
  {
    const N = 120
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2
      line(ringPoint(a0, 1, 0), ringPoint(a1, 1, 0), 0.5, '#f8fafc')
    }
    const R = 27.43
    const arc = (cz: number, flip: 1 | -1) => {
      const pts: V3[] = []
      for (let i = 0; i <= 24; i++) { const th = (i / 24) * Math.PI; pts.push({ x: R * Math.cos(th), y: 0, z: cz + flip * R * Math.sin(th) }) }
      return pts
    }
    const dashed = (pts: V3[]) => { for (let i = 0; i + 1 < pts.length; i += 2) line(pts[i], pts[i + 1], 0.22, 'rgba(248,250,252,0.7)') }
    dashed(arc(0, 1))
    dashed(arc(BOWL_Z, -1))
    const side = (x: number) => { const pts: V3[] = []; for (let i = 0; i <= 20; i++) pts.push({ x, y: 0, z: BOWL_Z + (i / 20) * (0 - BOWL_Z) }); dashed(pts) }
    side(R); side(-R)
  }
  // replay graphics: a wide line along the pitch (orange) either side of the stumps, or the popping crease lit up with the distance the front foot is over it
  if (sc.marks?.wideLine) {
    for (const x of [-sc.marks.wideLine, sc.marks.wideLine]) { line({ x, y: 0.01, z: BOWL_Z - 2 }, { x, y: 0.01, z: 6 }, 0.1, 'rgba(251,146,60,0.9)'); line({ x, y: 0.01, z: -1.22 }, { x, y: 0.01, z: 1.2 }, 0.28, 'rgba(251,146,60,0.45)') }
  }
  if (sc.marks?.crease) {
    const z = sc.marks.crease.z
    line({ x: -2.2, y: 0.01, z }, { x: 2.2, y: 0.01, z }, 0.09, '#fb7185')
    const a = project(r, { x: 1.3, y: 0.01, z }), b = project(r, { x: 1.3, y: 0.01, z: z + sc.marks.crease.over })
    if (a && b) {
      ctx.strokeStyle = '#fde047'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
      ctx.fillStyle = '#fef9c3'; ctx.font = `800 ${Math.max(11, Math.round(r.W / 28))}px system-ui, sans-serif`; ctx.textAlign = 'left'
      ctx.fillText(`${Math.round(sc.marks.crease.over * 100)} cm over`, Math.max(6, Math.min(r.W - 90, b.x + 8)), b.y - 6)
    }
  }
  if (sc.marks?.trace) {
    const tr = sc.marks.trace
    const a = project(r, tr.straight[0]), b = project(r, tr.straight[1])
    if (a && b) {
      ctx.save(); ctx.setLineDash([8, 6]); ctx.strokeStyle = 'rgba(248,250,252,0.85)'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.restore()
    }
    const pts = tr.curve.map((v) => project(r, v)).filter((p): p is NonNullable<typeof p> => !!p)
    if (pts.length > 1) {
      for (const [w, col] of [[7, 'rgba(251,146,60,0.35)'], [3.2, '#fb923c'], [1.4, '#fef3c7']] as const) {
        ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
        ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y); ctx.stroke()
      }
    }
  }
  // a dragon ball: two molten-lava serpents winding round each other behind the dragon's head, embers glinting
  if (sc.style === 'dragon' && sc.trail.length > 2) {
    const pts = sc.trail.map((v) => project(r, v))
    for (let strand = 0; strand < 2; strand++) {
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i]
        if (!a || !b) continue
        const f = i / pts.length
        const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1
        const amp = 0.42 * r.F * f / b.d + 2
        const ph = i * 0.62 - sc.tick * 15 + strand * Math.PI
        const ox = (-dy / len) * Math.sin(ph) * amp, oy = (dx / len) * Math.sin(ph) * amp
        const pa = i > 1 ? Math.sin((i - 1) * 0.62 - sc.tick * 15 + strand * Math.PI) * amp : 0
        ctx.strokeStyle = strand === 0 ? `rgba(${f > 0.55 ? '254,240,138' : '249,115,22'},${0.2 + f * 0.75})` : `rgba(${f > 0.55 ? '251,146,60' : '185,28,28'},${0.2 + f * 0.75})`
        ctx.lineWidth = Math.max(1.5, 0.34 * r.F * f / b.d)
        ctx.lineCap = 'round'
        ctx.beginPath(); ctx.moveTo(a.x + (-dy / len) * pa, a.y + (dx / len) * pa); ctx.lineTo(b.x + ox, b.y + oy); ctx.stroke()
        if (i % 3 === 0 && f > 0.3) { ctx.fillStyle = `rgba(255,237,160,${0.3 + f * 0.6})`; ctx.beginPath(); ctx.arc(b.x + ox, b.y + oy, Math.max(1, 0.1 * r.F * f / b.d), 0, Math.PI * 2); ctx.fill() }
      }
    }
  }
  // the ball's trail
  if (sc.trail.length > 1 && sc.style !== 'dragon') {
    for (let i = 1; i < sc.trail.length; i++) {
      const a = project(r, sc.trail[i - 1]), b = project(r, sc.trail[i])
      if (!a || !b) continue
      const f = i / sc.trail.length
      ctx.strokeStyle = sc.style === 'fire' ? `rgba(${f > 0.5 ? '253,224,71' : '249,115,22'},${0.15 + f * 0.6})` : sc.style === 'ice' ? `rgba(${f > 0.5 ? '240,249,255' : '125,211,252'},${0.18 + f * 0.6})` : `rgba(255,255,255,${0.1 + f * 0.35})`
      ctx.lineWidth = Math.max(1, (sc.style === 'plain' ? 0.18 : 0.5) * r.F * f / b.d)
      ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
    }
  }
  // the stumps at both ends (the batsman's fly when they are hit)
  const stumpSet = (z: number, fly: number) => {
    for (let k = -1; k <= 1; k++) {
      const x = k * 0.11
      const o = fly * (1.2 + k * 0.5)
      const lift = fly * (0.5 + 0.3 * (k + 1)) * (1 - fly * 0.4)
      line({ x: x + o * 0.4, y: lift, z: z + fly * 1.6 }, { x: x + o * 0.4 + fly * k * 0.3, y: lift + 0.71 * (1 - fly * 0.6), z: z + fly * 1.6 }, 0.045, '#fef3c7')
    }
    if (fly < 0.2) line({ x: -0.11, y: 0.72, z }, { x: 0.11, y: 0.72, z }, 0.03, '#fbbf24')
  }
  stumpSet(BOWL_Z, sc.stumpsBowl)
  stumpSet(0, sc.stumps)
  if (sc.move) drawMove(ctx, r, sc.move)

  // the covers over the pitch
  if (sc.covers) {
    const sheet = projectPoly(r, [{ x: -2.7, y: 0.05, z: BOWL_Z - 4 }, { x: 2.7, y: 0.05, z: BOWL_Z - 4 }, { x: 2.7, y: 0.05, z: 4 }, { x: -2.7, y: 0.05, z: 4 }])
    fillPoly(ctx, sheet, '#1e3a5f')
    for (let k = 0; k < 9; k++) {
      const z = BOWL_Z - 3.2 + k * 3
      const pa = project(r, { x: -2.6, y: 0.06, z }), pb = project(r, { x: 2.6, y: 0.06, z })
      if (!pa || !pb) continue
      ctx.strokeStyle = 'rgba(147,197,253,0.35)'; ctx.lineWidth = Math.max(1, (r.F * 0.06) / ((pa.d + pb.d) / 2))
      ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke()
    }
    for (const x of [-2.8, 2.8]) { const pa = project(r, { x, y: 0.06, z: BOWL_Z - 4 }), pb = project(r, { x, y: 0.06, z: 4 }); if (pa && pb) { ctx.strokeStyle = 'rgba(226,232,240,0.7)'; ctx.lineWidth = Math.max(1, (r.F * 0.08) / ((pa.d + pb.d) / 2)); ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke() } }
  }
  // the light of the hour and the weather over everything
  const tint = L.time === 'night' ? 'rgba(2,8,30,0.14)' : L.time === 'dusk' ? 'rgba(251,113,40,0.2)' : grey ? 'rgba(100,116,139,0.16)' : null
  if (tint) { ctx.fillStyle = tint; ctx.fillRect(0, 0, W, H) }
  if (L.rain > 0) {
    ctx.fillStyle = `rgba(15,23,42,${0.12 * L.rain})`; ctx.fillRect(0, 0, W, H)
    ctx.strokeStyle = 'rgba(203,213,225,0.45)'; ctx.lineWidth = 1; ctx.lineCap = 'round'
    ctx.beginPath()
    const n = 70 * L.rain
    for (let i = 0; i < n; i++) {
      const x = hash01(i * 1.9) * (W + 40)
      const y = (hash01(i * 4.1) * H + sc.tick * 650 * (0.8 + hash01(i * 2.3) * 0.5)) % H
      ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 9 + 5 * L.rain)
    }
    ctx.stroke()
  }

  // a soft vignette, like a lens
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, H * 0.95)
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.38)')
  ctx.fillStyle = v
  ctx.fillRect(0, 0, W, H)
}
