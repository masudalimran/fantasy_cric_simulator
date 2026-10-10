import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { overall, teamStrength } from '../data/builders'
import { autoPickXI, keeperIn, missingPicks, swapPlayers, validateSquad, XI_SIZE } from '../data/squad'
import { paths } from '../routes'
import { applyShifts } from '../season/progression'
import { selectSeason, selectSession, useStore, useTeams } from '../store/useStore'
import { useTeamMap } from './season/shared'
import type { Player, Team } from '../types'
import { accentOf, PlayerAvatar, RatingBadge, ROLE_LABEL, TeamCrest } from './ui'

const SLOT_LABELS: Record<number, string> = { 0: 'Openers', 2: 'Top order', 4: 'Middle order', 7: 'Lower order & tail' }

function SquadCard({
  player, team, index, selected, dragging, isCaptain, isKeeper, change, career, onSelect, onCaptain, onKeeper, onDragStart, onDrop, onDragEnd,
}: {
  player: Player; team: Team; index: number; selected: boolean; dragging: boolean; isCaptain: boolean; isKeeper: boolean
  /** Rating points gained or lost last year, and over the whole session so far (session squads only). */
  change?: number; career?: number
  onSelect: () => void; onCaptain: () => void; onKeeper: () => void
  onDragStart: () => void; onDrop: () => void; onDragEnd: () => void
}) {
  const [over, setOver] = useState(false)
  const inXI = index < XI_SIZE
  return (
    <motion.div
      layout
      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
      draggable
      onDragStart={(e) => { (e as unknown as DragEvent).dataTransfer?.setData('text/plain', String(index)); onDragStart() }}
      onDragOver={(e) => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); onDrop() }}
      onDragEnd={onDragEnd}
      onClick={onSelect}
      className={`flex cursor-grab items-center gap-3 rounded-xl border p-2.5 pr-3 transition-colors active:cursor-grabbing ${
        selected ? 'border-indigo-400 bg-indigo-400/15' : over ? 'border-emerald-400 bg-emerald-400/10' : 'border-line bg-panel hover:border-slate-600'
      } ${dragging ? 'opacity-40' : ''}`}
    >
      <span className="w-6 text-center font-display text-xl text-slate-500">{inXI ? index + 1 : '·'}</span>
      <PlayerAvatar profile player={player} team={team} size={40} />
      <div className="pointer-events-none min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-white">{player.name}</div>
        <div className="truncate text-xs text-slate-400">
          {ROLE_LABEL[player.role]}{player.bowling ? ` · ${player.bowling.type}` : ''}
        </div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onCaptain() }}
        title={isCaptain ? 'Captain' : 'Make captain'}
        className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${isCaptain ? 'bg-amber-400/25 text-amber-300' : 'text-slate-600 hover:text-slate-200'}`}
      >
        C
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onKeeper() }}
        title={isKeeper ? 'Wicketkeeper' : 'Make wicketkeeper'}
        className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${isKeeper ? 'bg-sky-400/25 text-sky-300' : 'text-slate-600 hover:text-slate-200'}`}
      >
        WK
      </button>
      {change !== undefined && change !== 0 && (
        <span title={`Last year ${change > 0 ? '+' : ''}${change} overall`} className={`text-xs font-bold tabular-nums ${change > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{change > 0 ? '▲' : '▼'}{Math.abs(change)}</span>
      )}
      <span title={career ? `${career > 0 ? '+' : ''}${career} overall since the career began` : undefined}><RatingBadge value={overall(player)} size="sm" /></span>
    </motion.div>
  )
}

/**
 * The squad page. With `session` it manages your team inside the current session only: ratings
 * are the ones earned so far, and a new order is kept in the session, never in the team itself.
 */
/** Shown when a squad is saved with no captain or no wicketkeeper in the XI: pick them from the playing XI. */
function PicksPrompt({ xi, team, needCaptain, needKeeper, captainId, keeperId, onCancel, onDone }: {
  xi: Player[]; team: Team; needCaptain: boolean; needKeeper: boolean; captainId: string; keeperId: string | undefined
  onCancel: () => void; onDone: (captainId: string, keeperId: string | undefined) => void
}) {
  const [cap, setCap] = useState<string | undefined>(needCaptain ? undefined : captainId)
  const [keep, setKeep] = useState<string | undefined>(needKeeper ? undefined : keeperId)
  const list = (title: string, hint: string, value: string | undefined, set: (id: string) => void, color: string) => (
    <section>
      <h3 className="font-display text-2xl tracking-wide" style={{ color }}>{title}</h3>
      <p className="mb-2 text-xs text-slate-400">{hint}</p>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {xi.map((p) => (
          <button key={p.id} onClick={() => set(p.id)} className={`flex items-center gap-2 rounded-lg border-2 px-2 py-1.5 text-left transition ${value === p.id ? 'bg-white/10' : 'border-line hover:border-slate-500'}`} style={value === p.id ? { borderColor: color } : undefined}>
            <PlayerAvatar player={p} team={team} size={28} />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{p.name}</span>
            <span className="text-[10px] text-slate-400">{ROLE_LABEL[p.role]}</span>
          </button>
        ))}
      </div>
    </section>
  )
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/65 p-4 backdrop-blur-sm" onClick={onCancel}>
      <div role="dialog" aria-modal="true" aria-label="Choose captain and wicketkeeper" onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-xl space-y-5 overflow-y-auto rounded-3xl border border-line bg-ink p-6 shadow-2xl">
        <div>
          <h2 className="font-display text-3xl tracking-wide text-white">Before you save</h2>
          <p className="text-sm text-slate-300">{needCaptain && needKeeper ? 'This squad has no captain or wicketkeeper in the playing XI. Pick both.' : needKeeper ? 'There is no wicketkeeper in the playing XI. Pick who will keep.' : 'Your captain is not in the playing XI. Pick a new one.'}</p>
        </div>
        {needCaptain && list('Captain', 'Leads the side.', cap, setCap, '#fbbf24')}
        {needKeeper && list('Wicketkeeper', 'Anyone in the XI can keep. A real keeper is best.', keep, setKeep, '#38bdf8')}
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-full border border-line px-4 py-2 text-sm text-slate-300 hover:border-slate-500">Cancel</button>
          <button disabled={!cap || (needKeeper && !keep)} onClick={() => onDone(cap as string, needKeeper ? keep : keeperId)} className="rounded-full bg-indigo-500 px-6 py-2 font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-40">Save squad</button>
        </div>
      </div>
    </div>
  )
}

export function SquadView({ id, session = false }: { id: string; session?: boolean }) {
  const teams = useTeams()
  const sessionTeams = useTeamMap()
  const save = useStore((s) => s.saveTeam)
  const updateSeason = useStore((s) => s.updateSeason)
  const season = useStore(selectSeason)
  const file = useStore(selectSession)
  const navigate = useNavigate()
  const team = session ? sessionTeams.get(id) : teams.find((t) => t.id === id)
  const lastYear = useMemo(() => new Map((file?.reviews[file.reviews.length - 1]?.progress ?? []).map((c) => [c.id, c.after - c.before])), [file])
  const careerShift = (pid: string) => {
    const base = teams.find((t) => t.id === id)?.players.find((p) => p.id === pid)
    const now = team?.players.find((p) => p.id === pid)
    return base && now ? overall(now) - overall(base) : 0
  }

  const [players, setPlayers] = useState<Player[]>(() => team?.players ?? [])
  const [captainId, setCaptainId] = useState(team?.captainId ?? '')
  const [keeperId, setKeeperId] = useState<string | undefined>(() => keeperIn((team?.players ?? []).slice(0, XI_SIZE), team?.keeperId)?.id)
  const [params] = useSearchParams()
  const [askPicks, setAskPicks] = useState(() => params.has('pick'))
  const [selected, setSelected] = useState<number | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  const check = useMemo(() => validateSquad(players, captainId, keeperId), [players, captainId, keeperId])
  const dirty = useMemo(
    () => !!team && (captainId !== team.captainId || keeperId !== keeperIn(team.players.slice(0, XI_SIZE), team.keeperId)?.id || players.some((p, i) => p.id !== team.players[i]?.id)),
    [players, captainId, keeperId, team],
  )

  if (!team) {
    return (
      <div className="rounded-2xl border border-dashed border-line p-12 text-center text-slate-400">
        There's no team called “{id}”. <Link to={paths.teams} className="text-indigo-300 hover:underline">Back to all teams</Link>
      </div>
    )
  }

  const accent = accentOf(team)
  const draft = { ...team, players, captainId, keeperId }
  const swap = (a: number, b: number) => {
    setPlayers((list) => swapPlayers(list, a, b))
    setSelected(null)
  }
  const clickCard = (i: number) => {
    if (selected === null) setSelected(i)
    else if (selected === i) setSelected(null)
    else swap(selected, i)
  }
  const missing = missingPicks(players, captainId, keeperId)
  const effKeeper = keeperIn(players.slice(0, XI_SIZE), keeperId)?.id
  const commit = (cap: string, keep: string | undefined) => {
    if (session) {
      updateSeason((x) => ({ ...x, lineup: { order: players.map((p) => p.id), captainId: cap, keeperId: keep } }))
      navigate(paths.session())
      return
    }
    save({ ...team, players, captainId: cap, keeperId: keep })
    navigate(paths.team(team.id))
  }
  // Saving without a captain or a keeper in the XI first asks you to choose.
  const onSave = () => { if (missing.captain || missing.keeper) setAskPicks(true); else commit(captainId, keeperId) }
  /** Put the team back the way it is outside the session (keeping what the players have earned). */
  const useOriginal = () => {
    const original = teams.find((t) => t.id === id)
    if (!original) return
    const orig = applyShifts(original, season?.shifts)
    updateSeason((x) => { const { lineup: _gone, ...rest } = x; return rest })
    setPlayers(orig.players); setCaptainId(orig.captainId); setKeeperId(keeperIn(orig.players.slice(0, XI_SIZE), orig.keeperId)?.id); setSelected(null)
  }

  const card = (p: Player, i: number) => (
    <SquadCard
      key={p.id} player={p} team={team} index={i} change={session ? lastYear.get(p.id) : undefined} career={session ? careerShift(p.id) : undefined} selected={selected === i} dragging={dragIndex === i} isCaptain={captainId === p.id} isKeeper={effKeeper === p.id}
      onSelect={() => clickCard(i)} onCaptain={() => setCaptainId(p.id)} onKeeper={() => setKeeperId(p.id)}
      onDragStart={() => setDragIndex(i)} onDragEnd={() => setDragIndex(null)}
      onDrop={() => { if (dragIndex !== null) swap(dragIndex, i); setDragIndex(null) }}
    />
  )

  return (
    <div>
      <Link to={session ? paths.session() : paths.team(team.id)} className="mb-4 inline-block text-sm text-slate-400 hover:text-white">← {session ? 'Back to the career' : team.name}</Link>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <TeamCrest team={team} size={64} />
          <div>
            <h1 className="font-display text-5xl leading-none tracking-wide">{session ? `${team.name} squad` : 'Squad'}</h1>
            {session && <p className="mt-1 text-sm font-semibold text-amber-300">Only for this career. Your team's own squad outside it doesn't change.</p>}
            <p className="mt-1 text-sm text-slate-400">Drag a player onto another to swap them, or click one and then another. Top 11 play, in batting order.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right text-xs uppercase tracking-wider text-slate-400">XI<br />rating</div>
          <RatingBadge value={teamStrength(draft)} size="lg" />
          <button
            onClick={() => { const xi = autoPickXI(players); setPlayers(xi); setKeeperId(keeperIn(xi.slice(0, XI_SIZE))?.id); setSelected(null) }}
            className="rounded-lg border border-line bg-panel px-3 py-2 text-sm hover:border-indigo-400"
            title="Picks a balanced XI: one keeper, five bowling options, best of the rest"
          >
            Auto-pick XI
          </button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[3fr_2fr]">
        <section>
          <h2 className="mb-3 font-display text-3xl tracking-wide" style={{ color: accent }}>Playing XI</h2>
          <div className="space-y-2">
            {players.slice(0, XI_SIZE).map((p, i) => (
              <div key={p.id}>
                {SLOT_LABELS[i] && <div className="mb-1 mt-3 text-[11px] font-semibold uppercase tracking-widest text-slate-500 first:mt-0">{SLOT_LABELS[i]}</div>}
                {card(p, i)}
              </div>
            ))}
          </div>
        </section>
        <section>
          <h2 className="mb-3 font-display text-3xl tracking-wide text-slate-300">Bench <span className="text-base font-sans text-slate-500">{Math.max(players.length - XI_SIZE, 0)}</span></h2>
          <div className="space-y-2">
            {players.slice(XI_SIZE).map((p, i) => card(p, i + XI_SIZE))}
            {players.length <= XI_SIZE && <div className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-slate-500">No one on the bench. Add players from Edit team.</div>}
          </div>
        </section>
      </div>

      <div className="sticky bottom-0 mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-panel/95 p-4 backdrop-blur">
        <ul className="space-y-0.5 text-sm">
          {check.errors.map((e) => <li key={e} className="text-red-300">• {e}</li>)}
          {check.warnings.map((e) => <li key={e} className="text-amber-300">• {e}</li>)}
          {check.errors.length === 0 && check.warnings.length === 0 && <li className="text-emerald-300">{dirty ? 'Squad looks good. Save to keep it.' : 'Squad looks good.'}</li>}
        </ul>
        <div className="flex gap-2">
          {session && season?.lineup && <button onClick={useOriginal} className="rounded-full border border-line px-4 py-2 text-sm text-slate-300 hover:border-slate-500" title="Goes back to the team's own order">Back to original XI</button>}
          <button
            disabled={!dirty}
            onClick={() => { setPlayers(team.players); setCaptainId(team.captainId); setKeeperId(keeperIn(team.players.slice(0, XI_SIZE), team.keeperId)?.id); setSelected(null) }}
            className="rounded-full border border-line px-4 py-2 text-sm text-slate-300 hover:border-slate-500 disabled:opacity-40"
          >
            Undo changes
          </button>
          <button
            disabled={!dirty || check.errors.length > 0}
            onClick={onSave}
            className="rounded-full bg-indigo-500 px-6 py-2 font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save squad
          </button>
        </div>
      </div>
      {askPicks && (missing.captain || missing.keeper) && (
        <PicksPrompt
          xi={players.slice(0, XI_SIZE)} team={team} needCaptain={missing.captain} needKeeper={missing.keeper}
          onCancel={() => setAskPicks(false)}
          onDone={(cap, keep) => { setAskPicks(false); setCaptainId(cap); setKeeperId(keep); commit(cap, keep) }}
          captainId={captainId} keeperId={effKeeper}
        />
      )}
    </div>
  )
}
