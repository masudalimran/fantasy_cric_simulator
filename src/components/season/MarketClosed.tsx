import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router'
import { paths } from '../../routes'
import { formatDate } from '../../season/dates'
import type { Season } from '../../season/types'
import { markSeen, useSeen } from '../../tips'
import { Sheet } from '../Sheet'

/**
 * Shown once on the Calendar after a market window has closed: what happened in it, and a button to see every transfer
 * made in that window across all the teams.
 */
export function MarketClosed({ season, sessionId }: { season: Season; sessionId: string }) {
  const navigate = useNavigate()
  // the most recent window that has finished
  const win = [...(season.windows ?? [])].filter((w) => w.end < season.today).sort((a, b) => b.end.localeCompare(a.end))[0]
  const key = `market-closed:${sessionId}:${win?.id ?? 'none'}`
  const seen = useSeen(key)
  if (!win || seen || !season.market || !season.myTeamId) return null
  const moves = season.market.log.filter((t) => t.date >= win.start && t.date <= win.end)
  const mine = season.myTeamId
  const yours = moves.filter((t) => t.from === mine || t.to === mine)
  const deals = moves.filter((t) => t.kind !== 'release')
  const biggest = [...deals].sort((a, b) => b.fee - a.fee)[0]
  const close = () => markSeen(key)
  return (
    <AnimatePresence>
      <Sheet label={`${win.name} has closed`} onClose={close} size="sm" z={87}>
        <motion.div className="p-5 text-center" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mx-auto mb-2 grid h-16 w-16 place-items-center rounded-full bg-fuchsia-400/20 text-4xl">🔒</div>
          <div className="text-[11px] font-extrabold uppercase tracking-[0.3em] text-fuchsia-300">{win.start.slice(0, 4)} · the market is</div>
          <h2 className="font-display text-6xl leading-none tracking-wide text-white">CLOSED</h2>
          <div className="mt-1 font-display text-2xl tracking-wide text-fuchsia-200">{win.name}</div>
          <p className="mt-1 text-xs text-slate-400">{formatDate(win.start)} to {formatDate(win.end)}</p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-white/5 p-2"><div className="font-display text-3xl leading-none text-white">{moves.length}</div><div className="text-[10px] uppercase tracking-wider text-slate-400">transfers</div></div>
            <div className="rounded-2xl bg-white/5 p-2"><div className="font-display text-3xl leading-none text-amber-300">{yours.length}</div><div className="text-[10px] uppercase tracking-wider text-slate-400">yours</div></div>
            <div className="rounded-2xl bg-white/5 p-2"><div className="font-display text-3xl leading-none text-white">{biggest ? biggest.fee : '-'}</div><div className="text-[10px] uppercase tracking-wider text-slate-400">biggest deal</div></div>
          </div>
          {biggest && <p className="mt-2 text-xs text-slate-300">Biggest deal: <b className="text-white">{biggest.name}</b> for {biggest.fee} {biggest.fee === 1 ? 'coin' : 'coins'}.</p>}
          {moves.length === 0 && <p className="mt-2 text-xs text-slate-400">Nobody made a move this time.</p>}
          <div className="mt-4 grid gap-2">
            <button onClick={() => { close(); navigate(`${paths.market}?tab=transfers&window=${win.id}`) }} className="cta-pulse rounded-full bg-fuchsia-400 px-6 py-3 font-display text-2xl leading-none tracking-wide text-black hover:bg-fuchsia-300 active:bg-fuchsia-300">See all transfers</button>
            <button onClick={close} className="rounded-full border border-line py-2.5 text-sm font-semibold text-slate-300 hover:border-slate-400">Close</button>
          </div>
        </motion.div>
      </Sheet>
    </AnimatePresence>
  )
}
