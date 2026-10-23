import { describe, expect, it } from 'vitest'
import { BUILT_IN_TEAMS } from '../data/teams'
import { Match } from './match'
import { pitchLean, tossAdvice } from './pitchInfo'

const mk = (seed: number, extra: object = {}) => new Match({ teamA: BUILT_IN_TEAMS[2], teamB: BUILT_IN_TEAMS[9], format: 't20', seed, ...extra })

describe('the pitch decides the toss call', () => {
  it('has a lean between -1 and 1 and advice that matches it', () => {
    for (let s = 1; s <= 200; s++) {
      const p = mk(s).pitch
      const l = pitchLean(p)
      expect(Math.abs(l)).toBeLessThanOrEqual(1)
      const a = tossAdvice(p)
      if (l > 0.2) expect(a.choice).toBe('bat')
      else if (l < -0.2) expect(a.choice).toBe('bowl')
      else expect(a.choice).toBeNull()
    }
  })

  it('the computer, winning the toss on a pitch with a clear edge, usually makes the smart call', () => {
    let clear = 0, smart = 0
    for (let s = 1; s <= 400; s++) {
      const m = mk(s)
      const l = pitchLean(m.pitch)
      if (Math.abs(l) < 0.25) continue
      clear++
      if (m.toss.decision === (l > 0 ? 'bat' : 'bowl')) smart++
    }
    expect(clear).toBeGreaterThan(100)
    expect(smart / clear).toBeGreaterThan(0.85)
  })

  it('the right call is worth a real edge: batting first wins more on a bat-first pitch and less on a bowl-first one', () => {
    let batPlus = 0, batPlusWins = 0, bowlPlus = 0, bowlPlusWins = 0
    for (let s = 1; s <= 900 && (batPlus < 120 || bowlPlus < 120); s++) {
      const probe = mk(s)
      const l = pitchLean(probe.pitch)
      if (Math.abs(l) < 0.5) continue
      const m = mk(s, { toss: { winnerSide: 0, decision: 'bat' } })
      m.playMatch()
      const win = m.result?.winnerSide === 0
      if (l > 0 && batPlus < 120) { batPlus++; if (win) batPlusWins++ }
      if (l < 0 && bowlPlus < 120) { bowlPlus++; if (win) bowlPlusWins++ }
    }
    expect(batPlusWins / batPlus).toBeGreaterThan(bowlPlusWins / bowlPlus + 0.2)
  })
})
