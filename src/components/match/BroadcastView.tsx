import { useEffect, useMemo, useRef, useState } from 'react'
import type { Player, Team } from '../../types'
import type { BallEvent } from '../../engine/types'
import type { PitchKind } from '../../engine/pitchInfo'
import { PlayerAvatar, accentOf } from '../ui'
import { ballSpeed, speedStyle, type BallStyle } from '../../engine/speed'
import { approach, clipNow, camReverse, camWide, fielderWorld, frameAt, lookAt, planBall, prep, project, type Cam, type Plan, type V3 } from './broadcast'
import { DEFAULT_LOOK, type StadiumLook } from '../../engine/stadium'
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

/** What the TV score bug shows: the score, the two batsmen, the bowler and, in a chase, what is needed. */
export interface ScoreBug {
  team: string
  runs: number
  wickets: number
  balls: number
  batters: { name: string; runs: number; balls: number; strike: boolean }[]
  bowler: { name: string; figures: string } | null
  need: string | null
}

type Look = 'striker' | 'nonstriker' | 'bowler' | 'fielder' | 'umpire' | 'keeper'

function Figure({ player, team, look, shirt, arm, bat, armL, armR }: { player?: Player; team?: Team; look: Look; shirt?: string; arm?: React.Ref<HTMLDivElement>; bat?: React.Ref<HTMLDivElement>; armL?: React.Ref<HTMLDivElement>; armR?: React.Ref<HTMLDivElement> }) {
  const ump = look === 'umpire'
  const primary = ump ? '#1e293b' : team?.colors.primary ?? '#334155'
  const second = ump ? '#f8fafc' : team?.colors.secondary ?? '#e2e8f0'
  const pads = look === 'striker' || look === 'nonstriker' || look === 'keeper'
  return (
    <div className="relative" style={{ width: WIDTH, height: HEIGHT }}>
      {/* the shadow on the grass */}
      <div className="absolute rounded-full" style={{ left: 6, top: 110, width: 48, height: 12, background: 'rgba(0,0,0,0.32)' }} />
      <div className="absolute rounded-full" style={{ left: 18, top: 86, width: 10, height: 32, background: pads ? '#f1f5f9' : ump ? '#0f172a' : '#e2e8f0', border: '1px solid #00000040' }} />
      <div className="absolute rounded-full" style={{ left: 32, top: 86, width: 10, height: 32, background: pads ? '#f1f5f9' : ump ? '#0f172a' : '#e2e8f0', border: '1px solid #00000040' }} />
      <div className="absolute" style={{ left: 15, top: 52, width: 30, height: 38, borderRadius: 10, background: shirt ?? primary, border: `2px solid ${second}` }} />
      {look === 'bowler' && <div ref={arm} className="absolute" style={{ left: 42, top: 56, width: 8, height: 30, borderRadius: 4, background: second, transformOrigin: '50% 8%', border: `1px solid ${primary}` }} />}
      {(look === 'striker' || look === 'nonstriker') && <div ref={bat} className="absolute" style={{ left: 41, top: 58, width: 9, height: 38, borderRadius: 3, background: '#e9c98a', border: '1px solid #a16207', transformOrigin: '50% 10%', transform: 'rotate(-25deg)' }} />}
      {ump && <>
        <div ref={armL} className="absolute" style={{ left: 8, top: 56, width: 8, height: 32, borderRadius: 4, background: '#f8fafc', border: '1px solid #475569', transformOrigin: '50% 8%' }} />
        <div ref={armR} className="absolute" style={{ left: 44, top: 56, width: 8, height: 32, borderRadius: 4, background: '#f8fafc', border: '1px solid #475569', transformOrigin: '50% 8%' }} />
      </>}
      {look === 'keeper' && <><div className="absolute rounded-full bg-amber-300" style={{ left: 5, top: 64, width: 10, height: 10 }} /><div className="absolute rounded-full bg-amber-300" style={{ left: 45, top: 64, width: 10, height: 10 }} /></>}
      {ump
        ? <><div className="absolute rounded-full" style={{ left: 8, top: 4, width: 44, height: 44, background: '#e0b48e', border: '2px solid #0f172a' }} /><div className="absolute" style={{ left: 4, top: 0, width: 52, height: 13, borderRadius: '10px 10px 3px 3px', background: '#f8fafc', border: '1px solid #94a3b8' }} /></>
        : <div className="absolute rounded-full" style={{ left: 2, top: 0, width: 56, height: 56, boxShadow: `0 0 0 3px ${team ? accentOf(team) : '#fff'}, 0 0 10px #000a`, overflow: 'hidden' }}>{player && team && <PlayerAvatar player={player} team={team} size={56} />}</div>}
    </div>
  )
}

/** The speed of the ball, in a TV speed-gun box that shows up as it is let go and fades after a moment. */
function SpeedGun({ kmh, at, dur, rate }: { kmh: number; at: number; dur: number; rate: number }) {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const k = Math.max(0.3, rate)
    const a = window.setTimeout(() => setOn(true), (at * 1000) / k)
    const b = window.setTimeout(() => setOn(false), ((at + dur) * 1000) / k)
    return () => { window.clearTimeout(a); window.clearTimeout(b) }
  }, [at, dur, rate])
  if (!on) return null
  return (
    <div className="pointer-events-none absolute right-2 top-9 z-[6001] flex items-baseline gap-1 rounded bg-black/80 px-2 py-0.5 ring-1 ring-sky-300/50 max-sm:right-1 max-sm:top-8">
      <span className={`font-display text-xl leading-none tabular-nums ${speedStyle(kmh) === 'fire' ? 'text-orange-400' : speedStyle(kmh) === 'ice' ? 'text-cyan-200' : 'text-sky-300'}`}>{kmh}</span>{speedStyle(kmh) === 'fire' && <span className="text-sm" aria-hidden>🔥</span>}{speedStyle(kmh) === 'ice' && <span className="text-sm" aria-hidden>❄️</span>}
      <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-300">km/h</span>
    </div>
  )
}

export function BroadcastView({ event, striker, nonStriker, bowler, battingTeam, bowlingTeam, fielders, pitch = 'balanced', rate = 1, look = DEFAULT_LOOK, scoreBug }: {
  /** The score bug's figures, from the match as it stands. */
  scoreBug?: ScoreBug | null
  /** The home ground's look (time of day, stands, crowd, weather). */
  look?: StadiumLook
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
  const umpArms = useRef<Record<string, HTMLDivElement | null>>({})
  const setNode = (k: string) => (el: HTMLElement | null) => { nodes.current.set(k, el) }
  const [tag, setTag] = useState<'CAM 1' | 'CAM 2'>('CAM 1')
  const [cutKey, setCutKey] = useState(0)
  const fire = !!event?.freeHit && !!event.boundary

  // the plan for this ball
  const plan: Plan = useMemo(() => {
    const ev = event ?? STUB
    const end = event ? endPoint(event, fielders) : { x: 80, y: 66 }
    const p = planBall(ev, fielders.map((f) => ({ id: f.player.id, x: f.x, y: f.y, spot: f.spot })), end, striker.hand === 'L', ballSpeed(ev, bowler))
    if (event) { const fresh = clipNow.seq !== event.seq; clipNow.seq = event.seq; clipNow.ms = Math.round((p.total * 1000) / Math.max(0.3, rate)); if (fresh) clipNow.until = Date.now() + clipNow.ms }
    return p
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.seq, fielders.map((f) => f.player.id).join(), striker.id])

  const rest = useMemo(() => fielders.map((f) => fielderWorld(f.x, f.y, f.spot)), [fielders])
  const live = useRef({ plan, rest, event, striker, nonStriker, bowler, fielders, battingTeam, pitch, fire, rate, look })
  live.current = { plan, rest, event, striker, nonStriker, bowler, fielders, battingTeam, pitch, fire, rate, look }
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
      // with the covers on there is nothing to follow: a wide picture of the pitch
      const covers0 = L.look.covers || (L.event === null && L.look.rain === 2)
      const aimAt = covers0 ? { x: 0, y: 0, z: -8 } : f.aim
      const hfovAt = covers0 ? 0.8 : f.hfov
      const goal = lookAt(base.p, aimAt)
      const c = cam.current
      c.p = base.p
      if (snap) { c.yaw = goal.yaw; c.pitch = goal.pitch; c.hfov = hfovAt } else {
        const k = 1 - Math.exp(-dt * (f.phase === 'flight' ? 7 : 4.5))
        c.yaw = approach(c.yaw, goal.yaw, k); c.pitch = approach(c.pitch, goal.pitch, k); c.hfov += (hfovAt - c.hfov) * k
      }
      // a very quick ball is a fireball and a very slow one a snowball while it is bowled; after the bat only a free-hit boundary is on fire
      const delivering = f.phase === 'run' || f.phase === 'deliver'
      const style: BallStyle = delivering ? speedStyle(L.plan.speed) : L.fire ? 'fire' : 'plain'
      if (f.ball) { trail.push(f.ball); if (trail.length > 14) trail.shift() } else trail.length = 0
      // when rain has stopped play (or the day is washed out) the covers are on and nobody is on the field
      const covers = L.look.covers || (L.event === null && L.look.rain === 2)
      // a four or a six: the picture punches in and shakes for a moment; the crowd is on its feet for boundaries and wickets
      const tHit = L.plan.tRun + L.plan.tDeliver
      const punch = L.plan.boundary ? Math.max(0, 1 - (t - tHit) / 0.4) : 0
      const cheerAt = L.plan.boundary ? tHit + 0.6 : L.plan.exitAt
      const cheer = cheerAt !== null && cheerAt !== undefined && t >= cheerAt && (L.plan.boundary || !!L.plan.wicketFlies || L.plan.catcher >= 0) ? Math.min(1, (t - cheerAt) / 0.3) * (1 - Math.min(1, Math.max(0, (t - cheerAt - 1.6) / 0.6))) : 0
      if (punch > 0) { c.yaw += Math.sin(t * 70) * 0.006 * punch; c.pitch += Math.cos(t * 83) * 0.004 * punch; c.hfov *= 1 - 0.05 * punch }
      drawScene(ctx, c, W, H, { pitch: L.pitch, look: L.look, tick: t, cheer, covers, stumps: f.stumps, stumpsBowl: f.stumpsBowl, trail: [...trail], style })
      const r = prep(c, W, H)
      if (covers) { for (const n of nodes.current.values()) if (n) n.style.display = 'none'; lastT.current = t; return }

      const place = (key: string, world: V3, opts: { heightM?: number; rot?: number } = {}) => {
        const node = nodes.current.get(key)
        if (!node) return
        const p = project(r, world)
        const h = opts.heightM ?? 1.8
        if (!p || p.x < -80 || p.x > W + 80 || p.y < -40 || p.y > H + 200) { node.style.display = 'none'; return }
        const s = Math.max(0.4, (r.F * h) / p.d / HEIGHT)
        node.style.display = 'block'
        node.style.transform = `translate3d(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px,0) scale(${s.toFixed(3)}) rotate(${(opts.rot ?? 0).toFixed(0)}deg) translate(-50%,-100%)`
        node.style.zIndex = String(Math.max(1, Math.round(3000 - p.d * 10)))
      }
      const joyHop = (k: number) => 0.55 * Math.sin(Math.PI * Math.min(1, k * 3)) * (k < 0.34 ? 1 : 0)
      const ev = L.event
      // the two at the crease, the bowler, the keeper and the umpires
      const stance = L.striker.hand === 'L' ? -0.75 : 0.75
      const ra = f.runners?.a ?? f.striker ?? { x: stance, y: ev?.boundary ? joyHop(f.joy) : 0, z: 0.35 }
      const rb = f.runners?.b ?? { x: -3.2, y: 0, z: -19.4 }
      place('striker', ra, { rot: -f.hurt * 24 })
      place('nonstriker', rb)
      place('bowler', { x: f.bowler.x, y: (ev?.wicket && ev.wicket.kind !== 'run out' ? joyHop(f.joy) : Math.abs(Math.sin(f.bowler.z * 1.9)) * 0.1 * (f.phase === 'run' ? 1 : 0)), z: f.bowler.z })
      place('umpire1', { x: -1.15, y: 0, z: -22.2 })
      place('umpire2', { x: stance > 0 ? 13 : -13, y: 0, z: -2 })
      if (armRef.current) armRef.current.style.transform = `rotate(${(-f.bowlerArm * 330).toFixed(0)}deg)`
      if (batRef.current) batRef.current.style.transform = `rotate(${(-25 + f.batSwing * 125 - f.raise * 150).toFixed(0)}deg)`
      // the umpires' arms
      for (const who of [1, 2] as const) {
        const l = umpArms.current[`l${who}`], rr = umpArms.current[`r${who}`]
        const sg = f.signal && f.signal.who === who ? f.signal : null
        let la = 0, ra2 = 0
        if (sg) {
          const k = sg.k
          if (sg.kind === 'wide') { la = 90 * k; ra2 = -90 * k }
          else if (sg.kind === 'noball') ra2 = -90 * k
          else if (sg.kind === 'six') { la = 172 * k; ra2 = -172 * k }
          else if (sg.kind === 'out') ra2 = -172 * k
          else if (sg.kind === 'four') ra2 = -(40 + 45 * Math.sin(t * 14)) * k
          else if (sg.kind === 'bye') ra2 = -150 * k
          else la = 38 * k
        }
        if (l) l.style.transform = `rotate(${la.toFixed(0)}deg)`
        if (rr) rr.style.transform = `rotate(${ra2.toFixed(0)}deg)`
      }
      // fielders: where they stand, or where they have run to
      L.fielders.forEach((_, i) => {
        const w = f.moving.get(i) ?? L.rest[i]
        const caught = L.plan.catcher === i
        const dv = f.dives.get(i)
        const running = f.moving.has(i) && f.phase === 'flight' && !dv
        place(`f${i}`, { x: w.x, y: (caught ? joyHop(f.joy) : 0) + (dv ? 0.25 * dv.k : 0) + (running ? Math.abs(Math.sin(t * 15 + i)) * 0.14 : 0), z: w.z }, { rot: dv ? dv.dir * dv.k * 78 : 0 })
      })
      // the ball, and its shadow
      const ball = nodes.current.get('ball'), shadow = nodes.current.get('shadow')
      if (ball && shadow) {
        const bp = f.ball ? project(r, f.ball) : null
        const gp = f.ball ? project(r, { ...f.ball, y: 0 }) : null
        if (bp && gp && bp.x > -20 && bp.x < W + 20) {
          ball.style.background = style === 'fire' ? '#f97316' : style === 'ice' ? '#f0f9ff' : '#dc2626'
          ball.style.borderColor = style === 'ice' ? '#7dd3fc' : style === 'fire' ? '#fde047' : '#fecaca'
          ball.style.boxShadow = style === 'fire' ? '0 0 14px 5px #f97316, 0 0 26px 10px #ef444488' : style === 'ice' ? '0 0 12px 4px #7dd3fc, 0 0 22px 8px #bae6fd88' : '0 0 6px #00000088'
          const sz = Math.max(style === 'plain' ? 5 : 9, (r.F * (style === 'plain' ? 0.24 : 0.36)) / bp.d)
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
      const rn = nodes.current.get('tagReact')
      if (rn) {
        const who = f.react?.who
        const at: V3 | null = !who ? null : who === 'striker' ? { x: ra.x, y: 2.5, z: ra.z } : who === 'bowler' ? { x: f.bowler.x, y: 2.5, z: f.bowler.z } : { x: (f.moving.get(0) ?? L.rest[0])?.x ?? 0, y: 2.4, z: (f.moving.get(0) ?? L.rest[0])?.z ?? 8 }
        const pp = at ? project(r, at) : null
        if (pp && pp.x > 20 && pp.x < W - 20 && pp.y > 10) { rn.style.display = 'block'; rn.textContent = f.react!.text; rn.style.transform = `translate3d(${pp.x.toFixed(1)}px,${pp.y.toFixed(1)}px,0) translate(-50%,-100%)` } else rn.style.display = 'none'
      }
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
      <div ref={setNode('umpire1')} className="absolute left-0 top-0 hidden will-change-transform" style={{ width: WIDTH, height: HEIGHT, transformOrigin: '0 0' }}><Figure look="umpire" armL={(el) => { umpArms.current.l1 = el }} armR={(el) => { umpArms.current.r1 = el }} /></div>
      <div ref={setNode('umpire2')} className="absolute left-0 top-0 hidden will-change-transform" style={{ width: WIDTH, height: HEIGHT, transformOrigin: '0 0' }}><Figure look="umpire" armL={(el) => { umpArms.current.l2 = el }} armR={(el) => { umpArms.current.r2 = el }} /></div>
      <div ref={setNode('shadow')} className="absolute left-0 top-0 hidden rounded-full bg-black/40" />
      <div ref={setNode('ball')} className="absolute left-0 top-0 hidden rounded-full border border-red-200" />
      {/* the speed gun: the speed of the ball just after it is let go */}
      {event && <SpeedGun key={event.seq} kmh={plan.speed} at={plan.tRun} dur={plan.tDeliver + 1.2} rate={rate} />}
      <div ref={setNode('tagReact')} className="pointer-events-none absolute left-0 top-0 z-[5001] hidden whitespace-nowrap rounded-full bg-amber-300 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-black shadow-lg" />
      {[['tagStriker', striker.name, accentOf(battingTeam)], ['tagBowler', bowler.name, accentOf(bowlingTeam)], ['tagField', '', accentOf(bowlingTeam)]].map(([k, name, col]) => (
        <div key={k} ref={setNode(k)} className="pointer-events-none absolute left-0 top-0 z-[5000] hidden whitespace-nowrap rounded bg-black/75 px-1.5 text-[10px] font-bold text-white" style={{ borderBottom: `2px solid ${col}` }}>
          {k === 'tagField' ? (event && plan.catcher >= 0 ? fielders[plan.catcher]?.player.name : plan.chaser >= 0 ? fielders[plan.chaser]?.player.name : '') : name}
        </div>
      ))}
      {/* a quick white flash when the picture cuts to the other camera */}
      <div key={cutKey} className="pointer-events-none absolute inset-0 z-[6000] bg-white" style={{ animation: cutKey ? 'bcast-cut 0.28s ease-out forwards' : undefined, opacity: 0 }} />
      {(look.covers || (event === null && look.rain === 2)) && <div className="pointer-events-none absolute inset-x-0 top-10 z-[6001] text-center"><span className="rounded bg-black/75 px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest text-sky-200 ring-1 ring-sky-300/40">{look.weather === 'washout' ? 'Washed out: no play today' : 'Rain stops play: covers on'}</span></div>}
      {/* the TV score bug: the score and overs, the two batsmen and the bowler, and in a chase what is needed */}
      {(scoreBug || event) && (
        <div className="pointer-events-none absolute bottom-1.5 left-2 z-[6001] overflow-hidden rounded bg-black/80 text-white ring-1 ring-white/20">
          <div className="flex items-stretch">
            <span className="px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-black" style={{ background: accentOf(battingTeam) }}>{scoreBug?.team ?? battingTeam.short}</span>
            <span className="px-1.5 py-0.5 font-display text-sm leading-none tabular-nums">{scoreBug?.runs ?? event?.score.runs}/{scoreBug?.wickets ?? event?.score.wickets}</span>
            <span className="border-l border-white/20 px-1.5 py-0.5 text-[10px] font-bold leading-snug text-slate-300">{Math.floor((scoreBug?.balls ?? event?.score.legalBalls ?? 0) / 6)}.{(scoreBug?.balls ?? event?.score.legalBalls ?? 0) % 6} ov</span>
            {scoreBug?.need && <span className="border-l border-white/20 px-1.5 py-0.5 text-[10px] font-bold leading-snug text-amber-300">{scoreBug.need}</span>}
          </div>
          {scoreBug && scoreBug.batters.length > 0 && (
            <div className="border-t border-white/15 px-1.5 py-0.5 text-[9px] leading-tight text-slate-200 sm:text-[10px]">
              {scoreBug.batters.map((b) => <span key={b.name} className="mr-2 whitespace-nowrap"><b className={b.strike ? 'text-amber-300' : 'text-slate-200'}>{b.name.split(' ')[0]}{b.strike ? '*' : ''}</b> {b.runs}<span className="text-slate-400"> ({b.balls})</span></span>)}
              {scoreBug.bowler && <span className="whitespace-nowrap text-sky-300">· {scoreBug.bowler.name.split(' ')[0]} {scoreBug.bowler.figures}</span>}
            </div>
          )}
        </div>
      )}
      <span className="pointer-events-none absolute bottom-1.5 right-2 z-[6001] rounded bg-black/60 px-1.5 text-[10px] font-extrabold tracking-widest text-slate-200">{tag}</span>
      <span className="pointer-events-none absolute left-2 bottom-8 z-[6001] flex items-center gap-1 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white max-sm:hidden"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />Live</span>
    </div>
  )
}
