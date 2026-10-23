import { describe, expect, it } from 'vitest'
import { BUILT_IN_TEAMS } from '../data/teams'
import { REVIEWS_PER_INNINGS, wantsChallenge, type DrsCtx } from './drs'
import { Match } from './match'

const play = (seed: number, format: 't20' | 'odi' | 'test' = 't20') => { const m = new Match({ teamA: BUILT_IN_TEAMS[2], teamB: BUILT_IN_TEAMS[9], format, seed }); m.playMatch(); return m }

describe('challenges (DRS)', () => {
  it('gives each side 2 challenges an innings in a T20, 4 in a one-day match and 6 in a Test', () => {
    expect(REVIEWS_PER_INNINGS).toEqual({ t20: 2, odi: 4, test: 6 })
    for (const [format, n] of [['t20', 2], ['odi', 4], ['test', 6]] as const) {
      const m = format === 'test' ? new Match({ teamA: BUILT_IN_TEAMS[2], teamB: BUILT_IN_TEAMS[9], format, seed: 3 }) : new Match({ teamA: BUILT_IN_TEAMS[2], teamB: BUILT_IN_TEAMS[9], format, seed: 3 })
      expect(m.current.reviews).toEqual({ bat: n, bowl: n })
    }
  })

  it('a failed challenge is lost, an upheld one is kept, and nobody challenges more than they have', () => {
    let seen = 0, overturned = 0
    for (let seed = 1; seed <= 60; seed++) {
      const m = play(seed)
      for (const inn of m.innings) {
        const lost = { bat: 0, bowl: 0 }
        for (const e of inn.log) {
          const r = e.review
          if (!r) continue
          seen++
          if (r.overturned) overturned++
          else lost[r.by]++
          expect(r.left).toBe(2 - lost[r.by])
          expect(r.left).toBeGreaterThanOrEqual(0)
          // the decision after the review is what happened: an overturned lbw is no wicket, an overturned not-out is a wicket
          expect(!!e.wicket).toBe(r.finalOut)
          expect(r.finalOut).toBe(r.overturned ? !r.originalOut : r.originalOut)
        }
        expect(lost.bat).toBeLessThanOrEqual(2)
        expect(lost.bowl).toBeLessThanOrEqual(2)
      }
    }
    expect(seen).toBeGreaterThan(30)
    expect(overturned).toBeGreaterThan(0)
  })

  it('is part of the match seed: the same match plays the same way, reviews and all', () => {
    const a = play(9), b = play(9)
    expect(a.innings.map((i) => i.log.map((e) => `${e.seq}${e.review ? JSON.stringify(e.review) : ''}`).join())).toEqual(b.innings.map((i) => i.log.map((e) => `${e.seq}${e.review ? JSON.stringify(e.review) : ''}`).join()))
  })

  it('a side up against the wall challenges almost every time, even when it was probably out', () => {
    const wall: DrsCtx = { by: 'bat', left: 1, batRuns: 4, batBalls: 6, position: 9, wickets: 9, ballsLeft: 10, need: 30, recentWickets: 3 }
    let yes = 0
    for (let i = 0; i < 100; i++) if (wantsChallenge(wall, i / 100).yes) yes++
    expect(yes).toBeGreaterThan(85)
    expect(wantsChallenge(wall, 0.5).desperate).toBe(true)
    // and with none left, no one can
    expect(wantsChallenge({ ...wall, left: 0 }, 0).yes).toBe(false)
    // an early, settled game is not so keen
    const calm: DrsCtx = { by: 'bat', left: 2, batRuns: 2, batBalls: 3, position: 9, wickets: 1, ballsLeft: 100, need: null, recentWickets: 0 }
    let calmYes = 0
    for (let i = 0; i < 100; i++) if (wantsChallenge(calm, i / 100).yes) calmYes++
    expect(calmYes).toBeLessThan(30)
  })
})
