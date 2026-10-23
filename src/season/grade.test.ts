import { describe, expect, it } from 'vitest'
import { gradeBat, gradeBowl } from './grade'

describe('performance grades', () => {
  const opener = { format: 't20' as const, position: 0, role: 'BAT' as const }
  it('batsmen: a duck is poor, a fifty is exceptional, in between by runs and pace', () => {
    expect(gradeBat({ runs: 0, balls: 4, out: true }, opener)).toBe('worse')
    expect(gradeBat({ runs: 3, balls: 8, out: true }, opener)).toBe('worse')
    expect(gradeBat({ runs: 8, balls: 9, out: true }, opener)).toBe('bad')
    expect(gradeBat({ runs: 18, balls: 14, out: true }, opener)).toBe('average')
    expect(gradeBat({ runs: 31, balls: 22, out: true }, opener)).toBe('good')
    expect(gradeBat({ runs: 31, balls: 40, out: true }, opener)).toBe('average') // slow: not good enough
    expect(gradeBat({ runs: 52, balls: 33, out: false }, opener)).toBe('exceptional')
    expect(gradeBat({ runs: 36, balls: 18, out: true }, opener)).toBe('exceptional') // fast and big
  })
  it('a tailender or a bowler is judged more kindly, and a one-day match asks for more runs', () => {
    expect(gradeBat({ runs: 7, balls: 6, out: true }, { ...opener, position: 9, role: 'BOWL' })).toBe('average')
    expect(gradeBat({ runs: 7, balls: 6, out: true }, opener)).toBe('bad')
    expect(gradeBat({ runs: 31, balls: 28, out: true }, { ...opener, format: 'odi' })).toBe('average')
    expect(gradeBat({ runs: 110, balls: 100, out: false }, { ...opener, format: 'odi' })).toBe('exceptional')
  })
  it('bowlers: wickets and economy against the par', () => {
    const c = { format: 't20' as const, par: 8 }
    expect(gradeBowl({ wickets: 0, runs: 48, balls: 24 }, c)).toBe('worse') // 12 an over, no reward
    expect(gradeBowl({ wickets: 0, runs: 40, balls: 24 }, c)).toBe('bad')
    expect(gradeBowl({ wickets: 0, runs: 30, balls: 24 }, c)).toBe('average')
    expect(gradeBowl({ wickets: 2, runs: 30, balls: 24 }, c)).toBe('good')
    expect(gradeBowl({ wickets: 3, runs: 24, balls: 24 }, c)).toBe('exceptional')
    expect(gradeBowl({ wickets: 5, runs: 40, balls: 24 }, c)).toBe('exceptional')
  })
})
