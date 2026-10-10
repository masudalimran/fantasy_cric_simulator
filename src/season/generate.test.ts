import { describe, expect, it } from 'vitest'
import { emptyTeamDraft } from '../data/generate'
import { BUILT_IN_TEAMS } from '../data/teams'
import { addDays, daysBetween, endOfYear, startOfYear } from './dates'
import { generateSeason } from './generate'

const season = (seed: number, teams = BUILT_IN_TEAMS) => generateSeason({ year: 2027, teams, seed })

describe('season generator', () => {
  it('is deterministic for a seed', () => {
    const a = season(5)
    const b = season(5)
    expect(a.fixtures.map((f) => [f.id, f.date, f.homeId, f.awayId])).toEqual(b.fixtures.map((f) => [f.id, f.date, f.homeId, f.awayId]))
  })

  for (const seed of [1, 2, 3, 4, 5, 6]) {
    describe(`seed ${seed}`, () => {
      const s = season(seed)
      const known = s.fixtures.filter((f) => f.homeId && f.awayId)

      it('keeps every fixture inside the year', () => {
        for (const f of s.fixtures) {
          expect(f.date >= startOfYear(2027)).toBe(true)
          expect(f.date <= endOfYear(2027)).toBe(true)
        }
      })

      it('has every team play every other team', () => {
        const met = new Set(known.map((f) => [f.homeId, f.awayId].sort().join('|')))
        for (const a of BUILT_IN_TEAMS) for (const b of BUILT_IN_TEAMS) if (a.id < b.id) expect(met.has([a.id, b.id].sort().join('|'))).toBe(true)
      })

      it('never has a team play twice in one day or on back-to-back days', () => {
        const days = new Map<string, string[]>()
        for (const f of known) for (const t of [f.homeId!, f.awayId!]) days.set(t, [...(days.get(t) ?? []), f.date])
        for (const [, dates] of days) {
          const sorted = [...dates].sort()
          for (let i = 1; i < sorted.length; i++) expect(daysBetween(sorted[i - 1], sorted[i])).toBeGreaterThanOrEqual(2)
        }
      })

      it('balances guaranteed games across teams', () => {
        const counts = new Map(BUILT_IN_TEAMS.map((t) => [t.id, 0]))
        for (const f of known) for (const t of [f.homeId!, f.awayId!]) counts.set(t, (counts.get(t) ?? 0) + 1)
        const v = [...counts.values()]
        expect(Math.min(...v)).toBeGreaterThan(Math.max(...v) * 0.7)
      })

      it('references only real teams, and a knockout never starts before its feeders', () => {
        const ids = new Set(BUILT_IN_TEAMS.map((t) => t.id))
        const byId = new Map(s.fixtures.map((f) => [f.id, f]))
        for (const f of s.fixtures) {
          for (const slot of [f.homeRef, f.awayRef]) {
            if (slot.kind === 'team') expect(ids.has(slot.teamId)).toBe(true)
            if (slot.kind === 'winner') expect(byId.get(slot.of)!.date < f.date).toBe(true)
          }
        }
      })
    })
  }

  it('keeps the calendar busy without long gaps', () => {
    const s = season(1)
    const dates = [...new Set(s.fixtures.map((f) => f.date))].sort()
    let longest = 0
    for (let i = 1; i < dates.length; i++) longest = Math.max(longest, daysBetween(dates[i - 1], dates[i]))
    expect(longest).toBeLessThanOrEqual(4)
    expect(daysBetween(startOfYear(2027), dates[0])).toBeLessThanOrEqual(7)
    expect(daysBetween(dates[dates.length - 1], endOfYear(2027))).toBeLessThanOrEqual(45)
  })

  it('names every tournament after the team that founded it', () => {
    const s = season(1)
    const tournaments = s.competitions.filter((c) => c.kind !== 'series')
    expect(tournaments).toHaveLength(20)
    for (const c of tournaments) expect(c.teamIds).toContain(c.originTeamId)
  })

  it('copes with custom teams and odd team counts', () => {
    const custom = [emptyTeamDraft(), emptyTeamDraft()].map((t, i) => ({ ...t, id: `custom-${i}`, name: `Mine ${i}`, short: `M${i}X` }))
    for (const teams of [[...BUILT_IN_TEAMS, ...custom], BUILT_IN_TEAMS.slice(0, 13), BUILT_IN_TEAMS.slice(0, 6)]) {
      const s = season(9, teams)
      expect(s.fixtures.length).toBeGreaterThan(0)
      expect(s.fixtures.every((f) => f.date <= addDays(endOfYear(2027), 0))).toBe(true)
    }
  })
})
