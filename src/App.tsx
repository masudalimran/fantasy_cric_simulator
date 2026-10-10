import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useLocation, useParams } from 'react-router'
import { SquadView } from './components/SquadView'
import { TeamEditor } from './components/TeamEditor'
import { TeamsView } from './components/TeamsView'
import { TeamView } from './components/TeamView'
import { TeamCrest } from './components/ui'
import { BUILT_IN_TEAMS } from './data/teams'
import { ResultsPage } from './pages/ResultsPage'
import { CareerTeamPage } from './pages/CareerTeamPage'
import { CalendarPage } from './pages/CalendarPage'
import { CareerLayout } from './components/CareerLayout'
import { Glossary } from './components/Glossary'
import { BottomNav, MobileHeader, MoreSheet } from './components/MobileChrome'
import { useIsMobile, useWakeLock } from './hooks'
import { DetailsProvider } from './components/season/Details'
import { CompetitionsPage } from './pages/CompetitionsPage'
import { MatchPage } from './pages/MatchPage'
import { NewSessionPage } from './pages/NewSessionPage'
import { SessionsPage } from './pages/SessionsPage'
import { PlayPage } from './pages/PlayPage'
import { HomePage } from './pages/HomePage'
import { HowToPlay } from './components/HowToPlay'
import { openHelp } from './tips'
import { ReviewPage } from './pages/ReviewPage'
import { BackupPage } from './pages/BackupPage'
import { StatsPage } from './pages/StatsPage'
import { isMuted, setMuted, sfx } from './audio/sfx'
import { setHideImages, useHideImages, useKeepAwake } from './prefs'
import { paths } from './routes'
import { selectSeason, useStore, useTeams } from './store/useStore'

function NotFound({ what = 'page' }: { what?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-line p-12 text-center text-slate-400">
      We couldn't find that {what}. <Link to={paths.teams} className="text-indigo-300 hover:underline">Back to all teams</Link>
    </div>
  )
}

function TeamPage() {
  const { id = '' } = useParams()
  return <TeamView id={id} />
}

function SquadPage() {
  const { id = '' } = useParams()
  return <SquadView key={id} id={id} />
}

function SessionSquadPage() {
  const season = useStore(selectSeason)
  if (!season?.myTeamId) return <NotFound what="squad" />
  return <SquadView key={season.myTeamId} id={season.myTeamId} session />
}

function EditTeamPage() {
  const { id } = useParams()
  const teams = useTeams()
  if (id && !teams.some((t) => t.id === id)) return <NotFound what="team" />
  // key: switching between teams must not carry editor state over
  return <TeamEditor key={id ?? 'new'} id={id} />
}

function CrestGallery() {
  return (
    <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
      {BUILT_IN_TEAMS.map((t) => (
        <Link key={t.id} to={paths.team(t.id)} className="flex flex-col items-center gap-2 text-xs text-slate-300">
          <TeamCrest team={t} size={120} />
          {t.name}
        </Link>
      ))}
    </div>
  )
}

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-4 py-1.5 transition ${isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`

/** Backup & transfer, as an icon at the far right of the bar. */
function BackupIcon() {
  return (
    <NavLink
      to={paths.backup}
      aria-label="Backup and transfer"
      className={({ isActive }) =>
        `group relative ml-2 grid h-9 w-9 place-items-center rounded-full border transition ${isActive ? 'border-sky-400 bg-sky-400/15 text-sky-200' : 'border-line text-slate-300 hover:border-slate-500 hover:text-white'}`
      }
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 7c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3z" /><path d="M4 7v5c0 1.7 3.6 3 8 3m8-8v3" /><path d="M4 12v5c0 1.7 3.6 3 8 3m5-4v6m0 0 3-3m-3 3-3-3" />
      </svg>
      <span role="tooltip" className="pointer-events-none absolute right-0 top-full z-50 mt-2 whitespace-nowrap rounded-lg bg-black px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-xl ring-1 ring-white/20 transition-opacity group-focus-visible:opacity-100 group-hover:opacity-100">Backup & transfer</span>
    </NavLink>
  )
}

function SessionButton({ big = false }: { big?: boolean }) {
  return (
    <NavLink
      to={paths.sessions}
      className={({ isActive }) =>
        `inline-flex items-center justify-center gap-2 rounded-full border-2 font-semibold transition ${big ? 'px-5 py-3 text-base' : 'px-4 py-1.5'} ${
          isActive ? 'border-indigo-300 bg-indigo-500 text-white shadow-[0_0_18px_#6366f188]' : 'border-indigo-400/60 bg-indigo-500/10 text-indigo-200 hover:bg-indigo-500/25 hover:text-white'
        }`
      }
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="17" rx="3" /><path d="M8 2v4M16 2v4M3 10h18" /></svg>
      Career
    </NavLink>
  )
}

function PlayButton({ to, resuming, big = false }: { to: string; resuming: boolean; big?: boolean }) {
  return (
    <NavLink
      to={to}
      title={resuming ? 'A match is live. Click to go back to it' : 'Play a match'}
      className={({ isActive }) =>
        `inline-flex items-center justify-center gap-2 rounded-full font-display leading-none tracking-wide text-black transition ${big ? 'px-5 py-3 text-2xl' : 'px-5 py-1.5 text-xl'} ${
          isActive ? 'bg-emerald-300 shadow-[0_0_20px_#34d39988]' : 'bg-emerald-500 hover:bg-emerald-400'
        }`
      }
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z" /></svg>
      {resuming ? 'LIVE' : 'PLAY'}
      {resuming && <span className="relative ml-0.5 flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-600" /></span>}
    </NavLink>
  )
}

/** Hide or show every player's picture throughout the app (initials are shown instead). */
function ImageToggle() {
  const hidden = useHideImages()
  return (
    <button
      onClick={() => setHideImages(!hidden)}
      title={hidden ? 'Player images are hidden. Click to show them' : 'Hide all player images'}
      aria-label={hidden ? 'Show player images' : 'Hide player images'}
      aria-pressed={hidden}
      className={`ml-2 grid h-9 w-9 place-items-center rounded-full border transition ${hidden ? 'border-amber-400/70 bg-amber-400/10 text-amber-200' : 'border-line text-slate-300 hover:border-slate-500 hover:text-white'}`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="1.8" /><path d="m21 16-5-5-8 8" />
        {hidden && <path d="M3 3l18 18" />}
      </svg>
    </button>
  )
}

/** The "?" that opens How to play from anywhere. */
function HelpButton() {
  return (
    <button onClick={openHelp} title="How to play" aria-label="How to play" className="ml-2 grid h-9 w-9 place-items-center rounded-full border border-line font-display text-xl leading-none text-slate-300 transition hover:border-slate-500 hover:text-white">?</button>
  )
}

function SoundToggle() {
  const [muted, set] = useState(isMuted())
  return (
    <button
      onClick={() => { const next = !muted; setMuted(next); set(next); if (!next) sfx.tick() }}
      title={muted ? 'Sound is off' : 'Sound is on'}
      aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
      className="ml-2 grid h-9 w-9 place-items-center rounded-full border border-line text-slate-300 transition hover:border-slate-500 hover:text-white"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 5 6 9H2v6h4l5 4z" fill="currentColor" />
        {muted ? <path d="m16 9 6 6M22 9l-6 6" /> : <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />}
      </svg>
    </button>
  )
}

export default function App() {
  const { pathname } = useLocation()
  // A match in progress: Play takes you straight back to it.
  const live = useStore((s) => s.liveMatch)
  const resuming = !!live && !live.finished
  const playTo = resuming && live ? live.url : paths.play
  const mobile = useIsMobile()
  useWakeLock(useKeepAwake())
  const [moreOpen, setMoreOpen] = useState(false)
  // on a phone a match is a full-screen game: no top bar, no tab bar
  const showChrome = !(mobile && pathname.startsWith('/match/'))
  const lastPath = useRef(pathname)
  useEffect(() => {
    // Flipping between months on the career calendar stays where you are; any other page starts at the top.
    const month = /^\/career\/calendar\/\d{4}-\d{2}$/
    const sameCalendar = month.test(lastPath.current) && month.test(pathname)
    lastPath.current = pathname
    if (!sameCalendar) window.scrollTo(0, 0)
    setMoreOpen(false) // landing on a page closes the sheet
  }, [pathname])

  // While any popup is open (anything marked aria-modal, or data-scroll-lock) the page behind it doesn't scroll.
  useEffect(() => {
    const body = document.body
    const sync = () => {
      const open = !!document.querySelector('[aria-modal="true"], [data-scroll-lock]')
      if (open && body.dataset.locked !== '1') {
        const gap = window.innerWidth - document.documentElement.clientWidth // keep the layout from jumping when the scrollbar goes
        body.dataset.locked = '1'
        body.style.overflow = 'hidden'
        if (gap > 0) body.style.paddingRight = `${gap}px`
      } else if (!open && body.dataset.locked === '1') {
        delete body.dataset.locked
        body.style.overflow = ''
        body.style.paddingRight = ''
      }
    }
    const mo = new MutationObserver(sync)
    mo.observe(body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-modal', 'data-scroll-lock'] })
    sync()
    return () => { mo.disconnect(); body.style.overflow = ''; body.style.paddingRight = ''; delete body.dataset.locked }
  }, [])

  return (
    <DetailsProvider>
    <Glossary />
    <div className={`mx-auto max-w-7xl px-4 sm:px-6 ${mobile ? (showChrome ? '' : 'px-2.5') : 'pb-16'}`} style={mobile ? { paddingBottom: showChrome ? 'calc(var(--sab) + 84px)' : 'var(--sab)', paddingLeft: 'max(var(--sal), 1rem)', paddingRight: 'max(var(--sar), 1rem)' } : undefined}>
      {mobile && showChrome && <MobileHeader resuming={resuming} playTo={playTo} />}
      <header className="hidden items-center justify-between py-5 md:flex">
        <Link to={paths.home} className="flex items-baseline gap-2">
          <span className="font-display text-3xl tracking-wider text-white">FANTASY CRIC</span>
          <span className="font-display text-3xl tracking-wider text-indigo-400">SIM</span>
        </Link>

        {/* Wide screens: the full bar */}
        <nav className="hidden gap-1 text-sm md:flex">
          <NavLink to={paths.home} end className={navClass}>Home</NavLink>
          <NavLink to={paths.teams} className={navClass}>Teams</NavLink>
          {/* The two things you do most, side by side at the end, each with its own look */}
          <div className="ml-3 flex items-center gap-2">
            <SessionButton />
            <PlayButton to={playTo} resuming={resuming} />
          </div>
          <HelpButton />
          <ImageToggle />
          <SoundToggle />
          <BackupIcon />
        </nav>

      </header>

      <motion.main key={pathname} className={mobile && showChrome ? 'pt-3' : undefined} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/teams" element={<TeamsView />} />
          <Route path="/teams/new" element={<EditTeamPage />} />
          <Route path="/teams/:id" element={<TeamPage />} />
          <Route path="/teams/:id/squad" element={<SquadPage />} />
          <Route path="/teams/:id/edit" element={<EditTeamPage />} />
          <Route path="/play" element={<PlayPage />} />
          {/* Careers: the list of saves, then everything inside the one you open */}
          <Route path="/career" element={<SessionsPage />} />
          <Route path="/career/new" element={<NewSessionPage />} />
          <Route element={<CareerLayout />}>
            <Route path="/career/calendar" element={<CalendarPage />} />
            <Route path="/career/calendar/:ym" element={<CalendarPage />} />
            <Route path="/career/tournaments" element={<CompetitionsPage />} />
            <Route path="/career/tournaments/:id" element={<CompetitionsPage />} />
            <Route path="/career/team/:id" element={<CareerTeamPage />} />
            <Route path="/career/results" element={<ResultsPage />} />
            <Route path="/career/stats" element={<StatsPage />} />
            <Route path="/career/squad" element={<SessionSquadPage />} />
            <Route path="/career/review" element={<ReviewPage />} />
          </Route>
          {/* old addresses still work */}
          <Route path="/session/*" element={<Navigate to={paths.session()} replace />} />
          <Route path="/sessions/*" element={<Navigate to={paths.sessions} replace />} />
          <Route path="/calendar/*" element={<Navigate to={paths.session()} replace />} />
          <Route path="/stats" element={<Navigate to={paths.stats} replace />} />
          <Route path="/competitions/*" element={<Navigate to={paths.competitions} replace />} />
          <Route path="/backup" element={<BackupPage />} />
          <Route path="/match/:format/:pair/:seed" element={<MatchPage />} />
          <Route path="/crests" element={<CrestGallery />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </motion.main>
      {mobile && showChrome && <BottomNav resuming={resuming} playTo={playTo} onMore={() => setMoreOpen(true)} />}
      <HowToPlay />
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </div>
    </DetailsProvider>
  )
}
