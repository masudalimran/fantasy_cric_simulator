import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { isMuted, setMuted, sfx } from '../audio/sfx'
import { useInstall } from '../hooks'
import { setHideImages, useHideImages } from '../prefs'
import { paths } from '../routes'

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

const Icon = {
  teams: <svg width="24" height="24" viewBox="0 0 24 24" {...stroke}><path d="M12 3 4 6v6c0 5 3.4 8 8 9 4.6-1 8-4 8-9V6z" /><path d="m9 12 2 2 4-4" /></svg>,
  career: <svg width="24" height="24" viewBox="0 0 24 24" {...stroke}><rect x="3" y="4" width="18" height="17" rx="3" /><path d="M8 2v4M16 2v4M3 10h18M8 15h3" /></svg>,
  more: <svg width="24" height="24" viewBox="0 0 24 24" {...stroke}><circle cx="5" cy="12" r="1.4" fill="currentColor" /><circle cx="12" cy="12" r="1.4" fill="currentColor" /><circle cx="19" cy="12" r="1.4" fill="currentColor" /></svg>,
  play: <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z" /></svg>,
}

/** The slim bar at the top of a phone screen: who we are, and a way back to a live match. */
export function MobileHeader({ resuming, playTo }: { resuming: boolean; playTo: string }) {
  return (
    <header className="sticky top-0 z-40 -mx-4 flex items-center justify-between border-b border-line/60 bg-ink/90 px-4 pb-2 backdrop-blur-xl" style={{ paddingTop: 'calc(var(--sat) + 8px)' }}>
      <Link to={paths.teams} className="flex items-baseline gap-1.5" aria-label="Fantasy Cric Sim home">
        <span className="font-display text-2xl tracking-wider text-white">FANTASY CRIC</span>
        <span className="font-display text-2xl tracking-wider text-indigo-400">SIM</span>
      </Link>
      {resuming && (
        <NavLink to={playTo} aria-label="Back to your live match" className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1 font-display text-base leading-none tracking-wide text-black">
          LIVE <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-red-600" /></span>
        </NavLink>
      )}
    </header>
  )
}

/** The tab bar along the bottom, like a native app: Teams, Career, a big Play button, More. */
export function BottomNav({ resuming, playTo, onMore }: { resuming: boolean; playTo: string; onMore: () => void }) {
  const { pathname } = useLocation()
  const item = (active: boolean) => `flex flex-1 flex-col items-center justify-center gap-0.5 pt-1.5 text-[10px] font-bold tracking-wide transition ${active ? 'text-white' : 'text-slate-500'}`
  const playActive = pathname.startsWith('/play')
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-[60] border-t border-line/70 bg-ink/92 backdrop-blur-xl" style={{ paddingBottom: 'var(--sab)', paddingLeft: 'var(--sal)', paddingRight: 'var(--sar)' }}>
      <div className="mx-auto flex h-[58px] max-w-md items-stretch">
        <NavLink to={paths.teams} className={() => item(pathname.startsWith('/teams'))}>
          <span className={pathname.startsWith('/teams') ? 'text-indigo-300' : ''}>{Icon.teams}</span>Teams
        </NavLink>
        <NavLink to={paths.sessions} className={() => item(pathname.startsWith('/career'))}>
          <span className={pathname.startsWith('/career') ? 'text-indigo-300' : ''}>{Icon.career}</span>Career
        </NavLink>
        <NavLink to={playTo} className="relative flex flex-1 items-start justify-center" aria-label={resuming ? 'Back to your live match' : 'Play a match'}>
          <span className={`-mt-4 grid h-14 w-14 place-items-center rounded-full text-black shadow-[0_6px_20px_rgba(16,185,129,.45)] ring-4 ring-ink transition ${playActive || resuming ? 'bg-emerald-300' : 'bg-emerald-500'}`}>
            {Icon.play}
            {resuming && <span className="absolute right-3.5 top-0.5 h-3 w-3 animate-pulse rounded-full bg-red-500 ring-2 ring-ink" />}
          </span>
          <span className={`absolute bottom-1.5 text-[10px] font-bold tracking-wide ${playActive || resuming ? 'text-emerald-300' : 'text-slate-500'}`}>{resuming ? 'Live' : 'Play'}</span>
        </NavLink>
        <button onClick={onMore} className={item(pathname.startsWith('/backup'))} aria-label="More">
          <span className={pathname.startsWith('/backup') ? 'text-indigo-300' : ''}>{Icon.more}</span>More
        </button>
      </div>
    </nav>
  )
}

/** A bottom sheet with the things that don't need a tab: backup, sound, images and installing the app. */
export function MoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const hideImages = useHideImages()
  const [muted, setM] = useState(isMuted())
  const install = useInstall()
  const [showIos, setShowIos] = useState(false)
  const row = 'flex min-h-14 w-full items-center gap-3 rounded-2xl border border-line bg-panel px-4 text-left'
  const toggle = (on: boolean) => (
    <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? 'bg-indigo-500' : 'bg-slate-700'}`}><span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} /></span>
  )
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[90] flex items-end bg-black/60 md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            role="dialog" aria-modal="true" aria-label="More"
            onClick={(e) => e.stopPropagation()}
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }} onDragEnd={(_, i) => { if (i.offset.y > 90 || i.velocity.y > 600) onClose() }}
            className="w-full rounded-t-3xl border-t border-line bg-ink px-4 pt-2 shadow-2xl"
            style={{ paddingBottom: 'calc(var(--sab) + 16px)' }}
          >
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-600" aria-hidden />
            <div className="space-y-2">
              <Link to={paths.backup} onClick={onClose} className={row}>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-400/15 text-sky-300"><svg width="22" height="22" viewBox="0 0 24 24" {...stroke}><path d="M4 7c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3z" /><path d="M4 7v5c0 1.7 3.6 3 8 3m8-8v3" /><path d="M4 12v5c0 1.7 3.6 3 8 3m5-4v6m0 0 3-3m-3 3-3-3" /></svg></span>
                <span className="flex-1"><span className="block font-semibold text-white">Backup & transfer</span><span className="block text-xs text-slate-400">Save a copy, or move to another device</span></span>
                <span className="text-slate-500">›</span>
              </Link>
              <button onClick={() => { const next = !muted; setMuted(next); setM(next); if (!next) sfx.tick() }} className={row} role="switch" aria-checked={!muted}>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-400/15 text-amber-300"><svg width="22" height="22" viewBox="0 0 24 24" {...stroke}><path d="M11 5 6 9H2v6h4l5 4z" fill="currentColor" />{muted ? <path d="m16 9 6 6M22 9l-6 6" /> : <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />}</svg></span>
                <span className="flex-1"><span className="block font-semibold text-white">Sound</span><span className="block text-xs text-slate-400">Crowd, wickets and cheers</span></span>
                {toggle(!muted)}
              </button>
              <button onClick={() => setHideImages(!hideImages)} className={row} role="switch" aria-checked={!hideImages}>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-fuchsia-400/15 text-fuchsia-300"><svg width="22" height="22" viewBox="0 0 24 24" {...stroke}><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="1.8" /><path d="m21 16-5-5-8 8" />{hideImages && <path d="M3 3l18 18" />}</svg></span>
                <span className="flex-1"><span className="block font-semibold text-white">Player images</span><span className="block text-xs text-slate-400">Turn pictures off to show initials</span></span>
                {toggle(!hideImages)}
              </button>
              {!install.installed && (install.canPrompt || install.ios) && (
                <>
                  <button onClick={() => { if (install.canPrompt) void install.prompt(); else setShowIos((v) => !v) }} className={row}>
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-400/15 text-emerald-300"><svg width="22" height="22" viewBox="0 0 24 24" {...stroke}><rect x="6" y="2" width="12" height="20" rx="3" /><path d="M12 8v6m0 0-2.5-2.5M12 14l2.5-2.5" /></svg></span>
                    <span className="flex-1"><span className="block font-semibold text-white">Install the app</span><span className="block text-xs text-slate-400">Full screen, its own icon, works offline</span></span>
                    <span className="text-slate-500">›</span>
                  </button>
                  {showIos && <p className="rounded-2xl border border-line bg-panel p-3 text-sm text-slate-200">On an iPhone: tap the <b>Share</b> button in Safari, then <b>Add to Home Screen</b>.</p>}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
