import { Link } from 'react-router'
import { overall } from '../../data/builders'
import { paths } from '../../routes'
import { formatDate } from '../../season/dates'
import type { Transfer } from '../../season/types'
import type { Player, Team } from '../../types'
import { PlayerAvatar, TeamCrest } from '../ui'
import { FREE_AGENTS } from './shared'

/** One move in the market: his face (tap for his profile), what happened and between which teams (tap a team for its page). */
export function TransferRow({ t, player, teams, mine }: { t: Transfer; player?: Player; teams: Map<string, Team>; mine?: string | null }) {
  const from = t.from ? teams.get(t.from) : null
  const to = t.to ? teams.get(t.to) : null
  const crest = (team: Team | null | undefined) => team && (
    <Link to={paths.careerTeam(team.id)} className={`inline-flex items-center gap-1 font-semibold hover:underline ${team.id === mine ? 'text-amber-300' : 'text-white'}`} title={`Go to ${team.name}`}><TeamCrest team={team} size={18} />{team.name}</Link>
  )
  const yours = !!mine && (t.from === mine || t.to === mine)
  return (
    <div className={`flex items-center gap-3 px-3 py-2 text-sm text-slate-300 ${yours ? 'bg-amber-400/5' : ''}`}>
      {player ? <PlayerAvatar profile player={player} team={to ?? from ?? FREE_AGENTS} size={40} /> : <span className="h-10 w-10 shrink-0" />}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2">
          <b className="text-white">{t.name}</b>
          {player && <span className="rounded bg-white/10 px-1.5 text-[11px] font-bold text-slate-200">{overall(player)}</span>}
          <span className="text-xs text-slate-500">{formatDate(t.date)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[13px]">
          {t.kind === 'release'
            ? <>released by {crest(from)}</>
            : <>{t.kind === 'sign' ? 'signed by' : 'bought by'} {crest(to)}{from ? <>from {crest(from)}</> : <span className="text-slate-400">from the unsigned pool</span>}<span className="text-slate-500">· {t.fee} {t.fee === 1 ? 'coin' : 'coins'}</span></>}
        </div>
      </div>
    </div>
  )
}
