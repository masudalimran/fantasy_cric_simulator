import { describe, expect, it } from 'vitest'
import { BUILT_IN_TEAMS } from '../../data/teams'
import { Match } from '../../engine/match'
import { ballSpeed } from '../../engine/speed'
import { fieldPlan } from './fieldSets'
import { batHitsBall, cameraFlair, beatenDot, diveSpot, planBall, ROPE, ropeDistance, sixReach, standHeight } from './broadcast'
import { endPoint, placeFielders } from './Stage'
import { flavorOfTeam, type Flavor } from '../../data/flavors'
import { FORE, SHIN, THIGH, UPPER, batsmanPose, bowlerPose, classifyShot, fielderPose, mirrorPose, nonStrikerPose, solve, standing, umpirePose, type Pose, type ShotStyle } from './bodyPose'

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y)
const STYLES: ShotStyle[] = ['defend', 'drive', 'straight', 'cut', 'pull', 'flick', 'sweep', 'reverse', 'ramp', 'scoop', 'loft', 'beaten', 'leave', 'hook', 'upper', 'glance', 'slog', 'paddle']
const base = { t1: 1, t2: 1.5, hurt: 0, raise: 0, joy: 0, speed: 0, cyc: 0, walkOff: false }

/** Every pose the game can draw, to check the bones keep their length. */
function allPoses(): Pose[] {
  const out: Pose[] = [standing()]
  for (const style of STYLES) for (const swing of [0, 0.2, 0.44, 0.7, 1]) for (const t of [0.4, 1.2, 1.6, 2.4]) out.push(batsmanPose({ ...base, style, swing, t, t2: 1.5 }))
  for (const flavor of ['samurai', 'fighter', 'ninja', 'mage', 'hero'] as Flavor[]) for (const style of STYLES) for (const swing of [0, 0.44, 1]) for (const joy of [0, 0.6]) out.push(batsmanPose({ ...base, flavor, style, swing, joy, t: swing ? 2 : 0.5, t2: 1.5 }))
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

  it('a challenge keeps the clip honest: the umpire\'s decision on the field, no walk-off, no celebration until the review is over', () => {
    let done = 0
    for (let seed = 1; seed <= 30 && done < 2; seed++) {
      const mm = new Match({ teamA: BUILT_IN_TEAMS[2], teamB: BUILT_IN_TEAMS[9], format: 't20', seed })
      mm.playMatch()
      for (const inn of mm.innings) {
        const bowlSide = mm.sides[1 - inn.battingSide]
        const ev = inn.log.find((e) => e.wicket?.kind === 'lbw' && !e.review)
        if (!ev) continue
        const striker = mm.player(ev.strikerId)
        const p0 = fieldPlan({ format: 't20', over: ev.over, maxOvers: 20, runs: ev.score.runs, legalBalls: ev.score.legalBalls, target: null, freeHit: false, bowlType: null, hand: striker.hand })
        const fielders = placeFielders(bowlSide.xi, ev.bowlerId, p0.spots)
        const plan = (e: typeof ev) => planBall(e, fielders.map((f) => ({ id: f.player.id, x: f.x, y: f.y, spot: f.spot })), endPoint(e, fielders), striker.hand === 'L')
        const review = { by: 'bowl' as const, kind: 'lbw' as const, originalOut: false, finalOut: true, overturned: true, desperate: false, left: 1, total: 2 }
        // given not out on the field, then the bowling side won the challenge: the clip shows a not-out and nobody leaves
        const won = plan({ ...ev, review })
        expect(won.reviewed).toBe(true)
        expect(won.exitAt).toBeNull()
        expect(won.signal?.kind).toBe('notout')
        // given out on the field and upheld: the finger goes up, but still nobody walks off in the clip
        const upheld = plan({ ...ev, review: { ...review, originalOut: true, overturned: false, by: 'bat' as const } })
        expect(upheld.exitAt).toBeNull()
        expect(upheld.signal?.kind).toBe('out')
        // no challenge: he walks off as before
        const plain = plan(ev)
        expect(plain.exitAt).not.toBeNull()
        expect(plain.reviewed).toBe(false)
        done++
        break
      }
    }
    expect(done).toBeGreaterThan(0)
  })

  it('a catch behind that is turned down or overturned still goes through to the keeper', () => {
    const mm = new Match({ teamA: BUILT_IN_TEAMS[2], teamB: BUILT_IN_TEAMS[9], format: 't20', seed: 4 })
    mm.playMatch()
    const inn = mm.innings[0]
    const bowlSide = mm.sides[1 - inn.battingSide]
    const ev = inn.log.find((e) => !e.wicket && !e.extraType && e.runsBat === 0 && e.legal)!
    const striker = mm.player(ev.strikerId)
    const p0 = fieldPlan({ format: 't20', over: ev.over, maxOvers: 20, runs: ev.score.runs, legalBalls: ev.score.legalBalls, target: null, freeHit: false, bowlType: null, hand: striker.hand })
    const fielders = placeFielders(bowlSide.xi, ev.bowlerId, p0.spots)
    const plan = (e: typeof ev) => planBall(e, fielders.map((f) => ({ id: f.player.id, x: f.x, y: f.y, spot: f.spot })), endPoint(e, fielders), striker.hand === 'L')
    const review = { by: 'bowl' as const, kind: 'edge' as const, originalOut: true, finalOut: false, overturned: true, desperate: false, left: 1, total: 2 }
    for (const e of [{ ...ev, review }, { ...ev, appeal: { kind: 'edge' as const, out: false } }]) {
      const p = plan(e)
      expect(p.kind).toBe('keeper')
      expect(p.catcher).toBe(0)
      expect(batHitsBall(e)).toBe(false)
    }
  })

  it('a four ends on the rope, whichever way it went', () => {
    let fours = 0, chased = 0
    for (let seed = 1; seed <= 10; seed++) {
      const mm = new Match({ teamA: BUILT_IN_TEAMS[2], teamB: BUILT_IN_TEAMS[9], format: 't20', seed })
      mm.playMatch()
      for (const inn of mm.innings) {
        const bowlSide = mm.sides[1 - inn.battingSide]
        for (const ev of inn.log.filter((e) => e.boundary === 4 && !e.extraType)) {
          const striker = mm.player(ev.strikerId)
          const p0 = fieldPlan({ format: 't20', over: ev.over, maxOvers: 20, runs: ev.score.runs, legalBalls: ev.score.legalBalls, target: null, freeHit: false, bowlType: null, hand: striker.hand })
          const fielders = placeFielders(bowlSide.xi, ev.bowlerId, p0.spots)
          const plan = planBall(ev, fielders.map((f) => ({ id: f.player.id, x: f.x, y: f.y, spot: f.spot })), endPoint(ev, fielders), striker.hand === 'L')
          const share = Math.hypot((plan.end.x - ROPE.cx) / ROPE.rx, (plan.end.z - ROPE.cz) / ROPE.rz)
          expect(share).toBeGreaterThan(0.97)
          expect(share).toBeLessThan(1.05)
          // a fielder who chases it never gets near the line the ball took
          if (plan.chaseTo) {
            const L = Math.hypot(plan.end.x - plan.meet.x, plan.end.z - plan.meet.z)
            const ux = (plan.end.x - plan.meet.x) / L, uz = (plan.end.z - plan.meet.z) / L
            const t = Math.max(0, Math.min(L, (plan.chaseTo.x - plan.meet.x) * ux + (plan.chaseTo.z - plan.meet.z) * uz))
            expect(Math.hypot(plan.chaseTo.x - (plan.meet.x + ux * t), plan.chaseTo.z - (plan.meet.z + uz * t))).toBeGreaterThan(6.9)
            chased++
          }
          fours++
        }
      }
    }
    expect(fours).toBeGreaterThan(20)
    expect(chased).toBeGreaterThan(10)
  })

  it('every built-in team has a heritage stance, and a team that is not known gets the plain one', () => {
    for (const t of BUILT_IN_TEAMS) expect(flavorOfTeam(t.id), t.id).not.toBe('plain')
    expect(flavorOfTeam('my-own-team')).toBe('plain')
    // the heritage changes how he stands, not how tall he is
    const plain = solve(batsmanPose({ ...base, style: 'drive', swing: 0, t: 0.2 }))
    const ninja = solve(batsmanPose({ ...base, flavor: 'ninja', style: 'drive', swing: 0, t: 0.2 }))
    expect(ninja.head.y).toBeGreaterThan(plain.head.y)
  })

  it('a match plays every kind of shot over enough balls, including the unusual ones', () => {
    const seen = new Set<string>()
    for (let seed = 1; seed <= 40; seed++) {
      const mm = new Match({ teamA: BUILT_IN_TEAMS[seed % 20], teamB: BUILT_IN_TEAMS[(seed * 7 + 3) % 20], format: 't20', seed })
      mm.playMatch()
      for (const inn of mm.innings) {
        const bowlSide = mm.sides[1 - inn.battingSide]
        for (const ev of inn.log) {
          const striker = mm.player(ev.strikerId)
          const p0 = fieldPlan({ format: 't20', over: ev.over, maxOvers: 20, runs: ev.score.runs, legalBalls: ev.score.legalBalls, target: null, freeHit: false, bowlType: null, hand: striker.hand })
          const fielders = placeFielders(bowlSide.xi, ev.bowlerId, p0.spots)
          seen.add(planBall(ev, fielders.map((f) => ({ id: f.player.id, x: f.x, y: f.y, spot: f.spot })), endPoint(ev, fielders), striker.hand === 'L', ballSpeed(ev, mm.player(ev.bowlerId))).shot)
        }
      }
    }
    for (const style of ['straight', 'drive', 'cut', 'pull', 'flick', 'sweep', 'defend']) expect(seen.has(style), style).toBe(true)
    expect(seen.size).toBeGreaterThanOrEqual(11)
  })
})

describe('smoother motion', () => {
  const batAt = (style: ShotStyle, swing: number) => batsmanPose({ style, t: 2, t1: 0.5, t2: 1.2, swing, hurt: 0, raise: 0, joy: 0, speed: 0, cyc: 0, walkOff: false })
  it('the bat is moving fastest at contact, not stopped there, for every shot', () => {
    for (const st of STYLES) {
      const a = (s: number) => batAt(st, s).bat ?? 0
      const before = Math.abs(a(0.44) - a(0.40)), early = Math.abs(a(0.12) - a(0.08)), after = Math.abs(a(0.48) - a(0.44))
      expect(Math.max(before, after), st).toBeGreaterThanOrEqual(early)
    }
  })
  it('the stroke has no jumps: neighbouring moments are near each other', () => {
    for (const st of STYLES) {
      let prev = batAt(st, 0.001)
      for (let s = 0.01; s <= 1; s += 0.01) {
        const q = batAt(st, s)
        expect(Math.abs((q.bat ?? 0) - (prev.bat ?? 0)), `${st} at ${s.toFixed(2)}`).toBeLessThan(40)
        expect(dist(q.handR, prev.handR), `${st} at ${s.toFixed(2)}`).toBeLessThan(14)
        prev = q
      }
    }
  })
  it('the bowler melts from the run-up into the jump', () => {
    const at = (t: number) => bowlerPose({ t, t1: 1, t2: 1.8, arm: 0, speed: 5, cyc: 1, joy: 0, wicket: false })
    const a = at(0.65), b = at(0.67), c = at(0.8)
    expect(dist(a.hip, b.hip)).toBeLessThan(2.5)
    expect(dist(b.footR, c.footR)).toBeLessThan(30)
  })
})

describe('TV camera', () => {
  const plan = { tRun: 1, tDeliver: 0.5, boundary: true, wicketFlies: false, six: false }
  it('drifts a little, more when zoomed in, never on the spider cam', () => {
    let wide = 0, tight = 0
    for (let n = 0; n < 20; n += 0.1) { wide = Math.max(wide, Math.abs(cameraFlair({ now: n, t: 0, hfov: 0.8, plan, overhead: false, replay: false, sinceCut: 9 }).dyaw)); tight = Math.max(tight, Math.abs(cameraFlair({ now: n, t: 0, hfov: 0.3, plan, overhead: false, replay: false, sinceCut: 9 }).dyaw)) }
    expect(wide).toBeGreaterThan(0.001); expect(wide).toBeLessThan(0.02); expect(tight).toBeGreaterThan(wide)
    expect(cameraFlair({ now: 3, t: 0, hfov: 0.3, plan, overhead: true, replay: false, sinceCut: 9 })).toEqual({ dyaw: 0, dpitch: 0, hfovScale: 1, blur: 0 })
  })
  it('punches in when a boundary is hit and settles back', () => {
    const f = (t: number, replay = false) => cameraFlair({ now: 0, t, hfov: 0.5, plan, overhead: false, replay, sinceCut: 9 }).hfovScale
    expect(f(0)).toBe(1)
    expect(f(1.55)).toBeLessThan(0.95)
    expect(f(4)).toBeGreaterThan(0.99)
    expect(f(1.55, true)).toBe(1) // not in a replay
  })
  it('softens the background when tight and after a cut, and keeps it sharp when wide', () => {
    const b = (hfov: number, sinceCut: number) => cameraFlair({ now: 0, t: 0, hfov, plan, overhead: false, replay: false, sinceCut }).blur
    expect(b(0.8, 9)).toBe(0)
    expect(b(0.25, 9)).toBeGreaterThan(1)
    expect(b(0.8, 0.05)).toBeGreaterThan(1.5)
    expect(b(0.8, 0.6)).toBe(0)
    expect(cameraFlair({ now: 0, t: 0, hfov: 0.25, plan, overhead: false, replay: true, sinceCut: 0 }).blur).toBe(0) // replays stay sharp
  })
})
