import type { Match } from './match'
import type { BallEvent, BowlStyle, DeliveryAim, Intent, ShotAim } from './types'

/**
 * Everything a player can do in a match. A match is fully determined by its seed, the two squads
 * and this list, so a match in progress is saved as that list and rebuilt by replaying it.
 */
export type Action =
  | { t: 'ball'; n?: number } // n balls in a row (auto-play makes many)
  | { t: 'over' }
  | { t: 'overs'; n: number }
  | { t: 'wicket' }
  | { t: 'innings' }
  | { t: 'match' }
  | { t: 'intent'; side: 0 | 1; v: Intent | null }
  | { t: 'bowler'; side: 0 | 1; id: string }
  | { t: 'style'; side: 0 | 1; v: BowlStyle | null }
  | { t: 'shot'; side: 0 | 1; v: ShotAim | null } // line up a shot for the next ball
  | { t: 'delivery'; side: 0 | 1; v: DeliveryAim | null } // line up a delivery for the next ball
  | { t: 'forfeit'; side: 0 | 1 }

/** Performs one action on the match and returns the deliveries it produced. */
export function applyAction(m: Match, a: Action): BallEvent[] {
  switch (a.t) {
    case 'ball': {
      const out: BallEvent[] = []
      for (let i = 0; i < (a.n ?? 1); i++) {
        const e = m.playBall()
        if (!e) break
        out.push(e)
      }
      return out
    }
    case 'over': return m.playOver()
    case 'overs': return m.playOvers(a.n)
    case 'wicket': return m.playToWicket()
    case 'innings': return m.playInnings()
    case 'match': m.playMatch(); return []
    case 'intent': m.intent[a.side] = a.v; return []
    case 'shot': m.shotAim[a.side] = a.v; return []
    case 'delivery': m.deliveryAim[a.side] = a.v; return []
    case 'style': m.bowlStyle[a.side] = a.v; return []
    case 'bowler': m.setBowler(a.side, a.id); return []
    case 'forfeit': m.forfeit(a.side); return []
  }
}

/** Adds an action to a log, folding runs of single balls together so a long match stays small. */
export function appendAction(log: Action[], a: Action): Action[] {
  const last = log[log.length - 1]
  if (a.t === 'ball' && last?.t === 'ball') return [...log.slice(0, -1), { t: 'ball', n: (last.n ?? 1) + (a.n ?? 1) }]
  return [...log, a]
}
