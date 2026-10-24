import { describe, expect, it } from 'vitest'
import { BUILT_IN_TEAMS } from '../data/teams'
import { inningsBefore, matchBefore } from './asOf'
import { Match } from './match'

/** The parts of an innings a scoreboard and a scorecard read. */
const shape = (i: ReturnType<typeof inningsBefore>) => ({
  runs: i.runs, wickets: i.wickets, legalBalls: i.legalBalls, extras: { ...i.extras },
  batters: i.batters.map((b) => ({ ...b })), strikerId: i.strikerId, nonStrikerId: i.nonStrikerId,
  bowlers: [...i.bowlers.values()].map((b) => ({ ...b })).sort((a, b) => a.id.localeCompare(b.id)),
  fow: i.fow.map((f) => ({ ...f })), logLength: i.log.length,
})

describe('the match as it was before a ball', () => {
  it('is exactly what the engine had before that ball, ball after ball, in every format', () => {
    for (const [format, seed] of [['t20', 3], ['t20', 8], ['odi', 5]] as const) {
      const m = new Match({ teamA: BUILT_IN_TEAMS[2], teamB: BUILT_IN_TEAMS[9], format, seed })
      const snaps: { seq: number; inn: number; shape: ReturnType<typeof shape> }[] = []
      let guard = 0
      while (!m.isOver && guard++ < 700) {
        const before = m.current
        const hadInnings = m.innings.length
        // the state the engine is in right before the next ball is bowled
        const pre = shape(before)
        const ev = m.playBall()
        if (!ev) break
        if (m.innings.length === hadInnings) snaps.push({ seq: ev.seq, inn: before.index, shape: pre })
        else snaps.push({ seq: ev.seq, inn: before.index, shape: pre })
      }
      for (const s of snaps) {
        const got = shape(inningsBefore(m.innings[s.inn], s.seq))
        expect(got.runs, `${format} ${seed} ball ${s.seq}`).toBe(s.shape.runs)
        expect(got.wickets).toBe(s.shape.wickets)
        expect(got.legalBalls).toBe(s.shape.legalBalls)
        expect(got.extras).toEqual(s.shape.extras)
        expect(got.batters.map((b) => [b.id, b.runs, b.balls, b.fours, b.sixes, b.dismissal?.kind ?? null])).toEqual(s.shape.batters.map((b) => [b.id, b.runs, b.balls, b.fours, b.sixes, b.dismissal?.kind ?? null]))
        expect(got.strikerId).toBe(s.shape.strikerId)
        expect(got.nonStrikerId).toBe(s.shape.nonStrikerId)
        expect(got.bowlers.map((b) => [b.id, b.legalBalls, b.runs, b.wickets, b.maidens])).toEqual(s.shape.bowlers.map((b) => [b.id, b.legalBalls, b.runs, b.wickets, b.maidens]))
        expect(got.fow.map((f) => [f.playerId, f.runs, f.wickets])).toEqual(s.shape.fow.map((f) => [f.playerId, f.runs, f.wickets]))
        expect(got.logLength).toBe(s.shape.logLength)
      }
      expect(snaps.length).toBeGreaterThan(100)
    }
  })

  it('hides the result, the later innings and the unplayed ball while it plays', () => {
    const m = new Match({ teamA: BUILT_IN_TEAMS[2], teamB: BUILT_IN_TEAMS[9], format: 't20', seed: 4 })
    m.playMatch()
    const last = m.events[m.events.length - 1]
    const v = matchBefore(m, last.seq)
    expect(m.isOver).toBe(true)
    expect(v.isOver).toBe(false)
    expect(v.result).toBeNull()
    expect(v.events).toHaveLength(m.events.length - 1)
    expect(v.current.runs + (last.total)).toBe(m.current.runs)
    // a ball in the first innings hides the whole chase
    const first = m.innings[0].log[10]
    const early = matchBefore(m, first.seq)
    expect(early.innings).toHaveLength(1)
    expect(early.current.log).toHaveLength(10)
    expect(early.player(first.strikerId).name).toBe(m.player(first.strikerId).name)
    // asking for a ball that has not been played gives the match itself
    expect(matchBefore(m, 99999)).toBe(m)
  })
})
