/**
 * The fans' posts for the social-media screen: short posts about the match as it stands, in the voice of supporters of both sides, with
 * like and share counts. Built from the facts of the innings and picked from a seed, so the same moment gives the same feed.
 */
export interface SocialPost {
  name: string
  handle: string
  /** Which team's fan he is: 0 the batting side, 1 the fielding side. */
  side: 0 | 1
  text: string
  likes: number
  shares: number
  replies: number
  /** "2m", "just now"... */
  age: string
}

export interface SocialCtx {
  bat: { name: string; short: string }
  bowl: { name: string; short: string }
  runs: number
  wickets: number
  overs: string
  striker: string
  bowler: string
  /** The last boundary hit or wicket taken, if there was one just now. */
  moment?: { kind: 'four' | 'six' | 'wicket'; who: string; other?: string }
  top?: { name: string; runs: number } | null
  best?: { name: string; wickets: number } | null
  chase?: { need: number; balls: number } | null
}

const frac = (n: number) => n - Math.floor(n)
const hash = (a: number, b: number) => frac(Math.sin(a * 12.9898 + b * 78.233) * 43758.5453)
const pick = <T,>(xs: T[], seq: number, salt: number): T => xs[Math.floor(hash(seq, salt) * xs.length) % xs.length]

const NAMES = ['Sakura', 'Mika', 'Ren', 'Hana', 'Daichi', 'Yuki', 'Kaito', 'Aoi', 'Sora', 'Rin', 'Haru', 'Momo', 'Taro', 'Nana', 'Leo', 'Ivy']
const TAGS = ['stan', 'fan', 'army', 'nation', 'forever', 'daily', 'hq', 'vibes', 'central', 'zone']
const AGES = ['just now', '1m', '2m', '3m', '4m', '6m']

export function socialPosts(c: SocialCtx, seq: number, n = 6): SocialPost[] {
  const sides = [c.bat, c.bowl]
  const rr = c.overs ? c.runs / Math.max(0.1, parseFloat(c.overs.replace('.', '')) / 10) : 0
  void rr
  const bank: { side: 0 | 1; text: string }[] = []
  const add = (side: 0 | 1, ...texts: string[]) => texts.forEach((t) => bank.push({ side, text: t }))
  if (c.moment?.kind === 'six') add(0, `SIX! ${c.moment.who} just sent that into orbit #${c.bat.short}`, `Did you see that?! ${c.moment.who} cleared the rope like it was nothing`, `I am screaming. ${c.moment.who}!!! #${c.bat.short}`), add(1, `Well, that one is on the bowling. Next ball, ${c.bowl.short}!`)
  if (c.moment?.kind === 'four') add(0, `Four more for ${c.moment.who}. Class.`, `That cover drive from ${c.moment.who} was a painting #${c.bat.short}`), add(1, `Tighten up, ${c.bowl.short}. Too many boundaries.`)
  if (c.moment?.kind === 'wicket') add(1, `GOT HIM! ${c.moment.other ?? c.moment.who} walks back #${c.bowl.short}`, `${c.moment.who} strikes! This is why we love this team`, `Wicket! Breathe, everyone, breathe #${c.bowl.short}`), add(0, `Noooo. We needed ${c.moment.other ?? 'him'} to stay in.`, `That hurts. Come on ${c.bat.short}, rebuild.`)
  add(0, `${c.bat.short} are ${c.runs}/${c.wickets} after ${c.overs}. I believe in this side.`, `${c.striker} is looking good out there. Just keep going.`, `Nervous but hopeful. Come on ${c.bat.short}!`)
  add(1, `${c.bowler} is bowling well. ${c.bowl.short} to the rescue.`, `${c.bat.short} are ${c.runs}/${c.wickets}? We can work with that. #${c.bowl.short}`, `Dot ball, dot ball, wicket. That is the plan, ${c.bowl.short}.`)
  if (c.top && c.top.runs >= 20) add(0, `${c.top.name} on ${c.top.runs} and cruising. Someone give him a medal already.`), add(1, `We need to get rid of ${c.top.name}. He is on ${c.top.runs}!`)
  if (c.best && c.best.wickets >= 1) add(1, `${c.best.name} has ${c.best.wickets} already. Hero.`)
  if (c.chase && c.chase.need > 0) add(0, `${c.chase.need} needed from ${c.chase.balls}. My heart cannot take this.`), add(1, `${c.chase.need} off ${c.chase.balls}. We have got this, ${c.bowl.short}!`)
  add(0, `Best cricket game of the season, no contest. #${c.bat.short}`, `Pass the popcorn, this is wild`), add(1, `Not blinking until the last ball. #${c.bowl.short}`, `The atmosphere is unreal tonight`)
  const posts: SocialPost[] = []
  const used = new Set<number>()
  for (let i = 0; posts.length < n && i < n * 4; i++) {
    const k = Math.floor(hash(seq, 40 + i) * bank.length) % bank.length
    if (used.has(k)) continue
    used.add(k)
    const b = bank[k]
    const name = pick(NAMES, seq + i, 1)
    const tag = pick(TAGS, seq + i, 2)
    const hot = i < 2 ? 3 : 1
    posts.push({
      name: `${name} ${sides[b.side].short}`, handle: `@${name.toLowerCase()}_${sides[b.side].short.toLowerCase()}_${tag}`, side: b.side, text: b.text,
      likes: Math.round((20 + hash(seq, 60 + i) * 900) * hot), shares: Math.round((2 + hash(seq, 70 + i) * 120) * hot), replies: Math.round(1 + hash(seq, 80 + i) * 60), age: AGES[i % AGES.length],
    })
  }
  return posts
}

/** The little banners the crowd holds up in the stands: a number for a boundary, the team's name, or a favourite player. */
export function crowdSigns(opts: { sign: '4' | '6' | null; team: { short: string }; name: string | null }, seq: number): string[] {
  const go = pick(['GO', 'WE LOVE', 'ONE TEAM:', 'PROUD OF'], seq, 91)
  return [opts.sign ?? pick(['6', '4', '10/10'], seq, 92), `${go} ${opts.team.short.toUpperCase()}`, opts.name ? opts.name.toUpperCase() : pick(['MARRY ME', 'LEGEND', 'MVP'], seq, 93)]
}
