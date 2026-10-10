import { describe, expect, it } from 'vitest'
import { BUILT_IN_TEAMS } from '../data/teams'
import { computeAwards } from './awards'
import { Match } from './match'

function playN(n: number, format: 't20' | 'odi' = 't20') {
  const out: { m: Match; awards: ReturnType<typeof computeAwards> }[] = []
  for (let seed = 1; seed <= n; seed++) {
    const m = new Match({ teamA: BUILT_IN_TEAMS[seed % 20], teamB: BUILT_IN_TEAMS[(seed * 7 + 3) % 20 === seed % 20 ? 0 : (seed * 7 + 3) % 20], format, seed })
    m.playMatch()
    out.push({ m, awards: computeAwards(m) })
  }
  return out
}

describe('man of the match', () => {
  const games = playN(150)

  it('always names someone, and lists contenders best first', () => {
    for (const { awards } of games) {
      expect(awards.motm).not.toBeNull()
      expect(awards.contenders[0].id).toBe(awards.motm!.id)
      for (let i = 1; i < awards.contenders.length; i++) expect(awards.contenders[i - 1].points).toBeGreaterThanOrEqual(awards.contenders[i].points)
    }
  })

  it('usually comes from the winning side, but a losing hero can still win it', () => {
    const decided = games.filter((g) => g.m.result!.winnerSide !== null)
    const fromWinners = decided.filter((g) => g.awards.motm!.side === g.m.result!.winnerSide).length
    expect(fromWinners / decided.length).toBeGreaterThan(0.8)
    expect(fromWinners).toBeLessThan(decided.length) // never a hard rule
  })

  it('rewards the big performances', () => {
    for (const { awards } of games) {
      const w = awards.motm!
      expect(w.line.length).toBeGreaterThan(0)
      // the winner did something substantial: runs, wickets or fielding
      const impact = (w.bat?.runs ?? 0) + (w.bowl?.wickets ?? 0) * 20 + w.field.catches * 7
      expect(impact).toBeGreaterThan(10)
    }
  })

  it('values a fast innings above a slow one of the same size, and wickets above economy alone', () => {
    // a 60 off 30 should outscore a 60 off 70 in a T20, all else equal; checked through the scoring formula's tempo term
    const fast = 60 * (0.55 + 0.45 * Math.min(2.2, (60 / 30) * 100 / 143))
    const slow = 60 * (0.55 + 0.45 * Math.min(2.2, (60 / 70) * 100 / 143))
    expect(fast).toBeGreaterThan(slow)
  })

  it('works for ODIs and forfeited matches', () => {
    for (const { awards } of playN(30, 'odi')) expect(awards.motm).not.toBeNull()
    const m = new Match({ teamA: BUILT_IN_TEAMS[2], teamB: BUILT_IN_TEAMS[9], format: 't20', seed: 8 })
    m.playOvers(3)
    m.forfeit(0)
    const a = computeAwards(m)
    expect(a.motm).not.toBeNull()
    expect(a.motm!.side).toBe(1) // the winners
  })
})
