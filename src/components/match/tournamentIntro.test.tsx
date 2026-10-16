import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BUILT_IN_TEAMS } from '../../data/teams'
import { generateSeason } from '../../season/generate'
import { tournamentIntro } from '../../season/tournamentIntro'
import { Match } from '../../engine/match'
import { TROPHY_KINDS, TrophyArt, trophyOf } from './TrophyArt'
import { TournamentIntro } from './TournamentIntro'

const teams = new Map(BUILT_IN_TEAMS.map((t) => [t.id, t]))
const season = generateSeason({ year: 2027, teams: BUILT_IN_TEAMS, seed: 5, myTeamId: BUILT_IN_TEAMS[0].id })

describe('tournament trophies', () => {
  it('draws all six, keeps a tournament on the same one, and gives a series a plate', () => {
    for (const k of TROPHY_KINDS) expect(renderToString(<TrophyArt kind={k} />)).toContain('<svg')
    const cup = season.competitions.find((c) => c.kind !== 'series')!
    const series = season.competitions.find((c) => c.kind === 'series')
    expect(trophyOf(cup)).toBe(trophyOf({ ...cup }))
    expect(trophyOf(cup)).not.toBe('plate')
    if (series) expect(trophyOf(series)).toBe('plate')
    expect(new Set(season.competitions.filter((c) => c.kind !== 'series').map(trophyOf)).size).toBeGreaterThan(2)
  })

  it('builds the screen before the toss with the table, and shows it', () => {
    const f = season.fixtures.find((x) => x.phase === 'group' || x.phase === 'league')!
    const data = tournamentIntro(season, [], f, teams)!
    expect(data.competition.id).toBe(f.competitionId)
    expect(data.rows.length).toBeGreaterThan(1)
    expect(data.tableTitle.length).toBeGreaterThan(3)
    const match = new Match({ teamA: teams.get(f.homeId as string)!, teamB: teams.get(f.awayId as string)!, format: f.format, seed: 3 })
    const html = renderToString(<TournamentIntro data={data} name={data.competition.name} fixture={f} sides={match.sides} mySide={null} teams={teams} onDone={() => undefined} />)
    expect(html).toContain(data.competition.name)
    expect(html).toContain('CONTINUE')
  })

  it('names last year\'s winners when the tournament has been played before', () => {
    const old = { ...season, results: {} } as typeof season
    const f = season.fixtures.find((x) => x.phase === 'league' || x.phase === 'group')!
    const comp = season.competitions.find((c) => c.id === f.competitionId)!
    const finalFx = season.fixtures.filter((x) => x.competitionId === comp.id)
    const results = Object.fromEntries(finalFx.map((x) => [x.id, { fixtureId: x.id, winnerId: comp.teamIds[0], text: '', margin: null, scores: {}, superOver: false, playerOfMatchId: null, bat: [], bowl: [] }]))
    const last = { ...old, year: 2026, results } as typeof season
    const data = tournamentIntro(season, [last], f, teams)!
    expect(data.defending?.year).toBe(2026)
    expect(data.titles.size).toBeGreaterThan(0)
  })
})
