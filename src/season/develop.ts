import { Rng } from '../engine/rng'
import { addDays, daysBetween } from './dates'
import { clubOf, type Result } from './club'
import { levelOf } from './clubEffects'
import { perkSum } from './perkNums'
import { coachOf } from './coaching'
import { applyShift, headroom } from './progression'
import type { BowlType, Hand, Player, Role, Trait } from '../types'
import type { AttrKey, ClubState, PlayerShift, Season } from './types'

/**
 * Player development, bought with coins: LESSONS change what a player is (his role, his hand, his kind of bowling), and PROGRAMMES make one of his
 * ratings grow faster for a while and may earn him a trait. Both are plain TypeScript on the saved season: lessons are written into the player's
 * `PlayerShift` (role / hand / bt / nb), so `applyShift` shows the change everywhere. Odds are always shown, and a bad run softens the next try.
 */

const money = (base: number, scale: number) => Math.max(1, Math.round((base * scale) / 5) * 5)
const hashStr = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }
const deny = (season: Season, error: string): Result => ({ season, error })
const worth = (p: Player) => 0.7 + (p.batting.technique + p.batting.power + (p.bowling?.variation ?? p.batting.temperament)) / 300

export const ROLE_NAME: Record<Role, string> = { BAT: 'Batsman', BOWL: 'Bowler', AR: 'All-rounder', WK: 'Wicketkeeper' }
export const BOWL_NAME: Record<BowlType, string> = { fast: 'Fast', medium: 'Medium pace', offspin: 'Off spin', legspin: 'Leg spin', leftspin: 'Left-arm spin' }

// ---- Lessons --------------------------------------------------------------------------------------------------------

export type LessonKind = 'role' | 'hand' | 'bowl'
export interface Lesson { kind: LessonKind; label: string; role?: Role; hand?: Hand; bowl?: BowlType; price: number }

export const LESSON_BASE: Record<LessonKind, number> = { hand: 80, bowl: 90, role: 110 }
/** Lessons in a year: two, and one more per level of training ground. */
export const lessonsAllowed = (club: ClubState | undefined): number => 2 + levelOf(club, 'training')
export interface Outcome3 { name: string; odds: number; text: string }
export const lessonOdds = (club: ClubState | undefined): Outcome3[] => (perkSum({ club }, 'lessonLuck') > 0 ? LESSON_ODDS.map((o, i) => ({ ...o, odds: [66, 28, 6][i] })) : LESSON_ODDS)
export const LESSON_ODDS: Outcome3[] = [
  { name: 'Clean', odds: 60, text: 'He takes to it straight away.' },
  { name: 'Rough', odds: 30, text: 'A few weeks of struggle: small dips while he settles.' },
  { name: 'Struggle', odds: 10, text: 'It is hard for him: bigger dips.' },
]

/** What he could be taught, with prices. */
export function lessonsFor(p: Player, scale: number): Lesson[] {
  const price = (k: LessonKind) => money(LESSON_BASE[k] * worth(p), scale)
  const out: Lesson[] = []
  for (const r of ['BAT', 'BOWL', 'AR', 'WK'] as Role[]) if (r !== p.role) out.push({ kind: 'role', label: `Become a ${ROLE_NAME[r].toLowerCase()}`, role: r, price: price('role') })
  out.push({ kind: 'hand', label: p.hand === 'R' ? 'Switch to left-handed' : 'Switch to right-handed', hand: p.hand === 'R' ? 'L' : 'R', price: price('hand') })
  for (const t of Object.keys(BOWL_NAME) as BowlType[]) if (p.bowling?.type !== t) out.push({ kind: 'bowl', label: p.bowling ? `Bowl ${BOWL_NAME[t].toLowerCase()} instead` : `Learn ${BOWL_NAME[t].toLowerCase()} bowling`, bowl: t, price: price('bowl') })
  return out
}

const dips = (tier: number, n: [number, number, number]) => n[tier]
/** Ratings that move when a lesson is learned, by how it went (clean, rough, struggle). Negative numbers are the dip while he settles. */
function lessonEffects(p: Player, lesson: Lesson, tier: number): Partial<Record<AttrKey, number>> {
  if (lesson.kind === 'hand') return { technique: dips(tier, [0, -3, -6]), ...(p.bowling ? { accuracy: dips(tier, [0, -2, -4]) } : {}) }
  if (lesson.kind === 'bowl') return { variation: dips(tier, [0, -3, -7]), accuracy: dips(tier, [0, -2, -4]) }
  // role: the new job's main rating gets a lift when it goes well
  const r = lesson.role as Role
  const lift = dips(tier, [3, 1, -3])
  return r === 'WK' ? { fielding: lift } : r === 'BAT' ? { technique: lift } : r === 'BOWL' ? { accuracy: lift } : { power: Math.round(lift / 2), variation: Math.round(lift / 2) }
}

export function takeLesson(season: Season, base: Map<string, Player>, playerId: string, lesson: Lesson, chosenBowl?: BowlType): Result {
  const me = season.myTeamId
  const m = season.market
  if (!me || !m || !m.squads[me]?.includes(playerId)) return deny(season, 'He is not in your squad.')
  const p0 = base.get(playerId)
  if (!p0) return deny(season, 'He is not in your squad.')
  const p = applyShift(p0, season.shifts?.[playerId])
  const club = clubOf(season)
  const done = club.year === season.year ? club.retrains ?? 0 : 0
  if (done >= lessonsAllowed(club)) return deny(season, `Your coaches can give ${lessonsAllowed(club)} lessons a year. A better training ground allows more.`)
  if ((m.budgets[me] ?? 0) < lesson.price) return deny(season, `Not enough coins. It costs ${lesson.price} and you have ${m.budgets[me] ?? 0}.`)
  const rng = new Rng((season.seed ^ hashStr(`lesson:${playerId}:${season.year}:${season.today}:${lesson.label}`) ^ Math.imul(done + 1, 2654435761)) >>> 0)
  const odds = lessonOdds(club).map((o) => o.odds)
  let tier = rng.weighted(odds)
  if ((club.pityLesson ?? 0) >= 1 && tier === 2) tier = 1 // after a hard one, the next never goes that badly
  const eff = lessonEffects(p, lesson, tier)
  const cur: PlayerShift = season.shifts?.[playerId] ?? { bat: 0, bowl: 0 }
  const a = { ...cur.a }
  for (const [k, v] of Object.entries(eff) as [AttrKey, number][]) if (v) a[k] = (a[k] ?? 0) + v
  const next: PlayerShift = { ...cur, a }
  let bowlType = chosenBowl ?? lesson.bowl
  if (lesson.kind === 'hand') next.hand = lesson.hand
  if (lesson.kind === 'bowl') bowlType = lesson.bowl
  if (lesson.kind === 'role') {
    next.role = lesson.role
    // becoming a bowler or an all-rounder without ever having bowled: he gets a bowling action built on his batting
    if ((lesson.role === 'BOWL' || lesson.role === 'AR') && !p.bowling) {
      const bat = (p.batting.technique + p.batting.power + p.batting.temperament) / 3
      const t = bowlType ?? 'medium'
      const lvl = Math.round(26 + 0.42 * bat + rng.normal() * 2 - (lesson.role === 'AR' ? 3 : 0) - (tier === 1 ? 3 : tier === 2 ? 7 : 0))
      next.nb = { type: t, accuracy: lvl, variation: lvl - 2, stamina: lvl + 2 }
    }
  }
  if (lesson.kind === 'bowl' && bowlType) {
    if (p.bowling) next.bt = bowlType
    else { const bat = (p.batting.technique + p.batting.power + p.batting.temperament) / 3; const lvl = Math.round(24 + 0.4 * bat - (tier === 1 ? 3 : tier === 2 ? 7 : 0)); next.nb = { type: bowlType, accuracy: lvl, variation: lvl - 2, stamina: lvl + 2 } }
  }
  const nextClub: ClubState = { ...club, year: season.year, camps: club.year === season.year ? club.camps : 0, retrains: done + 1, pityLesson: tier === 2 ? 1 : 0 }
  const out: Season = { ...season, shifts: { ...season.shifts, [playerId]: next }, market: { ...m, club: nextClub, budgets: { ...m.budgets, [me]: (m.budgets[me] ?? 0) - lesson.price } } }
  return { season: out, message: `${LESSON_ODDS[tier].name}! ${p.name}: ${lesson.label.toLowerCase()}. ${LESSON_ODDS[tier].text}`, detail: LESSON_ODDS[tier].name }
}

// ---- Programmes -----------------------------------------------------------------------------------------------------

export const PROGRAMME_DAYS = 45
export const programmeSlots = (club: ClubState | undefined): number => 1 + levelOf(club, 'training')
/** The most a programme can add to one rating. */
export const programmeCap = (club: ClubState | undefined): number => 6 + levelOf(club, 'training')
export const programmePrice = (p: Player, scale: number): number => money(50 * worth(p), scale)
export const TRAIT_BASE = 35
export const TRAIT_STEP = 15

/** What each rating means for this player, in the words a fan would use. */
export function focusLabel(p: Player, attr: AttrKey): string {
  const spin = p.bowling && p.bowling.type !== 'fast' && p.bowling.type !== 'medium'
  switch (attr) {
    case 'power': return 'Slogging: hitting sixes and fours'
    case 'technique': return 'Technique: defence and handling movement'
    case 'temperament': return 'Temperament: big innings and pressure'
    case 'running': return 'Running between the wickets'
    case 'fielding': return p.role === 'WK' ? 'Keeping: catching and stumping' : 'Fielding: catching and throwing'
    case 'accuracy': return 'Line and length: fewer runs, more dots'
    case 'variation': return spin ? 'Spin and turn: the wicket-taking ball' : p.bowling?.type === 'fast' ? 'Swing and seam: the wicket-taking ball' : 'Movement off the pitch: the wicket-taking ball'
    case 'stamina': return 'Stamina: holding his pace through a spell'
  }
}
export function focusesFor(p: Player): AttrKey[] {
  const list: AttrKey[] = ['power', 'technique', 'temperament', 'running']
  if (p.bowling) list.push('variation', 'accuracy', 'stamina')
  list.push('fielding')
  return list
}
const TRAIT_OF: Partial<Record<AttrKey, (p: Player) => Trait[]>> = {
  power: () => ['big-hitter', 'finisher'],
  technique: () => ['anchor'],
  temperament: () => ['clutch', 'big-match'],
  fielding: (p) => (p.role === 'WK' ? ['safe-hands'] : ['electric-fielder', 'safe-hands']),
  accuracy: () => ['economical'],
  variation: (p) => (p.bowling && p.bowling.type !== 'fast' && p.bowling.type !== 'medium' ? ['spin-master', 'wicket-taker'] : ['wicket-taker']),
  stamina: () => ['death-specialist'],
}
/** Traits this rating could earn him that he does not have yet. */
export const traitsLeft = (p: Player, attr: AttrKey): Trait[] => (TRAIT_OF[attr]?.(p) ?? []).filter((t) => !p.traits.includes(t))
export const traitChance = (club: ClubState | undefined): number => Math.min(85, TRAIT_BASE + TRAIT_STEP * (club?.pityTrait ?? 0))

export function startProgramme(season: Season, base: Map<string, Player>, playerId: string, attr: AttrKey, scale: number): Result {
  const me = season.myTeamId
  const m = season.market
  const club = clubOf(season)
  const p0 = base.get(playerId)
  if (!me || !m || !p0 || !m.squads[me]?.includes(playerId)) return deny(season, 'He is not in your squad.')
  const p = applyShift(p0, season.shifts?.[playerId])
  const live = (club.programmes ?? []).filter((x) => x.to > season.today)
  if (live.length >= programmeSlots(club)) return deny(season, `Your coaches are busy: ${programmeSlots(club)} programme${programmeSlots(club) === 1 ? '' : 's'} at a time. A better training ground allows more.`)
  if (live.some((x) => x.id === playerId)) return deny(season, `${p.name} is already on a programme.`)
  const price = programmePrice(p, scale)
  if ((m.budgets[me] ?? 0) < price) return deny(season, `Not enough coins. It costs ${price} and you have ${m.budgets[me] ?? 0}.`)
  const prog = { id: playerId, attr, from: season.today, to: addDays(season.today, PROGRAMME_DAYS), gained: 0, cap: programmeCap(club) }
  return { season: { ...season, market: { ...m, club: { ...club, programmes: [...(club.programmes ?? []).filter((x) => x.to > addDays(season.today, -30)), prog] }, budgets: { ...m.budgets, [me]: (m.budgets[me] ?? 0) - price } } }, message: `${p.name} starts a ${PROGRAMME_DAYS}-day programme: ${focusLabel(p, attr).split(':')[0].toLowerCase()}.` }
}

/** The days between two dates: every programme in progress trains its rating (faster for a low rating and a good coach), and the ones that end roll for a trait. */
export function advanceProgrammes(prev: Season, next: Season, base: () => Map<string, Player>): Season {
  const club0 = next.market?.club
  const me = next.myTeamId
  if (!club0?.programmes?.length || !me || next.today <= prev.today) return next
  const index = base()
  let cur = next
  let club = club0
  const coach = coachOf(next, me)
  const skill = (coach?.skill ?? 60) / 80
  for (let d = addDays(prev.today, 1); d <= next.today; d = addDays(d, 1)) {
    const list = [...(club.programmes ?? [])]
    for (let i = 0; i < list.length; i++) {
      const g = list[i]
      if (d <= g.from || g.gained < 0) continue
      const p0 = index.get(g.id)
      if (!p0) continue
      if (d <= g.to) {
        const p = applyShift(p0, cur.shifts?.[g.id])
        const now = g.attr === 'fielding' ? p.fielding : (p.batting as unknown as Record<string, number>)[g.attr] ?? (p.bowling as unknown as Record<string, number> | null)?.[g.attr] ?? 0
        if (now > 0 && now < 97 && g.gained < g.cap) {
          const prog = (cur.coachProgress?.[g.id]?.[g.attr] ?? 0) + 0.12 * skill * headroom(now)
          if (prog >= 1) {
            const sh: PlayerShift = cur.shifts?.[g.id] ?? { bat: 0, bowl: 0 }
            cur = { ...cur, shifts: { ...cur.shifts, [g.id]: { ...sh, a: { ...sh.a, [g.attr]: (sh.a?.[g.attr] ?? 0) + 1 } } }, coachProgress: { ...cur.coachProgress, [g.id]: { ...cur.coachProgress?.[g.id], [g.attr]: prog - 1 } } }
            list[i] = { ...g, gained: g.gained + 1 }
          } else cur = { ...cur, coachProgress: { ...cur.coachProgress, [g.id]: { ...cur.coachProgress?.[g.id], [g.attr]: prog } } }
        }
      }
      if (d === g.to) {
        const p = applyShift(p0, cur.shifts?.[g.id])
        const left = traitsLeft(p, g.attr)
        if (left.length) {
          const rng = new Rng((cur.seed ^ hashStr(`trait:${g.id}:${g.attr}:${g.to}`)) >>> 0)
          if (rng.next() * 100 < traitChance(club)) {
            const t = left[rng.int(left.length)]
            const sh: PlayerShift = cur.shifts?.[g.id] ?? { bat: 0, bowl: 0 }
            cur = { ...cur, shifts: { ...cur.shifts, [g.id]: { ...sh, traits: [...(sh.traits ?? []), t] } } }
            club = { ...club, pityTrait: 0, graduates: [...(club.graduates ?? []), { id: g.id, trait: t, date: d }] }
          } else club = { ...club, pityTrait: (club.pityTrait ?? 0) + 1, graduates: [...(club.graduates ?? []), { id: g.id, trait: null, date: d }] }
        } else club = { ...club, graduates: [...(club.graduates ?? []), { id: g.id, trait: null, date: d }] }
      }
    }
    club = { ...club, programmes: list }
  }
  return { ...cur, market: { ...(cur.market as NonNullable<Season['market']>), club } }
}

/** Days left on a programme. */
export const daysLeft = (g: { to: string }, today: string): number => Math.max(0, daysBetween(today, g.to))
