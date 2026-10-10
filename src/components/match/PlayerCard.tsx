import { AnimatePresence, motion } from 'framer-motion'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { overall } from '../../data/builders'
import { keeperIn } from '../../data/squad'
import type { Match } from '../../engine/match'
import type { Player, Team } from '../../types'
import { accentOf, PlayerAvatar, RatingBadge, ROLE_LABEL, StatBar, TeamCrest, tierOf } from '../ui'
import { dismissalText, economy, oversText, strikeRate } from './format'

const OpenCard = createContext<((id: string) => void) | null>(null)

/** A portrait that opens that player's card when clicked (anywhere inside a PlayerCardProvider). */
export function ClickAvatar(props: React.ComponentProps<typeof PlayerAvatar>) {
  const open = useContext(OpenCard)
  if (!open) return <PlayerAvatar {...props} />
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); open(props.player.id) }}
      aria-label={`${props.player.name}: view ratings`}
      title={`${props.player.name}: view ratings`}
      className="shrink-0 cursor-pointer rounded-full transition hover:scale-110 hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
    >
      <PlayerAvatar {...props} />
    </button>
  )
}

function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex items-baseline justify-between gap-3 text-sm"><span className="text-slate-400">{label}</span><span className="text-right font-semibold text-white">{children}</span></div>
}

function Card({ match, player, team, onClose }: { match: Match; player: Player; team: Team; onClose: () => void }) {
  const accent = accentOf(team)
  const ovr = overall(player)
  const tier = tierOf(ovr)
  const b = player.batting
  const w = player.bowling
  // what he has done in this match so far
  const batting = match.innings.flatMap((inn) => inn.batters.filter((x) => x.id === player.id).map((line) => ({ inn, line })))
  const bowling = match.innings.flatMap((inn) => { const line = inn.bowlers.get(player.id); return line ? [line] : [] })
  const captain = team.captainId === player.id
  const keeper = keeperIn(match.sides.find((s) => s.team.id === team.id)?.xi ?? [], team.keeperId)?.id === player.id

  return (
    <motion.div className="fixed inset-0 z-[70] grid place-items-center bg-black/65 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        role="dialog" aria-modal="true" aria-label={`${player.name}, player card`}
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 24, scale: 0.94, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 16, scale: 0.96, opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-3xl border border-line bg-ink shadow-2xl"
      >
        <div className="relative overflow-hidden px-6 pb-5 pt-6" style={{ background: `linear-gradient(135deg, ${team.colors.primary}cc, ${team.colors.secondary}55 55%, #10131c)` }}>
          <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 rounded-lg bg-black/40 px-2.5 py-1 text-sm font-bold text-white hover:bg-black/60">✕</button>
          <div className="flex items-center gap-4">
            <div className="rounded-full" style={{ boxShadow: `0 0 0 4px ${accent}, 0 10px 30px rgba(0,0,0,.5)` }}><PlayerAvatar player={player} team={team} size={104} /></div>
            <div className="min-w-0">
              <h2 className="font-display text-4xl leading-none tracking-wide text-white">{player.name}</h2>
              <div className="mt-1 flex items-center gap-2 text-sm text-slate-100"><TeamCrest team={team} size={22} /><span className="truncate">{team.name}</span></div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                <span className="rounded-full bg-black/40 px-2 py-0.5 font-bold text-white">{ROLE_LABEL[player.role]}</span>
                {captain && <span className="rounded-full bg-amber-400 px-2 py-0.5 font-bold text-black">Captain</span>}
                {keeper && <span className="rounded-full bg-sky-400 px-2 py-0.5 font-bold text-black">Keeper</span>}
                <span className="rounded-full bg-black/40 px-2 py-0.5 text-slate-200">{player.hand === 'L' ? 'Left' : 'Right'}-hand bat</span>
                {w && <span className="rounded-full bg-black/40 px-2 py-0.5 text-slate-200">{w.type}</span>}
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <RatingBadge value={ovr} size="lg" />
            <div><div className="font-display text-2xl leading-none" style={{ color: tier.color }}>{tier.label}</div><div className="text-xs text-slate-300">overall rating</div></div>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <section className="space-y-1.5">
            <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Batting</h3>
            <StatBar label="Technique" value={b.technique} color={accent} />
            <StatBar label="Power" value={b.power} color={accent} />
            <StatBar label="Temperament" value={b.temperament} color={accent} />
            <StatBar label="Running" value={b.running} color={accent} />
          </section>
          <section className="space-y-1.5">
            <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Bowling{w ? ` · ${w.type}` : ''}</h3>
            {w ? (<><StatBar label="Accuracy" value={w.accuracy} color={accent} /><StatBar label="Variation" value={w.variation} color={accent} /><StatBar label="Stamina" value={w.stamina} color={accent} /></>) : <p className="text-sm text-slate-500">Does not bowl.</p>}
          </section>
          <section className="space-y-1.5">
            <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Fielding</h3>
            <StatBar label={player.role === 'WK' ? 'Keeping' : 'Fielding'} value={player.fielding} color={accent} />
          </section>
          <section>
            <h3 className="mb-1.5 text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Traits</h3>
            <div className="flex flex-wrap gap-1.5">
              {player.traits.length === 0 && <span className="text-sm text-slate-500">None</span>}
              {player.traits.map((t) => <span key={t} className="rounded-full border border-line bg-panel-2 px-2.5 py-1 text-xs capitalize text-slate-200">{t.replace(/-/g, ' ')}</span>)}
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-panel p-3">
            <h3 className="mb-1.5 text-[11px] font-extrabold uppercase tracking-widest text-amber-300">In this match</h3>
            {batting.length === 0 && bowling.length === 0 && <p className="text-sm text-slate-500">Hasn't batted or bowled yet.</p>}
            {batting.map(({ inn, line }) => (
              <Line key={`b${inn.index}`} label="Batting">{line.runs} ({line.balls}) · {line.fours}x4 {line.sixes}x6 · SR {strikeRate(line.runs, line.balls)} <span className="font-normal text-slate-400">· {dismissalText(match, line, inn)}</span></Line>
            ))}
            {bowling.map((l, i) => (
              <Line key={`w${i}`} label="Bowling">{oversText(l.legalBalls)}-{l.maidens}-{l.runs}-{l.wickets} <span className="font-normal text-slate-400">· econ {economy(l)}</span></Line>
            ))}
          </section>
        </div>
      </motion.div>
    </motion.div>
  )
}

/** Wrap the match screen in this and any ClickAvatar inside it can open a player's card. */
export function PlayerCardProvider({ match, children }: { match: Match; children: React.ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const open = useCallback((id: string) => setOpenId(id), [])
  useEffect(() => {
    if (!openId) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpenId(null) } }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [openId])
  const found = useMemo(() => {
    if (!openId) return null
    for (const side of match.sides) { const p = side.xi.find((x) => x.id === openId); if (p) return { player: p, team: side.team } }
    return null
  }, [openId, match])
  return (
    <OpenCard.Provider value={open}>
      {children}
      <AnimatePresence>{found && <Card key={openId} match={match} player={found.player} team={found.team} onClose={() => setOpenId(null)} />}</AnimatePresence>
    </OpenCard.Provider>
  )
}
