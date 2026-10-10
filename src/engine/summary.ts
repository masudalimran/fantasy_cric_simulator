import { computeAwards } from './awards'
import type { Match } from './match'

/** The Man of the Match's player id (see `awards.ts` for how it's decided). */
export function playerOfTheMatch(m: Match): string | null {
  return computeAwards(m).motm?.id ?? null
}
