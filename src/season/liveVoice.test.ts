import { describe, expect, it } from 'vitest'
import { BUILT_IN_TEAMS } from '../data/teams'
import { Match } from '../engine/match'
import { liveLines } from './liveVoice'

describe('live commentary lines', () => {
  it('gives every ball a line, big moments a second voice, and the same words every time', () => {
    const m = new Match({ teamA: BUILT_IN_TEAMS[2], teamB: BUILT_IN_TEAMS[9], format: 't20', seed: 6 })
    m.playMatch()
    let two = 0, total = 0
    for (const inn of m.innings) for (const ev of inn.log) {
      const names = { striker: m.player(ev.strikerId).name, bowler: m.player(ev.bowlerId).name, out: ev.wicket ? m.player(ev.wicket.playerId).name : undefined, fielder: ev.wicket?.fielderId ? m.player(ev.wicket.fielderId).name : undefined }
      const a = liveLines(ev, names)
      expect(a).toEqual(liveLines(ev, names))
      expect(a[0].role).toBe('pbp')
      for (const l of a) expect(l.text).not.toMatch(/undefined|NaN|[{}]|kilometres|km\/h/i)
      if (ev.wicket || ev.boundary === 6) expect(a.length).toBe(2)
      total++
      if (a.length === 2) two++
    }
    expect(two).toBeGreaterThan(0)
    expect(two).toBeLessThan(total / 2)
  })
})
