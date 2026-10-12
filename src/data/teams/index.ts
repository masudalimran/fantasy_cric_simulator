import type { Player, Team } from '../../types'
import { teamStrength } from '../builders'
import { aot, bleach, dragonball, naruto, onepiece } from './animeA'
import { demonslayer, fma, jjk, mha } from './animeB'
import { inuyasha, jojo, sds, yugioh } from './animeC'
import { dota, dragonage, finalfantasy, poe, witcher } from './gamesA'
import { assassinscreed, elderscrolls, halo, masseffect, overwatch, zelda } from './gamesB'

/** The teams as they were written, before the tiers below were applied. */
export const RAW: Team[] = [
  bleach, naruto, dragonball, onepiece, aot, mha, demonslayer, jjk, fma, jojo, yugioh, sds, inuyasha,
  witcher, dragonage, dota, poe, finalfantasy, elderscrolls, assassinscreed,
]

/**
 * How strong each team is when a career starts (the average overall rating of its XI). A few teams are the clear top
 * tier, a few are the middle, and the rest run from decent down to weak. The numbers were tuned by simulating every team
 * against every other (see the win rates below), because a few points of rating is a lot in this engine. Miracles still
 * happen: it is only a baseline.
 */
export const TIER: Record<string, number> = {
  // top tier (about 85% of their matches against the whole field)
  dragonball: 83, onepiece: 83, assassinscreed: 85,
  // middle (60 to 70%)
  naruto: 78, demonslayer: 79, bleach: 74,
  // the rest, from decent (about 60%) down to weak (under 20%)
  jjk: 76, mha: 77, finalfantasy: 76, jojo: 75, aot: 75, sds: 73, fma: 74, dota: 73, witcher: 70,
  yugioh: 71, elderscrolls: 69, inuyasha: 69, dragonage: 70, poe: 69,
}

const clamp = (n: number) => Math.max(1, Math.min(99, Math.round(n)))

/** Lifts or lowers every rating in a team by the same amount until its XI averages the target. Who is better than whom does not change. */
export function calibrateTo(team: Team, target: number): Team {
  let cur = team
  for (let i = 0; i < 14; i++) {
    const d = target - teamStrength(cur)
    if (d === 0) break
    const shift = (p: Player): Player => ({
      ...p,
      batting: { technique: clamp(p.batting.technique + d), power: clamp(p.batting.power + d), temperament: clamp(p.batting.temperament + d), running: clamp(p.batting.running + d) },
      bowling: p.bowling ? { ...p.bowling, accuracy: clamp(p.bowling.accuracy + d), variation: clamp(p.bowling.variation + d), stamina: clamp(p.bowling.stamina + d) } : null,
      fielding: clamp(p.fielding + d),
    })
    cur = { ...cur, players: cur.players.map(shift) }
  }
  return cur
}

export const BUILT_IN_TEAMS: Team[] = RAW.map((t) => (TIER[t.id] ? calibrateTo(t, TIER[t.id]) : t))

/**
 * Teams that used to ship with the game but no longer do (some of their characters have no portraits). They are not on
 * offer for new careers, but a career that already includes one keeps it, so old saves still play.
 */
export const LEGACY_TEAMS: Team[] = [zelda, masseffect, overwatch, halo]

const RAW_BY_ID = new Map(RAW.flatMap((t) => t.players.map((p) => [p.id, p] as const)))
const CAL_BY_ID = new Map(BUILT_IN_TEAMS.flatMap((t) => t.players.map((p) => [p.id, p] as const)))
const same = (a: Player, b: Player) => JSON.stringify([a.batting, a.bowling, a.fielding]) === JSON.stringify([b.batting, b.bowling, b.fielding])

/**
 * A team the player saved (to add images, say) keeps whatever he changed, but any player whose ratings are still the
 * ones the team shipped with gets the current tier ratings. Edited players are left exactly as edited.
 */
export function refreshRatings(team: Team): Team {
  let changed = false
  const players = team.players.map((p) => {
    const raw = RAW_BY_ID.get(p.id)
    const cal = CAL_BY_ID.get(p.id)
    if (!raw || !cal || !same(p, raw) || same(p, cal)) return p
    changed = true
    return { ...p, batting: cal.batting, bowling: cal.bowling, fielding: cal.fielding }
  })
  return changed ? { ...team, players } : team
}
