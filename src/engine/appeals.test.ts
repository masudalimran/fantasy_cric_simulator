import { describe, expect, it } from 'vitest'
import { BUILT_IN_TEAMS } from '../data/teams'
import { Match } from './match'

describe('appeals', () => {
  it('every lbw, catch behind and run out was an appeal, and many appeals are turned down: not every one is out', () => {
    let outLbw = 0, outEdge = 0, outRun = 0, notOutLbw = 0, notOutEdge = 0, notOutRun = 0
    for (let seed = 1; seed <= 120; seed++) {
      const m = new Match({ teamA: BUILT_IN_TEAMS[2], teamB: BUILT_IN_TEAMS[9], format: 't20', seed })
      m.playMatch()
      for (const inn of m.innings) for (const e of inn.log) {
        const w = e.wicket
        // a wicket of these kinds always carries an appeal, unless a challenge turned a not-out into it
        if (w && w.kind === 'lbw') { expect(e.appeal?.kind === 'lbw' || e.review?.overturned === true).toBe(true); if (e.appeal?.out) outLbw++ }
        if (w && w.kind === 'run out') { expect(e.appeal).toEqual({ kind: 'runout', out: true }); outRun++ }
        if (w && w.kind === 'caught' && e.appeal?.kind === 'edge' && e.appeal.out) outEdge++
        if (e.appeal && !e.appeal.out) {
          expect(e.runsBat === 0 || e.appeal.kind === 'runout').toBe(true)
          if (e.appeal.kind === 'lbw') notOutLbw++
          if (e.appeal.kind === 'edge') notOutEdge++
          if (e.appeal.kind === 'runout') notOutRun++
          // turned down on the field: either still not out, or a challenge turned it into out
          if (!e.review?.overturned) expect(e.wicket).toBeNull()
        }
      }
    }
    expect(outLbw).toBeGreaterThan(20)
    expect(notOutLbw).toBeGreaterThan(outLbw * 0.4)
    expect(notOutEdge).toBeGreaterThan(5)
    expect(outRun).toBeGreaterThan(10)
    expect(notOutRun).toBeGreaterThan(outRun * 0.4)
    expect(outEdge).toBeGreaterThan(5)
  })
})
