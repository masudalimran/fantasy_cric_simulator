import { motion } from 'framer-motion'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { RatingBadge, TeamCrest, accentOf } from '../components/ui'
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

export function PlayPage() {
  const teams = useTeams()
  const navigate = useNavigate()
  const live = useStore((s) => s.liveMatch)
  const discardLive = useStore((s) => s.discardLive)
  const [askDiscard, setAskDiscard] = useState(false)
  const [a, setA] = useState<string | null>(null)
  const [b, setB] = useState<string | null>(null)
  const [format, setFormat] = useState<MatchFormat>('t20')
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
