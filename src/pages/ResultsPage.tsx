import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { FixtureRow, competitionName, useTeamMap } from '../components/season/shared'
import { paths } from '../routes'
import { useViewedSeason } from '../store/useStore'

const PAGE = 30

/** Every match that has been played, newest first, filtered by tournament or team. */
export function ResultsPage() {
  const { season } = useViewedSeason()
  const teams = useTeamMap()
  const [comp, setComp] = useState('')
  const [team, setTeam] = useState('')
  const [shown, setShown] = useState(PAGE)

  const all = useMemo(() => (season ? season.fixtures.filter((f) => season.results[f.id]).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)) : []), [season])
  const list = useMemo(() => all.filter((f) => (!comp || f.competitionId === comp) && (!team || f.homeId === team || f.awayId === team)), [all, comp, team])
  if (!season) return null
  const sel = 'w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm sm:w-auto'
  const comps = season.competitions.filter((c) => all.some((f) => f.competitionId === c.id))
  const clubs = season.teamIds.map((id) => teams.get(id)).filter((t): t is NonNullable<typeof t> => !!t).sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div>
      <Link to={paths.competitions} className="mb-3 inline-block text-sm text-slate-400 hover:text-white">← Tournaments</Link>
      <h2 className="font-display text-4xl tracking-wide">All results <span className="text-slate-500">{season.year}</span></h2>
      <p className="mb-4 text-sm text-slate-400">{all.length} matches played. Click a match for its summary and scorecards.</p>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select value={comp} onChange={(e) => { setComp(e.target.value); setShown(PAGE) }} className={sel} aria-label="Filter by tournament">
          <option value="">All tournaments</option>
          {comps.map((c) => <option key={c.id} value={c.id}>{competitionName(c, teams)}</option>)}
        </select>
        <select value={team} onChange={(e) => { setTeam(e.target.value); setShown(PAGE) }} className={sel} aria-label="Filter by team">
          <option value="">All teams</option>
          {clubs.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <span className="text-sm text-slate-500">{list.length} shown</span>
      </div>
      {list.length === 0
        ? <p className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-slate-400">No matches to show.</p>
        : <div className="grid gap-2 lg:grid-cols-2">{list.slice(0, shown).map((f) => <FixtureRow key={f.id} season={season} fixture={f} teams={teams} showDate showCompetition perspective={team || undefined} />)}</div>}
      {list.length > shown && <div className="mt-4 text-center"><button onClick={() => setShown((n) => n + PAGE)} className="rounded-full border border-line px-6 py-2 text-sm font-semibold text-slate-200 hover:border-indigo-400">Show {Math.min(PAGE, list.length - shown)} more</button></div>}
    </div>
  )
}
