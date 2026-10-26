import { motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Player, Team } from '../../types'
import type { BallEvent } from '../../engine/types'
import type { PitchKind } from '../../engine/pitchInfo'
import { PlayerAvatar, accentOf } from '../ui'
import { ballSpeed, speedStyle, type BallStyle } from '../../engine/speed'
import { approach, BAT_END_Z, batHitsBall, clipNow, screenSide, replayCamera, warpTime, withFootSlow, withReplaySlow, type ReplayCam, camReverse, camWide, fielderWorld, frameAt, ROPE, BOWL_Z, diveGapMetres, lookAt, planBall, prep, project, type Cam, type Plan, type V3 } from './broadcast'
import { useCaptions, useScoreBar } from '../../prefs'
import { DEFAULT_LOOK, type StadiumLook } from '../../engine/stadium'
import { drawScene, type Scene } from './broadcastDraw'
import { WIDE_LINE_M } from '../../engine/wide'
import { overstepCm } from '../../season/moments'
import type { MoveDraw } from './moveFx'
import { moveForBall, type MoveShow } from '../../data/moves'
import { getAnimPrefs } from '../../prefs'
import { firstName } from './format'
import { endPoint, type Placed } from './Stage'
import { Body, type Kit, type Rig } from './Body'
import { batsmanPose, bowlerPose, breathe, clamp01, fielderPose, nonStrikerPose, umpirePose } from './bodyPose'
import { flavorOfTeam } from '../../data/flavors'
import { auraOf, weaponOf } from '../../data/weapons'

/**
 * The broadcast view: the match as it looks on TV. The camera stands behind the bowler, zooms in as he runs up, follows the ball after the bat,
 * and cuts to a camera behind the batsman when the ball goes back down the ground. Fielders are on screen when the camera can see them and
 * come into view as it follows the ball. It only draws the ball that the engine has already played, so it never changes a result.
 */

const lerp3v = (a: V3, b: V3, t: number): V3 => { const k = t * t * (3 - 2 * t); return { x: a.x + (b.x - a.x) * k, y: 0, z: a.z + (b.z - a.z) * k } }
const STUB = { seq: 1, runsBat: 0, boundary: null, tags: [], wicket: null, extraType: null, delivery: null } as unknown as BallEvent
const HEIGHT = 120
const WIDTH = 60
/** The smallest a person is drawn (far fielders shrink with the distance, but never to nothing). */
const MIN_SCALE = 0.24

/** What the TV score bug shows: the score, the two batsmen, the bowler and, in a chase, what is needed. */
export interface ScoreBug {
  team: string
  runs: number
  wickets: number
  balls: number
  batters: { name: string; runs: number; balls: number; strike: boolean }[]
  bowler: { name: string; figures: string } | null
  need: string | null
  /** The speed of the last ball, km/h. */
  lastKmh?: number | null
}

type Look = 'striker' | 'nonstriker' | 'bowler' | 'fielder' | 'umpire' | 'keeper'

function Figure({ player, team, look, rig }: { player?: Player; team?: Team; look: Look; rig: (r: Rig | null) => void }) {
  const ump = look === 'umpire'
  const primary = ump ? '#1e293b' : team?.colors.primary ?? '#334155'
  const second = ump ? '#f8fafc' : team?.colors.secondary ?? '#e2e8f0'
  const bat = look === 'striker' || look === 'nonstriker'
  const kit: Kit = {
    weapon: player ? weaponOf(player.id) : null, aura: player ? auraOf(player.id) : null,
    shirt: primary, trim: second, trousers: ump ? '#0f172a' : '#e5e7eb', pads: bat || look === 'keeper',
    gloves: bat ? '#f8fafc' : look === 'keeper' ? '#fbbf24' : null, boots: ump ? '#020617' : '#f8fafc',
  }
  return (
    <div className="relative" style={{ width: WIDTH, height: HEIGHT }}>
      {/* the shadow on the grass */}
      <div className="absolute rounded-full" style={{ left: 6, top: 110, width: 48, height: 12, background: 'rgba(0,0,0,0.32)' }} />
      <Body kit={kit} rigRef={rig}>
        {ump
          ? <><div className="absolute rounded-full" style={{ left: 8, top: 4, width: 44, height: 44, background: '#e0b48e', border: '2px solid #0f172a' }} /><div className="absolute" style={{ left: 4, top: 0, width: 52, height: 13, borderRadius: '10px 10px 3px 3px', background: '#f8fafc', border: '1px solid #94a3b8' }} /></>
          : <div className="absolute rounded-full" style={{ left: 2, top: 0, width: 56, height: 56, boxShadow: `0 0 0 3px ${team ? accentOf(team) : '#fff'}, 0 0 10px #000a`, overflow: 'hidden' }}>{player && team && <PlayerAvatar player={player} team={team} size={56} />}</div>}
      </Body>
    </div>
  )
}

/** The speed of the ball, in a TV speed-gun box that shows up as it is let go and fades after a moment. */
function SpeedGun({ kmh, at, dur, rate }: { kmh: number; at: number; dur: number; rate: number }) {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const k = Math.max(0.15, rate)
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

export function BroadcastView({ event, striker, nonStriker, bowler, battingTeam, bowlingTeam, fielders, pitch = 'balanced', rate: rateProp = 1, look = DEFAULT_LOOK, scoreBug, caption, wear = 0, replay, fitSeconds }: {
  /** Play the clip so that it finishes in this many seconds, whatever its length (every ball of a highlight reel is shown to the end). */
  fitSeconds?: number
  /** Set when this is a replay inside an animation screen: it uses another camera and plays with slow motion around the shot, so it looks different from the live picture. */
  replay?: { cam: ReplayCam; slowMo?: boolean; /** Deeper slow motion (a four or a six). */ deep?: boolean } | null
  /** How worn the pitch is, 0 to 1 (a Test builds it up over the five days). */
  wear?: number
  /** The commentary line of this ball, written along the top once the bat has met it. */
  caption?: string | null
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
  const rigs = useRef(new Map<string, Rig>())
  const setRig = (k: string) => (r: Rig | null) => { if (r) rigs.current.set(k, r); else rigs.current.delete(k) }
  const setNode = (k: string) => (el: HTMLElement | null) => { nodes.current.set(k, el) }
  const [tag, setTag] = useState<string>('CAM 1')
  const [cutKey, setCutKey] = useState(0)
  const fire = !!event?.freeHit && !!event.boundary
  const captionsOn = useCaptions()
  const scoreBarOn = useScoreBar()
  // where each fielder stood at the end of the last clip, so the field can change between balls with the fielders walking to their new places
  const lastRest = useRef(new Map<string, V3>())

  // the plan for this ball
  const plan0: Plan = useMemo(() => {
    const ev = event ?? STUB
    const end = event ? endPoint(event, fielders) : { x: 80, y: 66 }
    const p = planBall(ev, fielders.map((f) => ({ id: f.player.id, x: f.x, y: f.y, spot: f.spot })), end, striker.hand === 'L', ballSpeed(ev, bowler), { holdRunOut: getAnimPrefs().reviews })
    // (a replay inside an animation screen must not touch the clock the live clip keeps)
    if (event && !replay && !fitSeconds) { const fresh = clipNow.seq !== event.seq; clipNow.seq = event.seq; clipNow.ms = Math.round((p.realTotal * 1000) / Math.max(0.15, rateProp)); if (fresh) clipNow.until = Date.now() + clipNow.ms }
    return p
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.seq, fielders.map((f) => f.player.id).join(), striker.id])
  const plan: Plan = useMemo(() => (replay?.cam === 'foot' ? withFootSlow(plan0) : replay?.slowMo ? withReplaySlow(plan0, replay.deep) : plan0), [plan0, replay?.slowMo, replay?.cam, replay?.deep])
  const rate = fitSeconds ? Math.max(0.2, Math.min(3, fitSeconds / plan.realTotal)) : rateProp
  const replayCam = useMemo(() => (replay ? replayCamera(replay.cam, event?.seq ?? 0, (Math.sign(plan0.end.x - plan0.meet.x) || undefined) as 1 | -1 | undefined) : null), [replay?.cam, event?.seq]) // eslint-disable-line react-hooks/exhaustive-deps
  void 0 // eslint-disable-line react-hooks/exhaustive-deps

  const rest = useMemo(() => fielders.map((f) => fielderWorld(f.x, f.y, f.spot)), [fielders])
  // a team's (or a star's) signature move on a six, a strong four or a wicket (not in the timeout reel)
  const show: MoveShow | null = useMemo(
    () => (event && !event.review && !fitSeconds && getAnimPrefs().moves ? moveForBall(event, striker, battingTeam, bowler, bowlingTeam) : null),
    [event?.seq, fitSeconds, striker.id, bowler.id, battingTeam.id, bowlingTeam.id], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const live = useRef({ plan, rest, event, striker, nonStriker, bowler, fielders, battingTeam, pitch, fire, rate, look, wear, replayCam, show })
  live.current = { plan, rest, event, striker, nonStriker, bowler, fielders, battingTeam, pitch, fire, rate, look, wear, replayCam, show }
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
    const movePath: V3[] = []
    const anchors = new Map<string, { x: number; y: number; s: number; rot: number }>()
    const prevPos = new Map<string, V3>(), speeds = new Map<string, number>(), cycles = new Map<string, number>()
    const walkFrom = new Map(lastRest.current)
    lastRest.current = new Map(live.current.fielders.map((fd, i) => [fd.player.id, live.current.rest[i]]))

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
      // (a replay keeps to its own camera and never cuts to the reverse one)
      const wantReverse = L.replayCam ? false : f.reverse
      const base = L.replayCam ? L.replayCam.cam : wantReverse ? camReverse : camWide
      if (wantReverse !== reverseNow.current) { reverseNow.current = wantReverse; snap = true; setTag(wantReverse ? 'CAM 2' : 'CAM 1'); setCutKey((k) => k + 1) }
      // with the covers on there is nothing to follow: a wide picture of the pitch
      const covers0 = L.look.covers || (L.event === null && L.look.rain === 2)
      const focus = L.replayCam?.focus
      const aimAt = covers0 ? { x: 0, y: 0, z: -8 } : focus ?? f.aim
      const hfovAt = covers0 ? 0.8 : focus ? L.replayCam!.cam.hfov : L.replayCam && (!f.slowmo || L.replayCam.keepWide) ? Math.max(f.hfov, L.replayCam.minHfov) : f.hfov
      const c = cam.current
      let goal = lookAt(base.p, aimAt)
      if (L.replayCam?.overhead) {
        // the spider cam: looks down the same way up as the live picture (CAM 2 for a shot back down the ground, CAM 1 otherwise) and flies along with the ball, so the shot goes the same way on the screen
        const yaw = L.plan.reverse ? Math.PI : 0
        const reach = 40 / Math.tan(1.35)
        const target = { x: aimAt.x, y: 40, z: aimAt.z + (L.plan.reverse ? reach : -reach) }
        const k = snap ? 1 : 1 - Math.exp(-dt * 3.5)
        c.p = { x: c.p.x + (target.x - c.p.x) * k, y: target.y, z: c.p.z + (target.z - c.p.z) * k }
        goal = { yaw, pitch: 1.35 }
      } else c.p = base.p
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
      // the crowd is on its feet for boundaries and wickets (the picture itself stays steady so the play is easy to follow)
      const tHit = L.plan.tRun + L.plan.tDeliver
      const cheerAt = L.plan.boundary ? tHit + 0.6 : L.plan.exitAt
      const cheer = cheerAt !== null && cheerAt !== undefined && t >= cheerAt && (L.plan.boundary || !!L.plan.wicketFlies || L.plan.catcher >= 0) ? Math.min(1, (t - cheerAt) / 0.3) * (1 - Math.min(1, Math.max(0, (t - cheerAt - 1.6) / 0.6))) : 0
      // a signature move: it starts when the bat meets the ball (or when the wicket falls) and goes with the ball
      let moveDraw: MoveDraw | null = null
      const sh = L.show
      if (sh && L.event) {
        const tStart = sh.by === 'bat' ? L.plan.tRun + L.plan.tDeliver : (L.plan.exitAt ?? L.plan.tRun + L.plan.tDeliver + L.plan.tFlight)
        const kk = t - tStart
        const life = sh.by === 'bat' ? L.plan.tFlight + 0.45 : 1.3
        if (kk >= 0 && kk <= life) {
          if (f.ball) { const last = movePath[movePath.length - 1]; if (!last || Math.hypot(last.x - f.ball.x, last.z - f.ball.z, last.y - f.ball.y) > 0.25) movePath.push({ ...f.ball }); if (movePath.length > 70) movePath.shift() }
          moveDraw = { style: sh.move.style, c1: sh.move.c1, c2: sh.move.c2, k: kk, life, size: sh.size, from: sh.by === 'bat' ? L.plan.meet : (f.ball ?? L.plan.end), path: movePath, ball: f.ball, seed: L.event.seq }
        }
      }
      const marks: Scene['marks'] = {}
      if (L.replayCam && L.event?.extraType === 'wide') marks.wideLine = WIDE_LINE_M
      if (L.replayCam?.focus && L.event?.extraType === 'noball') marks.crease = { z: BOWL_Z + 1.22, over: overstepCm(L.event.seq) / 100 }
      drawScene(ctx, c, W, H, { marks, move: moveDraw, pitch: L.pitch, look: L.look, tick: t, cheer, covers, wear: L.wear, board: f.board, stumps: f.stumps, stumpsBowl: f.stumpsBowl, trail: [...trail], style })
      const r = prep(c, W, H)
      if (covers) { for (const n of nodes.current.values()) if (n) n.style.display = 'none'; lastT.current = t; return }

      const place = (key: string, world: V3, opts: { heightM?: number; rot?: number } = {}) => {
        const node = nodes.current.get(key)
        if (!node) return
        const p = project(r, world)
        const h = opts.heightM ?? 1.8
        if (!p || p.x < -80 || p.x > W + 80 || p.y < -40 || p.y > H + 200) { node.style.display = 'none'; return }
        const s = Math.max(MIN_SCALE, (r.F * h) / p.d / HEIGHT)
        anchors.set(key, { x: p.x, y: p.y, s, rot: opts.rot ?? 0 })
        node.style.display = 'block'
        node.style.transform = `translate3d(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px,0) scale(${s.toFixed(3)}) rotate(${(opts.rot ?? 0).toFixed(0)}deg) translate(-50%,-100%)`
        node.style.zIndex = String(Math.max(1, Math.round(3000 - p.d * 10)))
      }
      // how fast each person is moving and where he is in his stride, for the walk, the run and the legs
      const move = (key: string, w: V3) => {
        const before = prevPos.get(key)
        prevPos.set(key, w)
        const inst = before && dt > 0 && !snap ? Math.hypot(w.x - before.x, w.z - before.z) / dt : 0
        const v = (speeds.get(key) ?? 0) * 0.55 + Math.min(11, inst) * 0.45
        speeds.set(key, v)
        const cyc = (cycles.get(key) ?? 0) + dt * (5 + v * 1.7)
        cycles.set(key, cyc)
        return { v: v < 0.4 ? 0 : v, cyc }
      }
      const joyHop = (k: number) => 0.55 * Math.sin(Math.PI * Math.min(1, k * 3)) * (k < 0.34 ? 1 : 0)
      const ev = L.event
      // the two at the crease, the bowler, the keeper and the umpires
      const stance = L.striker.hand === 'L' ? -0.75 : 0.75
      const ra = f.runners?.a ?? f.striker ?? { x: stance, y: ev?.boundary ? joyHop(f.joy) : 0, z: BAT_END_Z }
      const rb = f.runners?.b ?? { x: -3.2, y: 0, z: -19.4 }
      place('striker', ra, { rot: -f.hurt * 24 })
      place('nonstriker', rb)
      place('bowler', { x: f.bowler.x, y: (ev?.wicket && ev.wicket.kind !== 'run out' ? joyHop(f.joy) : Math.abs(Math.sin(f.bowler.z * 1.9)) * 0.1 * (f.phase === 'run' ? 1 : 0)), z: f.bowler.z })
      place('umpire1', { x: -1.15, y: 0, z: -22.2 })
      place('umpire2', { x: stance > 0 ? 13 : -13, y: 0, z: -2 })
      const pl = L.plan
      const t2c = pl.tRun + pl.tDeliver, t3c = t2c + pl.tFlight
      const out = pl.exitAt !== null && pl.exitAt !== undefined && t > pl.exitAt + 0.3
      const lh = L.striker.hand === 'L'
      const ms = move('striker', f.striker ?? ra), mn = move('nonstriker', rb), mb = move('bowler', f.bowler)
      const strikerOut = out && (!pl.runOut || pl.runOut.outIsStriker)
      const tq = Math.floor(t * 12) / 12 // (a person at rest moves a dozen times a second, no more)
      const sp = batsmanPose({ flavor: flavorOfTeam(L.battingTeam.id), style: pl.shot, t, t1: pl.tRun, t2: t2c, swing: f.batSwing, hurt: f.hurt, raise: f.raise, joy: ev?.boundary ? f.joy : 0, speed: ms.v, cyc: ms.cyc, walkOff: strikerOut })
      rigs.current.get('striker')?.apply(f.batSwing === 0 && ms.v === 0 && !strikerOut ? breathe(sp, tq, 1) : sp, lh)
      { const np = nonStrikerPose({ t, t1: pl.tRun, speed: mn.v, cyc: mn.cyc, bat: true, walkOff: out && !!pl.runOut && !pl.runOut.outIsStriker }); rigs.current.get('nonstriker')?.apply(mn.v === 0 ? breathe(np, tq, 2) : np, L.nonStriker?.hand === 'L') }
      rigs.current.get('bowler')?.apply(bowlerPose({ t, t1: pl.tRun, t2: t2c, arm: f.bowlerArm, speed: mb.v, cyc: mb.cyc, joy: f.joy, wicket: !!ev?.wicket && ev.wicket.kind !== 'run out' && !pl.reviewed }))
      // the umpires' arms
      for (const who of [1, 2] as const) {
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
          else if (sg.kind === 'notout') { la = 22 * k; ra2 = -22 * k }
          else la = 38 * k
        }
        rigs.current.get(`umpire${who}`)?.apply(sg ? umpirePose(la, ra2) : breathe(umpirePose(la, ra2), tq, 3 + who, 0.6))
      }
      // fielders: where they stand, or where they have run to
      L.fielders.forEach((_, i) => {
        const from = walkFrom.get(L.fielders[i].player.id)
        const walk = from && t < 1.1 ? lerp3v(from, L.rest[i], Math.min(1, t / 1.0)) : L.rest[i]
        const w = f.moving.get(i) ?? walk
        const caught = L.plan.catcher === i
        const dv = f.dives.get(i)
        const running = f.moving.has(i) && f.phase === 'flight' && !dv
        // a diver falls head first towards the ball: the feet are where he left the ground, so the body is set back along the way he came and the hands reach the ball
        const dn = dv ? Math.hypot(dv.dx, dv.dz) || 1 : 1
        const back = dv ? 1.45 * dv.k : 0
        let px = w.x - (dv ? (dv.dx / dn) * back : 0), pz = w.z - (dv ? (dv.dz / dn) * back : 0)
        // a diver at the rope: far people are drawn bigger than they really are (so they can be seen), so his gap to the ball is worked out in drawn size, not in metres
        if (dv && i === L.plan.chaser && L.plan.chaserDive) {
          const pe = project(r, { x: L.plan.end.x, y: 0, z: L.plan.end.z })
          if (pe) {
            const ratio = Math.max(1, MIN_SCALE / Math.max(0.01, (r.F * 1.8) / pe.d / HEIGHT))
            px += (L.plan.end.x - Math.sign(dv.dx) * (1.8 + diveGapMetres(L.plan) / 1.4) * ratio - px) * dv.k
            pz += (L.plan.end.z - pz) * dv.k
          }
        }
        place(`f${i}`, { x: px, y: (caught ? joyHop(f.joy) : 0) + (dv ? 0.25 * dv.k : 0) + (running ? Math.abs(Math.sin(t * 15 + i)) * 0.14 : 0), z: pz }, { rot: dv ? screenSide(dv, c.yaw) * dv.k * 78 : 0 })
        const mf = move(`f${i}`, w)
        const sfp = clamp01((t - t2c) / pl.tFlight)
        const thrower = pl.runOut ? pl.catcher === i : pl.chaser === i
        const takeAt = t3c
        const nearCatch = thrower && !!pl.fellShort ? clamp01((t - (t3c - 0.4)) / 0.22) * (1 - clamp01((t - t3c) / 0.18)) : 0
        const catchK = Math.max(nearCatch, (caught && !dv && !(pl.runOut) && (pl.kind === 'air' || pl.kind === 'keeper') ? clamp01((t - (takeAt - 0.32)) / 0.22) : 0) * (1 - clamp01((t - takeAt - 0.7) / 0.35)))
        const stopK = thrower && !pl.boundary && !pl.six && !dv && (pl.kind === 'ground' || !!pl.fellShort) ? clamp01((sfp - 0.82) / 0.16) * (1 - clamp01((t - t3c - 0.2) / 0.3)) : 0
        const throwK = thrower && (pl.runOut || pl.runs > 0) && t > t3c + 0.2 ? clamp01((t - (t3c + (pl.runOut ? 0.05 : 0.25))) / 0.4) * (t < t3c + 1.2 ? 1 : 0) : 0
        const readyK = clamp01((t - (pl.tRun - 0.5)) / 0.5) * (i === 0 ? 1 : 1 - clamp01((t - t2c - 0.35) / 0.6))
        const fp = fielderPose({ speed: mf.v, cyc: mf.cyc, ready: readyK, dive: dv ? dv.k : 0, catchK, joy: caught || (pl.runOut && thrower) ? f.joy * (caught ? 1 : 0) : 0, stop: stopK, throwK, keeper: i === 0 })
        rigs.current.get(`f${i}`)?.apply(mf.v === 0 && !dv && catchK === 0 && stopK === 0 && throwK === 0 ? breathe(fp, tq, 5 + i) : fp)
      })
      // the ball, and its shadow
      const ball = nodes.current.get('ball'), shadow = nodes.current.get('shadow')
      if (ball && shadow) {
        const bp = f.ball ? project(r, f.ball) : null
        const gp = f.ball ? project(r, { ...f.ball, y: 0 }) : null
        // a catch: the ball flies into his hands and stays there (the hands are wherever his pose has put them)
        let held = 0
        let hand: { x: number; y: number } | null = null
        const ci2 = L.plan.runOut ? -1 : L.plan.catcher
        if (ci2 >= 0 && (L.plan.kind === 'air' || L.plan.kind === 'keeper')) {
          held = clamp01((t - (t3c - 0.25)) / 0.25)
          if (held > 0 && !ev?.wicket && t > t3c + 0.8) held = -1
          const an = anchors.get(`f${ci2}`), hd = rigs.current.get(`f${ci2}`)?.hands()
          if (an && hd) {
            const lx = (hd.x - 30) * an.s, ly = (hd.y - 120) * an.s, a = (an.rot * Math.PI) / 180
            hand = { x: an.x + lx * Math.cos(a) - ly * Math.sin(a), y: an.y + lx * Math.sin(a) + ly * Math.cos(a) }
          } else held = 0
        }
        // a ball that has gone out of the stadium is behind the stands: gone from sight
        const gone = !!f.ball && L.plan.six && f.ball.y < 12 && Math.hypot((f.ball.x - ROPE.cx) / ROPE.rx, (f.ball.z - ROPE.cz) / ROPE.rz) > 1.36 && t > t2c + 0.3
        if (held < 0 || gone) { ball.style.display = 'none'; shadow.style.display = 'none' } else
        if (bp && gp && bp.x > -20 && bp.x < W + 20) {
          if (moveDraw) { ball.style.background = `radial-gradient(circle, #ffffff, ${moveDraw.c2} 45%, ${moveDraw.c1})`; ball.style.borderColor = moveDraw.c2; ball.style.boxShadow = `0 0 16px 7px ${moveDraw.c1}, 0 0 30px 12px ${moveDraw.c1}66` } else {
            ball.style.background = style === 'fire' ? '#f97316' : style === 'ice' ? '#f0f9ff' : '#dc2626'
            ball.style.borderColor = style === 'ice' ? '#7dd3fc' : style === 'fire' ? '#fde047' : '#fecaca'
            ball.style.boxShadow = style === 'fire' ? '0 0 14px 5px #f97316, 0 0 26px 10px #ef444488' : style === 'ice' ? '0 0 12px 4px #7dd3fc, 0 0 22px 8px #bae6fd88' : '0 0 6px #00000088'
          }
          const sz = Math.max(style === 'plain' ? 5 : 9, (r.F * (style === 'plain' ? 0.24 : 0.36)) / bp.d) * (moveDraw ? 1.8 : 1)
          ball.style.display = 'block'
          ball.style.width = ball.style.height = `${sz.toFixed(1)}px`
          let bx = hand && held > 0 ? bp.x + (hand.x - bp.x) * held : bp.x, by = hand && held > 0 ? bp.y + (hand.y - bp.y) * held : bp.y
          // the bat meets the ball: for a moment the ball is exactly on the blade, wherever the shot has put it (the ball is drawn at a fixed spot in the world, the bat is where the pose has swung it)
          let hitAt: { x: number; y: number } | null = null
          if (ev && batHitsBall(ev)) {
            const an = anchors.get('striker'), bt = rigs.current.get('striker')?.bat()
            const wC = t < t2c ? clamp01((t - (t2c - 0.2)) / 0.2) : clamp01(1 - (t - t2c) / 0.26)
            if (an && bt && wC > 0) {
              const lx = (bt.x - 30) * an.s, ly = (bt.y - 120) * an.s, a = (an.rot * Math.PI) / 180
              const sx = an.x + lx * Math.cos(a) - ly * Math.sin(a), sy = an.y + lx * Math.sin(a) + ly * Math.cos(a)
              bx += (sx - bx) * wC; by += (sy - by) * wC
              hitAt = { x: sx, y: sy }
              if (wC > 0.4) shadow.style.display = 'none'
            }
          }
          ball.style.transform = `translate3d(${(bx - sz / 2).toFixed(1)}px,${(by - sz / 2).toFixed(1)}px,0)`
          // a flash where the bat meets the ball (bigger for a bigger shot)
          const imp = nodes.current.get('impact')
          if (imp) {
            const since = t - t2c
            if (hitAt && since >= -0.02 && since < 0.2) {
              const k = clamp01((since + 0.02) / 0.22)
              const size = (ev?.boundary ? 74 : 46) * (0.5 + k) * Math.min(1.4, Math.max(0.7, (r.F * 1.8) / bp.d / 100))
              imp.style.display = 'block'
              imp.style.opacity = String(1 - k)
              imp.style.width = imp.style.height = `${size.toFixed(0)}px`
              imp.style.transform = `translate3d(${(hitAt.x - size / 2).toFixed(1)}px,${(hitAt.y - size / 2).toFixed(1)}px,0)`
            } else imp.style.display = 'none'
          }
          ball.style.zIndex = '4000'
          shadow.style.display = held >= 1 ? 'none' : 'block'
          shadow.style.width = `${(sz * 1.3).toFixed(1)}px`
          shadow.style.height = `${(sz * 0.45).toFixed(1)}px`
          shadow.style.transform = `translate3d(${(gp.x - sz * 0.65).toFixed(1)}px,${(gp.y - sz * 0.2).toFixed(1)}px,0)`
          shadow.style.zIndex = '1'
        } else { ball.style.display = 'none'; shadow.style.display = 'none' }
      }
      // name plates for the people in the action, just above their heads
      const tagOf = (key: string, world: V3) => {
        const node = nodes.current.get(key)
        if (!node) return
        const p = project(r, world)
        if (!p || p.x < 10 || p.x > W - 10 || p.y < 10 || p.y > H) { node.style.display = 'none'; return }
        const headTop = p.y - HEIGHT * Math.max(MIN_SCALE, (r.F * 1.8) / p.d / HEIGHT)
        if (headTop < 12) { node.style.display = 'none'; return }
        node.style.display = 'block'
        node.style.transform = `translate3d(${p.x.toFixed(1)}px,${(headTop - 2).toFixed(1)}px,0) translate(-50%,-100%)`
      }
      tagOf('tagStriker', { x: ra.x, y: 0, z: ra.z })
      const rn = nodes.current.get('tagReact')
      if (rn) {
        const who = f.react?.who
        const at: V3 | null = !who ? null : who === 'striker' ? { x: ra.x, y: 3.1, z: ra.z } : who === 'bowler' ? { x: f.bowler.x, y: 3.1, z: f.bowler.z } : { x: (f.moving.get(0) ?? L.rest[0])?.x ?? 0, y: 3.0, z: (f.moving.get(0) ?? L.rest[0])?.z ?? 8 }
        const pp = at ? project(r, at) : null
        if (pp && pp.x > 20 && pp.x < W - 20 && pp.y > 10) { rn.style.display = 'block'; rn.textContent = f.react!.text; rn.style.transform = `translate3d(${pp.x.toFixed(1)}px,${pp.y.toFixed(1)}px,0) translate(-50%,-100%)` } else rn.style.display = 'none'
      }
      tagOf('tagBowler', { x: f.bowler.x, y: 0, z: f.bowler.z })
      const ci = L.plan.catcher >= 0 ? L.plan.catcher : L.plan.chaser
      if (ci >= 0 && (f.phase === 'flight' || f.phase === 'hold')) { const w = f.moving.get(ci) ?? L.rest[ci]; tagOf('tagField', { x: w.x, y: 0, z: w.z }) } else { const n = nodes.current.get('tagField'); if (n) n.style.display = 'none' }
      const moveTag = nodes.current.get('tagMove')
      if (moveTag) {
        if (moveDraw && sh && moveDraw.k < 1.9) {
          if (moveTag.textContent !== sh.move.name) moveTag.textContent = sh.move.name
          moveTag.style.color = '#ffffff'
          moveTag.style.webkitTextStroke = `3px ${sh.move.c1}`
          moveTag.style.textShadow = `0 0 18px ${sh.move.c1}, 0 0 34px ${sh.move.c1}`
          const pop = Math.min(1, moveDraw.k / 0.15)
          moveTag.style.display = 'block'
          moveTag.style.opacity = String(Math.max(0, Math.min(1, (1.9 - moveDraw.k) / 0.4)))
          moveTag.style.transform = `scale(${(0.6 + 0.5 * pop + 0.05 * Math.sin(moveDraw.k * 14)).toFixed(3)}) rotate(-3deg)`
        } else moveTag.style.display = 'none'
      }
      const slowTag = nodes.current.get('tagSlow')
      if (slowTag) slowTag.style.display = f.slowmo ? 'block' : 'none'
      lastT.current = t
    }

    // each new ball starts at the run-up: back on the wide camera
    reverseNow.current = false
    const live0 = live.current
    setTag(live0.replayCam ? live0.replayCam.label.toUpperCase() : 'CAM 1')
    const startCam = live0.replayCam ? live0.replayCam.cam : camWide
    cam.current = { ...startCam, p: { ...startCam.p } }
    const first = live0.event === null
    if (first) {
      paint(0, 0.016, true)
    } else {
      const tick = (now: number) => {
        if (stopped) return
        const dt = Math.min(0.05, (now - prev) / 1000)
        prev = now
        // (a nick's slow motion makes the clip last longer than its own seconds)
        const real = (now - t0) / 1000 / Math.max(0.15, live.current.rate)
        const lp = live.current.plan
        paint(Math.min(warpTime(lp, real), lp.total), dt, false)
        if (real < lp.realTotal) raf = requestAnimationFrame(tick)
      }
      paint(0, 0.016, true)
      raf = requestAnimationFrame(tick)
    }
    const ro = new ResizeObserver(() => paint(lastT.current, 0.016, true))
    ro.observe(el)
    return () => { stopped = true; cancelAnimationFrame(raf); ro.disconnect() }
  }, [event?.seq]) // (not the striker: when the ball's result is shown the batsman at the crease may change, and that must not start the clip again)

  const L = live.current
  void L
  return (
    <div ref={box} className="absolute inset-0 z-[1] isolate overflow-hidden bg-[#05080f]" aria-label="Broadcast view">
      <canvas ref={canvas} className="absolute inset-0 h-full w-full" />
      {fielders.map((f, i) => (
        <div key={f.player.id} ref={setNode(`f${i}`)} className="absolute left-0 top-0 hidden will-change-transform" style={{ width: WIDTH, height: HEIGHT, transformOrigin: '0 0' }}>
          <Figure player={f.player} team={bowlingTeam} look={i === 0 ? 'keeper' : 'fielder'} rig={setRig(`f${i}`)} />
        </div>
      ))}
      {nonStriker && <div ref={setNode('nonstriker')} className="absolute left-0 top-0 hidden will-change-transform" style={{ width: WIDTH, height: HEIGHT, transformOrigin: '0 0' }}><Figure player={nonStriker} team={battingTeam} look="nonstriker" rig={setRig('nonstriker')} /></div>}
      <div ref={setNode('striker')} className="absolute left-0 top-0 hidden will-change-transform" style={{ width: WIDTH, height: HEIGHT, transformOrigin: '0 0' }}><Figure player={striker} team={battingTeam} look="striker" rig={setRig('striker')} /></div>
      <div ref={setNode('bowler')} className="absolute left-0 top-0 hidden will-change-transform" style={{ width: WIDTH, height: HEIGHT, transformOrigin: '0 0' }}><Figure player={bowler} team={bowlingTeam} look="bowler" rig={setRig('bowler')} /></div>
      <div ref={setNode('umpire1')} className="absolute left-0 top-0 hidden will-change-transform" style={{ width: WIDTH, height: HEIGHT, transformOrigin: '0 0' }}><Figure look="umpire" rig={setRig('umpire1')} /></div>
      <div ref={setNode('umpire2')} className="absolute left-0 top-0 hidden will-change-transform" style={{ width: WIDTH, height: HEIGHT, transformOrigin: '0 0' }}><Figure look="umpire" rig={setRig('umpire2')} /></div>
      <div ref={setNode('impact')} className="pointer-events-none absolute left-0 top-0 z-[4001] hidden rounded-full" style={{ background: 'radial-gradient(circle, #ffffff 0%, #fde68a 28%, rgba(251,191,36,0.35) 52%, rgba(251,191,36,0) 70%)' }} />
      <div ref={setNode('shadow')} className="absolute left-0 top-0 hidden rounded-full bg-black/40" />
      <div ref={setNode('ball')} className="absolute left-0 top-0 hidden rounded-full border border-red-200" />
      {/* the speed gun: the speed of the ball just after it is let go */}
      {event && <SpeedGun key={event.seq} kmh={plan.speed} at={plan.tRun} dur={plan.tDeliver + 1.2} rate={rate} />}
      {captionsOn && caption && event && (
        <motion.div key={`cap${event.seq}`} className="pointer-events-none absolute inset-x-3 top-8 z-[6001] mx-auto w-fit max-w-[92%] rounded-lg bg-black/70 px-2.5 py-1 text-center text-[11px] font-semibold leading-snug text-white ring-1 ring-white/15 sm:text-xs" initial={{ opacity: 0, y: -4 }} animate={{ opacity: [0, 1, 1, 0], y: 0 }} transition={{ delay: (plan.tRun + plan.tDeliver) / Math.max(0.15, rate), duration: 3.4 / Math.max(0.15, rate), times: [0, 0.1, 0.85, 1] }}>{caption}</motion.div>
      )}
      {replay && <div className="pointer-events-none absolute inset-0 z-[5500]" style={{ background: 'linear-gradient(180deg, rgba(14,165,233,0.10), rgba(2,6,23,0.18))', boxShadow: 'inset 0 0 0 2px rgba(56,189,248,0.55), inset 0 0 40px rgba(2,6,23,0.55)' }} />}
      <div ref={setNode('tagMove')} className="pointer-events-none absolute inset-x-0 top-[16%] z-[5002] hidden whitespace-nowrap text-center font-display text-3xl uppercase leading-none tracking-wider sm:text-5xl" style={{ paintOrder: 'stroke fill' }} />
      <div ref={setNode('tagSlow')} className="pointer-events-none absolute bottom-8 right-2 z-[6001] hidden rounded bg-sky-600 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-white">Slow motion</div>
      <div ref={setNode('tagReact')} className="pointer-events-none absolute left-0 top-0 z-[5001] hidden whitespace-nowrap rounded-full bg-amber-300 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-black shadow-lg" />
      {[['tagStriker', firstName(striker.name), accentOf(battingTeam)], ['tagBowler', firstName(bowler.name), accentOf(bowlingTeam)], ['tagField', '', accentOf(bowlingTeam)]].map(([k, name, col]) => (
        <div key={k} ref={setNode(k)} className="pointer-events-none absolute left-0 top-0 z-[5000] hidden whitespace-nowrap rounded bg-black/75 px-1.5 text-[10px] font-bold text-white" style={{ borderBottom: `2px solid ${col}` }}>
          {k === 'tagField' ? firstName(event && plan.catcher >= 0 ? (fielders[plan.catcher]?.player.name ?? '') : plan.chaser >= 0 ? (fielders[plan.chaser]?.player.name ?? '') : '') : name}
        </div>
      ))}
      {/* a quick white flash when the picture cuts to the other camera */}
      <div key={cutKey} className="pointer-events-none absolute inset-0 z-[6000] bg-white" style={{ animation: cutKey ? 'bcast-cut 0.28s ease-out forwards' : undefined, opacity: 0 }} />
      {(look.covers || (event === null && look.rain === 2)) && <div className="pointer-events-none absolute inset-x-0 top-10 z-[6001] text-center"><span className="rounded bg-black/75 px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest text-sky-200 ring-1 ring-sky-300/40">{look.weather === 'washout' ? 'Washed out: no play today' : 'Rain stops play: covers on'}</span></div>}
      {/* the TV score bug: the score and overs, the two batsmen and the bowler, and in a chase what is needed */}
      {scoreBarOn && (scoreBug || event) && (
        <div className="pointer-events-none absolute bottom-1.5 left-2 z-[6001] overflow-hidden rounded bg-black/80 text-white ring-1 ring-white/20">
          <div className="flex items-stretch">
            <span className="px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-black" style={{ background: accentOf(battingTeam) }}>{scoreBug?.team ?? battingTeam.short}</span>
            <span className="px-1.5 py-0.5 font-display text-sm leading-none tabular-nums">{scoreBug?.runs ?? event?.score.runs}/{scoreBug?.wickets ?? event?.score.wickets}</span>
            <span className="border-l border-white/20 px-1.5 py-0.5 text-[10px] font-bold leading-snug text-slate-300">{Math.floor((scoreBug?.balls ?? event?.score.legalBalls ?? 0) / 6)}.{(scoreBug?.balls ?? event?.score.legalBalls ?? 0) % 6} ov</span>
            {scoreBug?.lastKmh ? <span className="border-l border-white/20 px-1.5 py-0.5 text-[10px] font-bold leading-snug text-sky-300">{scoreBug.lastKmh} km/h</span> : null}
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
