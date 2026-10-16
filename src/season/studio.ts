import { battingScore } from '../data/builders'
import { computeAwards } from '../engine/awards'
import { describePitch } from '../engine/pitchInfo'
import type { Match } from '../engine/match'
import { parRunsPerOver } from '../engine/model'
import { FORMATS, type BallEvent, type Innings } from '../engine/types'
import type { Player, Team } from '../types'

/**
 * The studio show between innings and at the end of a match: a host and two experts talk about what has happened, and the TV in the middle
 * shows the moments they are talking about. This file only writes the script (who says what, in what mood, and what is on the TV): it is
 * pure and seeded, so the same match gives the same show. The words are built from facts of the match plus a voice for each person,
 * so no two shows read alike.
 */

export type Mood = 'excited' | 'serious' | 'laugh' | 'shocked' | 'thoughtful' | 'proud' | 'sarcastic' | 'worried'
export type Persona = 'host' | 'analyst' | 'firebrand' | 'veteran' | 'jester' | 'tactician'
export type ShowKind = 'innings' | 'stumps' | 'end'

/** What the studio TV shows while a line is being said. Everything is by id, so the show can be rebuilt from the match. */
export type Clip =
  | { kind: 'card'; title: string; lines: string[] }
  | { kind: 'worm' | 'manhattan' | 'scoring'; innings: number }
  | { kind: 'wagon'; innings: number; batsmanId?: string }
  | { kind: 'six' | 'four' | 'wicket'; seq: number }
  | { kind: 'milestone'; innings: number; playerId: string }

export interface Beat { who: 0 | 1 | 2; text: string; mood: Mood; clip?: Clip }
export interface Pundit { player: Player; team: Team }
export interface Cast { player: Player; team: Team; persona: Persona }
export interface Script { cast: [Cast, Cast, Cast]; beats: Beat[]; title: string }

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }
/** What to call a person on air: the first name, or the last when the first is followed by an initial (Monkey D. Luffy is Luffy). */
const first = (name: string) => { const p = name.trim().split(/\s+/); return p.length > 2 && /^[A-Z]\.?$/.test(p[1]) ? p[p.length - 1] : p[0] ?? name }

class Seeded {
  private s: number
  constructor(seed: number) { this.s = (seed >>> 0) || 1 }
  next() { this.s = Math.imul(this.s ^ (this.s >>> 15), 2246822507) >>> 0; this.s = Math.imul(this.s ^ (this.s >>> 13), 3266489909) >>> 0; this.s ^= this.s >>> 16; return (this.s >>> 0) / 4294967296 }
  int(n: number) { return Math.floor(this.next() * n) }
  chance(p: number) { return this.next() < p }
}

// ---- Facts ----------------------------------------------------------------------------------------------------------

interface BatFact { id: string; runs: number; balls: number; fours: number; sixes: number; sr: number; out: boolean }
interface BowlFact { id: string; wk: number; runs: number; balls: number; maidens: number; econ: number }

export interface Facts {
  inn: Innings
  idx: number
  bat: Team
  bowl: Team
  topBat: BatFact | null
  nextBat: BatFact | null
  bestBowl: BowlFact | null
  bigOver: { over: number; runs: number } | null
  longestSix: BallEvent | null
  turning: { ev: BallEvent; runs: number; balls: number } | null
  collapse: { wickets: number; balls: number; at: number } | null
  stand: { a: string; b: string; runs: number; balls: number } | null
  powerplay: { runs: number; wickets: number; overs: number } | null
  death: { runs: number; wickets: number; overs: number } | null
  extras: number
  /** How the wickets fell: catches, run outs and stumpings, and to pace or to spin. */
  caught: number
  runOuts: number
  paceWk: number
  spinWk: number
  /** A batsman who finished a few runs short of (or stranded on the edge of) a fifty or hundred. */
  nearMiss: { id: string; runs: number; out: boolean; target: number } | null
  fours: number
  sixes: number
  dots: number
  legal: number
  rr: number
}

const batFacts = (inn: Innings): BatFact[] => inn.batters.filter((b) => b.balls > 0 || b.runs > 0).map((b) => ({ id: b.id, runs: b.runs, balls: b.balls, fours: b.fours, sixes: b.sixes, sr: b.balls ? Math.round((b.runs / b.balls) * 100) : 0, out: !!b.dismissal }))

function factsOf(match: Match, idx: number): Facts {
  const inn = match.innings[idx]
  const bats = batFacts(inn).sort((a, b) => b.runs - a.runs || a.balls - b.balls)
  const bowls: BowlFact[] = [...inn.bowlers.values()].filter((b) => b.legalBalls > 0).map((b) => ({ id: b.id, wk: b.wickets, runs: b.runs, balls: b.legalBalls, maidens: b.maidens, econ: (b.runs / b.legalBalls) * 6 }))
  bowls.sort((a, b) => b.wk - a.wk || a.runs - b.runs)
  // the busiest over
  const overRuns = new Map<number, number>()
  for (const e of inn.log) overRuns.set(e.over, (overRuns.get(e.over) ?? 0) + e.total)
  let bigOver: Facts['bigOver'] = null
  for (const [over, runs] of overRuns) if (!bigOver || runs > bigOver.runs) bigOver = { over: over + 1, runs }
  const six = inn.log.filter((e) => e.boundary === 6 && e.distance).sort((a, b) => (b.distance ?? 0) - (a.distance ?? 0))[0] ?? null
  // a wicket that ended a long innings is the turning point of the batting
  const bruns = new Map<string, { runs: number; balls: number }>()
  let turning: Facts['turning'] = null
  for (const e of inn.log) {
    const t = bruns.get(e.strikerId) ?? { runs: 0, balls: 0 }
    t.runs += e.runsBat; if (e.legal || e.extraType === 'noball') t.balls++
    bruns.set(e.strikerId, t)
    if (e.wicket && e.wicket.playerId === e.strikerId && t.runs >= 25 && (!turning || t.runs > turning.runs)) turning = { ev: e, runs: t.runs, balls: t.balls }
  }
  // the worst run of wickets: most wickets in 24 legal balls
  let collapse: Facts['collapse'] = null
  const wk = inn.log.filter((e) => e.wicket)
  for (let i = 0; i < wk.length; i++) {
    let j = i
    while (j + 1 < wk.length && wk[j + 1].score.legalBalls - wk[i].score.legalBalls <= 24) j++
    const n = j - i + 1
    if (n >= 3 && (!collapse || n > collapse.wickets)) collapse = { wickets: n, balls: wk[j].score.legalBalls - wk[i].score.legalBalls + 1, at: wk[i].score.runs }
  }
  // the best stand: runs between two wickets
  let stand: Facts['stand'] = null
  let from = 0, fromBalls = 0, a = inn.log[0]?.strikerId ?? '', b = inn.log[0]?.nonStrikerId ?? ''
  const closeStand = (runs: number, balls: number) => { if (!stand || runs > stand.runs) stand = { a, b, runs, balls } }
  for (const e of inn.log) {
    if (e.wicket) { closeStand(e.score.runs - from, e.score.legalBalls - fromBalls); from = e.score.runs; fromBalls = e.score.legalBalls; a = e.strikerId; b = e.nonStrikerId }
  }
  const lastEv = inn.log[inn.log.length - 1]
  if (lastEv) closeStand(lastEv.score.runs - from, lastEv.score.legalBalls - fromBalls)
  const cfg = FORMATS[match.format]
  const phase = (lo: number, hi: number) => {
    const part = inn.log.filter((e) => e.over >= lo && e.over <= hi)
    return part.length ? { runs: part.reduce((s, e) => s + e.total, 0), wickets: part.filter((e) => e.wicket).length, overs: Math.min(hi - lo + 1, Math.ceil(part.filter((e) => e.legal).length / 6)) } : null
  }
  const limited = match.format !== 'test'
  const legal = inn.log.filter((e) => e.legal).length
  return {
    inn, idx, bat: match.sides[inn.battingSide].team, bowl: match.sides[1 - inn.battingSide].team,
    topBat: bats[0] ?? null, nextBat: bats[1] ?? null, bestBowl: bowls[0] ?? null, bigOver, longestSix: six, turning, collapse, stand,
    powerplay: limited ? phase(cfg.phases.powerplay[0], cfg.phases.powerplay[1]) : null,
    death: limited && inn.legalBalls > (cfg.phases.death[0]) * 6 ? phase(cfg.phases.death[0], cfg.phases.death[1]) : null,
    extras: inn.extras.wides + inn.extras.noballs + inn.extras.byes + inn.extras.legByes,
    caught: wk.filter((e) => e.wicket && (e.wicket.kind === 'caught' || e.wicket.kind === 'caught and bowled')).length,
    runOuts: wk.filter((e) => e.wicket?.kind === 'run out').length,
    paceWk: wk.filter((e) => e.wicket && e.wicket.kind !== 'run out' && /^(fast|medium)/.test(match.player(e.bowlerId).bowling?.type ?? '')).length,
    spinWk: wk.filter((e) => e.wicket && e.wicket.kind !== 'run out' && /spin/.test(match.player(e.bowlerId).bowling?.type ?? '')).length,
    nearMiss: (() => {
      for (const b of [...inn.batters].sort((x, y) => y.runs - x.runs)) {
        const t = b.runs >= 90 && b.runs <= 99 ? 100 : b.runs >= 44 && b.runs <= 49 ? 50 : 0
        if (t) return { id: b.id, runs: b.runs, out: !!b.dismissal, target: t }
      }
      return null
    })(),
    fours: inn.log.filter((e) => e.boundary === 4).length, sixes: inn.log.filter((e) => e.boundary === 6).length,
    dots: inn.log.filter((e) => e.legal && e.total === 0).length, legal,
    rr: legal ? (inn.runs / legal) * 6 : 0,
  }
}

// ---- Voices ---------------------------------------------------------------------------------------------------------

type Tone = 'praise' | 'knock' | 'neutral' | 'wow'

interface Voice {
  /** Words to start a take with. */
  lead: string[]
  /** Words to end a take with, by how the thing deserves to be taken. */
  close: Record<Tone, [string, Mood][]>
  /** A quick reaction to what the other expert said. */
  agree: string[]
  disagree: string[]
  /** Said before an answer to a question put by the host. */
  think: string[]
}

const VOICES: Record<Exclude<Persona, 'host'>, Voice> = {
  analyst: {
    lead: ['Let me give you the numbers.', 'Strip it back and look at the data.', 'The figures tell it best.', 'Look at the underlying numbers.', 'It is all in the stats.', 'Break it down ball by ball.', 'The spreadsheet has a view on this.', 'Numbers do not lie, so here they are.'],
    close: {
      praise: [['Those are elite numbers.', 'proud'], ['That is efficiency of the highest order.', 'proud'], ['You cannot argue with that.', 'serious']],
      knock: [['The numbers simply do not add up for them.', 'serious'], ['That is a lot of pressure built by dot balls.', 'worried'], ['The data says they left runs out there.', 'thoughtful']],
      neutral: [['Make of that what you will.', 'thoughtful'], ['It is a fairly balanced picture.', 'thoughtful'], ['The margins are thin.', 'serious']],
      wow: [['I had to check the scorer twice.', 'shocked'], ['That is well off the chart.', 'excited'], ['Statistically that is a rare one.', 'shocked']],
    },
    agree: ['The numbers back that up.', 'Fair point, and the data agrees.', 'Yes, and it shows in the figures.', 'That lines up with what I have here.', 'The sample size backs it.'],
    disagree: ['The data tells a slightly different story.', 'I would push back on that.', 'Respectfully, the numbers disagree.', 'I am seeing something different in the figures.', 'The trend line does not support that.'],
    think: ['Good question.', 'Right, so here is the thing.', 'Let me think about that for a second.', 'Let me pull up the numbers.', 'Let me crunch that.'],
  },
  firebrand: {
    lead: ['Honestly?', 'I will say it plainly.', 'Listen to me.', 'Unbelievable stuff.', 'Oh, I loved it.', 'Come on, let us be honest here.', 'I am going to be blunt.', 'Right, listen up.', 'I have got strong feelings about this one.'],
    close: {
      praise: [['Absolutely magnificent!', 'excited'], ['That is a class act, no question!', 'excited'], ['Take a bow, son!', 'proud']],
      knock: [['That is just not good enough!', 'serious'], ['It was careless, plain and simple.', 'sarcastic'], ['Somebody should be ashamed of that.', 'serious']],
      neutral: [['I am not convinced either way.', 'thoughtful'], ['It could go either way, frankly.', 'thoughtful'], ['Still plenty to play for.', 'serious']],
      wow: [['Are you kidding me?!', 'shocked'], ['I nearly fell off my chair!', 'shocked'], ['Pure carnage!', 'excited']],
    },
    agree: ['Exactly! That is exactly it!', 'Spot on, and I will say it louder!', 'Finally, someone talking sense.', 'Hear, hear!', 'That is the truth, and nobody wants to say it!'],
    disagree: ['Oh, come on! You cannot be serious!', 'No, no, no. I completely disagree!', 'That is nonsense and you know it!', 'You must be watching a different match!', 'I could not disagree more if I tried!'],
    think: ['Oh, where do I begin?', 'Right, buckle up.', 'I have been waiting for this question.', 'Oh, you are going to get an earful.', 'Strap in!'],
  },
  veteran: {
    lead: ['I have seen this film before.', 'In my day we would have called that proper cricket.', 'I have stood out there in conditions like this.', 'Experience tells you one thing.', 'You learn this young.', 'Years in the game teach you plenty.', 'Back in the day, we would say this.', 'There is an old saying that fits here.'],
    close: {
      praise: [['That is how it is done.', 'proud'], ['You cannot teach that kind of calm.', 'proud'], ['Beautifully judged, from start to finish.', 'proud']],
      knock: [['A seasoned head would not have played that shot.', 'serious'], ['They will want that one back, I promise you.', 'worried'], ['That is the price of losing your patience.', 'serious']],
      neutral: [['It is a long game yet.', 'thoughtful'], ['Do not read too much into it just yet.', 'thoughtful'], ['It will come down to who holds their nerve.', 'serious']],
      wow: [['Forty years in the game and I still get goosebumps.', 'shocked'], ['I will remember that for a long time.', 'proud'], ['They do not make them like that very often.', 'shocked']],
    },
    agree: ['Quite right.', 'I could not have put it better.', 'He is right, you know.', 'He has the right of it.', 'That is exactly how I remember it.'],
    disagree: ['I see it differently, young man.', 'Hold on, let us not get carried away.', 'I am afraid I have to disagree.', 'I would gently push back on that.', 'It was not quite like that, was it?'],
    think: ['Ah, now that is a good one.', 'Let me tell you something.', 'Well now, where to start.', 'Now, let me remember how it goes.', 'A fair question, and an old one.'],
  },
  jester: {
    lead: ['Ha, where do I start?', 'Oh, this is good.', 'Plot twist!', 'Fun fact for you.', 'Not to be dramatic, but listen.', 'Brace yourselves.', 'Okay, hot take incoming.', 'You are going to love this.'],
    close: {
      praise: [['Somebody check the bat for a motor!', 'laugh'], ['I would pay good money to watch that again, and I have.', 'laugh'], ['Absolute chef kiss.', 'excited']],
      knock: [['That was less a shot, more a cry for help.', 'laugh'], ['I have seen better planning at a surprise party.', 'sarcastic'], ['Bold strategy. Let us see if it pays off.', 'sarcastic']],
      neutral: [['I have no idea what happens next and I love it.', 'laugh'], ['It is cricket. Anything can happen. Mostly rain, in fairness.', 'laugh'], ['Keep the popcorn handy.', 'laugh']],
      wow: [['My jaw is on the floor. Somebody find it.', 'shocked'], ['That ball is still travelling.', 'laugh'], ['I need a lie down.', 'shocked']],
    },
    agree: ['Ha! Finally we agree on something.', 'Correct, and I have never said that before.', 'Yes! Put that on a poster.', 'Wow, same brain cell today.', 'We agree! Mark the calendar!'],
    disagree: ['Absolutely not, and I will fight you on it.', 'You have lost me completely.', 'Bold take. Wrong, but bold.', 'Nope. Not even a little. Next!', 'I admire the confidence. Wrong, but confident.'],
    think: ['Ooh, a hard one.', 'Let me put my serious face on.', 'I will try to be sensible.', 'Dramatic pause. Okay, go.', 'Give me a second, I am being clever.'],
  },
  tactician: {
    lead: ['The key was the plan.', 'Look at it tactically.', 'Think about the match-ups here.', 'What the captain did there was clever.', 'Look at the field settings.', 'It was all about the lengths they hit.', 'Read the situation first.', 'Think about the angles.'],
    close: {
      praise: [['Beautifully executed.', 'proud'], ['That is a plan coming off.', 'proud'], ['Textbook captaincy.', 'proud']],
      knock: [['The plan was not there, and it showed.', 'serious'], ['Where was the Plan B?', 'worried'], ['They were a step behind all innings.', 'serious']],
      neutral: [['It all depends on the first few overs of the next innings.', 'thoughtful'], ['The match-ups will decide it.', 'thoughtful'], ['Whoever adapts first wins this.', 'serious']],
      wow: [['That changes the whole game plan.', 'shocked'], ['Nobody planned for that.', 'shocked'], ['The captain will be tearing up the script.', 'excited']],
    },
    agree: ['Agreed, and the field placement shows it.', 'Right, that is the tactical read as well.', 'Yes. Same conclusion from the plan.', 'The match-ups say the same.', 'That fits the game plan I saw.'],
    disagree: ['The plan says otherwise.', 'I would have gone a different way entirely.', 'That is not how I read the match-up.', 'The field placings say otherwise.', 'That is not how the plan was set up.'],
    think: ['It is a tactical question really.', 'Right, take the plan first.', 'Good, let me set it out.', 'Right, tactically speaking.', 'Let me lay out the plan.'],
  },
}

const HOST_OPEN: Record<ShowKind, string[]> = {
  innings: [
    'Welcome back to the studio! The first innings is in the books and we have plenty to talk about.',
    'And we are back! {bat} have {score} on the board, and the chat starts right now.',
    'Hello again, everyone. The players are off, but the debate is only just beginning.',
    'Good to have you with us at the break. {bat}, {score}. Let us get into it.',
    'It is break time, which means it is our time. {bat} finish on {score}.',
    'The covers are off, the tea is brewing, and {bat} have {score}. Let us talk.',
    'Break time! {bat} posted {score}, and I have a feeling there is a lot to unpack.',
    'That is the first half done: {score} for {bat}. Our panel has opinions.',
  ],
  stumps: [
    'Stumps on the day, and what a day. {bat} are {score}. Let us dig in.',
    'That is the end of the day\'s play, and the studio is open. {bat}, {score}.',
    'Welcome back as the covers come on. {bat} lead the story at {score}.',
  ],
  end: [
    'And that is that! The match is over: {result}. We are live in the studio to make sense of it.',
    'Full time, everybody. {result}. Time to go through what just happened.',
    'What a match. {result}. Let us break it all down.',
    'The dust has settled: {result}. Our experts are with me.',
    'It is all over: {result}. Let us go through the key moments.',
    '{result}! And now the part where we argue about it.',
  ],
}
const HOST_PANEL = ['Joining me tonight: {a} and {b}.', 'With me, as always, {a} and {b}. Welcome, both of you.', 'Let me bring in the panel: {a} and {b}.', 'And of course, my experts, {a} and {b}.', 'Two familiar faces beside me: {a} and {b}.', 'The panel is ready: {a} and {b}. Let us get going.', 'Let me welcome {a} and {b} to the desk.']
const HOST_ASK: Record<string, string[]> = {
  bat: ['{a}, {bat} made {runs} off {balls}. What did you make of that?', '{a}, let us start with {bat}. {runs} from {balls}. Your thoughts?', 'First things first: {bat}. {a}, how good was that?', '{a}, the batting hero must be {bat}, surely?'],
  bowl: ['{a}, turn to the bowlers. {bowl} finished with {fig}. Was that the difference?', 'Now the other side of the coin: {bowl}, {fig}. {a}?', '{a}, what did you make of {bowl}\'s work with the ball?'],
  turning: ['{a}, there was a moment in there that changed things, wasn\'t there? The wicket of {bat}.', 'Let us go to the replay: {bowl} gets {bat}. {a}, how big was that?', '{a}, was that wicket of {bat} the turning point?'],
  collapse: ['{a}, that collapse: {n} wickets in {balls} balls. What on earth happened?', 'Let us talk about the slide: {n} down in just {balls} balls. {a}?', '{a}, it all fell apart in the middle: {n} wickets in a flash. Why?'],
  bigOver: ['{a}, over {over} went for {runs}. Did the whole mood change there?', 'Over {over}: {runs} runs. {a}, who blinked first?', '{a}, take me through that {runs}-run over, number {over}.'],
  six: ['{a}, we have to talk about the big one: {bat} sent it {dist} metres. Have you ever seen anything like it?', 'Let us look at that biggest hit again. {dist} metres, {a}. Unreal, no?', '{a}, {bat}, {dist} metres, out of the ground. Your reaction?'],
  stand: ['{a}, the stand between {p1} and {p2}: {runs} in {balls}. Was that the foundation?', 'The partnership of {p1} and {p2}, worth {runs}. {a}, was that the heart of it?', '{a}, {runs} together for {p1} and {p2}. How important was that?'],
  phase: ['{a}, the powerplay brought {pp} for the loss of {ppw}. Was that the right start?', 'Early overs, {pp} runs for {ppw}. {a}, did they get it right?', '{a}, how did you rate that start, {pp}/{ppw}?'],
  death: ['{a}, and the last overs: {dr} runs for {dw}. Did they finish well?', 'The finish, {a}: {dr} off the last {dov}. Strong or short?', '{a}, what did you make of the closing stretch, {dr} runs?'],
  outlook: ['{a}, what is a winning score here? And can {opp} get it?', 'So {a}, is {target} enough, or does {opp} fancy it?', '{a}, if you are {opp}, how do you feel about chasing {target}?'],
  outlookTest: ['{a}, where does that leave the match? {sit}.', 'So {a}, with the match standing as it does, who is on top?', '{a}, take us through the situation: {sit}.'],
  verdict: ['{a}, so what decided it?', '{a}, the big question: where was this match won?', 'Let us end on the main one, {a}: what was the difference?'],
  mom: ['And the man of the match: {mom}. {a}, does he deserve it?', '{mom} takes the award. {a}, right call?', 'The award goes to {mom}. {a}, any complaints?'],
  pitch: ['{a}, the pitch has been talked about all day: {pitch}. Did it shape this innings?', 'Let us talk about the surface, {a}. It looked {pitch}. Fair?', '{a}, how much did the {pitch} pitch decide this?', '{a}, the groundsman will be watching this: a {pitch} pitch. Your verdict?'],
  extras: ['{a}, {extras} extras in that innings. Is that sloppy?', 'Let us be honest about the discipline, {a}: {extras} extras given away. Costly?', '{a}, {extras} extras. Is that where the bowling side lost control?'],
  mix: ['{a}, {fours} fours and {sixes} sixes, but also {dots} dots. What did the scoring pattern tell you?', 'Look at the scoring mix, {a}: {dots} dot balls and {fours} fours. Who was dictating?', '{a}, {dots} dot balls in the innings. Did that pressure matter?'],
  fielding: ['{a}, we cannot ignore the fielding: {caught} catches taken. How big was that?', 'Let us hear it for the fielders, {a}: {caught} catches. Did they win it?', '{a}, the catching was sharp today, {caught} of them. Was that the edge?'],
  spin: ['{a}, {pace} wickets to pace and {spin} to spin. Which mattered more?', 'Pace or spin, {a}? The split was {pace} to {spin}.', '{a}, who ruled today: the quicks with {pace} or the spinners with {spin}?'],
  near: ['{a}, {nm} finished on {runs}. So close to {t}. Heartbreak?', 'We have to feel for {nm}: {runs}, and the {t} just out of reach. {a}?', '{a}, {nm} on {runs}. Does a miss like that sting?'],
  dressing: ['{a}, if you are in the {opp} dressing room right now, what is the talk?', 'Meanwhile at the other end, {a}: what is {opp} thinking about {target}?', '{a}, the {opp} openers are padding up. What do they need to do?'],
  danger: ['{a}, who is the danger man in the {opp} batting line-up?', 'Which {opp} batsman keeps {bat} awake tonight, {a}?', '{a}, name the one {opp} player who can win this chase.'],
  fun: ['{a}, a lighter question: if this innings were an episode, what is the title?', '{a}, quick fire: what would you call that innings in three words?', '{a}, if that was a battle in an anime, who is the final boss?'],
  loser: ['{a}, what went wrong for {loser}?', 'And for {loser}, {a}: where did it slip away?', '{a}, if you are the {loser} captain tonight, what keeps you up?'],
}
const HOST_WRAP: Record<ShowKind, string[]> = {
  innings: ['That is all from the break. Back to the action!', 'The players are walking out. Stay with us for the chase!', 'Time is up at the desk. Enjoy the second innings!', 'Thank you both. Do not go anywhere, the second half is about to begin!', 'Time to head back to the middle. See you at the next break!'],
  stumps: ['That is stumps in the studio too. We will see you tomorrow!', 'Thank you, panel. Get some rest, because tomorrow is huge.', 'That is the day done. Back tomorrow with more!'],
  end: ['That is a wrap. Thanks for watching, and goodnight!', 'And that is our show. A fine match, and we will see you next time!', 'Panel, thank you. Everyone at home: goodnight!', 'Gentlemen, thank you. And to everyone at home, until next time!', 'That is the show. Great match, great chat. Goodnight!'],
}

// ---- Writing --------------------------------------------------------------------------------------------------------

const fill = (t: string, v: Record<string, string | number>) => t.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ''))
const oversOf = (balls: number) => `${Math.floor(balls / 6)}.${balls % 6}`

function pickers(rng: Seeded) {
  const used = new Set<string>()
  const pick = <T,>(list: T[], key: (t: T) => string = (t) => String(t)): T => {
    const fresh = list.filter((t) => !used.has(key(t)))
    const from = fresh.length ? fresh : list
    const choice = from[rng.int(from.length)]
    used.add(key(choice))
    return choice
  }
  return { pick }
}

export function buildScript(match: Match, kind: ShowKind, seed: number, pool: Pundit[], extra?: { competition?: string; stage?: string }): Script {
  const rng = new Seeded(seed ^ hash(`${match.seed}|${kind}|${match.innings.length}`))
  const { pick } = pickers(rng)
  // the cast: three people from teams that are not playing, with a voice each
  const outsiders = pool.filter((p) => !match.sides.some((s) => s.team.id === p.team.id))
  const pickedCast: Pundit[] = []
  const order = [...(outsiders.length >= 3 ? outsiders : pool)]
  for (let i = order.length - 1; i > 0; i--) { const j = rng.int(i + 1); [order[i], order[j]] = [order[j], order[i]] }
  for (const p of order) { if (!pickedCast.some((c) => c.team.id === p.team.id) && pickedCast.length < 3) pickedCast.push(p) }
  for (const p of order) { if (pickedCast.length < 3 && !pickedCast.includes(p)) pickedCast.push(p) }
  const personas: Persona[] = ['analyst', 'firebrand', 'veteran', 'jester', 'tactician']
  for (let i = personas.length - 1; i > 0; i--) { const j = rng.int(i + 1); [personas[i], personas[j]] = [personas[j], personas[i]] }
  const cast = [
    { ...pickedCast[0], persona: 'host' as Persona },
    { ...pickedCast[1], persona: personas[0] },
    { ...pickedCast[2], persona: personas[1] },
  ] as [Cast, Cast, Cast]
  const name = (i: 0 | 1 | 2) => first(cast[i].player.name)
  const voice = (i: 1 | 2) => VOICES[cast[i].persona as Exclude<Persona, 'host'>]

  const idx = kind === 'end' ? match.innings.length - 1 : Math.max(0, match.current.done || kind === 'stumps' ? (kind === 'stumps' && !match.current.done ? match.current.index : match.current.index) : match.current.index - 1)
  const f = factsOf(match, Math.min(idx, match.innings.length - 1))
  const innScore = `${f.inn.runs}/${f.inn.wickets}`
  const beats: Beat[] = []
  const say = (who: 0 | 1 | 2, text: string, mood: Mood, clip?: Clip) => { beats.push({ who, text: text.replace(/\s+/g, ' ').trim(), mood, clip }) }

  const vars: Record<string, string | number> = {
    a: name(1), b: name(2), bat: f.bat.name, opp: f.bowl.name, score: innScore, result: match.result?.text ?? '', team: f.bat.name,
    target: f.inn.runs + 1,
  }
  const pn = (id: string) => first(match.player(id).name)

  /** An expert gives a take: a lead, the facts, and a close that fits how good (or bad) it was. */
  const take = (who: 1 | 2, facts: string, tone: Tone, clip?: Clip, withLead = true) => {
    const v = voice(who)
    const [close, mood] = pick(v.close[tone], (c) => c[0])
    const shape = rng.int(10)
    const lead = pick(v.lead)
    const text = shape < 4 && withLead ? `${lead} ${facts} ${close}` : shape < 7 ? `${facts} ${close}` : withLead ? `${lead} ${facts}` : facts
    say(who, text, shape >= 7 && withLead ? (tone === 'knock' ? 'serious' : tone === 'wow' ? 'excited' : 'thoughtful') : mood, clip)
  }
  /** The two experts nearly always agree; once in a while one of them takes the other on. */
  const agrees = () => !rng.chance(0.07)
  const react = (who: 1 | 2, agrees: boolean, target: 1 | 2) => {
    const v = voice(who)
    const line = pick(agrees ? v.agree : v.disagree)
    say(who, line.replace(/\{a\}/g, name(target)), agrees ? 'proud' : 'sarcastic')
  }
  /** The second expert answers the first: a reaction (agreeing or not), then his own point, in one go. */
  const counter = (who: 1 | 2, agrees: boolean, target: 1 | 2, facts: string, tone: Tone, clip?: Clip) => {
    const v = voice(who)
    const line = pick(agrees ? v.agree : v.disagree).replace(/\{a\}/g, name(target))
    const [close, mood] = pick(v.close[tone], (c) => c[0])
    say(who, rng.chance(0.6) ? `${line} ${facts} ${close}` : `${line} ${facts}`, agrees ? mood : tone === 'knock' ? 'serious' : 'sarcastic', clip)
  }
  const ask = (key: string, extraVars: Record<string, string | number>, clip?: Clip) => say(0, fill(pick(HOST_ASK[key]), { ...vars, ...extraVars }), 'thoughtful', clip)
  const answerPrefix = (who: 1 | 2) => rng.chance(0.55) ? `${pick(voice(who).think)} ` : ''

  // ---- the opening
  const resultClip: Clip = kind === 'end'
    ? { kind: 'card', title: 'FULL TIME', lines: [match.result?.text ?? '', ...match.innings.map((i) => `${match.sides[i.battingSide].team.short}  ${i.runs}/${i.wickets}  (${oversOf(i.legalBalls)} ov)`)] }
    : { kind: 'card', title: kind === 'stumps' ? `STUMPS · DAY ${match.clock?.day ?? ''}` : 'INNINGS BREAK', lines: [`${f.bat.short}  ${innScore}  (${oversOf(f.inn.legalBalls)} ov)`, `Run rate ${f.rr.toFixed(2)}`] }
  say(0, fill(pick(HOST_OPEN[kind]), vars), kind === 'end' ? 'excited' : 'proud', resultClip)
  say(0, fill(pick(HOST_PANEL), vars), 'proud')
  const greet = ['Thanks, {h}! Great to be here.', 'Pleasure as always, {h}.', 'Evening, {h}! Ready when you are.', 'Lovely to be back, {h}.']
  say(1, fill(pick(greet), { h: name(0) }), 'excited')
  say(2, pick(['And I have been looking forward to this one.', 'Let us have it, then!', 'Sleeves rolled up. Go on, {h}.', 'Always a pleasure, {h}.']).replace('{h}', name(0)), 'laugh')

  // ---- the segments (each is a question from the host and two takes)
  type Seg = { weight: number; order: number; run: () => void }
  const segs: Seg[] = []
  const exA = () => 1 as const
  const exB = () => 2 as const
  const alt = (): [1 | 2, 1 | 2] => (rng.chance(0.5) ? [1, 2] : [2, 1])
  const asked = (who: 1 | 2) => name(who)

  // the best batsman
  if (f.topBat && f.topBat.runs >= 15) {
    segs.push({ weight: 10, order: 2, run: () => {
      const t = f.topBat as BatFact
      const [x, y] = alt()
      vars.a = asked(x)
      const clip: Clip = t.runs >= 50 ? { kind: 'milestone', innings: f.idx, playerId: t.id } : t.balls >= 12 ? { kind: 'wagon', innings: f.idx, batsmanId: t.id } : { kind: 'scoring', innings: f.idx }
      ask('bat', { bat: pn(t.id), runs: t.runs, balls: t.balls }, clip)
      const style = t.sr >= 140 ? 'fast' : t.sr <= 75 ? 'slow' : 'steady'
      const fact = pick({
        fast: [`${pn(t.id)} made ${t.runs}${t.out ? '' : ' not out'} from ${t.balls} balls, ${t.fours} fours and ${t.sixes} sixes in there, a strike rate of ${t.sr}.`, `${t.runs} off ${t.balls}, and he never stopped looking for the boundary. ${t.fours}x4, ${t.sixes}x6.`, `At a strike rate of ${t.sr}, ${pn(t.id)} was always ahead of the game.`],
        slow: [`${pn(t.id)} ground out ${t.runs} from ${t.balls} balls at a strike rate of ${t.sr}.`, `${t.runs} from ${t.balls} balls: patient, and some would say a touch passive.`, `He held one end together with ${t.runs}, though it took ${t.balls} balls to do it.`],
        steady: [`${pn(t.id)} made ${t.runs} from ${t.balls}, ${t.fours} fours and ${t.sixes} sixes, a strike rate of ${t.sr}.`, `${t.runs} off ${t.balls} balls: no fireworks, just a solid, sensible innings.`, `That is ${pn(t.id)} for ${t.runs}${t.out ? '' : ', still there at the end'}, and the innings hung on him.`],
      }[style])
      take(x, answerPrefix(x) + fact, t.runs >= 50 || style === 'fast' ? 'praise' : style === 'slow' ? 'knock' : 'neutral', undefined, !answerPrefix(x))
      react(y, agrees(), x)
      const other = f.nextBat && f.nextBat.runs >= 15 ? f.nextBat : null
      take(y, other ? `For me, do not forget ${pn(other.id)} either: ${other.runs} off ${other.balls}. It was not a one-man show.` : `And for me the real story was how he handled the pressure at the other end.`, other ? 'neutral' : 'praise', other ? { kind: 'scoring', innings: f.idx } : undefined)
    } })
  }
  // the best bowler
  if (f.bestBowl && (f.bestBowl.wk >= 1 || f.bestBowl.balls >= 12)) {
    segs.push({ weight: 9, order: 3, run: () => {
      const t = f.bestBowl as BowlFact
      const [x, y] = alt()
      vars.a = asked(x)
      const fig = `${t.wk}/${t.runs} from ${oversOf(t.balls)}`
      const wkEv = f.inn.log.find((e) => e.wicket?.bowlerId === t.id)
      ask('bowl', { bowl: pn(t.id), fig }, wkEv ? { kind: 'wicket', seq: wkEv.seq } : { kind: 'worm', innings: f.idx })
      const good = t.wk >= 3 || t.econ <= 5.5
      const fact = pick(t.wk >= 3
        ? [`${pn(t.id)} took ${t.wk} for ${t.runs}. When he gets it right, it just looks unplayable.`, `${fig}: that is a spell that wins matches.`, `${t.wk} wickets and an economy of ${t.econ.toFixed(1)}. Superb stuff.`]
        : t.wk >= 1
          ? [`${pn(t.id)} finished with ${fig}, and he made them work for every run.`, `${t.wk} wicket${t.wk === 1 ? '' : 's'} for ${t.runs}, and he kept control all the way.`, `A tidy ${fig}: not spectacular, but it did the job.`]
          : [`${pn(t.id)} went wicketless but only conceded ${t.runs} from ${oversOf(t.balls)}. That is pressure.`, `Figures of ${fig}: no reward, and he deserved better.`, `He kept the runs down, ${t.econ.toFixed(1)} an over, even without a wicket.`])
      take(x, answerPrefix(x) + fact, t.wk >= 3 ? 'wow' : good ? 'praise' : 'neutral', undefined, !answerPrefix(x))
      react(y, agrees(), x)
      const bat = f.topBat
      take(y, bat ? `But for me it is ${pn(bat.id)} who set the tone, and the bowlers were reacting to him all innings.` : `I would also tip my cap to the fielding behind him.`, 'neutral')
    } })
  }
  // the turning point: a collapse, a big wicket, a monster over or a monster six
  const turningPoint = (): Seg | null => {
    if (f.collapse) return { weight: 12, order: 4, run: () => {
      const c = f.collapse as NonNullable<Facts['collapse']>
      const [x, y] = alt()
      vars.a = asked(x)
      const wk = f.inn.log.filter((e) => e.wicket && e.score.runs >= c.at)[0]
      ask('collapse', { n: c.wickets, balls: c.balls }, wk ? { kind: 'wicket', seq: wk.seq } : { kind: 'worm', innings: f.idx })
      take(x, answerPrefix(x) + `${c.wickets} wickets in ${c.balls} balls from ${c.at} is the kind of slide you cannot afford. Pressure just built and built.`, 'knock', { kind: 'worm', innings: f.idx }, !answerPrefix(x))
      counter(y, agrees(), x, `Credit to ${f.bowl.name} though. They found the right length at the right time and the batters had no answer.`, 'praise')
    } }
    if (f.turning) return { weight: 11, order: 4, run: () => {
      const t = f.turning as NonNullable<Facts['turning']>
      const [x, y] = alt()
      vars.a = asked(x)
      ask('turning', { bat: pn(t.ev.strikerId), bowl: pn(t.ev.bowlerId) }, { kind: 'wicket', seq: t.ev.seq })
      take(x, answerPrefix(x) + `${pn(t.ev.strikerId)} was set on ${t.runs} from ${t.balls}, and the moment he went, the whole mood of the innings changed.`, 'wow', undefined, !answerPrefix(x))
      counter(y, agrees(), x, `${pn(t.ev.bowlerId)} deserves the credit. He bided his time, and the breakthrough came exactly when it was needed.`, 'praise')
    } }
    if (f.bigOver && f.bigOver.runs >= (match.format === 't20' ? 16 : match.format === 'odi' ? 14 : 12)) return { weight: 8, order: 4, run: () => {
      const o = f.bigOver as NonNullable<Facts['bigOver']>
      const [x, y] = alt()
      vars.a = asked(x)
      ask('bigOver', { over: o.over, runs: o.runs }, { kind: 'manhattan', innings: f.idx })
      take(x, answerPrefix(x) + `${o.runs} off over ${o.over}. That is the over where the momentum swung, no question.`, 'wow', undefined, !answerPrefix(x))
      counter(y, agrees(), x, `The bowler just lost his length for six balls, and a good batting side punishes that every single time.`, 'knock')
    } }
    if (f.longestSix && (f.longestSix.distance ?? 0) >= 85) return { weight: 4 + 3, order: 4, run: () => {
      const s = f.longestSix as BallEvent
      const [x, y] = alt()
      vars.a = asked(x)
      const d = s.distance ?? 0
      ask('six', { bat: pn(s.strikerId), dist: d }, { kind: 'six', seq: s.seq })
      take(x, answerPrefix(x) + `${d} metres! ${d >= 150 ? 'That is outside the ground and into the next postcode.' : 'That landed somewhere near the car park.'}`, 'wow', undefined, !answerPrefix(x))
      counter(y, true, x, `And there was nothing the bowler could do about it. He bowled it right, and it did not matter.`, 'praise')
    } }
    return null
  }
  const tp = turningPoint()
  if (tp) segs.push(tp)
  // a big stand
  if (f.stand && f.stand.runs >= (match.format === 'test' ? 90 : 40)) segs.push({ weight: 6, order: 5, run: () => {
    const s = f.stand as NonNullable<Facts['stand']>
    const [x, y] = alt()
    vars.a = asked(x)
    ask('stand', { p1: pn(s.a), p2: pn(s.b), runs: s.runs, balls: s.balls }, { kind: 'manhattan', innings: f.idx })
    take(x, answerPrefix(x) + `${s.runs} off ${s.balls} balls together. That stand took the game away from them.`, 'praise', undefined, !answerPrefix(x))
    counter(y, agrees(), x, `Neither man took a backward step, and the running between the wickets was superb.`, 'praise')
  } })
  // phases (limited-overs): the start and the finish
  if (f.powerplay && match.format !== 'test') segs.push({ weight: 5, order: 1, run: () => {
    const p = f.powerplay as NonNullable<Facts['powerplay']>
    const [x, y] = alt()
    vars.a = asked(x)
    ask('phase', { pp: p.runs, ppw: p.wickets }, { kind: 'scoring', innings: f.idx })
    const par = parRunsPerOver(match.format, 'powerplay') * p.overs
    const good = p.runs >= par * 1.1 && p.wickets <= 1
    take(x, answerPrefix(x) + `${p.runs} for ${p.wickets} in the first ${p.overs} overs, ${good ? 'above' : p.runs < par * 0.9 ? 'well below' : 'around'} what you would expect on this surface.`, good ? 'praise' : p.runs < par * 0.9 ? 'knock' : 'neutral', undefined, !answerPrefix(x))
    counter(y, agrees(), x, p.wickets >= 2 ? `Losing ${p.wickets} early meant they were always rebuilding.` : `A good platform, and the batters did not have to take risks to build it.`, p.wickets >= 2 ? 'knock' : 'praise')
  } })
  if (f.death && match.format !== 'test') segs.push({ weight: 5, order: 6, run: () => {
    const d = f.death as NonNullable<Facts['death']>
    const [x, y] = alt()
    vars.a = asked(x)
    ask('death', { dr: d.runs, dw: d.wickets, dov: `${d.overs} overs` }, { kind: 'manhattan', innings: f.idx })
    const par = parRunsPerOver(match.format, 'death') * d.overs
    take(x, answerPrefix(x) + `${d.runs} runs for ${d.wickets} in the last ${d.overs} overs ${d.runs >= par * 1.05 ? 'is a strong finish' : 'is a bit short of what they wanted'}.`, d.runs >= par * 1.05 ? 'praise' : 'knock', undefined, !answerPrefix(x))
    counter(y, agrees(), x, `The death bowling decides so many games, and tonight it was ${d.runs >= par * 1.05 ? 'the batters on top' : 'the bowlers on top'}.`, 'neutral')
  } })
  // ---- more topics, so the show is not always the same four things
  const parMid = parRunsPerOver(match.format, 'middle')
  const pitchInfo = describePitch(match.pitch)
  segs.push({ weight: 7, order: 2, run: () => {
    const [x, y] = alt()
    vars.a = asked(x)
    ask('pitch', { pitch: pitchInfo.label.toLowerCase() }, { kind: 'card', title: pitchInfo.label.toUpperCase(), lines: [pitchInfo.tip] })
    take(x, answerPrefix(x) + `${pitchInfo.tip} ${f.rr > parMid * 1.05 ? 'And the scoring rate showed it.' : f.rr < parMid * 0.9 ? 'And runs were hard to come by, just as you would expect.' : 'The scoring rate sat about where you would expect.'}`, 'neutral', undefined, !answerPrefix(x))
    counter(y, agrees(), x, `${f.bat.short} scored at ${f.rr.toFixed(2)} an over, and a surface like this makes you earn every one of them.`, 'neutral')
  } })
  if (f.extras >= 7) segs.push({ weight: 5, order: 6, run: () => {
    const [x, y] = alt()
    vars.a = asked(x)
    ask('extras', { extras: f.extras }, { kind: 'card', title: 'EXTRAS', lines: [`${f.extras} extras`, `${f.inn.extras.wides} wides · ${f.inn.extras.noballs} no-balls`] })
    take(x, answerPrefix(x) + `${f.extras} extras is a gift. ${f.inn.extras.wides} wides and ${f.inn.extras.noballs} no-balls: that is free runs and lost rhythm.`, 'knock', undefined, !answerPrefix(x))
    counter(y, agrees(), x, `Discipline wins limited-overs games, and ${f.bowl.name} let it slip more than once.`, 'knock')
  } })
  if (f.legal >= 30) segs.push({ weight: 5, order: 5, run: () => {
    const [x, y] = alt()
    vars.a = asked(x)
    const dotPct = Math.round((f.dots / Math.max(1, f.legal)) * 100)
    ask('mix', { fours: f.fours, sixes: f.sixes, dots: f.dots }, { kind: 'scoring', innings: f.idx })
    take(x, answerPrefix(x) + (dotPct >= 42 ? `${dotPct}% of the balls were dots. That is a lot of pressure for ${f.bat.short} to carry.` : dotPct <= 30 ? `Only ${dotPct}% dots: ${f.bat.short} kept the scoreboard ticking at nearly every ball.` : `${dotPct}% dots and ${f.fours + f.sixes} boundaries: a healthy mix of patience and punch.`), dotPct >= 42 ? 'knock' : 'praise', undefined, !answerPrefix(x))
    counter(y, agrees(), x, `${f.sixes >= 5 ? `${f.sixes} sixes tell you who was in charge of the big moments.` : `The boundary count was modest, so the singles and twos did the work.`}`, 'neutral')
  } })
  if (f.caught >= 3 || f.runOuts >= 1) segs.push({ weight: 4, order: 7, run: () => {
    const [x, y] = alt()
    vars.a = asked(x)
    ask('fielding', { caught: f.caught }, { kind: 'card', title: 'FIELDING', lines: [`${f.caught} catches`, f.runOuts ? `${f.runOuts} run ${f.runOuts === 1 ? 'out' : 'outs'}` : ''] })
    take(x, answerPrefix(x) + `${f.caught} catches taken${f.runOuts ? ` and ${f.runOuts === 1 ? 'a run out' : f.runOuts + ' run outs'}` : ''}. ${f.bowl.name} held on to what came their way, and that is worth runs.`, 'praise', undefined, !answerPrefix(x))
    counter(y, agrees(), x, `Catches win matches, and the pressure the bowlers built made the batters take the risk.`, 'neutral')
  } })
  if (f.paceWk + f.spinWk >= 2 && (f.paceWk === 0 || f.spinWk === 0 ? f.paceWk + f.spinWk >= 3 : true)) segs.push({ weight: 4, order: 4, run: () => {
    const [x, y] = alt()
    vars.a = asked(x)
    ask('spin', { pace: f.paceWk, spin: f.spinWk })
    const spinWins = f.spinWk > f.paceWk
    take(x, answerPrefix(x) + (spinWins ? `Spin had the better of it, ${f.spinWk} to ${f.paceWk}. The ball was gripping and the batters had to be patient.` : f.paceWk > f.spinWk ? `The quicks took ${f.paceWk} of them against ${f.spinWk} for the spinners. Pace and bounce made the difference.` : `It was even, ${f.paceWk} for pace and ${f.spinWk} for spin. A varied attack did the job.`), 'neutral', undefined, !answerPrefix(x))
    counter(y, agrees(), x, `${pitchInfo.kind === 'dry' ? 'The dry surface did a lot of that work.' : pitchInfo.kind === 'green' ? 'There was seam on offer all innings.' : 'The captain rotated the bowlers smartly, and it paid off.'}`, 'neutral')
  } })
  if (f.nearMiss) segs.push({ weight: 6, order: 2, run: () => {
    const m = f.nearMiss as NonNullable<Facts['nearMiss']>
    const [x, y] = alt()
    vars.a = asked(x)
    ask('near', { nm: pn(m.id), runs: m.runs, t: m.target })
    take(x, answerPrefix(x) + (m.out ? `${m.runs}, out, with ${m.target} just there. That is the kind of dismissal that stays with you for a week.` : `${m.runs} not out and the innings ran out. Nobody wants to be stranded that close to ${m.target}.`), 'knock', undefined, !answerPrefix(x))
    counter(y, agrees(), x, `He did everything right except finish it, and that is cricket for you.`, 'neutral')
  } })
  if (kind !== 'end' && match.format !== 'test') {
    const chasers = match.sides[1 - f.inn.battingSide].xi
    const openers = chasers.slice(0, 2)
    const danger = [...chasers].sort((p, q) => battingScore(q.batting) - battingScore(p.batting))[0]
    segs.push({ weight: 8, order: 8, run: () => {
      const [x, y] = alt()
      vars.a = asked(x)
      ask('dressing', {}, { kind: 'card', title: 'THE CHASE', lines: [`${f.bowl.short} need ${f.inn.runs + 1}`, `Openers: ${openers.map((o) => first(o.name)).join(' and ')}`] })
      take(x, answerPrefix(x) + `${openers.map((o) => first(o.name)).join(' and ')} walk out knowing the first six overs decide the tone. A fast start and ${f.bat.short} start to worry.`, 'neutral', undefined, !answerPrefix(x))
      counter(y, agrees(), x, `Stay calm, rotate the strike and let the target come to you. Panic is the real enemy in a chase.`, 'neutral')
    } })
    segs.push({ weight: 6, order: 8, run: () => {
      const [x, y] = alt()
      vars.a = asked(x)
      ask('danger', {})
      take(x, answerPrefix(x) + `${first(danger.name)} is the one for me. If he gets in, ${f.bat.short} are in trouble.`, 'praise', undefined, !answerPrefix(x))
      counter(y, agrees(), x, `${f.bat.short} will have a plan for him, but plans have a way of bending when a good player is set.`, 'neutral')
    } })
  }
  const FUN = [
    ['Episode title: "The Innings That Would Not End".', 'Final boss is clearly the groundsman.'],
    ['Three words: chaos, then calm.', 'I would have gone with "popcorn, please".'],
    ['I would call it "Training Arc, Part Two".', 'Does that make the next innings the tournament arc?'],
    ['Title: "Nobody Expected That Over".', 'And the opening theme starts around the sixth over.'],
  ]
  segs.push({ weight: 3, order: 3, run: () => {
    const [x, y] = alt()
    vars.a = asked(x)
    ask('fun', {})
    const [l1, l2] = pick(FUN, (t) => t[0])
    say(x, l1, 'laugh')
    say(y, l2, 'laugh')
  } })
  if (kind === 'end' && match.result?.margin) {
    const mg = match.result.margin
    const close = mg.type === 'runs' ? mg.value <= 6 : mg.value <= 2
    const big = mg.type === 'runs' ? mg.value >= 40 : mg.value >= 7
    if (close || big) segs.push({ weight: 9, order: 2, run: () => {
      const [x, y] = alt()
      vars.a = asked(x)
      ask('verdict', {}, { kind: 'card', title: close ? 'A THRILLER' : 'A ROMP', lines: [match.result?.text ?? ''] })
      take(x, answerPrefix(x) + (close ? `Decided by ${mg.value} ${mg.type === 'runs' ? (mg.value === 1 ? 'run' : 'runs') : (mg.value === 1 ? 'wicket' : 'wickets')}. That is as close as it gets, and my heart rate is still up.` : `${mg.value} ${mg.type === 'runs' ? 'runs' : 'wickets'}: that was never close. One side turned up and the other did not.`), close ? 'wow' : 'knock', undefined, !answerPrefix(x))
      counter(y, agrees(), x, close ? `A match like that makes the whole season worth it.` : `Credit to the winners, who made it look easy.`, 'neutral')
    } })
  }

  // what happens next (innings and stumps), or what decided it (end)
  const cfg = FORMATS[match.format]
  const parTotal = parRunsPerOver(match.format, 'middle') * cfg.overs
  if (kind !== 'end') segs.push({ weight: 20, order: 9, run: () => {
    const [x, y] = alt()
    vars.a = asked(x)
    if (match.format === 'test') {
      const lead = match.innings.filter((i) => i.battingSide === f.inn.battingSide).reduce((s, i) => s + i.runs, 0) - match.innings.filter((i) => i.battingSide !== f.inn.battingSide).reduce((s, i) => s + i.runs, 0)
      const sit = match.innings.length === 1 ? `${f.bat.short} ${innScore}` : lead >= 0 ? `${f.bat.short} lead by ${lead}` : `${f.bat.short} trail by ${-lead}`
      ask('outlookTest', { sit }, { kind: 'worm', innings: f.idx })
      take(x, answerPrefix(x) + (lead >= 150 ? `A lead like that puts the pressure straight back on ${f.bowl.name}. The question is how fast they can score.` : lead < -50 ? `${f.bowl.name} are the ones with the upper hand right now, and ${f.bat.short} have work to do.` : `It is nicely poised, and the next session will decide who gets ahead.`), lead >= 150 ? 'praise' : lead < -50 ? 'knock' : 'neutral', undefined, !answerPrefix(x))
      counter(y, agrees(), x, `${match.oversLeftExpected > 0 ? `With around ${match.oversLeftExpected} overs left in the match` : 'With the clock running'}, a draw is not out of the question either.`, 'neutral')
      return
    }
    const above = f.inn.runs >= parTotal * 1.05, below = f.inn.runs < parTotal * 0.93
    ask('outlook', { target: f.inn.runs + 1 }, { kind: 'worm', innings: f.idx })
    take(x, answerPrefix(x) + (above ? `${f.inn.runs} is above par here. ${f.bowl.name} will need something special to get close.` : below ? `${f.inn.runs} feels light. ${f.bowl.name} will fancy their chances with the bat.` : `It is a competitive total, a few either side of par. It is a proper contest.`), above ? 'praise' : below ? 'knock' : 'neutral', undefined, !answerPrefix(x))
    counter(y, agrees(), x, `${f.bowl.name} need to be at ${((f.inn.runs + 1) / cfg.overs).toFixed(2)} an over, and early wickets will decide whether they can keep that up.`, 'neutral', { kind: 'card', title: 'THE TARGET', lines: [`${f.bowl.short} need ${f.inn.runs + 1}`, `${((f.inn.runs + 1) / cfg.overs).toFixed(2)} runs an over`] })
  } })
  if (kind === 'end') {
    const winner = match.result?.winnerSide ?? null
    const wTeam = winner !== null ? match.sides[winner].team : null
    const lTeam = winner !== null ? match.sides[1 - winner].team : null
    segs.push({ weight: 30, order: 1, run: () => {
      const [x, y] = alt()
      vars.a = asked(x)
      ask('verdict', {}, { kind: 'worm', innings: Math.min(1, match.innings.length - 1) })
      const why = wTeam ? (f.collapse ? `${f.bat.short} collapsed, ${f.collapse.wickets} wickets in ${f.collapse.balls} balls, and ${wTeam.name} took full advantage.` : match.result?.margin?.type === 'wickets' ? `${wTeam.name} controlled the chase from the start and never looked in trouble.` : `${wTeam.name} simply handled the big moments better.`) : match.result?.draw ? `Neither side could force it, and the clock ran out. Respect to both for the effort.` : `It came right down to the wire, and nobody blinked.`
      take(x, answerPrefix(x) + why, wTeam ? 'praise' : 'neutral', undefined, !answerPrefix(x))
      counter(y, agrees(), x, wTeam ? `For me it was the discipline with the ball and the nerve at the end. That is what wins you matches.` : `A match like that is why we love this game.`, 'neutral')
    } })
    const awards = computeAwards(match)
    const mom = awards.motm
    if (mom) segs.push({ weight: 25, order: 3, run: () => {
      const [x, y] = alt()
      vars.a = asked(x)
      const p = match.player(mom.id)
      const batLine = match.innings.flatMap((i) => i.batters).filter((b) => b.id === mom.id).sort((a, b) => b.runs - a.runs)[0]
      const bowlLine = match.innings.flatMap((i) => [...i.bowlers.values()]).filter((b) => b.id === mom.id).sort((a, b) => b.wickets - a.wickets)[0]
      const clip: Clip = batLine && batLine.runs >= 50 ? { kind: 'milestone', innings: match.innings.findIndex((i) => i.batters.some((b) => b === batLine)), playerId: mom.id } : { kind: 'card', title: 'MAN OF THE MATCH', lines: [p.name, mom.line] }
      ask('mom', { mom: first(p.name) }, clip)
      take(x, answerPrefix(x) + (mom.line ? `${first(p.name)}: ${mom.line}. Every time the match needed something, he delivered.` : `${first(p.name)} was in the middle of everything.`), 'praise', { kind: 'card', title: 'MAN OF THE MATCH', lines: [p.name, mom.line] }, !answerPrefix(x))
      react(y, agrees(), x)
      void bowlLine
      take(y, `And that is the fun of it: a performance like that gets the whole team believing.`, 'praise')
    } })
    if (lTeam) segs.push({ weight: 18, order: 4, run: () => {
      const [x, y] = alt()
      vars.a = asked(x)
      const last = match.innings.filter((i) => i.battingSide !== winner).pop() ?? f.inn
      ask('loser', { loser: lTeam.name }, { kind: 'manhattan', innings: last.index })
      take(x, answerPrefix(x) + `${lTeam.name} had their chances. They just could not string enough good overs together when it counted.`, 'knock', undefined, !answerPrefix(x))
      counter(y, agrees(), x, `There is plenty to take away, though. They will be back, and they will be dangerous.`, 'neutral')
    } })
  }

  // order: the openers first (best batsman or bowler), the turning point in the middle, the outlook last; keep 3-4 segments
  const chosen: Seg[] = []
  const rest = [...segs].sort((a, b) => b.weight - a.weight + (rng.next() - 0.5) * 12)
  const last = kind === 'end' ? undefined : segs.find((s) => s.weight >= 20)
  for (const s of rest) if (chosen.length < (kind === 'end' ? 4 : 4) && s !== last) chosen.push(s)
  chosen.sort((a, b) => a.weight - b.weight)
  if (last) chosen.push(last)
  for (const s of chosen) s.run()

  // ---- the sign-off
  const farewell = pick(HOST_WRAP[kind])
  say(0, farewell, 'proud', { kind: 'card', title: kind === 'end' ? 'FULL TIME' : kind === 'stumps' ? 'STUMPS' : 'BACK TO THE MIDDLE', lines: extra?.competition ? [extra.competition, extra.stage ?? ''] : [] })
  void exA; void exB
  return { cast, beats, title: kind === 'end' ? 'The Post-Match Show' : kind === 'stumps' ? 'Stumps Show' : 'The Innings Break Show' }
}

/**
 * Four short lines from the commentary box for the quiet moment at the end of an over: the play-by-play man says where things stand and the
 * expert reads the mood, twice. Picked from the live state of the innings, so it is about this match and not a stock line.
 */
export function boxChat(match: Match, seed: number): string[] {
  const rng = new Seeded(seed ^ 0x9e3779b1)
  const inn = match.current
  const bat = match.sides[inn.battingSide].team
  const bowl = match.sides[1 - inn.battingSide].team
  const overs = oversOf(inn.legalBalls)
  const rr = inn.legalBalls ? (inn.runs / inn.legalBalls) * 6 : 0
  const par = parRunsPerOver(match.format, 'middle')
  const striker = match.player(inn.strikerId)
  const sLine = inn.batters.find((b) => b.id === inn.strikerId)
  const bLine = inn.bowlerId ? inn.bowlers.get(inn.bowlerId) : undefined
  const pbp: string[] = [
    `${bat.short} are ${inn.runs}/${inn.wickets} after ${overs} overs, scoring at ${rr.toFixed(2)} an over.`,
    sLine && sLine.balls > 3 ? `${first(striker.name)} is on ${sLine.runs} from ${sLine.balls} balls now.` : `${first(striker.name)} is the man on strike.`,
    bLine && inn.bowlerId && bLine.legalBalls > 5 ? `${first(match.player(inn.bowlerId).name)} has ${bLine.wickets} for ${bLine.runs} from ${oversOf(bLine.legalBalls)}.` : `${bowl.short} will want a wicket soon.`,
    inn.target !== null ? `${Math.max(0, inn.target - inn.runs)} more needed, and ${bat.short} have ${10 - inn.wickets} wickets in hand.` : `${bat.short} have ${10 - inn.wickets} wickets in hand with the innings going on.`,
  ]
  const good = rr > par * 1.05 && inn.wickets <= 3
  const poor = rr < par * 0.85 || inn.wickets >= 6
  const colour = good
    ? ['The batters look completely at ease out there.', 'I love the intent from this side, they are taking the game on.', 'That is smart cricket: busy at the crease, punishing the bad ball.', 'The bowlers are being made to work hard for everything.']
    : poor
      ? ['The bowlers are on top at the moment, no doubt about it.', 'They need to rebuild here and soak up some pressure.', 'It has been a bit of a grind for the batting side.', 'Every dot ball is adding to the pressure right now.']
      : ['It is all in the balance at the moment.', 'Really good contest. Neither side is giving an inch.', 'This is the phase where the game quietly moves one way or the other.', 'A fascinating battle between bat and ball out there.']
  const a = [...pbp]; const b = [...colour]
  const lines: string[] = []
  for (let i = 0; i < 2; i++) {
    lines.push(a.splice(rng.int(a.length), 1)[0])
    lines.push(b.splice(rng.int(b.length), 1)[0])
  }
  return lines
}