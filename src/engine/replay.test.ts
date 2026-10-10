import { describe, expect, it } from 'vitest'
import { BUILT_IN_TEAMS } from '../data/teams'
import { Match } from './match'
import { appendAction, applyAction, type Action } from './replay'

const [A, B] = [BUILT_IN_TEAMS[3], BUILT_IN_TEAMS[11]]
const fresh = (seed: number) => new Match({ teamA: A, teamB: B, format: 't20', seed })

describe('match replay', () => {
  it('rebuilds a match exactly from its actions, including tactics and bowler changes', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const live = fresh(seed)
      let log: Action[] = []
      const act = (a: Action) => { applyAction(live, a); log = appendAction(log, a) }

      act({ t: 'ball' }); act({ t: 'ball' }); act({ t: 'ball' })
      act({ t: 'intent', side: live.current.battingSide, v: 'attack' })
      act({ t: 'over' })
      const options = live.bowlerOptions((1 - live.current.battingSide) as 0 | 1)
      act({ t: 'bowler', side: (1 - live.current.battingSide) as 0 | 1, id: options[options.length - 1].id })
      act({ t: 'overs', n: 3 })
      act({ t: 'wicket' })
      act({ t: 'ball' }); act({ t: 'ball' })
      if (seed % 3 === 0) act({ t: 'forfeit', side: 0 })

      const copy = fresh(seed)
      for (const a of log) applyAction(copy, a)

      expect(copy.events.map((e) => [e.seq, e.total, e.bowlerId, e.strikerId, !!e.wicket])).toEqual(live.events.map((e) => [e.seq, e.total, e.bowlerId, e.strikerId, !!e.wicket]))
      expect(copy.current.runs).toBe(live.current.runs)
      expect(copy.result?.text).toBe(live.result?.text)
      expect(copy.toss).toEqual(live.toss)
    }
  })

  it('folds consecutive single balls into one entry', () => {
    let log: Action[] = []
    for (let i = 0; i < 120; i++) log = appendAction(log, { t: 'ball' })
    log = appendAction(log, { t: 'over' })
    log = appendAction(log, { t: 'ball' })
    expect(log).toEqual([{ t: 'ball', n: 120 }, { t: 'over' }, { t: 'ball' }])
    const m = fresh(2)
    const events = applyAction(m, log[0])
    expect(events.length).toBeGreaterThan(0)
    expect(events.length).toBeLessThanOrEqual(120)
  })
})
