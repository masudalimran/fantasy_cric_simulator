import { describe, expect, it } from 'vitest'
import { BUILT_IN_TEAMS } from '../data/teams'
import { fieldPlan } from '../components/match/fieldSets'
import { BAT_END_Z, drawnAngles, frameAt, hops, planBall, replayCamera, withNearSlow } from '../components/match/broadcast'
import { endPoint, placeFielders } from '../components/match/Stage'
import { deliveryOf, deliveryScreen, isPoorLength, SWING_BIG, TURN_BIG, type LengthKind } from './delivery'
import { Match } from './match'

const seamer = { bowling: { type: 'fast', variation: 80 } }
const spinner = { bowling: { type: 'slow', variation: 80 } }
const ev = (seq: number, o: object = {}) => ({ seq, delivery: undefined, runsBat: 0, boundary: 0 as const, wicket: null, extraType: null, legal: true, ...o }) as never

describe('how a ball is bowled (for show)', () => {
  it('varies the length: yorkers, full tosses, short balls and all, in the mix a seamer and a spinner bowl', () => {
    const count = (b: object) => { const m = new Map<LengthKind, number>(); for (let i = 1; i <= 2000; i++) { const k = deliveryOf(ev(i), b as never).length; m.set(k, (m.get(k) ?? 0) + 1) } return m }
    const pace = count(seamer), spin = count(spinner)
    for (const k of ['yorker', 'full', 'good', 'short', 'bouncer', 'lowFullToss', 'fullToss'] as LengthKind[]) expect(pace.get(k) ?? 0, k).toBeGreaterThan(20)
    expect((pace.get('yorker') ?? 0)).toBeGreaterThan(spin.get('yorker') ?? 0) // a seamer bowls more yorkers
    expect((pace.get('bouncer') ?? 0)).toBeGreaterThan(spin.get('bouncer') ?? 0) // and only he bowls bouncers
    expect(spin.get('bouncer') ?? 0).toBe(0)
    expect((pace.get('good') ?? 0)).toBeGreaterThan(600)
  })
  it('a bowled or trapped ball was mostly a yorker or full, a boundary mostly a poor length', () => {
    let fuller = 0, poor = 0
    for (let i = 1; i <= 400; i++) {
      const w = deliveryOf(ev(i, { wicket: { kind: 'bowled', playerId: 'x' } }), seamer)
      if (w.length === 'yorker' || w.length === 'full') fuller++
      const b = deliveryOf(ev(i, { boundary: 4, runsBat: 4 }), seamer)
      if (b.length !== 'good' && b.length !== 'yorker') poor++
    }
    expect(fuller / 400).toBeGreaterThan(0.6)
    expect(poor / 400).toBeGreaterThan(0.7)
  })
  it('a person\'s chosen length is kept', () => {
    expect(deliveryOf(ev(5, { delivery: { line: 0, length: 'yorker', pace: 'fast' } }), seamer).length).toBe('yorker')
    expect(deliveryOf(ev(5, { delivery: { line: 0, length: 'short', pace: 'fast' } }), spinner).length).toBe('short')
  })
  it('a seamer swings it and a spinner turns it, a good bowler more, and rarely as much as a big one', () => {
    let seamBig = 0, spinBig = 0, spinOnSeamer = 0
    const dist = (b: object, key: 'swing' | 'turn') => Array.from({ length: 2000 }, (_, i) => Math.abs(deliveryOf(ev(i + 1), b as never)[key]))
    const swingGood = dist(seamer, 'swing'), swingPoor = dist({ bowling: { type: 'fast', variation: 40 } }, 'swing')
    for (const x of swingGood) if (x >= SWING_BIG) seamBig++
    for (const x of dist(spinner, 'turn')) if (x >= TURN_BIG) spinBig++
    for (const x of dist(seamer, 'turn')) if (x >= 3) spinOnSeamer++
    expect(seamBig).toBeGreaterThan(30)
    expect(seamBig / 2000).toBeLessThan(0.25)
    expect(spinBig).toBeGreaterThan(30)
    expect(spinBig / 2000).toBeLessThan(0.3)
    expect(spinOnSeamer).toBe(0)
    expect(swingGood.reduce((a, b) => a + b, 0)).toBeGreaterThan(swingPoor.reduce((a, b) => a + b, 0))
    // a spinner hardly swings it
    expect(Math.max(...dist(spinner, 'swing'))).toBeLessThan(0.5)
    // more swing under cloud
    const cloud = Array.from({ length: 2000 }, (_, i) => Math.abs(deliveryOf(ev(i + 1), seamer, { overcast: true }).swing)).reduce((a, b) => a + b, 0)
    expect(cloud).toBeGreaterThan(swingGood.reduce((a, b) => a + b, 0))
  })
  it('a no ball is an overstep most of the time and now and then a beamer, which is above the waist', () => {
    let beamers = 0
    for (let i = 1; i <= 400; i++) {
      const d = deliveryOf(ev(i, { extraType: 'noball', legal: false }), seamer)
      expect(['overstep', 'beamer']).toContain(d.noBallCause)
      if (d.noBallCause === 'beamer') { beamers++; expect(d.length).toBe('beamer'); expect(d.height).toBeGreaterThan(1.7); expect(d.pitchZ).toBeNull() }
    }
    expect(beamers / 400).toBeGreaterThan(0.2)
    expect(beamers / 400).toBeLessThan(0.4)
    expect(deliveryOf(ev(3), seamer).noBallCause).toBeNull()
  })
  it('earns a replay only now and then: every beamer, some good yorkers, the biggest swings and turns', () => {
    const all = Array.from({ length: 3000 }, (_, i) => { const e = ev(i + 1); return deliveryScreen(e, deliveryOf(e, seamer)) })
    const sp = Array.from({ length: 3000 }, (_, i) => { const e = ev(i + 1); return deliveryScreen(e, deliveryOf(e, spinner)) })
    const share = (a: (string | null)[]) => a.filter(Boolean).length / a.length
    expect(share(all)).toBeLessThan(0.15)
    expect(all.filter((x) => x === 'yorker').length).toBeGreaterThan(10)
    expect(all.filter((x) => x === 'swing').length).toBeGreaterThan(10)
    expect(sp.filter((x) => x === 'turn').length).toBeGreaterThan(10)
    expect(all.filter((x) => x === 'turn').length).toBe(0)
    // a beamer always gets one; a ball that was hit for four or took a wicket gets its own screens instead
    const nb = ev(7, { extraType: 'noball', legal: false })
    const d = { ...deliveryOf(nb, seamer), noBallCause: 'beamer' as const }
    expect(deliveryScreen(nb, d)).toBe('beamer')
    const four = ev(8, { boundary: 4, runsBat: 4 })
    expect(deliveryScreen(four, { ...deliveryOf(four, seamer), length: 'yorker' })).toBeNull()
    expect(isPoorLength({ ...deliveryOf(four, seamer), length: 'lowFullToss' })).toBe(true)
    expect(isPoorLength({ ...deliveryOf(four, seamer), length: 'good' })).toBe(false)
  })
})

describe('the clip of a ball shows how it was bowled', () => {
  const m = new Match({ teamA: BUILT_IN_TEAMS[2], teamB: BUILT_IN_TEAMS[9], format: 't20', seed: 5 })
  m.playMatch()
  const inn = m.innings[0]
  const bowlSide = m.sides[1 - inn.battingSide]
  const planFor = (e: (typeof inn.log)[number], cond: object = {}) => {
    const striker = m.player(e.strikerId)
    const p0 = fieldPlan({ format: 't20', over: e.over, maxOvers: 20, runs: e.score.runs, legalBalls: e.score.legalBalls, target: null, freeHit: false, bowlType: null, hand: striker.hand })
    const fielders = placeFielders(bowlSide.xi, e.bowlerId, p0.spots)
    return planBall(e, fielders.map((f) => ({ id: f.player.id, x: f.x, y: f.y, spot: f.spot })), endPoint(e, fielders), striker.hand === 'L', 135, { bowler: m.player(e.bowlerId), ...cond })
  }
  it('the ball pitches where it was bowled to pitch, bounces after, and always arrives at the bat', () => {
    let bounced = 0, tossed = 0
    const lengths = new Set<string>()
    for (const e of inn.log.filter((x) => x.legal && !x.extraType).slice(0, 120)) {
      const p = planFor(e)
      lengths.add(p.delivery.length)
      const none = () => ({ x: 0, y: 0, z: 0 })
      const at = (u: number) => frameAt(p, p.tRun + u * p.tDeliver, none).ball!
      // arrives at the bat
      expect(Math.hypot(at(1).x - p.meet.x, at(1).z - p.meet.z)).toBeLessThan(0.02)
      if (p.delivery.pitchZ !== null) {
        // on the ground at the pitching point
        const b = at(p.bounceU)
        expect(b.y).toBeLessThan(0.08)
        expect(Math.abs(b.z - p.delivery.pitchZ)).toBeLessThan(0.25)
        bounced++
      } else { expect(p.bounceU).toBeGreaterThan(0.99); tossed++ }
    }
    expect(bounced).toBeGreaterThan(80)
    expect(lengths.size).toBeGreaterThanOrEqual(5)
    void tossed
  })
  it('a swing bows the ball out in the air and brings it back; a turn pitches it to one side of where it meets the bat', () => {
    let seenSwing = 0, seenTurn = 0
    for (let seq = 1; seq <= 400 && (seenSwing < 3 || seenTurn < 3); seq++) {
      const base = inn.log.find((x) => x.legal && !x.extraType && !x.wicket)!
      const e = { ...base, seq }
      const p = planFor(e, { bowler: seamer })
      if (Math.abs(p.delivery.swing) >= 2.2 && p.bounceU < 0.99) {
        const none = () => ({ x: 0, y: 0, z: 0 })
        const straightX = (u: number) => p.release.x + (p.bounce.x - p.release.x) * (u / p.bounceU)
        const mid = frameAt(p, p.tRun + 0.6 * p.bounceU * p.tDeliver, none).ball!
        expect(Math.abs(mid.x - straightX(0.6 * p.bounceU))).toBeGreaterThan(0.1)
        expect(Math.sign(mid.x - straightX(0.6 * p.bounceU))).toBe(Math.sign(p.delivery.swing))
        seenSwing++
      }
      const ps = planFor(e, { bowler: spinner })
      if (Math.abs(ps.delivery.turn) >= 4.5 && ps.delivery.pitchZ !== null && ps.delivery.pitchZ < -4) {
        expect(Math.abs(ps.bounce.x - ps.meet.x)).toBeGreaterThan(0.2)
        expect(Math.sign(ps.meet.x - ps.bounce.x)).toBe(Math.sign(ps.delivery.turn))
        seenTurn++
      }
    }
    expect(seenSwing).toBeGreaterThanOrEqual(3)
    expect(seenTurn).toBeGreaterThanOrEqual(3)
  })
})

describe('what happens after the bat or pad, and the replay cameras', () => {
  const m = new Match({ teamA: BUILT_IN_TEAMS[2], teamB: BUILT_IN_TEAMS[9], format: 't20', seed: 5 })
  m.playMatch()
  const inn = m.innings[0]
  const bowlSide = m.sides[1 - inn.battingSide]
  const base = inn.log.find((x) => x.legal && !x.extraType && !x.wicket && !x.boundary && x.runsBat === 0)!
  const planWith = (e: object, hand?: boolean) => {
    const ev2 = { ...base, ...e } as typeof base
    const striker = m.player(ev2.strikerId)
    const p0 = fieldPlan({ format: 't20', over: ev2.over, maxOvers: 20, runs: ev2.score.runs, legalBalls: ev2.score.legalBalls, target: null, freeHit: false, bowlType: null, hand: striker.hand })
    const fielders = placeFielders(bowlSide.xi, ev2.bowlerId, p0.spots)
    return planBall(ev2, fielders.map((f) => ({ id: f.player.id, x: f.x, y: f.y, spot: f.spot })), endPoint(ev2, fielders), hand ?? striker.hand === 'L', 135, { bowler: m.player(ev2.bowlerId) })
  }
  const none = () => ({ x: 0, y: 0, z: 0 })

  it('an lbw is the ball hitting the front pad, low and right in front of the batsman, and it drops there', () => {
    for (const left of [false, true]) {
      const p = planWith({ wicket: { kind: 'lbw', playerId: base.strikerId } }, left)
      expect(p.kind).toBe('pad')
      expect(Math.sign(p.meet.x)).toBe(left ? -1 : 1) // at his legs, not at the stumps behind him
      expect(p.meet.y).toBeLessThan(0.5)
      expect(p.meet.z).toBeLessThan(BAT_END_Z) // in front of him
      const after = frameAt(p, p.tRun + p.tDeliver + p.tFlight * 0.8, none).ball!
      expect(after.y).toBeLessThan(0.3) // it has dropped to the ground
    }
  })
  it('after a hit the ball bounces more than once, each bounce lower than the last', () => {
    const peaks: number[] = []
    let prev = 0, up = true
    for (let s = 0.001; s < 1; s += 0.002) { const y = hops(s, 0, 0.42, 0.3); if (up && y < prev) { peaks.push(prev); up = false } else if (!up && y > prev) up = true; prev = y }
    expect(peaks.length).toBeGreaterThanOrEqual(3)
    for (let i = 1; i < peaks.length; i++) expect(peaks[i]).toBeLessThan(peaks[i - 1])
    expect(hops(0.99, 0, 0.42, 0.3)).toBeLessThan(0.02) // rolling at the end
  })
  it('on a four or a six the batsmen set off for a run, pull up and walk back', () => {
    for (const boundary of [4, 6] as const) {
      const p = planWith({ boundary, runsBat: boundary, extraType: null })
      expect(p.runs).toBe(0)
      const t2 = p.tRun + p.tDeliver
      const early = frameAt(p, t2 + 0.15, none).runners
      expect(early).toBeNull() // not yet: he is still finishing the shot
      let farthest = 0
      for (let t = t2 + 0.3; t < t2 + 3; t += 0.05) { const r = frameAt(p, t, none).runners; if (r) farthest = Math.max(farthest, Math.abs(r.a.z - BAT_END_Z)) }
      expect(farthest).toBeGreaterThan(2) // they did run
      expect(farthest).toBeLessThan(14) // but only part of the way
      expect(frameAt(p, t2 + 3.5, none).runners).toBeNull() // and are back home
    }
  })
  it('the close-call replay is slow and zoomed only around the moment the ball passes', () => {
    const p = withNearSlow(planWith({}))
    const t2 = p.tRun + p.tDeliver
    expect(p.slow!.at).toBeLessThan(t2)
    expect(p.slow!.at + p.slow!.len).toBeGreaterThan(t2)
    expect(p.slow!.len).toBeLessThan(1)
    expect(frameAt(p, p.tRun * 0.5, none).slowmo).toBe(false)
    expect(frameAt(p, t2, none).slowmo).toBe(true)
    expect(frameAt(p, t2 + 1.5, none).slowmo).toBe(false)
  })
  it('the side camera is always on the side the batsman faces', () => {
    for (const hand of [false, true]) {
      const p = planWith({}, hand)
      const dir = (p.stanceX > 0 ? -1 : 1) as 1 | -1
      expect(Math.sign(replayCamera('side', 3, dir).cam.p.x)).toBe(dir)
      expect(dir).toBe(hand ? 1 : -1) // off side for a right-hander, leg side for a left-hander
    }
  })
  it('the angle shown for swing and turn is measured from the drawn path, so it is never smaller than it looks', () => {
    let seen = 0
    for (let seq = 1; seq <= 600 && seen < 6; seq++) {
      const p = planWith({ seq })
      if (Math.abs(p.delivery.swing) < SWING_BIG || p.bounceU > 0.98) continue
      const a = drawnAngles(p)
      expect(Math.abs(a.swing)).toBeGreaterThan(Math.abs(p.delivery.swing)) // the drawn bow is sharper than the bare setting
      expect(Math.sign(a.swing)).toBe(Math.sign(p.delivery.swing))
      seen++
    }
    expect(seen).toBeGreaterThan(0)
  })
})
