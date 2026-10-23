import { BUILT_IN_TEAMS } from '../src/data/teams'
import { Match } from '../src/engine/match'
import { pitchLean } from '../src/engine/pitchInfo'

const N = Number(process.argv[2] ?? 3000)
const fmt = (process.argv[3] ?? 't20') as 't20' | 'odi'
const buckets: Record<string, { n: number; batFirstWins: number; r1: number; r2: number }> = {}
let sum1 = 0, sum2 = 0
for (let i = 0; i < N; i++) {
  const a = BUILT_IN_TEAMS[(i * 7) % 20], b = BUILT_IN_TEAMS[(i * 7 + 1 + (i % 5)) % 20]
  if (a.id === b.id) continue
  const m = new Match({ teamA: a, teamB: b, format: fmt, seed: 1000 + i, toss: { winnerSide: 0, decision: 'bat' } })
  const lean = pitchLean(m.pitch)
  m.playMatch()
  const k = lean > 0.4 ? 'bat+' : lean < -0.4 ? 'bowl+' : 'even'
  const bk = (buckets[k] ??= { n: 0, batFirstWins: 0, r1: 0, r2: 0 })
  bk.n++; bk.r1 += m.innings[0].runs; bk.r2 += m.innings[1].runs
  if (m.result?.winnerSide === 0) bk.batFirstWins++
  sum1 += m.innings[0].runs; sum2 += m.innings[1].runs
}
console.log(fmt, 'mean 1st', (sum1 / N).toFixed(1), 'mean 2nd', (sum2 / N).toFixed(1))
for (const [k, v] of Object.entries(buckets)) console.log(k.padEnd(6), 'n', v.n, 'bat-first win', ((v.batFirstWins / v.n) * 100).toFixed(1) + '%', 'avg 1st', (v.r1 / v.n).toFixed(1), 'avg 2nd', (v.r2 / v.n).toFixed(1))
