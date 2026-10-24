import { useState } from 'react'
import { BOOST_EVERY, BOOST_MULT, boostSummary } from '../../season/boost'
import { hasMatchInProgress, selectSession, useStore } from '../../store/useStore'

/** The boost token's switch: used on the squad screen (arms a token for the next match) and on the toss screen (uses one in this match). */
export function BoostSwitch({ on, onChange, available, locked = false, compact = false, full = false }: { on: boolean; onChange: (v: boolean) => void; available: number; locked?: boolean; compact?: boolean; /** Fills the width (a phone). */ full?: boolean }) {
  return (
    <button
      type="button" role="switch" aria-checked={on} disabled={locked || (!on && available <= 0)} onClick={() => onChange(!on)}
      className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border-2 font-extrabold transition disabled:cursor-not-allowed disabled:opacity-50 ${full ? 'w-full' : ''} ${compact ? 'px-3 py-1 text-xs' : 'px-4 py-2.5 text-sm'} ${on ? 'border-amber-300 bg-amber-400 text-black shadow-[0_0_18px_#fbbf2488]' : 'border-amber-400/60 bg-amber-400/10 text-amber-200 enabled:hover:bg-amber-400/20'}`}
      title={`Every rating of your team x${BOOST_MULT} for this match`}
    >
      <span aria-hidden>⚡</span>
      <span>{on ? 'Boost on: +50%' : 'Use a boost (+50%)'}</span>
      <span className={`rounded-full px-1.5 text-[11px] ${on ? 'bg-black/20' : 'bg-white/10'}`}>{available} left</span>
    </button>
  )
}

/**
 * On the squad screen, folded away: a line with the token count, and when opened how they work, how close the next one is and a switch to use one in
 * the next match (not while your team is already in a match). Laid out in one column so it reads well on a phone.
 */
export function BoostCard() {
  const session = useStore(selectSession)
  const armBoost = useStore((s) => s.armBoost)
  const busy = useStore(hasMatchInProgress)
  const [open, setOpen] = useState(false)
  if (!session) return null
  const b = boostSummary([...(session.history ?? []), session.season], session.boost, session.season.difficulty)
  if (!b.allowed) return null
  const into = BOOST_EVERY - b.toNext
  return (
    <details className="group overflow-hidden rounded-2xl border border-amber-400/40 bg-amber-400/5" open={open} onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5">
        <span aria-hidden className="text-lg leading-none">⚡</span>
        <span className="font-display text-lg leading-none tracking-wide text-amber-300">BOOST TOKENS</span>
        <span className="rounded-full bg-amber-400 px-2 py-0.5 text-xs font-extrabold leading-none text-black">{b.available}</span>
        {b.armed && <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-bold leading-none text-emerald-300">Ready</span>}
        <span className="flex-1" />
        <span className="hidden text-[11px] font-semibold text-slate-400 sm:inline">{b.toNext} more {b.toNext === 1 ? 'win' : 'wins'} for the next</span>
        <span className="text-slate-400 transition group-open:rotate-90" aria-hidden>›</span>
      </summary>
      <div className="space-y-3 border-t border-amber-400/20 px-3 pb-3 pt-3">
        <p className="text-[13px] leading-snug text-slate-300">A token makes your whole team <b className="text-white">50% better</b> for one match: every rating x{BOOST_MULT}. You earn one for every {BOOST_EVERY} matches you win in this career.</p>
        <div>
          <div className="flex gap-1.5" aria-hidden>{Array.from({ length: BOOST_EVERY }, (_, i) => <span key={i} className={`h-2 flex-1 rounded-full ${i < into ? 'bg-amber-400' : 'bg-white/15'}`} />)}</div>
          <p className="mt-1.5 text-[12px] font-semibold text-slate-400">{b.toNext} more {b.toNext === 1 ? 'win' : 'wins'} for the next token</p>
        </div>
        <BoostSwitch full on={b.armed} onChange={armBoost} available={b.available} locked={busy} />
        {busy
          ? <p className="rounded-lg bg-white/5 px-2.5 py-2 text-[12px] leading-snug text-slate-300">Your team is in a match right now, so a boost can't be armed from here. If the toss is still to come, use the switch under the coin.</p>
          : b.armed
            ? <p className="text-[12px] leading-snug text-amber-200">A boost is ready: it goes into your next match. You can change your mind on the toss screen, before the coin is flipped.</p>
            : b.available === 0 && <p className="text-[12px] leading-snug text-slate-400">No tokens yet. Win {b.toNext} more {b.toNext === 1 ? 'match' : 'matches'} to earn one.</p>}
      </div>
    </details>
  )
}
