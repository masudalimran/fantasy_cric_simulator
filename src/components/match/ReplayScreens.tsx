import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { sfx } from '../../audio/sfx'
import type { Contact } from '../../engine/contact'
import type { WicketCard } from '../../season/wicketCards'
import type { Player, Team } from '../../types'
import { PlayerAvatar, accentOf } from '../ui'
import { BatContact, ContactMeters } from './ContactPanel'
import { replayCamFor } from './broadcast'
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
      <ReplayFrame base={info.replay} rate={1.5 * r} cam={replayCamFor('four', info.replay.event.seq)} />
      <Bottom>
        <div className="flex h-full items-stretch gap-2 px-2 py-1 sm:gap-3 sm:px-3">
          <motion.div className="shrink-0 self-center" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.4 * r }}><BatContact contact={c} height={compact ? 84 : 118} delay={1.7} rate={r} /></motion.div>
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
            <motion.div className="flex items-center gap-2" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 * r }}>
              <span className="inline-block shrink-0 rounded-full leading-[0]" style={{ boxShadow: `0 0 0 2px ${accentOf(info.batTeam)}` }}><PlayerAvatar player={info.batsman} team={info.batTeam} size={compact ? 28 : 36} /></span>
              <div className="min-w-0 leading-tight"><div className="truncate text-sm font-extrabold text-white">{info.batsman.name}</div><div className="truncate text-[11px] font-semibold text-slate-300">{info.shot}</div></div>
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
      <ReplayFrame base={info.replay} rate={1.2 * r} share={0.7} cam={replayCamFor('extra', info.replay.event.seq)} />
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
      <ReplayFrame base={info.replay} rate={1.5 * r} share={0.56} cam={stumps ? 'stump' : 'side'} tag="Close call" />
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
