import { describe, expect, it } from 'vitest'
import { catchCause, catchContact, catchVerdict, sixContact, speedLabel, timingLabel } from './contact'

describe('contact: where the ball met the bat', () => {
  it('a longer six is hit better: nearer the sweet spot, with a faster bat and better timing', () => {
    const avg = (d: number, f: (c: ReturnType<typeof sixContact>) => number) => { let t = 0; for (let s = 1; s <= 80; s++) t += f(sixContact({ seq: s, distance: d }, 70)); return t / 80 }
    expect(avg(130, (c) => c.speed)).toBeGreaterThan(avg(65, (c) => c.speed) + 12)
    expect(avg(130, (c) => Math.hypot(c.along, c.across))).toBeLessThan(avg(65, (c) => Math.hypot(c.along, c.across)))
    expect(avg(130, (c) => Math.abs(c.timing))).toBeLessThan(avg(65, (c) => Math.abs(c.timing)))
    expect(avg(130, (c) => c.quality)).toBeGreaterThan(avg(65, (c) => c.quality))
    // a monster six is middled
    expect(sixContact({ seq: 9, distance: 175 }, 90).spot).toBe('Middle')
    expect(timingLabel(sixContact({ seq: 9, distance: 175 }, 90).timing)).toMatch(/Perfect|touch/)
  })
  it('a harder hitter swings faster for the same distance, and the same ball is always the same picture', () => {
    expect(sixContact({ seq: 4, distance: 90 }, 90).speed).toBeGreaterThan(sixContact({ seq: 4, distance: 90 }, 45).speed)
    expect(sixContact({ seq: 4, distance: 90 }, 70)).toEqual(sixContact({ seq: 4, distance: 90 }, 70))
  })
  it('a catch is an edge, a top edge, a toe end or a mistimed shot, and the contact fits the cause', () => {
    const seen = new Set<string>()
    for (let s = 1; s <= 60; s++) {
      expect(catchCause({ seq: s, byKeeper: true, peak: 1, dist: 8 })).toBe('edge')
      const c = catchContact(s, 'edge', 70)
      expect(Math.abs(c.across)).toBeGreaterThan(0.78)
      expect(c.spot).toBe('Outside edge' === c.spot || 'Inside edge' === c.spot ? c.spot : 'Outside edge')
      const sk = catchContact(s, 'skier', 70)
      expect(sk.along).toBeGreaterThan(0.78)
      expect(sk.spot).toBe('Top edge')
      const toe = catchContact(s, 'toe', 70)
      expect(toe.along).toBeLessThan(-0.75)
      expect(toe.spot).toBe('Toe end')
      const mt = catchContact(s, 'mistimed', 70)
      expect(Math.abs(mt.timing)).toBeGreaterThan(26)
      expect(mt.weak).toBe(true)
      seen.add(catchCause({ seq: s, byKeeper: false, peak: s % 9, dist: 10 + (s % 40) }))
    }
    expect(seen.size).toBeGreaterThanOrEqual(3)
    expect(catchVerdict('mistimed', catchContact(3, 'mistimed', 70), 'Goku')).toMatch(/under-timed/)
    expect(catchVerdict('toe', { ...catchContact(3, 'toe', 70), speed: 80 }, 'Goku')).toMatch(/poor/)
  })
  it('puts words to the speed and the timing', () => {
    expect(speedLabel(80)).toBe('Slow bat')
    expect(speedLabel(120)).toBe('Blistering')
    expect(timingLabel(0)).toBe('Perfect timing')
    expect(timingLabel(-40)).toBe('Far too early')
    expect(timingLabel(15)).toBe('A touch late')
  })
})
