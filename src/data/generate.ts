import type { BowlType, Player, Role, Team } from '../types'
import { slug } from './builders'

const clamp = (n: number) => Math.max(1, Math.min(100, Math.round(n)))
const jitter = (spread: number) => (Math.random() * 2 - 1) * spread
const BOWL_TYPES: BowlType[] = ['fast', 'medium', 'offspin', 'legspin', 'leftspin']

/**
 * Builds a believable set of ratings for a role at a given overall level (20-95).
 * Used by the team creator so you don't have to set 11 attributes for every player.
 */
export function generatePlayer(id: string, name: string, role: Role, level: number, bowlType?: BowlType): Player {
  const b = (offset = 0, spread = 6) => clamp(level + offset + jitter(spread))
  const lowBat = (f: number) => clamp(level * f + jitter(5))
  const type = bowlType ?? BOWL_TYPES[Math.floor(Math.random() * BOWL_TYPES.length)]

  const strongBat = { technique: b(), power: b(), temperament: b(), running: b(-4, 8) }
  const weakBat = { technique: lowBat(0.4), power: lowBat(0.45), temperament: lowBat(0.55), running: lowBat(0.55) }
  const strongBowl = { type, accuracy: b(), variation: b(), stamina: b(-4, 8) }

  switch (role) {
    case 'BAT':
      return { id, name, role, hand: 'R', batting: strongBat, bowling: null, fielding: b(-4, 8), traits: [] }
    case 'WK':
      return { id, name, role, hand: 'R', batting: strongBat, bowling: null, fielding: clamp(level + 8 + jitter(4)), traits: ['safe-hands'] }
    case 'BOWL':
      return { id, name, role, hand: 'R', batting: weakBat, bowling: strongBowl, fielding: b(-6, 8), traits: [] }
    case 'AR':
      return {
        id, name, role, hand: 'R',
        batting: { technique: b(-4), power: b(-4), temperament: b(-4), running: b(-6, 8) },
        bowling: { type, accuracy: b(-4), variation: b(-4), stamina: b(-6, 8) },
        fielding: b(0, 8), traits: [],
      }
  }
}

export const newPlayerId = (teamId: string, name: string) =>
  `${teamId}-${slug(name) || 'player'}-${Math.random().toString(36).slice(2, 6)}`

export function emptyTeamDraft(): Team {
  const id = `custom-${Math.random().toString(36).slice(2, 8)}`
  const mk = (name: string, role: Role, level: number) => generatePlayer(newPlayerId(id, name), name, role, level)
  const players = [
    mk('Opener 1', 'BAT', 65), mk('Opener 2', 'BAT', 62), mk('Number 3', 'BAT', 66), mk('Number 4', 'BAT', 64),
    mk('Number 5', 'AR', 62), mk('Number 6', 'AR', 60), mk('Keeper', 'WK', 58), mk('Bowler 1', 'BOWL', 62),
    mk('Bowler 2', 'BOWL', 60), mk('Bowler 3', 'BOWL', 58), mk('Bowler 4', 'BOWL', 55),
  ]
  return {
    id, name: '', short: '', series: 'My Team', universe: 'custom', emblem: 'star',
    colors: { primary: '#0ea5e9', secondary: '#f97316' }, home: 'Home Ground',
    captainId: players[0].id, players, isCustom: true,
  }
}
