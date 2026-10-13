import { describe, expect, it } from 'vitest'
import { originOf } from './origin'
import { BUILT_IN_TEAMS, LEGACY_TEAMS } from './teams'
import { YOUTH } from './youthPool'
import type { Team } from '../types'

describe('where a player is from', () => {
  it('every built-in player, retired-team player and youth has an origin', () => {
    for (const t of [...BUILT_IN_TEAMS, ...LEGACY_TEAMS]) for (const p of t.players) expect(originOf(p.id)).toMatchObject({ series: t.series, universe: t.universe })
    for (const y of YOUTH) expect(originOf(y.id)).toMatchObject({ series: y.series, universe: 'anime' })
  })

  it('follows the player, not the team he plays for', () => {
    // the id keeps his original team, so a player bought by another team is still from his own series
    const goku = BUILT_IN_TEAMS.find((t) => t.id === 'dragonball')!.players[0]
    expect(originOf(goku.id)?.series).toBe('Dragon Ball')
    const witcher = BUILT_IN_TEAMS.find((t) => t.id === 'witcher')!.players[0]
    expect(originOf(witcher.id)).toEqual({ series: 'The Witcher', universe: 'game' })
  })

  it('knows nothing about players on a team you made', () => {
    const mine: Team = { ...BUILT_IN_TEAMS[0], id: 'custom-x', universe: 'custom', series: 'My Team', players: [{ ...BUILT_IN_TEAMS[0].players[0], id: 'custom-x-hero' }] }
    expect(originOf('custom-x-hero', [mine])).toBeNull()
  })
})
