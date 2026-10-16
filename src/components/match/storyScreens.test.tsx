import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { COACHES } from '../../data/coaches'
import { quoteFor, quoteKind } from '../../data/quotes'
import { BUILT_IN_TEAMS } from '../../data/teams'
import type { AwardCandidate } from '../../engine/awards'
import type { Side } from '../../engine/types'
import { fieldPlan } from './fieldSets'
import { BigMatchIntro, LineupReveal } from './LineupScreens'
import { AmbientScreen, type AmbientInfo } from './AmbientScreens'
import { CheerScreen } from './CheerScreen'
import { quipFor } from '../../data/quips'
import { PhaseScreen, RecordScreen, SuperOverScreen, SwingScreen, TargetScreen, TensionScreen } from './StoryScreens'
import { SnickoView, ReviewScreen } from './ReviewScreens'
import { trackFor } from '../../season/moments'
import { AwardsNight, DeadlineDay, InjuryNews, NewCoachScreen, NewTalents, PlayoffNews, UpgradeScreen } from '../season/NewsScreens'

const [A, B] = [BUILT_IN_TEAMS[0], BUILT_IN_TEAMS[1]]
const [p, q] = [A.players[1], B.players[2]]
const sides: [Side, Side] = [{ team: A, xi: A.players.slice(0, 11) }, { team: B, xi: B.players.slice(0, 11) }]

describe('story screens', () => {
  it('match screens render their words', () => {
    expect(renderToString(<TensionScreen info={{ variant: 'hattrick', player: q, team: B, other: p, otherTeam: A, title: 'HAT-TRICK BALL!', sub: 'two in two', rate: 1 }} />)).toContain('HAT-TRICK BALL!')
    expect(renderToString(<TensionScreen info={{ variant: 'ninety', player: p, team: A, title: 'NERVOUS NINETIES', sub: 'on 94', rate: 1 }} />)).toContain('NERVOUS NINETIES')
    expect(renderToString(<TargetScreen info={{ chasing: A, defending: B, target: 187, balls: 120, format: 't20', rate: 1 }} />)).toContain('9.35')
    const so = renderToString(<SuperOverScreen info={{ winner: A, loser: B, winnerRuns: 14, loserRuns: 11, loserWickets: 1, rate: 1 }} />)
    expect(so).toContain('MATCH TIED!')
    expect(so).toContain('win the super over')
    expect(renderToString(<SwingScreen info={{ chasing: A, defending: B, before: 0.3, after: 0.62, rate: 1 }} />)).toContain('are now')
    expect(renderToString(<RecordScreen info={{ category: 'Highest score of the season', value: '121*', previous: 'The old mark was 110', player: p, team: A, rate: 1 }} />)).toContain('RECORD!')
    const ctx = { format: 't20' as const, maxOvers: 20, runs: 50, legalBalls: 36, target: null, freeHit: false, bowlType: null, hand: 'R' as const }
    expect(renderToString(<PhaseScreen info={{ variant: 'powerplay', from: fieldPlan({ ...ctx, over: 5 }).spots, to: fieldPlan({ ...ctx, over: 6 }).spots, bowlTeam: B, batTeam: A, overs: 6, runs: 50, wickets: 1, rate: 1 }} />)).toContain('POWERPLAY OVER')
    const rv = renderToString(<ReviewScreen info={{ by: 'bat', kind: 'edge', batsman: p, batTeam: A, bowler: q, bowlTeam: B, out: true, track: trackFor(3, true), rate: 1 }} />)
    expect(rv).toContain('Spike')
    expect(renderToString(<SnickoView />)).toContain('BALL PASSES BAT')
    expect(renderToString(<SnickoView />)).toContain('Slow motion replay')
    const plain = renderToString(<ReviewScreen info={{ plain: true, by: 'bat', kind: 'edge', batsman: p, batTeam: A, bowler: q, bowlTeam: B, out: true, track: trackFor(3, true), rate: 1 }} />)
    expect(plain).toContain('Snicko')
    expect(plain).not.toContain('asks for a review')
    expect(renderToString(<ReviewScreen info={{ plain: true, by: 'bat', batsman: p, batTeam: A, bowler: q, bowlTeam: B, out: true, track: trackFor(3, true), rate: 1 }} />)).toContain('Ball tracking')
  })

  it('the cheerleaders render in the team colours', () => {
    const html = renderToString(<CheerScreen info={{ team: A, why: 'boundary', rate: 1 }} />)
    expect(html).toContain('GO ')
    expect(html).toContain(A.colors.primary)
    expect(html).toContain(A.colors.secondary)
  })

  it('every break-the-monotony screen renders its words', () => {
    const xi = A.players.slice(0, 8)
    const cases: [AmbientInfo, string][] = [
      [{ variant: 'stands', team: A, rate: 1 }, 'ARMY!'],
      [{ variant: 'wave', teams: [A, B], rate: 1 }, 'THE WAVE!'],
      [{ variant: 'huddle', team: A, players: xi, rate: 1 }, 'HUDDLE!'],
      [{ variant: 'fancam', team: A, mood: 'happy', seed: 3, rate: 1 }, 'fan'],
      [{ variant: 'box', teams: [A, B], lines: ['one', 'two'], rate: 1 }, 'Commentary box'],
      [{ variant: 'blimp', team: A, rate: 1 }, 'GO '],
      [{ variant: 'lights', teams: [A, B], rate: 1 }, 'FLOODLIGHTS ON!'],
      [{ variant: 'fireworks', team: A, rate: 1 }, 'FIREWORKS!'],
    ]
    for (const [info, text] of cases) expect(renderToString(<AmbientScreen info={info} />)).toContain(text)
    expect(quipFor(5, null)).toBe(quipFor(5, null))
    expect(quipFor(5, { need: 40, balls: 12 }).length).toBeGreaterThan(10)
  })

  it('pre-match intros render', () => {
    expect(renderToString(<LineupReveal sides={sides} mySide={0} onDone={() => undefined} />)).toContain('Starting XI')
    expect(renderToString(<BigMatchIntro sides={sides} competition="Hokage Cup" stage="Final" onDone={() => undefined} />)).toContain('THE FINAL')
    expect(renderToString(<BigMatchIntro sides={sides} competition="Hokage Cup" stage="Semi-final" onDone={() => undefined} />)).toContain('SEMI-FINAL')
  })

  it('career news screens render', () => {
    const noop = () => undefined
    expect(renderToString(<UpgradeScreen rows={[{ player: p, team: A, before: 71, after: 74 }]} onClose={noop} />)).toContain('LEVEL UP!')
    expect(renderToString(<InjuryNews rows={[{ player: p, team: A, injury: { name: 'Sore wrist', severity: 'Minor', start: '2026-01-02', days: 3, back: '2026-01-05' } }]} onClose={noop} />)).toContain('Sore wrist')
    expect(renderToString(<NewCoachScreen coach={COACHES[0]} team={A} onClose={noop} />)).toContain(COACHES[0].name)
    expect(renderToString(<PlayoffNews status="qualified" team={A} competition="Cup" onClose={noop} />)).toContain('QUALIFIED!')
    expect(renderToString(<PlayoffNews status="eliminated" team={A} competition="Cup" onClose={noop} />)).toContain('ELIMINATED')
    expect(renderToString(<DeadlineDay windowName="Season auction" coins={12} squad={18} cap={20} offers={1} onMarket={noop} onClose={noop} />)).toContain('CLOSES TONIGHT')
    expect(renderToString(<NewTalents cards={[{ player: p, stars: 4, price: 6 }]} onClose={noop} />)).toContain('FRESH FACES')
    const data = { goldenBat: { player: p, team: A, line: '400 runs' }, goldenBall: { player: q, team: B, line: '18 wickets' }, player: { player: p, team: A, line: '90 impact points' }, xi: [{ player: p, team: A, note: '90 pts' }] }
    expect(renderToString(<AwardsNight data={data} onClose={noop} />)).toContain('GOLDEN BAT')
  })

  it('the interview line depends on what he did and is stable', () => {
    const c = (o: Partial<AwardCandidate>): AwardCandidate => ({ id: 'x', side: 0, points: 10, parts: { bat: 5, bowl: 0, field: 0 }, bat: null, bowl: null, field: { catches: 0, stumpings: 0, runOuts: 0 }, line: '', ...o })
    expect(quoteKind(c({ bat: { runs: 80, balls: 40, fours: 6, sixes: 3, out: false } }))).toBe('bigbat')
    expect(quoteKind(c({ bowl: { balls: 24, runs: 15, wickets: 4, maidens: 1 } }))).toBe('bigbowl')
    expect(quoteKind(c({ field: { catches: 3, stumpings: 0, runOuts: 0 } }))).toBe('field')
    const a = quoteFor(c({ bat: { runs: 80, balls: 40, fours: 6, sixes: 3, out: false } }), 42)
    expect(a.length).toBeGreaterThan(10)
    expect(quoteFor(c({ bat: { runs: 80, balls: 40, fours: 6, sixes: 3, out: false } }), 42)).toBe(a)
  })
})
