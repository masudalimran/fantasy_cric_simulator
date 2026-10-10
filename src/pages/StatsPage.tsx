import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router'
import { PlayerCell, competitionName, usePlayerIndex, useTeamMap, type PlayerEntry } from '../components/season/shared'
import { TeamCrest } from '../components/ui'
import { paths } from '../routes'
import { oversText } from '../components/match/format'
import {
  average, bowlAverage, bowlStrikeRate, collect, economy, mostValuable, seasonRecords, strikeRate, teamRecords,
  type Collected, type Scope,
} from '../season/stats'
import { selectSeason, useStore } from '../store/useStore'
import type { MatchFormat, Team } from '../types'

const TABS = [
  { id: 'batting', label: 'Batting' },
  { id: 'bowling', label: 'Bowling' },
  { id: 'awards', label: 'Awards' },
  { id: 'teams', label: 'Teams' },
  { id: 'records', label: 'Records' },
] as const
type Tab = (typeof TABS)[number]['id']

const f1 = (n: number | null, d = 1) => (n === null ? '-' : n.toFixed(d))
const th = 'px-2 py-2 text-right font-medium'
const td = 'px-2 py-2 text-right tabular-nums text-slate-300'

function Rank({ i, cap }: { i: number; cap?: 'orange' | 'purple' }) {
  return (
    <td className="w-10 px-2 py-2 text-center">
      {i === 0 && cap ? (
        <span title={cap === 'orange' ? 'Orange Cap' : 'Purple Cap'} className={`inline-block h-5 w-5 rounded-full ${cap === 'orange' ? 'bg-orange-500' : 'bg-purple-500'}`} />
      ) : (
        <span className="text-slate-500">{i + 1}</span>
      )}
    </td>
  )
}

function Batting({ c, index }: { c: Collected; index: Map<string, PlayerEntry> }) {
  const rows = [...c.bat.values()].sort((a, b) => b.runs - a.runs || (strikeRate(b) ?? 0) - (strikeRate(a) ?? 0)).slice(0, 30)
  return (
    <table className="w-full text-sm">
      <thead className="text-[11px] uppercase tracking-wider text-slate-500"><tr><th className="px-2 py-2" /><th className="px-2 py-2 text-left font-medium">Player</th><th className={th}>M</th><th className={th}>Inns</th><th className={th}>Runs</th><th className={th}>HS</th><th className={th}>Avg</th><th className={th}>SR</th><th className={th}>50</th><th className={th}>100</th><th className={th}>4s</th><th className={th}>6s</th></tr></thead>
      <tbody>
        {rows.map((s, i) => (
          <tr key={s.id} className="border-t border-line/60">
            <Rank i={i} cap="orange" />
            <td className="px-2 py-1.5"><PlayerCell id={s.id} index={index} /></td>
            <td className={td}>{s.matches}</td><td className={td}>{s.innings}</td>
            <td className="px-2 text-right font-bold tabular-nums text-white">{s.runs}</td>
            <td className={td}>{s.high}{s.highNotOut ? '*' : ''}</td><td className={td}>{f1(average(s))}</td><td className={td}>{f1(strikeRate(s))}</td>
            <td className={td}>{s.fifties}</td><td className={td}>{s.hundreds}</td><td className={td}>{s.fours}</td><td className={td}>{s.sixes}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Bowling({ c, index }: { c: Collected; index: Map<string, PlayerEntry> }) {
  const rows = [...c.bowl.values()].sort((a, b) => b.wickets - a.wickets || (economy(a) ?? 99) - (economy(b) ?? 99)).slice(0, 30)
  return (
    <table className="w-full text-sm">
      <thead className="text-[11px] uppercase tracking-wider text-slate-500"><tr><th className="px-2 py-2" /><th className="px-2 py-2 text-left font-medium">Player</th><th className={th}>M</th><th className={th}>Ov</th><th className={th}>Mdn</th><th className={th}>Runs</th><th className={th}>Wkts</th><th className={th}>Best</th><th className={th}>Avg</th><th className={th}>Econ</th><th className={th}>SR</th><th className={th}>5W</th></tr></thead>
      <tbody>
        {rows.map((s, i) => (
          <tr key={s.id} className="border-t border-line/60">
            <Rank i={i} cap="purple" />
            <td className="px-2 py-1.5"><PlayerCell id={s.id} index={index} /></td>
            <td className={td}>{s.matches}</td><td className={td}>{oversText(s.balls)}</td><td className={td}>{s.maidens}</td><td className={td}>{s.runs}</td>
            <td className="px-2 text-right font-bold tabular-nums text-white">{s.wickets}</td>
            <td className={td}>{s.bestW}/{s.bestR}</td><td className={td}>{f1(bowlAverage(s))}</td><td className={td}>{f1(economy(s), 2)}</td><td className={td}>{f1(bowlStrikeRate(s))}</td><td className={td}>{s.fiveW}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Awards({ c, index }: { c: Collected; index: Map<string, PlayerEntry> }) {
  const mvp = mostValuable(c, 10)
  const potm = [...c.potm.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
  const box = 'rounded-2xl border border-line bg-panel p-4'
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className={box}>
        <h3 className="mb-3 font-display text-2xl tracking-wide text-amber-300">Most valuable players</h3>
        <table className="w-full text-sm"><tbody>
          {mvp.map((m, i) => <tr key={m.id} className="border-t border-line/60 first:border-0"><td className="w-8 py-2 text-slate-500">{i + 1}</td><td className="py-1.5"><PlayerCell id={m.id} index={index} /></td><td className="py-2 text-right font-bold tabular-nums text-white">{Math.round(m.points)} <span className="text-[11px] font-normal text-slate-500">pts</span></td></tr>)}
        </tbody></table>
      </section>
      <section className={box}>
        <h3 className="mb-3 font-display text-2xl tracking-wide text-sky-300">Man of the Match awards</h3>
        <table className="w-full text-sm"><tbody>
          {potm.map(([id, n], i) => <tr key={id} className="border-t border-line/60 first:border-0"><td className="w-8 py-2 text-slate-500">{i + 1}</td><td className="py-1.5"><PlayerCell id={id} index={index} /></td><td className="py-2 text-right font-bold tabular-nums text-white">{n}</td></tr>)}
        </tbody></table>
      </section>
    </div>
  )
}

function Teams({ rows, teams }: { rows: ReturnType<typeof teamRecords>; teams: Map<string, Team> }) {
  return (
    <table className="w-full text-sm">
      <thead className="text-[11px] uppercase tracking-wider text-slate-500"><tr><th className="px-2 py-2" /><th className="px-2 py-2 text-left font-medium">Team</th><th className={th}>P</th><th className={th}>W</th><th className={th}>L</th><th className={th}>T</th><th className={th}>Win %</th><th className={th}>Titles</th></tr></thead>
      <tbody>
        {rows.map((r, i) => {
          const t = teams.get(r.teamId)
          return (
            <tr key={r.teamId} className="border-t border-line/60">
              <td className="w-10 px-2 text-center text-slate-500">{i + 1}</td>
              <td className="px-2 py-1.5"><Link to={t ? paths.team(t.id) : '#'} className="flex items-center gap-2 hover:text-white">{t && <TeamCrest team={t} size={28} />}<span className="font-medium text-slate-100">{t?.name ?? r.teamId}</span></Link></td>
              <td className={td}>{r.played}</td><td className={td}>{r.won}</td><td className={td}>{r.lost}</td><td className={td}>{r.tied}</td>
              <td className={td}>{((r.won / Math.max(r.played, 1)) * 100).toFixed(0)}%</td>
              <td className="px-2 text-right font-bold tabular-nums text-amber-300">{r.titles || ''}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

export function StatsPage() {
  const season = useStore(selectSeason)
  const [params, setParams] = useSearchParams()
  const index = usePlayerIndex()
  const teams = useTeamMap()
  const tab = (TABS.find((t) => t.id === params.get('tab'))?.id ?? 'batting') as Tab
  const competitionId = params.get('scope') ?? ''
  const format = (params.get('format') ?? '') as MatchFormat | ''
  const set = (key: string, value: string) => setParams((p) => { const n = new URLSearchParams(p); if (value) n.set(key, value); else n.delete(key); return n }, { replace: true })

  const scope: Scope = useMemo(() => ({ competitionId: competitionId || undefined, format: format || undefined }), [competitionId, format])
  const collected = useMemo(() => (season ? collect(season, scope) : null), [season, scope])
  const records = useMemo(() => (season ? seasonRecords(season, scope) : []), [season, scope])
  const teamRows = useMemo(() => (season ? teamRecords(season, scope) : []), [season, scope])

  if (!season || !collected) {
    return (
      <div className="rounded-2xl border border-dashed border-line p-12 text-center text-slate-400">
        No session yet. <Link to={paths.sessions} className="text-indigo-300 hover:underline">Create one</Link>.
      </div>
    )
  }

  const tournaments = season.competitions.filter((c) => c.kind !== 'series')
  const sel = 'rounded-lg border border-line bg-panel px-3 py-2 text-sm'

  return (
    <div>
      <h1 className="font-display text-5xl tracking-wide">Stats <span className="text-slate-500">{season.year}</span></h1>
      <p className="mb-5 text-sm text-slate-400">{collected.matches} matches counted{competitionId ? ` in ${season.competitions.find((c) => c.id === competitionId)?.name}` : ' across the whole season'}.</p>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex overflow-hidden rounded-full border border-line text-sm">
          {TABS.map((t) => <button key={t.id} onClick={() => set('tab', t.id === 'batting' ? '' : t.id)} className={`px-4 py-1.5 transition ${tab === t.id ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}>{t.label}</button>)}
        </div>
        <select value={competitionId} onChange={(e) => set('scope', e.target.value)} className={sel}>
          <option value="">Whole season</option>
          {tournaments.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="flex overflow-hidden rounded-full border border-line text-sm">
          {[['', 'All'], ['t20', 'T20'], ['odi', 'ODI']].map(([v, l]) => <button key={v} onClick={() => set('format', v)} className={`px-4 py-1.5 transition ${format === v ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}>{l}</button>)}
        </div>
      </div>

      {collected.matches === 0 ? (
        <div className="rounded-2xl border border-dashed border-line p-12 text-center text-slate-400">No matches played here yet. Sim a few from the <Link to={paths.session()} className="text-indigo-300 hover:underline">session</Link>.</div>
      ) : (
        <div className={tab === 'awards' || tab === 'records' ? '' : 'overflow-x-auto rounded-2xl border border-line bg-panel p-3'}>
          {tab === 'batting' && <Batting c={collected} index={index} />}
          {tab === 'bowling' && <Bowling c={collected} index={index} />}
          {tab === 'awards' && <Awards c={collected} index={index} />}
          {tab === 'teams' && <Teams rows={teamRows} teams={teams} />}
          {tab === 'records' && (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {records.map((r) => {
                const team = r.teamId ? teams.get(r.teamId) : undefined
                return (
                  <div key={r.label} className="rounded-2xl border border-line bg-panel p-4">
                    <div className="text-[11px] uppercase tracking-widest text-slate-500">{r.label}</div>
                    <div className="mt-1 font-display text-4xl text-amber-300">{r.value}</div>
                    <div className="mt-2 flex items-center gap-2 text-sm text-slate-300">
                      {team && <><TeamCrest team={team} size={22} />{team.name}</>}
                      {r.playerId && <PlayerCell id={r.playerId} index={index} size={26} />}
                    </div>
                    <Link to={`${paths.competition(r.fixtureId.split(':')[0])}`} className="mt-2 inline-block text-xs text-indigo-300 hover:underline">{(() => { const c = season.competitions.find((x) => x.id === r.fixtureId.split(':')[0]); return c ? competitionName(c, teams) : '' })()} · {r.detail}</Link>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
