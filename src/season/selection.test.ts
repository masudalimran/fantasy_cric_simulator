import { describe, expect, it } from 'vitest'
import { BUILT_IN_TEAMS } from '../data/teams'
import { validateSquad } from '../data/squad'
import { generateSeason } from './generate'
import { nextMatchDate, simDay } from './results'
import { formTable, isInjured, pickCpuXI } from './selection'

const teams = new Map(BUILT_IN_TEAMS.map((t) => [t.id, t]))
const season = generateSeason({ year: 2027, teams: BUILT_IN_TEAMS, seed: 21, myTeamId: BUILT_IN_TEAMS[0].id })

describe('computer squad selection', () => {
  it('injuries are repeatable and fairly rare', () => {
    const p = BUILT_IN_TEAMS[3].players[2].id
    expect(isInjured(season, p, '2027-03-04')).toBe(isInjured(season, p, '2027-03-04'))
    let out = 0, n = 0
    for (const t of BUILT_IN_TEAMS) for (const pl of t.players) for (const d of ['2027-02-01', '2027-04-15', '2027-07-09', '2027-10-20']) { n++; if (isInjured(season, pl.id, d)) out++ }
    expect(out / n).toBeGreaterThan(0.02)
    expect(out / n).toBeLessThan(0.09)
  })

  it('always names a legal XI with a keeper and five bowlers', () => {
    let s = season
    for (let g = 0; g < 200; g++) { const d = nextMatchDate(s); if (!d) break; s = simDay(s, d, teams) }
    const form = formTable(s, teams)
    for (const t of BUILT_IN_TEAMS.slice(1)) {
      for (const date of ['2027-02-02', '2027-06-17', '2027-11-03']) {
        const { team } = pickCpuXI(t, s, { date }, form)
        expect(team.players).toHaveLength(t.players.length)
        expect(validateSquad(team.players, team.captainId, team.keeperId).errors).toEqual([])
        expect(validateSquad(team.players, team.captainId, team.keeperId).warnings.join(' ')).not.toMatch(/wicketkeeper/)
      }
    }
  })

  it('drops an injured player and replaces him', () => {
    const form = formTable(season, teams)
    let seen = false
    for (const t of BUILT_IN_TEAMS) for (const date of ['2027-01-10', '2027-03-22', '2027-05-30', '2027-08-12']) {
      const hurt = t.players.slice(0, 11).filter((p) => isInjured(season, p.id, date))
      if (!hurt.length) continue
      const { team, news } = pickCpuXI(t, season, { date }, form)
      for (const h of hurt) expect(team.players.slice(0, 11).some((p) => p.id === h.id)).toBe(false)
      expect(news.join(' ')).toMatch(/injured/)
      seen = true
    }
    expect(seen).toBe(true)
  })

  it('benches a player in awful form and recalls one in good form', () => {
    const t = BUILT_IN_TEAMS[5]
    const xi = t.players.slice(0, 11)
    const bad = xi.find((p) => p.role === 'BAT' && p !== xi[0])!
    const bench = t.players[12]
    const date = '2027-05-05'
    // fake a form table: everyone average, bad batsman terrible, the bench player red hot
    const recent = new Map<string, number>()
    const base = formTable(generateSeason({ year: 2027, teams: BUILT_IN_TEAMS, seed: 1 }), teams)
    const form = { recent, norm: { bat: { mean: 30, sd: 10 }, bowl: { mean: 20, sd: 10 } } }
    for (const p of t.players) recent.set(p.id, p.role === 'BOWL' ? 20 : 30)
    recent.set(bad.id, 0)
    recent.set(bench.id, 80)
    void base
    const none = pickCpuXI(t, season, { date }, { ...form, recent: new Map() })
    const { team, news } = pickCpuXI(t, season, { date }, form)
    const names = (x: typeof team) => x.players.slice(0, 11).map((p) => p.id)
    expect(names(team)).toContain(bench.id)
    expect(names(none.team).length).toBe(11)
    expect(news.join(' ')).toMatch(/comes in/)
  })
})
