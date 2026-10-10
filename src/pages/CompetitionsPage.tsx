import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { FixtureRow, PlayerCell, competitionColor, competitionName, usePlayerIndex, useTeamMap } from '../components/season/shared'
import { TeamCrest } from '../components/ui'
import { paths } from '../routes'
import { formatDate } from '../season/dates'
import { competitionStatus, tableFor } from '../season/results'
import { collect, mostValuable, teamRecords, topBatsmen, topBowlers } from '../season/stats'
import { SortTable, type Col } from '../components/season/SortTable'
import type { Competition, Fixture, Season } from '../season/types'
import { useViewedSeason } from '../store/useStore'
import type { Team } from '../types'

const STATUS_STYLE: Record<string, string> = { upcoming: 'text-slate-400 border-line', live: 'text-emerald-300 border-emerald-500/50', done: 'text-amber-300 border-amber-500/50' }

/** The last few results of each team in a competition, oldest first: W, L or T. */
function formOf(season: Season, comp: Competition) {
  const out = new Map<string, ('W' | 'L' | 'T')[]>()
  const played = season.fixtures.filter((f) => f.competitionId === comp.id && f.phase !== 'knockout' && season.results[f.id] && f.homeId && f.awayId).sort((a, b) => a.date.localeCompare(b.date))
  for (const f of played) {
    const r = season.results[f.id]
    for (const id of [f.homeId as string, f.awayId as string]) {
      const list = out.get(id) ?? []
      list.push(r.winnerId === id ? 'W' : r.winnerId === null ? 'T' : 'L')
      out.set(id, list)
    }
  }
  return out
}

const FORM_COLOR = { W: 'bg-emerald-500 text-black', L: 'bg-rose-500 text-white', T: 'bg-slate-500 text-white' } as const

function Standings({ title, season, comp, group, teams, form }: { title: string; season: Season; comp: Competition; group: string | null; teams: Map<string, Team>; form: Map<string, ('W' | 'L' | 'T')[]> }) {
  const rows = tableFor(season, comp, group)
  const qualifiers = comp.kind === 'league' ? 4 : comp.kind === 'cup' ? 2 : 0
  const th = 'px-2 py-2 text-right font-medium'
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-panel p-3">
      <div className="mb-1 px-2 font-display text-2xl tracking-wide text-slate-200">{title}</div>
      <table className="w-full text-sm">
        <thead className="text-[11px] uppercase tracking-wider text-slate-500">
          <tr><th className="px-2 py-2 text-left font-medium">#</th><th className="px-2 py-2 text-left font-medium">Team</th><th className={th}>P</th><th className={th}>W</th><th className={th}>L</th><th className={th}>T</th><th className={th}>NRR</th><th className={th}>Pts</th><th className="px-2 py-2 text-left font-medium">Form</th></tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const t = teams.get(r.teamId)
            const mine = r.teamId === season.myTeamId
            return (
              <tr key={r.teamId} className={`border-t border-line/60 ${mine ? 'bg-amber-400/10' : ''} ${i < qualifiers || r.played === 0 ? '' : 'text-slate-400'}`} style={i === qualifiers - 1 && qualifiers ? { borderBottom: '2px dashed #3b4258' } : undefined}>
                <td className="px-2 py-1.5 tabular-nums text-slate-500">{i + 1}</td>
                <td className="px-2 py-1.5"><Link to={t ? paths.careerTeam(t.id) : '#'} className="flex items-center gap-2 hover:text-white">{t && <TeamCrest team={t} size={26} />}<span className={`font-medium ${mine ? 'text-amber-200' : 'text-slate-100'}`}>{t?.name ?? r.teamId}</span>{mine && <span className="rounded bg-amber-400 px-1 py-px text-[9px] font-extrabold text-black">YOU</span>}</Link></td>
                <td className="px-2 text-right tabular-nums">{r.played}</td>
                <td className="px-2 text-right tabular-nums">{r.won}</td>
                <td className="px-2 text-right tabular-nums">{r.lost}</td>
                <td className="px-2 text-right tabular-nums">{r.tied}</td>
                <td className="px-2 text-right tabular-nums text-slate-400">{r.nrr >= 0 ? '+' : ''}{r.nrr.toFixed(2)}</td>
                <td className="px-2 text-right font-bold tabular-nums text-white">{r.points}</td>
                <td className="px-2"><span className="flex gap-0.5">{(form.get(r.teamId) ?? []).slice(-5).map((x, k) => <span key={k} className={`grid h-4 w-4 place-items-center rounded-sm text-[9px] font-extrabold ${FORM_COLOR[x]}`}>{x}</span>)}</span></td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {qualifiers > 0 && <div className="px-2 pt-1 text-[11px] text-slate-500">Above the dashed line go through to the semi-finals.</div>}
    </div>
  )
}

/** Section a fixture belongs to: whole stages, not one heading per knockout match. */
const sectionOf = (f: Fixture) =>
  f.phase === 'group' ? 'Group stage' : f.phase === 'league' ? 'League stage' : f.phase === 'series' ? 'Matches' : f.stage.replace(/-final \d+$/, '-finals')

function Tournament({ season, comp, teams }: { season: Season; comp: Competition; teams: Map<string, Team> }) {
  const index = usePlayerIndex()
  const [view, setView] = useState<'results' | 'upcoming'>('upcoming')
  const stats = useMemo(() => collect(season, { competitionId: comp.id }), [season, comp.id])
  const form = useMemo(() => formOf(season, comp), [season, comp])
  const st = competitionStatus(season, comp)
  const origin = comp.originTeamId ? teams.get(comp.originTeamId) : undefined
  const champ = st.champion ? teams.get(st.champion) : undefined
  const fixtures = season.fixtures.filter((f) => f.competitionId === comp.id)
  const knockouts = fixtures.filter((f) => f.phase === 'knockout').sort((a, b) => a.date.localeCompare(b.date))
  const rest = fixtures.filter((f) => f.phase !== 'knockout')
  const shown = rest.filter((f) => (view === 'results' ? !!season.results[f.id] : !season.results[f.id])).sort((a, b) => (view === 'results' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)))
  const stages = [...new Set(shown.map(sectionOf))]
  const color = competitionColor(comp, teams)
  const card = 'rounded-2xl border border-line bg-panel p-4'
  const orange = stats.matches > 0 ? topBatsmen(stats, 1)[0] : undefined
  const purple = stats.matches > 0 ? topBowlers(stats, 1)[0] : undefined
  const mvp = stats.matches > 0 ? mostValuable(stats, 1)[0] : undefined

  return (
    <div className="min-w-0 space-y-5">
      <div className="rounded-3xl border border-line bg-panel p-5 md:p-6" style={{ borderTop: `4px solid ${color}` }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {origin && <TeamCrest team={origin} size={72} />}
            <div>
              <h2 className="font-display text-4xl leading-none tracking-wide text-white">{competitionName(comp, teams)}</h2>
              <div className="mt-1.5 text-sm text-slate-300">{origin ? <>Founded by <Link to={paths.careerTeam(origin.id)} className="text-indigo-300 hover:underline">{origin.name}</Link> <span className="text-slate-400">({origin.series})</span></> : 'Friendly series'} · {comp.format.toUpperCase()} · {comp.kind}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">{formatDate(comp.startDate)} – {formatDate(comp.endDate)} · {st.played}/{st.total} played <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${STATUS_STYLE[st.status]}`}>{st.status}</span></div>
            </div>
          </div>
          {champ && (
            <div className="rounded-2xl border border-amber-400/50 bg-amber-400/10 px-5 py-3 text-center">
              <div className="text-[11px] uppercase tracking-widest text-amber-200/80">Champions</div>
              <div className="mt-1 flex items-center gap-2 text-lg font-bold text-amber-300"><TeamCrest team={champ} size={34} /> {champ.name}</div>
            </div>
          )}
        </div>
        {comp.blurb && <p className="mt-3 max-w-3xl text-sm italic text-slate-400">{comp.blurb}</p>}
      </div>

      <section>
        <h3 className="mb-2 font-display text-3xl tracking-wide">Standings</h3>
        <div className={`grid gap-4 ${comp.kind === 'cup' ? 'xl:grid-cols-2' : ''}`}>
          {comp.kind === 'league' && <Standings title="League table" season={season} comp={comp} group={null} teams={teams} form={form} />}
          {comp.kind === 'cup' && comp.groups && Object.keys(comp.groups).map((g) => <Standings key={g} title={`Group ${g}`} season={season} comp={comp} group={g} teams={teams} form={form} />)}
          {comp.kind === 'series' && <Standings title="Series" season={season} comp={comp} group={null} teams={teams} form={form} />}
          {comp.kind === 'knockout' && <p className="text-sm text-slate-400">This is a straight knockout, so there is no table. Follow the bracket below.</p>}
        </div>
      </section>

      {knockouts.length > 0 && (
        <section>
          <h3 className="mb-2 font-display text-3xl tracking-wide">Playoffs</h3>
          <div className="grid gap-2 lg:grid-cols-2">{knockouts.map((f) => <div key={f.id}><div className="mb-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">{f.stage}</div><FixtureRow season={season} fixture={f} teams={teams} showDate /></div>)}</div>
        </section>
      )}

      {(orange || purple || mvp) && (
        <section>
          <h3 className="mb-2 font-display text-3xl tracking-wide">Leaders</h3>
          <div className="grid gap-3 md:grid-cols-3">
            {orange && <div className={card}><div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-widest text-orange-300"><span className="h-3 w-3 rounded-full bg-orange-500" />Orange Cap · most runs</div><PlayerCell id={orange.id} index={index} size={44} /><div className="mt-2 font-display text-3xl text-white">{orange.runs} <span className="font-sans text-sm text-slate-500">runs, HS {orange.high}{orange.highNotOut ? '*' : ''}</span></div></div>}
            {purple && <div className={card}><div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-widest text-purple-300"><span className="h-3 w-3 rounded-full bg-purple-500" />Purple Cap · most wickets</div><PlayerCell id={purple.id} index={index} size={44} /><div className="mt-2 font-display text-3xl text-white">{purple.wickets} <span className="font-sans text-sm text-slate-500">wickets, best {purple.bestW}/{purple.bestR}</span></div></div>}
            {mvp && <div className={card}><div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-widest text-amber-300"><span className="h-3 w-3 rounded-full bg-amber-400" />{st.status === 'done' ? 'Player of the tournament' : 'Most valuable so far'}</div><PlayerCell id={mvp.id} index={index} size={44} /><div className="mt-2 font-display text-3xl text-white">{Math.round(mvp.points)} <span className="font-sans text-sm text-slate-500">impact points</span></div></div>}
          </div>
          <Link to={`${paths.stats}?scope=${encodeURIComponent(comp.id)}`} className="mt-2 inline-block text-sm text-indigo-300 hover:underline">Full stats for this tournament →</Link>
        </section>
      )}

      {rest.length > 0 && (
        <section>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-3xl tracking-wide">Matches</h3>
            <div className="flex overflow-hidden rounded-full border border-line text-sm">
              {([['upcoming', 'Upcoming'], ['results', 'Results']] as const).map(([v, l]) => <button key={v} onClick={() => setView(v)} className={`px-4 py-1.5 transition ${view === v ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}>{l}</button>)}
            </div>
          </div>
          {shown.length === 0 && <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-slate-400">{view === 'results' ? 'Nothing has been played yet.' : 'Every match has been played.'}</p>}
          <div className="space-y-5">
            {stages.map((stage) => (
              <div key={stage}>
                <h4 className="mb-2 text-sm font-semibold uppercase tracking-widest text-slate-400">{stage}</h4>
                <div className="grid gap-2 lg:grid-cols-2">{shown.filter((f) => sectionOf(f) === stage).map((f) => <FixtureRow key={f.id} season={season} fixture={f} teams={teams} showDate />)}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

/** Every tournament and series together: how each team has done across all of them, and the latest matches. */
function AllTournaments({ season, teams }: { season: Season; teams: Map<string, Team> }) {
  const rows = useMemo(() => teamRecords(season), [season])
  const played = season.fixtures.filter((f) => season.results[f.id]).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
  const upcoming = season.fixtures.filter((f) => !season.results[f.id] && f.homeId && f.awayId).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8)
  type Row = (typeof rows)[number]
  const winPct = (r: Row) => (r.won / Math.max(r.played, 1)) * 100
  const cols: Col<Row>[] = [
    { key: 'team', label: 'Team', align: 'left', get: (r) => teams.get(r.teamId)?.name ?? r.teamId, cell: (r) => {
      const t = teams.get(r.teamId)
      const mine = r.teamId === season.myTeamId
      return <Link to={t ? paths.careerTeam(t.id) : '#'} className="flex items-center gap-2 hover:text-white">{t && <TeamCrest team={t} size={28} />}<span className={`font-medium ${mine ? 'text-amber-200' : 'text-slate-100'}`}>{t?.name ?? r.teamId}</span>{mine && <span className="rounded bg-amber-400 px-1 py-px text-[9px] font-extrabold text-black">YOU</span>}</Link>
    } },
    { key: 'p', label: 'P', get: (r) => r.played, cell: (r) => r.played },
    { key: 'w', label: 'W', get: (r) => r.won, cell: (r) => r.won },
    { key: 'l', label: 'L', first: 'asc', get: (r) => r.lost, cell: (r) => r.lost },
    { key: 't', label: 'T', get: (r) => r.tied, cell: (r) => r.tied },
    { key: 'nrr', label: 'NRR', get: (r) => r.nrr, cell: (r) => <span className="text-slate-400">{r.nrr >= 0 ? '+' : ''}{r.nrr.toFixed(2)}</span> },
    { key: 'pts', label: 'Pts', get: (r) => r.points, cell: (r) => <span className="font-bold text-white">{r.points}</span> },
    { key: 'pct', label: 'Win %', get: winPct, cell: (r) => <span className="font-bold text-white">{winPct(r).toFixed(0)}%</span> },
    { key: 'titles', label: 'Titles', get: (r) => r.titles, cell: (r) => <span className="font-bold text-amber-300">{r.titles || ''}</span> },
  ]
  return (
    <div className="min-w-0 space-y-5">
      <div className="rounded-3xl border border-line bg-panel p-5 md:p-6" style={{ borderTop: '4px solid #94a3b8' }}>
        <h2 className="font-display text-4xl leading-none tracking-wide text-white">All tournaments</h2>
        <p className="mt-1.5 text-sm text-slate-300">Every tournament and friendly series put together. {played.length} of {season.fixtures.length} matches played.</p>
      </div>
      <section>
        <h3 className="mb-2 font-display text-3xl tracking-wide">Team record, all competitions</h3>
        <div className="overflow-x-auto rounded-2xl border border-line bg-panel p-3">
          {rows.length === 0
            ? <p className="p-6 text-center text-sm text-slate-400">No matches have been played yet.</p>
            : <SortTable rows={rows} cols={cols} rowKey={(r) => r.teamId} lead={(i) => <td className="w-10 px-2 text-center text-slate-500">{i + 1}</td>} rowClass={(r) => (r.teamId === season.myTeamId ? 'bg-amber-400/10' : '')} />}
        </div>
        <p className="mt-1 text-[11px] text-slate-500">Click a column to sort. Titles count tournament finals won.</p>
      </section>
      {played.length > 0 && (
        <section>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-3xl tracking-wide">Latest results</h3>
            {played.length > 12 && <Link to={paths.results} className="rounded-full border border-line px-4 py-1.5 text-sm font-semibold text-slate-200 transition hover:border-indigo-400 hover:text-white">Show all {played.length} →</Link>}
          </div>
          <div className="grid gap-2 lg:grid-cols-2">{played.slice(0, 12).map((f) => <FixtureRow key={f.id} season={season} fixture={f} teams={teams} showDate showCompetition />)}</div>
        </section>
      )}
      {upcoming.length > 0 && (
        <section>
          <h3 className="mb-2 font-display text-3xl tracking-wide">Coming up</h3>
          <div className="grid gap-2 lg:grid-cols-2">{upcoming.map((f) => <FixtureRow key={f.id} season={season} fixture={f} teams={teams} showDate showCompetition />)}</div>
        </section>
      )}
    </div>
  )
}

/** A tournament with its standings. A list of every tournament in the career sits beside it. */
export function CompetitionsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { season } = useViewedSeason()
  const teams = useTeamMap()
  if (!season) return null

  const tournaments = season.competitions.filter((c) => c.kind !== 'series')
  const series = season.competitions.filter((c) => c.kind === 'series')
  const involves = (c: Competition) => !!season.myTeamId && c.teamIds.includes(season.myTeamId)
  const statusOf = new Map(season.competitions.map((c) => [c.id, competitionStatus(season, c)]))
  // With no tournament chosen, "All tournaments" is what you see.
  const showAll = !id || id === 'all' || !season.competitions.some((c) => c.id === id)
  const comp = showAll ? undefined : season.competitions.find((c) => c.id === id)

  const dot: Record<string, string> = { upcoming: 'bg-slate-500', live: 'bg-emerald-400', done: 'bg-amber-400' }
  const item = (c: Competition) => {
    const st = statusOf.get(c.id)!
    const origin = c.originTeamId ? teams.get(c.originTeamId) : undefined
    const sel = comp?.id === c.id
    const [a, b] = c.kind === 'series' ? c.teamIds.map((x) => teams.get(x)) : []
    return (
      <Link key={c.id} to={paths.competition(c.id)} className={`flex items-center gap-2.5 rounded-xl border px-2.5 py-2 transition ${sel ? 'border-indigo-400 bg-indigo-500/15' : 'border-line bg-panel hover:border-slate-500'}`}>
        {origin ? <TeamCrest team={origin} size={34} /> : a && b ? <span className="flex -space-x-2"><TeamCrest team={a} size={26} /><TeamCrest team={b} size={26} /></span> : <span className="h-[34px] w-[34px]" />}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold leading-tight text-white">{competitionName(c, teams)}</div>
          <div className="text-[11px] text-slate-500">{c.format.toUpperCase()} · {st.played}/{st.total} played{involves(c) ? ' · your team' : ''}</div>
        </div>
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot[st.status]}`} title={st.status} />
      </Link>
    )
  }

  return (
    <div>
      <h2 className="font-display text-4xl tracking-wide">Tournaments <span className="text-slate-500">{season.year}</span></h2>
      <p className="mb-4 text-sm text-slate-400">Every tournament was founded by one team. Friendly series fill the gaps so everyone meets everyone.</p>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* phones: a drop-down; wide screens: the list stays beside the table */}
        <select value={showAll ? 'all' : comp?.id ?? ''} onChange={(e) => navigate(paths.competition(e.target.value))} className="rounded-lg border border-line bg-panel px-3 py-2 text-sm lg:hidden" aria-label="Choose a tournament">
          <option value="all">All tournaments</option>
          <optgroup label="Tournaments">{tournaments.map((c) => <option key={c.id} value={c.id}>{competitionName(c, teams)}</option>)}</optgroup>
          <optgroup label="Friendly series">{series.map((c) => <option key={c.id} value={c.id}>{competitionName(c, teams)}</option>)}</optgroup>
        </select>
        <aside className="hidden space-y-1.5 lg:block lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto lg:pr-1">
          <Link to={paths.competition('all')} className={`flex items-center gap-2.5 rounded-xl border px-2.5 py-2.5 transition ${showAll ? 'border-indigo-400 bg-indigo-500/15' : 'border-line bg-panel hover:border-slate-500'}`}>
            <span className="grid h-[34px] w-[34px] place-items-center rounded-lg bg-white/10 font-display text-lg text-white">ALL</span>
            <div className="min-w-0 flex-1"><div className="text-sm font-semibold leading-tight text-white">All tournaments</div><div className="text-[11px] text-slate-500">Team record across everything</div></div>
          </Link>
          {tournaments.map(item)}
          <details className="pt-2" open={comp?.kind === 'series'}>
            <summary className="cursor-pointer px-1 py-1 text-sm font-semibold text-slate-300">Friendly series <span className="font-normal text-slate-500">{series.length}</span></summary>
            <div className="mt-1.5 space-y-1.5">{series.map(item)}</div>
          </details>
        </aside>
        {showAll ? <AllTournaments season={season} teams={teams} /> : comp ? <Tournament key={comp.id} season={season} comp={comp} teams={teams} /> : <p className="text-slate-400">No tournaments in this career.</p>}
      </div>
    </div>
  )
}
