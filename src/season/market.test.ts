import { describe, expect, it } from 'vitest'
import { BUILT_IN_TEAMS } from '../data/teams'
import { generateSeason } from './generate'
import { acceptOffer, advanceMarket, declineOffer, cpuMarketDay, developYouth, initMarket, marketValue, openWindow, playerIndex, POOL_SIZE, releasePlayer, rolloverMarket, signPlayer, SQUAD_CAP, SQUAD_FLOOR, teamOnDate } from './market'
import { sessionTeam } from './progression'
import type { Season } from './types'

const teams = BUILT_IN_TEAMS
const mk = (difficulty: 'easy' | 'normal' | 'legend' = 'normal'): Season => generateSeason({ year: 2030, teams, seed: 77, myTeamId: 'bleach', difficulty })
const open = (s: Season, date = '2030-01-05'): Season => ({ ...s, today: date })
const index = (s: Season) => playerIndex(teams, s.market)

describe('player market', () => {
  it('sets up squads, a pool of young players, purses and two windows', () => {
    const s = mk()
    expect(s.windows).toHaveLength(2)
    expect(Object.keys(s.market!.squads)).toHaveLength(teams.length)
    expect(s.market!.pool).toHaveLength(POOL_SIZE)
    expect(s.market!.budgets.bleach).toBeGreaterThan(0)
    expect(openWindow(s, '2030-01-05')).not.toBeNull()
    expect(openWindow(s, '2030-03-05')).toBeNull()
  })

  it('prices rise steeply with ability', () => {
    const [weak, strong] = [...teams[0].players].sort((a, b) => a.batting.power - b.batting.power)
    expect(marketValue(strong)).toBeGreaterThan(marketValue(weak))
    const stars = teams.flatMap((t) => t.players).filter((p) => marketValue(p) > 10).length
    expect(stars).toBeGreaterThan(10)
  })

  it('signs an unsigned player into a squad and charges for him', () => {
    const s = open(mk())
    const id = s.market!.pool[0]
    const price = s.market!.asking[id]
    const before = s.market!.budgets.bleach
    const out = signPlayer({ ...s, market: { ...s.market!, budgets: { ...s.market!.budgets, bleach: 500 } } }, index(s), 'bleach', id, '2030-01-05')
    expect(out.error).toBeUndefined()
    expect(before).toBeGreaterThan(0)
    expect(out.season.market!.squads.bleach).toContain(id)
    expect(out.season.market!.pool).not.toContain(id)
    expect(out.season.market!.budgets.bleach).toBe(500 - price)
    expect(out.season.market!.log.at(-1)).toMatchObject({ kind: 'sign', to: 'bleach', fee: price })
    // he now plays for the team in the career
    expect(sessionTeam(teams.find((t) => t.id === 'bleach')!, out.season).players.some((p) => p.id === id)).toBe(true)
  })

  it('refuses outside a window, without the coins, or when the squad is full', () => {
    const s = mk()
    const id = s.market!.pool[0]
    expect(signPlayer(open(s, '2030-03-05'), index(s), 'bleach', id, '2030-03-05').error).toMatch(/closed/i)
    const broke = open({ ...s, market: { ...s.market!, budgets: { ...s.market!.budgets, bleach: 0 } } })
    expect(signPlayer(broke, index(s), 'bleach', id, '2030-01-05').error).toMatch(/coins/i)
    // fill the squad to the cap
    const filler = s.market!.pool.slice(1, 1 + (SQUAD_CAP - s.market!.squads.bleach.length))
    const full: Season = open({ ...s, market: { ...s.market!, budgets: { ...s.market!.budgets, bleach: 900 }, squads: { ...s.market!.squads, bleach: [...s.market!.squads.bleach, ...filler] } } })
    expect(full.market!.squads.bleach).toHaveLength(SQUAD_CAP)
    expect(signPlayer(full, index(s), 'bleach', id, '2030-01-05').error).toMatch(/full/i)
    const drop = full.market!.squads.bleach[SQUAD_CAP - 1]
    const ok = signPlayer(full, index(s), 'bleach', id, '2030-01-05', drop)
    expect(ok.error).toBeUndefined()
    expect(ok.season.market!.squads.bleach).toHaveLength(SQUAD_CAP)
    expect(ok.season.market!.squads.bleach).not.toContain(drop)
    expect(ok.season.market!.pool).toContain(drop) // the released player is unsigned again
  })

  it('buys from another team, paying them, and keeps a history of where he played', () => {
    const s = open(mk())
    const target = s.market!.squads.naruto[12]
    const rich: Season = { ...s, market: { ...s.market!, budgets: { ...s.market!.budgets, bleach: 900 } } }
    const out = signPlayer(rich, index(s), 'bleach', target, '2030-01-05')
    expect(out.error).toBeUndefined()
    expect(out.season.market!.squads.naruto).not.toContain(target)
    expect(out.season.market!.squads.bleach).toContain(target)
    expect(out.season.market!.budgets.naruto).toBeGreaterThan(s.market!.budgets.naruto)
    expect(teamOnDate(out.season, target, '2030-01-04', 'naruto')).toBe('naruto')
    expect(teamOnDate(out.season, target, '2030-02-01', 'naruto')).toBe('bleach')
  })

  it('releases for a quarter of his value and never below the minimum squad', () => {
    const s = open(mk())
    const id = s.market!.squads.bleach[15]
    const out = releasePlayer(s, index(s), 'bleach', id, '2030-01-05')
    expect(out.error).toBeUndefined()
    expect(out.season.market!.pool).toContain(id)
    expect(out.season.market!.budgets.bleach).toBeGreaterThanOrEqual(s.market!.budgets.bleach)
    const small = open({ ...s, market: { ...s.market!, squads: { ...s.market!.squads, bleach: s.market!.squads.bleach.slice(0, SQUAD_FLOOR) } } })
    expect(releasePlayer(small, index(s), 'bleach', small.market!.squads.bleach[0], '2030-01-05').error).toMatch(/at least/i)
  })

  it('has the computer shop during a window, more when the difficulty is harder, and the same way every time', () => {
    const run = (diff: 'easy' | 'legend') => {
      let s = mk(diff)
      const idx = index(s)
      for (let d = 3; d <= 16; d++) s = cpuMarketDay(s, idx, `2030-01-${String(d).padStart(2, '0')}`)
      return s
    }
    const easy = run('easy')
    const legend = run('legend')
    expect(easy.market!.log.length).toBeGreaterThan(0)
    expect(legend.market!.log.length).toBeGreaterThan(easy.market!.log.length)
    expect(run('easy').market!.log).toEqual(easy.market!.log)
    for (const [id, squad] of Object.entries(legend.market!.squads)) { expect(squad.length).toBeLessThanOrEqual(SQUAD_CAP); expect(squad.length).toBeGreaterThanOrEqual(SQUAD_FLOOR); void id }
    // your own team is never touched by the computer
    expect(legend.market!.squads.bleach).toEqual(mk().market!.squads.bleach)
  })

  it('only shops while days pass inside a window', () => {
    const s = mk()
    const idx = () => index(s)
    expect(advanceMarket({ ...s, today: '2030-02-01' }, { ...s, today: '2030-02-20' }, idx).market!.log).toHaveLength(0)
    expect(advanceMarket({ ...s, today: '2030-01-02' }, { ...s, today: '2030-01-14' }, idx).market!.log.length).toBeGreaterThan(0)
  })

  it('computer teams make offers for your players, which you can accept or turn down', () => {
    let s = mk('legend')
    const idx = index(s)
    for (let d = 1; d <= 14; d++) s = cpuMarketDay(s, idx, `2030-01-${String(d).padStart(2, '0')}`)
    const offers = s.market!.offers ?? []
    expect(offers.length).toBeGreaterThan(0)
    expect(offers.length).toBeLessThanOrEqual(3)
    const o = offers[0]
    const before = s.market!.budgets.bleach
    const done = acceptOffer({ ...s, today: '2030-01-14' }, idx, o.id, '2030-01-14')
    expect(done.error).toBeUndefined()
    expect(done.season.market!.squads.bleach).not.toContain(o.playerId)
    expect(done.season.market!.squads[o.teamId]).toContain(o.playerId)
    expect(done.season.market!.budgets.bleach).toBe(before + o.fee)
    expect(done.season.market!.log.at(-1)).toMatchObject({ kind: 'buy', from: 'bleach', to: o.teamId, fee: o.fee })
    const refused = declineOffer(s, o.id)
    expect(refused.market!.offers!.some((x) => x.id === o.id)).toBe(false)
    expect(acceptOffer({ ...s, today: '2030-03-01' }, idx, o.id, '2030-03-01').error).toMatch(/closed/i)
  })

  it('rolls into a new year: new purses, a fresh pool, young players developing', () => {
    const s = mk()
    const next = rolloverMarket(s.market!, { bleach: 2 }, 5)
    expect(next.budgets.bleach).toBeGreaterThan(s.market!.budgets.bleach + 40)
    expect(next.pool).toHaveLength(POOL_SIZE)
    const m = initMarket(teams, 1)
    const shifts = developYouth({ ...m, squads: { ...m.squads, bleach: [...m.squads.bleach, ...m.pool.slice(0, 5)] } }, {}, playerIndex(teams, m), 9)
    expect(Object.keys(shifts).length).toBeGreaterThan(0)
  })
})
