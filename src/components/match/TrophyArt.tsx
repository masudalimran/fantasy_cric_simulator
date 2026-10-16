import { useId } from 'react'

/** Six different trophies, so each tournament has a cup of its own: a goblet, a shield, a globe, a plate, a column and a crown. */
export type TrophyKind = 'cup' | 'shield' | 'globe' | 'plate' | 'column' | 'crown'
export const TROPHY_KINDS: TrophyKind[] = ['cup', 'shield', 'globe', 'plate', 'column', 'crown']

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }
/** The trophy a competition plays for: a tournament keeps the same one every year, a series always plays for a plate. */
export const trophyOf = (competition: { id: string; kind: string }): TrophyKind => {
  const own = TROPHY_KINDS.filter((k) => k !== 'plate')
  return competition.kind === 'series' ? 'plate' : own[hash(competition.id) % own.length]
}

/**
 * A trophy drawn in gold, with a gem and ribbon in the tournament's colour. `shine` makes it glint (leave it off in lists).
 */
export function TrophyArt({ kind, size = 120, accent = '#38bdf8', shine = false }: { kind: TrophyKind; size?: number; accent?: string; shine?: boolean }) {
  const gid = useId().replace(/:/g, '')
  const gold = `url(#g${gid})`
  const dark = '#92400e'
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true" style={{ filter: 'drop-shadow(0 6px 14px rgba(251,191,36,.5))' }}>
      <defs>
        <linearGradient id={`g${gid}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fde68a" /><stop offset="0.5" stopColor="#f59e0b" /><stop offset="1" stopColor="#b45309" /></linearGradient>
        <radialGradient id={`o${gid}`} cx="0.35" cy="0.3" r="0.8"><stop offset="0" stopColor="#fff7d6" /><stop offset="0.45" stopColor="#fbbf24" /><stop offset="1" stopColor="#92400e" /></radialGradient>
      </defs>
      {kind === 'cup' && (
        <>
          <path d="M32 14h56v28c0 18-12 30-28 30S32 60 32 42z" fill={gold} stroke={dark} strokeWidth="2.5" />
          <path d="M32 22H16c0 18 8 28 20 30M88 22h16c0 18-8 28-20 30" fill="none" stroke={gold} strokeWidth="6" strokeLinecap="round" />
          <rect x="54" y="72" width="12" height="16" fill={gold} />
          <rect x="38" y="88" width="44" height="12" rx="3" fill={gold} stroke={dark} strokeWidth="2" />
          <circle cx="60" cy="38" r="7" fill={accent} stroke={dark} strokeWidth="1.5" />
        </>
      )}
      {kind === 'shield' && (
        <>
          <path d="M60 8 100 20v34c0 26-18 42-40 52C38 96 20 80 20 54V20z" fill={gold} stroke={dark} strokeWidth="2.5" />
          <path d="M60 18 90 27v27c0 19-13 31-30 39-17-8-30-20-30-39V27z" fill={accent} opacity="0.85" stroke={dark} strokeWidth="1.5" />
          <path d="m60 34 5.6 11.4 12.6 1.8-9.1 8.9 2.2 12.5L60 62.600l-11.300 6 2.200-12.500-9.100-8.900 12.600-1.800z" fill="#fde68a" stroke={dark} strokeWidth="1.2" />
          <rect x="40" y="104" width="40" height="8" rx="3" fill={gold} stroke={dark} strokeWidth="2" />
        </>
      )}
      {kind === 'globe' && (
        <>
          <circle cx="60" cy="48" r="34" fill={`url(#o${gid})`} stroke={dark} strokeWidth="2.5" />
          <ellipse cx="60" cy="48" rx="34" ry="11" fill="none" stroke={dark} strokeWidth="1.6" opacity="0.7" />
          <ellipse cx="60" cy="48" rx="12" ry="34" fill="none" stroke={dark} strokeWidth="1.6" opacity="0.7" />
          <path d="M26 56c20 12 48 12 68 0" fill="none" stroke={accent} strokeWidth="5" strokeLinecap="round" />
          <rect x="52" y="82" width="16" height="12" fill={gold} />
          <rect x="34" y="94" width="52" height="12" rx="3" fill={gold} stroke={dark} strokeWidth="2" />
        </>
      )}
      {kind === 'plate' && (
        <>
          <ellipse cx="60" cy="44" rx="48" ry="16" fill={gold} stroke={dark} strokeWidth="2.5" />
          <ellipse cx="60" cy="42" rx="38" ry="10" fill={accent} opacity="0.8" stroke={dark} strokeWidth="1.4" />
          <path d="M44 42 60 36l16 6-16 6z" fill="#fde68a" stroke={dark} strokeWidth="1" />
          <path d="M52 58c0 10 2 18 8 24 6-6 8-14 8-24z" fill={gold} stroke={dark} strokeWidth="2" />
          <rect x="36" y="86" width="48" height="14" rx="3" fill={gold} stroke={dark} strokeWidth="2" />
        </>
      )}
      {kind === 'column' && (
        <>
          <path d="M44 14h32l6 56H38z" fill={gold} stroke={dark} strokeWidth="2.5" />
          <path d="m60 22 4.500 9.200 10.100 1.500-7.300 7.100 1.700 10.100L60 45l-9 4.900 1.700-10.100-7.300-7.100 10.100-1.500z" fill={accent} stroke={dark} strokeWidth="1.2" />
          <rect x="36" y="70" width="48" height="10" rx="2" fill={gold} stroke={dark} strokeWidth="2" />
          <rect x="28" y="80" width="64" height="20" rx="3" fill={gold} stroke={dark} strokeWidth="2" />
          <path d="M20 40c-6 14-2 28 10 38M100 40c6 14 2 28-10 38" fill="none" stroke={gold} strokeWidth="5" strokeLinecap="round" />
        </>
      )}
      {kind === 'crown' && (
        <>
          <path d="M18 70 26 26l22 24 12-30 12 30 22-24 8 44z" fill={gold} stroke={dark} strokeWidth="2.5" strokeLinejoin="round" />
          <rect x="18" y="70" width="84" height="14" rx="3" fill={gold} stroke={dark} strokeWidth="2" />
          {[34, 60, 86].map((x) => <circle key={x} cx={x} cy="77" r="4.500" fill={accent} stroke={dark} strokeWidth="1.2" />)}
          <circle cx="26" cy="24" r="4" fill="#fde68a" stroke={dark} strokeWidth="1.2" /><circle cx="60" cy="16" r="4" fill="#fde68a" stroke={dark} strokeWidth="1.2" /><circle cx="94" cy="24" r="4" fill="#fde68a" stroke={dark} strokeWidth="1.2" />
          <rect x="30" y="92" width="60" height="12" rx="3" fill={gold} stroke={dark} strokeWidth="2" />
        </>
      )}
      <path d="M46 20c-1 14 2 26 8 34" fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="3.500" strokeLinecap="round" />
      {shine && <path d="M92 14l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="#fff" opacity="0.9"><animate attributeName="opacity" values="0;1;0" dur="2.2s" repeatCount="indefinite" /></path>}
    </svg>
  )
}
