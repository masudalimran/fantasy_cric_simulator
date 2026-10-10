import baselines from './data/baselines.json'
import type { Match } from './match'
import type { MatchFormat } from '../types'

/**
 * Man of the Match.
 *
 * Every player gets an impact score from what they did, then players on the winning side get a
 * boost (a match-winning performance counts for more than a brave losing one):
 *
 *  Batting   runs, scaled by how fast they were scored compared with a normal rate for the format
 *            (a quick 60 beats a slow 60), plus boundaries, milestones (50, 100), and the share of
 *            the team's total they scored. Seeing a chase home not out earns a little extra.
 *  Bowling   24 per wicket (+5 more for removing a top-four batsman), credit or blame for economy
 *            against a normal rate, maiden overs, dot balls, and bonuses for 3 and 5 wicket hauls.
 *  Fielding  catches, stumpings and run-outs.
 *
 * The totals are added up, the winning side's players are multiplied by 1.3, and the highest wins.
 */

export interface AwardCandidate {
  id: string
  side: 0 | 1
  points: number
  parts: { bat: number; bowl: number; field: number }
  bat: { runs: number; balls: number; fours: number; sixes: number; out: boolean } | null
  bowl: { balls: number; runs: number; wickets: number; maidens: number } | null
  field: { catches: number; stumpings: number; runOuts: number }
  /** One line summing up the performance, e.g. "112 (58) · 3/24 (4.0) · 2 catches". */
  line: string
}

export interface MatchAwards {
  motm: AwardCandidate | null
  contenders: AwardCandidate[] // best first, including the winner
  bestBat: AwardCandidate | null
  bestBowl: AwardCandidate | null
}

const WIN_BOOST = 1.3
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const par = (f: MatchFormat) => (baselines as unknown as Record<MatchFormat, { overall: { runsPerOver: number } }>)[f].overall.runsPerOver
const overs = (balls: number) => `${Math.floor(balls / 6)}.${balls % 6}`

export function computeAwards(m: Match): MatchAwards {
  const rpo = par(m.format)
  const parSR = (rpo / 6) * 100
  const pool = new Map<string, AwardCandidate>()
  const get = (id: string): AwardCandidate => {
    let c = pool.get(id)
    if (!c) {
      const side = m.sides[0].xi.some((p) => p.id === id) ? 0 : 1
      pool.set(id, (c = { id, side, points: 0, parts: { bat: 0, bowl: 0, field: 0 }, bat: null, bowl: null, field: { catches: 0, stumpings: 0, runOuts: 0 }, line: '' }))
    }
    return c
  }
  const winner = m.result?.winnerSide ?? null

  for (const inn of m.innings) {
    const positionOf = new Map(inn.batters.map((b, i) => [b.id, i]))
    const chaseWon = inn.target !== null && inn.runs >= inn.target

    for (const b of inn.batters) {
      const c = get(b.id)
      const sr = b.balls ? (b.runs / b.balls) * 100 : 0
      const tempo = b.balls ? clamp(sr / parSR, 0.4, 2.2) : 0.4
      let pts = b.runs * (0.55 + 0.45 * tempo) + b.fours * 0.5 + b.sixes * 1
      if (b.runs >= 100) pts += 18
      else if (b.runs >= 50) pts += 8
      pts += (b.runs / Math.max(inn.runs, 1)) * 18
      if (!b.dismissal && chaseWon && b.balls > 0) pts += 4
      if (b.dismissal && b.runs === 0) pts -= 2
      c.parts.bat += pts
      c.bat = { runs: (c.bat?.runs ?? 0) + b.runs, balls: (c.bat?.balls ?? 0) + b.balls, fours: (c.bat?.fours ?? 0) + b.fours, sixes: (c.bat?.sixes ?? 0) + b.sixes, out: !!b.dismissal }
      // fielding credit goes to whoever took the catch or made the run-out
      const d = b.dismissal
      if (d) {
        if (d.kind === 'caught' && d.fielderId) get(d.fielderId).field.catches++
        else if (d.kind === 'caught and bowled' && d.bowlerId) get(d.bowlerId).field.catches++
        else if (d.kind === 'stumped' && d.fielderId) get(d.fielderId).field.stumpings++
        else if (d.kind === 'run out' && d.fielderId) get(d.fielderId).field.runOuts++
        if (d.bowlerId && (positionOf.get(b.id) ?? 9) <= 3) get(d.bowlerId).parts.bowl += 5 // a top-order scalp
      }
    }

    for (const b of inn.bowlers.values()) {
      const c = get(b.id)
      const ov = b.legalBalls / 6
      const eco = ov ? b.runs / ov : rpo
      let pts = b.wickets * 24 + b.maidens * 6 + b.dots * 0.35
      pts += Math.max(-10, (rpo - eco) * ov * 1.6)
      if (b.wickets >= 5) pts += 20
      else if (b.wickets >= 3) pts += 8
      c.parts.bowl += pts
      c.bowl = { balls: (c.bowl?.balls ?? 0) + b.legalBalls, runs: (c.bowl?.runs ?? 0) + b.runs, wickets: (c.bowl?.wickets ?? 0) + b.wickets, maidens: (c.bowl?.maidens ?? 0) + b.maidens }
    }
  }

  const list = [...pool.values()]
  for (const c of list) {
    c.parts.field = c.field.catches * 7 + c.field.stumpings * 9 + c.field.runOuts * 9
    let total = c.parts.bat + c.parts.bowl + c.parts.field
    if (winner !== null && c.side === winner) total *= WIN_BOOST
    c.points = Math.max(0, total)
    const bits: string[] = []
    if (c.bat && c.bat.balls > 0) bits.push(`${c.bat.runs}${c.bat.out ? '' : '*'} (${c.bat.balls})`)
    if (c.bowl && c.bowl.balls > 0) bits.push(`${c.bowl.wickets}/${c.bowl.runs} (${overs(c.bowl.balls)})`)
    const fl: string[] = []
    if (c.field.catches) fl.push(`${c.field.catches} catch${c.field.catches > 1 ? 'es' : ''}`)
    if (c.field.stumpings) fl.push(`${c.field.stumpings} stumping${c.field.stumpings > 1 ? 's' : ''}`)
    if (c.field.runOuts) fl.push(`${c.field.runOuts} run-out${c.field.runOuts > 1 ? 's' : ''}`)
    c.line = [...bits, ...fl].join(' · ')
  }
  list.sort((a, b) => b.points - a.points)
  const bestBat = [...list].filter((c) => c.bat && c.bat.balls > 0).sort((a, b) => b.parts.bat - a.parts.bat)[0] ?? null
  const bestBowl = [...list].filter((c) => c.bowl && c.bowl.balls > 0).sort((a, b) => b.parts.bowl - a.parts.bowl)[0] ?? null
  return { motm: list[0] ?? null, contenders: list.slice(0, 5), bestBat, bestBowl }
}
