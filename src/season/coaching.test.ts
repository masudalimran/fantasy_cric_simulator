import { describe, expect, it } from 'vitest'
import { COACHES } from '../data/coaches'
import { BUILT_IN_TEAMS } from '../data/teams'
import { advanceCoaching, assignCoaches, canChange, coachBoard, cpuCoachingMissing, startCpuCoaching, coachingOf, LOCK_DAYS, monthReport, needsFocus, seasonBoost, setFocus } from './coaching'
import { addDays } from './dates'
import { generateSeason } from './generate'
import { playerIndex } from './market'
import type { Season } from './types'

const base = () => generateSeason({ year: 2030, teams: BUILT_IN_TEAMS, seed: 99, myTeamId: 'bleach' })
const idx = (s: Season) => () => playerIndex(BUILT_IN_TEAMS, s.market)
const run = (s: Season, days: number) => advanceCoaching(s, { ...s, today: addDays(s.today, days) }, idx(s))

describe('coaches', () => {
  it('are all different games\' characters with unique ids', () => {
    expect(COACHES.length).toBeGreaterThan(50)
    expect(new Set(COACHES.map((c) => c.id)).size).toBe(COACHES.length)
  })

  it('every team in a career gets a different coach', () => {
    const s = base()
    const ids = Object.values(s.coaches!)
    expect(ids).toHaveLength(BUILT_IN_TEAMS.length)
    expect(new Set(ids).size).toBe(ids.length)
    expect(assignCoaches(s.teamIds, 99, s.coaches)).toEqual(s.coaches) // keeping what they have
  })

  it('every team gets a different coach each new year, and you are asked for a new instruction', () => {
    let s = setFocus(base(), 'bleach', 'batting', '2030-01-01')
    expect(s.coachChanged).toBeFalsy()
    const next = generateSeason({ year: 2031, teams: BUILT_IN_TEAMS, seed: 5, myTeamId: 'bleach', previousCoaches: s.coaches, market: s.market })
    for (const t of BUILT_IN_TEAMS) expect(next.coaches![t.id]).not.toBe(s.coaches![t.id])
    expect(new Set(Object.values(next.coaches!)).size).toBe(BUILT_IN_TEAMS.length)
    expect(next.coachChanged).toBe(true)
    expect(needsFocus(next)).toBe(true) // yours starts empty
    expect(coachingOf(next, 'naruto').focus).not.toBeNull() // the computer's start straight away
    s = setFocus(next, 'bleach', 'bowling', next.today)
    expect(s.coachChanged).toBe(false)
  })

  it('you must give an instruction, and it stands for at least a month', () => {
    let s = base()
    expect(needsFocus(s)).toBe(true)
    s = setFocus(s, 'bleach', 'bowling', s.today)
    expect(needsFocus(s)).toBe(false)
    const c = coachingOf(s, 'bleach')
    expect(c.focus).toBe('bowling')
    expect(canChange(c, addDays(s.today, LOCK_DAYS - 1))).toBe(false)
    expect(canChange(c, addDays(s.today, LOCK_DAYS))).toBe(true)
    // too early: the change is ignored
    expect(setFocus(s, 'bleach', 'batting', addDays(s.today, 5)).coaching!.bleach.focus).toBe('bowling')
    expect(setFocus(s, 'bleach', 'batting', addDays(s.today, 31)).coaching!.bleach.focus).toBe('batting')
  })

  it('players slowly improve in what the coach works on, and the report adds up to the ratings', () => {
    let s = setFocus(base(), 'bleach', 'batting', '2030-01-01')
    s = run(s, 90)
    const months = Object.keys(s.coachReport ?? {})
    const gained = months.flatMap((m) => monthReport(s, 'bleach', m))
    expect(gained.length).toBeGreaterThan(0)
    const total = seasonBoost(s, 'bleach').total
    expect(total).toBeGreaterThan(5)
    expect(total).toBeLessThan(260) // slow: a few points a squad member over three months, not a new team
    // every point is in the shifts too
    const shiftTotal = Object.entries(s.shifts ?? {}).filter(([id]) => s.market!.squads.bleach.includes(id)).reduce((n, [, sh]) => n + Object.values(sh.a ?? {}).reduce((x, y) => x + (y ?? 0), 0), 0)
    expect(shiftTotal).toBe(total)
    // only batting ratings moved
    for (const g of gained) for (const k of Object.keys(g.attrs)) expect(['technique', 'power', 'temperament', 'running']).toContain(k)
  })

  it('every computer team has an instruction from the very first day, and yours waits for you', () => {
    const s = base()
    for (const t of BUILT_IN_TEAMS.filter((x) => x.id !== 'bleach')) { const c = coachingOf(s, t.id); expect(c.focus).not.toBeNull(); expect(c.since).toBe(s.today); expect(c.lockedUntil).toBe(addDays(s.today, LOCK_DAYS)) }
    expect(coachingOf(s, 'bleach').focus).toBeNull()
  })

  it('a career saved before the computer had instructions is brought up to date', () => {
    const old: Season = { ...base(), coaching: undefined }
    expect(cpuCoachingMissing(old)).toBe(true)
    const fixed = startCpuCoaching(old, playerIndex(BUILT_IN_TEAMS, old.market))
    expect(cpuCoachingMissing(fixed)).toBe(false)
    expect(coachingOf(fixed, 'bleach').focus).toBeNull() // still yours to set
  })

  it('the computer sets instructions for its teams and every team trains', () => {
    const s = run(base(), 40)
    for (const t of BUILT_IN_TEAMS.filter((x) => x.id !== 'bleach')) expect(coachingOf(s, t.id).focus).not.toBeNull()
    expect(coachingOf(s, 'bleach').focus).toBeNull() // yours is only ever set by you
    expect(seasonBoost(s, 'bleach').total).toBe(0)
    const board = coachBoard(s)
    expect(board).toHaveLength(BUILT_IN_TEAMS.length)
    expect(board[0].total).toBeGreaterThan(0)
    for (let i = 1; i < board.length; i++) expect(board[i - 1].total).toBeGreaterThanOrEqual(board[i].total)
  })

  it('no rating gains more than 5 points from coaching in a year', () => {
    let s = setFocus(base(), 'bleach', 'fielding', '2030-01-01')
    for (let m = 0; m < 11; m++) s = run(s, 30)
    for (const g of monthReport(s, 'bleach', '2030-06')) expect(g.total).toBeLessThanOrEqual(5)
    const perPlayer = new Map<string, number>()
    for (const byTeam of Object.values(s.coachReport ?? {})) for (const [pid, attrs] of Object.entries(byTeam.bleach ?? {})) perPlayer.set(pid, (perPlayer.get(pid) ?? 0) + (attrs.fielding ?? 0))
    for (const n of perPlayer.values()) expect(n).toBeLessThanOrEqual(5)
  })
})
