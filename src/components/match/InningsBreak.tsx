import { motion } from 'framer-motion'
import { useEffect } from 'react'
import type { Match } from '../../engine/match'
import { PlayerAvatar, TeamCrest, accentOf } from '../ui'
import { oversText, runRate, strikeRate } from './format'

/**
 * The innings break summary: the side that has just batted, its top scorers and bowlers' best figures, and the target.
 * It does not start the next innings. Close it to look over the scorecard, then press Next innings.
 */
export function InningsBreak({ match, onClose }: { match: Match; onClose: () => void }) {
  const waiting = true
  const inn = match.innings[0]
  const bat = match.sides[inn.battingSide]
  const bowl = match.sides[1 - inn.battingSide]
  const chase = match.current
  const accent = accentOf(bat.team)
  const topBat = [...inn.batters].sort((a, b) => b.runs - a.runs || a.balls - b.balls).slice(0, 3)
  const topBowl = [...inn.bowlers.values()].sort((a, b) => b.wickets - a.wickets || a.runs - b.runs).slice(0, 3)
  const target = inn.runs + 1
  const quota = match.maxOvers * 6
  const rrr = (target / quota) * 6

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); onClose() } }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  return (
    <motion.div
      {...(waiting ? { 'data-scroll-lock': true } : {})}
      className={`fixed inset-0 z-[55] grid place-items-center p-4 ${waiting ? 'bg-black/60 backdrop-blur-sm' : 'pointer-events-none items-start pt-24'}`}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <motion.div
        role="dialog" aria-label="Innings break" data-innings-break
        initial={{ y: -30, scale: 0.95, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: -20, opacity: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="pointer-events-auto relative w-full max-w-lg overflow-hidden rounded-3xl border-2 bg-ink shadow-2xl"
        style={{ borderColor: accent, boxShadow: `0 0 60px ${accent}55` }}
      >
        <div className="px-6 pb-4 pt-5" style={{ background: `linear-gradient(120deg, ${bat.team.colors.primary}cc, #10131c 70%)` }}>
          <div className="text-[11px] font-extrabold uppercase tracking-widest text-amber-300">Innings break</div>
          <div className="mt-1 flex items-center gap-4">
            <TeamCrest team={bat.team} size={56} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-display text-2xl leading-none tracking-wide text-white">{bat.team.name}</div>
              <div className="text-xs text-slate-300">{oversText(inn.legalBalls)} overs · run rate {runRate(inn)} · extras {inn.extras.wides + inn.extras.noballs + inn.extras.byes + inn.extras.legByes}</div>
            </div>
            <div className="font-display text-4xl leading-none text-white md:text-6xl">{inn.runs}<span className="text-3xl text-slate-400">/{inn.wickets}</span></div>
          </div>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <section>
            <h3 className="mb-1.5 text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Top batsmen</h3>
            {topBat.map((b) => (
              <div key={b.id} className="flex items-center gap-2 border-t border-line/60 py-1.5 text-sm first:border-0">
                <PlayerAvatar player={match.player(b.id)} team={bat.team} size={26} />
                <span className="min-w-0 flex-1 truncate font-semibold text-white">{match.player(b.id).name}</span>
                <span className="tabular-nums text-white">{b.runs}{b.dismissal ? '' : '*'} <span className="text-xs text-slate-400">({b.balls}) SR {strikeRate(b.runs, b.balls)}</span></span>
              </div>
            ))}
          </section>
          <section>
            <h3 className="mb-1.5 text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Best bowling</h3>
            {topBowl.map((l) => (
              <div key={l.id} className="flex items-center gap-2 border-t border-line/60 py-1.5 text-sm first:border-0">
                <PlayerAvatar player={match.player(l.id)} team={bowl.team} size={26} />
                <span className="min-w-0 flex-1 truncate font-semibold text-white">{match.player(l.id).name}</span>
                <span className="tabular-nums text-white">{l.wickets}/{l.runs} <span className="text-xs text-slate-400">({oversText(l.legalBalls)})</span></span>
              </div>
            ))}
          </section>
        </div>

        <div className="mx-5 mb-5 rounded-2xl border border-amber-400/50 bg-amber-400/10 px-4 py-3 text-center">
          <div className="text-[11px] font-extrabold uppercase tracking-widest text-amber-300">Target</div>
          <div className="font-display text-4xl leading-none text-white">{target}</div>
          <div className="mt-1 text-sm text-slate-200">{match.sides[chase.battingSide].team.name} need {target} from {match.maxOvers} overs ({rrr.toFixed(2)} an over)</div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line bg-black/20 px-5 py-3">
          <span className="text-xs text-slate-400">Look the innings over, then press <b className="text-slate-200">Next innings</b> when you are ready.</span>
          <button onClick={onClose} className="rounded-full bg-white/10 px-6 py-2 font-display text-xl tracking-wide text-white transition hover:bg-white/20">Close</button>
        </div>
      </motion.div>
    </motion.div>
  )
}
