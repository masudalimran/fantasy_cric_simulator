import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { TeamCrest } from '../components/ui'
import { useTeamMap } from '../components/season/shared'
import { paths } from '../routes'
import { formatDate } from '../season/dates'
import { competitionStatus } from '../season/results'
import { DIFFICULTIES } from '../engine/types'
import { useStore, type SessionFile } from '../store/useStore'

function SessionCard({ session, active }: { session: SessionFile; active: boolean }) {
  const navigate = useNavigate()
  const teams = useTeamMap()
  const { openSession, renameSession, deleteSession } = useStore.getState()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(session.name)
  const [askDelete, setAskDelete] = useState(false)
  const s = session.season
  const played = Object.keys(s.results).length
  const done = s.competitions.filter((c) => competitionStatus(s, c).status === 'done').length
  const pct = Math.round((played / s.fixtures.length) * 100)
  const crests = s.teamIds.slice(0, 12).map((id) => teams.get(id)).filter((t): t is NonNullable<typeof t> => !!t)
  const btn = 'rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-indigo-400'

  const open = () => { openSession(session.id); navigate(paths.session(s.today.slice(0, 7))) }
  const commit = () => { renameSession(session.id, name); setEditing(false) }

  return (
    <div className={`rounded-2xl border bg-panel p-5 ${active ? 'border-indigo-400/70' : 'border-line'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {editing ? (
            <input
              autoFocus value={name} onChange={(e) => setName(e.target.value)} onBlur={commit}
              onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setName(session.name); setEditing(false) } }}
              className="rounded-md border border-indigo-400 bg-panel-2 px-2 py-1 font-display text-3xl tracking-wide outline-none"
            />
          ) : (
            <h2 className="truncate font-display text-3xl tracking-wide text-white">{session.name}</h2>
          )}
          {s.myTeamId && teams.get(s.myTeamId) && (
            <div className="mt-1 flex items-center gap-2 text-sm text-slate-200">
              <TeamCrest team={teams.get(s.myTeamId)!} size={24} />
              <span>You manage <b className="text-white">{teams.get(s.myTeamId)!.name}</b></span>
              <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-200" title="Fixed when the career started">{DIFFICULTIES[s.difficulty ?? 'normal'].label}</span>
            </div>
          )}
          <div className="mt-0.5 text-xs text-slate-500">
            {s.year} season{(session.reviews?.length ?? 0) > 0 ? ` (year ${session.reviews.length + 1})` : ''} · {s.teamIds.length} teams · last played {new Date(session.updatedAt).toLocaleDateString()}
            {active && <span className="ml-2 rounded bg-indigo-400/25 px-1.5 py-0.5 text-indigo-200">active</span>}
          </div>
        </div>
        <div className="text-right text-sm">
          <div className="text-slate-300">{formatDate(s.today)}</div>
          <div className="text-xs text-slate-500">{done}/{s.competitions.length} competitions finished</div>
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-indigo-400" style={{ width: `${pct}%` }} /></div>
      <div className="mt-1 text-xs text-slate-500">{played}/{s.fixtures.length} matches played ({pct}%)</div>

      <div className="mt-3 flex flex-wrap gap-1">{crests.map((t) => <TeamCrest key={t.id} team={t} size={26} />)}{s.teamIds.length > crests.length && <span className="self-center text-xs text-slate-500">+{s.teamIds.length - crests.length}</span>}</div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={open} className="rounded-lg bg-indigo-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-400">{active ? 'Continue' : 'Open'}</button>
        <button onClick={() => setEditing(true)} className={btn}>Rename</button>
        <button
          onClick={() => setAskDelete(true)}
          className="rounded-lg border border-red-900 px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-950/50"
        >
          Delete
        </button>
      </div>
      <ConfirmDialog open={askDelete} tone="danger" typeToConfirm="DELETE" title="Delete this career?" confirmLabel="Delete career" cancelLabel="Keep it" onCancel={() => setAskDelete(false)} onConfirm={() => { deleteSession(session.id); setAskDelete(false) }}>
        <p><b>{session.name}</b> and all its results ({played} matches played) will be removed. This can't be undone.</p>
      </ConfirmDialog>
    </div>
  )
}

export function SessionsPage() {
  const sessions = useStore((s) => s.sessions)
  const activeId = useStore((s) => s.activeSessionId)
  const sorted = [...sessions].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl tracking-wide">Careers</h1>
          <p className="text-sm text-slate-400">Each career is its own save file: you manage one team through year after year of cricket. Continue one, or start a new career.</p>
        </div>
        <Link to={paths.newSession} className="rounded-full bg-emerald-500 px-6 py-2 font-display text-xl tracking-wide text-black transition hover:bg-emerald-400">+ New career</Link>
      </div>
      {sorted.length === 0 ? (
        <div className="mx-auto max-w-xl rounded-3xl border border-dashed border-line p-12 text-center">
          <div className="font-display text-4xl tracking-wide text-slate-200">No careers yet</div>
          <p className="mt-2 text-sm text-slate-400">A career is your own cricket story. Pick a team, then press the glowing button.</p>
          <Link to={paths.newSession} className="cta-pulse mt-5 inline-block rounded-full bg-emerald-500 px-7 py-2.5 font-display text-2xl tracking-wide text-black hover:bg-emerald-400">Start a career</Link>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">{sorted.map((s) => <SessionCard key={s.id} session={s} active={s.id === activeId} />)}</div>
      )}
    </div>
  )
}
