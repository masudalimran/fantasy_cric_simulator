import { describe, expect, it } from 'vitest'
import { drawSixScene, SIX_SCENES, SIX_SCENE_TEXT } from './sixScenes'
import { cameraAt, moonOutcome, SHOW_SECONDS, type StadiumShow } from './stadiumShow'

/** A stand-in for a canvas that accepts every call and counts them (the drawing is checked for crashes, not looks). */
function fakeCtx(): { ctx: CanvasRenderingContext2D; calls: () => number } {
  let n = 0
  const grad = { addColorStop: () => { n++ } }
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : k.startsWith('create') ? () => grad : () => { n++ }),
    set: (t, k: string, v) => { t[k] = v; return true },
  }) as unknown as CanvasRenderingContext2D
  return { ctx, calls: () => n }
}

describe('six cut-away scenes', () => {
  it('every scene draws at every moment of its time on a phone-sized and a wide frame without a problem', () => {
    for (const kind of SIX_SCENES) for (const [W, H] of [[390, 760], [800, 400]]) {
      const { ctx, calls } = fakeCtx()
      for (let tau = 0; tau <= 5; tau += 0.2) drawSixScene(ctx, W, H, kind, tau, tau * 1.7, 12345)
      expect(calls(), kind).toBeGreaterThan(100)
      expect(SIX_SCENE_TEXT[kind].length).toBeGreaterThan(10)
    }
  })
  it('a six out of the ground ends up in any of the places, and the camera stays smooth for each', () => {
    const seen = new Set<string>()
    for (let seed = 1; seed <= 60; seed++) seen.add(moonOutcome(seed))
    expect(seen.size).toBeGreaterThanOrEqual(8)
    for (const outcome of seen) {
      const s: StadiumShow = { kind: 'moonshot', seed: 9, colors: ['#222', '#eee'], outcome: outcome as StadiumShow['outcome'], landing: { x: 150, y: 0, z: -20 }, from: { x: 0.75, y: 1, z: -1.2 } }
      let prev = cameraAt(s, 0)
      for (let t = 0.05; t <= SHOW_SECONDS.moonshot; t += 0.05) {
        const c = cameraAt(s, t)
        expect(Number.isFinite(c.yaw + c.pitch + c.hfov + c.p.y), `${outcome} ${t.toFixed(2)}`).toBe(true)
        expect(Math.hypot(c.p.x - prev.p.x, c.p.y - prev.p.y, c.p.z - prev.p.z), `${outcome} ${t.toFixed(2)}`).toBeLessThan(10)
        prev = c
      }
    }
  })
})
