import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { sfx } from '../../audio/sfx'
import type { Contact } from '../../engine/contact'
import type { WicketCard } from '../../season/wicketCards'
import type { Player, Team } from '../../types'
import { PlayerAvatar, accentOf } from '../ui'
import { BatContact, ContactMeters } from './ContactPanel'
import { replayCamFor } from './broadcast'
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
  rate: number
}
export const EXTRA_CAST_SECONDS = 4.4

/** An extra, the broadcast way: a short replay of the ball and a banner saying what it was and how many it cost. */
export function ExtraCast({ info }: { info: ExtraCastInfo }) {
  const r = info.rate
  const [box, w] = useWidth()
  return (
    <div ref={box} className="absolute inset-0 overflow-hidden rounded-2xl bg-[#05070d]" aria-label={info.title}>
      <ReplayFrame base={info.replay} rate={1.2 * r} share={0.7} cam={replayCamFor('extra', info.replay.event.seq)} />
      <Bottom from={0.7}>
        <div className="flex h-full items-center justify-center gap-3 px-3">
          <motion.div className="font-display leading-none tracking-wide text-white" style={{ fontSize: Math.max(26, Math.min(w * 0.085, 52)), WebkitTextStroke: '2px #0b1424', paintOrder: 'stroke fill', textShadow: `0 0 22px ${info.color}aa`, color: info.color }} initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.9 * r, type: 'spring', stiffness: 260, damping: 14 }}>{info.title}</motion.div>
          <motion.div className="min-w-0 text-xs font-semibold leading-tight text-slate-100 sm:text-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 * r }}>{info.sub}</motion.div>
        </div>
      </Bottom>
    </div>
  )
}
