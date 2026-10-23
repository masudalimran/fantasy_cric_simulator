import { commentary } from '../engine/commentary'
import type { BallEvent } from '../engine/types'

/**
 * What the two commentators say aloud for a ball: the play-by-play man gives the usual line of commentary (never the ball's speed: that is shown on the screen,
 * not said aloud), and on the big moments the expert adds a word of his own. Chosen from the ball number, so the same ball always gets the same words.
 */
export interface LiveLine { text: string; role: 'pbp' | 'colour' }
export interface LiveNames { striker: string; bowler: string; out?: string; fielder?: string }

const COLOUR = {
  wicket: ['That could change the whole innings.', 'A big breakthrough for the bowling side.', 'The pressure told on the batsman there.', 'You could see that coming, the bowler had been building to it.', 'What a moment in this game.'],
  six: ['That is out of the ground, clean as you like.', 'Pure timing, he barely seemed to swing at it.', 'The bowler will not want to see that again.', 'That is a statement from the batsman.'],
  four: ['Placed beautifully, nothing the field could do.', 'That is the shot of a batsman in control.', 'Found the gap, it just races away.'],
  milestone: ['A superb knock, and he has earned every run of it.', 'Class on show, the crowd is on its feet.', 'That is a very special effort.'],
  slow: ['Good ball, that. Made him think.'],
}
const pickBy = <T,>(items: T[], seq: number, salt = 0): T => items[Math.abs(Math.floor(seq * 7 + salt)) % items.length]

export function liveLines(ev: BallEvent, n: LiveNames): LiveLine[] {
  const lines: LiveLine[] = []
  lines.push({ text: commentary(ev, n), role: 'pbp' })
  const milestone = ev.tags.some((t) => t === 'fifty' || t === 'hundred' || t === '150' || t === '200')
  const big = ev.wicket ? COLOUR.wicket : milestone ? COLOUR.milestone : ev.boundary === 6 ? COLOUR.six : ev.boundary === 4 && ev.seq % 3 === 1 ? COLOUR.four : null
  if (big) lines.push({ text: pickBy(big, ev.seq, 3), role: 'colour' })
  return lines
}
