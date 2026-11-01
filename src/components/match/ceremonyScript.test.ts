import { describe, expect, it } from 'vitest'
import { CEREMONY_BEATS, ceremonyScript, lineAt, type CeremonyCtx } from './ceremonyScript'

const ctx = (o: Partial<CeremonyCtx> = {}): CeremonyCtx => ({ host: 'Aiko', winTeam: 'Universe 7 Warriors', loseTeam: 'Soul Reapers', winCaptain: 'Goku', loseCaptain: 'Ichigo', motm: 'Vegeta', motmIsCaptain: false, result: 'won by 24 runs', margin: 'normal', winnersChased: false, motmDeed: '71 off 40 balls', motmWith: 'bat', prize: '5,000 coins', seed: 5, ...o })

describe('the post-match ceremony script', () => {
  it('the host speaks to both captains, calls the Man of the Match, hands over the prize, and each answers', () => {
    const lines = ceremonyScript(ctx())
    expect(lines.map((l) => l.who)).toEqual(['host', 'host', 'win', 'host', 'lose', 'host', 'host', 'motm', 'host'])
    const text = lines.map((l) => l.text).join(' | ')
    expect(text).toContain('Goku')
    expect(text).toContain('Ichigo')
    expect(text).toContain('Vegeta')
    expect(text).toContain('71 off 40 balls')
    expect(text).toContain('5,000 coins')
    expect(text).toContain('24 runs')
  })
  it('the lines come one after another in time order, and none overlaps the next', () => {
    for (let seed = 1; seed <= 30; seed++) for (const margin of ['big', 'close', 'tie', 'normal'] as const) {
      const lines = ceremonyScript(ctx({ seed, margin, winnersChased: seed % 2 === 0, motmWith: (['bat', 'ball', 'both'] as const)[seed % 3] }))
      for (let i = 0; i < lines.length; i++) { expect(lines[i].end).toBeGreaterThan(lines[i].at); expect(lines[i].text.length).toBeGreaterThan(10); if (i) expect(lines[i].at).toBeGreaterThanOrEqual(lines[i - 1].at) }
      expect(lines[lines.length - 1].end).toBeLessThanOrEqual(CEREMONY_BEATS.end)
    }
  })
  it('says different things for different matches and the same for the same one; a tie, a close one and a big win sound different', () => {
    const a = ceremonyScript(ctx({ seed: 1 })).map((l) => l.text).join(), b = ceremonyScript(ctx({ seed: 1 })).map((l) => l.text).join()
    expect(a).toBe(b)
    const variants = new Set(Array.from({ length: 40 }, (_, i) => ceremonyScript(ctx({ seed: i + 1 })).map((l) => l.text).join()))
    expect(variants.size).toBeGreaterThan(8)
    expect(ceremonyScript(ctx({ margin: 'tie' }))[1].text).toMatch(/separated/)
    expect(ceremonyScript(ctx({ margin: 'close', seed: 2 }))[2].text).toMatch(/nerve|nervy|either way/)
  })
  it('finds the line being said at a moment, and none in the gaps', () => {
    const lines = ceremonyScript(ctx())
    expect(lineAt(lines, 0)).toBeNull()
    expect(lineAt(lines, CEREMONY_BEATS.win + 0.5)!.who).toBe('host')
    expect(lineAt(lines, CEREMONY_BEATS.win + 5)!.who).toBe('win')
  })
})
