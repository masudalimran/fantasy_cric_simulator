import { describe, expect, it } from 'vitest'
import { BUILT_IN_TEAMS } from '../data/teams'
import { edgeText, formOf, headToHead, keyPlayers, rivalryLine } from './preview'
import type { Season } from './types'

const fx = (id: string, date: string, home: string, away: string) => ({ id, date, homeId: home, awayId: away })
const res = (id: string, winnerId: string | null) => [id, { fixtureId: id, winnerId }] as const
const season = (fixtures: ReturnType<typeof fx>[], results: (readonly [string, { fixtureId: string; winnerId: string | null }])[]) =>
  ({ fixtures, results: Object.fromEntries(results) }) as unknown as Season

describe('match preview data', () => {
  const s = season(
    [fx('1', '2026-01-02', 'A', 'B'), fx('2', '2026-01-05', 'B', 'A'), fx('3', '2026-01-09', 'A', 'B'), fx('4', '2026-01-12', 'A', 'C'), fx('5', '2026-01-20', 'B', 'A')],
    [res('1', 'A'), res('2', 'A'), res('3', 'A'), res('4', null)],
  )
  it('form is the latest results, oldest first', () => {
    expect(formOf([s], 'A').map((m) => m.result)).toEqual(['W', 'W', 'W', 'T'])
    expect(formOf([s], 'A', 2).map((m) => m.vs)).toEqual(['B', 'C'])
  })
  it('head to head counts both ways round and finds the streak', () => {
    const h = headToHead([s], 'A', 'B')
    expect(h).toMatchObject({ aWins: 3, bWins: 0, ties: 0, streak: { who: 'a', n: 3 } })
    expect(headToHead([s], 'B', 'A').bWins).toBe(3)
    expect(rivalryLine(h, 'Aa', 'Bb')).toBe('Aa have won the last 3 meetings.')
    expect(rivalryLine(headToHead([s], 'A', 'Z'), 'Aa', 'Zz')).toBeNull()
  })
  it('names the key players and the edge', () => {
    const t = BUILT_IN_TEAMS[0]
    const k = keyPlayers(t.players.slice(0, 11))
    expect(k.bat).toBeTruthy()
    expect(k.bowl?.bowling).toBeTruthy()
    expect(k.bat?.id).not.toBe(k.bowl?.id)
    expect(edgeText('X', 80, 'Y', 79)).toMatch(/Evenly/)
    expect(edgeText('X', 70, 'Y', 80)).toMatch(/Y are clear favourites/)
  })
})
