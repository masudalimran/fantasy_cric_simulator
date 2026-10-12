import { AnimatePresence } from 'framer-motion'
import { createContext, useCallback, useContext, useState } from 'react'
import { useNavigate } from 'react-router'
import { paths } from '../../routes'
import { coachOf, needsFocus } from '../../season/coaching'
import { selectSeason, useStore } from '../../store/useStore'
import { Sheet } from '../Sheet'
import { CoachSheet } from './CoachSheet'

type Gate = (proceed: () => void) => void
const Ctx = createContext<Gate>((proceed) => proceed())

/** Wrap anything that starts or skips a match: if your coach has no instruction yet, you are asked to set one first. */
export const useCoachGate = (): Gate => useContext(Ctx)

/** The "set coaching instruction" card. `onLater` lets you carry on without (it will ask again next time). */
export function CoachPrompt({ onClose, onLater }: { onClose: () => void; onLater?: () => void }) {
  const navigate = useNavigate()
  const season = useStore(selectSeason)
  const coach = season?.myTeamId ? coachOf(season, season.myTeamId) : undefined
  const fresh = !!season?.coachChanged
  return (
    <Sheet label="Set coaching instruction" onClose={onClose} size="sm" z={86}>
      <div className="p-5 text-center">
        <div className="mx-auto mb-2 grid h-16 w-16 place-items-center rounded-full bg-amber-400/20 text-4xl">{fresh ? '✨' : '🎓'}</div>
        {fresh && coach ? (
          <>
            <div className="text-[11px] font-extrabold uppercase tracking-[0.3em] text-amber-300">New year · new coach</div>
            <h2 className="font-display text-4xl leading-none tracking-wide text-white">A new coach has appeared</h2>
            <div className="mt-2 font-display text-5xl leading-none tracking-wide text-amber-300">{coach.name}</div>
            <div className="text-sm text-slate-300">from {coach.game}</div>
            <p className="mt-1 text-xs italic text-slate-400">"{coach.style}"</p>
            <p className="mt-3 text-sm text-slate-300">Every team has a new coach this year. Tell <b className="text-white">{coach.name}</b> what to work on: batting, bowling or fielding. Without an instruction, nobody trains.</p>
          </>
        ) : (
          <>
            <h2 className="font-display text-4xl leading-none tracking-wide text-white">Set your coaching instruction</h2>
            <p className="mt-2 text-sm text-slate-300">{coach ? <><b className="text-white">{coach.name}</b> is waiting to hear what to work on.</> : 'Your coach is waiting to hear what to work on.'} Choose batting, bowling or fielding and every player improves a little each day. Without an instruction, nobody trains.</p>
          </>
        )}
        <div className="mt-4 grid gap-2">
          <button onClick={() => { onClose(); navigate(paths.sessionSquad) }} className="cta-pulse cta-pulse-gold rounded-full bg-amber-400 px-6 py-3.5 font-display text-2xl leading-none tracking-wide text-black hover:bg-amber-300 active:bg-amber-300">Set coaching instruction</button>
          {onLater && <button onClick={onLater} className="rounded-full border border-line py-2.5 text-sm font-semibold text-slate-300 hover:border-slate-400">Continue without it for now</button>}
        </div>
      </div>
    </Sheet>
  )
}

/** Provides the gate above. Mounted once near the top of the app. */
export function CoachGateProvider({ children }: { children: React.ReactNode }) {
  const season = useStore(selectSeason)
  const [pending, setPending] = useState<null | (() => void)>(null)
  const gate = useCallback<Gate>((proceed) => {
    if (season && needsFocus(season)) setPending(() => proceed)
    else proceed()
  }, [season])
  return (
    <Ctx.Provider value={gate}>
      {children}
      <AnimatePresence>
        {pending && <CoachPrompt onClose={() => setPending(null)} onLater={() => { const go = pending; setPending(null); go() }} />}
      </AnimatePresence>
    </Ctx.Provider>
  )
}

/** A card showing a team's coach; clicking it opens the coach's sheet with the report. */
export function CoachCard({ teamId }: { teamId: string }) {
  const season = useStore(selectSeason)
  const [open, setOpen] = useState(false)
  const coach = season ? coachOf(season, teamId) : undefined
  if (!season || !coach) return null
  const co = season.coaching?.[teamId]
  const mine = teamId === season.myTeamId
  const needs = mine && !co?.focus
  return (
    <>
      <button onClick={() => setOpen(true)} className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left transition hover:brightness-110 ${needs ? 'cta-pulse border-amber-400 bg-amber-400/10' : 'border-line bg-panel'}`}>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/10 text-2xl">🎓</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-extrabold uppercase tracking-widest text-amber-300">{mine ? 'Your coach' : 'Coach'}</span>
          <span className="block truncate font-display text-2xl leading-none tracking-wide text-white">{coach.name}</span>
          <span className="block truncate text-xs text-slate-400">{coach.game} · {co?.focus ? `working on ${co.focus}` : needs ? 'tap to set the instruction' : 'no instruction yet'}</span>
        </span>
        <span className="text-slate-500">›</span>
      </button>
      <AnimatePresence>{open && <CoachSheet teamId={teamId} onClose={() => setOpen(false)} />}</AnimatePresence>
    </>
  )
}
