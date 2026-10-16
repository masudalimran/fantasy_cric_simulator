import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BUILT_IN_TEAMS } from '../../data/teams'
import { bowledFor, catchFor, handsFor, stumpGap } from '../../season/moments'
import { WICKET_FX_SECONDS, WicketFxScreen, type WicketFxInfo } from './WicketScreens'

const A = BUILT_IN_TEAMS[0], B = BUILT_IN_TEAMS[1]
const base = { batsman: A.players[0], batTeam: A, bowler: B.players[0], bowlTeam: B, rate: 1 }

describe('the special wicket screens', () => {
  const infos: WicketFxInfo[] = [
    { ...base, type: 'rope', fielder: B.players[2], ...catchFor(7) },
    { ...base, type: 'stumping', keeper: B.players[6], cm: stumpGap(9) },
    { ...base, type: 'bowled', ...bowledFor(10, 'fast') },
    { ...base, type: 'hitwicket' },
    { ...base, type: 'nelson', runs: 111, balls: 80 },
    { ...base, type: 'pair', king: true },
    { ...base, type: 'stand', partner: A.players[1], runs: 120, balls: 80 },
  ]
  it('every one renders, and each has a length', () => {
    for (const info of infos) {
      const html = renderToString(<WicketFxScreen info={info} />)
      expect(html.length, info.type).toBeGreaterThan(500)
      expect(WICKET_FX_SECONDS[info.type]).toBeGreaterThan(3)
    }
  })
  it('the numbers are believable and stable for a ball', () => {
    for (let seq = 1; seq < 200; seq++) {
      const c = catchFor(seq)
      expect(c.height).toBeGreaterThanOrEqual(18); expect(c.height).toBeLessThanOrEqual(45)
      expect(c.hang).toBeGreaterThan(3); expect(c.cm).toBeGreaterThanOrEqual(3)
      expect(handsFor(seq).reaction).toBeGreaterThanOrEqual(140)
      expect(stumpGap(seq)).toBeLessThanOrEqual(38)
      const b = bowledFor(seq, 'offspin')
      expect(b.kmh).toBeGreaterThanOrEqual(68); expect(b.kmh).toBeLessThanOrEqual(96)
    }
    expect(catchFor(5)).toEqual(catchFor(5))
    expect(bowledFor(4, 'fast').kmh).toBeGreaterThanOrEqual(128)
  })
})
