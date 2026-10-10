import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import type { Match } from '../../engine/match'
import type { Action } from '../../engine/replay'
import { ControlDeck, type AutoStops } from './ControlDeck'

type Auto = 0 | 1 | 2 | 4

const Gear = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
)

/** A tooltip that appears straight away above its child (hover or keyboard focus). */
function Tip({ label, hint, align = 'center', children }: { label: string; hint?: string; align?: 'center' | 'right'; children: React.ReactNode }) {
  return (
    <div className="group relative">
      {children}
      <div
        role="tooltip"
        className={`pointer-events-none absolute bottom-full z-50 mb-2.5 whitespace-nowrap rounded-lg bg-black px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-xl ring-1 ring-white/20 transition-opacity duration-100 group-focus-within:opacity-100 group-hover:opacity-100 ${align === 'right' ? 'right-0' : 'left-1/2 -translate-x-1/2'}`}
      >
        {label}
        {hint && <kbd className="ml-2 rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold text-slate-200">{hint}</kbd>}
      </div>
    </div>
  )
}

interface DockProps {
  match: Match
  act: (a: Action) => void
  auto: Auto
  setAuto: (v: Auto) => void
  open: boolean
  setOpen: (v: boolean) => void
  mySide?: 0 | 1 | null
  spectating?: boolean
  stops: AutoStops
  setStops: (s: AutoStops) => void
}

/**
 * The match controls live in a panel you open on demand, so the field and scorecard get the screen.
 * A small floating dock keeps the two things you do most within reach: the next ball and the panel.
 */
export function ControlsSheet({ match, act, auto, setAuto, open, setOpen, mySide, spectating, stops, setStops }: DockProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  if (match.isOver) return null

  return (
    <>
      {/* floating dock: round icon buttons in a row, each explained by a tooltip */}
      <div className="fixed bottom-20 right-5 z-40 flex flex-row items-center gap-2 rounded-full border border-line bg-panel/95 p-1.5 shadow-2xl backdrop-blur">
        <Tip label="Next ball" hint="Space">
          <button onClick={() => act({ t: 'ball' })} aria-label="Next ball" className="grid h-12 w-12 place-items-center rounded-full bg-emerald-500 text-black transition hover:bg-emerald-400">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z" /></svg>
          </button>
        </Tip>
        <Tip label={auto === 0 ? 'Auto-play: off. Click to start' : `Auto-play ${auto}x. Click to ${auto === 4 ? 'stop' : 'speed up'}`} hint="P pauses">
          <button
            onClick={() => setAuto(auto === 0 ? 1 : auto === 1 ? 2 : auto === 2 ? 4 : 0)}
            aria-label="Auto-play"
            className={`relative grid h-12 w-12 place-items-center rounded-full transition ${auto ? 'bg-indigo-500 text-white ring-2 ring-indigo-300' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
          >
            {auto ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M3 5.5v13a1 1 0 0 0 1.5.86L13 14v4.5a1 1 0 0 0 1.5.86l8-6a1 1 0 0 0 0-1.72l-8-6A1 1 0 0 0 13 6.5V11L4.5 4.64A1 1 0 0 0 3 5.5z" /></svg>
            )}
            {auto > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-white px-1.5 text-[10px] font-extrabold leading-4 text-indigo-700">{auto}x</span>}
          </button>
        </Tip>
        <Tip label="Match controls" hint="C" align="right">
          <button onClick={() => setOpen(true)} aria-label="Open match controls" className="grid h-12 w-12 place-items-center rounded-full bg-slate-700 text-white transition hover:bg-slate-600">
            <Gear />
          </button>
        </Tip>
      </div>

      {/* the panel */}
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-[60] bg-black/55" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)}>
            <motion.aside
              role="dialog" aria-modal="true" aria-label="Match controls"
              onClick={(e) => e.stopPropagation()}
              initial={{ x: 80, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 80, opacity: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="absolute right-0 top-0 flex h-full w-full max-w-[400px] flex-col bg-ink shadow-2xl ring-1 ring-line"
            >
              <div className="flex items-center justify-between border-b border-line px-4 py-2">
                <h2 className="font-display text-2xl tracking-wide text-white">Controls</h2>
                <button onClick={() => setOpen(false)} className="rounded-lg border border-line px-2.5 py-1 text-[13px] font-bold text-slate-200 hover:border-slate-400">Close</button>
              </div>
              <div className="flex-1 overflow-y-auto p-2.5">
                <ControlDeck match={match} act={act} auto={auto} setAuto={setAuto} mySide={mySide} spectating={spectating} stops={stops} setStops={setStops} />
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
