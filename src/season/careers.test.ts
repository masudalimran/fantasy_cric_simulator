import { describe, expect, it } from 'vitest'
import { overall } from '../data/builders'
import { BUILT_IN_TEAMS } from '../data/teams'
import { boardBailout, contractsPending, extendVeteran, generateYouth, incomeMultiple, letGo, projectedBill, projectedIncome, retireVeteran, retireYearOf, yearEnd } from './careers'
import { generateSeason } from './generate'
import { playerIndex, SQUAD_FLOOR } from './market'
import { applyShift } from './progression'
import type { Season } from './types'

const teams = BUILT_IN_TEAMS
const start = (): Season => generateSeason({ year: 2030, teams, seed: 77, myTeamId: 'bleach', difficulty: 'normal' })

/** One turn of the year, the way the review page does it. */
function turn(s: Season, seed: number): Season {
  const base = playerIndex(teams, s.market)
  const out = yearEnd({ season: s, base, titles: {}, seed, catchUp: 0 })
  return generateSeason({ year: s.year + 1, teams, seed, myTeamId: s.myTeamId, difficulty: s.difficulty, shifts: out.shifts, market: out.market })
}

describe('careers, fees and the yearly budget', () => {
  it('every starter has a career of seven to ten seasons', () => {
    const m = start().market!
    const ids = Object.values(m.squads).flat()
    const years = ids.map((id) => retireYearOf({ ...m, originYear: 2030 }, id, 2030) - 2030)
    expect(Math.min(...years)).toBe(7)
    expect(Math.max(...years)).toBe(10)
  })

  it('academy youth are raw but have a ceiling, and are different each year', () => {
    const a = generateYouth(2031, 30, 5)
    expect(a).toHaveLength(30)
    const arrive = a.map((p) => overall(p)).sort((x, y) => x - y)
    expect(arrive[15]).toBeLessThan(65)
    expect(arrive[29]).toBeGreaterThan(68)
    expect(a.every((p) => p.potential > overall(p))).toBe(true)
    expect(generateYouth(2032, 30, 5)[0].id).not.toBe(a[0].id)
  })

  it('income and fees move the purse, and nobody on a computer team ends up in debt', () => {
    let s = start()
    for (let y = 0; y < 3; y++) s = turn(s, 100 + y)
    for (const [id, b] of Object.entries(s.market!.budgets)) if (id !== 'bleach') expect(b).toBeGreaterThanOrEqual(0)
    expect(s.market!.report).toBeDefined()
  })

  it('the whole starter roster has retired and been replaced by youth within twelve seasons, and squads stay playable', () => {
    let s = start()
    const starters = new Set(Object.values(s.market!.squads).flat())
    for (let y = 0; y < 12; y++) {
      s = turn(s, 300 + y)
      // you decide about your own retiring veterans every year: let them all go
      for (const o of [...(s.market!.pending ?? [])]) s = retireVeteran(s, playerIndex(teams, s.market), o.playerId)
      if ((s.market!.budgets.bleach ?? 0) < 0) s = boardBailout(s)
      for (const [t, ids] of Object.entries(s.market!.squads)) expect(ids.length, `${t} in year ${s.year}`).toBeGreaterThanOrEqual(SQUAD_FLOOR - 3)
    }
    const left = Object.values(s.market!.squads).flat().filter((id) => starters.has(id))
    expect(left.length).toBeLessThan(5)
  })

  it('a young academy player grows into a regular within about four years', () => {
    let s = start()
    for (let y = 0; y < 2; y++) s = turn(s, 500 + y)
    const base = playerIndex(teams, s.market)
    const grads = Object.values(s.market!.squads).flat().filter((id) => id.startsWith('gy-'))
    expect(grads.length).toBeGreaterThan(0)
    const rated = grads.map((id) => overall(applyShift(base.get(id)!, s.shifts?.[id])))
    rated.sort((x, y) => y - x)
    expect(rated[0]).toBeGreaterThan(78)
    expect(rated[Math.floor(rated.length / 2)]).toBeGreaterThan(62)
  })

  it('keeping a veteran costs the raise and a later year costs more; letting go refunds a fee', () => {
    let s = start()
    let guard = 0
    while (!(s.market!.pending?.length) && guard++ < 11) s = turn(s, 700 + guard)
    expect(contractsPending(s)).toBe(true)
    const offer = s.market!.pending![0]
    s = { ...s, market: { ...s.market!, budgets: { ...s.market!.budgets, bleach: 500 } } }
    const out = extendVeteran(s, offer.playerId)
    expect(out.error).toBeUndefined()
    expect(out.season.market!.budgets.bleach).toBe(500 - offer.fee)
    expect(out.season.market!.fees![offer.playerId]).toBe(offer.fee)
    expect(out.season.market!.squads.bleach).toContain(offer.playerId)
    const base = playerIndex(teams, s.market)
    const id = s.market!.squads.bleach[3]
    const cut = letGo(s, base, id)
    expect(cut.season.market!.squads.bleach).not.toContain(id)
    expect(cut.season.market!.budgets.bleach).toBeGreaterThan(500)
  })

  it('income is a multiple of the wage bill that grows with winning: 1.5x losing, 2x middling, 3-5x winning', () => {
    expect(incomeMultiple(0.2)).toBe(1.5)
    expect(incomeMultiple(0.5)).toBe(2)
    expect(incomeMultiple(0.65)).toBe(3)
    expect(incomeMultiple(0.85)).toBe(4)
    expect(incomeMultiple(1)).toBe(5)
    expect(incomeMultiple(0.5, 2)).toBeCloseTo(2.6)
    expect(incomeMultiple(1, 3)).toBe(5)
  })

  it('shows the wages for next year for a career that has no fees saved yet (an older save)', () => {
    const s = start()
    const base = playerIndex(teams, s.market)
    expect(s.market!.fees).toBeUndefined()
    const out = projectedBill(s, base)
    expect(out.rows).toHaveLength(s.market!.squads.bleach.length)
    expect(out.total).toBeGreaterThan(30)
    expect(projectedIncome(s, out.total).income).toBe(Math.round(out.total * 2)) // nothing played yet: middling
  })
})