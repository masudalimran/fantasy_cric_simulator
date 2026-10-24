import { describe, expect, it } from 'vitest'
import { BUILT_IN_TEAMS } from '../../data/teams'
import { Match } from '../../engine/match'
import { fieldPlan } from './fieldSets'
import { batHitsBall, beatenDot, diveSpot, planBall, ROPE, ropeDistance, sixReach, standHeight } from './broadcast'
import { endPoint, placeFielders } from './Stage'
import { FORE, SHIN, THIGH, UPPER, batsmanPose, bowlerPose, classifyShot, fielderPose, mirrorPose, nonStrikerPose, solve, standing, umpirePose, type Pose, type ShotStyle } from './bodyPose'

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y)
const STYLES: ShotStyle[] = ['defend', 'drive', 'cut', 'pull', 'flick', 'sweep', 'loft', 'beaten', 'leave']
const base = { t1: 1, t2: 1.5, hurt: 0, raise: 0, joy: 0, speed: 0, cyc: 0, walkOff: false }

/** Every pose the game can draw, to check the bones keep their length. */
function allPoses(): Pose[] {
  const out: Pose[] = [standing()]
  for (const style of STYLES) for (const swing of [0, 0.2, 0.44, 0.7, 1]) for (const t of [0.4, 1.2, 1.6, 2.4]) out.push(batsmanPose({ ...base, style, swing, t, t2: 1.5 }))
  for (const t of [0.3, 0.7, 0.9, 1, 1.1, 1.5]) for (const arm of [0, 0.2, 0.5, 0.8, 1]) out.push(bowlerPose({ t, t1: 1, t2: 1.5, arm, speed: 5, cyc: t * 9, joy: 0.5, wicket: true }))
  for (const k of [0, 0.5, 1]) for (const keeper of [false, true]) out.push(fielderPose({ speed: 6, cyc: 2, ready: k, dive: k, catchK: k, joy: k, stop: k, throwK: k, keeper }))
  out.push(nonStrikerPose({ t: 0, t1: 1, speed: 5, cyc: 1, bat: true }), umpirePose(90, -90), umpirePose(0, -172), umpirePose(172, -172), batsmanPose({ ...base, style: 'drive', swing: 1, raise: 1, t: 5 }), batsmanPose({ ...base, style: 'drive', swing: 0, hurt: 1, t: 2 }))
  return out
}

describe('the bodies drawn in the broadcast view', () => {
  it('arms and legs keep their length in every pose, and nothing is ever not-a-number', () => {
    for (const p of allPoses()) {
      const s = solve(p)
      for (const v of Object.values(s)) if (v) { expect(Number.isFinite(v.x)).toBe(true); expect(Number.isFinite(v.y)).toBe(true) }
      expect(dist(s.shoulderL, s.elbowL)).toBeCloseTo(UPPER, 1)
      expect(dist(s.shoulderR, s.elbowR)).toBeCloseTo(UPPER, 1)
      expect(dist(s.hipL, s.kneeL)).toBeCloseTo(THIGH, 1)
      expect(dist(s.hipR, s.kneeR)).toBeCloseTo(THIGH, 1)
      // an arm or leg that cannot reach is simply as straight as it gets, so these are never longer than the bones
      expect(dist(s.elbowL, s.handL)).toBeLessThanOrEqual(FORE + 0.05)
      expect(dist(s.kneeR, s.footR)).toBeLessThanOrEqual(SHIN + 0.05)
    }
  })

  it('the batsman holds the bat in both hands for every shot', () => {
    for (const style of STYLES) {
      const s = solve(batsmanPose({ ...base, style, swing: 0.44, t: 1.6, t2: 1.5 }))
      expect(s.batTip).not.toBeNull()
      expect(dist(s.handL, s.handR)).toBeLessThan(9)
    }
  })

  it('a left-hander is the same pose turned round', () => {
    const p = batsmanPose({ ...base, style: 'cut', swing: 0.44, t: 1.6, t2: 1.5 })
    const m = mirrorPose(mirrorPose(p))
    expect(m.hip.x).toBeCloseTo(p.hip.x)
    expect(m.bat).toBeCloseTo(p.bat ?? 0)
    expect(mirrorPose(p).hip.x).toBeCloseTo(60 - p.hip.x)
  })

  it('the shot depends on where the ball went and how it was bowled', () => {
    const c = { swing: true, wide: false, runsBat: 4, boundary: 4 as const, air: false, kind: 'ground', side: -12, ahead: 18, length: -3, speed: 130, seq: 2 }
    expect(classifyShot(c)).toBe('drive')
    expect(classifyShot({ ...c, wide: true })).toBe('leave')
    expect(classifyShot({ ...c, kind: 'stumps', runsBat: 0, boundary: 0 })).toBe('beaten')
    expect(classifyShot({ ...c, ahead: -12, side: -15, length: -8.5 })).toBe('cut')
    expect(classifyShot({ ...c, ahead: -12, side: 15, length: -8.5 })).toBe('pull')
    expect(classifyShot({ ...c, runsBat: 6, boundary: 6, air: true, side: 4, ahead: 30 })).toBe('loft')
    expect(classifyShot({ ...c, runsBat: 0, boundary: 0, side: 2, ahead: 5 })).toBe('defend')
  })

  it('every ball of a match gets a shot, and a match plays a mix of them', () => {
    const seen = new Set<string>()
    for (let seed = 1; seed <= 6; seed++) {
      const m = new Match({ teamA: BUILT_IN_TEAMS[2], teamB: BUILT_IN_TEAMS[9], format: 't20', seed })
      m.playMatch()
      for (const inn of m.innings) {
        const bowlSide = m.sides[1 - inn.battingSide]
        for (const ev of inn.log) {
          const striker = m.player(ev.strikerId)
          const p0 = fieldPlan({ format: 't20', over: ev.over, maxOvers: 20, runs: ev.score.runs, legalBalls: ev.score.legalBalls, target: null, freeHit: false, bowlType: m.player(ev.bowlerId).bowling?.type ?? null, hand: striker.hand })
          const fielders = placeFielders(bowlSide.xi, ev.bowlerId, p0.spots)
          const plan = planBall(ev, fielders.map((f) => ({ id: f.player.id, x: f.x, y: f.y, spot: f.spot })), endPoint(ev, fielders), striker.hand === 'L')
          expect(STYLES).toContain(plan.shot)
          seen.add(plan.shot)
        }
      }
    }
    expect(seen.size).toBeGreaterThanOrEqual(6)
  })

  it('the bat is only heard when it meets the ball', () => {
    const ev = { seq: 5, runsBat: 0, legal: true, wicket: null, extraType: null, boundary: 0 as const }
    expect(batHitsBall({ ...ev, extraType: 'wide' })).toBe(false)
    expect(batHitsBall({ ...ev, extraType: 'bye' })).toBe(false)
    expect(batHitsBall({ ...ev, extraType: 'legbye' })).toBe(false)
    expect(batHitsBall({ ...ev, runsBat: 1 })).toBe(true)
    expect(batHitsBall({ ...ev, boundary: 4, runsBat: 4 })).toBe(true)
    const dd = { kind: 'bowled' as const, playerId: 'x' }
    expect(batHitsBall({ ...ev, wicket: dd as never })).toBe(false)
    expect(batHitsBall({ ...ev, wicket: { kind: 'caught', playerId: 'x' } as never })).toBe(true)
    // a dot ball is either played and missed (no sound) or kept out by the bat (a soft thud), never both
    const dots = Array.from({ length: 40 }, (_, i) => ({ ...ev, seq: i + 1 }))
    for (const d of dots) expect(batHitsBall(d)).toBe(!beatenDot(d))
    expect(dots.some((d) => beatenDot(d))).toBe(true)
    expect(dots.some((d) => !beatenDot(d))).toBe(true)
  })

  it('a diver at the rope falls across the ball from the side he came, well short of it', () => {
    const plan = { meet: { x: 0, y: 0.8, z: -0.4 }, end: { x: 30, y: 0, z: 40 } }
    const left = diveSpot(plan, { x: 22, y: 0, z: 35 })
    expect(plan.end.x - left.spot.x).toBeGreaterThan(2)
    expect(left.dx).toBe(1)
    const right = diveSpot(plan, { x: 36, y: 0, z: 35 })
    expect(right.spot.x - plan.end.x).toBeGreaterThan(2)
    expect(right.dx).toBe(-1)
  })

  it('a six lands where its distance says: in the stands for a normal one, outside the stadium for a monster', () => {
    expect(sixReach(60)).toBeLessThan(1.1)
    expect(sixReach(100)).toBeLessThanOrEqual(1.31)
    expect(sixReach(110)).toBeGreaterThan(1.34)
    expect(sixReach(150)).toBeGreaterThan(sixReach(110))
    expect(sixReach(200)).toBeGreaterThan(2)
    expect(standHeight(1.03)).toBeCloseTo(0.9)
    expect(standHeight(1.34)).toBeCloseTo(12)
    // the rope is where the line from the middle of the field meets the ellipse
    const t = ropeDistance({ x: ROPE.cx, y: 0, z: ROPE.cz }, 1, 0)
    expect(t).toBeCloseTo(ROPE.rx, 3)
    for (let seed = 1; seed <= 6; seed++) {
      const mm = new Match({ teamA: BUILT_IN_TEAMS[2], teamB: BUILT_IN_TEAMS[9], format: 't20', seed })
      mm.playMatch()
      for (const inn of mm.innings) {
        const bowlSide = mm.sides[1 - inn.battingSide]
        for (const ev of inn.log.filter((e) => e.boundary === 6 && e.distance)) {
          const striker = mm.player(ev.strikerId)
          const p0 = fieldPlan({ format: 't20', over: ev.over, maxOvers: 20, runs: ev.score.runs, legalBalls: ev.score.legalBalls, target: null, freeHit: false, bowlType: null, hand: striker.hand })
          const fielders = placeFielders(bowlSide.xi, ev.bowlerId, p0.spots)
          const plan = planBall(ev, fielders.map((f) => ({ id: f.player.id, x: f.x, y: f.y, spot: f.spot })), endPoint(ev, fielders), striker.hand === 'L')
          const reach = Math.hypot((plan.end.x - ROPE.cx) / ROPE.rx, (plan.end.z - ROPE.cz) / ROPE.rz)
          expect(reach).toBeGreaterThan(0.95)
          if (ev.distance! >= 130) expect(reach).toBeGreaterThan(1.36)
        }
      }
    }
  })
})
