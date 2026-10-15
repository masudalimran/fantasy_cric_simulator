import { describe, expect, it } from 'vitest'
import { buildRecap, milestonesReached, winsOf } from './recap'
import type { PlayerReview, Season, SeasonReview } from './types'

const pr = (id: string, runs: number, wkts = 0): PlayerReview => ({ id, name: id.toUpperCase(), matches: 10, bat: runs ? { innings: 10, runs, balls: runs, high: 50, highNotOut: false, fifties: 1, hundreds: 0, fours: 5, sixes: 2, notOuts: 0 } : null, bowl: wkts ? { balls: 60, runs: 50, wickets: wkts, best: '3/12', fiveW: 0, maidens: 1 } : null, potm: 0, impact: 0 })
const review = (year: number, players: PlayerReview[], extra: Partial<SeasonReview> = {}): SeasonReview => ({ year, difficulty: 'normal', teamId: 'me', teamName: 'Me', played: 10, won: 7, lost: 3, tied: 0, rank: 2, teams: 8, titles: [], players, table: [], finishedAt: '', ...extra })

describe('season recap', () => {
  it('finds career milestones crossed this season only', () => {
    const past = [review(2026, [pr('a', 800, 20), pr('b', 100)])]
    const now = review(2027, [pr('a', 300, 10), pr('b', 50)])
    const m = milestonesReached(past, now)
    expect(m.map((x) => x.text).sort()).toEqual(['1,000 career runs', '25 career wickets'].sort())
    expect(m.every((x) => x.playerId === 'a')).toBe(true)
  })
  it('finds the biggest and narrowest wins by runs', () => {
    const f = (id: string, h: string, a: string) => ({ id, homeId: h, awayId: a })
    const res = (id: string, mine: number, opp: number) => [id, { fixtureId: id, winnerId: 'me', margin: 'runs', text: `won ${id}`, scores: { me: { runs: mine }, x: { runs: opp } } }] as const
    const season = { myTeamId: 'me', fixtures: [f('1', 'me', 'x'), f('2', 'x', 'me'), f('3', 'me', 'x')], results: Object.fromEntries([res('1', 150, 100), res('2', 120, 119), res('3', 180, 90)]) } as unknown as Season
    const w = winsOf(season)
    expect(w.biggest?.by).toBe(90)
    expect(w.narrowest?.by).toBe(1)
  })
  it('builds the pages that apply', () => {
    const season = { myTeamId: 'me', fixtures: [], results: {} } as unknown as Season
    const cards = buildRecap(season, review(2027, [pr('a', 400, 12)], { titles: ['Cup'] }), [], (id) => id)
    expect(cards.map((c) => c.kind)).toEqual(['intro', 'titles', 'bat', 'bowl'])
    expect(cards[0].lines[0]).toBe('Me finished 2nd of 8')
  })
})
