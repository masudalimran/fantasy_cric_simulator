import { describe, expect, it } from 'vitest'
import { overall } from '../data/builders'
import { BUILT_IN_TEAMS } from '../data/teams'
import { generateSeason } from './generate'
import { applyShift, applyShifts, computeProgression, sessionTeam } from './progression'
import { nextMatchDate, simDay } from './results'
import { collect, impactPoints } from './stats'

const teams = new Map(BUILT_IN_TEAMS.map((t) => [t.id, t]))
let year: ReturnType<typeof generateSeason> | null = null
function played() {
  if (year) return year
  let s = generateSeason({ year: 2027, teams: BUILT_IN_TEAMS, seed: 12, myTeamId: BUILT_IN_TEAMS[0].id })
  for (let g = 0; g < 900; g++) { const d = nextMatchDate(s); if (!d) break; s = simDay(s, d, teams) }
  return (year = s)
}

describe('player progression', () => {
  it('adds gains and losses to the starting ratings, within 1-99', () => {
    const p = BUILT_IN_TEAMS[0].players[0]
    expect(overall(applyShift(p, { bat: 4, bowl: 0 }))).toBeGreaterThan(overall(p))
    expect(overall(applyShift(p, { bat: -4, bowl: 0 }))).toBeLessThan(overall(p))
    const huge = applyShift(p, { bat: 80, bowl: 80 })
    expect(Math.max(huge.batting.power, huge.batting.technique)).toBeLessThanOrEqual(99)
    expect(applyShift(p, { bat: -90, bowl: 0 }).batting.technique).toBeGreaterThanOrEqual(1)
    expect(applyShift(p, undefined)).toBe(p)
    expect(applyShifts(BUILT_IN_TEAMS[0], undefined)).toBe(BUILT_IN_TEAMS[0])
  })

  it('moves some players up and some down, by a few points, and is repeatable', () => {
    const s = played()
    const a = computeProgression(s, teams)
    const b = computeProgression(s, teams)
    expect(a.changes).toEqual(b.changes)
    const d = a.changes.map((c) => c.after - c.before)
    expect(d.some((x) => x > 0)).toBe(true)
    expect(d.some((x) => x < 0)).toBe(true)
    expect(Math.max(...d.map(Math.abs))).toBeLessThanOrEqual(8)
  })

  it('rewards the players who did best', () => {
    const s = played()
    const c = collect(s)
    const { changes } = computeProgression(s, teams)
    const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
    const ranked = [...changes].filter((x) => impactPoints(c, x.id) > 0).sort((a, b) => impactPoints(c, b.id) - impactPoints(c, a.id))
    const top = ranked.slice(0, 40).map((x) => x.bat + x.bowl)
    const bottom = ranked.slice(-40).map((x) => x.bat + x.bowl)
    expect(avg(top)).toBeGreaterThan(avg(bottom))
  })

  it('carries earlier years forward instead of starting over', () => {
    const s = played()
    const first = computeProgression(s, teams)
    const next = { ...s, shifts: first.shifts }
    const shifted = new Map([...teams].map(([id, t]) => [id, applyShifts(t, first.shifts)]))
    const second = computeProgression(next, shifted)
    const some = BUILT_IN_TEAMS[0].players[3].id
    expect(second.shifts[some].bat).toBe(first.shifts[some].bat + second.changes.find((x) => x.id === some)!.bat)
  })

  it('applies your session lineup to your team only, and leaves the team itself alone', () => {
    const t = BUILT_IN_TEAMS[0]
    const order = [...t.players].reverse().map((p) => p.id)
    const season = { shifts: undefined, lineup: { order, captainId: t.players[4].id }, myTeamId: t.id }
    const mine = sessionTeam(t, season)
    expect(mine.players.map((p) => p.id)).toEqual(order)
    expect(mine.captainId).toBe(t.players[4].id)
    expect(t.players[0].id).not.toBe(order[0]) // original untouched
    expect(sessionTeam(BUILT_IN_TEAMS[1], season)).toBe(BUILT_IN_TEAMS[1]) // other teams unaffected
    // a stale lineup (e.g. after a player was removed) still returns everybody
    const stale = sessionTeam(t, { ...season, lineup: { order: order.slice(3), captainId: 'nobody' } })
    expect(stale.players).toHaveLength(t.players.length)
    expect(stale.captainId).toBe(t.captainId)
  })
})
