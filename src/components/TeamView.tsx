import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { paths } from '../routes'
import { overall, teamStrength } from '../data/builders'
import { ConfirmDialog } from './ConfirmDialog'
import { describeChanges, keeperIn } from '../data/squad'
import { defaultTeam, useStore, useTeams } from '../store/useStore'
import type { Player, Team } from '../types'
import { accentOf, FormBar, PlayerAvatar, RatingBadge, ROLE_LABEL, StatBar, TeamBackdrop, TeamCrest, tierOf } from './ui'
import { usePlayerForm } from './season/shared'
import { useViewedSeason } from '../store/useStore'

function PlayerDetail({ player, team }: { player: Player; team: Team }) {
  const accent = accentOf(team)
  const b = player.batting
  const w = player.bowling
  return (
    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
      <div className="grid gap-5 border-t border-line bg-black/20 p-4 md:grid-cols-3">
        <div className="space-y-1.5">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Batting ({player.hand === 'L' ? 'left' : 'right'}-hand)</div>
          <StatBar label="Technique" value={b.technique} color={accent} />
          <StatBar label="Power" value={b.power} color={accent} />
          <StatBar label="Temperament" value={b.temperament} color={accent} />
          <StatBar label="Running" value={b.running} color={accent} />
        </div>
        <div className="space-y-1.5">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Bowling{w ? ` (${w.type})` : ''}</div>
          {w ? (
            <>
              <StatBar label="Accuracy" value={w.accuracy} color={accent} />
              <StatBar label="Variation" value={w.variation} color={accent} />
              <StatBar label="Stamina" value={w.stamina} color={accent} />
            </>
          ) : (
            <div className="text-xs text-slate-500">Does not bowl.</div>
          )}
          <div className="pt-2"><StatBar label="Fielding" value={player.fielding} color={accent} /></div>
        </div>
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Traits</div>
          <div className="flex flex-wrap gap-1.5">
            {player.traits.length === 0 && <span className="text-xs text-slate-500">None</span>}
            {player.traits.map((t) => (
              <span key={t} className="rounded-full border border-line bg-panel-2 px-2.5 py-1 text-xs text-slate-200">{t.replace(/-/g, ' ')}</span>
            ))}
          </div>
          <div className="mt-4 break-all text-[11px] text-slate-600">Image: public/images/players/{player.id}.png</div>
        </div>
      </div>
    </motion.div>
  )
}

function PlayerRow({ player, team, pos }: { player: Player; team: Team; pos?: number }) {
  const [open, setOpen] = useState(false)
  const formOf = usePlayerForm()
  const { season } = useViewedSeason()
  const inCareer = !!season?.teamIds.includes(team.id)
  const ovr = overall(player)
  const isCaptain = team.captainId === player.id
  const isKeeper = keeperIn(team.players.slice(0, 11), team.keeperId)?.id === player.id
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-panel">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 p-3 text-left transition hover:bg-white/5">
        <span className="w-5 text-center font-display text-xl text-slate-600">{pos ?? ''}</span>
        <PlayerAvatar profile player={player} team={team} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold text-white">
            {player.name}
            {isCaptain && <span className="ml-2 rounded bg-amber-400/20 px-1.5 py-0.5 align-middle text-[11px] font-bold text-amber-300">C</span>}
            {isKeeper && <span className="ml-1.5 rounded bg-sky-400/20 px-1.5 py-0.5 align-middle text-[11px] font-bold text-sky-300">WK</span>}
          </div>
          <div className="truncate text-xs text-slate-400">
            {ROLE_LABEL[player.role]}
            {player.bowling ? ` · ${player.bowling.type}` : ''} · {tierOf(ovr).label}
          </div>
        </div>
        {inCareer && <FormBar z={formOf(player.id)} />}
        <RatingBadge value={ovr} />
      </button>
      <AnimatePresence initial={false}>{open && <PlayerDetail player={player} team={team} />}</AnimatePresence>
    </div>
  )
}

export function TeamView({ id }: { id: string }) {
  const teams = useTeams()
  const edited = useStore((s) => !!s.overrides[id])
  const reset = useStore((s) => s.resetTeam)
  const navigate = useNavigate()
  const [confirm, setConfirm] = useState<'reset' | 'delete' | null>(null)
  const del = useStore((s) => s.deleteCustomTeam)
  const team = teams.find((t) => t.id === id)
  if (!team)
    return (
      <div className="rounded-2xl border border-dashed border-line p-12 text-center text-slate-400">
        There's no team called “{id}”. <Link to={paths.teams} className="text-indigo-300 hover:underline">Back to all teams</Link>
      </div>
    )
  const accent = accentOf(team)
  const xi = team.players.slice(0, 11)
  const bench = team.players.slice(11)

  return (
    <div>
      <Link to={paths.teams} className="mb-4 inline-block text-sm text-slate-400 transition hover:text-white">← All teams</Link>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-line bg-panel p-6 pt-12 md:p-8 md:pt-16"
      >
        <TeamBackdrop team={team} strength={0.7} />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <TeamCrest team={team} size={92} />
            <div>
              <h1 className="font-display text-5xl leading-none tracking-wide drop-shadow md:text-6xl" style={{ color: accent }}>{team.name}</h1>
              <div className="text-base text-slate-200">From <b className="text-white">{team.series}</b> · {team.home}{edited && <span className="ml-2 rounded bg-indigo-400/25 px-1.5 py-0.5 text-xs text-indigo-200">edited</span>}</div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-4">
              <div className="text-right text-xs uppercase tracking-wider text-slate-400">Team<br />rating</div>
              <RatingBadge value={teamStrength(team)} size="lg" />
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Link to={paths.squad(team.id)} className="inline-flex h-10 items-center justify-center rounded-lg border px-4 text-sm font-semibold transition border-indigo-500 bg-indigo-500 text-white hover:bg-indigo-400">Manage squad</Link>
              <Link to={paths.editTeam(team.id)} className="inline-flex h-10 items-center justify-center rounded-lg border px-4 text-sm font-semibold transition border-slate-500 bg-panel text-slate-100 hover:border-indigo-400">Edit team</Link>
              {team.isCustom && (
                <button
                  onClick={() => setConfirm('delete')}
                  className="inline-flex h-10 items-center justify-center rounded-lg border px-4 text-sm font-semibold transition border-red-900 bg-red-950/40 text-red-300 hover:bg-red-900/40"
                >
                  Delete
                </button>
              )}
              {edited && (
                <button
                  onClick={() => setConfirm('reset')}
                  className="inline-flex h-10 items-center justify-center rounded-lg border px-4 text-sm font-semibold transition border-amber-800 bg-amber-950/40 text-amber-300 hover:bg-amber-900/40"
                >
                  Reset to default
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[3fr_2fr]">
        <section>
          <h2 className="mb-3 font-display text-3xl tracking-wide">Playing XI <span className="text-sm font-sans text-slate-500">in batting order</span></h2>
          <div className="space-y-2">{xi.map((p, i) => <PlayerRow key={p.id} player={p} team={team} pos={i + 1} />)}</div>
        </section>
        <section>
          <h2 className="mb-3 font-display text-3xl tracking-wide">Bench</h2>
          <div className="space-y-2">{bench.map((p) => <PlayerRow key={p.id} player={p} team={team} />)}</div>
        </section>
      </div>

      <ConfirmDialog
        open={confirm === 'reset'} tone="warn" title="Reset to default?" confirmLabel="Yes, reset team" cancelLabel="Keep my changes"
        onCancel={() => setConfirm(null)} onConfirm={() => { reset(team.id); setConfirm(null) }}
      >
        <p>This puts <b>{team.name}</b> back to how it came in the game. These changes will be lost:</p>
        <ul className="list-inside list-disc space-y-0.5 rounded-lg bg-black/25 p-3 text-slate-100">
          {(() => { const def = defaultTeam(team.id); const list = def ? describeChanges(def, team) : []; return (list.length ? list : ['Your edits to this team']).map((x) => <li key={x}>{x}</li>) })()}
        </ul>
        <p className="text-xs text-slate-400">Players you added or edited here go back to the original squad. Matches already played aren't affected.</p>
      </ConfirmDialog>
      <ConfirmDialog
        open={confirm === 'delete'} tone="danger" title="Delete this team?" confirmLabel="Delete team" cancelLabel="Keep it"
        onCancel={() => setConfirm(null)} onConfirm={() => { del(team.id); setConfirm(null); navigate(paths.teams) }}
      >
        <p><b>{team.name}</b> and its whole squad will be removed. This can't be undone.</p>
      </ConfirmDialog>
    </div>
  )
}
