import { describe, expect, it } from 'vitest'
import { BUILT_IN_TEAMS } from '../../data/teams'
import { Match } from '../../engine/match'
import { fieldPlan } from './fieldSets'
import { elevation, warpTime, frameAt, planBall, prep, project, camWide, camReverse, fielderWorld, lookAt } from './broadcast'
import { endPoint, placeFielders } from './Stage'

const finite = (v: { x: number; y: number; z: number }) => Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z)

describe('the broadcast view plan', () => {
  it('works out a finite, sensible clip for every kind of ball', () => {
    const kinds = new Set<string>()
    const seen = new Set<string>()
    for (let seed = 1; seed <= 25; seed++) {
      const m = new Match({ teamA: BUILT_IN_TEAMS[2], teamB: BUILT_IN_TEAMS[9], format: 't20', seed })
      m.playMatch()
      for (const inn of m.innings) {
        const bowlSide = m.sides[1 - inn.battingSide]
        for (const ev of inn.log) {
          const striker = m.player(ev.strikerId)
          const plan0 = fieldPlan({ format: 't20', over: ev.over, maxOvers: 20, runs: ev.score.runs, legalBalls: ev.score.legalBalls, target: null, freeHit: false, bowlType: m.player(ev.bowlerId).bowling?.type ?? null, hand: striker.hand })
          const fielders = placeFielders(bowlSide.xi, ev.bowlerId, plan0.spots)
          const plan = planBall(ev, fielders.map((f) => ({ id: f.player.id, x: f.x, y: f.y, spot: f.spot })), endPoint(ev, fielders), striker.hand === 'L')
          kinds.add(plan.kind + (plan.reverse ? '+rev' : ''))
          if (ev.extraType === 'wide') { expect(plan.signal?.kind).toBe('wide'); expect(plan.keeperDive).not.toBeNull() }
          if (ev.extraType === 'noball') expect(plan.signal?.kind).toBe('noball')
          if (ev.extraType === 'legbye') expect(plan.hurt).toBe(true)
          if (ev.extraType === 'bye') expect(plan.keeperDive?.miss).toBe(true)
          if (ev.boundary === 6 && !ev.extraType) expect(plan.signal?.kind).toBe('six')
          if (ev.boundary === 4 && !ev.extraType) expect(plan.signal?.kind).toBe('four')
          expect(plan.total).toBeGreaterThan(2.5)
          expect(plan.total).toBeLessThan(5.5)
          expect(finite(plan.end)).toBe(true)
          if (ev.wicket) {
            const rest0 = fielders.map((f) => fielderWorld(f.x, f.y, f.spot))
            const last = frameAt(plan, plan.total, (i) => rest0[i])
            // every way of getting out ends with something to see: the stumps down, or the ball in a fielder's hands
            if (ev.wicket.kind === 'run out') {
              seen.add('runout')
              expect(plan.runOut).not.toBeNull()
              const ro = plan.runOut!
              expect((ro.destEnd === 0 ? last.stumps : last.stumpsBowl)).toBeGreaterThan(0.9)
              expect(Math.hypot(last.ball!.z - ro.throwTo.z, last.ball!.x - ro.throwTo.x)).toBeLessThan(0.1)
            }
            if (ev.wicket.kind !== 'run out') expect(plan.signal?.kind).toBe('out')
            if (ev.wicket.kind === 'bowled' || ev.wicket.kind === 'stumped') expect(last.stumps).toBeGreaterThan(0.9)
            if (ev.wicket.kind === 'caught and bowled') expect(plan.bowlerCatch).toBe(true)
            if (ev.wicket.kind === 'stumped') expect(plan.stepOut).toBe(true)
          }
          const rest = fielders.map((f) => fielderWorld(f.x, f.y, f.spot))
          for (let t = 0; t <= plan.total; t += 0.25) {
            const f = frameAt(plan, t, (i) => rest[i])
            expect(finite(f.aim)).toBe(true)
            expect(Number.isFinite(f.hfov)).toBe(true)
            if (f.ball) expect(finite(f.ball)).toBe(true)
            const cam = f.reverse ? camReverse : camWide
            const look = lookAt(cam.p, f.aim)
            expect(Number.isFinite(look.yaw) && Number.isFinite(look.pitch)).toBe(true)
          }
        }
      }
    }
    expect(kinds.size).toBeGreaterThanOrEqual(4)
    expect(seen.has('runout')).toBe(true)
  })

  it('puts the batsman in front of the wide camera and the ball in front of the other one', () => {
    const r = prep({ ...camWide, ...lookAt(camWide.p, { x: 0, y: 1, z: -6 }) }, 400, 250)
    const bat = project(r, { x: 0.75, y: 0, z: 0 })
    expect(bat).not.toBeNull()
    expect(bat!.x).toBeGreaterThan(200)
    // a point behind the camera is not drawn
    expect(project(r, { x: 0, y: 0, z: -60 })).toBeNull()
  })

  it('the ball climbs higher the further a six goes, and fours are a mix of drives along the ground and lofted shots', () => {
    const six = (seq: number, distance: number) => elevation({ seq, boundary: 6, distance, intent: 1, runsBat: 6, shot: undefined }, distance)
    let near = 0, far = 0
    for (let s = 1; s <= 60; s++) { near += six(s, 65).peak; far += six(s, 130).peak }
    expect(far / 60).toBeGreaterThan(near / 60 + 5)
    for (let s = 1; s <= 60; s++) { expect(six(s, 65).kind).toBe('air'); expect(six(s, 200).peak).toBeLessThan(40) }
    const four = (seq: number, intent: number) => elevation({ seq, boundary: 4, distance: undefined, intent, runsBat: 4, shot: undefined }, 60)
    const kinds = new Set<string>(), peaks = new Set<number>()
    for (let s = 1; s <= 80; s++) { const e = four(s, 1); kinds.add(e.kind); peaks.add(Math.round(e.peak)) }
    expect(kinds).toEqual(new Set(['ground', 'air']))
    expect(peaks.size).toBeGreaterThan(3)
    // an attacking batsman lofts more often than a cautious one
    const aerial = (intent: number) => Array.from({ length: 200 }, (_, i) => four(i + 1, intent)).filter((e) => e.kind === 'air').length
    expect(aerial(2)).toBeGreaterThan(aerial(-1))
    // a shot the person chose to loft is in the air
    expect(elevation({ seq: 5, boundary: 4, distance: undefined, intent: 0, runsBat: 4, shot: { angle: 0, loft: true } }, 60).kind).toBe('air')
  })

  it('a nick is replayed in slow motion, which makes the clip last longer; the warped time is steady and ends where the clip ends', () => {
    let nicks = 0
    for (let seed = 1; seed <= 40; seed++) {
      const m = new Match({ teamA: BUILT_IN_TEAMS[2], teamB: BUILT_IN_TEAMS[9], format: 't20', seed })
      m.playMatch()
      for (const inn of m.innings) {
        const bowlSide = m.sides[1 - inn.battingSide]
        for (const ev of inn.log) {
          const striker = m.player(ev.strikerId)
          const plan0 = fieldPlan({ format: 't20', over: ev.over, maxOvers: 20, runs: ev.score.runs, legalBalls: ev.score.legalBalls, target: null, freeHit: false, bowlType: null, hand: striker.hand })
          const fielders = placeFielders(bowlSide.xi, ev.bowlerId, plan0.spots)
          const plan = planBall(ev, fielders.map((f) => ({ id: f.player.id, x: f.x, y: f.y, spot: f.spot })), endPoint(ev, fielders), striker.hand === 'L')
          expect(plan.realTotal).toBeGreaterThanOrEqual(plan.total)
          expect(warpTime(plan, 0)).toBe(0)
          expect(warpTime(plan, plan.realTotal)).toBeCloseTo(plan.total, 5)
          let prev = -1
          for (let r = 0; r <= plan.realTotal; r += 0.1) { const t = warpTime(plan, r); expect(t).toBeGreaterThanOrEqual(prev); prev = t }
          if (plan.slow) { nicks++; expect(plan.realTotal).toBeGreaterThan(plan.total + 0.8); expect(ev.wicket?.kind).toBe('caught') }
        }
      }
    }
    expect(nicks).toBeGreaterThan(3)
  })

  it('after a fifty or hundred the camera goes in close on the batsman and tilts up', () => {
    let found = 0
    for (let seed = 1; seed <= 60 && found < 3; seed++) {
      const m = new Match({ teamA: BUILT_IN_TEAMS[2], teamB: BUILT_IN_TEAMS[9], format: 't20', seed })
      m.playMatch()
      for (const inn of m.innings) {
        const bowlSide = m.sides[1 - inn.battingSide]
        for (const ev of inn.log) {
          if (!ev.tags.some((t) => t === 'fifty' || t === 'hundred') || ev.wicket) continue
          const striker = m.player(ev.strikerId)
          const plan0 = fieldPlan({ format: 't20', over: ev.over, maxOvers: 20, runs: ev.score.runs, legalBalls: ev.score.legalBalls, target: null, freeHit: false, bowlType: null, hand: striker.hand })
          const fielders = placeFielders(bowlSide.xi, ev.bowlerId, plan0.spots)
          const plan = planBall(ev, fielders.map((f) => ({ id: f.player.id, x: f.x, y: f.y, spot: f.spot })), endPoint(ev, fielders), striker.hand === 'L')
          if (plan.celebrateAt === null) continue
          found++
          const rest = fielders.map((f) => fielderWorld(f.x, f.y, f.spot))
          const f = frameAt(plan, Math.min(plan.total, plan.celebrateAt + 1.5), (i) => rest[i])
          expect(f.hfov).toBeLessThan(0.35)
          expect(f.aim.y).toBeGreaterThan(1.4)
          expect(f.raise).toBeGreaterThan(0.9)
        }
      }
    }
    expect(found).toBeGreaterThan(0)
  })

  it('the boards light up for a boundary, at the angle round the rope where the ball went', () => {
    let seen = 0
    for (let seed = 1; seed <= 20 && seen < 5; seed++) {
      const m = new Match({ teamA: BUILT_IN_TEAMS[2], teamB: BUILT_IN_TEAMS[9], format: 't20', seed })
      m.playMatch()
      for (const inn of m.innings) {
        const bowlSide = m.sides[1 - inn.battingSide]
        for (const ev of inn.log) {
          if (!ev.boundary) continue
          const striker = m.player(ev.strikerId)
          const plan0 = fieldPlan({ format: 't20', over: ev.over, maxOvers: 20, runs: ev.score.runs, legalBalls: ev.score.legalBalls, target: null, freeHit: false, bowlType: null, hand: striker.hand })
          const fielders = placeFielders(bowlSide.xi, ev.bowlerId, plan0.spots)
          const plan = planBall(ev, fielders.map((f) => ({ id: f.player.id, x: f.x, y: f.y, spot: f.spot })), endPoint(ev, fielders), striker.hand === 'L')
          const rest = fielders.map((f) => fielderWorld(f.x, f.y, f.spot))
          const f = frameAt(plan, plan.tRun + plan.tDeliver + plan.tFlight + 0.5, (i) => rest[i])
          expect(f.board?.text).toBe(ev.boundary === 6 ? 'SIX' : 'FOUR')
          expect(f.board!.k).toBeGreaterThan(0.5)
          expect(Math.abs(f.board!.a)).toBeLessThanOrEqual(Math.PI)
          seen++
        }
      }
    }
    expect(seen).toBeGreaterThan(0)
  })
})
