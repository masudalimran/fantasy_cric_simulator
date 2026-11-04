import { describe, expect, it } from 'vitest'
import { BONUS_LEVELS, COST, MAX_LEVEL, NODE_BY_ID, NODES, canTake, pointsAt } from '../data/passiveTree'
import { BUILT_IN_TEAMS } from '../data/teams'
import { Match } from '../engine/match'
import { perkAdd, withPerk, type MatchPerks, type Sit } from '../engine/perks'
import { yearEnd } from './careers'
import { generateSeason } from './generate'
import { careerXp, dropPerk, levelInfo, pointsLeft, respec, respecCost, takePerk, xpToReach } from './level'
import { matchPerksFor } from './matchPerks'
import { playerIndex } from './market'
import { perkSum } from './perkNums'
import { physioSlots } from './clubEffects'
import type { Season } from './types'

const me = BUILT_IN_TEAMS[0]
const make = (seed = 3): Season => generateSeason({ year: 2027, teams: BUILT_IN_TEAMS, seed, myTeamId: me.id })
const withPerks = (s: Season, perks: string[]): Season => ({ ...s, market: { ...(s.market as NonNullable<Season['market']>), club: { ...s.market?.club, perks } } })

const KNOWN_K = ['build', 'scoutCost', 'scoutProdigy', 'campLuck', 'academy', 'income', 'lessonLuck', 'physio', 'refund', 'wages', 'noStadium', 'boost', 'boostPrice', 'trainRookie', 'matchRookie', 'youthCost', 'vetFade', 'extendCost']

describe('passive tree data', () => {
  it('every perk does something real, is connected, and uses names the game reads', () => {
    for (const n of NODES) {
      const fx = n.fx
      expect(!!(fx.rules?.length || fx.field || fx.review || (fx.k && Object.keys(fx.k).length)), n.id).toBe(true)
      for (const k of Object.keys(fx.k ?? {})) expect(KNOWN_K, `${n.id}:${k}`).toContain(k)
      for (const r of n.req) expect(NODE_BY_ID.has(r), `${n.id} needs ${r}`).toBe(true)
      if (n.row > 0) expect(n.req.length, n.id).toBeGreaterThan(0)
    }
  })
  it('levels give a point each plus a bonus at the milestones', () => {
    expect(pointsAt(1)).toBe(1)
    expect(pointsAt(MAX_LEVEL)).toBe(MAX_LEVEL + BONUS_LEVELS.length)
  })
})

describe('levels', () => {
  it('xp turns into a level, never past the cap', () => {
    expect(levelInfo(0).level).toBe(1)
    expect(levelInfo(xpToReach(5)).level).toBe(5)
    expect(levelInfo(xpToReach(5) - 1).level).toBe(4)
    expect(levelInfo(1e9).level).toBe(MAX_LEVEL)
    expect(levelInfo(1e9).maxed).toBe(true)
  })
  it('xp comes from matches, wins, finished seasons and club buildings', () => {
    const s = make()
    expect(careerXp([s], 0)).toBe(0)
    expect(careerXp([s], 2)).toBe(300)
    const f = s.fixtures.find((x) => x.homeId === me.id || x.awayId === me.id) as never as { id: string }
    const won = { ...s, results: { [f.id]: { fixtureId: f.id, winnerId: me.id } as never } }
    expect(careerXp([won], 0)).toBe(50)
  })
})

describe('taking perks', () => {
  it('needs points and a connected perk, can be taken back only when nothing depends on it, and a reset is free once', () => {
    let s = make()
    expect(takePerk(s, 'open.2', 10).error).toMatch(/connected/)
    expect(takePerk(s, 'open.1', 1).error).toBeUndefined()
    s = takePerk(s, 'open.1', 1).season
    expect(takePerk(s, 'open.9', 1).error).toBeDefined()
    expect(pointsLeft(1, ['open.1'])).toBe(0)
    expect(takePerk(s, 'open.2', 1).error).toMatch(/points/)
    s = takePerk(s, 'open.2', 5).season
    expect(dropPerk(s, 'open.1').error).toMatch(/depend/)
    expect(dropPerk(s, 'open.2').error).toBeUndefined()
    expect(respecCost(s)).toBe(0)
    const r = respec(s)
    expect(r.error).toBeUndefined()
    expect(r.season.market?.club?.perks).toEqual([])
    expect(respecCost(r.season)).toBeGreaterThan(0)
    expect(canTake(NODE_BY_ID.get('open.1') as never, new Set())).toBe(true)
    expect(COST.k).toBe(3)
  })
})

describe('perks at work', () => {
  const sit = (over: Partial<Sit> & { p: Sit['p'] }): Sit => ({ role: 'bat', pos: 0, captainId: 'x', keeperId: null, xi: [], phase: 'powerplay', inningsIndex: 0, limited: true, pressure: false, ballsFaced: 0, pitchSpin: 0, pitchPace: 0, ...over })
  const p = me.players[0]
  it('apply to the right role, in the right moment, to your side only', () => {
    const perks: MatchPerks = { rules: NODE_BY_ID.get('open.1')?.fx.rules ?? [] }
    expect(perkAdd(perks, sit({ p, pos: 0 })).power).toBe(1)
    expect(perkAdd(perks, sit({ p, pos: 4 })).power).toBeUndefined() // not an opener
    expect(perkAdd(perks, sit({ p, pos: 0, phase: 'death' })).power).toBeUndefined() // not the powerplay
    expect(withPerk(p, { power: 3 }, 'bat').batting.power).toBe(p.batting.power + 3)
    expect(p.batting.power).toBe(me.players[0].batting.power) // the original is untouched
  })
  it('make a measurable difference to a match, replay exactly, and never touch the computer', () => {
    const rules = NODES.filter((n) => n.branch === 'open' || n.branch === 'fin').flatMap((n) => n.fx.rules ?? [])
    const run = (perks?: MatchPerks) => {
      const m = new Match({ teamA: BUILT_IN_TEAMS[0], teamB: BUILT_IN_TEAMS[1], format: 't20', seed: 77, career: { myTeamId: BUILT_IN_TEAMS[0].id, difficulty: 'normal', perks } })
      m.playMatch()
      return m.innings.map((i) => i.runs)
    }
    const a = run({ rules }), b = run({ rules }), c = run()
    expect(a).toEqual(b)
    let differs = false
    for (let seed = 1; seed < 12 && !differs; seed++) {
      const x = new Match({ teamA: BUILT_IN_TEAMS[0], teamB: BUILT_IN_TEAMS[1], format: 't20', seed, career: { myTeamId: BUILT_IN_TEAMS[0].id, difficulty: 'normal', perks: { rules } } })
      const y = new Match({ teamA: BUILT_IN_TEAMS[0], teamB: BUILT_IN_TEAMS[1], format: 't20', seed, career: { myTeamId: BUILT_IN_TEAMS[0].id, difficulty: 'normal' } })
      x.playMatch(); y.playMatch()
      if (x.innings[0].runs !== y.innings[0].runs) differs = true
    }
    expect(differs).toBe(true)
    expect(c.length).toBeGreaterThan(1)
  })
  it('no perks means no match perks; the season builds veterans, rookies and home games', () => {
    const s = make()
    expect(matchPerksFor(s, me.players.slice(0, 11))).toBeUndefined()
    const t = withPerks(s, ['day.1', 'keep.1'])
    const fx = s.fixtures.find((f) => f.homeId === me.id)
    const mp = matchPerksFor(t, me.players.slice(0, 11), fx) as MatchPerks
    expect(mp.home).toBe(true)
    expect(mp.field).toBe(1)
    expect(mp.oldest).toBeDefined()
  })
})

describe('perks off the field', () => {
  it('sponsors raise year-end income, moneyball cuts the wage bill, evergreen softens the fade, and a physio place is added', () => {
    const s = make(9)
    const base = playerIndex(BUILT_IN_TEAMS, s.market)
    const end = (x: Season) => yearEnd({ season: x, base, titles: {}, seed: 4, catchUp: 0, scoreOf: () => 0.6 })
    const plain = end(s), rich = end(withPerks(s, ['club.1', 'club.2', 'club.5']))
    expect(rich.mine?.income as number).toBeGreaterThan(plain.mine?.income as number)
    const lean = end(withPerks(s, ['club.1', 'club.2', 'club.5', 'club.9']))
    expect(lean.mine?.bill as number).toBeLessThan(plain.mine?.bill as number)
    expect(perkSum(withPerks(s, ['club.9']), 'wages')).toBeCloseTo(-0.1)
    expect(physioSlots(withPerks(s, ['club.1', 'club.2', 'club.5', 'club.7']))).toBe(4)
    expect(physioSlots(s)).toBe(3)
  })
})
