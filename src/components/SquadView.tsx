import { CoachCard } from './season/CoachGate'
import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { overall, teamStrength } from '../data/builders'
import { autoPickXI, keeperIn, missingPicks, swapPlayers, validateSquad, XI_SIZE } from '../data/squad'
import { paths } from '../routes'
import { daysBetween, formatDate } from '../season/dates'
import { assignPhysio, injuriesOf, PHYSIOS, physioOf, releasePhysio, SEVERITY_COLOR, type Injury } from '../season/injuries'
import { ATTR_LABEL, playerChangeLog, ratingRows, sessionTeam } from '../season/progression'
import { selectSeason, useStore, useTeams } from '../store/useStore'
import { usePlayerForm, useTeamMap } from './season/shared'
import type { Season } from '../season/types'
import type { Player, Team } from '../types'
import { Sheet } from './Sheet'
import { accentOf, Delta, FormBar, PlayerAvatar, RatingBadge, ROLE_LABEL, TeamCrest } from './ui'

const SLOT_LABELS: Record<number, string> = { 0: 'Openers', 2: 'Top order', 4: 'Middle order', 7: 'Lower order & tail' }

function SquadCard({
  player, team, index, selected, dragging, isCaptain, isKeeper, change, career, form, showForm, injury, physio, onPhysio, today, onSelect, onCaptain, onKeeper, onDragStart, onDrop, onDragEnd,
}: {
  player: Player; team: Team; index: number; selected: boolean; dragging: boolean; isCaptain: boolean; isKeeper: boolean
  /** His recent form (see FormBar), shown when the team is in the career you have open. */
  form?: number | null; showForm?: boolean
  /** His injury (your own team, in a career) and whether a physio is on him; `onPhysio` puts one on or takes it off. */
  injury?: Injury | null; physio?: boolean; onPhysio?: () => void; today?: string
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
      {!injury && <button
        onClick={(e) => { e.stopPropagation(); onCaptain() }}
        title={isCaptain ? 'Captain' : 'Make captain'}
        className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${isCaptain ? 'bg-amber-400/25 text-amber-300' : 'text-slate-600 hover:text-slate-200'}`}
      >
        C
      </button>}
      {!injury && <button
        onClick={(e) => { e.stopPropagation(); onKeeper() }}
        title={isKeeper ? 'Wicketkeeper' : 'Make wicketkeeper'}
        className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${isKeeper ? 'bg-sky-400/25 text-sky-300' : 'text-slate-600 hover:text-slate-200'}`}
      >
        WK
      </button>}
      {injury && <span className="w-28 shrink-0 truncate rounded px-1.5 py-0.5 text-center text-[10px] font-extrabold uppercase leading-tight tracking-wide" style={{ background: `${SEVERITY_COLOR[injury.severity]}30`, color: SEVERITY_COLOR[injury.severity] }} title={`${injury.severity} injury, out for ${injury.days} days, back on ${formatDate(injury.back)}`}>{injury.name} · {Math.max(1, daysBetween(today ?? injury.start, injury.back))}d</span>}
      {onPhysio && (
        <button
          onClick={(e) => { e.stopPropagation(); onPhysio() }}
          title={physio ? 'A physio is on him, so he cannot be injured. Click to take the physio off.' : injury ? 'Already injured: a physio cannot be put on him' : 'Put a physio on him so he cannot be injured'}
          className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${physio ? 'bg-emerald-400/25 text-emerald-300' : 'text-slate-600 hover:text-slate-200'} ${injury && !physio ? 'cursor-not-allowed opacity-40' : ''}`}
        >
          PHY
        </button>
      )}
      {showForm && <FormBar z={form} />}
      {change !== undefined && change !== 0 && <span title="Change to his overall rating since the career began" className="text-xs"><Delta n={change} /></span>}
      <span title={career ? `${career > 0 ? '+' : ''}${career} overall since the career began` : undefined}><RatingBadge value={overall(player)} size="sm" /></span>
    </motion.div>
  )
}

/**
 * The squad page. With `session` it manages your team inside the current session only: ratings
 * are the ones earned so far, and a new order is kept in the session, never in the team itself.
 */
/** Every player's ratings from where they started to what they are now, with the change in green or red. */
function RatingChanges({ team, base, season }: { team: Team; base: Team | undefined; season: Season }) {
  const rows = team.players.map((p) => {
    const b = base?.players.find((x) => x.id === p.id) ?? p
    const r = ratingRows(b, p)
    const last = playerChangeLog(season, p.id, 1)[0]
    return { p, r, last, total: overall(p) - overall(b) }
  }).sort((a, b) => b.total - a.total || overall(b.p) - overall(a.p))
  const heads = ['Overall', 'Technique', 'Power', 'Temperament', 'Running', 'Accuracy', 'Variation', 'Stamina']
  const th = 'px-2 py-2 text-right font-medium'
  return (
    <section className="mt-8">
      <h2 className="mb-1 font-display text-3xl tracking-wide text-white">Rating changes</h2>
      <p className="mb-3 text-sm text-slate-400">Every match moves ratings a little: players who play well gain, players who struggle lose. Each box shows where the rating started, what it is now, and the change. It carries across seasons.</p>
      <div className="overflow-x-auto rounded-2xl border border-line bg-panel p-3">
        <table className="w-full text-sm">
          <thead className="text-[11px] uppercase tracking-wider text-slate-500"><tr><th className="px-2 py-2 text-left font-medium">Player</th>{heads.map((h) => <th key={h} className={th}>{h}</th>)}<th className={th}>Last match</th></tr></thead>
          <tbody>
            {rows.map(({ p, r, last }) => (
              <tr key={p.id} className="border-t border-line/60">
                <td className="px-2 py-1.5"><span className="flex items-center gap-2"><PlayerAvatar profile player={p} team={team} size={28} /><span className="font-medium text-slate-100">{p.name}</span></span></td>
                {heads.map((h) => {
                  const cell = r.find((x) => x.label === h)
                  if (!cell) return <td key={h} className="px-2 text-right text-slate-600">-</td>
                  const d = cell.now - cell.base
                  return (
                    <td key={h} className="px-2 text-right tabular-nums" title={d ? `Started at ${cell.base}, now ${cell.now}` : undefined}>
                      {d ? <><span className="text-slate-500">{cell.base}→</span><span className="font-semibold text-white">{cell.now}</span> <Delta n={d} /></> : <span className="text-slate-300">{cell.now}</span>}
                    </td>
                  )
                })}
                <td className="px-2 text-right" title={last ? Object.entries(last.delta.a).map(([k, n]) => `${ATTR_LABEL[k as keyof typeof ATTR_LABEL]} ${(n as number) > 0 ? '+' : ''}${n}`).join(', ') : ''}>{last ? (last.delta.o ? <Delta n={last.delta.o} /> : <span className="text-slate-500">±0</span>) : <span className="text-slate-600">-</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

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
    <Sheet label="Choose captain and wicketkeeper" onClose={onCancel} size="md">
      <div className="space-y-5 p-5 md:p-6">
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
    </Sheet>
  )
}

export function SquadView({ id, session = false }: { id: string; session?: boolean }) {
  const teams = useTeams()
  const sessionTeams = useTeamMap()
  const formOf = usePlayerForm()
  const save = useStore((s) => s.saveTeam)
  const updateSeason = useStore((s) => s.updateSeason)
  const season = useStore(selectSeason)
  const navigate = useNavigate()
  const team = session ? sessionTeams.get(id) : teams.find((t) => t.id === id)
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
  const [notice, setNotice] = useState<string | null>(null)
  // opening the squad with physios still to give out asks you to choose them (once per visit)
  const [physioOpen, setPhysioOpen] = useState(() => !!season && !!team && season.myTeamId === team.id && physioOf(season, team.id, season.today).length < PHYSIOS)

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
  // injuries and physios: your own team, in the career you have open
  const careerMine = !!season && season.myTeamId === team.id
  const hurt = careerMine && season ? injuriesOf(season, { id: team.id, players }, season.today) : new Map<string, Injury>()
  const covered = careerMine && season ? physioOf(season, team.id, season.today) : []
  const togglePhysio = (p: Player) => {
    if (!season) return
    if (covered.includes(p.id)) { updateSeason((s) => releasePhysio(s, team.id, p.id, s.today)); setNotice(null); return }
    const out = assignPhysio(season, { id: team.id, players }, p.id, season.today)
    if (out.error) setNotice(out.error)
    else { updateSeason(() => out.season); setNotice(null) }
  }
  const draft ={ ...team, players, captainId, keeperId }
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
    const orig = sessionTeam(original, { shifts: season?.shifts, lineup: undefined, myTeamId: season?.myTeamId ?? null, market: season?.market })
    updateSeason((x) => { const { lineup: _gone, ...rest } = x; return rest })
    setPlayers(orig.players); setCaptainId(orig.captainId); setKeeperId(keeperIn(orig.players.slice(0, XI_SIZE), orig.keeperId)?.id); setSelected(null)
  }

  const card = (p: Player, i: number) => (
    <SquadCard
      key={p.id} player={p} team={team} index={i} showForm={!!season?.teamIds.includes(team.id)} form={formOf(p.id)} injury={hurt.get(p.id) ?? null} physio={covered.includes(p.id)} onPhysio={careerMine ? () => togglePhysio(p) : undefined} today={season?.today} change={session ? careerShift(p.id) : undefined} career={session ? careerShift(p.id) : undefined} selected={selected === i} dragging={dragIndex === i} isCaptain={captainId === p.id} isKeeper={effKeeper === p.id}
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
          <TeamCrest team={team} size={56} />
          <div>
            <h1 className="font-display text-3xl leading-none tracking-wide md:text-5xl">{session ? `${team.name} squad` : 'Squad'}</h1>
            {session && <p className="mt-1 text-sm font-semibold text-amber-300">Only for this career. Your team's own squad outside it doesn't change.</p>}
            <p className="mt-1 text-sm text-slate-400">Drag a player onto another to swap them, or click one and then another. Top 11 play, in batting order.</p>
            {careerMine && <p className="mt-1 text-sm text-slate-400"><b className="text-emerald-300">Physios {covered.length}/{PHYSIOS}</b> · a physio (PHY) on a player means he cannot be injured, but he cannot go on someone who is already hurt.{hurt.size > 0 && <> <b className="text-rose-300">{hurt.size} injured</b>: an injured player cannot be in the XI for a match.</>}</p>}
            {notice && <p className="mt-1 text-sm font-semibold text-amber-300" role="status">{notice}</p>}
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

      {session && <div className="mb-6 max-w-xl"><CoachCard teamId={team.id} /></div>}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[3fr_2fr]">
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

      {session && season && <RatingChanges team={team} base={teams.find((t) => t.id === id)} season={season} />}

      <div className="sticky bottom-0 max-md:bottom-[calc(var(--sab)+66px)] mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-panel/95 p-4 backdrop-blur">
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
      {physioOpen && careerMine && season && (
        <Sheet label="Choose your physios" onClose={() => setPhysioOpen(false)} size="md" z={75}>
          <div className="space-y-3 p-5 md:p-6">
            <div>
              <h2 className="font-display text-3xl tracking-wide text-white">Choose your physios</h2>
              <p className="text-sm text-slate-300">You have {PHYSIOS} physios. A player with a physio cannot be injured. Pick who they look after ({covered.length}/{PHYSIOS} chosen). A player who is already injured cannot be picked.</p>
              {notice && <p className="mt-1 text-sm font-semibold text-amber-300" role="status">{notice}</p>}
            </div>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {[...players].sort((a, b) => overall(b) - overall(a)).map((p) => {
                const on = covered.includes(p.id)
                const hurtP = hurt.get(p.id)
                return (
                  <button key={p.id} disabled={!!hurtP && !on} onClick={() => togglePhysio(p)} className={`flex items-center gap-2 rounded-lg border-2 px-2 py-1.5 text-left transition disabled:cursor-not-allowed disabled:opacity-40 ${on ? 'border-emerald-400 bg-emerald-400/10' : 'border-line hover:border-slate-500'}`}>
                    <PlayerAvatar player={p} team={team} size={30} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-white">{p.name}</span>
                      <span className="block truncate text-[11px] text-slate-400">{ROLE_LABEL[p.role]}{hurtP ? ` · ${hurtP.name}` : ''}</span>
                    </span>
                    <RatingBadge value={overall(p)} size="sm" />
                    <span className={`w-9 text-center text-[11px] font-bold ${on ? 'text-emerald-300' : 'text-slate-600'}`}>{on ? 'PHY ✓' : 'PHY'}</span>
                  </button>
                )
              })}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setPhysioOpen(false)} className="rounded-full border border-line px-4 py-2 text-sm text-slate-300 hover:border-slate-500">{covered.length >= PHYSIOS ? 'Close' : 'Later'}</button>
              <button disabled={covered.length < PHYSIOS} onClick={() => setPhysioOpen(false)} className="rounded-full bg-indigo-500 px-6 py-2 font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-40">Done</button>
            </div>
          </div>
        </Sheet>
      )}
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
