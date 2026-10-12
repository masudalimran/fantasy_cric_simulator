import { useState } from 'react'
import { useNavigate } from 'react-router'
import { formatDate } from '../../season/dates'
import { isMine, myNextFixture, simDay, simUntil } from '../../season/results'
import type { Season } from '../../season/types'
import { selectSeason, useStore } from '../../store/useStore'
import { Sheet } from '../Sheet'
import { useCoachGate } from './CoachGate'
import { FixtureRow, matchHref, useBaseTeamMap, useTeamMap } from './shared'

/** The other teams' matches still waiting before your own next match, earliest first. */
export function matchesBefore(season: Season, until?: string) {
  const mine = myNextFixture(season)
  const end = until && (!mine || until < mine.date) ? until : mine?.date // never past your own match
  if (!end) return []
  return season.fixtures
    .filter((f) => !season.results[f.id] && f.homeId && f.awayId && !isMine(season, f) && f.date <= end)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
}

/**
 * "These matches come before yours": watch or skip them one by one, or skip them all. When none are left it
 * turns into "It's match day!" with a Play match button.
 */
export function BeforeYoursSheet({ onClose, onSkipped, day, until }: { onClose: () => void; day?: string; until?: string; onSkipped?: (stoppedAt: ReturnType<typeof myNextFixture>) => void }) {
  const season = useStore(selectSeason)
  const updateSeason = useStore((s) => s.updateSeason)
  const teams = useTeamMap()
  const baseTeams = useBaseTeamMap()
  const navigate = useNavigate()
  const gate = useCoachGate()
  const mine = season ? myNextFixture(season) : null
  // `day` set: the games on that one match day. `until` set: the games up to that date. Otherwise: everything before your next match.
  const limit = day ?? until
  const pendingNow = (): string[] => {
    const st = selectSeason(useStore.getState())
    if (!st) return []
    const list = day
      ? st.fixtures.filter((f) => !st.results[f.id] && f.homeId && f.awayId && !isMine(st, f) && f.date === day).sort((a, b) => a.id.localeCompare(b.id))
      : matchesBefore(st, until)
    return list.map((f) => f.id)
  }
  // The games are remembered when the popup opens, so a game you sim stays in the list with its result
  const [ids] = useState(pendingNow)
  if (!season) return null
  if (!limit && !mine) return null
  const listed = ids.map((id) => season.fixtures.find((f) => f.id === id)).filter((f): f is NonNullable<typeof f> => !!f)
  const between = listed.filter((f) => !season.results[f.id]) // the ones still waiting
  const skipAll = () => {
    if (until) {
      const r = simUntil(season, until, baseTeams)
      updateSeason(() => r.season)
      return
    }
    if (day) { updateSeason((s) => ({ ...simDay(s, day, baseTeams, true), today: day > s.today ? day : s.today })); return }
    if (!mine) return
    const r = simUntil(season, mine.date, baseTeams)
    updateSeason(() => r.season)
    onSkipped?.(r.stoppedAt)
  }
  const matchDay = mine && (!limit || mine.date <= limit)
  return (
    <Sheet label="Matches before yours" onClose={onClose} size="md">
      <div className="p-5">
        <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 rounded-lg bg-black/40 px-2.5 py-1 text-sm font-bold text-white hover:bg-black/60">✕</button>
        {listed.length > 0 && (
          <>
            <h2 className="pr-10 font-display text-3xl tracking-wide text-white">
              {day ? `${listed.length} ${listed.length === 1 ? 'match' : 'matches'} on ${formatDate(day)}` : until ? `${listed.length} ${listed.length === 1 ? 'match' : 'matches'} up to ${formatDate(until)}` : `${listed.length} ${listed.length === 1 ? 'match is' : 'matches are'} before yours`}
            </h2>
            {between.length > 0 && (
              <>
                <p className="mb-3 text-sm text-slate-300">{limit ? 'These are the games coming up.' : `These are between today and your match on ${formatDate(mine!.date)}.`} <b className="text-white">Watch</b> one to play it yourself, <b className="text-white">Sim</b> one to simulate it and see the result, or sim them all.</p>
                <button onClick={() => gate(skipAll)} className="cta-pulse cta-pulse-gold mb-3 w-full rounded-full bg-amber-400 px-6 py-3 font-display text-2xl leading-none tracking-wide text-black hover:bg-amber-300 active:bg-amber-300">
                  {limit ? `Sim ${between.length === 1 ? 'it' : `all ${between.length}`}` : `Sim the ${between.length === 1 ? 'game' : `${between.length} games`} before yours`}
                </button>
              </>
            )}
            <div className="mb-3 space-y-2">{listed.map((f) => <FixtureRow key={f.id} season={season} fixture={f} teams={teams} showDate showCompetition />)}</div>
          </>
        )}
        {between.length === 0 && (
          matchDay && mine ? (
            <div className="py-3 text-center">
              <h2 className="font-display text-4xl tracking-wide text-white">It's match day!</h2>
              <p className="mb-4 text-sm text-slate-300">{listed.length > 0 ? 'Those are all done. ' : ''}Your match is next.</p>
              <div className="mb-4 text-left"><FixtureRow season={season} fixture={mine} teams={teams} showCompetition /></div>
              <button onClick={() => gate(() => navigate(matchHref(season, mine)))} className="cta-pulse cta-pulse-gold w-full rounded-full bg-amber-400 px-6 py-3.5 font-display text-3xl leading-none tracking-wide text-black hover:bg-amber-300 active:bg-amber-300">Play match</button>
            </div>
          ) : (
            <div className="py-3 text-center">
              <h2 className="font-display text-4xl tracking-wide text-white">All played</h2>
              <p className="mb-4 text-sm text-slate-300">{limit ? `Every match up to ${formatDate(limit)} is done.` : 'Everything is done.'}</p>
              <button onClick={onClose} className="w-full rounded-full bg-emerald-500 px-6 py-3 font-display text-2xl leading-none tracking-wide text-black hover:bg-emerald-400">Done</button>
            </div>
          )
        )}
      </div>
    </Sheet>
  )
}
