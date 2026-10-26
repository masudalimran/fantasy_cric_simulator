import { describe, expect, it } from 'vitest'
import { STAR_MOVES } from './moves'
import { BUILT_IN_TEAMS, LEGACY_TEAMS } from './teams'
import { AURAS, WEAPONS, auraOf, glowingIds, weaponOf } from './weapons'

describe('weapons and auras', () => {
  const all = [...BUILT_IN_TEAMS, ...LEGACY_TEAMS].flatMap((t) => t.players)
  it('every character in every team carries something of his own, and only those who glow in their series have an aura', () => {
    const missing = all.filter((p) => !weaponOf(p.id)).map((p) => p.id)
    expect(missing).toEqual([])
    const glowing = all.filter((p) => auraOf(p.id))
    for (const p of glowing) expect(auraOf(p.id)!.c1, p.id).toMatch(/^#[0-9a-f]{6}$/i)
    expect(glowing.length).toBeGreaterThan(80)
    expect(glowing.length).toBeLessThan(all.length * 0.5) // a minority, not everybody
    for (const id of glowingIds()) expect(all.some((p) => p.id === id), id).toBe(true)
    // the ones with no power to show do not glow
    for (const id of ['assassinscreed-ezio-auditore', 'poe-the-duelist', 'jjk-kento-nanami', 'bleach-kon']) expect(auraOf(id), id).toBeNull()
    for (const id of ['dragonball-vegeta', 'jjk-satoru-gojo', 'jojo-jotaro-kujo']) expect(auraOf(id), id).toBeTruthy()
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
