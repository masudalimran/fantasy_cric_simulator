/** Small seeded PRNG (mulberry32) so a match can be replayed exactly from its seed. */
export class Rng {
  private s: number
  constructor(seed: number) {
    this.s = seed >>> 0
  }
  /** Uniform in [0, 1). */
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0
    let t = this.s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  int(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive)
  }
  chance(p: number): boolean {
    return this.next() < p
  }
  /** Standard normal via Box-Muller. */
  normal(): number {
    const u = 1 - this.next()
    const v = this.next()
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  }
  /** Index chosen with probability proportional to its weight. */
  weighted(weights: readonly number[]): number {
    let total = 0
    for (const w of weights) total += w
    let r = this.next() * total
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i]
      if (r < 0) return i
    }
    return weights.length - 1
  }
  /** In-place Fisher-Yates shuffle; returns the same array. */
  shuffle<T>(items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i--) {
      const j = this.int(i + 1)
      ;[items[i], items[j]] = [items[j], items[i]]
    }
    return items
  }
  pick<T>(items: readonly T[]): T {
    return items[this.int(items.length)]
  }
}

export const randomSeed = () => (Math.random() * 2 ** 32) >>> 0
