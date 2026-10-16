import { overall } from '../data/builders'
import { YOUTH_BY_ID } from '../data/youthPool'
import { Rng } from '../engine/rng'
import type { Player } from '../types'
import { applyShift, ATTRS } from './progression'
import { FEE_SHARE, marketValue, potentialOf, SQUAD_FLOOR } from './market'
import type { AttrKey, MarketState, PlayerShift, Season } from './types'

/**
 * Careers, contracts and the yearly budget. Every player has a career of 7 to 10 seasons (a youth signed later gets 9 to 12): then he retires, and a
 * youth takes his place. Every player also costs a yearly fee (what he is worth, a little more or less as he improves or fades). Each year a team
 * earns an income that grows with how it played, and pays all the fees: a team that cannot afford its stars has to let some go. Your own team
 * is asked about each of these (extend a retiring veteran for a higher fee, release someone to balance the books); the computer decides for the rest.
 */

/** A veteran who is asked to stay on costs this much more than last year, and the increase compounds with every extra year. */
export const EXTEND_RAISE = 1.4
const START_CAREER = 7
const CAREER_SPREAD = 4
const JOINED_CAREER = 9
/** The most seasons a retirement can be put off. */
export const MAX_EXTENSIONS = 4

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }

export interface Pending { playerId: string; /** The fee he asks for one more year. */ fee: number; /** Seasons already extended. */ years: number }
export interface YearReport {
  year: number
  income: number
  bill: number
  /** The purse before the year's income and bill, and after. */
  before: number
  after: number
  retired: string[]
  released: string[]
  signed: string[]
}

/** The first year a player's career can end: seven to ten seasons after the career began (or nine to twelve after he first joined a team). */
export function retireYearOf(m: Pick<MarketState, 'originYear' | 'entry' | 'retireAt'>, id: string, fallback: number): number {
  const set = m.retireAt?.[id]
  if (set !== undefined) return set
  const origin = m.originYear ?? fallback
  const joined = m.entry?.[id]
  return joined !== undefined ? joined + JOINED_CAREER + (hash(id) % CAREER_SPREAD) : origin + START_CAREER + (hash(id) % CAREER_SPREAD)
}

/** A player's yearly fee: what is on record for him, or what he is worth now. */
export function feeOf(m: Pick<MarketState, 'fees'>, p: Player, shift?: PlayerShift): number {
  return m.fees?.[p.id] ?? Math.max(1, Math.round(marketValue(p, 0, shift) * FEE_SHARE))
}

/** What a squad costs a year. */
export function billOf(m: Pick<MarketState, 'squads' | 'fees'>, teamId: string, base: Map<string, Player>, shifts?: Record<string, PlayerShift>): number {
  return (m.squads[teamId] ?? []).reduce((s, id) => { const p = base.get(id); return p ? s + feeOf(m, p, shifts?.[id]) : s }, 0)
}

/** How well a team played in a finished season, 0 to 1: its win rate, with a bonus for titles. */
export function seasonScore(season: Season, teamId: string): number {
  let played = 0, won = 0
  for (const f of season.fixtures) {
    const r = season.results[f.id]
    if (!r || (f.homeId !== teamId && f.awayId !== teamId)) continue
    played++
    if (r.winnerId === teamId) won++
  }
  return played ? won / played : 0.5
}

/** A team's income for the year: a share of what its squad cost, more for winning, and a bonus for each title. */
export const incomeOf = (bill: number, score: number, titles: number): number => Math.round(0.6 * bill + 70 * score + 10 * titles)

// ---- Youth ----------------------------------------------------------------------------------------------------------

const SYL_A = ['Ka', 'Ro', 'Mi', 'Ta', 'Shi', 'Yu', 'Ha', 'Ri', 'So', 'Na', 'Ju', 'Ki', 'Be', 'Lu', 'Mo', 'Ve', 'Ar', 'Ze', 'Do', 'Fi', 'Gra', 'Tor', 'Sel', 'Vor', 'Ish', 'Ren']
const SYL_B = ['ru', 'mi', 'ko', 'ta', 'shi', 'ne', 'ra', 'to', 'ki', 'sen', 'lan', 'dor', 'vik', 'zen', 'mar', 'nis', 'bo', 'li', 'gen', 'tho', 'ran', 'su']
const SYL_C = ['ka', 'to', 'ro', 'mi', 'ne', 'zu', 'ya', 'ri', 'do', 'ru', 'ma', 'ku', 'sa', 'ro', 'ven', 'dak', 'ton', 'lis']
const TRAITS_BAT = ['anchor', 'big-hitter', 'finisher', 'clutch'] as const
const TRAITS_BOWL = ['wicket-taker', 'economical', 'death-specialist', 'powerplay-specialist'] as const
const BOWL_TYPES = ['fast', 'medium', 'offspin', 'legspin', 'leftspin'] as const

/** A batch of new academy graduates for a year: raw young players with a hidden ceiling, so there is always someone to take a retiring veteran's place. */
export function generateYouth(year: number, count: number, seed: number): (Player & { potential: number })[] {
  const rng = new Rng((seed ^ Math.imul(year, 2654435761) ^ 0xacad) >>> 0)
  const out: (Player & { potential: number })[] = []
  for (let i = 0; i < count; i++) {
    const role = (['BAT', 'BAT', 'BOWL', 'BOWL', 'AR', 'AR', 'WK'] as const)[rng.int(7)]
    const name = `${SYL_A[rng.int(SYL_A.length)]}${SYL_B[rng.int(SYL_B.length)]}${rng.chance(0.5) ? SYL_C[rng.int(SYL_C.length)] : ''} ${SYL_A[rng.int(SYL_A.length)]}${SYL_C[rng.int(SYL_C.length)]}${SYL_B[rng.int(SYL_B.length)]}`
    const potential = Math.max(58, Math.min(95, Math.round(70 + rng.normal() * 9)))
    const base = Math.max(36, Math.min(62, Math.round(potential - 24 + rng.normal() * 4)))
    const j = () => Math.max(20, Math.min(80, Math.round(base + rng.normal() * 5)))
    const bats = role !== 'BOWL'
    const bowls = role !== 'BAT' && role !== 'WK' || rng.chance(0.2)
    out.push({
      id: `gy-${year}-${i}`, name, series: `Academy ${year}`, universe: 'custom', role, hand: rng.chance(0.8) ? 'R' : 'L',
      batting: bats ? { technique: j(), power: j(), temperament: j(), running: j() } : { technique: Math.max(10, j() - 18), power: Math.max(10, j() - 20), temperament: Math.max(10, j() - 14), running: Math.max(10, j() - 10) },
      bowling: bowls ? { type: BOWL_TYPES[rng.int(BOWL_TYPES.length)], accuracy: j(), variation: j(), stamina: j() } : null,
      fielding: j(),
      traits: rng.chance(0.3) ? [bowls && !bats ? TRAITS_BOWL[rng.int(TRAITS_BOWL.length)] : TRAITS_BAT[rng.int(TRAITS_BAT.length)]] : [],
      potential,
    } as unknown as Player & { potential: number })
  }
  return out
}

/** The ceiling of a young player, whether he came from the youth pool or an academy. */
export const ceilingOf = (m: Pick<MarketState, 'players'>, p: Player): number => (m.players[p.id] as unknown as { potential?: number } | undefined)?.potential ?? (p as unknown as { potential?: number }).potential ?? potentialOf(p)
const isYouth = (m: Pick<MarketState, 'players'>, id: string) => YOUTH_BY_ID.has(id) || id.startsWith('gy-') || (m.players[id] as unknown as { potential?: number } | undefined)?.potential !== undefined

// ---- The turn of the year -------------------------------------------------------------------------------------------

/** Young players grow quickly now: about half the gap to their ceiling every year, so a graduate is a first-team player in three or four seasons. */
function grow(m: MarketState, shifts: Record<string, PlayerShift>, base: Map<string, Player>, rng: Rng): Record<string, PlayerShift> {
  const out: Record<string, PlayerShift> = { ...shifts }
  const everyone = new Set<string>([...m.pool, ...Object.values(m.squads).flat()])
  for (const id of everyone) {
    if (!isYouth(m, id)) continue
    const p = base.get(id)
    if (!p) continue
    const gap = ceilingOf(m, p) - overall(applyShift(p, out[id]))
    if (gap <= 1) continue
    const gain = Math.max(2, Math.round(gap * (0.45 + rng.next() * 0.2)))
    const keys: AttrKey[] = (p.bowling ? ['accuracy', 'variation', 'stamina'] : []).concat(p.role === 'BOWL' ? [] : ['technique', 'power', 'temperament', 'running']) as AttrKey[]
    const cur = out[id] ?? { bat: 0, bowl: 0 }
    const a = { ...(cur.a ?? {}) } as Record<string, number>
    for (let i = 0; i < gain * keys.length; i++) { const k = keys[rng.int(keys.length)]; a[k] = (a[k] ?? 0) + 1 }
    out[id] = { ...cur, a }
  }
  return out
}

/** Veterans in the last two seasons of a career slow down: every rating loses a point (two in the very last year). */
function fade(m: MarketState, shifts: Record<string, PlayerShift>, base: Map<string, Player>, year: number): Record<string, PlayerShift> {
  const out: Record<string, PlayerShift> = { ...shifts }
  for (const id of Object.values(m.squads).flat()) {
    const left = retireYearOf(m, id, year) - year
    if (left > 2) continue
    const p = base.get(id)
    if (!p) continue
    const cur = out[id] ?? { bat: 0, bowl: 0 }
    const a = { ...(cur.a ?? {}) } as Record<string, number>
    const drop = left <= 1 ? 2 : 1
    for (const k of ATTRS) a[k] = (a[k] ?? 0) - drop
    out[id] = { ...cur, a }
  }
  return out
}

interface YearEndInput {
  /** The season that has just finished (its results, its shifts, its market). */
  season: Season
  base: Map<string, Player>
  titles: Record<string, number>
  seed: number
  /** The extra purse the game gives your team this year. */
  catchUp: number
}

export interface YearEndOutput { market: MarketState; shifts: Record<string, PlayerShift>; mine: YearReport | null }

/**
 * Everything that happens to the squads between two seasons: the young grow, the old fade and retire, fees move with form, income comes in and the
 * bill goes out, computer teams let players go if they are over budget and fill their squads from the academy, and a new pool is drawn.
 */
export function yearEnd({ season, base, titles, seed, catchUp }: YearEndInput): YearEndOutput {
  const m0 = season.market as MarketState
  const next = season.year + 1
  const rng = new Rng((seed ^ 0xca7ee7) >>> 0)
  const me = season.myTeamId
  let market: MarketState = { ...m0, originYear: m0.originYear ?? season.year - 1, fees: { ...m0.fees }, entry: { ...m0.entry }, retireAt: { ...m0.retireAt }, squads: { ...m0.squads }, budgets: { ...m0.budgets }, players: { ...m0.players }, pool: [...m0.pool], asking: { ...m0.asking }, log: [...m0.log] }
  let shifts = grow(market, season.shifts ?? {}, base, rng)
  const startShifts = season.startShifts ?? {}
  const now = (id: string) => { const p = base.get(id); return p ? overall(applyShift(p, shifts[id])) : 0 }
  const before = (id: string) => { const p = base.get(id); return p ? overall(applyShift(p, startShifts[id])) : 0 }

  // fees: they follow how a player did over the year
  for (const ids of Object.values(market.squads)) {
    for (const id of ids) {
      const p = base.get(id)
      if (!p) continue
      const d = now(id) - before(id)
      const worth = Math.max(1, Math.round(marketValue(p, 0, shifts[id]) * FEE_SHARE))
      const was = market.fees?.[id] ?? worth
      // a good year puts the fee up, a bad one brings it down, and it never strays far from what he is worth
      const raised = Math.round(was * (1 + Math.max(-0.2, Math.min(0.3, d * 0.04))))
      market.fees![id] = Math.max(1, Math.min(Math.round(worth * 1.5), Math.max(Math.round(worth * 0.7), raised)))
    }
  }
  shifts = fade(market, shifts, base, next)

  // retirements
  const retiring = (id: string) => retireYearOf(market, id, next) <= next
  const retiredByTeam = new Map<string, string[]>()
  for (const [teamId, ids] of Object.entries(market.squads)) {
    const gone = ids.filter(retiring)
    if (gone.length) retiredByTeam.set(teamId, gone)
  }
  const pending: Pending[] = []
  const allRetired: string[] = []
  const forced: string[] = []
  for (const [teamId, gone] of retiredByTeam) {
    if (teamId === me) {
      // your veterans are offered one more year, at a higher fee each time
      for (const id of gone) {
        const p = base.get(id)
        const years = (market.retireAt?.[id] ?? 0) ? Math.max(0, (market.retireAt![id] ?? 0) - (retireYearOf({ ...market, retireAt: {} }, id, next))) : 0
        if (p && years < MAX_EXTENSIONS) pending.push({ playerId: id, fee: Math.round(feeOf(market, p, shifts[id]) * EXTEND_RAISE), years })
        else { market.squads[teamId] = market.squads[teamId].filter((x) => x !== id); allRetired.push(id); forced.push(id) }
      }
    } else {
      market.squads[teamId] = market.squads[teamId].filter((id) => !gone.includes(id))
      allRetired.push(...gone)
    }
  }

  // income and the bill
  const reports = new Map<string, YearReport>()
  for (const teamId of Object.keys(market.squads)) {
    const squad = market.squads[teamId]
    const bill = squad.filter((id) => !pending.some((p) => p.playerId === id)).reduce((s, id) => { const p = base.get(id); return p ? s + feeOf(market, p, shifts[id]) : s }, 0)
    const income = incomeOf(billOf(m0, teamId, base, season.shifts), seasonScore(season, teamId), titles[teamId] ?? 0) + (teamId === me ? catchUp : 0)
    const purse = market.budgets[teamId] ?? 0
    market.budgets[teamId] = Math.min(250, purse + income - bill)
    reports.set(teamId, { year: next, income, bill, before: purse, after: market.budgets[teamId], retired: retiredByTeam.get(teamId)?.filter((id) => allRetired.includes(id)) ?? [], released: [], signed: [] })
  }

  // computer teams: over budget means letting the least useful players go
  const worth = (id: string) => { const p = base.get(id); return p ? overall(applyShift(p, shifts[id])) : 0 }
  for (const teamId of Object.keys(market.squads)) {
    if (teamId === me) continue
    let guard = 0
    while ((market.budgets[teamId] ?? 0) < 0 && market.squads[teamId].length > SQUAD_FLOOR && guard++ < 12) {
      const squad = [...market.squads[teamId]].sort((a, b) => worth(b) - worth(a))
      const cand = squad.slice(11).concat(squad.slice(5, 11)).sort((a, b) => (market.fees?.[b] ?? 1) / Math.max(1, worth(b) - 30) - (market.fees?.[a] ?? 1) / Math.max(1, worth(a) - 30))[0]
      if (!cand) break
      market.squads[teamId] = market.squads[teamId].filter((id) => id !== cand)
      market.budgets[teamId] += market.fees?.[cand] ?? 1
      market.pool.push(cand)
      const pl = base.get(cand)
      if (pl) { market.players[cand] = market.players[cand] ?? pl; market.asking[cand] = Math.max(1, marketValue(pl, 0, shifts[cand])) }
      reports.get(teamId)?.released.push(cand)
    }
    if ((market.budgets[teamId] ?? 0) < 0) market.budgets[teamId] = 0 // a bail-out: nobody goes bankrupt
  }

  // the academy: this year's graduates, enough for every retirement and then some
  const need = Math.max(30, allRetired.length + pending.length + 20)
  const grads = generateYouth(next, need, seed)
  for (const g of grads) { market.players[g.id] = g as Player; }
  // unsold youth go back to the reserve, the rest of the pool stays
  const poolAfter = market.pool.filter((id) => !YOUTH_BY_ID.has(id) && !(base.has(id) && !isYouth(market, id) && retireYearOf(market, id, next) <= next))
  const back = market.pool.filter((id) => YOUTH_BY_ID.has(id))
  const reserve = [...m0.reserve, ...back]
  const drawn = rng.shuffle([...reserve]).slice(0, 30)
  const reserveLeft = reserve.filter((id) => !drawn.includes(id))
  market.pool = [...new Set([...poolAfter, ...drawn, ...grads.map((g) => g.id)])]
  market.reserve = reserveLeft
  const lookup = (id: string): Player | undefined => base.get(id) ?? market.players[id] ?? YOUTH_BY_ID.get(id)
  for (const id of market.pool) { const p = lookup(id); if (p) market.asking[id] = Math.max(1, Math.round(marketValue(p, 0, shifts[id]))) }

  for (const id of forced) if (me) graduateFor(market, me, id, base, shifts, next)

  // computer teams fill their squads: the best prospect each can afford (best ceiling first)
  const prospect = (id: string) => { const p = lookup(id); return p ? ceilingOf(market, p) * 0.6 + overall(applyShift(p, shifts[id])) * 0.4 : 0 }
  for (const teamId of rng.shuffle(Object.keys(market.squads).filter((id) => id !== me))) {
    let guard = 0
    while (market.squads[teamId].length < 16 && guard++ < 20) {
      const purse = market.budgets[teamId] ?? 0
      const options = market.pool.filter((id) => (market.asking[id] ?? 99) <= Math.max(purse, 2)).sort((a, b) => prospect(b) - prospect(a))
      const pick = options[0]
      if (!pick) break
      const p = lookup(pick) as Player
      const fee = Math.max(1, Math.round((market.asking[pick] ?? 1) * FEE_SHARE))
      market.pool = market.pool.filter((id) => id !== pick)
      delete market.asking[pick]
      market.players[pick] = market.players[pick] ?? p
      market.squads[teamId] = [...market.squads[teamId], pick]
      market.fees![pick] = fee
      if (isYouth(market, pick) && market.entry![pick] === undefined) market.entry![pick] = next
      market.budgets[teamId] = Math.max(0, purse - Math.min(purse, fee))
      reports.get(teamId)?.signed.push(pick)
    }
  }
  // players who have joined a team for the first time have their career clock set
  for (const ids of Object.values(market.squads)) for (const id of ids) if (isYouth(market, id) && market.entry![id] === undefined) market.entry![id] = next
  const mineReport = me ? (reports.get(me) ?? null) : null
  market = { ...market, pending: me ? pending : undefined, report: mineReport ?? undefined }
  return { market, shifts, mine: mineReport }
}

// ---- Your decisions -------------------------------------------------------------------------------------------------

/** You keep a retiring veteran for one more year at the higher fee. */
export function extendVeteran(season: Season, id: string): { season: Season; error?: string } {
  const m = season.market
  const me = season.myTeamId
  const offer = m?.pending?.find((x) => x.playerId === id)
  if (!m || !me || !offer) return { season, error: 'That offer is no longer there.' }
  if ((m.budgets[me] ?? 0) < offer.fee) return { season, error: `He asks ${offer.fee} and you have ${m.budgets[me] ?? 0}.` }
  const year = season.year
  const retireAt = { ...m.retireAt, [id]: Math.max(m.retireAt?.[id] ?? 0, year) + 1 }
  return { season: { ...season, market: { ...m, budgets: { ...m.budgets, [me]: (m.budgets[me] ?? 0) - offer.fee }, fees: { ...m.fees, [id]: offer.fee }, retireAt, pending: (m.pending ?? []).filter((x) => x.playerId !== id) } } }
}

/** You let a retiring veteran go: he leaves the squad for good. */
export function retireVeteran(season: Season, base: Map<string, Player>, id: string): Season {
  const m = season.market
  const me = season.myTeamId
  if (!m || !me) return season
  const market: MarketState = { ...m, squads: { ...m.squads, [me]: (m.squads[me] ?? []).filter((x) => x !== id) }, pending: (m.pending ?? []).filter((x) => x.playerId !== id), fees: { ...m.fees }, entry: { ...m.entry }, pool: [...m.pool], asking: { ...m.asking }, players: { ...m.players } }
  graduateFor(market, me, id, base, season.shifts ?? {}, season.year)
  return { ...season, market }
}

/** The academy sends a graduate to take the place of a veteran who has retired: the best prospect in the same line of work, at no cost today. */
function graduateFor(market: MarketState, teamId: string, retiredId: string, base: Map<string, Player>, shifts: Record<string, PlayerShift>, year: number): void {
  const role = (base.get(retiredId) ?? market.players[retiredId])?.role
  const cands = market.pool.filter((id) => id.startsWith('gy-') || YOUTH_BY_ID.has(id)).map((id) => ({ id, p: base.get(id) ?? market.players[id] ?? YOUTH_BY_ID.get(id) })).filter((x): x is { id: string; p: Player } => !!x.p)
  const best = [...cands].sort((a, b) => (b.p.role === role ? 1000 : 0) + ceilingOf(market, b.p) - ((a.p.role === role ? 1000 : 0) + ceilingOf(market, a.p)))[0]
  if (!best) return
  market.pool = market.pool.filter((x) => x !== best.id)
  delete market.asking[best.id]
  market.players[best.id] = market.players[best.id] ?? best.p
  market.squads[teamId] = [...market.squads[teamId], best.id]
  market.fees![best.id] = Math.max(1, Math.round(marketValue(best.p, 0, shifts[best.id]) * FEE_SHARE))
  market.entry![best.id] = year
}

/** Something is waiting on you at the turn of the year: a veteran who is retiring, or a purse that is empty. */
export const contractsPending = (season: Pick<Season, 'market' | 'myTeamId'>): boolean => !!season.market && !!season.myTeamId && ((season.market.pending?.length ?? 0) > 0 || (season.market.budgets[season.myTeamId] ?? 0) < 0)

/** The players on your squad a year-end purse that is below zero could still be balanced by releasing, most expensive first. */
export function cutCandidates(season: Season, base: Map<string, Player>): { player: Player; fee: number }[] {
  const m = season.market
  const me = season.myTeamId
  if (!m || !me) return []
  return (m.squads[me] ?? []).map((id) => base.get(id)).filter((p): p is Player => !!p).map((player) => ({ player, fee: feeOf(m, player, season.shifts?.[player.id]) })).sort((a, b) => b.fee - a.fee)
}

/** You let someone go to balance the books: he joins the unsigned pool and his fee comes back to the purse (no window needed at the turn of the year). */
export function letGo(season: Season, base: Map<string, Player>, id: string): { season: Season; error?: string } {
  const m = season.market
  const me = season.myTeamId
  const p = base.get(id)
  if (!m || !me || !p || !(m.squads[me] ?? []).includes(id)) return { season, error: 'He is not in your squad.' }
  if ((m.squads[me] ?? []).length <= SQUAD_FLOOR) return { season, error: `A squad needs at least ${SQUAD_FLOOR} players.` }
  const fee = feeOf(m, p, season.shifts?.[id])
  return {
    season: {
      ...season,
      market: {
        ...m,
        squads: { ...m.squads, [me]: m.squads[me].filter((x) => x !== id) },
        budgets: { ...m.budgets, [me]: (m.budgets[me] ?? 0) + fee },
        pool: [...m.pool, id],
        players: { ...m.players, [id]: m.players[id] ?? p },
        asking: { ...m.asking, [id]: Math.max(1, marketValue(p, 0, season.shifts?.[id])) },
      },
    },
  }
}

/** The board covers what is left of a deficit you cannot cut (a squad at its minimum): the purse goes back to zero. */
export function boardBailout(season: Season): Season {
  const m = season.market
  const me = season.myTeamId
  if (!m || !me || (m.budgets[me] ?? 0) >= 0) return season
  return { ...season, market: { ...m, budgets: { ...m.budgets, [me]: 0 } } }
}
