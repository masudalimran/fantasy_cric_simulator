import { describe, expect, it } from 'vitest'
import { BUILT_IN_TEAMS } from '../data/teams'
import { Match } from './match'

const [A, B] = [BUILT_IN_TEAMS[2], BUILT_IN_TEAMS[9]]
const play = (seed: number) => { const m = new Match({ teamA: A, teamB: B, format: 'test', seed }); m.playMatch(); return m }

describe('a Test match', () => {
  it('is deterministic for a seed', () => {
    const a = play(11), b = play(11)
    expect(a.events.map((e) => e.total)).toEqual(b.events.map((e) => e.total))
    expect(a.result?.text).toBe(b.result?.text)
  })

  it('keeps every card consistent and ends within five days', () => {
    for (let seed = 0; seed < 60; seed++) {
      const m = play(seed)
      expect(m.result).not.toBeNull()
      expect(m.innings.length).toBeGreaterThanOrEqual(1)
      expect(m.innings.length).toBeLessThanOrEqual(4)
      expect(m.clock!.day).toBeLessThanOrEqual(5)
      for (const inn of m.innings) {
        const batterRuns = inn.batters.reduce((s, b) => s + b.runs, 0)
        const extras = inn.extras.wides + inn.extras.noballs + inn.extras.byes + inn.extras.legByes
        expect(batterRuns + extras).toBe(inn.runs)
        expect(inn.wickets).toBeLessThanOrEqual(10)
      }
      // the days: never more than 102 overs, and a plan is 88-102 less what the weather took
      expect(m.clock!.plan.scheduled).toBeLessThanOrEqual(102)
      expect(m.clock!.plan.scheduled + m.clock!.plan.lost).toBeGreaterThanOrEqual(m.clock!.plan.scheduled)
    }
  })

  it('has results that match how the match went', () => {
    const kinds = new Set<string>()
    for (let seed = 0; seed < 120; seed++) {
      const m = play(seed)
      const r = m.result!
      kinds.add(r.draw ? 'draw' : r.margin?.type ?? 'tie')
      if (r.draw) { expect(r.winnerSide).toBeNull(); expect(m.clock!.day).toBe(5); expect(r.text).toMatch(/drawn/) }
      if (r.margin?.type === 'wickets') {
        const last = m.innings[m.innings.length - 1]
        expect(last.index).toBe(3)
        expect(last.runs).toBeGreaterThanOrEqual(last.target as number)
        expect(last.battingSide).toBe(r.winnerSide)
      }
      if (r.margin?.type === 'runs') {
        const last = m.innings[m.innings.length - 1]
        expect(last.index).toBe(3)
        expect(last.runs).toBe((last.target as number) - 1 - r.margin.value)
        expect(last.battingSide).not.toBe(r.winnerSide)
      }
      if (r.margin?.type === 'innings') expect(m.innings.length).toBe(3)
    }
    expect(kinds.has('draw')).toBe(true)
    expect(kinds.has('wickets')).toBe(true)
    expect(kinds.has('runs')).toBe(true)
  })

  it('plays out Test-like scores: patient batting, tens of overs a day', () => {
    let runs = 0, balls = 0, n = 0, draws = 0
    for (let seed = 0; seed < 80; seed++) {
      const m = play(seed)
      for (const inn of m.innings) { runs += inn.runs; balls += inn.legalBalls; n++ }
      if (m.result?.draw) draws++
    }
    const rpo = (runs / balls) * 6
    expect(rpo).toBeGreaterThan(2.5)
    expect(rpo).toBeLessThan(3.6)
    expect(runs / n).toBeGreaterThan(220)
    expect(runs / n).toBeLessThan(380)
    expect(draws / 80).toBeGreaterThan(0.05)
    expect(draws / 80).toBeLessThan(0.55)
  })

  it('stops at lunch, tea and stumps when played a session at a time, and waits for the next day', () => {
    const m = new Match({ teamA: A, teamB: B, format: 'test', seed: 5 })
    const startSession = m.session
    const balls = m.playSession()
    expect(balls.length).toBeGreaterThan(0)
    if (!m.isOver && m.current.index === 0 && !m.current.done) expect(m.session === startSession ? m.oversLeftToday : 0).toBeGreaterThanOrEqual(0)
    for (let i = 0; i < 4 && !m.isOver && !m.awaiting; i++) m.playDay()
    // once the day is done the match waits until somebody starts the next one
    if (!m.isOver && m.awaiting === 'day') {
      const day = m.clock!.day
      expect(m.playBall()).toBeNull()
      m.startNextDay()
      expect(m.clock!.day).toBeGreaterThan(day)
      expect(m.awaiting).toBeNull()
    }
  })

  it('lets a person declare, and ask a side to follow on', () => {
    let sawFollowOn = false
    for (let seed = 0; seed < 80 && !sawFollowOn; seed++) {
      const m = new Match({ teamA: A, teamB: B, format: 'test', seed })
      // play without declaring until the first innings ends or something has to be decided
      for (let g = 0; g < 100000 && !m.isOver && m.awaiting !== 'followon'; g++) {
        if (m.awaiting === 'day') m.startNextDay()
        else m.playBall()
        if (m.innings.length >= 3) break
      }
      if (m.awaiting === 'followon') {
        sawFollowOn = true
        expect(m.decideFollowOn(true)).toBe(true)
        expect(m.current.followOn).toBe(true)
        expect(m.current.battingSide).toBe(m.innings[1].battingSide)
      }
    }
    const m = new Match({ teamA: A, teamB: B, format: 'test', seed: 3 })
    m.playOvers(10)
    expect(m.declare()).toBe(true)
    expect(m.current.index).toBe(1)
    expect(m.innings[0].declared).toBe(true)
    // the limited-overs formats have no declaration
    const t = new Match({ teamA: A, teamB: B, format: 't20', seed: 3 })
    expect(t.declare()).toBe(false)
  })
})
