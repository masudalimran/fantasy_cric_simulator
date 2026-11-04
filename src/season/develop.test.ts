import { describe, expect, it } from 'vitest'
import { BUILT_IN_TEAMS } from '../data/teams'
import { clubOf, upgradeFacility } from './club'
import { addDays } from './dates'
import { advanceProgrammes, focusesFor, lessonsAllowed, lessonsFor, programmeCap, startProgramme, takeLesson, traitChance, LESSON_ODDS } from './develop'
import { generateSeason } from './generate'
import { playerIndex } from './market'
import { applyShift } from './progression'
import type { Season } from './types'

const me = BUILT_IN_TEAMS[0]
const make = (seed = 3): Season => {
  const s = generateSeason({ year: 2027, teams: BUILT_IN_TEAMS, seed, myTeamId: me.id })
  const m = s.market as NonNullable<Season['market']>
  return { ...s, market: { ...m, budgets: { ...m.budgets, [me.id]: 9000 } } }
}
const batsman = me.players.find((p) => !p.bowling) ?? me.players[0]

describe('player development', () => {
  it('odds add up to 100', () => expect(LESSON_ODDS.reduce((n, o) => n + o.odds, 0)).toBe(100))

  it('a hand lesson switches the hand everywhere the shift is applied, and costs coins', () => {
    const s = make()
    const base = playerIndex(BUILT_IN_TEAMS, s.market)
    const p = me.players[3]
    const lesson = lessonsFor(p, 1).find((l) => l.kind === 'hand') as never
    const out = takeLesson(s, base, p.id, lesson)
    expect(out.error).toBeUndefined()
    expect(applyShift(p, out.season.shifts?.[p.id]).hand).toBe(p.hand === 'R' ? 'L' : 'R')
    expect(out.season.market?.budgets[me.id]).toBeLessThan(9000)
    expect(clubOf(out.season).retrains).toBe(1)
  })

  it('a batsman who becomes a bowler gets a bowling action; a bowler can change kind', () => {
    const s = make()
    const base = playerIndex(BUILT_IN_TEAMS, s.market)
    const role = lessonsFor(batsman, 1).find((l) => l.role === 'BOWL') as never
    const a = takeLesson(s, base, batsman.id, role, 'legspin')
    const q = applyShift(batsman, a.season.shifts?.[batsman.id])
    expect(q.role).toBe('BOWL')
    expect(q.bowling?.type).toBe('legspin')
    const bowler = me.players.find((p) => p.bowling && p.bowling.type !== 'offspin')
    if (bowler) {
      const l = lessonsFor(bowler, 1).find((x) => x.bowl === 'offspin') as never
      const b = takeLesson(s, base, bowler.id, l)
      expect(applyShift(bowler, b.season.shifts?.[bowler.id]).bowling?.type).toBe('offspin')
    }
  })

  it('lessons are limited per year and repeatable from the same state', () => {
    let s = make()
    const base = playerIndex(BUILT_IN_TEAMS, s.market)
    const p = me.players[4]
    const l = lessonsFor(p, 1).find((x) => x.kind === 'hand') as never
    expect(takeLesson(s, base, p.id, l).season.shifts).toEqual(takeLesson(s, base, p.id, l).season.shifts)
    for (let i = 0; i < lessonsAllowed(clubOf(s)); i++) s = takeLesson(s, base, p.id, l).season
    expect(takeLesson(s, base, p.id, l).error).toMatch(/lessons a year/)
  })

  it('a programme raises one rating over its days, never past its cap, then may earn a trait', () => {
    let s = make()
    const base = playerIndex(BUILT_IN_TEAMS, s.market)
    const p = me.players[1]
    const started = startProgramme(s, base, p.id, 'power', 1)
    expect(started.error).toBeUndefined()
    s = started.season
    expect(startProgramme(s, base, me.players[2].id, 'power', 1).error).toMatch(/busy/) // one at a time
    let cur = s
    for (let d = 0; d < 60; d++) { const nxt = { ...cur, today: addDays(cur.today, 1) }; cur = advanceProgrammes(cur, nxt, () => base) }
    const gain = cur.shifts?.[p.id]?.a?.power ?? 0
    expect(gain).toBeGreaterThan(0)
    expect(gain).toBeLessThanOrEqual(programmeCap(clubOf(s)))
    expect(clubOf(cur).graduates?.length).toBe(1)
    expect(traitChance({ pityTrait: 10 })).toBe(85)
  })

  it('training ground level adds a programme slot and a lesson', () => {
    const s = upgradeFacility(make(), 'training', 1).season
    const base = playerIndex(BUILT_IN_TEAMS, s.market)
    expect(lessonsAllowed(clubOf(s))).toBe(3)
    const a = startProgramme(s, base, me.players[1].id, 'power', 1).season
    expect(startProgramme(a, base, me.players[2].id, 'technique', 1).error).toBeUndefined()
    expect(focusesFor(me.players[0]).length).toBeGreaterThan(4)
  })
})
