import { describe, expect, it } from 'vitest'
import { BUILT_IN_TEAMS } from '../data/teams'
import { Match } from './match'
import { ballSpeed } from './speed'

describe('ball speed', () => {
  it('is believable for every kind of bowler and the same for the same ball', () => {
    const m = new Match({ teamA: BUILT_IN_TEAMS[2], teamB: BUILT_IN_TEAMS[9], format: 't20', seed: 4 })
    m.playMatch()
    const byType: Record<string, number[]> = {}
    for (const inn of m.innings) for (const ev of inn.log) {
      const b = m.player(ev.bowlerId)
      const v = ballSpeed(ev, b)
      expect(v).toBe(ballSpeed(ev, b))
      ;(byType[b.bowling?.type ?? 'none'] ??= []).push(v)
    }
    for (const [t, vs] of Object.entries(byType)) {
      const lo = Math.min(...vs), hi = Math.max(...vs)
      if (t === 'fast') { expect(lo).toBeGreaterThan(110); expect(hi).toBeLessThan(160) }
      else if (t === 'medium') { expect(lo).toBeGreaterThan(95); expect(hi).toBeLessThan(142) }
      else expect(hi).toBeLessThan(106)
    }
    const fast = (byType.fast ?? []).reduce((a, b) => a + b, 0) / Math.max(1, (byType.fast ?? []).length)
    const spin = [...(byType.offspin ?? []), ...(byType.legspin ?? []), ...(byType.leftspin ?? [])]
    if (spin.length) expect(fast).toBeGreaterThan(spin.reduce((a, b) => a + b, 0) / spin.length + 25)
  })
  it('a slower ball is slower than a fast one from the same bowler', () => {
    const b = { bowling: { type: 'fast' as const, accuracy: 70, variation: 70, stamina: 70 } }
    expect(ballSpeed({ seq: 5, delivery: { line: 0, length: 'good', pace: 'slow' } }, b)).toBeLessThan(ballSpeed({ seq: 5, delivery: { line: 0, length: 'good', pace: 'fast' } }, b) - 12)
  })
})
