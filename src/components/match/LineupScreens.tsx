import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { overall } from '../../data/builders'
import type { Side } from '../../engine/types'
import { PlayerAvatar, RatingBadge, ROLE_LABEL, accentOf } from '../ui'
import { TeamLogo } from '../season/Details'
import { Trophy } from './WinCelebration'

/** The starting elevens, one team at a time: each player's card flips in, in batting order. Tap Skip to go straight to the toss. */
export function LineupReveal({ sides, mySide, onDone }: { sides: [Side, Side]; mySide: 0 | 1 | null; onDone: () => void }) {
  const [shown, setShown] = useState<0 | 1>(0)
  const [ready, setReady] = useState(false)
  const per = 0.2
  useEffect(() => {
    setReady(false)
    const t = window.setTimeout(() => setReady(true), (11 * per + 0.9) * 1000)
    return () => window.clearTimeout(t)
  }, [shown])
  useEffect(() => {
    if (!ready) return
    const t = window.setTimeout(() => (shown === 0 ? setShown(1) : onDone()), 1600)
    return () => window.clearTimeout(t)
  }, [ready, shown, onDone])
  const side = sides[shown]
  const team = side.team
  const accent = accentOf(team)
  const keeperId = team.keeperId
  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-ink" style={{ paddingTop: 'var(--sat)' }} aria-label="Starting elevens">
      <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(ellipse at 50% 18%, ${accent}55, transparent 62%)` }} />
      <div className="relative flex shrink-0 items-center gap-2 px-3 pt-3">
        <div className="min-w-0 flex-1 text-[11px] font-extrabold uppercase tracking-widest text-amber-300">Starting XI · {shown + 1} of 2</div>
        <button onClick={onDone} className="rounded-full border border-line px-3.5 py-1.5 text-xs font-bold text-slate-200 active:bg-white/10">Skip</button>
      </div>
      <motion.div key={`head${shown}`} className="relative flex shrink-0 items-center justify-center gap-3 px-3 pb-2 pt-2" initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }}>
        <TeamLogo team={team} size={52} />
        <div className="min-w-0">
          <h2 className="truncate font-display text-3xl leading-none tracking-wide text-white">{team.name}</h2>
          <div className="text-xs text-slate-300">{team.series}{mySide === shown ? ' · your team' : ''}</div>
        </div>
      </motion.div>
      <div className="relative min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        <div key={shown} className="grid grid-cols-3 gap-2">
          {side.xi.map((p, i) => (
            <motion.div
              key={p.id} className="relative rounded-xl border bg-panel p-2 text-center" style={{ borderColor: `${accent}66`, transformPerspective: 600 }}
              initial={{ rotateY: 90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} transition={{ delay: i * per, duration: 0.45, ease: 'easeOut' }}
            >
              <span className="absolute left-1.5 top-1 text-[11px] font-extrabold text-slate-400">{i + 1}</span>
              {team.captainId === p.id && <span className="absolute right-1.5 top-1 rounded bg-amber-400/25 px-1 text-[11px] font-extrabold text-amber-300">C</span>}
              {keeperId === p.id && team.captainId !== p.id && <span className="absolute right-1.5 top-1 rounded bg-sky-400/25 px-1 text-[11px] font-extrabold text-sky-300">WK</span>}
              <div className="mx-auto mt-1 w-fit"><PlayerAvatar player={p} team={team} size={50} /></div>
              <div className="mt-1 truncate text-[12px] font-bold text-white">{p.name}</div>
              <div className="truncate text-[11px] text-slate-400">{ROLE_LABEL[p.role]}</div>
              <div className="mt-0.5 flex justify-center"><RatingBadge value={overall(p)} size="sm" /></div>
            </motion.div>
          ))}
        </div>
      </div>
      <div className="relative shrink-0 border-t border-line bg-panel px-3 pt-2" style={{ paddingBottom: 'calc(var(--sab) + 10px)' }}>
        <button onClick={() => (shown === 0 ? setShown(1) : onDone())} className="w-full rounded-full border-2 border-amber-200 bg-gradient-to-b from-amber-300 to-amber-500 px-6 py-3 font-display text-2xl leading-none tracking-wide text-black active:brightness-95">{shown === 0 ? 'Next team' : 'To the toss'}</button>
      </div>
    </div>
  )
}

/** A semi-final or final: the trophy spins between the two crests and the stage of the competition slams in. Tap anywhere to carry on. */
export function BigMatchIntro({ sides, competition, stage, onDone }: { sides: [Side, Side]; competition: string; stage: string; onDone: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onDone, 5200)
    return () => window.clearTimeout(t)
  }, [onDone])
  const isFinal = /^final$/i.test(stage) || stage.toLowerCase() === 'final'
  const [a, b] = sides
  return (
    <motion.div className="fixed inset-0 z-30 flex cursor-pointer flex-col items-center justify-center overflow-hidden bg-ink px-4 text-center" style={{ paddingTop: 'var(--sat)', paddingBottom: 'var(--sab)' }} onClick={onDone} initial={{ opacity: 0 }} animate={{ opacity: 1 }} aria-label={`${competition} ${stage}`}>
      <motion.div className="pointer-events-none absolute left-1/2 top-[40%] h-[200vmax] w-[200vmax] -translate-x-1/2 -translate-y-1/2 opacity-20" style={{ background: 'repeating-conic-gradient(from 0deg, #fbbf2400 0deg 12deg, #fbbf24cc 12deg 24deg)' }} animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: 'linear' }} />
      <div className="absolute right-3 top-3 rounded-full bg-black/50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-300" style={{ marginTop: 'var(--sat)' }}>Tap to continue</div>
      <motion.div className="relative text-sm font-bold uppercase tracking-[0.3em] text-amber-200" initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>{competition}</motion.div>
      <motion.div className="relative mt-1 font-display leading-none tracking-wide text-white" style={{ fontSize: 'clamp(44px, 16vw, 96px)', WebkitTextStroke: '2px #451a03', paintOrder: 'stroke fill', textShadow: '0 0 40px #fbbf24aa' }} initial={{ opacity: 0, scale: 2.4 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5, type: 'spring', stiffness: 240, damping: 14 }}>{isFinal ? 'THE FINAL' : stage.toUpperCase()}</motion.div>
      <div className="relative mt-6 flex items-center justify-center gap-4">
        <motion.div initial={{ x: -120, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 1, type: 'spring', stiffness: 120, damping: 14 }}><TeamLogo team={a.team} size={96} /></motion.div>
        <motion.div animate={{ rotateY: 360, y: [0, -8, 0] }} transition={{ rotateY: { duration: 3, repeat: Infinity, ease: 'linear' }, y: { duration: 1.6, repeat: Infinity } }} style={{ perspective: 600 }}><Trophy size={isFinal ? 120 : 90} /></motion.div>
        <motion.div initial={{ x: 120, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 1, type: 'spring', stiffness: 120, damping: 14 }}><TeamLogo team={b.team} size={96} /></motion.div>
      </div>
      <motion.div className="relative mt-4 font-display text-3xl leading-none tracking-wide text-white" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }}>{a.team.name} <span className="text-amber-300">v</span> {b.team.name}</motion.div>
    </motion.div>
  )
}
