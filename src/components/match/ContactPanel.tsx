import { motion } from 'framer-motion'
import type { Contact } from '../../engine/contact'

/** The bat with a hot spot where the ball struck it, like the broadcast's heat picture: the sweet spot is ringed, an edge glows at the side. */
export function BatContact({ contact, height = 130, delay = 0, rate = 1 }: { contact: Contact; height?: number; delay?: number; rate?: number }) {
  // along the bat: the toe is at the bottom, the shoulder at the top; across it: the inside edge on the left, the outside edge on the right
  const cy = 98 - contact.along * (contact.along > 0 ? 54 : 36)
  const cx = 30 + contact.across * 13
  const hot = contact.quality < 0.5 ? '#ef4444' : contact.quality < 0.8 ? '#f59e0b' : '#34d399'
  return (
    <svg height={height} viewBox="0 0 60 140" aria-label={`Ball struck the ${contact.spot.toLowerCase()}`} role="img">
      <defs>
        <radialGradient id="hotspot"><stop offset="0" stopColor="#fff" /><stop offset="0.35" stopColor="#fde047" /><stop offset="0.7" stopColor={hot} stopOpacity="0.85" /><stop offset="1" stopColor={hot} stopOpacity="0" /></radialGradient>
        <linearGradient id="blade" x1="0" x2="1"><stop offset="0" stopColor="#8a6238" /><stop offset="0.5" stopColor="#d9b27a" /><stop offset="1" stopColor="#8a6238" /></linearGradient>
      </defs>
      <rect x="26" y="4" width="8" height="40" rx="4" fill="#3b2a12" />
      <path d="M22 38 L38 38 L46 52 L46 130 Q46 136 40 136 L20 136 Q14 136 14 130 L14 52 Z" fill="url(#blade)" stroke="#5b3d1c" strokeWidth="1.2" />
      {/* the sweet spot */}
      <ellipse cx="30" cy="98" rx="11" ry="14" fill="none" stroke="#ffffffaa" strokeWidth="1" strokeDasharray="2.5 2" />
      <text x="30" y="118" fontSize="4.6" textAnchor="middle" fill="#ffffffcc" fontWeight="700">SWEET SPOT</text>
      {/* where the ball hit */}
      <motion.circle cx={cx} cy={cy} r="14" fill="url(#hotspot)" initial={{ opacity: 0, scale: 0.2 }} animate={{ opacity: [0, 1, 0.85, 1], scale: [0.2, 1.15, 1] }} transition={{ delay: delay * rate, duration: 0.9 * rate }} style={{ transformOrigin: `${cx}px ${cy}px` }} />
      <motion.circle cx={cx} cy={cy} r="2.4" fill="#fff" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: (delay + 0.2) * rate }} />
    </svg>
  )
}

const Bar = ({ label, value, text, pct, color, delay, rate, children }: { label: string; value: string; text: string; pct: number; color: string; delay: number; rate: number; children?: React.ReactNode }) => (
  <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: delay * rate }}>
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{label}</span>
      <span className="text-[11px] font-bold tabular-nums" style={{ color }}>{value} <span className="font-semibold text-slate-300">{text}</span></span>
    </div>
    <div className="relative mt-0.5 h-2 overflow-hidden rounded-full bg-white/10">
      {children}
      <motion.div className="h-full rounded-full" style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${Math.max(4, Math.min(100, pct))}%` }} transition={{ delay: (delay + 0.1) * rate, duration: 0.7 * rate }} />
    </div>
  </motion.div>
)

/** The bat speed and the timing as two meters (the timing meter has its perfect zone in the middle), and how well the ball was hit. */
export function ContactMeters({ contact, delay = 0, rate = 1, compact = false }: { contact: Contact; delay?: number; rate?: number; /** Leave out the contact bar (the spot is said elsewhere). */ compact?: boolean }) {
  const speedColor = contact.speed < 88 ? '#f87171' : contact.speed < 102 ? '#fbbf24' : '#34d399'
  const timeColor = Math.abs(contact.timing) <= 6 ? '#34d399' : Math.abs(contact.timing) <= 26 ? '#fbbf24' : '#f87171'
  const spotColor = contact.quality >= 0.8 ? '#34d399' : contact.quality >= 0.45 ? '#fbbf24' : '#f87171'
  return (
    <div className="space-y-2">
      <Bar label="Bat speed" value={`${contact.speed} km/h`} text={contact.speedLabel} pct={((contact.speed - 62) / 72) * 100} color={speedColor} delay={delay} rate={rate} />
      <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: (delay + 0.25) * rate }}>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Timing</span>
          <span className="text-[11px] font-bold" style={{ color: timeColor }}>{contact.timingLabel} <span className="font-semibold tabular-nums text-slate-300">{contact.timing === 0 ? '' : `${contact.timing > 0 ? '+' : ''}${contact.timing} ms`}</span></span>
        </div>
        <div className="relative mt-0.5 h-2 rounded-full bg-white/10">
          <div className="absolute inset-y-0 left-[45%] w-[10%] rounded bg-emerald-400/40" />
          <div className="absolute inset-y-0 left-1/2 w-px bg-white/50" />
          <motion.span className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white" style={{ background: timeColor, left: `${50 + Math.max(-1, Math.min(1, contact.timing / 60)) * 46}%` }} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: (delay + 0.45) * rate, type: 'spring', stiffness: 300, damping: 14 }} />
        </div>
        <div className="mt-0.5 flex justify-between text-[9px] font-bold uppercase tracking-wider text-slate-500"><span>Early</span><span>Late</span></div>
      </motion.div>
      {!compact && <Bar label="Contact" value={contact.spot} text={`${Math.round(contact.quality * 100)}% middled`} pct={contact.quality * 100} color={spotColor} delay={delay + 0.5} rate={rate} />}
    </div>
  )
}
