import { NavLink, Navigate, Outlet } from 'react-router'
import { paths } from '../routes'
import { DIFFICULTIES } from '../engine/types'
import { selectSeason, selectSession, useStore } from '../store/useStore'
import { useTeamMap } from './season/shared'
import { TeamCrest } from './ui'

const COLOR = { easy: '#34d399', normal: '#38bdf8', hard: '#fbbf24', legend: '#fb7185' } as const

/**
 * Everything inside one career: its name, the team you manage and the difficulty you chose, and the pages that
 * belong to it (calendar, tournaments, stats, your squad, the season review). Without an open career you are
 * sent to the list of careers.
 */
export function CareerLayout() {
  const season = useStore(selectSeason)
  const session = useStore(selectSession)
  const teams = useTeamMap()
  if (!season || !session) return <Navigate to={paths.sessions} replace />

  const mine = season.myTeamId ? teams.get(season.myTeamId) : undefined
  const diff = season.difficulty ?? 'normal'
  const tabs: [string, string][] = [
    [paths.session(), 'Calendar'],
    [paths.competitions, 'Tournaments'],
    [paths.stats, 'Stats'],
    ...(mine ? ([[paths.sessionSquad, 'My squad'], [paths.review, 'Season review']] as [string, string][]) : []),
  ]

  return (
    <div>
      <div className="mb-5 rounded-2xl border border-line bg-panel px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {mine && <TeamCrest team={mine} size={44} />}
            <div className="min-w-0">
              <div className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Career · {season.year}{session.reviews.length > 0 ? ` · season ${session.reviews.length + 1}` : ''}</div>
              <h1 className="truncate font-display text-3xl leading-none tracking-wide text-white">{session.name}</h1>
              {mine && <div className="mt-0.5 text-sm text-slate-300">You manage <b className="text-white">{mine.name}</b></div>}
            </div>
          </div>
          <span className="rounded px-2.5 py-1 text-xs font-extrabold uppercase tracking-wider" style={{ background: `${COLOR[diff]}26`, color: COLOR[diff] }} title="Chosen when the career started and fixed for the whole career">{DIFFICULTIES[diff].label} difficulty</span>
        </div>
        <nav className="mt-3 flex flex-wrap gap-1.5" aria-label="Career pages">
          {tabs.map(([to, label]) => (
            <NavLink key={to} to={to} className={({ isActive }) => `rounded-full px-4 py-1.5 text-sm font-semibold transition ${isActive ? 'bg-indigo-500 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'}`}>{label}</NavLink>
          ))}
        </nav>
      </div>
      <Outlet />
    </div>
  )
}

