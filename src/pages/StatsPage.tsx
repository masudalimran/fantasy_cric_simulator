import { useMemo, useState } from 'react'
import { TitlesButton } from '../components/season/TitlesButton'
import { Link, useSearchParams } from 'react-router'
import { PlayerCell, competitionName, usePlayerIndex, useTeamMap, type PlayerEntry } from '../components/season/shared'
import { Delta, RatingBadge, TeamCrest } from '../components/ui'
import { paths } from '../routes'
import { formatDate } from '../season/dates'
import { oversText } from '../components/match/format'
import {
  average, bowlAverage, bowlStrikeRate, collect, economy, mostValuable, seasonRecords, strikeRate, teamRecords,
  type BatStat, type BowlStat, type Collected, type Scope,
} from '../season/stats'
import { useDetails } from '../components/season/Details'
import { SortTable, type Col } from '../components/season/SortTable'
import { overall } from '../data/builders'
import type { Season } from '../season/types'
import { useTeams, useViewedSeason } from '../store/useStore'
import type { MatchFormat, Player, Team } from '../types'

const TABS = [
  { id: 'batting', label: 'Batting' },
  { id: 'bowling', label: 'Bowling' },
  { id: 'awards', label: 'Awards' },
  { id: 'ratings', label: 'Rating' },
  { id: 'teams', label: 'Teams' },
  { id: 'records', label: 'Records' },
] as const
type Tab = (typeof TABS)[number]['id']

const f1 = (n: number | null, d = 1) => (n === null ? '-' : n.toFixed(d))

function Rank({ i, cap }: { i: number; cap?: 'orange' | 'purple' }) {
  return (
    <td className="w-10 px-2 py-2 text-center">
      {i === 0 && cap ? (
        <span title={cap === 'orange' ? 'Orange Cap' : 'Purple Cap'} className={`inline-block h-5 w-5 rounded-full ${cap === 'orange' ? 'bg-orange-500' : 'bg-purple-500'}`} />
      ) : (
        <span className="text-slate-500">{i + 1}</span>
      )}
    </td>
  )
}

const num = 'font-bold text-white'

function Batting({ c, index }: { c: Collected; index: Map<string, PlayerEntry> }) {
  const rows = [...c.bat.values()].sort((a, b) => b.runs - a.runs || (strikeRate(b) ?? 0) - (strikeRate(a) ?? 0)).slice(0, 30)
  const cols: Col<BatStat>[] = [
    { key: 'player', label: 'Player', align: 'left', get: (s) => index.get(s.id)?.player.name ?? s.id, cell: (s) => <PlayerCell id={s.id} index={index} /> },
    { key: 'm', label: 'M', get: (s) => s.matches, cell: (s) => s.matches },
    { key: 'inns', label: 'Inns', get: (s) => s.innings, cell: (s) => s.innings },
    { key: 'runs', label: 'Runs', get: (s) => s.runs, cell: (s) => <span className={num}>{s.runs}</span> },
    { key: 'hs', label: 'HS', get: (s) => s.high + (s.highNotOut ? 0.5 : 0), cell: (s) => `${s.high}${s.highNotOut ? '*' : ''}` },
    { key: 'avg', label: 'Avg', get: (s) => average(s), cell: (s) => f1(average(s)) },
    { key: 'sr', label: 'SR', get: (s) => strikeRate(s), cell: (s) => f1(strikeRate(s)) },
    { key: '50', label: '50', get: (s) => s.fifties, cell: (s) => s.fifties },
    { key: '100', label: '100', get: (s) => s.hundreds, cell: (s) => s.hundreds },
    { key: '4s', label: '4s', get: (s) => s.fours, cell: (s) => s.fours },
    { key: '6s', label: '6s', get: (s) => s.sixes, cell: (s) => s.sixes },
  ]
  return <SortTable rows={rows} cols={cols} rowKey={(s) => s.id} lead={(i, def) => <Rank i={i} cap={def ? 'orange' : undefined} />} />
}

function Bowling({ c, index }: { c: Collected; index: Map<string, PlayerEntry> }) {
  const rows = [...c.bowl.values()].sort((a, b) => b.wickets - a.wickets || (economy(a) ?? 99) - (economy(b) ?? 99)).slice(0, 30)
  const cols: Col<BowlStat>[] = [
    { key: 'player', label: 'Player', align: 'left', get: (s) => index.get(s.id)?.player.name ?? s.id, cell: (s) => <PlayerCell id={s.id} index={index} /> },
    { key: 'm', label: 'M', get: (s) => s.matches, cell: (s) => s.matches },
    { key: 'ov', label: 'Ov', get: (s) => s.balls, cell: (s) => oversText(s.balls) },
    { key: 'mdn', label: 'Mdn', get: (s) => s.maidens, cell: (s) => s.maidens },
    { key: 'runs', label: 'Runs', get: (s) => s.runs, cell: (s) => s.runs },
    { key: 'wkts', label: 'Wkts', get: (s) => s.wickets, cell: (s) => <span className={num}>{s.wickets}</span> },
    { key: 'best', label: 'Best', get: (s) => s.bestW * 1000 - s.bestR, cell: (s) => `${s.bestW}/${s.bestR}` },
    { key: 'avg', label: 'Avg', first: 'asc', get: (s) => bowlAverage(s), cell: (s) => f1(bowlAverage(s)) },
    { key: 'econ', label: 'Econ', first: 'asc', get: (s) => economy(s), cell: (s) => f1(economy(s), 2) },
    { key: 'sr', label: 'SR', first: 'asc', get: (s) => bowlStrikeRate(s), cell: (s) => f1(bowlStrikeRate(s)) },
    { key: '5w', label: '5W', get: (s) => s.fiveW, cell: (s) => s.fiveW },
  ]
  return <SortTable rows={rows} cols={cols} rowKey={(s) => s.id} lead={(i, def) => <Rank i={i} cap={def ? 'purple' : undefined} />} />
}

function Awards({ c, index }: { c: Collected; index: Map<string, PlayerEntry> }) {
  const mvp = mostValuable(c, 10)
  const potm = [...c.potm.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id, n]) => ({ id, n }))
  const box = 'rounded-2xl border border-line bg-panel p-4'
  const name = (id: string) => index.get(id)?.player.name ?? id
  const mvpCols: Col<{ id: string; points: number }>[] = [
    { key: 'player', label: 'Player', align: 'left', get: (m) => name(m.id), cell: (m) => <PlayerCell id={m.id} index={index} /> },
    { key: 'pts', label: 'Points', get: (m) => m.points, cell: (m) => <span className={num}>{Math.round(m.points)}</span> },
  ]
  const potmCols: Col<{ id: string; n: number }>[] = [
    { key: 'player', label: 'Player', align: 'left', get: (m) => name(m.id), cell: (m) => <PlayerCell id={m.id} index={index} /> },
    { key: 'n', label: 'Awards', get: (m) => m.n, cell: (m) => <span className={num}>{m.n}</span> },
  ]
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className={box}>
        <h3 className="mb-3 font-display text-2xl tracking-wide text-amber-300">Most valuable players</h3>
        <SortTable rows={mvp} cols={mvpCols} rowKey={(m) => m.id} lead={(i) => <td className="w-8 px-2 text-center text-slate-500">{i + 1}</td>} />
      </section>
      <section className={box}>
        <h3 className="mb-3 font-display text-2xl tracking-wide text-sky-300">Man of the Match awards</h3>
        <SortTable rows={potm} cols={potmCols} rowKey={(m) => m.id} lead={(i) => <td className="w-8 px-2 text-center text-slate-500">{i + 1}</td>} />
      </section>
    </div>
  )
}

function Teams({ rows, teams, season }: { rows: ReturnType<typeof teamRecords>; teams: Map<string, Team>; season: Season }) {
  type Row = (typeof rows)[number]
  const winPct = (r: Row) => (r.won / Math.max(r.played, 1)) * 100
  const cols: Col<Row>[] = [
    { key: 'team', label: 'Team', align: 'left', get: (r) => teams.get(r.teamId)?.name ?? r.teamId, cell: (r) => {
      const t = teams.get(r.teamId)
      return <Link to={t ? paths.careerTeam(t.id) : '#'} className="flex items-center gap-2 hover:text-white">{t && <TeamCrest team={t} size={28} />}<span className="font-medium text-slate-100">{t?.name ?? r.teamId}</span></Link>
    } },
    { key: 'p', label: 'P', get: (r) => r.played, cell: (r) => r.played },
    { key: 'w', label: 'W', get: (r) => r.won, cell: (r) => r.won },
    { key: 'l', label: 'L', first: 'asc', get: (r) => r.lost, cell: (r) => r.lost },
    { key: 't', label: 'T', get: (r) => r.tied, cell: (r) => r.tied },
    { key: 'nrr', label: 'NRR', get: (r) => r.nrr, cell: (r) => <span className="text-slate-400">{r.nrr >= 0 ? '+' : ''}{r.nrr.toFixed(2)}</span> },
    { key: 'pts', label: 'Pts', get: (r) => r.points, cell: (r) => <span className="font-bold text-white">{r.points}</span> },
    { key: 'pct', label: 'Win %', get: winPct, cell: (r) => `${winPct(r).toFixed(0)}%` },
    { key: 'titles', label: 'Titles', get: (r) => r.titles, cell: (r) => <TitlesButton season={season} team={teams.get(r.teamId)} fixtureIds={r.titleFixtures} teams={teams} /> },
  ]
  return <SortTable rows={rows} cols={cols} rowKey={(r) => r.teamId} lead={(i) => <td className="w-10 px-2 text-center text-slate-500">{i + 1}</td>} />
}

/** Every player's current ratings, with how far each has moved from where it started. Sorted by the current value, never by the change. */
function Ratings({ index }: { index: Map<string, PlayerEntry> }) {
  const [q, setQ] = useState('')
  const base = useTeams()
  const baseById = useMemo(() => { const m = new Map<string, Player>(); for (const t of base) for (const p of t.players) m.set(p.id, p); return m }, [base])
  type Row = { id: string; player: Player; team: Team }
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return [...index.values()]
      .filter((e) => !needle || `${e.player.name} ${e.team.name} ${e.team.series}`.toLowerCase().includes(needle))
      .map((e): Row => ({ id: e.player.id, player: e.player, team: e.team }))
      .sort((a, b) => overall(b.player) - overall(a.player) || a.player.name.localeCompare(b.player.name))
  }, [index, q])
  const val = (p: Player, label: string): number | null => {
    switch (label) {
      case 'Overall': return overall(p)
      case 'Technique': return p.batting.technique
      case 'Power': return p.batting.power
      case 'Temperament': return p.batting.temperament
      case 'Running': return p.batting.running
      case 'Accuracy': return p.bowling?.accuracy ?? null
      case 'Variation': return p.bowling?.variation ?? null
      case 'Stamina': return p.bowling?.stamina ?? null
      case 'Fielding': return p.fielding
    }
    return null
  }
  const cols: Col<Row>[] = [
    { key: 'player', label: 'Player', align: 'left', get: (r) => r.player.name, cell: (r) => <PlayerCell id={r.id} index={index} /> },
    ...['Overall', 'Technique', 'Power', 'Temperament', 'Running', 'Accuracy', 'Variation', 'Stamina', 'Fielding'].map((label): Col<Row> => ({
      key: label, label, get: (r) => val(r.player, label),
      cell: (r) => {
        const v = val(r.player, label)
        if (v === null) return <span className="text-slate-600">-</span>
        const b0 = baseById.get(r.id)
        const start = b0 ? val(b0, label) : null
        const d = start === null ? 0 : v - start
        return (
          <span className="inline-flex items-center justify-end gap-1.5" title={d ? `Started at ${start}, now ${v}` : undefined}>
            <span className="w-7 text-right"><Delta n={d} className="text-xs" /></span>
            {label === 'Overall' ? <RatingBadge value={v} size="sm" /> : <span className="w-6 text-right font-semibold text-slate-100">{v}</span>}
          </span>
        )
      },
    })),
  ]
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 px-2 pb-2">
        <p className="text-sm text-slate-400">Every player's current ratings, as they stand right now. Sorted by the current value (overall to start with); click a heading to sort by that rating. The green +n or red −n beside a rating shows how far it has moved since the player started.</p>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search players or teams…" className="rounded-lg border border-line bg-panel px-3 py-1.5 text-sm outline-none focus:border-indigo-400" aria-label="Search players" />
      </div>
      {rows.length === 0 ? <p className="p-8 text-center text-sm text-slate-400">No players match.</p> : <SortTable rows={rows} cols={cols} rowKey={(r) => r.id} initial={{ key: 'Overall', dir: 'desc' }} lead={(i) => <td className="w-10 px-2 text-center text-slate-500">{i + 1}</td>} />}
    </div>
  )
}

export function StatsPage() {
  const { season } = useViewedSeason()
  const [params, setParams] = useSearchParams()
  const index = usePlayerIndex()
  const teams = useTeamMap()
  const details = useDetails()
  const tab = (TABS.find((t) => t.id === params.get('tab'))?.id ?? 'batting') as Tab
  const competitionId = params.get('scope') ?? ''
  const format = (params.get('format') ?? '') as MatchFormat | ''
  const set = (key: string, value: string) => setParams((p) => { const n = new URLSearchParams(p); if (value) n.set(key, value); else n.delete(key); return n }, { replace: true })

  const scope: Scope = useMemo(() => ({ competitionId: competitionId || undefined, format: format || undefined }), [competitionId, format])
  const collected = useMemo(() => (season ? collect(season, scope) : null), [season, scope])
  const records = useMemo(() => (season ? seasonRecords(season, scope) : []), [season, scope])
  const teamRows = useMemo(() => (season ? teamRecords(season, scope) : []), [season, scope])

  if (!season || !collected) {
    return (
      <div className="rounded-2xl border border-dashed border-line p-12 text-center text-slate-400">
        No career yet. <Link to={paths.sessions} className="text-indigo-300 hover:underline">Create one</Link>.
      </div>
    )
  }

  const tournaments = season.competitions.filter((c) => c.kind !== 'series')
  const sel = 'rounded-lg border border-line bg-panel px-3 py-2 text-sm'

  return (
    <div>
      <h1 className="font-display text-5xl tracking-wide">Stats <span className="text-slate-500">{season.year}</span></h1>
      <p className="mb-5 text-sm text-slate-400">{collected.matches} matches counted{competitionId ? ` in ${season.competitions.find((c) => c.id === competitionId)?.name}` : ' across the whole season'}.</p>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="grid w-full grid-cols-3 gap-1 text-sm md:flex md:w-auto md:gap-0 md:overflow-hidden md:rounded-full md:border md:border-line">
          {TABS.map((t) => <button key={t.id} onClick={() => set('tab', t.id === 'batting' ? '' : t.id)} className={`rounded-xl px-4 py-2.5 transition md:rounded-none md:py-1.5 ${tab === t.id ? 'bg-indigo-500 text-white' : 'bg-white/5 text-slate-300 hover:text-white md:bg-transparent md:text-slate-400'}`}>{t.label}</button>)}
        </div>
        <select value={competitionId} onChange={(e) => set('scope', e.target.value)} className={sel}>
          <option value="">Whole season</option>
          {tournaments.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="flex overflow-hidden rounded-full border border-line text-sm">
          {[['', 'All'], ['t20', 'T20'], ['odi', 'ODI']].map(([v, l]) => <button key={v} onClick={() => set('format', v)} className={`px-4 py-1.5 transition ${format === v ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}>{l}</button>)}
        </div>
      </div>

      {collected.matches === 0 && tab !== 'ratings' ? (
        <div className="rounded-2xl border border-dashed border-line p-12 text-center text-slate-400">No matches played here yet. Sim a few from the <Link to={paths.session()} className="text-indigo-300 hover:underline">session</Link>.</div>
      ) : (
        <div className={tab === 'awards' || tab === 'records' ? '' : 'overflow-x-auto rounded-2xl border border-line bg-panel p-3'}>
          {tab === 'batting' && <Batting c={collected} index={index} />}
          {tab === 'bowling' && <Bowling c={collected} index={index} />}
          {tab === 'awards' && <Awards c={collected} index={index} />}
          {tab === 'ratings' && <Ratings index={index} />}
          {tab === 'teams' && <Teams rows={teamRows} teams={teams} season={season} />}
          {tab === 'records' && (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {records.map((r) => {
                const team = r.teamId ? teams.get(r.teamId) : undefined
                const fx = season.fixtures.find((f) => f.id === r.fixtureId)
                const home = fx?.homeId ? teams.get(fx.homeId) : undefined
                const away = fx?.awayId ? teams.get(fx.awayId) : undefined
                return (
                  <div key={r.label} className="rounded-2xl border border-line bg-panel p-4">
                    <div className="text-[11px] uppercase tracking-widest text-slate-500">{r.label}</div>
                    <div className="mt-1 font-display text-4xl text-amber-300">{r.value}</div>
                    <div className="mt-2 flex items-center gap-2 text-sm text-slate-300">
                      {team && <Link to={paths.careerTeam(team.id)} className="flex items-center gap-2 hover:text-white hover:underline"><TeamCrest team={team} size={22} />{team.name}</Link>}
                      {r.playerId && <PlayerCell id={r.playerId} index={index} size={26} />}
                      {r.playerNote && <span className="text-xs text-slate-400">{r.playerNote}</span>}
                    </div>
                    {home && away && fx && (
                      <button onClick={() => details?.openMatch(fx.id)} className="mt-2 flex w-full cursor-pointer items-center gap-1.5 rounded-lg bg-white/5 px-2 py-1.5 text-left text-xs text-slate-200 transition hover:bg-sky-400/15 hover:ring-1 hover:ring-sky-400/60" title="Open the match: summary and scorecards">
                        <TeamCrest team={home} size={18} /><span className="font-semibold">{home.name}</span><span className="text-slate-500">v</span><TeamCrest team={away} size={18} /><span className="font-semibold">{away.name}</span>
                        <span className="ml-auto shrink-0 text-slate-500">{formatDate(fx.date)}</span>
                        <span className="shrink-0 font-bold text-sky-300">View ›</span>
                      </button>
                    )}
                    <Link to={`${paths.competition(r.fixtureId.split(':')[0])}`} className="mt-2 inline-block text-xs text-indigo-300 hover:underline">{(() => { const c = season.competitions.find((x) => x.id === r.fixtureId.split(':')[0]); return c ? competitionName(c, teams) : '' })()} · {r.detail}</Link>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
