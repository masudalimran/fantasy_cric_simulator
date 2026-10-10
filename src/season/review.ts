import type { Team } from '../types'
import { competitionStatus } from './results'
import { seasonChanges } from './progression'
import { collect, impactPoints, teamRecords } from './stats'
import type { PlayerReview, Season, SeasonReview } from './types'

const winRate = (r: { won: number; tied: number; played: number }) => (r.played ? (r.won + r.tied * 0.5) / r.played : 0)

/** Where your team finished, what it won, and how each player did across the whole year. */
export function buildReview(season: Season, teams: Map<string, Team>, now = new Date()): SeasonReview | null {
  const teamId = season.myTeamId
  const team = teamId ? teams.get(teamId) : undefined
  if (!teamId || !team) return null

  const rows = teamRecords(season)
  const ranked = rows // already in standings order: points, then net run rate
  const mine = rows.find((r) => r.teamId === teamId) ?? { teamId, played: 0, won: 0, lost: 0, tied: 0, titles: 0, titleFixtures: [], points: 0, nrr: 0 }
  const rank = Math.max(1, ranked.findIndex((r) => r.teamId === teamId) + 1)

  const titles = season.competitions
    .filter((c) => c.kind !== 'series' && competitionStatus(season, c).champion === teamId)
    .map((c) => c.name)

  const c = collect(season)
  const players: PlayerReview[] = team.players.map((p) => {
    const b = c.bat.get(p.id)
    const w = c.bowl.get(p.id)
    return {
      id: p.id,
      name: p.name,
      matches: Math.max(b?.matches ?? 0, w?.matches ?? 0),
      bat: b ? { innings: b.innings, runs: b.runs, balls: b.balls, high: b.high, highNotOut: b.highNotOut, fifties: b.fifties, hundreds: b.hundreds, fours: b.fours, sixes: b.sixes, notOuts: b.notOuts } : null,
      bowl: w ? { balls: w.balls, runs: w.runs, wickets: w.wickets, best: `${w.bestW}/${w.bestR}`, fiveW: w.fiveW, maidens: w.maidens } : null,
      potm: c.potm.get(p.id) ?? 0,
      impact: Math.round(impactPoints(c, p.id)),
    }
  })

  const changes = seasonChanges(season, teams)
  const gain = (x: { after: number; before: number }) => x.after - x.before
  const moved = changes.filter((x) => x.after !== x.before)
  return {
    year: season.year,
    difficulty: season.difficulty ?? 'normal',
    teamId,
    teamName: team.name,
    played: mine.played,
    won: mine.won,
    lost: mine.lost,
    tied: mine.tied,
    rank,
    teams: rows.length,
    titles,
    players,
    table: ranked.slice(0, 5).map((r) => ({ teamId: r.teamId, teamName: teams.get(r.teamId)?.name ?? r.teamId, won: r.won, played: r.played })),
    progress: changes.filter((x) => x.teamId === teamId),
    risers: moved.filter((x) => gain(x) > 0).sort((a, b) => gain(b) - gain(a)).slice(0, 5),
    fallers: moved.filter((x) => gain(x) < 0).sort((a, b) => gain(a) - gain(b)).slice(0, 5),
    finishedAt: now.toISOString(),
  }
}

export { winRate }
