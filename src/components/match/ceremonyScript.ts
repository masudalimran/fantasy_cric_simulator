/**
 * The words of the post-match presentation: the host talks to the winning captain, then the losing captain, then calls the Man of the Match and hands him the
 * prize money, and everyone answers. The lines are picked by a seed from the match (the result, the margin, who did what), so a replay says the same things and
 * different matches say different ones. Plain text only: the picture and the timing are somewhere else.
 */

export type Speaker = 'host' | 'win' | 'lose' | 'motm'
export interface SpeechLine { at: number; end: number; who: Speaker; text: string }

export interface CeremonyCtx {
  /** The names of the people are the short ones a character is called by (Goku, Ichigo...). */
  host: string
  winTeam: string
  loseTeam: string
  winCaptain: string
  loseCaptain: string
  motm: string
  /** Whether the Man of the Match is one of the winners' captains (or the losing captain, so the same man is not interviewed twice). */
  motmIsCaptain: boolean
  /** The result in the match's own words ("won by 24 runs"), and a rough size: 'big', 'close' or 'tie'. */
  result: string
  margin: 'big' | 'close' | 'tie' | 'normal'
  /** Whether the winners batted first (they won by runs) or chased (they won by wickets). */
  winnersChased: boolean
  /** What the Man of the Match did, in a few words ("71 off 40 balls", "3/18 in 4 overs") and whether it was with bat or ball. */
  motmDeed: string
  motmWith: 'bat' | 'ball' | 'both'
  prize: string
  seed: number
}

const h = (n: number) => { const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s) }
const pick = <T,>(xs: T[], seed: number, salt: number): T => xs[Math.floor(h(seed * 7.13 + salt * 3.7) * xs.length) % xs.length]
/** (the names are already the short ones the game calls a character by) */
const first = (n: string) => n

/** Where each part of the ceremony starts (seconds into the show). */
export const CEREMONY_BEATS = { hostIn: 3.4, win: 6.9, lose: 16.9, motm: 26.1, cheque: 31.2, close: 38.6, end: 42.5 } // (one voice at a time: the host asks, the captain answers, and only then the host turns to the next)

export function ceremonyScript(c: CeremonyCtx): SpeechLine[] {
  const s = c.seed
  const B = CEREMONY_BEATS
  const out: SpeechLine[] = []
  const say = (at: number, len: number, who: Speaker, text: string) => out.push({ at, end: at + len, who, text })

  // 1. the winning captain
  const hostWin = c.margin === 'tie'
    ? `What a finish! The sides could not be separated, but it is ${c.winTeam} who take it. ${first(c.winCaptain)}, your thoughts?`
    : pick([
      `Congratulations, ${c.winTeam}! They ${c.result}. ${first(c.winCaptain)}, how does it feel?`,
      `A superb result for ${c.winTeam}, who ${c.result}. ${first(c.winCaptain)}, what a way to win it!`,
      `${c.winTeam} ${c.result}, and the crowd loves it. ${first(c.winCaptain)}, tell us about the day.`,
    ], s, 1)
  const winAns = c.margin === 'close'
    ? pick([`Honestly, it could have gone either way, but the boys kept their nerve right to the last ball.`, `That was nervy! I am just glad we held on. Everyone found something extra at the end.`], s, 2)
    : c.margin === 'big'
      ? pick([`We stuck to our plans and the boys executed them beautifully. I could not be prouder.`, `Everything clicked today. The bowlers set it up and the batsmen finished the job.`], s, 2)
      : pick([`A great team effort. We trusted each other and it paid off when it mattered.`, c.winnersChased ? `The chase was all about staying calm. The batsmen did it brilliantly.` : `We got enough runs on the board and the bowlers did the rest. Brilliant.`], s, 2)
  say(B.hostIn, 3.2, 'host', pick([`Good evening, everybody! What an atmosphere. Let us get the captains up and hear from them.`, `Welcome to the presentation, and thank you for staying with us under the lights!`], s, 0))
  say(B.win, 4.2, 'host', hostWin)
  say(B.win + 4.5, 5.2, 'win', winAns)

  // 2. the losing captain
  const hostLose = pick([
    `${first(c.loseCaptain)}, a tough one to swallow. What went wrong for ${c.loseTeam}?`,
    `${c.loseTeam} fought hard, ${first(c.loseCaptain)}. What do you take from today?`,
  ], s, 3)
  const loseAns = c.margin === 'tie'
    ? `So close. We will be disappointed, but there is plenty to be proud of in how we played.`
    : c.winnersChased
      ? pick([`We did not quite have enough runs on the board. Credit to ${c.winTeam}, they chased it well.`, `A few more runs and it might have been different. We will learn from it and come back.`], s, 4)
      : pick([`We were a bit short with the bat in the chase. Credit to ${first(c.winCaptain)} and his bowlers.`, `They got away from us early and we never really recovered. Hats off to ${c.winTeam}.`], s, 4)
  say(B.lose, 3.6, 'host', hostLose)
  say(B.lose + 3.9, 5.0, 'lose', loseAns)

  // 3. the Man of the Match and the prize
  const hostMotm = pick([
    `And now the moment you have been waiting for. The Player of the Match is ${c.motm}! ${c.motmDeed}.`,
    `Ladies and gentlemen, your Player of the Match: ${c.motm}! ${c.motmDeed}, a performance to remember.`,
    `It could only be one man. ${c.motm}, ${c.motmDeed}. Come on up!`,
  ], s, 5)
  const motmAns = c.motmWith === 'bat'
    ? pick([`Thank you. I just wanted to back myself and play my game. The boys at the other end made it easy.`, `Great feeling. When the ball is there to hit, you have to go for it. Happy it came off.`], s, 6)
    : c.motmWith === 'ball'
      ? pick([`Thanks so much. The plan was to hit my areas and let the pitch do the work. It worked.`, `I just tried to be patient and hit the stumps. The captain trusted me and I am glad I paid him back.`], s, 6)
      : pick([`A bit of everything today, really. It is a team game and I am just happy to contribute.`, `Thank you. Whatever the team needed, I tried to do it.`], s, 6)
  say(B.motm, 4.8, 'host', hostMotm)
  say(B.cheque, 2.8, 'host', `Here is your prize money, ${first(c.motm)}: ${c.prize}. Well deserved!`)
  say(B.cheque + 3.1, 4.0, 'motm', motmAns)
  say(B.close, 3.6, 'host', pick([`A huge round of applause for both teams. Thank you, and goodnight!`, `That is all from us. Thank you for coming, and what a game it was. Goodnight!`], s, 7))
  return out
}

/** The line being said at a moment (null in the gaps). */
export const lineAt = (script: SpeechLine[], t: number): SpeechLine | null => script.find((l) => t >= l.at && t < l.end) ?? null
