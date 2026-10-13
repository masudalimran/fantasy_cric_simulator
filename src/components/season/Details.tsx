import { movesOf, teamOnDate } from '../../season/market'
import { AnimatePresence } from 'framer-motion'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { overall } from '../../data/builders'
import { paths } from '../../routes'
import { formatDate } from '../../season/dates'
import { ATTR_LABEL } from '../../season/progression'
import { average, bowlAverage, collect, economy as bowlEcon, strikeRate, topBatsmen, topBowlers } from '../../season/stats'
import type { AttrKey, BatLine, BowlLine, MatchSummary, Season } from '../../season/types'
import { useTeams, useViewedSeason } from '../../store/useStore'
import type { Player, Team } from '../../types'
import { oversText } from '../match/format'
import { Sheet } from '../Sheet'
import { CapsContext, Delta, PlayerAvatar, ProfileContext, RatingBadge, ROLE_LABEL, StatBar, TeamCrest, accentOf, tierOf } from '../ui'
import { competitionName, FixtureRow, usePlayerIndex, useTeamMap } from './shared'

type Entry = { kind: 'match'; id: string } | { kind: 'player'; id: string } | { kind: 'team'; id: string }
interface Api { openMatch: (fixtureId: string) => void; openPlayer: (playerId: string) => void; openTeam: (teamId: string) => void }
const Ctx = createContext<Api | null>(null)

/** Open a finished match or a player from anywhere inside a career. Returns null outside one. */
export const useDetails = () => useContext(Ctx)

const overs = (balls: number) => oversText(balls)

function Shell({ z, label, onClose, children }: { z: number; label: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <Sheet z={z} label={label} onClose={onClose} size="lg">
      <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 z-10 hidden rounded-lg border border-line bg-black/40 px-2.5 py-1 text-sm font-bold text-slate-200 hover:border-slate-400 md:block">✕</button>
      {children}
    </Sheet>
  )
}

// ---- A finished match ------------------------------------------------------

function MatchDialog({ season, fixtureId, z, onClose }: { season: Season; fixtureId: string; z: number; onClose: () => void }) {
  const [tab, setTab] = useState<'summary' | 'scorecard'>('summary')
  const teams = useTeamMap()
  const index = usePlayerIndex()
  const api = useDetails()
  const fixture = season.fixtures.find((f) => f.id === fixtureId)
  const res: MatchSummary | undefined = season.results[fixtureId]
  const comp = fixture ? season.competitions.find((c) => c.id === fixture.competitionId) : undefined
  const roster = season.roster ?? []
  const sides = useMemo(() => {
    if (!fixture || !res) return []
    const built = [fixture.homeId, fixture.awayId].map((id) => {
      const team = teams.get(id as string)
      const own = new Set(team?.players.map((p) => p.id))
      const bat = (res.bat ?? []).filter((l: BatLine) => own.has(roster[l[0]]))
      const bowl = (res.bowl ?? []).filter((l: BowlLine) => own.has(roster[l[0]]))
      return { team, score: res.scores[id as string], bat, bowl, first: res.bat?.[0] ? own.has(roster[res.bat[0][0]]) : false }
    })
    // the side that batted first comes first, as in a TV graphic
    const firstIdx = built.some((s) => s.first) ? built.findIndex((s) => s.first) : Object.keys(res.scores)[0] === fixture.awayId ? 1 : 0
    return firstIdx === 1 ? [built[1], built[0]] : built
  }, [fixture, res, teams, roster])
  if (!fixture || !res || sides.some((s) => !s.team)) return null

  const nameOf = (i: number) => index.get(roster[i])?.player.name ?? roster[i]
  const idOf = (i: number) => roster[i]
  const motm = res.playerOfMatchId ? index.get(res.playerOfMatchId) : undefined

  const who = (id: string, team: Team, extra?: React.ReactNode) => {
    const d = season.changes?.[fixtureId]?.[id]
    return (
      <button onClick={() => api?.openPlayer(id)} className="flex min-w-0 cursor-pointer items-center gap-2 text-left hover:text-white">
        {index.get(id) && <PlayerAvatar player={index.get(id)!.player} team={team} size={26} />}
        <span className="min-w-0 truncate font-semibold text-white">{index.get(id)?.player.name ?? id}</span>{extra}
        {d && d.o !== 0 && <span className="shrink-0 text-xs" title="Change to his overall rating from this match"><Delta n={d.o} /></span>}
      </button>
    )
  }

  const panel = (i: number) => {
    const s = sides[i]
    const team = s.team as Team
    const won = res.winnerId === team.id
    const bats = [...s.bat].sort((a, b) => b[1] - a[1] || a[2] - b[2]).slice(0, 2)
    // the bowlers who bowled at this side's batsmen are the opposition's
    const opp = sides[1 - i]
    const bowls = [...opp.bowl].sort((a, b) => b[3] - a[3] || a[2] - b[2]).slice(0, 2)
    return (
      <div key={team.id} className="overflow-hidden rounded-2xl border-2 bg-panel" style={{ borderColor: won ? '#fbbf24' : '#2b3145' }}>
        <div className="flex items-center gap-3 px-4 py-3" style={{ background: `linear-gradient(110deg, ${team.colors.primary}cc, #10131c 75%)` }}>
          <Link to={paths.careerTeam(team.id)} onClick={onClose}><TeamCrest team={team} size={46} /></Link>
          <div className="min-w-0 flex-1">
            <Link to={paths.careerTeam(team.id)} onClick={onClose} className="block truncate font-display text-xl leading-none tracking-wide text-white hover:underline">{team.name}</Link>
            <div className="text-xs text-slate-300"><span className="font-bold text-slate-100">{i === 0 ? '1st innings' : '2nd innings'}</span> · {s.score ? `${overs(s.score.balls)} overs` : ''}{won ? ' · Winner' : ''}</div>
          </div>
          <div className="font-display text-5xl leading-none text-white">{s.score?.runs ?? '-'}<span className="text-2xl text-slate-400">/{s.score?.wickets ?? '-'}</span></div>
        </div>
        <div className="grid gap-3 p-3">
          <div>
            <div className="mb-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Batting</div>
            {bats.map((l) => (
              <div key={l[0]} className="flex items-center gap-2 border-t border-line/60 py-1 text-sm first:border-0">
                {who(idOf(l[0]), team)}
                <span className="ml-auto shrink-0 font-bold tabular-nums text-white">{l[1]}{l[5] ? '' : '*'} <span className="text-xs font-normal text-slate-400">({l[2]})</span></span>
              </div>
            ))}
          </div>
          <div>
            <div className="mb-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Bowling · {opp.team?.name}</div>
            {bowls.map((l) => (
              <div key={l[0]} className="flex items-center gap-2 border-t border-line/60 py-1 text-sm first:border-0">
                {who(idOf(l[0]), opp.team as Team)}
                <span className="ml-auto shrink-0 font-bold tabular-nums text-white">{l[3]}/{l[2]} <span className="text-xs font-normal text-slate-400">({overs(l[1])})</span></span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const th = 'px-2 py-1.5 text-right font-medium'
  const td = 'px-2 py-1.5 text-right tabular-nums text-slate-300'
  const card = (i: number) => {
    const s = sides[i]
    const team = s.team as Team
    return (
      <section key={team.id} className="rounded-2xl border border-line bg-panel p-3">
        <h3 className="mb-1 flex items-center gap-2 font-display text-2xl tracking-wide text-white"><TeamCrest team={team} size={26} />{team.name} <span className="rounded bg-white/10 px-1.5 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wider text-slate-300">{i === 0 ? '1st innings' : '2nd innings'}</span> <span className="ml-auto text-xl text-slate-300">{s.score?.runs}/{s.score?.wickets} <span className="text-sm text-slate-500">({s.score ? overs(s.score.balls) : ''} ov)</span></span></h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-slate-500"><tr><th className="px-2 py-1.5 text-left font-medium">Batting</th><th className={th}>R</th><th className={th}>B</th><th className={th}>4s</th><th className={th}>6s</th><th className={th}>SR</th></tr></thead>
            <tbody>
              {s.bat.map((l) => (
                <tr key={l[0]} className="border-t border-line/60">
                  <td className="px-2 py-1.5">{who(idOf(l[0]), team, !l[5] ? <span className="text-xs text-slate-500">not out</span> : undefined)}</td>
                  <td className="px-2 text-right font-bold tabular-nums text-white">{l[1]}</td><td className={td}>{l[2]}</td><td className={td}>{l[3]}</td><td className={td}>{l[4]}</td><td className={td}>{l[2] ? ((l[1] / l[2]) * 100).toFixed(1) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* the bowlers who bowled at this team's batsmen are the other side's */}
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-slate-500"><tr><th className="px-2 py-1.5 text-left font-medium">Bowling · {sides[1 - i].team?.name}</th><th className={th}>O</th><th className={th}>M</th><th className={th}>R</th><th className={th}>W</th><th className={th}>Econ</th></tr></thead>
            <tbody>
              {sides[1 - i].bowl.map((l) => (
                <tr key={l[0]} className="border-t border-line/60">
                  <td className="px-2 py-1.5">{who(idOf(l[0]), sides[1 - i].team as Team)}</td>
                  <td className={td}>{overs(l[1])}</td><td className={td}>{l[4]}</td><td className={td}>{l[2]}</td><td className="px-2 text-right font-bold tabular-nums text-white">{l[3]}</td><td className={td}>{l[1] ? ((l[2] / l[1]) * 6).toFixed(1) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    )
  }
  void nameOf

  return (
    <Shell z={z} label="Match details" onClose={onClose}>
      <div className="px-6 pb-3 pt-5">
        <div className="pr-14 text-[11px] font-extrabold uppercase tracking-widest text-amber-300">
          {comp ? <Link to={paths.competition(comp.id)} onClick={onClose} className="hover:underline">{competitionName(comp, teams)}</Link> : 'Match'} · {fixture.stage} · {fixture.format.toUpperCase()} · {formatDate(fixture.date)}
        </div>
        <h2 className="mt-1 font-display text-3xl leading-tight tracking-wide text-white">{res.text}</h2>
        <div className="mt-3 flex gap-1.5" role="tablist">
          {([['summary', 'Match summary'], ['scorecard', 'Scorecards']] as const).map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${tab === id ? 'bg-sky-400 text-black' : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'}`}>{label}</button>
          ))}
        </div>
      </div>
      <div className="space-y-4 px-6 pb-6">
        {tab === 'summary' ? (
          <>
            <div className="grid gap-4 md:grid-cols-2">{[0, 1].map(panel)}</div>
            {motm && (
              <button onClick={() => api?.openPlayer(motm.player.id)} className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-amber-400/50 bg-amber-400/10 p-3 text-left transition hover:bg-amber-400/15">
                <PlayerAvatar player={motm.player} team={motm.team} size={48} />
                <div className="min-w-0">
                  <div className="text-[11px] font-extrabold uppercase tracking-widest text-amber-300">Man of the Match</div>
                  <div className="truncate text-lg font-bold text-white">{motm.player.name} <span className="text-sm font-normal text-slate-300">· {motm.team.name}</span></div>
                  {res.motmNote && <div className="text-sm text-slate-300">{res.motmNote}</div>}
                </div>
              </button>
            )}
          </>
        ) : (
          <div className="grid gap-4">{[0, 1].map(card)}</div>
        )}
      </div>
    </Shell>
  )
}

// ---- A player --------------------------------------------------------------

/** Where a player has played: every move he has made in the market, oldest first. */
export function CareerPath({ season, playerId, teams }: { season: Season | null; playerId: string; teams: Map<string, Team> }) {
  const moves = season ? movesOf(season, playerId) : []
  if (moves.length === 0) return null
  return (
    <section>
      <h3 className="mb-2 text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Career path</h3>
      <div className="divide-y divide-line/60 rounded-2xl border border-line bg-panel">
        {moves.map((t) => {
          const from = t.from ? teams.get(t.from) : null
          const to = t.to ? teams.get(t.to) : null
          return (
            <div key={t.id} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300">
              <span className="w-20 shrink-0 text-xs text-slate-500">{formatDate(t.date)}</span>
              {t.kind === 'release' ? <>Released by {from && <TeamCrest team={from} size={18} />}<b className="text-white">{from?.name}</b></> : <>
                {from ? <><TeamCrest team={from} size={18} /><span>{from.name}</span></> : <span className="text-slate-400">Free agent</span>}
                <span className="text-amber-300">➜</span>
                {to && <TeamCrest team={to} size={18} />}<b className="text-white">{to?.name}</b>
                <span className="ml-auto text-xs text-slate-500">{t.fee} coins</span>
              </>}
            </div>
          )
        })}
      </div>
    </section>
  )
}

/** The player's last matches in this career, and what each one did to his ratings. */
export function RecentMatches({ season, playerId, teamId, teams }: { season: Season | null; playerId: string; teamId: string; teams: Map<string, Team> }) {
  const api = useDetails()
  const recent = useMemo(() => {
    if (!season) return []
    const roster = season.roster ?? []
    const at = roster.indexOf(playerId)
    if (at < 0) return []
    const moves = movesOf(season, playerId)
    const out: { fixtureId: string; date: string; vs: Team | undefined; own?: Team; bat?: BatLine; bowl?: BowlLine; change?: number; attrs?: Partial<Record<AttrKey, number>> }[] = []
    for (const f of season.fixtures) {
      const r = season.results[f.id]
      if (!r) continue
      const bat = (r.bat ?? []).find((l) => l[0] === at)
      const bowl = (r.bowl ?? []).find((l) => l[0] === at)
      if (!bat && !bowl) continue
      // the team he played for that day (it can differ from his team now if he has moved)
      const ownId = moves.length ? teamOnDate(season, playerId, f.date, moves[0].from) : teamId
      const side = ownId === f.homeId || ownId === f.awayId ? ownId : teamId
      out.push({ fixtureId: f.id, date: f.date, own: moves.length ? teams.get(ownId ?? '') : undefined, vs: teams.get((f.homeId === side ? f.awayId : f.homeId) as string), bat, bowl, change: season.changes?.[f.id]?.[playerId]?.o, attrs: season.changes?.[f.id]?.[playerId]?.a })
    }
    return out.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8)
  }, [season, playerId, teams, teamId])
  return (
    <>
      {recent.length > 0 && (
        <section>
          <h3 className="mb-2 text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Recent matches <span className="font-normal normal-case tracking-normal text-slate-500">· the last column is what each match did to his ratings</span></h3>
          <div className="divide-y divide-line/60 rounded-2xl border border-line bg-panel">
            {recent.map((r) => (
              <button key={r.fixtureId} onClick={() => api?.openMatch(r.fixtureId)} className="flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left text-sm transition hover:bg-white/5">
                <span className="w-16 shrink-0 text-xs text-slate-500">{formatDate(r.date)}</span>
                <span className="flex min-w-0 flex-1 items-center gap-1.5 text-slate-300">{r.own && <span className="flex shrink-0 items-center gap-1 rounded-full bg-white/5 py-0.5 pl-0.5 pr-1.5 text-[10px] font-bold text-slate-200" title={`He played for ${r.own.name}`}><TeamCrest team={r.own} size={14} />{r.own.short}</span>}v {r.vs && <TeamCrest team={r.vs} size={18} />}<span className="truncate">{r.vs?.name}</span></span>
                <span className="shrink-0 tabular-nums text-white">{r.bat ? `${r.bat[1]}${r.bat[5] ? '' : '*'} (${r.bat[2]})` : ''}{r.bat && r.bowl ? ' · ' : ''}{r.bowl ? `${r.bowl[3]}/${r.bowl[2]}` : ''}</span>
                <span className="flex w-28 shrink-0 flex-wrap items-center justify-end gap-x-1.5 text-xs" title="How that match changed his ratings">
                  {r.attrs && Object.keys(r.attrs).length > 0
                    ? <>{r.change ? <Delta n={r.change} className="text-sm" /> : null}{Object.entries(r.attrs).map(([k, n]) => <span key={k} className="whitespace-nowrap text-slate-400">{ATTR_LABEL[k as AttrKey].slice(0, 3)} <Delta n={n as number} /></span>)}</>
                    : <span className="text-slate-600">no change</span>}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </>
  )
}

function PlayerDialog({ season, playerId, z, onClose }: { season: Season | null; playerId: string; z: number; onClose: () => void }) {
  const loc = useLocation()
  // a career match page counts too (it has ?fx=): its players carry the career's rating changes
  const inCareer = !!season && (loc.pathname.startsWith('/career') || (loc.pathname.startsWith('/match/') && new URLSearchParams(loc.search).has('fx')))
  const careerIndex = usePlayerIndex()
  const careerTeams = useTeamMap()
  const baseTeams = useTeams()
  // outside a career a player shows with his starting ratings and no season to speak of
  const teams = useMemo(() => (inCareer ? careerTeams : new Map(baseTeams.map((t) => [t.id, t]))), [inCareer, careerTeams, baseTeams])
  const index = useMemo(() => {
    if (inCareer) return careerIndex
    const m = new Map<string, { player: Player; team: Team }>()
    for (const t of teams.values()) for (const p of t.players) m.set(p.id, { player: p, team: t })
    return m
  }, [inCareer, careerIndex, teams])
  const e = index.get(playerId)
  const c = useMemo(() => (inCareer && season ? collect(season) : null), [inCareer, season])
  if (!e) return null
  const { player, team } = e
  const accent = accentOf(team)
  const ovr = overall(player)
  // where his ratings started (when his team was made), to show what the career has done to them
  const baseP = inCareer ? baseTeams.find((t) => t.id === team.id)?.players.find((p) => p.id === player.id) : undefined
  const ovrBase = baseP ? overall(baseP) : ovr
  const b = c?.bat.get(player.id)
  const w = c?.bowl.get(player.id)
  const potm = c?.potm.get(player.id) ?? 0
  const tPlayed = c ? (c.played.get(player.id) ?? Math.max(b?.matches ?? 0, w?.matches ?? 0)) : undefined
  const f1 = (n: number | null, d = 1) => (n === null ? '-' : n.toFixed(d))
  const stat = (label: string, value: React.ReactNode) => <div className="rounded-xl bg-white/5 px-3 py-2"><div className="cursor-help text-[10px] font-bold uppercase tracking-widest text-slate-500" data-gloss={label}>{label}</div><div className="font-display text-2xl leading-tight text-white">{value}</div></div>

  return (
    <Shell z={z} label={`${player.name}, player profile`} onClose={onClose}>
      <div className="px-6 pb-4 pt-6" style={{ background: `linear-gradient(135deg, ${team.colors.primary}cc, ${team.colors.secondary}55 55%, #10131c)` }}>
        <div className="flex items-center gap-4 pr-12">
          <div className="rounded-full" style={{ boxShadow: `0 0 0 4px ${accent}, 0 10px 30px rgba(0,0,0,.5)` }}><PlayerAvatar player={player} team={team} size={96} /></div>
          <div className="min-w-0">
            <h2 className="font-display text-4xl leading-none tracking-wide text-white">{player.name}</h2>
            <Link to={inCareer ? paths.careerTeam(team.id) : paths.team(team.id)} onClick={onClose} className="mt-1 flex items-center gap-2 text-sm text-slate-100 hover:underline"><TeamCrest team={team} size={22} />{team.name}</Link>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="rounded-full bg-black/40 px-2 py-0.5 font-bold text-white">{ROLE_LABEL[player.role]}</span>
              <span className="rounded-full bg-black/40 px-2 py-0.5 text-slate-200">{player.hand === 'L' ? 'Left' : 'Right'}-hand bat</span>
              {player.bowling && <span className="rounded-full bg-black/40 px-2 py-0.5 text-slate-200">{player.bowling.type}</span>}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2"><RatingBadge value={ovr} size="lg" /><div className="text-xs text-slate-300"><div className="hidden font-display text-xl leading-none sm:block" style={{ color: tierOf(ovr).color }}>{tierOf(ovr).label}</div>overall{ovrBase !== ovr && <div className="mt-0.5 tabular-nums" title="Where he started, and what he is now"><span className="text-slate-400">{ovrBase}→</span><span className="text-white">{ovr}</span> <Delta n={ovr - ovrBase} className="text-sm" /></div>}</div></div>
        </div>
      </div>
      <div className="space-y-5 p-6">
        {inCareer && <section>
          <h3 className="mb-2 text-[11px] font-extrabold uppercase tracking-widest text-amber-300">This season</h3>
          {b || w || potm || tPlayed ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{tPlayed !== undefined && stat('Matches', tPlayed)}{potm > 0 && stat('Man of the Match', potm)}</div>
              {b && (
                <div>
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-amber-300/90">Batting</div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{stat('Bat apps', b.batApps)}{stat('Runs', b.runs)}{stat('Average', f1(average(b)))}{stat('Strike rate', f1(strikeRate(b)))}{stat('Best', `${b.high}${b.highNotOut ? '*' : ''}`)}{stat('50s / 100s', `${b.fifties} / ${b.hundreds}`)}{stat('Fours / sixes', `${b.fours} / ${b.sixes}`)}{stat('Longest six', b.longSix > 0 ? `${b.longSix} m` : '-')}</div>
                </div>
              )}
              {w && (
                <div>
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-sky-300/90">Bowling</div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{stat('Bowl apps', w.bowlApps)}{stat('Wickets', w.wickets)}{stat('Economy', f1(bowlEcon(w), 2))}{stat('Bowling avg', f1(bowlAverage(w)))}{stat('Best', `${w.bestW}/${w.bestR}`)}{stat('5-wicket hauls', w.fiveW)}</div>
                </div>
              )}
            </div>
          ) : <p className="text-sm text-slate-500">Hasn't played a match this season yet.</p>}
        </section>}

        <section className="grid gap-x-8 gap-y-1.5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Batting</h3>
            <StatBar label="Technique" value={player.batting.technique} base={baseP?.batting.technique} color={accent} /><StatBar label="Power" value={player.batting.power} base={baseP?.batting.power} color={accent} /><StatBar label="Temperament" value={player.batting.temperament} base={baseP?.batting.temperament} color={accent} /><StatBar label="Running" value={player.batting.running} base={baseP?.batting.running} color={accent} />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Bowling{player.bowling ? ` · ${player.bowling.type}` : ''} & fielding</h3>
            {player.bowling ? <><StatBar label="Accuracy" value={player.bowling.accuracy} base={baseP?.bowling?.accuracy} color={accent} /><StatBar label="Variation" value={player.bowling.variation} base={baseP?.bowling?.variation} color={accent} /><StatBar label="Stamina" value={player.bowling.stamina} base={baseP?.bowling?.stamina} color={accent} /></> : <p className="text-sm text-slate-500">Does not bowl.</p>}
            <StatBar label={player.role === 'WK' ? 'Keeping' : 'Fielding'} value={player.fielding} color={accent} />
          </div>
        </section>

        {player.traits.length > 0 && <div className="flex flex-wrap gap-1.5">{player.traits.map((t) => <span key={t} className="rounded-full border border-line bg-panel-2 px-2.5 py-1 text-xs capitalize text-slate-200">{t.replace(/-/g, ' ')}</span>)}</div>}

        {inCareer && <RecentMatches season={season} playerId={playerId} teamId={team.id} teams={teams} />}
        {inCareer && <CareerPath season={season} playerId={playerId} teams={teams} />}
      </div>
    </Shell>
  )
}

// ---- A team's results ------------------------------------------------------

/** Every match a team has played this season, newest first. Pick one to open its details. */
function TeamResultsDialog({ season, teamId, z, onClose }: { season: Season; teamId: string; z: number; onClose: () => void }) {
  const teams = useTeamMap()
  const team = teams.get(teamId)
  const played = useMemo(
    () => season.fixtures.filter((f) => season.results[f.id] && (f.homeId === teamId || f.awayId === teamId)).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)),
    [season, teamId],
  )
  if (!team) return null
  const won = played.filter((f) => season.results[f.id].winnerId === teamId).length
  const tied = played.filter((f) => season.results[f.id].winnerId === null).length
  return (
    <Shell z={z} label={`${team.name}, results`} onClose={onClose}>
      <div className="space-y-4 p-5 md:p-6">
        <div className="flex items-center gap-4 pr-10">
          <TeamCrest team={team} size={64} />
          <div className="min-w-0">
            <h2 className="truncate font-display text-3xl leading-none tracking-wide text-white">{team.name}</h2>
            <div className="mt-1.5 text-sm text-slate-300">
              {played.length === 0 ? 'No matches played yet this season.' : <><b className="text-emerald-300">{won} won</b> · <b className="text-rose-300">{played.length - won - tied} lost</b>{tied > 0 && <> · {tied} tied</>} <span className="text-slate-500">from {played.length}</span></>}
            </div>
            <Link to={paths.careerTeam(team.id)} onClick={onClose} className="text-xs text-indigo-300 hover:underline">Team page and squad</Link>
          </div>
        </div>
        {played.length > 0 && <div className="grid gap-2">{played.map((f) => <FixtureRow key={f.id} season={season} fixture={f} teams={teams} showDate showCompetition perspective={teamId} />)}</div>}
      </div>
    </Shell>
  )
}

/**
 * A team's crest that opens its results when it is tapped, inside a career (it is a plain crest anywhere else, and for a team
 * that is not in the career). Safe to put inside a button or a link: the tap does not reach them.
 */
export function TeamLogo({ team, size = 64 }: { team: Pick<Team, 'id' | 'short' | 'colors' | 'emblem' | 'logoUrl' | 'name'>; size?: number }) {
  const api = useDetails()
  const { season } = useViewedSeason()
  if (!api || !season || !season.teamIds.includes(team.id)) return <TeamCrest team={team} size={size} />
  const open = (e: React.SyntheticEvent) => { e.stopPropagation(); e.preventDefault(); api.openTeam(team.id) }
  return (
    <span
      role="button" tabIndex={0} title={`${team.name}: results`} aria-label={`${team.name}, see results`}
      onClick={open} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') open(e) }}
      className="inline-flex shrink-0 cursor-pointer rounded-full transition hover:brightness-125 focus-visible:outline-2 focus-visible:outline-indigo-400"
    >
      <TeamCrest team={team} size={size} />
    </span>
  )
}

// ---- The host --------------------------------------------------------------

/** Wrap a career's pages in this so matches and players anywhere in them can open their details in a popup. */
export function DetailsProvider({ children }: { children: React.ReactNode }) {
  const { season } = useViewedSeason()
  // the Orange Cap (most runs) and Purple Cap (most wickets) holders, shown on every portrait of theirs
  const caps = useMemo(() => {
    const m = new Map<string, 'orange' | 'purple' | 'both'>()
    if (!season) return m
    const c = collect(season)
    const run = topBatsmen(c, 1)[0]
    const wk = topBowlers(c, 1)[0]
    if (run && run.runs > 0) m.set(run.id, 'orange')
    if (wk && wk.wickets > 0) m.set(wk.id, m.get(wk.id) === 'orange' ? 'both' : 'purple')
    return m
  }, [season])
  const [stack, setStack] = useState<Entry[]>([])
  const openMatch = useCallback((id: string) => setStack((s) => [...s, { kind: 'match', id }]), [])
  const openPlayer = useCallback((id: string) => setStack((s) => [...s, { kind: 'player', id }]), [])
  const openTeam = useCallback((id: string) => setStack((s) => [...s, { kind: 'team', id }]), [])
  const api = useMemo(() => ({ openMatch, openPlayer, openTeam }), [openMatch, openPlayer, openTeam])
  const close = useCallback(() => setStack((s) => s.slice(0, -1)), [])
  // following a link (a team, a tournament) leaves every popup behind
  const { pathname } = useLocation()
  useEffect(() => setStack([]), [pathname])

  useEffect(() => {
    if (!stack.length) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); close() } }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [stack.length, close])

  return (
    <ProfileContext.Provider value={openPlayer}>
    <CapsContext.Provider value={caps}>
    <Ctx.Provider value={api}>
      {children}
      <AnimatePresence>
        {stack.map((e, i) => e.kind === 'match'
          ? (season ? <MatchDialog key={`${i}-${e.id}`} season={season} fixtureId={e.id} z={80 + i} onClose={close} /> : null)
          : e.kind === 'team'
            ? (season ? <TeamResultsDialog key={`${i}-${e.id}`} season={season} teamId={e.id} z={80 + i} onClose={close} /> : null)
            : <PlayerDialog key={`${i}-${e.id}`} season={season} playerId={e.id} z={80 + i} onClose={close} />)}
      </AnimatePresence>
    </Ctx.Provider>
    </CapsContext.Provider>
    </ProfileContext.Provider>
  )
}
