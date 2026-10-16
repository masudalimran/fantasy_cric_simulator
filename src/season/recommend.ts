import { overall } from '../data/builders'
import { autoPickXI, keeperIn, XI_SIZE } from '../data/squad'
import { YOUTH_BY_ID } from '../data/youthPool'
import type { Player, Team } from '../types'
import { potentialOf } from './market'
import { formTable, importance, pickCpuXI } from './selection'
import type { Fixture, Season } from './types'

/**
 * The two squad helpers: the recommended team (the best XI for the next match, taking recent form and injuries into account, the same eye the
 * computer's own selectors use) and "new blood" (as many youngsters in the XI as the next match can afford, or a polite no).
 */

/** A player who is still young: a graduate, or someone with a good way still to grow. */
export const isYoung = (p: Player): boolean => p.id.startsWith('gy-') || YOUTH_BY_ID.has(p.id) || potentialOf(p) - overall(p) >= 5

interface Input {
  /** The squad as it is on the screen now (its order does not matter). */
  team: Team
  /** In a career: the season, so form and injuries and the next match count. */
  season?: Season | null
  teams?: Map<string, Team>
  /** The next match of yours. */
  fixture?: Fixture | null
  /** Players who cannot play (injured). */
  unavailable?: Set<string>
}

export interface Recommended { players: Player[]; keeperId?: string; captainId?: string }

const avg = (xs: Player[]) => xs.reduce((s, p) => s + overall(p), 0) / Math.max(1, xs.length)

/** The best squad order for the next match: the XI in batting order, then the bench. */
export function recommendedSquad({ team, season, teams, fixture, unavailable }: Input): Recommended {
  let players: Player[]
  let keeperId: string | undefined
  if (season && teams && season.myTeamId === team.id) {
    // a full-strength side: pretend the match is a knockout, so nobody is rested
    const out = pickCpuXI(team, season, { date: fixture?.date ?? season.today, phase: 'knockout' }, formTable(season, teams)).team
    players = out.players
    keeperId = out.keeperId
  } else {
    const healthy = team.players.filter((p) => !unavailable?.has(p.id))
    const pool = healthy.length >= XI_SIZE ? healthy : team.players
    const ordered = autoPickXI(pool)
    players = [...ordered, ...team.players.filter((p) => !ordered.includes(p))]
    keeperId = keeperIn(players.slice(0, XI_SIZE))?.id
  }
  const xi = players.slice(0, XI_SIZE)
  const captainId = xi.some((p) => p.id === team.captainId) ? team.captainId : [...xi].sort((a, b) => overall(b) - overall(a))[0]?.id
  return { players, keeperId, captainId }
}

export interface NewBlood extends Recommended { added: Player[]; ok: boolean; message: string }

const bowls = (p: Player) => p.role === 'BOWL' || p.role === 'AR'

/**
 * As many youngsters as the next match can afford. How much weaker the XI may get depends on the match: a knockout hardly any, a league game
 * a little, a friendly or a Test series game quite a bit. Players who anchor the side (its best six, the captain and the keeper) never make way.
 */
export function newBloodSquad(input: Input): NewBlood {
  const base = recommendedSquad(input)
  const xi = base.players.slice(0, XI_SIZE)
  const rest = base.players.slice(XI_SIZE)
  const imp = input.fixture ? importance(input.fixture) : 0.7
  const tolerance = imp >= 1 ? 1.5 : imp >= 0.7 ? 3 : 6
  const available = (p: Player) => !input.unavailable?.has(p.id)
  const young = rest.filter((p) => isYoung(p) && available(p) && p.role !== 'WK').sort((a, b) => overall(b) - overall(a))
  if (!base.players.some(isYoung)) return { ...base, added: [], ok: false, message: 'You have no youngsters in the squad yet. Sign some from the market.' }
  const core = new Set([...[...xi].sort((a, b) => overall(b) - overall(a)).slice(0, 6).map((p) => p.id), base.captainId ?? '', base.keeperId ?? ''])
  const baseAvg = avg(xi)
  let current = [...xi]
  const added: Player[] = []
  for (const y of young) {
    const outs = current.filter((p) => !core.has(p.id) && !isYoung(p) && (!bowls(p) || bowls(y)))
    const out = [...outs].sort((a, b) => overall(a) - overall(b))[0]
    if (!out) continue
    const trial = current.map((p) => (p.id === out.id ? y : p))
    if (trial.filter(bowls).length < 5) continue
    if (baseAvg - avg(trial) > tolerance) continue
    current = trial
    added.push(y)
  }
  if (added.length === 0) {
    return { ...base, added, ok: false, message: imp >= 1 ? 'Not a good idea for this match: it is too big to risk a youngster. Try it on a smaller one.' : 'Not a good idea for the next match: none of your youngsters is close enough to the XI yet.' }
  }
  // the batting order again for the new eleven, then the bench with the rest
  const ordered = autoPickXI(current)
  const bench = base.players.filter((p) => !ordered.some((o) => o.id === p.id))
  const drop = baseAvg - avg(ordered)
  const names = added.map((p) => p.name.split(/\s+/)[0]).join(', ').replace(/, ([^,]*)$/, ' and $1')
  return {
    players: [...ordered, ...bench],
    keeperId: keeperIn(ordered, base.keeperId)?.id,
    captainId: ordered.some((p) => p.id === base.captainId) ? base.captainId : ordered[0]?.id,
    added, ok: true,
    message: `${names} ${added.length === 1 ? 'gets' : 'get'} a chance. ${drop > 0.05 ? `The XI is about ${drop.toFixed(1)} points weaker on paper.` : 'The XI is no weaker on paper.'}`,
  }
}
