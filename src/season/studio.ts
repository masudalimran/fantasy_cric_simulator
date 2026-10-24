import { computeAwards } from '../engine/awards'
import type { Match } from '../engine/match'
import { parRunsPerOver } from '../engine/model'
import type { BatterLine, BowlerLine } from '../engine/types'
import { PRESENTERS, type Presenter } from '../data/presenters'
import type { PlayerForm } from './stats'
import { gradeBat, gradeBowl, type Grade } from './grade'

/**
 * The studio show between innings and at the end of a match: a highlight recap for someone who did not watch. The host opens, then the two
 * experts go through the batsmen from the top of the order down and then the bowlers, with the TV showing each one's figures. How they
 * talk about a player depends on his grade (see grade.ts): a shrug for a poor game, a slight nod for an average one, and for a good one the
 * wagon wheel or the replay comes up. This file only writes the script: it is pure and seeded, so the same match gives the same show.
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
  /** A player's figures for the innings, with the grade the show gave him. */
  | { kind: 'stat'; innings: number; playerId: string; as: 'bat' | 'bowl'; grade: Grade }

export interface Beat { who: 0 | 1 | 2; text: string; mood: Mood; clip?: Clip }
/** Who is on the desk: one of the show's own presenters (see data/presenters.ts), and the voice she plays. */
export interface Cast { presenter: Presenter; persona: Persona }
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

// ---- Words ----------------------------------------------------------------------------------------------------------

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
const HOST_WRAP: Record<ShowKind, string[]> = {
  innings: ['That is all from the break. Back to the action!', 'The players are walking out. Stay with us for the chase!', 'Time is up at the desk. Enjoy the second innings!', 'Thank you both. Do not go anywhere, the second half is about to begin!', 'Time to head back to the middle. See you at the next break!'],
  stumps: ['That is stumps in the studio too. We will see you tomorrow!', 'Thank you, panel. Get some rest, because tomorrow is huge.', 'That is the day done. Back tomorrow with more!'],
  end: ['That is a wrap. Thanks for watching, and goodnight!', 'And that is our show. A fine match, and we will see you next time!', 'Panel, thank you. Everyone at home: goodnight!', 'Gentlemen, thank you. And to everyone at home, until next time!', 'That is the show. Great match, great chat. Goodnight!'],
}

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

const BAT_SAY: Record<Grade, string[]> = {
  worse: [
    '{n} had a game to forget: {line}. A really disappointing outing.',
    'How disappointing for {n}. {line}, and nothing to show for it.',
    'Hard to be kind here. {n}, {line}. He will want to forget this one.',
    'A poor, poor game from {n}: {line}. Very disappointing.',
  ],
  bad: [
    '{n} did not get to do much this game: {line}.',
    'Not a lot from {n}, {line}. He never really got going.',
    '{n} was quiet today, {line}.',
    'A short stay for {n}, {line}. Not his day.',
  ],
  average: [
    '{n} put in a slight contribution, {line}.',
    'A small but useful knock from {n}: {line}. Nothing special, but it helped.',
    '{n} chipped in with {line}. A modest effort.',
    'Steady enough from {n}, {line}. Every run counts.',
  ],
  good: [
    'A good knock from {n}: {line}. Let us see where the runs came from.',
    '{n} played well, {line}. Here is how he scored.',
    'Well played, {n}! {line}. Look at his scoring zones.',
    'That is a proper innings from {n}, {line}. The wagon wheel shows the story.',
  ],
  exceptional: [
    'What an innings from {n}! {line}. That is the knock of the match.',
    'Superb from {n}, {line}. He was in a different class today.',
    '{n} was outstanding: {line}. A true match-shaping innings.',
    'Take a bow, {n}! {line}. That was special.',
  ],
}
const BAT_FOLLOW: Record<'good' | 'exceptional', string[]> = {
  good: ['Great shot selection there, and the bowlers could not stop him finding gaps.', 'It is a lovely spread of shots, all around the ground.', 'He picked his moments well and kept the board moving.'],
  exceptional: ['And that is why he is the one the bowlers will remember tonight.', 'You rarely see someone control an innings like that.', 'Class from start to finish. The crowd was on its feet.'],
}
const BOWL_SAY: Record<Grade, string[]> = {
  worse: [
    '{n} had a rough day: {line}. A really disappointing spell.',
    'It just did not work for {n}, {line}. Very disappointing.',
    'A tough one for {n}: {line}. The batsmen took him apart.',
  ],
  bad: [
    '{n} did not get much going, {line}. Expensive.',
    'Not his day, {n}: {line}. He was a little too easy to score off.',
    '{n} leaked a few too many: {line}.',
  ],
  average: [
    '{n} did a steady job, {line}. A slight contribution.',
    'Nothing fancy from {n}, {line}, but he held up his end.',
    '{n} was fairly tidy, {line}.',
  ],
  good: [
    '{n} bowled well: {line}. Take a look at his work.',
    'A strong spell from {n}, {line}. He kept the batsmen quiet.',
    'Good bowling from {n}, {line}. He made things happen.',
  ],
  exceptional: [
    'Brilliant from {n}! {line}. That is a match-winning spell.',
    '{n} was outstanding with the ball: {line}. Unplayable at times.',
    'What a spell by {n}, {line}. The batsmen had no answer.',
  ],
}
const BOWL_FOLLOW: string[] = ['And here is the wicket that started it.', 'Watch this one: the breakthrough he gave his side.', 'Here is the replay of the big wicket.']

const MOOD_OF: Record<Grade, Mood> = { worse: 'worried', bad: 'serious', average: 'thoughtful', good: 'proud', exceptional: 'excited' }

export function buildScript(match: Match, kind: ShowKind, seed: number, extra?: { competition?: string; stage?: string; form?: (playerId: string) => PlayerForm | null }): Script {
  const rng = new Seeded(seed ^ hash(`${match.seed}|${kind}|${match.innings.length}`))
  const { pick } = pickers(rng)
  // the cast: three of the show's presenters (a different three from one match to the next), with a voice each
  const order = [...PRESENTERS]
  for (let i = order.length - 1; i > 0; i--) { const j = rng.int(i + 1); [order[i], order[j]] = [order[j], order[i]] }
  const pickedCast = order.slice(0, 3)
  const personas: Persona[] = ['analyst', 'firebrand', 'veteran', 'jester', 'tactician']
  for (let i = personas.length - 1; i > 0; i--) { const j = rng.int(i + 1); [personas[i], personas[j]] = [personas[j], personas[i]] }
  const cast = [
    { presenter: pickedCast[0], persona: 'host' as Persona },
    { presenter: pickedCast[1], persona: personas[0] },
    { presenter: pickedCast[2], persona: personas[1] },
  ] as [Cast, Cast, Cast]
  const name = (i: 0 | 1 | 2) => first(cast[i].presenter.name)
  const beats: Beat[] = []
  const say = (who: 0 | 1 | 2, text: string, mood: Mood, clip?: Clip) => { beats.push({ who, text: text.replace(/\s+/g, ' ').trim(), mood, clip }) }
  const pn = (id: string) => first(match.player(id).name)
  const par = parRunsPerOver(match.format, 'middle')

  /** For a very good or very bad game: how it compares with his season so far and his earlier years in the career. */
  const formBeat = (w: 1 | 2, id: string, as: 'bat' | 'bowl', g: Grade, today: string) => {
    const f = extra?.form?.(id)
    if (!f) return
    const good = g === 'exceptional'
    const lines = [match.player(id).name]
    const bits: string[] = []
    if (as === 'bat') {
      const se = f.bat && f.bat.innings >= 2 ? f.bat : null
      const pa = f.past?.bat
      if (se) { lines.push(`This year: ${se.runs} runs in ${se.innings} innings, avg ${se.average !== null ? se.average.toFixed(1) : '-'}`); lines.push(`Last scores: ${se.recent.join('  ')}`); bits.push(`this season he has ${se.runs} runs${se.average !== null ? ` at ${se.average.toFixed(1)}` : ''}, with ${se.recent.join(', ')} his last scores`) }
      if (pa) { lines.push(`Earlier years: ${pa.runs} runs, avg ${pa.average !== null ? pa.average.toFixed(1) : '-'}, best ${pa.high}`); bits.push(`over ${f.past!.years} earlier ${f.past!.years === 1 ? 'year' : 'years'} he has ${pa.runs} runs${pa.hundreds + pa.fifties ? `, ${pa.hundreds} hundreds and ${pa.fifties} fifties` : ''}`) }
    } else {
      const se = f.bowl && f.bowl.matches >= 2 ? f.bowl : null
      const pa = f.past?.bowl
      if (se) { lines.push(`This year: ${se.wickets} wickets in ${se.matches} matches${se.economy !== null ? `, econ ${se.economy.toFixed(1)}` : ''}`); lines.push(`Recent: ${se.recent.join('  ')}`); bits.push(`this season he has ${se.wickets} wickets, his recent figures ${se.recent.join(', ')}`) }
      if (pa) { lines.push(`Earlier years: ${pa.wickets} wickets, best ${pa.bestW}/${pa.bestR}`); bits.push(`across ${f.past!.years} earlier ${f.past!.years === 1 ? 'year' : 'years'} he took ${pa.wickets} wickets`) }
    }
    if (!bits.length) return
    lines.push(`Today: ${today}`)
    const name = first(match.player(id).name)
    say(w, `${good ? `For the record, ${name}'s day was a big step up:` : `That is unusual for ${name}:`} ${bits.join('; ')}. ${good ? 'Well above his usual.' : 'A blip, surely.'}`, 'thoughtful', { kind: 'card', title: 'FORM GUIDE', lines })
  }

  // which innings to go through: the one just finished, or (after the match) all of them
  const last = kind === 'end' ? match.innings.length - 1 : Math.max(0, match.current.done || kind === 'stumps' ? match.current.index : match.current.index - 1)
  // the show covers the innings that has just been played: the first at the break, the last one after the match
  const indices = [Math.min(last, match.innings.length - 1)]
  const first0 = match.innings[indices[0]]
  const teamOf = (i: number) => match.sides[match.innings[i].battingSide].team
  const vars: Record<string, string | number> = { a: name(1), b: name(2), bat: teamOf(indices[0]).name, score: `${first0.runs}/${first0.wickets}`, result: match.result?.text ?? '' }

  // ---- the host opens
  say(0, fill(pick(HOST_OPEN[kind]), vars), 'excited', { kind: 'card', title: kind === 'end' ? 'FULL TIME' : 'THE RECAP', lines: [match.result?.text ?? `${teamOf(indices[0]).short} ${first0.runs}/${first0.wickets}`, 'Every batsman, every bowler'] })
  say(0, fill(pick(HOST_PANEL), vars), 'proud')

  let turn = 0
  const who = (): 1 | 2 => ((turn++ % 2) + 1) as 1 | 2
  const other = (w: 1 | 2): 1 | 2 => (w === 1 ? 2 : 1)

  for (const ii of indices) {
    const inn = match.innings[ii]
    const batTeam = teamOf(ii)
    const bowlTeam = match.sides[1 - inn.battingSide].team
    const fmt = match.format === 'test' ? 'test' : match.format === 'odi' ? 'odi' : 't20'
    if (ii > 0) say(0, `Let us look back at ${batTeam.name}'s innings: ${inn.runs}/${inn.wickets}. We will start with the batsmen, from the top.`, 'serious', { kind: 'worm', innings: ii })
    else say(0, `Let us go through ${batTeam.name}'s innings, ${inn.runs}/${inn.wickets}, starting with the batsmen from the top of the order.`, 'serious', { kind: 'worm', innings: ii })

    // ---- the batsmen, top to bottom
    const batted = inn.batters.map((b, pos) => ({ b, pos })).filter(({ b }) => b.balls > 0 || b.runs > 0 || b.dismissal)
    type Row = { b: BatterLine; pos: number; g: Grade }
    const rows: Row[] = batted.map(({ b, pos }) => ({ b, pos, g: gradeBat({ runs: b.runs, balls: b.balls, out: !!b.dismissal }, { format: fmt, position: pos, role: match.player(b.id).role }) }))
    const isMid = (g: Grade) => g === 'bad' || g === 'average'
    for (let k = 0; k < rows.length; k++) {
      const { b, pos, g } = rows[k]
      // quiet innings are not worth a speech each: a run of tailenders, or of below-par and average knocks, is wrapped up in one short line
      const tailish = pos >= 7 && g !== 'good' && g !== 'exceptional'
      if (tailish || isMid(g)) {
        const group: Row[] = [rows[k]]
        const joins = (r: Row) => (tailish ? r.pos >= 7 && r.g !== 'good' && r.g !== 'exceptional' : isMid(r.g) && r.pos < 7)
        while (k + 1 < rows.length && group.length < 3 && joins(rows[k + 1])) group.push(rows[++k])
        if (group.length >= 2) {
          const lines = group.map((r) => `${match.player(r.b.id).name}  ${r.b.runs}${r.b.dismissal ? '' : '*'} (${r.b.balls})`)
          const tot = group.reduce((s2, r) => s2 + r.b.runs, 0)
          const parts = group.map((r) => `${pn(r.b.id)} ${r.b.runs}${r.b.dismissal ? '' : '*'}`)
          const tail = pos >= 7 && tailish
          const lead = tail ? 'And the tail?' : pick(['Quiet ones now:', 'Then a few small knocks:', 'In the middle of it all:'])
          const end = tot <= 8 * group.length / 2 ? 'Not much to say about those.' : 'Small contributions, but they all count.'
          say(who(), `${lead} ${parts.join(', ')}. ${end}`, tot <= 8 ? 'serious' : 'thoughtful', { kind: 'card', title: tail ? 'THE TAIL' : 'SMALL KNOCKS', lines })
          continue
        }
      }
      const w = who()
      const sr = b.balls ? Math.round((b.runs / b.balls) * 100) : 0
      const line = `${b.runs}${b.dismissal ? '' : '*'} off ${b.balls}${b.runs >= 20 ? `, strike rate ${sr}` : ''}`
      let text = fill(pick(BAT_SAY[g]), { n: pn(b.id), line })
      if (g === 'worse' && b.runs === 0 && b.dismissal) text = fill(pick(['{n} out for a duck. A really disappointing game.', 'A golden memory this is not: {n} gets a duck. Disappointing.', 'Nothing at all for {n}, out for nought. A very disappointing game.']), { n: pn(b.id) })
      say(w, text, MOOD_OF[g], { kind: 'stat', innings: ii, playerId: b.id, as: 'bat', grade: g })
      if (g === 'worse' || g === 'exceptional') formBeat(other(w), b.id, 'bat', g, `${b.runs}${b.dismissal ? '' : '*'} (${b.balls})`)
      if (g === 'good' || g === 'exceptional') {
        const big = g === 'exceptional' && b.runs >= 50
        say(other(w), `${pick(BAT_FOLLOW[g])} ${b.fours} ${b.fours === 1 ? 'four' : 'fours'} and ${b.sixes} ${b.sixes === 1 ? 'six' : 'sixes'}.`, g === 'exceptional' ? 'excited' : 'proud', big ? { kind: 'milestone', innings: ii, playerId: b.id } : { kind: 'wagon', innings: ii, batsmanId: b.id })
      }
    }

    // ---- the bowlers of the other side
    const bowlers: BowlerLine[] = [...inn.bowlers.values()].filter((l) => l.legalBalls > 0)
    if (bowlers.length) say(0, `Now to the bowlers. ${bowlTeam.name} used ${bowlers.length} of them.`, 'serious', { kind: 'manhattan', innings: ii })
    const bowlRows = bowlers.map((l) => ({ l, g: gradeBowl({ wickets: l.wickets, runs: l.runs, balls: l.legalBalls }, { format: fmt, par }) }))
    for (let k = 0; k < bowlRows.length; k++) {
      const { l, g } = bowlRows[k]
      if (isMid(g)) {
        const group = [bowlRows[k]]
        while (k + 1 < bowlRows.length && group.length < 3 && isMid(bowlRows[k + 1].g)) group.push(bowlRows[++k])
        if (group.length >= 2) {
          const lines = group.map((r) => `${match.player(r.l.id).name}  ${r.l.wickets}/${r.l.runs} (${oversOf(r.l.legalBalls)})`)
          say(who(), `${pick(['The rest of the attack:', 'Steady rather than special:', 'Then the supporting bowlers:'])} ${group.map((r) => `${pn(r.l.id)} ${r.l.wickets}/${r.l.runs}`).join(', ')}. Nothing to write home about.`, 'thoughtful', { kind: 'card', title: 'SUPPORTING BOWLERS', lines })
          continue
        }
      }
      const w = who()
      const line = `${l.wickets}/${l.runs} from ${oversOf(l.legalBalls)} overs${l.maidens ? `, ${l.maidens} ${l.maidens === 1 ? 'maiden' : 'maidens'}` : ''}`
      say(w, fill(pick(BOWL_SAY[g]), { n: pn(l.id), line }), MOOD_OF[g], { kind: 'stat', innings: ii, playerId: l.id, as: 'bowl', grade: g })
      if (g === 'exceptional' || g === 'worse') formBeat(other(w), l.id, 'bowl', g, `${l.wickets}/${l.runs}`)
      if ((g === 'good' || g === 'exceptional') && l.wickets > 0) {
        const wk = inn.log.find((e) => e.wicket && e.bowlerId === l.id && e.wicket.kind !== 'run out')
        if (wk?.wicket) say(other(w), `${pick(BOWL_FOLLOW)} ${pn(wk.wicket.playerId)} is out, ${wk.wicket.kind}.`, g === 'exceptional' ? 'excited' : 'proud', { kind: 'wicket', seq: wk.seq })
      }
    }
    // a hint at where it leaves the match, after the first innings of a limited-overs game
    if (kind !== 'end' && match.format !== 'test') {
      say(0, `So ${batTeam.name} set a target of ${inn.runs + 1}. ${bowlTeam.name} need ${((inn.runs + 1) / (match.maxOvers || 20)).toFixed(2)} an over to chase it down.`, 'thoughtful', { kind: 'card', title: 'THE TARGET', lines: [`${bowlTeam.short} need ${inn.runs + 1}`, `${((inn.runs + 1) / (match.maxOvers || 20)).toFixed(2)} runs an over`] })
    }
  }

  // ---- after the match: who won, and the man of the match
  if (kind === 'end') {
    const mom = computeAwards(match).motm
    say(0, `${match.result?.text ?? 'And that is the match.'}${mom ? ` The man of the match: ${match.player(mom.id).name}.` : ''}`, 'proud', mom ? { kind: 'card', title: 'MAN OF THE MATCH', lines: [match.player(mom.id).name, mom.line] } : { kind: 'worm', innings: match.innings.length - 1 })
  }

  // ---- the sign-off
  say(0, pick(HOST_WRAP[kind]), 'proud', { kind: 'card', title: kind === 'end' ? 'FULL TIME' : kind === 'stumps' ? 'STUMPS' : 'BACK TO THE MIDDLE', lines: extra?.competition ? [extra.competition, extra.stage ?? ''] : [] })
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