import { overall } from '../data/builders'
import { YOUTH, YOUTH_BY_ID } from '../data/youthPool'
import { Rng } from '../engine/rng'
import type { Difficulty } from '../engine/types'
import type { Player, Team } from '../types'
import { addDays, endOfYear } from './dates'
import { applyShift } from './progression'
import type { MarketState, MarketWindow, PlayerShift, Season, Transfer } from './types'

/**
 * The player market: two windows a year when anyone can be bought, sold or released. Prices follow ability, form and
 * promise; every team has a purse and a squad cap of 20, so a team that wants someone new when it is full has to
 * let somebody go. Computer teams shop while the days of a window go by, so an unsigned player you wait on can be
 * snapped up. Pure functions over a Season: nothing here touches the store or the screen.
 */

export const SQUAD_CAP = 20
/** A team never sells or releases below this many players (an XI and some cover). */
export const SQUAD_FLOOR = 13
export const POOL_SIZE = 40
const START_PURSE = 60
const YEARLY_INCOME = 40
const TITLE_BONUS = 10
/** Letting a player go pays this share of what another team would charge for him, so a good player is worth real money. */
const RELEASE_SHARE = 0.7

export function marketWindows(year: number): MarketWindow[] {
  return [
    { id: `${year}-a`, name: 'Season auction', start: `${year}-01-01`, end: `${year}-01-14` },
    { id: `${year}-b`, name: 'Mid-year window', start: `${year}-07-01`, end: `${year}-07-14` },
  ].filter((w) => w.end <= endOfYear(year))
}

/** Which window a date belongs to (id like 2026-a), from the date alone, so it also works for earlier years. */
export function windowOfDate(date: string): { id: string; name: string; year: string } {
  const year = date.slice(0, 4)
  const first = Number(date.slice(5, 7)) <= 6
  return { id: `${year}-${first ? 'a' : 'b'}`, name: first ? 'Season auction' : 'Mid-year window', year }
}

/** The window that is open on `date`, if any. */
export const openWindow = (season: Pick<Season, 'windows'>, date: string): MarketWindow | null =>
  season.windows?.find((w) => date >= w.start && date <= w.end) ?? null

/** The next window that has not finished by `date`. */
export const nextWindow = (season: Pick<Season, 'windows'>, date: string): MarketWindow | null =>
  season.windows?.find((w) => w.end >= date) ?? null

// ---- Finding players -------------------------------------------------------------------------------------------

/** Everyone the market knows about, by id: the teams' own players, youth, and anyone who has moved. */
export function playerIndex(base: Team[], market: MarketState | undefined): Map<string, Player> {
  const m = new Map<string, Player>()
  for (const t of base) for (const p of t.players) m.set(p.id, p)
  for (const y of YOUTH) if (!m.has(y.id)) m.set(y.id, y)
  if (market) for (const [id, p] of Object.entries(market.players)) m.set(id, p)
  return m
}

/** How high a player could get: his hidden potential if he is youth, otherwise where he is now. */
export const potentialOf = (p: Player): number => YOUTH_BY_ID.get(p.id)?.potential ?? (p as { potential?: number }).potential ?? overall(p)
/** A player's yearly fee is this share of what he cost (or is worth). */
export const FEE_SHARE = 0.5

// ---- Value and price -------------------------------------------------------------------------------------------

/** Points a player's recent matches have added to (or taken from) his overall rating. */
export function recentForm(season: Pick<Season, 'changes' | 'fixtures'>, playerId: string): number {
  if (!season.changes) return 0
  const dated = season.fixtures.filter((f) => season.changes?.[f.id]?.[playerId]).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)
  return dated.reduce((s, f) => s + (season.changes?.[f.id]?.[playerId]?.o ?? 0), 0)
}

/** What a player is worth in coins: it climbs steeply with ability, and with form and promise. */
export function marketValue(p: Player, form = 0, shift?: PlayerShift): number {
  const now = applyShift(p, shift)
  const o = overall(now)
  const room = Math.max(0, potentialOf(p) - o)
  const eff = o + 0.35 * room + 1.5 * form
  return Math.max(1, Math.round(0.9 * Math.exp((eff - 40) / 15)))
}


// ---- Setting the market up -------------------------------------------------------------------------------------

function drawPool(reserve: string[], rng: Rng, n: number): { pool: string[]; reserve: string[] } {
  const shuffled = rng.shuffle([...reserve])
  return { pool: shuffled.slice(0, n), reserve: shuffled.slice(n) }
}

/** A fresh market for a career's first year: every team's squad as it is, 40 youth in the pool, a purse each. */
export function initMarket(teams: Team[], seed: number): MarketState {
  const rng = new Rng(seed ^ 0x51ed)
  const { pool, reserve } = drawPool(YOUTH.map((y) => y.id), rng, POOL_SIZE)
  const asking: Record<string, number> = {}
  for (const id of pool) { const y = YOUTH_BY_ID.get(id); if (y) asking[id] = marketValue(y) }
  return {
    squads: Object.fromEntries(teams.map((t) => [t.id, t.players.map((p) => p.id)])),
    players: {},
    pool, reserve, asking,
    budgets: Object.fromEntries(teams.map((t) => [t.id, START_PURSE])),
    log: [],
  }
}

/**
 * Carries the market into the next year: purses are topped up (more for titles won), young players develop towards
 * their potential, unsold youth go back into the reserve, and a new pool of 40 is drawn.
 */
export function rolloverMarket(prev: MarketState, titlesByTeam: Record<string, number>, seed: number, extraIncome: Record<string, number> = {}): MarketState {
  const rng = new Rng(seed ^ 0xa11ce)
  const back = prev.pool.filter((id) => YOUTH_BY_ID.has(id))
  const veterans = prev.pool.filter((id) => !YOUTH_BY_ID.has(id)) // released players stay unsigned
  const { pool: fresh, reserve } = drawPool([...prev.reserve, ...back], rng, POOL_SIZE)
  const pool = [...fresh, ...veterans]
  const asking: Record<string, number> = {}
  for (const id of pool) { const p = YOUTH_BY_ID.get(id) ?? prev.players[id]; if (p) asking[id] = marketValue(p) }
  const budgets: Record<string, number> = {}
  for (const [id, b] of Object.entries(prev.budgets)) budgets[id] = Math.min(150, b + YEARLY_INCOME + TITLE_BONUS * (titlesByTeam[id] ?? 0) + (extraIncome[id] ?? 0))
  return { ...prev, pool, reserve, asking, budgets }
}


/**
 * Extra yearly purse for the team you manage when it is behind the strongest team: the further behind, the more, and the
 * easier the difficulty, the bigger it is. It is the game's push, and it still has to be spent well: the climb comes from the signings.
 */
const CATCH_UP: Record<Difficulty, number> = { easy: 24, normal: 14, hard: 6, legend: 0 }
/** A team this many points of XI rating behind the best gets the full amount. */
const CATCH_UP_GAP = 12

export function catchUpIncome(season: Pick<Season, 'market' | 'myTeamId' | 'difficulty' | 'shifts'>, base: Map<string, Player>): number {
  const m = season.market
  const me = season.myTeamId
  if (!m || !me) return 0
  const strength = (ids: string[]) => ids.map((id) => base.get(id)).filter((p): p is Player => !!p).map((p) => overall(applyShift(p, season.shifts?.[p.id]))).sort((a, b) => b - a).slice(0, 11).reduce((s, x, _, xs) => s + x / xs.length, 0)
  const mine = strength(m.squads[me] ?? [])
  const best = Math.max(...Object.values(m.squads).map(strength))
  return Math.round((CATCH_UP[season.difficulty ?? 'normal'] ?? 0) * Math.max(0, Math.min(1, (best - mine) / CATCH_UP_GAP)))
}
/** How much each player with room to grow gains over a year: a share of the gap to his potential, a little different for each. */
export function developYouth(market: MarketState, shifts: Record<string, PlayerShift>, base: Map<string, Player>, seed: number): Record<string, PlayerShift> {
  const out: Record<string, PlayerShift> = { ...shifts }
  const rng = new Rng(seed ^ 0xdee9)
  const everyone = new Set<string>([...market.pool, ...Object.values(market.squads).flat()])
  for (const id of everyone) {
    const y = YOUTH_BY_ID.get(id)
    const p = base.get(id)
    if (!y || !p) continue
    const gap = y.potential - overall(applyShift(p, out[id]))
    if (gap <= 1) continue
    const gain = Math.max(1, Math.round(gap * (0.18 + rng.next() * 0.14)))
    const keys = (p.bowling ? ['accuracy', 'variation', 'stamina'] : []).concat(p.role === 'BOWL' ? [] : ['technique', 'power', 'temperament', 'running'])
    const cur = out[id] ?? { bat: 0, bowl: 0 }
    const a = { ...(cur.a ?? {}) } as Record<string, number>
    for (let i = 0; i < gain * 2; i++) { const k = keys[rng.int(keys.length)]; a[k] = (a[k] ?? 0) + 1 }
    out[id] = { ...cur, a }
  }
  return out
}

// ---- Buying, selling, releasing -------------------------------------------------------------------------------

export interface Outcome { season: Season; error?: string }

const deny = (season: Season, error: string): Outcome => ({ season, error })
const nid = (season: Season, date: string) => `${date}-${(season.market?.log.length ?? 0) + 1}`

/** What a team wants for a player who is already on its books: more than he is worth, and stars are not for sale cheaply. */
export function askingFromTeam(season: Season, base: Map<string, Player>, ownerId: string, playerId: string): number {
  const m = season.market
  const p = base.get(playerId)
  if (!m || !p) return 0
  const v = marketValue(p, recentForm(season, playerId), season.shifts?.[playerId])
  const top = [...(m.squads[ownerId] ?? [])].map((id) => base.get(id)).filter((x): x is Player => !!x).sort((a, b) => overall(b) - overall(a)).slice(0, 5).some((x) => x.id === playerId)
  return Math.round(v * (top ? 2.2 : 1.4))
}

/** What you get back for releasing a player: 70% of what another team would ask for him. */
export function refundOf(season: Season, base: Map<string, Player>, teamId: string, playerId: string): number {
  return Math.max(0, Math.round(askingFromTeam(season, base, teamId, playerId) * RELEASE_SHARE))
}

function remove<T>(arr: T[], x: T) { return arr.filter((y) => y !== x) }

/**
 * `teamId` signs `playerId` (an unsigned player or one from another team). If the squad is full, `dropId` leaves first.
 * `date` is the day it happens. The price is deducted from the buyer and, for a player from another team, paid to it.
 */
export function signPlayer(season: Season, base: Map<string, Player>, teamId: string, playerId: string, date: string, dropId?: string): Outcome {
  const m = season.market
  const player = base.get(playerId)
  if (!m || !player) return deny(season, 'That player is not available.')
  if (!openWindow(season, date)) return deny(season, 'The market is closed. Wait for the next window.')
  const squad = m.squads[teamId] ?? []
  if (squad.includes(playerId)) return deny(season, 'He is already in your squad.')
  const unsigned = m.pool.includes(playerId)
  const owner = Object.entries(m.squads).find(([, ids]) => ids.includes(playerId))?.[0] ?? null
  if (!unsigned && !owner) return deny(season, 'That player is not available.')
  if (owner && (m.squads[owner]?.length ?? 0) <= SQUAD_FLOOR) return deny(season, 'His team cannot sell: they are down to the minimum squad.')
  const price = unsigned ? (m.asking[playerId] ?? marketValue(player)) : askingFromTeam(season, base, owner as string, playerId)
  const refund = dropId ? refundOf(season, base, teamId, dropId) : 0
  if ((m.budgets[teamId] ?? 0) + refund < price) return deny(season, `Not enough coins. He costs ${price} and you have ${m.budgets[teamId] ?? 0}.`)
  if (squad.length >= SQUAD_CAP && !dropId) return deny(season, `Your squad is full (${SQUAD_CAP}). Release someone first.`)
  if (dropId && !squad.includes(dropId)) return deny(season, 'You can only release someone from your own squad.')

  const log: Transfer[] = [...m.log]
  const squads = { ...m.squads }
  const budgets = { ...m.budgets }
  const players = { ...m.players, [playerId]: m.players[playerId] ?? player }
  let pool = m.pool
  const asking = { ...m.asking }
  let mine = [...squad]
  if (dropId && mine.length >= SQUAD_CAP) {
    mine = remove(mine, dropId)
    budgets[teamId] = (budgets[teamId] ?? 0) + refund
    pool = [...pool, dropId]
    const dp = base.get(dropId)
    players[dropId] = m.players[dropId] ?? (dp as Player)
    asking[dropId] = askingFromTeam(season, base, teamId, dropId) // costs more to take back than the release paid, so there is no profit in it
    log.push({ id: nid(season, date) + 'r', date, playerId: dropId, name: dp?.name ?? dropId, from: teamId, to: null, fee: refund, kind: 'release' })
  }
  budgets[teamId] = (budgets[teamId] ?? 0) - price
  if (owner) { squads[owner] = remove(squads[owner], playerId); budgets[owner] = (budgets[owner] ?? 0) + price }
  if (unsigned) { pool = remove(pool, playerId); delete asking[playerId] }
  squads[teamId] = [...mine, playerId]
  const fees = { ...m.fees, [playerId]: Math.max(1, Math.round(price * FEE_SHARE)) }
  const entry = unsigned && (YOUTH_BY_ID.has(playerId) || playerId.startsWith('gy-')) && m.entry?.[playerId] === undefined ? { ...m.entry, [playerId]: Number(date.slice(0, 4)) } : m.entry
  log.push({ id: nid(season, date), date, playerId, name: player.name, from: owner, to: teamId, fee: price, kind: unsigned ? 'sign' : 'buy' })
  return { season: { ...season, market: { ...m, squads, budgets, players, pool, asking, log, fees, entry } } }
}

/** `teamId` lets `playerId` go; he joins the unsigned pool and the team gets 70% of what another team would charge for him. */
export function releasePlayer(season: Season, base: Map<string, Player>, teamId: string, playerId: string, date: string): Outcome {
  const m = season.market
  const p = base.get(playerId)
  if (!m || !p) return deny(season, 'That player is not on your squad.')
  if (!openWindow(season, date)) return deny(season, 'The market is closed. Wait for the next window.')
  const squad = m.squads[teamId] ?? []
  if (!squad.includes(playerId)) return deny(season, 'That player is not on your squad.')
  if (squad.length <= SQUAD_FLOOR) return deny(season, `A squad needs at least ${SQUAD_FLOOR} players.`)
  const refund = refundOf(season, base, teamId, playerId)
  return {
    season: {
      ...season,
      market: {
        ...m,
        squads: { ...m.squads, [teamId]: remove(squad, playerId) },
        budgets: { ...m.budgets, [teamId]: (m.budgets[teamId] ?? 0) + refund },
        players: { ...m.players, [playerId]: m.players[playerId] ?? p },
        pool: [...m.pool, playerId],
        asking: { ...m.asking, [playerId]: askingFromTeam(season, base, teamId, playerId) },
        log: [...m.log, { id: nid(season, date), date, playerId, name: p.name, from: teamId, to: null, fee: refund, kind: 'release' }],
      },
    },
  }
}

// ---- The computer's shopping ------------------------------------------------------------------------------------

/** The chance each computer team goes shopping on a window day: the harder the difficulty, the busier they are. */
const BUSY: Record<Difficulty, number> = { easy: 0.12, normal: 0.2, hard: 0.32, legend: 0.45 }

const hashDay = (seed: number, date: string) => { let h = seed >>> 0; for (let i = 0; i < date.length; i++) { h = Math.imul(h ^ date.charCodeAt(i), 16777619) } return h >>> 0 }

/** One day of computer shopping. Teams are visited in a seeded order; each may sign at most one player. */
export function cpuMarketDay(season: Season, base: Map<string, Player>, date: string): Season {
  let cur = season
  const m0 = cur.market
  if (!m0 || !openWindow(cur, date)) return cur
  const rng = new Rng(hashDay(cur.seed, date))
  const busy = BUSY[cur.difficulty] ?? BUSY.normal
  const teamIds = rng.shuffle(Object.keys(m0.squads).filter((id) => id !== cur.myTeamId))
  for (const teamId of teamIds) {
    if (!rng.chance(busy)) continue
    const m = cur.market as MarketState
    const squad = (m.squads[teamId] ?? []).map((id) => base.get(id)).filter((p): p is Player => !!p)
    if (squad.length === 0) continue
    const worth = (p: Player) => { const o = overall(applyShift(p, cur.shifts?.[p.id])); return o + 0.35 * Math.max(0, potentialOf(p) - o) }
    const sorted = [...squad].sort((a, b) => worth(b) - worth(a))
    const weakest = sorted[Math.min(sorted.length - 1, 13)] // the 14th-best is the line a newcomer must beat
    const purse = m.budgets[teamId] ?? 0
    // who could he buy? unsigned players mostly; now and then someone from another computer team
    const options: { id: string; price: number; from: string | null }[] = m.pool.map((id) => ({ id, price: m.asking[id] ?? 1, from: null }))
    if (rng.chance(0.2)) {
      for (const other of teamIds) {
        if (other === teamId || (m.squads[other]?.length ?? 0) <= SQUAD_FLOOR) continue
        const extras = (m.squads[other] ?? []).slice(11) // the bench, not the first XI
        for (const id of extras) options.push({ id, price: askingFromTeam(cur, base, other, id), from: other })
      }
    }
    let best: { id: string; price: number; gain: number } | null = null
    for (const o of options) {
      const p = base.get(o.id)
      if (!p || o.price > purse) continue
      const gain = worth(p) - worth(weakest) + rng.normal() * 1.5
      if (gain > 2 && (!best || gain > best.gain)) best = { id: o.id, price: o.price, gain }
    }
    if (!best) continue
    const drop = squad.length >= SQUAD_CAP ? [...squad].sort((a, b) => worth(a) - worth(b))[0]?.id : undefined
    if (drop && best.gain < 4) continue // a full squad only changes for a clear improvement
    const out = signPlayer(cur, base, teamId, best.id, date, drop)
    if (!out.error) cur = out.season
  }
  return cpuOffers(cur, base, date, rng)
}

// ---- Offers for your players -----------------------------------------------------------------------------------

const OFFER_DAYS = 5
const MAX_OFFERS = 3

/** Now and then a computer team asks about one of your players: a fair price, more for a star, never one you cannot afford to lose. */
function cpuOffers(season: Season, base: Map<string, Player>, date: string, rng: Rng): Season {
  const m = season.market
  const me = season.myTeamId
  if (!m || !me) return season
  let offers = (m.offers ?? []).filter((o) => o.expires >= date)
  const mine = (m.squads[me] ?? []).map((id) => base.get(id)).filter((p): p is Player => !!p)
  if (mine.length <= SQUAD_FLOOR) return offers.length === (m.offers ?? []).length ? season : { ...season, market: { ...m, offers } }
  const worth = (p: Player) => { const o = overall(applyShift(p, season.shifts?.[p.id])); return o + 0.35 * Math.max(0, potentialOf(p) - o) }
  const top = new Set([...mine].sort((a, b) => worth(b) - worth(a)).slice(0, 5).map((p) => p.id))
  const busy = BUSY[season.difficulty] ?? BUSY.normal
  for (const teamId of rng.shuffle(Object.keys(m.squads).filter((id) => id !== me))) {
    if (offers.length >= MAX_OFFERS) break
    if (!rng.chance(busy * 0.35)) continue
    const squad = (m.squads[teamId] ?? []).map((id) => base.get(id)).filter((p): p is Player => !!p)
    if (squad.length === 0) continue
    const weakest = [...squad].sort((a, b) => worth(b) - worth(a))[Math.min(squad.length - 1, 13)]
    const purse = m.budgets[teamId] ?? 0
    const wants = mine
      .filter((p) => !offers.some((o) => o.playerId === p.id) && worth(p) - worth(weakest) > 3)
      .map((p) => ({ p, fee: Math.round(marketValue(p, recentForm(season, p.id), season.shifts?.[p.id]) * (1.25 + rng.next() * 0.35) * (top.has(p.id) ? 1.8 : 1)) }))
      .filter((w) => w.fee <= purse)
    if (!wants.length) continue
    const pick = wants[rng.int(wants.length)]
    offers = [...offers, { id: `${date}-o${(m.log.length + offers.length + 1)}`, date, playerId: pick.p.id, teamId, fee: Math.max(1, pick.fee), expires: addDays(date, OFFER_DAYS) }]
  }
  return { ...season, market: { ...m, offers } }
}

/** You accept an offer: he joins them, you get the fee. (If they are full, they let their weakest player go.) */
export function acceptOffer(season: Season, base: Map<string, Player>, offerId: string, date: string): Outcome {
  const m = season.market
  const me = season.myTeamId
  const offer = m?.offers?.find((o) => o.id === offerId)
  if (!m || !me || !offer) return deny(season, 'That offer is no longer on the table.')
  if (!openWindow(season, date)) return deny(season, 'The market is closed.')
  const mine = m.squads[me] ?? []
  const player = base.get(offer.playerId)
  if (!player || !mine.includes(offer.playerId)) return deny(season, 'He is no longer in your squad.')
  if (mine.length <= SQUAD_FLOOR) return deny(season, `You need at least ${SQUAD_FLOOR} players.`)
  if ((m.budgets[offer.teamId] ?? 0) < offer.fee) return deny(season, 'They can no longer afford him.')
  const theirs = m.squads[offer.teamId] ?? []
  const squads = { ...m.squads, [me]: remove(mine, offer.playerId) }
  const log: Transfer[] = [...m.log]
  const players = { ...m.players, [offer.playerId]: m.players[offer.playerId] ?? player }
  let pool = m.pool
  const asking = { ...m.asking }
  let next = [...theirs]
  if (next.length >= SQUAD_CAP) {
    const worth = (p: Player) => overall(applyShift(p, season.shifts?.[p.id]))
    const drop = [...next].map((id) => base.get(id)).filter((p): p is Player => !!p).sort((a, b) => worth(a) - worth(b))[0]
    if (drop) {
      next = remove(next, drop.id); pool = [...pool, drop.id]; players[drop.id] = m.players[drop.id] ?? drop
      asking[drop.id] = askingFromTeam(season, base, offer.teamId, drop.id)
      log.push({ id: `${offer.id}r`, date, playerId: drop.id, name: drop.name, from: offer.teamId, to: null, fee: 0, kind: 'release' })
    }
  }
  squads[offer.teamId] = [...next, offer.playerId]
  log.push({ id: offer.id, date, playerId: offer.playerId, name: player.name, from: me, to: offer.teamId, fee: offer.fee, kind: 'buy' })
  return {
    season: {
      ...season,
      market: {
        ...m, squads, players, pool, asking, log,
        budgets: { ...m.budgets, [me]: (m.budgets[me] ?? 0) + offer.fee, [offer.teamId]: (m.budgets[offer.teamId] ?? 0) - offer.fee },
        offers: (m.offers ?? []).filter((o) => o.id !== offerId && o.playerId !== offer.playerId),
      },
    },
  }
}

export function declineOffer(season: Season, offerId: string): Season {
  const m = season.market
  if (!m) return season
  return { ...season, market: { ...m, offers: (m.offers ?? []).filter((o) => o.id !== offerId) } }
}

/** Runs the computer's window days between two dates (exclusive of `from`, inclusive of `to`). `base` is only built if a window day is crossed. */
export function advanceMarket(prev: Season, next: Season, base: () => Map<string, Player>): Season {
  if (!next.market || next.today <= prev.today) return next
  const crosses = (next.windows ?? []).some((w) => w.end > prev.today && w.start <= next.today)
  if (!crosses) return next
  const index = base()
  let cur = next
  for (let d = addDays(prev.today, 1); d <= next.today; d = addDays(d, 1)) cur = cpuMarketDay(cur, index, d)
  return cur
}

// ---- Looking things up ----------------------------------------------------------------------------------------

/** The team a player belonged to on a date, from the transfer log (null if unsigned, or if the log has no word on it). */
export function teamOnDate(season: Pick<Season, 'market'>, playerId: string, date: string, startTeamId: string | null): string | null {
  let team = startTeamId
  for (const t of (season.market?.log ?? []).filter((x) => x.playerId === playerId).sort((a, b) => a.date.localeCompare(b.date))) {
    if (t.date > date) break
    team = t.to
  }
  return team
}

/** Every move a player has made, oldest first. */
export const movesOf = (season: Pick<Season, 'market'>, playerId: string): Transfer[] => (season.market?.log ?? []).filter((t) => t.playerId === playerId)
