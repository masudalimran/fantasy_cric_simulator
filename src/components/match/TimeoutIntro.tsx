import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { sfx } from '../../audio/sfx'
import { TvFrame, useWidth } from './ReviewScreens'

export interface TimeoutIntroInfo {
  /** "After 7 overs: 54/2". */
  headline: string
  /** The two teams, the batting side first. */
  teamNames: [string, string]
  rate: number
}

/** How long the umpire's signal is on screen, in seconds (before the speed factor). */
export const TIMEOUT_INTRO_SECONDS = 3.4

/**
 * The start of a strategic timeout, as on TV: the umpire stops play and signals the timeout with his forearms in a T, the banner slides in, and the
 * players start to leave the middle. It comes before the timeout screen so it is clear that a timeout has begun.
 */
export function TimeoutIntroScreen({ info }: { info: TimeoutIntroInfo }) {
  const r = info.rate
  const [box, w] = useWidth()
  useEffect(() => {
    sfx.whoosh()
    const t = window.setTimeout(() => sfx.howzat(), 700 * r)
    return () => window.clearTimeout(t)
  }, [r])
  return (
    <div ref={box} className="absolute inset-0" aria-label="Strategic timeout is called">
      <TvFrame title="Strategic timeout">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 30% 55%, #14532d, #052e16 70%)' }} />
        {/* the umpire, front on, with his arms making a T */}
        <motion.svg className="absolute bottom-[3%] left-[7%] w-auto" style={{ height: '80%' }} viewBox="0 0 120 170" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4 * r }} aria-hidden>
          <ellipse cx="60" cy="164" rx="38" ry="5" fill="#000" opacity="0.35" />
          <rect x="44" y="108" width="14" height="52" rx="6" fill="#0f172a" />
          <rect x="62" y="108" width="14" height="52" rx="6" fill="#0f172a" />
          <rect x="36" y="50" width="48" height="66" rx="14" fill="#1e293b" stroke="#f8fafc" strokeWidth="2.5" />
          <circle cx="60" cy="28" r="17" fill="#e0b48e" stroke="#0f172a" strokeWidth="2" />
          <path d="M40 22 Q60 -2 80 22 L84 26 L36 26 Z" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.5" />
          <circle cx="54" cy="30" r="1.6" fill="#0f172a" /><circle cx="66" cy="30" r="1.6" fill="#0f172a" />
          {/* the forearms: one across, one up, forming a T in front of the chest */}
          <motion.g initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.35 * r, type: 'spring', stiffness: 220, damping: 14 }} style={{ transformOrigin: '60px 72px' }}>
            <rect x="14" y="62" width="92" height="13" rx="6.5" fill="#f8fafc" stroke="#475569" strokeWidth="2" />
            <rect x="53.5" y="44" width="13" height="26" rx="6.5" fill="#f8fafc" stroke="#475569" strokeWidth="2" />
            <circle cx="14" cy="68.5" r="9" fill="#e0b48e" stroke="#475569" strokeWidth="2" /><circle cx="106" cy="68.5" r="9" fill="#e0b48e" stroke="#475569" strokeWidth="2" />
            <circle cx="60" cy="45" r="8" fill="#e0b48e" stroke="#475569" strokeWidth="2" />
          </motion.g>
        </motion.svg>

        {/* the banner */}
        <div className="absolute right-[5%] top-[28%] z-20 max-w-[52%] text-right">
          <motion.div className="font-display leading-none tracking-wide text-white" style={{ fontSize: Math.max(26, Math.min(w * 0.1, 64)), WebkitTextStroke: '2px #052e16', paintOrder: 'stroke fill', textShadow: '0 0 28px #fbbf24aa' }} initial={{ x: 80, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.6 * r, type: 'spring', stiffness: 180, damping: 16 }}>STRATEGIC TIMEOUT</motion.div>
          <motion.div className="mt-1.5 inline-block rounded bg-black/70 px-2.5 py-1 text-sm font-bold text-amber-300" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.0 * r }}>{info.headline}</motion.div>
          <motion.div className="mt-1 text-xs font-semibold text-slate-200" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 * r }}>{info.teamNames[0]} v {info.teamNames[1]}</motion.div>
          <motion.div className="mt-2 text-[11px] font-bold uppercase tracking-widest text-sky-300" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0.5, 1] }} transition={{ delay: 1.7 * r, duration: 1.2 }}>The players head for the huddle</motion.div>
        </div>
      </TvFrame>
    </div>
  )
}
