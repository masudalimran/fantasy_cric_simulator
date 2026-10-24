import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { sfx } from '../../audio/sfx'
import type { Player, Team } from '../../types'
import { PlayerAvatar, accentOf } from '../ui'
import { TvFrame, useWidth } from './ReviewScreens'

export interface ChallengeResultInfo {
  /** Who asked: the batting side (an out turned to not out) or the fielding side (a not out turned to out). */
  by: 'bat' | 'bowl'
  /** The batsman the decision was about. */
  batsman: Player
  batTeam: Team
  /** The side that won the challenge, and the people from it who celebrate. */
  winners: { player: Player; team: Team }[]
  /** The challenges the winning side has left (it keeps the one it used). */
  left: number
  total: number
  rate: number
}

/** How long the screen runs, in seconds (before the speed factor). */
export const CHALLENGE_RESULT_SECONDS = 4.6

const PIECES = Array.from({ length: 26 }, (_, i) => ({ x: (i * 37) % 100, d: (i % 9) * 0.07, c: ['#fbbf24', '#34d399', '#38bdf8', '#f472b6', '#fff'][i % 5], s: 6 + (i % 4) * 2 }))

/**
 * A successful challenge: the decision on the field flips over to its opposite, the side that won the challenge celebrates, and it says the
 * challenge is kept. Shown after the review's own picture and verdict.
 */
export function ChallengeResultScreen({ info }: { info: ChallengeResultInfo }) {
  const r = info.rate
  const [box, w] = useWidth()
  const toOut = info.by === 'bowl' // the fielding side asked, so a not-out became an out
  const from = toOut ? 'NOT OUT' : 'OUT'
  const to = toOut ? 'OUT' : 'NOT OUT'
  const color = toOut ? '#f87171' : '#34d399'
  useEffect(() => {
    const ts = [window.setTimeout(() => sfx.applause(2.4), 900 * r), window.setTimeout(() => (toOut ? sfx.decisionOut() : sfx.fistBump()), 800 * r)]
    return () => ts.forEach(clearTimeout)
  }, [r, toOut])
  const size = Math.max(40, Math.min(w * 0.11, 64))
  return (
    <div ref={box} className="absolute inset-0" aria-label="Challenge successful">
      <TvFrame title="Decision review">
        <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 50% 45%, ${color}33, #060b14 75%)` }} />
        {/* the confetti */}
        {PIECES.map((p, i) => (
          <motion.span key={i} className="pointer-events-none absolute top-0 z-10 block rounded-sm" style={{ left: `${p.x}%`, width: p.s, height: p.s * 1.6, background: p.c }} initial={{ y: -20, opacity: 0, rotate: 0 }} animate={{ y: 340, opacity: [0, 1, 1, 0], rotate: 540 }} transition={{ delay: (0.9 + p.d) * r, duration: 2.2 * r, ease: 'easeIn' }} />
        ))}
        <div className="absolute inset-x-0 top-[9%] z-20 text-center">
          <motion.div className="inline-block rounded-full bg-amber-400 px-3 py-0.5 text-[11px] font-extrabold uppercase tracking-widest text-black" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2 * r, type: 'spring', stiffness: 260, damping: 14 }}>Challenge successful</motion.div>
        </div>

        {/* the decision flips over */}
        <div className="absolute inset-x-0 top-[24%] z-20 flex justify-center" style={{ perspective: 700 }}>
          <motion.div className="relative" style={{ transformStyle: 'preserve-3d', width: Math.max(180, Math.min(w * 0.55, 330)), height: Math.max(70, Math.min(w * 0.2, 118)) }} initial={{ rotateX: 0 }} animate={{ rotateX: 180 }} transition={{ delay: 0.9 * r, duration: 0.7 * r, ease: 'easeInOut' }}>
            <div className="absolute inset-0 grid place-items-center rounded-2xl border-4 bg-black/80 font-display leading-none tracking-wide" style={{ backfaceVisibility: 'hidden', borderColor: toOut ? '#34d399' : '#f87171', color: toOut ? '#34d399' : '#f87171', fontSize: Math.max(34, Math.min(w * 0.1, 66)) }}>{from}</div>
            <div className="absolute inset-0 grid place-items-center rounded-2xl border-4 bg-black/80 font-display leading-none tracking-wide" style={{ backfaceVisibility: 'hidden', transform: 'rotateX(180deg)', borderColor: color, color, boxShadow: `0 0 40px ${color}aa`, fontSize: Math.max(34, Math.min(w * 0.1, 66)) }}>{to}</div>
          </motion.div>
        </div>
        <motion.div className="absolute inset-x-0 top-[56%] z-20 text-center" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.7 * r }}>
          <div className="font-display text-2xl leading-none tracking-wide text-white sm:text-3xl" style={{ textShadow: '0 0 20px #000' }}>{toOut ? `${info.batsman.name} has to go` : `${info.batsman.name} survives`}</div>
          <div className="mt-1 text-sm font-semibold text-slate-200">The umpire's decision is overturned</div>
        </motion.div>

        {/* the winners celebrate */}
        <div className="absolute inset-x-0 bottom-[11%] z-20 flex items-end justify-center gap-3">
          {info.winners.map((p, i) => (
            <motion.div key={p.player.id} className="text-center" animate={{ y: [0, -14, 0, -9, 0] }} transition={{ delay: (1.1 + i * 0.12) * r, duration: 1.1 * r, repeat: 2 }}>
              <div className="inline-block rounded-full leading-[0]" style={{ boxShadow: `0 0 0 3px ${accentOf(p.team)}, 0 0 18px ${accentOf(p.team)}99` }}><PlayerAvatar player={p.player} team={p.team} size={size} /></div>
            </motion.div>
          ))}
        </div>
        <motion.div className="absolute inset-x-0 bottom-[3%] z-20 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.2 * r }}>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/75 px-3 py-0.5 text-[11px] font-bold text-amber-300">
            Challenge kept
            <span className="flex gap-1">{Array.from({ length: Math.min(info.total, 6) }, (_, k) => <span key={k} className={`h-2.5 w-2.5 rounded-full ${k < info.left ? 'bg-amber-300' : 'bg-white/20'}`} />)}</span>
            {info.left} of {info.total} left
          </span>
        </motion.div>
      </TvFrame>
    </div>
  )
}
