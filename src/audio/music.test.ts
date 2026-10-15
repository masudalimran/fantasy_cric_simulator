import { describe, expect, it } from 'vitest'
import { TRACKS, pickTrack, startMusic } from './music'
import { cheersAfter, pickReel, type ReelHighlight } from '../season/moments'

describe('timeout music', () => {
  it('has a few tunes and never repeats the last one', () => {
    expect(TRACKS.length).toBeGreaterThanOrEqual(3)
    let prev = pickTrack()
    const seen = new Set([prev])
    for (let i = 0; i < 60; i++) { const n = pickTrack(); expect(n).not.toBe(prev); seen.add(n); prev = n }
    expect(seen.size).toBe(TRACKS.length)
  })
  it('does nothing (and does not throw) when there is no audio', () => {
    const m = startMusic(30)
    expect(typeof m.name).toBe('string')
    expect(() => m.stop()).not.toThrow()
  })
})

describe('timeout highlight variety', () => {
  const mk = (id: string): ReelHighlight => ({ fixtureId: id, playerId: 'p' + id, kind: 'bat', headline: '50 (30)', detail: '', homeId: null, awayId: null, date: '2026-01-01', balls: [] })
  it('uses every reel once before repeating one', () => {
    const cands = ['a', 'b', 'c', 'd'].map(mk)
    const used = new Set<string>()
    const picks = Array.from({ length: 4 }, (_, i) => pickReel(cands, used, 100 + i)!.fixtureId)
    expect(new Set(picks).size).toBe(4)
    expect(pickReel(cands, used, 999)).not.toBeNull() // starts over once all have been shown
    expect(pickReel([], used, 1)).toBeNull()
  })
  it('different timeouts of one match get different reels', () => {
    const cands = Array.from({ length: 10 }, (_, i) => mk(String(i)))
    const used = new Set<string>()
    const a = pickReel(cands, used, 7)!.fixtureId
    const b = pickReel(cands, used, 8)!.fixtureId
    expect(a).not.toBe(b)
  })
  it('the cheerleaders come out after roughly a third of boundaries and wickets', () => {
    const n = Array.from({ length: 900 }, (_, i) => cheersAfter(i + 1)).filter(Boolean).length
    expect(n).toBeGreaterThan(220)
    expect(n).toBeLessThan(400)
  })
})
