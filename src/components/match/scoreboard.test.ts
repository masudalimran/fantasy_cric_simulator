import { describe, expect, it } from 'vitest'
import { projectedScore } from './Scoreboard'

describe('projected score', () => {
  it('starts from a normal rate for the format and settles onto the real run rate', () => {
    expect(projectedScore(0, 0, 120, 8.5)).toBe(Math.round((8.5 * 120) / 6)) // 170 before a ball is bowled
    // 60 off 6 overs (rate 10): by then it trusts the real rate
    expect(projectedScore(60, 36, 120, 8.5)).toBe(60 + Math.round((10 * 84) / 6))
    // a fast start doesn't project wildly after one over
    expect(projectedScore(16, 6, 120, 8.5)).toBeGreaterThan(170)
    expect(projectedScore(16, 6, 120, 8.5)).toBeLessThan(16 * 20)
  })
  it('is just the score once the innings is over', () => {
    expect(projectedScore(180, 120, 120, 8.5)).toBe(180)
  })
})
