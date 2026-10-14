import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { paths } from '../../routes'
import { formatDate } from '../../season/dates'
import { SEVERITY_COLOR, xiProblem } from '../../season/injuries'
import { forfeitFixture } from '../../season/results'
import type { Fixture, Season } from '../../season/types'
import { selectSeason, useStore } from '../../store/useStore'
import type { Team } from '../../types'
import { ConfirmDialog } from '../ConfirmDialog'
import { Sheet } from '../Sheet'
import { PlayerAvatar } from '../ui'
import { useBaseTeamMap } from './shared'

/** Why your side cannot play a match yet (an injured player in the XI), or null if it can. `team` is your team as it will be picked (with your lineup). */
export function squadProblem(season: Season, team: Team | undefined, fixture: Pick<Fixture, 'date'>) {
  if (!team || !season.myTeamId) return null
  const p = xiProblem(season, team, fixture.date)
  return p.hurtInXI.length > 0 || !p.canFill ? p : null
}

/**
 * Shown instead of starting your match when someone in your XI is injured: swap him out on the squad screen first. With fewer than
 * eleven fit players in the whole squad there is nothing to swap in, so the match can only be forfeited.
 */
export function SquadProblemCard({ season, team, fixture, onDone }: { season: Season; team: Team; fixture: Fixture; onDone?: () => void }) {
  const navigate = useNavigate()
  const updateSeason = useStore((s) => s.updateSeason)
  const baseTeams = useBaseTeamMap()
  const [ask, setAsk] = useState(false)
  const p = squadProblem(season, team, fixture)
  if (!p) return null
  const forfeit = () => {
    updateSeason((s) => forfeitFixture(s, fixture, baseTeams))
    setAsk(false)
    onDone?.()
    navigate(`${paths.session(fixture.date.slice(0, 7))}?day=${fixture.date}`)
  }
  return (
    <div className="rounded-2xl border-2 border-rose-500/60 bg-rose-500/10 p-4">
      <div className="text-[11px] font-extrabold uppercase tracking-widest text-rose-300">Cannot start yet</div>
      <h2 className="font-display text-3xl leading-none tracking-wide text-white">{p.hurtInXI.length > 0 ? 'Injured players in your XI' : 'Not enough fit players'}</h2>
      {p.hurtInXI.length > 0 && (
        <>
          <p className="mt-1 text-sm text-slate-200">Swap {p.hurtInXI.length === 1 ? 'him' : 'them'} out for fit players on the squad screen. The match cannot start until you do.</p>
          <ul className="mt-2 space-y-1.5">
            {p.hurtInXI.map(({ player, injury }) => (
              <li key={player.id} className="flex items-center gap-2.5 rounded-xl bg-black/30 p-2">
                <PlayerAvatar player={player} team={team} size={34} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-white">{player.name}</span>
                  <span className="block truncate text-xs" style={{ color: SEVERITY_COLOR[injury.severity] }}>{injury.name} · {injury.severity} · back {formatDate(injury.back)}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      {!p.canFill && <p className="mt-2 text-sm text-slate-200">You only have <b className="text-white">{p.fit}</b> fit players, not enough for a team of 11, so there is nobody to swap in. You can forfeit this match.</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {p.canFill && <Link to={paths.sessionSquad} onClick={onDone} className="cta-pulse cta-pulse-gold rounded-full bg-amber-400 px-6 py-3 font-display text-2xl leading-none tracking-wide text-black hover:bg-amber-300">Edit squad</Link>}
        {!p.canFill && <Link to={paths.sessionSquad} onClick={onDone} className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-slate-200 hover:border-slate-400">Look at the squad</Link>}
        {!p.canFill && <button onClick={() => setAsk(true)} className="rounded-full border-2 border-red-500/70 px-5 py-2.5 text-sm font-bold text-red-200 hover:bg-red-500/15">Forfeit this match</button>}
      </div>
      <ConfirmDialog open={ask} tone="danger" title="Forfeit this match?" confirmLabel="Forfeit" cancelLabel="Keep the match" onCancel={() => setAsk(false)} onConfirm={forfeit}>
        <p>You cannot field eleven fit players. The other team is given the win and the match counts as a defeat for you.</p>
      </ConfirmDialog>
    </div>
  )
}

/** The same card in a popup, for when a match is simulated from the calendar. */
export function SquadProblemSheet({ team, fixture, onClose }: { team: Team; fixture: Fixture; onClose: () => void }) {
  const season = useStore(selectSeason)
  if (!season) return null
  return (
    <Sheet label="Your squad is not ready" onClose={onClose} size="sm" z={86}>
      <div className="p-4"><SquadProblemCard season={season} team={team} fixture={fixture} onDone={onClose} /></div>
    </Sheet>
  )
}
