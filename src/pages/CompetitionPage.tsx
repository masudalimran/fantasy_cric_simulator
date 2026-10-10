import { Link, useParams } from 'react-router'
import { useMemo } from 'react'
import { FixtureRow, PlayerCell, competitionColor, competitionName, usePlayerIndex, useTeamMap } from '../components/season/shared'
import { TeamCrest } from '../components/ui'
import { paths } from '../routes'
import { formatDate } from '../season/dates'
import { competitionStatus, tableFor } from '../season/results'
import { collect, mostValuable, topBatsmen, topBowlers } from '../season/stats'
import type { Competition, Fixture, Season } from '../season/types'
import { selectSeason, useStore } from '../store/useStore'
import type { Team } from '../types'

function Table({ title, season, comp, group, teams }: { title: string; season: Season; comp: Competition; group: string | null; teams: Map<string, Team> }) {
  const rows = tableFor(season, comp, group)
  const qualifiers = comp.kind === 'league' ? 4 : comp.kind === 'cup' ? 2 : 0
  const th = 'px-2 py-2 text-right font-medium'
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-panel p-3">
      <div className="mb-1 px-2 font-display text-2xl tracking-wide text-slate-200">{title}</div>
      <table className="w-full text-sm">
        <thead className="text-[11px] uppercase tracking-wider text-slate-500">
          <tr><th className="px-2 py-2 text-left font-medium">#</th><th className="px-2 py-2 text-left font-medium">Team</th><th className={th}>P</th><th className={th}>W</th><th className={th}>L</th><th className={th}>T</th><th className={th}>NRR</th><th className={th}>Pts</th></tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const t = teams.get(r.teamId)
            return (
              <tr key={r.teamId} className={`border-t border-line/60 ${i < qualifiers ? '' : 'text-slate-400'}`} style={i === qualifiers - 1 && qualifiers ? { borderBottom: '2px dashed #3b4258' } : undefined}>
                <td className="px-2 py-1.5 tabular-nums text-slate-500">{i + 1}</td>
                <td className="px-2 py-1.5"><Link to={t ? paths.team(t.id) : '#'} className="flex items-center gap-2 hover:text-white">{t && <TeamCrest team={t} size={26} />}<span className="font-medium text-slate-100">{t?.name ?? r.teamId}</span></Link></td>
                <td className="px-2 text-right tabular-nums">{r.played}</td>
                <td className="px-2 text-right tabular-nums">{r.won}</td>
                <td className="px-2 text-right tabular-nums">{r.lost}</td>
                <td className="px-2 text-right tabular-nums">{r.tied}</td>
                <td className="px-2 text-right tabular-nums text-slate-400">{r.nrr >= 0 ? '+' : ''}{r.nrr.toFixed(2)}</td>
                <td className="px-2 text-right font-bold tabular-nums text-white">{r.points}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {qualifiers > 0 && <div className="px-2 pt-1 text-[11px] text-slate-500">Top {qualifiers} go through to the semi-finals.</div>}
    </div>
  )
}

/** Section a fixture belongs to: whole stages, not one heading per knockout match. */
const sectionOf = (f: Fixture) =>
  f.phase === 'group' ? 'Group stage' : f.phase === 'league' ? 'League stage' : f.phase === 'series' ? 'Matches' : f.stage.replace(/-final \d+$/, '-finals')

export function CompetitionPage() {
  const { id = '' } = useParams()
  const season = useStore(selectSeason)
  const teams = useTeamMap()
  const index = usePlayerIndex()
  const comp = season?.competitions.find((c) => c.id === id)
  const stats = useMemo(() => (season && comp ? collect(season, { competitionId: comp.id }) : null), [season, comp])
  if (!season || !comp || !stats) {
    return (
      <div className="rounded-2xl border border-dashed border-line p-12 text-center text-slate-400">
        We couldn't find that tournament. <Link to={paths.competitions} className="text-indigo-300 hover:underline">All tournaments</Link>
      </div>
    )
  }
  const origin = comp.originTeamId ? teams.get(comp.originTeamId) : undefined
  const st = competitionStatus(season, comp)
  const champ = st.champion ? teams.get(st.champion) : undefined
  const fixtures = season.fixtures.filter((f) => f.competitionId === comp.id)
  const stages = [...new Set(fixtures.map(sectionOf))]
  const color = competitionColor(comp, teams)

  return (
    <div>
      <Link to={paths.competitions} className="mb-4 inline-block text-sm text-slate-400 hover:text-white">← All tournaments</Link>
      <div className="relative overflow-hidden rounded-3xl border border-line bg-panel p-6 md:p-8" style={{ borderTop: `4px solid ${color}` }}>
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-5">
            {origin && <TeamCrest team={origin} size={84} />}
            <div>
              <h1 className="font-display text-5xl leading-none tracking-wide text-white">{competitionName(comp, teams)}</h1>
              <div className="mt-2 text-sm text-slate-300">{origin ? <>Founded by <Link to={paths.team(origin.id)} className="text-indigo-300 hover:underline">{origin.name}</Link> <span className="text-slate-400">({origin.series})</span></> : 'Friendly series'} · {comp.format.toUpperCase()} · {comp.kind}</div>
              <div className="mt-1 text-xs text-slate-500">{formatDate(comp.startDate)} – {formatDate(comp.endDate)} · {st.played}/{st.total} played</div>
            </div>
          </div>
          {champ && (
            <div className="rounded-2xl border border-amber-400/50 bg-amber-400/10 px-5 py-3 text-center">
              <div className="text-[11px] uppercase tracking-widest text-amber-200/80">Champions</div>
              <div className="mt-1 flex items-center gap-2 text-lg font-bold text-amber-300"><TeamCrest team={champ} size={36} /> {champ.name}</div>
            </div>
          )}
        </div>
        {comp.blurb && <p className="mt-4 max-w-3xl text-sm italic text-slate-400">{comp.blurb}</p>}
      </div>

      {stats.matches > 0 && (() => {
        const orange = topBatsmen(stats, 1)[0]
        const purple = topBowlers(stats, 1)[0]
        const mvp = mostValuable(stats, 1)[0]
        const card = 'rounded-2xl border border-line bg-panel p-4'
        return (
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {orange && <div className={card}><div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-widest text-orange-300"><span className="h-3 w-3 rounded-full bg-orange-500" />Orange Cap · most runs</div><PlayerCell id={orange.id} index={index} size={44} /><div className="mt-2 font-display text-3xl text-white">{orange.runs} <span className="text-sm font-sans text-slate-500">runs, HS {orange.high}{orange.highNotOut ? '*' : ''}</span></div></div>}
            {purple && <div className={card}><div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-widest text-purple-300"><span className="h-3 w-3 rounded-full bg-purple-500" />Purple Cap · most wickets</div><PlayerCell id={purple.id} index={index} size={44} /><div className="mt-2 font-display text-3xl text-white">{purple.wickets} <span className="text-sm font-sans text-slate-500">wickets, best {purple.bestW}/{purple.bestR}</span></div></div>}
            {mvp && <div className={card}><div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-widest text-amber-300"><span className="h-3 w-3 rounded-full bg-amber-400" />{st.status === 'done' ? 'Player of the tournament' : 'Most valuable so far'}</div><PlayerCell id={mvp.id} index={index} size={44} /><div className="mt-2 font-display text-3xl text-white">{Math.round(mvp.points)} <span className="text-sm font-sans text-slate-500">impact points</span></div></div>}
            <Link to={`${paths.stats}?scope=${encodeURIComponent(comp.id)}`} className="text-sm text-indigo-300 hover:underline md:col-span-3">Full stats for this tournament →</Link>
          </div>
        )
      })()}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {comp.kind === 'league' && <Table title="Table" season={season} comp={comp} group={null} teams={teams} />}
        {comp.kind === 'cup' && comp.groups && Object.keys(comp.groups).map((g) => <Table key={g} title={`Group ${g}`} season={season} comp={comp} group={g} teams={teams} />)}
        {comp.kind === 'series' && <Table title="Series" season={season} comp={comp} group={null} teams={teams} />}
      </div>

      <h2 className="mb-3 mt-8 font-display text-3xl tracking-wide">Fixtures</h2>
      <div className="space-y-6">
        {stages.map((stage) => {
          const list = fixtures.filter((f) => sectionOf(f) === stage)
          return (
            <section key={stage}>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-widest text-slate-400">{stage}</h3>
              <div className="grid gap-2 lg:grid-cols-2">{list.map((f) => <FixtureRow key={f.id} season={season} fixture={f} teams={teams} showDate />)}</div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
