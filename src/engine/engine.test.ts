import { describe, expect, it } from 'vitest'
import { BUILT_IN_TEAMS } from '../data/teams'
import { Match } from './match'

const [A, B] = [BUILT_IN_TEAMS[2], BUILT_IN_TEAMS[9]]
const play = (seed: number, format: 't20' | 'odi' = 't20') => {
  const m = new Match({ teamA: A, teamB: B, format, seed })
  m.playMatch()
  return m
}

describe('match engine', () => {
  it('is deterministic for a given seed', () => {
    const a = play(7)
    const b = play(7)
    expect(a.events.map((e) => e.total)).toEqual(b.events.map((e) => e.total))
    expect(a.result?.text).toBe(b.result?.text)
  })

  it('keeps every scorecard consistent', () => {
    for (let seed = 0; seed < 60; seed++) {
      for (const format of ['t20', 'odi'] as const) {
        const m = play(seed, format)
        expect(m.innings).toHaveLength(2)
        for (const inn of m.innings) {
          const batterRuns = inn.batters.reduce((s, b) => s + b.runs, 0)
          const extras = inn.extras.wides + inn.extras.noballs + inn.extras.byes + inn.extras.legByes
          expect(batterRuns + extras).toBe(inn.runs)
          expect(inn.runs).toBe(inn.log.reduce((s, e) => s + e.total, 0))
          const bowlerWickets = [...inn.bowlers.values()].reduce((s, b) => s + b.wickets, 0)
          const runOuts = inn.log.filter((e) => e.wicket?.kind === 'run out').length
          expect(bowlerWickets + runOuts).toBe(inn.wickets)
          expect(inn.wickets).toBeLessThanOrEqual(10)
          expect(inn.legalBalls).toBeLessThanOrEqual(m.maxOvers * 6)
          for (const bl of inn.bowlers.values()) expect(bl.legalBalls / 6).toBeLessThanOrEqual(format === 't20' ? 4 : 10)
        }
        expect(m.result).not.toBeNull()
      }
    }
  })

  it('ends a chase the moment the target is reached', () => {
    for (let seed = 0; seed < 40; seed++) {
      const m = play(seed)
      const [first, second] = m.innings
      if (m.result?.margin?.type === 'wickets') {
        expect(second.runs).toBeGreaterThanOrEqual(first.runs + 1)
        const last = second.log[second.log.length - 1]
        expect(second.runs - last.total).toBeLessThan(second.target as number)
      }
    }
  })

  it('steps by ball, over and innings', () => {
    const m = new Match({ teamA: A, teamB: B, format: 't20', seed: 3 })
    m.playBall()
    expect(m.events.length).toBeGreaterThan(0)
    m.playOver()
    expect(m.current.legalBalls % 6).toBe(0)
    m.playOvers(3)
    expect(m.current.legalBalls).toBe(24)
    m.playInnings()
    expect(m.innings[0].done).toBe(true)
    expect(m.current.index).toBe(1)
    m.playMatch()
    expect(m.isOver).toBe(true)
  })

  it('lets the user steer: attacking batting scores faster but loses more wickets than defending', () => {
    const run = (intent: 'defend' | 'attack') => {
      let runs = 0, wkts = 0
      for (let seed = 0; seed < 150; seed++) {
        const m = new Match({ teamA: A, teamB: B, format: 't20', seed, toss: { winnerSide: 0, decision: 'bat' } })
        m.intent[0] = intent
        m.playInnings()
        runs += m.innings[0].runs
        wkts += m.innings[0].wickets
      }
      return { runs: runs / 150, wkts: wkts / 150 }
    }
    const d = run('defend')
    const a = run('attack')
    expect(a.runs).toBeGreaterThan(d.runs)
    expect(a.wkts).toBeGreaterThan(d.wkts)
    expect(d.wkts).toBeGreaterThan(1) // defending is not a safe harbour
  })

  it('slogging is risky but not a collapse, and the bowling approach matters', () => {
    const avg = (set: (m: Match) => void) => {
      let runs = 0, wkts = 0
      for (let seed = 0; seed < 150; seed++) {
        const m = new Match({ teamA: A, teamB: B, format: 't20', seed, toss: { winnerSide: 0, decision: 'bat' } })
        set(m)
        m.playInnings()
        runs += m.innings[0].runs
        wkts += m.innings[0].wickets
      }
      return { runs: runs / 150, wkts: wkts / 150 }
    }
    const slog = avg((m) => { m.intent[0] = 'slog' })
    expect(slog.wkts).toBeLessThan(9.2) // not "wickets falling like snow"
    const safe = avg((m) => { m.bowlStyle[1] = 'safe' })
    const aggressive = avg((m) => { m.bowlStyle[1] = 'aggressive' })
    expect(aggressive.wkts).toBeGreaterThan(safe.wkts)
    expect(aggressive.runs).toBeGreaterThan(safe.runs - 1) // aggression costs runs when it fails
  })

  it('rewards better players: the stronger side wins more often', () => {
    const strong = BUILT_IN_TEAMS.find((t) => t.id === 'dragonball')!
    const weak = BUILT_IN_TEAMS.find((t) => t.id === 'overwatch')!
    let strongWins = 0
    for (let seed = 0; seed < 200; seed++) {
      const m = new Match({ teamA: strong, teamB: weak, format: 't20', seed })
      const r = m.playMatch()
      if (r.winnerSide !== null && m.sides[r.winnerSide].team.id === 'dragonball') strongWins++
    }
    expect(strongWins / 200).toBeGreaterThan(0.6)
    expect(strongWins / 200).toBeLessThan(0.97) // upsets still happen
  })

  it('stays near real-world T20 and ODI scoring', () => {
    for (const [format, lo, hi] of [['t20', 150, 190, ], ['odi', 235, 290]] as const) {
      let total = 0
      const n = 120
      for (let seed = 0; seed < n; seed++) {
        const m = new Match({ teamA: BUILT_IN_TEAMS[seed % 20], teamB: BUILT_IN_TEAMS[(seed * 7 + 3) % 20 === seed % 20 ? 0 : (seed * 7 + 3) % 20], format, seed, toss: { winnerSide: 0, decision: 'bat' } })
        m.playInnings()
        total += m.innings[0].runs
      }
      const avg = total / n
      expect(avg).toBeGreaterThan(lo)
      expect(avg).toBeLessThan(hi)
    }
  })

  it('always makes the forfeiting side lose, and says so', () => {
    for (let seed = 0; seed < 150; seed++) {
      for (const format of ['t20', 'odi'] as const) {
        const strong = format === 't20' ? A : B // swap which side is stronger now and then
        const m = new Match({ teamA: strong, teamB: strong === A ? B : A, format, seed })
        const side = (seed % 2) as 0 | 1
        // play a few overs first, as a user would before giving up
        m.playOvers(seed % 4)
        const r = m.forfeit(side)
        expect(r.winnerSide).toBe(1 - side)
        expect(r.text).toContain('forfeited')
        expect(m.isOver).toBe(true)
      }
    }
  })

  it('lets you pick the bowler before an over starts, but not mid-over', () => {
    const m = new Match({ teamA: A, teamB: B, format: 't20', seed: 5, toss: { winnerSide: 0, decision: 'bat' } })
    const inn = m.current
    expect(inn.bowlerId).not.toBeNull() // already chosen, so it can be shown
    expect(m.canChangeBowler).toBe(true)
    const options = m.bowlerOptions(1)
    expect(options.length).toBeGreaterThanOrEqual(5)
    const pick = options.find((p) => p.id !== inn.bowlerId)!
    expect(m.setBowler(1, pick.id)).toBe(true)
    m.playBall()
    expect(m.events[0].bowlerId).toBe(pick.id)
    expect(m.canChangeBowler).toBe(false)
    expect(m.setBowler(1, options[0].id)).toBe(false)
    expect(m.setBowler(0, options[0].id)).toBe(false) // the batting side can't choose the bowler
    m.playOver()
    expect(m.canChangeBowler).toBe(true)
    expect(m.bowlerOptions(1).some((p) => p.id === pick.id)).toBe(false) // no two overs in a row
  })

  it('changes ends at the end of every over, and after odd runs, like real cricket', () => {
    let overEnds = 0
    let oddRunOverEnds = 0
    let wicketOverEnds = 0
    for (let seed = 1; seed <= 60; seed++) {
      const m = play(seed, seed % 2 ? 't20' : 'odi')
      for (const inn of m.innings) {
        const log = inn.log
        for (let i = 0; i < log.length - 1; i++) {
          const last = log[i]
          const next = log[i + 1]
          if (!(last.legal && last.ballInOver === 5)) continue // not the last ball of an over
          overEnds++
          const odd = (last.runsBat + (last.extraType === 'bye' || last.extraType === 'legbye' ? last.extraRuns : 0)) % 2 === 1
          if (last.wicket) {
            wicketOverEnds++
            // the new batsman is at the non-striker's end; the not-out batsman faces the next over,
            // unless the non-striker was the one run out (then it's whoever is left)
            expect(next.nonStrikerId).not.toBe(last.wicket.playerId)
            expect(next.strikerId).not.toBe(last.wicket.playerId)
          } else if (odd) {
            oddRunOverEnds++
            expect(next.strikerId).toBe(last.strikerId) // crossed for the run, then the over ended: back to the same batsman
            expect(next.nonStrikerId).toBe(last.nonStrikerId)
          } else {
            expect(next.strikerId).toBe(last.nonStrikerId) // even runs: the other batsman now faces
            expect(next.nonStrikerId).toBe(last.strikerId)
          }
        }
      }
    }
    expect(overEnds).toBeGreaterThan(1000)
    expect(oddRunOverEnds).toBeGreaterThan(50)
    expect(wicketOverEnds).toBeGreaterThan(5)
  })
})

describe('career mode and difficulty', () => {
  const mine = BUILT_IN_TEAMS[4]
  const cpu = BUILT_IN_TEAMS[4] === BUILT_IN_TEAMS[9] ? BUILT_IN_TEAMS[10] : BUILT_IN_TEAMS[9]

  it('knows which side is yours and which is the computer', () => {
    const m = new Match({ teamA: mine, teamB: cpu, format: 't20', seed: 1, career: { myTeamId: mine.id, difficulty: 'hard' } })
    expect(m.mySide).toBe(0)
    expect(m.difficulty).toBe('hard')
    const flipped = new Match({ teamA: cpu, teamB: mine, format: 't20', seed: 1, career: { myTeamId: mine.id, difficulty: 'easy' } })
    expect(flipped.mySide).toBe(1)
    // a match between two computer teams has no difficulty at all
    const neutral = new Match({ teamA: BUILT_IN_TEAMS[1], teamB: BUILT_IN_TEAMS[2], format: 't20', seed: 1, career: { myTeamId: mine.id, difficulty: 'legend' } })
    expect(neutral.mySide).toBeNull()
    expect(neutral.difficulty).toBeNull()
    // and no career at all means you manage both
    expect(new Match({ teamA: mine, teamB: cpu, format: 't20', seed: 1 }).mySide).toBeNull()
  })

  it('makes the computer harder to beat as difficulty rises, same two teams', () => {
    const rate = (difficulty: 'easy' | 'normal' | 'hard' | 'legend') => {
      let wins = 0
      const n = 500
      for (let seed = 1; seed <= n; seed++) {
        const m = new Match({ teamA: mine, teamB: cpu, format: 't20', seed, career: { myTeamId: mine.id, difficulty } })
        m.playMatch()
        if (m.result!.winnerSide === 0) wins++
      }
      return wins / n
    }
    const [e, n, h, l] = [rate('easy'), rate('normal'), rate('hard'), rate('legend')]
    expect(e).toBeGreaterThan(n + 0.03)
    expect(n).toBeGreaterThan(h + 0.02)
    expect(h).toBeGreaterThan(l + 0.02)
    expect(e - l).toBeGreaterThan(0.18) // the whole range matters
  })

  it('leaves matches that do not involve you untouched', () => {
    const a = new Match({ teamA: BUILT_IN_TEAMS[1], teamB: BUILT_IN_TEAMS[2], format: 't20', seed: 7, career: { myTeamId: mine.id, difficulty: 'legend' } })
    // difficulty only touches matches that involve your team
    const b = new Match({ teamA: BUILT_IN_TEAMS[1], teamB: BUILT_IN_TEAMS[2], format: 't20', seed: 7, career: { myTeamId: mine.id, difficulty: 'easy' } })
    a.playMatch(); b.playMatch()
    expect(a.events.map((e) => e.total)).toEqual(b.events.map((e) => e.total))
  })
})

describe('toss choice', () => {
  it('lets a person pick bat or bowl without changing the coin or the winner', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const base = new Match({ teamA: A, teamB: B, format: 't20', seed })
      const bat = new Match({ teamA: A, teamB: B, format: 't20', seed, tossDecision: 'bat' })
      const bowl = new Match({ teamA: A, teamB: B, format: 't20', seed, tossDecision: 'bowl' })
      for (const m of [bat, bowl]) {
        expect(m.toss.coin).toBe(base.toss.coin)
        expect(m.toss.winnerSide).toBe(base.toss.winnerSide)
      }
      expect(bat.toss.decision).toBe('bat')
      expect(bowl.toss.decision).toBe('bowl')
      expect(bat.current.battingSide).toBe(bat.toss.winnerSide)
      expect(bowl.current.battingSide).toBe(1 - bowl.toss.winnerSide)
    }
  })
})

describe('wicketkeeper choice', () => {
  it('uses the keeper you picked, else the keeper-role player', () => {
    const t = A
    const other = t.players.slice(0, 11).find((p) => p.role !== 'WK')!
    const m = new Match({ teamA: { ...t, keeperId: other.id }, teamB: B, format: 't20', seed: 3 })
    const keeperOf = (mm: Match) => (mm as unknown as { keeper: (string | null)[] }).keeper[0]
    expect(keeperOf(m)).toBe(other.id)
    expect(keeperOf(new Match({ teamA: t, teamB: B, format: 't20', seed: 3 }))).toBe(t.players.find((p) => p.role === 'WK')!.id)
  })
})
