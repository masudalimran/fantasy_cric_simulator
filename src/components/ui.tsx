import { originOf } from '../data/origin'
import { useStore } from '../store/useStore'
import { createContext, useContext, useState } from 'react'
import { playerImage, teamArt } from '../data/images'
import { useHideImages } from '../prefs'
import { frameFor, frameShape, GLYPHS } from './emblems'
import type { Player, Role, Team } from '../types'

export function luminance(hex: string): number {
  const n = parseInt(hex.replace('#', ''), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** The brighter of the two team colours, so it stays readable on the dark UI. */
const rgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '')
  const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.padEnd(6, '0')
  return [parseInt(f.slice(0, 2), 16) || 0, parseInt(f.slice(2, 4), 16) || 0, parseInt(f.slice(4, 6), 16) || 0]
}
/** How different two colours look (0 identical, about 440 black and white). */
const colorGap = (a: string, b: string) => { const [x, y] = [rgb(a), rgb(b)]; return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]) }

/**
 * The two colours to draw two teams in when they must be told apart (a chart with both teams on it). Each team keeps its
 * own accent unless the two are too alike, in which case the second one switches to its other colour, or to the most
 * different colour from a short list.
 */
export function distinctAccents(a: Pick<Team, 'colors'>, b: Pick<Team, 'colors'>): [string, string] {
  const first = accentOf(a)
  const NEAR = 110
  if (colorGap(first, accentOf(b)) >= NEAR) return [first, accentOf(b)]
  for (const alt of [b.colors.primary, b.colors.secondary]) if (colorGap(first, alt) >= NEAR && colorGap(alt, '#10131c') > 60) return [first, alt]
  const pool = ['#f8fafc', '#fbbf24', '#34d399', '#38bdf8', '#f472b6']
  return [first, [...pool].sort((x, y) => colorGap(first, y) - colorGap(first, x))[0]]
}

export const accentOf = (t: Pick<Team, 'colors'>) =>
  luminance(t.colors.primary) >= luminance(t.colors.secondary) ? t.colors.primary : t.colors.secondary

export function tierOf(rating: number): { label: string; color: string } {
  if (rating >= 90) return { label: 'Legendary', color: '#f472b6' }
  if (rating >= 82) return { label: 'Elite', color: '#fbbf24' }
  if (rating >= 72) return { label: 'Star', color: '#a78bfa' }
  if (rating >= 60) return { label: 'Solid', color: '#38bdf8' }
  if (rating >= 45) return { label: 'Fringe', color: '#94a3b8' }
  return { label: 'Tailender', color: '#64748b' }
}

export const ROLE_LABEL: Record<Role, string> = { BAT: 'Batsman', BOWL: 'Bowler', AR: 'All-rounder', WK: 'Keeper' }

export function RatingBadge({ value, size = 'md' }: { value: number; size?: 'sm' | 'md' | 'lg' }) {
  const { color } = tierOf(value)
  const dim = size === 'lg' ? 'h-14 w-14 text-3xl' : size === 'sm' ? 'h-8 w-8 text-base' : 'h-10 w-10 text-xl'
  return (
    <div
      className={`${dim} grid shrink-0 place-items-center rounded-lg font-display leading-none text-black`}
      style={{ background: `linear-gradient(145deg, ${color}, ${color}bb)`, boxShadow: `0 0 18px ${color}55` }}
    >
      {value}
    </div>
  )
}

/** Lets a portrait open that player's profile popup. Provided once, near the top of the app. */
export const ProfileContext = createContext<((playerId: string) => void) | null>(null)

/** Who holds the Orange Cap (most runs) and the Purple Cap (most wickets) in the season being looked at. Provided with the profile popups. */
export type CapKind = 'orange' | 'purple' | 'both'
export const CapsContext = createContext<Map<string, CapKind> | null>(null)

/** A little cap sitting on top of a portrait. Orange for the leading run scorer, purple for the leading wicket-taker (both if one player is both). */
function CapBadge({ kind, size }: { kind: CapKind; size: number }) {
  const w = Math.max(14, Math.round(size * 0.62))
  const cap = (fill: string, rim: string, key: string, rot: number, dx: number) => (
    <svg key={key} width={w} height={w * 0.7} viewBox="0 0 40 28" className="absolute drop-shadow-[0_1px_2px_rgba(0,0,0,.7)]" style={{ left: `calc(50% - ${w / 2}px + ${dx}px)`, top: -w * 0.5, transform: `rotate(${rot}deg)` }} aria-hidden>
      <path d="M4 22 C4 8 14 2 22 2 C30 2 36 8 36 22 Z" fill={fill} stroke={rim} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M2 22 H36 Q40 22 40 25 Q30 27 6 26 Q2 25 2 22 Z" fill={rim} />
      <circle cx="22" cy="3" r="2" fill={rim} />
      {/* a shine that sweeps across the cap */}
      <rect className="cap-glint" x="-12" y="0" width="9" height="28" fill="#fff" opacity="0.55" transform="skewX(-20)" clipPath="url(#capclip)" />
      <clipPath id="capclip"><path d="M4 22 C4 8 14 2 22 2 C30 2 36 8 36 22 Z" /></clipPath>
    </svg>
  )
  const title = kind === 'orange' ? 'Orange Cap: most runs this season' : kind === 'purple' ? 'Purple Cap: most wickets this season' : 'Orange Cap and Purple Cap: most runs and most wickets'
  return (
    <span className="pointer-events-none absolute inset-x-0 top-0 z-[2]" title={title} aria-label={title} role="img">
      {/* glitter: little stars that twinkle around the cap so it shows off */}
      {[{ x: 8, y: -w * 0.55, d: 0, s: 0.5 }, { x: size - 10, y: -w * 0.3, d: 0.7, s: 0.42 }, { x: size * 0.5, y: -w * 0.8, d: 1.3, s: 0.36 }].map((g, i) => (
        <span key={i} className="cap-twinkle absolute text-amber-100" style={{ left: g.x, top: g.y, fontSize: Math.max(8, w * g.s), animationDelay: `${g.d}s`, textShadow: '0 0 6px #fde68a, 0 0 12px #fbbf24' }}>✦</span>
      ))}
      {kind === 'both' ? <>{cap('#8b5cf6', '#5b21b6', 'p', 12, w * 0.28)}{cap('#f97316', '#c2410c', 'o', -12, -w * 0.28)}</> : kind === 'orange' ? cap('#f97316', '#c2410c', 'o', 0, 0) : cap('#8b5cf6', '#5b21b6', 'p', 0, 0)}
    </span>
  )
}

/** `profile`: clicking the portrait opens the player's profile (when the app offers one). */
export function PlayerAvatar({ player, team, size = 44, profile = false }: { player: Pick<Player, 'id' | 'name' | 'imageUrl'>; team: Pick<Team, 'colors'>; size?: number; profile?: boolean }) {
  const open = useContext(ProfileContext)
  const hideImages = useHideImages()
  const [failed, setFailed] = useState(false)
  const initials = player.name.replace(/[^A-Za-z0-9 ]/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
  const src = player.imageUrl ?? playerImage(player.id)
  const accent = accentOf(team)
  const cap = useContext(CapsContext)?.get(player.id)
  const face = (
    <div
      {...(profile && open ? { role: 'button', tabIndex: 0, title: `${player.name}: view profile`, onClick: (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); open(player.id) }, onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); open(player.id) } } } : {})}
      className={`relative shrink-0 overflow-hidden rounded-full ${profile && open ? 'cursor-pointer transition hover:scale-110 hover:brightness-110' : ''}`}
      style={{ width: size, height: size, background: `linear-gradient(135deg, ${team.colors.primary}, ${team.colors.secondary})`, boxShadow: `0 0 0 2px ${accent}66` }}
    >
      {failed || hideImages ? (
        <div className="grid h-full w-full place-items-center font-display text-white mix-blend-normal" style={{ fontSize: size * 0.42, textShadow: '0 1px 3px #000a' }}>
          {initials}
        </div>
      ) : (
        <img src={src} alt={player.name} className="h-full w-full object-cover object-top" onError={() => setFailed(true)} />
      )}
    </div>
  )
  if (!cap || size < 22) return face
  return <div className="relative shrink-0" style={{ width: size, height: size }}>{face}<CapBadge kind={cap} size={size} /></div>
}

/** +3 in green or -2 in red; nothing when there is no change. */
export function Delta({ n, className = '' }: { n: number; className?: string }) {
  if (!n) return null
  return <span className={`font-bold tabular-nums ${n > 0 ? 'text-emerald-400' : 'text-rose-400'} ${className}`}>{n > 0 ? `+${n}` : n}</span>
}

/** A rating bar. With `base`, it shows where the rating started and what it has become: 78 → 81 +3. */
export function StatBar({ label, value, color, base }: { label: string; value: number; color: string; base?: number }) {
  const changed = base !== undefined && base !== value
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 shrink-0 cursor-help text-slate-400" data-gloss={label}>{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
      {changed ? (
        <span className="flex w-24 items-center justify-end gap-1 tabular-nums" title={`Started at ${base}, now ${value}`}>
          <span className="text-slate-500">{base}→</span><span className="text-slate-100">{value}</span><Delta n={value - (base as number)} />
        </span>
      ) : <span className="w-7 text-right tabular-nums text-slate-200">{value}</span>}
    </div>
  )
}

const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** Emblem colour: the team's secondary if it reads on the badge, otherwise white or near-black. */
function emblemColor(badge: string, preferred: string) {
  if (contrast(badge, preferred) >= 2.6) return preferred
  return luminance(badge) > 0.4 ? '#0b0d14' : '#ffffff'
}

/** Team logo: a hand-drawn emblem per built-in team (custom teams pick one) inside a badge in the team's colours. */
export function TeamCrest({ team, size = 64 }: { team: Pick<Team, 'id' | 'short' | 'colors' | 'emblem' | 'logoUrl'>; size?: number }) {
  const [logoFailed, setLogoFailed] = useState(false)
  // a changed URL deserves a fresh attempt
  const [seenUrl, setSeenUrl] = useState(team.logoUrl)
  if (seenUrl !== team.logoUrl) { setSeenUrl(team.logoUrl); setLogoFailed(false) }
  if (team.logoUrl && !logoFailed) {
    return (
      <div
        className="grid shrink-0 place-items-center overflow-hidden rounded-[22%] bg-black/40 drop-shadow-[0_4px_10px_rgba(0,0,0,.55)]"
        style={{ width: size, height: size, border: `${Math.max(2, size / 22)}px solid ${team.colors.secondary}` }}
      >
        <img src={team.logoUrl} alt={`${team.short} logo`} referrerPolicy="no-referrer" className="h-full w-full object-contain p-[6%]" onError={() => setLogoFailed(true)} />
      </div>
    )
  }
  const frame = frameFor(team.id)
  const { path, inner } = frameShape(frame)
  const glyph = GLYPHS[team.emblem ?? team.id] ?? GLYPHS.star
  const badge = team.colors.primary
  const fg = emblemColor(badge, team.colors.secondary)
  const rim = luminance(team.colors.secondary) > luminance(badge) ? team.colors.secondary : emblemColor(badge, '#ffffff')
  const gid = `crest-${team.id}`
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`${team.short} logo`} className="shrink-0 overflow-visible drop-shadow-[0_4px_10px_rgba(0,0,0,.55)]">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor={badge} />
          <stop offset="1" stopColor={badge} stopOpacity=".78" />
        </linearGradient>
      </defs>
      <g fill={`url(#${gid})`} stroke={rim} strokeWidth="4" strokeLinejoin="round">{path}</g>
      <g transform={inner}>{glyph(fg, badge)}</g>
    </svg>
  )
}

/** Wide artwork if we have it (banner, then cover), with a team-colour fallback. */
export function TeamBackdrop({ team, className = '', strength = 0.55 }: { team: Pick<Team, 'id' | 'colors'>; className?: string; strength?: number }) {
  const art = teamArt(team.id)
  const src = art.banner ?? art.cover
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <div className="absolute inset-0" style={{ background: `linear-gradient(120deg, ${team.colors.primary}, ${team.colors.secondary}55)` }} />
      {src && <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover object-center" style={{ opacity: strength }} loading="lazy" />}
      <div className="absolute inset-0 bg-gradient-to-t from-panel via-panel/60 to-panel/10" />
    </div>
  )
}

/** "From Bleach": the anime or game a player comes from, so people who do not know it can tell. Shows nothing when it is not known. */
export function OriginTag({ playerId, className = '' }: { playerId: string; className?: string }) {
  const custom = useStore((s) => s.customTeams)
  const o = originOf(playerId, custom)
  if (!o) return null
  return (
    <span className={`inline-flex max-w-full items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 text-xs text-slate-100 ${className}`} title={`${o.universe === 'game' ? 'Game' : 'Anime'}: ${o.series}`}>
      <span aria-hidden>{o.universe === 'game' ? '🎮' : '🎌'}</span>
      <span className="truncate"><span className="text-slate-400">From </span><b className="font-semibold">{o.series}</b></span>
    </span>
  )
}
