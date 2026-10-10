import { Rng } from '../engine/rng'
import { battingScore, bowlingScore, overall } from '../data/builders'
import type { Player, Team } from '../types'
import { collect } from './stats'
import type { PlayerChange, PlayerShift, Season } from './types'

/** The most a player can drift from his starting ratings over a whole career. */
const MAX_DRIFT = 25
const clampRating = (n: number) => Math.max(1, Math.min(99, Math.round(n)))
const clampShift = (n: number) => Math.max(-MAX_DRIFT, Math.min(MAX_DRIFT, n))

/** A player with his career gains and losses added to his starting ratings. */
export function applyShift(p: Player, s: PlayerShift | undefined): Player {
  if (!s || (!s.bat && !s.bowl)) return p
  return {
    ...p,
    batting: {
      technique: clampRating(p.batting.technique + s.bat),
      power: clampRating(p.batting.power + s.bat),
      temperament: clampRating(p.batting.temperament + s.bat),
      running: clampRating(p.batting.running + Math.round(s.bat / 2)),
    },
    bowling: p.bowling
      ? { ...p.bowling, accuracy: clampRating(p.bowling.accuracy + s.bowl), variation: clampRating(p.bowling.variation + s.bowl), stamina: clampRating(p.bowling.stamina + Math.round(s.bowl / 2)) }
      : null,
  }
}

export function applyShifts(team: Team, shifts: Record<string, PlayerShift> | undefined): Team {
  if (!shifts) return team
  return { ...team, players: team.players.map((p) => applyShift(p, shifts[p.id])) }
}

/** A team as it plays in the session: ratings carried over from earlier years, and your own lineup if you've set one. */
export function sessionTeam(team: Team, season: Pick<Season, 'shifts' | 'lineup' | 'myTeamId'>): Team {
  const t = applyShifts(team, season.shifts)
  const l = team.id === season.myTeamId ? season.lineup : undefined
  if (!l) return t
  const byId = new Map(t.players.map((p) => [p.id, p]))
  const ordered = l.order.map((id) => byId.get(id)).filter((p): p is Player => !!p)
  const rest = t.players.filter((p) => !l.order.includes(p.id))
  return { ...t, players: [...ordered, ...rest], captainId: byId.has(l.captainId) ? l.captainId : t.captainId, keeperId: l.keeperId && byId.has(l.keeperId) ? l.keeperId : t.keeperId }
}

/** Straight-line fit y = a + b x, and the spread of what's left over. */
function fit(points: { x: number; y: number }[]) {
  const n = points.length
  if (n < 5) return null
  const mx = points.reduce((s, p) => s + p.x, 0) / n
  const my = points.reduce((s, p) => s + p.y, 0) / n
  const sxx = points.reduce((s, p) => s + (p.x - mx) ** 2, 0)
  const b = sxx ? points.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0) / sxx : 0
  const a = my - b * mx
  const sd = Math.sqrt(points.reduce((s, p) => s + (p.y - (a + b * p.x)) ** 2, 0) / n) || 1
  return { a, b, sd }
}

/** Seasons of form are noisy, so one big year moves a player a few points, not a dozen. */
const MOVE = { max: 5, min: -4 }

function movement(z: number | null, rating: number, rng: Rng, weight: number): number {
  // Good players slow down, poor ones have room to grow, and a bit of luck either way.
  const settle = -(rating - 62) / 22
  const form = z === null ? 0 : 1.7 * Math.max(-2, Math.min(2.2, z))
  const luck = rng.normal() * 0.55
  const raw = (z === null ? settle * 0.5 : settle + form) * weight + luck
  return Math.max(MOVE.min, Math.min(MOVE.max, Math.round(raw)))
}

export interface Progression {
  /** Everybody's total gains and losses so far, including this year. */
  shifts: Record<string, PlayerShift>
  /** Every player whose ratings changed this year, in all teams. */
  changes: PlayerChange[]
}

/**
 * At the end of a year, players who did better than their ratings suggest improve and players who did
 * worse lose points. Everyone also drifts a little toward the middle, and luck plays a part.
 * `teams` must already carry the shifts from earlier years.
 */
export function computeProgression(season: Season, teams: Map<string, Team>): Progression {
  const c = collect(season)
  const rng = new Rng((season.seed ^ (season.year * 2654435761)) >>> 0)
  const players: { p: Player; teamId: string }[] = []
  for (const id of season.teamIds) {
    const t = teams.get(id)
    if (t) t.players.forEach((p) => players.push({ p, teamId: id }))
  }

  const batPts = (id: string) => {
    const b = c.bat.get(id)
    return b && b.innings >= 6 ? { v: (b.runs + b.fours * 0.5 + b.sixes + b.fifties * 10 + b.hundreds * 25) / b.innings } : null
  }
  const bowlPts = (id: string) => {
    const w = c.bowl.get(id)
    return w && w.balls >= 60 ? { v: ((w.wickets * 22 + w.maidens * 4 + w.fiveW * 15) / w.balls) * 24 } : null
  }

  const batFit = fit(players.flatMap(({ p }) => { const r = batPts(p.id); return r ? [{ x: battingScore(p.batting), y: r.v }] : [] }))
  const bowlFit = fit(players.flatMap(({ p }) => { const r = bowlPts(p.id); return p.bowling && r ? [{ x: bowlingScore(p.bowling), y: r.v }] : [] }))

  const shifts: Record<string, PlayerShift> = {}
  const changes: PlayerChange[] = []
  for (const { p, teamId } of players) {
    const old = (season.shifts ?? {})[p.id] ?? { bat: 0, bowl: 0 }
    // Specialists mostly move in their own discipline.
    const batWeight = p.role === 'BOWL' ? 0.5 : 1
    const bowlWeight = p.role === 'BAT' || p.role === 'WK' ? 0.5 : 1
    const br = batPts(p.id)
    const wr = bowlPts(p.id)
    const bz = br && batFit ? (br.v - (batFit.a + batFit.b * battingScore(p.batting))) / batFit.sd : null
    const wz = wr && bowlFit && p.bowling ? (wr.v - (bowlFit.a + bowlFit.b * bowlingScore(p.bowling))) / bowlFit.sd : null
    const dBat = movement(bz, battingScore(p.batting), rng, batWeight)
    const dBowl = p.bowling ? movement(wz, bowlingScore(p.bowling), rng, bowlWeight) : 0
    const next = { bat: clampShift(old.bat + dBat), bowl: clampShift(old.bowl + dBowl) }
    shifts[p.id] = next
    const before = overall(p)
    const after = overall(applyShift({ ...p, batting: p.batting, bowling: p.bowling }, { bat: next.bat - old.bat, bowl: next.bowl - old.bowl }))
    changes.push({ id: p.id, name: p.name, teamId, before, after, bat: next.bat - old.bat, bowl: next.bowl - old.bowl })
  }
  return { shifts, changes }
}
