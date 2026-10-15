import confetti from 'canvas-confetti'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { sfx } from '../../audio/sfx'
import { quoteFor } from '../../data/quotes'
import type { AwardCandidate, MatchAwards } from '../../engine/awards'
import type { Match } from '../../engine/match'
import { strikeRate } from './format'
import { PlayerAvatar, accentOf } from '../ui'
import { TeamLogo } from '../season/Details'

const GOLD = ['#fbbf24', '#f59e0b', '#fde68a', '#ffffff']

function Lines({ c }: { c: AwardCandidate }) {
  const chips: { label: string; value: string }[] = []
  if (c.bat && c.bat.balls > 0) chips.push({ label: 'Batting', value: `${c.bat.runs}${c.bat.out ? '' : '*'} off ${c.bat.balls} · SR ${strikeRate(c.bat.runs, c.bat.balls)} · ${c.bat.fours}x4 ${c.bat.sixes}x6` })
  if (c.bowl && c.bowl.balls > 0) chips.push({ label: 'Bowling', value: `${c.bowl.wickets}/${c.bowl.runs} in ${Math.floor(c.bowl.balls / 6)}.${c.bowl.balls % 6} overs${c.bowl.maidens ? ` · ${c.bowl.maidens} maiden${c.bowl.maidens > 1 ? 's' : ''}` : ''}` })
  const f = c.field
  if (f.catches || f.stumpings || f.runOuts) chips.push({ label: 'Fielding', value: [f.catches && `${f.catches} catch${f.catches > 1 ? 'es' : ''}`, f.stumpings && `${f.stumpings} stumping${f.stumpings > 1 ? 's' : ''}`, f.runOuts && `${f.runOuts} run-out${f.runOuts > 1 ? 's' : ''}`].filter(Boolean).join(', ') })
  return (
    <div className="space-y-1.5">
      {chips.map((x) => (
        <div key={x.label} className="flex items-baseline justify-center gap-2 text-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">{x.label}</span>
          <span className="font-semibold text-white">{x.value}</span>
        </div>
      ))}
    </div>
  )
}

/** The Man of the Match ceremony: a drumroll, a spotlight, then the reveal with the performance behind it. */
export function MotmOverlay({ match, awards, onClose, onScorecard }: { match: Match; awards: MatchAwards; onClose: () => void; onScorecard: () => void }) {
  const [revealed, setRevealed] = useState(false)
  const winner = awards.motm
  const entry = winner && [...match.sides].flatMap((s) => s.xi.map((p) => ({ p, team: s.team }))).find((x) => x.p.id === winner.id)

  useEffect(() => {
    sfx.award()
    const t = window.setTimeout(() => {
      setRevealed(true)
      const colors = [...(entry ? [entry.team.colors.primary, entry.team.colors.secondary] : []), ...GOLD]
      confetti({ particleCount: 140, spread: 80, origin: { x: 0.2, y: 0.65 }, angle: 60, colors, disableForReducedMotion: true, zIndex: 90 })
      confetti({ particleCount: 140, spread: 80, origin: { x: 0.8, y: 0.65 }, angle: 120, colors, disableForReducedMotion: true, zIndex: 90 })
      window.setTimeout(() => confetti({ particleCount: 90, spread: 360, startVelocity: 25, origin: { y: 0.4 }, colors, disableForReducedMotion: true, zIndex: 90 }), 500)
    }, 1550)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' || e.key === 'Enter') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { window.clearTimeout(t); window.removeEventListener('keydown', onKey) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!winner || !entry) return null
  const accent = accentOf(entry.team)
  const top = Math.max(...awards.contenders.map((c) => c.points), 1)

  return (
    <motion.div
      data-scroll-lock className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto overscroll-contain bg-black/85 p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
    >
      {/* spotlight */}
      <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(600px 500px at 50% 38%, ${accent}55, transparent 70%)` }} />
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.7, y: 40, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 16 }}
        className="relative w-full max-w-2xl rounded-3xl border-2 border-amber-400/70 bg-panel p-6 text-center shadow-[0_0_80px_#f59e0b44]"
      >
        <div className="mx-auto -mt-11 mb-3 w-fit rounded-full bg-gradient-to-b from-amber-300 to-amber-500 px-8 py-2 shadow-lg">
          <div className="font-display text-3xl leading-none tracking-widest text-black">MAN OF THE MATCH</div>
        </div>

        <div className="relative mx-auto my-4 grid h-44 w-44 place-items-center">
          <motion.div className="absolute inset-0 rounded-full" style={{ background: `conic-gradient(from 0deg, ${accent}00, ${accent}cc, #fbbf2400, #fbbf24cc, ${accent}00)`, WebkitMaskImage: 'radial-gradient(circle, transparent 58%, #000 60%)', maskImage: 'radial-gradient(circle, transparent 58%, #000 60%)' }} animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 6, ease: 'linear' }} />
          <AnimatePresence mode="wait">
            {revealed ? (
              <motion.div key="face" initial={{ scale: 0.2, rotate: -20, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 12 }} className="relative rounded-full" style={{ boxShadow: '0 0 0 5px #fbbf24, 0 0 40px #fbbf24aa' }}>
                <PlayerAvatar player={entry.p} team={entry.team} size={150} />
              </motion.div>
            ) : (
              <motion.div key="q" exit={{ scale: 0.3, opacity: 0, transition: { duration: 0.18, repeat: 0 } }} className="grid h-36 w-36 place-items-center rounded-full bg-white/10 font-display text-7xl text-amber-300" animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 0.5 }}>?</motion.div>
            )}
          </AnimatePresence>
        </div>

        {revealed ? (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <h2 className="font-display text-3xl leading-none tracking-wide text-white md:text-6xl">{entry.p.name}</h2>
            <div className="mt-2 flex items-center justify-center gap-2 text-base text-slate-200">
              <TeamLogo team={entry.team} size={30} />
              <span className="font-semibold">{entry.team.name}</span>
              <span className="text-slate-400">· {entry.team.series}</span>
            </div>
            <div className="mt-4 rounded-2xl bg-black/30 p-3"><Lines c={winner} /></div>
            {/* the post-match interview */}
            <motion.div className="relative mx-auto mt-4 max-w-md rounded-2xl rounded-tl-sm bg-white/10 px-4 py-3 text-left ring-1 ring-white/15" initial={{ opacity: 0, scale: 0.9, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: 0.9, type: 'spring', stiffness: 200, damping: 16 }}>
              <div className="mb-0.5 text-[11px] font-bold uppercase tracking-widest text-sky-300">Post-match interview</div>
              <p className="text-sm italic leading-snug text-slate-100">“{quoteFor(winner, match.seed)}”</p>
              <div className="mt-1 text-right text-[11px] font-semibold text-slate-400">{entry.p.name}</div>
            </motion.div>
            <div className="mt-2 text-xs text-slate-400">Impact score <b className="text-amber-300">{Math.round(winner.points)}</b>{match.result?.winnerSide === winner.side ? ' (winning side bonus included)' : ''}</div>

            <div className="mt-5 text-left">
              <div className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-400">Also in contention</div>
              <div className="space-y-1.5">
                {awards.contenders.slice(1, 5).map((c) => {
                  const e = [...match.sides].flatMap((s) => s.xi.map((p) => ({ p, team: s.team }))).find((x) => x.p.id === c.id)
                  if (!e) return null
                  return (
                    <div key={c.id} className="flex items-center gap-2.5 rounded-lg bg-white/5 px-2 py-1.5">
                      <PlayerAvatar player={e.p} team={e.team} size={28} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-white">{e.p.name} <span className="font-normal text-slate-400">· {e.team.name}</span></div>
                        <div className="truncate text-xs text-slate-300">{c.line}</div>
                      </div>
                      <div className="w-24"><div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-amber-400/80" style={{ width: `${(c.points / top) * 100}%` }} /></div></div>
                      <div className="w-8 text-right text-xs tabular-nums text-slate-300">{Math.round(c.points)}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <button onClick={onClose} className="rounded-xl bg-amber-400 px-6 py-2.5 text-sm font-extrabold text-black hover:bg-amber-300">Continue</button>
              <button onClick={() => { onClose(); onScorecard() }} className="rounded-xl border border-line bg-panel-2 px-5 py-2.5 text-sm font-bold text-white hover:border-indigo-400">Match summary</button>
            </div>
          </motion.div>
        ) : (
          <div className="py-4 font-display text-3xl tracking-wide text-slate-200">And the Man of the Match is…</div>
        )}
      </motion.div>
    </motion.div>
  )
}
