import confetti from 'canvas-confetti'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { sfx } from '../../audio/sfx'
import { overall } from '../../data/builders'
import type { Transfer } from '../../season/types'
import type { Player, Team } from '../../types'
import { callName } from '../match/format'
import { PlayerAvatar, RatingBadge, TeamCrest, accentOf, tierOf } from '../ui'

/** One move to show: what happened, to whom, between which clubs, and a few of the teammates who greet him (or say goodbye). */
export interface TransferRow { t: Transfer; player: Player; from: Team | null; to: Team | null; mates: Player[] }

const hash = (s: string): number => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return (h >>> 0) / 4294967296 }
const pick = <T,>(list: T[], seed: string): T => list[Math.floor(hash(seed) * list.length) % list.length]
const first = (p: Player) => callName(p)

const WELCOME = ['Welcome to the club, {n}!', 'Great to have you with us, {n}.', 'Glad you are on our side now!', 'We needed someone like you.', 'Show us what you can do, {n}!', 'Let us win some trophies together.', 'Rooting for you, {n}.', 'The dressing room is yours, {n}.']
const WELCOME_STAR = ['A player like {n} on OUR team? Unreal!', 'We have just got a whole lot better.', '{n} is here! Everyone, stand up!', 'The best in the game, in our colours.']
const FAREWELL = ['We will miss you, {n}.', 'Good luck wherever you go.', 'It was a pleasure, {n}.', 'Thanks for everything.', 'You will always be one of us.']
const REPLY = ['Happy to be here. Let us get to work!', 'I will not let you down.', 'Cannot wait to get started.', 'Thank you all. It feels great.', 'New club, same hunger.']
const REPLY_STAR = ['Time to show the world what I can do.', 'I came here to win things.', 'Give me the ball and the bat. Let us go.']
const REPLY_BYE = ['Thanks, everyone. It was a great ride.', 'I will be back, you will see.', 'This is not the end of my story.']

/** What each tier of player gets: how big the confetti is, whether there is a flash, a spinning ring and a shine sweep, and the size of the name. */
const TIERS: Record<string, { burst: number; flash: boolean; ring: boolean; shine: boolean; name: string; stamp: string }> = {
  Legendary: { burst: 3, flash: true, ring: true, shine: true, name: 'text-6xl', stamp: 'WALKOUT' },
  Elite: { burst: 2, flash: false, ring: true, shine: true, name: 'text-5xl', stamp: 'BIG SIGNING' },
  Star: { burst: 1, flash: false, ring: true, shine: false, name: 'text-5xl', stamp: 'STAR SIGNING' },
  Solid: { burst: 0, flash: false, ring: false, shine: true, name: 'text-4xl', stamp: 'SIGNED' },
  Fringe: { burst: 0, flash: false, ring: false, shine: false, name: 'text-4xl', stamp: 'SIGNED' },
  Tailender: { burst: 0, flash: false, ring: false, shine: false, name: 'text-4xl', stamp: 'SIGNED' },
}

function Bubble({ who, team, text, delay, right = false }: { who: Player; team: Team | null; text: string; delay: number; right?: boolean }) {
  return (
    <motion.div className={`flex items-end gap-2 ${right ? 'flex-row-reverse' : ''}`} initial={{ opacity: 0, y: 14, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay, type: 'spring', stiffness: 260, damping: 20 }}>
      {team ? <PlayerAvatar player={who} team={team} size={34} /> : <span className="grid h-[34px] w-[34px] place-items-center rounded-full bg-slate-700 text-xs font-bold text-white">{first(who).slice(0, 1)}</span>}
      <div className={`max-w-[75%] rounded-2xl px-3 py-1.5 text-left text-[13px] leading-snug text-white ${right ? 'rounded-br-sm bg-indigo-500/80' : 'rounded-bl-sm bg-white/12'}`} style={right ? undefined : { background: 'rgba(255,255,255,0.12)' }}>
        <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-300">{first(who)}</div>{text}
      </div>
    </motion.div>
  )
}

/** One player's arrival (or goodbye): crests, the card coming in the way his tier deserves, the headline, and the chat with his new teammates. */
function TransferCard({ row, mine, onNext, last }: { row: TransferRow; mine: string | null; onNext: () => void; last: boolean }) {
  const { t, player, from, to, mates } = row
  const left = t.kind === 'release' || !to
  const ovr = overall(player)
  const tier = tierOf(ovr)
  const cfg = TIERS[tier.label]
  const club = (left ? from : to) ?? to ?? from
  const accent = club ? accentOf(club) : tier.color
  const ownClub = !!mine && (to?.id === mine || from?.id === mine)
  const star = tier.label === 'Legendary' || tier.label === 'Elite' || tier.label === 'Star'
  const n = first(player)
  const lines = useMemo(() => mates.slice(0, 3).map((m, i) => (left ? pick(FAREWELL, t.id + m.id) : pick(star ? [...WELCOME_STAR, ...WELCOME.slice(0, 3)] : WELCOME, t.id + m.id + i)).replace('{n}', n)), [mates, t.id, left, star, n])
  const reply = left ? pick(REPLY_BYE, t.id) : pick(star ? REPLY_STAR : REPLY, t.id)
  useEffect(() => {
    if (left) { sfx.pops(2); return }
    sfx.cheer(0.4 + 0.15 * cfg.burst)
    const timers: number[] = []
    const shoot = (at: number, o: Parameters<typeof confetti>[0]) => timers.push(window.setTimeout(() => confetti({ disableForReducedMotion: true, colors: [tier.color, accent, '#ffffff'], ...o }), at))
    if (cfg.burst >= 1) shoot(1100, { particleCount: 70, spread: 80, origin: { y: 0.4 } })
    if (cfg.burst >= 2) { shoot(1500, { particleCount: 60, angle: 60, spread: 60, origin: { x: 0, y: 0.6 } }); shoot(1500, { particleCount: 60, angle: 120, spread: 60, origin: { x: 1, y: 0.6 } }) }
    if (cfg.burst >= 3) for (let k = 0; k < 4; k++) shoot(2000 + k * 450, { particleCount: 90, spread: 100, startVelocity: 45, origin: { x: 0.2 + 0.2 * k, y: 0.3 } })
    return () => timers.forEach(window.clearTimeout)
  }, [t.id, left, cfg.burst, tier.color, accent])
  const [ready, setReady] = useState(false)
  useEffect(() => { const id = window.setTimeout(() => setReady(true), 2600); return () => window.clearTimeout(id) }, [])
  return (
    <motion.div className="relative flex w-full max-w-md flex-col items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.3 }}>
      {cfg.flash && !left && <motion.div className="pointer-events-none fixed inset-0 z-0 bg-white" initial={{ opacity: 0.9 }} animate={{ opacity: 0 }} transition={{ duration: 0.9 }} />}
      {/* the clubs: his old one, an arrow, his new one (or the club he is leaving) */}
      <div className="flex items-center gap-4">
        {from && <motion.div initial={{ x: 0, opacity: 0 }} animate={{ x: 0, opacity: left ? 1 : 0.55 }} transition={{ delay: 0.1 }}><TeamCrest team={from} size={left ? 64 : 44} /></motion.div>}
        {from && to && <motion.span className="text-2xl text-slate-300" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>→</motion.span>}
        {to && !left && <motion.div initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.5, type: 'spring' }}><TeamCrest team={to} size={64} /></motion.div>}
        {!from && !left && <motion.span className="rounded-full bg-emerald-400 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-black" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2 }}>Free agent</motion.span>}
      </div>
      {ownClub && <div className="mt-1 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-black">Your club</div>}
      {/* the player's card */}
      <div className="relative mt-4 grid place-items-center">
        {cfg.ring && !left && <motion.div className="absolute h-44 w-44 rounded-full" style={{ background: `conic-gradient(from 0deg, ${tier.color}, transparent 30%, ${accent}, transparent 70%, ${tier.color})`, filter: 'blur(2px)' }} initial={{ rotate: 0, opacity: 0 }} animate={{ rotate: 360, opacity: 0.9 }} transition={{ rotate: { duration: 5, repeat: Infinity, ease: 'linear' }, opacity: { delay: 0.8, duration: 0.6 } }} />}
        <motion.div className="relative overflow-hidden rounded-full" style={{ boxShadow: `0 0 0 4px ${left ? '#64748b' : tier.color}, 0 0 40px ${left ? '#00000088' : tier.color + '99'}`, filter: left ? 'grayscale(0.85)' : undefined }} initial={{ scale: cfg.burst >= 3 ? 3 : 0.2, opacity: 0, y: cfg.burst >= 3 ? 0 : 40 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ delay: 0.8, type: 'spring', stiffness: cfg.burst >= 2 ? 120 : 200, damping: cfg.burst >= 2 ? 11 : 17 }}>
          <PlayerAvatar player={player} team={(left ? from : to) ?? from ?? to!} size={132} />
          {cfg.shine && !left && <motion.div className="pointer-events-none absolute inset-y-0 w-10 -skew-x-12 bg-white/45" initial={{ left: '-30%' }} animate={{ left: '130%' }} transition={{ delay: 1.6, duration: 0.9 }} />}
        </motion.div>
        <motion.div className="absolute -right-3 -top-1" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.3, type: 'spring' }}><RatingBadge value={ovr} size="md" /></motion.div>
      </div>
      <motion.div className="mt-3 rounded-full px-3 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.25em] text-black" style={{ background: left ? '#94a3b8' : tier.color }} initial={{ opacity: 0, scale: 1.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.4 }}>{left ? 'RELEASED' : cfg.stamp}</motion.div>
      <motion.h2 className={`mt-1 font-display ${cfg.name} leading-none tracking-wide text-white`} style={{ textShadow: `0 0 28px ${left ? '#94a3b8' : tier.color}` }} initial={{ opacity: 0, y: 18, scale: cfg.burst >= 2 ? 1.5 : 1 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 1.6, type: 'spring', stiffness: 220, damping: 16 }}>{player.name}</motion.h2>
      <motion.div className="mt-1 text-sm font-semibold text-slate-200" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}>
        {left ? `leaves ${from?.name ?? 'the club'}` : t.kind === 'buy' ? `joins ${to?.name} from ${from?.name}` : `signs for ${to?.name}`}
        {t.fee > 0 && <span className="ml-2 rounded bg-amber-400/20 px-1.5 py-0.5 text-xs font-extrabold text-amber-300">{t.fee} {t.fee === 1 ? 'coin' : 'coins'}</span>}
      </motion.div>
      {/* the chat: the teammates, one after another, and his answer */}
      <div className="mt-4 w-full space-y-2">
        {mates.slice(0, 3).map((m, i) => <Bubble key={m.id} who={m} team={left ? from : to} text={lines[i]} delay={2.6 + i * 1.1} />)}
        <Bubble who={player} team={(left ? from : to) ?? null} text={reply} delay={2.6 + Math.min(3, mates.length) * 1.1} right />
      </div>
      <motion.button onClick={onNext} className="mt-5 w-full max-w-xs cursor-pointer rounded-full border-2 border-white/50 px-8 py-3 font-display text-2xl leading-none tracking-wide text-black active:brightness-95" style={{ background: accent, boxShadow: ready ? `0 0 24px ${accent}` : undefined }} initial={{ opacity: 0 }} animate={{ opacity: ready ? 1 : 0.35 }}>{last ? 'Done' : 'Next player'}</motion.button>
    </motion.div>
  )
}

/** The day's moves, one player at a time, in the style of a club's signing videos: crests, a walkout-style card by tier, and the teammates' welcome (or goodbye). */
export function TransferNews({ rows, mine, extra, onClose }: { rows: TransferRow[]; mine: string | null; extra: number; onClose: () => void }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  const row = rows[i]
  if (!row) return null
  const next = () => (i + 1 >= rows.length ? onClose() : setI(i + 1))
  const club = (row.t.kind === 'release' ? row.from : row.to) ?? row.from ?? row.to
  return (
    <motion.div className="fixed inset-0 z-[80] flex flex-col bg-ink" style={{ paddingTop: 'var(--sat)', paddingBottom: 'var(--sab)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-label="Transfers">
      <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(ellipse at 50% 25%, ${club ? accentOf(club) : '#6366f1'}55, transparent 65%)` }} />
      <div className="relative flex shrink-0 items-center justify-between px-3 pt-3">
        <span className="flex items-center gap-2 rounded bg-black/60 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-widest text-sky-200"><span className="h-2 w-2 animate-pulse rounded-full bg-sky-300" />Transfer news · {i + 1} of {rows.length}{extra > 0 ? ` (+${extra} more)` : ''}</span>
        <button onClick={onClose} className="cursor-pointer rounded-full bg-white/10 px-3 py-1 text-sm font-bold text-white active:bg-white/20">Skip all</button>
      </div>
      <div className="relative flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-5 py-4 text-center">
        <AnimatePresence mode="wait"><TransferCard key={row.t.id} row={row} mine={mine} onNext={next} last={i + 1 >= rows.length} /></AnimatePresence>
      </div>
    </motion.div>
  )
}
