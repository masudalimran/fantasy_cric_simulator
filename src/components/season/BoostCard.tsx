import { BOOST_EVERY, BOOST_MULT, boostSummary } from '../../season/boost'
import { selectSession, useStore } from '../../store/useStore'

/** The boost token's switch: used on the squad screen (arms a token for the next match) and on the toss screen (uses one in this match). */
export function BoostSwitch({ on, onChange, available, locked = false, compact = false }: { on: boolean; onChange: (v: boolean) => void; available: number; locked?: boolean; compact?: boolean }) {
  return (
    <button
      type="button" role="switch" aria-checked={on} disabled={locked || (!on && available <= 0)} onClick={() => onChange(!on)}
      className={`inline-flex cursor-pointer items-center gap-2 rounded-full border-2 font-extrabold transition disabled:cursor-not-allowed disabled:opacity-60 ${compact ? 'px-3 py-1 text-xs' : 'px-4 py-2 text-sm'} ${on ? 'border-amber-300 bg-amber-400 text-black shadow-[0_0_18px_#fbbf2488]' : 'border-amber-400/60 bg-amber-400/10 text-amber-200 hover:bg-amber-400/20'}`}
      title={`Every rating of your team x${BOOST_MULT} for this match`}
    >
      <span aria-hidden>⚡</span>
      {on ? 'Boost on: +50%' : 'Use a boost (+50%)'}
      <span className={`rounded-full px-1.5 text-[11px] ${on ? 'bg-black/20' : 'bg-white/10'}`}>{available} left</span>
    </button>
  )
}

/** On the squad screen: how many boost tokens you have, how close the next one is, and a switch to use one in your next match. */
export function BoostCard() {
  const session = useStore(selectSession)
  const armBoost = useStore((s) => s.armBoost)
  if (!session) return null
  const b = boostSummary([...(session.history ?? []), session.season], session.boost, session.season.difficulty)
  if (!b.allowed) return null
  const into = BOOST_EVERY - b.toNext
  return (
    <section className="rounded-2xl border border-amber-400/40 bg-amber-400/5 p-3" aria-label="Boost tokens">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl leading-none tracking-wide text-amber-300">⚡ BOOST TOKENS: {b.available}</h2>
          <p className="mt-1 text-[12px] leading-snug text-slate-300">A token makes your whole team 50% better for one match (every rating x{BOOST_MULT}). You earn one for every {BOOST_EVERY} matches you win in this career.</p>
          <div className="mt-1.5 flex items-center gap-2 text-[11px] font-semibold text-slate-400">
            <div className="flex gap-1" aria-hidden>{Array.from({ length: BOOST_EVERY }, (_, i) => <span key={i} className={`h-2 w-5 rounded-full ${i < into ? 'bg-amber-400' : 'bg-white/15'}`} />)}</div>
            {b.toNext} more {b.toNext === 1 ? 'win' : 'wins'} for the next token
          </div>
        </div>
        <BoostSwitch on={b.armed} onChange={armBoost} available={b.available} />
      </div>
      {b.armed && <p className="mt-2 text-[12px] font-semibold text-amber-200">A boost is ready: it goes into your next match. You can change your mind on the toss screen, before the coin is flipped.</p>}
    </section>
  )
}
