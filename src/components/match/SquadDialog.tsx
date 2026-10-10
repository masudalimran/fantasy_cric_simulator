import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { overall, teamStrength } from '../../data/builders'
import { autoPickXI, keeperIn, missingPicks, swapPlayers, validateSquad, XI_SIZE } from '../../data/squad'
import { ATTR_LABEL, ratingRows } from '../../season/progression'
import { useTeams } from '../../store/useStore'
import type { Player, Team } from '../../types'
import { Delta, PlayerAvatar, RatingBadge, ROLE_LABEL, TeamCrest } from '../ui'

/**
 * Change a team's XI, batting order, captain and keeper just before the toss. Each player shows his rating with how
 * far the career has moved it, so you can pick on current form. Click one player and then another to swap them.
 */
export function SquadDialog({ team, scope, onSave, onClose }: {
  team: Team
  /** What saving does, in a few words: "for this career" or "for this match only". */
  scope: string
  onSave: (order: string[], captainId: string, keeperId: string | undefined) => void
  onClose: () => void
}) {
  const baseTeams = useTeams()
  const baseOf = (id: string): Player | undefined => baseTeams.find((t) => t.id === team.id)?.players.find((p) => p.id === id)
  const [players, setPlayers] = useState<Player[]>(team.players)
  const [captainId, setCaptainId] = useState(team.captainId)
  const [keeperId, setKeeperId] = useState<string | undefined>(keeperIn(team.players.slice(0, XI_SIZE), team.keeperId)?.id)
  const [selected, setSelected] = useState<number | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  const check = useMemo(() => validateSquad(players, captainId, keeperId), [players, captainId, keeperId])
  const missing = missingPicks(players, captainId, keeperId)
  const effKeeper = keeperIn(players.slice(0, XI_SIZE), keeperId)?.id
  const dirty = players.some((p, i) => p.id !== team.players[i]?.id) || captainId !== team.captainId || effKeeper !== keeperIn(team.players.slice(0, XI_SIZE), team.keeperId)?.id
  const canSave = check.errors.length === 0 && !missing.captain && !missing.keeper

  const click = (i: number) => {
    if (selected === null) setSelected(i)
    else if (selected === i) setSelected(null)
    else { setPlayers((l) => swapPlayers(l, selected, i)); setSelected(null) }
  }

  const row = (p: Player, i: number) => {
    const base = baseOf(p.id)
    const rows = base ? ratingRows(base, p) : []
    const o = rows[0]
    const moved = rows.slice(1).filter((r) => r.now !== r.base)
    const inXI = i < XI_SIZE
    return (
      <li
        key={p.id} onClick={() => click(i)}
        className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-2 py-1.5 transition ${selected === i ? 'border-indigo-400 bg-indigo-400/15' : 'border-line/70 bg-panel-2 hover:border-slate-500'}`}
      >
        <span className="w-5 text-center font-display text-base text-slate-500">{inXI ? i + 1 : '·'}</span>
        <PlayerAvatar profile player={p} team={team} size={30} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-white">{p.name}</span>
          <span className="flex flex-wrap items-center gap-x-2 text-[11px] text-slate-400">
            {ROLE_LABEL[p.role]}{p.bowling ? ` · ${p.bowling.type}` : ''}
            {moved.map((r) => <span key={r.key} className="whitespace-nowrap">{ATTR_LABEL[r.key as keyof typeof ATTR_LABEL]} <Delta n={r.now - r.base} /></span>)}
          </span>
        </span>
        <button onClick={(e) => { e.stopPropagation(); setCaptainId(p.id) }} title={captainId === p.id ? 'Captain' : 'Make captain'} className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${captainId === p.id ? 'bg-amber-400/25 text-amber-300' : 'text-slate-600 hover:text-slate-200'}`}>C</button>
        <button onClick={(e) => { e.stopPropagation(); setKeeperId(p.id) }} title={effKeeper === p.id ? 'Wicketkeeper' : 'Make wicketkeeper'} className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${effKeeper === p.id ? 'bg-sky-400/25 text-sky-300' : 'text-slate-600 hover:text-slate-200'}`}>WK</button>
        <span className="flex w-24 shrink-0 items-center justify-end gap-1.5 tabular-nums" title={o && o.now !== o.base ? `Started at ${o.base}, now ${o.now}` : undefined}>
          {o && o.now !== o.base && <><span className="text-xs text-slate-500">{o.base}→</span><Delta n={o.now - o.base} className="text-xs" /></>}
          <RatingBadge value={overall(p)} size="sm" />
        </span>
      </li>
    )
  }

  return (
    <motion.div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        role="dialog" aria-modal="true" aria-label={`${team.name} squad`}
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 20, scale: 0.96, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }}
        className="my-auto flex max-h-[94vh] w-full max-w-4xl flex-col rounded-3xl border border-line bg-ink shadow-2xl"
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-line px-5 py-3">
          <TeamCrest team={team} size={44} />
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-display text-3xl leading-none tracking-wide text-white">{team.name} squad</h2>
            <p className="text-xs text-slate-400">Click a player, then another, to swap them. The top 11 play in this batting order. Saved {scope}. Green and red show how a rating has moved since the player started.</p>
          </div>
          <div className="text-center"><RatingBadge value={teamStrength({ ...team, players: players.slice(0, XI_SIZE) })} size="md" /><div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">XI rating</div></div>
          <button onClick={() => { const xi = autoPickXI(players); setPlayers(xi); setKeeperId(keeperIn(xi.slice(0, XI_SIZE))?.id); setSelected(null) }} className="rounded-lg border border-line px-3 py-1.5 text-sm hover:border-indigo-400" title="A balanced XI: one keeper, five bowling options, the best of the rest">Auto-pick XI</button>
          <button onClick={onClose} aria-label="Close" className="rounded-lg border border-line px-2.5 py-1 text-sm font-bold text-slate-200 hover:border-slate-400">✕</button>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 md:grid-cols-[3fr_2fr]">
          <section>
            <h3 className="mb-1.5 text-[11px] font-extrabold uppercase tracking-widest text-amber-300">Playing XI · batting order</h3>
            <ol className="space-y-1.5">{players.slice(0, XI_SIZE).map((p, i) => row(p, i))}</ol>
          </section>
          <section>
            <h3 className="mb-1.5 text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Bench</h3>
            <ol className="space-y-1.5">{players.slice(XI_SIZE).map((p, i) => row(p, i + XI_SIZE))}</ol>
            {players.length <= XI_SIZE && <p className="rounded-lg border border-dashed border-line p-4 text-center text-xs text-slate-500">No one on the bench.</p>}
          </section>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3">
          <ul className="space-y-0.5 text-xs">
            {check.errors.map((e) => <li key={e} className="text-red-300">• {e}</li>)}
            {missing.captain && <li className="text-amber-300">• Your captain is not in the playing XI. Pick one with C.</li>}
            {check.warnings.filter((w) => !/captain/i.test(w)).map((w) => <li key={w} className="text-amber-300">• {w}</li>)}
            {canSave && <li className="text-emerald-300">{dirty ? 'Squad looks good.' : 'No changes yet.'}</li>}
          </ul>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-full border border-line px-4 py-2 text-sm text-slate-300 hover:border-slate-500">Cancel</button>
            <button disabled={!dirty || !canSave} onClick={() => onSave(players.map((p) => p.id), captainId, effKeeper)} className="rounded-full bg-indigo-500 px-6 py-2 font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-40">Save squad</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
