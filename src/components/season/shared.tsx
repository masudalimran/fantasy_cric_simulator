import { AnimatePresence } from 'framer-motion'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { formatDate } from '../../season/dates'
import { fixtureSeed, isMine, myNextFixture, mustPlayFirst, playEarlierMatches, recordResult, simulateFixture } from '../../season/results'
import type { Competition, Fixture, Season } from '../../season/types'
import { paths } from '../../routes'
import { sessionTeam } from '../../season/progression'
import { useStore, useTeams, useViewedSeason } from '../../store/useStore'
import type { Team } from '../../types'
import { useDetails } from './Details'
import { BeforeYoursSheet, matchesBefore } from './BeforeYours'
import { accentOf, PlayerAvatar, TeamCrest } from '../ui'
import type { Player } from '../../types'

/** Teams as they are in the active session: starting ratings plus every year's gains and losses. */
export function useTeamMap(): Map<string, Team> {
  const teams = useTeams()
  const { season } = useViewedSeason() // a past year shows the ratings and lineup it had
  const shifts = season?.shifts
  const lineup = season?.lineup
  const myTeamId = season?.myTeamId ?? null
  return useMemo(() => new Map(teams.map((t) => [t.id, sessionTeam(t, { shifts, lineup, myTeamId })])), [teams, shifts, lineup, myTeamId])
}

/** The teams as they start out (before the career's rating changes): what the simulator is given, since it applies each match's current ratings itself. */
export function useBaseTeamMap(): Map<string, Team> {
  const teams = useTeams()
  return useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams])
}

/** Colour used for a competition on the calendar: its founder's colour, or a neutral for friendlies. */
export function competitionColor(comp: Competition, teams: Map<string, Team>): string {
  const origin = comp.originTeamId ? teams.get(comp.originTeamId) : null
  return origin ? accentOf(origin) : '#94a3b8'
}

export const matchHref = (season: Season, f: Fixture) =>
  `${paths.match(f.homeId as string, f.awayId as string, f.format, fixtureSeed(season, f.id))}?fx=${encodeURIComponent(f.id)}`

/** The two team names of a fixture, or null while a semi-final or final is still waiting on results. */
export function fixtureTeams(f: Fixture, teams: Map<string, Team>): [Team, Team] | null {
  const h = f.homeId ? teams.get(f.homeId) : undefined
  const a = f.awayId ? teams.get(f.awayId) : undefined
  return h && a ? [h, a] : null
}

export function fixtureLabel(f: Fixture, teams: Map<string, Team>): string {
  const t = fixtureTeams(f, teams)
  return t ? `${t[0].name} v ${t[1].name}` : f.stage
}

/** Competition name for display. Friendly series are named from the teams' full names, even in older saves. */
export function competitionName(c: Competition, teams: Map<string, Team>): string {
  if (c.kind !== 'series') return c.name
  const [a, b] = c.teamIds.map((id) => teams.get(id))
  return a && b ? `${a.name} v ${b.name} ${c.format.toUpperCase()} Series` : c.name
}

export function FixtureRow({ season, fixture, teams, showDate = false, showCompetition = false, perspective }: {
  season: Season; fixture: Fixture; teams: Map<string, Team>; showDate?: boolean; showCompetition?: boolean
  /** Look at the match from one team's side: a green border if it won, red if it lost, yellow if it hasn't been played. */
  perspective?: string
}) {
  const navigate = useNavigate()
  const [beforeOpen, setBeforeOpen] = useState(false)
  const details = useDetails()
  const baseTeams = useBaseTeamMap()
  const liveMatch = useStore((s) => s.liveMatch)
  // this very match is already under way: the only way forward is to carry on with it
  const liveHere = !!liveMatch && !liveMatch.finished && liveMatch.fixtureId === fixture.id
  const updateSeason = useStore((s) => s.updateSeason)
  const home = fixture.homeId ? teams.get(fixture.homeId) : undefined
  const away = fixture.awayId ? teams.get(fixture.awayId) : undefined
  const res = season.results[fixture.id]
  const comp = season.competitions.find((c) => c.id === fixture.competitionId)
  const playable = !!home && !!away
  const waitFor = !res && playable ? mustPlayFirst(season, fixture) : null
  const mine = isMine(season, fixture)
  const slotText = (slot: Fixture['homeRef']) =>
    slot.kind === 'winner' ? 'Winner of an earlier match' : slot.kind === 'rank' ? `${['', '1st', '2nd', '3rd', '4th'][slot.rank] ?? slot.rank + 'th'}${slot.group ? ` in Group ${slot.group}` : ' in the table'}` : ''

  const sim = () =>
    updateSeason((s) => {
      const f = s.fixtures.find((x) => x.id === fixture.id)
      if (!f || !f.homeId || !f.awayId || s.results[f.id]) return s
      const upTo = playEarlierMatches(s, f.date, baseTeams) // earlier matches are played first
      return upTo.results[f.id] ? upTo : recordResult(upTo, simulateFixture(upTo, f, baseTeams), baseTeams)
    })

  const side = (team: Team | undefined, slot: Fixture['homeRef'], right = false) => (
    <div className={`flex min-w-0 flex-1 items-center gap-2 ${right ? 'flex-row-reverse text-right' : ''}`}>
      {team ? <Link to={paths.careerTeam(team.id)} title={`Go to ${team.name}`} className="shrink-0"><TeamCrest team={team} size={32} /></Link> : <div className="h-8 w-8 shrink-0 rounded-full border border-dashed border-line" />}
      <div className="min-w-0">
        <div className={`truncate text-sm font-semibold ${res?.winnerId === team?.id && team ? 'text-white' : team ? 'text-slate-200' : 'text-slate-500'}`}>{team ? <Link to={paths.careerTeam(team.id)} className="hover:underline">{team.name}</Link> : 'To be decided'}</div>
        {!team && <div className="truncate text-[11px] text-slate-600">{slotText(slot)}</div>}
        {team && res && <div className="text-xs tabular-nums text-slate-400">{res.scores[team.id]?.runs}/{res.scores[team.id]?.wickets}</div>}
      </div>
    </div>
  )

  return (
    <div className={`rounded-xl border p-3 ${
      perspective
        ? !res ? 'border-amber-400/70 bg-amber-400/5' : res.winnerId === perspective ? 'border-emerald-500/60 bg-emerald-500/5' : res.winnerId === null ? 'border-slate-500/70 bg-panel' : 'border-rose-500/60 bg-rose-500/5'
        : mine ? 'border-amber-400/60 bg-amber-400/5' : 'border-line bg-panel'
    }`}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px] uppercase tracking-wider text-slate-500">
        <span>
          {mine && <span className="mr-2 rounded bg-amber-400 px-1.5 py-0.5 font-extrabold text-black">YOUR MATCH</span>}
          {showCompetition && comp && <span className="mr-2 text-slate-300">{competitionName(comp, teams)}</span>}
          {fixture.stage} · {fixture.format.toUpperCase()}
        </span>
        {showDate && <span>{formatDate(fixture.date)}</span>}
      </div>
      <div
        className={`flex items-center gap-3 ${res && details ? 'cursor-pointer' : ''}`}
        onClick={(e) => { if (res && details && !(e.target as HTMLElement).closest('a')) details.openMatch(fixture.id) }}
        title={res && details ? 'Open the match: summary and scorecards' : undefined}
      >
        {side(home, fixture.homeRef)}
        <span className="font-display text-xl text-slate-600">V</span>
        {side(away, fixture.awayRef, true)}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        {res ? (
          <div className="text-xs text-amber-200/90">
            {res.text}
            {res.playerOfMatchId && (() => { const t = [...teams.values()].find((x) => x.players.some((y) => y.id === res.playerOfMatchId)); const p = t?.players.find((x) => x.id === res.playerOfMatchId); return p && t ? <div className="mt-1 flex items-center gap-1.5 text-slate-300"><PlayerAvatar profile player={p} team={t} size={22} />Man of the Match: <b className="text-white">{p.name}</b>{res.motmNote ? ` (${res.motmNote})` : ''}</div> : null })()}
          </div>
        ) : (
          <div className="text-xs text-slate-600">{playable ? 'Not played yet' : 'Waiting on earlier results'}</div>
        )}
        {!res && playable && waitFor && (
          <div className="text-xs font-semibold text-amber-300/90" title="Matches are played in order">Play your match on {formatDate(waitFor.date)} first</div>
        )}
        {!res && playable && liveHere && liveMatch && (
          <div className="flex items-center gap-2"><span className="text-xs font-semibold text-emerald-300">In progress</span><button onClick={() => navigate(liveMatch.url)} className="rounded-lg bg-emerald-500 px-3 py-1 text-xs font-bold text-black hover:bg-emerald-400">Resume</button></div>
        )}
        {!res && playable && !waitFor && !liveHere && (
          <div className="flex gap-2">
            <button onClick={() => (mine && matchesBefore(season).length > 0 ? setBeforeOpen(true) : sim())} className="rounded-lg border border-line px-3 py-1 text-xs font-semibold text-slate-200 hover:border-emerald-500" title="Simulate this match: it is played for you and you just see the result">Sim</button>
            <button onClick={() => (mine && matchesBefore(season).length > 0 ? setBeforeOpen(true) : navigate(matchHref(season, fixture)))} className={`rounded-lg px-3 py-1 text-xs font-semibold ${mine ? `bg-amber-400 text-black hover:bg-amber-300 ${season && myNextFixture(season)?.id === fixture.id ? 'cta-pulse cta-pulse-gold' : ''}` : 'bg-indigo-500 text-white hover:bg-indigo-400'}`}>{mine ? 'Play' : 'Watch'}</button>
          </div>
        )}
        {res && playable && details && (
          <button onClick={() => details.openMatch(fixture.id)} className="rounded-lg border border-line px-3 py-1 text-xs font-semibold text-slate-200 hover:border-sky-400">Match details</button>
        )}
      </div>
      <AnimatePresence>{beforeOpen && <BeforeYoursSheet onClose={() => setBeforeOpen(false)} />}</AnimatePresence>
    </div>
  )
}

export interface PlayerEntry { player: Player; team: Team }

/** Every player in every team, by id, so stats can show names, faces and crests. */
export function usePlayerIndex(): Map<string, PlayerEntry> {
  const teamMap = useTeamMap() // the career's own ratings
  return useMemo(() => {
    const m = new Map<string, PlayerEntry>()
    for (const team of teamMap.values()) for (const player of team.players) m.set(player.id, { player, team })
    return m
  }, [teamMap])
}

export function PlayerCell({ id, index, size = 32 }: { id: string; index: Map<string, PlayerEntry>; size?: number }) {
  const e = index.get(id)
  const details = useDetails()
  if (!e) return <span className="text-slate-500">{id}</span>
  // the portrait and name open the player's profile; the team underneath goes to the team's page
  return (
    <span className="flex items-center gap-2.5">
      <PlayerAvatar profile player={e.player} team={e.team} size={size} />
      <span className="min-w-0">
        {details
          ? <button type="button" onClick={() => details.openPlayer(id)} className="block max-w-full cursor-pointer truncate text-left font-medium text-slate-100 hover:text-white hover:underline" title={`${e.player.name}: view profile`}>{e.player.name}</button>
          : <span className="block truncate font-medium text-slate-100">{e.player.name}</span>}
        <Link to={paths.careerTeam(e.team.id)} className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-200 hover:underline" title={`Go to ${e.team.name}`}><TeamCrest team={e.team} size={14} />{e.team.name}</Link>
      </span>
    </span>
  )
}
