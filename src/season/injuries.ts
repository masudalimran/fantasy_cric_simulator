import { overall } from '../data/builders'
import type { Player, Team } from '../types'
import type { Season } from './types'

/**
 * Injuries and physios. An injury is a seeded draw per player per day, so it is the same every time it is asked and nothing
 * has to be saved: on any day a player has a small chance of picking one up, and it keeps him out for 3 to 15 days.
 * Every team has three physios. A player with a physio cannot pick up an injury at all, but one who is already hurt cannot be
 * given one. The computer's teams keep their physios on their three best players; you choose yours.
 */

export const PHYSIOS = 3
/** The chance a player without a physio is injured on any given day. About one injury a season each. */
const DAILY_RATE = 0.0022
export const MIN_DAYS = 3
export const MAX_DAYS = 15

export type Severity = 'Minor' | 'Moderate' | 'Serious' | 'Severe'

export interface Injury {
  name: string
  severity: Severity
  /** The first day he is out, and how many days he is out for. */
  start: string
  days: number
  /** The first day he is fit again. */
  back: string
}

const NAMES: Record<Severity, string[]> = {
  Minor: ['Bruised ribs', 'Blistered finger', 'Muscle tightness', 'Dead leg', 'Sore wrist'],
  Moderate: ['Hamstring strain', 'Sprained ankle', 'Back spasm', 'Groin strain', 'Calf strain'],
  Serious: ['Torn calf muscle', 'Shoulder impingement', 'Stress reaction in the back', 'Torn side muscle', 'Knee ligament sprain'],
  Severe: ['Fractured finger', 'Hairline fracture', 'Torn hamstring', 'Dislocated shoulder', 'Ruptured ligament'],
}
export const severityOf = (days: number): Severity => (days <= 4 ? 'Minor' : days <= 8 ? 'Moderate' : days <= 12 ? 'Serious' : 'Severe')
export const SEVERITY_COLOR: Record<Severity, string> = { Minor: '#fbbf24', Moderate: '#fb923c', Serious: '#f87171', Severe: '#e11d48' }

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }
/** A repeatable number in [0, 1) for a player, a day and a purpose. */
function unit(seed: number, id: string, day: number, salt: number): number {
  let h = (seed ^ hash(id) ^ Math.imul(day, 2654435761) ^ Math.imul(salt + 1, 40503)) >>> 0
  h = Math.imul(h ^ (h >>> 15), 2246822507)
  h = Math.imul(h ^ (h >>> 13), 3266489909)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}
const dayNumber = (date: string) => Math.floor(Date.parse(date) / 86400000)
const dateOf = (day: number) => new Date(day * 86400000).toISOString().slice(0, 10)

/** Says whether a player is covered by a physio on a date. */
export type Shield = (playerId: string, date: string) => boolean

/** The injury a player is carrying on a date, if any. With a `shield`, a day he was covered by a physio cannot start one. */
export function injuryOn(season: Pick<Season, 'seed'>, playerId: string, date: string, shield?: Shield): Injury | null {
  const today = dayNumber(date)
  for (let back = 0; back < MAX_DAYS; back++) {
    const day = today - back
    if (unit(season.seed, playerId, day, 0) >= DAILY_RATE) continue
    const days = MIN_DAYS + Math.floor((MAX_DAYS - MIN_DAYS + 1) * unit(season.seed, playerId, day, 1) ** 1.6)
    if (days <= back) continue // it was over by now
    const start = dateOf(day)
    if (shield?.(playerId, start)) continue // a physio had him covered the day it would have happened
    const names = NAMES[severityOf(days)]
    return { name: names[Math.floor(unit(season.seed, playerId, day, 2) * names.length)], severity: severityOf(days), start, days, back: dateOf(day + days) }
  }
  return null
}

export const isInjuredOn = (season: Pick<Season, 'seed'>, playerId: string, date: string, shield?: Shield): boolean => !!injuryOn(season, playerId, date, shield)

// ---- Physios ------------------------------------------------------------------------------------------------------

/** Who a team's physios are looking after on a date (the ones you have chosen, for your own team). */
export function physioOf(season: Pick<Season, 'physio'>, teamId: string, date: string): string[] {
  return (season.physio?.[teamId] ?? []).filter((a) => a.from <= date && (!a.to || date < a.to)).map((a) => a.playerId)
}

/** The physio cover of a team: your choices for your own team, the three most valuable players for the computer's. */
export function shieldFor(season: Pick<Season, 'myTeamId' | 'physio'>, team: Pick<Team, 'id' | 'players'>): Shield {
  if (team.id === season.myTeamId) {
    const list = season.physio?.[team.id] ?? []
    return (id, date) => list.some((a) => a.playerId === id && a.from <= date && (!a.to || date < a.to))
  }
  const top = new Set([...team.players].sort((a, b) => overall(b) - overall(a)).slice(0, PHYSIOS).map((p) => p.id))
  return (id) => top.has(id)
}

/** Everyone in a squad who is injured on a date. */
export function injuriesOf(season: Pick<Season, 'seed' | 'myTeamId' | 'physio'>, team: Pick<Team, 'id' | 'players'>, date: string): Map<string, Injury> {
  const shield = shieldFor(season, team)
  const out = new Map<string, Injury>()
  for (const p of team.players) { const i = injuryOn(season, p.id, date, shield); if (i) out.set(p.id, i) }
  return out
}

export interface Outcome { season: Season; error?: string }

/** Puts a physio on a player. Not on someone who is already hurt, and a team only has three. */
export function assignPhysio(season: Season, team: Pick<Team, 'id' | 'players'>, playerId: string, date: string): Outcome {
  const active = physioOf(season, team.id, date)
  if (!team.players.some((p) => p.id === playerId)) return { season, error: 'He is not in your squad.' }
  if (active.includes(playerId)) return { season, error: 'He already has a physio.' }
  if (active.length >= PHYSIOS) return { season, error: `All ${PHYSIOS} physios are busy. Take one off somebody first.` }
  if (injuryOn(season, playerId, date, shieldFor(season, team))) return { season, error: 'A physio cannot be put on a player who is already injured.' }
  return { season: { ...season, physio: { ...season.physio, [team.id]: [...(season.physio?.[team.id] ?? []), { playerId, from: date }] } } }
}

/** Takes the physio off a player straight away. He is open to injury again from today; days that were already covered stay covered. */
export function releasePhysio(season: Season, teamId: string, playerId: string, date: string): Season {
  const list = season.physio?.[teamId]
  if (!list) return season
  return { ...season, physio: { ...season.physio, [teamId]: list.map((a) => (a.playerId === playerId && a.from <= date && (!a.to || date < a.to) ? { ...a, to: date } : a)) } }
}


/**
 * Whether your side can take the field on a date: who in the XI is injured, and how many fit players the squad has
 * (it needs 11 to play at all). Your match cannot be started or simulated with an injured player in the XI.
 */
export function xiProblem(season: Pick<Season, 'seed' | 'myTeamId' | 'physio'>, team: Team, date: string): { hurtInXI: { player: Player; injury: Injury }[]; fit: number; canFill: boolean } {
  const hurt = injuriesOf(season, team, date)
  const fit = team.players.filter((p) => !hurt.has(p.id)).length
  return { hurtInXI: team.players.slice(0, 11).filter((p) => hurt.has(p.id)).map((player) => ({ player, injury: hurt.get(player.id) as Injury })), fit, canFill: fit >= 11 }
}
// ---- Playing without the injured ---------------------------------------------------------------------------------

/**
 * Your team for a match when some of the XI are hurt: each one is replaced by the best fit player on the bench (a bowler for a
 * bowler, a keeper for a keeper) and goes to the end of the squad. The computer's teams do this in their own selection.
 */
export function coverInjured(team: Team, season: Pick<Season, 'seed' | 'myTeamId' | 'physio'>, date: string): Team {
  const hurt = injuriesOf(season, team, date)
  const xi = team.players.slice(0, 11)
  if (!xi.some((p) => hurt.has(p.id))) return team
  const bench = team.players.slice(11).filter((p) => !hurt.has(p.id)).sort((a, b) => overall(b) - overall(a))
  const used = new Set<string>()
  const next: Player[] = xi.map((p) => {
    if (!hurt.has(p.id)) return p
    const like = (c: Player) => (p.role === 'WK' ? c.role === 'WK' : !!p.bowling && !!c.bowling)
    const sub = bench.find((c) => !used.has(c.id) && like(c)) ?? bench.find((c) => !used.has(c.id))
    if (!sub) return p // nobody fit to bring in: he plays on
    used.add(sub.id)
    return sub
  })
  const inXI = new Set(next.map((p) => p.id))
  const rest = team.players.filter((p) => !inXI.has(p.id))
  const captain = inXI.has(team.captainId) && !hurt.has(team.captainId) ? team.captainId : [...next].sort((a, b) => overall(b) - overall(a))[0].id
  return { ...team, players: [...next, ...rest], captainId: captain, keeperId: team.keeperId && inXI.has(team.keeperId) ? team.keeperId : undefined }
}
