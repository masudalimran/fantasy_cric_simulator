import { describe, expect, it } from 'vitest'
import { crowdLevel, crowdHush, crowdSwell, startCrowd, stopCrowd } from './crowd'

describe('the crowd sound bed', () => {
  it('a bigger moment is louder, and the level stays within bounds', () => {
    expect(crowdLevel(0)).toBeLessThan(crowdLevel(0.5))
    expect(crowdLevel(0.5)).toBeLessThan(crowdLevel(1))
    expect(crowdLevel(-3)).toBe(crowdLevel(0))
    expect(crowdLevel(9)).toBe(crowdLevel(1))
    expect(crowdLevel(1)).toBeLessThan(0.3)
  })
  it('does nothing, and does not crash, where there is no audio', () => {
    expect(() => { startCrowd(); crowdSwell(1); crowdHush(); stopCrowd() }).not.toThrow()
  })
})
