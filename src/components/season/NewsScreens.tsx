import confetti from 'canvas-confetti'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { sfx } from '../../audio/sfx'
import type { Coach } from '../../data/coaches'
import type { AwardsNightData } from '../../season/stories'
import type { Injury } from '../../season/injuries'
import { SEVERITY_COLOR } from '../../season/injuries'
import type { Player, Team } from '../../types'
import { OriginTag, PlayerAvatar, RatingBadge, accentOf, tierOf } from '../ui'
import { TeamLogo } from './Details'

/** The common frame: a dark full-screen page with a coloured glow, a small tag, a close button, and the content centred. */
function Shell({ tag, color, children, onClose, label }: { tag: string; color: string; children: React.ReactNode; onClose: () => void; label: string }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <motion.div className="fixed inset-0 z-[80] flex flex-col bg-ink" style={{ paddingTop: 'var(--sat)', paddingBottom: 'var(--sab)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-label={label}>
      <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(ellipse at 50% 30%, ${color}44, transparent 65%)` }} />
      <div className="relative flex shrink-0 items-center justify-between px-3 pt-3">
        <span className="flex items-center gap-2 rounded bg-black/60 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-widest" style={{ color }}><span className="h-2 w-2 animate-pulse rounded-full" style={{ background: color }} />{tag}</span>
        <button onClick={onClose} aria-label="Close" className="rounded-full bg-white/10 px-3 py-1 text-sm font-bold text-white active:bg-white/20">✕</button>
      </div>
      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-5 py-4 text-center">{children}</div>
    </motion.div>
  )
}

const Cta = ({ onClick, children, color = '#fbbf24' }: { onClick: () => void; children: React.ReactNode; color?: string }) => (
  <button onClick={onClick} className="mt-6 w-full max-w-xs rounded-full border-2 px-8 py-3 font-display text-2xl leading-none tracking-wide text-black active:brightness-95" style={{ background: color, borderColor: '#ffffff88' }}>{children}</button>
)

function useCount(to: number, from = 0, ms = 1100, delay = 0.5) {
  const [n, setN] = useState(from)
  useEffect(() => {
    let id = 0
    const t = window.setTimeout(() => {
      const t0 = Date.now()
      id = window.setInterval(() => { const k = Math.min(1, (Date.now() - t0) / ms); setN(Math.round(from + (to - from) * (1 - (1 - k) ** 3))); if (k >= 1) window.clearInterval(id) }, 30)
    }, delay * 1000)
    return () => { window.clearTimeout(t); window.clearInterval(id) }
  }, [to, from, ms, delay])
  return n
}

// ---- Rating upgrades after a match -----------------------------------------------------------------------------------------------

export interface UpgradeRow { player: Player; team: Team; before: number; after: number }

function UpgradeCard({ row, i }: { row: UpgradeRow; i: number }) {
  const n = useCount(row.after, row.before, 1000, 0.6 + i * 0.35)
  const [fromTier, toTier] = [tierOf(row.before), tierOf(row.after)]
  const tierUp = fromTier.label !== toTier.label
  return (
    <motion.div className="flex items-center gap-3 rounded-2xl border border-line bg-panel p-3 text-left" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.35 }}>
      <PlayerAvatar profile player={row.player} team={row.team} size={52} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-bold text-white">{row.player.name}</div>
        <div className="flex items-center gap-2 text-sm text-slate-300"><span className="tabular-nums text-slate-400">{row.before}</span><span aria-hidden>→</span><span className="font-extrabold tabular-nums text-emerald-300">{row.after}</span><span className="rounded bg-emerald-500/20 px-1.5 text-xs font-extrabold text-emerald-300">▲ +{row.after - row.before}</span></div>
        {tierUp && <motion.div className="mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-black" style={{ background: toTier.color }} initial={{ scale: 0 }} animate={{ scale: [0, 1.3, 1] }} transition={{ delay: 1.8 + i * 0.35 }}>Tier up: {fromTier.label} to {toTier.label}</motion.div>}
      </div>
      <RatingBadge value={n} size="md" />
    </motion.div>
  )
}

/** Players who gained rating in the match you just played: the old rating counts up to the new one, and a tier jump gets its own badge. */
export function UpgradeScreen({ rows, onClose }: { rows: UpgradeRow[]; onClose: () => void }) {
  useEffect(() => { sfx.milestone() }, [])
  return (
    <Shell tag="Player upgrades" color="#34d399" onClose={onClose} label="Player upgrades">
      <motion.h2 className="font-display text-5xl leading-none tracking-wide text-white" initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 240, damping: 14 }} style={{ textShadow: '0 0 30px #34d399aa' }}>LEVEL UP!</motion.h2>
      <p className="mb-4 mt-1 text-sm text-slate-300">They played well, and it shows.</p>
      <div className="w-full max-w-md space-y-2">{rows.map((r, i) => <UpgradeCard key={r.player.id} row={r} i={i} />)}</div>
      <Cta onClick={onClose} color="#34d399">Nice</Cta>
    </Shell>
  )
}

// ---- Injury news ---------------------------------------------------------------------------------------------------------------

export interface InjuryRow { player: Player; team: Team; injury: Injury }

/** Breaking news: a TV bulletin with who is hurt, what it is and when he is back. */
export function InjuryNews({ rows, onClose }: { rows: InjuryRow[]; onClose: () => void }) {
  return (
    <Shell tag="Breaking news" color="#f87171" onClose={onClose} label="Injury news">
      <motion.div className="w-full max-w-md overflow-hidden rounded-2xl border border-red-400/40 bg-panel text-left" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 180, damping: 16 }}>
        <div className="flex items-center gap-2 bg-red-600 px-4 py-2"><span className="h-2 w-2 animate-pulse rounded-full bg-white" /><span className="font-display text-2xl leading-none tracking-wider text-white">INJURY UPDATE</span></div>
        <div className="divide-y divide-line/60">
          {rows.map((r, i) => (
            <motion.div key={r.player.id} className="flex items-center gap-3 p-3" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.3 }}>
              <PlayerAvatar profile player={r.player} team={r.team} size={52} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold text-white">{r.player.name}</div>
                <div className="text-sm text-slate-300">{r.injury.name}</div>
                <div className="text-xs text-slate-400">Out for {r.injury.days} {r.injury.days === 1 ? 'day' : 'days'}</div>
              </div>
              <span className="rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-black" style={{ background: SEVERITY_COLOR[r.injury.severity] }}>{r.injury.severity}</span>
            </motion.div>
          ))}
        </div>
        <div className="overflow-hidden bg-black/60 py-1.5 text-xs font-semibold text-slate-300"><motion.div className="whitespace-nowrap" animate={{ x: ['100%', '-100%'] }} transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}>Check your squad: an injured player cannot be in your XI · put a physio on your best players so it never happens · </motion.div></div>
      </motion.div>
      <Cta onClick={onClose} color="#f87171">Got it</Cta>
    </Shell>
  )
}

// ---- A new coach ---------------------------------------------------------------------------------------------------------------

/** A new year, a new coach: his name, the game he is from, what he is best at, and how he works. */
export function NewCoachScreen({ coach, team, onClose }: { coach: Coach; team: Team; onClose: () => void }) {
  const accent = accentOf(team)
  const stars = Math.max(1, Math.min(5, Math.round(coach.skill / 20)))
  return (
    <Shell tag="New coach" color="#818cf8" onClose={onClose} label="New coach">
      <motion.div className="text-sm font-bold uppercase tracking-[0.3em] text-indigo-200" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Welcome, coach</motion.div>
      <motion.div className="mt-4 grid h-32 w-32 place-items-center rounded-full text-6xl" style={{ background: `linear-gradient(135deg, ${accent}, #1e1b4b)`, boxShadow: `0 0 0 4px ${accent}, 0 0 50px #818cf8aa` }} initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.3, type: 'spring', stiffness: 180, damping: 12 }}><span aria-hidden>🎓</span></motion.div>
      <motion.h2 className="mt-4 font-display text-5xl leading-none tracking-wide text-white" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} style={{ textShadow: '0 0 30px #818cf8' }}>{coach.name}</motion.h2>
      <motion.div className="mt-1 text-slate-200" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>from {coach.game}</motion.div>
      <motion.div className="mt-3 flex items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>
        <span className="rounded-full bg-indigo-500/25 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-indigo-200">Best at {coach.specialty}</span>
        <span className="text-lg text-amber-300" aria-label={`${stars} out of 5`}>{'★'.repeat(stars)}<span className="text-slate-600">{'★'.repeat(5 - stars)}</span></span>
      </motion.div>
      <motion.p className="mt-3 max-w-sm text-sm italic text-slate-300" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}>“{coach.style}”</motion.p>
      <Cta onClick={onClose} color="#a5b4fc">Let's work</Cta>
    </Shell>
  )
}

// ---- The playoff race ----------------------------------------------------------------------------------------------------------

export function PlayoffNews({ status, team, competition, onClose }: { status: 'qualified' | 'eliminated'; team: Team; competition: string; onClose: () => void }) {
  const ok = status === 'qualified'
  useEffect(() => {
    if (!ok) return
    sfx.win()
    const t = window.setTimeout(() => confetti({ particleCount: 140, spread: 90, startVelocity: 36, origin: { x: 0.5, y: 0.4 }, colors: [accentOf(team), '#fbbf24', '#ffffff'], disableForReducedMotion: true, zIndex: 95 }), 500)
    return () => window.clearTimeout(t)
  }, [ok, team])
  return (
    <Shell tag={competition} color={ok ? '#34d399' : '#94a3b8'} onClose={onClose} label={ok ? 'Qualified' : 'Eliminated'}>
      <motion.div initial={{ scale: 0.3, opacity: 0, rotate: ok ? -15 : 0 }} animate={{ scale: 1, opacity: ok ? 1 : 0.7, rotate: 0 }} transition={{ type: 'spring', stiffness: 160, damping: 12 }}><TeamLogo team={team} size={120} /></motion.div>
      <motion.h2 className="mt-4 font-display leading-none tracking-wide" style={{ fontSize: 'clamp(44px, 15vw, 84px)', color: ok ? '#6ee7b7' : '#cbd5e1', textShadow: ok ? '0 0 40px #34d399aa' : 'none', WebkitTextStroke: '2px #05070d', paintOrder: 'stroke fill' }} initial={{ scale: 2.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.5, type: 'spring', stiffness: 220, damping: 14 }}>{ok ? 'QUALIFIED!' : 'ELIMINATED'}</motion.h2>
      <motion.p className="mt-2 max-w-sm text-slate-200" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>{ok ? `${team.name} are through to the knockouts of the ${competition}. Now it is win or go home.` : `${team.name} did not make the knockouts of the ${competition}. There is still the rest of the season.`}</motion.p>
      <Cta onClick={onClose} color={ok ? '#34d399' : '#cbd5e1'}>{ok ? 'On to the knockouts' : 'Back to it'}</Cta>
    </Shell>
  )
}

// ---- Deadline day --------------------------------------------------------------------------------------------------------------

export function DeadlineDay({ windowName, coins, squad, cap, offers, onMarket, onClose }: { windowName: string; coins: number; squad: number; cap: number; offers: number; onMarket: () => void; onClose: () => void }) {
  return (
    <Shell tag="Deadline day" color="#e879f9" onClose={onClose} label="Deadline day">
      <motion.div className="text-sm font-bold uppercase tracking-[0.3em] text-fuchsia-200" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{windowName}</motion.div>
      <motion.div className="mt-2 font-display leading-none tracking-wide text-white" style={{ fontSize: 'clamp(40px, 14vw, 78px)', textShadow: '0 0 40px #e879f9aa', WebkitTextStroke: '2px #2e0a3a', paintOrder: 'stroke fill' }} initial={{ scale: 2.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 14, delay: 0.2 }}>CLOSES TONIGHT</motion.div>
      <motion.div className="mt-4 grid w-full max-w-sm grid-cols-3 gap-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
        {[['Coins', String(coins), '#fbbf24'], ['Squad', `${squad}/${cap}`, squad >= cap ? '#f87171' : '#ffffff'], ['Offers', String(offers), '#38bdf8']].map(([label, value, color]) => (
          <div key={label} className="rounded-xl border border-line bg-panel p-3"><div className="font-display text-3xl leading-none" style={{ color }}>{value}</div><div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</div></div>
        ))}
      </motion.div>
      <motion.div className="mt-4 flex items-center gap-2 rounded-full bg-black/50 px-4 py-1.5 text-sm font-semibold text-slate-100" animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1.2, repeat: Infinity }}><span aria-hidden>⏰</span> Last chance to buy, sell or release</motion.div>
      <Cta onClick={onMarket} color="#f0abfc">Go to the market</Cta>
      <button onClick={onClose} className="mt-2 text-sm font-semibold text-slate-400 underline">Not now</button>
    </Shell>
  )
}

// ---- New talents ---------------------------------------------------------------------------------------------------------------

export interface TalentCard { player: Player; stars: number; price: number }

/** The window's best young players, each flipping over in turn. */
export function NewTalents({ cards, onClose }: { cards: TalentCard[]; onClose: () => void }) {
  return (
    <Shell tag="New talents" color="#fbbf24" onClose={onClose} label="New talents">
      <motion.h2 className="font-display text-5xl leading-none tracking-wide text-white" initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 240, damping: 14 }} style={{ textShadow: '0 0 30px #fbbf24aa' }}>FRESH FACES</motion.h2>
      <p className="mb-4 mt-1 text-sm text-slate-300">The best young players in this window's unsigned pool.</p>
      <div className="grid w-full max-w-md grid-cols-2 gap-2.5">
        {cards.map((c, i) => (
          <motion.div key={c.player.id} className="rounded-2xl border border-amber-400/40 bg-panel p-3" style={{ transformPerspective: 700 }} initial={{ rotateY: 90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} transition={{ delay: 0.4 + i * 0.4, duration: 0.5, ease: 'easeOut' }}>
            <div className="mx-auto w-fit"><PlayerAvatar profile player={c.player} team={{ colors: { primary: '#334155', secondary: '#94a3b8' } }} size={64} /></div>
            <div className="mt-1.5 truncate text-sm font-bold text-white">{c.player.name}</div>
            <div className="text-[11px] text-slate-400">{c.player.role}</div>
            <div className="text-sm text-amber-300" aria-label={`${c.stars} out of 5 stars`}>{'★'.repeat(c.stars)}<span className="text-slate-600">{'★'.repeat(5 - c.stars)}</span></div>
            <div className="mt-0.5 text-[11px]"><OriginTag playerId={c.player.id} /></div>
            <div className="mt-1 text-xs font-extrabold text-amber-200">{c.price} coins</div>
          </motion.div>
        ))}
      </div>
      <Cta onClick={onClose}>See them all</Cta>
    </Shell>
  )
}

// ---- Awards night --------------------------------------------------------------------------------------------------------------

type Page = { kind: 'award'; title: string; color: string; entry: { player: Player; team: Team; line: string } } | { kind: 'xi'; xi: AwardsNightData['xi'] }

/** The season's awards: the golden bat, the golden ball, the player of the year, then the team of the season as a formation. */
export function AwardsNight({ data, onClose }: { data: AwardsNightData; onClose: () => void }) {
  const pages: Page[] = []
  if (data.goldenBat) pages.push({ kind: 'award', title: 'Golden Bat', color: '#f97316', entry: data.goldenBat })
  if (data.goldenBall) pages.push({ kind: 'award', title: 'Golden Ball', color: '#a855f7', entry: data.goldenBall })
  if (data.player) pages.push({ kind: 'award', title: 'Player of the Year', color: '#fbbf24', entry: data.player })
  if (data.xi.length > 0) pages.push({ kind: 'xi', xi: data.xi })
  const [i, setI] = useState(0)
  const page = pages[i]
  useEffect(() => {
    if (!page || page.kind !== 'award') return
    sfx.award()
    const t = window.setTimeout(() => confetti({ particleCount: 110, spread: 90, startVelocity: 34, origin: { x: 0.5, y: 0.4 }, colors: [page.color, '#fde68a', '#ffffff'], disableForReducedMotion: true, zIndex: 95 }), 1400)
    return () => window.clearTimeout(t)
  }, [i, page])
  if (!page) return null
  const last = i === pages.length - 1
  const next = () => (last ? onClose() : setI(i + 1))
  const rows = page.kind === 'xi'
    ? [page.xi.filter((x) => x.player.role === 'WK'), page.xi.filter((x) => x.player.role === 'BAT'), page.xi.filter((x) => x.player.role === 'AR'), page.xi.filter((x) => x.player.role === 'BOWL')].filter((r) => r.length > 0)
    : []
  return (
    <Shell tag="Awards night" color={page.kind === 'award' ? page.color : '#fbbf24'} onClose={onClose} label="Awards night">
      <AnimatePresence mode="wait">
        <motion.div key={i} className="flex w-full flex-col items-center" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25 }}>
          {page.kind === 'award' ? (
            <>
              <div className="rounded-full px-6 py-1.5 font-display text-2xl tracking-[0.2em] text-black" style={{ background: page.color }}>{page.title.toUpperCase()}</div>
              <motion.div className="mt-6 rounded-full" style={{ boxShadow: `0 0 0 6px ${accentOf(page.entry.team)}, 0 0 60px ${page.color}aa` }} initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.9, type: 'spring', stiffness: 170, damping: 12 }}><PlayerAvatar profile player={page.entry.player} team={page.entry.team} size={140} /></motion.div>
              <motion.h2 className="mt-4 font-display text-5xl leading-none tracking-wide text-white" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }}>{page.entry.player.name}</motion.h2>
              <motion.div className="mt-1 text-slate-200" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}>{page.entry.team.name}</motion.div>
              <motion.div className="mt-2 text-lg font-extrabold" style={{ color: page.color }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}>{page.entry.line}</motion.div>
            </>
          ) : (
            <>
              <div className="rounded-full bg-gradient-to-b from-amber-300 to-amber-500 px-6 py-1.5 font-display text-2xl tracking-[0.2em] text-black">TEAM OF THE SEASON</div>
              <div className="mt-4 w-full max-w-md space-y-2.5 rounded-3xl border border-emerald-400/30 p-3" style={{ background: 'linear-gradient(180deg,#14532d99,#0f3d24cc)' }}>
                {rows.map((row, r) => (
                  <div key={r} className="flex justify-center gap-2">
                    {row.map((x, k) => (
                      <motion.div key={x.player.id} className="w-[72px] text-center" initial={{ opacity: 0, y: 20, scale: 0.6 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.3 + (r * 3 + k) * 0.18, type: 'spring', stiffness: 220, damping: 14 }}>
                        <div className="mx-auto w-fit"><PlayerAvatar profile player={x.player} team={x.team} size={48} /></div>
                        <div className="mt-0.5 truncate text-[11px] font-bold text-white">{x.player.name.split(' ')[0]}</div>
                        <div className="truncate text-[10px] text-emerald-200">{x.team.short} · {x.note}</div>
                      </motion.div>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>
      <Cta onClick={next} color={page.kind === 'award' ? page.color : '#fbbf24'}>{last ? 'Done' : 'Next award'}</Cta>
    </Shell>
  )
}
