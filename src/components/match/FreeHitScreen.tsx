import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import type { Player, Team } from '../../types'
import { PlayerAvatar } from '../ui'

export interface FreeHitInfo {
  /** The bowler who overstepped, and the batsman who now gets a free swing. */
  bowler: Player
  bowlTeam: Team
  batsman: Player
  batTeam: Team
  /** 1 = full speed; higher auto-play speeds play it quicker. */
  rate: number
}

/**
 * A short screen after a no-ball: the bowler has overstepped, so the next ball is a free hit. Red lights and a big
 * FREE HIT, with the batsman who gets the swing. Tap to skip.
 */
export function FreeHitScreen({ info }: { info: FreeHitInfo }) {
  const { bowler, bowlTeam, batsman, batTeam, rate } = info
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
  return (
    <div ref={box} className="absolute inset-0 overflow-hidden rounded-2xl" aria-label="Free hit">
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 55%, #7f1d1d, #1c0a0d 75%)' }} />
      {/* warning stripes that scroll across the top and bottom */}
      {[0, 1].map((i) => (
        <motion.div key={i} className="absolute inset-x-0 h-4 opacity-80" style={{ [i ? 'bottom' : 'top']: 0, background: 'repeating-linear-gradient(-45deg, #fbbf24 0 14px, #1c1917 14px 28px)', backgroundSize: '40px 100%' }}
          animate={{ backgroundPositionX: i ? ['0px', '-40px'] : ['0px', '40px'] }} transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }} />
      ))}
      {/* a pulse of red light behind the words */}
      <motion.div className="absolute left-1/2 top-1/2 h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: 'radial-gradient(circle, #ef444488, transparent 65%)' }}
        animate={{ scale: [0.8, 1.25, 0.8], opacity: [0.6, 1, 0.6] }} transition={{ duration: 0.9 * r, repeat: Infinity }} />

      <div className="absolute left-3 top-6 z-30 flex items-center gap-2 rounded-lg bg-black/70 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-widest text-amber-300"><span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />No ball</div>
      <div className="absolute right-3 top-6 z-30 rounded-full bg-black/50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-300">Tap to skip</div>

      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-1 px-4 text-center">
        <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 * r }} className="flex items-center gap-2 text-sm font-semibold text-slate-100">
          <span className="rounded-full" style={{ boxShadow: '0 0 0 2px #fbbf24' }}><PlayerAvatar player={bowler} team={bowlTeam} size={Math.max(26, Math.min(w * 0.06, 40))} /></span>
          <span><b className="text-amber-300">{bowler.name}</b> has overstepped</span>
        </motion.div>
        <motion.div
          className="font-display leading-none tracking-wide text-white"
          style={{ fontSize: Math.max(46, Math.min(w * 0.17, 120)), WebkitTextStroke: '3px #7f1d1d', paintOrder: 'stroke fill', textShadow: '0 0 40px #ef4444' }}
          initial={{ scale: 2.6, opacity: 0, rotate: -6 }} animate={{ scale: [2.6, 1, 1.06, 1], opacity: 1, rotate: [-6, 0, 0, 0] }} transition={{ delay: 0.5 * r, duration: 0.7 * r, times: [0, 0.5, 0.8, 1] }}
        >FREE HIT!</motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.3 * r }} className="flex items-center gap-2.5 rounded-2xl bg-black/50 px-3 py-2">
          <span className="rounded-full" style={{ boxShadow: '0 0 0 3px #ef4444, 0 0 20px #ef4444aa' }}><PlayerAvatar player={batsman} team={batTeam} size={Math.max(34, Math.min(w * 0.09, 58))} /></span>
          <span className="text-left">
            <span className="block text-[11px] font-extrabold uppercase tracking-widest text-red-300">Facing the free hit</span>
            <span className="block font-display text-2xl leading-none tracking-wide text-white">{batsman.name}</span>
            <span className="block text-[11px] text-slate-300">Swing freely: he can only be run out.</span>
          </span>
        </motion.div>
      </div>
    </div>
  )
}
