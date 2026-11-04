export type RoomWho = 'host' | 'seller' | 'buyer' | 'player'
export interface RoomLine { at: number; end: number; who: RoomWho; text: string }

/** When things happen in the room (seconds in). */
export const ROOM = { enter: 0.4, player: 2.2, paper: 4.0, sign: 5.0, flash: 7.6, shirt: 9.0, end: 14.4 }

const pick = <T,>(list: T[], seed: number): T => list[Math.floor(Math.abs(Math.sin(seed * 12.9898) * 43758.5453) % 1 * list.length) % list.length]

export interface RoomCtx { mode: 'sign' | 'buy' | 'release'; player: string; to: string; from: string; fee: number; tier: number; seed: number; rating: number }

/** What is said around the table, one voice at a time. */
export function roomScript(c: RoomCtx): RoomLine[] {
  const s = c.seed
  const fee = c.fee > 0 ? `${c.fee} ${c.fee === 1 ? 'coin' : 'coins'}` : 'no fee'
  const say = (at: number, len: number, who: RoomWho, text: string): RoomLine => ({ at, end: at + len, who, text })
  if (c.mode === 'release') {
    return [
      say(1.0, 3.6, 'host', pick([`Today ${c.from} release ${c.player}. The club pays ${fee} back.`, `${c.from} and ${c.player} part ways today.`], s)),
      say(5.0, 3.6, 'seller', pick([`${c.player} gave us a lot. We thank him and wish him well.`, `A hard decision, and a respectful one.`], s + 1)),
      say(9.2, 3.6, 'player', pick([`Thank you all. I will look for my next chance.`, `No hard feelings. On to the next chapter.`], s + 2)),
    ]
  }
  const star = c.tier >= 4
  return [
    say(1.0, 4.0, 'host', c.mode === 'buy'
      ? pick([`Breaking news: ${c.player} moves from ${c.from} to ${c.to} for ${fee}.`, `A deal is done. ${c.to} have signed ${c.player} from ${c.from}, for ${fee}.`], s)
      : pick([`${c.to} have signed ${c.player}, a free agent, for ${fee}.`, `Welcome to ${c.to}, ${c.player}. The fee is ${fee}.`], s)),
    ...(c.mode === 'buy' ? [say(5.4, 3.4, 'seller' as RoomWho, pick([`${c.player} has served us well. We wish him luck.`, `It is a fair deal for both clubs.`], s + 1))] : []),
    say(c.mode === 'buy' ? 9.0 : 5.4, 3.6, 'buyer', star ? pick([`A top class player. This is a statement signing.`, `We are very proud to have ${c.player}. A real star.`], s + 2) : pick([`We are happy to welcome ${c.player}. He will add depth.`, `A smart signing, and we are happy with it.`], s + 2)),
    say(c.mode === 'buy' ? 12.6 : 9.4, 1.8, 'player', pick([`I cannot wait to start at ${c.to}.`, `Thank you. Let us get to work.`], s + 3)),
  ]
}
