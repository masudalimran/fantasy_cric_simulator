import type { MatchFormat, Player } from '../types'
import { parRunsPerOver } from './model'
import type { Rng } from './rng'
import { FORMATS, phaseOf, type Innings } from './types'

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const battingScore = (p: Player) => p.batting.technique * 0.4 + p.batting.power * 0.4 + p.batting.temperament * 0.2

/**
 * How aggressively a batsman plays this ball, relative to what is normal for the phase of
 * the match (the baseline already contains each format's usual tempo).
 * -1 defend, 0 normal, +1 attack, +2 slog.
 */
export function aiIntent(a: { format: MatchFormat; inn: Innings; batter: Player; ballsFaced: number; xiSize: number }): number {
  const { format, inn, batter, ballsFaced } = a
  const cfg = FORMATS[format]
  const totalBalls = cfg.overs * 6
  const ballsLeft = totalBalls - inn.legalBalls
  const over = Math.floor(inn.legalBalls / 6)
  const phase = phaseOf(format, over)
  const wicketsInHand = a.xiSize - 1 - inn.wickets
  let d = 0

  if (inn.target !== null) {
    // Chasing: play to the required rate.
    const need = inn.target - inn.runs
    const rrr = (need / Math.max(ballsLeft, 1)) * 6
    const par = parRunsPerOver(format, phase)
    const gap = (rrr - par) / par
    d += clamp(1.4 * gap - 0.1, -0.8, 2.0)
    // With few wickets left a chase has to be paced, unless it is nearly lost.
    if (wicketsInHand <= 3 && gap < 0.8) d -= 0.3
  } else {
    // Setting a target: lose wickets, slow down a bit; wickets in hand late, go.
    const progress = inn.legalBalls / totalBalls
    const expectedWickets = 6.6 * progress
    d -= clamp(0.18 * (inn.wickets - expectedWickets), -0.3, 0.5)
    if (phase === 'death') {
      // Slog overs: the more wickets in hand, the harder they go.
      const push = format === 'odi' ? [0.2, 0.55, 0.95] : [0.15, 0.35, 0.55]
      d += wicketsInHand >= 6 ? push[2] : wicketsInHand >= 4 ? push[1] : push[0]
    }
    if (format === 'odi' && phase !== 'death') d -= 0.1
  }

  if (ballsFaced < 8) d -= format === 'odi' ? 0.3 : 0.12 // get your eye in
  if (ballsLeft <= 6) d += 0.7

  const t = batter.traits
  if (t.includes('finisher') && phase === 'death') d += 0.4
  if (t.includes('anchor')) d -= 0.25
  if (t.includes('hothead')) d += 0.35
  if (t.includes('slow-starter') && ballsFaced < 12) d -= 0.3
  if (battingScore(batter) < 40) d += 0.3 // tailenders swing

  return clamp(d, -1.2, 2.2)
}

export function aiTossDecision(format: MatchFormat, rng: Rng): 'bat' | 'bowl' {
  return rng.chance(format === 't20' ? 0.35 : 0.45) ? 'bat' : 'bowl'
}

const bowlScore = (p: Player) => (p.bowling ? p.bowling.variation * 0.45 + p.bowling.accuracy * 0.35 + p.bowling.stamina * 0.2 : 0)
const isPace = (p: Player) => p.bowling?.type === 'fast' || p.bowling?.type === 'medium'

/** Picks who bowls the next over, respecting over limits and the no-two-in-a-row rule. */
export function chooseBowler(a: { format: MatchFormat; inn: Innings; xi: Player[]; keeperId: string | null; rng: Rng }): string {
  const { format, inn, xi, rng } = a
  const cfg = FORMATS[format]
  const over = Math.floor(inn.legalBalls / 6)
  const phase = phaseOf(format, over)
  const bowled = (p: Player) => (inn.bowlers.get(p.id)?.legalBalls ?? 0) / 6
  const real = xi.filter((p) => p.bowling)
  const partTimers = xi.filter((p) => !p.bowling && p.id !== a.keeperId)

  const open = (p: Player, cap: number) => bowled(p) < cap
  const notPrev = (p: Player) => p.id !== inn.prevBowlerId
  const realOpen = real.filter((p) => open(p, cfg.maxBowlerOvers))
  const realCapacity = realOpen.reduce((s, p) => s + (cfg.maxBowlerOvers - bowled(p)), 0)
  const oversLeft = cfg.overs - over

  let pool = realOpen.filter(notPrev)
  // If the real bowlers can't cover the remaining overs, part-timers have to be mixed in.
  if (realCapacity < oversLeft || pool.length === 0) pool = pool.concat(partTimers.filter((p) => open(p, cfg.partTimerMaxOvers) && notPrev(p)))
  if (pool.length === 0) pool = realOpen.length ? realOpen : xi.filter((p) => p.id !== a.keeperId)

  const ranked = [...real].sort((x, y) => bowlScore(y) - bowlScore(x))
  const topIds = new Set(ranked.slice(0, 2).map((p) => p.id))
  const avgBowled = real.reduce((s, p) => s + bowled(p), 0) / Math.max(real.length, 1)

  let best = pool[0]
  let bestScore = -Infinity
  for (const p of pool) {
    let s = bowlScore(p)
    if (!p.bowling) s -= 25
    const t = p.traits
    if (phase === 'powerplay') s += (isPace(p) ? 5 : 0) + (t.includes('powerplay-specialist') ? 8 : 0)
    if (phase === 'death') s += (t.includes('death-specialist') ? 10 : 0) + (p.bowling?.type === 'fast' ? 4 : p.bowling && !isPace(p) ? -4 : 0)
    if (phase === 'middle') s += !isPace(p) && p.bowling ? 5 : 0
    // Hold the best bowlers back for the end, but don't hide them.
    const reserve = format === 't20' ? 2 : 5
    if (topIds.has(p.id) && phase !== 'death' && bowled(p) >= reserve) s -= 6
    s -= 2.5 * (bowled(p) - avgBowled)
    s += (rng.next() - 0.5) * 8
    if (s > bestScore) { best = p; bestScore = s }
  }
  return best.id
}
