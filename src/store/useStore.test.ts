import { beforeEach, describe, expect, it } from 'vitest'
import { emptyTeamDraft } from '../data/generate'
import { BUILT_IN_TEAMS } from '../data/teams'
import { resolveTeams, useStore } from './useStore'

beforeEach(() => useStore.setState({ customTeams: [], overrides: {} }))

describe('team store', () => {
  it('applies edits to a built-in team on top of the default, and resets them', () => {
    const base = BUILT_IN_TEAMS[0]
    const edited = { ...base, name: 'Renamed', players: base.players.map((p, i) => (i === 0 ? { ...p, imageUrl: 'https://example.com/a.png' } : p)) }
    useStore.getState().saveTeam(edited)

    const resolved = resolveTeams(useStore.getState().customTeams, useStore.getState().overrides)
    expect(resolved[0].name).toBe('Renamed')
    expect(resolved[0].players[0].imageUrl).toBe('https://example.com/a.png')
    expect(resolved).toHaveLength(20)
    expect(BUILT_IN_TEAMS[0].name).not.toBe('Renamed') // defaults are untouched

    useStore.getState().resetTeam(base.id)
    expect(resolveTeams([], useStore.getState().overrides)[0]).toBe(base)
  })

  it('creates, updates and deletes custom teams', () => {
    const t = { ...emptyTeamDraft(), name: 'Mine', short: 'MIN' }
    useStore.getState().saveTeam(t)
    useStore.getState().saveTeam({ ...t, name: 'Mine v2' })
    expect(useStore.getState().customTeams).toHaveLength(1)
    expect(useStore.getState().customTeams[0].name).toBe('Mine v2')
    useStore.getState().deleteCustomTeam(t.id)
    expect(useStore.getState().customTeams).toHaveLength(0)
  })
})
