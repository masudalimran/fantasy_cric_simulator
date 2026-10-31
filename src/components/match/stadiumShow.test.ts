import { describe, expect, it } from 'vitest'
import { camWide, ROPE } from './broadcast'
import { solve } from './bodyPose'
import { slopePoint } from './crowdDraw'
import { cameraAt, cheerAngle, screenAt, cheerleaders, crowdAt, huddlePerson, huddleSpot, ringPt, SHOW_SECONDS, sparksAt, startKey, type ShowKind, type StadiumShow } from './stadiumShow'

const KINDS: ShowKind[] = ['cheer', 'stands', 'huddle', 'fireworks', 'social']
const show = (kind: ShowKind, seed: number, variant?: StadiumShow['variant']): StadiumShow => ({ kind, variant, seed, colors: ['#f97316', '#1d4ed8'], sign: '6', name: 'Goku Son', word: 'U7W', why: 'boundary' })
const dist = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)

describe('the stadium shows', () => {
  it('every show starts exactly where the live broadcast camera is, so the picture does not jump', () => {
    for (const kind of KINDS) for (let seed = 1; seed <= 12; seed++) {
      const c = cameraAt(show(kind, seed, kind === 'cheer' ? 'pompom' : undefined), 0)
      expect(dist(c.p, camWide.p)).toBeLessThan(0.01)
      expect(Math.abs(c.hfov - camWide.hfov)).toBeLessThan(0.01)
      expect(Math.abs(c.yaw - camWide.yaw)).toBeLessThan(0.02)
      expect(Math.abs(c.pitch - camWide.pitch)).toBeLessThan(0.02)
    }
    expect(startKey().hfov).toBe(camWide.hfov)
  })
  it('the camera moves smoothly: no jumps from one moment to the next, and it stays inside the stadium', () => {
    for (const kind of KINDS) for (const seed of [3, 8, 21]) {
      const s = show(kind, seed, kind === 'cheer' ? (seed === 3 ? 'pompom' : seed === 8 ? 'cards' : 'pyramid') : undefined)
      let prev = cameraAt(s, 0)
      for (let t = 0.05; t <= SHOW_SECONDS[kind]; t += 0.05) {
        const c = cameraAt(s, t)
        expect(dist(c.p, prev.p), `${kind} ${seed} at ${t.toFixed(2)}`).toBeLessThan(3.5)
        expect(Math.abs(c.hfov - prev.hfov)).toBeLessThan(0.05)
        expect(Number.isFinite(c.yaw + c.pitch + c.hfov)).toBe(true)
        expect(Math.hypot((c.p.x - ROPE.cx) / (ROPE.rx * 1.3), (c.p.z - ROPE.cz) / (ROPE.rz * 1.3))).toBeLessThan(1)
        expect(c.p.y).toBeGreaterThan(0.5)
        prev = c
      }
    }
  })
  it('the stands cam ends up looking at the crowd, and the card stunt at the card block', () => {
    for (let seed = 1; seed <= 8; seed++) {
      const c = crowdAt(show('stands', seed), 3)!
      expect(c.signs?.length).toBe(2)
      expect(c.a1).toBeGreaterThan(c.a0)
      const k = crowdAt(show('cheer', seed, 'cards'), 6)!
      expect(k.cards!.grid.length).toBe(7)
      expect(k.cards!.grid[0].length).toBe(17) // three letters of five dots and a gap between
      expect(k.cards!.a0).toBeGreaterThan(k.a0)
      expect(crowdAt(show('huddle', seed), 3)).toBeNull()
      expect(crowdAt(show('fireworks', seed), 3)).toBeNull()
    }
    const p = slopePoint(0.5, 0.5)
    expect(Math.hypot((p.x - ROPE.cx) / ROPE.rx, (p.z - ROPE.cz) / ROPE.rz)).toBeGreaterThan(1.03)
  })
  it('the giant screen shows the fan wall, and the posts come in one after another', () => {
    const s: StadiumShow = { ...show('social', 3), hashtag: 'SORvHLS', posts: [1, 2, 3].map((n) => ({ name: 'Fan', handle: '@fan' + n, side: 0 as const, text: 'Great shot', likes: 100, shares: 10, replies: 1, age: '1m' })) }
    expect(screenAt(s, 3)!.posts.length).toBe(3)
    expect(screenAt(s, 3)!.hashtag).toBe('SORvHLS')
    expect(screenAt(show('stands', 3), 3)).toBeNull()
    expect(screenAt(show('social', 3), 3)).toBeNull() // (no posts, no screen)
    expect(crowdAt(s, 3)!.k).toBeGreaterThan(0.5) // the stands under the screen are lively
  })
  it('the fireworks go up and burst in the sky above the stands, glow and fade away', () => {
    const s = show('fireworks', 5)
    let burst = 0, maxFlash = 0
    for (let t = 0; t <= SHOW_SECONDS.fireworks; t += 0.1) {
      const { sparks, flash } = sparksAt(s, t)
      maxFlash = Math.max(maxFlash, flash)
      for (const sp of sparks) { expect(sp.a).toBeGreaterThanOrEqual(0); expect(sp.a).toBeLessThanOrEqual(1); expect(sp.p.y).toBeGreaterThan(-40) }
      if (sparks.length > 40) burst++
    }
    expect(burst).toBeGreaterThan(20)
    expect(maxFlash).toBeGreaterThan(0.5)
    expect(sparksAt(s, 0).sparks.length).toBe(0) // quiet at the start
  })
  it('the cheerleaders stand just inside the rope, six of them, and the pyramid has three, two and one on top', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const g = ringPt(cheerAngle(seed), 0.945)
      for (const variant of ['pompom', 'flags', 'pyramid'] as const) for (const t of [0.5, 2, 3.5, 4.5, 6.5]) {
        const d = cheerleaders(show('cheer', seed, variant), t)
        expect(d.length).toBe(6)
        for (const x of d) {
          expect(Math.hypot(x.pos.x - g.x, x.pos.z - g.z)).toBeLessThan(6)
          const sk = solve(x.pose)
          for (const v of Object.values(sk)) if (v) expect(Number.isFinite(v.x + v.y)).toBe(true)
        }
      }
      const top = cheerleaders(show('cheer', seed, 'pyramid'), 5)
      const lifts = top.map((x) => x.pos.y).sort((a, b) => a - b)
      expect(lifts[0]).toBeLessThan(0.1)
      expect(lifts[5]).toBeGreaterThan(1.6) // the one on top
      expect(lifts.filter((l) => l > 0.8 && l < 1.4).length).toBe(2)
    }
  })
  it('the huddle: they walk in from where they stood, form a ring, and jump when it breaks', () => {
    const s = show('huddle', 4)
    const n = 12
    for (let i = 0; i < n; i++) {
      const from = { x: -30 + i * 5, y: 0, z: 10 }
      const start = huddlePerson(s, 0, i, n, from)
      expect(dist(start.pos, from)).toBeLessThan(0.01)
      const mid = huddlePerson(s, 3.6, i, n, from)
      expect(dist(mid.pos, huddleSpot(s, i, n))).toBeLessThan(0.01)
      expect(mid.walking).toBe(false)
      const end = huddlePerson(s, 6, i, n, from)
      expect(end.pose).not.toBeNull()
    }
  })
})
