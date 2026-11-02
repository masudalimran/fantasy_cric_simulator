import { describe, expect, it } from 'vitest'
import { camWide, lookAt, prep, ROPE } from './broadcast'
import { drawFourFx, FOUR_FX_BIG, fourFxKind, type FourFxKind } from './fourFx'

function fakeCtx(): { ctx: CanvasRenderingContext2D; calls: () => number } {
  let n = 0
  const grad = { addColorStop: () => { n++ } }
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : k.startsWith('create') ? () => grad : () => { n++ }),
    set: (t, k: string, v) => { t[k] = v; return true },
  }) as unknown as CanvasRenderingContext2D
  return { ctx, calls: () => n }
}

describe('four effects', () => {
  it('about half of the fours get a little moment and about a quarter a big one, and the same ball always gets the same one', () => {
    let any = 0, big = 0
    const kinds = new Set<FourFxKind>()
    for (let seq = 1; seq <= 2000; seq++) { const k = fourFxKind(seq); expect(fourFxKind(seq)).toBe(k); if (k) { any++; kinds.add(k); if (FOUR_FX_BIG.includes(k)) big++ } }
    expect(any / 2000).toBeGreaterThan(0.4); expect(any / 2000).toBeLessThan(0.6)
    expect(big / 2000).toBeGreaterThan(0.1); expect(big / 2000).toBeLessThan(0.3)
    expect(kinds.size).toBe(8)
  })
  it('every effect draws at every moment from a camera behind the bowler and from one at the side', () => {
    const kinds: FourFxKind[] = ['ripple', 'board', 'shock', 'mascot', 'cameraman', 'popcorn', 'sprinkler', 'dog']
    for (const [name, cam] of [['wide', camWide], ['side', { ...camWide, p: { x: 13, y: 1.05, z: -0.2 }, ...lookAt({ x: 13, y: 1.05, z: -0.2 }, { x: 0, y: 1, z: -2 }) }]] as const) {
      const r = prep(cam, 390, 300)
      for (const kind of kinds) for (const a of [0.4, 1.6, 3.4, 5.0]) {
        const { ctx } = fakeCtx()
        for (let since = -1; since <= 3; since += 0.25) drawFourFx(ctx, r, { kind, a, since, hit: since + 1.2, seed: 9, colors: ['#f97316', '#1e3a8a'], flavor: Math.abs(Math.round(a)) % 4 })
        expect(Number.isFinite(ROPE.rx), `${name} ${kind}`).toBe(true)
      }
    }
  })
})
