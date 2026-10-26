import { describe, expect, it } from 'vitest'
import { STAR_MOVES } from './moves'
import { BUILT_IN_TEAMS, LEGACY_TEAMS } from './teams'
import { AURAS, WEAPONS, auraOf, weaponOf } from './weapons'

describe('weapons and auras', () => {
  const all = [...BUILT_IN_TEAMS, ...LEGACY_TEAMS].flatMap((t) => t.players)
  it('every character in every team carries something of his own and glows', () => {
    const missing = all.filter((p) => !weaponOf(p.id)).map((p) => p.id)
    expect(missing).toEqual([])
    for (const p of all) { const a = auraOf(p.id); expect(a, p.id).toBeTruthy(); expect(a!.c1).toMatch(/^#[0-9a-f]{6}$/i) }
    // and everyone has a signature move now, the legacy squads included
    expect(all.filter((p) => !STAR_MOVES[p.id]).map((p) => p.id)).toEqual([])
  })
  it('are only given to real characters', () => {
    const ids = new Set(all.map((p) => p.id))
    for (const id of [...Object.keys(WEAPONS), ...Object.keys(AURAS)]) expect(ids.has(id), id).toBe(true)
    expect(weaponOf('someone-else')).toBeNull()
    expect(auraOf('someone-else')).toBeNull()
  })
  it('have sensible sizes and look different from one another', () => {
    for (const w of Object.values(WEAPONS)) { expect(w.length).toBeGreaterThan(28); expect(w.length).toBeLessThan(60); expect(w.width).toBeGreaterThan(2); expect(w.width).toBeLessThan(10) }
    const kinds = new Set(Object.values(WEAPONS).map((w) => w.kind))
    expect(kinds).toEqual(new Set(['bat', 'staff', 'sword']))
    const heads = new Set(Object.values(WEAPONS).map((w) => w.head?.kind))
    for (const h of ['axe', 'hammer', 'spear', 'orb', 'flame', 'crescent', 'crystal', 'bolt', 'gun']) expect(heads.has(h as never), h).toBe(true)
    expect(weaponOf('dragonball-son-goku')?.kind).toBe('staff')
    expect(weaponOf('bleach-ichigo-kurosaki')?.kind).toBe('sword')
  })
})
