import { describe, expect, it } from 'vitest'
import { BUILT_IN_TEAMS } from '../data/teams'
import { generateSeason } from './generate'
import { competitionStatus, nextMatchDate, resolveSeason, simDay, simulateFixture, tableFor } from './results'
import type { Season } from './types'

const teams = new Map(BUILT_IN_TEAMS.map((t) => [t.id, t]))

function playAll(season: Season): Season {
  let s = season
  for (let guard = 0; guard < 500; guard++) {
    const next = nextMatchDate(s)
    if (!next) return s
    s = simDay(s, next, teams)
  }
  throw new Error('season did not finish')
}

describe('season results', () => {
  const start = generateSeason({ year: 2027, teams: BUILT_IN_TEAMS, seed: 3 })
  const done = playAll(start)

  it('plays every fixture of the year, brackets included', () => {
    expect(done.fixtures.every((f) => f.homeId && f.awayId)).toBe(true)
    expect(done.fixtures.every((f) => done.results[f.id])).toBe(true)
    expect(Object.keys(done.results)).toHaveLength(done.fixtures.length)
  })

  it('crowns a champion in every competition', () => {
    for (const c of done.competitions) {
      const st = competitionStatus(done, c)
      expect(st.status).toBe('done')
      expect(st.champion).not.toBeNull()
    }
  })

  it('settles every knockout match with a winner', () => {
    for (const f of done.fixtures.filter((x) => x.phase === 'knockout')) expect(done.results[f.id].winnerId).not.toBeNull()
  })

  it('feeds league and group tables into the right semi-finals', () => {
    const leagues = done.competitions.filter((c) => c.kind === 'league')
    expect(leagues.length).toBeGreaterThan(0)
    for (const c of leagues) {
      const table = tableFor(done, c)
      const sf1 = done.fixtures.find((f) => f.competitionId === c.id && f.stage === 'Semi-final 1')!
      expect([sf1.homeId, sf1.awayId]).toEqual([table[0].teamId, table[3].teamId])
    }
    for (const c of done.competitions.filter((x) => x.kind === 'cup')) {
      const a = tableFor(done, c, 'A')
      const b = tableFor(done, c, 'B')
      const sf1 = done.fixtures.find((f) => f.competitionId === c.id && f.stage === 'Semi-final 1')!
      expect([sf1.homeId, sf1.awayId]).toEqual([a[0].teamId, b[1].teamId])
    }
  })

  it('keeps tables honest: games add up and wins equal losses', () => {
    for (const c of done.competitions.filter((x) => x.kind === 'league')) {
      const rows = tableFor(done, c)
      const n = c.teamIds.length
      for (const r of rows) {
        expect(r.played).toBe(n - 1)
        expect(r.won + r.lost + r.tied).toBe(r.played)
        expect(r.points).toBe(r.won * 2 + r.tied)
      }
      expect(rows.reduce((s, r) => s + r.won, 0)).toBe(rows.reduce((s, r) => s + r.lost, 0))
      for (let i = 1; i < rows.length; i++) expect(rows[i - 1].points).toBeGreaterThanOrEqual(rows[i].points)
    }
  })

  it('plays a fixture identically every time', () => {
    const f = start.fixtures.find((x) => x.homeId && x.awayId)!
    const a = simulateFixture(start, f, teams)
    const b = simulateFixture(start, f, teams)
    expect(a).toEqual(b)
  })

  it('leaves placeholders alone until their feeders have been played', () => {
    expect(resolveSeason(start)).toBe(start)
    const pending = start.fixtures.filter((f) => !f.homeId || !f.awayId)
    expect(pending.length).toBeGreaterThan(0)
  })
})
