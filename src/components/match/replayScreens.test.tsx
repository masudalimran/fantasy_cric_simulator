import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BUILT_IN_TEAMS } from '../../data/teams'
import { fourContact } from '../../engine/contact'
import { Match } from '../../engine/match'
import { DEFAULT_LOOK } from '../../engine/stadium'
import { wicketCard } from '../../season/wicketCards'
import { fieldPlan } from './fieldSets'
import { AlmostCast, ExtraCast, FourCast, MissCast, WicketCast } from './ReplayScreens'
import { almostCaught } from './almost'
import { fielderWorld, planBall } from './broadcast'
import { endPoint } from './Stage'
import { nearMiss, stumpGap, type Miss } from './nearMiss'
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
    const html = clean(renderToString(<WicketCast info={{ replay: baseFor(m, ev), card, batsman: m.player(ev.wicket!.playerId), batTeam: A, kind: 'bowled', score: '12 (9)', how: 'b Someone', rate: 1 }} />))
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

  it('a close call says how near the ball went to the stumps or the edge of the bat', () => {
    const ev = all.find((e) => e.legal && !e.wicket && !e.extraType && e.runsBat === 0)!
    const stumps: Miss = { kind: 'stumps', cm: 2, x: 0.05, y: 0.8, side: 'over', left: false }
    const html = clean(renderToString(<MissCast info={{ replay: baseFor(m, ev), miss: stumps, batsman: m.player(ev.strikerId), bowler: m.player(ev.bowlerId), batTeam: A, rate: 1 }} />))
    expect(html).toContain('SO CLOSE!')
    expect(html).toContain('Over the top of the stumps by 2 cm')
    const bat = clean(renderToString(<MissCast info={{ replay: baseFor(m, ev), miss: { ...stumps, kind: 'bat', cm: 1, side: 'off' }, batsman: m.player(ev.strikerId), bowler: m.player(ev.bowlerId), batTeam: A, rate: 1 }} />))
    expect(bat).toContain('BEATEN!')
    expect(bat).toContain('1 cm from the edge of the bat')
  })
  it('only balls that beat the bat and went close are close calls, with a sensible gap', () => {
    expect(stumpGap(0, 0.76).gap).toBeCloseTo(0.013, 2)
    expect(stumpGap(0.3, 0.4).dx).toBeGreaterThan(0.1)
    let stumpsN = 0, batN = 0
    for (let seed = 1; seed <= 8; seed++) {
      const mm = new Match({ teamA: A, teamB: B, format: 't20', seed })
      mm.playMatch()
      for (const e of mm.innings.flatMap((i) => i.log)) {
        const x = nearMiss(e, mm.player(e.strikerId).hand === 'L')
        if (!x) continue
        expect(e.runsBat).toBe(0)
        expect(e.wicket).toBeNull()
        expect(e.extraType).toBeNull()
        expect(x.cm).toBeGreaterThanOrEqual(1)
        expect(x.cm).toBeLessThanOrEqual(3)
        if (x.kind === 'stumps') stumpsN++; else batN++
      }
    }
    expect(stumpsN).toBeGreaterThan(0)
    expect(batN).toBeGreaterThan(0)
  })

  it('a lofted shot that is not a catch falls in front of the fielder, and the nearest ones get a so-nearly screen', () => {
    let fell = 0, almosts = 0
    const kinds = new Set<string>()
    for (let seed = 1; seed <= 12; seed++) {
      const mm = new Match({ teamA: A, teamB: B, format: 't20', seed })
      mm.playMatch()
      for (const e of mm.innings.flatMap((i) => i.log)) {
        const base = baseFor(mm, e)
        const left = mm.player(e.strikerId).hand === 'L'
        const plan = planBall(e, base.fielders.map((f) => ({ id: f.player.id, x: f.x, y: f.y, spot: f.spot })), endPoint(e, base.fielders), left)
        if (plan.chaseKind) kinds.add(plan.chaseKind)
        if (plan.fellShort) {
          fell++
          const f = fielderWorld(base.fielders[plan.chaser].x, base.fielders[plan.chaser].y, base.fielders[plan.chaser].spot)
          // it lands between the bat and the fielder, about as far in front of him as it says
          expect(Math.hypot(plan.end.x - f.x, plan.end.z - f.z)).toBeCloseTo(plan.fellShort.gap, 1)
          expect(Math.hypot(plan.end.x - plan.meet.x, plan.end.z - plan.meet.z)).toBeLessThan(Math.hypot(f.x - plan.meet.x, f.z - plan.meet.z))
        }
        const a = almostCaught(e, base.fielders, left, mm.player(e.bowlerId))
        if (a) { almosts++; expect(a.gap).toBeLessThanOrEqual(1.8) }
      }
    }
    expect(fell).toBeGreaterThan(5)
    expect(almosts).toBeGreaterThan(0)
    expect([...kinds].sort()).toEqual(['between', 'close', 'gap'])
  })
  it('the so-nearly screen says how far in front of him it fell', () => {
    const ev = all.find((e) => e.legal && !e.wicket && !e.extraType && e.runsBat >= 1)!
    const base = baseFor(m, ev)
    const html = clean(renderToString(<AlmostCast info={{ replay: base, almost: { gap: 1.4, fielder: base.fielders[3].player, distance: 41, hang: 2.1, runs: 2 }, batsman: m.player(ev.strikerId), batTeam: A, bowlTeam: B, rate: 1 }} />))
    expect(html).toContain('SO NEARLY!')
    expect(html).toContain('fell 1.4 m in front of')
    expect(html).toContain('41 m')
  })
})
