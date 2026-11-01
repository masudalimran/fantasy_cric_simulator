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

/** How far outside the wide line the ball went, in centimetres (10 to 150, mostly not very far). Scenery only, the same for the wide screen and the broadcast view. */
export const wideCm = (seq: number): number => Math.round(10 + hash01(seq * 1.3 + 4) ** 1.5 * 140)
/** Where the wide line is, in metres from the middle stump. */
export const WIDE_LINE_M = 1.0

/** A wide this far outside the line (cm) goes past the keeper too and runs to the boundary: the wide, and four byes on top. */
export const WIDE_BYE_CM = 120
/** The four byes that run on a very wide ball (0 for an ordinary wide). The same figure the wide screen's distance gives, so the number on the screen decides it. */
export const wideByesFor = (seq: number): number => (wideCm(seq) >= WIDE_BYE_CM ? 4 : 0)

/**
 * How far wide of the stumps a bye went past the keeper, in centimetres (10 to 150; most are close, about one in twelve is a metre or more). It is the same figure
 * the bye screen shows and the ball is drawn with, and a bye of 100 cm or more runs on to the boundary for four byes.
 */
export const byeCm = (seq: number): number => Math.round(10 + 140 * hash01(seq * 2.3 + 6) ** 5.3)
export const BYE_FOUR_CM = 100
