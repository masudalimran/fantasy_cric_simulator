import { describe, expect, it } from 'vitest'
import type { BallEvent } from '../engine/types'
import { isNotOutReview, partnershipAt, partnershipMark, recentHighlight, runOutGap, trackFor } from './moments'
import type { Season } from './types'

const ev = (seq: number, o: Partial<BallEvent> & { runs: number; wk?: number }): BallEvent => ({
  seq, innings: 0, over: Math.floor(seq / 6), ballInOver: seq % 6, legal: true, strikerId: 'a', nonStrikerId: 'b', bowlerId: 'x', runsBat: o.runsBat ?? o.runs, extraType: null, extraRuns: 0,
  total: o.runs, boundary: 0, wicket: o.wicket ?? null, intent: 0, freeHit: false, score: { runs: o.runs, wickets: o.wk ?? 0, legalBalls: seq }, tags: [], ...o,
}) as BallEvent

describe('moments data', () => {
  it('finds the best recent performance, skipping the match being played', () => {
    const season = {
      roster: ['p1', 'p2'],
      fixtures: [{ id: 'f1', date: '2026-01-02', homeId: 'A', awayId: 'B' }, { id: 'f2', date: '2026-01-05', homeId: 'C', awayId: 'D' }],
      results: {
        f1: { fixtureId: 'f1', bat: [[0, 64, 40, 6, 2, 1]], bowl: [[1, 24, 20, 3, 0]] },
        f2: { fixtureId: 'f2', bat: [[0, 120, 60, 10, 5, 0]], bowl: [] },
      },
    } as unknown as Season
    expect(recentHighlight(season)?.headline).toBe('120 (60)')
    expect(recentHighlight(season, 'f2')?.playerId).toBe('p1')
    expect(recentHighlight({ ...season, results: {} } as Season)).toBeNull()
  })
  it('works out a stand since the last wicket and its 50s', () => {
    const log: BallEvent[] = []
    let runs = 0
    for (let i = 1; i <= 30; i++) { runs += i === 10 ? 0 : 2; log.push(ev(i, { runs, ...(i === 10 ? { runsBat: 0, total: 0, wicket: { kind: 'bowled', playerId: 'z' } as BallEvent['wicket'], wk: 1 } : { runsBat: 2, total: 2 }) })) }
    // wicket on ball 10 (runs 18), then 20 balls of 2 runs: the stand reaches 40 at ball 30
    const last = log[29]
    expect(partnershipAt(log, last).runs).toBe(40)
    expect(partnershipMark(log, last)).toBeNull()
    const more = [...log, ev(31, { runs: runs + 10, runsBat: 10, total: 10 })]
    expect(partnershipMark(more, more[30])).toBe(50)
  })
  it('numbers for the umpire are stable and believable', () => {
    expect(runOutGap(7)).toEqual(runOutGap(7))
    for (let s = 1; s < 50; s++) { const g = runOutGap(s).cm; expect(g).toBeGreaterThanOrEqual(2); expect(g).toBeLessThanOrEqual(70) }
    for (let s = 1; s < 50; s++) { const t = trackFor(s, true); expect(Math.abs(t.stumpsX)).toBeLessThanOrEqual(0.18); expect(t.wickets).toMatch(/Hitting/) }
    for (let s = 1; s < 50; s++) expect(trackFor(s, false).wickets).toBe(Math.abs(trackFor(s, false).stumpsX) <= 0.18 ? 'Hitting' : 'Missing')
    const reviews = Array.from({ length: 600 }, (_, i) => isNotOutReview(i + 1)).filter(Boolean).length
    expect(reviews).toBeGreaterThan(5)
    expect(reviews).toBeLessThan(45)
  })
})
