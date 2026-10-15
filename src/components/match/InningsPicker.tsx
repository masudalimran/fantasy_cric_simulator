import { useState } from 'react'
import type { Match } from '../../engine/match'
import { accentOf } from '../ui'
import { TeamLogo } from '../season/Details'

/** Which innings an analysis tab is showing. Follows the live innings until you pick one yourself. */
export function useInningsPick(match: Match): [number, (n: number) => void] {
  const [picked, setPicked] = useState<number | null>(null)
  const idx = Math.min(picked ?? (match.hold ?? match.innings.length - 1), match.innings.length - 1)
  return [idx, setPicked]
}

/** A small two-way switch between the innings. Hidden until there are two. */
export function InningsPicker({ match, idx, setIdx }: { match: Match; idx: number; setIdx: (n: number) => void }) {
  if (match.innings.length < 2) return null
  return (
    <div className="mb-3 grid grid-cols-2 overflow-hidden rounded-xl border border-line bg-black/20" role="tablist" aria-label="Innings">
      {match.innings.map((inn, n) => {
        const team = match.battingSide(inn).team
        const on = n === idx
        return (
          <button
            key={n} role="tab" aria-selected={on} onClick={() => setIdx(n)}
            className={`flex items-center gap-2 px-3 py-2 text-left transition ${on ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
            style={{ boxShadow: on ? `inset 0 -3px 0 ${accentOf(team)}` : undefined }}
          >
            <TeamLogo team={team} size={24} />
            <span className="min-w-0">
              <span className="block text-[11px] font-bold uppercase tracking-wider opacity-70">{n === 0 ? '1st innings' : '2nd innings'}</span>
              <span className="block truncate text-xs font-semibold">{team.name}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
