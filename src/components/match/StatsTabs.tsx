import { useState } from 'react'
import type { Match } from '../../engine/match'
import { Charts } from './Charts'
import { Matchups } from './Matchups'
import { Overs } from './Overs'
import { Overview } from './Overview'
import { Partnerships } from './Partnerships'
import { Phases } from './Phases'
import { WagonWheel } from './WagonWheel'
import { WinChance } from './WinChance'

export type StatTab = 'overview' | 'wagon' | 'charts' | 'partners' | 'phases' | 'overs' | 'matchups' | 'win'

const SUBTABS: { id: StatTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'wagon', label: 'Wagon wheel' },
  { id: 'charts', label: 'Charts' },
  { id: 'partners', label: 'Partnerships' },
  { id: 'phases', label: 'Phases' },
  { id: 'overs', label: 'Overs' },
  { id: 'matchups', label: 'Matchups' },
  { id: 'win', label: 'Win chance' },
]

/** Everything about the match in numbers and pictures. New stat views go here. */
export function StatsTabs({ match }: { match: Match }) {
  const [sub, setSub] = useState<StatTab>('overview')
  const at = SUBTABS.findIndex((t) => t.id === sub)
  const go = (d: number) => setSub(SUBTABS[(at + d + SUBTABS.length) % SUBTABS.length].id)
  const arrow = 'grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/5 text-lg font-bold text-slate-200 transition hover:bg-white/15 hover:text-white'
  return (
    <div>
      <div
        className="mb-3 flex items-center gap-2" role="tablist" aria-label="Match stats" tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1) } else if (e.key === 'ArrowRight') { e.preventDefault(); go(1) } }}
      >
        <button className={arrow} onClick={() => go(-1)} aria-label={`Previous: ${SUBTABS[(at + SUBTABS.length - 1) % SUBTABS.length].label}`} title={SUBTABS[(at + SUBTABS.length - 1) % SUBTABS.length].label}>‹</button>
        <div className="min-w-0 flex-1 rounded-lg bg-sky-400 px-3 py-1 text-center text-black" role="tab" aria-selected="true">
          <div className="truncate text-sm font-extrabold leading-tight">{SUBTABS[at].label}</div>
          <div className="mt-0.5 flex justify-center gap-1" aria-hidden>
            {SUBTABS.map((t, i) => <span key={t.id} className={`h-1 rounded-full ${i === at ? 'w-4 bg-black' : 'w-1 bg-black/35'}`} />)}
          </div>
        </div>
        <button className={arrow} onClick={() => go(1)} aria-label={`Next: ${SUBTABS[(at + 1) % SUBTABS.length].label}`} title={SUBTABS[(at + 1) % SUBTABS.length].label}>›</button>
      </div>
      {sub === 'overview' && <Overview match={match} />}
      {sub === 'wagon' && <WagonWheel match={match} />}
      {sub === 'charts' && <Charts match={match} />}
      {sub === 'partners' && <Partnerships match={match} />}
      {sub === 'phases' && <Phases match={match} />}
      {sub === 'overs' && <Overs match={match} />}
      {sub === 'matchups' && <Matchups match={match} />}
      {sub === 'win' && <WinChance match={match} />}
    </div>
  )
}
