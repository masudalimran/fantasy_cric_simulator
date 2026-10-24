import { bowledFor, runOutGap, stumpGap, trackFor } from './moments'

/**
 * The three small facts shown under the replay of a wicket (bowled, lbw, stumped, hit wicket, run out), and a line that says how it happened.
 * Made up from the ball number and what the engine knows (the bowler's kind, the speed it was bowled at), so the same ball is always the same card.
 */
export interface WicketCard {
  /** The word that slams on screen. */
  title: string
  tiles: { label: string; value: string }[]
  /** One sentence on how it happened. */
  verdict: string
}

const first = (n: string) => n.trim().split(/\s+/)[0]
const STUMPS = ['off stump', 'middle stump', 'leg stump']

export function wicketCard(kind: 'bowled' | 'lbw' | 'stumped' | 'hit wicket' | 'run out', seq: number, o: { bowlerName: string; bowlerType?: string | null; kmh: number; keeperName?: string; fielderName?: string }): WicketCard {
  switch (kind) {
    case 'bowled': {
      const b = bowledFor(seq, o.bowlerType)
      const stump = STUMPS[Math.abs(Math.round(b.side)) % 3]
      return { title: 'BOWLED!', tiles: [{ label: 'Delivery', value: `${o.kmh} km/h` }, { label: 'Hit', value: stump }, { label: 'How', value: b.how }], verdict: `${first(o.bowlerName)} hits ${stump} at ${o.kmh} km/h: ${b.how.toLowerCase()}.` }
    }
    case 'lbw': {
      const t = trackFor(seq, true)
      return { title: 'LBW!', tiles: [{ label: 'Pitching', value: t.pitching }, { label: 'Impact', value: t.impact }, { label: 'Wickets', value: t.wickets }], verdict: `Pitched ${t.pitching.toLowerCase()}, struck ${t.impact.toLowerCase()}, and the ball is ${t.wickets.toLowerCase().replace(' (umpire\'s call)', ', on umpire\'s call')} the stumps.` }
    }
    case 'stumped': {
      const gap = stumpGap(seq)
      return { title: 'STUMPED!', tiles: [{ label: 'Out of the crease', value: `${gap} cm` }, { label: 'Keeper', value: first(o.keeperName ?? 'The keeper') }, { label: 'Delivery', value: `${o.kmh} km/h` }], verdict: `Beaten and down the pitch: ${gap} cm out of his ground when ${first(o.keeperName ?? 'the keeper')} whips off the bails.` }
    }
    case 'hit wicket':
      return { title: 'HIT WICKET!', tiles: [{ label: 'Delivery', value: `${o.kmh} km/h` }, { label: 'Dislodged by', value: 'The bat' }, { label: 'Bails', value: 'Off' }], verdict: 'He steps back and knocks the stumps with his own bat: the bails come off.' }
    case 'run out': {
      const gap = runOutGap(seq)
      return { title: 'RUN OUT!', tiles: [{ label: 'Short by', value: `${gap.cm} cm` }, { label: 'Fielder', value: first(o.fielderName ?? 'The fielder') }, { label: 'Decision', value: 'Third umpire' }], verdict: `${gap.text}. ${first(o.fielderName ?? 'The fielder')} hits the stumps.` }
    }
  }
}
