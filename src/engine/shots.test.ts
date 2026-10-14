import { describe, expect, it } from 'vitest'
import { sixDistance } from './shots'

describe('how far a six goes', () => {
  it('runs from 60 to 200 metres, with 150 and more very rare', () => {
    for (const power of [40, 70, 95]) {
      const d = Array.from({ length: 20000 }, (_, i) => sixDistance(i + 1, power)).sort((a, b) => a - b)
      expect(d[0]).toBeGreaterThanOrEqual(60)
      expect(d[d.length - 1]).toBeLessThanOrEqual(200)
      const monsters = d.filter((x) => x >= 150).length / d.length
      expect(monsters).toBeGreaterThan(0.002)
      expect(monsters).toBeLessThan(0.035)
      expect(d[Math.floor(d.length / 2)]).toBeGreaterThan(65)
      expect(d[Math.floor(d.length / 2)]).toBeLessThan(105)
    }
    expect(sixDistance(7, 90)).toBe(sixDistance(7, 90))
  })
})
