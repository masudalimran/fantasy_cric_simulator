import { NODE_BY_ID } from '../data/passiveTree'
import type { MatchPerks, Rule } from '../engine/perks'
import type { Player } from '../types'
import { retireYearOf } from './careers'
import { inAcademy } from './progression'
import { takenOf } from './perkNums'
import type { Fixture, Season } from './types'

/** The most a team's fielding can gain from perks. */
export const FIELD_CAP = 8

/** Players in the last two seasons of their career. */
export function seasonsLeft(season: Pick<Season, 'market' | 'year'>, id: string): number {
  return season.market ? retireYearOf(season.market, id, season.year) - season.year : 9
}

/** Matches your side has played since a player joined it (only for players who joined during the career). */
export function matchesSinceJoining(season: Season, id: string): number | undefined {
  const me = season.myTeamId
  const m = season.market
  if (!me || !m) return undefined
  const t = [...m.log].reverse().find((x) => x.playerId === id && x.to === me)
  if (!t) return undefined
  const at = season.roster.indexOf(id)
  let n = 0
  for (const f of season.fixtures) {
    const r = season.results[f.id]
    if (r && f.date >= t.date && at >= 0 && r.played?.includes(at)) n++
  }
  return n
}

/** Whether your last three results (before a date) were all wins. */
function onStreak(season: Season, before: string): boolean {
  const me = season.myTeamId
  const mine = season.fixtures.filter((f) => (f.homeId === me || f.awayId === me) && f.date < before && season.results[f.id]).sort((a, b) => a.date.localeCompare(b.date)).slice(-3)
  return mine.length === 3 && mine.every((f) => season.results[f.id].winnerId === me)
}

/**
 * Everything the match engine needs to know about your perks for a match: the rules from the perks you have taken, and who in your XI is a veteran, a
 * rookie, new to the side, or the oldest. Nothing here is saved; it is worked out when a match starts.
 */
export function matchPerksFor(season: Season, xi: Player[], fixture?: Pick<Fixture, 'homeId' | 'phase' | 'date'> | null): MatchPerks | undefined {
  const taken = takenOf(season)
  if (taken.length === 0) return undefined
  const rules: Rule[] = []
  let field = 0, review = 0
  for (const id of taken) {
    const node = NODE_BY_ID.get(id)
    const fx = node?.fx
    if (!fx || !node) continue
    if (fx.rules) rules.push(...fx.rules.map((r) => ({ ...r, name: node.name })))
    field += fx.field ?? 0
    review += fx.review ?? 0
  }
  const left = (p: Player) => seasonsLeft(season, p.id)
  const vets = xi.filter((p) => left(p) <= 2).map((p) => p.id)
  const oldest = [...xi].sort((a, b) => left(a) - left(b))[0]
  const settling: Record<string, number> = {}
  for (const p of xi) { const n = matchesSinceJoining(season, p.id); if (n !== undefined && n < 5) settling[p.id] = n }
  return {
    rules,
    field: Math.min(FIELD_CAP, field),
    review,
    vets,
    rookies: xi.filter((p) => inAcademy(p)).map((p) => p.id),
    settling,
    oldest: oldest?.id,
    home: !!fixture && fixture.homeId === season.myTeamId,
    big: fixture?.phase === 'knockout',
    streak: fixture ? onStreak(season, fixture.date) : false,
  }
}
