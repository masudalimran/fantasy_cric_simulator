/**
 * What the players say in the huddle before a challenge, like in the real game. When the fielding side asks, the bowler, the captain and the
 * keeper talk it over; when the batting side asks, the two batsmen do. A side up against the wall talks like it knows it is probably out and asks
 * anyway. Chosen from the ball number so the same ball always gets the same talk.
 */
export type Role = 'bowler' | 'captain' | 'keeper' | 'striker' | 'partner'
export interface TalkLine { who: Role; text: string }
export interface TalkCtx {
  by: 'bat' | 'bowl'
  kind: 'lbw' | 'edge'
  desperate: boolean
  /** Challenges the asking side had before this one, and its allowance. */
  left: number
  total: number
  seq: number
  names: { bowler: string; captain: string; keeper: string; striker: string; partner: string }
}

const hash = (n: number, salt: number) => { const s = Math.sin((n + salt * 7.13) * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s) }
const pick = <T,>(items: T[], seq: number, salt: number): T => items[Math.floor(hash(seq, salt) * items.length) % items.length]
const first = (name: string) => { const p = name.trim().split(/\s+/); return p.length > 2 && /^[A-Z]\.?$/.test(p[1]) ? p[p.length - 1] : p[0] ?? name }

export function challengeTalk(c: TalkCtx): { people: Role[]; lines: TalkLine[] } {
  const n = c.names
  const s = c.seq
  if (c.by === 'bowl') {
    const appeal = c.kind === 'edge'
      ? pick([`I heard a nick, ${first(n.captain)}! I am sure of it.`, `That brushed the bat, I felt it go through.`, `There was a sound, skip. Surely there was a sound?`], s, 1)
      : pick([`That is hitting, ${first(n.captain)}. It has to be.`, `Plumb in front, I thought. Right in line.`, `I think that is crashing into middle, skip.`], s, 2)
    const ask = c.kind === 'edge'
      ? pick([`${first(n.keeper)}, did you hear anything?`, `Keeper, was there a noise?`, `${first(n.keeper)}, you were right behind it. What did you hear?`], s, 3)
      : pick([`${first(n.keeper)}, how did it look from behind?`, `Was it going over the top, ${first(n.keeper)}?`, `${first(n.keeper)}, was it clipping the stumps?`], s, 4)
    const keeper = c.desperate
      ? pick([`Honestly, I am not sure, but we have to try something.`, `Could be close. We need a wicket badly.`], s, 5)
      : c.kind === 'edge'
        ? pick([`There was a little noise, I am fairly sure.`, `I think I heard something. Worth a look.`, `Not certain, but it felt like a touch.`], s, 6)
        : pick([`It looked close. Could be clipping leg stump.`, `Worth a look, I would say. It was low.`, `I think it was hitting, just.`], s, 7)
    const decide = c.desperate
      ? pick([`We cannot afford to let this go. Upstairs!`, `We need this wicket. Take it!`], s, 8)
      : c.left <= 1
        ? pick([`It is our last one. Are we sure? ... Go on, take it.`, `Last review. Let us gamble.`], s, 9)
        : pick([`We have got reviews in hand. Let us take it.`, `Nothing to lose, we have ${c.left} left. Go for it.`], s, 10)
    return { people: ['bowler', 'captain', 'keeper'], lines: [{ who: 'bowler', text: appeal }, { who: 'captain', text: ask }, { who: 'keeper', text: keeper }, { who: 'captain', text: decide }] }
  }
  // the batting side: a batsman given out and his partner
  const striker = c.desperate
    ? pick([`I know it is probably out, but we have nothing to lose.`, `I think I hit it. Well, I might have. We need a miracle.`, `Honestly, that looked bad. But we have got to ask.`], s, 11)
    : c.kind === 'edge'
      ? pick([`I never hit that. Not a touch, I swear.`, `I do not think I got a bat on it.`, `That was my pad, or the ground, not the bat!`], s, 12)
      : pick([`I think that was going over the top.`, `That was outside the line, was it not?`, `I got an inside edge, I am sure of it.`], s, 13)
  const partner = c.desperate
    ? pick([`Take it. One miracle, please. We have nothing to lose.`, `We need every chance. Go for it.`], s, 14)
    : pick([`It looked high from here. Go for it.`, `I am not sure, mate. Your call.`, `Worth a look. We have still got ${c.left}.`], s, 15)
  const decide = c.desperate ? pick([`Okay. Let us hope for a miracle.`, `Fine, upstairs it goes.`], s, 16) : pick([`Alright, I am going for it.`, `Let us check it.`], s, 17)
  return { people: ['striker', 'partner'], lines: [{ who: 'striker', text: striker }, { who: 'partner', text: partner }, { who: 'striker', text: decide }] }
}
