import { useEffect, useMemo, useRef, useState } from 'react'
import type { Player, Team } from '../../types'
import type { BallEvent } from '../../engine/types'
import type { PitchKind } from '../../engine/pitchInfo'
import { PlayerAvatar, accentOf } from '../ui'
import { approach, clipNow, camReverse, camWide, fielderWorld, frameAt, lookAt, planBall, prep, project, type Cam, type Plan, type V3 } from './broadcast'
import { drawScene } from './broadcastDraw'
import { endPoint, type Placed } from './Stage'

/**
 * The broadcast view: the match as it looks on TV. The camera stands behind the bowler, zooms in as he runs up, follows the ball after the bat,
 * and cuts to a camera behind the batsman when the ball goes back down the ground. Fielders are on screen when the camera can see them and
 * come into view as it follows the ball. It only draws the ball that the engine has already played, so it never changes a result.
 */

const STUB = { seq: 1, runsBat: 0, boundary: null, tags: [], wicket: null, extraType: null, delivery: null } as unknown as BallEvent
const HEIGHT = 120
const WIDTH = 60

type Look = 'striker' | 'nonstriker' | 'bowler' | 'fielder' | 'umpire' | 'keeper'

function Figure({ player, team, look, shirt, arm, bat }: { player?: Player; team?: Team; look: Look; shirt?: string; arm?: React.Ref<HTMLDivElement>; bat?: React.Ref<HTMLDivElement> }) {
  const ump = look === 'umpire'
  const primary = ump ? '#1e293b' : team?.colors.primary ?? '#334155'
  const second = ump ? '#f8fafc' : team?.colors.secondary ?? '#e2e8f0'
  const pads = look === 'striker' || look === 'nonstriker' || look === 'keeper'
  return (
    <div className="relative" style={{ width: WIDTH, height: HEIGHT }}>
      <div className="absolute rounded-full" style={{ left: 17, top: 80, width: 11, height: 38, background: pads ? '#f1f5f9' : ump ? '#0f172a' : '#e2e8f0', border: '1px solid #00000040' }} />
      <div className="absolute rounded-full" style={{ left: 32, top: 80, width: 11, height: 38, background: pads ? '#f1f5f9' : ump ? '#0f172a' : '#e2e8f0', border: '1px solid #00000040' }} />
      <div className="absolute" style={{ left: 14, top: 38, width: 32, height: 46, borderRadius: 10, background: shirt ?? primary, border: `2px solid ${second}` }} />
      {look === 'bowler' && <div ref={arm} className="absolute" style={{ left: 42, top: 42, width: 8, height: 32, borderRadius: 4, background: second, transformOrigin: '50% 8%', border: `1px solid ${primary}` }} />}
      {(look === 'striker' || look === 'nonstriker') && <div ref={bat} className="absolute" style={{ left: 40, top: 44, width: 9, height: 40, borderRadius: 3, background: '#e9c98a', border: '1px solid #a16207', transformOrigin: '50% 10%', transform: 'rotate(-25deg)' }} />}
      {look === 'keeper' && <><div className="absolute rounded-full bg-amber-300" style={{ left: 6, top: 52, width: 10, height: 10 }} /><div className="absolute rounded-full bg-amber-300" style={{ left: 44, top: 52, width: 10, height: 10 }} /></>}
      {ump
        ? <><div className="absolute rounded-full" style={{ left: 18, top: 2, width: 24, height: 24, background: '#e0b48e', border: '2px solid #0f172a' }} /><div className="absolute" style={{ left: 12, top: 0, width: 36, height: 9, borderRadius: '10px 10px 3px 3px', background: '#f8fafc', border: '1px solid #94a3b8' }} /></>
        : <div className="absolute rounded-full" style={{ left: 10, top: 0, width: 40, height: 40, boxShadow: `0 0 0 2px ${team ? accentOf(team) : '#fff'}`, overflow: 'hidden' }}>{player && team && <PlayerAvatar player={player} team={team} size={40} />}</div>}
    </div>
  )
}

export function BroadcastView({ event, striker, nonStriker, bowler, battingTeam, bowlingTeam, fielders, pitch = 'balanced', rate = 1 }: {
  event: BallEvent | null
  striker: Player; nonStriker: Player | null; bowler: Player
  battingTeam: Team; bowlingTeam: Team
  fielders: Placed[]
  pitch?: PitchKind
  /** 1 = full length; the clip plays quicker at faster auto-play. */
  rate?: number
}) {
  const box = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const nodes = useRef(new Map<string, HTMLElement | null>())
  const armRef = useRef<HTMLDivElement | null>(null)
  const batRef = useRef<HTMLDivElement | null>(null)
  const setNode = (k: string) => (el: HTMLElement | null) => { nodes.current.set(k, el) }
  const [tag, setTag] = useState<'CAM 1' | 'CAM 2'>('CAM 1')
  const [cutKey, setCutKey] = useState(0)
  const fire = !!event?.freeHit && !!event.boundary

  // the plan for this ball
  const plan: Plan = useMemo(() => {
    const ev = event ?? STUB
    const end = event ? endPoint(event, fielders) : { x: 80, y: 66 }
    const p = planBall(ev, fielders.map((f) => ({ id: f.player.id, x: f.x, y: f.y, spot: f.spot })), end, striker.hand === 'L')
    if (event) { const fresh = clipNow.seq !== event.seq; clipNow.seq = event.seq; clipNow.ms = Math.round((p.total * 1000) / Math.max(0.3, rate)); if (fresh) clipNow.until = Date.now() + clipNow.ms }
    return p
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.seq, fielders.map((f) => f.player.id).join(), striker.id])

  const rest = useMemo(() => fielders.map((f) => fielderWorld(f.x, f.y, f.spot)), [fielders])
  const live = useRef({ plan, rest, event, striker, nonStriker, bowler, fielders, battingTeam, pitch, fire, rate })
  live.current = { plan, rest, event, striker, nonStriker, bowler, fielders, battingTeam, pitch, fire, rate }
  const cam = useRef<Cam>({ ...camWide, p: { ...camWide.p } })
  const lastT = useRef(0)
  const reverseNow = useRef(false)

  useEffect(() => {
    const el = box.current, cv = canvas.current
    if (!el || !cv) return
    let raf = 0
    let t0 = performance.now()
    let prev = t0
    let stopped = false
    const trail: V3[] = []

    const paint = (t: number, dt: number, snap: boolean) => {
      const L = live.current
      const W = el.clientWidth, H = el.clientHeight
      if (!W || !H) return
      const dpr = Math.min(1.5, window.devicePixelRatio || 1)
      if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr) }
      const ctx = cv.getContext('2d')
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const f = frameAt(L.plan, t, (i) => L.rest[i] ?? { x: 0, y: 0, z: 0 })
      // the camera: cut when the ball goes back down the ground, otherwise turn and zoom after the ball
      const wantReverse = f.reverse
      const base = wantReverse ? camReverse : camWide
      if (wantReverse !== reverseNow.current) { reverseNow.current = wantReverse; snap = true; setTag(wantReverse ? 'CAM 2' : 'CAM 1'); setCutKey((k) => k + 1) }
      const goal = lookAt(base.p, f.aim)
      const c = cam.current
      c.p = base.p
      if (snap) { c.yaw = goal.yaw; c.pitch = goal.pitch; c.hfov = f.hfov } else {
        const k = 1 - Math.exp(-dt * (f.phase === 'flight' ? 7 : 4.5))
        c.yaw = approach(c.yaw, goal.yaw, k); c.pitch = approach(c.pitch, goal.pitch, k); c.hfov += (f.hfov - c.hfov) * k
      }
      if (f.ball) { trail.push(f.ball); if (trail.length > 14) trail.shift() } else trail.length = 0
      drawScene(ctx, c, W, H, { pitch: L.pitch, boardColor: L.battingTeam.colors.primary, crowdColors: [L.battingTeam.colors.primary, L.battingTeam.colors.secondary], stumps: f.stumps, trail: [...trail], fire: L.fire })
      const r = prep(c, W, H)

      const place = (key: string, world: V3, opts: { heightM?: number; arm?: number; bat?: number } = {}) => {
        const node = nodes.current.get(key)
        if (!node) return
        const p = project(r, world)
        const h = opts.heightM ?? 1.8
        if (!p || p.x < -80 || p.x > W + 80 || p.y < -40 || p.y > H + 200) { node.style.display = 'none'; return }
        const s = (r.F * h) / p.d / HEIGHT
        node.style.display = 'block'
        node.style.transform = `translate3d(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px,0) scale(${s.toFixed(3)}) translate(-50%,-100%)`
        node.style.zIndex = String(Math.max(1, Math.round(3000 - p.d * 10)))
      }
      const joyHop = (k: number) => 0.55 * Math.sin(Math.PI * Math.min(1, k * 3)) * (k < 0.34 ? 1 : 0)
      const ev = L.event
      // the two at the crease, the bowler, the keeper and the umpires
      const stance = L.striker.hand === 'L' ? -0.75 : 0.75
      const ra = f.runners?.a ?? { x: stance, y: ev?.boundary ? joyHop(f.joy) : 0, z: 0.35 }
      const rb = f.runners?.b ?? { x: -3.2, y: 0, z: -19.4 }
      place('striker', ra)
      place('nonstriker', rb)
      place('bowler', { x: f.bowler.x, y: (ev?.wicket && ev.wicket.kind !== 'run out' ? joyHop(f.joy) : Math.abs(Math.sin(f.bowler.z * 1.9)) * 0.1 * (f.phase === 'run' ? 1 : 0)), z: f.bowler.z })
      place('umpire1', { x: -1.15, y: 0, z: -22.2 })
      place('umpire2', { x: stance > 0 ? 13 : -13, y: 0, z: -2 })
      if (armRef.current) armRef.current.style.transform = `rotate(${(-f.bowlerArm * 330).toFixed(0)}deg)`
      if (batRef.current) batRef.current.style.transform = `rotate(${(-25 + f.batSwing * 125).toFixed(0)}deg)`
      // fielders: where they stand, or where they have run to
      L.fielders.forEach((_, i) => {
        const w = f.moving.get(i) ?? L.rest[i]
        const caught = L.plan.catcher === i
        place(`f${i}`, { x: w.x, y: caught ? joyHop(f.joy) : 0, z: w.z })
      })
      // the ball, and its shadow
      const ball = nodes.current.get('ball'), shadow = nodes.current.get('shadow')
      if (ball && shadow) {
        const bp = f.ball ? project(r, f.ball) : null
        const gp = f.ball ? project(r, { ...f.ball, y: 0 }) : null
        if (bp && gp && bp.x > -20 && bp.x < W + 20) {
          const sz = Math.max(5, (r.F * 0.24) / bp.d)
          ball.style.display = 'block'
          ball.style.width = ball.style.height = `${sz.toFixed(1)}px`
          ball.style.transform = `translate3d(${(bp.x - sz / 2).toFixed(1)}px,${(bp.y - sz / 2).toFixed(1)}px,0)`
          ball.style.zIndex = '4000'
          shadow.style.display = 'block'
          shadow.style.width = `${(sz * 1.3).toFixed(1)}px`
          shadow.style.height = `${(sz * 0.45).toFixed(1)}px`
          shadow.style.transform = `translate3d(${(gp.x - sz * 0.65).toFixed(1)}px,${(gp.y - sz * 0.2).toFixed(1)}px,0)`
          shadow.style.zIndex = '1'
        } else { ball.style.display = 'none'; shadow.style.display = 'none' }
      }
      // name tags for the people in the action
      const tagOf = (key: string, world: V3) => {
        const node = nodes.current.get(key)
        if (!node) return
        const p = project(r, world)
        if (!p || p.x < 10 || p.x > W - 10 || p.y < 10 || p.y > H) { node.style.display = 'none'; return }
        node.style.display = 'block'
        node.style.transform = `translate3d(${p.x.toFixed(1)}px,${(p.y + 3).toFixed(1)}px,0) translate(-50%,0)`
      }
      tagOf('tagStriker', { x: ra.x, y: 0, z: ra.z })
      tagOf('tagBowler', { x: f.bowler.x, y: 0, z: f.bowler.z })
      const ci = L.plan.catcher >= 0 ? L.plan.catcher : L.plan.chaser
      if (ci >= 0 && (f.phase === 'flight' || f.phase === 'hold')) { const w = f.moving.get(ci) ?? L.rest[ci]; tagOf('tagField', { x: w.x, y: 0, z: w.z }) } else { const n = nodes.current.get('tagField'); if (n) n.style.display = 'none' }
      lastT.current = t
    }

    // each new ball starts at the run-up: back on the wide camera
    reverseNow.current = false
    setTag('CAM 1')
    const live0 = live.current
    cam.current = { ...camWide, p: { ...camWide.p } }
    const first = live0.event === null
    if (first) {
      paint(0, 0.016, true)
    } else {
      const tick = (now: number) => {
        if (stopped) return
        const dt = Math.min(0.05, (now - prev) / 1000)
        prev = now
        const t = (now - t0) / 1000 / Math.max(0.3, live.current.rate)
        const end = live.current.plan.total
        paint(Math.min(t, end), dt, false)
        if (t < end) raf = requestAnimationFrame(tick)
      }
      paint(0, 0.016, true)
      raf = requestAnimationFrame(tick)
    }
    const ro = new ResizeObserver(() => paint(lastT.current, 0.016, true))
    ro.observe(el)
    return () => { stopped = true; cancelAnimationFrame(raf); ro.disconnect() }
  }, [event?.seq, striker.id])

  const L = live.current
  void L
  return (
    <div ref={box} className="absolute inset-0 z-[1] isolate overflow-hidden bg-[#05080f]" aria-label="Broadcast view">
      <canvas ref={canvas} className="absolute inset-0 h-full w-full" />
      {fielders.map((f, i) => (
        <div key={f.player.id} ref={setNode(`f${i}`)} className="absolute left-0 top-0 hidden will-change-transform" style={{ width: WIDTH, height: HEIGHT, transformOrigin: '0 0' }}>
          <Figure player={f.player} team={bowlingTeam} look={i === 0 ? 'keeper' : 'fielder'} />
        </div>
      ))}
      {nonStriker && <div ref={setNode('nonstriker')} className="absolute left-0 top-0 hidden will-change-transform" style={{ width: WIDTH, height: HEIGHT, transformOrigin: '0 0' }}><Figure player={nonStriker} team={battingTeam} look="nonstriker" /></div>}
      <div ref={setNode('striker')} className="absolute left-0 top-0 hidden will-change-transform" style={{ width: WIDTH, height: HEIGHT, transformOrigin: '0 0' }}><Figure player={striker} team={battingTeam} look="striker" bat={(el) => { batRef.current = el }} /></div>
      <div ref={setNode('bowler')} className="absolute left-0 top-0 hidden will-change-transform" style={{ width: WIDTH, height: HEIGHT, transformOrigin: '0 0' }}><Figure player={bowler} team={bowlingTeam} look="bowler" arm={(el) => { armRef.current = el }} /></div>
      <div ref={setNode('umpire1')} className="absolute left-0 top-0 hidden will-change-transform" style={{ width: WIDTH, height: HEIGHT, transformOrigin: '0 0' }}><Figure look="umpire" /></div>
      <div ref={setNode('umpire2')} className="absolute left-0 top-0 hidden will-change-transform" style={{ width: WIDTH, height: HEIGHT, transformOrigin: '0 0' }}><Figure look="umpire" /></div>
      <div ref={setNode('shadow')} className="absolute left-0 top-0 hidden rounded-full bg-black/40" />
      <div ref={setNode('ball')} className="absolute left-0 top-0 hidden rounded-full border border-red-200" style={{ background: fire ? '#f97316' : '#dc2626', boxShadow: fire ? '0 0 14px 5px #f97316, 0 0 26px 10px #ef444488' : '0 0 6px #00000088' }} />
      {[['tagStriker', striker.name, accentOf(battingTeam)], ['tagBowler', bowler.name, accentOf(bowlingTeam)], ['tagField', '', accentOf(bowlingTeam)]].map(([k, name, col]) => (
        <div key={k} ref={setNode(k)} className="pointer-events-none absolute left-0 top-0 z-[5000] hidden whitespace-nowrap rounded bg-black/75 px-1.5 text-[10px] font-bold text-white" style={{ borderBottom: `2px solid ${col}` }}>
          {k === 'tagField' ? (event && plan.catcher >= 0 ? fielders[plan.catcher]?.player.name : plan.chaser >= 0 ? fielders[plan.chaser]?.player.name : '') : name}
        </div>
      ))}
      {/* a quick white flash when the picture cuts to the other camera */}
      <div key={cutKey} className="pointer-events-none absolute inset-0 z-[6000] bg-white" style={{ animation: cutKey ? 'bcast-cut 0.28s ease-out forwards' : undefined, opacity: 0 }} />
      <span className="pointer-events-none absolute bottom-1.5 right-2 z-[6001] rounded bg-black/60 px-1.5 text-[10px] font-extrabold tracking-widest text-slate-200">{tag}</span>
      <span className="pointer-events-none absolute bottom-1.5 left-2 z-[6001] flex items-center gap-1 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white max-sm:hidden"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />Live</span>
    </div>
  )
}
