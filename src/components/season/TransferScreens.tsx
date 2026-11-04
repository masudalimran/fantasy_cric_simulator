import { useCallback, useEffect, useState } from 'react'
import { BUILT_IN_TEAMS } from '../../data/teams'
import { overall } from '../../data/builders'
import { PRESENTERS } from '../../data/presenters'
import { Match } from '../../engine/match'
import { stadiumLook } from '../../engine/stadium'
import type { Transfer } from '../../season/types'
import type { Player, Team } from '../../types'
import { signingScript } from '../match/signingScript'
import { callName } from '../match/format'
import type { ReplayBase } from '../match/ReplayFrame'
import type { Cast } from '../match/StadiumCam'
import type { StadiumShow } from '../match/stadiumShow'
import { TransferRoom } from './TransferRoom'
import { tierOf } from '../ui'

/** One move to show: what happened, to whom, which club's stage it is on (the new club, or the one he is leaving), and the players of that club. */
export interface TransferRow { t: Transfer; player: Player; from: Team | null; to: Team | null; club: Team; squad: Player[]; /** His yearly wage with the buying club, when known. */ wage?: number }

const hash = (s: string): number => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return (h >>> 0) / 4294967296 }
const TIER_INDEX: Record<string, number> = { Legendary: 5, Elite: 4, Star: 3, Solid: 2, Fringe: 1, Tailender: 0 }

/** A quiet made-up ball to hang the scene on (the stage scene shows no match, but the camera is built on the same pieces as a replay). */
const baseCache = new Map<string, ReplayBase>()
function baseFor(club: Team, seed: number): ReplayBase {
  const key = `${club.id}:${seed}`
  const hit = baseCache.get(key)
  if (hit) return hit
  const other = BUILT_IN_TEAMS.find((t) => t.id !== club.id) ?? BUILT_IN_TEAMS[0]
  const m = new Match({ teamA: club, teamB: other, format: 't20', seed: 3 })
  m.playMatch()
  const ev = m.innings[0].log[0]
  const base: ReplayBase = { event: ev, striker: m.player(ev.strikerId), nonStriker: m.player(ev.nonStrikerId), bowler: m.player(ev.bowlerId), batTeam: m.sides[m.innings[0].battingSide].team, bowlTeam: m.sides[1 - m.innings[0].battingSide].team, fielders: [], pitch: 'balanced', look: stadiumLook(club, seed, 't20') }
  baseCache.set(key, base)
  return base
}

/** The stage scene for one move: what is said, who stands where, and the tier of the player. */
export function signingShow(row: TransferRow): { show: StadiumShow; cast: Cast; base: ReplayBase } {
  const { t, player, from, to, club, squad } = row
  const tier = TIER_INDEX[tierOf(overall(player)).label] ?? 2
  const mode = t.kind === 'release' || !to ? 'release' : t.kind === 'buy' ? 'buy' : 'sign'
  const captain = squad.find((p) => p.id === club.captainId) ?? squad[0]
  const mates = squad.filter((p) => p.id !== captain?.id).slice(0, 9)
  const seed = Math.floor(hash(t.id) * 100000)
  const host = PRESENTERS[Math.floor(hash(t.id + 'h') * PRESENTERS.length) % PRESENTERS.length]
  const script = signingScript({ host: host.name, team: club.name, player: callName(player), captain: captain ? callName(captain) : 'The captain', mode, from: from?.name ?? null, fee: t.fee, tier, seed })
  const title = mode === 'release' ? `THANK YOU, ${callName(player).toUpperCase()}` : `WELCOME ${callName(player).toUpperCase()}`
  const sub = mode === 'release' ? club.name : `${club.name}${t.fee > 0 ? ` · ${t.fee} ${t.fee === 1 ? 'coin' : 'coins'}` : ''}`
  const show: StadiumShow = { kind: 'signing', seed, colors: [club.colors.primary, club.colors.secondary], signing: { script, playerId: player.id, captainId: captain?.id ?? '', hostName: host.name, mode, tier, title, sub } }
  return { show, cast: { team: club, players: [player, ...(captain ? [captain] : []), ...mates], host }, base: baseFor(club, seed) }
}

/**
 * The day's moves as broadcast scenes, one after another: the camera flies into the stadium, the presenter walks on to the club's stage, the new player walks out
 * across the ground (a leaving one is on the stage, and walks away at the end) while the squad runs on and claps, and what is said runs along the bottom.
 * A tap moves on to the next; the tier of the player sets how big the moment is.
 */
export function TransferNews({ rows, mine, extra, onClose }: { rows: TransferRow[]; mine?: string | null; extra: number; onClose: () => void }) {
  const [i, setI] = useState(0)
  const row = rows[i]
  const last = i + 1 >= rows.length
  const next = useCallback(() => (last ? onClose() : setI((n) => n + 1)), [last, onClose])
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  if (!row) return null
  const kind = row.t.kind === 'release' || !row.to ? 'release' : row.t.kind
  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-[#070910]" style={{ paddingTop: 'var(--sat)', paddingBottom: 'var(--sab)' }} role="dialog" aria-label="Transfers">
      <div className="relative z-[9500] flex shrink-0 items-center justify-between px-3 py-2">
        <span className="flex items-center gap-2 rounded bg-black/70 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-widest text-sky-200"><span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />{kind === 'release' ? 'Release' : kind === 'buy' ? 'Transfer' : 'Signing'} {i + 1} / {rows.length}{extra > 0 && i + 1 === rows.length ? ` · +${extra} more in the Market log` : ''}</span>
        <div className="flex gap-2">
          {!last && <button onClick={next} className="cursor-pointer rounded-full bg-white/15 px-3 py-1 text-sm font-bold text-white active:bg-white/25">Next</button>}
          <button onClick={onClose} className="cursor-pointer rounded-full bg-white/15 px-3 py-1 text-sm font-bold text-white active:bg-white/25">Skip all</button>
        </div>
      </div>
      <div className="min-h-0 flex-1" onClick={next}>
        <TransferRoom key={row.t.id} row={row} mine={mine} onDone={next} />
      </div>
    </div>
  )
}
