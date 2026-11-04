import { Rng } from '../engine/rng'
import { COACHES, COACH_BY_ID } from '../data/coaches'
import type { Player } from '../types'
import { applyShift } from './progression'
import { marketValue, openWindow, signPlayer, SQUAD_CAP, SQUAD_FLOOR } from './market'
import type { AttrKey, ClubState, Season } from './types'
import { levelOf } from './clubEffects'
export { levelOf, trainingMult, medicalBlock, physioSlots } from './clubEffects'

/**
 * Your club: what the coins can be spent on besides players. Everything here is plain TypeScript (no screens) and works on the saved
 * season, so old careers simply start with an empty `market.club`. Prices are tied to your wage bill (`scaleOf`), so a rich, winning club pays
 * more than a poor one and the shop never becomes cheap just because you got strong.
 *
 * What is guaranteed and what is luck is always told to the player: the odds are listed (`scoutOdds`, `CAMP_ODDS`, `TICKET_ODDS`), and the
 * luck has a safety net (a pity counter) so a long bad run cannot go on for ever.
 */

export type FacilityKey = 'training' | 'medical' | 'academy' | 'stadium'
export const FACILITY_KEYS: FacilityKey[] = ['training', 'medical', 'academy', 'stadium']
export const MAX_LEVEL = 5

export interface FacilityInfo { key: FacilityKey; name: string; icon: string; blurb: string; perLevel: string; build: number[]; upkeep: number }
/** `build[n]` is the base price of going from level n to n + 1; `upkeep` is the yearly cost of each level. Both are multiplied by `scaleOf`. */
export const FACILITIES: Record<FacilityKey, FacilityInfo> = {
  training: { key: 'training', name: 'Training ground', icon: '🏋️', blurb: 'Your coach works your players harder, and you can run more training camps each year.', perLevel: '+10% coaching speed, +1 camp a year', build: [60, 120, 220, 380, 600], upkeep: 3 },
  medical: { key: 'medical', name: 'Medical centre', icon: '🏥', blurb: 'Fewer injuries across the whole squad, and extra physios at levels 2 and 4.', perLevel: '8% of injuries never happen', build: [60, 120, 220, 380, 600], upkeep: 3 },
  academy: { key: 'academy', name: 'Youth academy', icon: '🎓', blurb: 'At the turn of the year it sets aside young talents for you at a discount, and your scouting trips find better ones.', perLevel: '+1 private prospect a year, better scouting', build: [50, 100, 180, 320, 520], upkeep: 3 },
  stadium: { key: 'stadium', name: 'Stadium', icon: '🏟️', blurb: 'Pure pride: a bigger ground with your name on it. It does not change a single result.', perLevel: 'Prestige only', build: [80, 160, 300, 520, 800], upkeep: 4 },
}

export const SCALE_BASE = 84
/** How much dearer things are for a club with a big wage bill (never cheaper than the start squad's). */
export const scaleOf = (bill: number): number => Math.max(1, Math.round((bill / SCALE_BASE) * 100) / 100)
const money = (base: number, scale: number) => Math.max(1, Math.round((base * scale) / 5) * 5)

export const clubOf = (season: Pick<Season, 'market'>): ClubState => season.market?.club ?? {}
const yearOf = (season: Pick<Season, 'year'>) => season.year
/** The counters in `club` only count for the year they were written in. */
const thisYear = (club: ClubState, year: number) => (club.year === year ? club : { ...club, year, camps: 0, scouts: 0, boosts: 0, tickets: 0, retrains: 0 })

// ---- Prices and upkeep --------------------------------------------------------------------------------------------

export const buildCost = (key: FacilityKey, level: number, scale: number): number => money(FACILITIES[key].build[level] ?? 0, scale)
/** What the club costs to run for a year: each facility level, the coach you hired, and the statues' cleaning (nothing: they are free). */
export function upkeepOf(club: ClubState | undefined, scale: number): [string, number][] {
  const rows: [string, number][] = []
  for (const k of FACILITY_KEYS) { const l = levelOf(club, k); if (l > 0) rows.push([`${FACILITIES[k].name} (level ${l})`, Math.round(l * FACILITIES[k].upkeep * scale)]) }
  const coach = club?.coach ? COACH_BY_ID.get(club.coach) : undefined
  if (coach) rows.push([`Coach ${coach.name}`, coachWage(coach.skill, scale)])
  return rows
}
export const coachWage = (skill: number, scale: number): number => Math.max(1, Math.round((skill / 8) * scale))
export const coachFee = (skill: number, scale: number): number => money((skill * skill) / 70, scale)
export const boostPrice = (bought: number, scale: number): number => money(45 * 1.6 ** bought, scale)
export const BOOSTS_PER_YEAR = 4
export const campPrice = (done: number, scale: number): number => money(22 * (1 + done * 0.4), scale)
export const campsAllowed = (club: ClubState | undefined): number => 2 + levelOf(club, 'training')
export const scoutPrice = (done: number, scale: number): number => money(40 * (1 + done * 0.5), scale)
export const SCOUTS_PER_YEAR = 3
export const ticketPrice = (scale: number): number => money(120, scale)
export const TICKETS_PER_YEAR = 3
export const statuePrice = (n: number, scale: number): number => money(150 * (1 + n * 0.5), scale)

export interface Result { season: Season; error?: string; message?: string; detail?: string }
const deny = (season: Season, error: string): Result => ({ season, error })
const hashStr = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }
const roller = (season: Season, tag: string, n: number) => new Rng((season.seed ^ hashStr(`${tag}:${season.year}:${season.today}`) ^ Math.imul(n + 1, 2654435761)) >>> 0)

function charge(season: Season, price: number, patch: (c: ClubState) => ClubState, extra?: (s: Season) => Season): Result {
  const m = season.market
  const me = season.myTeamId
  if (!m || !me) return deny(season, 'Start a career first.')
  if ((m.budgets[me] ?? 0) < price) return deny(season, `Not enough coins. It costs ${price} and you have ${m.budgets[me] ?? 0}.`)
  const club = patch(thisYear(m.club ?? {}, yearOf(season)))
  let next: Season = { ...season, market: { ...m, club, budgets: { ...m.budgets, [me]: (m.budgets[me] ?? 0) - price } } }
  if (extra) next = extra(next)
  return { season: next }
}

/** Is the money idle? True when the club has more coins than a few seasons of wages would need. */
export const isRich = (purse: number, scale: number): boolean => purse >= 100 * scale

// ---- Facilities ---------------------------------------------------------------------------------------------------

export function upgradeFacility(season: Season, key: FacilityKey, scale: number): Result {
  const level = levelOf(clubOf(season), key)
  if (level >= MAX_LEVEL) return deny(season, `${FACILITIES[key].name} is already at the top level.`)
  const out = charge(season, buildCost(key, level, scale), (c) => ({ ...c, levels: { ...c.levels, [key]: level + 1 } }))
  return out.error ? out : { ...out, message: `${FACILITIES[key].name} is now level ${level + 1}.` }
}

// ---- Staff --------------------------------------------------------------------------------------------------------

/** Coaches nobody is using (not on any team's staff), best first. */
export function freeCoaches(season: Pick<Season, 'coaches'>) {
  const taken = new Set(Object.values(season.coaches ?? {}))
  return COACHES.filter((c) => !taken.has(c.id)).sort((a, b) => b.skill - a.skill)
}

export function hireCoach(season: Season, coachId: string, scale: number): Result {
  const me = season.myTeamId
  const coach = COACH_BY_ID.get(coachId)
  if (!me || !coach) return deny(season, 'That coach cannot be found.')
  if (!freeCoaches(season).some((c) => c.id === coachId)) return deny(season, `${coach.name} already coaches another team.`)
  if (season.coaches?.[me] === coachId) return deny(season, `${coach.name} already coaches you.`)
  const out = charge(season, coachFee(coach.skill, scale), (c) => ({ ...c, coach: coachId }), (s) => ({ ...s, coaches: { ...s.coaches, [me]: coachId } }))
  return out.error ? out : { ...out, message: `${coach.name} is your new coach. He costs ${coachWage(coach.skill, scale)} coins a year.` }
}

// ---- Boost tokens -------------------------------------------------------------------------------------------------

export function boostBought(club: ClubState | undefined, year: number): number { return club?.year === year ? club.boosts ?? 0 : 0 }
/** Buys a token: the coins come out here, and the caller adds one to the career's boost tokens. */
export function buyBoost(season: Season, scale: number): Result {
  const done = boostBought(clubOf(season), season.year)
  if (done >= BOOSTS_PER_YEAR) return deny(season, `You can only buy ${BOOSTS_PER_YEAR} boost tokens a year.`)
  const out = charge(season, boostPrice(done, scale), (c) => ({ ...c, boosts: done + 1 }))
  return out.error ? out : { ...out, message: 'Boost token bought.' }
}

// ---- Training camp ------------------------------------------------------------------------------------------------

export interface CampKind { name: string; odds: number; text: string }
export const CAMP_ODDS: CampKind[] = [
  { name: 'Flop', odds: 15, text: 'Nothing sticks this time.' },
  { name: 'Solid', odds: 45, text: '+1 to two ratings' },
  { name: 'Great', odds: 30, text: '+2 to his main rating and +1 to another' },
  { name: 'Breakthrough', odds: 10, text: '+3 to his main rating and +1 to two others' },
]
const struggling = (score: number) => score < 0.45
/** The camp odds (a struggling team gets a better spread: fewer flops and more breakthroughs). */
export const campOdds = (score: number): number[] => (struggling(score) ? [8, 42, 32, 18] : CAMP_ODDS.map((k) => k.odds))

const BAT_ATTRS: AttrKey[] = ['technique', 'power', 'temperament', 'running']
const BOWL_ATTRS: AttrKey[] = ['accuracy', 'variation', 'stamina']
function rateOf(p: Player, a: AttrKey): number {
  if (a === 'fielding') return p.fielding
  return (p.batting as unknown as Record<string, number>)[a] ?? (p.bowling as unknown as Record<string, number> | null)?.[a] ?? 0
}
const attrsOf = (p: Player): AttrKey[] => [...BAT_ATTRS, ...(p.bowling ? BOWL_ATTRS : []), 'fielding']

export function campFor(season: Season, base: Map<string, Player>, playerId: string, score: number, scale: number): Result {
  const me = season.myTeamId
  const club = thisYear(clubOf(season), season.year)
  const done = club.camps ?? 0
  if (!me || !season.market?.squads[me]?.includes(playerId)) return deny(season, 'He is not in your squad.')
  if (done >= campsAllowed(club)) return deny(season, `You have used all ${campsAllowed(club)} camps this year. A better training ground allows more.`)
  const p0 = base.get(playerId)
  if (!p0) return deny(season, 'He is not in your squad.')
  const p = applyShift(p0, season.shifts?.[playerId])
  const rng = roller(season, `camp:${playerId}`, done + (club.pityCamp ?? 0) * 7)
  let tier = rng.weighted(campOdds(score))
  if ((club.pityCamp ?? 0) >= 2 && tier === 0) tier = 1 // two flops in a row: the third camp always teaches something
  const room = attrsOf(p).filter((a) => rateOf(p, a) > 0 && rateOf(p, a) < 97)
  if (room.length === 0) return deny(season, 'He cannot get any better.')
  // his main rating is the one he is best at; the others are picked by luck
  const main = [...room].sort((a, b) => rateOf(p, b) - rateOf(p, a))[0]
  const others = rng.shuffle(room.filter((a) => a !== main))
  const plan: [AttrKey, number][] = tier === 0 ? [] : tier === 1 ? [[others[0] ?? main, 1], [others[1] ?? main, 1]] : tier === 2 ? [[main, 2], [others[0] ?? main, 1]] : [[main, 3], [others[0] ?? main, 1], [others[1] ?? main, 1]]
  const gains: Partial<Record<AttrKey, number>> = {}
  for (const [a, n] of plan) gains[a] = (gains[a] ?? 0) + n
  for (const a of Object.keys(gains) as AttrKey[]) gains[a] = Math.max(0, Math.min(gains[a] as number, 97 - rateOf(p, a)))
  const out = charge(season, campPrice(done, scale), (c) => ({ ...c, camps: done + 1, pityCamp: tier === 0 ? (c.pityCamp ?? 0) + 1 : 0 }), (s) => {
    const cur = s.shifts?.[playerId] ?? { bat: 0, bowl: 0 }
    const a = { ...cur.a }
    for (const [k, n] of Object.entries(gains) as [AttrKey, number][]) a[k] = (a[k] ?? 0) + n
    return { ...s, shifts: { ...s.shifts, [playerId]: { ...cur, a } } }
  })
  if (out.error) return out
  const text = Object.entries(gains).filter(([, n]) => n).map(([k, n]) => `${k} +${n}`).join(', ')
  return { ...out, message: `${CAMP_ODDS[tier].name}! ${tier === 0 ? CAMP_ODDS[0].text : `${p.name}: ${text}`}`, detail: CAMP_ODDS[tier].name }
}

// ---- Scouting trip ------------------------------------------------------------------------------------------------

export interface Tier { name: string; odds: number }
/** The chance of each kind of talent a trip can find. A struggling team, the academy and a long run of ordinary finds all improve them. */
export function scoutOdds(club: ClubState | undefined, score: number): Tier[] {
  const prodigy = Math.min(40, 8 + (struggling(score) ? 8 : 0) + 2 * levelOf(club, 'academy') + 4 * (club?.pityScout ?? 0))
  const rising = struggling(score) ? 34 : 30
  return [{ name: 'Raw talent', odds: 100 - prodigy - rising }, { name: 'Rising star', odds: rising }, { name: 'Prodigy', odds: prodigy }]
}
const tierOf = (potential: number) => (potential >= 88 ? 2 : potential >= 78 ? 1 : 0)

export function scoutTrip(season: Season, base: Map<string, Player>, score: number, scale: number, potentialOf: (id: string) => number, nameOf: (id: string) => string): Result {
  const me = season.myTeamId
  const m = season.market
  if (!me || !m) return deny(season, 'Start a career first.')
  const club = thisYear(m.club ?? {}, season.year)
  const done = club.scouts ?? 0
  if (done >= SCOUTS_PER_YEAR) return deny(season, `Your scouts have made ${SCOUTS_PER_YEAR} trips this year. They are home until next year.`)
  const candidates = m.reserve.filter((id) => !m.pool.includes(id))
  if (candidates.length === 0) return deny(season, 'The scouts found nobody new this year. Try again next year.')
  const rng = roller(season, 'scout', done)
  const odds = scoutOdds(club, score)
  let tier = rng.weighted(odds.map((t) => t.odds))
  // if nobody of that kind is out there, settle for the nearest kind
  for (const t of [tier, tier - 1, tier + 1, tier - 2, tier + 2]) { if (t >= 0 && t <= 2 && candidates.some((id) => tierOf(potentialOf(id)) === t)) { tier = t; break } }
  const pool = candidates.filter((id) => tierOf(potentialOf(id)) === tier)
  const id = (pool.length ? pool : candidates)[rng.int((pool.length ? pool : candidates).length)]
  const p = base.get(id)
  const ask = p ? Math.max(1, Math.round(marketValue(p) * 0.5)) : 1
  const out = charge(season, scoutPrice(done, scale), (c) => ({ ...c, scouts: done + 1, pityScout: tier === 0 ? (c.pityScout ?? 0) + 1 : 0, reserved: [...(c.reserved ?? []), id] }), (s) => ({
    ...s,
    market: { ...(s.market as NonNullable<Season['market']>), reserve: (s.market as NonNullable<Season['market']>).reserve.filter((x) => x !== id), pool: [...(s.market as NonNullable<Season['market']>).pool, id], asking: { ...(s.market as NonNullable<Season['market']>).asking, [id]: ask } },
  }))
  if (out.error) return out
  return { ...out, message: `${odds[tier].name}! Your scouts found ${nameOf(id)}. He is in the unsigned pool for ${ask} coins (half price), and only you can sign him this year.`, detail: id }
}

// ---- Golden ticket ------------------------------------------------------------------------------------------------

export interface TicketKind { name: string; odds: number; back: number; text: string }
export const TICKET_ODDS: TicketKind[] = [
  { name: 'Rained off', odds: 60, back: 0.25, text: 'You get a quarter of the price back.' },
  { name: 'Fair day', odds: 28, back: 1, text: 'You get the price back.' },
  { name: 'Sell-out', odds: 10, back: 2.5, text: 'A full house: 2.5 times the price.' },
  { name: 'Jackpot', odds: 2, back: 8, text: 'The sponsors line up: 8 times the price.' },
]
/** After this many rained-off tickets in a row, the next one is a sell-out for sure. */
export const TICKET_PITY = 6

export function goldenTicket(season: Season, scale: number): Result {
  const club = thisYear(clubOf(season), season.year)
  const done = club.tickets ?? 0
  if (done >= TICKETS_PER_YEAR) return deny(season, `Only ${TICKETS_PER_YEAR} golden tickets a year.`)
  const price = ticketPrice(scale)
  const rng = roller(season, 'ticket', done + (club.pityTicket ?? 0) * 11)
  let tier = rng.weighted(TICKET_ODDS.map((t) => t.odds))
  if ((club.pityTicket ?? 0) >= TICKET_PITY - 1 && tier < 2) tier = 2
  const back = Math.round(price * TICKET_ODDS[tier].back)
  const out = charge(season, price, (c) => ({ ...c, tickets: done + 1, pityTicket: tier === 0 ? (c.pityTicket ?? 0) + 1 : 0 }), (s) => {
    const me = s.myTeamId as string
    const m = s.market as NonNullable<Season['market']>
    return { ...s, market: { ...m, budgets: { ...m.budgets, [me]: (m.budgets[me] ?? 0) + back } } }
  })
  if (out.error) return out
  return { ...out, message: `${TICKET_ODDS[tier].name}! ${back} coins back (you paid ${price}).`, detail: TICKET_ODDS[tier].name }
}

// ---- Wildcard legend ----------------------------------------------------------------------------------------------

export const WILDCARD_SHARE = 0.6
/** One star from another team that a struggling club may sign at 60% of his price, once a year. Picked from the year and the seed, so it does not change when you look again. */
export function wildcardOffer(season: Season, base: Map<string, Player>, score: number, rate: (p: Player) => number): { player: Player; from: string } | null {
  const me = season.myTeamId
  const m = season.market
  if (!me || !m || !struggling(score)) return null
  if (clubOf(season).wildcard === season.year) return null
  const stars: { player: Player; from: string }[] = []
  for (const [teamId, ids] of Object.entries(m.squads)) {
    if (teamId === me || ids.length <= SQUAD_FLOOR) continue
    for (const id of ids) { const p = base.get(id); if (p) stars.push({ player: applyShift(p, season.shifts?.[id]), from: teamId }) }
  }
  stars.sort((a, b) => rate(b.player) - rate(a.player))
  const top = stars.slice(0, 12)
  if (top.length === 0) return null
  const rng = roller(season, 'wildcard', 0)
  return top[rng.int(top.length)]
}

export function buyWildcard(season: Season, base: Map<string, Player>, offer: { player: Player; from: string }, score: number, rate: (p: Player) => number, dropId?: string): Result {
  const me = season.myTeamId
  const m = season.market
  if (!me || !m) return deny(season, 'Start a career first.')
  const cur = wildcardOffer(season, base, score, rate)
  if (!cur || cur.player.id !== offer.player.id) return deny(season, 'That wildcard is no longer on offer.')
  if (!openWindow(season, season.today)) return deny(season, 'The market is closed. The wildcard can be signed while a window is open.')
  if ((m.squads[me]?.length ?? 0) >= SQUAD_CAP && !dropId) return deny(season, `Your squad is full (${SQUAD_CAP}). Release someone first.`)
  const out = signPlayer(season, base, me, offer.player.id, season.today, dropId, WILDCARD_SHARE)
  if (out.error) return { season, error: out.error }
  const club = thisYear(clubOf(out.season), season.year)
  return { season: { ...out.season, market: { ...(out.season.market as NonNullable<Season['market']>), club: { ...club, wildcard: season.year } } }, message: `${offer.player.name} joined at ${Math.round(WILDCARD_SHARE * 100)}% of his price.` }
}

// ---- Statues ------------------------------------------------------------------------------------------------------

export function buildStatue(season: Season, base: Map<string, Player>, playerId: string, scale: number): Result {
  const p = base.get(playerId)
  const club = clubOf(season)
  if (!p) return deny(season, 'He cannot be found.')
  if ((club.statues ?? []).some((s) => s.id === playerId)) return deny(season, `${p.name} already has a statue.`)
  const out = charge(season, statuePrice((club.statues ?? []).length, scale), (c) => ({ ...c, statues: [...(c.statues ?? []), { id: playerId, name: p.name, year: season.year }] }))
  return out.error ? out : { ...out, message: `A statue of ${p.name} now stands outside the ground.` }
}

// ---- The turn of the year -----------------------------------------------------------------------------------------

/** Youth the academy sets aside at the turn of the year: the best prospects left in the reserve, one per academy level. */
export function academyPicks(club: ClubState | undefined, reserve: string[], potentialOf: (id: string) => number): string[] {
  const n = levelOf(club, 'academy')
  return n > 0 ? [...reserve].sort((a, b) => potentialOf(b) - potentialOf(a)).slice(0, n) : []
}
/** The academy sells its private prospects at this share of their price. */
export const ACADEMY_SHARE = 0.6

// ---- Reminders ----------------------------------------------------------------------------------------------------

export interface Nudge { key: string; icon: string; text: string }
/** One thing the club could do that has not been tried, rotating by month so the same hint does not nag. The page that shows it decides when to. */
/** The same reminder worked out from the season alone (a rough wage bill from the saved fees). `tick` changes weekly so the hint rotates. */
export function quickNudge(season: Season, tick: number): Nudge | null {
  const me = season.myTeamId
  const m = season.market
  if (!me || !m) return null
  const bill = (m.squads[me] ?? []).reduce((n, id) => n + (m.fees?.[id] ?? 4), 0)
  return nudgeFor(season, m.budgets[me] ?? 0, scaleOf(bill), tick)
}
export function nudgeFor(season: Season, purse: number, scale: number, month: number): Nudge | null {
  const club = clubOf(season)
  const unused: Nudge[] = []
  if (FACILITY_KEYS.every((k) => levelOf(club, k) === 0)) unused.push({ key: 'facility', icon: '🏗️', text: 'You have not built anything yet. A training ground or a medical centre pays back every season.' })
  if (!club.year || club.year < season.year) unused.push({ key: 'camp', icon: '🏋️', text: 'A training camp can lift one player a few points. Pick your best young player.' })
  if (!(club.scouts && club.year === season.year)) unused.push({ key: 'scout', icon: '🔭', text: 'Send the scouts out: they may find a prodigy at half price.' })
  if (boostBought(club, season.year) === 0) unused.push({ key: 'boost', icon: '⚡', text: 'A boost token makes the whole team 50% better for one match. Save one for a final.' })
  if (!(club.programmes ?? []).length) unused.push({ key: 'develop', icon: '🎯', text: 'Make a favourite grow: a specialist programme trains one skill (slogging, keeping, swing, spin) much faster.' })
  if (!(club.retrains ?? 0)) unused.push({ key: 'lesson', icon: '🔄', text: 'Teach a player a new trick: change his role, his hand or his kind of bowling.' })
  if (!(club.statues ?? []).length) unused.push({ key: 'statue', icon: '🗿', text: 'Build a statue of your best player for your trophy hall.' })
  if (unused.length === 0 || !isRich(purse, scale)) return null
  return unused[month % unused.length]
}
