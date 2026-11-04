import type { ClubState, Season } from './types'

/** What the club's buildings do for the rest of the game. Kept apart from `club.ts` so coaching and injuries can read it without a circular import. */
export const levelOf = (club: ClubState | undefined, key: 'training' | 'medical' | 'academy' | 'stadium'): number => club?.levels?.[key] ?? 0

/** How much faster your coach's training works: 10% per level of training ground (other teams: 1). */
export const trainingMult = (season: Pick<Season, 'market' | 'myTeamId'>, teamId: string): number => (teamId === season.myTeamId ? 1 + 0.1 * levelOf(season.market?.club, 'training') : 1)
/** The share of injuries the medical centre prevents: 8% per level. */
export const medicalBlock = (season: Pick<Season, 'market'>): number => 0.08 * levelOf(season.market?.club, 'medical')
/** Physios you can have: three, one more at medical level 2 and another at level 4. */
export const physioSlots = (season: Pick<Season, 'market'>): number => 3 + (levelOf(season.market?.club, 'medical') >= 2 ? 1 : 0) + (levelOf(season.market?.club, 'medical') >= 4 ? 1 : 0)
