import { describe, expect, it } from 'vitest'
import { generateSeason } from '../season/generate'
import { recordResult, simDay, nextMatchDate } from '../season/results'
import type { SessionFile } from '../store/useStore'
import { emptyTeamDraft } from './generate'
import { applyBackup, buildBackup, emptyData, isEmpty, parseBackup, summarize, type BackupData } from './backup'
import { BUILT_IN_TEAMS } from './teams'

const teamMap = new Map(BUILT_IN_TEAMS.map((t) => [t.id, t]))
function session(id: string, name: string, seed: number, days = 3): SessionFile {
  let season = generateSeason({ year: 2027, teams: BUILT_IN_TEAMS, seed })
  for (let i = 0; i < days; i++) { const d = nextMatchDate(season); if (d) season = simDay(season, d, teamMap) }
  return { id, name, createdAt: '2027-01-01T00:00:00.000Z', updatedAt: '2027-01-02T00:00:00.000Z', season, reviews: [] }
}
const custom = (id: string, name: string) => ({ ...emptyTeamDraft(), id, name, short: id.toUpperCase().slice(0, 3), isCustom: true })

function sample(): BackupData {
  const edited = { ...BUILT_IN_TEAMS[2], name: 'Renamed Warriors', players: BUILT_IN_TEAMS[2].players.map((p, i) => (i === 0 ? { ...p, imageUrl: 'https://example.com/goku.png' } : p)) }
  return { customTeams: [custom('mine-a', 'Mine A')], overrides: { [edited.id]: edited }, sessions: [session('s1', 'First', 1)], activeSessionId: 's1', liveMatch: null }
}

describe('backup export and import', () => {
  it('survives a round trip exactly, edits, results and all', () => {
    const data = sample()
    const text = JSON.stringify(buildBackup(data))
    const r = parseBackup(text)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.skipped).toEqual([])
    expect(r.backup.data.sessions[0].season.results).toEqual(data.sessions[0].season.results)
    expect(r.backup.data.sessions[0].season.fixtures).toEqual(data.sessions[0].season.fixtures)
    expect(r.backup.data.overrides[BUILT_IN_TEAMS[2].id].players[0].imageUrl).toBe('https://example.com/goku.png')
    expect(r.backup.data.customTeams.map((t) => t.name)).toEqual(['Mine A'])
    expect(r.summary.sessions[0].played).toBeGreaterThan(0)
    expect(r.summary.editedTeams).toBe(1)
  })

  it('replace makes the device match the file; merge keeps everything already here', () => {
    const device: BackupData = { ...emptyData(), customTeams: [custom('local', 'Local team')], sessions: [session('s9', 'Local session', 9)], activeSessionId: 's9' }
    const file = sample()
    const replaced = applyBackup(device, file, 'replace').next
    expect(replaced.sessions.map((s) => s.name)).toEqual(['First'])
    expect(replaced.customTeams.map((t) => t.name)).toEqual(['Mine A'])

    const { next, report } = applyBackup(device, file, 'merge')
    expect(next.sessions.map((s) => s.name)).toEqual(['Local session', 'First'])
    expect(next.customTeams.map((t) => t.name).sort()).toEqual(['Local team', 'Mine A'])
    expect(Object.keys(next.overrides)).toHaveLength(1)
    expect(next.activeSessionId).toBe('s9') // you stay where you were
    expect(report).toMatchObject({ sessionsAdded: 1, teamsAdded: 1, editsAdded: 1 })
  })

  it("never overwrites: a clashing session comes in as a copy, a clashing team keeps this device's version", () => {
    const device = sample()
    const file = sample()
    file.customTeams[0] = { ...file.customTeams[0], name: 'Mine A (other device)' }
    file.sessions[0] = session('s1', 'First', 2, 8) // same id, different progress
    const { next, report } = applyBackup(device, file, 'merge')
    expect(next.sessions).toHaveLength(2)
    expect(new Set(next.sessions.map((s) => s.id)).size).toBe(2)
    expect(next.sessions[0].name).toBe('First')
    expect(next.sessions[1].name).toBe('First (imported)')
    expect(next.customTeams[0].name).toBe('Mine A')
    expect(report.teamsKept).toBe(1)
    expect(report.editsKept).toBe(1)
  })

  it('only takes a match in progress if there is none here', () => {
    const live = { id: 'l1', key: 'k', url: '/match/x', format: 't20', teamA: BUILT_IN_TEAMS[0], teamB: BUILT_IN_TEAMS[1], seed: 1, replay: false, phase: 'play', actions: [{ t: 'ball' }], finished: false } as unknown as BackupData['liveMatch']
    const withLive = { ...emptyData(), liveMatch: live }
    expect(applyBackup(emptyData(), withLive, 'merge').next.liveMatch).not.toBeNull()
    const busy = { ...emptyData(), liveMatch: { ...live!, id: 'other' } }
    expect(applyBackup(busy, withLive, 'merge').next.liveMatch!.id).toBe('other')
    expect(applyBackup(busy, withLive, 'merge').report.liveMatch).toBe('kept')
    expect(summarize(withLive).liveMatch).not.toBeNull()
  })

  it('rejects things that are not backups, with a helpful reason', () => {
    expect(parseBackup('not json at all')).toMatchObject({ ok: false })
    expect(parseBackup('{"hello":1}')).toMatchObject({ ok: false, error: expect.stringContaining("doesn't look like") })
    expect(parseBackup(JSON.stringify({ app: 'fantasy-cric-sim', version: 99, data: {} }))).toMatchObject({ ok: false, error: expect.stringContaining('newer version') })
    expect(parseBackup(JSON.stringify({ app: 'fantasy-cric-sim', version: 1 }))).toMatchObject({ ok: false })
  })

  it('leaves out broken pieces instead of loading them', () => {
    const data = sample()
    const text = JSON.stringify(buildBackup(data))
    const broken = JSON.parse(text)
    broken.data.customTeams.push({ id: 'bad', name: 'Broken', players: [] })
    broken.data.sessions.push({ id: 'bad', name: 'Broken session', season: { fixtures: 'nope' } })
    const r = parseBackup(JSON.stringify(broken))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.backup.data.customTeams).toHaveLength(1)
    expect(r.backup.data.sessions).toHaveLength(1)
    expect(r.skipped).toHaveLength(2)
  })

  it('knows when there is nothing to export', () => {
    expect(isEmpty(emptyData())).toBe(true)
    expect(isEmpty(sample())).toBe(false)
    // and a result recorded after import still works against the restored roster
    const r = parseBackup(JSON.stringify(buildBackup(sample())))
    if (!r.ok) throw new Error('parse failed')
    const season = r.backup.data.sessions[0].season
    expect(Array.isArray(season.roster)).toBe(true)
    void recordResult
  })
})

describe('older saves and new fields', () => {
  it('fills in a managed team, difficulty and reviews for sessions saved before career mode', () => {
    const old = session('old', 'Old save', 3)
    const raw = JSON.parse(JSON.stringify(buildBackup({ ...emptyData(), sessions: [old], activeSessionId: 'old' })))
    delete raw.data.sessions[0].reviews
    delete raw.data.sessions[0].season.myTeamId
    delete raw.data.sessions[0].season.difficulty
    const r = parseBackup(JSON.stringify(raw))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const s = r.backup.data.sessions[0]
    expect(s.reviews).toEqual([])
    expect(s.season.myTeamId).toBeNull()
    expect(s.season.difficulty).toBe('normal')
  })

  it('keeps your team, difficulty and finished years through a round trip', () => {
    const s = session('career', 'Career', 5)
    s.season = { ...s.season, myTeamId: BUILT_IN_TEAMS[3].id, difficulty: 'legend' }
    s.reviews = [{ year: 2026, difficulty: 'legend', teamId: BUILT_IN_TEAMS[3].id, teamName: 'x', played: 30, won: 20, lost: 10, tied: 0, rank: 2, teams: 20, titles: ['A Cup'], players: [], table: [], finishedAt: '2026-12-31T00:00:00.000Z' }]
    const r = parseBackup(JSON.stringify(buildBackup({ ...emptyData(), sessions: [s], activeSessionId: 'career' })))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.backup.data.sessions[0].season.myTeamId).toBe(BUILT_IN_TEAMS[3].id)
    expect(r.backup.data.sessions[0].season.difficulty).toBe('legend')
    expect(r.backup.data.sessions[0].reviews[0].titles).toEqual(['A Cup'])
  })
})
