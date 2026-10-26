import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BUILT_IN_TEAMS } from '../../data/teams'
import { FreeHitScreen } from './FreeHitScreen'
import { ExtraScreen, FourScreen, MaidenScreen } from './EventScreens'
import { DuckScreen, HatTrickScreen, HaulScreen } from './BowlerScreens'
import { SeriesAward } from '../season/SeriesAward'
import { ReviewScreen, RunOutReview } from './ReviewScreens'
import { PartnershipScreen, TimeoutScreen } from './TimeoutScreens'
import { runOutGap, trackFor } from '../../season/moments'
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
    expect(renderToString(<ExtraScreen info={{ kind: 'wide', runs: 1, bowler: q, bowlTeam: B, batsman: p, batTeam: A, keeper: k, rate: 1 }} />)).toContain('WIDE LINE')
    expect(renderToString(<MaidenScreen info={{ bowler: q, bowlTeam: B, overs: '(2.0 overs, 5 runs, 1 wickets)', rate: 1 }} />)).toContain('MAIDEN!')
    expect(renderToString(<FreeHitScreen info={{ bowler: q, bowlTeam: B, batsman: p, batTeam: A, rate: 1 }} />)).toContain('FREE HIT!')
    const fist = renderToString(<MilestoneScreen info={{ batsman: p, partner: k, team: A, title: 'FIFTY!', big: false, lines: ['52 off 31 balls', 'SR 167.7 · 5x4 · 2x6'], rate: 1 }} />)
    expect(fist).toContain('FIFTY!')
    expect(fist).toContain('52 off 31 balls')
    expect(renderToString(<MilestoneScreen info={{ batsman: p, partner: null, team: A, title: 'CENTURY!', big: true, lines: ['101 off 60 balls', 'SR 168.3'], rate: 1 }} />)).toContain('CENTURY!')
    const merged = renderToString(<WicketReplay info={{ kind: 'caught', batsman: p, bowler: q, fielder: k, spot: { x: 120, y: 30 }, batTeam: A, bowlTeam: B, rate: 1, score: '12 (9)', details: { lines: ['c Keeper b Bowler', '12 (9) · SR 133.3'], duck: false } }} />)
    expect(merged).toContain('c Keeper b Bowler')
    const vs = [A.players[1], A.players[2], A.players[3], A.players[4], A.players[5]].map((player) => ({ player, team: A }))
    expect(renderToString(<HatTrickScreen info={{ bowler: q, bowlTeam: B, victims: vs.slice(0, 3), rate: 1 }} />)).toContain('HAT-TRICK!')
    const haul = renderToString(<HaulScreen info={{ bowler: q, bowlTeam: B, victims: vs, figures: { wickets: 5, runs: 23, overs: '3.4' }, rate: 1 }} />)
    expect(haul).toContain('FIVE-FOR!')
    expect(haul).toContain('3.4')
    expect(renderToString(<DuckScreen info={{ batsman: p, batTeam: A, bowler: q, bowlTeam: B, golden: true, balls: 1, rate: 1 }} />)).toContain('GOLDEN DUCK!')
    expect(renderToString(<DuckScreen info={{ batsman: p, batTeam: A, bowler: q, bowlTeam: B, golden: false, balls: 4, rate: 1 }} />)).toContain('DUCK!')
    expect(renderToString(<MaidenScreen info={{ bowler: q, bowlTeam: B, overs: '(2.0 overs, 0 runs, 0 wickets)', rate: 1, streak: 2 }} />)).toContain('TWO IN A ROW!')
    expect(renderToString(<SeriesAward player={p} team={A} tournament="Cup" lines={['40 impact points', '210 runs']} onClose={() => undefined} />)).toContain('MAN OF THE SERIES')
    expect(renderToString(<WicketReplay info={{ kind: 'stumped', batsman: p, bowler: q, fielder: k, batTeam: A, bowlTeam: B, rate: 1, score: '3 (4)' }} />)).toContain('Slow motion')
    expect(renderToString(<MilestoneScreen info={{ batsman: p, partner: k, team: A, title: 'CENTURY!', big: true, lines: ['100 off 55 balls'], rate: 1 }} />)).toContain('CENTURY!')
    const rv = (out: boolean) => renderToString(<ReviewScreen info={{ by: out ? 'bat' : 'field', batsman: p, batTeam: A, bowler: q, bowlTeam: B, out, track: trackFor(9, out), rate: 1 }} />)
    expect(rv(true)).toContain('REVIEW!')
    expect(rv(true)).toContain('Pitching')
    expect(rv(false)).toContain('NOT OUT')
    const g = runOutGap(5)
    expect(renderToString(<RunOutReview info={{ batsman: p, batTeam: A, fielder: k, bowlTeam: B, cm: g.cm, text: g.text, rate: 1 }} />)).toContain('RUN OUT?')
    expect(renderToString(<WicketReplay info={{ kind: 'lbw', batsman: p, bowler: q, fielder: null, batTeam: A, bowlTeam: B, rate: 1, score: '3 (4)', track: trackFor(3, true) }} />)).toContain('Impact')
    expect(renderToString(<PartnershipScreen info={{ a: p, b: k, team: A, mark: 100, runs: 104, balls: 61, aRuns: 60, aBalls: 33, bRuns: 40, bBalls: 28, rate: 1 }} />)).toContain('100 STAND!')
    const tv = renderToString(<TimeoutScreen info={{ headline: 'After 7 overs: 54/2', teamNames: ['A', 'B'], seconds: 30, rate: 1, channels: [{ tag: 'Highlight from an earlier match', title: p.name, big: '112 (58)', lines: ['9 fours'], players: [{ player: p, team: A }] }, { tag: 'The innings so far', title: 'A', big: '54/2', lines: [] }] }} />)
    expect(tv).toContain('Strategic timeout')
    expect(tv).toContain('112 (58)')
    expect(renderToString(<SixReplay info={{ batsman: p, team: A, distance: 98, rate: 1 }} />)).toContain('SIX!')
    for (const kind of ['bowled', 'caught', 'lbw', 'run out', 'stumped', 'caught and bowled', 'hit wicket'] as const) {
      expect(renderToString(<WicketReplay info={{ kind, batsman: p, bowler: q, fielder: k, batTeam: A, bowlTeam: B, rate: 1, score: '12 (9)' }} />)).toContain('Wicket replay')
    }
  })
})
