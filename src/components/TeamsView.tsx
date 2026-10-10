import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { paths } from '../routes'
import { overall, teamStrength } from '../data/builders'
import { useTeams } from '../store/useStore'
import type { Team, Universe } from '../types'
import { ImportSeasonStats } from './ImportSeasonStats'
import { accentOf, PlayerAvatar, RatingBadge, TeamBackdrop, TeamCrest } from './ui'

const FILTERS: { id: 'all' | Universe; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'anime', label: 'Anime' },
  { id: 'game', label: 'Games' },
  { id: 'custom', label: 'My Teams' },
]

function TeamCard({ team, index }: { team: Team; index: number }) {
  const accent = accentOf(team)
  const stars = [...team.players.slice(0, 11)].sort((a, b) => overall(b) - overall(a)).slice(0, 3)
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.4) }}
      whileHover={{ y: -5, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="group relative overflow-hidden rounded-2xl border border-line bg-panel text-left"
      style={{ ['--accent' as string]: accent }}
    >
      <Link to={paths.team(team.id)} className="relative block p-4 pt-5" aria-label={team.name}>
      <TeamBackdrop team={team} className="opacity-90 transition group-hover:opacity-100" strength={0.5} />
      <div className="relative flex items-start justify-between">
        <TeamCrest team={team} size={58} />
        <RatingBadge value={teamStrength(team)} size="lg" />
      </div>
      <div className="relative mt-3">
        <div className="text-lg font-bold leading-tight text-white drop-shadow">{team.name || 'Unnamed team'}</div>
        <div className="text-xs text-slate-300">{team.series}</div>
      </div>
      <div className="relative mt-4 flex items-center justify-between">
        <div className="flex -space-x-2">
          {stars.map((p) => (
            <PlayerAvatar key={p.id} profile player={p} team={team} size={34} />
          ))}
        </div>
        <span className="text-[11px] uppercase tracking-wider text-slate-300">{team.players.length} players</span>
      </div>
      </Link>
    </motion.div>
  )
}

export function TeamsView() {
  const all = useTeams()
  const [params, setParams] = useSearchParams()
  const [importing, setImporting] = useState(false)
  const filter = (FILTERS.find((f) => f.id === params.get('filter'))?.id ?? 'all') as 'all' | Universe
  const q = params.get('q') ?? ''
  const update = (key: string, value: string) =>
    setParams((p) => {
      const next = new URLSearchParams(p)
      if (value && value !== 'all') next.set(key, value)
      else next.delete(key)
      return next
    }, { replace: true })

  const teams = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return all
      .filter((t) => filter === 'all' || t.universe === filter)
      .filter((t) => !needle || `${t.name} ${t.series} ${t.short}`.toLowerCase().includes(needle))
  }, [all, filter, q])

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl tracking-wide">Teams</h1>
          <p className="text-sm text-slate-400">{all.length} teams ready to take the field</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(e) => update('q', e.target.value)}
            placeholder="Search teams…"
            className="rounded-lg border border-line bg-panel px-3 py-2 text-sm outline-none focus:border-indigo-400"
          />
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => update('filter', f.id)}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${filter === f.id ? 'border-indigo-400 bg-indigo-400/15 text-white' : 'border-line text-slate-400 hover:text-white'}`}
            >
              {f.label}
            </button>
          ))}
          <button onClick={() => setImporting(true)} className="rounded-full border border-sky-400/60 px-4 py-1.5 text-sm font-semibold text-sky-200 transition hover:bg-sky-400/10" title="Copy the ratings a career season ended with onto the teams">Import stats from a season</button>
          <Link to={paths.newTeam} className="rounded-full bg-indigo-500 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-indigo-400">
            + Create team
          </Link>
        </div>
      </div>
      {teams.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line p-12 text-center text-slate-400">
          {filter === 'custom' ? 'You haven\'t made a team yet. Hit “Create team” to build your own squad.' : 'No teams match.'}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {teams.map((t, i) => (
            <TeamCard key={t.id} team={t} index={i} />
          ))}
        </div>
      )}
      <ImportSeasonStats open={importing} onClose={() => setImporting(false)} />
    </div>
  )
}
