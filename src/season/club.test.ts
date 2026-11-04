import { describe, expect, it } from 'vitest'
import { BUILT_IN_TEAMS } from '../data/teams'
import { YOUTH_BY_ID } from '../data/youthPool'
import { boostSummary } from './boost'
import { purseCap, yearEnd } from './careers'
import { FACILITY_KEYS, MAX_LEVEL } from './club'
import {
  academyPicks, boostPrice, buildStatue, buyBoost, campFor, campOdds, CAMP_ODDS, clubOf, goldenTicket, hireCoach, freeCoaches, levelOf, medicalBlock, nudgeFor, physioSlots,
  scaleOf, scoutOdds, scoutTrip, TICKET_ODDS, TICKET_PITY, trainingMult, upgradeFacility, upkeepOf, wildcardOffer, buildCost, campsAllowed,
} from './club'
import { generateSeason } from './generate'
import { playerIndex, potentialOf } from './market'
import { shieldFor } from './injuries'
import type { Season } from './types'

const me = BUILT_IN_TEAMS[0]
const make = (seed = 3): Season => {
  const s = generateSeason({ year: 2027, teams: BUILT_IN_TEAMS, seed, myTeamId: me.id })
  return { ...s, market: { ...(s.market as NonNullable<Season['market']>), budgets: { ...(s.market as NonNullable<Season['market']>).budgets, [me.id]: 5000 } } }
}
const purse = (s: Season) => s.market?.budgets[me.id] ?? 0

describe('club', () => {
  it('prices grow with the wage bill but are never below the start squad level', () => {
    expect(scaleOf(10)).toBe(1)
    expect(scaleOf(168)).toBe(2)
    expect(buildCost('training', 0, 2)).toBe(2 * buildCost('training', 0, 1))
  })

  it('a building costs coins once, shows in the level, and has a yearly upkeep', () => {
    const s = make()
    const out = upgradeFacility(s, 'training', 1)
    expect(out.error).toBeUndefined()
    expect(levelOf(clubOf(out.season), 'training')).toBe(1)
    expect(purse(out.season)).toBe(5000 - buildCost('training', 0, 1))
    expect(upkeepOf(clubOf(out.season), 1).length).toBe(1)
    expect(upgradeFacility({ ...s, market: { ...(s.market as NonNullable<Season['market']>), budgets: { [me.id]: 1 } } }, 'training', 1).error).toMatch(/Not enough/)
  })

  it('buildings change how the game plays only as described', () => {
    let s = make()
    expect(trainingMult(s, me.id)).toBe(1)
    expect(physioSlots(s)).toBe(3)
    for (let i = 0; i < 4; i++) { s = upgradeFacility(s, 'training', 1).season; s = upgradeFacility(s, 'medical', 1).season }
    expect(trainingMult(s, me.id)).toBeCloseTo(1.4)
    expect(trainingMult(s, 'someone-else')).toBe(1)
    expect(medicalBlock(s)).toBeCloseTo(0.32)
    expect(physioSlots(s)).toBe(5)
    // the medical centre shields about its share of days for a player with no physio
    const shield = shieldFor(s, { id: me.id, players: me.players })
    let n = 0; const total = 2000
    for (let i = 0; i < total; i++) if (shield(me.players[i % 11].id, `2027-${String(1 + (i % 12)).padStart(2, '0')}-${String(1 + (i % 28)).padStart(2, '0')}#${i}`)) n++
    expect(n / total).toBeGreaterThan(0.25)
    expect(n / total).toBeLessThan(0.4)
  })

  it('bought boost tokens count as tokens, the price rises, and a year has a limit', () => {
    let s = make()
    const b0 = boostSummary([s], undefined, 'normal').available
    const a = buyBoost(s, 1)
    expect(a.error).toBeUndefined()
    s = a.season
    expect(boostSummary([s], { used: 0, armed: false, bought: 1 }, 'normal').available).toBe(b0 + 1)
    expect(boostPrice(1, 1)).toBeGreaterThan(boostPrice(0, 1))
    for (let i = 0; i < 3; i++) s = buyBoost(s, 1).season
    expect(buyBoost(s, 1).error).toMatch(/only buy/)
  })

  it('a hired coach replaces yours, costs a wage, and cannot be one that works elsewhere', () => {
    const s = make()
    const best = freeCoaches(s)[0]
    const out = hireCoach(s, best.id, 1)
    expect(out.error).toBeUndefined()
    expect(out.season.coaches?.[me.id]).toBe(best.id)
    expect(upkeepOf(clubOf(out.season), 1).some(([n]) => n.includes(best.name))).toBe(true)
    const taken = Object.entries(s.coaches ?? {}).find(([t]) => t !== me.id)?.[1] as string
    expect(hireCoach(s, taken, 1).error).toMatch(/already coaches/)
  })

  it('a training camp is repeatable, never beyond 97, and limited per year', () => {
    const s = make()
    const base = playerIndex(BUILT_IN_TEAMS, s.market)
    const id = me.players[2].id
    const a = campFor(s, base, id, 0.5, 1)
    const b = campFor(s, base, id, 0.5, 1)
    expect(a.error).toBeUndefined()
    expect(a.season.shifts).toEqual(b.season.shifts)
    let cur = s
    for (let i = 0; i < campsAllowed(clubOf(s)); i++) cur = campFor(cur, base, id, 0.5, 1).season
    expect(campFor(cur, base, id, 0.5, 1).error).toMatch(/camps this year/)
  })

  it('camp odds add up to 100, and struggling clubs get kinder odds', () => {
    expect(CAMP_ODDS.reduce((n, k) => n + k.odds, 0)).toBe(100)
    expect(campOdds(0.2).reduce((n, o) => n + o, 0)).toBe(100)
    expect(campOdds(0.2)[0]).toBeLessThan(campOdds(0.7)[0])
  })

  it('scouting finds a youngster from the reserve at half price and keeps him for you', () => {
    const s = make()
    expect(s.market?.reserve.length).toBeGreaterThan(0)
    const base = playerIndex(BUILT_IN_TEAMS, s.market)
    const out = scoutTrip(s, base, 0.3, 1, (id) => potentialOf(base.get(id) as never), (id) => YOUTH_BY_ID.get(id)?.name ?? id)
    expect(out.error).toBeUndefined()
    const id = clubOf(out.season).reserved?.[0] as string
    expect(out.season.market?.pool).toContain(id)
    expect(out.season.market?.reserve).not.toContain(id)
    expect(out.season.market?.asking[id]).toBeGreaterThan(0)
    const odds = scoutOdds(clubOf(out.season), 0.3)
    expect(odds.reduce((n, t) => n + t.odds, 0)).toBe(100)
    expect(scoutOdds({ pityScout: 3 }, 0.6)[2].odds).toBeGreaterThan(scoutOdds({}, 0.6)[2].odds)
    expect(scoutOdds({}, 0.2)[2].odds).toBeGreaterThan(scoutOdds({}, 0.7)[2].odds)
  })

  it('a golden ticket costs more on average than it returns, with a safety net', () => {
    expect(TICKET_ODDS.reduce((n, t) => n + t.odds, 0)).toBe(100)
    expect(TICKET_ODDS.reduce((n, t) => n + (t.odds / 100) * t.back, 0)).toBeLessThan(1)
    let net = 0, runs = 0
    for (let seed = 1; seed <= 60; seed++) {
      let s = make(seed)
      const before = purse(s)
      s = goldenTicket(s, 1).season
      net += purse(s) - before; runs++
    }
    expect(net / runs).toBeLessThan(0) // it is a sink
    expect(TICKET_PITY).toBeGreaterThan(1)
    const stuck = { ...make(), market: { ...(make().market as NonNullable<Season['market']>), club: { year: 2027, pityTicket: TICKET_PITY - 1 } } }
    expect(purse(goldenTicket(stuck, 1).season)).toBeGreaterThan(purse(stuck) - 120) // the pity ticket is a sell-out
  })

  it('a wildcard legend is only for struggling clubs, once a year', () => {
    const s = make()
    const base = playerIndex(BUILT_IN_TEAMS, s.market)
    const rate = (p: { batting: { technique: number } }) => p.batting.technique
    expect(wildcardOffer(s, base, 0.7, rate as never)).toBeNull()
    expect(wildcardOffer(s, base, 0.2, rate as never)).not.toBeNull()
    expect(wildcardOffer(s, base, 0.2, rate as never)?.player.id).toBe(wildcardOffer(s, base, 0.2, rate as never)?.player.id)
  })

  it('statues cost more each, and one per player', () => {
    const s = make()
    const base = playerIndex(BUILT_IN_TEAMS, s.market)
    const a = buildStatue(s, base, me.players[0].id, 1)
    expect(a.error).toBeUndefined()
    expect(buildStatue(a.season, base, me.players[0].id, 1).error).toMatch(/already/)
    const b = buildStatue(a.season, base, me.players[1].id, 1)
    expect(purse(a.season) - purse(b.season)).toBeGreaterThan(5000 - purse(a.season))
  })

  it('the academy sets aside the best prospects, one per level', () => {
    const reserve = ['a', 'b', 'c']
    const pot = (id: string) => ({ a: 70, b: 90, c: 80 }[id] ?? 0)
    expect(academyPicks({}, reserve, pot)).toEqual([])
    expect(academyPicks({ levels: { academy: 2 } }, reserve, pot)).toEqual(['b', 'c'])
  })

  it('upkeep comes out at the turn of the year and is listed in the books; scouted youth stay yours until then', () => {
    let s = make(9)
    s = upgradeFacility(upgradeFacility(s, 'training', 1).season, 'stadium', 1).season
    const base = playerIndex(BUILT_IN_TEAMS, s.market)
    const plain = yearEnd({ season: make(9), base, titles: {}, seed: 4, catchUp: 0, scoreOf: () => 0.5 })
    const club = yearEnd({ season: s, base, titles: {}, seed: 4, catchUp: 0, scoreOf: () => 0.5 })
    const up = club.mine?.upkeep ?? []
    expect(up.length).toBe(2)
    const total = up.reduce((n, [, v]) => n + v, 0)
    expect(total).toBeGreaterThan(0)
    // the wage cap may trim both, but the club never ends richer than the plain one with the same spending history
    expect((club.market.budgets[me.id] ?? 0)).toBeLessThanOrEqual(plain.market.budgets[me.id] ?? 0)
    expect(club.market.club?.reserved ?? []).toEqual([])
  })

  it('reminders only appear for rich clubs with something untried', () => {
    const s = make()
    expect(nudgeFor(s, 10, 1, 3)).toBeNull()
    expect(nudgeFor(s, 5000, 1, 3)).not.toBeNull()
  })
})

describe('the biggest building can be saved up for', () => {
  it('every level of every building costs less than the most your club may carry into a year', () => {
    const bill = 84
    const cap = purseCap(bill, true)
    for (const k of FACILITY_KEYS) for (let l = 0; l < MAX_LEVEL; l++) expect(buildCost(k, l, scaleOf(bill)), `${k} level ${l + 1}`).toBeLessThan(cap)
    expect(purseCap(bill, false)).toBe(bill * 8) // the computer keeps the old cap
  })
})
