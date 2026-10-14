import { describe, expect, it } from 'vitest'
import { overall } from '../data/builders'
import { BUILT_IN_TEAMS } from '../data/teams'
import { validateSquad } from '../data/squad'
import { generateSeason } from './generate'
import { nextMatchDate, simDay } from './results'
import { shieldFor } from './injuries'
import { formTable, isInjured, pickCpuXI } from './selection'

const teams = new Map(BUILT_IN_TEAMS.map((t) => [t.id, t]))
const strengthTop = (t: (typeof BUILT_IN_TEAMS)[number]) => [...t.players].map(overall).sort((a, b) => b - a).slice(0, 11).reduce((s, x) => s + x, 0) / 11
const season = generateSeason({ year: 2027, teams: BUILT_IN_TEAMS, seed: 21, myTeamId: BUILT_IN_TEAMS[0].id })

describe('computer squad selection', () => {
  it('injuries are repeatable and fairly rare', () => {
    const p = BUILT_IN_TEAMS[3].players[2].id
    expect(isInjured(season, p, '2027-03-04')).toBe(isInjured(season, p, '2027-03-04'))
    let out = 0, n = 0
    for (const t of BUILT_IN_TEAMS) for (const pl of t.players) for (const d of ['2027-02-01', '2027-04-15', '2027-07-09', '2027-10-20']) { n++; if (isInjured(season, pl.id, d)) out++ }
    expect(out / n).toBeGreaterThan(0.008)
    expect(out / n).toBeLessThan(0.04)
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

  it('rests regulars in friendlies and gives the reserves a chance, but plays the best side in knockouts', () => {
    const form = formTable(season, teams)
    let restedSeries = 0, restedKnockout = 0, chances = 0
    for (const t of BUILT_IN_TEAMS.slice(1)) {
      for (let d = 1; d <= 28; d++) {
        const date = `2027-03-${String(d).padStart(2, '0')}`
        const series = pickCpuXI(t, season, { date, phase: 'series', competitionId: 'x' }, form)
        const ko = pickCpuXI(t, season, { date, phase: 'knockout', competitionId: 'x' }, form)
        restedSeries += series.news.filter((n) => n.why === 'rested').length
        chances += series.news.filter((n) => n.why === 'given a chance').length
        restedKnockout += ko.news.filter((n) => n.why === 'rested').length
        expect(validateSquad(series.team.players, series.team.captainId, series.team.keeperId).errors).toEqual([])
      }
    }
    expect(restedSeries).toBeGreaterThan(20)
    expect(chances).toBeGreaterThan(20)
    expect(restedKnockout).toBe(0)
  })

  it('rests more players against a much weaker side than against an equal one, but never in a knockout', () => {
    const form = formTable(season, teams)
    const strong = BUILT_IN_TEAMS.reduce((a, b) => (strengthTop(a) >= strengthTop(b) ? a : b))
    const weak = BUILT_IN_TEAMS.reduce((a, b) => (strengthTop(a) <= strengthTop(b) ? a : b))
    const even = BUILT_IN_TEAMS.find((t) => t.id !== strong.id && Math.abs(strengthTop(t) - strengthTop(strong)) < 3) ?? BUILT_IN_TEAMS[1]
    const count = (opp: typeof weak, phase: 'league' | 'knockout') => {
      let n = 0
      for (let d = 1; d <= 28; d++) n += pickCpuXI(strong, season, { date: `2027-04-${String(d).padStart(2, '0')}`, phase, competitionId: 'x', opponent: opp }, form).news.filter((x) => x.why === 'rested').length
      return n
    }
    expect(strengthTop(strong) - strengthTop(weak)).toBeGreaterThan(8)
    expect(count(weak, 'league')).toBeGreaterThan(count(even, 'league'))
    expect(count(weak, 'knockout')).toBe(0)
  })

  it('a reserve with a standout game is picked ahead of where his rating puts him', () => {
    const t = BUILT_IN_TEAMS[5]
    const reserve = [...t.players].sort((a, b) => overall(b) - overall(a)).slice(11).filter((p) => p.role !== 'WK').reverse()[0]
    const date = '2027-05-05'
    const base = formTable(season, teams)
    const plain = pickCpuXI(t, season, { date, phase: 'knockout' }, base)
    const star = pickCpuXI(t, season, { date, phase: 'knockout' }, { ...base, breakout: new Map([[reserve.id, 3]]) })
    expect(plain.team.players.slice(0, 11).some((p) => p.id === reserve.id)).toBe(false)
    expect(overall(reserve)).toBeLessThan(overall(t.players[10]))
    // a great game is worth up to ten points: enough for a close reserve, not for one far behind
    const gap = Math.min(...t.players.slice(0, 11).map((p) => overall(p))) - overall(reserve)
    expect(star.team.players.slice(0, 11).some((p) => p.id === reserve.id)).toBe(gap <= 9)
  })

  it('drops an injured player and replaces him', () => {
    const form = formTable(season, teams)
    let seen = false
    for (const t of BUILT_IN_TEAMS) for (const date of ['2027-01-10', '2027-03-22', '2027-05-30', '2027-08-12']) {
      const shield = shieldFor(season, t)
      const hurt = t.players.slice(0, 11).filter((p) => isInjured(season, p.id, date, shield))
      if (!hurt.length) continue
      const { team, news } = pickCpuXI(t, season, { date }, form)
      for (const h of hurt) expect(team.players.slice(0, 11).some((p) => p.id === h.id)).toBe(false)
      expect(news.some((n) => n.kind === 'out' && n.why === 'injured')).toBe(true)
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
    const form = { recent, norm: { bat: { mean: 30, sd: 10 }, bowl: { mean: 20, sd: 10 } }, breakout: new Map<string, number>() }
    for (const p of t.players) recent.set(p.id, p.role === 'BOWL' ? 20 : 30)
    recent.set(bad.id, 0)
    recent.set(bench.id, 80)
    void base
    const none = pickCpuXI(t, season, { date }, { ...form, recent: new Map() })
    const { team, news } = pickCpuXI(t, season, { date }, form)
    const names = (x: typeof team) => x.players.slice(0, 11).map((p) => p.id)
    expect(names(team)).toContain(bench.id)
    expect(names(none.team).length).toBe(11)
    expect(news.some((n) => n.kind === 'in' && n.playerId === bench.id)).toBe(true)
  })
})
