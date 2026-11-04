import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { PATCH_NOTES, type PatchNote } from '../data/patchNotes'
import { markPatchesRead, unreadPatches, usePatchesRead } from '../patchSeen'
import { paths } from '../routes'
import { selectSeason, useStore } from '../store/useStore'
import { Sheet } from './Sheet'

export const formatPatchDate = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })

/** One update: its title, a friendly line, and a card for each thing that changed. */
export function PatchCard({ patch, onGo, fresh = false }: { patch: PatchNote; onGo?: (to: string) => void; fresh?: boolean }) {
  const hasCareer = !!useStore(selectSeason)
  return (
    <div>
      <div className="mb-1 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest" style={{ color: patch.color }}>
        {formatPatchDate(patch.date)}
        {fresh && <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] text-black">New</span>}
      </div>
      <h2 className="font-display text-3xl leading-tight tracking-wide text-white">{patch.title}</h2>
      <p className="mb-3 text-sm leading-snug text-slate-300">{patch.tagline}</p>
      <ul className="space-y-2">
        {patch.items.map((it) => (
          <li key={it.title} className="flex gap-3 rounded-2xl border border-line bg-panel p-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-2xl" style={{ background: `${patch.color}22` }} aria-hidden>{it.icon}</span>
            <div className="min-w-0 flex-1">
              <div className="font-display text-xl leading-tight tracking-wide text-white">{it.title}</div>
              <p className="text-sm leading-snug text-slate-300">{it.text}</p>
              {it.to && onGo && (!it.needsCareer || hasCareer) && (
                <button onClick={() => onGo(it.to as string)} className="mt-1.5 cursor-pointer text-sm font-bold text-indigo-300 hover:text-indigo-200">Take a look ›</button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * The "What's new" popup. It opens by itself once for each update a person has not read (a phone that was last opened a while ago gets the
 * updates in order, newest first, one page each), never in the middle of a match, and never again once closed.
 */
export function PatchNotesPopup() {
  const read = usePatchesRead()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(0)
  const [queue, setQueue] = useState<PatchNote[]>([])
  const inMatch = pathname.startsWith('/match/')
  const unread = unreadPatches(read)

  // wait a moment after the game opens (so it never fights with the first screen), and stay out of the way of matches and other popups
  useEffect(() => {
    if (open || inMatch || unread.length === 0) return
    const t = window.setTimeout(() => {
      if (document.querySelector('[aria-modal="true"]')) return
      setQueue(unreadPatches())
      setPage(0)
      setOpen(true)
    }, 1200)
    return () => window.clearTimeout(t)
  }, [open, inMatch, unread.length, pathname])

  const close = () => { markPatchesRead(); setOpen(false) }
  const last = page >= queue.length - 1
  const cur = queue[page]
  return (
    <AnimatePresence>
      {open && cur && (
        <Sheet key="patch" label="What's new" onClose={close} z={85} size="md" scroll={false}>
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex shrink-0 items-center justify-between gap-2 px-5 pt-1">
              <span className="rounded-full bg-indigo-500 px-3 py-1 font-display text-lg leading-none tracking-wide text-white">What's new</span>
              {queue.length > 1 && <span className="text-xs font-bold text-slate-400">{page + 1} of {queue.length}</span>}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-3">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={cur.id} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.18 }}>
                  <PatchCard patch={cur} fresh onGo={(to) => { close(); navigate(to) }} />
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="shrink-0 border-t border-line bg-ink px-5 py-3">
              {queue.length > 1 && (
                <div className="mb-2 flex justify-center gap-1.5" aria-hidden>
                  {queue.map((q, i) => <span key={q.id} className={`h-1.5 rounded-full transition-all ${i === page ? 'w-5 bg-indigo-400' : 'w-1.5 bg-slate-600'}`} />)}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                {queue.length > 1 && !last
                  ? <button onClick={close} className="h-12 cursor-pointer rounded-full border border-line text-sm font-bold text-slate-200 hover:border-slate-400">Skip the rest</button>
                  : <Link to={paths.news} onClick={close} className="grid h-12 cursor-pointer place-items-center rounded-full border border-line text-sm font-bold text-slate-200 hover:border-slate-400">Read all updates</Link>}
                <button
                  onClick={() => (last ? close() : setPage(page + 1))}
                  className="cta-pulse h-12 cursor-pointer rounded-full bg-emerald-500 font-display text-xl tracking-wide text-black active:bg-emerald-400"
                >{last ? "Let's play" : 'Next'}</button>
              </div>
            </div>
          </div>
        </Sheet>
      )}
    </AnimatePresence>
  )
}

/** The News page: every update, newest first, the ones not yet read marked. */
export function NewsPage() {
  const read = usePatchesRead()
  const navigate = useNavigate()
  const [openId, setOpenId] = useState<string>(PATCH_NOTES[0].id)
  return (
    <div className="mx-auto max-w-2xl pb-6 pt-2">
      <h1 className="font-display text-5xl tracking-wide">News</h1>
      <p className="mb-4 text-slate-300">Everything that has changed in the game, newest first. Tap an update to open it.</p>
      <div className="space-y-3">
        {PATCH_NOTES.map((p) => {
          const open = openId === p.id
          return (
            <section key={p.id} className="overflow-hidden rounded-3xl border bg-panel" style={{ borderColor: open ? `${p.color}99` : undefined }}>
              <button onClick={() => setOpenId(open ? '' : p.id)} aria-expanded={open} className="flex min-h-16 w-full cursor-pointer items-center gap-3 px-4 py-3 text-left">
                <span className="h-10 w-1.5 shrink-0 rounded-full" style={{ background: p.color }} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-bold uppercase tracking-widest text-slate-400">{formatPatchDate(p.date)}</span>
                  <span className="block truncate font-display text-2xl leading-tight tracking-wide text-white">{p.title}</span>
                </span>
                {!read.has(p.id) && <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-extrabold text-black">NEW</span>}
                <span className={`text-slate-400 transition ${open ? 'rotate-90' : ''}`}>›</span>
              </button>
              {open && <div className="px-4 pb-4"><PatchCard patch={p} onGo={(to) => navigate(to)} /></div>}
            </section>
          )
        })}
      </div>
    </div>
  )
}
