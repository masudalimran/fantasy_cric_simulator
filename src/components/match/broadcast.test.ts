import { describe, expect, it } from 'vitest'
import { BUILT_IN_TEAMS } from '../../data/teams'
import { Match } from '../../engine/match'
import { fieldPlan } from './fieldSets'
import { screenSide, elevation, replayCamera, replayCamFor, withReplaySlow, withStumpSlow, withRunOutSlow, withPhantomSlow, BOWL_Z, warpTime, frameAt, planBall, prep, project, camWide, camReverse, fielderWorld, lookAt } from './broadcast'
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
          if (ev.extraType === 'noball' && !ev.wicket) expect(plan.signal?.kind).toBe('noball')
          if (ev.extraType === 'legbye') expect(plan.hurt).toBe(true)
          if (ev.extraType === 'bye') expect(plan.keeperDive?.miss).toBe(true)
          if (ev.boundary === 6 && !ev.extraType) expect(plan.signal?.kind).toBe('six')
          if (ev.boundary === 4 && !ev.extraType) expect(plan.signal?.kind).toBe('four')
          expect(plan.total).toBeGreaterThan(2.5)
          expect(plan.total).toBeLessThan(7)
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
            if (ev.wicket.kind !== 'run out') expect(plan.signal?.kind).toBe(ev.review && !ev.review.originalOut ? 'notout' : 'out')
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

  it('a replay uses another camera and slows down around the shot, so it does not look like the live picture again', () => {
    const live = camWide.p
    for (const kind of ['side', 'high', 'stump'] as const) {
      const c = replayCamera(kind, 7)
      // somewhere else from the live camera, and turned towards the pitch from there
      expect(Math.hypot(c.cam.p.x - live.x, c.cam.p.y - live.y, c.cam.p.z - live.z)).toBeGreaterThan(8)
      const look = lookAt(c.cam.p, { x: 0, y: 0.5, z: -8 })
      expect(Number.isFinite(look.yaw) && Number.isFinite(look.pitch)).toBe(true)
      expect(c.label.length).toBeGreaterThan(3)
      expect(c.minHfov).toBeGreaterThan(0.4)
    }
    // the side-on camera is on one side or the other by ball
    const sides = new Set<number>()
    for (let s = 1; s <= 30; s++) sides.add(Math.sign(replayCamera('side', s).cam.p.x))
    expect(sides.size).toBe(2)
    // the kind of replay decides the camera: the stump cam only for the ways of being bowled out
    for (let s = 1; s <= 40; s++) { expect(replayCamFor('four', s)).not.toBe('stump'); expect(replayCamFor('stumped', s)).toBe('gloves') }
    const cams = new Set<string>()
    for (let s = 1; s <= 40; s++) cams.add(replayCamFor('bowled', s))
    expect(cams.has('stump')).toBe(true)
    // slow motion is added around the bat meeting the ball, and makes the clip longer
    const m = new Match({ teamA: BUILT_IN_TEAMS[2], teamB: BUILT_IN_TEAMS[9], format: 't20', seed: 4 })
    m.playMatch()
    const ev = m.innings[0].log.find((e) => e.boundary === 4)!
    const bowlSide = m.sides[1 - m.innings[0].battingSide]
    const plan0 = fieldPlan({ format: 't20', over: ev.over, maxOvers: 20, runs: ev.score.runs, legalBalls: ev.score.legalBalls, target: null, freeHit: false, bowlType: null, hand: m.player(ev.strikerId).hand })
    const fielders = placeFielders(bowlSide.xi, ev.bowlerId, plan0.spots)
    const plan = planBall(ev, fielders.map((f) => ({ id: f.player.id, x: f.x, y: f.y, spot: f.spot })), endPoint(ev, fielders), false)
    const slow = withReplaySlow(plan)
    expect(slow.slow).not.toBeNull()
    expect(slow.realTotal).toBeGreaterThan(plan.total + 1)
    expect(withReplaySlow(slow)).toBe(slow)
  })

  it('a diver drops towards the ball on the screen, whichever camera is looking', () => {
    // the ball is to the right of the diver (world +x): from the live camera (looking down the pitch) he falls right; from the reverse camera, left
    const dv = { dx: 4, dz: 0, dir: 1 }
    expect(screenSide(dv, 0)).toBe(1)
    expect(screenSide(dv, Math.PI)).toBe(-1)
    // from the side camera the same ball is towards or away from the camera: left or right on the screen
    expect(Math.abs(screenSide({ dx: 0, dz: 5, dir: 1 }, Math.PI / 2))).toBe(1)
    expect(screenSide({ dx: 0, dz: 5, dir: 1 }, Math.PI / 2)).toBe(-screenSide({ dx: 0, dz: 5, dir: 1 }, -Math.PI / 2))
    expect(screenSide({ dx: 0, dz: 0, dir: -1 }, 0)).toBe(-1)
    // and the dives the clip makes carry where the ball is
    for (let seed = 1; seed <= 20; seed++) {
      const m = new Match({ teamA: BUILT_IN_TEAMS[2], teamB: BUILT_IN_TEAMS[9], format: 't20', seed })
      m.playMatch()
      for (const inn of m.innings) {
        const bowlSide = m.sides[1 - inn.battingSide]
        for (const ev of inn.log) {
          if (ev.extraType !== 'wide' && ev.boundary !== 4) continue
          const plan0 = fieldPlan({ format: 't20', over: ev.over, maxOvers: 20, runs: ev.score.runs, legalBalls: ev.score.legalBalls, target: null, freeHit: false, bowlType: null, hand: m.player(ev.strikerId).hand })
          const fielders = placeFielders(bowlSide.xi, ev.bowlerId, plan0.spots)
          const plan = planBall(ev, fielders.map((f) => ({ id: f.player.id, x: f.x, y: f.y, spot: f.spot })), endPoint(ev, fielders), false)
          const rest = fielders.map((f) => fielderWorld(f.x, f.y, f.spot))
          for (let t = 0; t <= plan.total; t += 0.1) for (const d of frameAt(plan, t, (i) => rest[i]).dives.values()) { expect(Number.isFinite(d.dx) && Number.isFinite(d.dz)).toBe(true); expect(Math.abs(d.dx) + Math.abs(d.dz) + Math.abs(d.dir)).toBeGreaterThan(0) }
        }
      }
    }
  })

  it('the side-on replay camera stands on the side the ball went to, and the spider cam flies with the ball the live way up', () => {
    expect(replayCamera('side', 3, 1).cam.p.x).toBeGreaterThan(0)
    expect(replayCamera('side', 3, -1).cam.p.x).toBeLessThan(0)
    expect(replayCamera('high', 3).overhead).toBe(true)
    expect(replayCamera('side', 3).overhead).toBeFalsy()
  })
})

describe('a stumping, played the way it happens', () => {
  const m = new Match({ teamA: BUILT_IN_TEAMS[2], teamB: BUILT_IN_TEAMS[9], format: 't20', seed: 5 })
  m.playMatch()
  const inn = m.innings[0]
  const base = inn.log.find((x) => x.legal && !x.extraType && !x.wicket && !x.boundary)!
  const side = m.sides[1 - inn.battingSide]
  const planFor = (seq: number) => {
    const e = { ...base, seq, wicket: { kind: 'stumped' as const, playerId: base.strikerId, bowlerId: base.bowlerId, fielderId: side.xi[0].id } } as typeof base
    const striker = m.player(e.strikerId)
    const p0 = fieldPlan({ format: 't20', over: e.over, maxOvers: 20, runs: e.score.runs, legalBalls: e.score.legalBalls, target: null, freeHit: false, bowlType: null, hand: striker.hand })
    const fielders = placeFielders(side.xi, e.bowlerId, p0.spots)
    return { plan: planBall(e, fielders.map((f) => ({ id: f.player.id, x: f.x, y: f.y, spot: f.spot })), endPoint(e, fielders), striker.hand === 'L', 135, { bowler: m.player(e.bowlerId) }), rest: fielders.map((f) => fielderWorld(f.x, f.y, f.spot)) }
  }
  it('he is out of his ground when he misses it, the keeper gathers it and only then whips the bails off', () => {
    for (let seq = 1; seq <= 20; seq++) {
      const { plan, rest } = planFor(seq)
      const t2 = plan.tRun + plan.tDeliver, t3 = t2 + plan.tFlight
      const at = (t: number) => frameAt(plan, t, (i) => rest[i] ?? { x: 0, y: 0, z: 0 })
      expect(plan.stump!.breakAt).toBeGreaterThan(t3) // after the ball is in the gloves
      expect(at(t3 - 0.05).stumps).toBe(0) // not a bail moved before then
      expect(at(plan.stump!.breakAt - 0.01).stumps).toBe(0)
      expect(at(plan.stump!.breakAt + 0.9).stumps).toBeGreaterThan(0.9)
      // his back foot is beyond the popping crease (1.22 m in front of the stumps) by the gap on the screen
      const s = at(t2 + 0.5).striker!
      expect(s.z).toBeLessThan(-1.22 - plan.stump!.gap / 100)
      // the keeper stands right behind the stumps, gathers the ball there and the ball is with him
      const k = at(t3 + 0.05).moving.get(0)!
      expect(k.z).toBeGreaterThan(0.2); expect(k.z).toBeLessThan(1.2)
      expect(at(t3).keeperStump).toBeLessThan(0.3)
      expect(at(plan.stump!.breakAt).keeperStump).toBeGreaterThan(0.9)
      expect(at(t3 + 0.04).stranded).toBe(1)
    }
  })
  it('the stumping camera sits low at square leg and the slow motion is around the bails', () => {
    const cam = replayCamera('gloves', 3, -1)
    expect(cam.cam.p.y).toBeLessThan(1.5)
    expect(Math.abs(cam.cam.p.x)).toBeGreaterThan(8)
    const { plan } = planFor(3)
    const slow = withStumpSlow(plan)
    expect(slow.slow!.at).toBeLessThan(plan.stump!.breakAt)
    expect(slow.slow!.at + slow.slow!.len).toBeGreaterThan(plan.stump!.breakAt)
  })
})

describe('a run out, an appeal, a dropped catch and the phantom camera', () => {
  const m = new Match({ teamA: BUILT_IN_TEAMS[2], teamB: BUILT_IN_TEAMS[9], format: 't20', seed: 5 })
  m.playMatch()
  const inn = m.innings[0]
  const base = inn.log.find((x) => x.legal && !x.extraType && !x.wicket && !x.boundary && x.runsBat === 0)!
  const side = m.sides[1 - inn.battingSide]
  const planWith = (o: object) => {
    const e = { ...base, ...o } as typeof base
    const striker = m.player(e.strikerId)
    const p0 = fieldPlan({ format: 't20', over: e.over, maxOvers: 20, runs: e.score.runs, legalBalls: e.score.legalBalls, target: null, freeHit: false, bowlType: null, hand: striker.hand })
    const fielders = placeFielders(side.xi, e.bowlerId, p0.spots)
    return { plan: planBall(e, fielders.map((f) => ({ id: f.player.id, x: f.x, y: f.y, spot: f.spot })), endPoint(e, fielders), striker.hand === 'L', 135, { bowler: m.player(e.bowlerId) }), rest: fielders.map((f) => fielderWorld(f.x, f.y, f.spot)) }
  }
  it('a run out: the batsman is stopped short of the crease by exactly the centimetres on the screen when the stumps are hit', () => {
    for (let seq = 1; seq <= 24; seq++) {
      const { plan, rest } = planWith({ seq, runsBat: 1, total: 1, wicket: { kind: 'run out', playerId: base.strikerId, bowlerId: base.bowlerId, fielderId: side.xi[4].id } })
      const ro = plan.runOut!
      const hit = plan.tRun + plan.tDeliver + plan.tFlight + ro.tThrow
      const f = frameAt(plan, hit, (i) => rest[i] ?? { x: 0, y: 0, z: 0 })
      const r = ro.outIsStriker ? f.runners!.a : f.runners!.b
      const crease = ro.destEnd === 0 ? -1.22 : BOWL_Z + 1.22
      const shortBy = ro.destEnd === 0 ? crease - r.z : r.z - crease
      // (the runner also swerves a little sideways, so only the way along the pitch is compared)
      expect(shortBy * 100, `seq ${seq}`).toBeGreaterThan(ro.gapCm - 6)
      expect(shortBy * 100, `seq ${seq}`).toBeLessThan(ro.gapCm + 6)
    }
    const { plan } = planWith({ seq: 3, runsBat: 1, total: 1, wicket: { kind: 'run out', playerId: base.strikerId, bowlerId: base.bowlerId, fielderId: side.xi[4].id } })
    const cam = replayCamera('runout', 3, -1, plan.runOut!.destEnd === 0 ? 0 : BOWL_Z)
    expect(cam.cam.p.y).toBeLessThan(1.5)
    const sl = withRunOutSlow(plan)
    const hit = plan.tRun + plan.tDeliver + plan.tFlight + plan.runOut!.tThrow
    expect(sl.slow!.at).toBeLessThan(hit); expect(sl.slow!.at + sl.slow!.len).toBeGreaterThan(hit)
  })
  it('an lbw, a catch behind and a stumping all get an appeal: the umpire is looked at while they shout', () => {
    for (const w of [{ kind: 'lbw' }, { kind: 'stumped', fielderId: side.xi[0].id }] as const) {
      const { plan, rest } = planWith({ seq: 7, wicket: { ...w, playerId: base.strikerId, bowlerId: base.bowlerId } })
      expect(plan.appealAt).not.toBeNull()
      const mid = plan.appealAt!.at + 0.4
      const f = frameAt(plan, mid, (i) => rest[i] ?? { x: 0, y: 0, z: 0 })
      expect(f.appealK).toBeGreaterThan(0.9)
      expect(f.aim.z).toBeLessThan(-15) // looking at the umpire at the bowler's end
      expect(frameAt(plan, plan.appealAt!.at + plan.appealAt!.len + 0.6, (i) => rest[i] ?? { x: 0, y: 0, z: 0 }).appealK).toBe(0)
    }
    expect(planWith({ seq: 8 }).plan.appealAt).toBeNull() // an ordinary dot ball has none
  })
  it('some lofted catches are put down: it lands at his hands, the bowler puts his hands on his head', () => {
    let dropped = 0
    for (let seq = 1; seq <= 200; seq++) {
      const { plan, rest } = planWith({ seq, runsBat: 2, total: 2 })
      if (!plan.dropped) continue
      dropped++
      expect(plan.fellShort!.gap).toBeLessThan(0.3)
      expect(plan.react!.text).toBe('Dropped!')
      const t3 = plan.tRun + plan.tDeliver + plan.tFlight
      expect(frameAt(plan, t3 + 0.5, (i) => rest[i] ?? { x: 0, y: 0, z: 0 }).despair).toBeGreaterThan(0.9)
    }
    expect(dropped).toBeGreaterThan(0)
  })
  it('the phantom camera is very close and the slow motion is extreme and short, around the contact', () => {
    const cam = replayCamera('phantom', 5, 1)
    expect(cam.cam.hfov).toBeLessThan(0.5)
    const { plan } = planWith({ seq: 5 })
    const sl = withPhantomSlow(plan)
    expect(sl.slow!.factor).toBeLessThan(0.1)
    expect(sl.slow!.len).toBeLessThan(0.5)
    const hit = plan.tRun + plan.tDeliver
    expect(sl.slow!.at).toBeLessThan(hit); expect(sl.slow!.at + sl.slow!.len).toBeGreaterThan(hit)
  })

  it('catches are taken in more than one way: standing, a dive, a leap, a stretch, on the run, a slide', () => {
    const styles = new Set<string>()
    for (let seed = 1; seed <= 30; seed++) {
      const m = new Match({ teamA: BUILT_IN_TEAMS[2], teamB: BUILT_IN_TEAMS[9], format: 't20', seed }); m.playMatch()
      for (const ev of m.innings[0].log.filter((e) => e.wicket?.kind === 'caught')) {
        const bowlSide = m.sides[1 - m.innings[0].battingSide]
        const p0 = fieldPlan({ format: 't20', over: ev.over, maxOvers: 20, runs: ev.score.runs, legalBalls: ev.score.legalBalls, target: null, freeHit: false, bowlType: null, hand: m.player(ev.strikerId).hand })
        const f = placeFielders(bowlSide.xi, ev.bowlerId, p0.spots)
        styles.add(planBall(ev, f.map((x) => ({ id: x.player.id, x: x.x, y: x.y, spot: x.spot })), endPoint(ev, f), false).catchStyle)
      }
    }
    expect(styles.size).toBeGreaterThanOrEqual(4)
  })
})
