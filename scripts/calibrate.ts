// Simulates many matches and compares the results with the real-world baselines.
// Usage: npx tsx scripts/calibrate.ts [t20|odi|both] [matches=1500] [seed=1]
import baselines from '../src/engine/data/baselines.json' with { type: 'json' }
import { BUILT_IN_TEAMS } from '../src/data/teams/index.ts'
import { Match } from '../src/engine/match.ts'
import { KNOBS } from '../src/engine/model.ts'
import { Rng } from '../src/engine/rng.ts'
import { FORMATS, phaseOf } from '../src/engine/types.ts'
import type { MatchFormat } from '../src/types.ts'

const arg = process.argv[2] ?? 'both'
const N = Number(process.argv[3] ?? 1500)
const SEED = Number(process.argv[4] ?? 1)
const formats: MatchFormat[] = arg === 'both' ? ['t20', 'odi'] : [arg as MatchFormat]

// Experiments: KNOBS='{"form":0,"pitch":0}' npx tsx scripts/calibrate.ts t20
if (process.env.KNOBS) Object.assign(KNOBS, JSON.parse(process.env.KNOBS))

const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length
const sd = (a: number[]) => { const m = mean(a); return Math.sqrt(mean(a.map((x) => (x - m) ** 2))) }
const pct = (x: number) => (x * 100).toFixed(1).padStart(5) + '%'
const row = (label: string, sim: string, real: string, ok: boolean) => console.log(`  ${label.padEnd(22)} sim ${sim.padStart(8)}   real ${real.padStart(8)}   ${ok ? '' : '<-- off'}`)
const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol * Math.abs(b)

for (const format of formats) {
  const real = (baselines as any)[format]
  const rng = new Rng(SEED)
  const phases = { powerplay: blank(), middle: blank(), death: blank() }
  const all = blank()
  const first: number[] = [], second: number[] = [], wk: number[] = [], firstWk: number[] = []
  let allOut = 0, chaseWins = 0, ties = 0, innCount = 0, topWins = 0, topGames = 0, balls = 0
  const winsByTeam = new Map<string, [number, number]>()
  const individual: number[] = []

  function blank() {
    return { n: 0, legal: 0, runs: 0, dot: 0, one: 0, two: 0, three: 0, four: 0, six: 0, wicket: 0, wide: 0, noball: 0, bye: 0, legbye: 0 }
  }

  for (let m = 0; m < N; m++) {
    const a = rng.int(BUILT_IN_TEAMS.length)
    let b = rng.int(BUILT_IN_TEAMS.length - 1)
    if (b >= a) b++
    const match = new Match({ teamA: BUILT_IN_TEAMS[a], teamB: BUILT_IN_TEAMS[b], format, seed: SEED * 100000 + m })
    match.playMatch()
    for (const ev of match.events) {
      const ph = phases[phaseOf(format, ev.over)]
      for (const t of [ph, all]) {
        t.n++
        balls++
        if (ev.legal) t.legal++
        t.runs += ev.total
        if (ev.extraType === 'wide') { t.wide++; continue }
        if (ev.extraType === 'noball') t.noball++
        if (ev.extraType === 'bye') t.bye++
        if (ev.extraType === 'legbye') t.legbye++
        if (ev.runsBat === 0 && ev.total === 0) t.dot++
        if (ev.runsBat === 1) t.one++
        if (ev.runsBat === 2) t.two++
        if (ev.runsBat === 3) t.three++
        if (ev.runsBat === 4) t.four++
        if (ev.runsBat === 6) t.six++
        if (ev.wicket) t.wicket++
      }
    }
    match.innings.forEach((inn, i) => {
      innCount++
      ;(i === 0 ? first : second).push(inn.runs)
      wk.push(inn.wickets)
      if (i === 0) firstWk.push(inn.wickets)
      if (inn.wickets >= 10) allOut++
      for (const bl of inn.batters) individual.push(bl.runs)
    })
    const r = match.result!
    if (r.winnerSide === null) ties++
    else {
      const chaserSide = match.innings[1].battingSide
      if (r.winnerSide === chaserSide) chaseWins++
      const winnerId = match.sides[r.winnerSide].team.id
      const loserId = match.sides[1 - r.winnerSide].team.id
      const w = winsByTeam.get(winnerId) ?? [0, 0]; w[0]++; w[1]++; winsByTeam.set(winnerId, w)
      const l = winsByTeam.get(loserId) ?? [0, 0]; l[1]++; winsByTeam.set(loserId, l)
    }
  }

  console.log(`\n=== ${format.toUpperCase()}  (${N} matches, seed ${SEED}) ===`)
  const rpo = (t: ReturnType<typeof blank>) => (t.runs / t.legal) * 6
  const f = (t: ReturnType<typeof blank>, k: keyof ReturnType<typeof blank>) => (t[k] as number) / t.n
  row('1st innings mean', mean(first).toFixed(1), real.firstInningsMean.toFixed(1), near(mean(first), real.firstInningsMean, 0.04))
  row('1st innings sd', sd(first).toFixed(1), real.firstInningsSd.toFixed(1), near(sd(first), real.firstInningsSd, 0.2))
  const q = (arr: number[], p: number) => [...arr].sort((a, b) => a - b)[Math.floor(p * arr.length)]
  console.log('  1st-inn quantiles   sim', [0.1, 0.25, 0.5, 0.75, 0.9].map((p) => q(first, p)).join(' / '), '  real', [0.1, 0.25, 0.5, 0.75, 0.9].map((p) => real.firstInningsQuantiles[p]).join(' / '))
  console.log('  wickets 0..10 (1st) sim', Array.from({ length: 11 }, (_, k) => (firstWk.filter((w) => Math.min(w, 10) === k).length / firstWk.length * 100).toFixed(0)).join(' '), '\n                      real', real.firstInningsWicketsHist.map((v: number) => (v * 100).toFixed(0)).join(' '))
  row('2nd innings mean', mean(second).toFixed(1), real.secondInningsMean.toFixed(1), near(mean(second), real.secondInningsMean, 0.06))
  row('wickets / innings', mean(wk).toFixed(2), real.wicketsPerInnings.toFixed(2), near(mean(wk), real.wicketsPerInnings, 0.06))
  row('all-out rate', pct(allOut / innCount), pct(real.allOutRate), near(allOut / innCount, real.allOutRate, 0.2))
  row('chasing side wins', pct(chaseWins / (N - ties)), '~ 50%', true)
  const keys = ['dot', 'one', 'two', 'three', 'four', 'six', 'wicket', 'wide', 'noball', 'bye', 'legbye'] as const
  for (const [name, t] of [['OVERALL', all], ...Object.entries(phases)] as const) {
    const rb = name === 'OVERALL' ? real.overall : real.phases[name]
    console.log(`  -- ${name}`)
    row('runs per over', rpo(t).toFixed(2), rb.runsPerOver.toFixed(2), near(rpo(t), rb.runsPerOver, 0.05))
    for (const k of keys) row(k, pct(f(t, k)), pct(rb[k]), near(f(t, k), rb[k], 0.12) || Math.abs(f(t, k) - rb[k]) < 0.004)
  }
  const sorted = [...winsByTeam.entries()].map(([id, [w, g]]) => [id, w / g] as const).sort((x, y) => y[1] - x[1])
  console.log('  team win rates:', sorted.map(([id, r]) => `${BUILT_IN_TEAMS.find((t) => t.id === id)!.short} ${(r * 100).toFixed(0)}%`).join('  '))
  const ind = individual.filter((x) => x >= 0)
  console.log(`  individual scores: mean ${mean(ind).toFixed(1)}, 50+ ${pct(ind.filter((x) => x >= 50).length / ind.length)}, 100+ ${pct(ind.filter((x) => x >= 100).length / ind.length)}, ducks ${pct(ind.filter((x) => x === 0).length / ind.length)}`)
  const hi = [...first, ...second]
  console.log(`  highest innings ${Math.max(...hi)}, lowest ${Math.min(...hi)}, overs max ${FORMATS[format].overs}`)
  void topWins; void topGames; void balls
}
