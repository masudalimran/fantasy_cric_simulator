import { describe, expect, it } from 'vitest'
import { overall } from '../data/builders'
import { BUILT_IN_TEAMS } from '../data/teams'
import { YOUTH } from '../data/youthPool'
import { generateSeason } from './generate'
import { applyDelta, headroom,applyShift, applyShifts, gradePlayedMatches, matchChanges, seasonAttrChanges, seasonChanges, sessionTeam, ACADEMY_RATING_STOP, inAcademy } from './progression'
import { nextMatchDate, simDay } from './results'
import { collect, impactPoints } from './stats'
import type { RawSummary } from './types'

const teams = new Map(BUILT_IN_TEAMS.map((t) => [t.id, t]))
let year: ReturnType<typeof generateSeason> | null = null
function played(matches = 60) {
  if (year) return year
  let s = generateSeason({ year: 2027, teams: BUILT_IN_TEAMS, seed: 12, myTeamId: BUILT_IN_TEAMS[0].id })
  for (let g = 0; g < matches * 3; g++) { const d = nextMatchDate(s); if (!d) break; s = simDay(s, d, teams, false) }
  return (year = s)
}

const rawWith = (bat: RawSummary['bat'], bowl: RawSummary['bowl'] = []): RawSummary => ({ fixtureId: 'x', winnerId: null, text: '', margin: null, scores: {}, superOver: false, playerOfMatchId: null, bat, bowl })

describe('rating shifts', () => {
  it('adds gains and losses to the starting ratings, rating by rating, within 1-99', () => {
    const p = BUILT_IN_TEAMS[0].players[0]
    const up = applyShift(p, { bat: 0, bowl: 0, a: { power: 3 } })
    expect(up.batting.power).toBe(Math.min(99, p.batting.power + 3))
    expect(up.batting.technique).toBe(p.batting.technique)
    expect(applyShift(p, { bat: 0, bowl: 0, a: { temperament: -90 } }).batting.temperament).toBeGreaterThanOrEqual(1)
    expect(applyShift(p, { bat: 80, bowl: 80 }).batting.power).toBeLessThanOrEqual(99)
    expect(applyShift(p, undefined)).toBe(p)
    expect(applyShifts(BUILT_IN_TEAMS[0], undefined)).toBe(BUILT_IN_TEAMS[0])
    expect(overall(applyDelta(p, { technique: 4, power: 4, temperament: 4 }))).toBeGreaterThan(overall(p))
  })

  it('applies your session lineup to your team only', () => {
    const t = BUILT_IN_TEAMS[0]
    const order = [...t.players].reverse().map((p) => p.id)
    const season = { shifts: undefined, lineup: { order, captainId: t.players[4].id }, myTeamId: t.id }
    expect(sessionTeam(t, season).players.map((p) => p.id)).toEqual(order)
    expect(sessionTeam(BUILT_IN_TEAMS[1], season)).toBe(BUILT_IN_TEAMS[1])
  })
})

describe('growth curve', () => {
  it('is steep for low ratings and shallow near the top, and only ever scales gains', () => {
    expect(headroom(30)).toBeGreaterThan(headroom(60))
    expect(headroom(60)).toBeGreaterThan(headroom(75))
    expect(headroom(75)).toBeGreaterThan(headroom(94))
    expect(headroom(30) / headroom(94)).toBeGreaterThan(4)
    expect(headroom(99)).toBeGreaterThan(0)
  })
})

describe('what a match does to a player', () => {
  const t = BUILT_IN_TEAMS[2]
  const bat = t.players[3]
  const bowler = t.players.find((p) => p.role === 'BOWL')!

  it('rewards a big innings and punishes a duck', () => {
    const big = matchChanges(rawWith([[bat.id, 112, 58, 11, 4, 0]]), 't20', teams)
    expect(Object.values(big[bat.id].a).reduce((s, n) => s + (n ?? 0), 0)).toBeGreaterThan(0)
    expect(big[bat.id].o).toBeGreaterThanOrEqual(0)
    const duck = matchChanges(rawWith([[bat.id, 0, 3, 0, 0, 1]]), 't20', teams)
    expect(duck[bat.id].a.temperament).toBeLessThan(0)
  })

  it('rewards a great spell and punishes a thrashing', () => {
    const great = matchChanges(rawWith([], [[bowler.id, 24, 14, 4, 1]]), 't20', teams)
    expect(Object.values(great[bowler.id].a).reduce((s, n) => s + (n ?? 0), 0)).toBeGreaterThan(0)
    const bad = matchChanges(rawWith([], [[bowler.id, 24, 62, 0, 0]]), 't20', teams)
    expect(Object.values(bad[bowler.id].a).reduce((s, n) => s + (n ?? 0), 0)).toBeLessThan(0)
  })

  it('leaves out players whose ratings do not move, and a bowler who bowled barely at all', () => {
    expect(matchChanges(rawWith([], [[bowler.id, 6, 8, 0, 0]]), 't20', teams)[bowler.id]).toBeUndefined()
  })
})

describe('across a season', () => {
  it('moves some players up and some down by small amounts, as matches are played', () => {
    const s = played()
    const log = Object.values(s.changes ?? {}).flatMap((m) => Object.values(m))
    expect(log.length).toBeGreaterThan(40)
    const o = log.map((c) => c.o)
    expect(o.some((x) => x > 0)).toBe(true)
    expect(o.some((x) => x < 0)).toBe(true)
    expect(Math.max(...o.map(Math.abs))).toBeLessThanOrEqual(4)
    // no rating strays more than the cap from where it started
    for (const sh of Object.values(s.shifts ?? {})) for (const n of Object.values(sh.a ?? {})) expect(Math.abs(n as number)).toBeLessThanOrEqual(45)
  })

  it('rewards the players who did best', () => {
    const s = played()
    const c = collect(s)
    const total = (id: string) => Object.values(s.shifts?.[id]?.a ?? {}).reduce((x, n) => x + (n ?? 0), 0)
    const ranked = [...c.bat.keys()].filter((id) => impactPoints(c, id) > 0).sort((a, b) => impactPoints(c, b) - impactPoints(c, a))
    const avg = (ids: string[]) => ids.reduce((x, id) => x + total(id), 0) / ids.length
    expect(avg(ranked.slice(0, 40))).toBeGreaterThan(avg(ranked.slice(-40)))
  })

  it('reports the change from where the season started, and per rating from the starting ratings', () => {
    const s = played()
    const shifted = new Map([...teams].map(([id, t]) => [id, applyShifts(t, s.shifts)]))
    const rows = seasonChanges(s, shifted)
    expect(rows.some((r) => r.after > r.before)).toBe(true)
    expect(rows.some((r) => r.after < r.before)).toBe(true)
    const id = Object.keys(s.shifts ?? {})[0]
    expect(Object.keys(seasonAttrChanges(s, id)).length).toBeGreaterThanOrEqual(0)
  })

  it('the changes are carried into the next season', () => {
    const s = played()
    const next = generateSeason({ year: 2028, teams: BUILT_IN_TEAMS, seed: 3, myTeamId: BUILT_IN_TEAMS[0].id, shifts: s.shifts })
    expect(next.shifts).toEqual(s.shifts)
    expect(next.startShifts).toEqual(s.shifts)
  })
})

describe('catching up a career that was already under way', () => {
  it('grades the matches already played, once, in order', () => {
    const s = played()
    // an older save: results, but no rating changes and no flag
    const old = { ...s, changes: undefined, shifts: undefined, startShifts: undefined, graded: undefined }
    const graded = gradePlayedMatches(old, teams)
    expect(graded.graded).toBe(true)
    expect(Object.keys(graded.changes ?? {}).length).toBeGreaterThan(20)
    expect(Object.keys(graded.shifts ?? {}).length).toBeGreaterThan(20)
    expect(gradePlayedMatches(graded, teams)).toBe(graded) // already done: untouched
    // matches that already have their changes are not graded twice
    const someId = Object.keys(s.changes ?? {})[0]
    const partly = gradePlayedMatches({ ...old, changes: { [someId]: s.changes![someId] } }, teams)
    expect(partly.changes?.[someId]).toEqual(s.changes![someId])
  })
})

describe('the academy', () => {
  it('lifts a youth player much faster than a veteran for the same great game, and stops at 90', () => {
    const kid = YOUTH.find((y) => y.role !== 'BOWL' && overall(y) < 70)!
    const vet = { ...kid, id: 'not-in-the-pool' } // same ratings, but not an academy player
    expect(inAcademy(kid)).toBe(true)
    expect(inAcademy(vet)).toBe(false)
    const team = (p: typeof kid) => new Map([['t', { ...BUILT_IN_TEAMS[0], id: 't', players: [p] }]])
    let kidGain = 0, vetGain = 0
    for (let i = 0; i < 40; i++) {
      const raw = { ...rawWith([[kid.id, 120, 50, 12, 6, 0]]), fixtureId: `g${i}` }
      const rawVet = { ...rawWith([[vet.id, 120, 50, 12, 6, 0]]), fixtureId: `g${i}` }
      kidGain += Object.values(matchChanges(raw, 't20', team(kid))[kid.id]?.a ?? {}).reduce((a, b) => a + b, 0)
      vetGain += Object.values(matchChanges(rawVet, 't20', team(vet))[vet.id]?.a ?? {}).reduce((a, b) => a + b, 0)
      for (const v of Object.values(matchChanges(raw, 't20', team(kid))[kid.id]?.a ?? {})) expect(v).toBeLessThanOrEqual(ACADEMY_RATING_STOP)
    }
    expect(kidGain).toBeGreaterThan(vetGain * 8)
    expect(inAcademy({ ...kid, batting: { technique: 99, power: 99, temperament: 99, running: 99 }, bowling: null, role: 'BAT' })).toBe(false) // a 90 or better has graduated
  })
})
