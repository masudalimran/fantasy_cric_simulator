import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Sheet } from '../components/Sheet'
import { RatingBadge, TeamCrest, accentOf } from '../components/ui'
import { useIsMobile } from '../hooks'
import { teamStrength } from '../data/builders'
import { randomSeed } from '../engine/rng'
import { paths } from '../routes'
import { useStore, useTeams } from '../store/useStore'
import type { MatchFormat, Team } from '../types'

function Picker({ title, teams, value, disabledId, onPick }: { title: string; teams: Team[]; value: string | null; disabledId: string | null; onPick: (id: string) => void }) {
  const chosen = teams.find((t) => t.id === value)
  return (
    <div className="rounded-2xl border border-line bg-panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-2xl tracking-wide text-slate-300">{title}</h2>
        {chosen && <span className="text-sm font-semibold" style={{ color: accentOf(chosen) }}>{chosen.name}</span>}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {teams.map((t) => (
          <button
            key={t.id}
            disabled={t.id === disabledId}
            onClick={() => onPick(t.id)}
            className={`flex items-center gap-2.5 rounded-xl border p-2 text-left transition ${t.id === value ? 'border-indigo-400 bg-indigo-400/15' : 'border-line hover:border-slate-500'} disabled:opacity-25`}
          >
            <TeamCrest team={t} size={40} />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold leading-tight text-white">{t.name}</span>
              <span className="block text-[11px] text-slate-400">{t.series}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

/** A phone's team chooser: a bottom sheet with a search box and the whole list, one tap to pick. */
function TeamPickSheet({ title, teams, disabledId, onPick, onClose }: { title: string; teams: Team[]; disabledId: string | null; onPick: (id: string) => void; onClose: () => void }) {
  const [q, setQ] = useState('')
  const needle = q.trim().toLowerCase()
  const list = teams.filter((t) => !needle || `${t.name} ${t.series} ${t.short}`.toLowerCase().includes(needle))
  return (
    <Sheet label={title} onClose={onClose} size="sm" scroll={false} z={80}>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 px-4 pb-2 pt-1">
          <h2 className="font-display text-2xl tracking-wide text-white">{title}</h2>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search teams…" aria-label="Search teams" className="mt-2 w-full rounded-xl border border-line bg-panel px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-4">
          {list.length === 0 && <p className="p-6 text-center text-sm text-slate-400">No team matches.</p>}
          {list.map((t) => (
            <button key={t.id} disabled={t.id === disabledId} onClick={() => onPick(t.id)} className="flex min-h-14 w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left active:bg-white/10 disabled:opacity-30">
              <TeamCrest team={t} size={42} />
              <span className="min-w-0 flex-1"><span className="block truncate font-semibold text-white">{t.name}</span><span className="block truncate text-xs text-slate-400">{t.series}</span></span>
              <RatingBadge value={teamStrength(t)} size="sm" />
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  )
}

export function PlayPage() {
  const teams = useTeams()
  const navigate = useNavigate()
  const live = useStore((s) => s.liveMatch)
  const discardLive = useStore((s) => s.discardLive)
  const [askDiscard, setAskDiscard] = useState(false)
  const [a, setA] = useState<string | null>(null)
  const [b, setB] = useState<string | null>(null)
  const [format, setFormat] = useState<MatchFormat>('t20')
  const mobile = useIsMobile()
  const [picking, setPicking] = useState<'a' | 'b' | null>(null)
  const ta = teams.find((t) => t.id === a)
  const tb = teams.find((t) => t.id === b)

  const random = () => {
    const i = Math.floor(Math.random() * teams.length)
    let j = Math.floor(Math.random() * (teams.length - 1))
    if (j >= i) j++
    setA(teams[i].id)
    setB(teams[j].id)
  }
  const start = () => ta && tb && navigate(paths.match(ta.id, tb.id, format, randomSeed()))

  if (mobile) {
    const slot = (t: Team | undefined, which: 'a' | 'b') => (
      <button onClick={() => setPicking(which)} className={`flex min-h-[148px] flex-col items-center justify-center gap-2 rounded-2xl border-2 p-3 text-center transition active:scale-[0.98] ${t ? 'border-indigo-400/60 bg-panel' : 'border-dashed border-line bg-panel/50'}`} aria-label={`Choose team ${which.toUpperCase()}`}>
        {t ? (
          <>
            <TeamCrest team={t} size={64} />
            <span className="line-clamp-2 text-sm font-bold leading-tight text-white">{t.name}</span>
            <RatingBadge value={teamStrength(t)} size="sm" />
          </>
        ) : (
          <>
            <span className="grid h-14 w-14 place-items-center rounded-full border-2 border-dashed border-slate-600 text-3xl text-slate-500">+</span>
            <span className="text-sm font-semibold text-slate-400">Team {which.toUpperCase()}</span>
            <span className="text-[11px] text-slate-500">Tap to choose</span>
          </>
        )}
      </button>
    )
    return (
      <div>
        {live && !live.finished && (
          <div className="mb-4 rounded-2xl border border-amber-400/60 bg-amber-400/10 p-3">
            <div className="text-sm text-amber-100"><b>Match in progress:</b> {live.teamA.name} v {live.teamB.name} ({live.format.toUpperCase()}). Starting a new one will discard it.</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button onClick={() => navigate(live.url)} className="rounded-xl bg-emerald-500 py-2.5 text-sm font-bold text-black active:bg-emerald-400">Resume</button>
              <button onClick={() => setAskDiscard(true)} className="rounded-xl border-2 border-red-500/70 py-2.5 text-sm font-bold text-red-200 active:bg-red-500/15">Discard</button>
            </div>
          </div>
        )}
        <ConfirmDialog open={askDiscard} tone="danger" title="Discard this match?" confirmLabel="Discard match" cancelLabel="Keep playing" onCancel={() => setAskDiscard(false)} onConfirm={() => { discardLive(); setAskDiscard(false) }}>
          <p>The match in progress will be thrown away. It won't count towards any career.</p>
        </ConfirmDialog>
        <h1 className="font-display text-4xl tracking-wide">Play a match</h1>
        <p className="mb-4 text-sm text-slate-400">Pick two teams and a format, then head to the toss.</p>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          {slot(ta, 'a')}
          <span className="font-display text-2xl text-slate-600">VS</span>
          {slot(tb, 'b')}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-1 rounded-2xl bg-panel p-1" role="radiogroup" aria-label="Format">
          {(['t20', 'odi'] as const).map((f) => (
            <button key={f} role="radio" aria-checked={format === f} onClick={() => setFormat(f)} className={`rounded-xl py-3 text-center transition ${format === f ? 'bg-indigo-500 text-white' : 'text-slate-400'}`}>
              <div className="font-display text-2xl leading-none tracking-wide">{f.toUpperCase()}</div>
              <div className="text-[11px] opacity-80">{f === 't20' ? '20 overs a side' : '50 overs a side'}</div>
            </button>
          ))}
        </div>
        <button onClick={random} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-line py-3 text-sm font-semibold text-slate-200 active:bg-white/10">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" /></svg>
          Random matchup
        </button>

        <div className="sticky z-30 mt-5" style={{ bottom: 'calc(var(--sab) + 72px)' }}>
          <button disabled={!ta || !tb} onClick={start} className="h-14 w-full rounded-full bg-emerald-500 font-display text-2xl tracking-wider text-black shadow-[0_8px_24px_rgba(16,185,129,.35)] transition active:scale-[0.98] disabled:bg-slate-700 disabled:text-slate-400 disabled:shadow-none">
            {ta && tb ? 'TO THE TOSS' : 'CHOOSE BOTH TEAMS'}
          </button>
        </div>

        <AnimatePresence>
          {picking && <TeamPickSheet title={picking === 'a' ? 'Choose team A' : 'Choose team B'} teams={teams} disabledId={picking === 'a' ? b : a} onPick={(id) => { if (picking === 'a') setA(id); else setB(id); setPicking(null) }} onClose={() => setPicking(null)} />}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div>
      {live && !live.finished && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-400/60 bg-amber-400/10 p-4">
          <div className="text-sm text-amber-100">
            <b>Match in progress:</b> {live.teamA.name} v {live.teamB.name} ({live.format.toUpperCase()}). Starting a new one will discard it.
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate(live.url)} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-black hover:bg-emerald-400">Resume</button>
            <button onClick={() => setAskDiscard(true)} className="rounded-lg border-2 border-red-500/70 px-4 py-2 text-sm font-bold text-red-200 hover:bg-red-500/15">Discard</button>
          </div>
        </div>
      )}
      <ConfirmDialog open={askDiscard} tone="danger" title="Discard this match?" confirmLabel="Discard match" cancelLabel="Keep playing" onCancel={() => setAskDiscard(false)} onConfirm={() => { discardLive(); setAskDiscard(false) }}>
        <p>The match in progress will be thrown away. It won't count towards any career.</p>
      </ConfirmDialog>
      <h1 className="font-display text-5xl tracking-wide">Play a match</h1>
      <p className="mb-6 text-sm text-slate-400">Choose the format and head to the toss. Pick the two teams below.</p>

      <motion.div layout className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-panel p-5">
        <div className="flex items-center gap-6">
          {[ta, tb].map((t, i) => (
            <div key={i} className="flex items-center gap-3">
              {t ? <><TeamCrest team={t} size={56} /><div><div className="font-semibold text-white">{t.name}</div><RatingBadge value={teamStrength(t)} size="sm" /></div></> : <div className="text-slate-500">Choose team {i === 0 ? 'A' : 'B'}</div>}
              {i === 0 && <span className="px-2 font-display text-3xl text-slate-600">VS</span>}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex overflow-hidden rounded-full border border-line">
            {(['t20', 'odi'] as const).map((f) => (
              <button key={f} onClick={() => setFormat(f)} className={`px-5 py-2 text-sm font-semibold uppercase transition ${format === f ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}>{f}</button>
            ))}
          </div>
          <button onClick={random} className="rounded-full border border-line px-4 py-2 text-sm text-slate-300 hover:border-slate-500">Random matchup</button>
          <button disabled={!ta || !tb} onClick={start} className="rounded-full bg-emerald-500 px-7 py-2 font-display text-xl tracking-wide text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40">To the toss</button>
        </div>
      </motion.div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Picker title="Team A" teams={teams} value={a} disabledId={b} onPick={setA} />
        <Picker title="Team B" teams={teams} value={b} disabledId={a} onPick={setB} />
      </div>

    </div>
  )
}
