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

describe('the toss', () => {
  it('remembers that the coin has been flipped', () => {
    const t = BUILT_IN_TEAMS
    useStore.getState().startLive({ format: 't20', teamA: t[0], teamB: t[1], seed: 5, url: '/match/x' })
    expect(useStore.getState().liveMatch?.tossed).toBeFalsy()
    useStore.getState().setTossed()
    expect(useStore.getState().liveMatch?.tossed).toBe(true)
    useStore.getState().discardLive()
  })
})

describe('changing a squad before the toss', () => {
  it('reorders the XI and sets captain and keeper, but only before the coin is flipped', () => {
    const t = BUILT_IN_TEAMS
    useStore.getState().startLive({ format: 't20', teamA: t[0], teamB: t[1], seed: 9, url: '/match/x' })
    const order = [...t[0].players].reverse().map((p) => p.id)
    useStore.getState().setLiveSquad(0, order, order[2], order[3])
    const live = useStore.getState().liveMatch!
    expect(live.teamA.players.map((p) => p.id)).toEqual(order)
    expect(live.teamA.captainId).toBe(order[2])
    expect(live.teamA.keeperId).toBe(order[3])
    expect(live.teamB.players[0].id).toBe(t[1].players[0].id) // the other side is untouched
    expect(live.squadVersion).toBe(1)
    useStore.getState().setTossed()
    useStore.getState().setLiveSquad(0, t[0].players.map((p) => p.id), t[0].captainId, undefined)
    expect(useStore.getState().liveMatch!.teamA.players.map((p) => p.id)).toEqual(order) // too late: unchanged
    useStore.getState().discardLive()
  })
})
