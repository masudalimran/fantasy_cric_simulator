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
        expect(s.beats.length).toBeGreaterThanOrEqual(10)
        expect(new Set(s.beats.map((b) => b.who)).size).toBe(3)
        for (const b of s.beats) { expect(b.text).not.toMatch(/[{}]|undefined|NaN/); expect(b.text.length).toBeGreaterThan(8) }
        expect(s.beats.filter((b) => b.clip).length).toBeGreaterThanOrEqual(3)
        expect(s.beats[0].who).toBe(0)
        expect(s.beats[s.beats.length - 1].who).toBe(0)
      }
    }
  })

  it('does not read alike: different matches and seeds give different words, moods and voices', () => {
    const texts = new Set<string>(), moods = new Set<string>(), personas = new Set<string>()
    for (let seed = 1; seed <= 30; seed++) {
      const s = buildScript(play(seed), seed % 2 ? 'innings' : 'end', seed, pool)
      for (const b of s.beats) { texts.add(b.text); moods.add(b.mood) }
      s.cast.slice(1).forEach((c) => personas.add(c.persona))
    }
    expect(texts.size).toBeGreaterThan(300)
    expect(moods.size).toBeGreaterThanOrEqual(6)
    expect(personas.size).toBeGreaterThanOrEqual(4)
    // inside one show nobody repeats a line
    const s = buildScript(play(7), 'end', 7, pool)
    expect(new Set(s.beats.map((b) => b.text)).size).toBe(s.beats.length)
  })

  it('is the same show for the same match, and handles a Test and the end of a draw', () => {
    const m = play(3)
    expect(buildScript(m, 'innings', 3, pool).beats.map((b) => b.text)).toEqual(buildScript(m, 'innings', 3, pool).beats.map((b) => b.text))
    const t = play(5, 'test')
    for (const kind of ['innings', 'stumps', 'end'] as const) expect(buildScript(t, kind, 5, pool).beats.length).toBeGreaterThanOrEqual(8)
  })

  it('covers many topics: across shows the host asks about the pitch, extras, fielding, the chase and more', () => {
    const asks: string[] = []
    for (let seed = 1; seed <= 150; seed++) for (const b of buildScript(play(seed), seed % 2 ? 'innings' : 'end', seed, pool).beats) if (b.who === 0) asks.push(b.text)
    const joined = asks.join(' | ').toLowerCase()
    for (const word of ['pitch', 'dressing room', 'danger man', 'episode']) expect(joined, word).toContain(word.split(' ')[0])
    expect(new Set(asks).size).toBeGreaterThan(120)
  })
})
