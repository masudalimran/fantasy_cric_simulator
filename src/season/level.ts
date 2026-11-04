import { COST, MAX_LEVEL, NODE_BY_ID, canTake, pointsAt, xpFor } from '../data/passiveTree'
import { levelOf } from './clubEffects'
import { FACILITY_KEYS } from './club'
import type { Season } from './types'

/**
 * Your career level. Worked out from what is already saved (matches, wins, finished seasons, club buildings and statues), so a career that began
 * before levels existed simply has the level it has earned. Each level gives a passive-tree point, and bonus points at 10, 20, 30, 40, 50 and 60.
 */
export const XP_PLAYED = 20
export const XP_WIN = 30
export const XP_SEASON = 150
export const XP_BUILDING_LEVEL = 15
export const XP_STATUE = 15

/** XP needed to go from level l to l + 1 is in `xpFor`; this is the total needed to reach level l. */
export const xpToReach = (level: number): number => { let t = 0; for (let l = 1; l < level; l++) t += xpFor(l); return t }

export function careerXp(seasons: Season[], finishedSeasons: number): number {
  let xp = finishedSeasons * XP_SEASON
  for (const s of seasons) {
    const me = s.myTeamId
    if (!me) continue
    for (const f of s.fixtures) {
      if (f.homeId !== me && f.awayId !== me) continue
      const r = s.results[f.id]
      if (!r) continue
      xp += XP_PLAYED + (r.winnerId === me ? XP_WIN : 0)
    }
  }
  const club = seasons[seasons.length - 1]?.market?.club
  if (club) xp += FACILITY_KEYS.reduce((n, k) => n + levelOf(club, k), 0) * XP_BUILDING_LEVEL + (club.statues?.length ?? 0) * XP_STATUE
  return xp
}

export interface LevelInfo { xp: number; level: number; into: number; need: number; pct: number; maxed: boolean }
export function levelInfo(xp: number): LevelInfo {
  let level = 1
  while (level < MAX_LEVEL && xp >= xpToReach(level + 1)) level++
  const base = xpToReach(level)
  const need = level >= MAX_LEVEL ? 0 : xpFor(level)
  const into = xp - base
  return { xp, level, into, need, pct: need ? Math.max(0, Math.min(1, into / need)) : 1, maxed: level >= MAX_LEVEL }
}

export const spentPoints = (perks: string[]): number => perks.reduce((n, id) => n + COST[NODE_BY_ID.get(id)?.kind ?? 's'], 0)
export const pointsLeft = (level: number, perks: string[]): number => pointsAt(level) - spentPoints(perks)

interface Result { season: Season; error?: string }
const withPerks = (season: Season, perks: string[], respecs?: number): Season => {
  const m = season.market
  if (!m) return season
  return { ...season, market: { ...m, club: { ...m.club, perks, ...(respecs !== undefined ? { respecs } : {}) } } }
}

export function takePerk(season: Season, id: string, level: number): Result {
  const node = NODE_BY_ID.get(id)
  const have = season.market?.club?.perks ?? []
  if (!node || !season.market) return { season, error: 'That perk cannot be found.' }
  if (have.includes(id)) return { season, error: 'You already have it.' }
  if (!canTake(node, new Set(have))) return { season, error: 'Take a connected perk first.' }
  if (pointsLeft(level, have) < COST[node.kind]) return { season, error: `It needs ${COST[node.kind]} points.` }
  return { season: withPerks(season, [...have, id]) }
}

/** Takes one perk back, only if every other perk is still connected to the start. */
export function dropPerk(season: Season, id: string): Result {
  const have = season.market?.club?.perks ?? []
  if (!have.includes(id)) return { season, error: 'You do not have it.' }
  const rest = have.filter((x) => x !== id)
  const set = new Set(rest)
  const ok = rest.every((x) => { const t = NODE_BY_ID.get(x); return !!t && (t.row === 0 || t.req.some((r) => set.has(r))) })
  return ok ? { season: withPerks(season, rest) } : { season, error: 'Other perks depend on it. Take those back first.' }
}

/** The first reset is free; after that it costs coins. */
export const respecCost = (season: Season): number => ((season.market?.club?.respecs ?? 0) === 0 ? 0 : Math.max(50, spentPoints(season.market?.club?.perks ?? []) * 6))
export function respec(season: Season): Result {
  const m = season.market
  const me = season.myTeamId
  if (!m || !me) return { season, error: 'Start a career first.' }
  const cost = respecCost(season)
  if ((m.budgets[me] ?? 0) < cost) return { season, error: `A reset costs ${cost} coins.` }
  const out = withPerks(season, [], (m.club?.respecs ?? 0) + 1)
  return { season: { ...out, market: { ...(out.market as NonNullable<Season['market']>), budgets: { ...m.budgets, [me]: (m.budgets[me] ?? 0) - cost } } } }
}
