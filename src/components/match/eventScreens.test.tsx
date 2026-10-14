import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BUILT_IN_TEAMS } from '../../data/teams'
import { FreeHitScreen } from './FreeHitScreen'
import { ExtraScreen, FourScreen, MaidenScreen } from './EventScreens'
import { MilestoneScreen } from './MilestoneScreen'
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
    // one to three chasers, each shown by first name only
    for (const n of [1, 2, 3]) {
      const html = renderToString(<FourScreen info={{ batsman: p, batTeam: A, bowlTeam: B, angle: 0.5, chasers: [q, k, p].slice(0, n).map((pl, i) => ({ player: { ...pl, name: `${pl.name.split(' ')[0]} Longsurname${i}` }, x: 100 + i * 8, y: 40 + i * 8 })), rate: 1 }} />)
      expect(html.replace(/alt="[^"]*"/g, '')).not.toContain('Longsurname') // (the portraits' alt text keeps the full name)
    }
    expect(renderToString(<MaidenScreen info={{ bowler: q, bowlTeam: B, overs: '(2.0 overs, 5 runs, 1 wickets)', rate: 1 }} />)).toContain('MAIDEN!')
    expect(renderToString(<FreeHitScreen info={{ bowler: q, bowlTeam: B, batsman: p, batTeam: A, rate: 1 }} />)).toContain('FREE HIT!')
    const fist = renderToString(<MilestoneScreen info={{ batsman: p, partner: k, team: A, title: 'FIFTY!', big: false, lines: ['52 off 31 balls', 'SR 167.7 · 5x4 · 2x6'], rate: 1 }} />)
    expect(fist).toContain('FIFTY!')
    expect(fist).toContain('52 off 31 balls')
    expect(renderToString(<MilestoneScreen info={{ batsman: p, partner: null, team: A, title: 'CENTURY!', big: true, lines: ['101 off 60 balls', 'SR 168.3'], rate: 1 }} />)).toContain('CENTURY!')
    const merged = renderToString(<WicketReplay info={{ kind: 'caught', batsman: p, bowler: q, fielder: k, spot: { x: 120, y: 30 }, batTeam: A, bowlTeam: B, rate: 1, score: '12 (9)', details: { lines: ['c Keeper b Bowler', '12 (9) · SR 133.3'], duck: false } }} />)
    expect(merged).toContain('c Keeper b Bowler')
    expect(renderToString(<SixReplay info={{ batsman: p, team: A, distance: 98, rate: 1 }} />)).toContain('SIX!')
    for (const kind of ['bowled', 'caught', 'lbw', 'run out', 'stumped', 'caught and bowled', 'hit wicket'] as const) {
      expect(renderToString(<WicketReplay info={{ kind, batsman: p, bowler: q, fielder: k, batTeam: A, bowlTeam: B, rate: 1, score: '12 (9)' }} />)).toContain('Wicket replay')
    }
  })
})
