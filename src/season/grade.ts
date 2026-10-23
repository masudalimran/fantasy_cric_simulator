import type { Role } from '../types'

/**
 * How good a performance was, on one scale for everyone: worse, bad, average, good, exceptional. The studio show uses it to decide what to
 * say about each player (shrug at a poor game, rave about a great one) and what to put on the TV. The thresholds scale with the format: an
 * innings is judged against what is normal for a T20, a one-day match or a Test.
 */
export type Grade = 'worse' | 'bad' | 'average' | 'good' | 'exceptional'

export const GRADE_LABEL: Record<Grade, string> = { worse: 'Poor', bad: 'Below par', average: 'Average', good: 'Good', exceptional: 'Exceptional' }
export const GRADE_COLOR: Record<Grade, string> = { worse: '#f87171', bad: '#fb923c', average: '#94a3b8', good: '#34d399', exceptional: '#fbbf24' }
export const GRADE_ORDER: Grade[] = ['worse', 'bad', 'average', 'good', 'exceptional']

type Format = 't20' | 'odi' | 'test'
/** How many runs make a "normal" innings in each format, relative to a T20, and the usual strike rate. */
const SCALE: Record<Format, number> = { t20: 1, odi: 2.2, test: 3.6 }
const PAR_SR: Record<Format, number> = { t20: 130, odi: 88, test: 50 }

export interface BatLine { runs: number; balls: number; out: boolean }
export interface BatCtx { format: Format; /** Place in the batting order, from 0. */ position: number; role: Role }

/** Runs, balls and who he is, in words of the scale. */
export function gradeBat(b: BatLine, c: BatCtx): Grade {
  const scale = SCALE[c.format]
  const tail = c.position >= 8 || c.role === 'BOWL'
  // a tailender is not judged like an opener: his runs count for more
  const runs = (tail ? b.runs * 1.8 : b.runs) / scale + 1e-9
  const srRatio = b.balls > 0 ? (b.runs / b.balls) * 100 / PAR_SR[c.format] : 1
  if (runs >= 50 || (runs >= 32 && srRatio >= 1.3)) return 'exceptional'
  if ((runs >= 25 && srRatio >= 0.85) || runs >= 36) return 'good'
  if (runs >= 12) return 'average'
  if (runs >= 5 && !(b.out && b.runs === 0)) return 'bad'
  return 'worse'
}

export interface BowlLine { wickets: number; runs: number; balls: number }
export interface BowlCtx { format: Format; /** The usual runs an over in this format. */ par: number }

export function gradeBowl(b: BowlLine, c: BowlCtx): Grade {
  const econ = b.balls > 0 ? (b.runs / b.balls) * 6 : c.par
  const r = econ / c.par
  if (b.wickets >= 4 || (b.wickets >= 3 && r <= 1.05) || (b.wickets >= 2 && r <= 0.6 && b.balls >= 12)) return 'exceptional'
  if (b.wickets >= 2 || (b.wickets >= 1 && r <= 0.9) || (r <= 0.7 && b.balls >= 12)) return 'good'
  if (b.wickets >= 1 || r <= 1.15) return 'average'
  if (r <= 1.45) return 'bad'
  return 'worse'
}
