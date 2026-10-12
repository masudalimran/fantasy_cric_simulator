import { AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { BeforeYoursSheet, matchesBefore } from '../components/season/BeforeYours'
import { TeamCrest } from '../components/ui'
import { matchHref, useTeamMap } from '../components/season/shared'
import { formatDate } from '../season/dates'
import { myNextFixture, seasonComplete } from '../season/results'
import { paths } from '../routes'
import { openHelp } from '../tips'
import { selectSeason, selectSession, useStore } from '../store/useStore'

interface Next { label: string; hint: string; to: string; gold?: boolean; mine?: boolean }

const tile = 'flex min-h-[76px] flex-col justify-center rounded-2xl border border-line bg-panel p-4 text-left transition hover:border-slate-500 active:bg-panel-2'

/** The front door: one big shiny button that always says what to do next, and a few quiet ones below it. */
export function HomePage() {
  const navigate = useNavigate()
  const [beforeOpen, setBeforeOpen] = useState(false)
  const season = useStore(selectSeason)
  const session = useStore(selectSession)
  const live = useStore((s) => s.liveMatch)
  const teams = useTeamMap()
  const resuming = !!live && !live.finished
  const nextMine = season ? myNextFixture(season) : null
  const me = season?.myTeamId ? teams.get(season.myTeamId) : undefined
  const home = nextMine?.homeId ? teams.get(nextMine.homeId) : undefined
  const away = nextMine?.awayId ? teams.get(nextMine.awayId) : undefined

  let next: Next
  if (resuming && live) next = { label: 'Carry on with your match', hint: 'A match is waiting exactly where you left it.', to: live.url, gold: true }
  else if (!session || !season) next = { label: 'Start your first career', hint: 'Pick a team and you are ready to play. It takes about ten seconds.', to: paths.newSession }
  else if (nextMine && home && away) next = { label: 'Play your next match', hint: `${home.name} v ${away.name} · ${formatDate(nextMine.date)}`, to: matchHref(season, nextMine), gold: true, mine: true }
  else if (seasonComplete(season)) next = { label: 'See how your year went', hint: 'The season is over. Look back at it, then start the next one.', to: paths.review }
  else next = { label: 'Skip ahead', hint: 'Nothing of yours is waiting. Let the other teams play on.', to: paths.session() }

  return (
    <div className="mx-auto max-w-2xl pb-6 pt-2 md:pt-6">
      <h1 className="font-display text-5xl tracking-wide md:text-6xl">{session ? 'Welcome back' : 'Welcome'}</h1>
      <p className="mb-5 text-slate-300">{session ? `You are managing ${me?.name ?? 'your team'} in ${session.name}.` : 'Run a cricket team made of anime and game heroes, one match at a time.'}</p>

      <div className="rounded-3xl border border-line bg-gradient-to-b from-panel-2 to-panel p-5 text-center md:p-7">
        {me && <div className="mb-3 flex justify-center"><TeamCrest team={me} size={72} /></div>}
        <p className="mb-4 min-h-5 text-sm text-slate-300">{next.hint}</p>
        <button
          onClick={() => (next.mine && season && matchesBefore(season).length > 0 ? setBeforeOpen(true) : navigate(next.to))}
          className={`cta-pulse ${next.gold ? 'cta-pulse-gold bg-amber-400 active:bg-amber-300 hover:bg-amber-300' : 'bg-emerald-500 active:bg-emerald-400 hover:bg-emerald-400'} w-full rounded-full px-6 py-4 font-display text-3xl leading-none tracking-wide text-black`}
        >
          {next.label}
        </button>
      </div>

      {!session && (
        <ol className="mt-5 grid gap-2 sm:grid-cols-3">
          {['Pick a team', 'Press the glowing button', 'Win trophies'].map((t, i) => (
            <li key={t} className="flex items-center gap-3 rounded-2xl border border-line bg-panel p-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-indigo-500 font-display text-xl leading-none text-white">{i + 1}</span>
              <span className="font-semibold text-white">{t}</span>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-5 grid grid-cols-2 gap-2">
        {session && season?.windows?.some((w) => season.today >= w.start && season.today <= w.end) && <Link to={paths.market} className={`${tile} col-span-2 border-fuchsia-400/70 bg-fuchsia-500/10`}><span className="font-display text-2xl tracking-wide text-fuchsia-200">The player market is open</span><span className="text-xs text-slate-300">Sign young talent or buy stars before it closes</span></Link>}
        {session && <Link to={paths.session()} className={tile}><span className="font-display text-2xl tracking-wide text-white">Calendar</span><span className="text-xs text-slate-400">All your matches</span></Link>}
        <Link to={paths.play} className={tile}><span className="font-display text-2xl tracking-wide text-white">Quick match</span><span className="text-xs text-slate-400">Any two teams, just for fun</span></Link>
        <Link to={paths.teams} className={tile}><span className="font-display text-2xl tracking-wide text-white">Teams</span><span className="text-xs text-slate-400">See all the heroes</span></Link>
        <button onClick={openHelp} className={tile}><span className="font-display text-2xl tracking-wide text-white">How to play</span><span className="text-xs text-slate-400">Six easy steps</span></button>
      </div>
      <AnimatePresence>{beforeOpen && <BeforeYoursSheet onClose={() => setBeforeOpen(false)} />}</AnimatePresence>
    </div>
  )
}
