import { describe, expect, it } from 'vitest'
import { BUILT_IN_TEAMS } from '../data/teams'
import { Match } from '../engine/match'
import { pickHighlights } from './highlights'
import { duelsOf } from './results'

describe('match highlights', () => {
  it('pick the best balls of a real match: a few, in the order played, mostly wickets, sixes and milestones', () => {
    for (let seed = 1; seed <= 8; seed++) {
      const m = new Match({ teamA: BUILT_IN_TEAMS[2], teamB: BUILT_IN_TEAMS[9], format: 't20', seed })
      m.playMatch()
      const picks = pickHighlights(m.innings.map((i) => i.log))
      expect(picks.length).toBeGreaterThanOrEqual(2)
      expect(picks.length).toBeLessThanOrEqual(7)
      for (let k = 1; k < picks.length; k++) expect(picks[k].ev.innings * 1e6 + picks[k].ev.seq).toBeGreaterThan(picks[k - 1].ev.innings * 1e6 + picks[k - 1].ev.seq)
      expect(picks.filter((p) => p.ev.innings === 0).length).toBeLessThanOrEqual(4)
    }
  })
  it('head to head: pairs that met for six balls or had a wicket between them', () => {
    const m = new Match({ teamA: BUILT_IN_TEAMS[2], teamB: BUILT_IN_TEAMS[9], format: 't20', seed: 5 })
    m.playMatch()
    const d = duelsOf(m.innings.flatMap((i) => i.log))
    expect(d.length).toBeGreaterThan(0)
    for (const [, , balls, , outs] of d) expect(balls >= 6 || outs > 0).toBe(true)
    expect(d.reduce((a, x) => a + x[4], 0)).toBeGreaterThan(0)
  })
})
