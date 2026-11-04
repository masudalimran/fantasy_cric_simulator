import { overall } from '../src/data/builders'
import { BUILT_IN_TEAMS, TIER } from '../src/data/teams'
import { yearEnd } from '../src/season/careers'
import { generateSeason } from '../src/season/generate'
import { playerIndex } from '../src/season/market'
import { applyShift, sessionTeam } from '../src/season/progression'
import { competitionStatus, simThrough } from '../src/season/results'
import type { Season } from '../src/season/types'

/**
 * The computer league on its own for many years, with nobody managing a team: do the teams stay in a believable spread,
 * do ratings drift up, does money pile up in the same few hands? Usage: tsx scripts/leaguesim.ts [years] [seed]
 */
const YEARS = Number(process.argv[2] ?? 10)
const SEED = Number(process.argv[3] ?? 11)
const teams = BUILT_IN_TEAMS
const sd = (xs: number[]) => { const m = xs.reduce((a, b) => a + b, 0) / xs.length; return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length) }
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length)

let s: Season = generateSeason({ year: 2030, teams, seed: SEED, myTeamId: null, difficulty: 'normal' })
const tier0 = new Map(teams.map((t) => [t.id, TIER[t.id] ?? 0]))
const wealth: Record<string, number> = {}
const cup: Record<string, number> = {}
const yearsTop: Record<string, number[]> = {}
console.log('year | avg XI rating (sd between teams) | top player | #90+ | win% of the 5 starting-strongest vs 5 weakest | purse avg / max / min | title share of the top 3 winners')
for (let y = 0; y < YEARS; y++) {
  const idx = playerIndex(teams, s.market)
  const map = new Map(teams.map((t) => [t.id, sessionTeam(t, s)]))
  const last = s.fixtures.reduce((d, f) => (f.date > d ? f.date : d), '')
  s = simThrough(s, last, map)
  // ratings at the end of the year, as they are in the shifts
  const rating = (id: string) => { const p = idx.get(id); return p ? overall(applyShift(p, s.shifts?.[id])) : 0 }
  const xi = (id: string) => [...(s.market!.squads[id] ?? [])].map(rating).sort((a, b) => b - a).slice(0, 11)
  const strength = teams.map((t) => avg(xi(t.id)))
  const all = Object.values(s.market!.squads).flat().map(rating)
  const winRate = (id: string) => { let p = 0, w = 0; for (const f of s.fixtures) { const r = s.results[f.id]; if (!r || (f.homeId !== id && f.awayId !== id)) continue; p++; if (r.winnerId === id) w++ } return p ? w / p : 0 }
  const ranked = [...teams].sort((a, b) => (tier0.get(b.id) ?? 0) - (tier0.get(a.id) ?? 0))
  const strongW = avg(ranked.slice(0, 5).map((t) => winRate(t.id))), weakW = avg(ranked.slice(-5).map((t) => winRate(t.id)))
  const titles: Record<string, number> = {}
  for (const c of s.competitions) { if (c.kind === 'series') continue; const w = competitionStatus(s, c).champion; if (w) titles[w] = (titles[w] ?? 0) + 1 }
  for (const [k, v] of Object.entries(titles)) cup[k] = (cup[k] ?? 0) + v
  const total = Object.values(titles).reduce((a, b) => a + b, 0)
  const top3 = Object.values(titles).sort((a, b) => b - a).slice(0, 3).reduce((a, b) => a + b, 0)
  const purses = teams.map((t) => s.market!.budgets[t.id] ?? 0)
  for (const t of teams) wealth[t.id] = (wealth[t.id] ?? 0) + (s.market!.budgets[t.id] ?? 0)
  console.log(`${s.year} | ${avg(strength).toFixed(1)} (sd ${sd(strength).toFixed(1)}, ${Math.min(...strength).toFixed(0)}-${Math.max(...strength).toFixed(0)}) | ${Math.max(...all)} | ${all.filter((r) => r >= 90).length} | ${(strongW * 100).toFixed(0)}% vs ${(weakW * 100).toFixed(0)}% | ${avg(purses).toFixed(0)} / ${Math.max(...purses)} / ${Math.min(...purses)} | ${total ? (top3 / total * 100).toFixed(0) : 0}% of ${total}`)
  const out = yearEnd({ season: s, base: idx, titles, seed: SEED + y, catchUp: 0 })
  s = generateSeason({ year: s.year + 1, teams, seed: SEED + y + 1, myTeamId: null, difficulty: 'normal', shifts: out.shifts, market: { ...out.market, pending: undefined } })
}

console.log('\nTitles over the whole run, by starting strength (strongest first):')
console.log([...teams].sort((a, b) => (tier0.get(b.id) ?? 0) - (tier0.get(a.id) ?? 0)).map((t) => `${t.short} ${cup[t.id] ?? 0}`).join(' | '))
