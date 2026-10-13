import confetti from 'canvas-confetti'
import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { sfx } from '../../audio/sfx'
import type { Match } from '../../engine/match'
import { accentOf } from '../ui'
import { TeamLogo } from '../season/Details'
import { MoodPortrait } from './Portrait'

function Trophy({ size = 120 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true" style={{ filter: 'drop-shadow(0 6px 14px rgba(251,191,36,.55))' }}>
      <defs><linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fde68a" /><stop offset="0.5" stopColor="#f59e0b" /><stop offset="1" stopColor="#b45309" /></linearGradient></defs>
      <path d="M32 14h56v28c0 18-12 30-28 30S32 60 32 42z" fill="url(#gold)" stroke="#92400e" strokeWidth="2.5" />
      <path d="M32 22H16c0 18 8 28 20 30M88 22h16c0 18-8 28-20 30" fill="none" stroke="url(#gold)" strokeWidth="6" strokeLinecap="round" />
      <rect x="54" y="72" width="12" height="16" fill="url(#gold)" />
      <rect x="38" y="88" width="44" height="12" rx="3" fill="url(#gold)" stroke="#92400e" strokeWidth="2" />
      <path d="M46 20c-1 14 2 26 8 34" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
}

/**
 * The end-of-match party: the winners' crest, the result, and the whole winning XI jumping for joy.
 * It replaces the field, since there's nothing left to watch there.
 */
export function WinCelebration({ match, final, onContinue, mySide = null }: { match: Match; final?: string; onContinue: () => void; mySide?: 0 | 1 | null }) {
  const r = match.result
  const winnerSide = r?.winnerSide ?? null
  const side = winnerSide !== null ? match.sides[winnerSide] : null
  const team = side?.team ?? null
  const colors = team ? [team.colors.primary, team.colors.secondary, '#fbbf24', '#ffffff'] : ['#fbbf24', '#ffffff', '#94a3b8']
  // In career mode, if your team lost, this is a defeat screen: your team looking glum, no confetti.
  const lost = mySide !== null && winnerSide !== null && winnerSide !== mySide
  const mine = mySide !== null ? match.sides[mySide] : null
  const accent = team ? accentOf(team) : '#fbbf24'

  useEffect(() => {
    if (lost) { sfx.sadTrombone(); const k = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); onContinue() } }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }
    sfx.win()
    const again = [window.setTimeout(() => sfx.cheer(1), 2200), window.setTimeout(() => sfx.cheer(0.8), 4600)]
    let stop = false
    const end = Date.now() + 8000
    const fire = () => {
      if (stop || Date.now() > end) return
      confetti({ particleCount: 5, angle: 60, spread: 62, origin: { x: 0, y: 0.75 }, colors, disableForReducedMotion: true, zIndex: 95 })
      confetti({ particleCount: 5, angle: 120, spread: 62, origin: { x: 1, y: 0.75 }, colors, disableForReducedMotion: true, zIndex: 95 })
      setTimeout(fire, 90)
    }
    fire()
    window.setTimeout(() => confetti({ particleCount: 160, spread: 360, startVelocity: 34, origin: { x: 0.5, y: 0.35 }, colors, disableForReducedMotion: true, zIndex: 95 }), 350)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); onContinue() } }
    window.addEventListener('keydown', onKey)
    return () => { stop = true; again.forEach(clearTimeout); window.removeEventListener('keydown', onKey) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (lost && mine) {
    return (
      <motion.div data-defeat data-scroll-lock className="fixed inset-0 z-[75] overflow-y-auto overscroll-contain" style={{ background: 'linear-gradient(170deg,#1a1118,#07080d 70%)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <svg className="pointer-events-none fixed inset-0 h-full w-full opacity-30" preserveAspectRatio="none" viewBox="0 0 100 100">
          {Array.from({ length: 50 }, (_, i) => <motion.line key={i} x1={(i * 23) % 100} y1={-10} x2={((i * 23) % 100) - 3} y2={-4} stroke="#94a3b8" strokeWidth="0.2" animate={{ y: [0, 120] }} transition={{ duration: 0.9 + (i % 5) * 0.12, repeat: Infinity, ease: 'linear', delay: (i % 9) * 0.1 }} />)}
        </svg>
        <div className="relative mx-auto flex min-h-full max-w-4xl flex-col items-center justify-center px-4 py-8 text-center">
          <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="rounded-full bg-slate-600 px-8 py-1.5 font-display text-3xl tracking-[0.3em] text-white shadow-xl">DEFEAT</motion.div>
          <motion.div className="mt-5" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 0.9 }} transition={{ type: 'spring', delay: 0.2 }}><TeamLogo team={mine.team} size={120} /></motion.div>
          <h1 className="mt-3 font-display text-3xl leading-none tracking-wide text-slate-200 md:text-6xl">{mine.team.name}</h1>
          <div className="mt-2 text-lg font-semibold text-white">{r?.text}</div>
          <div className="mt-1 text-sm text-slate-400">{match.innings.map((i) => `${match.battingSide(i).team.name} ${i.runs}/${i.wickets}`).join('  ·  ')}</div>
          <p className="mt-3 text-slate-300">Chin up. There's always the next match.</p>
          <div className="mt-6 flex max-w-4xl flex-wrap items-end justify-center gap-x-3 gap-y-5 pt-4">
            {mine.xi.map((p, i) => (
              <div key={p.id} className="text-center">
                <MoodPortrait player={p} team={mine.team} size={64} mood="sad" delay={(i % 5) * 0.15} />
                <div className="mx-auto mt-1.5 w-[72px] truncate text-[10px] font-semibold text-slate-400">{p.name.split(' ')[0]}</div>
              </div>
            ))}
          </div>
          <button onClick={onContinue} className="mt-8 rounded-xl bg-slate-200 px-10 py-3 text-base font-extrabold text-black hover:bg-white">Continue</button>
        </div>
      </motion.div>
    )
  }

  const scores = match.innings.map((i) => `${match.battingSide(i).team.name} ${i.runs}/${i.wickets}`).join('  ·  ')

  return (
    <motion.div
      data-win
      data-scroll-lock
      className="fixed inset-0 z-[75] overflow-y-auto overscroll-contain"
      style={{ background: `radial-gradient(ellipse at 50% 30%, ${team ? team.colors.primary : '#334155'}cc, #07080d 75%)` }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      {/* rotating sunburst */}
      <motion.div className="pointer-events-none fixed left-1/2 top-[28%] h-[220vmax] w-[220vmax] -translate-x-1/2 -translate-y-1/2 opacity-20"
        style={{ background: `repeating-conic-gradient(from 0deg, ${accent}00 0deg 12deg, ${accent}cc 12deg 24deg)` }}
        animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: 'linear' }} />

      <div className="relative mx-auto flex min-h-full max-w-5xl flex-col items-center justify-center px-4 py-8 text-center">
        <motion.div initial={{ y: -40, opacity: 0, scale: 0.8 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.1 }}
          className="rounded-full bg-gradient-to-b from-amber-300 to-amber-500 px-8 py-1.5 font-display text-3xl tracking-[0.3em] text-black shadow-xl">
          {team ? (final ? 'CHAMPIONS' : 'WINNERS') : 'WHAT A FINISH'}
        </motion.div>

        {team ? (
          <motion.div className="mt-5 flex items-center justify-center gap-6" initial={{ scale: 0.2, rotate: -25, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 180, damping: 11, delay: 0.25 }}>
            <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}><TeamLogo team={team} size={150} /></motion.div>
            {final && <motion.div animate={{ y: [0, -12, 0], rotate: [-4, 4, -4] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}><Trophy size={130} /></motion.div>}
          </motion.div>
        ) : (
          <div className="mt-5 flex items-center justify-center gap-6">{match.sides.map((s) => <TeamLogo key={s.team.id} team={s.team} size={110} />)}</div>
        )}

        <motion.h1 initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }} className="mt-3 font-display text-3xl leading-none tracking-wide md:text-7xl" style={{ color: accent, textShadow: '0 4px 24px rgba(0,0,0,.6)' }}>
          {team ? team.name : 'THE MATCH IS TIED'}
        </motion.h1>
        {team && <div className="mt-1 text-base text-slate-200">{team.series}{final ? ` · ${final} champions` : ''}</div>}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mt-3 text-lg font-semibold text-white">{r?.text}</motion.div>
        <div className="mt-1 text-sm text-slate-300">{scores}</div>

        {side && (
          <div className="mt-6 flex max-w-4xl flex-wrap items-end justify-center gap-x-3 gap-y-5 pt-4">
            {side.xi.map((p, i) => (
              <div key={p.id} className="text-center">
                <MoodPortrait player={p} team={side.team} size={72} mood={i % 4 === 0 ? 'victory' : 'cheer'} delay={(i % 6) * 0.09} />
                <div className="mx-auto mt-2 w-[80px] truncate text-[10px] font-semibold text-slate-200">{p.name.split(' ')[0]}</div>
              </div>
            ))}
          </div>
        )}

        <motion.button initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }} onClick={onContinue}
          className="mt-8 rounded-xl bg-amber-400 px-10 py-3 text-base font-extrabold text-black shadow-lg transition hover:bg-amber-300">
          Continue
        </motion.button>
      </div>
    </motion.div>
  )
}
