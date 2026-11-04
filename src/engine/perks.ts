import type { BowlType, Player } from '../types'
import type { Phase } from './types'

/**
 * Passive-tree perks as the match engine sees them: plain data ("rules") worked out by the career code from the perks you have taken.
 * Each rule says WHO it is for (the opener, the captain, a pace bowler...), WHEN it counts (powerplay, chasing, a turning pitch...) and
 * which ratings go up or down. The engine adds them to your side's ratings for that ball only. The other side never has any.
 */
export type BatWho = 'any' | 'opener' | 'top3' | 'mid' | 'low' | 'tail' | 'captain' | 'keeper' | 'lefty' | 'vet' | 'rookie' | 'settling' | 'debut' | 'oldest'
export type BowlWho = 'any' | 'pace' | 'spin' | 'wrist' | 'leftarm' | 'captain' | 'vet' | 'rookie' | 'oldest'
export interface Cond {
  phase?: Phase[]
  /** Which innings of a limited-overs match: the first, or the second (chasing, or defending when bowling). */
  inn?: 'first' | 'chase'
  vsPace?: boolean
  vsSpin?: boolean
  pressure?: boolean
  newBat?: boolean
  set?: boolean
  turn?: boolean
  seam?: boolean
  home?: boolean
  big?: boolean
  /** Your side has won its last three. */
  streak?: boolean
  /** Only while a veteran is in the XI. */
  needsVet?: boolean
  /** Only while your captain is in the XI. */
  needsCaptain?: boolean
}
export type Adds = Partial<Record<'technique' | 'power' | 'temperament' | 'running' | 'accuracy' | 'variation' | 'stamina' | 'all', number>>
export interface Rule { side: 'bat' | 'bowl'; who: BatWho | BowlWho; if?: Cond; add: Adds }

export interface MatchPerks {
  rules: Rule[]
  /** Added to your team's fielding (catching, run outs, saving fours). */
  field?: number
  /** A challenge you make is upheld this much more often (0.05 = 5 points). */
  review?: number
  vets?: string[]
  rookies?: string[]
  /** Matches played since joining, for players who joined recently. */
  settling?: Record<string, number>
  oldest?: string
  home?: boolean
  big?: boolean
  streak?: boolean
  /** Added to a boost token's strength (the engine is given the final number by the caller; kept here so it is saved with the match). */
  boostAdd?: number
}

export interface Sit {
  role: 'bat' | 'bowl'
  p: Player
  pos: number
  captainId: string
  keeperId: string | null
  xi: Player[]
  phase: Phase
  inningsIndex: number
  limited: boolean
  bowlType?: BowlType
  pressure: boolean
  ballsFaced: number
  pitchSpin: number
  pitchPace: number
}

const SETTLING_MATCHES = 5
const isPace = (t?: BowlType) => t === 'fast' || t === 'medium'

function whoMatches(r: Rule, s: Sit, perks: MatchPerks): boolean {
  const id = s.p.id
  switch (r.who) {
    case 'any': return true
    case 'opener': return s.pos < 2
    case 'top3': return s.pos < 3
    case 'mid': return s.pos >= 3 && s.pos <= 5
    case 'low': return s.pos >= 4 && s.pos <= 7
    case 'tail': return s.pos >= 8
    case 'captain': return id === s.captainId
    case 'keeper': return id === s.keeperId
    case 'lefty': return s.p.hand === 'L'
    case 'vet': return !!perks.vets?.includes(id)
    case 'rookie': return !!perks.rookies?.includes(id)
    case 'settling': return perks.settling?.[id] !== undefined && perks.settling[id] < SETTLING_MATCHES
    case 'debut': return perks.settling?.[id] === 0
    case 'oldest': return perks.oldest === id
    case 'pace': return isPace(s.p.bowling?.type)
    case 'spin': return !!s.p.bowling && !isPace(s.p.bowling.type)
    case 'wrist': return s.p.bowling?.type === 'legspin' || s.p.bowling?.type === 'leftspin'
    case 'leftarm': return s.p.bowling?.type === 'leftspin' || (s.p.bowling?.type !== undefined && s.p.hand === 'L')
  }
}

function condMatches(c: Cond | undefined, s: Sit, perks: MatchPerks): boolean {
  if (!c) return true
  if (c.phase && !c.phase.includes(s.phase)) return false
  if (c.inn) { if (!s.limited) return false; if ((c.inn === 'first') !== (s.inningsIndex === 0)) return false }
  if (c.vsPace && !isPace(s.bowlType)) return false
  if (c.vsSpin && (isPace(s.bowlType) || !s.bowlType)) return false
  if (c.pressure && !s.pressure) return false
  if (c.newBat && s.ballsFaced >= 12) return false
  if (c.set && s.ballsFaced < 20) return false
  if (c.turn && s.pitchSpin < 0.25) return false
  if (c.seam && s.pitchPace < 0.25) return false
  if (c.home && !perks.home) return false
  if (c.big && !perks.big) return false
  if (c.streak && !perks.streak) return false
  if (c.needsVet && !(s.xi.some((x) => perks.vets?.includes(x.id)))) return false
  if (c.needsCaptain && !s.xi.some((x) => x.id === s.captainId)) return false
  return true
}

/** The rating points your perks add to this player on this ball. */
export function perkAdd(perks: MatchPerks | undefined, s: Sit): Adds {
  if (!perks || perks.rules.length === 0) return {}
  const out: Adds = {}
  for (const r of perks.rules) {
    if (r.side !== s.role || !whoMatches(r, s, perks) || !condMatches(r.if, s, perks)) continue
    for (const [k, v] of Object.entries(r.add) as [keyof Adds, number][]) out[k] = (out[k] ?? 0) + v
  }
  return out
}

/** The player with the points added (a copy; the original is never touched). */
export function withPerk(p: Player, a: Adds, role: 'bat' | 'bowl'): Player {
  const keys = Object.keys(a)
  if (keys.length === 0) return p
  const all = a.all ?? 0
  const up = (v: number, k: keyof Adds) => Math.max(1, Math.min(110, v + (a[k] ?? 0) + all))
  if (role === 'bat') {
    const b = p.batting
    return { ...p, batting: { technique: up(b.technique, 'technique'), power: up(b.power, 'power'), temperament: up(b.temperament, 'temperament'), running: up(b.running, 'running') } }
  }
  if (!p.bowling) return p
  const w = p.bowling
  return { ...p, bowling: { ...w, accuracy: up(w.accuracy, 'accuracy'), variation: up(w.variation, 'variation'), stamina: up(w.stamina, 'stamina') } }
}
