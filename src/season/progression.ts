import { Rng } from '../engine/rng'
import { DIFFICULTIES } from '../engine/types'
import { battingScore, bowlingScore, overall } from '../data/builders'
import { YOUTH_BY_ID } from '../data/youthPool'
import type { MatchFormat, Player, Team } from '../types'
import type { AttrKey, Fixture, MatchDelta, PlayerChange, PlayerShift, RawSummary, Season } from './types'

export const ATTRS: AttrKey[] = ['technique', 'power', 'temperament', 'running', 'accuracy', 'variation', 'stamina']
export const ATTR_LABEL: Record<AttrKey, string> = { technique: 'Technique', power: 'Power', temperament: 'Temperament', running: 'Running', fielding: 'Fielding', accuracy: 'Accuracy', variation: 'Variation', stamina: 'Stamina' }

/** The most any one rating can drift, up or down, over a career. Wide enough for a 30 to climb past a 90 given enough years. */
const MAX_ATTR_DRIFT = 45

/**
 * How easily a rating of `v` grows (1 = the league's middling rating, about 75). Low ratings are easy to raise, ratings at the
 * top are hard: the same good game is worth about twice as much to a 30 as to a 75, and about a third as much to a 94.
 * It only scales gains. Losses are the same size for everybody, so a star who keeps playing badly does fall, and one who keeps
 * playing well holds his place, while a low player who keeps playing well keeps climbing until he meets the top.
 */
export function headroom(v: number): number {
  return Math.max(0.3, Math.min(3, 0.4 + 2.4 * (Math.max(0, 99 - v) / 69)))
}
const clampRating = (n: number) => Math.max(1, Math.min(99, Math.round(n)))

const get = (s: PlayerShift | undefined, k: AttrKey) => s?.a?.[k] ?? 0

/** A player with everything he has earned (or lost) added to his starting ratings. */
export function applyShift(p: Player, s: PlayerShift | undefined): Player {
  if (!s || (!s.bat && !s.bowl && !s.a)) return p
  const bat = s.bat ?? 0, bowl = s.bowl ?? 0
  return {
    ...p,
    fielding: clampRating(p.fielding + get(s, 'fielding')),
    batting: {
      technique: clampRating(p.batting.technique + bat + get(s, 'technique')),
      power: clampRating(p.batting.power + bat + get(s, 'power')),
      temperament: clampRating(p.batting.temperament + bat + get(s, 'temperament')),
      running: clampRating(p.batting.running + Math.round(bat / 2) + get(s, 'running')),
    },
    bowling: p.bowling
      ? { ...p.bowling, accuracy: clampRating(p.bowling.accuracy + bowl + get(s, 'accuracy')), variation: clampRating(p.bowling.variation + bowl + get(s, 'variation')), stamina: clampRating(p.bowling.stamina + Math.round(bowl / 2) + get(s, 'stamina')) }
      : null,
  }
}

export function applyShifts(team: Team, shifts: Record<string, PlayerShift> | undefined): Team {
  if (!shifts) return team
  return { ...team, players: team.players.map((p) => applyShift(p, shifts[p.id])) }
}

/** The team with the players it has signed and without the ones it has let go (its squad in the market). */
function withSquad(team: Team, market: Season['market']): Team {
  const ids = market?.squads[team.id]
  if (!ids) return team
  const own = new Map(team.players.map((p) => [p.id, p]))
  const players = ids.map((id) => own.get(id) ?? market.players[id] ?? YOUTH_BY_ID.get(id)).filter((p): p is Player => !!p)
  if (players.length === ids.length && players.every((p, i) => p === team.players[i])) return team
  const has = new Set(players.map((p) => p.id))
  return { ...team, players, captainId: has.has(team.captainId) ? team.captainId : players[0]?.id ?? team.captainId, keeperId: team.keeperId && has.has(team.keeperId) ? team.keeperId : undefined }
}

/** A team as it plays in the career: ratings earned so far, and your own lineup if you've set one. */
export function sessionTeam(team: Team, season: Pick<Season, 'shifts' | 'lineup' | 'myTeamId' | 'market'>): Team {
  const t = applyShifts(withSquad(team, season.market), season.shifts)
  const l = team.id === season.myTeamId ? season.lineup : undefined
  if (!l) return t
  const byId = new Map(t.players.map((p) => [p.id, p]))
  const ordered = l.order.map((id) => byId.get(id)).filter((p): p is Player => !!p)
  const rest = t.players.filter((p) => !l.order.includes(p.id))
  return { ...t, players: [...ordered, ...rest], captainId: byId.has(l.captainId) ? l.captainId : t.captainId, keeperId: l.keeperId && byId.has(l.keeperId) ? l.keeperId : t.keeperId }
}

/** Add a few rating points to a player (for working out how much his overall moved). */
export function applyDelta(p: Player, a: Partial<Record<AttrKey, number>>): Player {
  return applyShift(p, { bat: 0, bowl: 0, a })
}

// ---- What one match does to a player ----------------------------------------------------------------
// Calibrated against the engine: what a batsman or bowler of a given rating usually scores in each format,
// and how much it varies. A player who beats that by a good margin gains; one who falls well short loses.

const BAT_EXPECT: Record<MatchFormat, { a: number; b: number; sd: number }> = { t20: { a: -34.2, b: 0.706, sd: 23.6 }, odi: { a: -37, b: 0.838, sd: 30.2 }, test: { a: -32, b: 0.85, sd: 34 } }
const BOWL_EXPECT: Record<MatchFormat, { a: number; b: number; sd: number; par: number }> = { t20: { a: -9.8, b: 0.474, sd: 33.6, par: 8.2 }, odi: { a: 1.6, b: 0.167, sd: 18, par: 5.3 }, test: { a: 1.6, b: 0.167, sd: 18, par: 3.2 } }

/** A performance is judged against what a player of his own rating usually does; how much a good one is worth depends on his rating (see headroom). */
const grade = (z: number) => z
const points = (z: number) => (Math.abs(z) >= 2 ? 2 : Math.abs(z) >= 0.9 ? 1 : 0) * Math.sign(z)

type Delta = Partial<Record<AttrKey, number>>

const BAT_SPREAD: [AttrKey, number][] = [['technique', 0.36], ['power', 0.36], ['temperament', 0.2], ['running', 0.08]]
const BOWL_SPREAD: [AttrKey, number][] = [['accuracy', 0.45], ['variation', 0.4], ['stamina', 0.15]]
const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }
const rngFor = (fixtureId: string, playerId: string) => new Rng(hash(`${fixtureId}|${playerId}`))
/** A weighted draw, optionally skipping one rating. */
function pick(r: Rng, spread: [AttrKey, number][], not?: AttrKey): AttrKey {
  const list = spread.filter(([k]) => k !== not)
  const total = list.reduce((x, [, w]) => x + w, 0)
  let t = r.next() * total
  for (const [k, w] of list) { t -= w; if (t <= 0) return k }
  return list[list.length - 1][0]
}
const add = (d: Delta, k: AttrKey, n: number) => { d[k] = (d[k] ?? 0) + n }
const attrOf = (p: Player, k: AttrKey): number => (k === 'fielding' ? p.fielding : ((p.batting as unknown as Record<string, number>)[k] ?? (p.bowling as unknown as Record<string, number> | null)?.[k] ?? 0))
/** One earned point on one rating: a loss is always 1, a gain is scaled by how much room the rating has to grow (a whole number, with the remainder decided by a seeded draw). */
function addPoint(d: Delta, p: Player, k: AttrKey, sign: number, r: Rng) {
  if (sign < 0) return add(d, k, -1)
  const v = attrOf(p, k)
  if (v >= 99) return
  const f = headroom(v)
  const n = Math.floor(f) + (r.next() < f - Math.floor(f) ? 1 : 0)
  if (n > 0) add(d, k, n)
}

const indexCache = new WeakMap<Map<string, Team>, Map<string, Player>>()
function playerIndex(teams: Map<string, Team>): Map<string, Player> {
  let m = indexCache.get(teams)
  if (!m) { m = new Map(); for (const t of teams.values()) for (const p of t.players) m.set(p.id, p); indexCache.set(teams, m) }
  return m
}

/** Changes for the players in one match, from the match's own batting and bowling lines. Players whose ratings don't move are left out. */
export function matchChanges(raw: RawSummary, format: MatchFormat, teams: Map<string, Team>, tilt?: Map<string, number>): Record<string, MatchDelta> {
  const byId = playerIndex(teams)
  const deltas = new Map<string, Delta>()
  const put = (id: string) => { let d = deltas.get(id); if (!d) deltas.set(id, (d = {})); return d }

  for (const [id, runs, balls, fours, sixes, out] of raw.bat) {
    const p = byId.get(id)
    if (!p || (balls === 0 && !out)) continue
    const e = BAT_EXPECT[format]
    const bs = battingScore(p.batting)
    const bp = runs + fours * 0.5 + sixes
    let n = points(grade((bp - (e.a + e.b * (bs + (tilt?.get(id) ?? 0)))) / e.sd))
    if (runs === 0 && out) n = Math.min(n, -1) // a duck always costs something
    if (n === 0) continue
    const d = put(id)
    // which ratings move is spread by a seeded draw (the same for gains and losses, so no rating drifts one way);
    // a duck is the one exception: it always dents temperament
    const r = rngFor(raw.fixtureId, id)
    const g = rngFor(`${raw.fixtureId}|gain`, id)
    const first: AttrKey = runs === 0 && out && n < 0 ? 'temperament' : pick(r, BAT_SPREAD)
    addPoint(d, p, first, Math.sign(n), g)
    if (Math.abs(n) === 2) addPoint(d, p, pick(r, BAT_SPREAD, first), Math.sign(n), g)
  }

  for (const [id, balls, runs, wickets, maidens] of raw.bowl) {
    const p = byId.get(id)
    if (!p || !p.bowling || balls < 12) continue
    const e = BOWL_EXPECT[format]
    const ws = bowlingScore(p.bowling)
    const ov = balls / 6
    const econ = runs / ov
    const idx = ((wickets * 22 + maidens * 4) / ov) * 4 + (e.par - econ) * 8
    const n = points(grade((idx - (e.a + e.b * (ws + (tilt?.get(id) ?? 0)))) / e.sd) + 0.1 + 0.033 * (85 - Math.min(ws, 85)))
    if (n === 0) continue
    const d = put(id)
    const r = rngFor(raw.fixtureId, id)
    const g = rngFor(`${raw.fixtureId}|gain`, id)
    const first = pick(r, BOWL_SPREAD)
    addPoint(d, p, first, Math.sign(n), g)
    if (Math.abs(n) === 2) addPoint(d, p, pick(r, BOWL_SPREAD, first), Math.sign(n), g)
  }

  const out: Record<string, MatchDelta> = {}
  for (const [id, a] of deltas) {
    if (!Object.keys(a).length) continue // a good game that a top-rated player gets nothing from
    const p = byId.get(id) as Player
    const o = overall(applyDelta(p, a)) - overall(p)
    out[id] = { o, a }
  }
  return out
}

/**
 * The difficulty tilts a career match: your players get a bonus and the computer's get theirs, so a player's runs and wickets say a little less about him than usual.
 * Grading takes it into account (expecting more of a boosted player, less of a held-back one), so the difficulty never changes how fast anyone's ratings move.
 */
function difficultyTilt(season: Pick<Season, 'myTeamId' | 'difficulty'>, fixture: Fixture, teams: Map<string, Team>): Map<string, number> | undefined {
  const me = season.myTeamId
  if (!me || (fixture.homeId !== me && fixture.awayId !== me)) return undefined
  const d = DIFFICULTIES[season.difficulty ?? 'normal']
  const tilt = new Map<string, number>()
  for (const t of teams.values()) for (const p of t.players) tilt.set(p.id, t.id === me ? d.help - d.boost : d.boost - d.help)
  return tilt
}

/** Records a match's rating changes in the season: they take effect from the next match on. */
export function applyMatchChanges(season: Season, fixture: Fixture, raw: RawSummary, teams: Map<string, Team>): Season {
  const delta = matchChanges(raw, fixture.format, teams, difficultyTilt(season, fixture, teams))
  const ids = Object.keys(delta)
  if (!ids.length) return season
  const shifts: Record<string, PlayerShift> = { ...(season.shifts ?? {}) }
  const log: Record<string, MatchDelta> = {}
  for (const id of ids) {
    const cur = shifts[id] ?? { bat: 0, bowl: 0 }
    const a: Delta = { ...(cur.a ?? {}) }
    const applied: Delta = {}
    for (const [k, n] of Object.entries(delta[id].a) as [AttrKey, number][]) {
      const next = Math.max(-MAX_ATTR_DRIFT, Math.min(MAX_ATTR_DRIFT, (a[k] ?? 0) + n))
      const real = next - (a[k] ?? 0)
      if (real !== 0) { a[k] = next; applied[k] = real }
    }
    if (!Object.keys(applied).length) continue
    shifts[id] = { ...cur, a }
    log[id] = { o: delta[id].o, a: applied }
  }
  return { ...season, shifts, changes: { ...(season.changes ?? {}), [fixture.id]: log } }
}

// ---- A season's changes ------------------------------------------------------------------------------

/** How every player's ratings moved over the season so far, compared with where they started it. */
export function seasonChanges(season: Season, teams: Map<string, Team>): PlayerChange[] {
  const out: PlayerChange[] = []
  const start = season.startShifts ?? {}
  for (const id of season.teamIds) {
    const t = teams.get(id)
    if (!t) continue
    // `t` already carries the current shifts; undo the season's by comparing against the start-of-season shifts on the base player
    for (const p of t.players) {
      const base = baseOf(p, season.shifts?.[p.id])
      const before = applyShift(base, start[p.id])
      out.push({ id: p.id, name: p.name, teamId: id, before: overall(before), after: overall(p), bat: Math.round(battingScore(p.batting) - battingScore(before.batting)), bowl: p.bowling && before.bowling ? Math.round(bowlingScore(p.bowling) - bowlingScore(before.bowling)) : 0 })
    }
  }
  return out
}

/** The player without any shifts: undo `s` from a player that has it applied (ratings clamp, so this is approximate at the extremes). */
function baseOf(p: Player, s: PlayerShift | undefined): Player {
  if (!s) return p
  const bat = s.bat ?? 0, bowl = s.bowl ?? 0
  return {
    ...p,
    batting: {
      technique: p.batting.technique - bat - get(s, 'technique'),
      power: p.batting.power - bat - get(s, 'power'),
      temperament: p.batting.temperament - bat - get(s, 'temperament'),
      running: p.batting.running - Math.round(bat / 2) - get(s, 'running'),
    },
    bowling: p.bowling ? { ...p.bowling, accuracy: p.bowling.accuracy - bowl - get(s, 'accuracy'), variation: p.bowling.variation - bowl - get(s, 'variation'), stamina: p.bowling.stamina - Math.round(bowl / 2) - get(s, 'stamina') } : null,
  }
}

/** Per-rating change of one player this season (what to show as +n or -n beside each bar). */
export function seasonAttrChanges(season: Season, id: string): Delta {
  const now = season.shifts?.[id], start = season.startShifts?.[id]
  const out: Delta = {}
  for (const k of ATTRS) { const d = get(now, k) - get(start, k); if (d) out[k] = d }
  return out
}

/** What a player's ratings were when his team was made, side by side with what they are now. */
export function ratingRows(base: Player, now: Player): { key: AttrKey | 'overall'; label: string; base: number; now: number }[] {
  const rows: { key: AttrKey | 'overall'; label: string; base: number; now: number }[] = [{ key: 'overall', label: 'Overall', base: overall(base), now: overall(now) }]
  for (const k of ['technique', 'power', 'temperament', 'running'] as const) rows.push({ key: k, label: ATTR_LABEL[k], base: base.batting[k], now: now.batting[k] })
  if (base.bowling && now.bowling) for (const k of ['accuracy', 'variation', 'stamina'] as const) rows.push({ key: k, label: ATTR_LABEL[k], base: base.bowling[k], now: now.bowling[k] })
  return rows
}

/** The player's most recent change from a match, newest first. */
export function playerChangeLog(season: Season, playerId: string, limit = 8): { fixtureId: string; date: string; delta: MatchDelta }[] {
  const out: { fixtureId: string; date: string; delta: MatchDelta }[] = []
  for (const f of season.fixtures) {
    const d = season.changes?.[f.id]?.[playerId]
    if (d) out.push({ fixtureId: f.id, date: f.date, delta: d })
  }
  return out.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit)
}

/**
 * Catches a season up on matches that were played before ratings changed with every match: they are graded in date
 * order from their saved batting and bowling lines, so the changes build up as if they had happened live.
 * Matches that already have their changes are left alone. Base teams are the teams before any career changes.
 */
export function gradePlayedMatches(season: Season, baseTeams: Map<string, Team>): Season {
  if (season.graded) return season
  let cur: Season = { ...season, graded: true, startShifts: season.startShifts ?? JSON.parse(JSON.stringify(season.shifts ?? {})) }
  const roster = season.roster ?? []
  const todo = season.fixtures.filter((f) => season.results[f.id] && !season.changes?.[f.id] && f.homeId && f.awayId).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
  for (const f of todo) {
    const res = season.results[f.id]
    const raw: RawSummary = {
      ...res,
      six: res.six?.map(([i, m]) => [roster[i], m] as [string, number]),
      played: res.played?.map((i) => roster[i]),
      reel: undefined,
      ff: undefined,
      bat: (res.bat ?? []).map(([i, ...rest]) => [roster[i], ...rest] as RawSummary['bat'][number]),
      bowl: (res.bowl ?? []).map(([i, ...rest]) => [roster[i], ...rest] as RawSummary['bowl'][number]),
    }
    const pair = new Map<string, Team>()
    for (const id of [f.homeId as string, f.awayId as string]) { const t = baseTeams.get(id); if (t) pair.set(id, sessionTeam(t, cur)) } // ratings as they stand as we go
    if (pair.size === 2) cur = applyMatchChanges(cur, f, raw, pair)
  }
  return cur
}
