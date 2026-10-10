import { motion } from 'framer-motion'
import { useState } from 'react'
import type { TossResult } from '../../engine/types'
import type { Side } from '../../engine/types'
import { RatingBadge, TeamCrest, accentOf } from '../ui'
import { teamStrength } from '../../data/builders'
import { sfx } from '../../audio/sfx'

function Coin({ result, flipping }: { result: 'heads' | 'tails'; flipping: boolean }) {
  // 6 full turns, landing on the right face
  const rotate = flipping ? 360 * 6 + (result === 'heads' ? 0 : 180) : 0
  const face = 'absolute inset-0 grid place-items-center rounded-full border-4 border-amber-200 font-display text-6xl text-amber-900 [backface-visibility:hidden]'
  return (
    <div className="[perspective:900px]">
      <motion.div
        className="relative h-40 w-40 [transform-style:preserve-3d]"
        animate={{ rotateY: rotate, y: flipping ? [0, -150, 0] : 0 }}
        transition={{ duration: 2.2, ease: 'easeOut', y: { duration: 2.2, times: [0, 0.45, 1] } }}
      >
        <div className={face} style={{ background: 'radial-gradient(circle at 30% 30%, #fde68a, #f59e0b 60%, #b45309)', boxShadow: '0 10px 40px #f59e0b55' }}>H</div>
        <div className={face} style={{ background: 'radial-gradient(circle at 30% 30%, #fde68a, #f59e0b 60%, #b45309)', transform: 'rotateY(180deg)', boxShadow: '0 10px 40px #f59e0b55' }}>T</div>
      </motion.div>
    </div>
  )
}

export function CoinToss({ sides, toss, onStart, mustChoose = false, onChoose, news = [] }: {
  sides: [Side, Side]; toss: TossResult; onStart: () => void
  /** The toss winner is a person, who hasn't picked yet. */
  mustChoose?: boolean; onChoose?: (c: 'bat' | 'bowl') => void
  /** Changes the computer made to its XI. */
  news?: string[]
}) {
  const [stage, setStage] = useState<'idle' | 'flipping' | 'done'>('idle')
  const caller = sides[toss.callerSide].team
  const winner = sides[toss.winnerSide].team

  const flip = () => {
    setStage('flipping')
    sfx.coin()
    setTimeout(() => setStage('done'), 2400)
  }

  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-line bg-panel p-8 text-center">
      <div className="flex items-center justify-center gap-8">
        {sides.map((s, i) => (
          <div key={s.team.id} className="flex flex-col items-center gap-2">
            <TeamCrest team={s.team} size={72} />
            <div className="text-sm font-semibold text-white">{s.team.name}</div>
            <div className="-mt-1 text-xs text-slate-400">{s.team.series}</div>
            <RatingBadge value={teamStrength(s.team)} size="sm" />
            {i === 0 && <span className="sr-only">vs</span>}
          </div>
        ))}
      </div>
      {news.length > 0 && (
        <div className="mx-auto mt-5 max-w-md rounded-xl border border-line bg-panel-2 p-3 text-left">
          <div className="mb-1 text-[11px] font-extrabold uppercase tracking-widest text-sky-300">Team news</div>
          <ul className="space-y-0.5 text-sm text-slate-200">{news.map((n) => <li key={n}>• {n}</li>)}</ul>
        </div>
      )}
      <div className="my-6 font-display text-4xl tracking-wide text-slate-300">The toss</div>

      <div className="grid h-56 place-items-center">
        <Coin result={toss.coin} flipping={stage !== 'idle'} />
      </div>

      {stage === 'idle' && (
        <>
          <p className="mb-4 text-slate-300"><span className="font-semibold text-white">{caller.name}</span> call <span className="font-semibold uppercase text-amber-300">{toss.call}</span>.</p>
          <button onClick={flip} className="rounded-full bg-amber-500 px-8 py-3 font-display text-2xl tracking-wide text-black transition hover:bg-amber-400">Flip the coin</button>
        </>
      )}
      {stage === 'flipping' && <p className="text-slate-400">Flipping…</p>}
      {stage === 'done' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-lg text-slate-300">It's <span className="font-bold uppercase text-amber-300">{toss.coin}</span>.</p>
          {mustChoose && onChoose ? (
            <>
              <p className="mb-4 mt-1 text-xl font-bold" style={{ color: accentOf(winner) }}>{winner.name} won the toss. What will you do?</p>
              <div className="flex justify-center gap-3">
                <button onClick={() => onChoose('bat')} className="rounded-full bg-emerald-500 px-8 py-3 font-display text-2xl tracking-wide text-black transition hover:bg-emerald-400">Bat first</button>
                <button onClick={() => onChoose('bowl')} className="rounded-full bg-sky-500 px-8 py-3 font-display text-2xl tracking-wide text-black transition hover:bg-sky-400">Bowl first</button>
              </div>
            </>
          ) : (
            <>
              <p className="mb-5 mt-1 text-xl font-bold" style={{ color: accentOf(winner) }}>
                {winner.name} won the toss and chose to {toss.decision === 'bat' ? 'bat first' : 'bowl first'}.
              </p>
              <button onClick={onStart} className="rounded-full bg-indigo-500 px-8 py-3 font-display text-2xl tracking-wide text-white transition hover:bg-indigo-400">Play ball</button>
            </>
          )}
        </motion.div>
      )}
    </div>
  )
}
