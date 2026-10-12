import { useState } from 'react'
import type { Match } from '../../engine/match'
import type { Action } from '../../engine/replay'
import type { Pace } from '../../engine/types'
import { haptic } from '../../hooks'
import { DeliveryPad, ShotPad } from './AimPads'

/**
 * What play manually shows in place of the auto-play dock: only the aim for the side you are running. Batting: where to
 * hit it. Bowling: the line, length and pace. Choosing is what plays the ball, so there is no Next ball and no auto-play.
 * (If you are only watching, a single Next ball button is all there is.)
 */
export function ManualControls({ match, act, userBats, userBowls, setManual }: {
  match: Match
  act: (a: Action) => void
  userBats: boolean
  userBowls: boolean
  setManual: (v: boolean) => void
}) {
  const [loft, setLoft] = useState(false)
  const [pace, setPace] = useState<Pace>('medium')
  const inn = match.shown
  const batSide = inn.battingSide
  const bowlSide = (1 - batSide) as 0 | 1
  const bowlerId = inn.bowlerId ?? inn.prevBowlerId
  const spin = /spin/i.test(bowlerId ? (match.player(bowlerId).bowling?.type ?? '') : '')
  return (
    <div className="space-y-3">
      <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg bg-white/5 px-2.5 py-2">
        <span><span className="block text-[13px] font-bold text-white">Play manually</span><span className="block text-[11px] text-slate-400">On: you play every ball yourself</span></span>
        <span role="switch" aria-checked onClick={(e) => { e.preventDefault(); setManual(false) }} className="relative h-6 w-11 shrink-0 rounded-full bg-indigo-500"><span className="absolute left-[22px] top-0.5 h-5 w-5 rounded-full bg-white shadow" /></span>
        <input type="checkbox" className="sr-only" checked onChange={() => setManual(false)} />
      </label>

      {userBats && (
        <section className="rounded-xl border border-line bg-panel-2 p-3">
          <h3 className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-amber-300">You are batting: where do you hit it?</h3>
          <ShotPad
            value={null} onChange={() => {}}
            manual={{ loft, setLoft, onPick: (angle) => { haptic(10); act({ t: 'shot', side: batSide, v: { angle, loft } }); act({ t: 'ball' }) } }}
          />
        </section>
      )}
      {userBowls && (
        <section className="rounded-xl border border-line bg-panel-2 p-3">
          <h3 className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-red-300">You are bowling: where does it pitch?</h3>
          <DeliveryPad
            value={null} onChange={() => {}} paceLabels={spin ? ['Quicker', 'Normal', 'Flighted'] : ['Fast', 'Medium', 'Slower ball']}
            manual={{ pace, setPace, onPick: (line, length) => { haptic(10); act({ t: 'delivery', side: bowlSide, v: { line, length, pace } }); act({ t: 'ball' }) } }}
          />
        </section>
      )}
      {!userBats && !userBowls && (
        <button onClick={() => act({ t: 'ball' })} className="cta-pulse w-full rounded-full bg-emerald-500 py-3 font-display text-2xl leading-none tracking-wide text-black hover:bg-emerald-400">Next ball</button>
      )}
    </div>
  )
}
