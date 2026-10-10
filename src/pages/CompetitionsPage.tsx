import { Link } from 'react-router'
import { competitionColor, competitionName, useTeamMap } from '../components/season/shared'
import { TeamCrest } from '../components/ui'
import { paths } from '../routes'
import { formatDate } from '../season/dates'
import { competitionStatus } from '../season/results'
import { selectSeason, useStore } from '../store/useStore'

export function CompetitionsPage() {
  const season = useStore(selectSeason)
  const teams = useTeamMap()
  if (!season) {
    return (
      <div className="rounded-2xl border border-dashed border-line p-12 text-center text-slate-400">
        No session yet. <Link to={paths.sessions} className="text-indigo-300 hover:underline">Create one</Link>.
      </div>
    )
  }
  const tournaments = season.competitions.filter((c) => c.kind !== 'series')
  const series = season.competitions.filter((c) => c.kind === 'series')
  const badge: Record<string, string> = { upcoming: 'text-slate-400 border-line', live: 'text-emerald-300 border-emerald-500/50', done: 'text-amber-300 border-amber-500/50' }

  const card = (c: (typeof tournaments)[number]) => {
    const st = competitionStatus(season, c)
    const origin = c.originTeamId ? teams.get(c.originTeamId) : undefined
    const champ = st.champion ? teams.get(st.champion) : undefined
    return (
      <Link key={c.id} to={paths.competition(c.id)} className="group rounded-2xl border border-line bg-panel p-4 transition hover:border-slate-500" style={{ borderTop: `3px solid ${competitionColor(c, teams)}` }}>
        <div className="flex items-start gap-3">
          {origin ? <TeamCrest team={origin} size={52} /> : <div className="h-[52px] w-[52px]" />}
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-white">{c.name}</div>
            <div className="text-xs text-slate-400">{origin ? `Founded by ${origin.name} (${origin.series})` : 'Friendly series'} · {c.format.toUpperCase()} · {c.kind}</div>
          </div>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${badge[st.status]}`}>{st.status}</span>
        </div>
        <div className="mt-3 text-xs text-slate-500">{formatDate(c.startDate)} – {formatDate(c.endDate)} · {st.played}/{st.total} played</div>
        {champ && <div className="mt-2 flex items-center gap-2 text-sm text-amber-300"><TeamCrest team={champ} size={22} /> Champions: {champ.name}</div>}
      </Link>
    )
  }

  return (
    <div>
      <h1 className="font-display text-5xl tracking-wide">Tournaments <span className="text-slate-500">{season.year}</span></h1>
      <p className="mb-6 text-sm text-slate-400">Every tournament started with one team. Friendly series fill the gaps so everyone meets everyone.</p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{tournaments.map(card)}</div>
      <h2 className="mb-3 mt-10 font-display text-3xl tracking-wide text-slate-300">Friendly series <span className="text-base text-slate-500">{series.length}</span></h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {series.map((c) => {
          const st = competitionStatus(season, c)
          const [a, b] = c.teamIds.map((id) => teams.get(id))
          return (
            <Link key={c.id} to={paths.competition(c.id)} className="flex items-center gap-3 rounded-xl border border-line bg-panel p-3 hover:border-slate-500">
              {a && <TeamCrest team={a} size={34} />}
              <span className="font-display text-lg text-slate-600">V</span>
              {b && <TeamCrest team={b} size={34} />}
              <div className="min-w-0 flex-1"><div className="text-sm font-semibold leading-tight text-white">{competitionName(c, teams)}</div><div className="text-xs text-slate-500">{formatDate(c.startDate)}</div></div>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase ${badge[st.status]}`}>{st.status}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
