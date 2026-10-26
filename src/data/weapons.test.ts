import { describe, expect, it } from 'vitest'
import { BUILT_IN_TEAMS } from './teams'
import { AURAS, WEAPONS, auraOf, weaponOf } from './weapons'

describe('weapons and auras (an experiment, Dragon Ball first)', () => {
  const ids = new Set(BUILT_IN_TEAMS.flatMap((t) => t.players.map((p) => p.id)))
  it('are only given to real players, and every Dragon Ball player glows', () => {
    for (const id of [...Object.keys(WEAPONS), ...Object.keys(AURAS)]) expect(ids.has(id), id).toBe(true)
    const db = BUILT_IN_TEAMS.find((t) => t.id === 'dragonball')!
    for (const p of db.players) expect(auraOf(p.id), p.id).toBeTruthy()
    expect(weaponOf('dragonball-son-goku')?.kind).toBe('staff')
    expect(weaponOf('dragonball-son-gohan')?.kind).toBe('sword')
    expect(weaponOf('dragonball-vegeta')).toBeNull() // no weapon: he keeps the bat and glows
    expect(weaponOf('someone-else')).toBeNull()
  })
  it('have sensible sizes', () => {
    for (const w of Object.values(WEAPONS)) { expect(w.length).toBeGreaterThan(30); expect(w.length).toBeLessThan(60); expect(w.width).toBeGreaterThan(2); expect(w.width).toBeLessThan(10) }
  })
})
