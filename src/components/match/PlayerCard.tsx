import { AnimatePresence } from 'framer-motion'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { overall } from '../../data/builders'
import { keeperIn } from '../../data/squad'
import type { Match } from '../../engine/match'
import type { Player, Team } from '../../types'
import { Sheet } from '../Sheet'
import { selectSession, useStore, useTeams } from '../../store/useStore'
import { OverallStats } from '../season/OverallStats'
import { CareerPath, RecentMatches } from '../season/Details'
import { useTeamMap } from '../season/shared'
import type { BatStat, BowlStat } from '../../season/stats'
import { accentOf, Delta, PlayerAvatar, RatingBadge, ROLE_LABEL, StatBar, tierOf } from '../ui'
import { TeamLogo } from '../season/Details'
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

function Card({ match, player, team, career, onClose }: { match: Match; player: Player; team: Team; career: boolean; onClose: () => void }) {
  const baseTeams = useTeams()
  const careerTeams = useTeamMap()
  const session = useStore(selectSession)
  // every season of the career, oldest first, the last being the one being played (this match isn't recorded in it yet)
  const seasons = useMemo(() => (session ? [...(session.history ?? []), session.season] : []), [session])
  // in a career match: where his ratings started, to show how the career has moved them
  const baseP = career ? baseTeams.find((t) => t.id === team.id)?.players.find((p) => p.id === player.id) : undefined
  const accent = accentOf(team)
  const ovr = overall(player)
  const tier = tierOf(ovr)
  const b = player.batting
  const w = player.bowling
  // what he has done in this match so far
  const batting = match.innings.flatMap((inn) => inn.batters.filter((x) => x.id === player.id).map((line) => ({ inn, line })))
  const matchSix = match.innings.flatMap((i) => i.log).filter((e) => e.strikerId === player.id && e.boundary === 6).reduce((m, e) => Math.max(m, e.distance ?? 0), 0)
  const bowling = match.innings.flatMap((inn) => { const line = inn.bowlers.get(player.id); return line ? [line] : [] })
  // what he has done in this match so far, as season-style lines (added to his overall stats while the match is on)
  const liveStats = match.isOver ? undefined : (() => {
    let bat: BatStat | undefined
    let bowl: BowlStat | undefined
    for (const { line } of batting) bat = { id: player.id, matches: 1, innings: 1, notOuts: line.dismissal ? 0 : 1, runs: line.runs, balls: line.balls, fours: line.fours, sixes: line.sixes, high: line.runs, highNotOut: !line.dismissal, fifties: line.runs >= 50 && line.runs < 100 ? 1 : 0, hundreds: line.runs >= 100 ? 1 : 0, ducks: line.runs === 0 && line.dismissal ? 1 : 0, batApps: 1, longSix: match.innings.flatMap((i) => i.log).filter((e) => e.strikerId === player.id && e.boundary === 6).reduce((m, e) => Math.max(m, e.distance ?? 0), 0) }
    for (const l of bowling) if (l.legalBalls > 0) bowl = { id: player.id, matches: 1, balls: l.legalBalls, runs: l.runs, wickets: l.wickets, maidens: l.maidens, bestW: l.wickets, bestR: l.runs, fiveW: l.wickets >= 5 ? 1 : 0, bowlApps: 1 }
    return { bat, bowl } // being in the XI is enough to count the match, even before he has batted or bowled
  })()
  const captain = team.captainId === player.id
  const keeper = keeperIn(match.sides.find((s) => s.team.id === team.id)?.xi ?? [], team.keeperId)?.id === player.id

  return (
    <Sheet label={`${player.name}, player card`} onClose={onClose} size="sm">
      <div>
        <div className="relative overflow-hidden px-6 pb-5 pt-6" style={{ background: `linear-gradient(135deg, ${team.colors.primary}cc, ${team.colors.secondary}55 55%, #10131c)` }}>
          <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 rounded-lg bg-black/40 px-2.5 py-1 text-sm font-bold text-white hover:bg-black/60">✕</button>
          <div className="flex items-center gap-4">
            <div className="rounded-full" style={{ boxShadow: `0 0 0 4px ${accent}, 0 10px 30px rgba(0,0,0,.5)` }}><PlayerAvatar player={player} team={team} size={104} /></div>
            <div className="min-w-0">
              <h2 className="font-display text-4xl leading-none tracking-wide text-white">{player.name}</h2>
              <div className="mt-1 flex items-center gap-2 text-sm text-slate-100"><TeamLogo team={team} size={22} /><span className="truncate">{team.name}</span></div>
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
            <div><div className="font-display text-2xl leading-none" style={{ color: tier.color }}>{tier.label}</div><div className="text-xs text-slate-300">overall rating</div>{baseP && overall(baseP) !== ovr && <div className="mt-0.5 text-xs tabular-nums" title="Where he started, and what he is now"><span className="text-slate-400">{overall(baseP)}→</span><span className="text-white">{ovr}</span> <Delta n={ovr - overall(baseP)} className="text-sm" /></div>}</div>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <section className="space-y-1.5">
            <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Batting</h3>
            <StatBar label="Technique" value={b.technique} base={baseP?.batting.technique} color={accent} />
            <StatBar label="Power" value={b.power} base={baseP?.batting.power} color={accent} />
            <StatBar label="Temperament" value={b.temperament} base={baseP?.batting.temperament} color={accent} />
            <StatBar label="Running" value={b.running} base={baseP?.batting.running} color={accent} />
          </section>
          <section className="space-y-1.5">
            <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Bowling{w ? ` · ${w.type}` : ''}</h3>
            {w ? (<><StatBar label="Accuracy" value={w.accuracy} base={baseP?.bowling?.accuracy} color={accent} /><StatBar label="Variation" value={w.variation} base={baseP?.bowling?.variation} color={accent} /><StatBar label="Stamina" value={w.stamina} base={baseP?.bowling?.stamina} color={accent} /></>) : <p className="text-sm text-slate-500">Does not bowl.</p>}
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
            <h3 className="mb-1.5 text-[11px] font-extrabold uppercase tracking-widest text-sky-300">Overall stats</h3>
            {career && seasons.length > 0 ? <OverallStats playerId={player.id} seasons={seasons} live={liveStats} /> : <p className="text-sm text-slate-500">Season and career numbers are kept in a career. This is a friendly.</p>}
          </section>

          {career && seasons.length > 0 && <RecentMatches season={seasons[seasons.length - 1]} playerId={player.id} teamId={team.id} teams={careerTeams} />}
          {career && seasons.length > 0 && <CareerPath season={seasons[seasons.length - 1]} playerId={player.id} teams={careerTeams} />}

          <section className="rounded-2xl border border-line bg-panel p-3">
            <h3 className="mb-1.5 text-[11px] font-extrabold uppercase tracking-widest text-amber-300">In this match</h3>
            {batting.length === 0 && bowling.length === 0 && <p className="text-sm text-slate-500">Hasn't batted or bowled yet.</p>}
            {batting.map(({ inn, line }) => (
              <Line key={`b${inn.index}`} label="Batting">{line.runs} ({line.balls}) · {line.fours}x4 {line.sixes}x6 · SR {strikeRate(line.runs, line.balls)} <span className="font-normal text-slate-400">· {dismissalText(match, line, inn)}</span></Line>
            ))}
            {matchSix > 0 && <Line label="Longest six">{matchSix} m</Line>}
            {bowling.map((l, i) => (
              <Line key={`w${i}`} label="Bowling">{oversText(l.legalBalls)}-{l.maidens}-{l.runs}-{l.wickets} <span className="font-normal text-slate-400">· econ {economy(l)}</span></Line>
            ))}
          </section>
        </div>
      </div>
    </Sheet>
  )
}

/** Wrap the match screen in this and any ClickAvatar inside it can open a player's card. */
export function PlayerCardProvider({ match, children, career = false }: { match: Match; children: React.ReactNode; career?: boolean }) {
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
      <AnimatePresence>{found && <Card key={openId} match={match} player={found.player} team={found.team} career={career} onClose={() => setOpenId(null)} />}</AnimatePresence>
    </OpenCard.Provider>
  )
}
