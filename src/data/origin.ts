import { BUILT_IN_TEAMS, LEGACY_TEAMS } from './teams'
import { YOUTH_BY_ID } from './youthPool'
import type { Team, Universe } from '../types'

/** Which anime or game a player comes from. */
export interface Origin { series: string; universe: Universe }

// built-in and retired teams: every player's id starts with his original team's id, so he keeps his origin wherever he plays
const BUILT = new Map<string, Origin>()
for (const t of [...BUILT_IN_TEAMS, ...LEGACY_TEAMS]) for (const p of t.players) BUILT.set(p.id, { series: t.series, universe: t.universe })

/**
 * The anime or game a player is from, or null if it is not known (a player on a team you made yourself).
 * It follows the player, not the team he plays for now, so a player who moves in the market keeps it.
 */
export function originOf(playerId: string, customTeams: Team[] = []): Origin | null {
  const y = YOUTH_BY_ID.get(playerId)
  if (y) return { series: y.series, universe: 'anime' }
  const b = BUILT.get(playerId)
  if (b) return b
  for (const t of customTeams) if (t.universe !== 'custom' && t.players.some((p) => p.id === playerId)) return { series: t.series, universe: t.universe }
  return null
}
