import { describe, expect, it } from 'vitest'
import { BUILT_IN_TEAMS } from '../data/teams'
import { partnerships, perOver, runMix, sectorRuns, wagonShots, worm, wormWickets } from './analysis'
import { Match } from './match'
import { degreesFromStraight, sectorIndex, shotAngle } from './shots'

const games = Array.from({ length: 40 }, (_, i) => {
  const m = new Match({ teamA: BUILT_IN_TEAMS[(i * 3) % 20], teamB: BUILT_IN_TEAMS[(i * 3 + 7) % 20], format: i % 2 ? 'odi' : 't20', seed: i + 1 })
  m.playMatch()
  return m
})

describe('match analysis', () => {
  it('splits an innings into partnerships that add up to the score', () => {
    for (const m of games) for (const inn of m.innings) {
      const ps = partnerships(inn)
      expect(ps.reduce((s, p) => s + p.runs, 0)).toBe(inn.runs)
      expect(ps.filter((p) => !p.unbroken)).toHaveLength(inn.wickets)
      for (const p of ps) {
        expect(p.aRuns + p.bRuns).toBeLessThanOrEqual(p.runs) // extras belong to nobody
        expect(p.a).not.toBe(p.b)
      }
      ps.forEach((p, i) => expect(p.wicket).toBe(i + 1))
    }
  })

  it('tracks runs and wickets by over', () => {
    for (const m of games) for (const inn of m.innings) {
      const overs = perOver(inn)
      expect(overs.reduce((s, o) => s + o.runs, 0)).toBe(inn.runs)
      expect(overs.reduce((s, o) => s + o.wickets, 0)).toBe(inn.wickets)
      const w = worm(inn)
      expect(w[0]).toEqual({ over: 0, runs: 0 })
      expect(w[w.length - 1].runs).toBe(inn.runs)
      for (let i = 1; i < w.length; i++) { expect(w[i].runs).toBeGreaterThanOrEqual(w[i - 1].runs); expect(w[i].over).toBeGreaterThan(w[i - 1].over) }
      expect(wormWickets(inn)).toHaveLength(inn.wickets)
    }
  })

  it('accounts for every ball each batsman faced', () => {
    for (const m of games) for (const inn of m.innings) {
      for (const mix of runMix(inn)) {
        const line = inn.batters.find((b) => b.id === mix.id)!
        expect(mix.balls).toBe(line.balls)
        expect(mix.dots + mix.ones + mix.twos + mix.threes + mix.fours + mix.sixes).toBe(mix.balls)
        expect(mix.fours).toBe(line.fours)
        expect(mix.sixes).toBe(line.sixes)
      }
    }
  })

  it('draws a wagon wheel from every scoring shot, mirrored for left-handers', () => {
    const inn = games[0].innings[0]
    const right = wagonShots(inn, () => false)
    const left = wagonShots(inn, () => true)
    expect(right.length).toBe(inn.log.filter((e) => e.runsBat > 0).length)
    expect(sectorRuns(right).reduce((a, b) => a + b, 0)).toBe(right.reduce((s, x) => s + x.runs, 0))
    right.forEach((s, i) => expect(left[i].deg).toBeCloseTo(-s.deg, 6))
  })

  it('has sensible shot geometry', () => {
    expect(degreesFromStraight(-Math.PI / 2)).toBeCloseTo(0) // straight
    expect(degreesFromStraight(0)).toBeCloseTo(90) // square on the off side (right-hander)
    expect(sectorIndex(0)).toBe(0)
    expect(sectorIndex(44)).toBe(1)
    expect(sectorIndex(-44)).toBe(7)
    expect(sectorIndex(180)).toBe(4)
    // most shots go in front of the bat
    let front = 0
    for (let i = 0; i < 1000; i++) if (Math.abs(degreesFromStraight(shotAngle(i))) <= 100) front++
    expect(front).toBeGreaterThan(780)
  })
})

import { chaseWinChance, dismissalKinds, inningsOverview, matchups, overLines, phaseSummary, winChanceSeries } from './analysis'
import { FORMATS } from './types'

describe('match overview analysis', () => {
  it('summarises an innings consistently', () => {
    for (const m of games) for (const inn of m.innings) {
      const o = inningsOverview(inn)
      expect(o.runs).toBe(inn.runs)
      expect(o.fours).toBe(inn.batters.reduce((s, b) => s + b.fours, 0))
      expect(o.sixes).toBe(inn.batters.reduce((s, b) => s + b.sixes, 0))
      expect(o.extras.total).toBe(inn.extras.wides + inn.extras.noballs + inn.extras.byes + inn.extras.legByes)
      expect(o.dotPct).toBeGreaterThanOrEqual(0)
      expect(o.dotPct).toBeLessThanOrEqual(1)
      expect(o.boundaryShare).toBeLessThanOrEqual(1)
    }
  })

  it('splits an innings into phases that add up', () => {
    for (const m of games) for (const inn of m.innings) {
      const rows = phaseSummary(inn, FORMATS[m.format].phases)
      expect(rows.reduce((s, r) => s + r.runs, 0)).toBe(inn.runs)
      expect(rows.reduce((s, r) => s + r.wickets, 0)).toBe(inn.wickets)
      expect(rows.reduce((s, r) => s + r.balls, 0)).toBe(inn.legalBalls)
    }
  })

  it('lists every over with its bowler, and the matchups add up to the balls faced', () => {
    for (const m of games) for (const inn of m.innings) {
      const lines = overLines(inn)
      expect(lines.reduce((s, o) => s + o.runs, 0)).toBe(inn.runs)
      expect(lines.reduce((s, o) => s + o.wickets, 0)).toBe(inn.wickets)
      const ms = matchups(inn)
      const faced = inn.batters.reduce((s, b) => s + b.balls, 0)
      expect(ms.reduce((s, x) => s + x.balls, 0)).toBe(faced)
      expect(ms.reduce((s, x) => s + x.runs, 0)).toBe(inn.batters.reduce((s, b) => s + b.runs, 0))
      expect(dismissalKinds(inn).reduce((s, k) => s + k.count, 0)).toBe(inn.wickets)
    }
  })

  it('keeps the win-chance estimate sensible', () => {
    // an easy chase is likely, a hopeless one isn't
    const easy = chaseWinChance('t20', 20, { runs: 120, wickets: 8, legalBalls: 120, done: true }, { runs: 90, wickets: 1, legalBalls: 60, target: 121 })
    const hopeless = chaseWinChance('t20', 20, { runs: 220, wickets: 3, legalBalls: 120, done: true }, { runs: 40, wickets: 7, legalBalls: 90, target: 221 })
    expect(easy).toBeGreaterThan(0.9)
    expect(hopeless).toBeLessThan(0.05)
    expect(chaseWinChance('t20', 20, { runs: 220, wickets: 3, legalBalls: 120, done: true }, { runs: 221, wickets: 3, legalBalls: 100, target: 221 })).toBeGreaterThan(0.98)
    for (const m of games.slice(0, 20)) {
      const s = winChanceSeries(m)
      expect(s.length).toBeGreaterThan(10)
      for (const p of s) { expect(p.p).toBeGreaterThan(0); expect(p.p).toBeLessThan(1) }
      // the estimate lands on the right side by the end of the chase
      const last = s[s.length - 1]
      const chaserWon = m.result!.winnerSide === m.innings[1].battingSide
      if (m.result!.winnerSide !== null) expect(last.p > 0.5).toBe(chaserWon)
    }
  })
})
