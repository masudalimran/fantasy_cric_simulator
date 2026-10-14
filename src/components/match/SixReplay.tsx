import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import type { Player, Team } from '../../types'
import { PlayerAvatar, accentOf } from '../ui'

/** What a six replay needs. */
export interface SixInfo {
  batsman: Player
  team: Team
  /** How far it went, in metres. */
  distance: number
  /** 1 = full speed; higher auto-play speeds play it quicker. */
  rate: number
  /** True when it is the longest six he has hit so far in the match or career. */
  longest?: boolean
}

/** Counts up to a number as the ball flies. */
function Counter({ to, delay, dur }: { to: number; delay: number; dur: number }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    let raf = 0
    const t0 = performance.now() + delay * 1000
    const tick = (now: number) => {
      const k = Math.max(0, Math.min(1, (now - t0) / (dur * 1000)))
      setN(Math.round(to * (1 - (1 - k) ** 2)))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to, delay, dur])
  return <>{n}</>
}

/**
 * A short screen for a six, about three seconds: the ball leaves the bat, climbs over the rope and into the crowd, and a
 * distance counter runs up to how far it went. Click to skip.
 */
export function SixReplay({ info }: { info: SixInfo }) {
  const { batsman, team, distance, rate, longest } = info
  const box = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(640)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const r = rate
  const accent = accentOf(team)
  // a longer six goes higher and further across the screen
  const reach = 40 + Math.max(0, Math.min(1, (distance - 60) / 140)) * 52
  const fly = 1.5 * r
  const monster = distance >= 150 // an absolutely monstrous hit: a bigger, louder screen
  return (
    <motion.div ref={box} className="absolute inset-0 overflow-hidden rounded-2xl" aria-label={`Six, ${distance} metres`} animate={monster ? { x: [0, 0, -7, 7, -5, 5, -3, 0], y: [0, 0, 4, -4, 3, -3, 0, 0] } : {}} transition={{ delay: 0.35 * r, duration: 0.7 }}>
      {/* the night sky, the stands, the grass */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #060a18 0%, #10183a 52%, #0f3d24 52.2%, #1b7340 100%)' }} />
      {Array.from({ length: 40 }, (_, i) => (
        <span key={i} className="absolute rounded-full bg-white/70" style={{ left: `${(i * 53) % 100}%`, top: `${(i * 29) % 40}%`, width: 1 + (i % 3), height: 1 + (i % 3), opacity: 0.4 + (i % 5) * 0.1 }} />
      ))}
      <div className="absolute inset-x-0 top-[34%] h-[18%] opacity-70" style={{ background: 'repeating-linear-gradient(90deg, #1e293b 0 6px, #334155 6px 12px)' }} />
      {Array.from({ length: 60 }, (_, i) => (
        <motion.span key={i} className="absolute h-1.5 w-1.5 rounded-full" style={{ left: `${(i * 17) % 100}%`, top: `${36 + (i % 7) * 2.2}%`, background: i % 3 ? '#fbbf24' : accent }}
          animate={{ y: [0, -4, 0] }} transition={{ delay: 0.9 * r + (i % 9) * 0.05, duration: 0.5, repeat: 3 }} />
      ))}
      <div className="absolute inset-x-0 top-[52%] h-[2px] bg-white/80" />

      <div className="absolute left-3 top-3 z-30 flex items-center gap-2 rounded-lg bg-black/70 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-widest text-fuchsia-300"><span className="h-2 w-2 animate-pulse rounded-full bg-fuchsia-400" />{monster ? 'Monster six' : 'Six'}</div>
      <div className="absolute right-3 top-3 z-30 rounded-full bg-black/50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-300">Tap to skip</div>

      {/* the batsman, and the ball leaving the bat in an arc over the rope and out of the ground */}
      <motion.div className="absolute bottom-[6%] left-[8%] z-20 text-center" initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.4 }}>
        <div className="mx-auto inline-block rounded-full leading-[0]" style={{ boxShadow: `0 0 0 3px ${accent}, 0 0 20px ${accent}99` }}><PlayerAvatar player={batsman} team={team} size={Math.max(40, Math.min(w * 0.11, 70))} /></div>
        <div className="mt-1 max-w-[120px] truncate rounded bg-black/70 px-1.5 text-[11px] font-semibold text-white">{batsman.name}</div>
      </motion.div>
      <motion.svg className="absolute inset-0 z-10 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <motion.path
          d={`M 18 80 Q ${18 + reach * 0.45} ${-10 - reach * 0.18} ${18 + reach} 30`} fill="none" stroke="#fde68a" strokeWidth="0.5" strokeDasharray="1.2 1.4" strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0.9 }} animate={{ pathLength: 1, opacity: [0.9, 0.9, 0.5] }} transition={{ delay: 0.35 * r, duration: fly, ease: 'easeOut' }}
        />
      </motion.svg>
      <motion.span
        className="absolute z-30 block h-4 w-4 rounded-full border-2 border-red-200 bg-red-500 shadow-[0_0_14px_#ef4444]"
        style={{ left: '18%', top: '80%', translateX: '-50%', translateY: '-50%' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0.9], left: ['18%', `${18 + reach * 0.5}%`, `${18 + reach}%`], top: ['80%', `${-4 - reach * 0.05 + 12}%`, '30%'], scale: [1, 1.2, 0.5] }}
        transition={{ delay: 0.35 * r, duration: fly, times: [0, 0.55, 1], ease: 'easeOut' }}
      />

      {monster && (
        <>
          {/* the impact: a white flash, shock rings from the bat, a fireball behind the ball and sparks raining over the crowd */}
          <motion.div className="pointer-events-none absolute inset-0 z-[35] bg-white" initial={{ opacity: 0 }} animate={{ opacity: [0, 0.85, 0] }} transition={{ delay: 0.35 * r, duration: 0.35 }} />
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i} className="pointer-events-none absolute z-[25] block rounded-full border-4" style={{ left: '18%', top: '80%', width: 60, height: 60, translateX: '-50%', translateY: '-50%', borderColor: i === 1 ? '#fde68a' : '#fb923c' }}
              initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 9], opacity: [0.95, 0] }} transition={{ delay: (0.35 + i * 0.16) * r, duration: 0.9 * r, ease: 'easeOut' }}
            />
          ))}
          <motion.span
            className="pointer-events-none absolute z-[28] block rounded-full bg-orange-400/50 blur-md"
            style={{ left: '18%', top: '80%', width: 34, height: 34, translateX: '-50%', translateY: '-50%' }}
            animate={{ left: ['18%', `${18 + reach * 0.5}%`, '108%'], top: ['80%', '12%', '-10%'], scale: [1, 1.8, 1.2], opacity: [0, 1, 0.8] }} transition={{ delay: 0.35 * r, duration: fly * 1.15, times: [0, 0.5, 1], ease: 'easeOut' }}
          />
          {Array.from({ length: 26 }, (_, i) => (
            <motion.span
              key={i} className="pointer-events-none absolute z-[32] text-xl" style={{ left: `${(i * 37) % 100}%`, top: -8, color: i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? '#fde68a' : '#fb923c' }}
              initial={{ opacity: 0 }} animate={{ y: [0, 420], opacity: [0, 1, 0], rotate: [0, 200] }} transition={{ delay: (1 + (i % 8) * 0.09) * r, duration: 1.6 * r, repeat: 1, ease: 'easeIn' }}
            >✦</motion.span>
          ))}
        </>
      )}

      {/* the word and the distance */}
      <motion.div className="absolute inset-x-0 bottom-[8%] z-40 text-center" initial={{ opacity: 0, scale: 2 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.1 * r, type: 'spring', stiffness: 240, damping: 15 }}>
        <div className="font-display leading-none tracking-wide text-white" style={{ fontSize: monster ? Math.max(36, Math.min(w * 0.12, 88)) : Math.max(40, Math.min(w * 0.14, 96)), WebkitTextStroke: monster ? '2px #7c2d12' : '2px #581c87', paintOrder: 'stroke fill', textShadow: monster ? '0 0 36px #fb923ccc, 0 0 70px #ef4444aa' : '0 0 30px #d946efaa', color: monster ? '#fde68a' : undefined }}>{monster ? 'MONSTER SIX!' : 'SIX!'}</div>
        <div className="mt-1 flex items-baseline justify-center gap-1 font-display tracking-wide text-amber-300" style={{ fontSize: Math.max(26, Math.min(w * 0.085, 54)) }}>
          <span><Counter to={distance} delay={0.4 * r} dur={fly} /></span><span className="text-[0.55em] text-amber-200">metres</span>
        </div>
        {monster && <div className="mt-0.5 inline-block rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-3 py-0.5 text-[11px] font-extrabold uppercase tracking-widest text-white">Out of the ground!</div>}
        {longest && <div className="mt-0.5 inline-block rounded-full bg-amber-400 px-3 py-0.5 text-[11px] font-extrabold uppercase tracking-widest text-black">His longest six yet</div>}
      </motion.div>
    </motion.div>
  )
}
