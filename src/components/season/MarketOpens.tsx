import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { sfx } from '../../audio/sfx'
import { paths } from '../../routes'
import { daysBetween, formatDate } from '../../season/dates'
import { SQUAD_CAP, openWindow } from '../../season/market'
import type { Season } from '../../season/types'
import { markSeen, useSeen } from '../../tips'

/** Gold coins that fall and spin behind the title. */
function Coins() {
  const coins = useMemo(() => Array.from({ length: 26 }, (_, i) => ({ x: (i * 37) % 100, delay: (i % 9) * 0.12, dur: 1.8 + (i % 5) * 0.35, size: 14 + (i % 4) * 6, spin: i % 2 ? 360 : -360 })), [])
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {coins.map((c, i) => (
        <motion.span
          key={i} className="absolute -top-8 rounded-full border-2 border-amber-200 bg-gradient-to-b from-amber-300 to-amber-500 shadow-[0_0_10px_rgba(251,191,36,.7)]"
          style={{ left: `${c.x}%`, width: c.size, height: c.size }}
          initial={{ y: -40, opacity: 0, rotateY: 0 }} animate={{ y: '115vh', opacity: [0, 1, 1, 0.8], rotateY: c.spin }}
          transition={{ delay: c.delay, duration: c.dur, ease: 'easeIn', repeat: 1, repeatDelay: 0.4 }}
        />
      ))}
    </div>
  )
}

/**
 * A short show when a market window opens (at the start of a career, and every year after): coins rain down and the
 * name of the window slams in. It plays once for each window of each career, then stays out of the way.
 */
export function MarketOpens({ season, sessionId }: { season: Season; sessionId: string }) {
  const navigate = useNavigate()
  const win = openWindow(season, season.today)
  const key = `market:${sessionId}:${win?.id ?? 'none'}`
  const seen = useSeen(key)
  const show = !!win && !seen && !!season.myTeamId
  useEffect(() => { if (show) sfx.cheer(0.8) }, [show])
  const purse = season.market?.budgets[season.myTeamId ?? ''] ?? 0
  const squad = season.market?.squads[season.myTeamId ?? '']?.length ?? 0
  const left = win ? Math.max(0, daysBetween(season.today, win.end)) : 0
  const close = () => markSeen(key)
  return (
    <AnimatePresence>
      {show && win && (
        <motion.div
          data-scroll-lock role="dialog" aria-modal="true" aria-label={`${win.name} is open`}
          className="fixed inset-0 z-[88] grid place-items-center bg-black/80 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close}
        >
          <Coins />
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.4, rotate: -6, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 15, delay: 0.25 }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border-2 border-amber-300 bg-ink p-6 text-center shadow-[0_0_80px_rgba(251,191,36,.45)]"
            style={{ background: 'radial-gradient(circle at 50% 0%, #fbbf2433, #10131c 62%)' }}
          >
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="text-[11px] font-extrabold uppercase tracking-[0.35em] text-amber-300">{win.start.slice(0, 4)} · the market is</motion.div>
            <motion.h2 initial={{ scale: 2.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.5, type: 'spring', stiffness: 260, damping: 14 }} className="font-display text-7xl leading-none tracking-wide text-white drop-shadow-[0_4px_0_rgba(0,0,0,.5)] max-md:text-6xl">OPEN!</motion.h2>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="mt-1 font-display text-3xl tracking-wide text-amber-300">{win.name}</motion.div>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.05 }} className="mt-2 text-sm text-slate-300">
              Sign young talent and buy stars until <b className="text-white">{formatDate(win.end)}</b> ({left} days). The other teams are shopping too, so good players do not wait.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }} className="mt-4 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-2xl bg-white/5 p-2"><div className="font-display text-4xl leading-none text-amber-300">{purse}</div><div className="text-[11px] uppercase tracking-wider text-slate-400">coins to spend</div></div>
              <div className="rounded-2xl bg-white/5 p-2"><div className="font-display text-4xl leading-none text-white">{squad}<span className="text-xl text-slate-500">/{SQUAD_CAP}</span></div><div className="text-[11px] uppercase tracking-wider text-slate-400">in your squad</div></div>
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.35 }} className="mt-5 grid gap-2">
              <button onClick={() => { close(); navigate(paths.market) }} className="cta-pulse cta-pulse-gold rounded-full bg-amber-400 px-6 py-3.5 font-display text-2xl leading-none tracking-wide text-black hover:bg-amber-300 active:bg-amber-300">Go to the market</button>
              <button onClick={close} className="rounded-full border border-line py-2.5 text-sm font-semibold text-slate-200 hover:border-slate-400">Later</button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
