import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BUILT_IN_TEAMS } from '../../data/teams'
import { FreeHitScreen } from './FreeHitScreen'
import { ExtraScreen, FourScreen, MaidenScreen } from './EventScreens'
import { SixReplay } from './SixReplay'
import { WicketReplay } from './WicketReplay'

const [A, B] = [BUILT_IN_TEAMS[0], BUILT_IN_TEAMS[1]]
const [p, q, k] = [A.players[0], B.players[1], B.players[6]]

describe('animation screens', () => {
  it('all render with their words', () => {
    expect(renderToString(<FourScreen info={{ batsman: p, batTeam: A, bowlTeam: B, angle: -1, chasers: [{ player: q, x: 110, y: 40 }, { player: k, x: 120, y: 55 }], rate: 1 }} />)).toContain('FOUR!')
    for (const kind of ['wide', 'bye', 'legbye'] as const) {
      const html = renderToString(<ExtraScreen info={{ kind, runs: 1, bowler: q, bowlTeam: B, batsman: p, batTeam: A, keeper: k, rate: 1 }} />)
      expect(html).toContain(kind === 'legbye' ? 'LEG BYE!' : kind.toUpperCase() + '!')
    }
    expect(renderToString(<MaidenScreen info={{ bowler: q, bowlTeam: B, overs: '(2.0 overs, 5 runs, 1 wickets)', rate: 1 }} />)).toContain('MAIDEN!')
    expect(renderToString(<FreeHitScreen info={{ bowler: q, bowlTeam: B, batsman: p, batTeam: A, rate: 1 }} />)).toContain('FREE HIT!')
    expect(renderToString(<SixReplay info={{ batsman: p, team: A, distance: 98, rate: 1 }} />)).toContain('SIX!')
    for (const kind of ['bowled', 'caught', 'lbw', 'run out', 'stumped', 'caught and bowled', 'hit wicket'] as const) {
      expect(renderToString(<WicketReplay info={{ kind, batsman: p, bowler: q, fielder: k, batTeam: A, bowlTeam: B, rate: 1, score: '12 (9)' }} />)).toContain('Wicket replay')
    }
  })
})
