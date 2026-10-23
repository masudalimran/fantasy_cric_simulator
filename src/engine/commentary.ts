import type { BallEvent } from './types'

interface Names {
  striker: string
  bowler: string
  out?: string
  fielder?: string
}

const pick = <T,>(items: T[], seq: number): T => items[seq % items.length]

/** One line of commentary for a delivery. Wording rotates by ball number so it never reads like a loop. A challenge is announced first. */
export function commentary(ev: BallEvent, n: Names): string {
  const text = plainCommentary(ev, n)
  const r = ev.review
  if (!r) return text
  const who = r.by === 'bat' ? `${n.striker}` : 'The fielding side'
  const head = r.overturned
    ? (r.originalOut ? `${who} challenges, and it is overturned! Not out.` : `${who} take it upstairs, and the decision is overturned! It is out.`)
    : `${who} ${r.by === 'bat' ? 'challenges' : 'challenge'}, but the decision stands${r.left === 0 ? ' and that is the last of the reviews' : ''}.`
  return `${head} ${text}`
}

function plainCommentary(ev: BallEvent, n: Names): string {
  const { striker: s, bowler: b } = n
  const q = ev.seq
  if (ev.wicket) {
    const out = n.out ?? s
    const f = n.fielder ?? 'the fielder'
    switch (ev.wicket.kind) {
      case 'bowled': return pick([`BOWLED! ${b} knocks over ${out}'s stumps!`, `Timber! ${out} is clean bowled by ${b}.`, `${b} sneaks one through and ${out} is bowled.`], q)
      case 'caught': return pick([`OUT! ${out} hits it in the air and ${f} takes the catch.`, `Gone! Caught by ${f}, ${b} gets the wicket.`, `${out} goes for the big shot and ${f} makes no mistake.`], q)
      case 'caught and bowled': return `Caught and bowled! ${b} takes a sharp return catch to dismiss ${out}.`
      case 'lbw': return pick([`LBW! ${out} is trapped in front by ${b}.`, `Given out! Plumb in front, ${out} has to go.`], q)
      case 'stumped': return `Stumped! ${out} is out of the crease and ${f} whips off the bails.`
      case 'run out': return pick([`Run out! Mix-up in the middle, ${out} is short of the crease.`, `Direct hit from ${f}! ${out} is run out.`], q)
      case 'hit wicket': return `Hit wicket! ${out} steps back onto his own stumps.`
    }
  }
  if (ev.extraType === 'wide') return pick([`Wide. ${b} strays down the leg side.`, `Wide ball, too far outside off.`], q)
  if (ev.extraType === 'noball') return `No ball! ${b} oversteps. Free hit coming up.`
  if (ev.extraType === 'bye') return `Byes. It beats everyone and they scamper a run.`
  if (ev.extraType === 'legbye') return `Leg byes. Off the pad and away for a run.`
  switch (ev.runsBat) {
    case 0: return pick([`${b} to ${s}, no run. Solid defence.`, `${s} swings and misses!`, `Dot ball. ${b} is building the pressure.`, `${s} plays it back to the bowler.`, `Good length, ${s} can't get it away.`], q)
    case 1: return pick([`${s} works it away for a single.`, `Nudged into the gap, one run.`, `${s} dabs it down for a quick single.`], q)
    case 2: return pick([`${s} pushes it into the gap, they come back for two.`, `Good running, two runs.`], q)
    case 3: return `Three! ${s} finds the gap and they run hard.`
    case 4: return pick([`FOUR! ${s} drives it through the covers.`, `FOUR! Cracked away by ${s} to the fence.`, `FOUR! ${s} finds the gap perfectly.`, `FOUR! Short and punished by ${s}.`], q)
    case 6: return pick([`SIX! ${s} sends it into the stands!`, `SIX! What a hit from ${s}, that's gone miles.`, `SIX! ${s} picks ${b} up and deposits it over the rope.`, `MAXIMUM! ${s} clears the boundary with ease.`], q)
    default: return `${ev.runsBat} runs.`
  }
}

export const tagLabel: Record<string, string> = {
  fifty: 'FIFTY!',
  hundred: 'CENTURY!',
  '150': '150!',
  '200': 'DOUBLE CENTURY!',
  'hat-trick': 'HAT-TRICK!',
  'five-wickets': 'FIVE-FOR!',
  maiden: 'MAIDEN OVER',
  duck: 'DUCK',
}
