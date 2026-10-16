import type { BowlType, MatchFormat, Player, Trait } from '../types'
import baselines from './data/baselines.json'
import { aimMods } from './aim'
import type { DeliveryAim, Phase, Pitch, ShotAim } from './types'

/**
 * The ball model. For each delivery it starts from what really happens at that point of a real
 * match (the Cricsheet baselines for this format and phase), then nudges every outcome up or
 * down depending on who is batting, who is bowling, the batsman's intent and the conditions.
 * With average players and a neutral intent it returns the real-world numbers.
 */

export const CATS = ['dot', 'one', 'two', 'three', 'four', 'six', 'wicket', 'bye', 'legbye'] as const
const [DOT, ONE, TWO, THREE, FOUR, SIX, WICKET, BYE, LEGBYE] = [0, 1, 2, 3, 4, 5, 6, 7, 8]
export { DOT, ONE, TWO, THREE, FOUR, SIX, WICKET, BYE, LEGBYE }
/** Share of free-hit balls that go for four or six. */
const FREE_HIT_BOUNDARY = 0.85

/** Rating of an average player in the pool, i.e. the point where the multipliers equal 1. */
export const REF = { tech: 77, power: 80, temp: 80, run: 72, acc: 73, vari: 80 }

/** Strengths of the effects that make innings swing, tuned against real score and wicket distributions. */
export const KNOBS = { form: 0.6, pitch: 0.6, wicketSens: 0.35, settle: 0.3, wicketMax: 1.7, wicketMin: 0.5 }

/** Global dials found by running the calibration script against the real data. */
export const TUNE: Record<MatchFormat, { wicket: number; four: number; six: number; dot: number; wide: number; deathDot: number }> = {
  t20: { wicket: 0.97, four: 1.12, six: 1.1, dot: 0.78, wide: 1.1, deathDot: 0.86 },
  odi: { wicket: 1.02, four: 1.03, six: 1.0, dot: 0.9, wide: 1.1, deathDot: 0.8 },
  test: { wicket: 1.0, four: 1.12, six: 1.1, dot: 0.95, wide: 1.0, deathDot: 1.0 },
}

type PhaseBase = {
  runsPerOver: number
  dot: number; one: number; two: number; three: number; four: number; six: number
  wicket: number; wide: number; noball: number; bye: number; legbye: number
}
const table = baselines as unknown as Record<MatchFormat, { phases: Record<Phase, PhaseBase>; wicketKinds: Record<string, number> }>

const baseCache = new Map<string, { wide: number; noball: number; legal: number[] }>()
export function baseFor(format: MatchFormat, phase: Phase) {
  const key = `${format}:${phase}`
  let b = baseCache.get(key)
  if (!b) {
    const p = table[format].phases[phase]
    const raw = [p.dot, p.one, p.two, p.three, p.four, p.six, p.wicket, p.bye, p.legbye]
    const sum = raw.reduce((a, c) => a + c, 0)
    b = { wide: p.wide, noball: p.noball, legal: raw.map((v) => v / sum) }
    baseCache.set(key, b)
  }
  return b
}

export const parRunsPerOver = (format: MatchFormat, phase: Phase) => table[format].phases[phase].runsPerOver

export interface EffBat { tech: number; power: number; temp: number; run: number }
export interface EffBowl { acc: number; vari: number }

const isPaceType = (t: BowlType) => t === 'fast' || t === 'medium'

export interface BatContext {
  phase: Phase
  bowlType: BowlType
  /** Late-innings pressure: chasing a big rate, or wickets falling in a cluster. */
  pressure: boolean
  form: number
  /** Rating points added for this side (difficulty). */
  bonus?: number
}

export function effectiveBat(p: Player, c: BatContext): EffBat {
  const b = p.batting
  let { technique: tech, power, temperament: temp, running: run } = b
  const has = (t: Trait) => p.traits.includes(t)
  const pace = isPaceType(c.bowlType)
  if (has('pace-crusher') && pace) { tech += 7; power += 7 }
  if (has('spin-master') && !pace) { tech += 7; power += 7 }
  if (has('weak-vs-pace') && pace) { tech -= 9; power -= 5 }
  if (has('weak-vs-spin') && !pace) { tech -= 9; power -= 5 }
  if (has('big-hitter')) power += 5
  if (has('anchor')) { tech += 4; temp += 4 }
  if (has('hothead')) temp -= 6
  if (has('finisher') && c.phase === 'death') { power += 6; run += 6; temp += 4 }
  if (c.pressure) {
    if (has('clutch') || has('big-match')) temp += 6
    else temp -= 5
  }
  const f = c.form + (c.bonus ?? 0)
  return { tech: tech + f, power: power + f, temp: temp + f * 0.5, run: run + f * 0.4 }
}

export interface BowlContext {
  phase: Phase
  pitch: Pitch
  inningsIndex: 0 | 1
  fatigue: number // rating points lost to tiredness
  form: number
  /** Rating points added for this side (difficulty). */
  bonus?: number
}

export function effectiveBowl(p: Player, c: BowlContext): EffBowl {
  const w = p.bowling ?? PART_TIME
  let acc = w.accuracy
  let vari = w.variation
  const has = (t: Trait) => p.traits.includes(t)
  if (has('wicket-taker')) vari += 5
  if (has('economical')) acc += 5
  if (has('powerplay-specialist') && c.phase === 'powerplay') { acc += 6; vari += 6 }
  if (has('death-specialist') && c.phase === 'death') { acc += 7 }
  vari += isPaceType(w.type) ? c.pitch.pace * 5 : c.pitch.spin * 5 * (c.inningsIndex === 1 ? 1.4 : 1)
  const b = c.bonus ?? 0
  return { acc: acc - c.fatigue + c.form * 0.8 + b, vari: vari - c.fatigue * 0.6 + c.form + b }
}

export const PART_TIME = { type: 'medium' as BowlType, accuracy: 36, variation: 32, stamina: 50 }

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const z = (v: number, ref: number) => (v - ref) / 23

export interface BallInput {
  format: MatchFormat
  phase: Phase
  bat: EffBat
  bowl: EffBowl
  /** Intent: -1 defend, 0 normal, +1 attack, +2 slog. Fractions are fine. */
  intent: number
  /** The bowling side's approach: -1 safe, 0 normal, +1 aggressive. */
  style?: number
  /** A shot and/or delivery chosen by a person for this ball. */
  shot?: ShotAim | null
  delivery?: DeliveryAim | null
  /** The same line and length as the previous ball. */
  repeat?: boolean
  ballsFaced: number
  pitch: Pitch
  freeHit: boolean
  fieldingAvg: number
  /** Set when a side has forfeited: it collapses with the bat and is hammered when bowling. */
  forfeit?: 'bat' | 'bowl'
}

export interface BallProbs {
  wide: number
  noball: number
  /** Probability of each outcome in CATS, summing to 1. */
  legal: number[]
}

export function ballProbs(i: BallInput): BallProbs {
  const base = baseFor(i.format, i.phase)
  const tune = TUNE[i.format]

  const zT = z(i.bat.tech, REF.tech)
  const zP = z(i.bat.power, REF.power)
  const zTe = z(i.bat.temp, REF.temp)
  const zR = z(i.bat.run, REF.run)
  const zA = z(i.bowl.acc, REF.acc)
  const zV = z(i.bowl.vari, REF.vari)

  const zDef = 0.6 * zT + 0.4 * zTe
  const zAtk = 0.7 * zP + 0.3 * zT
  const zThr = 0.6 * zV + 0.4 * zA
  const zCtl = 0.65 * zA + 0.35 * zV

  // A new batsman is vulnerable and slow; a set one is the opposite.
  const settle = Math.exp(-i.ballsFaced / 9)
  const eyeIn = 1 + KNOBS.settle * settle - 0.07 // wicket odds vs a settled batsman
  const slow = 1 + 0.35 * Math.exp(-i.ballsFaced / 6) // dot odds early on

  const d = i.intent
  const dUp = Math.max(d, 0)
  const dDn = Math.min(d, 0)
  const ease = i.pitch.ease
  const field = (i.fieldingAvg - 70) / 30

  const m = new Array<number>(9).fill(1)
  let wideMul = 1
  m[WICKET] = clamp(Math.exp(KNOBS.wicketSens * (zThr - zDef) + 0.4 * Math.min(dUp, 1) + 0.05 * Math.max(dUp - 1, 0) + 0.5 * dDn - 0.2 * ease) * eyeIn * tune.wicket, KNOBS.wicketMin, KNOBS.wicketMax)
  m[FOUR] = clamp(Math.exp(0.55 * zAtk - 0.35 * zCtl + 0.5 * d + 0.25 * ease - 0.15 * field) * tune.four, 0.12, 4)
  m[SIX] = clamp(Math.exp(0.8 * zP - 0.35 * zCtl + 0.75 * d + 0.25 * ease - 0.1 * field) * tune.six * (1 - 0.35 * settle), 0.05, 5)
  m[DOT] = clamp(Math.exp(0.4 * zCtl - 0.3 * zT - 0.12 * zR - 0.18 * d - 0.1 * ease + 0.1 * field) * slow * tune.dot * (i.phase === 'death' ? tune.deathDot : 1), 0.3, 2.4)
  m[ONE] = clamp(Math.exp(0.1 * zR - 0.08 * zCtl - 0.1 * d), 0.6, 1.5)
  m[TWO] = clamp(Math.exp(0.25 * zR - 0.05 * zCtl), 0.5, 2)
  m[THREE] = clamp(Math.exp(0.3 * zR), 0.4, 2.2)

  // Bowling approach. Safe: bowl to the fielders, fewer wickets but fewer boundaries. Aggressive: bait the big shot, more wickets and more runs.
  const st = i.style ?? 0
  if (st !== 0) {
    const up = st > 0
    m[WICKET] *= up ? 1.22 : 0.8
    m[FOUR] *= up ? 1.12 : 0.86
    m[SIX] *= up ? 1.2 : 0.8
    m[DOT] *= up ? 0.94 : 1.1
  }

  if (i.shot || i.delivery) {
    const a = aimMods(i.shot, i.delivery, i.bowl.acc, i.repeat)
    m[WICKET] *= a.wicket; m[FOUR] *= a.four; m[SIX] *= a.six; m[DOT] *= a.dot; m[ONE] *= a.one
    wideMul = a.wide
  }

  if (i.forfeit === 'bat') { m[WICKET] *= 6; m[FOUR] *= 0.4; m[SIX] *= 0.3; m[DOT] *= 1.5 }
  if (i.forfeit === 'bowl') { m[WICKET] *= 0.1; m[FOUR] *= 2; m[SIX] *= 2.2; m[DOT] *= 0.5 }

  const legal = base.legal.map((p, k) => p * m[k])
  if (i.freeHit) legal[WICKET] *= 0.12 // only a run out is possible
  const sum = legal.reduce((a, c) => a + c, 0)
  const norm = legal.map((p) => p / sum)

  // Nobody is invincible and nobody is hopeless: keep a floor so miracles stay possible.
  const floors: [number, number][] = [[WICKET, 0.003], [SIX, 0.004], [FOUR, 0.015], [DOT, 0.06]]
  for (const [k, f] of floors) norm[k] = Math.max(norm[k], f)
  norm[WICKET] = Math.min(norm[WICKET], 0.4)
  // A free hit is a gift: the batsman swings for the fences and about nine in ten balls go for four or six.
  // How the boundaries split keeps the batsman's usual four-to-six balance; the rest is dot, 1, 2 or 3 in their usual proportions.
  if (i.freeHit) {
    const boundary = i.forfeit === 'bat' ? 0.6 : FREE_HIT_BOUNDARY
    const wicket = Math.min(norm[WICKET], 0.004)
    const bnd = norm[FOUR] + norm[SIX]
    const run = [DOT, ONE, TWO, THREE].reduce((a, k) => a + norm[k], 0)
    const rest = 1 - boundary - wicket
    for (const k of [DOT, ONE, TWO, THREE]) norm[k] = (norm[k] / run) * rest
    norm[FOUR] = (norm[FOUR] / bnd) * boundary
    norm[SIX] = (norm[SIX] / bnd) * boundary
    norm[WICKET] = wicket
    norm[BYE] = 0; norm[LEGBYE] = 0
  }
  const s2 = norm.reduce((a, c) => a + c, 0)

  return {
    wide: clamp(base.wide * Math.exp(-0.5 * zA) * tune.wide * wideMul * (i.forfeit === 'bowl' ? 2 : 1), 0.004, 0.14),
    noball: clamp(base.noball * Math.exp(-0.3 * zA), 0.001, 0.03),
    legal: norm.map((p) => p / s2),
  }
}

// ---- Dismissals ---------------------------------------------------------

import type { DismissalKind } from './types'
const KINDS: DismissalKind[] = ['bowled', 'caught', 'lbw', 'run out', 'stumped', 'caught and bowled', 'hit wicket']

export function dismissalWeights(format: MatchFormat, bowlType: BowlType, runningZ: number, fieldingAvg: number, freeHit: boolean): number[] {
  const k = table[format].wicketKinds
  const pace = isPaceType(bowlType)
  const w = KINDS.map((kind) => k[kind] ?? 0.001)
  if (freeHit) return KINDS.map((kind) => (kind === 'run out' ? 1 : 0))
  w[0] *= pace ? 1.1 : 0.85 // bowled
  w[2] *= pace ? 1.05 : 0.95 // lbw
  w[4] = pace ? w[4] * 0.1 : w[4] * 2 // stumped: spin only, really
  w[1] *= Math.exp(0.012 * (fieldingAvg - 70)) // better fielders hold more catches
  w[3] *= Math.exp(-0.2 * runningZ) // good runners get run out less
  return w
}

export { KINDS as DISMISSAL_KINDS }
