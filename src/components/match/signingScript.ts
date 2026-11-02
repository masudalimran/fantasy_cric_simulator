import type { SpeechLine } from './ceremonyScript'

/** When things happen in a signing scene (seconds in): the presenter walks on, the player walks out, the squad cheers, the lines are spoken, and a leaving player walks away. */
export const SIGN = { hostIn: 0.6, walk0: 2.6, arrive: 7.0, shirt: 8.4, leave: 11.8, end: 15.6 }

export interface SigningCtx {
  host: string
  team: string
  player: string
  captain: string
  mode: 'sign' | 'buy' | 'release'
  /** The club he came from (a move between clubs). */
  from?: string | null
  fee: number
  /** 0 (tailender) to 5 (legendary). */
  tier: number
  seed: number
}

const pick = <T,>(list: T[], seed: number): T => list[Math.floor(Math.abs(Math.sin(seed * 12.9898) * 43758.5453) % 1 * list.length) % list.length]

/** What is said, one voice at a time. A signing: the presenter announces him as he walks out, the captain welcomes him, and he answers. A release: the presenter says goodbye, he thanks the club, and the captain wishes him well. */
export function signingScript(c: SigningCtx): SpeechLine[] {
  const s = c.seed
  const out: SpeechLine[] = []
  const say = (at: number, len: number, who: SpeechLine['who'], text: string) => out.push({ at, end: at + len, who, text })
  const fee = c.fee > 0 ? ` for ${c.fee} ${c.fee === 1 ? 'coin' : 'coins'}` : ''
  if (c.mode === 'release') {
    say(1.8, 3.8, 'host', pick([`Today ${c.team} say goodbye to ${c.player}. A real servant of the club.`, `A sad moment: ${c.player} is leaving ${c.team}.`, `${c.player} and ${c.team} part ways today. Let us give him a big hand.`], s))
    say(6.0, 4.0, 'motm', pick([`Thank you all. I will never forget my time here.`, `It has been a great ride. I wish everyone the very best.`, `This is not the end of my story. Thank you, ${c.team}.`], s + 1))
    say(10.2, 3.6, 'win', pick([`We will miss you, ${c.player}. Good luck, my friend.`, `You will always be one of us.`, `The dressing room will not be the same.`], s + 2))
    return out
  }
  const big = c.tier >= 4
  const origin = c.mode === 'buy' && c.from ? ` from ${c.from}` : ''
  say(2.6, 4.2, 'host', big
    ? pick([`Ladies and gentlemen, the moment you have waited for! ${c.team} announce ${c.player}${origin}${fee}!`, `He is here! ${c.player} joins ${c.team}${origin}! What a signing!`], s)
    : pick([`${c.team} are delighted to announce ${c.player}${origin}${fee}.`, `Please welcome ${c.player}, the newest member of ${c.team}${origin}.`, `A new face at ${c.team} today: ${c.player}${origin}.`], s))
  say(7.4, 3.4, 'win', big
    ? pick([`A player like ${c.player} on OUR team? Unreal. Welcome!`, `We have just got a whole lot better. Welcome, ${c.player}!`], s + 1)
    : pick([`Welcome to the club, ${c.player}. Glad you are on our side.`, `Great to have you with us. Show us what you can do!`, `The dressing room is yours, ${c.player}.`], s + 1))
  say(11.2, 3.8, 'motm', big
    ? pick([`I came here to win things. Let us make history together.`, `Give me the ball and the bat. Let us go!`], s + 2)
    : pick([`Happy to be here. I will not let you down.`, `Thank you all. I cannot wait to get started.`, `New club, same hunger. Let us work.`], s + 2))
  return out
}
