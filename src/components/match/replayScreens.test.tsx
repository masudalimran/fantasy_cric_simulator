import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BUILT_IN_TEAMS } from '../../data/teams'
import { fourContact } from '../../engine/contact'
import { Match } from '../../engine/match'
import { DEFAULT_LOOK } from '../../engine/stadium'
import { wicketCard } from '../../season/wicketCards'
import { fieldPlan } from './fieldSets'
import { ExtraCast, FourCast, WicketCast } from './ReplayScreens'
import { placeFielders } from './Stage'
import type { ReplayBase } from './ReplayFrame'

const [A, B] = [BUILT_IN_TEAMS[2], BUILT_IN_TEAMS[9]]
function baseFor(m: Match, ev: Match['events'][number]): ReplayBase {
  const inn = m.innings[ev.innings]
  const bowlSide = m.sides[1 - inn.battingSide]
  const plan = fieldPlan({ format: 't20', over: ev.over, maxOvers: 20, runs: ev.score.runs, legalBalls: ev.score.legalBalls, target: null, freeHit: false, bowlType: null, hand: m.player(ev.strikerId).hand })
  return { event: ev, striker: m.player(ev.strikerId), nonStriker: m.player(ev.nonStrikerId), bowler: m.player(ev.bowlerId), batTeam: m.sides[inn.battingSide].team, bowlTeam: bowlSide.team, fielders: placeFielders(bowlSide.xi, ev.bowlerId, plan.spots), pitch: 'balanced', look: DEFAULT_LOOK }
}
const clean = (s: string) => s.replace(/<!-- -->/g, '')

describe('the broadcast-style screens', () => {
  const m = new Match({ teamA: A, teamB: B, format: 't20', seed: 6 })
  m.playMatch()
  const all = m.innings.flatMap((i) => i.log)

  it('a four replays the ball and shows the contact, the bat speed and the timing', () => {
    const ev = all.find((e) => e.boundary === 4)!
    const html = clean(renderToString(<FourCast info={{ replay: baseFor(m, ev), contact: fourContact(ev, 70), shot: 'Cover, along the ground', batsman: m.player(ev.strikerId), batTeam: A, rate: 1 }} />))
    expect(html).toContain('FOUR!')
    expect(html).toContain('Replay')
    expect(html).toContain('Bat speed')
    expect(html).toContain('Cover, along the ground')
  })
  it('a wicket replays the ball with a headline, three facts and a sentence', () => {
    const ev = all.find((e) => e.wicket?.kind === 'bowled')!
    const card = wicketCard('bowled', ev.seq, { bowlerName: m.player(ev.bowlerId).name, bowlerType: 'fast', kmh: 139 })
    const html = clean(renderToString(<WicketCast info={{ replay: baseFor(m, ev), card, batsman: m.player(ev.wicket!.playerId), batTeam: A, score: '12 (9)', how: 'b Someone', rate: 1 }} />))
    expect(html).toContain('BOWLED!')
    expect(html).toContain('139 km/h')
    expect(html).toContain('12 (9)')
    for (const t of card.tiles) expect(html).toContain(t.label)
  })
  it('an extra is a short replay with the banner', () => {
    const ev = all.find((e) => e.extraType === 'wide')!
    const html = clean(renderToString(<ExtraCast info={{ replay: baseFor(m, ev), title: 'WIDE!', sub: '+1 run to the total · outside off', color: '#fbbf24', rate: 1 }} />))
    expect(html).toContain('WIDE!')
    expect(html).toContain('outside off')
  })
})
