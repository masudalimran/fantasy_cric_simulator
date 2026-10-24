import type { BowlType, MatchFormat, Player, Team } from '../types'
import { keeperIn } from '../data/squad'
import { aiIntent, aiTossDecision, chooseBowler } from './ai'
import {
  BYE, DISMISSAL_KINDS, DOT, LEGBYE, WICKET,
  KNOBS, ballProbs, dismissalWeights, effectiveBat, effectiveBowl, parRunsPerOver, REF,
} from './model'
import { BYE_FOUR, RUNOUT_CHECK, REVIEWS_PER_INNINGS, WRONG_OUT, MISSED_OUT, CLOSE_CALL, wantsChallenge, type DrsCtx, type Review } from './drs'
import { pitchLean } from './pitchInfo'
import { Rng, randomSeed } from './rng'
import { sixDistance } from './shots'
import {
  BOWL_STYLE_VALUE, DIFFICULTIES, FORMATS, INTENT_VALUE, phaseOf,
  type BallEvent, type BowlStyle, type DeliveryAim, type ShotAim, type BatterLine, type BowlerLine, type DismissalKind, type Difficulty, type Innings, type Intent,
  type MatchResult, type Pitch, type Side, type TestClock, type TestDay, type TossResult, type Weather,
} from './types'

export interface MatchOptions {
  teamA: Team
  teamB: Team
  format: MatchFormat
  seed?: number
  /** Side that wins the toss and what they choose. Random if omitted. */
  toss?: { winnerSide: 0 | 1; decision: 'bat' | 'bowl' }
  /** What the toss winner chooses, when a person (not the computer) makes the call. The coin is unaffected. */
  tossDecision?: 'bat' | 'bowl'
  /** Career mode: this is the player's team, and this is how hard the computer plays against it. */
  career?: { myTeamId: string | null; difficulty: Difficulty }
}

interface Form { bat: number; bowl: number }

const RUNS_BY_CAT = [0, 1, 2, 3, 4, 6, 0, 1, 1]

/**
 * One match, played a ball at a time. State is mutable and exposed read-only for the UI;
 * `playBall`, `playOver`, `playOvers`, `playInnings` and `playMatch` drive it.
 * A user can steer their own side by setting `intent`, and by calling `setBowler` before an over starts.
 */
export class Match {
  readonly format: MatchFormat
  readonly maxOvers: number
  readonly sides: [Side, Side]
  readonly toss: TossResult
  readonly pitch: Pitch
  readonly seed: number
  innings: Innings[] = []
  result: MatchResult | null = null
  events: BallEvent[] = []

  /** Per-side overrides: set by the user's controls, otherwise the AI decides. */
  intent: [Intent | number | null, Intent | number | null] = [null, null]
  /** How each side bowls when it is the bowling side (null = the usual). */
  bowlStyle: [BowlStyle | null, BowlStyle | null] = [null, null]
  /** A shot / delivery a person has lined up for the NEXT ball only (it is used and cleared by that ball). */
  shotAim: [ShotAim | null, ShotAim | null] = [null, null]
  deliveryAim: [DeliveryAim | null, DeliveryAim | null] = [null, null]
  private lastDelivery: [DeliveryAim | null, DeliveryAim | null] = [null, null]
  /** Set when a side forfeits: the rest of the match is played out, and that side loses. */
  forfeitSide: 0 | 1 | null = null
  /** The side the player manages (null = the player manages both, as in a friendly). */
  readonly mySide: 0 | 1 | null
  readonly difficulty: Difficulty | null
  /** The computer's side in career mode; null when neither team is the player's. */
  private cpuSide: 0 | 1 | null = null
  /** True in career/session matches, where any side that isn't yours is run by the computer. */
  private careerOn = false
  private bonus: [number, number] = [0, 0]
  private blunder = 0

  /** A Test: where the match is on the five-day clock (null in the limited-overs formats). */
  clock: TestClock | null = null
  /** A Test is waiting for somebody: the next day to start, or the side that leads to say whether the other side follows on. */
  awaiting: null | 'day' | 'followon' = null
  /** The days of a Test that were washed out completely (no ball bowled), for the screens that say so. */
  washedOut: number[] = []
  /** True while a whole match is being simulated: the computer then decides everything, for both sides. */
  private auto = false

  private rng: Rng
  private form = new Map<string, Form>()
  private fieldingAvg: [number, number]
  private keeper: [string | null, string | null]
  private seq = 0

  constructor(opts: MatchOptions) {
    this.format = opts.format
    this.maxOvers = FORMATS[opts.format].overs
    this.seed = opts.seed ?? randomSeed()
    this.rng = new Rng(this.seed)
    this.sides = [opts.teamA, opts.teamB].map((team) => ({ team, xi: team.players.slice(0, 11) })) as [Side, Side]

    this.pitch = {
      ease: Math.max(-1.2, Math.min(1.2, this.rng.normal() * 0.4 * KNOBS.pitch)),
      pace: this.rng.normal() * 0.5 * KNOBS.pitch,
      spin: this.rng.normal() * 0.5 * KNOBS.pitch,
    }
    for (const side of this.sides) for (const p of side.xi) this.form.set(p.id, this.rollForm(p))
    this.fieldingAvg = this.sides.map((s) => s.xi.reduce((a, p) => a + p.fielding, 0) / s.xi.length) as [number, number]
    this.keeper = this.sides.map((s) => keeperIn(s.xi, s.team.keeperId)?.id ?? [...s.xi].sort((a, b) => b.fielding - a.fielding)[0]?.id ?? null) as [string | null, string | null]

    // Career mode: the other team is the computer's, and difficulty tilts things against (or for) the player.
    const mine = opts.career?.myTeamId ?? null
    this.careerOn = !!opts.career
    this.mySide = mine === this.sides[0].team.id ? 0 : mine === this.sides[1].team.id ? 1 : null
    this.difficulty = opts.career && this.mySide !== null ? opts.career.difficulty : null
    if (this.mySide !== null && opts.career) {
      this.cpuSide = (1 - this.mySide) as 0 | 1
      const d = DIFFICULTIES[opts.career.difficulty]
      this.bonus[this.cpuSide] = d.boost
      this.bonus[this.mySide] = d.help
      this.blunder = d.blunder
    }
    this.toss = this.doToss(opts.toss, opts.tossDecision)
    const batsFirst = this.toss.decision === 'bat' ? this.toss.winnerSide : ((1 - this.toss.winnerSide) as 0 | 1)
    if (opts.format === 'test') this.clock = { day: 1, ballsToday: 0, plan: this.planDay(1), stumps: false }
    this.startInnings(0, batsFirst, null)
    this.pickBowler(this.current)
    if (this.clock) this.skipEmptyDays() // (a first day that is washed out completely)
  }

  // ---- A Test's clock ----------------------------------------------------

  /** One day of a Test, planned from the match seed: 88 to 102 overs, less whatever the weather takes. */
  private planDay(day: number): TestDay {
    const r = new Rng((this.seed ^ Math.imul(day, 0x9e3779b1) ^ 0x7e57) >>> 0)
    const base = 88 + r.int(15)
    const u = r.next()
    let weather: Weather = 'clear'
    let lost = 0
    if (u < 0.56) weather = 'clear'
    else if (u < 0.74) weather = 'overcast'
    else if (u < 0.84) { weather = 'drizzle'; lost = 4 + r.int(9) }
    else if (u < 0.92) { weather = 'rain'; lost = 14 + r.int(21) }
    else if (u < 0.965) { weather = 'bad light'; lost = 6 + r.int(11) }
    else { weather = 'washout'; lost = base - r.int(13) }
    return { day, weather, lost, scheduled: Math.max(0, base - lost) }
  }

  /** Overs still to be bowled today. */
  get oversLeftToday(): number {
    return this.clock ? Math.max(0, this.clock.plan.scheduled - Math.floor(this.clock.ballsToday / 6)) : 0
  }

  /** What the captains reckon is left of the match, in overs (they do not know the weather to come). */
  get oversLeftExpected(): number {
    if (!this.clock) return 0
    return this.oversLeftToday + (5 - this.clock.day) * 82
  }

  /** The session of the day: 1 morning, 2 afternoon, 3 evening. */
  get session(): 1 | 2 | 3 {
    if (!this.clock) return 1
    const done = Math.floor(this.clock.ballsToday / 6)
    const per = this.clock.plan.scheduled / 3
    return done < per ? 1 : done < per * 2 ? 2 : 3
  }

  /** True when the ball is the last of a session (a call for the screens to show lunch, tea or stumps). */
  private sessionEnds(): boolean {
    if (!this.clock) return false
    const balls = this.clock.ballsToday
    if (balls % 6 !== 0) return false
    const per = this.clock.plan.scheduled / 3
    const done = balls / 6
    return done > 0 && (Math.abs(done - per) < 0.5 || Math.abs(done - per * 2) < 0.5 || done >= this.clock.plan.scheduled)
  }

  /** Moves a Test on to the next day. Days with no play at all (washed out) are skipped, and day five ends the match. */
  startNextDay(): void {
    if (!this.clock || this.result || this.awaiting !== 'day') return
    this.awaiting = null
    this.clock = { day: this.clock.day + 1, ballsToday: 0, plan: this.planDay(this.clock.day + 1), stumps: false }
    this.skipEmptyDays()
  }

  private skipEmptyDays() {
    while (this.clock && !this.result && this.clock.plan.scheduled === 0) {
      this.washedOut.push(this.clock.day)
      if (this.clock.day >= 5) { this.endByTime(); return }
      this.clock = { day: this.clock.day + 1, ballsToday: 0, plan: this.planDay(this.clock.day + 1), stumps: false }
    }
  }

  /** Time has run out: nobody has won, so it is a draw (or a tie if the scores are level with the chase unfinished). */
  private endByTime() {
    if (this.result) return
    const inn = this.current
    if (inn.target !== null && inn.runs === inn.target - 1 && !inn.done) {
      this.result = { winnerSide: null, margin: null, text: 'Match tied' }
    } else {
      this.result = { winnerSide: null, draw: true, margin: null, text: 'Match drawn' }
    }
    if (!inn.done) inn.done = true
  }

  /** The total scored by a side across the innings so far. */
  private totalOf(side: 0 | 1): number {
    return this.innings.filter((i) => i.battingSide === side).reduce((s, i) => s + i.runs, 0)
  }

  /** Whether a person (not the computer) is the one making this side's decisions: declaring, following on. */
  private humanSide(side: 0 | 1): boolean {
    if (this.auto) return false
    if (this.careerOn) return this.mySide === side
    return true // a friendly: the people playing are in charge of both sides
  }

  /** The batting side closes its innings. Not allowed in the last innings, or when the innings is over. */
  declare(): boolean {
    const inn = this.current
    if (this.format !== 'test' || this.result || inn.done || this.awaiting || inn.index >= 3) return false
    inn.declared = true
    inn.done = true
    this.finishInnings(inn)
    return true
  }

  /** The side that leads by enough says whether the other side bats again at once (a follow-on) or bats itself. */
  decideFollowOn(enforce: boolean): boolean {
    if (this.awaiting !== 'followon') return false
    this.awaiting = null
    this.beginThird(enforce)
    if (this.clock?.stumps && !this.result) this.awaiting = 'day' // the day ended while the captain was deciding
    return true
  }

  /** The lead, in runs, of the side that batted first once both sides have batted (negative if it trails). */
  private firstInningsLead(): number {
    return this.innings[0].runs - this.innings[1].runs
  }

  private beginThird(enforce: boolean) {
    const first = this.innings[0].battingSide
    const second = (1 - first) as 0 | 1
    if (enforce) {
      this.startInnings(2, second, null)
      this.current.followOn = true
    } else {
      this.startInnings(2, first, null)
    }
    this.pickBowler(this.current)
  }

  // ---- Setup -------------------------------------------------------------

  /** Each player's hidden "form of the day". Most are near zero; a few have a career day or a nightmare. */
  private rollForm(p: Player): Form {
    const wild = p.traits.includes('unpredictable') ? 1.7 : 1
    let bat = this.rng.normal() * 3.5 * wild
    let bowl = this.rng.normal() * 3.5 * wild
    const r = this.rng.next()
    if (r < 0.03 * wild) bat += 15 + this.rng.next() * 8
    else if (r < 0.06 * wild) bat -= 12 + this.rng.next() * 8
    const r2 = this.rng.next()
    if (r2 < 0.03 * wild) bowl += 14 + this.rng.next() * 8
    else if (r2 < 0.06 * wild) bowl -= 12 + this.rng.next() * 8
    return { bat: bat * KNOBS.form, bowl: bowl * KNOBS.form }
  }

  private doToss(forced?: MatchOptions['toss'], chosen?: 'bat' | 'bowl'): TossResult {
    const callerSide = this.rng.int(2) as 0 | 1
    const call = this.rng.chance(0.5) ? 'heads' : 'tails'
    const coin = this.rng.chance(0.5) ? 'heads' : 'tails'
    const winnerSide = forced?.winnerSide ?? ((call === coin ? callerSide : 1 - callerSide) as 0 | 1)
    const ai = aiTossDecision(this.format, this.rng) // always drawn, so the rest of the match is the same either way
    // the computer reads the pitch: on one with a clear edge it makes the smart call about nine times in ten (and no more random draws are taken)
    const lean = this.format === 'test' ? 0 : pitchLean(this.pitch)
    const smart: 'bat' | 'bowl' | null = Math.abs(lean) >= 0.25 && (this.seed >>> 5) % 10 !== 0 ? (lean > 0 ? 'bat' : 'bowl') : null
    const decision = forced?.decision ?? chosen ?? smart ?? ai
    return { callerSide, call, coin, winnerSide, decision }
  }

  private startInnings(index: 0 | 1 | 2 | 3, battingSide: 0 | 1, target: number | null) {
    const xi = this.sides[battingSide].xi
    const inn: Innings = {
      index, battingSide, runs: 0, wickets: 0, legalBalls: 0,
      extras: { wides: 0, noballs: 0, byes: 0, legByes: 0 },
      batters: [], strikerId: xi[0].id, nonStrikerId: xi[1].id, nextBatsman: 2,
      bowlers: new Map(), bowlerId: null, prevBowlerId: null, overRuns: 0,
      fow: [], target, freeHit: false, done: false, log: [], reviews: { bat: REVIEWS_PER_INNINGS[this.format], bowl: REVIEWS_PER_INNINGS[this.format] },
    }
    inn.batters.push(this.newBatter(xi[0].id), this.newBatter(xi[1].id))
    this.innings.push(inn)
  }

  /**
   * The computer's batting-order calls. Chasing a big total or in the last overs, it sends in a big hitter ahead
   * of the order; after a collapse it sends in a steady batsman instead. Only the next few in line can jump.
   */
  private cpuReorder(inn: Innings, xi: Player[]) {
    const from = inn.nextBatsman
    const pool = xi.slice(from, from + 4)
    if (pool.length < 2) return
    const quota = FORMATS[this.format].overs * 6
    const ballsLeft = quota - inn.legalBalls
    const rrr = inn.target !== null ? ((inn.target - inn.runs) / Math.max(1, ballsLeft)) * 6 : 0
    const late = ballsLeft <= Math.min(30, quota * 0.2)
    const recentWickets = inn.fow.filter((f) => f.balls >= inn.legalBalls - 24).length
    const power = (p: Player) => p.batting.power + (p.traits.includes('finisher') || p.traits.includes('big-hitter') ? 8 : 0)
    const steady = (p: Player) => p.batting.technique + p.batting.temperament + (p.traits.includes('anchor') ? 10 : 0)
    let pick = 0
    if (late || rrr > 10.5) {
      const best = pool.reduce((bi, p, i) => (power(p) > power(pool[bi]) ? i : bi), 0)
      if (power(pool[best]) - power(pool[0]) >= 6) pick = best
    } else if (recentWickets >= 3) {
      const best = pool.reduce((bi, p, i) => (steady(p) > steady(pool[bi]) ? i : bi), 0)
      if (steady(pool[best]) - steady(pool[0]) >= 12) pick = best
    }
    if (pick > 0) [xi[from], xi[from + pick]] = [xi[from + pick], xi[from]]
  }

  private newBatter = (id: string): BatterLine => ({ id, runs: 0, balls: 0, fours: 0, sixes: 0, dismissal: null })

  // ---- Read-only helpers -------------------------------------------------

  get current(): Innings {
    return this.innings[this.innings.length - 1]
  }
  /** Which innings the screen is showing. Normally the live one; the screen holds on the finished first innings until you start the chase. */
  hold: number | null = null
  get shown(): Innings {
    return this.hold !== null && this.innings[this.hold] ? this.innings[this.hold] : this.current
  }
  get over(): number {
    return Math.floor(this.current.legalBalls / 6)
  }
  get isOver(): boolean {
    return this.result !== null
  }
  player(id: string): Player {
    for (const s of this.sides) for (const p of s.xi) if (p.id === id) return p
    throw new Error(`Unknown player ${id}`)
  }
  /** The wicketkeeper of a side (null if the side has none). */
  keeperOf(side: 0 | 1): string | null {
    return this.keeper[side]
  }
  battingSide(inn = this.current): Side {
    return this.sides[inn.battingSide]
  }
  bowlingSide(inn = this.current): Side {
    return this.sides[1 - inn.battingSide]
  }
  /** Required run rate while chasing, otherwise null. */
  requiredRate(inn = this.current): number | null {
    if (inn.target === null) return null
    const left = this.format === 'test' ? this.oversLeftExpected * 6 : this.maxOvers * 6 - inn.legalBalls
    return left > 0 ? ((inn.target - inn.runs) / left) * 6 : null
  }

  // ---- Bowler selection --------------------------------------------------

  /** Chooses who bowls the next over, so it can be shown (and changed) before the first ball. */
  private pickBowler(inn: Innings) {
    const bowlSide = (1 - inn.battingSide) as 0 | 1
    inn.bowlerId = chooseBowler({ format: this.format, inn, xi: this.sides[bowlSide].xi, keeperId: this.keeper[bowlSide], rng: this.rng, pref: this.sides[bowlSide].team.bowlPref })
    // ...and sometimes the computer's captain just picks someone else
    if (this.cpuSide === bowlSide && this.blunder > 0 && this.rng.chance(this.blunder * 0.5)) {
      const options = this.bowlerOptions(bowlSide)
      if (options.length) inn.bowlerId = options[this.rng.int(options.length)].id
    }
  }

  /** Bowlers a side could hand the ball to for the coming over. */
  bowlerOptions(side: 0 | 1): Player[] {
    const inn = this.current
    if (inn.battingSide === side) return []
    const cap = FORMATS[this.format].maxBowlerOvers
    return this.sides[side].xi.filter((p) => p.bowling && p.id !== inn.prevBowlerId && (inn.bowlers.get(p.id)?.legalBalls ?? 0) / 6 < cap)
  }

  /** True while the over hasn't started, i.e. the bowler can still be changed. */
  get canChangeBowler(): boolean {
    const inn = this.current
    return !this.result && !inn.done && !inn.log.some((e) => e.over === Math.floor(inn.legalBalls / 6))
  }

  /** Swap the bowler for the coming over. Returns false if that isn't allowed right now. */
  setBowler(side: 0 | 1, id: string): boolean {
    const inn = this.current
    if (!this.canChangeBowler || !this.bowlerOptions(side).some((p) => p.id === id)) return false
    inn.bowlerId = id
    return true
  }

  /** The side is out: play the rest of the match so that it loses, and record why. */
  forfeit(side: 0 | 1): MatchResult {
    this.forfeitSide = side
    return this.playMatch()
  }

  // ---- Playing -----------------------------------------------------------

  playBall(): BallEvent | null {
    if (this.result || this.awaiting) return null
    const inn = this.current
    const battingSideIdx = inn.battingSide
    const bowlingSideIdx = (1 - battingSideIdx) as 0 | 1
    const bowlXI = this.sides[bowlingSideIdx].xi
    const batXI = this.sides[battingSideIdx].xi
    const format = this.format

    if (inn.bowlerId === null) this.pickBowler(inn)
    const bowlerId = inn.bowlerId as string
    if (!inn.bowlers.has(bowlerId)) inn.bowlers.set(bowlerId, { id: bowlerId, legalBalls: 0, runs: 0, wickets: 0, maidens: 0, dots: 0, wides: 0, noballs: 0 })
    const bowler = this.player(bowlerId)
    const bowlerLine = inn.bowlers.get(bowlerId) as BowlerLine
    const striker = this.player(inn.strikerId)
    const strikerLine = inn.batters.find((b) => b.id === inn.strikerId) as BatterLine
    const ballInOver = inn.legalBalls % 6
    const over = Math.floor(inn.legalBalls / 6)
    const phase = phaseOf(format, over)
    const bowlType = bowler.bowling?.type ?? 'medium'

    // Pressure: a steep chase, or two wickets in the last two overs.
    const rrr = this.requiredRate(inn)
    const par = parRunsPerOver(format, phase)
    const recentWickets = inn.fow.filter((f) => inn.legalBalls - f.balls <= 12).length
    const pressure = (rrr !== null && rrr > par * 1.5) || recentWickets >= 2

    const bowlerOvers = bowlerLine.legalBalls / 6
    const stamina = bowler.bowling?.stamina ?? 50
    // (in a Test it is the length of the current spell that tires him, not the day's total)
    const recentOvers = format === 'test' ? inn.log.filter((e) => e.bowlerId === bowlerId && e.legal && e.over > over - 18).length / 6 : 0
    const fatigue = format === 'test' ? Math.max(0, recentOvers - 5.5) * ((100 - stamina) / 80) : Math.max(0, bowlerOvers - 1.5) * ((100 - stamina) / (format === 'odi' ? 60 : 110))

    const userIntent = this.intent[battingSideIdx]
    const intent =
      userIntent === null
        ? aiIntent({ format, inn, batter: striker, ballsFaced: strikerLine.balls, xiSize: batXI.length, test: this.clock ? { oversLeft: this.oversLeftExpected, lead: this.totalOf(battingSideIdx) - this.totalOf(bowlingSideIdx), day: this.clock.day } : undefined }) +
          // the computer's batting plan, with the odd poor call depending on the difficulty
          (this.blunder > 0 && battingSideIdx === this.cpuSide ? Math.max(-1.2, Math.min(2.2, this.rng.normal() * this.blunder * 0.9)) : 0)
        : typeof userIntent === 'number' ? userIntent : INTENT_VALUE[userIntent]

    const probs = ballProbs({
      shot: this.shotAim[battingSideIdx], delivery: this.deliveryAim[bowlingSideIdx],
      repeat: !!this.deliveryAim[bowlingSideIdx] && this.lastDelivery[bowlingSideIdx]?.line === this.deliveryAim[bowlingSideIdx]!.line && this.lastDelivery[bowlingSideIdx]?.length === this.deliveryAim[bowlingSideIdx]!.length,
      format, phase, intent, style: BOWL_STYLE_VALUE[this.bowlStyle[bowlingSideIdx] ?? 'normal'], pitch: this.pitch, inningsIndex: inn.index, freeHit: inn.freeHit,
      forfeit: this.forfeitSide === battingSideIdx ? 'bat' : this.forfeitSide === bowlingSideIdx ? 'bowl' : undefined,
      ballsFaced: strikerLine.balls,
      fieldingAvg: this.fieldingAvg[bowlingSideIdx] + this.bonus[bowlingSideIdx],
      bat: effectiveBat(striker, { phase, bowlType, pressure, form: this.form.get(striker.id)?.bat ?? 0, bonus: this.bonus[battingSideIdx] }),
      bowl: effectiveBowl(bowler, { phase, pitch: this.pitch, inningsIndex: this.clock ? (this.clock.day >= 3 ? 1 : 0) : (inn.index as 0 | 1), fatigue, form: this.form.get(bowler.id)?.bowl ?? 0, bonus: this.bonus[bowlingSideIdx] }),
    })

    // ---- Roll the delivery
    let extraType: BallEvent['extraType'] = null
    let extraRuns = 0
    let runsBat = 0
    let legal = true
    let dismissal: BallEvent['wicket'] = null
    const wasFreeHit = inn.freeHit

    const r = this.rng.next()
    if (r < probs.wide) {
      legal = false
      extraType = 'wide'
      extraRuns = 1
    } else {
      const noBall = r < probs.wide + probs.noball
      let cat = this.rng.weighted(probs.legal)
      if (noBall) {
        legal = false
        extraType = 'noball'
        extraRuns = 1
        inn.freeHit = true
        if (cat === BYE || cat === LEGBYE) cat = DOT
        // A no-ball can only dismiss by run out, same as a free hit.
        if (cat === WICKET && !this.rng.chance(0.12)) cat = DOT
      }
      if (cat === BYE || cat === LEGBYE) {
        extraType = cat === BYE ? 'bye' : 'legbye'
        // now and then it races away to the rope: four byes (or leg byes). A separate random stream, so nothing else in the match shifts.
        extraRuns = new Rng((this.seed ^ Math.imul(this.seq + 1, 0x27d4eb2f) ^ 0xb7e1) >>> 0).chance(BYE_FOUR) ? 4 : 1
      } else if (cat === WICKET) {
        dismissal = this.makeDismissal(inn, striker, bowler, bowlXI, bowlingSideIdx, bowlType, noBall || wasFreeHit)
      } else {
        runsBat = RUNS_BY_CAT[cat]
      }
    }
    // A side that has forfeited can't sneak a win or a tie while chasing.
    if (this.forfeitSide === battingSideIdx && inn.target !== null && !dismissal && inn.runs + runsBat + extraRuns >= inn.target - 1) {
      extraType = null; extraRuns = 0; runsBat = 0; legal = true
      if (!wasFreeHit) dismissal = this.makeDismissal(inn, striker, bowler, bowlXI, bowlingSideIdx, bowlType, false)
    }
    // ---- Challenges: the batsman can ask for an lbw or a catch behind he has been given out to be checked, and the fielding side can ask about a
    // close not-out. The decision after the review is what is applied below. (A separate random stream, so nothing else in the match shifts.)
    let review: Review | undefined
    let appeal: BallEvent['appeal']
    if (this.forfeitSide === null) {
      const rr = new Rng((this.seed ^ Math.imul(this.seq + 1, 0x85ebca6b) ^ 0xd125) >>> 0)
      const ctx = (by: 'bat' | 'bowl'): DrsCtx => ({ by, left: inn.reviews?.[by] ?? 0, batRuns: strikerLine.runs, batBalls: strikerLine.balls, position: inn.batters.indexOf(strikerLine), wickets: inn.wickets, ballsLeft: format === 'test' ? null : this.maxOvers * 6 - inn.legalBalls, need: inn.target !== null ? inn.target - inn.runs : null, recentWickets })
      const keeperId = this.keeper[bowlingSideIdx]
      if (dismissal && (dismissal.kind === 'lbw' || (dismissal.kind === 'caught' && dismissal.fielderId !== null && dismissal.fielderId === keeperId))) {
        appeal = { kind: dismissal.kind === 'lbw' ? 'lbw' : 'edge', out: true }
        const d = wantsChallenge(ctx('bat'), rr.next())
        if (d.yes && inn.reviews) {
          const wrong = rr.chance(WRONG_OUT)
          const kind: Review['kind'] = dismissal.kind === 'lbw' ? 'lbw' : 'edge'
          if (!wrong) inn.reviews.bat--
          review = { by: 'bat', kind, originalOut: true, finalOut: !wrong, overturned: wrong, desperate: d.desperate, left: inn.reviews.bat, total: REVIEWS_PER_INNINGS[format] }
          if (wrong) { dismissal = null; runsBat = 0 }
        }
      } else if (dismissal && dismissal.kind === 'run out') {
        appeal = { kind: 'runout', out: true }
      } else if (!dismissal && legal && !extraType && runsBat === 0 && !wasFreeHit && rr.chance(CLOSE_CALL[format])) {
        // the fielding side appeals for a close one and the umpire says not out; they may take it upstairs
        const edge = keeperId !== null && !rr.chance(0.62)
        appeal = { kind: edge ? 'edge' : 'lbw', out: false }
        const d = wantsChallenge(ctx('bowl'), rr.next())
        if (d.yes && inn.reviews) {
          const out = rr.chance(MISSED_OUT)
          if (!out) inn.reviews.bowl--
          review = { by: 'bowl', kind: edge ? 'edge' : 'lbw', originalOut: false, finalOut: out, overturned: out, desperate: d.desperate, left: inn.reviews.bowl, total: REVIEWS_PER_INNINGS[format] }
          if (out) dismissal = { kind: edge ? 'caught' : 'lbw', bowlerId: bowler.id, fielderId: edge ? keeperId : null, playerId: striker.id }
        }
      } else if (!dismissal && legal && !wasFreeHit && ((runsBat >= 1 && runsBat <= 3) || ((extraType === 'bye' || extraType === 'legbye') && extraRuns <= 3)) && rr.chance(RUNOUT_CHECK)) {
        // a throw at the stumps and a run out checked by the third umpire: the batsman made his ground
        appeal = { kind: 'runout', out: false }
      }
    }
    if (legal) inn.freeHit = false

    // ---- Apply it
    const total = runsBat + extraRuns
    inn.runs += total
    if (extraType === 'wide') inn.extras.wides += extraRuns
    else if (extraType === 'noball') inn.extras.noballs += extraRuns
    else if (extraType === 'bye') inn.extras.byes += extraRuns
    else if (extraType === 'legbye') inn.extras.legByes += extraRuns

    const tags: string[] = []
    if (extraType !== 'wide') strikerLine.balls++
    const before = strikerLine.runs
    strikerLine.runs += runsBat
    if (runsBat === 4) strikerLine.fours++
    if (runsBat === 6) strikerLine.sixes++
    for (const m of [50, 100, 150, 200]) if (before < m && strikerLine.runs >= m) tags.push(m === 50 ? 'fifty' : m === 100 ? 'hundred' : `${m}`)

    const chargedToBowler = runsBat + (extraType === 'wide' || extraType === 'noball' ? extraRuns : 0)
    bowlerLine.runs += chargedToBowler
    inn.overRuns += chargedToBowler
    if (extraType === 'wide') bowlerLine.wides++
    if (extraType === 'noball') bowlerLine.noballs++
    if (legal) {
      bowlerLine.legalBalls++
      inn.legalBalls++
      if (this.clock) this.clock.ballsToday++
      if (total === 0 && !dismissal) bowlerLine.dots++
    }

    const ev: BallEvent = {
      seq: this.seq++, innings: inn.index, over, ballInOver, legal,
      strikerId: striker.id, nonStrikerId: inn.nonStrikerId, bowlerId: bowler.id,
      runsBat, extraType, extraRuns, total, boundary: runsBat === 4 ? 4 : runsBat === 6 ? 6 : 0,
      wicket: dismissal, intent, freeHit: wasFreeHit,
      ...(this.shotAim[battingSideIdx] ? { shot: this.shotAim[battingSideIdx] as ShotAim } : {}),
      ...(this.deliveryAim[bowlingSideIdx] ? { delivery: this.deliveryAim[bowlingSideIdx] as DeliveryAim } : {}),
      score: { runs: inn.runs, wickets: inn.wickets, legalBalls: inn.legalBalls }, tags,
      ...(review ? { review } : {}),
      ...(appeal ? { appeal } : {}),
    }

    if (runsBat === 6) ev.distance = sixDistance(ev.seq, striker.batting.power)
    if (dismissal) {
      inn.wickets++
      ev.score.wickets = inn.wickets
      const outLine = inn.batters.find((b) => b.id === dismissal!.playerId) as BatterLine
      outLine.dismissal = { kind: dismissal.kind, bowlerId: dismissal.bowlerId, fielderId: dismissal.fielderId }
      if (dismissal.bowlerId) bowlerLine.wickets++
      inn.fow.push({ runs: inn.runs, wickets: inn.wickets, playerId: dismissal.playerId, over, balls: inn.legalBalls })
      tags.push('wicket')
      if (outLine.runs === 0) tags.push('duck')
      if (dismissal.bowlerId === bowler.id && bowlerLine.wickets === 5) tags.push('five-wickets')
      if (this.isHatTrick(inn, ev)) tags.push('hat-trick')
      // Next batsman in (or the innings is over).
      if (inn.wickets < batXI.length - 1 && inn.nextBatsman < batXI.length) {
        if (this.careerOn && battingSideIdx !== this.mySide) this.cpuReorder(inn, batXI)
        const next = batXI[inn.nextBatsman++]
        inn.batters.push(this.newBatter(next.id))
        if (dismissal.playerId === inn.strikerId) inn.strikerId = next.id
        else inn.nonStrikerId = next.id
      }
    }

    // Strike changes: odd runs, then end of over.
    const runsRan = runsBat + (extraType === 'bye' || extraType === 'legbye' ? extraRuns : 0)
    if (!dismissal && runsRan % 2 === 1) this.swap(inn)
    const overDone = legal && inn.legalBalls % 6 === 0
    if (overDone) {
      if (inn.overRuns === 0) { bowlerLine.maidens++; tags.push('maiden') }
      inn.prevBowlerId = inn.bowlerId
      inn.bowlerId = null
      inn.overRuns = 0
      this.swap(inn)
    }
    // (the next bowler is picked after the innings-over check below)

    inn.log.push(ev)
    this.events.push(ev)
    if (this.deliveryAim[bowlingSideIdx]) this.lastDelivery[bowlingSideIdx] = this.deliveryAim[bowlingSideIdx]
    this.shotAim[battingSideIdx] = null // a lined-up shot or delivery is for one ball only
    this.deliveryAim[bowlingSideIdx] = null

    // ---- Is the innings (or match) over?
    const allOut = inn.wickets >= batXI.length - 1
    const oversUp = this.format !== 'test' && inn.legalBalls >= this.maxOvers * 6
    const chased = inn.target !== null && inn.runs >= inn.target
    if (allOut || oversUp || chased) {
      inn.done = true
      this.finishInnings(inn)
    } else if (inn.bowlerId === null) {
      this.pickBowler(inn)
    }
    if (this.clock && !this.result) {
      // the computer's captain may call the innings off at the end of an over
      if (overDone && !inn.done && !this.awaiting && this.aiMayDeclare(inn)) { inn.declared = true; inn.done = true; this.finishInnings(inn) }
      // the day's overs are up
      if (legal && this.clock.ballsToday % 6 === 0 && this.clock.ballsToday >= this.clock.plan.scheduled * 6) this.endOfDay()
    }
    return ev
  }

  /** Stumps. Day five ends the match; any other day waits for the next one to be started. */
  private endOfDay() {
    if (!this.clock || this.result) return
    this.clock.stumps = true
    if (this.clock.day >= 5) { this.endByTime(); return }
    if (this.awaiting === null) this.awaiting = 'day'
  }

  /** Whether the computer's captain, batting, closes the innings now. */
  private aiMayDeclare(inn: Innings): boolean {
    const side = inn.battingSide
    if (!this.clock || this.humanSide(side) || inn.index >= 3 || inn.followOn) return false
    const left = this.oversLeftExpected
    const lead = this.totalOf(side) - this.totalOf((1 - side) as 0 | 1) // runs in front, counting this innings so far
    if (inn.index === 0) {
      // a captain calls the first innings off when it is big enough: the bigger it gets, the likelier it is each over (so a rare monster can run on)
      const day = this.clock.day
      const p = inn.runs >= 800 ? 0.35 : inn.runs >= 650 ? 0.14 : inn.runs >= 550 ? (day >= 3 ? 0.14 : 0.06) : inn.runs >= 450 && day >= 3 ? 0.08 : 0
      return p > 0 && new Rng((this.seed ^ Math.imul(inn.legalBalls, 2654435761)) >>> 0).chance(p)
    }
    if (inn.index === 1) return inn.runs >= 650 || (inn.runs >= this.innings[0].runs - 30 && this.clock.day >= 4) // the reply is level or ahead late on: call it off
    return lead >= 450 || (lead >= 380 && left <= 160) || (lead >= 250 && left <= 108)
  }

  /** The computer's side that leads by 200 or more decides whether to make the other follow on. */
  private cpuEnforcesFollowOn(lead: number): boolean {
    if (!this.clock) return false
    const day = this.clock.day
    const p = day <= 2 ? (lead >= 300 ? 0.8 : 0.5) : day === 3 ? (lead >= 300 ? 0.6 : 0.3) : 0
    return new Rng((this.seed ^ 0xf011) >>> 0).chance(p)
  }

  /** Enough time left for a side to be bowled out twice? */
  private timeAllowsFollowOn(): boolean {
    return !!this.clock && this.clock.day <= 4 && this.oversLeftExpected >= 120
  }

  /** Where a Test goes when an innings ends: the next innings, the follow-on question, or the result. */
  private finishTestInnings(inn: Innings) {
    const idx = inn.index
    const bat = inn.battingSide
    const other = (1 - bat) as 0 | 1
    const name = (s: 0 | 1) => this.sides[s].team.name
    const win = (winner: 0 | 1, how: NonNullable<MatchResult['margin']>, text: string) => {
      this.result = { winnerSide: winner, margin: how, text: this.forfeitSide !== null ? `${text} (${name(this.forfeitSide)} forfeited)` : text }
    }
    if (idx === 0) { this.startInnings(1, other, null); this.pickBowler(this.current); return }
    if (idx === 1) {
      const first = this.innings[0].battingSide
      const lead = this.firstInningsLead()
      if (lead >= 200 && this.timeAllowsFollowOn()) {
        if (this.humanSide(first)) { this.awaiting = 'followon'; return }
        this.beginThird(this.cpuEnforcesFollowOn(lead))
      } else this.beginThird(false)
      return
    }
    if (idx === 2) {
      if (inn.followOn) {
        const own = this.totalOf(bat) // the side that followed on, both innings
        const theirs = this.totalOf(other)
        if (own < theirs) { win(other, { type: 'innings', value: theirs - own }, `${name(other)} won by an innings and ${theirs - own} run${theirs - own === 1 ? '' : 's'}`); return }
        this.startInnings(3, other, own - theirs + 1)
      } else {
        // the side that batted first has batted twice; the other side now chases
        const total = this.totalOf(bat)
        const chaser = other
        const target = total - this.totalOf(chaser) + 1
        if (target <= 0) { const by = this.totalOf(chaser) - total; win(chaser, { type: 'innings', value: by }, `${name(chaser)} won by an innings and ${by} run${by === 1 ? '' : 's'}`); return }
        this.startInnings(3, chaser, target)
      }
      this.pickBowler(this.current)
      return
    }
    // the fourth innings: the chase
    const target = inn.target as number
    const xiSize = this.sides[bat].xi.length
    if (inn.runs >= target) {
      const wk = xiSize - 1 - inn.wickets
      win(bat, { type: 'wickets', value: wk }, `${name(bat)} won by ${wk} wicket${wk === 1 ? '' : 's'}`)
    } else if (inn.runs === target - 1) {
      this.result = { winnerSide: null, margin: null, text: 'Match tied' }
    } else {
      const by = target - 1 - inn.runs
      win(other, { type: 'runs', value: by }, `${name(other)} won by ${by} run${by === 1 ? '' : 's'}`)
    }
  }

  private swap(inn: Innings) {
    ;[inn.strikerId, inn.nonStrikerId] = [inn.nonStrikerId, inn.strikerId]
  }

  private isHatTrick(inn: Innings, ev: BallEvent): boolean {
    const legalBalls = [...inn.log, ev].filter((e) => e.legal && e.bowlerId === ev.bowlerId).slice(-3)
    return legalBalls.length === 3 && legalBalls.every((e) => e.wicket && e.wicket.kind !== 'run out')
  }

  private makeDismissal(inn: Innings, striker: Player, bowler: Player, bowlXI: Player[], bowlSide: 0 | 1, bowlType: BowlType, freeHit: boolean): NonNullable<BallEvent['wicket']> {
    const runZ = (striker.batting.running - REF.run) / 20
    const w = dismissalWeights(this.format, bowlType, runZ, this.fieldingAvg[bowlSide], freeHit)
    const kind = DISMISSAL_KINDS[this.rng.weighted(w)] as DismissalKind
    const keeperId = this.keeper[bowlSide]
    const fielders = bowlXI.filter((p) => p.id !== bowler.id)
    const pickFielder = (boostKeeper: number) =>
      fielders[this.rng.weighted(fielders.map((p) => Math.max(p.fielding, 20) * (p.id === keeperId ? boostKeeper : 1)))].id

    let outId = striker.id
    let bowlerId: string | null = bowler.id
    let fielderId: string | null = null
    switch (kind) {
      case 'caught':
        fielderId = pickFielder(bowlType === 'fast' || bowlType === 'medium' ? 3 : 1)
        break
      case 'caught and bowled':
        fielderId = bowler.id
        break
      case 'stumped':
        fielderId = keeperId
        break
      case 'run out':
        bowlerId = null
        fielderId = pickFielder(1)
        if (this.rng.chance(0.45)) outId = inn.nonStrikerId
        break
      default:
        break
    }
    return { kind, bowlerId, fielderId, playerId: outId }
  }

  private finishInnings(inn: Innings) {
    if (this.format === 'test') { this.finishTestInnings(inn); return }
    if (inn.index === 0) {
      this.startInnings(1, (1 - inn.battingSide) as 0 | 1, inn.runs + 1)
      this.pickBowler(this.current)
      return
    }
    const chaser = inn.battingSide
    const defender = (1 - chaser) as 0 | 1
    const first = this.innings[0]
    const xiSize = this.sides[chaser].xi.length
    let result: MatchResult
    if (inn.runs >= (inn.target as number)) {
      const wk = xiSize - 1 - inn.wickets
      const ballsLeft = this.maxOvers * 6 - inn.legalBalls
      result = {
        winnerSide: chaser,
        margin: { type: 'wickets', value: wk, ballsLeft },
        text: `${this.sides[chaser].team.name} won by ${wk} wicket${wk === 1 ? '' : 's'} (${ballsLeft} ball${ballsLeft === 1 ? '' : 's'} left)`,
      }
    } else if (inn.runs === first.runs) {
      result = { winnerSide: null, margin: null, text: 'Match tied' }
    } else {
      const by = first.runs - inn.runs
      result = {
        winnerSide: defender,
        margin: { type: 'runs', value: by },
        text: `${this.sides[defender].team.name} won by ${by} run${by === 1 ? '' : 's'}`,
      }
    }
    if (this.forfeitSide !== null) result.text += ` (${this.sides[this.forfeitSide].team.name} forfeited)`
    this.result = result
  }

  /** Plays to the end of the current over (or the match). */
  playOver(): BallEvent[] {
    const out: BallEvent[] = []
    const startInnings = this.current
    const startOver = Math.floor(startInnings.legalBalls / 6)
    while (!this.result && this.current === startInnings && !startInnings.done) {
      const ev = this.playBall()
      if (!ev) break
      out.push(ev)
      if (Math.floor(startInnings.legalBalls / 6) > startOver) break
    }
    return out
  }

  playOvers(n: number): BallEvent[] {
    const out: BallEvent[] = []
    const startInnings = this.current
    for (let i = 0; i < n && !this.result && this.current === startInnings && !startInnings.done; i++) out.push(...this.playOver())
    return out
  }

  playInnings(): BallEvent[] {
    const out: BallEvent[] = []
    const startInnings = this.current
    while (!this.result && this.current === startInnings && !startInnings.done) {
      const ev = this.playBall()
      if (!ev) break
      out.push(ev)
    }
    return out
  }

  playMatch(): MatchResult {
    const was = this.auto
    this.auto = true // simulated whole: the computer makes every decision for both sides
    let guard = 0
    while (!this.result && guard++ < 200000) {
      if (this.awaiting === 'day') this.startNextDay()
      else if (this.awaiting === 'followon') this.decideFollowOn(this.cpuEnforcesFollowOn(this.firstInningsLead()))
      else this.playBall()
    }
    this.auto = was
    return this.result as MatchResult
  }

  /** A Test: plays to the end of the current session (lunch, tea or stumps), or sooner if an innings ends or something needs deciding. */
  playSession(): BallEvent[] {
    const out: BallEvent[] = []
    if (!this.clock) return out
    const start = this.current
    const startSession = this.session
    const startDay = this.clock.day
    while (!this.result && !this.awaiting && this.current === start && !start.done && this.clock.day === startDay) {
      const ev = this.playBall()
      if (!ev) break
      out.push(ev)
      if (this.session !== startSession || this.sessionEnds()) break
    }
    return out
  }

  /** A Test: plays to stumps, or sooner if an innings ends or something needs deciding. */
  playDay(): BallEvent[] {
    const out: BallEvent[] = []
    if (!this.clock) return out
    const start = this.current
    const startDay = this.clock.day
    while (!this.result && !this.awaiting && this.current === start && !start.done && this.clock.day === startDay) {
      const ev = this.playBall()
      if (!ev) break
      out.push(ev)
    }
    return out
  }

  /** Plays until the next wicket, boundary-free of overs. Useful for "sim to next wicket". */
  playToWicket(): BallEvent[] {
    const out: BallEvent[] = []
    const startInnings = this.current
    while (!this.result && this.current === startInnings) {
      const ev = this.playBall()
      if (!ev) break
      out.push(ev)
      if (ev.wicket) break
    }
    return out
  }
}

