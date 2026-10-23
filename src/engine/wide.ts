import type { BallEvent } from './types'

/**
 * Which side of the batsman a wide went: outside off or down the leg side. Where a person chose the line it follows that (a line to the right of the
 * stumps is the off side); otherwise a stable pick from the ball number, mostly outside off. Scenery only: the same answer for the wide screen and the
 * broadcast view, so they show the ball going the same way.
 */
const hash01 = (n: number) => { const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s) }

export function wideSide(ev: Pick<BallEvent, 'seq' | 'delivery'>): 'off' | 'leg' {
  if (ev.delivery && ev.delivery.line !== 0) return ev.delivery.line > 0 ? 'off' : 'leg'
  return hash01(ev.seq) < 0.62 ? 'off' : 'leg'
}

/** +1 when the wide goes to the right of the picture and -1 to the left, as seen from above (bowler at the top) or from behind the bowler. */
export const wideDirection = (side: 'off' | 'leg', hand: 'L' | 'R', view: 'above' | 'behind-bowler'): 1 | -1 => {
  // from above a right-hander's off side is on the right; from behind the bowler it is on the left; a left-hander is the mirror image
  const offRight = view === 'above' ? 1 : -1
  const dir = (side === 'off' ? offRight : -offRight) * (hand === 'L' ? -1 : 1)
  return dir as 1 | -1
}
