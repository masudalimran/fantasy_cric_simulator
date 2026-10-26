import { describe, expect, it } from 'vitest'
import { callName } from '../components/match/format'
import { CALL_NAMES } from './callNames'
import { BUILT_IN_TEAMS, LEGACY_TEAMS } from './teams'

describe('call names', () => {
  const all = [...BUILT_IN_TEAMS, ...LEGACY_TEAMS].flatMap((t) => t.players)
  it('belong to real characters and are never empty', () => {
    const ids = new Set(all.map((p) => p.id))
    for (const [id, name] of Object.entries(CALL_NAMES)) { expect(ids.has(id), id).toBe(true); expect(name.length, id).toBeGreaterThan(1) }
  })
  it('turn a family name or a title into the name people use, and leave the rest as the first name', () => {
    const by = (id: string) => all.find((p) => p.id === id)!
    expect(callName(by('dragonball-son-goku'))).toBe('Goku')
    expect(callName(by('fma-roy-mustang'))).toBe('Mustang')
    expect(callName(by('onepiece-edward-newgate'))).toBe('Whitebeard')
    expect(callName(by('halo-master-chief'))).toBe('Chief')
    expect(callName(by('bleach-ichigo-kurosaki'))).toBe('Ichigo')
    expect(callName({ id: 'a-youth-player', name: 'Some Youth' })).toBe('Some')
  })
  it('leave no character called by a bare title or a family-name prefix', () => {
    const bad = new Set(['Son', 'The', 'Master', 'Commander', 'Sergeant', 'Princess', 'King', 'Android', 'Iron', 'Phantom', 'Storm', 'Crystal', 'Noble'])
    const left = all.filter((p) => bad.has(callName(p)) && !(p.name === 'King' || p.id === 'sds-king')).map((p) => `${p.id} -> ${callName(p)}`)
    expect(left).toEqual([])
  })
})
