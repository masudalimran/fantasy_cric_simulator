import { useCallback, useEffect, useRef, useState } from 'react'
import { useIsMobile } from '../hooks'
import { NavLink, Navigate, Outlet, useLocation } from 'react-router'
import { paths } from '../routes'
import { DIFFICULTIES } from '../engine/types'
import { selectSeason, selectSession, useStore, useViewedSeason } from '../store/useStore'
import { gradePlayedMatches } from '../season/progression'
import { cpuCoachingMissing } from '../season/coaching'
import { useBaseTeamMap, useTeamMap } from './season/shared'
import { TeamCrest } from './ui'
import { OfferBanner } from './season/OfferBanner'

const COLOR = { easy: '#34d399', normal: '#38bdf8', hard: '#fbbf24', legend: '#fb7185' } as const

/**
 * Everything inside one career: its name, the team you manage and the difficulty you chose, and the pages that
 * belong to it (calendar, tournaments, stats, your squad, the season review). Without an open career you are
 * sent to the list of careers.
 */
export function CareerLayout() {
  const season = useStore(selectSeason)
  const session = useStore(selectSession)
  const teams = useTeamMap()
  const { pathname } = useLocation()
  const mobile = useIsMobile()
  const tabStrip = useRef<HTMLElement>(null)
  const [more, setMore] = useState({ left: false, right: false })
  const measure = useCallback(() => {
    const el = tabStrip.current
    if (el) setMore({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 })
  }, [])
  // the arrows move the strip by about two tabs; it does not scroll by touch
  const nudge = (dir: -1 | 1) => tabStrip.current?.scrollBy({ left: dir * 150, behavior: 'smooth' })
  // keep the open page's tab fully in view (in the middle) when the strip is wider than the screen
  useEffect(() => {
    const strip = tabStrip.current
    const on = strip?.querySelector<HTMLElement>('[aria-current="page"]')
    if (strip && on) strip.scrollTo({ left: Math.max(0, on.offsetLeft - (strip.clientWidth - on.offsetWidth) / 2), behavior: 'smooth' }) // the open tab is brought to the middle, fully visible
  }, [pathname, mobile])
  useEffect(() => { measure(); window.addEventListener('resize', measure); return () => window.removeEventListener('resize', measure) }, [measure, mobile, pathname])
  const viewYear = useStore((s) => s.viewYear)
  const setViewYear = useStore((s) => s.setViewYear)
  const viewed = useViewedSeason()
  const baseTeams = useBaseTeamMap()
  const updateSeason = useStore((s) => s.updateSeason)
  const ensureMarket = useStore((s) => s.ensureMarket)
  useEffect(() => { if (season && (!season.market || !season.windows || !season.coaches || cpuCoachingMissing(season))) ensureMarket() }, [season?.id, !!season?.market, !!season?.windows, !!season?.coaches, season && cpuCoachingMissing(season)]) // sets up the market, the coaches and the computer's coaching instructions in careers saved before they existed // eslint-disable-line react-hooks/exhaustive-deps
  // A career started before ratings changed with every match is caught up once, from the matches already played.
  useEffect(() => { if (season && !season.graded) updateSeason((s) => gradePlayedMatches(s, baseTeams)) }, [season?.graded, season?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  // Only these pages can look back at a past year; the others always show the year being played.
  const canLookBack = /^\/career\/(tournaments|stats|team|results)/.test(pathname)
  useEffect(() => { if (!canLookBack && viewYear !== null) setViewYear(null) }, [canLookBack, viewYear, setViewYear])
  if (!season || !session) return <Navigate to={paths.sessions} replace />

  const mine = season.myTeamId ? teams.get(season.myTeamId) : undefined
  const diff = season.difficulty ?? 'normal'
  const tabs: [string, string][] = [
    [paths.session(), 'Calendar'],
    [paths.competitions, 'Tournaments'],
    [paths.stats, 'Stats'],
    ...(mine ? ([[paths.market, (season.market?.offers ?? []).some((o) => o.expires >= season.today) ? 'Market ●' : 'Market']] as [string, string][]) : []),
    ...(mine ? ([[paths.sessionSquad, 'My squad'], [paths.review, 'Season review']] as [string, string][]) : []),
  ]

  if (mobile) {
    return (
      <div>
        <div className="mb-2 flex items-center gap-2.5 rounded-2xl border border-line bg-panel px-3 py-2.5">
          {mine && <TeamCrest team={mine} size={38} />}
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Career · {season.year}{session.reviews.length > 0 ? ` · season ${session.reviews.length + 1}` : ''}</div>
            <h1 className="truncate font-display text-2xl leading-none tracking-wide text-white">{session.name}</h1>
            {mine && <div className="truncate text-xs text-slate-300">You manage <b className="text-white">{mine.name}</b></div>}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="rounded px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider" style={{ background: `${COLOR[diff]}26`, color: COLOR[diff] }}>{DIFFICULTIES[diff].label}</span>
            {canLookBack && viewed.years.length > 1 && (
              <select value={viewed.year ?? season.year} onChange={(e) => setViewYear(Number(e.target.value) === season.year ? null : Number(e.target.value))} className="rounded-lg border border-line bg-panel-2 px-2 py-1 text-xs font-semibold text-white" aria-label="Choose the year to look at">
                {[...viewed.years].reverse().map((y) => <option key={y} value={y}>{y}{y === season.year ? ' (now)' : ''}</option>)}
              </select>
            )}
          </div>
        </div>
        {canLookBack && !viewed.isCurrent && (
          <div className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-amber-400/50 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
            <span>Looking back at <b>{viewed.year}</b> (read-only)</span>
            <button onClick={() => setViewYear(null)} className="rounded-lg bg-amber-400 px-2.5 py-1 text-[11px] font-extrabold text-black">Back to {season.year}</button>
          </div>
        )}
        {/* the career's pages as a tab strip that stays in view while you scroll, like a native app */}
        <div className="sticky z-30 -mx-4 mb-3 flex items-center gap-1 border-b border-line/70 bg-ink/95 px-1.5 py-1.5" style={{ top: 'calc(var(--sat) + 49px)' }}>
          <button onClick={() => nudge(-1)} disabled={!more.left} aria-label="Previous tabs" className="grid h-9 w-8 shrink-0 place-items-center rounded-xl bg-white/5 text-lg font-bold text-white transition active:bg-white/15 disabled:opacity-25">‹</button>
          <nav ref={tabStrip} onScroll={measure} className="flex min-w-0 flex-1 gap-1 overflow-x-hidden" aria-label="Career pages">
            {tabs.map(([to, label]) => (
              <NavLink key={to} to={to} className={({ isActive }) => `shrink-0 whitespace-nowrap rounded-xl px-4 py-2 text-center text-[13px] font-bold tracking-tight transition ${label === 'Calendar' ? (isActive ? 'bg-amber-400 font-extrabold text-black shadow-[0_0_12px_rgba(251,191,36,.45)]' : 'border border-amber-400/70 bg-amber-400/15 font-extrabold text-amber-200 active:bg-amber-400/30') : isActive ? 'bg-indigo-500 text-white' : 'text-slate-300 active:bg-white/10'}`}>{label}</NavLink>
            ))}
          </nav>
          <button onClick={() => nudge(1)} disabled={!more.right} aria-label="More tabs" className="grid h-9 w-8 shrink-0 place-items-center rounded-xl bg-white/5 text-lg font-bold text-white transition active:bg-white/15 disabled:opacity-25">›</button>
        </div>
        <OfferBanner />
        <Outlet />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-5 rounded-2xl border border-line bg-panel px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {mine && <TeamCrest team={mine} size={44} />}
            <div className="min-w-0">
              <div className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Career · {season.year}{session.reviews.length > 0 ? ` · season ${session.reviews.length + 1}` : ''}</div>
              <h1 className="truncate font-display text-3xl leading-none tracking-wide text-white">{session.name}</h1>
              {mine && <div className="mt-0.5 text-sm text-slate-300">You manage <b className="text-white">{mine.name}</b></div>}
            </div>
          </div>
          {canLookBack && viewed.years.length > 1 && (
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Year</span>
              <select
                value={viewed.year ?? season.year}
                onChange={(e) => setViewYear(Number(e.target.value) === season.year ? null : Number(e.target.value))}
                className="cursor-pointer rounded-lg border border-line bg-panel-2 px-3 py-1.5 text-sm font-semibold text-white"
                aria-label="Choose the year to look at"
              >
                {[...viewed.years].reverse().map((y) => <option key={y} value={y}>{y}{y === season.year ? ' (current)' : ''}</option>)}
              </select>
            </label>
          )}
          <span className="rounded px-2.5 py-1 text-xs font-extrabold uppercase tracking-wider" style={{ background: `${COLOR[diff]}26`, color: COLOR[diff] }} title="Chosen when the career started and fixed for the whole career">{DIFFICULTIES[diff].label} difficulty</span>
        </div>
        {canLookBack && !viewed.isCurrent && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-400/50 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
            <span>Looking back at <b>{viewed.year}</b>. This is a finished season, so it is read-only.</span>
            <button onClick={() => setViewYear(null)} className="rounded-lg bg-amber-400 px-3 py-1 text-xs font-extrabold text-black hover:bg-amber-300">Back to {season.year}</button>
          </div>
        )}
        <nav className="mt-3 flex flex-wrap gap-1.5" aria-label="Career pages">
          {tabs.map(([to, label]) => (
            <NavLink key={to} to={to} className={({ isActive }) => `rounded-full px-4 py-1.5 text-sm font-semibold transition ${label === 'Calendar' ? (isActive ? 'bg-amber-400 text-black shadow-[0_0_14px_rgba(251,191,36,.45)]' : 'border border-amber-400/70 bg-amber-400/15 text-amber-200 hover:bg-amber-400/25') : isActive ? 'bg-indigo-500 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'}`}>{label}</NavLink>
          ))}
        </nav>
      </div>
      <OfferBanner />
      <Outlet />
    </div>
  )
}

