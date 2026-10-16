import { battingScore, overall } from '../data/builders'
import { autoPickXI, keeperIn, XI_SIZE } from '../data/squad'
import { Rng } from '../engine/rng'
import { isInjuredOn, shieldFor, type Shield } from './injuries'
import type { Player, Team } from '../types'
import type { Fixture, Season } from './types'

/** How many recent matches the selectors look at. */
const WINDOW = 5

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }

/** Out injured for this match? The same every time it is asked. Pass the team's physio cover (shieldFor) to leave out the players a physio protects. */
export const isInjured = (season: Pick<Season, 'seed'>, playerId: string, date: string, shield?: Shield): boolean => isInjuredOn(season, playerId, date, shield)

export interface Form {
  /** Average impact over the last few matches, by player. */
  recent: Map<string, number>
  /** League-wide average and spread for bowlers and for everyone else, to judge a score fairly. */
  norm: { bowl: { mean: number; sd: number }; bat: { mean: number; sd: number } }
  /** How far above or below the usual a player's latest match was (in standard deviations), for those who played in the last few weeks. A big one is a reserve's chance to stay in the side. */
  breakout: Map<string, number>
  /** How many of his last few matches each player has behind him (a slump needs at least three). */
  games?: Map<string, number>
}

/** A match this recent still counts as a player's "moment". */
const BREAKOUT_DAYS = 21
/** The most a single great game adds to a player's selection rating. */
const BREAKOUT_MAX = 10

/** What each player has done in his last few matches this season (runs, boundaries, wickets, maidens). */
export function formTable(season: Season, teams: Map<string, Team>): Form {
  const roster = season.roster ?? []
  const date = new Map(season.fixtures.map((f) => [f.id, f.date]))
  const results = Object.values(season.results).sort((a, b) => (date.get(a.fixtureId) ?? '').localeCompare(date.get(b.fixtureId) ?? ''))
  const history = new Map<string, number[]>()
  const lastOn = new Map<string, string>()
  const latest = results.length ? date.get(results[results.length - 1].fixtureId) ?? '' : ''
  for (const res of results) {
    const per = new Map<string, number>()
    for (const [i, runs, , fours, sixes] of res.bat ?? []) { const id = roster[i]; if (id) per.set(id, (per.get(id) ?? 0) + runs + fours * 0.5 + sixes) }
    for (const [i, , , wk, maidens] of res.bowl ?? []) { const id = roster[i]; if (id) per.set(id, (per.get(id) ?? 0) + wk * 22 + maidens * 4) }
    for (const [id, v] of per) { const l = history.get(id) ?? []; l.push(v); history.set(id, l); lastOn.set(id, date.get(res.fixtureId) ?? '') }
  }
  const recent = new Map<string, number>()
  const games = new Map<string, number>()
  const bowlers: number[] = []
  const others: number[] = []
  const roleOf = new Map<string, Player['role']>()
  for (const t of teams.values()) for (const p of t.players) roleOf.set(p.id, p.role)
  for (const [id, list] of history) {
    const last = list.slice(-WINDOW)
    games.set(id, last.length)
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
  // each player's latest single match against what a match from that kind of player usually is
  const single = { bowl: [] as number[], bat: [] as number[] }
  for (const [id, list] of history) for (const v of list) single[roleOf.get(id) === 'BOWL' ? 'bowl' : 'bat'].push(v)
  const sn = { bowl: stats(single.bowl), bat: stats(single.bat) }
  const breakout = new Map<string, number>()
  const cutoff = latest ? new Date(Date.parse(latest) - BREAKOUT_DAYS * 86400000).toISOString().slice(0, 10) : ''
  for (const [id, list] of history) {
    if ((lastOn.get(id) ?? '') < cutoff) continue
    const n = roleOf.get(id) === 'BOWL' ? sn.bowl : sn.bat
    breakout.set(id, (list[list.length - 1] - n.mean) / n.sd)
  }
  return { recent, norm: { bowl: stats(bowlers), bat: stats(others) }, breakout, games }
}

/** What a standout recent match is worth in selection rating: nothing for an ordinary one, up to BREAKOUT_MAX for a great one. */
const breakoutBonus = (z: number | undefined) => (z === undefined ? 0 : Math.max(0, Math.min(BREAKOUT_MAX, (z - 0.3) * 4)))

/** The average overall of a team's best eleven. */
const strengthOf = (t: Team) => [...t.players].map(overall).sort((a, b) => b - a).slice(0, XI_SIZE).reduce((s, x) => s + x, 0) / XI_SIZE


/** How much a match matters to a computer team, 0 to 1: finals and knockouts are everything, friendlies very little. */
export function importance(f: Partial<Pick<Fixture, 'phase' | 'stage'>>): number {
  if (f.phase === 'knockout') return 1
  if (f.phase === 'series') return 0.3
  if (f.phase === 'group' || f.phase === 'league') return 0.7
  return 1 // unknown (older callers): play the best side
}

/** How many of a team's last five matches each of its players was in the XI for. */
function recentApps(season: Season, team: Team, before: string): Map<string, number> {
  const roster = season.roster ?? []
  const out = new Map<string, number>()
  const mine = season.fixtures.filter((f) => f.date < before && (f.homeId === team.id || f.awayId === team.id) && season.results[f.id]?.played).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)
  const own = new Set(team.players.map((p) => p.id))
  for (const f of mine) for (const i of season.results[f.id].played ?? []) { const id = roster[i]; if (id && own.has(id)) out.set(id, (out.get(id) ?? 0) + 1) }
  return out
}

/** One change to a computer team's XI. */
export interface NewsItem {
  playerId: string
  teamId: string
  /** Out (dropped or injured), in (called up), or moved (a different place in the batting order). */
  kind: 'out' | 'in' | 'moved'
  /** Why, in a few words: "injured", "dropped after poor form", "in good form"… */
  why: string
}

export interface CpuXI {
  team: Team
  /** Who was dropped or came in, compared with the usual XI. */
  news: NewsItem[]
}

/**
 * The XI a team put out in its most recent match before `beforeDate` (null if it has none on record, such as older
 * saves or the first match of a career). Team news is measured against this, so "in" and "out" mean "compared with last game".
 */
export function lastPlayedXI(season: Season, team: Team, beforeDate: string): string[] | null {
  const roster = season.roster ?? []
  const mine = new Set(team.players.map((p) => p.id))
  let best: { date: string; ids: string[] } | null = null
  for (const f of season.fixtures) {
    if (f.date >= beforeDate || (f.homeId !== team.id && f.awayId !== team.id)) continue
    const played = season.results[f.id]?.played
    if (!played || (best && f.date <= best.date)) continue
    const ids = played.map((i) => roster[i]).filter((id): id is string => !!id && mine.has(id))
    if (ids.length >= XI_SIZE) best = { date: f.date, ids }
  }
  return best ? best.ids : null
}

/**
 * The computer's selection for one match. It keeps the settled side but drops a player who is injured or badly
 * out of form, and brings in a bench player who is in form or simply better. It also fixes the batting order.
 */
export function pickCpuXI(team: Team, season: Season, fixture: Pick<Fixture, 'date'> & Partial<Pick<Fixture, 'competitionId' | 'stage' | 'phase'>> & { opponent?: Team }, form: Form): CpuXI {
  // "usual" = who played last time (so news says what changed since then); the settled side if there is no last game
  const last = lastPlayedXI(season, team, fixture.date)
  const usual = last ? team.players.filter((p) => last.includes(p.id)) : team.players.slice(0, XI_SIZE)
  const usualIds = new Set(usual.map((p) => p.id))
  const shield = shieldFor(season, team) // physios keep the best players from getting hurt
  const injured = new Set(team.players.filter((p) => isInjuredOn(season, p.id, fixture.date, shield)).map((p) => p.id))
  // never leave the side short: if too many are out, the least-bad stay in
  const healthy = team.players.filter((p) => !injured.has(p.id))
  const pool = healthy.length >= XI_SIZE ? healthy : team.players

  const adj = (p: Player) => {
    const r = form.recent.get(p.id)
    if (r === undefined) return 0
    const n = p.role === 'BOWL' ? form.norm.bowl : form.norm.bat
    return Math.max(-6, Math.min(6, ((r - n.mean) / n.sd) * 3))
  }
  // a reserve who had a standout game a few days ago is in the frame, and a player who keeps doing well keeps his place
  // against an opponent who is about as good or better, the side that played last time is not sticky: the best players come back
  const gap = fixture.opponent ? strengthOf(team) - strengthOf(fixture.opponent) : 0
  const tough = !!fixture.opponent && gap <= 1
  const rate = (p: Player) => overall(p) + adj(p) + breakoutBonus(form.breakout.get(p.id)) + (usualIds.has(p.id) && !tough ? 1 : 0)
  const batRate = (p: Player) => battingScore(p.batting) + adj(p) * 0.6 - (p.role === 'BOWL' ? 12 : 0)
  const ordered = autoPickXI(pool, rate, batRate)
  let xi = ordered.slice(0, XI_SIZE)
  // A match that hardly matters is a chance to rest a few regulars and let the reserves play
  const rested: { out: Player; in: Player }[] = []
  const matters = importance(fixture)
  // Against a clearly weaker side a strong team gives the reserves and the young players a game (never in a knockout): 0 at a gap of 3 points, 1 at 11 or more
  const easy = fixture.opponent && fixture.phase !== 'knockout' ? Math.max(0, Math.min(1, (gap - 3) / 8)) : 0
  // ...and against a strong opponent nobody is rested: whoever was given a chance last time is swapped for the best player
  if (!tough && (matters < 1 || easy > 0) && ordered.length > XI_SIZE) {
    const rng = new Rng((season.seed ^ hash(`${team.id}|${fixture.date}|${fixture.competitionId ?? ''}`)) >>> 0)
    const chance = Math.max(matters >= 1 ? 0 : matters <= 0.35 ? 0.75 : 0.35, easy * 0.92)
    if (rng.chance(chance)) {
      const wanted = Math.max(matters >= 1 ? 0 : matters <= 0.35 ? 1 + rng.int(3) : 1, easy > 0 ? 1 + Math.round(easy * 3) : 0)
      const apps = recentApps(season, team, fixture.date)
      const bench0 = ordered.slice(XI_SIZE).filter((p) => !injured.has(p.id))
      const keeperNow = keeperIn(xi, team.keeperId)?.id
      const core = new Set([...[...xi].sort((a, b) => overall(b) - overall(a)).slice(0, 6).map((p) => p.id), team.captainId, keeperNow ?? ''])
      const candidatesOut = xi.filter((p) => !core.has(p.id)).sort((a, b) => rate(a) - rate(b))
      const candidatesIn = [...bench0].sort((a, b) => (apps.get(a.id) ?? 0) - (apps.get(b.id) ?? 0) || rate(b) - rate(a)) // those who have played least first
      const bowls = (p: Player) => p.role === 'BOWL' || p.role === 'AR'
      let current = xi
      for (const out of candidatesOut) {
        if (rested.length >= wanted) break
        // keep the balance of the side: a bowler for a bowler (never fewer than five), a keeper stays a keeper
        const sub = candidatesIn.find((c) => !rested.some((r) => r.in.id === c.id) && (!bowls(out) || bowls(c)) && c.role !== 'WK')
        if (!sub) continue
        const trial = current.map((p) => (p.id === out.id ? sub : p))
        if (trial.filter(bowls).length < 5) continue
        current = trial
        rested.push({ out, in: sub })
      }
      if (rested.length) xi = ordered.filter((p) => !rested.some((r) => r.out.id === p.id)).slice(0, XI_SIZE - rested.length).concat(rested.map((r) => r.in))
    }
  }
  // Someone who has been playing badly for a few matches is replaced by a fresh face (a reserve who has hardly played, if there is a fair one)
  const zOf = (p: Player) => {
    const r = form.recent.get(p.id)
    if (r === undefined || (form.games?.get(p.id) ?? 0) < 3) return 0
    const n = p.role === 'BOWL' ? form.norm.bowl : form.norm.bat
    return (r - n.mean) / n.sd
  }
  const slumped: { out: Player; in: Player }[] = []
  {
    const knockout = fixture.phase === 'knockout'
    const limit = knockout ? 1 : 2
    const threshold = knockout ? -1.6 : -0.9
    const apps = recentApps(season, team, fixture.date)
    const needsBowl = (p: Player) => p.role === 'BOWL' || p.role === 'AR'
    const keeperNow = keeperIn(xi, team.keeperId)?.id
    let cur = xi
    const spare = ordered.filter((p) => !xi.some((x) => x.id === p.id) && !injured.has(p.id))
    const weak = xi.filter((p) => zOf(p) <= threshold && p.id !== keeperNow && !rested.some((r) => r.in.id === p.id)).sort((a, b) => zOf(a) - zOf(b))
    for (const out of weak) {
      if (slumped.length >= limit) break
      const sub = spare
        .filter((c) => !slumped.some((s) => s.in.id === c.id) && !rested.some((r) => r.in.id === c.id) && c.role !== 'WK' && (!needsBowl(out) || needsBowl(c)) && overall(c) >= overall(out) - (tough ? 6 : 14) && zOf(c) > -0.5)
        .sort((a, b) => (apps.get(a.id) ?? 0) - (apps.get(b.id) ?? 0) || rate(b) - rate(a))[0]
      if (!sub) continue
      const trial = cur.map((p) => (p.id === out.id ? sub : p))
      if (trial.filter(needsBowl).length < 5) continue
      cur = trial
      slumped.push({ out, in: sub })
    }
    xi = cur
  }
  // The batting order follows form: a batsman in the runs moves up, one in a slump moves down
  const batOrder = (p: Player) => battingScore(p.batting) + adj(p) * 1.6 + breakoutBonus(form.breakout.get(p.id)) * 0.8 - (p.role === 'BOWL' ? 12 : 0)
  xi = [...xi].sort((a, b) => batOrder(b) - batOrder(a))
  // ...and the captain leans on the bowlers who are going well
  const bowlPref: Record<string, number> = {}
  for (const p of xi) if (p.bowling) { const v = adj(p) * 1.2 + breakoutBonus(form.breakout.get(p.id)) * 0.5; if (v) bowlPref[p.id] = Math.max(-8, Math.min(8, v)) }
  const bench = [...ordered.filter((p) => !xi.some((x) => x.id === p.id)), ...team.players.filter((p) => injured.has(p.id) && !ordered.includes(p))]

  const news: NewsItem[] = []
  for (const p of usual) {
    if (xi.some((x) => x.id === p.id)) continue
    news.push({ playerId: p.id, teamId: team.id, kind: 'out', why: injured.has(p.id) ? 'injured' : rested.some((r) => r.out.id === p.id) ? 'rested' : slumped.some((s) => s.out.id === p.id) ? 'dropped after a run of poor form' : adj(p) <= -2 ? 'dropped after poor form' : tough ? 'left out against a strong side' : 'left out' })
  }
  for (const p of xi) if (!usualIds.has(p.id)) news.push({ playerId: p.id, teamId: team.id, kind: 'in', why: rested.some((r) => r.in.id === p.id) ? 'given a chance' : slumped.some((s) => s.in.id === p.id) ? 'a new face gets a go' : adj(p) >= 2 ? 'called up, in good form' : tough ? 'back for a tough opponent' : 'called up' })
  // batting-order changes since last time (three places or more)
  if (last) xi.forEach((p, i) => { const j = last.indexOf(p.id); if (j >= 0 && Math.abs(j - i) >= 3) news.push({ playerId: p.id, teamId: team.id, kind: 'moved', why: j > i ? `up the order, ${j + 1} to ${i + 1}` : `down the order, ${j + 1} to ${i + 1}` }) })
  // if the keeper is out, the best fielder in the XI puts on the gloves
  const keeper = keeperIn(xi, team.keeperId) ?? [...xi].sort((a, b) => b.fielding - a.fielding)[0]
  return { team: { ...team, players: [...xi, ...bench], keeperId: keeper?.id, ...(Object.keys(bowlPref).length ? { bowlPref } : {}) }, news }
}

/** Applies the computer's selection to every team in a fixture that isn't yours. */
export function cpuSelections(season: Season, fixture: Pick<Fixture, 'date'>, teams: Team[], myTeamId: string | null, form: Form): CpuXI[] {
  // each side knows who it is playing, so a strong team can rest players against a weak one
  return teams.map((t) => (myTeamId && t.id !== myTeamId ? pickCpuXI(t, season, { ...fixture, opponent: teams.find((o) => o.id !== t.id) }, form) : { team: t, news: [] }))
}
