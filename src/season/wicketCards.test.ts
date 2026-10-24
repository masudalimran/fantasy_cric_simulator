import { describe, expect, it } from 'vitest'
import { wicketCard } from './wicketCards'

describe('the card under a wicket replay', () => {
  const o = { bowlerName: 'Dio Brando', bowlerType: 'fast', kmh: 141, keeperName: 'Jotaro Kujo', fielderName: 'Son Goku' }
  it('has a headline, three facts and a sentence for every kind, with no gaps', () => {
    for (const kind of ['bowled', 'lbw', 'stumped', 'hit wicket', 'run out'] as const) for (let seq = 1; seq <= 30; seq++) {
      const c = wicketCard(kind, seq, o)
      expect(c.title).toMatch(/!$/)
      expect(c.tiles).toHaveLength(3)
      for (const t of [...c.tiles.map((x) => x.label + x.value), c.verdict]) expect(t).not.toMatch(/undefined|NaN|\{|\}/)
      expect(c.verdict.length).toBeGreaterThan(20)
    }
  })
  it('says the speed it was bowled at, the same card for the same ball, and the gap for a run out or a stumping', () => {
    expect(wicketCard('bowled', 4, o).verdict).toContain('141 km/h')
    expect(wicketCard('lbw', 9, o)).toEqual(wicketCard('lbw', 9, o))
    expect(wicketCard('run out', 3, o).tiles[0].value).toMatch(/^\d+ cm$/)
    expect(wicketCard('stumped', 3, o).tiles[0].value).toMatch(/^\d+ cm$/)
  })
})
