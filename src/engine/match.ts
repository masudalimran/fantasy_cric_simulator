import type { BowlType, MatchFormat, Player, Team } from '../types'
import { keeperIn } from '../data/squad'
import { aiIntent, aiTossDecision, chooseBowler } from './ai'
import {
  BYE, DISMISSAL_KINDS, DOT, LEGBYE, WICKET,
  KNOBS, ballProbs, dismissalWeights, effectiveBat, effectiveBowl, parRunsPerOver, REF,
} from './model'
import { Rng, randomSeed } from './rng'
import {
  DIFFICULTIES, FORMATS, INTENT_VALUE, phaseOf,
  type BallEvent, type BatterLine, type BowlerLine, type DismissalKind, type Difficulty, type Innings, type Intent,
  type MatchResult, type Pitch, type Side, type TossResult,
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
      this.blunder = d.blunder
    }
    this.toss = this.doToss(opts.toss, opts.tossDecision)
    const batsFirst = this.toss.decision === 'bat' ? this.toss.winnerSide : ((1 - this.toss.winnerSide) as 0 | 1)
    this.startInnings(0, batsFirst, null)
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
    const decision = forced?.decision ?? chosen ?? ai
    return { callerSide, call, coin, winnerSide, decision }
  }

  private startInnings(index: 0 | 1, battingSide: 0 | 1, target: number | null) {
    const xi = this.sides[battingSide].xi
    const inn: Innings = {
      index, battingSide, runs: 0, wickets: 0, legalBalls: 0,
      extras: { wides: 0, noballs: 0, byes: 0, legByes: 0 },
      batters: [], strikerId: xi[0].id, nonStrikerId: xi[1].id, nextBatsman: 2,
      bowlers: new Map(), bowlerId: null, prevBowlerId: null, overRuns: 0,
      fow: [], target, freeHit: false, done: false, log: [],
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
  battingSide(inn = this.current): Side {
    return this.sides[inn.battingSide]
  }
  bowlingSide(inn = this.current): Side {
    return this.sides[1 - inn.battingSide]
  }
  /** Required run rate while chasing, otherwise null. */
  requiredRate(inn = this.current): number | null {
    if (inn.target === null) return null
    const left = this.maxOvers * 6 - inn.legalBalls
    return left > 0 ? ((inn.target - inn.runs) / left) * 6 : null
  }

  // ---- Bowler selection --------------------------------------------------

  /** Chooses who bowls the next over, so it can be shown (and changed) before the first ball. */
  private pickBowler(inn: Innings) {
    const bowlSide = (1 - inn.battingSide) as 0 | 1
    inn.bowlerId = chooseBowler({ format: this.format, inn, xi: this.sides[bowlSide].xi, keeperId: this.keeper[bowlSide], rng: this.rng })
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
    if (this.result) return null
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
    const fatigue = Math.max(0, bowlerOvers - 1.5) * ((100 - stamina) / (format === 'odi' ? 60 : 110))

    const userIntent = this.intent[battingSideIdx]
    const intent =
      userIntent === null
        ? aiIntent({ format, inn, batter: striker, ballsFaced: strikerLine.balls, xiSize: batXI.length }) +
          // the computer's batting plan, with the odd poor call depending on the difficulty
          (this.blunder > 0 && battingSideIdx === this.cpuSide ? Math.max(-1.2, Math.min(2.2, this.rng.normal() * this.blunder * 0.9)) : 0)
        : typeof userIntent === 'number' ? userIntent : INTENT_VALUE[userIntent]

    const probs = ballProbs({
      format, phase, intent, pitch: this.pitch, freeHit: inn.freeHit,
      forfeit: this.forfeitSide === battingSideIdx ? 'bat' : this.forfeitSide === bowlingSideIdx ? 'bowl' : undefined,
      ballsFaced: strikerLine.balls,
      fieldingAvg: this.fieldingAvg[bowlingSideIdx] + this.bonus[bowlingSideIdx],
      bat: effectiveBat(striker, { phase, bowlType, pressure, form: this.form.get(striker.id)?.bat ?? 0, bonus: this.bonus[battingSideIdx] }),
      bowl: effectiveBowl(bowler, { phase, pitch: this.pitch, inningsIndex: inn.index, fatigue, form: this.form.get(bowler.id)?.bowl ?? 0, bonus: this.bonus[bowlingSideIdx] }),
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
        extraRuns = 1
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
      if (total === 0 && !dismissal) bowlerLine.dots++
    }

    const ev: BallEvent = {
      seq: this.seq++, innings: inn.index, over, ballInOver, legal,
      strikerId: striker.id, nonStrikerId: inn.nonStrikerId, bowlerId: bowler.id,
      runsBat, extraType, extraRuns, total, boundary: runsBat === 4 ? 4 : runsBat === 6 ? 6 : 0,
      wicket: dismissal, intent, freeHit: wasFreeHit,
      score: { runs: inn.runs, wickets: inn.wickets, legalBalls: inn.legalBalls }, tags,
    }

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

    // ---- Is the innings (or match) over?
    const allOut = inn.wickets >= batXI.length - 1
    const oversUp = inn.legalBalls >= this.maxOvers * 6
    const chased = inn.target !== null && inn.runs >= inn.target
    if (allOut || oversUp || chased) {
      inn.done = true
      this.finishInnings(inn)
    } else if (inn.bowlerId === null) {
      this.pickBowler(inn)
    }
    return ev
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
    while (!this.result) this.playBall()
    return this.result
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

