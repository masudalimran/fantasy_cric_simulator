import type { Match } from './match'
import type { BallEvent, BatterLine, BowlerLine, Innings } from './types'

/**
 * The match as it stood just before one ball, for the screen to show while that ball's animations play. The engine has already played the ball (it
 * has to, to decide it), but the scoreboard, scorecard and commentary must not give the result away before the animation has shown it: so while a
 * ball's screens are playing the display reads the match as of the ball before. Rebuilt from the ball-by-ball log, so it is the same as the engine's
 * own state at that moment (tested ball by ball against it).
 */
export function inningsBefore(real: Innings, seq: number): Innings {
  const log = real.log.filter((e) => e.seq < seq)
  const hold = real.log.find((e) => e.seq >= seq)
  const last = log[log.length - 1]
  const extras = { wides: 0, noballs: 0, byes: 0, legByes: 0 }
  const lines = new Map<string, BatterLine>()
  const arrive = (id: string) => { if (!lines.has(id)) lines.set(id, { id, runs: 0, balls: 0, fours: 0, sixes: 0, dismissal: null }) }
  const bowlers = new Map<string, BowlerLine>()
  const fow: Innings['fow'] = []
  // the first two batsmen are in before a ball is bowled; the rest in turn
  for (const b of real.batters.slice(0, 2)) arrive(b.id)
  for (const e of log) {
    arrive(e.strikerId); arrive(e.nonStrikerId)
    const bl = lines.get(e.strikerId)!
    bl.runs += e.runsBat
    if (e.extraType !== 'wide') bl.balls++
    if (e.runsBat === 4) bl.fours++
    if (e.runsBat === 6) bl.sixes++
    if (e.extraType === 'wide') extras.wides += e.extraRuns
    else if (e.extraType === 'noball') extras.noballs += e.extraRuns
    else if (e.extraType === 'bye') extras.byes += e.extraRuns
    else if (e.extraType === 'legbye') extras.legByes += e.extraRuns
    let bw = bowlers.get(e.bowlerId)
    if (!bw) bowlers.set(e.bowlerId, (bw = { id: e.bowlerId, legalBalls: 0, runs: 0, wickets: 0, maidens: 0, dots: 0, wides: 0, noballs: 0 }))
    if (e.legal) bw.legalBalls++
    bw.runs += e.runsBat + (e.extraType === 'wide' || e.extraType === 'noball' ? e.extraRuns : 0)
    if (e.extraType === 'wide') bw.wides++
    if (e.extraType === 'noball') bw.noballs++
    if (e.legal && e.total === 0 && !e.wicket) bw.dots++
    if (e.tags.includes('maiden')) bw.maidens++
    if (e.wicket) {
      const out = lines.get(e.wicket.playerId) ?? (arrive(e.wicket.playerId), lines.get(e.wicket.playerId)!)
      out.dismissal = { kind: e.wicket.kind, bowlerId: e.wicket.bowlerId, fielderId: e.wicket.fielderId }
      if (e.wicket.bowlerId) bw.wickets++
      fow.push({ runs: e.score.runs, wickets: e.score.wickets, playerId: e.wicket.playerId, over: e.over, balls: e.score.legalBalls })
    }
  }
  if (hold) { arrive(hold.strikerId); arrive(hold.nonStrikerId) }
  // keep the batting order of the real innings
  const batters = real.batters.filter((b) => lines.has(b.id)).map((b) => lines.get(b.id)!)
  const reviews = real.reviews ? { ...real.reviews } : undefined
  if (reviews) for (const e of real.log) if (e.seq >= seq && e.review && !e.review.overturned) reviews[e.review.by] += 1
  return {
    ...real,
    runs: last?.score.runs ?? 0, wickets: last?.score.wickets ?? 0, legalBalls: last?.score.legalBalls ?? 0,
    extras, batters, bowlers, fow, log, reviews,
    strikerId: hold?.strikerId ?? real.strikerId, nonStrikerId: hold?.nonStrikerId ?? real.nonStrikerId,
    nextBatsman: batters.length, bowlerId: hold?.bowlerId ?? real.bowlerId, prevBowlerId: last?.bowlerId ?? null,
    overRuns: hold ? log.filter((e) => e.over === hold.over).reduce((s, e) => s + e.runsBat + (e.extraType === 'wide' || e.extraType === 'noball' ? e.extraRuns : 0), 0) : real.overRuns,
    freeHit: hold?.freeHit ?? real.freeHit, done: false, declared: undefined,
  }
}

/** A view of the match with the ball `seq` (and everything after it) not yet happened: the innings it is in as it was before, no later innings, no result. */
export function matchBefore(match: Match, seq: number): Match {
  const hold = match.events.find((e) => e.seq >= seq)
  if (!hold) return match
  const innings = [...match.innings.slice(0, hold.innings), inningsBefore(match.innings[hold.innings], seq)]
  const events: BallEvent[] = match.events.filter((e) => e.seq < seq)
  return new Proxy(match, {
    get(target, prop, receiver) {
      if (prop === 'innings') return innings
      if (prop === 'events') return events
      if (prop === 'result') return null
      if (prop === 'awaiting') return null
      return Reflect.get(target, prop, receiver)
    },
  })
}
