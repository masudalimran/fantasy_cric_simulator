import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import type { Player, Team } from '../../types'
import { accentOf } from '../ui'
import { StickFigure } from './StickFigure'

/** A big moment for one batsman that takes over the whole field: a milestone or a dismissal. */
export interface Moment {
  key: number
  kind: 'milestone' | 'wicket'
  player: Player
  team: Team
  title: string
  /** Lines under the name: the score, or how he got out. */
  lines: string[]
  /** A hundred or more gets the full golden treatment. */
  big?: boolean
  duck?: boolean
  /** Wait this long (ms) so the delivery that caused it can be seen first, then show for `ms`. */
  delay: number
  ms: number
}

function Rain() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-40" preserveAspectRatio="none" viewBox="0 0 100 100">
      {Array.from({ length: 34 }, (_, i) => {
        const x = (i * 29) % 100
        return (
          <motion.line key={i} x1={x} y1={-10} x2={x - 3} y2={-4} stroke="#94a3b8" strokeWidth="0.25" strokeLinecap="round"
            animate={{ y: [0, 120] }} transition={{ duration: 0.9 + (i % 5) * 0.12, repeat: Infinity, ease: 'linear', delay: (i % 9) * 0.11 }} />
        )
      })}
    </svg>
  )
}

function Stars({ color }: { color: string }) {
  return (
    <>
      {Array.from({ length: 14 }, (_, i) => (
        <motion.span
          key={i} className="pointer-events-none absolute text-lg" style={{ left: `${(i * 37) % 96}%`, bottom: -10, color }}
          animate={{ y: [0, -520], opacity: [0, 1, 0], rotate: [0, 180] }} transition={{ duration: 2.6 + (i % 4) * 0.4, repeat: Infinity, delay: (i % 7) * 0.3, ease: 'easeOut' }}
        >✦</motion.span>
      ))}
    </>
  )
}

export function MomentOverlay({ moment, onDismiss }: { moment: Moment; onDismiss: () => void }) {
  const box = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(700)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const wicket = moment.kind === 'wicket'
  const accent = accentOf(moment.team)
  const fig = Math.max(120, Math.min(w * 0.34, 250))
  const scale = Math.max(0.62, Math.min(w / 730, 1.1))

  return (
    <motion.div
      ref={box}
      data-moment={moment.kind}
      onClick={onDismiss}
      className="absolute inset-0 z-[45] flex cursor-pointer items-center justify-center gap-[4%] overflow-hidden rounded-2xl px-[5%]"
      style={{ background: wicket ? 'linear-gradient(170deg,#1c0b10,#0a0a12 70%)' : `radial-gradient(ellipse at 28% 70%, ${accent}55, transparent 62%), linear-gradient(160deg,#0b1220,#1a1530)`, boxShadow: wicket ? 'inset 0 0 90px rgba(239,68,68,.38)' : 'inset 0 0 90px rgba(251,191,36,.3)' }}
      initial={{ opacity: 0, scale: 1.06 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.28, delay: moment.delay / 1000 }}
      aria-label={wicket ? 'Wicket' : 'Milestone'}
    >
      {wicket ? <Rain /> : (
        <>
          <motion.div className="pointer-events-none absolute -left-[10%] top-[8%] h-[120%] w-[70%] opacity-30" style={{ background: 'conic-gradient(from 0deg, #fbbf2400, #fbbf24aa, #fbbf2400, #fbbf24aa, #fbbf2400, #fbbf24aa, #fbbf2400, #fbbf24aa, #fbbf2400)', borderRadius: '50%' }} animate={{ rotate: 360 }} transition={{ duration: 14, repeat: Infinity, ease: 'linear' }} />
          <Stars color={moment.big ? '#fde68a' : accent} />
        </>
      )}

      <div className="relative shrink-0" style={{ width: fig }}>
        <StickFigure player={moment.player} team={moment.team} pose={wicket ? 'sad' : moment.big ? 'victory' : 'cheer'} width={fig} bat delay={moment.delay / 1000} />
      </div>

      <motion.div
        className="relative min-w-0 max-w-[52%]"
        initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: moment.delay / 1000 + 0.15, type: 'spring', stiffness: 200, damping: 18 }}
      >
        <div
          className="font-display leading-none tracking-wide"
          style={{ fontSize: 66 * scale, color: wicket ? '#f87171' : '#fbbf24', WebkitTextStroke: `${2 * scale}px #0b0d14`, paintOrder: 'stroke fill', textShadow: wicket ? '0 0 30px #ef444488' : '0 0 34px #fbbf2488' }}
        >
          {moment.title}
        </div>
        <div className="mt-1 font-bold leading-tight text-white" style={{ fontSize: 22 * scale }}>{moment.player.name}</div>
        <div className="text-slate-300" style={{ fontSize: 13 * scale }}>{moment.team.name}</div>
        <div className="mt-2 space-y-0.5">
          {moment.lines.map((l, i) => (
            <div key={i} className={i === 0 ? 'font-extrabold text-white' : 'text-slate-300'} style={{ fontSize: (i === 0 ? 19 : 14) * scale }}>{l}</div>
          ))}
        </div>
        {moment.duck && <div className="mt-2 inline-block -rotate-6 rounded border-2 border-red-400 px-2 py-0.5 font-display tracking-widest text-red-300" style={{ fontSize: 22 * scale }}>DUCK</div>}
      </motion.div>
    </motion.div>
  )
}
