import { motion } from 'framer-motion'
import { useEffect, useMemo } from 'react'
import { sfx } from '../../audio/sfx'
import type { Contact } from '../../engine/contact'
import type { WicketCard } from '../../season/wicketCards'
import type { Player, Team } from '../../types'
import { PlayerAvatar, accentOf } from '../ui'
import { BatContact, ContactMeters } from './ContactPanel'
import { drawnAngles, planBall, replayCamFor } from './broadcast'
import { endPoint } from './Stage'
import { Counter, type SixInfo } from './SixReplay'
import { LENGTH_WORDS, type DeliveryLook } from '../../engine/delivery'
import { BALL_R, STUMP_HALF, STUMP_HEIGHT, type Miss } from './nearMiss'
import type { AlmostCaught } from './almost'
import { wideDirection } from '../../engine/wide'
import { ReplayFrame, type ReplayBase } from './ReplayFrame'
import { useWidth } from './ReviewScreens'

const SPOT_WORDS: Record<Contact['spot'], string> = { Middle: 'right in the middle of the bat', 'Off centre': 'just off the middle of the bat', 'Toe end': 'off the toe of the bat', 'Top edge': 'off the top edge', 'Outside edge': 'off the outside edge', 'Inside edge': 'off the inside edge' }
const Bottom = ({ children, from = 0.52 }: { children: React.ReactNode; from?: number }) => (
  <div className="absolute inset-x-0 bottom-0 border-t-2 border-sky-400/50" style={{ top: `${from * 100}%`, background: 'linear-gradient(180deg, #0b1424, #070b14)' }}>{children}</div>
)

// ---- A four ---------------------------------------------------------------------------------------------------------------------

export interface FourCastInfo {
  replay: ReplayBase
  contact: Contact
  /** Where it went, in words: "Cover, along the ground". */
  shot: string
  batsman: Player
  batTeam: Team
  /** The ball was hit off a free hit. */
  fire?: boolean
  /** A poor length it was hit off ("low full toss"), named on the screen. */
  poor?: string
  rate: number
}
export const FOUR_SECONDS = 8.4

/** A four, the broadcast way: the ball played again to the rope, and under it where the ball met the bat, the bat speed and the timing. */
export function FourCast({ info }: { info: FourCastInfo }) {
  const r = info.rate
  const [box, w] = useWidth()
  useEffect(() => { const t = window.setTimeout(() => sfx.four(), 1900 * r); return () => window.clearTimeout(t) }, [r])
  const c = info.contact
  const compact = w < 520
  const how = c.quality >= 0.8 ? 'Middled it' : c.quality >= 0.55 ? 'Well timed' : 'Found the gap'
  return (
    <div ref={box} className="absolute inset-0 overflow-hidden rounded-2xl bg-[#05070d]" aria-label="Four">
      <ReplayFrame base={info.replay} rate={1.5 * r} deep cam={replayCamFor('four', info.replay.event.seq)} />
      <Bottom>
        <div className="flex h-full items-stretch gap-2 px-2 py-1 sm:gap-3 sm:px-3">
          <motion.div className="shrink-0 self-center" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.4 * r }}><BatContact contact={c} height={compact ? 84 : 118} delay={1.7} rate={r} /></motion.div>
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
            <motion.div className="flex items-center gap-2" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 * r }}>
              <span className="inline-block shrink-0 rounded-full leading-[0]" style={{ boxShadow: `0 0 0 2px ${accentOf(info.batTeam)}` }}><PlayerAvatar player={info.batsman} team={info.batTeam} size={compact ? 28 : 36} /></span>
              <div className="min-w-0 leading-tight"><div className="truncate text-sm font-extrabold text-white">{info.batsman.name}</div><div className="truncate text-[11px] font-semibold text-slate-300">{info.shot}{info.poor ? ` · off a ${info.poor.toLowerCase()}` : ''}</div></div>
              <motion.div className="ml-auto shrink-0 font-display text-2xl leading-none tracking-wide text-white sm:text-3xl" style={{ WebkitTextStroke: '1.5px #0c4a6e', paintOrder: 'stroke fill', textShadow: info.fire ? '0 0 20px #f97316' : '0 0 20px #38bdf8aa' }} initial={{ scale: 2.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 1.9 * r, type: 'spring', stiffness: 260, damping: 14 }}>FOUR!</motion.div>
            </motion.div>
            <ContactMeters contact={c} delay={1.8} rate={r} compact />
            <motion.p className="text-[10px] font-semibold leading-tight text-amber-200 sm:text-xs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.2 * r }}>{how}: {c.speedLabel.toLowerCase()}, {c.timingLabel.toLowerCase()}, {SPOT_WORDS[c.spot]}.</motion.p>
          </div>
        </div>
      </Bottom>
    </div>
  )
}

// ---- A wicket (bowled, lbw, stumped, hit wicket, run out) -----------------------------------------------------------------------

export interface WicketCastInfo {
  replay: ReplayBase
  card: WicketCard
  batsman: Player
  batTeam: Team
  /** What kind of wicket it was (for the camera the replay uses). */
  kind: 'bowled' | 'lbw' | 'stumped' | 'hit wicket' | 'run out'
  /** "34 (21)". */
  score: string
  /** How it reads on the scorecard: "b Dio Brando", "lbw b ...". */
  how: string
  rate: number
}
export const WICKET_CAST_SECONDS = 8.2

/** A wicket, the broadcast way: the ball played again and, under it, the batsman, the three facts of how he went and a sentence on it. */
export function WicketCast({ info }: { info: WicketCastInfo }) {
  const r = info.rate
  const [box, w] = useWidth()
  useEffect(() => { const t = window.setTimeout(() => sfx.wicket(), 2200 * r); return () => window.clearTimeout(t) }, [r])
  const compact = w < 520
  return (
    <div ref={box} className="absolute inset-0 overflow-hidden rounded-2xl bg-[#05070d]" aria-label={info.card.title}>
      <ReplayFrame base={info.replay} rate={1.6 * r} cam={replayCamFor(info.kind, info.replay.event.seq)} />
      <Bottom>
        <div className="flex h-full flex-col justify-center gap-1.5 px-3 py-1.5">
          <motion.div className="flex items-center gap-2" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 * r }}>
            <span className="inline-block shrink-0 rounded-full leading-[0]" style={{ boxShadow: `0 0 0 2px ${accentOf(info.batTeam)}` }}><PlayerAvatar player={info.batsman} team={info.batTeam} size={compact ? 30 : 40} /></span>
            <div className="min-w-0 leading-tight"><div className="truncate text-sm font-extrabold text-white">{info.batsman.name} <span className="font-semibold text-slate-400">{info.score}</span></div><div className="truncate text-[11px] font-semibold text-slate-300">{info.how}</div></div>
            <motion.div className="ml-auto shrink-0 rounded bg-red-600 px-2 py-0.5 font-display text-lg leading-none tracking-wide text-white sm:text-2xl" initial={{ scale: 2.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 2.4 * r, type: 'spring', stiffness: 260, damping: 14 }}>{info.card.title}</motion.div>
          </motion.div>
          <div className="grid grid-cols-3 gap-1.5">
            {info.card.tiles.map((t, i) => (
              <motion.div key={t.label} className="rounded-lg bg-black/60 px-2 py-1 ring-1 ring-white/10" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: (2.0 + i * 0.25) * r }}>
                <div className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">{t.label}</div>
                <div className="truncate text-xs font-extrabold text-amber-300 sm:text-sm">{t.value}</div>
              </motion.div>
            ))}
          </div>
          <motion.p className="text-[10.5px] font-semibold leading-snug text-slate-100 sm:text-xs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.4 * r }}>{info.card.verdict}</motion.p>
        </div>
      </Bottom>
    </div>
  )
}

// ---- A wide, a bye or a leg bye -------------------------------------------------------------------------------------------------

export interface ExtraCastInfo {
  replay: ReplayBase
  /** "WIDE!", "FOUR BYES!"... and the line under it. */
  title: string
  sub: string
  color: string
  /** For a wide: which side, the batsman's hand and how far outside the wide line it went (cm), drawn as a gap. */
  wide?: { side: 'off' | 'leg'; hand: 'L' | 'R'; cm: number }
  rate: number
}
export const EXTRA_CAST_SECONDS = 4.4

/** The pitch from above with the wide lines and the ball going past one, and the gap outside the line marked: a wide of 10 cm and one of 150 cm look different. */
function WideGap({ wide, w }: { wide: NonNullable<ExtraCastInfo['wide']>; w: number }) {
  const side = wideDirection(wide.side, wide.hand, 'above')
  // the wide line is 18 units from the middle; every 100 cm outside it is 20 more (so 150 cm just fits)
  const out = 18 + wide.cm * 0.2
  const x = (v: number) => 50 + side * v
  return (
    <svg viewBox="0 0 100 62" width={w} className="shrink-0 rounded-lg bg-[#0b2a19]" aria-hidden>
      <rect x="40" y="0" width="20" height="62" fill="#c9a864" opacity="0.45" />
      <line x1="2" x2="98" y1="46" y2="46" stroke="#fff" strokeWidth="0.7" opacity="0.8" />
      {[47, 50, 53].map((sx) => <line key={sx} x1={sx} x2={sx} y1="48" y2="53" stroke="#fef3c7" strokeWidth="1.2" strokeLinecap="round" />)}
      {[-1, 1].map((d) => <line key={d} x1={50 + d * 18} x2={50 + d * 18} y1="4" y2="58" stroke="#ef4444" strokeWidth="0.7" strokeDasharray="2 1.4" />)}
      <motion.path d={`M50 4 Q${x(out / 3)} 22 ${x(out)} 46 T${x(Math.min(48, out * 1.15))} 60`} fill="none" stroke="#fbbf24" strokeWidth="1" strokeDasharray="2 1.2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.4, duration: 1.2 }} />
      <motion.circle r="2" cx={x(out)} cy="46" fill="#ef4444" stroke="#fecaca" strokeWidth="0.5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} />
      <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }}>
        <line x1={x(18)} x2={x(out)} y1="39" y2="39" stroke="#fde68a" strokeWidth="1" />
        <line x1={x(18)} x2={x(18)} y1="37" y2="41" stroke="#fde68a" strokeWidth="0.8" /><line x1={x(out)} x2={x(out)} y1="37" y2="41" stroke="#fde68a" strokeWidth="0.8" />
        <text x={x((18 + out) / 2)} y="34" fontSize="5.5" fontWeight="800" textAnchor="middle" fill="#fef3c7">{wide.cm} cm</text>
      </motion.g>
    </svg>
  )
}

/** An extra, the broadcast way: a short replay of the ball and a banner saying what it was and how many it cost. */
export function ExtraCast({ info }: { info: ExtraCastInfo }) {
  const r = info.rate
  const [box, w] = useWidth()
  return (
    <div ref={box} className="absolute inset-0 overflow-hidden rounded-2xl bg-[#05070d]" aria-label={info.title}>
      <ReplayFrame base={info.replay} rate={1.2 * r} share={0.7} cam={info.wide ? replayCamFor('wide', info.replay.event.seq) : replayCamFor('extra', info.replay.event.seq)} />
      <Bottom from={0.7}>
        <div className="flex h-full items-center justify-center gap-3 px-3">
          {info.wide && <WideGap wide={info.wide} w={Math.max(96, Math.min(w * 0.3, 150))} />}
          <motion.div className="font-display leading-none tracking-wide text-white" style={{ fontSize: Math.max(26, Math.min(w * (info.wide ? 0.07 : 0.085), 52)), WebkitTextStroke: '2px #0b1424', paintOrder: 'stroke fill', textShadow: `0 0 22px ${info.color}aa`, color: info.color }} initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.9 * r, type: 'spring', stiffness: 260, damping: 14 }}>{info.title}</motion.div>
          <motion.div className="min-w-0 text-xs font-semibold leading-tight text-slate-100 sm:text-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 * r }}>{info.sub}</motion.div>
        </div>
      </Bottom>
    </div>
  )
}

// ---- A near miss: the ball that beat the bat -------------------------------------------------------------------------------------

export interface MissCastInfo {
  replay: ReplayBase
  miss: Miss
  batsman: Player
  bowler: Player
  batTeam: Team
  rate: number
}
export const MISS_CAST_SECONDS = 6

/** The stumps from the front, with the ball where it went past them and the gap marked in centimetres. */
function StumpsGap({ miss, w }: { miss: Miss; w: number }) {
  // centimetres, the ground at the bottom
  const stumps = [-9.7, 0, 9.7]
  const bx = miss.x * 100, by = -miss.y * 100
  const nx = Math.max(-STUMP_HALF * 100, Math.min(STUMP_HALF * 100, bx)), ny = -Math.min(STUMP_HEIGHT * 100, Math.max(0, -by))
  return (
    <svg viewBox="-40 -105 80 112" width={w} className="shrink-0" aria-hidden>
      <line x1="-40" y1="0" x2="40" y2="0" stroke="#4ade80" strokeWidth="1.2" opacity="0.6" />
      {stumps.map((x) => <rect key={x} x={x - 1.75} y={-STUMP_HEIGHT * 100} width="3.5" height={STUMP_HEIGHT * 100} rx="1" fill="#f1e2b0" />)}
      <rect x="-12" y={-STUMP_HEIGHT * 100 - 1.6} width="11" height="2.2" rx="1" fill="#fde68a" /><rect x="1" y={-STUMP_HEIGHT * 100 - 1.6} width="11" height="2.2" rx="1" fill="#fde68a" />
      <motion.line x1={nx} y1={ny} x2={bx} y2={by} stroke="#fbbf24" strokeWidth="1.2" strokeDasharray="2.5 2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.6 }} />
      <motion.circle r={BALL_R * 100} fill="#dc2626" stroke="#fecaca" strokeWidth="0.8" initial={{ cx: bx, cy: by - 70, opacity: 0 }} animate={{ cx: bx, cy: by, opacity: 1 }} transition={{ delay: 2.0, duration: 0.5 }} />
      <motion.text x={(nx + bx) / 2 + (bx >= 0 ? 6 : -6)} y={(ny + by) / 2 - 3} textAnchor={bx >= 0 ? 'start' : 'end'} fontSize="10" fontWeight="800" fill="#fbbf24" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.8 }}>{miss.cm} cm</motion.text>
    </svg>
  )
}

/** The edge of the bat from the side, with the ball going past it and the gap marked. */
function BatGap({ miss, w }: { miss: Miss; w: number }) {
  const gap = miss.cm * 7
  return (
    <svg viewBox="0 0 110 90" width={w} className="shrink-0" aria-hidden>
      <rect x="14" y="8" width="16" height="74" rx="6" fill="#e9c98a" stroke="#a16207" strokeWidth="1.2" />
      <rect x="19" y="-2" width="6" height="14" rx="2" fill="#7c2d12" />
      <motion.line x1="30" y1="46" x2={30 + gap} y2="46" stroke="#fbbf24" strokeWidth="1.4" strokeDasharray="2.5 2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.6 }} />
      <motion.circle r="6" fill="#dc2626" stroke="#fecaca" strokeWidth="1" initial={{ cx: 30 + gap + 6, cy: -10, opacity: 0 }} animate={{ cx: 30 + gap + 6, cy: 46, opacity: 1 }} transition={{ delay: 2.0, duration: 0.5 }} />
      <motion.text x={32 + gap / 2} y="40" textAnchor="middle" fontSize="11" fontWeight="800" fill="#fbbf24" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.8 }}>{miss.cm} cm</motion.text>
    </svg>
  )
}

/** A close call: the ball that beat the bat, played again, and how near it went to the stumps or to the edge of the bat. */
export function MissCast({ info }: { info: MissCastInfo }) {
  const r = info.rate
  const [box, w] = useWidth()
  useEffect(() => { const t = window.setTimeout(() => sfx.aww(0.55), 2300 * r); return () => window.clearTimeout(t) }, [r])
  const m = info.miss
  const stumps = m.kind === 'stumps'
  const title = stumps ? 'SO CLOSE!' : 'BEATEN!'
  const side = m.side === 'off' ? 'off' : 'leg'
  const line = stumps
    ? m.side === 'over' ? `Over the top of the stumps by ${m.cm} cm` : `Just missed ${side} stump by ${m.cm} cm`
    : `Played and missed: the ball went ${m.cm} cm from the edge of the bat`
  const sub = stumps ? `${info.bowler.name} was a whisker away from bowling ${info.batsman.name}.` : `${info.batsman.name} went at one outside ${side} stump and found nothing.`
  const compact = w < 520
  return (
    <div ref={box} className="absolute inset-0 overflow-hidden rounded-2xl bg-[#05070d]" aria-label={title}>
      <ReplayFrame base={info.replay} rate={r} share={0.56} cam={stumps ? 'stump' : 'side'} tag="Close call" near />
      <Bottom from={0.56}>
        <div className="flex h-full items-center gap-3 px-3">
          {stumps ? <StumpsGap miss={m} w={compact ? 96 : 130} /> : <BatGap miss={m} w={compact ? 104 : 140} />}
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
            <motion.div className="font-display leading-none tracking-wide text-white" style={{ fontSize: compact ? 28 : 40, WebkitTextStroke: '2px #0b1424', paintOrder: 'stroke fill', textShadow: '0 0 14px #f59e0b' }} initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 1.0 * r, type: 'spring', stiffness: 220, damping: 16 }}>{title}</motion.div>
            <motion.div className="text-xs font-extrabold leading-tight text-amber-300 sm:text-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.4 * r }}>{line}</motion.div>
            <motion.div className="text-[10.5px] font-semibold leading-snug text-slate-200 sm:text-xs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.2 * r }}>{sub}</motion.div>
          </div>
        </div>
      </Bottom>
    </div>
  )
}

// ---- Almost caught: the lofted shot that fell just in front of a fielder -----------------------------------------------------------

export interface AlmostCastInfo {
  replay: ReplayBase
  almost: AlmostCaught
  batsman: Player
  batTeam: Team
  bowlTeam: Team
  rate: number
}
export const ALMOST_CAST_SECONDS = 6

/** The ball's flight from the side: up and down in front of the fielder who is stretching for it, and the gap marked. */
function FallShort({ gap, w, fielder, team }: { gap: number; w: number; fielder: Player; team: Team }) {
  const px = gap * 18
  const fx = 104
  return (
    <svg viewBox="0 0 130 80" width={w} className="shrink-0" aria-hidden>
      <line x1="4" y1="64" x2="126" y2="64" stroke="#4ade80" strokeWidth="1.2" opacity="0.7" />
      <motion.path d={`M8 64 Q ${(8 + fx - px) / 2} -14 ${fx - px} 64`} fill="none" stroke="#fde68a" strokeWidth="1.6" strokeDasharray="3 2.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 1.3, duration: 1.0 }} />
      <motion.circle r="3.4" fill="#dc2626" stroke="#fecaca" strokeWidth="0.8" initial={{ cx: fx - px, cy: 20, opacity: 0 }} animate={{ cx: fx - px, cy: 61, opacity: 1 }} transition={{ delay: 2.2, duration: 0.35 }} />
      <foreignObject x={fx - 11} y="18" width="22" height="22"><div className="overflow-hidden rounded-full" style={{ width: 22, height: 22, boxShadow: `0 0 0 2px ${accentOf(team)}` }}><PlayerAvatar player={fielder} team={team} size={22} /></div></foreignObject>
      <line x1={fx} y1="40" x2={fx} y2="64" stroke="#e2e8f0" strokeWidth="3.2" strokeLinecap="round" />
      <line x1={fx} y1="44" x2={fx - 14} y2="34" stroke="#e2e8f0" strokeWidth="2.4" strokeLinecap="round" />
      <motion.line x1={fx - px + 3.4} y1="72" x2={fx} y2="72" stroke="#fbbf24" strokeWidth="1.2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.7 }} />
      <motion.text x={fx - px / 2} y="79" textAnchor="middle" fontSize="8" fontWeight="800" fill="#fbbf24" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.8 }}>{gap.toFixed(1)} m</motion.text>
    </svg>
  )
}

/** "So nearly": a lofted shot played again from above and, under it, how far in front of the fielder it fell. */
export function AlmostCast({ info }: { info: AlmostCastInfo }) {
  const r = info.rate
  const [box, w] = useWidth()
  useEffect(() => { const t = window.setTimeout(() => sfx.aww(0.6), 2400 * r); return () => window.clearTimeout(t) }, [r])
  const a = info.almost
  const compact = w < 520
  const first = a.fielder.name.split(' ')[0]
  return (
    <div ref={box} className="absolute inset-0 overflow-hidden rounded-2xl bg-[#05070d]" aria-label="So nearly caught">
      <ReplayFrame base={info.replay} rate={1.4 * r} share={0.56} cam={replayCamFor('catch', info.replay.event.seq)} tag="So nearly" />
      <Bottom from={0.56}>
        <div className="flex h-full items-center gap-3 px-3">
          <FallShort gap={a.gap} w={compact ? 118 : 150} fielder={a.fielder} team={info.bowlTeam} />
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
            <motion.div className="font-display leading-none tracking-wide text-white" style={{ fontSize: compact ? 26 : 38, WebkitTextStroke: '2px #0b1424', paintOrder: 'stroke fill', textShadow: '0 0 14px #f59e0b' }} initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 1.0 * r, type: 'spring', stiffness: 220, damping: 16 }}>SO NEARLY!</motion.div>
            <motion.div className="text-xs font-extrabold leading-tight text-amber-300 sm:text-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.4 * r }}>It fell {a.gap.toFixed(1)} m in front of {first}</motion.div>
            <motion.div className="text-[10.5px] font-semibold leading-snug text-slate-200 sm:text-xs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.2 * r }}>{info.batsman.name} lofted it {a.distance} m and it hung for {a.hang} s before dropping just short: {a.runs} {a.runs === 1 ? 'run' : 'runs'}.</motion.div>
          </div>
        </div>
      </Bottom>
    </div>
  )
}

// ---- A six ----------------------------------------------------------------------------------------------------------------------

export interface SixCastInfo extends SixInfo {
  replay: ReplayBase
  /** A poor length it was hit off, named on the screen. */
  poor?: string
}
export const SIX_CAST_SECONDS = 8.8

/** A six, the broadcast way: the ball played again in slow motion from the bat to the crowd, and under it the distance, where the ball met the bat and the timing. */
export function SixCast({ info }: { info: SixCastInfo }) {
  const r = info.rate
  const [box, w] = useWidth()
  useEffect(() => { const t = window.setTimeout(() => sfx.six(), 1900 * r); return () => window.clearTimeout(t) }, [r])
  const monster = info.distance >= 150
  const compact = w < 520
  return (
    <div ref={box} className="absolute inset-0 overflow-hidden rounded-2xl bg-[#05070d]" aria-label={`Six, ${info.distance} metres`}>
      <ReplayFrame base={info.replay} rate={1.5 * r} deep cam={replayCamFor('six', info.replay.event.seq)} />
      <Bottom>
        <div className="flex h-full items-stretch gap-2 px-2 py-1 sm:gap-3 sm:px-3">
          {info.contact && <motion.div className="shrink-0 self-center" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.4 * r }}><BatContact contact={info.contact} height={compact ? 84 : 118} delay={1.7} rate={r} /></motion.div>}
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
            <motion.div className="flex items-center gap-2" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 * r }}>
              <span className="inline-block shrink-0 rounded-full leading-[0]" style={{ boxShadow: `0 0 0 2px ${accentOf(info.team)}` }}><PlayerAvatar player={info.batsman} team={info.team} size={compact ? 28 : 36} /></span>
              <div className="min-w-0 leading-tight"><div className="truncate text-sm font-extrabold text-white">{info.batsman.name}</div><div className="truncate text-[11px] font-semibold text-slate-300">{info.longest ? 'His longest six yet' : monster ? 'Out of the ground' : 'Over the rope'}{info.poor ? ` · off a ${info.poor.toLowerCase()}` : ''}</div></div>
              <motion.div className="ml-auto shrink-0 font-display text-2xl leading-none tracking-wide text-white sm:text-3xl" style={{ WebkitTextStroke: '1.5px #701a75', paintOrder: 'stroke fill', textShadow: info.fire ? '0 0 20px #f97316' : '0 0 20px #e879f9' }} initial={{ scale: 2.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 1.3 * r, type: 'spring', stiffness: 260, damping: 15 }}>SIX!</motion.div>
            </motion.div>
            <motion.div className="font-display leading-none tracking-wide text-amber-300" style={{ fontSize: compact ? 30 : 40 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 * r }}>
              <Counter to={info.distance} delay={1.0 * r} dur={2.2 * r} /><span className="ml-1 text-[0.45em] text-amber-200">metres</span>
            </motion.div>
            {info.contact && <ContactMeters contact={info.contact} delay={1.8} rate={r} compact />}
          </div>
        </div>
      </Bottom>
    </div>
  )
}

// ---- A no ball: how far over the line --------------------------------------------------------------------------------------------

export interface NoBallCastInfo {
  replay: ReplayBase
  bowler: Player
  bowlTeam: Team
  /** How far over the popping crease the front foot landed, in centimetres. */
  cm: number
  rate: number
}
export const NO_BALL_CAST_SECONDS = 5.6

/** A no ball, the broadcast way: the front-foot camera in slow motion as the foot lands over the line, with the distance marked on the ground. */
export function NoBallCast({ info }: { info: NoBallCastInfo }) {
  const r = info.rate
  const [box, w] = useWidth()
  useEffect(() => { const t = window.setTimeout(() => sfx.noBall(), 1500 * r); return () => window.clearTimeout(t) }, [r])
  const compact = w < 520
  return (
    <div ref={box} className="absolute inset-0 overflow-hidden rounded-2xl bg-[#05070d]" aria-label="No ball">
      <ReplayFrame base={info.replay} rate={1.2 * r} share={0.66} cam={replayCamFor('noball', info.replay.event.seq)} tag="Front foot" />
      <Bottom from={0.66}>
        <div className="flex h-full items-center justify-center gap-3 px-3">
          <span className="inline-block shrink-0 rounded-full leading-[0]" style={{ boxShadow: `0 0 0 2px ${accentOf(info.bowlTeam)}` }}><PlayerAvatar player={info.bowler} team={info.bowlTeam} size={compact ? 34 : 44} /></span>
          <motion.div className="font-display leading-none tracking-wide text-white" style={{ fontSize: compact ? 34 : 48, WebkitTextStroke: '2px #7f1d1d', paintOrder: 'stroke fill', textShadow: '0 0 24px #ef4444aa' }} initial={{ scale: 2.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 1.2 * r, type: 'spring', stiffness: 260, damping: 15 }}>NO BALL!</motion.div>
          <motion.div className="min-w-0 text-xs font-semibold leading-snug text-slate-100 sm:text-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 * r }}>
            <b className="text-amber-300">{info.bowler.name.split(' ')[0]}</b> overstepped by <b className="text-rose-300">{info.cm} cm</b>.<br />+1 run and a free hit next.
          </motion.div>
        </div>
      </Bottom>
    </div>
  )
}

// ---- How the ball was bowled: swing, turn, a yorker, a beamer ---------------------------------------------------------------------

export interface DeliveryCastInfo {
  replay: ReplayBase
  screen: 'beamer' | 'yorker' | 'swing' | 'turn' | 'dragon'
  dv: DeliveryLook
  /** The speed of the ball, km/h. */
  kmh: number
  batsman: Player
  bowler: Player
  bowlTeam: Team
  /** The batsman is left-handed (which way is "in" turns round). */
  left: boolean
  rate: number
}
export const DELIVERY_CAST_SECONDS = 6.8

/** A compass for how far the ball moved: the straight line (dashed), the way it went and the angle between them in degrees. */
function Compass({ deg, max, w, color }: { deg: number; max: number; w: number; color: string }) {
  const R = 48, cx = 62, cy = 66
  const span = 70 // the dial runs this many degrees either side of straight on the screen
  const a = (Math.max(-max, Math.min(max, deg)) / max) * span
  const at = (d: number, r = R) => ({ x: cx + r * Math.sin((d * Math.PI) / 180), y: cy - r * Math.cos((d * Math.PI) / 180) })
  const n = at(a), e = at(0)
  const ticks = Array.from({ length: 11 }, (_, i) => -span + (i * span) / 5)
  return (
    <svg viewBox="0 0 124 84" width={w} className="shrink-0" aria-hidden>
      <path d={`M${at(-span).x} ${at(-span).y} A ${R} ${R} 0 0 1 ${at(span).x} ${at(span).y}`} fill="none" stroke="#334155" strokeWidth="5" strokeLinecap="round" />
      {ticks.map((t, i) => <line key={t} x1={at(t, R - (i % 5 === 0 ? 9 : 5)).x} y1={at(t, R - (i % 5 === 0 ? 9 : 5)).y} x2={at(t, R + 1).x} y2={at(t, R + 1).y} stroke="#94a3b8" strokeWidth={i % 5 === 0 ? 1.6 : 0.9} />)}
      <motion.path d={`M${cx} ${cy} L${e.x} ${e.y} A ${R} ${R} 0 0 ${a >= 0 ? 1 : 0} ${n.x} ${n.y} Z`} fill={color} opacity="0.35" initial={{ opacity: 0 }} animate={{ opacity: 0.35 }} transition={{ delay: 1.9 }} />
      <line x1={cx} y1={cy} x2={e.x} y2={e.y} stroke="#f8fafc" strokeWidth="1.4" strokeDasharray="3 2.5" />
      <motion.line x1={cx} y1={cy} x2={e.x} y2={e.y} stroke={color} strokeWidth="3" strokeLinecap="round" initial={{ x2: e.x, y2: e.y }} animate={{ x2: n.x, y2: n.y }} transition={{ delay: 1.6, duration: 0.9, type: 'spring', stiffness: 90, damping: 12 }} />
      {[-1, 1].map((sgn) => <text key={sgn} x={at(sgn * span, R - 17).x} y={at(sgn * span, R - 17).y + 3} textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#94a3b8">{max}°</text>)}
      <circle cx={cx} cy={cy} r="3.4" fill="#f8fafc" />
      <motion.text x={cx} y={cy + 15} textAnchor="middle" fontSize="15" fontWeight="800" fill="#fef3c7" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.2 }}>{Math.abs(deg).toFixed(1)}°</motion.text>
    </svg>
  )
}

/** The ball's flight from the side: where it left the hand, where it pitched (marked on the ground, in metres from the stumps) and how high it reached the batsman. */
function LengthSide({ dv, w }: { dv: DeliveryLook; w: number }) {
  const X = (z: number) => 6 + ((z + 20.5) / 21) * 104
  const Y = (h: number) => 70 - (h / 2.6) * 60
  const pz = dv.pitchZ
  const path = pz === null
    ? `M${X(-20.1)} ${Y(2.05)} Q ${X(-8)} ${Y(1.6)} ${X(-1.2)} ${Y(dv.height)}`
    : `M${X(-20.1)} ${Y(2.05)} Q ${X(pz - 2)} ${Y(0.5)} ${X(pz)} ${Y(0)} Q ${X(pz / 2 - 0.6)} ${Y(dv.height * 0.8)} ${X(-1.2)} ${Y(dv.height)}`
  return (
    <svg viewBox="0 0 120 84" width={w} className="shrink-0" aria-hidden>
      <line x1="2" y1="70" x2="118" y2="70" stroke="#4ade80" strokeWidth="1.2" opacity="0.8" />
      <line x1={X(-1.22)} y1="64" x2={X(-1.22)} y2="76" stroke="#f8fafc" strokeWidth="1" opacity="0.7" />
      {[-1.6, 0, 1.6].map((o) => <line key={o} x1={X(0) + o} y1={Y(0.71)} x2={X(0) + o} y2="70" stroke="#f1e2b0" strokeWidth="1.5" strokeLinecap="round" />)}
      {dv.height >= 1.7 && <line x1={X(-1.2) - 14} y1={Y(1.1)} x2={X(-1.2) + 14} y2={Y(1.1)} stroke="#fb7185" strokeWidth="1" strokeDasharray="3 2" />}
      <motion.path d={path} fill="none" stroke="#fde68a" strokeWidth="1.6" strokeDasharray="3 2.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 1.3, duration: 1.1 }} />
      {pz !== null && <motion.circle cx={X(pz)} cy={Y(0)} r="2.6" fill="#ef4444" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.9 }} />}
      <motion.circle cx={X(-1.2)} cy={Y(dv.height)} r="2.8" fill="#fbbf24" stroke="#fff7ed" strokeWidth="0.8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.3 }} />
      <motion.text x={pz === null ? X(-1.2) - 4 : X(pz)} y={pz === null ? Y(dv.height) - 7 : 82} textAnchor="middle" fontSize="7.5" fontWeight="800" fill="#fef3c7" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.4 }}>{pz === null ? `${dv.height.toFixed(1)} m high` : `${Math.abs(pz).toFixed(1)} m`}</motion.text>
    </svg>
  )
}

/** The dragon ball's dial: the speed in the middle with a dragon winding round it, its head leading the way. */
function DragonDial({ kmh, w }: { kmh: number; w: number }) {
  const turns = 2.6
  const pts = Array.from({ length: 90 }, (_, i) => { const u = i / 89, a = u * turns * Math.PI * 2, rad = 58 - u * 34; return { x: 70 + Math.cos(a) * rad, y: 70 + Math.sin(a) * rad } })
  const d = pts.map((q, i) => `${i ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join('')
  const head = pts[0]
  return (
    <svg width={w} height={w} viewBox="0 0 140 140" className="shrink-0" aria-label={`${kmh} kilometres an hour`}>
      <defs><linearGradient id="dragonBody" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#dc2626" /><stop offset="0.6" stopColor="#f97316" /><stop offset="1" stopColor="#fde047" /></linearGradient></defs>
      <g><animateTransform attributeName="transform" type="rotate" from="0 70 70" to="360 70 70" dur="4s" repeatCount="indefinite" />
        <path d={d} fill="none" stroke="#450a0a" strokeWidth="11" strokeLinecap="round" />
        <motion.path d={d} fill="none" stroke="url(#dragonBody)" strokeWidth="8" strokeLinecap="round" strokeDasharray="1 0" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.4 }} />
        <path d={d} fill="none" stroke="#fef9c3" strokeWidth="1.6" strokeDasharray="1 9" strokeLinecap="round" />
        <g transform={`translate(${head.x} ${head.y}) rotate(35)`}><path d="M-6 -7 L12 0 L-6 7 L-1 0Z" fill="#ea580c" stroke="#450a0a" strokeWidth="1.5" /><path d="M2 -6 L7 -13 L8 -5Z" fill="#fef3c7" /><circle cx="5" cy="-2" r="1.8" fill="#fde047" /><path d="M12 0 Q19 -5 24 0 Q19 5 12 0Z" fill="#fde047" /></g>
      </g>
      <text x="70" y="74" textAnchor="middle" className="font-display" fontSize="34" fill="#fff" stroke="#450a0a" strokeWidth="3" paintOrder="stroke">{kmh}</text>
      <text x="70" y="92" textAnchor="middle" fontSize="11" fontWeight="800" fill="#fed7aa" letterSpacing="2">KM/H</text>
    </svg>
  )
}

/** A delivery worth a second look: a big swing or turn (with a compass), a good yorker, or a beamer above the waist. */
export function DeliveryCast({ info }: { info: DeliveryCastInfo }) {
  const r = info.rate
  const [box, w] = useWidth()
  useEffect(() => { const t = window.setTimeout(() => (info.screen === 'beamer' ? sfx.noBall() : info.screen === 'dragon' ? sfx.crowdSix() : sfx.aww(0.5)), 2000 * r); return () => window.clearTimeout(t) }, [r, info.screen])
  const { dv, screen } = info
  const compact = w < 520
  // the angle is measured from the path the clip draws, so the number matches what is seen
  const drawn = useMemo(() => {
    const b = info.replay
    return drawnAngles(planBall(b.event, b.fielders.map((f) => ({ id: f.player.id, x: f.x, y: f.y, spot: f.spot })), endPoint(b.event, b.fielders), b.striker.hand === 'L', info.kmh, { bowler: info.bowler, overcast: b.look.weather === 'overcast' }))
  }, [info.replay, info.kmh, info.bowler])
  const deg = screen === 'turn' ? drawn.turn : drawn.swing
  // "in" is towards the batsman's body (to his leg side), "away" towards the slips
  const into = (deg > 0) !== info.left
  const title = screen === 'dragon' ? 'DRAGON BALL!' : screen === 'beamer' ? 'BEAMER!' : screen === 'yorker' ? 'YORKER!' : screen === 'swing' ? 'SWING!' : 'TURN!'
  const color = screen === 'dragon' ? '#fb923c' : screen === 'beamer' ? '#ef4444' : screen === 'yorker' ? '#38bdf8' : screen === 'swing' ? '#fb923c' : '#a3e635'
  const first = info.bowler.name.split(' ')[0]
  const line = screen === 'dragon' ? `${info.kmh} km/h: a molten dragon, faster than any human has ever bowled.` : screen === 'beamer' ? `${dv.height.toFixed(1)} m high as it reached the batsman: above the waist, so a no ball.`
    : screen === 'yorker' ? `Pitched ${Math.abs(dv.pitchZ ?? 0).toFixed(1)} m in front of the stumps, right at the toes · ${info.kmh} km/h`
    : screen === 'swing' ? `${Math.abs(deg).toFixed(1)}° of swing, ${into ? 'in towards the batsman' : 'away from the batsman'} · ${info.kmh} km/h`
    : `${Math.abs(deg).toFixed(1)}° of turn off the pitch, ${into ? 'in towards the batsman' : 'away from the batsman'} · ${info.kmh} km/h`
  const sub = screen === 'dragon' ? `${first} unleashed a dragon, and ${info.batsman.name} never saw it.` : screen === 'beamer' ? `+1 run and a free hit next. ${first} will want that one back.`
    : screen === 'yorker' ? `${info.batsman.name} just got his bat down in time.`
    : screen === 'swing' ? `${first} is getting it to talk through the air.` : `${first} is getting it to bite and turn.`
  const cam = screen === 'beamer' || screen === 'dragon' ? 'side' : screen === 'yorker' ? 'stump' : 'high'
  return (
    <div ref={box} className="absolute inset-0 overflow-hidden rounded-2xl bg-[#05070d]" aria-label={title}>
      <ReplayFrame base={info.replay} rate={1.3 * r} share={0.56} cam={cam} trace={screen === 'swing' || screen === 'turn'} tag={screen === 'dragon' ? 'Dragon ball' : screen === 'swing' ? 'Swing' : screen === 'turn' ? 'Turn' : LENGTH_WORDS[dv.length]} />
      <Bottom from={0.56}>
        <div className="flex h-full items-center gap-3 px-3">
          {screen === 'dragon' ? <DragonDial kmh={info.kmh} w={compact ? 112 : 150} /> : screen === 'swing' || screen === 'turn' ? <Compass deg={deg} max={screen === 'swing' ? 12 : 20} w={compact ? 112 : 150} color={color} /> : <LengthSide dv={dv} w={compact ? 118 : 156} />}
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
            <motion.div className="font-display leading-none tracking-wide text-white" style={{ fontSize: compact ? 28 : 40, WebkitTextStroke: '2px #0b1424', paintOrder: 'stroke fill', textShadow: `0 0 16px ${color}` }} initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 1.0 * r, type: 'spring', stiffness: 220, damping: 16 }}>{title}</motion.div>
            <motion.div className="text-xs font-extrabold leading-tight sm:text-sm" style={{ color }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.3 * r }}>{line}</motion.div>
            <motion.div className="text-[10.5px] font-semibold leading-snug text-slate-200 sm:text-xs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.1 * r }}>{sub}</motion.div>
          </div>
        </div>
      </Bottom>
    </div>
  )
}
