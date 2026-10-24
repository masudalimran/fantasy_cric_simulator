import { describe, expect, it } from 'vitest'
import { BUILT_IN_TEAMS } from '../data/teams'
import { Match } from './match'

describe('byes and leg byes', () => {
  it('are mostly a single run, but now and then run away to the rope for four', () => {
    let byes = 0, fours = 0, legByes = 0, legFours = 0
    for (let seed = 1; seed <= 80; seed++) {
      const m = new Match({ teamA: BUILT_IN_TEAMS[2], teamB: BUILT_IN_TEAMS[9], format: 't20', seed })
      m.playMatch()
      for (const inn of m.innings) for (const e of inn.log) {
        if (e.extraType === 'bye') { byes++; expect([1, 4]).toContain(e.extraRuns); if (e.extraRuns === 4) fours++ }
        if (e.extraType === 'legbye') { legByes++; expect([1, 4]).toContain(e.extraRuns); if (e.extraRuns === 4) legFours++ }
        // four byes are four runs to the total, no runs to the batsman, and none charged to the bowler
        if ((e.extraType === 'bye' || e.extraType === 'legbye') && e.extraRuns === 4) { expect(e.runsBat).toBe(0); expect(e.total).toBe(4) }
      }
    }
    expect(byes + legByes).toBeGreaterThan(100)
    expect(fours).toBeGreaterThan(0)
    expect(legFours).toBeGreaterThan(0)
    expect((fours + legFours) / (byes + legByes)).toBeGreaterThan(0.03)
    expect((fours + legFours) / (byes + legByes)).toBeLessThan(0.16)
  })
  it('a boundary bye does not change who is on strike', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const m = new Match({ teamA: BUILT_IN_TEAMS[2], teamB: BUILT_IN_TEAMS[9], format: 't20', seed })
      m.playMatch()
      for (const inn of m.innings) inn.log.forEach((e, i) => {
        const next = inn.log[i + 1]
        if (next && (e.extraType === 'bye' || e.extraType === 'legbye') && e.extraRuns === 4 && e.legal && (e.ballInOver !== 5) && !e.wicket) expect(next.strikerId).toBe(e.strikerId)
      })
    }
  })
})
