import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BUILT_IN_TEAMS } from '../../data/teams'
import { Match } from '../../engine/match'
import { ManhattanScreen, ScoringScreen, WagonScreen, WormScreen } from './StatsScreens'

describe('stats screens', () => {
  it('draw the wagon wheel, the worm, the over bars and the scoring split from a real innings', () => {
    const m = new Match({ teamA: BUILT_IN_TEAMS[0], teamB: BUILT_IN_TEAMS[1], format: 't20', seed: 9 })
    m.playMatch()
    const [a, b] = m.innings
    const team = m.battingSide(a).team
    const info = { team, log: a.log, other: undefined, title: '', rate: 1 }
    expect(renderToString(<WagonScreen info={{ ...info, batsman: m.player(a.batters[0].id) }} />)).toContain('wagon wheel')
    expect(renderToString(<WagonScreen info={info} />)).toContain(team.short)
    expect(renderToString(<WormScreen info={{ ...info, log: b.log, other: a.log }} />)).toContain('The worm')
    expect(renderToString(<ManhattanScreen info={info} />)).toContain('over by over')
    expect(renderToString(<ScoringScreen info={info} />)).toContain('How the runs came')
    // a Test innings with hundreds of overs still draws
    const t = new Match({ teamA: BUILT_IN_TEAMS[0], teamB: BUILT_IN_TEAMS[1], format: 'test', seed: 4 })
    t.playMatch()
    expect(renderToString(<ManhattanScreen info={{ ...info, log: t.innings[0].log }} />).length).toBeGreaterThan(200)
  })
})
