import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { sfx } from '../../audio/sfx'
import { catchVerdict, type CatchCause, type Contact } from '../../engine/contact'
import type { StadiumLook } from '../../engine/stadium'
import type { PitchKind } from '../../engine/pitchInfo'
import type { BallEvent } from '../../engine/types'
import type { Player, Team } from '../../types'
import { PlayerAvatar, accentOf } from '../ui'
import { BroadcastView } from './BroadcastView'
import { BatContact, ContactMeters } from './ContactPanel'
import { useWidth } from './ReviewScreens'
import type { Placed } from './Stage'

export interface CatchInfo {
  event: BallEvent
  kind: 'caught' | 'caught and bowled'
  batsman: Player
  nonStriker: Player | null
  bowler: Player
  /** Who held the catch. */
  fielder: Player
  batTeam: Team
  bowlTeam: Team
  fielders: Placed[]
  pitch: PitchKind
  look: StadiumLook
  /** How it came about, and the contact that goes with it: an edge, a skier off the top edge, a toe end, or a mistimed shot. */
  cause: CatchCause
  contact: Contact
  /** The fielder's reaction time in milliseconds, for a catch in the ring. */
  reaction?: number
  /** The wicket as a score line, "34 (21)". */
  score: string
  rate: number
}

const CAUSE_TITLE: Record<CatchCause, string> = { edge: 'EDGED!', skier: 'TOP EDGE!', toe: 'OFF THE TOE!', mistimed: 'MISTIMED!' }
export const CATCH_SECONDS = 9.4

/**
 * A catch, the way the broadcast shows it: the ball played again from the TV camera, and under it where the ball met the bat (the hot spot), how fast
 * the bat was and how well the shot was timed, which together say why he got out: an edge, a top edge, a toe end, or a shot under-timed with a slow bat.
 */
export function CatchScreen({ info }: { info: CatchInfo }) {
  const r = info.rate
  const [box, w] = useWidth()
  useEffect(() => {
    const t = window.setTimeout(() => sfx.wicket(), 2600 * r)
    return () => window.clearTimeout(t)
  }, [r])
  const c = info.contact
  const compact = w < 520
  return (
    <div ref={box} className="absolute inset-0 overflow-hidden rounded-2xl bg-[#05070d]" aria-label="Caught">
      {/* the ball again, from the TV camera, a little slower */}
      <div className="absolute inset-x-0 top-0 h-[52%] overflow-hidden">
        <BroadcastView event={info.event} striker={info.batsman} nonStriker={info.nonStriker} bowler={info.bowler} battingTeam={info.batTeam} bowlingTeam={info.bowlTeam} fielders={info.fielders} pitch={info.pitch} look={info.look} rate={1.25 * r} />
        <div className="pointer-events-none absolute left-2 top-2 z-[7000] flex items-center gap-1.5 rounded bg-sky-500 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-widest text-white"><span className="h-2 w-2 animate-pulse rounded-full bg-red-300" />Replay</div>
        <div className="pointer-events-none absolute right-2 top-2 z-[7000] rounded-full bg-black/60 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-300">Tap to skip</div>
      </div>

      {/* how it happened */}
      <div className="absolute inset-x-0 bottom-0 top-[52%] border-t-2 border-sky-400/50" style={{ background: 'linear-gradient(180deg, #0b1424, #070b14)' }}>
        <div className="flex h-full items-stretch gap-2 px-2 py-1 sm:gap-3 sm:px-3">
          <motion.div className="relative shrink-0 self-center" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.6 * r }}>
            <BatContact contact={c} height={compact ? 84 : 118} delay={2.0} rate={r} />
          </motion.div>
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
            <motion.div className="flex items-center gap-2" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.0 * r }}>
              <span className="inline-block shrink-0 rounded-full leading-[0]" style={{ boxShadow: `0 0 0 2px ${accentOf(info.batTeam)}` }}><PlayerAvatar player={info.batsman} team={info.batTeam} size={compact ? 28 : 36} /></span>
              <div className="min-w-0 leading-tight">
                <div className="truncate text-sm font-extrabold text-white">{info.batsman.name} <span className="font-semibold text-slate-400">{info.score}</span></div>
                <div className="truncate text-[11px] font-semibold text-slate-300">{info.kind === 'caught and bowled' ? `c & b ${info.bowler.name}` : `c ${info.fielder.name} b ${info.bowler.name}`}</div>
              </div>
              <motion.div className="ml-auto shrink-0 rounded bg-red-600 px-2 py-0.5 font-display text-base leading-none tracking-wide text-white sm:text-xl" initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 2.6 * r, type: 'spring', stiffness: 260, damping: 14 }}>{CAUSE_TITLE[info.cause]}</motion.div>
            </motion.div>
            <ContactMeters contact={c} delay={2.1} rate={r} compact />
            <motion.p className="text-[10px] font-semibold leading-tight text-amber-200 sm:text-xs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.6 * r }}>
              {catchVerdict(info.cause, c, info.kind === 'caught and bowled' ? 'the bowler' : info.fielder.name.split(' ')[0])}
              {info.reaction ? ` (Reaction ${info.reaction} ms)` : ''}
            </motion.p>
          </div>
        </div>
      </div>
    </div>
  )
}
