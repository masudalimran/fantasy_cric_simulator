import { describe, expect, it } from 'vitest'
import { BUILT_IN_TEAMS } from './teams'
import { autoPickXI, missingPicks, swapPlayers, validateSquad } from './squad'

describe('squad helpers', () => {
  it('swaps two players and leaves everything else alone', () => {
    const t = BUILT_IN_TEAMS[0].players
    const out = swapPlayers(t, 1, 12)
    expect(out[1]).toBe(t[12])
    expect(out[12]).toBe(t[1])
    expect(out.filter((p, i) => p !== t[i])).toHaveLength(2)
    expect(swapPlayers(t, 3, 3)).toBe(t)
  })

  it('accepts every default squad and flags a missing keeper or too few bowlers', () => {
    for (const t of BUILT_IN_TEAMS) expect(validateSquad(t.players, t.captainId).errors).toEqual([])
    const t = BUILT_IN_TEAMS[0]
    const keeperIdx = t.players.findIndex((p) => p.role === 'WK')
    const noKeeper = swapPlayers(t.players, keeperIdx, 15)
    expect(validateSquad(noKeeper).warnings.join(' ')).toMatch(/wicketkeeper/)
    // picking anybody in the XI as keeper clears it
    expect(validateSquad(noKeeper, undefined, noKeeper[2].id).warnings.join(' ')).not.toMatch(/wicketkeeper/)
    expect(missingPicks(noKeeper, t.captainId, undefined).keeper).toBe(true)
    expect(missingPicks(noKeeper, t.captainId, noKeeper[2].id).keeper).toBe(false)
    // strip bowling from the XI until only 3 bowling options remain
    let left = 3
    const fewBowlers = t.players.map((p, i) => (i < 11 && p.bowling && left-- <= 0 ? { ...p, bowling: null } : p))
    expect(validateSquad(fewBowlers).errors.join(' ')).toMatch(/bowling options/)
  })

  it('auto-picks a valid XI for every team without losing anyone', () => {
    for (const t of BUILT_IN_TEAMS) {
      const picked = autoPickXI(t.players)
      expect(picked).toHaveLength(t.players.length)
      expect(new Set(picked.map((p) => p.id))).toEqual(new Set(t.players.map((p) => p.id)))
      expect(validateSquad(picked).errors).toEqual([])
    }
  })
})
