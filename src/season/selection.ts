import { battingScore, overall } from '../data/builders'
import { autoPickXI, keeperIn, XI_SIZE } from '../data/squad'
import { Rng } from '../engine/rng'
import type { Player, Team } from '../types'
import type { Fixture, Season } from './types'

/** How many recent matches the selectors look at. */
const WINDOW = 5
/** Chance a player is out injured in any two-week stretch. */
const INJURY_RATE = 0.05
const INJURY_DAYS = 14

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }

export interface Form {
  /** Average impact over the last few matches, by player. */
  recent: Map<string, number>
  /** League-wide average and spread for bowlers and for everyone else, to judge a score fairly. */
  norm: { bowl: { mean: number; sd: number }; bat: { mean: number; sd: number } }
}

/** What each player has done in his last few matches this season (runs, boundaries, wickets, maidens). */
export function formTable(season: Season, teams: Map<string, Team>): Form {
  const roster = season.roster ?? []
  const date = new Map(season.fixtures.map((f) => [f.id, f.date]))
  const results = Object.values(season.results).sort((a, b) => (date.get(a.fixtureId) ?? '').localeCompare(date.get(b.fixtureId) ?? ''))
  const history = new Map<string, number[]>()
  for (const res of results) {
    const per = new Map<string, number>()
    for (const [i, runs, , fours, sixes] of res.bat ?? []) { const id = roster[i]; if (id) per.set(id, (per.get(id) ?? 0) + runs + fours * 0.5 + sixes) }
    for (const [i, , , wk, maidens] of res.bowl ?? []) { const id = roster[i]; if (id) per.set(id, (per.get(id) ?? 0) + wk * 22 + maidens * 4) }
    for (const [id, v] of per) { const l = history.get(id) ?? []; l.push(v); history.set(id, l) }
  }
  const recent = new Map<string, number>()
  const bowlers: number[] = []
  const others: number[] = []
  const roleOf = new Map<string, Player['role']>()
  for (const t of teams.values()) for (const p of t.players) roleOf.set(p.id, p.role)
  for (const [id, list] of history) {
    const last = list.slice(-WINDOW)
    if (last.length < 2) continue
    const avg = last.reduce((s, x) => s + x, 0) / last.length
    recent.set(id, avg)
    ;(roleOf.get(id) === 'BOWL' ? bowlers : others).push(avg)
  }
  const stats = (xs: number[]) => {
    const mean = xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0
    const sd = Math.sqrt(xs.reduce((s, x) => s + (x - mean) ** 2, 0) / Math.max(1, xs.length)) || 1
    return { mean, sd }
  }
  return { recent, norm: { bowl: stats(bowlers), bat: stats(others) } }
}

const dayNumber = (date: string) => Math.floor(Date.parse(date) / 86400000)

/** Out injured for this match? Decided by a seeded draw per player per fortnight, so it is the same every time it is asked. */
export function isInjured(season: Pick<Season, 'seed'>, playerId: string, date: string): boolean {
  const window = Math.floor(dayNumber(date) / INJURY_DAYS)
  return new Rng((season.seed ^ hash(playerId) ^ Math.imul(window, 7919)) >>> 0).next() < INJURY_RATE
}

/** One change to a computer team's XI. */
export interface NewsItem {
  playerId: string
  teamId: string
  /** Out (dropped or injured) or in (called up). */
  kind: 'out' | 'in'
  /** Why, in a few words: "injured", "dropped after poor form", "in good form"… */
  why: string
}

export interface CpuXI {
  team: Team
  /** Who was dropped or came in, compared with the usual XI. */
  news: NewsItem[]
}

/**
 * The computer's selection for one match. It keeps the settled side but drops a player who is injured or badly
 * out of form, and brings in a bench player who is in form or simply better. It also fixes the batting order.
 */
export function pickCpuXI(team: Team, season: Season, fixture: Pick<Fixture, 'date'>, form: Form): CpuXI {
  const usual = team.players.slice(0, XI_SIZE)
  const usualIds = new Set(usual.map((p) => p.id))
  const injured = new Set(team.players.filter((p) => isInjured(season, p.id, fixture.date)).map((p) => p.id))
  // never leave the side short: if too many are out, the least-bad stay in
  const healthy = team.players.filter((p) => !injured.has(p.id))
  const pool = healthy.length >= XI_SIZE ? healthy : team.players

  const adj = (p: Player) => {
    const r = form.recent.get(p.id)
    if (r === undefined) return 0
    const n = p.role === 'BOWL' ? form.norm.bowl : form.norm.bat
    return Math.max(-5, Math.min(5, ((r - n.mean) / n.sd) * 2.4))
  }
  const rate = (p: Player) => overall(p) + adj(p) + (usualIds.has(p.id) ? 2 : 0)
  const batRate = (p: Player) => battingScore(p.batting) + adj(p) * 0.6 - (p.role === 'BOWL' ? 12 : 0)
  const ordered = autoPickXI(pool, rate, batRate)
  const xi = ordered.slice(0, XI_SIZE)
  const bench = [...ordered.slice(XI_SIZE), ...team.players.filter((p) => injured.has(p.id) && !ordered.includes(p))]

  const news: NewsItem[] = []
  for (const p of usual) {
    if (xi.some((x) => x.id === p.id)) continue
    news.push({ playerId: p.id, teamId: team.id, kind: 'out', why: injured.has(p.id) ? 'injured' : adj(p) <= -2 ? 'dropped after poor form' : 'left out' })
  }
  for (const p of xi) if (!usualIds.has(p.id)) news.push({ playerId: p.id, teamId: team.id, kind: 'in', why: adj(p) >= 2 ? 'called up, in good form' : 'called up' })
  // if the keeper is out, the best fielder in the XI puts on the gloves
  const keeper = keeperIn(xi, team.keeperId) ?? [...xi].sort((a, b) => b.fielding - a.fielding)[0]
  return { team: { ...team, players: [...xi, ...bench], keeperId: keeper?.id }, news }
}

/** Applies the computer's selection to every team in a fixture that isn't yours. */
export function cpuSelections(season: Season, fixture: Pick<Fixture, 'date'>, teams: Team[], myTeamId: string | null, form: Form): CpuXI[] {
  return teams.map((t) => (myTeamId && t.id !== myTeamId ? pickCpuXI(t, season, fixture, form) : { team: t, news: [] }))
}
