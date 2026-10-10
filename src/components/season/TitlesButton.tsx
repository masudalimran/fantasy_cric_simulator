import { AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { Link } from 'react-router'
import { formatDate } from '../../season/dates'
import type { Season } from '../../season/types'
import { paths } from '../../routes'
import { Sheet } from '../Sheet'
import { competitionName } from './shared'
import type { Team } from '../../types'

/** The number of titles a team has won; click it to see which tournaments they were. */
export function TitlesButton({ season, team, fixtureIds, teams }: { season: Season; team: Team | undefined; fixtureIds: string[]; teams: Map<string, Team> }) {
  const [open, setOpen] = useState(false)
  if (fixtureIds.length === 0) return <span className="text-slate-500">0</span>
  const rows = fixtureIds
    .map((id) => season.fixtures.find((f) => f.id === id))
    .filter((f): f is NonNullable<typeof f> => !!f)
    .map((f) => ({ f, comp: season.competitions.find((c) => c.id === f.competitionId) }))
    .sort((a, b) => a.f.date.localeCompare(b.f.date))
  return (
    <>
      <button onClick={() => setOpen(true)} title="Which titles?" className="cursor-pointer rounded-md px-2 font-bold text-amber-300 underline decoration-dotted underline-offset-4 hover:bg-amber-400/15">{fixtureIds.length}</button>
      <AnimatePresence>
        {open && (
          <Sheet label={`${team?.name ?? 'Team'}, titles`} onClose={() => setOpen(false)} size="sm">
            <div className="p-5">
              <button onClick={() => setOpen(false)} aria-label="Close" className="absolute right-3 top-3 rounded-lg bg-black/40 px-2.5 py-1 text-sm font-bold text-white hover:bg-black/60">✕</button>
              <h2 className="pr-10 font-display text-3xl tracking-wide text-white">{team?.name} · {rows.length} {rows.length === 1 ? 'title' : 'titles'}</h2>
              <ul className="mt-3 space-y-2">
                {rows.map(({ f, comp }) => (
                  <li key={f.id} className="flex items-center gap-3 rounded-xl border border-line bg-panel p-3">
                    <span className="text-2xl" aria-hidden>🏆</span>
                    <div className="min-w-0 flex-1">
                      {comp ? <Link to={paths.competition(comp.id)} onClick={() => setOpen(false)} className="font-semibold text-white hover:underline">{competitionName(comp, teams)}</Link> : <span className="font-semibold text-white">Final</span>}
                      <div className="text-xs text-slate-400">Won the final on {formatDate(f.date)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </Sheet>
        )}
      </AnimatePresence>
    </>
  )
}
