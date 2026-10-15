import { describe, expect, it } from 'vitest'
import { BUILT_IN_TEAMS } from '../data/teams'
import { Match } from './match'
import { describePitch } from './pitchInfo'

describe('pitch words', () => {
  it('pick the strongest trait, or call it balanced', () => {
    expect(describePitch({ ease: 0, pace: 0, spin: 0 }).kind).toBe('balanced')
    expect(describePitch({ ease: 0.4, pace: 0, spin: 0 }).kind).toBe('flat')
    expect(describePitch({ ease: -0.4, pace: 0.1, spin: 0 }).kind).toBe('slow')
    expect(describePitch({ ease: 0, pace: 0.6, spin: 0.1 }).kind).toBe('green')
    expect(describePitch({ ease: 0, pace: 0.1, spin: 0.7 }).kind).toBe('dry')
    expect(describePitch({ ease: 0, pace: 0, spin: -0.7 }).kind).toBe('true')
  })
  it('a match always has one, and the same seed gives the same pitch', () => {
    const [a, b] = BUILT_IN_TEAMS
    const kinds = new Set<string>()
    for (let seed = 1; seed <= 60; seed++) {
      const x = describePitch(new Match({ teamA: a, teamB: b, format: 't20', seed }).pitch)
      expect(x).toEqual(describePitch(new Match({ teamA: a, teamB: b, format: 't20', seed }).pitch))
      kinds.add(x.kind)
    }
    expect(kinds.size).toBeGreaterThanOrEqual(4) // a good mix, not all one kind
  })
})
