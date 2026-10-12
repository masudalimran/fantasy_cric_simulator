import { motion } from 'framer-motion'
import type { Match } from '../../engine/match'
import { TeamCrest, accentOf } from '../ui'

/**
 * Shown between the innings. The screen stays on the innings that just finished (scoreboard, scorecard, commentary,
 * charts) so you can look it over; nothing starts until you press Next innings (here, or the big button where Next
 * ball usually is).
 */
export function InningsBar({ match, onContinue, lift = 96 }: { match: Match; onContinue: () => void; lift?: number }) {
  const first = match.innings[0]
  const chase = match.current
  const bat = match.battingSide(first)
  const target = first.runs + 1
  const quota = match.maxOvers * 6
  return (
    <motion.div
      role="status" data-innings-bar
      initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
      className="fixed inset-x-3 z-[55] mx-auto flex max-w-md items-center gap-3 rounded-2xl border-2 bg-ink/95 p-3 shadow-2xl backdrop-blur md:inset-x-auto md:bottom-6 md:left-6 md:mx-0"
      style={{ bottom: `calc(var(--sab) + ${lift}px)`, borderColor: accentOf(bat.team), boxShadow: `0 0 40px ${accentOf(bat.team)}44` }}
    >
      <TeamCrest team={bat.team} size={40} />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-extrabold uppercase tracking-widest text-amber-300">Innings break</div>
        <div className="truncate font-display text-xl leading-tight tracking-wide text-white">{bat.team.name} {first.runs}/{first.wickets}</div>
        <div className="text-xs text-slate-300">{match.sides[chase.battingSide].team.name} need <b className="text-white">{target}</b> from {match.maxOvers} overs ({((target / quota) * 6).toFixed(2)} an over). Look the innings over, then continue.</div>
      </div>
      <button onClick={onContinue} className="cta-pulse shrink-0 rounded-full bg-emerald-500 px-4 py-2.5 font-display text-lg leading-none tracking-wide text-black active:bg-emerald-400">Next innings</button>
    </motion.div>
  )
}
