import { describe, expect, it } from 'vitest'
import { wideDirection, wideSide } from './wide'

describe('which way a wide went', () => {
  it('follows a chosen line, else a stable pick that is mostly outside off', () => {
    expect(wideSide({ seq: 3, delivery: { line: 2, length: 'good', pace: 'fast' } })).toBe('off')
    expect(wideSide({ seq: 3, delivery: { line: -1, length: 'good', pace: 'fast' } })).toBe('leg')
    let off = 0
    for (let s = 1; s <= 200; s++) { expect(wideSide({ seq: s, delivery: undefined })).toBe(wideSide({ seq: s, delivery: undefined })); if (wideSide({ seq: s, delivery: undefined }) === 'off') off++ }
    expect(off).toBeGreaterThan(100)
    expect(off).toBeLessThan(160)
  })
  it('puts the off side on the right from above and on the left from behind the bowler, and mirrors it for a left-hander', () => {
    expect(wideDirection('off', 'R', 'above')).toBe(1)
    expect(wideDirection('off', 'R', 'behind-bowler')).toBe(-1)
    expect(wideDirection('leg', 'R', 'above')).toBe(-1)
    expect(wideDirection('off', 'L', 'above')).toBe(-1)
    expect(wideDirection('leg', 'L', 'behind-bowler')).toBe(-1)
  })
})
