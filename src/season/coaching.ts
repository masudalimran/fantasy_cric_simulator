import { COACHES, COACH_BY_ID, type Coach, type CoachFocus } from '../data/coaches'
import { Rng } from '../engine/rng'
import type { Player } from '../types'
import { addDays } from './dates'
import { applyShift } from './progression'
import type { AttrKey, Coaching, PlayerShift, Season } from './types'

/**
 * The coaches. Every team has one, picked at random when a career starts. Each month a coach works on one thing for the
 * whole squad (batting, bowling or fielding): you choose for your own team, the computer chooses for the rest. Every day
 * he adds a little training to every player in that area, and now and then it adds up to a whole rating point. It is slow
 * on purpose: a good coach is worth a few points a season, not a new team.
 */

export const LOCK_DAYS = 30
/** Training points per rating, per day, for an average coach and an average player. About one rating point every month or two. */
const BASE = 0.04
/** The most rating points a coach can add to one rating of one player in a year. */
const YEARLY_CAP = 5

export const FOCUS_LABEL: Record<CoachFocus, string> = { batting: 'Batting', bowling: 'Bowling', fielding: 'Fielding' }
export const FOCUS_BLURB: Record<CoachFocus, string> = {
  batting: 'Technique, power, temperament and running for the batsmen',
  bowling: 'Accuracy, variation and stamina for the bowlers',
  fielding: 'Catching, ground fielding and throwing for everyone',
}
const ATTRS_OF: Record<CoachFocus, AttrKey[]> = {
  batting: ['technique', 'power', 'temperament', 'running'],
  bowling: ['accuracy', 'variation', 'stamina'],
  fielding: ['fielding'],
}

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }

/** A different coach for every team, picked at random from the pool. Teams that already have one keep it. */
export function assignCoaches(teamIds: string[], seed: number, existing: Record<string, string> = {}, previous: Record<string, string> = {}): Record<string, string> {
  const out = { ...existing }
  const taken = new Set(Object.values(out))
  const free = new Rng(seed ^ 0xc0ac4).shuffle(COACHES.filter((c) => !taken.has(c.id)))
  for (const id of teamIds) {
    if (out[id]) continue
    // a new coach is never the one the team just had
    const at = free.findIndex((c) => c.id !== previous[id])
    const c = (at >= 0 ? free.splice(at, 1)[0] : undefined) ?? COACHES.find((x) => x.id !== previous[id] && !Object.values(out).includes(x.id)) ?? COACHES[hash(id) % COACHES.length]
    out[id] = c.id
  }
  return out
}

export const coachOf = (season: Pick<Season, 'coaches'>, teamId: string): Coach | undefined => COACH_BY_ID.get(season.coaches?.[teamId] ?? '')
export const coachingOf = (season: Pick<Season, 'coaching'>, teamId: string): Coaching => season.coaching?.[teamId] ?? { focus: null, since: null, lockedUntil: null, history: [] }

/** You have not told your coach what to work on yet. */
export const needsFocus = (season: Pick<Season, 'myTeamId' | 'coaching'>): boolean => !!season.myTeamId && !coachingOf(season, season.myTeamId).focus

/** Your instruction can be changed once a month has gone by. */
export function canChange(c: Coaching, today: string): boolean { return !c.lockedUntil || today >= c.lockedUntil }

/** Gives (or changes) a team's instruction; it stands for at least a month. */
export function setFocus(season: Season, teamId: string, focus: CoachFocus, today: string): Season {
  const cur = coachingOf(season, teamId)
  if (cur.focus && !canChange(cur, today)) return season
  const next: Coaching = { focus, since: today, lockedUntil: addDays(today, LOCK_DAYS), history: [...cur.history, { focus, from: today }] }
  return { ...season, coaching: { ...season.coaching, [teamId]: next }, ...(teamId === season.myTeamId ? { coachChanged: false } : {}) }
}

/** What the computer's coach works on: the squad's weakest area, with a nudge towards the coach's own speciality. */
function cpuChoice(season: Season, teamId: string, players: Player[], coach: Coach | undefined, date: string): CoachFocus {
  const sh = (p: Player) => applyShift(p, season.shifts?.[p.id])
  const xi = players.map(sh).slice(0, 11)
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 99)
  const bat = avg(xi.filter((p) => p.role !== 'BOWL').map((p) => (p.batting.technique + p.batting.power + p.batting.temperament + p.batting.running) / 4))
  const bowl = avg(xi.filter((p) => p.bowling).map((p) => (p.bowling!.accuracy + p.bowling!.variation + p.bowling!.stamina) / 3))
  const field = avg(xi.map((p) => p.fielding))
  const rng = new Rng(hash(`${season.seed}|${teamId}|${date.slice(0, 7)}`))
  const score: Record<CoachFocus, number> = { batting: 100 - bat, bowling: 100 - bowl, fielding: 100 - field }
  if (coach) score[coach.specialty] += 6
  for (const k of Object.keys(score) as CoachFocus[]) score[k] += rng.normal() * 3
  return (Object.keys(score) as CoachFocus[]).sort((a, b) => score[b] - score[a])[0]
}

/** One day of coaching for one team: a little training for everyone in the area, and a whole point when it adds up. */
function trainTeam(season: Season, teamId: string, ids: string[], base: Map<string, Player>, date: string): Season {
  const c = coachingOf(season, teamId)
  const coach = coachOf(season, teamId)
  if (!c.focus || !coach || (c.since && date < c.since)) return season
  const skill = (coach.skill / 80) * (coach.specialty === c.focus ? 1.3 : 1)
  const month = date.slice(0, 7)
  const year = date.slice(0, 4)
  let shifts = season.shifts
  let progress = season.coachProgress
  let report = season.coachReport
  const yearSoFar = (pid: string, attr: AttrKey) => Object.entries(report ?? {}).filter(([m]) => m.startsWith(year)).reduce((n, [, byTeam]) => n + (byTeam[teamId]?.[pid]?.[attr] ?? 0), 0)
  for (const pid of ids) {
    const p0 = base.get(pid)
    if (!p0) continue
    const p = applyShift(p0, shifts?.[pid])
    const weight = c.focus === 'batting' ? (p.role === 'BOWL' ? 0.35 : 1) : c.focus === 'bowling' ? (p.bowling ? (p.role === 'BOWL' || p.role === 'AR' ? 1 : 0.5) : 0) : 1
    if (weight === 0) continue
    for (const attr of ATTRS_OF[c.focus]) {
      const now = attr === 'fielding' ? p.fielding : (p.batting as unknown as Record<string, number>)[attr] ?? (p.bowling as unknown as Record<string, number> | null)?.[attr] ?? 0
      if (!now || now >= 97 || yearSoFar(pid, attr) >= YEARLY_CAP) continue
      const headroom = Math.max(0.3, Math.min(1, (99 - now) / 50))
      const add = BASE * skill * headroom * weight * (c.focus === 'fielding' ? 1.6 : 1)
      const have = (progress?.[pid]?.[attr] ?? 0) + add
      if (have >= 1) {
        const cur = shifts?.[pid] ?? { bat: 0, bowl: 0 }
        const a = { ...(cur.a ?? {}), [attr]: (cur.a?.[attr] ?? 0) + 1 }
        shifts = { ...shifts, [pid]: { ...cur, a } as PlayerShift }
        progress = { ...progress, [pid]: { ...progress?.[pid], [attr]: have - 1 } }
        const mTeam = report?.[month]?.[teamId] ?? {}
        report = { ...report, [month]: { ...report?.[month], [teamId]: { ...mTeam, [pid]: { ...mTeam[pid], [attr]: (mTeam[pid]?.[attr] ?? 0) + 1 } } } }
      } else {
        progress = { ...progress, [pid]: { ...progress?.[pid], [attr]: have } }
      }
    }
  }
  return { ...season, shifts, coachProgress: progress, coachReport: report }
}

/** Some computer team has a coach but no instruction yet (a career saved before they were given one). */
export const cpuCoachingMissing = (season: Pick<Season, 'coaches' | 'coaching' | 'myTeamId' | 'market'>): boolean =>
  !!season.coaches && !!season.market && Object.keys(season.market.squads).some((id) => id !== season.myTeamId && !!season.coaches?.[id] && !season.coaching?.[id]?.focus)

/** Gives every computer team an instruction right away if it has none, so they are all working from the first day (not only once days start to pass). */
export function startCpuCoaching(season: Season, index: Map<string, Player>): Season {
  if (!season.coaches || !season.market) return season
  let cur = season
  for (const teamId of Object.keys(season.market.squads)) {
    if (teamId === season.myTeamId || coachingOf(cur, teamId).focus) continue
    const squad = (cur.market?.squads[teamId] ?? []).map((id) => index.get(id)).filter((p): p is Player => !!p)
    cur = setFocus(cur, teamId, cpuChoice(cur, teamId, squad, coachOf(cur, teamId), season.today), season.today)
  }
  return cur
}

/** Runs the days between two dates: the computer sets its instructions when they are due, then every team trains. */
export function advanceCoaching(prev: Season, next: Season, base: () => Map<string, Player>): Season {
  if (next.today <= prev.today || !next.market || !next.coaches) return next
  const index = base()
  let cur = next
  const teamIds = Object.keys(next.market.squads)
  for (let d = addDays(prev.today, 1); d <= next.today; d = addDays(d, 1)) {
    for (const teamId of teamIds) {
      const squad = (cur.market?.squads[teamId] ?? []).map((id) => index.get(id)).filter((p): p is Player => !!p)
      // the computer picks its instruction when it has none or the month is up (yours is only ever set by you)
      if (teamId !== cur.myTeamId) {
        const c = coachingOf(cur, teamId)
        if (!c.focus || canChange(c, d)) cur = setFocus({ ...cur, coaching: { ...cur.coaching, [teamId]: { ...c, lockedUntil: null } } }, teamId, cpuChoice(cur, teamId, squad, coachOf(cur, teamId), d), d)
      }
      cur = trainTeam(cur, teamId, squad.map((p) => p.id), index, d)
    }
  }
  return cur
}

// ---- Reports ----------------------------------------------------------------------------------------------------------

export interface Gain { playerId: string; attrs: Partial<Record<AttrKey, number>>; total: number }

/** Who got better under a coach in a month, and in what. */
export function monthReport(season: Pick<Season, 'coachReport'>, teamId: string, ym: string): Gain[] {
  const m = season.coachReport?.[ym]?.[teamId] ?? {}
  return Object.entries(m).map(([playerId, attrs]) => ({ playerId, attrs, total: Object.values(attrs).reduce((a, b) => a + (b ?? 0), 0) })).filter((g) => g.total > 0).sort((a, b) => b.total - a.total)
}

/** Every rating point a team's coach has added this year. */
export function seasonBoost(season: Pick<Season, 'coachReport'>, teamId: string): { total: number; players: number } {
  let total = 0
  const who = new Set<string>()
  for (const byTeam of Object.values(season.coachReport ?? {})) for (const [pid, attrs] of Object.entries(byTeam[teamId] ?? {})) { const n = Object.values(attrs).reduce((a, b) => a + (b ?? 0), 0); if (n) { total += n; who.add(pid) } }
  return { total, players: who.size }
}

export interface CoachBoard { teamId: string; coach: Coach; total: number; players: number; perPlayer: number }

/** Which coach has boosted his squad the most, best first. */
export function coachBoard(season: Pick<Season, 'coachReport' | 'coaches' | 'teamIds'>): CoachBoard[] {
  return season.teamIds
    .map((teamId) => {
      const coach = coachOf(season, teamId)
      if (!coach) return null
      const b = seasonBoost(season, teamId)
      return { teamId, coach, total: b.total, players: b.players, perPlayer: b.players ? b.total / b.players : 0 }
    })
    .filter((x): x is CoachBoard => !!x)
    .sort((a, b) => b.total - a.total || b.perPlayer - a.perPlayer)
}

/** Months with a report, newest first. */
export const reportMonths = (season: Pick<Season, 'coachReport'>): string[] => Object.keys(season.coachReport ?? {}).sort().reverse()

