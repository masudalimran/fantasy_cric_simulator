import { describe, expect, it } from 'vitest'
import { BUILT_IN_TEAMS } from '../data/teams'
import { Match } from './match'
import { ballSpeed, DRAGON_KMH, speedStyle } from './speed'

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
      const lo = Math.min(...vs), hi = Math.max(...vs.filter((v) => v < DRAGON_KMH)) // (a dragon ball is the rare exception)
      if (t === 'fast') { expect(lo).toBeGreaterThan(110); expect(hi).toBeLessThan(160) }
      else if (t === 'medium') { expect(lo).toBeGreaterThan(95); expect(hi).toBeLessThan(142) }
      else expect(hi).toBeLessThan(106)
    }
    const fast = (byType.fast ?? []).reduce((a, b) => a + b, 0) / Math.max(1, (byType.fast ?? []).length)
    const spin = [...(byType.offspin ?? []), ...(byType.legspin ?? []), ...(byType.leftspin ?? [])]
    if (spin.length) expect(fast).toBeGreaterThan(spin.reduce((a, b) => a + b, 0) / spin.length + 25)
  })
  it('very quick balls are fire, very slow ones are ice, the rest plain', () => {
    expect(speedStyle(148)).toBe('fire')
    expect(speedStyle(145)).toBe('fire')
    expect(speedStyle(144)).toBe('plain')
    expect(speedStyle(110)).toBe('plain')
    expect(speedStyle(79)).toBe('ice')
    expect(speedStyle(80)).toBe('plain')
    expect(speedStyle(70)).toBe('ice')
  })
  it('a slower ball is slower than a fast one from the same bowler', () => {
    const b = { bowling: { type: 'fast' as const, accuracy: 70, variation: 70, stamina: 70 } }
    expect(ballSpeed({ seq: 5, delivery: { line: 0, length: 'good', pace: 'slow' } }, b)).toBeLessThan(ballSpeed({ seq: 5, delivery: { line: 0, length: 'good', pace: 'fast' } }, b) - 12)
  })
  it('a dragon ball (160 to 200 km/h) is rare, only quick bowlers bowl one, and it is drawn as a dragon', () => {
    const fast = { bowling: { type: 'fast', accuracy: 80, variation: 80, stamina: 80 } } as Parameters<typeof ballSpeed>[1]
    const spinner = { bowling: { type: 'offspin', accuracy: 80, variation: 80, stamina: 80 } } as Parameters<typeof ballSpeed>[1]
    let dragons = 0, top = 0
    for (let seq = 1; seq <= 30000; seq++) { const v = ballSpeed({ seq, delivery: undefined }, fast); if (v >= DRAGON_KMH) { dragons++; top = Math.max(top, v) } else expect(v).toBeLessThan(160) }
    expect(dragons).toBeGreaterThan(40); expect(dragons).toBeLessThan(200) // about one ball in 300
    expect(top).toBeLessThanOrEqual(200); expect(top).toBeGreaterThan(180)
    for (let seq = 1; seq <= 20000; seq++) expect(ballSpeed({ seq, delivery: undefined }, spinner)).toBeLessThan(106)
    expect(speedStyle(165)).toBe('dragon')
    expect(speedStyle(159)).toBe('fire')
  })
})
