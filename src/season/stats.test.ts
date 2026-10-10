import { describe, expect, it } from 'vitest'
import { BUILT_IN_TEAMS } from '../data/teams'
import { generateSeason } from './generate'
import { nextMatchDate, simDay } from './results'
import { average, collect, mostValuable, seasonRecords, strikeRate, teamRecords, topBatsmen, topBowlers } from './stats'
import type { Season } from './types'

const teams = new Map(BUILT_IN_TEAMS.map((t) => [t.id, t]))
function playAll(season: Season): Season {
  let s = season
  for (let g = 0; g < 500; g++) {
    const next = nextMatchDate(s)
    if (!next) return s
    s = simDay(s, next, teams)
  }
  throw new Error('did not finish')
}
const done = playAll(generateSeason({ year: 2027, teams: BUILT_IN_TEAMS, seed: 11 }))

describe('season stats', () => {
  const all = collect(done)

  it('stores player ids once and refers to them by position', () => {
    expect(new Set(done.roster).size).toBe(done.roster.length)
    expect(done.roster.length).toBeLessThanOrEqual(BUILT_IN_TEAMS.length * 11)
    for (const res of Object.values(done.results)) for (const l of [...res.bat, ...res.bowl]) expect(done.roster[l[0]]).toBeDefined()
  })

  it('adds up against the team scores', () => {
    for (const res of Object.values(done.results)) {
      const batRuns = res.bat.reduce((s, l) => s + l[1], 0)
      const teamRuns = Object.values(res.scores).reduce((s, x) => s + x.runs, 0)
      expect(batRuns).toBeLessThanOrEqual(teamRuns)
      expect(batRuns).toBeGreaterThan(teamRuns * 0.8) // extras are a small slice
      const wickets = Object.values(res.scores).reduce((s, x) => s + x.wickets, 0)
      const bowlerWickets = res.bowl.reduce((s, l) => s + l[3], 0)
      expect(bowlerWickets).toBeLessThanOrEqual(wickets)
    }
  })

  it('ranks leaders and computes averages sensibly', () => {
    const top = topBatsmen(all, 5)
    expect(top).toHaveLength(5)
    for (let i = 1; i < top.length; i++) expect(top[i - 1].runs).toBeGreaterThanOrEqual(top[i].runs)
    expect(top[0].runs).toBeGreaterThan(300)
    for (const b of top) {
      expect(strikeRate(b)).toBeGreaterThan(40)
      const avg = average(b)
      if (avg !== null) expect(avg).toBeLessThanOrEqual(b.runs)
    }
    const bowlers = topBowlers(all, 5)
    expect(bowlers[0].wickets).toBeGreaterThan(15)
    expect(mostValuable(all, 3)[0].points).toBeGreaterThan(0)
  })

  it('awards one player of the match per match', () => {
    const total = [...all.potm.values()].reduce((s, n) => s + n, 0)
    expect(total).toBe(Object.keys(done.results).length)
  })

  it('narrows to a single tournament or format', () => {
    const comp = done.competitions.find((c) => c.kind === 'league')!
    const scoped = collect(done, { competitionId: comp.id })
    expect(scoped.matches).toBe(done.fixtures.filter((f) => f.competitionId === comp.id).length)
    const t20 = collect(done, { format: 't20' })
    expect(t20.matches).toBeLessThan(all.matches)
    expect(t20.matches).toBe(done.fixtures.filter((f) => f.format === 't20').length)
  })

  it('reports team records and season records', () => {
    const rows = teamRecords(done)
    expect(rows).toHaveLength(20)
    for (const r of rows) expect(r.won + r.lost + r.tied).toBe(r.played)
    expect(rows.reduce((s, r) => s + r.titles, 0)).toBe(done.competitions.filter((c) => c.kind !== 'series').length)
    const labels = seasonRecords(done).map((r) => r.label)
    for (const want of ['Highest team total', 'Highest individual score', 'Best bowling figures']) expect(labels).toContain(want)
  })
})

describe('most sixes record', () => {
  it('names the match and the player who hit the most of them', () => {
    const teams = new Map(BUILT_IN_TEAMS.map((t) => [t.id, t]))
    let s = generateSeason({ year: 2027, teams: BUILT_IN_TEAMS, seed: 5 })
    for (let g = 0; g < 400; g++) { const d = nextMatchDate(s); if (!d || g > 40) break; s = simDay(s, d, teams) }
    const rec = seasonRecords(s).find((r) => r.label === 'Most sixes in a match')!
    expect(rec).toBeTruthy()
    expect(s.fixtures.some((f) => f.id === rec.fixtureId)).toBe(true)
    expect(rec.playerId).toBeTruthy()
    expect(rec.playerNote).toMatch(/hit \d+ of them/)
  })
})
