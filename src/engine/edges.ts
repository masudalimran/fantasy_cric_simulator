/**
 * Edges: some balls are not middled. A ball can be bowled off an inside edge (it clips the bat on its way on to the stumps), a four can be an edge that runs away past
 * the keeper and the slips, and a single or two can come off the inside or the outside of the bat. Picked from the ball number, so a replay always agrees. Looks only:
 * the engine decides runs and wickets, and never reads this.
 */
export type Edge = 'inside' | 'outside'

const frac = (n: number) => n - Math.floor(n)
const h = (seq: number, k: number) => frac(Math.sin(seq * 12.9898 + k * 78.233) * 43758.5453)

/** How often each kind of ball is an edge: a fifth of the bowled, one four in eight, one single, two or three in twelve. */
export const bowledInsideEdge = (seq: number): boolean => h(seq, 3.1) < 0.2

export function edgeOf(ev: { seq: number; runsBat?: number; boundary?: number; wicket?: { kind: string } | null; extraType?: string | null; legal?: boolean }): Edge | null {
  if (ev.extraType === 'wide' || ev.extraType === 'bye' || ev.extraType === 'legbye') return null
  if (ev.wicket) return ev.wicket.kind === 'bowled' && bowledInsideEdge(ev.seq) ? 'inside' : null
  const runs = ev.runsBat ?? 0
  if (ev.boundary === 6) return null
  const rate = ev.boundary === 4 ? 0.125 : runs > 0 ? 0.085 : 0
  if (rate === 0 || h(ev.seq, 5.7) >= rate) return null
  return h(ev.seq, 8.3) < 0.4 ? 'inside' : 'outside'
}

/**
 * Where an edged scoring ball goes, in degrees clockwise from straight (the same scale as the shot zones: + is the off side for a right-hander): an inside edge runs
 * away fine on the leg side, an outside edge past the slips to third man.
 */
export function edgeDegrees(seq: number, edge: Edge): number {
  return edge === 'inside' ? -(140 + 32 * h(seq, 11.9)) : 118 + 34 * h(seq, 13.1)
}
