import { motion } from 'framer-motion'
import type { Player, Team } from '../../types'
import { PlayerAvatar, accentOf } from '../ui'

/** How a portrait carries itself: leaping for joy, hanging its head, or just arriving. */
export type Mood = 'cheer' | 'victory' | 'sad' | 'intro'

const loop = (duration: number, delay = 0) => ({ duration, repeat: Infinity, ease: 'easeInOut' as const, delay })

/**
 * A player's portrait that moves with the mood: it bounces when delighted, sinks and goes grey when not, and
 * pops in when introduced. A portrait is one solid shape, so it always sits where it should (unlike the old
 * stick figures, whose arms and legs drifted apart).
 */
export function MoodPortrait({ player, team, size, mood, delay = 0, ring = true }: { player: Player; team: Team; size: number; mood: Mood; delay?: number; ring?: boolean }) {
  const accent = accentOf(team)
  const joy = mood === 'cheer' || mood === 'victory'
  const sad = mood === 'sad'
  const hop = mood === 'victory' ? size * 0.16 : size * 0.1
  return (
    <motion.div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      initial={mood === 'intro' ? { scale: 0.4, opacity: 0, rotate: -8 } : { scale: 0.85, opacity: 0 }}
      animate={
        joy ? { y: [0, -hop, 0], rotate: [-4, 4, -4], scale: 1, opacity: 1 }
        : sad ? { y: [0, size * 0.04, size * 0.04], rotate: 6, scale: 1, opacity: 1 }
        : { y: 0, rotate: 0, scale: 1, opacity: 1 }
      }
      transition={joy ? { ...loop(mood === 'victory' ? 0.55 : 0.75, delay), scale: { duration: 0.3, delay }, opacity: { duration: 0.3, delay } } : sad ? { duration: 1.4, delay, ease: 'easeOut' } : { type: 'spring', stiffness: 220, damping: 16, delay }}
    >
      {joy && <motion.span className="pointer-events-none absolute inset-0 rounded-full" style={{ border: `3px solid ${accent}` }} animate={{ scale: [1, 1.45], opacity: [0.6, 0] }} transition={{ duration: 1.3, repeat: Infinity, ease: 'easeOut', delay }} />}
      <div className="rounded-full" style={{ boxShadow: ring ? `0 0 0 ${Math.max(2, size / 28)}px ${sad ? '#64748b' : accent}, 0 ${size / 12}px ${size / 5}px rgba(0,0,0,.5)` : undefined, filter: sad ? 'grayscale(0.75) brightness(0.8)' : undefined, transition: 'filter 1s' }}>
        <PlayerAvatar player={player} team={team} size={size} />
      </div>
    </motion.div>
  )
}

export function BatIcon({ size = 22 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden><rect x="14.2" y="2" width="4.2" height="11" rx="1.4" transform="rotate(35 16 7)" fill="#e9c98a" stroke="#a16207" strokeWidth="1.2" /><path d="M12.5 12.5 5 20" stroke="#78350f" strokeWidth="2.6" strokeLinecap="round" /></svg>
}

export function BallIcon({ size = 22 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden><circle cx="12" cy="12" r="9" fill="#dc2626" stroke="#7f1d1d" strokeWidth="1.2" /><path d="M5 8c4 2 10 2 14 0M5 16c4-2 10-2 14 0" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" fill="none" strokeDasharray="1.5 2" /></svg>
}

export function StumpsIcon({ size = 22 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden><path d="M6 21V8M12 21V8M18 21V8" stroke="#f1f5f9" strokeWidth="2.2" strokeLinecap="round" /><path d="M5 6.5 10 5M14 5l5 1.5" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" /></svg>
}

export function StarIcon({ size = 22 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden><path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.3 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z" fill="#fbbf24" stroke="#92400e" strokeWidth="1.2" strokeLinejoin="round" /></svg>
}
