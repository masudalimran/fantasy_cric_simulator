import { CoachCard } from '../components/season/CoachGate'
import { useMemo } from 'react'
import { Link, useParams } from 'react-router'
import { overall } from '../data/builders'
import { keeperIn } from '../data/squad'
import { FixtureRow, usePlayerForm, useTeamMap } from '../components/season/shared'
import { SortTable, type Col } from '../components/season/SortTable'
import { FormBar, OverseasTag, PlayerAvatar, RatingBadge, ROLE_LABEL, TeamCrest, accentOf } from '../components/ui'
import { paths } from '../routes'
import { daysBetween, formatDate } from '../season/dates'
import { injuriesOf, SEVERITY_COLOR, type Injury } from '../season/injuries'
import { cpuSelections, formTable } from '../season/selection'
import { average, collect, economy, strikeRate, teamRecords, type BatStat, type BowlStat } from '../season/stats'
import { useTeams, useViewedSeason } from '../store/useStore'
import type { Player } from '../types'

const f1 = (n: number | null, d = 1) => (n === null ? '-' : n.toFixed(d))
const FORM_COLOR = { W: 'bg-emerald-500 text-black', L: 'bg-rose-500 text-white', T: 'bg-slate-500 text-white' } as const

interface Row { player: Player; pos: number | null; injury: Injury | null; change: number; bat?: BatStat; bowl?: BowlStat }

/**
 * One team inside the career: the squad it is using right now (your own lineup, or the XI the computer would
 * name today, with injuries and form taken into account), and every match it has played this season.
 */
export function CareerTeamPage() {
  const { id = '' } = useParams()
  const { season, isCurrent } = useViewedSeason()
  const teams = useTeamMap()
  const base = useTeams()
  const formOf = usePlayerForm()
  const team = teams.get(id)

  const data = useMemo(() => {
    if (!season || !team) return null
    const mine = season.myTeamId === team.id
    const sel = mine || !season.myTeamId ? { team, news: [] } : cpuSelections(season, { date: season.today }, [team], season.myTeamId ?? '__none__', formTable(season, teams))[0]
    const used = mine || !season.myTeamId ? team : sel.team
    const c = collect(season)
    const baseTeam = base.find((t) => t.id === team.id)
    const keeper = keeperIn(used.players.slice(0, 11), used.keeperId)?.id
    const hurtNow = injuriesOf(season, used, season.today)
    const rows: Row[] = used.players.map((p, i) => ({
      player: p,
      pos: i < 11 ? i + 1 : null,
      injury: hurtNow.get(p.id) ?? null,
      change: baseTeam ? overall(p) - overall(baseTeam.players.find((x) => x.id === p.id) ?? p) : 0,
      bat: c.bat.get(p.id),
      bowl: c.bowl.get(p.id),
    }))
    return { used, keeper, rows, news: sel.news, mine }
  }, [season, team, teams, base])

  if (!season || !team || !data) {
    return <div className="rounded-2xl border border-dashed border-line p-12 text-center text-slate-400">We couldn't find that team in this career. <Link to={paths.competitions} className="text-indigo-300 hover:underline">Back to tournaments</Link></div>
  }

  const accent = accentOf(team)
  const record = teamRecords(season).find((r) => r.teamId === team.id)
  const played = season.fixtures.filter((f) => season.results[f.id] && (f.homeId === team.id || f.awayId === team.id)).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
  const upcoming = season.fixtures.filter((f) => !season.results[f.id] && (f.homeId === team.id || f.awayId === team.id) && f.homeId && f.awayId).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3)
  const form = [...played].reverse().map((f) => (season.results[f.id].winnerId === team.id ? 'W' : season.results[f.id].winnerId === null ? 'T' : 'L') as 'W' | 'L' | 'T').slice(-5)
  const tile = (label: string, value: React.ReactNode) => <div className="rounded-2xl border border-line bg-panel px-3 py-2.5 md:px-4 md:py-3"><div className="cursor-help text-[11px] font-bold uppercase tracking-widest text-slate-400" data-gloss={label}>{label}</div><div className="font-display text-4xl leading-none text-white">{value}</div></div>
  const nameOf = (id: string) => data.used.players.find((p) => p.id === id)?.name ?? ''

  const cols: Col<Row>[] = [
    { key: 'player', label: 'Player', align: 'left', get: (r) => r.player.name, cell: (r) => (
      <span className="flex items-center gap-2.5">
        <PlayerAvatar profile player={r.player} team={team} size={34} />
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-white">{r.player.name}</span>
            <OverseasTag playerId={r.player.id} team={team} />
            {team.captainId === r.player.id && <span className="rounded bg-amber-400/25 px-1.5 py-px text-[11px] font-bold text-amber-300">C</span>}
            {data.keeper === r.player.id && <span className="rounded bg-sky-400/25 px-1.5 py-px text-[11px] font-bold text-sky-300">WK</span>}
          </span>
          <span className="block text-xs text-slate-400">
            {ROLE_LABEL[r.player.role]}{r.player.bowling ? ` · ${r.player.bowling.type}` : ''}
            {r.injury && <span className="ml-1.5 rounded px-1.5 py-px text-[11px] font-bold uppercase" style={{ background: `${SEVERITY_COLOR[r.injury.severity]}30`, color: SEVERITY_COLOR[r.injury.severity] }} title={`${r.injury.severity} injury, back on ${formatDate(r.injury.back)}`}>{r.injury.name} · {Math.max(1, daysBetween(season.today, r.injury.back))}d</span>}
          </span>
        </span>
      </span>
    ) },
    { key: 'ovr', label: 'Rating', get: (r) => overall(r.player), cell: (r) => (
      <span className="inline-flex items-center justify-end gap-1.5">
        {r.change !== 0 && <span className={`text-xs font-bold ${r.change > 0 ? 'text-emerald-400' : 'text-rose-400'}`} title="Change since the career began">{r.change > 0 ? '▲' : '▼'}{Math.abs(r.change)}</span>}
        <RatingBadge value={overall(r.player)} size="sm" />
      </span>
    ) },
    { key: 'form', label: 'Form', get: (r) => formOf(r.player.id), cell: (r) => <span className="inline-flex justify-end"><FormBar z={formOf(r.player.id)} /></span> },
    { key: 'runs', label: 'Runs', get: (r) => r.bat?.runs ?? null, cell: (r) => (r.bat ? <b className="text-white">{r.bat.runs}</b> : '-') },
    { key: 'avg', label: 'Avg', get: (r) => (r.bat ? average(r.bat) : null), cell: (r) => f1(r.bat ? average(r.bat) : null) },
    { key: 'sr', label: 'SR', get: (r) => (r.bat ? strikeRate(r.bat) : null), cell: (r) => f1(r.bat ? strikeRate(r.bat) : null) },
    { key: 'wkts', label: 'Wkts', get: (r) => r.bowl?.wickets ?? null, cell: (r) => (r.bowl ? <b className="text-white">{r.bowl.wickets}</b> : '-') },
    { key: 'econ', label: 'Econ', first: 'asc', get: (r) => (r.bowl ? economy(r.bowl) : null), cell: (r) => f1(r.bowl ? economy(r.bowl) : null, 2) },
  ]
  const xi = data.rows.filter((r) => r.pos !== null)
  const bench = data.rows.filter((r) => r.pos === null)

  return (
    <div className="space-y-6">
      <Link to={paths.competitions} className="inline-block text-sm text-slate-400 hover:text-white">← Tournaments</Link>

      <div className="rounded-3xl border border-line bg-panel p-5 md:p-6" style={{ borderTop: `4px solid ${accent}` }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <TeamCrest team={team} size={84} />
            <div>
              <h2 className="font-display text-4xl leading-none tracking-wide text-white">{team.name}</h2>
              <div className="mt-1.5 text-sm text-slate-300">{team.series} · home: {team.home}</div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {data.mine && <span className="rounded bg-amber-400 px-1.5 py-0.5 text-[11px] font-extrabold text-black">YOUR TEAM</span>}
                {form.length > 0 && <span className="flex items-center gap-1 text-xs text-slate-400">Form <span className="flex gap-0.5">{form.map((x, i) => <span key={i} className={`grid h-5 w-5 place-items-center rounded-sm text-[11px] font-extrabold ${FORM_COLOR[x]}`}>{x}</span>)}</span></span>}
                <Link to={paths.team(team.id)} className="text-xs text-indigo-300 hover:underline">Team page (starting squad)</Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-xl"><CoachCard teamId={team.id} /></div>

      <div className="grid grid-cols-3 gap-2 lg:grid-cols-6 lg:gap-3">
        {tile('Played', record?.played ?? 0)}
        {tile('Won', <span className="text-emerald-400">{record?.won ?? 0}</span>)}
        {tile('Lost', <span className="text-rose-400">{record?.lost ?? 0}</span>)}
        {tile('Tied', record?.tied ?? 0)}
        {tile('Win rate', `${record && record.played ? Math.round((record.won / record.played) * 100) : 0}%`)}
        {tile('Titles', <span className="text-amber-300">{record?.titles ?? 0}</span>)}
      </div>

      <section>
        <h3 className="mb-1 font-display text-3xl tracking-wide">{isCurrent ? 'Squad right now' : `Squad in ${season.year}`}</h3>
        <p className="mb-3 text-sm text-slate-400">
          {!isCurrent ? `The squad ${team.name} ended ${season.year} with, in batting order, with the ratings they had that year.` : data.mine ? 'The XI and batting order you have set for this career.' : `The XI ${team.name} would name today, in batting order. The computer drops players who are injured or badly out of form.`}{isCurrent ? ' Ratings include everything earned so far this career.' : ''}
        </p>
        {data.news.length > 0 && (
          <div className="mb-3 rounded-xl border border-line bg-panel-2 p-3">
            <div className="mb-1 text-[11px] font-extrabold uppercase tracking-widest text-sky-300">Selection changes from the usual XI</div>
            <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-200">
              {data.news.map((n) => <li key={`${n.playerId}-${n.kind}`}><span className={n.kind === 'in' ? 'font-bold text-emerald-300' : 'font-bold text-rose-300'}>{n.kind === 'in' ? '▲ In' : '▼ Out'}</span> {nameOf(n.playerId)} <span className="text-slate-400">({n.why})</span></li>)}
            </ul>
          </div>
        )}
        <div className="overflow-x-auto rounded-2xl border border-line bg-panel p-3">
          <div className="px-2 pb-1 text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Playing XI · batting order</div>
          <SortTable rows={xi} cols={cols} rowKey={(r) => r.player.id} lead={(i, def) => <td className="w-8 px-2 text-center font-display text-lg text-slate-500">{def ? i + 1 : ''}</td>} />
        </div>
        {bench.length > 0 && (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-line bg-panel p-3">
            <div className="px-2 pb-1 text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Bench</div>
            <SortTable rows={bench} cols={cols} rowKey={(r) => r.player.id} lead={() => <td className="w-8" />} />
          </div>
        )}
      </section>

      {upcoming.length > 0 && (
        <section>
          <h3 className="mb-2 font-display text-3xl tracking-wide">Coming up</h3>
          <div className="grid gap-2 lg:grid-cols-2">{upcoming.map((f) => <FixtureRow key={f.id} season={season} fixture={f} teams={teams} showDate showCompetition perspective={team.id} />)}</div>
        </section>
      )}

      <section>
        <h3 className="mb-2 font-display text-3xl tracking-wide">Results {isCurrent ? 'this season' : `in ${season.year}`} <span className="text-lg text-slate-500">{played.length} matches · {formatDate(season.today)}</span></h3>
        {played.length === 0
          ? <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-slate-400">{team.name} haven't played a match {isCurrent ? 'yet this season' : `in ${season.year}`}.</p>
          : <div className="grid gap-2 lg:grid-cols-2">{played.map((f) => <FixtureRow key={f.id} season={season} fixture={f} teams={teams} showDate showCompetition perspective={team.id} />)}</div>}
      </section>
    </div>
  )
}
