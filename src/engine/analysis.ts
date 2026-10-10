import { degreesFromStraight, sectorIndex, shotAngle } from './shots'
import type { BallEvent, Innings } from './types'

// ---- Runs by over (worm and Manhattan) -----------------------------------------

export interface OverRuns { over: number; runs: number; wickets: number }

/** Runs and wickets in each over, for the Manhattan chart. */
export function perOver(inn: Innings): OverRuns[] {
  const out: OverRuns[] = []
  for (const e of inn.log) {
    while (out.length <= e.over) out.push({ over: out.length + 1, runs: 0, wickets: 0 })
    out[e.over].runs += e.total
    if (e.wicket) out[e.over].wickets++
  }
  return out
}

export interface WormPoint { over: number; runs: number }

/** The innings score after every completed over (plus now), for the worm. Starts at 0. */
export function worm(inn: Innings): WormPoint[] {
  const pts: WormPoint[] = [{ over: 0, runs: 0 }]
  for (const e of inn.log) if (e.legal && e.ballInOver === 5) pts.push({ over: e.over + 1, runs: e.score.runs })
  // Anything scored since the last completed over (including extras that ended the innings, like a winning wide).
  const last = inn.log[inn.log.length - 1]
  const prev = pts[pts.length - 1]
  if (last && last.score.runs !== prev.runs) pts.push({ over: Math.max(inn.legalBalls / 6, prev.over + 0.01), runs: last.score.runs })
  return pts
}

/** Where each wicket fell on the worm. */
export function wormWickets(inn: Innings): WormPoint[] {
  return inn.log.filter((e) => e.wicket).map((e) => ({ over: e.over + (e.legal ? e.ballInOver + 1 : e.ballInOver) / 6, runs: e.score.runs }))
}

// ---- Partnerships ------------------------------------------------------------

export interface Partnership {
  wicket: number // 1 = the first-wicket partnership
  a: string
  b: string
  runs: number
  balls: number
  aRuns: number
  aBalls: number
  bRuns: number
  bBalls: number
  unbroken: boolean
  /** The batsman whose dismissal ended it. */
  endedBy: string | null
}

/** Splits the innings at each wicket and credits each batsman's share of the runs. */
export function partnerships(inn: Innings): Partnership[] {
  const out: Partnership[] = []
  if (inn.log.length === 0) return out
  let cur: Partnership | null = null
  const open = (a: string, b: string, wicket: number): Partnership => ({ wicket, a, b, runs: 0, balls: 0, aRuns: 0, aBalls: 0, bRuns: 0, bBalls: 0, unbroken: true, endedBy: null })
  let survivor: string | null = null
  let wickets = 0
  for (const e of inn.log) {
    if (!cur) cur = survivor ? open(survivor, e.strikerId === survivor ? e.nonStrikerId : e.strikerId, wickets + 1) : open(e.strikerId, e.nonStrikerId, 1)
    cur.runs += e.total
    if (e.legal) cur.balls++
    const faced = e.extraType !== 'wide'
    const mine = e.strikerId === cur.a
    if (mine) { cur.aRuns += e.runsBat; if (faced) cur.aBalls++ } else { cur.bRuns += e.runsBat; if (faced) cur.bBalls++ }
    if (e.wicket) {
      wickets++
      cur.unbroken = false
      cur.endedBy = e.wicket.playerId
      out.push(cur)
      survivor = e.wicket.playerId === cur.a ? cur.b : cur.a
      cur = null
    }
  }
  if (cur) out.push(cur)
  return out
}

// ---- Run mix ------------------------------------------------------------------

export interface RunMix { id: string; dots: number; ones: number; twos: number; threes: number; fours: number; sixes: number; balls: number }

/** For each batsman, how the balls they faced were spent: dots, singles, twos, threes, fours, sixes. */
export function runMix(inn: Innings): RunMix[] {
  const by = new Map<string, RunMix>()
  for (const b of inn.batters) by.set(b.id, { id: b.id, dots: 0, ones: 0, twos: 0, threes: 0, fours: 0, sixes: 0, balls: 0 })
  for (const e of inn.log) {
    if (e.extraType === 'wide') continue
    const m = by.get(e.strikerId)
    if (!m) continue
    m.balls++
    switch (e.runsBat) {
      case 1: m.ones++; break
      case 2: m.twos++; break
      case 3: m.threes++; break
      case 4: m.fours++; break
      case 6: m.sixes++; break
      default: m.dots++
    }
  }
  return [...by.values()].filter((m) => m.balls > 0)
}

// ---- Wagon wheel ---------------------------------------------------------------

export interface WagonShot { seq: number; batterId: string; runs: number; angle: number; deg: number; sector: number }

export function wagonShots(inn: Innings, isLeftHanded: (id: string) => boolean): WagonShot[] {
  return inn.log
    .filter((e: BallEvent) => e.runsBat > 0)
    .map((e) => {
      const angle = shotAngle(e.seq)
      const deg = degreesFromStraight(angle, isLeftHanded(e.strikerId))
      return { seq: e.seq, batterId: e.strikerId, runs: e.runsBat, angle, deg, sector: sectorIndex(deg) }
    })
}

/** Runs scored in each of the eight zones. */
export function sectorRuns(shots: WagonShot[]): number[] {
  const out = new Array<number>(8).fill(0)
  for (const s of shots) out[s.sector] += s.runs
  return out
}

// ---- Innings overview ---------------------------------------------------------------

export interface InningsOverview {
  runs: number
  wickets: number
  legalBalls: number
  runRate: number
  fours: number
  sixes: number
  boundaryRuns: number
  boundaryShare: number // share of all runs that came in fours and sixes
  dotBalls: number
  dotPct: number
  ones: number
  extras: { wides: number; noballs: number; byes: number; legByes: number; total: number }
  ballsPerBoundary: number | null
  topScorerId: string | null
  topBowlerId: string | null
}

export function inningsOverview(inn: Innings): InningsOverview {
  let fours = 0, sixes = 0, dots = 0, ones = 0
  for (const e of inn.log) {
    if (e.extraType === 'wide') continue
    if (e.runsBat === 4) fours++
    else if (e.runsBat === 6) sixes++
    if (e.runsBat === 0 && e.total === 0) dots++
    if (e.runsBat === 1) ones++
  }
  const balls = Math.max(inn.legalBalls, 1)
  const boundaryRuns = fours * 4 + sixes * 6
  const x = inn.extras
  const top = [...inn.batters].sort((a, b) => b.runs - a.runs)[0]
  const bowl = [...inn.bowlers.values()].sort((a, b) => b.wickets - a.wickets || a.runs - b.runs)[0]
  return {
    runs: inn.runs, wickets: inn.wickets, legalBalls: inn.legalBalls, runRate: (inn.runs / balls) * 6,
    fours, sixes, boundaryRuns, boundaryShare: inn.runs ? boundaryRuns / inn.runs : 0,
    dotBalls: dots, dotPct: dots / balls, ones,
    extras: { wides: x.wides, noballs: x.noballs, byes: x.byes, legByes: x.legByes, total: x.wides + x.noballs + x.byes + x.legByes },
    ballsPerBoundary: fours + sixes ? inn.legalBalls / (fours + sixes) : null,
    topScorerId: top && top.runs > 0 ? top.id : null,
    topBowlerId: bowl && bowl.wickets > 0 ? bowl.id : null,
  }
}

// ---- Phases -----------------------------------------------------------------------------

export interface PhaseRow { phase: 'powerplay' | 'middle' | 'death'; overs: string; balls: number; runs: number; wickets: number; runRate: number; boundaries: number; dotPct: number }

export function phaseSummary(inn: Innings, ranges: Record<'powerplay' | 'middle' | 'death', [number, number]>): PhaseRow[] {
  return (['powerplay', 'middle', 'death'] as const).map((phase) => {
    const [from, to] = ranges[phase]
    const evs = inn.log.filter((e) => e.over >= from && e.over <= to)
    const legal = evs.filter((e) => e.legal).length
    const runs = evs.reduce((s, e) => s + e.total, 0)
    const dots = evs.filter((e) => e.extraType !== 'wide' && e.runsBat === 0 && e.total === 0).length
    return {
      phase, overs: `${from + 1}-${to + 1}`, balls: legal, runs, wickets: evs.filter((e) => e.wicket).length,
      runRate: legal ? (runs / legal) * 6 : 0, boundaries: evs.filter((e) => e.boundary).length, dotPct: legal ? dots / legal : 0,
    }
  })
}

// ---- Over by over ---------------------------------------------------------------------------

export interface OverLine { over: number; bowlerId: string; runs: number; wickets: number; balls: BallEvent[]; scoreAfter: { runs: number; wickets: number } }

export function overLines(inn: Innings): OverLine[] {
  const out: OverLine[] = []
  for (const e of inn.log) {
    let o = out[e.over]
    if (!o) o = out[e.over] = { over: e.over + 1, bowlerId: e.bowlerId, runs: 0, wickets: 0, balls: [], scoreAfter: { runs: 0, wickets: 0 } }
    o.balls.push(e)
    o.runs += e.total
    if (e.wicket) o.wickets++
    o.scoreAfter = { runs: e.score.runs, wickets: e.score.wickets }
  }
  return out.filter(Boolean)
}

// ---- Batsman v bowler -----------------------------------------------------------------------

export interface Matchup { batterId: string; bowlerId: string; runs: number; balls: number; dismissed: boolean; fours: number; sixes: number }

export function matchups(inn: Innings): Matchup[] {
  const by = new Map<string, Matchup>()
  for (const e of inn.log) {
    if (e.extraType === 'wide') continue
    const k = `${e.strikerId}|${e.bowlerId}`
    let m = by.get(k)
    if (!m) by.set(k, (m = { batterId: e.strikerId, bowlerId: e.bowlerId, runs: 0, balls: 0, dismissed: false, fours: 0, sixes: 0 }))
    m.balls++
    m.runs += e.runsBat
    if (e.runsBat === 4) m.fours++
    if (e.runsBat === 6) m.sixes++
    if (e.wicket && e.wicket.playerId === e.strikerId && e.wicket.kind !== 'run out') m.dismissed = true
  }
  return [...by.values()]
}

/** How the wickets fell: counts by kind. */
export function dismissalKinds(inn: Innings): { kind: string; count: number }[] {
  const c = new Map<string, number>()
  for (const b of inn.batters) if (b.dismissal) c.set(b.dismissal.kind, (c.get(b.dismissal.kind) ?? 0) + 1)
  return [...c.entries()].map(([kind, count]) => ({ kind, count })).sort((a, b) => b.count - a.count)
}

// ---- Win chance -------------------------------------------------------------------------------

const normalCdf = (x: number) => {
  // Abramowitz & Stegun 7.1.26
  const t = 1 / (1 + 0.2316419 * Math.abs(x))
  const d = 0.3989423 * Math.exp((-x * x) / 2)
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))
  return x > 0 ? 1 - p : p
}
const clampP = (p: number) => Math.min(0.99, Math.max(0.01, p))

/** Typical totals, used as the yardstick before there's much to go on. */
const PAR_TOTAL = { t20: 170, odi: 262 } as const
const PAR_RPO = { t20: 8.58, odi: 5.63 } as const

/**
 * A rough chance (0 to 1) that the team batting second wins. It's an estimate from the score,
 * the overs left and the wickets in hand, not a simulation of the rest of the match.
 */
export function chaseWinChance(format: 't20' | 'odi', maxOvers: number, firstInnings: { runs: number; wickets: number; legalBalls: number; done: boolean }, second?: { runs: number; wickets: number; legalBalls: number; target: number }): number {
  const total = maxOvers * 6
  const par = PAR_TOTAL[format]
  if (!second) {
    // Still in the first innings: where is it heading, and how often does a chase beat that?
    const left = total - firstInnings.legalBalls
    const handsLeft = (10 - firstInnings.wickets) / 10
    const rate = firstInnings.legalBalls ? Math.max(0.5 * PAR_RPO[format], (firstInnings.runs / firstInnings.legalBalls) * 6) : PAR_RPO[format]
    const blend = Math.min(firstInnings.legalBalls / (total * 0.35), 1)
    const projected = firstInnings.runs + ((blend * rate + (1 - blend) * PAR_RPO[format]) * (left / 6)) * Math.pow(handsLeft, 0.35)
    return clampP(1 / (1 + Math.exp((projected - par) / (par * 0.11))))
  }
  const need = second.target - second.runs
  if (need <= 0) return 0.995
  const left = total - second.legalBalls
  if (left <= 0 || second.wickets >= 10) return 0.005
  const handsLeft = (10 - second.wickets) / 10
  const expected = PAR_RPO[format] * (left / 6) * Math.pow(handsLeft, 0.62) * 1.05
  const sd = Math.max(6, Math.sqrt(left) * (format === 't20' ? 2.3 : 2.1))
  return clampP(normalCdf((expected - need) / sd))
}

export interface WinPoint { x: number; p: number; innings: 0 | 1 }

/** The estimate after every over, across the whole match (x counts overs from the start of the first innings). */
export function winChanceSeries(m: { format: 't20' | 'odi'; maxOvers: number; innings: Innings[] }): WinPoint[] {
  const pts: WinPoint[] = []
  const [a, b] = m.innings
  const state = (inn: Innings, upTo: number) => {
    const last = inn.log.filter((e) => e.over < upTo).slice(-1)[0]
    const legal = inn.log.filter((e) => e.over < upTo && e.legal).length
    return { runs: last?.score.runs ?? 0, wickets: last?.score.wickets ?? 0, legalBalls: legal }
  }
  const firstOvers = Math.ceil(a.legalBalls / 6)
  for (let o = 0; o <= firstOvers; o++) {
    const s = state(a, o)
    pts.push({ x: o, p: chaseWinChance(m.format, m.maxOvers, { ...s, done: false }), innings: 0 })
  }
  if (b) {
    const secondOvers = Math.ceil(b.legalBalls / 6)
    const final = { runs: a.runs, wickets: a.wickets, legalBalls: a.legalBalls, done: true }
    for (let o = 0; o <= secondOvers; o++) {
      const s = state(b, o)
      pts.push({ x: m.maxOvers + o, p: chaseWinChance(m.format, m.maxOvers, final, { ...s, target: b.target ?? a.runs + 1 }), innings: 1 })
    }
  }
  return pts
}
