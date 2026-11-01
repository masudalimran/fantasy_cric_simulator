import { useEffect, useMemo, useRef } from 'react'
import { PRESENTERS, type Presenter } from '../../data/presenters'
import { lineAt } from './ceremonyScript'
import type { Player, Team } from '../../types'
import { callName } from './format'
import { TrophyArt, type TrophyKind } from './TrophyArt'
import { PresenterAvatar } from '../PresenterAvatar'
import { Body, type Kit, type Rig } from './Body'
import { PlayerAvatar } from '../ui'
import { Figure, HEIGHT, MIN_SCALE, WIDTH } from './BroadcastView'
import { BAT_END_Z, BOWL_Z, fielderWorld, prep, project, type V3 } from './broadcast'
import { drawScene } from './broadcastDraw'
import { batsmanPose, breathe, fielderPose, nonStrikerPose, type Pose, standing } from './bodyPose'
import { CEREMONY_BEATS } from './ceremonyScript'
import { beatAt } from './stadiumShow'
import { benchSpot, benchStand, platformCentre, platformSide, djCentre, djPose, crewPose, DJ, moonBall, moonLandAt, moonOutcome, batsmanDown, dugoutPose, drinksPerson, handshakePos, shaking, physioPos, physioPose, presenterPos, presenterPose, saluteBowler, staffPos, ceremonyLine, ceremonyPerson, hostPos, balconyPose, bowlerPhase, bowlerPos, cameraAt, captainPos, coinAt, coverAt, crewPos, landingBall, linePerson, lineSpot, LINEUP, MILESTONE, photoFlashes, podiumPos, towersAt, hugCelebrant, hugJoiners, hugPerson, hugSpot, walkoffPos, WALKOFF, cheerleaders, confettiAt, crowdAt, crowdCheer, ENTRANCE, huddlePerson, screenAt, shinePose, sparksAt, SHOW_SECONDS, trophyPerson, walkerPos, type StadiumShow } from './stadiumShow'
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

/** The host of the presentation: a presenter in a smart suit, her face drawn in code, one hand up with the microphone when she speaks. */
function HostFigure({ presenter, colors, rig }: { presenter: Presenter; colors: [string, string]; rig: (r: Rig | null) => void }) {
  const kit: Kit = { shirt: '#111827', trim: colors[0], trousers: '#0f172a', pads: false, gloves: null, boots: '#020617' }
  return (
    <div className="relative" style={{ width: WIDTH, height: HEIGHT }}>
      <div className="absolute rounded-full" style={{ left: 6, top: 110, width: 48, height: 12, background: 'rgba(0,0,0,0.32)' }} />
      <Body kit={kit} rigRef={rig}>
        <div className="absolute rounded-full" style={{ left: 2, top: 0, width: 56, height: 56, boxShadow: `0 0 0 3px ${presenter.accent}, 0 0 10px #000a`, overflow: 'hidden' }}><PresenterAvatar presenter={presenter} size={56} /></div>
      </Body>
    </div>
  )
}

const sprite = 'absolute left-0 top-0 hidden will-change-transform'
const box = { width: WIDTH, height: HEIGHT, transformOrigin: '0 0' } as const

/** The people the show is about who are not on the field in the live picture: the batsman walking in, or the winning team. */
export interface Cast { team: Team; players: Player[]; /** Staff in coloured tops (the physio, the drinks carriers, the coach). */ staff?: { count: number; tint: string }; /** The presenter who hosts the ceremony. */ host?: Presenter; /** The other team (the line-up): its players are drawn on the other side. */ rivals?: { team: Team; players: Player[] }; /** Ground staff (the rain). */ crew?: number }

export function StadiumCam({ show, base, rate = 1, label, cast }: { show: StadiumShow; base: ReplayBase; rate?: number; label?: string; cast?: Cast }) {
  const wrap = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const nodes = useRef(new Map<string, HTMLElement | null>())
  const rigs = useRef(new Map<string, Rig>())
  const setNode = (k: string) => (el: HTMLElement | null) => { nodes.current.set(k, el) }
  const setRig = (k: string) => (r: Rig | null) => { if (r) rigs.current.set(k, r); else rigs.current.delete(k) }
  const rest = useMemo(() => base.fielders.map((f) => fielderWorld(f.x, f.y, f.spot)), [base.fielders])
  const live = useRef({ show, base, rest, rate, cast })
  live.current = { show, base, rest, rate, cast }
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
      let crowd = crowdAt(L.show, t)
      // (the crowd's clock is the real one, so a fan's reaction to the ball is timed in real seconds)
      if (crowd?.fanReact) crowd = { ...crowd, fanReact: { ...crowd.fanReact, t0: crowd.fanReact.t0 * Math.max(0.25, L.rate) } }
      drawScene(ctx, cam, W, H, {
        pitch: L.base.pitch, look: L.show.kind === 'rain' ? { ...L.base.look, rain: L.show.rain ?? 2, weather: 'rain' as const, covers: false } : L.show.kind === 'lights' ? { ...L.base.look, time: 'dusk', lights: false, rain: 0, weather: 'clear' as const } : L.base.look, tick: real, cheer: crowdCheer(L.show, t), wear: 0, board: null, covers: false, stumps: 0, stumpsBowl: 0, trail: [], style: 'plain',
        crowd, ball3: L.show.kind === 'moonshot' ? moonBall(L.show, t) : L.show.kind === 'landing' ? landingBall(L.show, t) : null, coverK: L.show.kind === 'rain' ? coverAt(t) : undefined, sets: { dugout: (L.show.kind === 'milestone' && t >= MILESTONE.cut) || L.show.kind === 'dugout' ? L.show.colors : undefined, platform: L.show.kind === 'cheer' && L.show.variant !== 'cards' ? { centre: platformCentre(L.show.seed), side: platformSide(L.show.seed), colors: L.show.colors, dj: djCentre(L.show.seed) } : undefined, outside: L.show.kind === 'moonshot' ? { seed: L.show.seed, landing: { x: (L.show.landing ?? { x: 160, y: 0, z: -10 }).x, y: 0, z: (L.show.landing ?? { x: 160, y: 0, z: -10 }).z }, outcome: L.show.outcome ?? moonOutcome(L.show.seed), since: t - moonLandAt(), tick: real } : undefined }, stage: L.show.kind === 'ceremony' && L.show.ceremony ? { colors: L.show.colors, title: 'PLAYER OF THE MATCH', sub: L.show.ceremony.title } : undefined, podium: L.show.kind === 'motm', towers: L.show.kind === 'lights' ? towersAt(t) : undefined,  screen: screenAt(L.show, t), confetti: confettiAt(L.show, t), sparks: L.show.kind === 'motm' || (L.show.kind === 'ceremony' && t > 17) ? [...sk.sparks, ...photoFlashes(L.show.seed, t)] : sk.sparks, flash: sk.flash,
      })
      // the light of the hour: at dusk everything goes golden and a low sun glows on the horizon
      if (L.base.look.time === 'dusk' && L.show.kind !== 'lights') {
        const g = ctx.createLinearGradient(0, 0, 0, H)
        g.addColorStop(0, 'rgba(255,140,60,0.04)'); g.addColorStop(1, 'rgba(255,110,30,0.2)')
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
        const rr0 = prep(cam, W, H)
        const sun = project(rr0, { x: -110, y: 16, z: 70 })
        if (sun) {
          const rad = W * 0.55
          const sg = ctx.createRadialGradient(sun.x, sun.y, 0, sun.x, sun.y, rad)
          sg.addColorStop(0, 'rgba(255,236,170,0.85)'); sg.addColorStop(0.18, 'rgba(255,170,80,0.45)'); sg.addColorStop(1, 'rgba(255,120,40,0)')
          ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H); ctx.restore()
        }
      }
      if (sk.flash > 0.02) { ctx.fillStyle = `rgba(255,240,220,${(sk.flash * 0.1).toFixed(3)})`; ctx.fillRect(0, 0, W, H) }
      const r = prep(cam, W, H)

      const anchors = new Map<string, { x: number; y: number; s: number }>()
      const put = (key: string, world: V3, heightM = 1.8) => {
        const node = nodes.current.get(key)
        if (!node) return false
        const p = project(r, world)
        if (!p || p.x < -90 || p.x > W + 90 || p.y < -60 || p.y > H + 240) { node.style.display = 'none'; return false }
        const s = Math.max(MIN_SCALE, (r.F * heightM) / p.d / HEIGHT)
        anchors.set(key, { x: p.x, y: p.y, s })
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

      // the fielders, the bowler and the umpires; in the huddle they walk in and gather (the trophy celebration is about the winners alone)
      const huddle = L.show.kind === 'huddle'
      const hug = L.show.kind === 'hug' || L.show.kind === 'salute'
      const salute = L.show.kind === 'salute'
      const drinks = L.show.kind === 'drinks'
      const hugBowlerRest: V3 = { x: 0.8, y: 0, z: BOWL_Z + 3.5 }
      const hugFroms = hug ? [...L.rest, hugBowlerRest] : []
      const hugCel = hug ? (L.show.celebrant === 'bowler' || L.show.celebrant === undefined ? L.rest.length : L.show.celebrant) : -1
      const hugJoin = hug ? hugJoiners(L.show, hugFroms, hugCel) : []
      const hideBase = L.show.kind === 'trophy' || L.show.kind === 'rain' || L.show.kind === 'motm' || L.show.kind === 'lineup' || L.show.kind === 'milestone' || L.show.kind === 'ceremony' || L.show.kind === 'dugout' || L.show.kind === 'handshake' || L.show.kind === 'pitchreport' || L.show.kind === 'fans' || L.show.kind === 'pitchmap' || L.show.kind === 'beehive'
      const n = L.base.fielders.length + 1
      if (!hideBase) L.base.fielders.forEach((_f, i) => {
        let w = huddle ? huddlePerson(L.show, t, i, n, L.rest[i]) : null
        if (drinks) { const dp = drinksPerson(L.show, t, i, n, L.rest[i]); w = { pos: dp.pos, walking: !dp.settled, pose: dp.settled ? breathe({ ...standing(), hip: { x: 30, y: 85.3 }, handR: { x: 6, y: -2 }, handL: { x: -9, y: 24 } }, tq, i, 0.8) : null } }
        if (hug) {
          const k = hugJoin.indexOf(i)
          w = i === hugCel ? { pos: L.rest[i], walking: false, pose: hugCelebrant(t) } : (() => { const hp = hugPerson(t, L.rest[i], hugSpot(L.show, Math.max(0, k), hugJoin.length), k >= 0); return { pos: hp.pos, walking: !hp.arrived, pose: hp.pose } })()
        }
        const pos = w ? w.pos : L.rest[i]
        if (!put(`f${i}`, pos)) return
        const m = move(`f${i}`, pos)
        let pose: Pose
        if (w && w.pose) pose = w.pose
        else pose = fielderPose({ speed: m.v > 0.8 ? m.v : 0, cyc: m.cyc, ready: 0, dive: 0, catchK: 0, joy: 0, stop: 0, throwK: 0, keeper: i === 0 })
        apply(`f${i}`, m.v < 0.3 && !(w && w.pose) ? breathe(pose, tq, 5 + i) : pose)
      })
      const bowlerRest: V3 = { x: 0.8, y: 0, z: BOWL_Z + 3.5 }
      if (!hideBase && L.show.kind !== 'bowler') {
        let w = huddle ? huddlePerson(L.show, t, n - 1, n, bowlerRest) : null
        if (drinks) { const dp = drinksPerson(L.show, t, n - 1, n, bowlerRest); w = { pos: dp.pos, walking: !dp.settled, pose: dp.settled ? breathe({ ...standing(), hip: { x: 30, y: 85.3 }, handR: { x: 6, y: -2 }, handL: { x: -9, y: 24 } }, tq, 4, 0.8) : null } }
        if (hug) {
          const k = hugJoin.indexOf(L.rest.length)
          w = hugCel === L.rest.length ? (salute ? (() => { const sb = saluteBowler(t, L.show.seed); return { pos: sb.pos, walking: false, pose: sb.pose } })() : { pos: bowlerRest, walking: false, pose: hugCelebrant(t) }) : (() => { const hp = hugPerson(t, bowlerRest, hugSpot(L.show, Math.max(0, k), hugJoin.length), k >= 0); return { pos: hp.pos, walking: !hp.arrived, pose: hp.pose } })()
        }
        const pos = w ? w.pos : bowlerRest
        if (put('bowler', pos)) {
          const m = move('bowler', pos)
          apply('bowler', w && w.pose ? w.pose : m.v < 0.3 ? breathe(fielderPose({ speed: 0, cyc: 0, ready: 0, dive: 0, catchK: 0, joy: 0, stop: 0, throwK: 0, keeper: false }), tq, 4) : fielderPose({ speed: m.v, cyc: m.cyc, ready: 0, dive: 0, catchK: 0, joy: 0, stop: 0, throwK: 0, keeper: false }))
        }
      }
      const stance = L.base.striker.hand === 'L' ? -0.75 : 0.75
      if (!hideBase && L.show.kind !== 'entrance' && L.show.kind !== 'walkoff' && put('striker', { x: stance, y: 0, z: BAT_END_Z })) apply('striker', L.show.kind === 'physio' ? batsmanPose({ style: 'defend', t: 9, t1: 1, t2: 2, swing: 0, hurt: 0, raise: Math.max(0, Math.min(1, (t - 7.2) / 0.5)), joy: 0, speed: 0, cyc: 0, walkOff: false, stranded: batsmanDown(t) }) : breathe(nonStrikerPose({ t: 9, t1: 1, speed: 0, cyc: 0, bat: true }), tq, 1), L.base.striker.hand === 'L')
      if (!hideBase && put('nonstriker', { x: NON_STRIKER_X, y: 0, z: BOWL_END_Z })) apply('nonstriker', breathe(nonStrikerPose({ t: 9, t1: 1, speed: 0, cyc: 0, bat: true }), tq, 2), L.base.nonStriker?.hand === 'L')
      for (const [k, pos] of [['umpire1', { x: -1.15, y: 0, z: -22.2 }], ['umpire2', { x: stance > 0 ? 13 : -13, y: 0, z: -2 }]] as [string, V3][]) {
        if (!hideBase && put(k, pos)) apply(k, breathe({ ...fielderPose({ speed: 0, cyc: 0, ready: 0, dive: 0, catchK: 0, joy: 0, stop: 0, throwK: 0, keeper: false }), handL: { x: -6, y: 26 }, handR: { x: 6, y: 26 } }, tq, 3, 0.6))
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
      // the DJ and his crew in their own booth beside the platform
      if (L.show.kind === 'cheer' && L.show.variant !== 'cards') {
        const D = djCentre(L.show.seed), sd = platformSide(L.show.seed)
        if (put('dj', { x: D.x + sd * 0.5, y: DJ.h, z: D.z })) apply('dj', djPose(t))
        ;[0, 1].forEach((i) => { if (put(`crew${i}`, { x: D.x + sd * 0.4, y: DJ.h, z: D.z + (i ? 2.3 : -2.3) })) apply(`crew${i}`, crewPose(t, i)) })
      }
      // the people the show is about: the new batsman walking in, or the winners with the cup
      const cs = L.cast
      if (cs && L.show.kind === 'entrance') {
        cs.players.forEach((pl, i) => {
          const wp = walkerPos(L.show, t, i)
          if (!put(`w${i}`, wp)) return
          const m = move(`w${i}`, wp)
          const raise = Math.max(0, Math.min(1, (t - (ENTRANCE.start + ENTRANCE.walk)) / 0.5)) // he lifts his bat to the crowd when he gets there
          apply(`w${i}`, batsmanPose({ style: 'defend', t: 9, t1: 1, t2: 2, swing: 0, hurt: 0, raise, joy: 0, speed: m.v, cyc: m.cyc, walkOff: false }), pl.hand === 'L')
        })
      }
      if (cs && L.show.kind === 'walkoff') {
        const wp = walkoffPos(L.show, t)
        const wn = nodes.current.get('w0')
        if (!wp) { if (wn) wn.style.display = 'none' } else if (put('w0', wp)) {
          const m = move('w0', wp)
          const ov = !!L.show.walk?.ovation
          const raise = ov ? Math.max(0, Math.min(1, (t - WALKOFF.start) / 0.6)) : 0 // after a big score he walks off with his bat raised to the crowd
          apply('w0', batsmanPose({ style: 'defend', t: 9, t1: 1, t2: 2, swing: 0, hurt: 0, raise, joy: 0, speed: Math.max(m.v, 3), cyc: m.cyc, walkOff: !ov }), L.show.left)
        }
      }
      if (cs && L.show.kind === 'bowler') {
        const bp = bowlerPos(L.show, t)
        if (put('w0', bp)) {
          const m = move('w0', bp)
          const ph = bowlerPhase(L.show, t)
          const walking = fielderPose({ speed: Math.max(m.v, 0), cyc: m.cyc, ready: 0, dive: 0, catchK: 0, joy: 0, stop: 0, throwK: 0, keeper: false })
          rigs.current.get('w0')?.apply(ph === 'shine' ? shinePose(t) : ph === 'ready' ? { ...breathe(standing(), tq, 4), ball: true, handR: { x: 6, y: 14 }, handL: { x: -6, y: 16 } } : { ...walking, ball: true, handR: { x: 6, y: 14 } })
        }
      }
      // a fifty or a hundred: the batsman raises his bat at the crease, then the team on the balcony stands and claps
      if (cs && L.show.kind === 'milestone') {
        const bw: V3 = { x: L.base.striker.hand === 'L' ? -0.75 : 0.75, y: 0, z: BAT_END_Z }
        if (put('w0', bw)) apply('w0', batsmanPose({ style: 'defend', t: 9, t1: 1, t2: 2, swing: 0, hurt: 0, raise: Math.min(1, t / 0.9), joy: 0, speed: 0, cyc: 0, walkOff: false }), L.base.striker.hand === 'L')
        const mates = cs.players.slice(1)
        mates.forEach((_p, i) => { const sp = benchSpot(i, mates.length, benchStand(t, i, MILESTONE.cut + 0.3)); if (t >= MILESTONE.cut && put(`w${i + 1}`, sp)) apply(`w${i + 1}`, balconyPose(t, i)); else { const nd = nodes.current.get(`w${i + 1}`); if (nd) nd.style.display = 'none' } })
      }
      // Man of the Match: the winner on the middle step, arms up, with the cup; the photographers' flashes go off round the rope
      if (cs && L.show.kind === 'motm') {
        const pp = podiumPos()
        if (put('w0', { x: pp.x, y: 0.9, z: pp.z })) {
          const b = real * 5.2, jump = Math.max(0, Math.sin(b))
          apply('w0', { ...standing(), hip: { x: 30, y: 85.3 - 4 * jump }, handL: { x: -19, y: -25 }, handR: { x: 19, y: -25 + 3 * Math.sin(b) }, head: { dx: 0, dy: 0, tilt: 3 * Math.sin(b) } })
        }
      }
      // the rain: the ground staff run out and pull the covers over the pitch
      if (cs && L.show.kind === 'rain') {
        const n = cs.crew ?? 6
        for (let i = 0; i < n; i++) {
          const gp = crewPos(i, n, t)
          if (!put(`g${i}`, gp)) continue
          const m = move(`g${i}`, gp)
          apply(`g${i}`, fielderPose({ speed: Math.max(4, m.v), cyc: m.cyc, ready: 0, dive: 0, catchK: 0, joy: 0, stop: 0, throwK: 0, keeper: false }))
        }
      }
      // the staff: the physio running on to the batsman, the drinks carriers, the coach among the team in the dressing room
      if (cs && cs.staff) {
        for (let i = 0; i < cs.staff.count; i++) {
          let sp: V3 | null = null, pose: Pose | null = null
          if (L.show.kind === 'physio') { sp = physioPos(L.show, t); pose = physioPose(t) }
          else if (L.show.kind === 'drinks') { sp = staffPos(L.show, i, cs.staff.count, t); pose = null }
          else if (L.show.kind === 'dugout') { const b0 = benchSpot(0, 1, 1); sp = { x: 4.6, y: 0, z: b0.z + 0.9 }; pose = { ...standing(), hip: { x: 30, y: 85.3 }, handL: { x: -10, y: 24 }, handR: { x: 11 + 4 * Math.sin(t * 2), y: 6 + 3 * Math.cos(t * 2.3) } } }
          if (!sp || !put(`s${i}`, sp)) continue
          const m = move(`s${i}`, sp)
          apply(`s${i}`, pose ?? fielderPose({ speed: Math.max(m.v, 3.5), cyc: m.cyc, ready: 0, dive: 0, catchK: 0, joy: 0, stop: 0, throwK: 0, keeper: false }))
        }
      }
      // the dressing room: the team reacting
      if (cs && L.show.kind === 'dugout') {
        const mood = L.show.mood ?? 'cheer'
        cs.players.forEach((_p, i) => { const sp = benchSpot(i, cs.players.length, mood === 'cheer' ? benchStand(t, i, 1.0) : 0); if (put(`w${i}`, sp)) apply(`w${i}`, dugoutPose(t, i, mood)) })
      }
      // the pitch report: the presenter crouching at the pitch
      if (cs && L.show.kind === 'pitchreport' && cs.host) {
        const pp = presenterPos(t)
        if (put('host', pp)) { const m = move('host', pp); apply('host', m.v > 1 ? fielderPose({ speed: m.v, cyc: m.cyc, ready: 0, dive: 0, catchK: 0, joy: 0, stop: 0, throwK: 0, keeper: false }) : presenterPose(t)) }
      }
      // the handshakes: both teams file past each other
      if (cs && L.show.kind === 'handshake') {
        const place2 = (key: string, c: { team: Team; players: Player[] }, side: 0 | 1) => c.players.forEach((_p, i) => {
          const hp = handshakePos(side, i, t)
          if (!put(`${key}${i}`, hp)) return
          const m = move(`${key}${i}`, hp)
          const sh = shaking(side, i, t, c.players.length)
          const pose = fielderPose({ speed: Math.max(2.5, m.v), cyc: m.cyc, ready: 0, dive: 0, catchK: 0, joy: 0, stop: 0, throwK: 0, keeper: false })
          apply(`${key}${i}`, sh ? { ...pose, handR: side === 0 ? { x: 21, y: 16 } : { x: -3, y: 28 }, handL: side === 1 ? { x: -21, y: 16 } : { x: -10, y: 26 } } : pose)
        })
        place2('w', cs, 0)
        if (cs.rivals) place2('v', cs.rivals, 1)
      }
      // the post-match presentation: the host on the stage, both teams clapping at the sides, the captains and the Man of the Match going up to the microphone in turn
      const subEl = nodes.current.get('sub'), chequeEl = nodes.current.get('cheque')
      if (subEl) subEl.style.display = 'none'
      if (chequeEl) chequeEl.style.display = 'none'
      if (cs && L.show.kind === 'ceremony' && L.show.ceremony) {
        const cer = L.show.ceremony
        const line = lineAt(cer.script, t)
        const placeSide = (key: string, c: { team: Team; players: Player[] }, side: 0 | 1) => {
          c.players.forEach((pl, i) => {
            const cp = ceremonyPerson(L.show, t, pl.id, ceremonyLine(side, i), side, i)
            if (!put(`${key}${i}`, cp.pos)) return
            const m = move(`${key}${i}`, cp.pos)
            const talking = !!line && ((line.who === 'win' && pl.id === cer.winCaptainId) || (line.who === 'lose' && pl.id === cer.loseCaptainId) || (line.who === 'motm' && pl.id === cer.motmId))
            const b = beatAt(t) * 0.8 + i
            const clap = Math.abs(Math.sin(b))
            let pose: Pose
            if (!cp.arrived || m.v > 1.2) pose = fielderPose({ speed: Math.max(3.5, m.v), cyc: m.cyc, ready: 0, dive: 0, catchK: 0, joy: 0, stop: 0, throwK: 0, keeper: false })
            else if (cp.onStage) pose = { ...standing(), hip: { x: 30, y: 85.3 }, lean: talking ? 3 * Math.sin(t * 3) : 0, handL: { x: -10, y: 24 }, handR: talking ? { x: 14, y: 6 + 4 * Math.sin(t * 5) } : { x: 10, y: 24 } }
            else pose = { ...standing(), hip: { x: 30, y: 85.3 }, handL: { x: -4 - 6 * clap, y: 6 - 4 * clap }, handR: { x: 4 + 6 * clap, y: 6 - 4 * clap }, head: { dx: 0, dy: 0, tilt: 2 * Math.sin(b) } }
            apply(`${key}${i}`, pose)
          })
        }
        placeSide('w', cs, 0)
        if (cs.rivals) placeSide('v', cs.rivals, 1)
        const hp = hostPos(t)
        if (put('host', hp)) {
          const m = move('host', hp)
          const speaking = !!line && line.who === 'host'
          apply('host', m.v > 1 ? fielderPose({ speed: m.v, cyc: m.cyc, ready: 0, dive: 0, catchK: 0, joy: 0, stop: 0, throwK: 0, keeper: false }) : { ...standing(), hip: { x: 30, y: 85.3 }, lean: speaking ? 2 * Math.sin(t * 2.4) : 0, handL: { x: -10, y: 24 }, handR: speaking ? { x: 12, y: 2 + 5 * Math.sin(t * 4.2) } : { x: 10, y: 24 }, head: { dx: 0, dy: 0, tilt: speaking ? 4 * Math.sin(t * 3) : 0 } })
        }
        // what is being said, as a line along the bottom with the speaker's name
        if (subEl && line) {
          const who = line.who === 'host' ? cer.hostName : line.who === 'win' ? cs.players.find((p) => p.id === cer.winCaptainId)?.name : line.who === 'lose' ? cs.rivals?.players.find((p) => p.id === cer.loseCaptainId)?.name : [...cs.players, ...(cs.rivals?.players ?? [])].find((p) => p.id === cer.motmId)?.name
          const tag = line.who === 'host' ? 'HOST' : line.who === 'win' ? 'WINNING CAPTAIN' : line.who === 'lose' ? 'LOSING CAPTAIN' : 'PLAYER OF THE MATCH'
          subEl.style.display = 'block'
          const nameNode = subEl.querySelector('[data-who]'), tagNode = subEl.querySelector('[data-tag]'), textNode = subEl.querySelector('[data-text]')
          if (nameNode && nameNode.textContent !== (who ?? '')) nameNode.textContent = who ?? ''
          if (tagNode && tagNode.textContent !== tag) tagNode.textContent = tag
          if (textNode && textNode.textContent !== line.text) textNode.textContent = line.text
          subEl.style.opacity = String(Math.min(1, (t - line.at) / 0.25, (line.end - t) / 0.25))
        }
        // the prize money: a big cheque held between the host and the Man of the Match
        if (chequeEl && t >= CEREMONY_BEATS.cheque && t < CEREMONY_BEATS.cheque + 5.6) { // (held between the host and the winner while the prize is handed over, then put away)
          const cp = project(r, { x: -0.25, y: 1.0, z: -7.75 })
          if (cp) {
            const sc = Math.max(0.3, (r.F * 1.9) / cp.d / 260) * Math.min(1, (t - CEREMONY_BEATS.cheque) / 0.4, (CEREMONY_BEATS.cheque + 5.6 - t) / 0.4)
            chequeEl.style.display = 'block'; chequeEl.style.zIndex = '4100'
            chequeEl.style.transform = `translate3d(${cp.x.toFixed(1)}px,${cp.y.toFixed(1)}px,0) scale(${sc.toFixed(3)}) translate(-50%,-50%)`
          }
        }
      }
      // the toss and the line-up: the captains meet in the middle for the coin, then both teams run out and line up with their names over their heads
      const coinEl = nodes.current.get('coin')
      if (coinEl) coinEl.style.display = 'none'
      if (cs && L.show.kind === 'lineup') {
        const sides: { key: string; c: { team: Team; players: Player[] }; side: 0 | 1 }[] = [{ key: 'w', c: cs, side: 0 }, ...(cs.rivals ? [{ key: 'v', c: cs.rivals, side: 1 as 0 | 1 }] : [])]
        for (const sd of sides) {
          sd.c.players.forEach((pl, i) => {
            const cap = pl.id === sd.c.team.captainId
            const lp = linePerson(sd.side, i, t)
            const pos = cap ? captainPos(sd.side, t, lineSpot(sd.side, i)) : lp.pos
            if (!put(`${sd.key}${i}`, pos)) { const pn = nodes.current.get(`${sd.key}n${i}`); if (pn) pn.style.display = 'none'; return }
            const m = move(`${sd.key}${i}`, pos)
            const settled = cap ? t > LINEUP.coinEnd + 1.9 : lp.arrived
            apply(`${sd.key}${i}`, settled ? breathe(standing(), tq, i + 3, 0.7) : fielderPose({ speed: Math.max(3.5, m.v), cyc: m.cyc, ready: 0, dive: 0, catchK: 0, joy: 0, stop: 0, throwK: 0, keeper: false }))
            // the name plate over his head, once he is in his place
            const pn = nodes.current.get(`${sd.key}n${i}`), a = anchors.get(`${sd.key}${i}`)
            if (pn && a) { const show = settled && t > LINEUP.lined - 1.8; pn.style.display = show ? 'block' : 'none'; if (show) pn.style.transform = `translate3d(${a.x.toFixed(1)}px,${(a.y - 118 * a.s - 4 - (i % 2) * 13).toFixed(1)}px,0) translate(-50%,-100%)` }
          })
        }
        const ci = coinAt(t)
        if (coinEl && ci) {
          const p = project(r, { x: 0, y: ci.y, z: -9 })
          if (p) { const sz = Math.max(10, (r.F * 0.32) / p.d); coinEl.style.display = 'block'; coinEl.style.width = coinEl.style.height = `${sz.toFixed(0)}px`; coinEl.style.transform = `translate3d(${(p.x - sz / 2).toFixed(1)}px,${(p.y - sz / 2).toFixed(1)}px,0) scaleY(${Math.abs(Math.cos(ci.turn)).toFixed(3)})` }
        }
      }
      const tn = nodes.current.get('trophy')
      if (tn) tn.style.display = 'none'
      if (cs && L.show.kind === 'motm' && tn && L.show.trophy) {
        const a = anchors.get('w0')
        if (a) { tn.style.display = 'block'; tn.style.transform = `translate3d(${(a.x + 22 * a.s).toFixed(1)}px,${(a.y - 74 * a.s).toFixed(1)}px,0) scale(${(a.s * 0.8).toFixed(3)}) translate(-50%,-88%)`; tn.style.zIndex = '4000' }
      }
      if (cs && L.show.kind === 'trophy') {
        cs.players.forEach((_p, i) => {
          const w = trophyPerson(t, i, cs.players.length)
          if (!put(`w${i}`, w.pos)) return
          const m = move(`w${i}`, w.pos)
          rigs.current.get(`w${i}`)?.apply(w.pose ?? fielderPose({ speed: Math.max(4, m.v), cyc: m.cyc, ready: 0, dive: 0, catchK: 0, joy: 1, stop: 0, throwK: 0, keeper: false }))
        })
        // the cup: held at the captain's chest, then lifted over his head
        const a = anchors.get('w0'), hd = rigs.current.get('w0')?.hands()
        if (tn && a && hd && L.show.trophy) {
          const px = a.x + (hd.x - 30) * a.s, py = a.y + (hd.y - 120) * a.s
          tn.style.display = 'block'
          tn.style.transform = `translate3d(${px.toFixed(1)}px,${py.toFixed(1)}px,0) scale(${(a.s * 1.05).toFixed(3)}) translate(-50%,-88%)`
          tn.style.zIndex = '4000'
        }
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
        {cast && show.kind === 'ceremony' && cast.host && <div ref={setNode('host')} className={sprite} style={box}><HostFigure presenter={cast.host} colors={show.colors} rig={setRig('host')} /></div>}
        {cast && cast.rivals && cast.rivals.players.map((p, i) => (
          <div key={`v${p.id}`} ref={setNode(`v${i}`)} className={sprite} style={box}>
            <Figure player={p} team={cast.rivals!.team} look="fielder" rig={setRig(`v${i}`)} />
          </div>
        ))}
        {cast && cast.rivals && cast.rivals.players.map((p, i) => <div key={`vn${p.id}`} ref={setNode(`vn${i}`)} className="pointer-events-none absolute left-0 top-0 z-[5000] hidden whitespace-nowrap rounded bg-black/75 px-1 text-[9px] font-bold text-white" style={{ borderBottom: `2px solid ${cast.rivals!.team.colors.primary}` }}>{callName(p)}</div>)}
        {cast && show.kind === 'lineup' && cast.players.map((p, i) => <div key={`wn${p.id}`} ref={setNode(`wn${i}`)} className="pointer-events-none absolute left-0 top-0 z-[5000] hidden whitespace-nowrap rounded bg-black/75 px-1 text-[9px] font-bold text-white" style={{ borderBottom: `2px solid ${cast.team.colors.primary}` }}>{callName(p)}</div>)}
        {show.kind === 'lineup' && <div ref={setNode('coin')} className="pointer-events-none absolute left-0 top-0 z-[5001] hidden rounded-full" style={{ background: 'radial-gradient(circle at 35% 30%, #fff7d6, #fbbf24 55%, #b45309)', boxShadow: '0 0 8px #fde68a' }} />}
        {cast && cast.staff && Array.from({ length: cast.staff.count }, (_, i) => (
          <div key={`s${i}`} ref={setNode(`s${i}`)} className={sprite} style={box}><Figure look="staff" tint={cast.staff!.tint} rig={setRig(`s${i}`)} /></div>
        ))}
        {cast && show.kind === 'pitchreport' && cast.host && <div ref={setNode('host')} className={sprite} style={box}><HostFigure presenter={cast.host} colors={show.colors} rig={setRig('host')} /></div>}
        {cast && cast.crew && Array.from({ length: cast.crew }, (_, i) => (
          <div key={`g${i}`} ref={setNode(`g${i}`)} className={sprite} style={box}><Figure look="umpire" rig={setRig(`g${i}`)} /></div>
        ))}
        {cast && cast.players.map((p, i) => (
          <div key={p.id} ref={setNode(`w${i}`)} className={sprite} style={box}>
            <Figure player={p} team={cast.team} look={show.kind === 'entrance' || show.kind === 'walkoff' || (show.kind === 'milestone' && i === 0) ? 'striker' : show.kind === 'bowler' ? 'bowler' : 'fielder'} rig={setRig(`w${i}`)} />
          </div>
        ))}
        {(show.kind === 'trophy' || show.kind === 'motm') && show.trophy && <div ref={setNode('trophy')} className="absolute left-0 top-0 hidden will-change-transform" style={{ width: 100, height: 100, transformOrigin: '0 0' }}><TrophyArt kind={show.trophy as TrophyKind} size={100} shine /></div>}
        {nCheer > 0 && <div ref={setNode('dj')} className={sprite} style={box}><HostFigure presenter={PRESENTERS[(show.seed + 5) % PRESENTERS.length]} colors={[show.colors[1], show.colors[0]]} rig={setRig('dj')} /></div>}
        {nCheer > 0 && [0, 1].map((i) => <div key={`crew${i}`} ref={setNode(`crew${i}`)} className={sprite} style={box}><Figure look="staff" tint={i ? '#0ea5e9' : '#7c3aed'} rig={setRig(`crew${i}`)} /></div>)}
        {Array.from({ length: nCheer }, (_, i) => (
          <div key={`c${i}`} ref={setNode(`c${i}`)} className={sprite} style={box}><Cheerleader i={i} colors={show.colors} flag={fl} rig={setRig(`c${i}`)} /></div>
        ))}
      </div>
      {show.kind === 'fans' && [1, 2].map((k) => <div key={`fc${k}`} className="pointer-events-none absolute inset-0 z-[8000] bg-white" style={{ opacity: 0, animation: `bcast-cut 0.3s ease-out ${(k * 2.2 - 0.05) / Math.max(0.25, rate)}s forwards` }} />)}
      {show.kind === 'walkoff' && <div className="pointer-events-none absolute inset-0 z-[8000] bg-white" style={{ opacity: 0, animation: `bcast-cut 0.3s ease-out ${(WALKOFF.cut - 0.05) / Math.max(0.25, rate)}s forwards` }} />}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent" />
      {show.kind === 'ceremony' && show.ceremony && (
        <>
          <div ref={setNode('sub')} className="pointer-events-none absolute bottom-3 left-3 right-3 z-[9000] hidden rounded-lg bg-black/80 px-3 py-1.5 ring-1 ring-white/15" style={{ boxShadow: `inset 4px 0 0 ${show.colors[0]}` }}>
            <div className="flex items-center gap-2"><span data-who className="font-display text-base uppercase leading-none tracking-wide text-white" /><span data-tag className="rounded bg-amber-300 px-1.5 text-[9px] font-extrabold uppercase tracking-wider text-black" /></div>
            <div data-text className="text-[12px] font-semibold leading-snug text-slate-100" />
          </div>
          <div ref={setNode('cheque')} className="pointer-events-none absolute left-0 top-0 hidden origin-center" style={{ width: 260, height: 118 }}>
            <div className="h-full w-full rounded-md border-4 border-amber-300 bg-gradient-to-br from-amber-50 to-amber-200 px-3 py-2 text-center shadow-xl" style={{ color: '#451a03' }}>
              <div className="text-[9px] font-extrabold uppercase tracking-[0.25em]">Player of the Match</div>
              <div className="font-display text-[34px] leading-none tracking-wide">{show.ceremony.cheque}</div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-wider">Prize money · pay to the bearer</div>
            </div>
          </div>
        </>
      )}
      {show.lower && show.lower.pair && (
        <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-[9000] grid grid-cols-2 gap-1.5" style={{ animation: `stadium-in 0.5s ease-out ${(show.kind === 'entrance' ? ENTRANCE.track : 1.6) / Math.max(0.25, rate)}s both` }}>
          {show.lower.pair.map((c, ci) => (
            <div key={c.title} className="min-w-0 overflow-hidden rounded-md bg-black/85 px-2 py-1.5 ring-1 ring-white/15" style={{ boxShadow: `inset 3px 0 0 ${show.colors[0]}` }}>
              <div className="flex items-center gap-1.5">{cast?.players[ci] && cast.team && <PlayerAvatar player={cast.players[ci]} team={cast.team} size={24} />}<span className="min-w-0 flex-1 truncate font-display text-sm uppercase leading-none tracking-wide text-white">{c.title}</span>{c.rating !== undefined && <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-violet-500 font-display text-sm leading-none text-white ring-2 ring-white/30">{c.rating}</span>}</div>
              <div className="mt-0.5 truncate text-[10px] font-semibold leading-tight text-slate-300">{c.sub}</div>
              <StatBand tiles={c.tiles.slice(0, 4)} small />
            </div>
          ))}
        </div>
      )}
      {show.lower && show.lower.big && !show.lower.pair && (
        <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-[9000] flex items-stretch gap-2.5 rounded-lg bg-black/85 px-3 py-2 ring-1 ring-white/15" style={{ boxShadow: `inset 4px 0 0 ${show.colors[0]}`, animation: `stadium-in 0.5s ease-out ${1.4 / Math.max(0.25, rate)}s both` }}>
          <div className="flex shrink-0 flex-col items-center justify-center rounded-md bg-white/10 px-3">
            <div className="flex items-baseline gap-1"><span className="font-display text-[46px] leading-none tabular-nums text-white" style={{ textShadow: show.lower.color ? `0 0 16px ${show.lower.color}` : undefined }}>{show.lower.big.value}</span><span className="font-display text-[26px] leading-none tabular-nums text-amber-300">({show.lower.big.sub})</span></div>
            <span className="mt-0.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-300">Runs (balls)</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2"><span className="truncate font-display text-xl uppercase leading-none tracking-wide text-white">{show.lower.title}</span>{show.lower.chip && <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-black" style={{ background: show.lower.color ?? '#fcd34d' }}>{show.lower.chip}</span>}</div>
            {show.lower.lines.map((ln, i) => <div key={i} className="mt-0.5 text-[13px] font-bold leading-snug text-amber-200">{ln}</div>)}
            {show.lower.tiles && show.lower.tiles.length > 0 && <StatBand tiles={show.lower.tiles.slice(0, 3)} />}
          </div>
        </div>
      )}
      {show.lower && !show.lower.big && !show.lower.pair && (
        <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-[9000] max-w-[92%] overflow-hidden rounded-md bg-black/85 ring-1 ring-white/15" style={{ animation: `stadium-in 0.5s ease-out ${(show.kind === 'entrance' ? ENTRANCE.track : show.kind === 'bowler' || show.kind === 'walkoff' || show.kind === 'physio' || show.kind === 'dugout' || show.kind === 'drinks' || show.kind === 'handshake' || show.kind === 'pitchreport' || show.kind === 'fans' || show.kind === 'salute' ? 1.6 : show.kind === 'trophy' || show.kind === 'motm' ? 3.4 : show.kind === 'lineup' ? 5.6 : 1.2) / Math.max(0.25, rate)}s both` }}>
          <div className="flex items-stretch">
            <div className="w-1.5 shrink-0" style={{ background: show.colors[0] }} />
            <div className="min-w-0 flex-1 px-2.5 py-1.5">
              {show.lower.chip && <div className="text-[8px] font-extrabold uppercase leading-none tracking-[0.2em]" style={{ color: show.lower.color ?? '#fcd34d' }}>{show.lower.chip}</div>}
              <div className="mt-1 flex items-center gap-2">
                {show.lower.rating !== undefined && cast?.players[0] && cast.team && <PlayerAvatar player={cast.players[0]} team={cast.team} size={30} />}
                <span className={`min-w-0 flex-1 truncate font-display uppercase leading-none tracking-wide ${show.lower.color ? 'text-3xl' : 'text-base text-white'}`} style={show.lower.color ? { color: show.lower.color, textShadow: `0 0 14px ${show.lower.color}88` } : undefined}>{show.lower.title}</span>
                {show.lower.rating !== undefined && <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-violet-500 font-display text-base leading-none text-white ring-2 ring-white/30">{show.lower.rating}</span>}
              </div>
              {show.lower.lines.filter((ln) => ln !== 'Ratings' && !ln.startsWith('This season')).map((ln, i) => <div key={i} className={`mt-0.5 truncate leading-snug ${i === 0 ? 'text-[10px] font-bold text-slate-200' : 'text-[9px] font-semibold text-slate-400'}`}>{ln}</div>)}
              {show.lower.tiles && show.lower.tiles.length > 0 && <StatBand tiles={show.lower.tiles.slice(0, 6)} small={show.lower.rating !== undefined} />}
            </div>
          </div>
        </div>
      )}
      {label && !show.lower && show.kind !== 'ceremony' && <div className="pointer-events-none absolute bottom-3 left-3 z-[9000] rounded bg-black/70 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-widest text-white ring-1" style={{ boxShadow: `inset 3px 0 0 ${show.colors[0]}` }}>{label}</div>}
      <div className="pointer-events-none absolute right-2 top-2 z-[9000] rounded-full bg-black/60 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-300">Tap to skip</div>
    </div>
  )
}

const SHORT: Record<string, string> = { '50s / 100s': '50/100', Maidens: 'Mdns', '5-wicket hauls': '5W', Average: 'Avg', 'Best': 'Best', Technique: 'Tech', Temperament: 'Temp', Running: 'Run', Accuracy: 'Acc', Variation: 'Var', Stamina: 'Stam', 'Strike rate': 'SR', 'Bat apps': 'Apps', 'Bowl apps': 'Apps', Economy: 'Econ', Wickets: 'Wkts' }

/** A row of figures with thin dividers between them (a value over a small label), the stat band of a TV lower third. */
function StatBand({ tiles, small = false }: { tiles: { label: string; value: string }[]; small?: boolean }) {
  return (
    <div className="mt-1.5 flex divide-x divide-white/15 border-t border-white/15 pt-1">
      {tiles.map((t) => (
        <div key={t.label} className="min-w-0 flex-1 px-1 text-center leading-none first:pl-0 last:pr-0">
          <div className={`truncate font-display tabular-nums text-white ${small ? 'text-sm' : 'text-lg'}`}>{t.value}</div>
          <div className="mt-0.5 text-[8px] font-bold uppercase tracking-normal text-slate-400">{small ? SHORT[t.label] ?? t.label : t.label}</div>
        </div>
      ))}
    </div>
  )
}
