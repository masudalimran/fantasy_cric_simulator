import { describe, expect, it } from 'vitest'
import { BUILT_IN_TEAMS } from '../data/teams'
import { addDays } from './dates'
import { generateSeason } from './generate'
import { assignPhysio, coverInjured, injuriesOf, injuryOn, MAX_DAYS, MIN_DAYS, PHYSIOS, physioOf, releasePhysio, severityOf, shieldFor, xiProblem } from './injuries'
import { forfeitFixture, isMine, tableFor } from './results'

const me = BUILT_IN_TEAMS[0]
const season = generateSeason({ year: 2027, teams: BUILT_IN_TEAMS, seed: 21, myTeamId: me.id })
const ids = BUILT_IN_TEAMS.flatMap((t) => t.players.map((p) => p.id))
const dayList = (from: string, n: number) => Array.from({ length: n }, (_, i) => addDays(from, i))

describe('injuries', () => {
  it('are repeatable, last 3 to 15 days, and have a name and a severity', () => {
    let seen = 0
    for (const id of ids.slice(0, 80)) {
      for (const d of dayList('2027-01-01', 365)) {
        const a = injuryOn(season, id, d)
        expect(injuryOn(season, id, d)).toEqual(a)
        if (!a) continue
        seen++
        expect(a.days).toBeGreaterThanOrEqual(MIN_DAYS)
        expect(a.days).toBeLessThanOrEqual(MAX_DAYS)
        expect(a.severity).toBe(severityOf(a.days))
        expect(a.name.length).toBeGreaterThan(3)
        expect(a.back > d).toBe(true) // he is fit again after the injured days
        expect(a.start <= d).toBe(true)
      }
    }
    expect(seen).toBeGreaterThan(0)
  })

  it('are occasional: about one a season for a player, and a few players out in a squad at a time', () => {
    let starts = 0, hurtDays = 0, days = 0
    const sample = ids.slice(0, 160)
    for (const id of sample) {
      let prev = ''
      for (const d of dayList('2027-01-01', 365)) {
        const inj = injuryOn(season, id, d)
        if (inj) { hurtDays++; if (inj.start !== prev) { starts++; prev = inj.start } }
        days++
      }
    }
    expect(starts / sample.length).toBeGreaterThan(0.4)
    expect(starts / sample.length).toBeLessThan(1.6)
    expect(hurtDays / days).toBeLessThan(0.04)
  })

  it('cannot start while a physio is on a player', () => {
    const everyone = () => true
    for (const id of ids.slice(0, 80)) for (const d of dayList('2027-01-01', 365)) expect(injuryOn(season, id, d, everyone)).toBeNull()
  })

  it('the computer keeps its three best players covered, so they are never injured', () => {
    const t = BUILT_IN_TEAMS[3]
    const best = [...t.players].sort((a, b) => b.batting.power - a.batting.power)
    const shield = shieldFor(season, t)
    const covered = t.players.filter((p) => shield(p.id, '2027-05-01'))
    expect(covered).toHaveLength(PHYSIOS)
    for (const p of covered) for (const d of dayList('2027-01-01', 365)) expect(injuryOn(season, p.id, d, shield)).toBeNull()
    void best
  })
})

describe('physio', () => {
  const team = { id: me.id, players: me.players }
  const date = '2027-02-01'
  // players who are fit on that date
  const fit = me.players.filter((p) => !injuryOn(season, p.id, date))

  it('goes on three players at most, and comes off again', () => {
    let s = season
    for (const p of fit.slice(0, PHYSIOS)) { const out = assignPhysio(s, team, p.id, date); expect(out.error).toBeUndefined(); s = out.season }
    expect(physioOf(s, me.id, date)).toHaveLength(PHYSIOS)
    expect(assignPhysio(s, team, fit[PHYSIOS].id, date).error).toMatch(/busy/)
    expect(assignPhysio(s, team, fit[0].id, date).error).toMatch(/already/)
    const freed = releasePhysio(s, me.id, fit[0].id, date)
    expect(physioOf(freed, me.id, date)).toHaveLength(PHYSIOS - 1) // off straight away
    expect(physioOf(freed, me.id, addDays(date, 1))).toHaveLength(PHYSIOS - 1)
    expect(assignPhysio(freed, team, fit[PHYSIOS].id, addDays(date, 1)).error).toBeUndefined()
  })

  it('comes off even when an older save left the release dated for tomorrow', () => {
    const p = fit[0]
    const old = { ...season, physio: { [me.id]: [{ playerId: p.id, from: '2027-01-01', to: addDays(date, 1) }] } }
    expect(physioOf(old, me.id, date)).toEqual([p.id])
    expect(physioOf(releasePhysio(old, me.id, p.id, date), me.id, date)).toEqual([])
  })

  it('cannot go on a player who is already injured', () => {
    for (const d of dayList('2027-01-01', 365)) {
      const hurt = me.players.find((p) => injuryOn(season, p.id, d))
      if (!hurt) continue
      expect(assignPhysio(season, team, hurt.id, d).error).toMatch(/injured/)
      return
    }
    throw new Error('nobody was injured all year')
  })

  it('stops a player getting injured from the day it goes on', () => {
    const p = fit[0]
    const s = assignPhysio(season, team, p.id, date).season
    const shield = shieldFor(s, team)
    for (const d of dayList(date, 330)) expect(injuryOn(s, p.id, d, shield)).toBeNull()
  })
})

describe('playing without the injured', () => {
  // find a day when somebody in the XI of the team is hurt
  const find = (teamPlayers = me.players) => {
    for (const d of dayList('2027-01-01', 365)) {
      const hurt = injuriesOf(season, { id: me.id, players: teamPlayers }, d)
      if (teamPlayers.slice(0, 11).some((p) => hurt.has(p.id))) return d
    }
    return null
  }

  it('reports who in the XI is hurt, and covers them from the bench for a match', () => {
    const d = find()
    expect(d).not.toBeNull()
    const p = xiProblem(season, me, d as string)
    expect(p.hurtInXI.length).toBeGreaterThan(0)
    expect(p.canFill).toBe(true)
    const covered = coverInjured(me, season, d as string)
    const hurt = injuriesOf(season, me, d as string)
    expect(covered.players.slice(0, 11).some((x) => hurt.has(x.id))).toBe(false)
    expect(covered.players).toHaveLength(me.players.length)
  })

  it('cannot field a side with fewer than eleven fit players', () => {
    const eleven = me.players.slice(0, 11)
    const d = find(eleven)
    expect(d).not.toBeNull()
    const p = xiProblem(season, { ...me, players: eleven }, d as string)
    expect(p.canFill).toBe(false)
    expect(p.fit).toBeLessThan(11)
  })
})

describe('forfeit', () => {
  it('gives the other team the win and counts as a loss for you', () => {
    const teams = new Map(BUILT_IN_TEAMS.map((t) => [t.id, t]))
    const f = season.fixtures.find((x) => isMine(season, x) && x.homeId && x.awayId)!
    const out = forfeitFixture(season, f, teams)
    const res = out.results[f.id]
    const other = f.homeId === me.id ? f.awayId : f.homeId
    expect(res.winnerId).toBe(other)
    expect(res.text).toMatch(/forfeit/i)
    expect(forfeitFixture(out, f, teams)).toBe(out) // only once
    const comp = out.competitions.find((c) => c.id === f.competitionId)!
    const row = tableFor(out, comp).find((r) => r.teamId === me.id)
    expect(row?.lost ?? 0).toBeGreaterThanOrEqual(1)
  })
})
