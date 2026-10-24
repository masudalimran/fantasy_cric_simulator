import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { sfx } from '../../audio/sfx'
import { TvFrame, useWidth } from './ReviewScreens'

export interface RainDelayInfo {
  /** What stopped play. */
  weather: 'drizzle' | 'rain' | 'bad light'
  /** How many overs the day loses to it. */
  lost: number
  day: number
  rate: number
}

export const RAIN_DELAY_SECONDS = 5.2
const DROPS = Array.from({ length: 70 }, (_, i) => ({ x: (i * 53) % 100, d: (i % 11) * 0.09, s: 0.6 + (i % 5) * 0.12 }))

/** Rain (or bad light) stops play in a Test: the players leave, the covers are pulled across the pitch, and the day loses some overs. */
export function RainDelayScreen({ info }: { info: RainDelayInfo }) {
  const r = info.rate
  const [box, w] = useWidth()
  const light = info.weather === 'bad light'
  useEffect(() => {
    sfx.whoosh()
    const t = window.setTimeout(() => sfx.aww(0.8), 500 * r)
    return () => window.clearTimeout(t)
  }, [r])
  return (
    <div ref={box} className="absolute inset-0" aria-label="Rain stops play">
      <TvFrame title={light ? 'Bad light' : 'Rain stops play'}>
        <div className="absolute inset-0" style={{ background: light ? 'linear-gradient(#1e293b, #0b1220 60%, #0b3a22)' : 'linear-gradient(#475569, #1e293b 55%, #0b3a22)' }} />
        <div className="absolute inset-x-0 bottom-0 top-[44%]" style={{ background: 'linear-gradient(#14532d, #052e16)' }} />
        {/* the pitch, and the covers dragged across it */}
        <div className="absolute bottom-[8%] left-1/2 top-[48%] w-[22%] -translate-x-1/2 bg-gradient-to-b from-[#d7b87c] to-[#bf9a5f]" />
        <motion.div className="absolute bottom-[6%] top-[46%] z-10 -translate-x-1/2 rounded-md border border-sky-200/40" style={{ left: '50%', width: '30%', background: 'linear-gradient(90deg, #1e3a5f, #2d5282 50%, #1e3a5f)' }} initial={{ scaleY: 0, originY: 1 }} animate={{ scaleY: 1 }} transition={{ delay: 1.4 * r, duration: 1.6 * r, ease: 'easeInOut' }} />
        {/* the rain */}
        {!light && DROPS.map((d, i) => <motion.span key={i} className="absolute top-0 block w-px bg-sky-100/60" style={{ left: `${d.x}%`, height: 14 * d.s }} initial={{ y: -20 }} animate={{ y: 330 }} transition={{ delay: d.d * r, duration: 0.7 * r, repeat: Infinity, ease: 'linear' }} />)}
        <div className="absolute inset-x-0 top-[12%] z-20 text-center">
          <motion.div className="font-display leading-none tracking-wide text-white" style={{ fontSize: Math.max(30, Math.min(w * 0.1, 66)), WebkitTextStroke: '2px #0b1220', paintOrder: 'stroke fill', textShadow: '0 0 24px #7dd3fcaa' }} initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 * r, type: 'spring', stiffness: 220, damping: 15 }}>{light ? 'BAD LIGHT' : 'RAIN STOPS PLAY'}</motion.div>
          <motion.div className="mt-1 inline-block rounded bg-black/70 px-3 py-0.5 text-sm font-bold text-amber-300" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 * r }}>Day {info.day} · {info.lost} {info.lost === 1 ? 'over' : 'overs'} lost</motion.div>
        </div>
        <motion.div className="absolute inset-x-0 bottom-[2%] z-20 text-center text-[11px] font-bold uppercase tracking-widest text-sky-200" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.4 * r }}>The players are off · play will resume when it clears</motion.div>
      </TvFrame>
    </div>
  )
}
