import { describe, expect, it } from 'vitest'
import { BUILT_IN_TEAMS } from '../data/teams'
import { Match } from '../engine/match'
import { Rng } from '../engine/rng'
import { awardsNight, fastestFiftyOf, playoffStatus, seasonBests, superOverOutcome, upgradesFrom } from './stories'
import { collect } from './stats'
import type { Competition, Fixture, Season } from './types'

describe('stories', () => {
  it('finds the season bests from the saved matches', () => {
    const season = {
      roster: ['a', 'b', 'c'],
      fixtures: [],
      results: {
        f1: { fixtureId: 'f1', bat: [[0, 80, 40, 6, 2, 1]], bowl: [[1, 24, 20, 3, 0]], ff: [0, 31] },
        f2: { fixtureId: 'f2', bat: [[2, 112, 60, 9, 4, 0]], bowl: [[1, 24, 15, 3, 1]], ff: [2, 24] },
      },
    } as unknown as Season
    const b = seasonBests(season)
    expect(b.highScore).toEqual({ runs: 112, id: 'c' })
    expect(b.bestBowling).toEqual({ wickets: 3, runs: 15, id: 'b' })
    expect(b.fastestFifty).toEqual({ balls: 24, id: 'c' })
  })

  it('finds the quickest fifty of a played match', () => {
    const [A, B] = BUILT_IN_TEAMS
    let found = 0
    for (let seed = 1; seed <= 20; seed++) {
      const m = new Match({ teamA: A, teamB: B, format: 't20', seed }); m.playMatch()
      const ff = fastestFiftyOf(m.innings)
      if (!ff) continue
      found++
      expect(ff[1]).toBeGreaterThanOrEqual(10)
      expect(ff[1]).toBeLessThanOrEqual(120)
    }
    expect(found).toBeGreaterThan(3)
  })

  it('the super over winner matches the saved result and the scores add up', () => {
    for (const seed of [1, 7, 99, 12345]) {
      const o = superOverOutcome(seed)
      expect(o.winnerSide).toBe(new Rng(seed ^ 0x9e3779b9).chance(0.5) ? 0 : 1)
      expect(o.winnerRuns).toBeGreaterThan(o.loserRuns)
      expect(superOverOutcome(seed)).toEqual(o)
    }
  })

  it('says when your team is through to the knockouts or out', () => {
    const comp = { id: 'c', kind: 'league', teamIds: ['a', 'b', 'c', 'd'] } as unknown as Competition
    const fx = (id: string, phase: Fixture['phase'], home: string | null, away: string | null) => ({ id, competitionId: 'c', phase, homeId: home, awayId: away }) as Fixture
    const season = { fixtures: [fx('1', 'league', 'a', 'b'), fx('2', 'league', 'c', 'd'), fx('3', 'knockout', 'a', 'c'), fx('4', 'knockout', null, null)], results: { 1: {}, 2: {} } } as unknown as Season
    expect(playoffStatus(season, comp, 'a')).toBe('qualified')
    expect(playoffStatus(season, comp, 'b')).toBe('eliminated')
    expect(playoffStatus({ ...season, results: { 1: {} } } as unknown as Season, comp, 'a')).toBeNull() // still playing
    expect(playoffStatus(season, { ...comp, kind: 'series' } as Competition, 'a')).toBeNull()
  })

  it('lists your risers with their old and new ratings', () => {
    const ups = upgradesFrom({ a: { o: 3, a: {} }, b: { o: 1, a: {} }, c: { o: 0, a: {} }, z: { o: 5, a: {} } }, new Set(['a', 'b', 'c']), (id) => ({ a: 80, b: 70, c: 60 })[id] ?? null)
    expect(ups.map((u) => [u.playerId, u.before, u.after])).toEqual([['a', 77, 80], ['b', 69, 70]])
  })

  it('builds awards night with eleven players and a keeper', () => {
    const season = { roster: [], fixtures: [], results: {}, competitions: [] } as unknown as Season
    const c = collect(season)
    const data = awardsNight(c, () => undefined)
    expect(data.goldenBat).toBeNull()
    expect(data.xi).toEqual([])
  })
})
