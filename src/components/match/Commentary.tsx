import { deliveryText, shotText } from './AimPads'
import { AnimatePresence, motion } from 'framer-motion'
import { commentary, tagLabel } from '../../engine/commentary'
import type { Match } from '../../engine/match'
import { Scorecard } from './Scorecard'
import { StatsTabs } from './StatsTabs'
import { chip } from './NowPlaying'

export type Tab = 'scorecard' | 'commentary' | 'stats'

const TABS: { id: Tab; label: string }[] = [
  { id: 'scorecard', label: 'Scorecard' },
  { id: 'commentary', label: 'Commentary' },
  { id: 'stats', label: 'Stats' },
]

/** Ball-by-ball commentary (newest first, with an over summary after each over) or the full scorecard. */
export function Commentary({ match, tab, setTab }: { match: Match; tab: Tab; setTab: (t: Tab) => void }) {
  const feed = [...match.events].reverse().slice(0, 90)
  return (
    <div className="rounded-2xl border border-line bg-panel p-4">
      <div className="mb-3 flex flex-wrap gap-1.5" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold transition ${tab === t.id ? 'border-indigo-400 bg-indigo-500 text-white' : 'border-line text-slate-300 hover:text-white'}`}>{t.label}</button>
        ))}
      </div>
      {tab === 'scorecard' ? (
        <Scorecard match={match} />
      ) : tab === 'stats' ? (
        <StatsTabs match={match} />
      ) : (
        <div className="max-h-[520px] space-y-1.5 overflow-y-auto pr-1">
          {feed.length === 0 && <p className="text-sm text-slate-400">Nothing yet. Bowl the first ball.</p>}
          <AnimatePresence initial={false}>
            {feed.map((ev) => {
              const c = chip(ev)
              const overDone = ev.legal && ev.ballInOver === 5
              const overRuns = overDone ? match.innings[ev.innings].log.filter((e) => e.over === ev.over).reduce((s, e) => s + e.total, 0) : 0
              return (
                <motion.div key={ev.seq} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}>
                  {overDone && (
                    <div className="my-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200">
                      End of over {ev.over + 1}: <b className="text-white">{overRuns}</b> runs · {ev.score.runs}/{ev.score.wickets}
                    </div>
                  )}
                  <div className={`flex items-start gap-2 rounded-lg px-1 py-0.5 text-sm ${ev.wicket ? 'bg-red-500/15' : ev.boundary === 6 ? 'bg-fuchsia-500/15' : ev.boundary === 4 ? 'bg-sky-500/15' : ''}`}>
                    <span className={`mt-0.5 grid h-6 min-w-6 shrink-0 place-items-center rounded-full px-1 text-[11px] font-bold ${c.c}`}>{c.t}</span>
                    <span className="w-9 shrink-0 pt-0.5 text-xs tabular-nums text-slate-400">{ev.over}.{ev.legal ? ev.ballInOver + 1 : ev.ballInOver}</span>
                    <span className={ev.wicket ? 'font-semibold text-red-200' : ev.boundary ? 'font-semibold text-white' : 'text-slate-200'}>
                      {commentary(ev, {
                        striker: match.player(ev.strikerId).name, bowler: match.player(ev.bowlerId).name,
                        out: ev.wicket ? match.player(ev.wicket.playerId).name : undefined,
                        fielder: ev.wicket?.fielderId ? match.player(ev.wicket.fielderId).name : undefined,
                      })}
                      {(ev.delivery || ev.shot) && <span className="mt-0.5 block text-[11px] font-normal text-amber-200/80">{[ev.delivery && `Bowled ${deliveryText(ev.delivery)}`, ev.shot && `played ${shotText(ev.shot)}`].filter(Boolean).join('; ')}.</span>}
                      {ev.tags.filter((t) => tagLabel[t] && t !== 'maiden').map((t) => <span key={t} className="ml-2 rounded bg-amber-400/25 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">{tagLabel[t]}</span>)}
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
