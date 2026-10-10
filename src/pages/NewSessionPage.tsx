import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { RatingBadge, TeamCrest } from '../components/ui'
import { teamStrength } from '../data/builders'
import { randomSeed } from '../engine/rng'
import { DIFFICULTIES, type Difficulty } from '../engine/types'
import { paths } from '../routes'
import { generateSeason } from '../season/generate'
import { useStore, useTeams } from '../store/useStore'

const MIN_TEAMS = 4
const LEVELS = Object.keys(DIFFICULTIES) as Difficulty[]
const LEVEL_COLOR: Record<Difficulty, string> = { easy: '#34d399', normal: '#38bdf8', hard: '#fbbf24', legend: '#fb7185' }

function Step({ n, title, children, hint }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <div className="mb-2 flex items-baseline gap-3">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-indigo-500 font-display text-lg leading-none text-white">{n}</span>
        <h2 className="font-display text-3xl tracking-wide">{title}</h2>
        {hint && <span className="text-sm text-slate-400">{hint}</span>}
      </div>
      {children}
    </section>
  )
}

export function NewSessionPage() {
  const teams = useTeams()
  const sessions = useStore((s) => s.sessions)
  const createSession = useStore((s) => s.createSession)
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [name, setName] = useState(`Career ${sessions.length + 1}`)
  const [year, setYear] = useState(new Date().getFullYear())
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  // coming back from "create your own team" brings the new team's id along
  const [myTeamId, setMyTeamId] = useState<string | null>(() => (params.get('team') && teams.some((t) => t.id === params.get('team')) ? params.get('team') : null))
  const [picked, setPicked] = useState<Set<string>>(() => new Set(teams.map((t) => t.id)))

  const chosen = useMemo(() => teams.filter((t) => picked.has(t.id) || t.id === myTeamId), [teams, picked, myTeamId])
  const me = teams.find((t) => t.id === myTeamId)
  // A quick dry run so you can see what you're signing up for.
  const preview = useMemo(() => {
    if (chosen.length < MIN_TEAMS) return null
    try {
      const s = generateSeason({ year, teams: chosen, seed: 1, myTeamId })
      const games = new Map<string, number>()
      for (const f of s.fixtures) if (f.homeId && f.awayId) for (const id of [f.homeId, f.awayId]) games.set(id, (games.get(id) ?? 0) + 1)
      const v = [...games.values()]
      const mine = myTeamId ? (games.get(myTeamId) ?? 0) : 0
      return { matches: s.fixtures.length, tournaments: s.competitions.filter((c) => c.kind !== 'series').length, series: s.competitions.filter((c) => c.kind === 'series').length, min: Math.min(...v), max: Math.max(...v), mine }
    } catch {
      return null
    }
  }, [chosen, year, myTeamId])

  const toggle = (id: string) => { if (id === myTeamId) return; setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n }) }
  const setGroup = (ids: string[]) => setPicked(new Set(ids))
  const chip = 'rounded-full border border-line px-3 py-1.5 text-sm text-slate-300 transition hover:border-indigo-400'

  const create = () => {
    if (!myTeamId) return
    createSession({ name, year, teams: chosen, seed: randomSeed(), myTeamId, difficulty })
    navigate(paths.session(`${year}-01`))
  }

  return (
    <div>
      <Link to={paths.sessions} className="mb-4 inline-block text-sm text-slate-400 hover:text-white">← Careers</Link>
      <h1 className="font-display text-5xl tracking-wide">New career</h1>
      <p className="mb-6 text-sm text-slate-400">You manage one team for the whole career. The computer runs every other team, including its batting plans and bowling changes.</p>

      <Step n={1} title="Your team" hint="You'll stay with this team for the whole career">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          <button
            onClick={() => navigate(`${paths.newTeam}?next=${encodeURIComponent(paths.newSession)}`)}
            className="flex min-h-[64px] items-center gap-3 rounded-xl border-2 border-dashed border-emerald-400/60 bg-emerald-400/5 p-2.5 text-left transition hover:bg-emerald-400/10"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-500 text-2xl font-bold text-black">+</span>
            <span><span className="block text-sm font-bold text-white">Create your own team</span><span className="block text-xs text-slate-400">Build one, then come back here</span></span>
          </button>
          {teams.map((t) => {
            const on = t.id === myTeamId
            return (
              <button key={t.id} onClick={() => setMyTeamId(t.id)} aria-pressed={on} className={`flex items-center gap-3 rounded-xl border-2 p-2.5 text-left transition ${on ? 'border-amber-400 bg-amber-400/10' : 'border-line bg-panel hover:border-slate-500'}`}>
                <TeamCrest team={t} size={40} />
                <div className="min-w-0 flex-1"><div className="text-sm font-semibold leading-tight text-white">{t.name}</div><div className="truncate text-xs text-slate-500">{t.series}</div></div>
                <div className="flex flex-col items-end gap-1"><RatingBadge value={teamStrength(t)} size="sm" />{on && <span className="rounded bg-amber-400 px-1.5 py-px text-[9px] font-extrabold text-black">YOU</span>}</div>
              </button>
            )
          })}
        </div>
      </Step>

      <Step n={2} title="Difficulty" hint="Chosen now and kept for the whole career. It's shown on your career and in your season reviews">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {LEVELS.map((l) => {
            const d = DIFFICULTIES[l]
            const on = difficulty === l
            return (
              <button key={l} onClick={() => setDifficulty(l)} aria-pressed={on} className="rounded-xl border-2 p-3 text-left transition hover:brightness-110" style={{ borderColor: on ? LEVEL_COLOR[l] : '#2b3145', background: on ? `${LEVEL_COLOR[l]}1f` : '#10131c' }}>
                <div className="font-display text-2xl tracking-wide" style={{ color: LEVEL_COLOR[l] }}>{d.label}</div>
                <div className="mt-0.5 text-xs text-slate-300">{d.blurb}</div>
                <div className="mt-1.5 text-[11px] text-slate-500">{d.boost === 0 ? 'Computer teams at their normal ratings' : `Computer players ${d.boost > 0 ? '+' : ''}${d.boost} rating points`}</div>
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-xs text-slate-500">Difficulty only affects matches that involve your team. Games between two computer teams play out normally.</p>
      </Step>

      <Step n={3} title="Career">
        <div className="grid gap-3 rounded-2xl border border-line bg-panel p-4 sm:grid-cols-[2fr_1fr]">
          <label><div className="mb-1 text-xs text-slate-400">Career name</div><input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm outline-none focus:border-indigo-400" /></label>
          <label><div className="mb-1 text-xs text-slate-400">Starting year</div><input type="number" min={1900} max={2999} value={year} onChange={(e) => setYear(+e.target.value || year)} className="w-full rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm outline-none focus:border-indigo-400" /></label>
        </div>
      </Step>

      <Step n={4} title="Teams in the competition" hint={`${chosen.length} of ${teams.length}. Everyone is in by default; click a team to leave it out`}>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <button className={chip} onClick={() => setGroup(teams.map((t) => t.id))}>All</button>
          <button className={chip} onClick={() => setGroup([])}>None</button>
          <button className={chip} onClick={() => setGroup(teams.filter((t) => t.universe === 'anime').map((t) => t.id))}>Anime only</button>
          <button className={chip} onClick={() => setGroup(teams.filter((t) => t.universe === 'game').map((t) => t.id))}>Games only</button>
          <button className={chip} onClick={() => setPicked(new Set(teams.filter((t) => !picked.has(t.id)).map((t) => t.id)))}>Invert</button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {teams.map((t) => {
            const isMe = t.id === myTeamId
            const on = picked.has(t.id) || isMe
            return (
              <button key={t.id} onClick={() => toggle(t.id)} aria-pressed={on} className={`flex items-center gap-3 rounded-xl border p-2 text-left transition ${isMe ? 'border-amber-400/70 bg-amber-400/10' : on ? 'border-emerald-400/60 bg-emerald-400/10' : 'border-line bg-panel opacity-50 hover:opacity-80'}`}>
                <TeamCrest team={t} size={32} />
                <span className="min-w-0 flex-1 text-xs font-semibold leading-tight text-white">{t.name}</span>
                <span className={`text-[10px] font-bold ${isMe ? 'text-amber-300' : on ? 'text-emerald-300' : 'text-slate-600'}`}>{isMe ? 'YOU' : on ? 'IN' : 'OUT'}</span>
              </button>
            )
          })}
        </div>
      </Step>

      <div className="sticky bottom-0 max-md:bottom-[calc(var(--sab)+66px)] mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-panel/95 p-4 backdrop-blur">
        <div className="text-sm">
          {!me ? (
            <span className="text-amber-300">Choose the team you'll manage.</span>
          ) : chosen.length < MIN_TEAMS ? (
            <span className="text-red-300">Pick at least {MIN_TEAMS} teams.</span>
          ) : preview ? (
            <span className="text-slate-300">
              You manage <b className="text-white">{me.name}</b> on <b style={{ color: LEVEL_COLOR[difficulty] }}>{DIFFICULTIES[difficulty].label}</b>. About <b className="text-white">{preview.matches}</b> matches a year ({preview.tournaments} tournaments and {preview.series} friendly series), about <b className="text-white">{preview.mine}</b> of them yours.
              {chosen.length < 8 && <span className="ml-2 text-amber-300">With fewer than 8 teams, tournaments have fewer teams.</span>}
            </span>
          ) : null}
        </div>
        <button disabled={!me || chosen.length < MIN_TEAMS || !name.trim()} onClick={create} className="rounded-full bg-emerald-500 px-7 py-2 font-display text-2xl tracking-wide text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40">Start career</button>
      </div>
    </div>
  )
}
