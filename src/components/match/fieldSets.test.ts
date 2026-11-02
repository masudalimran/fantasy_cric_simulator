import { describe, expect, it } from 'vitest'
import { fieldPlan, fieldStage, type FieldCtx } from './fieldSets'

const base: FieldCtx = { format: 't20', over: 8, maxOvers: 20, runs: 60, legalBalls: 50, target: null, freeHit: false, bowlType: 'fast', hand: 'R' }
const plan = (o: Partial<FieldCtx> = {}) => fieldPlan({ ...base, ...o })

describe('field sets', () => {
  it('pick the stage from the over, a free hit and the chase', () => {
    expect(fieldStage({ ...base, over: 2 })).toBe('powerplay')
    expect(fieldStage(base)).toBe('middle')
    expect(fieldStage({ ...base, over: 17 })).toBe('death')
    expect(fieldStage({ ...base, freeHit: true })).toBe('freehit')
    // last over of a chase, few runs needed: everyone guards the rope
    expect(fieldStage({ ...base, over: 19, legalBalls: 114, runs: 150, target: 160 })).toBe('lockdown')
    // too many runs needed, or not the last over, or batting first: the normal death field
    expect(fieldStage({ ...base, over: 19, legalBalls: 114, runs: 120, target: 160 })).toBe('death')
    expect(fieldStage({ ...base, over: 18, legalBalls: 108, runs: 150, target: 160 })).toBe('death')
    expect(fieldStage({ ...base, over: 19, legalBalls: 114, runs: 150, target: null })).toBe('death')
  })

  it('every set has ten spots, the keeper first, all inside the rope', () => {
    for (const o of [{ over: 2 }, {}, { over: 17 }, { freeHit: true }, { over: 2, bowlType: 'offspin' as const }, { hand: 'L' as const }]) {
      const f = plan(o).spots
      expect(f).toHaveLength(10)
      expect(f[0].spot).toBe('Wicketkeeper')
      for (const s of f) expect(((s.x - 80) / 66) ** 2 + ((s.y - 50) / 40) ** 2).toBeLessThan(1)
    }
  })

  it('the middle overs keep the original field', () => {
    expect(plan().spots.map((s) => s.spot)).toEqual(['Wicketkeeper', 'Slip', 'Point', 'Cover', 'Mid-off', 'Mid-on', 'Midwicket', 'Square leg', 'Fine leg', 'Long-on'])
  })

  it('a spinner brings the keeper up and a man in; a left-hander mirrors the field', () => {
    const spin = plan({ bowlType: 'legspin' }).spots
    expect(spin[0].y).toBeLessThan(plan().spots[0].y)
    expect(spin[1].spot).toBe('Short leg')
    expect(plan({ over: 17, bowlType: 'legspin' }).spots[1].spot).toBe('Third man')
    const r = plan().spots
    const l = plan({ hand: 'L' }).spots
    r.forEach((s, i) => expect(l[i].x).toBe(160 - s.x))
    expect(l.find((s) => s.spot === 'Mid-off')!.x).toBe(160 - r.find((s) => s.spot === 'Mid-on')!.x)
    expect(plan({ hand: 'L', noMirror: true }).spots).toEqual(r)
  })
  it('no fielder ever stands level with the batsman to his left or right (he would block the replay cameras)', async () => {
    const { fielderWorld } = await import('./broadcast')
    for (const format of ['t20', 'odi', 'test'] as const) for (let over = 0; over < 50; over += 3) for (const hand of ['R', 'L'] as const) for (const bowlType of ['fast', 'offspin', 'legspin', 'medium', null] as const) {
      const p = fieldPlan({ format, over, maxOvers: format === 't20' ? 20 : 50, runs: 60, legalBalls: over * 6, target: null, freeHit: false, bowlType, hand })
      for (const s of p.spots) { if (s.spot === 'Wicketkeeper') continue; const w = fielderWorld(s.x, s.y, s.spot); expect(Math.abs(w.x) < 12 && w.z > -3.5 && w.z < 2.0, `${s.spot} ${w.x.toFixed(1)},${w.z.toFixed(1)}`).toBe(false) }
    }
  })
})
