import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { sfx } from '../../audio/sfx'
import type { Role, TalkLine } from '../../season/challenge'
import type { Player, Team } from '../../types'
import { PlayerAvatar, accentOf } from '../ui'
import { TvFrame, useWidth } from './ReviewScreens'

export interface ChallengeInfo {
  by: 'bat' | 'bowl'
  kind: 'lbw' | 'edge'
  desperate: boolean
  /** Challenges the side has before this one, and how many it has an innings. */
  left: number
  total: number
  people: { role: Role; player: Player; team: Team }[]
  lines: TalkLine[]
  rate: number
}

const LINE_SECONDS = 2
const SIGN_SECONDS = 1.7
/** How long the whole screen runs: every line of the huddle, then the signal. */
export const challengeSeconds = (lines: TalkLine[]) => lines.length * LINE_SECONDS + SIGN_SECONDS + 0.4

const ROLE_LABEL: Record<Role, string> = { bowler: 'Bowler', captain: 'Captain', keeper: 'Keeper', striker: 'Batsman', partner: 'Batsman' }

/** The huddle before a challenge: the people involved talk it over, one after another, and then somebody makes the T signal. */
export function ChallengeScreen({ info }: { info: ChallengeInfo }) {
  const { people, lines, rate: r } = info
  const [box, w] = useWidth()
  const [i, setI] = useState(0)
  const [signal, setSignal] = useState(false)
  const bowlSide = info.by === 'bowl'
  const team = people[0]?.team
  useEffect(() => {
    const timers: number[] = []
    lines.forEach((_, k) => { timers.push(window.setTimeout(() => setI(k), k * LINE_SECONDS * 1000 * r)) })
    timers.push(window.setTimeout(() => { setSignal(true); sfx.howzat() }, lines.length * LINE_SECONDS * 1000 * r))
    return () => timers.forEach(clearTimeout)
  }, [lines, r])
  const line = lines[Math.min(i, lines.length - 1)]
  const speaker = people.find((p) => p.role === line.who)
  const size = Math.max(46, Math.min(w * 0.17, 88))
  return (
    <div ref={box} className="absolute inset-0" aria-label="Challenge huddle">
      <TvFrame title={bowlSide ? 'Fielding side huddle' : 'Batsmen confer'}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 60%, #14532d, #052e16 75%)' }} />
        {/* the pitch under their feet */}
        <div className="absolute bottom-0 left-1/2 top-[34%] w-[16%] -translate-x-1/2 opacity-40" style={{ background: 'linear-gradient(#d7b87c, #bf9a5f)' }} />
        {/* the allowance */}
        <div className="absolute right-3 top-10 z-30 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-bold text-slate-200">
          Challenges
          <span className="flex gap-1">{Array.from({ length: Math.min(info.total, 6) }, (_, k) => <span key={k} className={`h-2.5 w-2.5 rounded-full ${k < Math.min(info.left, info.total) ? 'bg-amber-300' : 'bg-white/20'}`} />)}</span>
          <span className="text-amber-300">{info.left} of {info.total}</span>
        </div>
        {info.desperate && <div className="absolute left-3 top-10 z-30 rounded bg-red-600/90 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-white">Last chance</div>}

        {/* the people in a huddle */}
        <div className="absolute inset-x-0 top-[26%] flex items-end justify-center gap-2 px-3">
          {people.map((p, k) => {
            const active = p.role === line.who && !signal
            return (
              <motion.div key={`${p.role}${k}`} className="text-center" animate={{ scale: active ? 1.12 : 0.92, opacity: active ? 1 : 0.65, y: active ? -6 : 0 }} transition={{ type: 'spring', stiffness: 220, damping: 20 }}>
                <div className="mx-auto inline-block rounded-full leading-[0]" style={{ boxShadow: `0 0 0 3px ${accentOf(p.team)}${active ? '' : '88'}, ${active ? `0 0 22px ${accentOf(p.team)}aa` : '0 0 0 transparent'}` }}><PlayerAvatar player={p.player} team={p.team} size={size} /></div>
                <div className="mt-1 max-w-[110px] truncate rounded bg-black/70 px-1.5 text-[11px] font-semibold text-white" style={{ borderBottom: `2px solid ${accentOf(p.team)}` }}>{p.player.name}</div>
                <div className="text-[9px] font-extrabold uppercase tracking-wider text-slate-300">{ROLE_LABEL[p.role]}</div>
              </motion.div>
            )
          })}
        </div>

        {/* what is being said */}
        <AnimatePresence mode="wait">
          {!signal && (
            <motion.div key={i} className="absolute inset-x-3 bottom-[9%] z-20 rounded-2xl border-2 bg-black/80 px-3 py-2.5" style={{ borderColor: team ? accentOf(speaker?.team ?? team) : '#fbbf24' }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
              <div className="text-[11px] font-extrabold" style={{ color: speaker ? accentOf(speaker.team) : '#fbbf24' }}>{speaker?.player.name} <span className="font-bold uppercase tracking-wider text-slate-400">{speaker ? ROLE_LABEL[speaker.role] : ''}</span></div>
              <p className="text-[14px] leading-snug text-white sm:text-[15px]">{line.text}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* the signal: the captain (or the batsman) makes a T with his hands */}
        {signal && (
          <motion.div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 bg-black/55" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <motion.svg width={Math.max(90, w * 0.24)} viewBox="0 0 100 100" initial={{ scale: 0.3, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 12 }} aria-hidden>
              <motion.rect x="14" y="14" width="72" height="16" rx="8" fill="#fbbf24" stroke="#78350f" strokeWidth="2" initial={{ x: -40 }} animate={{ x: 0 }} transition={{ type: 'spring', stiffness: 180, damping: 14 }} />
              <motion.rect x="42" y="22" width="16" height="66" rx="8" fill="#fcd34d" stroke="#78350f" strokeWidth="2" initial={{ y: 40 }} animate={{ y: 0 }} transition={{ delay: 0.12, type: 'spring', stiffness: 180, damping: 14 }} />
              <circle cx="14" cy="22" r="8" fill="#fde68a" stroke="#78350f" strokeWidth="2" /><circle cx="86" cy="22" r="8" fill="#fde68a" stroke="#78350f" strokeWidth="2" />
            </motion.svg>
            <motion.div className="font-display text-5xl leading-none tracking-wide text-white" initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.25, type: 'spring', stiffness: 240, damping: 15 }} style={{ WebkitTextStroke: '2px #05070d', paintOrder: 'stroke fill', textShadow: '0 0 28px #fbbf24aa' }}>CHALLENGE!</motion.div>
            <div className="text-sm font-semibold text-slate-100">{bowlSide ? `${people.find((p) => p.role === 'captain')?.player.name ?? 'The captain'} takes it upstairs` : `${people.find((p) => p.role === 'striker')?.player.name ?? 'The batsman'} asks for a review`}</div>
          </motion.div>
        )}
      </TvFrame>
    </div>
  )
}
