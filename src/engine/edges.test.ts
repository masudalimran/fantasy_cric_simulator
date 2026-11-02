import { describe, expect, it } from 'vitest'
import { edgeDegrees, edgeOf } from './edges'
import { eventAngle, degreesFromStraight } from './shots'

describe('edges', () => {
  it('about one in five bowled balls is an inside edge, one four in eight an edge, and fewer singles; never a wide, a bye or a six', () => {
    let bowled = 0, bowledEdge = 0, fours = 0, foursEdge = 0, ones = 0, onesEdge = 0
    for (let seq = 1; seq <= 4000; seq++) {
      if (edgeOf({ seq, wicket: { kind: 'bowled' } })) bowledEdge++; bowled++
      if (edgeOf({ seq, runsBat: 4, boundary: 4 })) foursEdge++; fours++
      if (edgeOf({ seq, runsBat: 1, boundary: 0 })) onesEdge++; ones++
      expect(edgeOf({ seq, runsBat: 6, boundary: 6 })).toBeNull()
      expect(edgeOf({ seq, runsBat: 0, extraType: 'wide' })).toBeNull()
      expect(edgeOf({ seq, runsBat: 0, boundary: 0 })).toBeNull()
      expect(edgeOf({ seq, wicket: { kind: 'lbw' } })).toBeNull()
    }
    expect(bowledEdge / bowled).toBeGreaterThan(0.15); expect(bowledEdge / bowled).toBeLessThan(0.25)
    expect(foursEdge / fours).toBeGreaterThan(0.09); expect(foursEdge / fours).toBeLessThan(0.16)
    expect(onesEdge / ones).toBeGreaterThan(0.06); expect(onesEdge / ones).toBeLessThan(0.11)
  })
  it('an edged scoring ball goes behind the wicket: an inside edge fine on the leg side, an outside edge towards third man', () => {
    let seen = 0
    for (let seq = 1; seq <= 600; seq++) {
      const ev = { seq, runsBat: 4, boundary: 4 as const }
      const edge = edgeOf(ev)
      if (!edge) continue
      seen++
      const d = degreesFromStraight(eventAngle(ev))
      expect(Math.abs(d)).toBeGreaterThan(110)
      expect(edge === 'inside' ? d < 0 : d > 0).toBe(true)
      expect(Math.abs(edgeDegrees(seq, edge))).toBeGreaterThan(110)
    }
    expect(seen).toBeGreaterThan(30)
    // a shot a person chose is never changed
    expect(eventAngle({ seq: 7, runsBat: 4, boundary: 4, shot: { angle: 0.3 } })).toBe(0.3)
  })
})
