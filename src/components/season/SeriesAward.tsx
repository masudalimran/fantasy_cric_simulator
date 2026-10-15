import confetti from 'canvas-confetti'
import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { sfx } from '../../audio/sfx'
import type { Player, Team } from '../../types'
import { OriginTag, PlayerAvatar, accentOf } from '../ui'

/** The player of a finished tournament: a drumroll, a spotlight, his portrait and what he did. */
export function SeriesAward({ player, team, tournament, lines, onClose }: { player: Player; team: Team; tournament: string; lines: string[]; onClose: () => void }) {
  const accent = accentOf(team)
  useEffect(() => {
    sfx.award()
    const t = window.setTimeout(() => confetti({ particleCount: 150, spread: 100, startVelocity: 36, origin: { x: 0.5, y: 0.4 }, colors: ['#fde68a', '#f59e0b', accent, '#ffffff'], disableForReducedMotion: true, zIndex: 95 }), 1550)
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape' || e.key === 'Enter') onClose() }
    window.addEventListener('keydown', k)
    return () => { window.clearTimeout(t); window.removeEventListener('keydown', k) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <motion.div className="fixed inset-0 z-[80] flex flex-col items-center justify-center overflow-hidden bg-ink px-6 text-center" style={{ paddingTop: 'var(--sat)', paddingBottom: 'var(--sab)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-label="Man of the series" onClick={onClose}>
      <motion.div className="pointer-events-none absolute left-1/2 top-[38%] h-[200vmax] w-[200vmax] -translate-x-1/2 -translate-y-1/2 opacity-20" style={{ background: `repeating-conic-gradient(from 0deg, ${accent}00 0deg 12deg, ${accent}cc 12deg 24deg)` }} animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: 'linear' }} />
      <motion.div className="pointer-events-none absolute left-1/2 top-[38%] h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: 'radial-gradient(circle, #fde68acc, transparent 70%)' }} initial={{ opacity: 0, scale: 0.3 }} animate={{ opacity: [0, 0, 1], scale: [0.3, 0.3, 1.2] }} transition={{ duration: 1.6, times: [0, 0.9, 1] }} />
      <motion.div className="relative rounded-full bg-gradient-to-b from-amber-300 to-amber-500 px-6 py-1.5 font-display text-2xl tracking-[0.25em] text-black shadow-xl" initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>MAN OF THE SERIES</motion.div>
      <div className="relative mt-2 text-sm text-slate-300">{tournament}</div>
      <motion.div className="relative mt-6 rounded-full" style={{ boxShadow: `0 0 0 6px ${accent}, 0 0 60px #fbbf24aa` }} initial={{ scale: 0, rotate: -20, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ delay: 1.5, type: 'spring', stiffness: 170, damping: 12 }}>
        <PlayerAvatar player={player} team={team} size={150} />
      </motion.div>
      <motion.h2 className="relative mt-4 font-display text-5xl leading-none tracking-wide text-white" style={{ textShadow: `0 0 30px ${accent}` }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.8 }}>{player.name}</motion.h2>
      <motion.div className="relative mt-1 text-base text-slate-200" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}>{team.name}</motion.div>
      <motion.div className="relative mt-1 text-xs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}><OriginTag playerId={player.id} /></motion.div>
      <motion.div className="relative mt-3 space-y-0.5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.2 }}>
        {lines.map((l, i) => <div key={i} className={i === 0 ? 'text-lg font-extrabold text-amber-300' : 'text-sm text-slate-300'}>{l}</div>)}
      </motion.div>
      <motion.button className="relative mt-8 rounded-full bg-amber-400 px-10 py-3 text-base font-extrabold text-black active:bg-amber-300" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.6 }} onClick={onClose}>Continue</motion.button>
    </motion.div>
  )
}
