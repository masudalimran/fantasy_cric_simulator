import type { Team } from '../types'
import { competitionStatus, tableFor } from './results'
import type { Competition, Fixture, Season, TableRow } from './types'

export interface TournamentIntroData {
  competition: Competition
  /** The standings that matter for this match, and what to call them (empty for a knockout-only tournament). */
  rows: TableRow[]
  tableTitle: string
  /** Last year's winner of this tournament, if it has been played before in this career. */
  defending: { team: Team; year: number } | null
  /** How many times each team has won it in this career. */
  titles: Map<string, number>
}

/** Everything the screen before the toss needs to show off the tournament a match belongs to. */
export function tournamentIntro(season: Season, history: Season[] | undefined, fixture: Fixture, teams: Map<string, Team>): TournamentIntroData | null {
  const competition = season.competitions.find((c) => c.id === fixture.competitionId)
  if (!competition) return null
  let rows: TableRow[] = []
  let tableTitle = ''
  const home = fixture.homeId
  if (competition.kind === 'series') { rows = tableFor(season, competition); tableTitle = 'The series so far' }
  else if (fixture.phase === 'league') { rows = tableFor(season, competition); tableTitle = 'League table' }
  else if (fixture.phase === 'group' && fixture.group) { rows = tableFor(season, competition, fixture.group); tableTitle = `Group ${fixture.group.replace(/^Group /, '')} table` }
  else if (competition.groups && home) {
    const g = Object.entries(competition.groups).find(([, ids]) => ids.includes(home))?.[0]
    if (g) { rows = tableFor(season, competition, g); tableTitle = `Group ${g.replace(/^Group /, '')}: how the group stage ended` }
  }
  const titles = new Map<string, number>()
  let defending: TournamentIntroData['defending'] = null
  for (const s of [...(history ?? [])].sort((a, b) => a.year - b.year)) {
    const c = s.competitions.find((x) => x.id === competition.id)
    if (!c) continue
    const champ = competitionStatus(s, c).champion
    if (!champ) continue
    titles.set(champ, (titles.get(champ) ?? 0) + 1)
    const team = teams.get(champ)
    if (team) defending = { team, year: s.year }
  }
  return { competition, rows, tableTitle, defending, titles }
}
