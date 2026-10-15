import type { Player } from '../types'
import type { Season } from './types'

/** One played match of a team, oldest to newest. */
export interface Played { date: string; vs: string; result: 'W' | 'L' | 'T' }

/** Every match a team has played across the given seasons (oldest first), from the seasons' fixtures and results. */
export function matchesOf(seasons: Season[], teamId: string): Played[] {
  const out: Played[] = []
  for (const s of seasons) {
    for (const f of s.fixtures) {
      const r = s.results[f.id]
      if (!r || !f.homeId || !f.awayId || (f.homeId !== teamId && f.awayId !== teamId)) continue
      out.push({ date: f.date, vs: f.homeId === teamId ? f.awayId : f.homeId, result: r.winnerId === null ? 'T' : r.winnerId === teamId ? 'W' : 'L' })
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

/** The last few results of a team, oldest first. */
export const formOf = (seasons: Season[], teamId: string, n = 5): Played[] => matchesOf(seasons, teamId).slice(-n)

export interface HeadToHead { aWins: number; bWins: number; ties: number; /** The latest meetings, oldest first. */ last: ('a' | 'b' | 't')[]; streak: { who: 'a' | 'b'; n: number } | null }

export function headToHead(seasons: Season[], a: string, b: string): HeadToHead {
  const games = matchesOf(seasons, a).filter((m) => m.vs === b)
  const last = games.map((m) => (m.result === 'W' ? 'a' : m.result === 'L' ? 'b' : 't')) as ('a' | 'b' | 't')[]
  let streak: HeadToHead['streak'] = null
  const tail = last[last.length - 1]
  if (tail && tail !== 't') {
    let n = 0
    for (let i = last.length - 1; i >= 0 && last[i] === tail; i--) n++
    streak = { who: tail, n }
  }
  return { aWins: last.filter((x) => x === 'a').length, bWins: last.filter((x) => x === 'b').length, ties: last.filter((x) => x === 't').length, last: last.slice(-5), streak }
}

/** One line on how two teams have got on before, or null if they have never met. */
export function rivalryLine(h: HeadToHead, a: string, b: string): string | null {
  const total = h.aWins + h.bWins + h.ties
  if (total === 0) return null
  const name = (w: 'a' | 'b') => (w === 'a' ? a : b)
  if (h.streak && h.streak.n >= 3) return `${name(h.streak.who)} have won the last ${h.streak.n} meetings.`
  if (total === 1) return h.aWins ? `${a} won when they last met.` : h.bWins ? `${b} won when they last met.` : 'Their only meeting was a tie.'
  if (h.aWins === h.bWins) return `Level at ${h.aWins}-${h.bWins} over ${total} meetings.`
  const lead = h.aWins > h.bWins ? 'a' : 'b'
  return `${name(lead)} lead ${Math.max(h.aWins, h.bWins)}-${Math.min(h.aWins, h.bWins)} over ${total} meetings.`
}

const batScore = (p: Player) => (p.batting.technique + p.batting.power + p.batting.temperament) / 3
const bowlScore = (p: Player) => (p.bowling ? (p.bowling.accuracy + p.bowling.variation) / 2 : 0)

/** The two to watch in an XI: the best batsman and the best bowler (never the same person twice). */
export function keyPlayers(xi: Player[]): { bat: Player | null; bowl: Player | null } {
  const bat = [...xi].sort((x, y) => batScore(y) - batScore(x))[0] ?? null
  const bowl = [...xi].filter((p) => p.bowling && p.id !== bat?.id).sort((x, y) => bowlScore(y) - bowlScore(x))[0] ?? null
  return { bat, bowl }
}

/** How the two sides compare on paper, in words (the strengths are the XIs' average ratings). */
export function edgeText(aName: string, aStrength: number, bName: string, bStrength: number): string {
  const d = aStrength - bStrength
  if (Math.abs(d) <= 1) return 'Evenly matched on paper.'
  const [who, by] = d > 0 ? [aName, d] : [bName, -d]
  return by <= 4 ? `${who} have a slight edge on paper.` : by <= 9 ? `${who} are favourites on paper.` : `${who} are clear favourites on paper.`
}

