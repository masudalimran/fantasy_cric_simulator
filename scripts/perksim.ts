import { NODES, COST } from '../src/data/passiveTree'
import { BUILT_IN_TEAMS } from '../src/data/teams'
import { Match } from '../src/engine/match'
import type { MatchPerks, Rule } from '../src/engine/perks'

/** How much a passive-tree build is worth: your side with the perks against the same side without, same seeds and opponents. Usage: tsx scripts/perksim.ts [matches] [format] */
const N = Number(process.argv[2] ?? 1500)
const fmt = (process.argv[3] ?? 't20') as 't20' | 'odi'
const FIELD_CAP = 8

function build(ids: string[]): MatchPerks {
  const rules: Rule[] = []
  let field = 0, review = 0
  for (const n of NODES) if (ids.includes(n.id)) { rules.push(...(n.fx.rules ?? [])); field += n.fx.field ?? 0; review += n.fx.review ?? 0 }
  return { rules, field: Math.min(FIELD_CAP, field), review, vets: [], rookies: [], settling: {}, home: true, big: false, streak: false }
}
// a build of 66 points: the cheapest match perks first, role by role
function fullBuild(): string[] {
  const picks: string[] = []
  let pts = 66
  for (const branch of ['open', 'fin', 'pace', 'spin', 'keep', 'capt', 'day']) {
    for (const n of NODES.filter((x) => x.branch === branch).sort((a, b) => a.row - b.row)) { if (pts >= COST[n.kind] && (n.row === 0 || n.req.some((r) => picks.includes(r)))) { picks.push(n.id); pts -= COST[n.kind] } }
    if (pts < 20 && branch === 'pace') pts = pts // (keeps going while points last)
  }
  return picks
}
const builds: Record<string, string[]> = {
  'every match perk (impossible)': NODES.filter((n) => n.fx.rules || n.fx.field || n.fx.review).map((n) => n.id),
  'openers + captain + pace (about 30 points)': NODES.filter((n) => ['open', 'capt', 'pace'].includes(n.branch)).map((n) => n.id),
  'a 66-point spread': fullBuild(),
}
for (const [name, ids] of Object.entries(builds)) {
  const perks = build(ids)
  let wins0 = 0, wins1 = 0, runs0 = 0, runs1 = 0, n = 0
  for (let i = 0; i < N; i++) {
    const a = BUILT_IN_TEAMS[(i * 7) % 20], b = BUILT_IN_TEAMS[(i * 7 + 1 + (i % 5)) % 20]
    if (a.id === b.id) continue
    const play = (p: MatchPerks | undefined) => {
      const m = new Match({ teamA: a, teamB: b, format: fmt, seed: 5000 + i, toss: { winnerSide: 0, decision: 'bat' }, career: { myTeamId: a.id, difficulty: 'hard', perks: p } })
      m.playMatch()
      return m
    }
    const m0 = play(undefined), m1 = play(perks)
    n++
    if (m0.result?.winnerSide === 0) wins0++
    if (m1.result?.winnerSide === 0) wins1++
    runs0 += m0.innings[0].runs; runs1 += m1.innings[0].runs
  }
  console.log(fmt, name, `| points ${ids.reduce((s, id) => s + COST[NODES.find((x) => x.id === id)!.kind], 0)} | win rate ${(wins0 / n * 100).toFixed(1)}% -> ${(wins1 / n * 100).toFixed(1)}% | your 1st-innings runs ${(runs0 / n).toFixed(1)} -> ${(runs1 / n).toFixed(1)}`)
}
