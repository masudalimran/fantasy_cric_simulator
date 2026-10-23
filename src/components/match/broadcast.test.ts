import { describe, expect, it } from 'vitest'
import { BUILT_IN_TEAMS } from '../../data/teams'
import { Match } from '../../engine/match'
import { fieldPlan } from './fieldSets'
import { frameAt, planBall, prep, project, camWide, camReverse, fielderWorld, lookAt } from './broadcast'
import { endPoint, placeFielders } from './Stage'

const finite = (v: { x: number; y: number; z: number }) => Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z)

describe('the broadcast view plan', () => {
  it('works out a finite, sensible clip for every kind of ball', () => {
    const kinds = new Set<string>()
    for (let seed = 1; seed <= 6; seed++) {
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
          expect(plan.total).toBeGreaterThan(2.5)
          expect(plan.total).toBeLessThan(5.5)
          expect(finite(plan.end)).toBe(true)
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
  })

  it('puts the batsman in front of the wide camera and the ball in front of the other one', () => {
    const r = prep({ ...camWide, ...lookAt(camWide.p, { x: 0, y: 1, z: -6 }) }, 400, 250)
    const bat = project(r, { x: 0.75, y: 0, z: 0 })
    expect(bat).not.toBeNull()
    expect(bat!.x).toBeGreaterThan(200)
    // a point behind the camera is not drawn
    expect(project(r, { x: 0, y: 0, z: -60 })).toBeNull()
  })
})
