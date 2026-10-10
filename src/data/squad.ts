import type { Player } from '../types'
import { battingScore, overall, bowlingScore } from './builders'

export const XI_SIZE = 11

export interface SquadCheck {
  errors: string[]
  warnings: string[]
}

/** Rules a squad must satisfy before it can play: the first 11 are the XI, in batting order. */
/** The wicketkeeper of an XI: the one you picked if he's playing, otherwise the keeper-role player. */
export function keeperIn(xi: Player[], keeperId?: string): Player | undefined {
  return xi.find((p) => p.id === keeperId) ?? xi.find((p) => p.role === 'WK')
}

/** What still needs choosing before a squad is saved. */
export function missingPicks(players: Player[], captainId: string | undefined, keeperId: string | undefined): { captain: boolean; keeper: boolean } {
  const xi = players.slice(0, XI_SIZE)
  return { captain: !xi.some((p) => p.id === captainId), keeper: !keeperIn(xi, keeperId) }
}

export function validateSquad(players: Player[], captainId?: string, keeperId?: string): SquadCheck {
  const errors: string[] = []
  const warnings: string[] = []
  const xi = players.slice(0, XI_SIZE)
  if (players.length < XI_SIZE) errors.push(`You need at least ${XI_SIZE} players (you have ${players.length}).`)
  if (!keeperIn(xi, keeperId)) warnings.push('No wicketkeeper is picked. You\'ll be asked to choose one when you save.')
  if (xi.filter((p) => p.bowling).length < 5) errors.push('The XI needs at least 5 bowling options (bowlers or all-rounders).')
  if (captainId && !xi.some((p) => p.id === captainId)) warnings.push('Your captain is on the bench.')
  return { errors, warnings }
}

export const swapPlayers = <T,>(list: T[], a: number, b: number): T[] => {
  if (a === b || a < 0 || b < 0 || a >= list.length || b >= list.length) return list
  const next = [...list]
  ;[next[a], next[b]] = [next[b], next[a]]
  return next
}

/**
 * Picks the strongest balanced XI: one keeper, at least five bowling options, then the best of
 * the rest. Batting order follows batting strength. The remainder becomes the bench, best first.
 */
export function autoPickXI(players: Player[], rate: (p: Player) => number = overall, batRate: (p: Player) => number = (p) => battingScore(p.batting)): Player[] {
  const byOverall = [...players].sort((a, b) => rate(b) - rate(a))
  const keeper = byOverall.find((p) => p.role === 'WK') ?? [...players].sort((a, b) => b.fielding - a.fielding)[0]
  const chosen: Player[] = [keeper]
  let bowlers = keeper.bowling ? 1 : 0
  for (const p of byOverall) {
    if (chosen.length >= XI_SIZE) break
    if (p === keeper) continue
    const slotsAfter = XI_SIZE - chosen.length - 1
    const stillNeeded = Math.max(0, 5 - bowlers - (p.bowling ? 1 : 0))
    if (stillNeeded > slotsAfter) continue // taking this player would leave too few bowlers
    chosen.push(p)
    if (p.bowling) bowlers++
  }
  const xi = chosen.sort((a, b) => batRate(b) - batRate(a) || (b.bowling ? bowlingScore(b.bowling) : 0) - (a.bowling ? bowlingScore(a.bowling) : 0))
  const bench = byOverall.filter((p) => !xi.includes(p))
  return [...xi, ...bench]
}

/** A plain-words list of how an edited team differs from its default, for "are you sure you want to reset?". */
export function describeChanges(def: { name: string; short: string; home: string; series: string; colors: { primary: string; secondary: string }; logoUrl?: string; captainId: string; keeperId?: string; players: Player[] }, cur: typeof def): string[] {
  const out: string[] = []
  if (cur.name !== def.name) out.push(`Team name ("${cur.name}" instead of "${def.name}")`)
  if (cur.short !== def.short || cur.home !== def.home || cur.series !== def.series) out.push('Team details (code, home ground or franchise)')
  if (cur.colors.primary !== def.colors.primary || cur.colors.secondary !== def.colors.secondary) out.push('Team colours')
  if ((cur.logoUrl ?? '') !== (def.logoUrl ?? '')) out.push('The team logo')
  if (cur.captainId !== def.captainId) out.push('The captain')
  if ((cur.keeperId ?? '') !== (def.keeperId ?? '')) out.push('The wicketkeeper')
  const byId = new Map(def.players.map((p) => [p.id, p]))
  const edited = cur.players.filter((p) => byId.has(p.id) && JSON.stringify({ ...p }) !== JSON.stringify({ ...byId.get(p.id) }))
  const added = cur.players.filter((p) => !byId.has(p.id)).length
  const removed = def.players.filter((p) => !cur.players.some((x) => x.id === p.id)).length
  if (edited.length) out.push(`${edited.length} player${edited.length > 1 ? 's' : ''} edited (ratings, role, traits or image)`)
  if (added) out.push(`${added} player${added > 1 ? 's' : ''} added`)
  if (removed) out.push(`${removed} player${removed > 1 ? 's' : ''} removed`)
  const orderChanged = cur.players.filter((p) => byId.has(p.id)).some((p, i) => p.id !== def.players.filter((x) => cur.players.some((c) => c.id === x.id))[i]?.id)
  if (orderChanged) out.push('The playing XI and batting order')
  return out
}
