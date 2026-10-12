import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import type { Player, Team } from '../../types'
import { RatingBadge, accentOf } from '../ui'
import { SixReplay, type SixInfo } from './SixReplay'
import { WicketReplay, type ReplayInfo } from './WicketReplay'
import { BallIcon, BatIcon, MoodPortrait, StarIcon, StumpsIcon, type Mood } from './Portrait'

/**
 * A big moment that takes over the field for a few seconds, TV-graphic style: a milestone, a dismissal, or the
 * introduction of a batsman or bowler the first time he gets going in the match.
 */
export interface Moment {
  key: number
  kind: 'milestone' | 'wicket' | 'batsman' | 'bowler' | 'replay' | 'six'
  /** For a six: how far it went. */
  six?: SixInfo
  /** For a replay: how the wicket happened. */
  replay?: ReplayInfo
  player: Player
  team: Team
  title: string
  /** Lines under the name: the score, or how he got out. */
  lines: string[]
  /** Little stat boxes (an introduction): label and value. */
  tiles?: { label: string; value: string }[]
  /** Overall rating, shown as a badge. */
  rating?: number
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

/** A sweep of team colour across the screen, for introductions. */
function Sweep({ color }: { color: string }) {
  return (
    <>
      <motion.div className="pointer-events-none absolute inset-y-0 w-1/2 -skew-x-12 opacity-25" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} initial={{ left: '-60%' }} animate={{ left: '120%' }} transition={{ duration: 1.4, ease: 'easeInOut' }} />

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
  if (moment.kind === 'replay' && moment.replay) {
    // a screen of its own: how the wicket happened, a few seconds long (click to skip)
    return (
      <motion.div
        data-moment="replay" onClick={onDismiss} className="absolute inset-0 z-[45] cursor-pointer overflow-hidden rounded-2xl"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.05, transition: { duration: 0.45, delay: 0, ease: 'easeInOut' } }} transition={{ duration: 0.3, delay: moment.delay / 1000 }}
        aria-label="Wicket replay"
      >
        <WicketReplay info={moment.replay} />
      </motion.div>
    )
  }
  if (moment.kind === 'six' && moment.six) {
    return (
      <motion.div
        data-moment="six" onClick={onDismiss} className="absolute inset-0 z-[45] cursor-pointer overflow-hidden rounded-2xl"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.3, delay: 0 } }} transition={{ duration: 0.25, delay: moment.delay / 1000 }}
        aria-label="Six"
      >
        <SixReplay info={moment.six} />
      </motion.div>
    )
  }
  const wicket = moment.kind === 'wicket'
  const milestone = moment.kind === 'milestone'
  const intro = moment.kind === 'batsman' || moment.kind === 'bowler'
  const accent = accentOf(moment.team)
  // narrow (a phone): the portrait goes on top and the words below it; wide: side by side as before
  const stacked = w < 520
  const fig = stacked ? Math.max(84, Math.min(w * 0.3, 118)) : Math.max(110, Math.min(w * 0.3, 210))
  const scale = stacked ? Math.max(0.5, Math.min(w / 640, 0.66)) : Math.max(0.62, Math.min(w / 730, 1.1))
  const mood: Mood = wicket ? 'sad' : milestone ? (moment.big ? 'victory' : 'cheer') : 'intro'
  const titleColor = wicket ? '#f87171' : milestone ? '#fbbf24' : accent
  const Badge = wicket ? StumpsIcon : milestone ? StarIcon : moment.kind === 'bowler' ? BallIcon : BatIcon
  const bg = wicket
    ? 'linear-gradient(170deg,#1c0b10,#0a0a12 70%)'
    : milestone ? `radial-gradient(ellipse at 28% 70%, ${accent}55, transparent 62%), linear-gradient(160deg,#0b1220,#1a1530)`
    : `radial-gradient(ellipse at 25% 50%, ${accent}66, transparent 60%), linear-gradient(160deg,#0b1220,#10131c)`

  return (
    <motion.div
      ref={box}
      data-moment={moment.kind}
      onClick={onDismiss}
      className={`absolute inset-0 z-[45] flex cursor-pointer justify-center overflow-hidden rounded-2xl ${stacked ? 'flex-col items-center gap-1.5 px-3 text-center' : 'items-center gap-[4%] px-[5%]'}`}
      style={{ background: bg, boxShadow: wicket ? 'inset 0 0 90px rgba(239,68,68,.38)' : milestone ? 'inset 0 0 90px rgba(251,191,36,.3)' : `inset 0 0 80px ${accent}44` }}
      initial={{ opacity: 0, scale: 1.06 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.18, delay: 0 } }}
      transition={{ duration: moment.delay === 0 ? 0.5 : 0.28, delay: moment.delay / 1000, ease: 'easeOut' }} // straight after a replay: it fades in as the replay fades out
      aria-label={wicket ? 'Wicket' : milestone ? 'Milestone' : moment.kind === 'bowler' ? 'Bowler introduction' : 'Batsman introduction'}
    >
      {intro && (
        <>
          {/* time left, and a way out: click anywhere to carry on */}
          <motion.div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 origin-left" style={{ background: accent }} initial={{ scaleX: 1 }} animate={{ scaleX: 0 }} transition={{ duration: moment.ms / 1000 + 0.35, delay: moment.delay / 1000, ease: 'linear' }} />
          <div className={`pointer-events-none absolute right-3 rounded-full bg-black/40 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-300 ${stacked ? 'top-2' : 'bottom-2.5'}`}>{stacked ? 'Tap to continue' : 'Click anywhere to continue'}</div>
        </>
      )}
      {wicket ? <Rain /> : milestone ? (
        <>
          <motion.div className="pointer-events-none absolute -left-[10%] top-[8%] h-[120%] w-[70%] opacity-30" style={{ background: 'conic-gradient(from 0deg, #fbbf2400, #fbbf24aa, #fbbf2400, #fbbf24aa, #fbbf2400, #fbbf24aa, #fbbf2400, #fbbf24aa, #fbbf2400)', borderRadius: '50%' }} animate={{ rotate: 360 }} transition={{ duration: 14, repeat: Infinity, ease: 'linear' }} />
          <Stars color={moment.big ? '#fde68a' : accent} />
        </>
      ) : <Sweep color={accent} />}

      <div className="relative shrink-0" style={{ width: fig, height: fig }}>
        <MoodPortrait player={moment.player} team={moment.team} size={fig} mood={mood} delay={moment.delay / 1000} />
        <motion.div
          className="absolute -bottom-1 -right-1 grid place-items-center rounded-full border-2 bg-ink shadow-lg"
          style={{ width: fig * 0.3, height: fig * 0.3, borderColor: titleColor }}
          initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 14, delay: moment.delay / 1000 + 0.25 }}
        >
          <Badge size={Math.round(fig * 0.17)} />
        </motion.div>
      </div>

      <motion.div
        className={`relative min-w-0 ${stacked ? 'w-full max-w-full' : 'max-w-[56%]'}`}
        initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: moment.delay / 1000 + 0.15, type: 'spring', stiffness: 200, damping: 18 }}
      >
        <div
          className="font-display leading-none tracking-wide"
          style={{ fontSize: (intro ? 34 : 66) * scale, color: titleColor, WebkitTextStroke: `${2 * scale}px #0b0d14`, paintOrder: 'stroke fill', textShadow: `0 0 30px ${titleColor}88` }}
        >
          {moment.title}
        </div>
        <div className={`mt-1 flex items-center gap-2 ${stacked ? 'justify-center' : ''}`}>
          <div className="font-bold leading-tight text-white" style={{ fontSize: (intro ? 28 : 22) * scale }}>{moment.player.name}</div>
          {moment.rating !== undefined && <RatingBadge value={moment.rating} size="sm" />}
        </div>
        <div className="text-slate-300" style={{ fontSize: 13 * scale }}>{moment.team.name}</div>
        <div className="mt-1 space-y-0.5">
          {moment.lines.map((l, i) => (
            <div key={i} className={i === 0 ? 'font-extrabold text-white' : 'text-slate-300'} style={{ fontSize: (i === 0 ? 19 : 14) * scale }}>{l}</div>
          ))}
        </div>
        {moment.tiles && moment.tiles.length > 0 && (
          <div className={`grid grid-cols-3 gap-1.5 ${stacked ? 'mt-2 mx-auto max-w-sm' : 'mt-3'}`}>
            {moment.tiles.map((t, i) => (
              <motion.div key={t.label} className="rounded-lg bg-white/10 px-2 py-1 text-center" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: moment.delay / 1000 + 0.35 + i * 0.07 }}>
                <div className="font-display leading-none text-white" style={{ fontSize: 22 * scale }}>{t.value}</div>
                <div className="font-bold uppercase tracking-wider text-slate-400" style={{ fontSize: Math.max(8, 9 * scale) }}>{t.label}</div>
              </motion.div>
            ))}
          </div>
        )}
        {moment.duck && <div className="mt-2 inline-block -rotate-6 rounded border-2 border-red-400 px-2 py-0.5 font-display tracking-widest text-red-300" style={{ fontSize: 22 * scale }}>DUCK</div>}
      </motion.div>
    </motion.div>
  )
}
