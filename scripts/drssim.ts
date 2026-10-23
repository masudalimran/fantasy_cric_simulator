import { BUILT_IN_TEAMS } from '../src/data/teams'
import { Match } from '../src/engine/match'

/** Checks what the challenge system does to a match: averages (they should hardly move), how often sides challenge, and how often the decision is overturned. */
const N = Number(process.argv[2] ?? 1500)
const fmt = (process.argv[3] ?? 't20') as 't20' | 'odi' | 'test'
let wk = 0, runs = 0, inns = 0, balls = 0, rev = 0, overturned = 0, upheld = 0, batRev = 0, bowlRev = 0, desperate = 0, toOut = 0, toNot = 0
for (let i = 0; i < N; i++) {
  const a = BUILT_IN_TEAMS[(i * 7) % 20], b = BUILT_IN_TEAMS[(i * 7 + 1 + (i % 5)) % 20]
  if (a.id === b.id) continue
  const m = new Match({ teamA: a, teamB: b, format: fmt, seed: 5000 + i })
  m.playMatch()
  for (const inn of m.innings) {
    inns++; wk += inn.wickets; runs += inn.runs; balls += inn.legalBalls
    for (const e of inn.log) if ((e as { review?: { by: string; overturned: boolean; desperate: boolean; originalOut: boolean } }).review) {
      const r = (e as unknown as { review: { by: string; overturned: boolean; desperate: boolean; originalOut: boolean } }).review
      rev++; if (r.overturned) { overturned++; if (r.originalOut) toNot++; else toOut++ } else upheld++
      if (r.by === 'bat') batRev++; else bowlRev++
      if (r.desperate) desperate++
    }
  }
}
console.log(fmt, 'innings', inns, 'avg wickets', (wk / inns).toFixed(3), 'avg runs', (runs / inns).toFixed(1), 'avg balls', (balls / inns).toFixed(1))
console.log('reviews per innings', (rev / inns).toFixed(2), 'bat', (batRev / inns).toFixed(2), 'bowl', (bowlRev / inns).toFixed(2), 'desperate', (desperate / inns).toFixed(2), 'overturned', ((overturned / Math.max(1, rev)) * 100).toFixed(1) + '%', 'out->not out', (toNot / inns).toFixed(3), 'not out->out', (toOut / inns).toFixed(3))
