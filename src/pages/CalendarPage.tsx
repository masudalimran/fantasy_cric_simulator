import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router'
import { competitionColor, competitionName, fixtureTeams, FixtureRow, useTeamMap } from '../components/season/shared'
import { TeamCrest } from '../components/ui'
import { paths } from '../routes'
import { addDays, formatDate, monthGrid, MONTHS, WEEKDAYS } from '../season/dates'
import { competitionStatus, isMine, myNextFixture, nextMatchDate, seasonComplete, simDay, simUntil as simSeasonUntil } from '../season/results'
import type { Fixture, Season } from '../season/types'
import { selectSeason, selectSession, useStore, useTeams } from '../store/useStore'

function DayCell({ date, inMonth, fixtures, selected, today, season, onSelect }: {
  date: string; inMonth: boolean; fixtures: Fixture[]; selected: boolean; today: boolean; season: Season; onSelect: () => void
}) {
  const teams = useTeamMap()
  const shown = fixtures.slice(0, 3)
  const compOf = (f: Fixture) => season.competitions.find((c) => c.id === f.competitionId)
  return (
    <button
      onClick={onSelect}
      className={`flex min-h-[110px] flex-col rounded-xl border p-1.5 text-left transition ${
        selected ? 'border-indigo-400 bg-indigo-400/10' : fixtures.some((f) => isMine(season, f) && !season.results[f.id]) ? 'border-amber-400 bg-amber-400/10 shadow-[0_0_14px_#fbbf2433]' : today ? 'border-amber-400/70 bg-amber-400/5' : 'border-line bg-panel hover:border-slate-600'
      } ${inMonth ? '' : 'opacity-35'}`}
    >
      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold ${today ? 'text-amber-300' : 'text-slate-400'}`}>{Number(date.slice(8))}</span>
        {fixtures.length > 0 && <span className="text-[10px] text-slate-600">{fixtures.length}</span>}
      </div>
      <div className="mt-1 space-y-0.5">
        {shown.map((f) => {
          const comp = compOf(f)
          const played = !!season.results[f.id]
          return (
            <div key={f.id} className="rounded px-1 py-0.5 text-[10px] leading-tight" style={{ background: `${comp ? competitionColor(comp, teams) : '#94a3b8'}22`, borderLeft: `2px solid ${comp ? competitionColor(comp, teams) : '#94a3b8'}` }}>
              {fixtureTeams(f, teams) ? (
                fixtureTeams(f, teams)!.map((t, i) => (
                  <div key={i} className={`flex items-center gap-1 ${played && season.results[f.id]?.winnerId !== t.id ? 'text-slate-500' : played ? 'font-semibold text-white' : 'text-slate-100'}`}>
                    <TeamCrest team={t} size={11} />
                    <span className="truncate">{t.name}</span>
                    {played && i === 0 && <span className="ml-auto text-emerald-400">✓</span>}
                  </div>
                ))
              ) : (
                <div className="truncate font-semibold text-slate-200">{f.stage}<span className="font-normal text-slate-500"> · {comp ? competitionName(comp, teams) : ''}</span></div>
              )}
            </div>
          )
        })}
        {fixtures.length > shown.length && <div className="px-1 text-[10px] text-slate-500">+{fixtures.length - shown.length} more</div>}
      </div>
    </button>
  )
}

export function CalendarPage() {
  const season = useStore(selectSeason)
  const updateSeason = useStore((s) => s.updateSeason)
  const session = useStore(selectSession)
  const allTeams = useTeams()
  const teams = useTeamMap()
  const { ym } = useParams()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const teamFilter = params.get('team') ?? ''
  const formatFilter = params.get('format') ?? ''
  const selected = params.get('day')
  // set when a sim stops because it reached one of your own matches
  const [stopped, setStopped] = useState<Fixture | null>(null)

  const byDate = useMemo(() => {
    const map = new Map<string, Fixture[]>()
    if (!season) return map
    const compHasTeam = (id: string, t: string) => season.competitions.find((c) => c.id === id)?.teamIds.includes(t)
    for (const f of season.fixtures) {
      if (formatFilter && f.format !== formatFilter) continue
      if (teamFilter) {
        const involved = f.homeId && f.awayId ? f.homeId === teamFilter || f.awayId === teamFilter : compHasTeam(f.competitionId, teamFilter)
        if (!involved) continue
      }
      map.set(f.date, [...(map.get(f.date) ?? []), f])
    }
    return map
  }, [season, teamFilter, formatFilter])

  if (!season) return <Navigate to={paths.sessions} replace />

  const match = /^(\d{4})-(\d{2})$/.exec(ym ?? '')
  if (!match) return <Navigate to={paths.session(season.today.slice(0, 7))} replace />
  const [year, month] = [Number(match[1]), Number(match[2]) - 1]
  const cells = monthGrid(year, month)
  const monthKey = (y: number, m: number) => `${y}-${String(m + 1).padStart(2, '0')}`
  const prev = month === 0 ? monthKey(year - 1, 11) : monthKey(year, month - 1)
  const next = month === 11 ? monthKey(year + 1, 0) : monthKey(year, month + 1)
  const setParam = (key: string, value: string) =>
    setParams((p) => { const n = new URLSearchParams(p); if (value) n.set(key, value); else n.delete(key); return n }, { replace: true })

  // Sim forward, but never past one of your own matches: stop there so you can play it (or sim it) yourself.
  const simUntil = (date: string) => {
    const r = simSeasonUntil(season, date, teams)
    updateSeason(() => r.season)
    setStopped(r.stoppedAt)
    if (r.stoppedAt) navigate(paths.session(r.stoppedAt.date.slice(0, 7)) + `?day=${r.stoppedAt.date}`, { replace: true })
  }
  const simNextDay = () => { const nd = nextMatchDate(season); if (nd) { simUntil(nd); if (!myNextFixture(season) || myNextFixture(season)!.date !== nd) navigate(paths.session(nd.slice(0, 7)) + `?day=${nd}`) } }
  const myNext = myNextFixture(season)
  const done = seasonComplete(season)
  const myTeam = season.myTeamId ? teams.get(season.myTeamId) : undefined
  const lastYear = [...(session?.reviews[session.reviews.length - 1]?.progress ?? [])].sort((a, b) => b.after - b.before - (a.after - a.before))

  const dayFixtures = selected ? (byDate.get(selected) ?? []) : []
  const pending = nextMatchDate(season)
  const btn = 'rounded-lg border border-line bg-panel px-3 py-2 text-sm font-semibold text-slate-100 transition hover:border-indigo-400 disabled:cursor-not-allowed disabled:opacity-40'
  const doneComps = season.competitions.filter((c) => competitionStatus(season, c).status === 'done').length

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-4xl tracking-wide">Calendar</h2>
          <p className="text-sm text-slate-400">{season.year} · 
            Today is <b className="text-amber-300">{formatDate(season.today)}</b> · {Object.keys(season.results).length}/{season.fixtures.length} matches played · {doneComps}/{season.competitions.length} competitions finished
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {myTeam && <button className={`${btn} border-amber-400/70 bg-amber-400/10 text-amber-200`} disabled={!myNext} onClick={() => myNext && simUntil(myNext.date)} title="Simulates everything up to your next match, then stops">Sim to my next match</button>}
          <button className={btn} disabled={!pending} onClick={simNextDay}>Sim next match day</button>
          <button className={btn} disabled={!pending} onClick={() => simUntil(addDays(season.today, 7))}>Sim a week</button>
          <button className={btn} disabled={!pending} onClick={() => simUntil(addDays(season.today, 30))}>Sim 30 days</button>
        </div>
      </div>

      {myTeam && (myNext || done) && (
        <div className="mb-4 rounded-2xl border-2 border-amber-400/60 bg-amber-400/5 p-3">
          {done ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><div className="font-display text-3xl tracking-wide text-amber-300">The {season.year} season is complete</div><div className="text-sm text-slate-300">See how {myTeam.name} and every player got on.</div></div>
              <Link to={paths.review} className="rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-extrabold text-black hover:bg-amber-300">Season review</Link>
            </div>
          ) : myNext && (
            <>
              <div className="mb-2 flex flex-wrap items-baseline gap-x-3">
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-300">{stopped ? 'Your match is next' : 'Your next match'}</span>
                <span className="text-xs text-slate-400">{formatDate(myNext.date)}{myNext.date > season.today ? ` · ${Math.round((Date.parse(myNext.date) - Date.parse(season.today)) / 86400000)} days away` : ' · today'}</span>
              </div>
              <FixtureRow season={season} fixture={myNext} teams={teams} showCompetition />
            </>
          )}
        </div>
      )}

      {myTeam && lastYear.length > 0 && (
        <details className="mb-4 rounded-2xl border border-line bg-panel p-3">
          <summary className="cursor-pointer text-sm font-bold text-slate-200">Your squad's ratings after {session?.reviews[session.reviews.length - 1].year} <span className="font-normal text-slate-400">· {lastYear.filter((c) => c.after > c.before).length} improved, {lastYear.filter((c) => c.after < c.before).length} declined</span></summary>
          <div className="mt-2 grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
            {lastYear.map((c) => {
              const d = c.after - c.before
              return (
                <div key={c.id} className="flex items-center gap-2 border-t border-line/60 py-1 text-sm">
                  <span className="min-w-0 flex-1 truncate text-slate-100">{c.name}</span>
                  <span className="tabular-nums text-slate-400">{c.before} → <b className="text-white">{c.after}</b></span>
                  <span className={`w-9 text-right text-xs font-bold tabular-nums ${d > 0 ? 'text-emerald-400' : d < 0 ? 'text-rose-400' : 'text-slate-500'}`}>{d > 0 ? `▲${d}` : d < 0 ? `▼${-d}` : '–'}</span>
                </div>
              )
            })}
          </div>
        </details>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Link to={paths.session(prev) + location.search} className={btn} aria-label="Previous month">←</Link>
          <div className="w-44 text-center font-display text-3xl tracking-wide">{MONTHS[month]} {year}</div>
          <Link to={paths.session(next) + location.search} className={btn} aria-label="Next month">→</Link>
        </div>
        <Link to={paths.session(season.today.slice(0, 7)) + location.search} className="text-sm text-amber-300 hover:underline">Jump to today</Link>
        {myTeam && <button onClick={() => setParam('team', teamFilter === myTeam.id ? '' : myTeam.id)} className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${teamFilter === myTeam.id ? 'border-amber-400 bg-amber-400 text-black' : 'border-amber-400/60 text-amber-200 hover:bg-amber-400/10'}`}>My matches</button>}
        <select value={teamFilter} onChange={(e) => setParam('team', e.target.value)} className="rounded-lg border border-line bg-panel px-3 py-2 text-sm">
          <option value="">All teams</option>
          {allTeams.filter((t) => season.teamIds.includes(t.id)).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <div className="flex overflow-hidden rounded-full border border-line text-sm">
          {[['', 'All'], ['t20', 'T20'], ['odi', 'ODI']].map(([v, l]) => (
            <button key={v} onClick={() => setParam('format', v)} className={`px-4 py-1.5 transition ${formatFilter === v ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}>{l}</button>
          ))}
        </div>
        <Link to={paths.competitions} className="ml-auto text-sm text-indigo-300 hover:underline">All tournaments →</Link>
      </div>

      <div className="grid gap-5 xl:grid-cols-[3fr_1.4fr]">
        <div>
          <div className="mb-1 grid grid-cols-7 gap-1.5 text-center text-[11px] uppercase tracking-wider text-slate-500">
            {WEEKDAYS.map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {cells.map((d) => (
              <DayCell
                key={d} date={d} inMonth={Number(d.slice(5, 7)) - 1 === month} fixtures={byDate.get(d) ?? []}
                selected={selected === d} today={season.today === d} season={season}
                onSelect={() => setParam('day', selected === d ? '' : d)}
              />
            ))}
          </div>
        </div>

        <aside className="rounded-2xl border border-line bg-panel p-4 xl:sticky xl:top-4 xl:self-start">
          {selected ? (
            <>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-2xl tracking-wide">{formatDate(selected)}</h2>
                <button
                  className="text-xs text-emerald-300 hover:underline disabled:opacity-40"
                  disabled={!dayFixtures.some((f) => !season.results[f.id] && f.homeId && f.awayId)}
                  onClick={() => updateSeason((s) => ({ ...simDay(s, selected, teams), today: selected > s.today ? selected : s.today }))}
                >
                  Sim this day
                </button>
              </div>
              {dayFixtures.length === 0 ? (
                <p className="text-sm text-slate-500">No matches on this day.</p>
              ) : (
                <div className="space-y-2">{dayFixtures.map((f) => <FixtureRow key={f.id} season={season} fixture={f} teams={teams} showCompetition />)}</div>
              )}
            </>
          ) : (
            <div className="text-sm text-slate-400">
              <h2 className="mb-2 font-display text-2xl tracking-wide text-slate-200">Pick a day</h2>
              Click any day to see its fixtures and play or sim them. Colours show which tournament a match belongs to.
              <div className="mt-4 space-y-1.5">
                {season.competitions.filter((c) => c.kind !== 'series' && c.startDate.slice(0, 7) <= monthKey(year, month) && c.endDate.slice(0, 7) >= monthKey(year, month)).map((c) => {
                  const origin = c.originTeamId ? teams.get(c.originTeamId) : undefined
                  return (
                    <Link key={c.id} to={paths.competition(c.id)} className="flex items-center gap-2 rounded-lg border border-line p-2 hover:border-slate-500">
                      {origin && <TeamCrest team={origin} size={26} />}
                      <span className="truncate text-sm text-slate-200">{c.name}</span>
                      <span className="ml-auto text-[10px] uppercase text-slate-500">{c.format}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
