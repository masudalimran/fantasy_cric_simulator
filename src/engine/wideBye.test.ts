import { describe, expect, it } from 'vitest'
import { BUILT_IN_TEAMS } from '../data/teams'
import { Match } from './match'
import { BYE_FOUR_CM, byeCm, WIDE_BYE_CM, wideByesFor, wideCm } from './wide'
import { fieldPlan } from '../components/match/fieldSets'
import { planBall, ROPE } from '../components/match/broadcast'
import { endPoint, placeFielders } from '../components/match/Stage'

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

  it('a bye of a metre or more wide is four byes, about one bye in twelve; the others are one', () => {
    let byes = 0, fours = 0
    for (let seed = 1; seed <= 200; seed++) {
      const m = new Match({ teamA: BUILT_IN_TEAMS[seed % 20], teamB: BUILT_IN_TEAMS[(seed + 5) % 20], format: 't20', seed })
      m.playMatch()
      for (const ev of m.events) if (ev.extraType === 'bye') { byes++; const far = byeCm(ev.seq) >= BYE_FOUR_CM; expect(ev.extraRuns).toBe(far ? 4 : 1); if (far) fours++ }
    }
    expect(byes).toBeGreaterThan(100)
    expect(fours / byes).toBeGreaterThan(0.03)
    expect(fours / byes).toBeLessThan(0.16)
  })
  it('every four byes, wide plus four byes and leg-bye four is drawn racing right to the boundary rope', () => {
    const m = new Match({ teamA: BUILT_IN_TEAMS[2], teamB: BUILT_IN_TEAMS[9], format: 't20', seed: 5 })
    m.playMatch()
    const inn = m.innings[0]
    const base = inn.log.find((x) => x.legal && !x.extraType && !x.wicket && !x.boundary)!
    const side = m.sides[1 - inn.battingSide]
    for (const spec of [{ extraType: 'bye', extraRuns: 4 }, { extraType: 'legbye', extraRuns: 4 }, { extraType: 'wide', extraRuns: 1, wideByes: 4 }] as const) {
      for (let seq = 1; seq <= 12; seq++) {
        const e = { ...base, ...spec, seq, runsBat: 0, total: 5 } as typeof base
        const striker = m.player(e.strikerId)
        const p0 = fieldPlan({ format: 't20', over: e.over, maxOvers: 20, runs: e.score.runs, legalBalls: e.score.legalBalls, target: null, freeHit: false, bowlType: null, hand: striker.hand })
        const fielders = placeFielders(side.xi, e.bowlerId, p0.spots)
        const plan = planBall(e, fielders.map((f) => ({ id: f.player.id, x: f.x, y: f.y, spot: f.spot })), endPoint(e, fielders), striker.hand === 'L', 135, { bowler: m.player(e.bowlerId) })
        const r = Math.hypot((plan.end.x - ROPE.cx) / ROPE.rx, (plan.end.z - ROPE.cz) / ROPE.rz)
        expect(r, `${spec.extraType} ${seq}`).toBeGreaterThan(0.97)
        expect(r, `${spec.extraType} ${seq}`).toBeLessThan(1.03)
      }
    }
  })
})
