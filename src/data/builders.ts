import type { BattingRatings, BowlingRatings, BowlType, Hand, Player, Role, Team, TeamColors, Trait, Universe } from '../types'

export type BowlCode = 'f' | 'm' | 'o' | 'l' | 'x'
export type BatTuple = [technique: number, power: number, temperament: number, running: number]
export type BowlTuple = [type: BowlCode, accuracy: number, variation: number, stamina: number]

const BOWL_TYPES: Record<BowlCode, BowlType> = {
  f: 'fast',
  m: 'medium',
  o: 'offspin',
  l: 'legspin',
  x: 'leftspin',
}

export const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export type PlayerDef = Omit<Player, 'id'>

/** Compact player definition used by the built-in team files. */
export function P(
  name: string,
  role: Role,
  bat: BatTuple,
  bowl: BowlTuple | null,
  fielding: number,
  traits: Trait[] = [],
  hand: Hand = 'R',
): PlayerDef {
  const batting: BattingRatings = { technique: bat[0], power: bat[1], temperament: bat[2], running: bat[3] }
  const bowling: BowlingRatings | null = bowl
    ? { type: BOWL_TYPES[bowl[0]], accuracy: bowl[1], variation: bowl[2], stamina: bowl[3] }
    : null
  return { name, role, hand, batting, bowling, fielding, traits }
}

export interface TeamMeta {
  id: string
  name: string
  short: string
  series: string
  universe: Universe
  colors: TeamColors
  home: string
  captain: string // must match a player name
}

export function makeTeam(meta: TeamMeta, defs: PlayerDef[]): Team {
  const players: Player[] = defs.map((d) => ({ ...d, id: `${meta.id}-${slug(d.name)}` }))
  const captain = players.find((p) => p.name === meta.captain)
  if (!captain) throw new Error(`Captain "${meta.captain}" not found in ${meta.id}`)
  const { captain: _captain, ...rest } = meta
  return { ...rest, captainId: captain.id, players }
}

// ---- Derived ratings -------------------------------------------------------

export const battingScore = (b: BattingRatings) =>
  b.technique * 0.35 + b.power * 0.35 + b.temperament * 0.2 + b.running * 0.1

export const bowlingScore = (b: BowlingRatings) => b.accuracy * 0.35 + b.variation * 0.45 + b.stamina * 0.2

export function overall(p: Player): number {
  const bat = battingScore(p.batting)
  const bowl = p.bowling ? bowlingScore(p.bowling) : 0
  switch (p.role) {
    case 'BAT':
      return Math.round(bat * 0.85 + p.fielding * 0.15)
    case 'WK':
      return Math.round(bat * 0.7 + p.fielding * 0.3)
    case 'BOWL':
      return Math.round(bowl * 0.85 + p.fielding * 0.15)
    case 'AR':
      return Math.round(bat * 0.45 + bowl * 0.45 + p.fielding * 0.1)
  }
}

export const isPace = (t: BowlType) => t === 'fast' || t === 'medium'

export function teamStrength(team: Team): number {
  const xi = team.players.slice(0, 11)
  return Math.round(xi.reduce((s, p) => s + overall(p), 0) / xi.length)
}
