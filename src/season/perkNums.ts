import { NODE_BY_ID } from '../data/passiveTree'
import type { ClubState } from './types'

type Holder = { market?: { club?: ClubState } } | { club?: ClubState }
const clubOf = (h: Holder): ClubState | undefined => ('market' in h ? h.market?.club : (h as { club?: ClubState }).club)

/** The passive-tree perks you have taken, and the numbers they add up to. Kept free of imports from the career code so any of it can use it. */
export const takenOf = (h: Holder): string[] => clubOf(h)?.perks ?? []

/** The sum of one named number over every perk taken (for example `build` is -0.05 with Frugal). Pass a season, a market or a club. */
export function perkSum(h: Holder, key: string): number {
  let n = 0
  for (const id of takenOf(h)) n += NODE_BY_ID.get(id)?.fx.k?.[key] ?? 0
  return n
}
