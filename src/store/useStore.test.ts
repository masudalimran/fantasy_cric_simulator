import { beforeEach, describe, expect, it } from 'vitest'
import { emptyTeamDraft } from '../data/generate'
import { BUILT_IN_TEAMS } from '../data/teams'
import { generateSeason } from '../season/generate'
import { buildBackup, parseBackup } from '../data/backup'
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

describe('looking back at finished years', () => {
  it('keeps every finished season in the career, and in a backup', () => {
    const st = useStore.getState()
    const first = generateSeason({ year: 2026, teams: BUILT_IN_TEAMS, seed: 1, myTeamId: BUILT_IN_TEAMS[0].id })
    const id = st.createSession({ name: 'Test', year: 2026, teams: BUILT_IN_TEAMS, seed: 1, myTeamId: BUILT_IN_TEAMS[0].id, difficulty: 'normal' })
    const second = generateSeason({ year: 2027, teams: BUILT_IN_TEAMS, seed: 2, myTeamId: BUILT_IN_TEAMS[0].id })
    useStore.getState().startNextSeason({ year: 2026 } as never, second)
    const session = useStore.getState().sessions.find((x) => x.id === id)!
    expect(session.season.year).toBe(2027)
    expect(session.history?.map((h) => h.year)).toEqual([2026])
    expect(session.history?.[0].fixtures.length).toBe(first.fixtures.length)

    const text = JSON.stringify(buildBackup({ customTeams: [], overrides: {}, sessions: [session], activeSessionId: id, liveMatch: null }))
    const parsed = parseBackup(text)
    expect(parsed.ok).toBe(true)
    if (parsed.ok) expect(parsed.backup.data.sessions[0].history?.map((h) => h.year)).toEqual([2026])
  })
})
