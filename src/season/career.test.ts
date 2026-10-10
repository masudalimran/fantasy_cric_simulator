import { describe, expect, it } from 'vitest'
import { BUILT_IN_TEAMS } from '../data/teams'
import { generateSeason } from './generate'
import { buildReview } from './review'
import { isMine, myNextFixture, nextMatchDate, seasonComplete, simDay, simUntil, simulateFixture, recordResult } from './results'
import type { Season } from './types'

const teams = new Map(BUILT_IN_TEAMS.map((t) => [t.id, t]))
const ME = BUILT_IN_TEAMS[2].id
const make = (seed = 4, difficulty: 'easy' | 'normal' | 'hard' | 'legend' = 'hard') => generateSeason({ year: 2027, teams: BUILT_IN_TEAMS, seed, myTeamId: ME, difficulty })

/** Plays the whole year, simming the player's own matches too. */
function playAll(season: Season): Season {
  let s = season
  for (let g = 0; g < 800; g++) {
    const d = nextMatchDate(s)
    if (!d) return s
    s = simDay(s, d, teams)
  }
  throw new Error('did not finish')
}

describe('career mode seasons', () => {
  it('remembers your team and the difficulty, and defaults sensibly', () => {
    const s = make()
    expect(s.myTeamId).toBe(ME)
    expect(s.difficulty).toBe('hard')
    const plain = generateSeason({ year: 2027, teams: BUILT_IN_TEAMS, seed: 1 })
    expect(plain.myTeamId).toBeNull()
    expect(plain.difficulty).toBe('normal')
    // a team that isn't in the competition can't be yours
    expect(generateSeason({ year: 2027, teams: BUILT_IN_TEAMS.slice(0, 6), seed: 1, myTeamId: 'nobody' }).myTeamId).toBeNull()
  })

  it('stops a sim at your next match and leaves it for you to play', () => {
    const s = make()
    const first = myNextFixture(s)!
    expect(first).toBeTruthy()
    expect(isMine(s, first)).toBe(true)
    const r = simUntil(s, '2027-12-31', teams)
    expect(r.stoppedAt?.id).toBe(first.id)
    expect(r.season.results[first.id]).toBeUndefined() // not played for you
    expect(r.season.today).toBe(first.date)
    // everything before it was simulated, other teams' matches on that day included
    for (const f of r.season.fixtures) if (f.date < first.date && f.homeId && f.awayId) expect(r.season.results[f.id]).toBeDefined()
    for (const f of r.season.fixtures) if (f.date === first.date && f.id !== first.id && f.homeId && f.awayId && !isMine(r.season, f)) expect(r.season.results[f.id]).toBeDefined()
    // once you've played it, the next sim carries on to the match after
    const after = recordResult(r.season, simulateFixture(r.season, first, teams))
    const r2 = simUntil(after, '2027-12-31', teams)
    const second = myNextFixture(after)!
    expect(r2.stoppedAt?.id).toBe(second.id)
    expect(second.date >= first.date).toBe(true)
  })

  it('does not stop for matches beyond the date you asked for', () => {
    const s = make()
    const first = myNextFixture(s)!
    const before = new Date(Date.parse(first.date) - 3 * 86400000).toISOString().slice(0, 10)
    const r = simUntil(s, before, teams)
    expect(r.stoppedAt).toBeNull()
    expect(r.season.today).toBe(before)
    expect(r.season.results[first.id]).toBeUndefined()
  })

  it('reviews the year for your team and adds up', () => {
    const done = playAll(make(7, 'normal'))
    expect(seasonComplete(done)).toBe(true)
    const rv = buildReview(done, teams)!
    expect(rv.teamId).toBe(ME)
    expect(rv.year).toBe(2027)
    expect(rv.difficulty).toBe('normal')
    expect(rv.won + rv.lost + rv.tied).toBe(rv.played)
    const mine = done.fixtures.filter((f) => isMine(done, f))
    expect(rv.played).toBe(mine.length)
    expect(rv.rank).toBeGreaterThanOrEqual(1)
    expect(rv.rank).toBeLessThanOrEqual(rv.teams)
    expect(rv.table).toHaveLength(5)
    expect(rv.players).toHaveLength(teams.get(ME)!.players.length)
    expect(rv.players.reduce((s, p) => s + (p.bat?.runs ?? 0), 0)).toBeGreaterThan(500)
    expect(rv.players.reduce((s, p) => s + p.potm, 0)).toBeLessThanOrEqual(rv.played) // one award per match, some go to opponents
    // titles listed are tournaments this team actually won
    for (const t of rv.titles) expect(done.competitions.some((c) => c.name === t)).toBe(true)
  })

  it('has no review without a team of your own', () => {
    expect(buildReview(playAll(generateSeason({ year: 2027, teams: BUILT_IN_TEAMS, seed: 2 })), teams)).toBeNull()
  })

  it('makes your matches harder as difficulty goes up', () => {
    const winRate = (d: 'easy' | 'legend') => {
      let won = 0, played = 0
      for (let seed = 1; seed <= 4; seed++) {
        const s = playAll(make(seed, d))
        const rv = buildReview(s, teams)!
        won += rv.won
        played += rv.played
      }
      return won / played
    }
    expect(winRate('easy')).toBeGreaterThan(winRate('legend') + 0.08)
  }, 120_000)
})
