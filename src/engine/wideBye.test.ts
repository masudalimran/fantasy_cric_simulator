import { describe, expect, it } from 'vitest'
import { BUILT_IN_TEAMS } from '../data/teams'
import { Match } from './match'
import { WIDE_BYE_CM, wideByesFor, wideCm } from './wide'

describe('a very wide ball runs on for four byes', () => {
  const wides: { ev: Match['events'][number]; m: Match }[] = []
  let matches = 0
  for (let seed = 1; seed <= 40; seed++) {
    const m = new Match({ teamA: BUILT_IN_TEAMS[seed % 20], teamB: BUILT_IN_TEAMS[(seed + 7) % 20], format: 't20', seed })
    m.playMatch()
    matches++
    for (const ev of m.events) if (ev.extraType === 'wide') wides.push({ ev, m })
  }
  it('a wide of 120 cm or more is a wide plus four byes (five runs); any other wide is one run', () => {
    expect(wides.length).toBeGreaterThan(100)
    let withByes = 0
    for (const { ev } of wides) {
      const far = wideCm(ev.seq) >= WIDE_BYE_CM
      expect(wideByesFor(ev.seq)).toBe(far ? 4 : 0)
      expect(ev.extraRuns).toBe(1)
      expect(ev.total).toBe(far ? 5 : 1)
      expect(ev.wideByes ?? 0).toBe(far ? 4 : 0)
      if (far) withByes++
    }
    expect(withByes).toBeGreaterThan(wides.length * 0.08)
    expect(withByes).toBeLessThan(wides.length * 0.25)
  })
  it('the score, the extras and the bowler add up: the four byes are the team\'s, not the bowler\'s', () => {
    for (const { m } of wides.slice(0, 1)) void m
    for (let seed = 1; seed <= 40; seed++) {
      const m = new Match({ teamA: BUILT_IN_TEAMS[seed % 20], teamB: BUILT_IN_TEAMS[(seed + 7) % 20], format: 't20', seed })
      m.playMatch()
      for (const inn of m.innings) {
        const log = inn.log
        expect(inn.runs).toBe(log.reduce((s, e) => s + e.total, 0))
        expect(inn.extras.byes).toBe(log.reduce((s, e) => s + (e.extraType === 'bye' ? e.extraRuns : 0) + (e.wideByes ?? 0), 0))
        expect(inn.extras.wides).toBe(log.filter((e) => e.extraType === 'wide').length)
        const conceded = [...inn.bowlers.values()].reduce((s, b) => s + b.runs, 0)
        expect(conceded).toBe(log.reduce((s, e) => s + e.runsBat + (e.extraType === 'wide' || e.extraType === 'noball' ? e.extraRuns : 0), 0))
      }
    }
    expect(matches).toBe(40)
  })
})
