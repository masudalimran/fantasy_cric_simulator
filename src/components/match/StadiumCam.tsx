import { useEffect, useMemo, useRef } from 'react'
import { PRESENTERS } from '../../data/presenters'
import { PresenterAvatar } from '../PresenterAvatar'
import { Body, type Kit, type Rig } from './Body'
import { Figure, HEIGHT, MIN_SCALE, WIDTH } from './BroadcastView'
import { BAT_END_Z, BOWL_Z, fielderWorld, prep, project, type V3 } from './broadcast'
import { drawScene } from './broadcastDraw'
import { breathe, fielderPose, nonStrikerPose, type Pose } from './bodyPose'
import { cameraAt, cheerleaders, crowdAt, crowdCheer, huddlePerson, screenAt, sparksAt, SHOW_SECONDS, type StadiumShow } from './stadiumShow'
import type { ReplayBase } from './ReplayFrame'

/**
 * The stadium shows on screen: the camera leaves the live picture and travels to the cheerleaders at the boundary, the crowd in the stands, the huddle in
 * the middle or up into the night sky. The ground, the crowd and the people are the broadcast view's own, so it looks like the same place the match is in.
 * Looks only.
 */

const NON_STRIKER_X = -3.2
const BOWL_END_Z = BOWL_Z + 0.7

/** A cheerleader: a drawn head (one of the show's presenters), a top and shorts in the team's colours, and pom-poms or a flag. */
function Cheerleader({ i, colors, flag, rig }: { i: number; colors: [string, string]; flag: boolean; rig: (r: Rig | null) => void }) {
  const kit: Kit = {
    shirt: colors[0], trim: colors[1], trousers: colors[1], pads: false, gloves: null, boots: '#f8fafc',
    ...(flag ? { weapon: { kind: 'staff' as const, blade: '#e5e7eb', edge: '#9ca3af', handle: '#7c2d12', width: 2.4, length: 52, head: { kind: 'flag' as const, color: colors[i % 2], size: 1 } } } : { pom: i % 2 ? colors[0] : colors[1] }),
  }
  const presenter = PRESENTERS[(i * 3 + 1) % PRESENTERS.length]
  return (
    <div className="relative" style={{ width: WIDTH, height: HEIGHT }}>
      <div className="absolute rounded-full" style={{ left: 6, top: 110, width: 48, height: 12, background: 'rgba(0,0,0,0.32)' }} />
      <Body kit={kit} rigRef={rig}>
        <div className="absolute rounded-full" style={{ left: 2, top: 0, width: 56, height: 56, boxShadow: `0 0 0 3px ${colors[1]}, 0 0 10px #000a`, overflow: 'hidden' }}><PresenterAvatar presenter={presenter} size={56} /></div>
      </Body>
    </div>
  )
}

const sprite = 'absolute left-0 top-0 hidden will-change-transform'
const box = { width: WIDTH, height: HEIGHT, transformOrigin: '0 0' } as const

export function StadiumCam({ show, base, rate = 1, label }: { show: StadiumShow; base: ReplayBase; rate?: number; label?: string }) {
  const wrap = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const nodes = useRef(new Map<string, HTMLElement | null>())
  const rigs = useRef(new Map<string, Rig>())
  const setNode = (k: string) => (el: HTMLElement | null) => { nodes.current.set(k, el) }
  const setRig = (k: string) => (r: Rig | null) => { if (r) rigs.current.set(k, r); else rigs.current.delete(k) }
  const rest = useMemo(() => base.fielders.map((f) => fielderWorld(f.x, f.y, f.spot)), [base.fielders])
  const live = useRef({ show, base, rest, rate })
  live.current = { show, base, rest, rate }
  const nCheer = show.kind === 'cheer' && show.variant !== 'cards' ? 6 : 0

  useEffect(() => {
    const el = wrap.current, cv = canvas.current
    if (!el || !cv) return
    let raf = 0
    const t0 = performance.now()
    let last = t0
    const prev = new Map<string, V3>(), speeds = new Map<string, number>(), cycles = new Map<string, number>()
    const lastPose = new Map<string, string>()

    const paint = (now: number) => {
      const L = live.current
      const W = el.clientWidth, H = el.clientHeight
      if (!W || !H) { raf = requestAnimationFrame(paint); return }
      const real = (now - t0) / 1000
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      const t = Math.min(SHOW_SECONDS[L.show.kind], real / Math.max(0.25, L.rate))
      const dpr = Math.min(1.5, window.devicePixelRatio || 1)
      if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr) }
      const ctx = cv.getContext('2d')
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      // the camera, with the slight drift of a hand-held one
      const c0 = cameraAt(L.show, t)
      const amp = 0.003 + 0.003 * (1 - Math.min(1, c0.hfov / 0.8))
      const cam = { p: c0.p, yaw: c0.yaw + amp * (Math.sin(real * 0.9 + 1) + 0.5 * Math.sin(real * 2.3)), pitch: c0.pitch + amp * 0.7 * Math.sin(real * 1.1 + 2), hfov: c0.hfov }
      const sk = sparksAt(L.show, t)
      drawScene(ctx, cam, W, H, {
        pitch: L.base.pitch, look: L.base.look, tick: real, cheer: crowdCheer(L.show, t), wear: 0, board: null, covers: false, stumps: 0, stumpsBowl: 0, trail: [], style: 'plain',
        crowd: crowdAt(L.show, t), screen: screenAt(L.show, t), sparks: sk.sparks, flash: sk.flash,
      })
      if (sk.flash > 0.02) { ctx.fillStyle = `rgba(255,240,220,${(sk.flash * 0.1).toFixed(3)})`; ctx.fillRect(0, 0, W, H) }
      const r = prep(cam, W, H)

      const put = (key: string, world: V3, heightM = 1.8) => {
        const node = nodes.current.get(key)
        if (!node) return false
        const p = project(r, world)
        if (!p || p.x < -90 || p.x > W + 90 || p.y < -60 || p.y > H + 240) { node.style.display = 'none'; return false }
        const s = Math.max(MIN_SCALE, (r.F * heightM) / p.d / HEIGHT)
        node.style.display = 'block'
        node.style.transform = `translate3d(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px,0) scale(${s.toFixed(3)}) translate(-50%,-100%)`
        node.style.zIndex = String(Math.max(1, Math.round(3000 - p.d * 10)))
        return true
      }
      const move = (key: string, w: V3) => {
        const before = prev.get(key)
        prev.set(key, w)
        const inst = before && dt > 0 ? Math.hypot(w.x - before.x, w.z - before.z) / dt : 0
        const v = (speeds.get(key) ?? 0) * 0.55 + Math.min(11, inst) * 0.45
        speeds.set(key, v)
        const cyc = (cycles.get(key) ?? 0) + v * dt * 1.9
        cycles.set(key, cyc)
        return { v, cyc }
      }
      const apply = (key: string, pose: Pose, left = false) => {
        const rig = rigs.current.get(key)
        if (!rig) return
        // (a person at rest moves a dozen times a second, no more)
        const sig = `${Math.round(t * 12)}|${pose.hip.y.toFixed(1)}|${pose.handL.y.toFixed(1)}`
        if (lastPose.get(key) === sig && (speeds.get(key) ?? 0) < 0.3) return
        lastPose.set(key, sig)
        rig.apply(pose, left)
      }
      const tq = Math.floor(real * 12) / 12

      // the fielders, the bowler and the umpires; in the huddle they walk in and gather
      const huddle = L.show.kind === 'huddle'
      const n = L.base.fielders.length + 1
      L.base.fielders.forEach((_f, i) => {
        const w = huddle ? huddlePerson(L.show, t, i, n, L.rest[i]) : null
        const pos = w ? w.pos : L.rest[i]
        if (!put(`f${i}`, pos)) return
        const m = move(`f${i}`, pos)
        let pose: Pose
        if (w && w.pose) pose = w.pose
        else pose = fielderPose({ speed: m.v > 0.8 ? m.v : 0, cyc: m.cyc, ready: 0, dive: 0, catchK: 0, joy: 0, stop: 0, throwK: 0, keeper: i === 0 })
        apply(`f${i}`, m.v < 0.3 && !(w && w.pose) ? breathe(pose, tq, 5 + i) : pose)
      })
      const bowlerRest: V3 = { x: 0.8, y: 0, z: BOWL_Z + 3.5 }
      {
        const w = huddle ? huddlePerson(L.show, t, n - 1, n, bowlerRest) : null
        const pos = w ? w.pos : bowlerRest
        if (put('bowler', pos)) {
          const m = move('bowler', pos)
          apply('bowler', w && w.pose ? w.pose : m.v < 0.3 ? breathe(fielderPose({ speed: 0, cyc: 0, ready: 0, dive: 0, catchK: 0, joy: 0, stop: 0, throwK: 0, keeper: false }), tq, 4) : fielderPose({ speed: m.v, cyc: m.cyc, ready: 0, dive: 0, catchK: 0, joy: 0, stop: 0, throwK: 0, keeper: false }))
        }
      }
      const stance = L.base.striker.hand === 'L' ? -0.75 : 0.75
      if (put('striker', { x: stance, y: 0, z: BAT_END_Z })) apply('striker', breathe(nonStrikerPose({ t: 9, t1: 1, speed: 0, cyc: 0, bat: true }), tq, 1), L.base.striker.hand === 'L')
      if (put('nonstriker', { x: NON_STRIKER_X, y: 0, z: BOWL_END_Z })) apply('nonstriker', breathe(nonStrikerPose({ t: 9, t1: 1, speed: 0, cyc: 0, bat: true }), tq, 2), L.base.nonStriker?.hand === 'L')
      for (const [k, pos] of [['umpire1', { x: -1.15, y: 0, z: -22.2 }], ['umpire2', { x: stance > 0 ? 13 : -13, y: 0, z: -2 }]] as [string, V3][]) {
        if (put(k, pos)) apply(k, breathe({ ...fielderPose({ speed: 0, cyc: 0, ready: 0, dive: 0, catchK: 0, joy: 0, stop: 0, throwK: 0, keeper: false }), handL: { x: -6, y: 26 }, handR: { x: 6, y: 26 } }, tq, 3, 0.6))
      }

      // the cheerleaders
      if (L.show.kind === 'cheer' && L.show.variant !== 'cards') {
        const dancers = cheerleaders(L.show, t)
        // (the ones who are lower in the picture stand in front of the others: the order follows the depth)
        dancers.forEach((d, i) => {
          if (!put(`c${i}`, d.pos, 1.65)) return
          rigs.current.get(`c${i}`)?.apply(d.pose)
        })
      }
      raf = requestAnimationFrame(paint)
    }
    raf = requestAnimationFrame(paint)
    return () => cancelAnimationFrame(raf)
  }, [])

  const fl = show.variant === 'flags'
  return (
    <div ref={wrap} className="absolute inset-0 overflow-hidden rounded-2xl bg-black" aria-label={label ?? 'Stadium'}>
      <canvas ref={canvas} className="absolute inset-0 h-full w-full" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {base.fielders.map((f, i) => (
          <div key={f.player.id} ref={setNode(`f${i}`)} className={sprite} style={box}>
            <Figure player={f.player} team={base.bowlTeam} look={i === 0 ? 'keeper' : 'fielder'} rig={setRig(`f${i}`)} />
          </div>
        ))}
        <div ref={setNode('bowler')} className={sprite} style={box}><Figure player={base.bowler} team={base.bowlTeam} look="bowler" rig={setRig('bowler')} /></div>
        <div ref={setNode('striker')} className={sprite} style={box}><Figure player={base.striker} team={base.batTeam} look="striker" rig={setRig('striker')} /></div>
        {base.nonStriker && <div ref={setNode('nonstriker')} className={sprite} style={box}><Figure player={base.nonStriker} team={base.batTeam} look="nonstriker" rig={setRig('nonstriker')} /></div>}
        <div ref={setNode('umpire1')} className={sprite} style={box}><Figure look="umpire" rig={setRig('umpire1')} /></div>
        <div ref={setNode('umpire2')} className={sprite} style={box}><Figure look="umpire" rig={setRig('umpire2')} /></div>
        {Array.from({ length: nCheer }, (_, i) => (
          <div key={`c${i}`} ref={setNode(`c${i}`)} className={sprite} style={box}><Cheerleader i={i} colors={show.colors} flag={fl} rig={setRig(`c${i}`)} /></div>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent" />
      {label && <div className="pointer-events-none absolute bottom-3 left-3 z-[9000] rounded bg-black/70 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-widest text-white ring-1" style={{ boxShadow: `inset 3px 0 0 ${show.colors[0]}` }}>{label}</div>}
      <div className="pointer-events-none absolute right-2 top-2 z-[9000] rounded-full bg-black/60 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-300">Tap to skip</div>
    </div>
  )
}
