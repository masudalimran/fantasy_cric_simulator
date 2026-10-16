import { describe, expect, it } from 'vitest'
import { overall } from '../data/builders'
import { XI_SIZE } from '../data/squad'
import { BUILT_IN_TEAMS } from '../data/teams'
import { YOUTH } from '../data/youthPool'
import type { Team } from '../types'
import { isYoung, newBloodSquad, recommendedSquad } from './recommend'

const base = BUILT_IN_TEAMS[0]
const withYouth = (n: number, minOverall: number): Team => {
  const kids = [...YOUTH].filter((y) => y.role !== 'WK').sort((a, b) => overall(b) - overall(a)).filter((y) => overall(y) >= minOverall).slice(0, n)
  return { ...base, players: [...base.players.slice(0, 15), ...kids] }
}

describe('recommended squad and new blood', () => {
  it('the recommended squad is a full XI with a keeper and enough bowlers, strongest first', () => {
    const r = recommendedSquad({ team: base })
    expect(r.players).toHaveLength(base.players.length)
    expect(r.players.slice(0, XI_SIZE).filter((p) => p.role === 'BOWL' || p.role === 'AR').length).toBeGreaterThanOrEqual(5)
    expect(r.keeperId).toBeTruthy()
  })

  it('says no politely when there are no youngsters, or none close enough', () => {
    const none = newBloodSquad({ team: { ...base, players: base.players.filter((p) => !isYoung(p)) } })
    expect(none.ok).toBe(false)
    expect(none.message.length).toBeGreaterThan(10)
    const weak = newBloodSquad({ team: { ...base, players: [...base.players.slice(0, 14), ...YOUTH.filter((y) => y.role !== 'WK').sort((a, b) => overall(a) - overall(b)).slice(0, 3)] } })
    expect(weak.ok).toBe(false)
    expect(weak.players.slice(0, XI_SIZE).map((p) => p.id)).toEqual(recommendedSquad({ team: { ...base, players: [...base.players.slice(0, 14), ...YOUTH.filter((y) => y.role !== 'WK').sort((a, b) => overall(a) - overall(b)).slice(0, 3)] } }).players.slice(0, XI_SIZE).map((p) => p.id))
  })

  it('squeezes in youngsters when they are good enough, without breaking the side', () => {
    const t = withYouth(4, 0)
    const r = newBloodSquad({ team: t })
    expect(r.players).toHaveLength(t.players.length)
    if (r.ok) {
      expect(r.added.length).toBeGreaterThan(0)
      const xi = r.players.slice(0, XI_SIZE)
      expect(r.added.every((p) => xi.some((x) => x.id === p.id))).toBe(true)
      expect(xi.filter((p) => p.role === 'BOWL' || p.role === 'AR').length).toBeGreaterThanOrEqual(5)
    }
  })
})
