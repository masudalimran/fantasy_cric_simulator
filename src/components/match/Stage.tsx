import { AnimatePresence, motion, useAnimationControls } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Player, Team } from '../../types'
import type { BallEvent, DeliveryAim, ShotAim } from '../../engine/types'
import { eventAngle, reachFactor } from '../../engine/shots'
import { pitchColors, type PitchKind } from '../../engine/pitchInfo'
import { PlayerAvatar, accentOf } from '../ui'
import { MomentOverlay, type Moment } from './MomentOverlay'

/**
 * The ground. Everything is drawn in a 160 x 100 box (the stage keeps a 16:10 shape), so the same
 * coordinates place the SVG scenery, the HTML player tokens and the ball.
 */
const W = 160
const H = 100
const CX = 80
const CY = 50
const RX = 66 // boundary rope radii
const RY = 40

const STRIKER = { x: 73, y: 64 }
const NON_STRIKER = { x: 95, y: 38 }
const BOWLER_START = { x: 80, y: 16 }
const BOWLER_STRIDE = { x: 80, y: 27 }
const HIT = { x: 80, y: 66 } // where the ball meets the bat
const STUMPS_BAT = { x: 80, y: 70 }

/** Fielding positions for a right-hander (off side to the right). The first is the keeper. */
const FIELD_SPOTS = [
  { x: 80, y: 82, spot: 'Wicketkeeper' }, // keeper
  { x: 90, y: 81, spot: 'Slip' }, // slip
  { x: 111, y: 64, spot: 'Point' }, // point
  { x: 107, y: 48, spot: 'Cover' }, // cover
  { x: 112, y: 30, spot: 'Mid-off' }, // mid-off
  { x: 48, y: 30, spot: 'Mid-on' }, // mid-on
  { x: 53, y: 49, spot: 'Midwicket' }, // midwicket
  { x: 49, y: 65, spot: 'Square leg' }, // square leg
  { x: 63, y: 83, spot: 'Fine leg' }, // fine leg
  { x: 66, y: 17, spot: 'Long-on' }, // long-on
]

export interface Placed { player: Player; x: number; y: number; spot: string }

/** Keeper first, then everyone else on the bowling side except the bowler, onto the field spots. */
export function placeFielders(xi: Player[], bowlerId: string, spots: { x: number; y: number; spot: string }[] = FIELD_SPOTS): Placed[] {
  const keeper = xi.find((p) => p.role === 'WK' && p.id !== bowlerId) ?? xi.find((p) => p.id !== bowlerId)
  const others = xi.filter((p) => p.id !== bowlerId && p.id !== keeper?.id)
  return [keeper, ...others].filter((p): p is Player => !!p).slice(0, spots.length).map((player, i) => ({ player, ...spots[i] }))
}

/** Where a chosen delivery pitches, on the strip in the field view. */
export function landingSpot(d: DeliveryAim) {
  const y = d.length === 'yorker' ? 65 : d.length === 'full' ? 59 : d.length === 'good' ? 51 : 42
  return { x: 80 + d.line * 1.15, y }
}

/** A point on the rope in the direction of `angle`, seen from the batsman. */
function ropePoint(angle: number) {
  // ray from HIT to the ellipse: solve numerically with a few steps (cheap and stable)
  let t = 0
  for (let k = 0; k < 60; k++) {
    const x = HIT.x + Math.cos(angle) * (t + 1)
    const y = HIT.y + Math.sin(angle) * (t + 1)
    if (((x - CX) / RX) ** 2 + ((y - CY) / RY) ** 2 > 1) break
    t += 1
  }
  return { x: HIT.x + Math.cos(angle) * t, y: HIT.y + Math.sin(angle) * t }
}

/** Where the ball ends up for a delivery: the shot direction is a stable pseudo-random pick from the ball number. */
export function endPoint(ev: BallEvent, field: Placed[]) {
  const w = ev.wicket
  if (w) {
    if (w.kind === 'bowled' || w.kind === 'lbw' || w.kind === 'hit wicket') return STUMPS_BAT
    if (w.kind === 'caught and bowled') return BOWLER_STRIDE
    const f = field.find((p) => p.player.id === w.fielderId)
    if (f) return { x: f.x, y: f.y }
  }
  if (ev.extraType === 'wide') return { x: 100, y: 84 }
  const angle = eventAngle(ev) // the shot a person chose, else a stable pick (mostly in front of the bat)
  const rope = ropePoint(angle)
  const reach = reachFactor(ev.runsBat)
  return { x: HIT.x + (rope.x - HIT.x) * reach, y: HIT.y + (rope.y - HIT.y) * reach }
}

const shotColor = (ev: BallEvent) => (ev.wicket ? '#f87171' : ev.runsBat >= 6 ? '#e879f9' : ev.runsBat === 4 ? '#38bdf8' : ev.runsBat > 0 ? '#e2e8f0' : '#64748b')

// ---- Scenery -------------------------------------------------------------

function Crowd({ colors, pulse }: { colors: string[]; pulse: number }) {
  const dots = useMemo(() => {
    let seed = 7
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    return Array.from({ length: 360 }, () => {
      const a = rnd() * Math.PI * 2
      const k = 1.06 + rnd() * 0.2
      return { x: CX + Math.cos(a) * RX * k, y: CY + Math.sin(a) * RY * k, c: Math.floor(rnd() * 100), r: 0.55 + rnd() * 0.5 }
    })
  }, [])
  const palette = [...colors, '#e5e7eb', '#fbbf24', '#94a3b8', '#0f172a']
  return (
    <motion.g key={pulse} animate={pulse ? { y: [0, -1.4, 0, -0.8, 0] } : undefined} transition={{ duration: 0.9 }}>
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={palette[d.c % palette.length]} opacity={0.55} />
      ))}
    </motion.g>
  )
}

function Ground({ battingColor, pitch = 'balanced' }: { battingColor: string; pitch?: PitchKind }) {
  const colors = pitchColors(pitch)
  const stripes = Array.from({ length: 22 }, (_, i) => i)
  return (
    <>
      <defs>
        <radialGradient id="stands" cx="50%" cy="50%" r="70%"><stop offset="0" stopColor="#111a2e" /><stop offset="1" stopColor="#070b14" /></radialGradient>
        <radialGradient id="light" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#fff7d6" stopOpacity="0.55" /><stop offset="1" stopColor="#fff7d6" stopOpacity="0" /></radialGradient>
        <radialGradient id="shade" cx="50%" cy="50%" r="60%"><stop offset="0.55" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity="0.45" /></radialGradient>
        <linearGradient id="pitch" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={colors.strip[0]} /><stop offset="0.5" stopColor={colors.strip[1]} /><stop offset="1" stopColor={colors.strip[2]} /></linearGradient>
        <clipPath id="outfield"><ellipse cx={CX} cy={CY} rx={RX} ry={RY} /></clipPath>
      </defs>
      <rect width={W} height={H} fill="url(#stands)" />
      {[[8, 8], [152, 8], [8, 92], [152, 92]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="22" fill="url(#light)" />)}

      {/* advertising boards in the batting team's colour, then the grass */}
      <ellipse cx={CX} cy={CY} rx={RX + 2.6} ry={RY + 2.6} fill="none" stroke={battingColor} strokeWidth="2.4" strokeDasharray="7 2.5" opacity="0.85" />
      <ellipse cx={CX} cy={CY} rx={RX} ry={RY} fill="#1a6a3a" />
      <g clipPath="url(#outfield)">
        {stripes.map((i) => <rect key={i} x={14 + i * 6} y={0} width="6" height={H} fill={i % 2 ? colors.grass[0] : colors.grass[1]} />)}
        <ellipse cx={CX} cy={CY} rx={RX} ry={RY} fill="url(#shade)" />
      </g>
      <ellipse cx={CX} cy={CY} rx={RX} ry={RY} fill="none" stroke="#fff" strokeWidth="0.75" opacity="0.9" />
      <ellipse cx={CX} cy={CY} rx={RX * 0.55} ry={RY * 0.55} fill="none" stroke="#fff" strokeWidth="0.35" strokeDasharray="1.6 1.4" opacity="0.45" />

      {/* the pitch: strip, creases, stumps at both ends */}
      <rect x="77.1" y="26" width="5.8" height="48" rx="0.8" fill="url(#pitch)" />
      <rect x="77.1" y="26" width="5.8" height="48" rx="0.8" fill="none" stroke="#8f6f3c" strokeWidth="0.3" opacity="0.6" />
      {[31, 69].map((y) => <line key={y} x1="75" x2="85" y1={y} y2={y} stroke="#fff" strokeWidth="0.45" opacity="0.9" />)}
      {[27, 73].map((y) => <line key={y} x1="77.6" x2="82.4" y1={y} y2={y} stroke="#fff" strokeWidth="0.3" opacity="0.7" />)}
      {[27.2, 72.8].map((y) => (
        <g key={y}>
          {[78.4, 80, 81.6].map((x) => <line key={x} x1={x} x2={x} y1={y - 1.6} y2={y + 1.6} stroke="#fef3c7" strokeWidth="0.6" strokeLinecap="round" />)}
          <line x1="78.2" x2="81.8" y1={y - 1.6} y2={y - 1.6} stroke="#fbbf24" strokeWidth="0.5" />
        </g>
      ))}
    </>
  )
}

// ---- Celebrations ----------------------------------------------------------

/** A burst of sparks where the ball landed (boundaries). */
function Sparks({ x, y, color, big }: { x: number; y: number; color: string; big: boolean }) {
  const n = big ? 22 : 14
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2
        const len = (big ? 11 : 7) * (0.7 + (i % 3) * 0.25)
        return (
          <motion.line
            key={i} x1={x} y1={y} x2={x} y2={y} stroke={i % 2 ? '#fff' : color} strokeWidth={big ? 0.9 : 0.6} strokeLinecap="round"
            initial={{ opacity: 0 }}
            animate={{ x2: [x, x + Math.cos(a) * len], y2: [y, y + Math.sin(a) * len], x1: [x, x + Math.cos(a) * len * 0.5], y1: [y, y + Math.sin(a) * len * 0.5], opacity: [0, 1, 0] }}
            transition={{ delay: 0.75, duration: 0.7, ease: 'easeOut' }}
          />
        )
      })}
    </g>
  )
}

/** The stumps flying when a batsman is bowled, leg before or stumped. */
function StumpsFly() {
  const parts = [
    { x: 78.4, dx: -9, dr: -50 }, { x: 80, dx: 1, dr: 20 }, { x: 81.6, dx: 10, dr: 55 },
  ]
  return (
    <g>
      {parts.map((p, i) => (
        <motion.line
          key={i} x1={p.x} x2={p.x} y1={68.6} y2={71.8} stroke="#fef3c7" strokeWidth="0.7" strokeLinecap="round"
          initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0], x: [0, p.dx], y: [0, -6 - i, 5], rotate: [0, p.dr] }}
          style={{ originX: `${p.x}px`, originY: '70px' }} transition={{ delay: 0.4, duration: 0.9 }}
        />
      ))}
      {[-1, 1].map((d) => (
        <motion.line key={d} x1={79.2} x2={80.8} y1={68.4} y2={68.4} stroke="#fbbf24" strokeWidth="0.6" strokeLinecap="round" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0], x: [0, d * 12], y: [0, -10, 4], rotate: [0, d * 200] }} transition={{ delay: 0.4, duration: 0.9 }} />
      ))}
    </g>
  )
}

/** A small floating label for what a delivery scored, so every ball registers on the field. */
function RunChip({ event, x, y, scale }: { event: BallEvent; x: number; y: number; scale: number }) {
  let text: string
  let cls: string
  if (event.extraType === 'wide') { text = event.extraRuns > 1 ? `WD +${event.extraRuns}` : 'WD'; cls = 'bg-amber-400 text-black' }
  else if (event.extraType === 'noball') { text = event.total > 1 ? `NB +${event.total}` : 'NB'; cls = 'bg-amber-400 text-black' }
  else if (event.extraType === 'bye') { text = `B +${event.extraRuns}`; cls = 'bg-slate-300 text-black' }
  else if (event.extraType === 'legbye') { text = `LB +${event.extraRuns}`; cls = 'bg-slate-300 text-black' }
  else if (event.runsBat === 0) { text = '0'; cls = 'bg-white/15 text-slate-200' }
  else { text = `+${event.runsBat}`; cls = event.runsBat >= 3 ? 'bg-teal-400 text-black' : event.runsBat === 2 ? 'bg-sky-300 text-black' : 'bg-white text-black' }
  // keep it inside the field
  const cx = Math.min(Math.max(x, 8), 92)
  const cy = Math.min(Math.max(y, 10), 90)
  return (
    <motion.div
      className={`pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2 rounded-full px-2 py-0.5 font-display leading-none tracking-wide shadow-lg ring-1 ring-black/30 ${cls}`}
      style={{ left: pct(cx, W), top: pct(cy, H), fontSize: Math.round(19 * Math.max(scale, 0.75)) }}
      initial={{ opacity: 0, y: 6, scale: 0.6 }}
      animate={{ opacity: [0, 0.95, 0.95, 0], y: [6, -4, -12, -22], scale: [0.6, 1.1, 1, 0.95] }}
      transition={{ delay: 0.85, duration: 1.3, times: [0, 0.2, 0.65, 1] }}
    >
      {text}
    </motion.div>
  )
}

// ---- Players -------------------------------------------------------------

type Role = 'striker' | 'nonstriker' | 'bowler'
const ROLE: Record<Role, { label: string; ring: string; glow: string; tag: string }> = {
  striker: { label: 'BATSMAN', ring: '#fbbf24', glow: '#fbbf2499', tag: 'bg-amber-400 text-black' },
  nonstriker: { label: 'NON-STRIKER', ring: '#94a3b8', glow: '#94a3b855', tag: 'bg-slate-300 text-black' },
  bowler: { label: 'BOWLER', ring: '#f87171', glow: '#f8717199', tag: 'bg-red-500 text-white' },
}

const pct = (v: number, total: number) => `${(v / total) * 100}%`

function Bat({ swing }: { swing: number }) {
  return (
    <motion.svg key={swing} width="26" height="40" viewBox="0 0 26 40" className="absolute -right-5 top-1" animate={swing ? { rotate: [-25, 70, 10] } : { rotate: -25 }} style={{ originX: 0.5, originY: 0.9 }} transition={{ duration: 0.45 }}>
      <rect x="10" y="0" width="5" height="12" rx="2" fill="#78350f" />
      <rect x="6" y="11" width="13" height="27" rx="3" fill="#e9c98a" stroke="#a16207" strokeWidth="1.2" />
      <line x1="12.5" y1="14" x2="12.5" y2="35" stroke="#a16207" strokeWidth="0.8" opacity="0.6" />
    </motion.svg>
  )
}

function Ball({ className = '' }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" className={className}>
      <circle cx="8" cy="8" r="7" fill="#dc2626" stroke="#7f1d1d" strokeWidth="1" />
      <path d="M2.5 5.5c3 1.4 8 1.4 11 0M2.5 10.5c3-1.4 8-1.4 11 0" stroke="#fde68a" strokeWidth="0.9" fill="none" />
    </svg>
  )
}

function Token({ player, team, role, x, y, size, extra, delivering, celebrate, scale }: {
  player: Player; team: Team; role: Role; x: number; y: number; size: number; extra?: React.ReactNode; delivering?: number; celebrate?: number; scale: number
}) {
  const r = ROLE[role]
  const run = useAnimationControls()
  useEffect(() => {
    if (delivering) void run.start({ y: [0, 26, 0], scale: 1, transition: { duration: 0.55 } })
  }, [delivering, run])
  // jump for joy once the ball has landed
  useEffect(() => {
    if (celebrate) void run.start({ y: [0, -20, 0, -11, 0], scale: [1, 1.14, 1, 1.07, 1], transition: { delay: 0.95, duration: 0.9 } })
  }, [celebrate, run])
  return (
    <motion.div
      className="absolute z-20 -translate-x-1/2 -translate-y-1/2 text-center"
      initial={{ left: pct(x, W), top: pct(y, H), opacity: 0, scale: 0.5 }}
      animate={{ left: pct(x, W), top: pct(y, H), opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 130, damping: 18 }}
    >
      {/* everything about a token scales with the size of the field, so they never crowd each other on a small screen */}
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
        <motion.div animate={run}>
          <div className="relative inline-block rounded-full" style={{ boxShadow: `0 0 0 3px ${r.ring}, 0 0 22px ${r.glow}` }}>
            <PlayerAvatar player={player} team={team} size={size} />
            {extra}
          </div>
          <div className="mt-1 flex flex-col items-center gap-0.5">
            <span className={`rounded px-1.5 py-px text-[10px] font-extrabold tracking-wider ${r.tag}`}>{r.label}</span>
            <span className="max-w-[110px] truncate rounded bg-black/70 px-1.5 text-[11px] font-semibold text-white" style={{ borderBottom: `2px solid ${accentOf(team)}` }}>{player.name}</span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}

export interface StageNote { key: number; tone: 'wicket' | 'six' | 'four' | 'milestone'; title: string; sub: string; /** A slim banner for small news (the over summary). */ small?: boolean }

const NOTE_STYLE: Record<StageNote['tone'], string> = {
  wicket: 'from-red-600 to-red-800 text-white',
  six: 'from-fuchsia-500 to-purple-700 text-white',
  four: 'from-sky-500 to-blue-700 text-white',
  milestone: 'from-amber-300 to-amber-500 text-black',
}

export function Stage({
  event, overEvents, striker, nonStriker, bowler, battingTeam, bowlingTeam, fielders, fieldTag, pitch, chase, note, moment, onDismissMoment, aimShot, aimDelivery, onSwipe, freeHit,
}: {
  /** The chase in its last two overs: what is needed, off how many balls (it pulses in the last over). */
  chase?: { need: number; balls: number; wickets: number } | null
  /** The kind of pitch, which tints the grass and the strip. */
  pitch?: PitchKind
  /** What the fielders' stage of the game is called (powerplay, death overs...), shown as a small tag. */
  fieldTag?: { label: string; note: string } | null
  /** 'next': the ball about to be bowled is a free hit. 'ball': the ball just bowled was one (its outcome is on the field). */
  freeHit?: 'next' | 'ball' | null
  event: BallEvent | null; overEvents: BallEvent[]; note?: StageNote | null; moment?: Moment | null; onDismissMoment?: () => void
  /** A shot / delivery lined up for the next ball, drawn on the field. */
  aimShot?: ShotAim | null; aimDelivery?: DeliveryAim | null
  /** When set, dragging across the field aims the next shot. */
  onSwipe?: (a: ShotAim) => void
  striker: Player; nonStriker: Player | null; bowler: Player
  battingTeam: Team; bowlingTeam: Team; fielders: Placed[]
}) {
  // The tokens are drawn for a 730px-wide field; shrink them on smaller ones.
  const box = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setScale(Math.min(1.1, Math.max(0.55, e.contentRect.width / 730))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const swipeFrom = useRef<{ x: number; y: number } | null>(null)
  const end = event ? endPoint(event, fielders) : HIT
  const six = event?.boundary === 6
  // a delivery chosen by a person lands where they put it
  const bounce = event?.delivery ? landingSpot(event.delivery) : null
  const wicket = !!event?.wicket
  const involved = event?.wicket?.fielderId ?? null
  const seq = event?.seq ?? 0
  const hit = !!event && (event.runsBat > 0 || (!!event.wicket && event.wicket.kind !== 'bowled'))
  const crowdPulse = event && (event.boundary || event.wicket) ? seq + 1 : 0
  const lines = overEvents.filter((e) => e.runsBat > 0 || (e.wicket && e.wicket.fielderId))
  const milestone = !!event?.tags.some((t) => t === 'fifty' || t === 'hundred' || t === '150' || t === '200')
  const strikerJoy = event && (event.boundary || milestone) ? seq + 1 : 0
  const bowlerJoy = event?.wicket && event.wicket.kind !== 'run out' ? seq + 1 : 0
  const stumpsHit = !!event?.wicket && ['bowled', 'lbw', 'hit wicket', 'stumped'].includes(event.wicket.kind)
  const flash = event?.boundary === 6 ? '#e879f9' : event?.wicket ? '#ef4444' : event?.boundary === 4 ? '#38bdf8' : milestone ? '#fbbf24' : null

  return (
    <motion.div
      ref={box}
      key={wicket && event ? `w${event.seq}` : 'stage'}
      animate={wicket ? { x: [0, -8, 8, -5, 5, 0] } : { x: 0 }}
      transition={{ duration: 0.45 }}
      className={`relative aspect-[16/10] w-full overflow-hidden rounded-2xl border bg-[#070b14] ${freeHit ? 'border-2 border-red-500' : 'border-line'}`}
      style={{ ...(onSwipe ? { touchAction: 'none' } : {}), ...(freeHit ? { boxShadow: freeHit === 'next' ? '0 0 0 2px #ef444466, 0 0 28px #ef444488' : '0 0 0 2px #ef444488, 0 0 34px #ef4444aa' } : {}) }}
      onPointerDown={onSwipe ? (e) => { swipeFrom.current = { x: e.clientX, y: e.clientY } } : undefined}
      onPointerUp={onSwipe ? (e) => {
        const from = swipeFrom.current
        swipeFrom.current = null
        const rect = box.current?.getBoundingClientRect()
        if (!from || !rect) return
        const dx = e.clientX - from.x
        const dy = e.clientY - from.y
        const len = Math.hypot(dx, dy)
        if (len < 26) return // a tap, not a swipe
        // the field is drawn in a box that is a different shape from the screen, so measure the direction in field units
        onSwipe({ angle: Math.atan2((dy / rect.height) * H, (dx / rect.width) * W), loft: len > rect.width * 0.3 })
      } : undefined}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
        <Ground battingColor={battingTeam.colors.primary} pitch={pitch} />
        <Crowd colors={[battingTeam.colors.primary, battingTeam.colors.secondary, bowlingTeam.colors.primary, bowlingTeam.colors.secondary]} pulse={crowdPulse} />

        {/* shot lines for this over, the latest one drawn as it happens */}
        {lines.map((e) => {
          const p = endPoint(e, fielders)
          const latest = e.seq === seq
          return (
            <motion.line
              key={e.seq} x1={HIT.x} y1={HIT.y} x2={p.x} y2={p.y} stroke={shotColor(e)} strokeWidth={latest ? 0.9 : 0.5} strokeLinecap="round"
              strokeDasharray={latest ? undefined : '1.6 1.2'} opacity={latest ? 0.95 : 0.55}
              initial={latest ? { pathLength: 0 } : false} animate={{ pathLength: 1 }} transition={{ delay: 0.4, duration: 0.5 }}
            />
          )
        })}
        {event?.boundary && <Sparks key={`sp${seq}`} x={end.x} y={end.y} color={event.boundary === 6 ? '#e879f9' : '#38bdf8'} big={event.boundary === 6} />}
        {stumpsHit && <StumpsFly key={`st${seq}`} />}
        {aimShot && (() => {
          const tip = ropePoint(aimShot.angle)
          const reach = aimShot.loft ? 0.95 : 0.8
          const x2 = HIT.x + (tip.x - HIT.x) * reach
          const y2 = HIT.y + (tip.y - HIT.y) * reach
          return (
            <g pointerEvents="none">
              <line x1={HIT.x} y1={HIT.y} x2={x2} y2={y2} stroke="#fbbf24" strokeWidth="1.1" strokeLinecap="round" strokeDasharray={aimShot.loft ? '0.1 2.2' : '3 1.6'} />
              <circle cx={x2} cy={y2} r="2.2" fill="#fbbf24" stroke="#000" strokeWidth="0.4" />
              <text x={x2} y={y2 + 0.9} textAnchor="middle" fontSize="2.6" fontWeight="800" fill="#000">{aimShot.loft ? '↑' : '•'}</text>
            </g>
          )
        })()}
        {aimDelivery && (() => {
          const p = landingSpot(aimDelivery)
          return <circle cx={p.x} cy={p.y} r="1.9" fill="#ef4444" stroke="#fff" strokeWidth="0.5" pointerEvents="none" />
        })()}
        {/* the ball: travels bowler to bat, then away */}
        {event && (
          <motion.g key={event.seq}>
            <motion.circle
              r={six ? 1.7 : 1.15} fill="#ef4444" stroke="#fecaca" strokeWidth="0.35"
              initial={{ cx: BOWLER_STRIDE.x, cy: BOWLER_STRIDE.y, opacity: 1 }}
              animate={bounce
                ? { cx: [BOWLER_STRIDE.x, bounce.x, HIT.x, end.x], cy: [BOWLER_STRIDE.y, bounce.y, HIT.y, end.y], r: six ? [1.15, 1.15, 1.15, 2.4] : [1.15, 1.15, 1.15, 1.15], opacity: [1, 1, 1, event.boundary ? 0.35 : 1] }
                : { cx: [BOWLER_STRIDE.x, HIT.x, end.x], cy: [BOWLER_STRIDE.y, HIT.y, end.y], r: six ? [1.15, 1.15, 2.4, 1.3] : [1.15, 1.15, 1.15], opacity: [1, 1, event.boundary ? 0.35 : 1] }}
              transition={bounce ? { duration: 1.1, times: [0, 0.2, 0.4, 1], ease: 'easeOut' } : { duration: 1.05, times: [0, 0.38, 1], ease: 'easeOut' }}
            />
          </motion.g>
        )}
      </svg>

      {/* a free hit: a red wash and a tag, so the ball (and what it did) stands out */}
      {freeHit && (
        <>
          <motion.div
            key={`fh${freeHit}${seq}`} className="pointer-events-none absolute inset-0 z-[5]"
            style={{ background: 'radial-gradient(ellipse at 50% 50%, transparent 45%, #ef444455 100%)', boxShadow: 'inset 0 0 60px #ef444466' }}
            animate={freeHit === 'next' ? { opacity: [0.6, 1, 0.6] } : { opacity: 1 }} transition={freeHit === 'next' ? { duration: 1.1, repeat: Infinity } : { duration: 0.3 }}
          />
          <div className="pointer-events-none absolute right-2 top-2 z-30 flex items-center gap-1.5 rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-widest text-white shadow-lg">
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" />{freeHit === 'next' ? 'Free hit next ball' : 'Free hit ball'}
          </div>
        </>
      )}

      {/* a quick colour flash on the big moments */}
      {flash && (
        <motion.div key={`fl${seq}`} className="pointer-events-none absolute inset-0 z-30" style={{ background: `radial-gradient(circle at 50% 55%, ${flash}88, transparent 70%)` }} initial={{ opacity: 0 }} animate={{ opacity: [0, 0.9, 0] }} transition={{ delay: 0.7, duration: 0.7 }} />
      )}

      {/* banner for wickets and milestones */}
      <AnimatePresence>
        {note && (
          <motion.div
            key={note.key}
            className={`pointer-events-none absolute left-1/2 z-40 -translate-x-1/2 bg-gradient-to-b text-center shadow-2xl ring-white/40 ${note.small ? 'top-2 rounded-lg px-3 py-0.5 ring-1' : 'top-3 rounded-xl px-6 py-2 ring-2'} ${NOTE_STYLE[note.tone]}`}
            initial={{ y: -60, opacity: 0, scale: 0.8 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -40, opacity: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          >
            <div className={`font-display leading-none tracking-wider ${note.small ? 'text-sm' : 'text-3xl'}`}>{note.title}</div>
            <div className={`font-semibold opacity-90 ${note.small ? 'text-[10px] leading-tight' : 'mt-0.5 text-xs'}`}>{note.sub}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* what the ball scored, shown lightly for everything except boundaries and wickets (those have their own show) */}
      {event && !event.boundary && !event.wicket && <RunChip key={`run${event.seq}`} event={event} x={end.x} y={end.y} scale={scale} />}

      {/* fielders */}
      {fielders.map(({ player, x, y, spot }) => (
        <motion.div
          key={player.id + (involved === player.id ? `-${seq}` : '')}
          className="group absolute z-10 -translate-x-1/2 -translate-y-1/2 hover:z-40"
          initial={{ left: pct(x, W), top: pct(y, H) }}
          animate={{ left: pct(x, W), top: pct(y, H), ...(involved === player.id ? { scale: [1, 1, 1.6, 1.15] } : { scale: 1 }) }}
          transition={{ duration: 1.3, times: [0, 0.6, 0.78, 1], left: { duration: 1, ease: 'easeInOut' }, top: { duration: 1, ease: 'easeInOut' } }}
        >
          <div className="rounded-full transition-transform duration-150 group-hover:scale-125" style={{ boxShadow: `0 0 0 1.5px ${accentOf(bowlingTeam)}aa` }}>
            <PlayerAvatar player={player} team={bowlingTeam} size={involved === player.id ? Math.round(38 * Math.max(scale, 0.75)) : Math.max(18, Math.round(22 * scale))} />
          </div>
          {/* name tag on hover */}
          <div className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-lg bg-black/90 px-2.5 py-1 text-center opacity-0 shadow-lg ring-1 ring-white/20 transition-opacity duration-100 group-hover:opacity-100">
            <div className="text-xs font-bold text-white">{player.name}</div>
            <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: accentOf(bowlingTeam) }}>{spot}</div>
          </div>
        </motion.div>
      ))}

      {/* the three people at the crease */}
      {nonStriker && <Token key={nonStriker.id} player={nonStriker} team={battingTeam} role="nonstriker" x={NON_STRIKER.x} y={NON_STRIKER.y} size={46} scale={scale} />}
      <Token key={striker.id} player={striker} team={battingTeam} role="striker" x={STRIKER.x} y={STRIKER.y} size={58} scale={scale} celebrate={strikerJoy} extra={<Bat swing={hit ? seq + 1 : 0} />} />
      <Token key={bowler.id} player={bowler} team={bowlingTeam} role="bowler" x={BOWLER_START.x} y={BOWLER_START.y} size={54} scale={scale} delivering={seq + 1} celebrate={bowlerJoy} extra={<Ball className="absolute -left-4 bottom-1" />} />

      {/* a milestone or a dismissal takes over the whole field with the batsman as a stick man */}
      <AnimatePresence>{moment && <MomentOverlay key={moment.key} moment={moment} onDismiss={() => onDismissMoment?.()} />}</AnimatePresence>

      {/* the finish of a chase: how many are needed off how many balls */}
      {chase && chase.need > 0 && chase.balls > 0 && chase.balls <= 12 && (
        <motion.div
          className="pointer-events-none absolute bottom-2 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/80 px-3 py-1 text-center text-[11px] font-extrabold uppercase tracking-wider text-white ring-2"
          style={{ ['--tw-ring-color' as string]: chase.balls <= 6 ? '#ef4444' : '#fbbf2499' }}
          animate={chase.balls <= 6 ? { scale: [1, 1.07, 1], boxShadow: ['0 0 0 #ef444400', '0 0 18px #ef4444cc', '0 0 0 #ef444400'] } : { scale: 1 }} transition={{ duration: 1, repeat: Infinity }}
        >
          Need <b className="text-amber-300">{chase.need}</b> off <b className="text-amber-300">{chase.balls}</b> {chase.balls === 1 ? 'ball' : 'balls'} <span className="text-slate-400">· {chase.wickets} {chase.wickets === 1 ? 'wicket' : 'wickets'} left</span>
        </motion.div>
      )}

      {/* which field is set, so the changes make sense */}
      {fieldTag && (
        <motion.div key={fieldTag.label} className="pointer-events-none absolute left-2 top-2 z-30 max-w-[60%] rounded-lg bg-black/70 px-2 py-1 text-[10px] font-bold uppercase leading-tight tracking-wider text-sky-200 ring-1 ring-sky-300/30 sm:text-[11px]" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          {fieldTag.label}
          <span className="block text-[10px] font-semibold normal-case tracking-normal text-slate-300 max-sm:hidden">{fieldTag.note}</span>
        </motion.div>
      )}

      {/* a little legend so the colours mean something */}
      <div className="pointer-events-none absolute bottom-2 left-2 z-30 flex gap-1.5 text-[10px] font-bold tracking-wider max-sm:hidden">
        <span className="rounded bg-amber-400 px-1.5 py-0.5 text-black">BATTING: {battingTeam.name}</span>
        <span className="rounded bg-red-500 px-1.5 py-0.5 text-white">BOWLING: {bowlingTeam.name}</span>
      </div>
    </motion.div>
  )
}
