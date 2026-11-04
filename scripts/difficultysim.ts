import { BUILT_IN_TEAMS, TIER } from '../src/data/teams'
import { Match } from '../src/engine/match'
import type { Difficulty } from '../src/engine/types'

/**
 * How hard is each difficulty? One team plays everyone else many times, as "your" team, with the computer picking its tactics.
 * Prints the win rate of a strong, a middle and a weak team on each difficulty. Usage: tsx scripts/difficultysim.ts [matchesPerTeam] [format]
 */
const N = Number(process.argv[2] ?? 300)
const fmt = (process.argv[3] ?? 't20') as 't20' | 'odi'
const ranked = [...BUILT_IN_TEAMS].sort((a, b) => (TIER[b.id] ?? 0) - (TIER[a.id] ?? 0))
const picks = { strong: ranked[1], middle: ranked[10], weak: ranked[18] }
const diffs: Difficulty[] = ['easy', 'normal', 'hard', 'legend']
console.log(`${fmt}, ${N} matches per cell. Win rate of "your" team (tier value in brackets) on each difficulty`)
for (const [label, team] of Object.entries(picks)) {
  const row: string[] = []
  for (const d of diffs) {
    let w = 0, n = 0
    for (let i = 0; i < N; i++) {
      const opp = BUILT_IN_TEAMS.filter((t) => t.id !== team.id)[(i * 7 + 3) % (BUILT_IN_TEAMS.length - 1)]
      const home = i % 2 === 0
      const m = new Match({ teamA: home ? team : opp, teamB: home ? opp : team, format: fmt, seed: 9000 + i, toss: { winnerSide: (i % 2) as 0 | 1, decision: 'bat' }, career: { myTeamId: team.id, difficulty: d } })
      m.playMatch()
      const r = m.result
      if (!r || r.winnerSide === null || r.winnerSide === undefined) continue
      n++
      if ((r.winnerSide === 0) === home) w++
    }
    row.push(`${d} ${(w / n * 100).toFixed(0)}%`)
  }
  console.log(`${label.padEnd(7)} ${team.short} (${TIER[team.id] ?? '-'}): ${row.join('  |  ')}`)
}
