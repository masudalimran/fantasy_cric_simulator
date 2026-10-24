import { beforeEach, describe, expect, it } from 'vitest'
import { BUILT_IN_TEAMS } from '../data/teams'
import { Match } from '../engine/match'
import { useStore } from '../store/useStore'
import { BOOST_EVERY, BOOST_MULT, boostAllowed, boostSummary, careerWins } from './boost'
import type { Season } from './types'

const wins = (my: string, n: number, other = 0) => ({
  myTeamId: my,
  results: { ...Object.fromEntries(Array.from({ length: n }, (_, i) => [`w${i}`, { fixtureId: `w${i}`, winnerId: my }])), ...Object.fromEntries(Array.from({ length: other }, (_, i) => [`l${i}`, { fixtureId: `l${i}`, winnerId: 'someone-else' }])) },
}) as unknown as Season

describe('boost tokens', () => {
  it('are earned for every five wins across all the years, on Easy and Normal only', () => {
    expect(careerWins([wins('a', 3), wins('a', 4, 6)])).toBe(7)
    const b = boostSummary([wins('a', 3), wins('a', 4)], undefined, 'normal')
    expect(b.earned).toBe(1)
    expect(b.available).toBe(1)
    expect(b.toNext).toBe(BOOST_EVERY - 2)
    expect(boostSummary([wins('a', 11)], { used: 1, armed: true }, 'easy').available).toBe(1)
    expect(boostSummary([wins('a', 30)], undefined, 'hard').available).toBe(0)
    expect(boostSummary([wins('a', 30)], undefined, 'legend').allowed).toBe(false)
    expect(boostAllowed('normal') && boostAllowed('easy')).toBe(true)
    // an armed token that has been used up is not armed any more
    expect(boostSummary([wins('a', 5)], { used: 1, armed: true }, 'normal').armed).toBe(false)
  })

  it('make the boosted side far stronger without touching anyone\'s ratings', () => {
    let won = 0, n = 0
    for (let seed = 1; seed <= 30; seed++) {
      const A = BUILT_IN_TEAMS[seed % 20], B = BUILT_IN_TEAMS[(seed * 7 + 3) % 20]
      if (A.id === B.id) continue
      const before = JSON.stringify(A.players.map((p) => p.batting))
      const m = new Match({ teamA: A, teamB: B, format: 't20', seed, career: { myTeamId: A.id, difficulty: 'normal', boost: BOOST_MULT } })
      m.playMatch()
      n++
      if (m.result?.winnerSide === m.mySide) won++
      expect(m.boostedSide).toBe(m.mySide)
      expect(JSON.stringify(A.players.map((p) => p.batting))).toBe(before)
    }
    expect(won / n).toBeGreaterThan(0.9)
    const plain = new Match({ teamA: BUILT_IN_TEAMS[0], teamB: BUILT_IN_TEAMS[1], format: 't20', seed: 3, career: { myTeamId: BUILT_IN_TEAMS[0].id, difficulty: 'normal' } })
    expect(plain.boostedSide).toBeNull()
  })
})

describe('using a boost token', () => {
  beforeEach(() => useStore.setState({ customTeams: [], overrides: {}, sessions: [], activeSessionId: null, liveMatch: null }))

  it('is armed from the squad screen, can be changed on the toss screen and is spent only when the coin is flipped', () => {
    const my = BUILT_IN_TEAMS[0]
    const id = useStore.getState().createSession({ name: 'B', year: 2026, teams: BUILT_IN_TEAMS, seed: 3, myTeamId: my.id, difficulty: 'normal' })
    const give = (n: number) => useStore.setState((st) => ({ sessions: st.sessions.map((x) => (x.id === id ? { ...x, season: { ...x.season, results: { ...x.season.results, ...wins(my.id, n).results } } } : x)) }))
    const sum = () => { const s = useStore.getState().sessions.find((x) => x.id === id)!; return boostSummary([...(s.history ?? []), s.season], s.boost, s.season.difficulty) }
    // no tokens yet: nothing can be armed
    useStore.getState().armBoost(true)
    expect(sum().armed).toBe(false)
    give(5)
    expect(sum().available).toBe(1)
    useStore.getState().armBoost(true)
    expect(sum().armed).toBe(true)
    const fx = useStore.getState().sessions.find((x) => x.id === id)!.season.fixtures.find((f) => f.homeId === my.id || f.awayId === my.id)!
    const teamOf = (tid: string) => BUILT_IN_TEAMS.find((t) => t.id === tid)!
    useStore.getState().startLive({ format: 't20', teamA: teamOf(fx.homeId!), teamB: teamOf(fx.awayId!), seed: 5, fixtureId: fx.id, url: '/match/x' })
    // the armed token goes into the match
    expect(useStore.getState().liveMatch?.boost).toBe(true)
    // changed on the toss screen
    useStore.getState().setLiveBoost(false)
    expect(useStore.getState().liveMatch?.boost).toBe(false)
    expect(sum().armed).toBe(false)
    useStore.getState().setLiveBoost(true)
    expect(useStore.getState().liveMatch?.boost).toBe(true)
    expect(sum().available).toBe(1) // not spent yet
    useStore.getState().setTossed()
    expect(sum().available).toBe(0)
    expect(sum().armed).toBe(false)
    // after the coin the choice is locked
    useStore.getState().setLiveBoost(false)
    expect(useStore.getState().liveMatch?.boost).toBe(true)
    useStore.getState().discardLive()
  })
})
