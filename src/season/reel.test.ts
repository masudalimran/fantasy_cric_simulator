import { describe, expect, it } from 'vitest'
import { BUILT_IN_TEAMS } from '../data/teams'
import { Match } from '../engine/match'
import { buildReel, decodeBall, encodeBall, REEL_MAX, synthesizeBat, toEvent } from './reel'
import { recentReel } from './moments'
import type { Season } from './types'

describe('highlight reels', () => {
  const [A, B] = BUILT_IN_TEAMS
  const play = (seed: number) => { const m = new Match({ teamA: A, teamB: B, format: 't20', seed }); m.playMatch(); return m }

  it('a ball survives being packed into one number', () => {
    const m = play(3)
    for (const e of m.events.slice(0, 200)) {
      const d = decodeBall(encodeBall(e))
      expect(d.seq).toBe(e.seq)
      expect(d.runsBat).toBe(Math.min(e.runsBat, 9))
      expect(d.wicket).toBe(e.wicket ? e.wicket.kind : null)
    }
  })

  it('picks a performance that stood out and keeps its best balls', () => {
    let found = 0
    for (let seed = 1; seed <= 25; seed++) {
      const m = play(seed)
      const reel = buildReel(m.innings)
      if (!reel) continue
      found++
      expect(reel.e.length).toBeGreaterThan(0)
      expect(reel.e.length).toBeLessThanOrEqual(REEL_MAX)
      const balls = reel.e.map(decodeBall)
      expect([...balls].sort((a, b) => a.seq - b.seq)).toEqual(balls) // in the order they happened
      expect(reel.k).toBe('bat') // only batting makes a highlight
      expect(balls.every((b) => b.runsBat >= 2)).toBe(true)
    }
    expect(found).toBeGreaterThan(15) // most matches have someone who stood out
  })

  it('plays back as ball events and is found again from the saved season', () => {
    const m = play(5)
    const reel = buildReel(m.innings)!
    const ev = decodeBall(reel.e[0])
    const e = toEvent(ev, { striker: 's', nonStriker: 'n', bowler: 'b' }, 0)
    expect(e.runsBat).toBe(ev.runsBat)
    expect(e.seq).toBe(ev.seq)
    const season = {
      roster: [reel.p],
      fixtures: [{ id: 'f1', date: '2026-01-02', homeId: 'A', awayId: 'B' }],
      results: { f1: { fixtureId: 'f1', reel: { p: 0, k: reel.k, e: reel.e }, bat: [[0, 80, 40, 7, 3, 1]], bowl: [[0, 24, 18, 3, 1]] } },
    } as unknown as Season
    const found = recentReel(season)!
    expect(found.playerId).toBe(reel.p)
    expect(found.balls).toHaveLength(reel.e.length)
    expect(recentReel(season, 'f1')).toBeNull()
    // a match without a saved reel still gives a batting highlight, rebuilt from the fours and sixes on his line
    const rebuilt = recentReel({ ...season, results: { f1: { ...season.results.f1, reel: undefined } } } as unknown as Season)!
    expect(rebuilt.kind).toBe('bat')
    expect(rebuilt.balls.filter((b) => b.runsBat === 4)).toHaveLength(7)
    expect(rebuilt.balls.filter((b) => b.runsBat === 6)).toHaveLength(3)
    expect(synthesizeBat('f1', 80, 7, 3)).toEqual(synthesizeBat('f1', 80, 7, 3))
  })
})
