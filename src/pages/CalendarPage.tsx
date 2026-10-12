import { BeforeYoursSheet, matchesBefore } from '../components/season/BeforeYours'
import { MarketOpens } from '../components/season/MarketOpens'
import { MarketClosed } from '../components/season/MarketClosed'
import { CoachPrompt, useCoachGate } from '../components/season/CoachGate'
import { needsFocus } from '../season/coaching'
import { TipBanner } from '../components/TipBanner'
import { useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router'
import { competitionColor, competitionName, fixtureTeams, FixtureRow, useBaseTeamMap, useTeamMap } from '../components/season/shared'
import { Sheet } from '../components/Sheet'
import { PlayerAvatar, TeamCrest } from '../components/ui'
import { useIsMobile } from '../hooks'
import { paths } from '../routes'
import { addDays, daysBetween, formatDate, monthGrid, MONTHS, WEEKDAYS } from '../season/dates'
import { competitionStatus, isMine, myNextFixture, nextMatchDate, seasonComplete, simDay, simUntil as simSeasonUntil } from '../season/results'
import type { Fixture, Season } from '../season/types'
import { selectSeason, selectSession, useStore, useTeams } from '../store/useStore'

function DayCell({ date, inMonth, fixtures, selected, today, season, onSelect }: {
  date: string; inMonth: boolean; fixtures: Fixture[]; selected: boolean; today: boolean; season: Season; onSelect: () => void
}) {
  const teams = useTeamMap()
  const shown = fixtures.slice(0, 3)
  const compOf = (f: Fixture) => season.competitions.find((c) => c.id === f.competitionId)
  const mobile = useIsMobile()
  const win = season.windows?.find((w) => date >= w.start && date <= w.end) // the market is open on this day
  if (mobile) {
    // a phone's day is small: its number, a dot per match in the tournament's colour, and a ring if one of yours is waiting
    const mineWaiting = fixtures.some((f) => isMine(season, f) && !season.results[f.id])
    const allPlayed = fixtures.length > 0 && fixtures.every((f) => season.results[f.id])
    const mine = fixtures.some((f) => isMine(season, f))
    return (
      <button
        onClick={onSelect}
        className={`flex min-h-[54px] flex-col items-center justify-between rounded-xl border px-0.5 py-1 transition active:scale-95 ${
          selected ? 'border-indigo-400 bg-indigo-400/15' : today ? 'border-2 border-sky-400 bg-sky-400/15' : mineWaiting ? 'border-amber-400 bg-amber-400/10' : mine ? 'border-amber-400/50 bg-panel' : 'border-line bg-panel'
        } ${inMonth ? '' : 'opacity-30'} ${win ? 'ring-1 ring-fuchsia-400/70' : ''}`}
        aria-label={`${formatDate(date)}, ${fixtures.length} match${fixtures.length === 1 ? '' : 'es'}`}
      >
        <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1 text-[13px] font-bold leading-none ${today ? 'bg-sky-400 text-black' : mineWaiting ? 'text-amber-200' : 'text-slate-300'}`}>{Number(date.slice(8))}</span>
        <span className="flex max-w-full flex-wrap items-center justify-center gap-[3px] px-0.5">
          {shown.map((f) => { const comp = compOf(f); return <span key={f.id} className={`h-1.5 w-1.5 rounded-full ${season.results[f.id] ? 'opacity-40' : ''}`} style={{ background: comp ? competitionColor(comp, teams) : '#94a3b8' }} /> })}
        </span>
        <span className="h-3 text-[9px] font-semibold leading-3 text-slate-500">{fixtures.length > 3 ? `+${fixtures.length - 3}` : win && !mineWaiting && !allPlayed ? <span className="text-[9px] font-extrabold text-fuchsia-300">$</span> : mineWaiting ? <span className="text-[11px] text-amber-300">★</span> : allPlayed ? <span className="text-emerald-400">✓</span> : mine ? <span className="text-amber-300/70">★</span> : ''}</span>
      </button>
    )
  }
  return (
    <button
      onClick={onSelect}
      className={`flex min-h-[110px] flex-col rounded-xl border p-1.5 text-left transition ${
        selected ? 'border-indigo-400 bg-indigo-400/10' : today ? 'border-2 border-sky-400 bg-sky-400/10 shadow-[0_0_14px_#38bdf844]' : fixtures.some((f) => isMine(season, f) && !season.results[f.id]) ? 'border-amber-400 bg-amber-400/10 shadow-[0_0_14px_#fbbf2433]' : 'border-line bg-panel hover:border-slate-600'
      } ${inMonth ? '' : 'opacity-35'} ${win ? 'ring-1 ring-fuchsia-400/60' : ''}`}
    >
      {win && date === win.start && <span className="mb-0.5 rounded bg-fuchsia-500 px-1 text-center text-[9px] font-extrabold text-white">{win.name.toUpperCase()} OPENS</span>}
      {win && date === win.end && <span className="mb-0.5 rounded bg-fuchsia-500/60 px-1 text-center text-[9px] font-extrabold text-white">MARKET CLOSES</span>}
      <div className="flex items-center justify-between">
        <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1 text-xs font-semibold ${today ? 'bg-sky-400 font-extrabold text-black' : 'text-slate-400'}`}>{Number(date.slice(8))}</span>
        {today && <span className="rounded bg-sky-400 px-1 text-[9px] font-extrabold text-black">TODAY</span>}
        {!today && fixtures.length > 0 && <span className="text-[10px] text-slate-600">{fixtures.length}</span>}
      </div>
      {fixtures.some((f) => isMine(season, f)) && (
        <div className={`mt-1 rounded px-1 py-0.5 text-center text-[10px] font-extrabold ${fixtures.some((f) => isMine(season, f) && !season.results[f.id]) ? 'bg-amber-400 text-black' : 'bg-amber-400/25 text-amber-200'}`}>★ YOUR MATCH</div>
      )}
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
  const mobile = useIsMobile()
  const teams = useTeamMap()
  const baseTeams = useBaseTeamMap()
  const gate = useCoachGate()
  const [coachDismissed, setCoachDismissed] = useState(false) // the set-instruction card is back next time you open the Calendar
  const liveFixtureId = useStore((s) => (s.liveMatch && !s.liveMatch.finished ? (s.liveMatch.fixtureId ?? null) : null))
  const { ym } = useParams()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const teamFilter = params.get('team') ?? ''
  const formatFilter = params.get('format') ?? ''
  const selected = params.get('day')
  // set when a sim stops because it reached one of your own matches
  const [stopped, setStopped] = useState<Fixture | null>(null)
  const [rangeOpen, setRangeOpen] = useState(false)
  const [peek, setPeek] = useState<{ day?: string; until?: string } | null>(null) // the games of a day or a stretch of days being looked at

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
    const r = simSeasonUntil(season, date, baseTeams)
    updateSeason(() => r.season)
    setStopped(r.stoppedAt)
    if (r.stoppedAt) navigate(paths.session(r.stoppedAt.date.slice(0, 7)) + `?day=${r.stoppedAt.date}`, { replace: true })
  }
  // Move the date forward to a day. Nothing is played: the games of that day are shown first, and the date stays
  // there when the popup is closed.
  const moveTo = (date: string) => updateSeason((s) => (date > s.today ? { ...s, today: date } : s))
  const goToDay = (date: string) => { moveTo(date); setPeek({ day: date }); navigate(paths.session(date.slice(0, 7)), { replace: true }) }
  const simNextDay = () => gate(() => { const nd = nextMatchDate(season); if (nd) goToDay(nd) })
  // A week or a month ahead: stop at the first match day on the way (and ask), or if there is none just move the date on.
  const skipDays = (n: number) => gate(() => {
    const until = addDays(season.today, n)
    const nd = nextMatchDate(season)
    if (nd && nd <= until) goToDay(nd)
    else moveTo(until)
  })
  const myNext = myNextFixture(season)
  const between = matchesBefore(season)
  const skipToMine = () => gate(() => {
    if (!myNext) return
    if (between.length > 0) setRangeOpen(true)
    else simUntil(myNext.date)
  })
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
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          {myTeam && <button className={`${myNext && myNext.date > season.today ? 'cta-pulse cta-pulse-gold ' : ''}w-full rounded-full border-2 border-amber-200 bg-gradient-to-b from-amber-300 to-amber-500 px-6 py-3 font-display text-2xl leading-none tracking-wide text-black shadow-lg transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:animate-none sm:w-auto`} disabled={!myNext} onClick={skipToMine} title="Shows the other teams' matches before yours, so you can watch or sim them">{between.length > 0 ? `Sim the ${between.length === 1 ? 'game' : `${between.length} games`} before yours` : 'Go to my next match'}</button>}
          <button className="w-full rounded-full border-2 border-indigo-300/70 bg-gradient-to-b from-indigo-400 to-indigo-600 px-6 py-2.5 font-display text-xl leading-none tracking-wide text-white shadow-[0_0_16px_rgba(99,102,241,.45)] transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto" disabled={!pending} onClick={simNextDay}>Skip to next match day</button>
          <button className={btn} disabled={!pending} onClick={() => skipDays(7)}>Skip a week</button>
          <button className={btn} disabled={!pending} onClick={() => skipDays(30)}>Skip 30 days</button>
        </div>
      </div>
      {pending && <p className="-mt-3 mb-4 text-xs text-slate-400">Skip plays the other teams' matches for you. It always stops before one of yours.</p>}
      {season.windows?.some((w) => season.today >= w.start && season.today <= w.end) && (
        <Link to={paths.market} className="mb-4 flex items-center justify-between gap-3 whitespace-nowrap rounded-full border-2 border-fuchsia-400/70 bg-fuchsia-500/15 px-4 py-2.5 transition hover:bg-fuchsia-500/25 active:bg-fuchsia-500/30" title="Sign young talent or buy stars before the window closes">
          <span className="truncate font-display text-xl leading-none tracking-wide text-fuchsia-200"><span className="md:hidden">Market is open</span><span className="max-md:hidden">The player market is open</span></span>
          <span className="shrink-0 font-display text-xl leading-none tracking-wide text-white">Go to the market ›</span>
        </Link>
      )}
      {season.windows && season.windows.length > 0 && (
        <div className="mb-4 rounded-2xl border border-line bg-panel px-3 py-2.5" aria-label="Player market schedule">
          <div className="mb-1 flex items-center justify-between gap-2">
            <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-fuchsia-300">Player market in {season.year}</h3>
            {myTeam && <Link to={paths.market} className="text-[11px] font-bold text-fuchsia-200 hover:underline">Open the market ›</Link>}
          </div>
          <ul className="space-y-1">
            {season.windows.map((w) => {
              const open = season.today >= w.start && season.today <= w.end
              const done = season.today > w.end
              return (
                <li key={w.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                  <span className={`font-semibold ${open ? 'text-fuchsia-200' : 'text-white'}`}>{w.name}</span>
                  <span className="text-slate-300">{formatDate(w.start)} to {formatDate(w.end)}</span>
                  <span className={`rounded-full px-2 py-px text-[10px] font-extrabold uppercase tracking-wider ${open ? 'bg-fuchsia-400 text-black' : done ? 'bg-white/10 text-slate-400' : 'bg-white/10 text-slate-200'}`}>
                    {open ? `open now · ${Math.max(0, daysBetween(season.today, w.end))} days left` : done ? 'closed' : `opens in ${daysBetween(season.today, w.start)} days`}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
      {session && <MarketOpens season={season} sessionId={session.id} />}
      {session && myTeam && <MarketClosed season={season} sessionId={session.id} />}
      <AnimatePresence>{myTeam && needsFocus(season) && !coachDismissed && <CoachPrompt onClose={() => setCoachDismissed(true)} onLater={() => setCoachDismissed(true)} />}</AnimatePresence>
      <TipBanner id="calendar" title="This is your year">Press the glowing gold <b>Play</b> button to play your next match. Or press <b>Sim</b> to sim the other teams' matches first.</TipBanner>


      <AnimatePresence>{peek && <BeforeYoursSheet day={peek.day} until={peek.until} onClose={() => setPeek(null)} />}</AnimatePresence>
      <AnimatePresence>{rangeOpen && myNext && <BeforeYoursSheet onClose={() => setRangeOpen(false)} onSkipped={setStopped} />}</AnimatePresence>

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
                  {myTeam.players.find((x) => x.id === c.id) && <PlayerAvatar profile player={myTeam.players.find((x) => x.id === c.id)!} team={myTeam} size={24} />}
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

        {!mobile && <aside className="rounded-2xl border border-line bg-panel p-4 xl:sticky xl:top-4 xl:self-start">
          {selected ? (
            <>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-2xl tracking-wide">{formatDate(selected)}</h2>
                <button
                  className="text-xs text-emerald-300 hover:underline disabled:opacity-40"
                  disabled={!dayFixtures.some((f) => !season.results[f.id] && f.homeId && f.awayId)}
                  onClick={() => updateSeason((s) => ({ ...simDay(s, selected, baseTeams, false, liveFixtureId), today: selected > s.today ? selected : s.today }))}
                >
                  Skip this day
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
        </aside>}
      </div>

      {/* on a phone a tapped day opens as a bottom sheet */}
      <AnimatePresence>
        {mobile && selected && (
          <Sheet label={formatDate(selected)} onClose={() => setParam('day', '')} size="sm">
            <div className="p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="font-display text-2xl tracking-wide">{formatDate(selected)}</h2>
                <button
                  className="rounded-full border border-emerald-400/50 px-3 py-1.5 text-xs font-bold text-emerald-300 disabled:opacity-40"
                  disabled={!dayFixtures.some((f) => !season.results[f.id] && f.homeId && f.awayId)}
                  onClick={() => updateSeason((s) => ({ ...simDay(s, selected, baseTeams, false, liveFixtureId), today: selected > s.today ? selected : s.today }))}
                >
                  Skip this day
                </button>
              </div>
              {dayFixtures.length === 0 ? <p className="text-sm text-slate-500">No matches on this day.</p> : <div className="space-y-2">{dayFixtures.map((f) => <FixtureRow key={f.id} season={season} fixture={f} teams={teams} showCompetition />)}</div>}
            </div>
          </Sheet>
        )}
      </AnimatePresence>
    </div>
  )
}
