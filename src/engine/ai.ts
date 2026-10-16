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
export function aiIntent(a: { format: MatchFormat; inn: Innings; batter: Player; ballsFaced: number; xiSize: number; test?: { oversLeft: number; lead: number; day: number } }): number {
  const { format, inn, batter, ballsFaced } = a
  if (format === 'test' && a.test) return testIntent(a as Parameters<typeof testIntent>[0])
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

/**
 * How a Test batsman plays: patiently by default. Chasing in the last innings he goes for the runs if they can be had in the time that is
 * left, and shuts up shop to save the match if they cannot. A side that leads and is short of time pushes on to set a target.
 */
function testIntent(a: { inn: Innings; batter: Player; ballsFaced: number; xiSize: number; test: { oversLeft: number; lead: number; day: number } }): number {
  const { inn, batter, ballsFaced, test } = a
  const wicketsInHand = a.xiSize - 1 - inn.wickets
  let d = -0.35
  if (ballsFaced < 20) d -= 0.3 // get in first
  else if (ballsFaced > 60) d += 0.1
  if (inn.target !== null) {
    const need = inn.target - inn.runs
    const overs = Math.max(test.oversLeft, 1)
    const rate = need / overs // runs an over needed
    if (rate <= 4.2 && wicketsInHand >= 3) d += clamp((rate - 2.6) * 0.7, -0.2, 1.1) // a chase that is on
    else if (rate > 4.2 || wicketsInHand <= 2) d -= 0.45 // not winnable: play out time
  } else if (inn.index >= 1 && test.lead > 0 && test.oversLeft < 190) {
    d += clamp((test.lead - 150) / 400, 0, 0.9) // ahead and short of time: build a target quickly
  } else if (inn.index === 0 && test.day >= 3) {
    d += 0.15
  }
  const t = batter.traits
  if (t.includes('anchor')) d -= 0.2
  if (t.includes('hothead')) d += 0.3
  if (battingScore(batter) < 40) d += 0.25
  return clamp(d, -1.2, 1.6)
}

export function aiTossDecision(format: MatchFormat, rng: Rng): 'bat' | 'bowl' {
  return rng.chance(format === 't20' ? 0.35 : format === 'test' ? 0.62 : 0.45) ? 'bat' : 'bowl'
}

const bowlScore = (p: Player) => (p.bowling ? p.bowling.variation * 0.45 + p.bowling.accuracy * 0.35 + p.bowling.stamina * 0.2 : 0)
const isPace = (p: Player) => p.bowling?.type === 'fast' || p.bowling?.type === 'medium'

/** How a bowler has gone so far this innings, as the captain would see it. */
interface BowlerForm {
  /** Economy and wickets against what is normal: positive is a good spell, negative a poor one. */
  perf: number
  /** The most recent over that went for a lot, and how many overs he is rested for after it. */
  badOver: number
  rest: number
  /** The batsmen who have hit him hard, and the ones he has kept quiet. */
  hurtBy: Set<string>
  hasTied: Set<string>
}

function formOf(inn: Innings, bowlerId: string, par: number, format: MatchFormat): BowlerForm {
  const overs = new Map<number, number>()
  const vs = new Map<string, { runs: number; balls: number }>()
  let runs = 0, balls = 0, wickets = 0
  for (const e of inn.log) {
    if (e.bowlerId !== bowlerId) continue
    const conceded = e.runsBat + (e.extraType === 'wide' || e.extraType === 'noball' ? e.extraRuns : 0)
    runs += conceded
    if (e.legal) balls++
    if (e.wicket && e.wicket.kind !== 'run out') wickets++
    overs.set(e.over, (overs.get(e.over) ?? 0) + conceded)
    const v = vs.get(e.strikerId) ?? { runs: 0, balls: 0 }
    v.runs += conceded; if (e.legal) v.balls++
    vs.set(e.strikerId, v)
  }
  const econ = balls >= 6 ? (runs / balls) * 6 : par
  const perf = balls >= 6 ? clamp((par - econ) * 2.2 + wickets * 7, -25, 25) : 0
  // an over that went for a lot sits him out for a while: the worse it was, the longer
  const limit = Math.max(format === 't20' ? 12 : 9, par * 1.8)
  let badOver = -99, rest = 0
  for (const [o, r] of overs) if (r >= limit && o > badOver) { badOver = o; rest = Math.round(clamp((r - par * 1.5) / 8, 0.3, 1.5) * 3) }
  const hurtBy = new Set<string>(), hasTied = new Set<string>()
  for (const [id, v] of vs) {
    if (v.runs >= 10 && v.balls <= 10 && v.runs / Math.max(v.balls, 1) >= (par / 6) * 1.7) hurtBy.add(id)
    else if (v.balls >= 5 && v.runs / v.balls < (par / 6) * 0.7) hasTied.add(id)
  }
  return { perf, badOver, rest: Math.max(1, rest), hurtBy, hasTied }
}

/**
 * Picks who bowls the next over, respecting over limits and the no-two-in-a-row rule. The captain bowls whoever is
 * going well (until his overs are up), takes off a bowler who has been hit and rests him for as long as the damage
 * deserves, and is happier to bring him back when the batsman who hurt him has gone.
 */
export function chooseBowler(a: { format: MatchFormat; inn: Innings; xi: Player[]; keeperId: string | null; rng: Rng; /** The captain's leaning from how each bowler has been going this season. */ pref?: Record<string, number> }): string {
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
  const oversLeft = format === 'test' ? 100 : cfg.overs - over

  let pool = realOpen.filter(notPrev)
  // If the real bowlers can't cover the remaining overs, part-timers have to be mixed in.
  if (realCapacity < oversLeft || pool.length === 0) pool = pool.concat(partTimers.filter((p) => open(p, cfg.partTimerMaxOvers) && notPrev(p)))
  if (pool.length === 0) pool = realOpen.length ? realOpen : xi.filter((p) => p.id !== a.keeperId)

  const ranked = [...real].sort((x, y) => bowlScore(y) - bowlScore(x))
  const topIds = new Set(ranked.slice(0, 2).map((p) => p.id))
  const avgBowled = real.reduce((s, p) => s + bowled(p), 0) / Math.max(real.length, 1)

  const par = parRunsPerOver(format, phase)
  const batsmen = [inn.strikerId, inn.nonStrikerId]
  const slack = realCapacity - oversLeft // how close the real bowlers are to being needed for every remaining over
  let best = pool[0]
  let bestScore = -Infinity
  for (const p of pool) {
    let s = bowlScore(p) + (a.pref?.[p.id] ?? 0) * 0.5
    const f = p.bowling ? formOf(inn, p.id, par, format) : null
    if (f) {
      // going well: keep him on until his overs run out. Going badly: someone else
      s += f.perf * 0.6
      if (f.perf > 4 && bowled(p) < cfg.maxBowlerOvers) s += 6
      const hurtNow = batsmen.some((b) => f.hurtBy.has(b))
      const remaining = f.badOver + f.rest - over + 1 // overs of rest left after his bad over
      if (remaining > 0) s -= hurtNow ? 20 * Math.min(1, remaining / f.rest) : 3 // the man who hit him has gone, so he is less risky
      else if (hurtNow) s -= 12
      if (batsmen.some((b) => f.hasTied.has(b))) s += 6 // he has had this batsman tied down
      if (slack <= 1 && p.bowling) s += 10 // the real bowlers are needed for every over that is left
    }
    if (!p.bowling) s -= 25
    if (format === 'test') {
      // a Test spell is not allowed to run on: after about six overs in the last twelve he is rested, and a long day tires the fast men
      const recent = inn.log.filter((e) => e.bowlerId === p.id && e.legal && e.over > over - 12).length / 6
      if (recent > 5) s -= (recent - 5) * 6
    }
    const t = p.traits
    if (phase === 'powerplay') s += (isPace(p) ? 5 : 0) + (t.includes('powerplay-specialist') ? 8 : 0)
    if (phase === 'death') s += (t.includes('death-specialist') ? 10 : 0) + (p.bowling?.type === 'fast' ? 4 : p.bowling && !isPace(p) ? -4 : 0)
    if (phase === 'middle') s += !isPace(p) && p.bowling ? 5 : 0
    // Hold the best bowlers back for the end, but don't hide them.
    const reserve = format === 't20' ? 2 : 5
    const going = !!f && f.perf > 4
    if (topIds.has(p.id) && phase !== 'death' && bowled(p) >= reserve && !going) s -= 6
    if (!going) s -= 2.5 * (bowled(p) - avgBowled)
    s += (rng.next() - 0.5) * 8
    if (s > bestScore) { best = p; bestScore = s }
  }
  return best.id
}
