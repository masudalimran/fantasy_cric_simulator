import { describe, expect, it } from 'vitest'
import { BUILT_IN_TEAMS } from '../data/teams'
import { Match } from '../engine/match'
import { buildScript, type Pundit } from './studio'

const pool: Pundit[] = BUILT_IN_TEAMS.flatMap((t) => t.players.slice(0, 3).map((player) => ({ player, team: t })))
const play = (seed: number, format: 't20' | 'odi' | 'test' = 't20') => { const m = new Match({ teamA: BUILT_IN_TEAMS[2], teamB: BUILT_IN_TEAMS[9], format, seed }); m.playMatch(); return m }

describe('the studio show script', () => {
  it('is a real conversation: a host and two experts, no gaps in the words, several clips', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const m = play(seed)
      for (const kind of ['innings', 'end'] as const) {
        const s = buildScript(m, kind, seed, pool)
        expect(s.cast).toHaveLength(3)
        expect(new Set(s.cast.map((c) => c.player.id)).size).toBe(3)
        expect(s.cast.every((c) => !m.sides.some((side) => side.team.id === c.team.id))).toBe(true)
        expect(s.beats.length).toBeGreaterThanOrEqual(8)
        expect(new Set(s.beats.map((b) => b.who)).size).toBe(3)
        for (const b of s.beats) { expect(b.text).not.toMatch(/[{}]|undefined|NaN/); expect(b.text.length).toBeGreaterThan(8) }
        expect(s.beats.filter((b) => b.clip).length).toBeGreaterThanOrEqual(3)
        expect(s.beats[0].who).toBe(0)
        expect(s.beats[s.beats.length - 1].who).toBe(0)
      }
    }
  })

  it('goes through the batsmen top to bottom, then the bowlers, with figures on the TV', () => {
    const m = play(4)
    const s = buildScript(m, 'innings', 4, pool)
    const stats = s.beats.filter((b) => b.clip?.kind === 'stat')
    const bats = stats.filter((b) => b.clip?.kind === 'stat' && b.clip.as === 'bat')
    const bowls = stats.filter((b) => b.clip?.kind === 'stat' && b.clip.as === 'bowl')
    expect(bats.length).toBeGreaterThanOrEqual(3)
    expect(bowls.length).toBeGreaterThanOrEqual(3)
    expect(s.beats.indexOf(bats[bats.length - 1])).toBeLessThan(s.beats.indexOf(bowls[0]))
    // the batsmen come in batting order
    const order = m.innings[0].batters.map((b) => b.id)
    const seen = bats.map((b) => (b.clip as { playerId: string }).playerId).map((id) => order.indexOf(id))
    expect([...seen].sort((a, b) => a - b)).toEqual(seen)
  })

  it('does not read alike: different matches give different words, and no line repeats inside one show', () => {
    const texts = new Set<string>()
    for (let seed = 1; seed <= 30; seed++) for (const b of buildScript(play(seed), seed % 2 ? 'innings' : 'end', seed, pool).beats) texts.add(b.text)
    expect(texts.size).toBeGreaterThan(300)
    const s = buildScript(play(7), 'end', 7, pool)
    expect(new Set(s.beats.map((b) => b.text)).size).toBe(s.beats.length)
  })

  it('is the same show for the same match, and handles a Test', () => {
    const m = play(3)
    expect(buildScript(m, 'innings', 3, pool).beats.map((b) => b.text)).toEqual(buildScript(m, 'innings', 3, pool).beats.map((b) => b.text))
    const t = play(5, 'test')
    for (const kind of ['innings', 'stumps', 'end'] as const) expect(buildScript(t, kind, 5, pool).beats.length).toBeGreaterThanOrEqual(8)
  })

  it('brings the season form of a player who had a very good or very bad game', () => {
    const m = play(11)
    const s = buildScript(m, 'end', 11, pool, { form: () => ({ bat: { innings: 5, runs: 120, average: 24, sr: 130, recent: ['10', '30*'] }, bowl: { matches: 5, wickets: 4, economy: 8, recent: ['1/30'] } }) })
    expect(s.beats.some((b) => b.clip?.kind === 'card' && b.clip.title === 'FORM GUIDE')).toBe(true)
  })

  it('the form guide also covers earlier years of the career', () => {
    const m = play(11)
    const past = { years: 2, bat: { innings: 30, runs: 900, average: 31, high: 104, fifties: 5, hundreds: 1 }, bowl: { matches: 20, wickets: 25, economy: 7.4, bestW: 4, bestR: 22 } }
    const s = buildScript(m, 'end', 11, pool, { form: () => ({ past }) })
    const cards = s.beats.filter((b) => b.clip?.kind === 'card' && b.clip.title === 'FORM GUIDE')
    expect(cards.length).toBeGreaterThan(0)
    expect(cards.some((b) => b.clip?.kind === 'card' && b.clip.lines.some((l) => l.startsWith('Earlier years')))).toBe(true)
  })

  it('quiet performances are wrapped up in short group lines, so the show stays short', () => {
    let grouped = 0
    for (let seed = 1; seed <= 20; seed++) for (const b of buildScript(play(seed), 'innings', seed, pool).beats) if (b.clip?.kind === 'card' && ['SMALL KNOCKS', 'THE TAIL', 'SUPPORTING BOWLERS'].includes(b.clip.title)) grouped++
    expect(grouped).toBeGreaterThan(10)
    for (let seed = 1; seed <= 20; seed++) expect(buildScript(play(seed), 'innings', seed, pool).beats.length).toBeLessThan(30)
  })
})
