import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import type { Match } from '../../engine/match'
import type { StadiumLook } from '../../engine/stadium'
import { pickHighlights, type Highlight } from '../../season/highlights'
import type { PitchKind } from '../../engine/pitchInfo'
import { accentOf } from '../ui'
import { BroadcastView } from './BroadcastView'
import { callName } from './format'
import { placedFor } from './fieldFor'
import { shareHighlights, type ShareInfo } from './shareCard'

const INTRO_S = 2.8
const CLIP_S = 4.8

const LABEL: Record<Highlight['kind'], string> = { hattrick: 'HAT-TRICK', hundred: 'HUNDRED', fifty: 'FIFTY', wicket: 'WICKET', six: 'SIX', four: 'FOUR', last: 'LAST BALL' }
const COLOR: Record<Highlight['kind'], string> = { hattrick: '#f472b6', hundred: '#fbbf24', fifty: '#fcd34d', wicket: '#f87171', six: '#e879f9', four: '#38bdf8', last: '#a78bfa' }

/** What to say about a highlight, in a few words. */
function captionOf(match: Match, h: Highlight): string {
  const ev = h.ev
  const bat = callName(match.player(ev.strikerId)), bowl = callName(match.player(ev.bowlerId))
  switch (h.kind) {
    case 'hattrick': return `${bowl} takes a hat-trick: ${bat} is out`
    case 'hundred': return `${bat} reaches a hundred`
    case 'fifty': return `${bat} reaches fifty`
    case 'wicket': return `${bowl} gets ${bat} (${ev.wicket?.kind ?? 'out'})`
    case 'six': return `${bat} hits ${bowl} for six${ev.distance ? `, ${ev.distance} m` : ''}`
    default: return `${bat} finds the rope off ${bowl}`
  }
}

/**
 * The match highlights: a title, then the best balls of the game one after another as live TV clips (each plays to the end) with what it was and the score at the time,
 * and a closing card with the result and a Share button (a picture and the text, through the phone's share sheet).
 */
export function Highlights({ match, look, pitch, motm, onClose }: { match: Match; look: StadiumLook; pitch: PitchKind; motm?: string; onClose: () => void }) {
  const picks = useMemo(() => pickHighlights(match.innings.map((i) => i.log)), [match])
  const bases = useMemo(() => picks.map((h) => ({ h, fielders: placedFor(match, h.ev) })), [match, picks])
  const [phase, setPhase] = useState(0) // 0 the title, 1..n the clips, n + 1 the end
  const n = bases.length
  const [shared, setShared] = useState<string | null>(null)
  useEffect(() => {
    if (phase > n) return
    const id = window.setTimeout(() => setPhase((p) => p + 1), (phase === 0 ? INTRO_S : CLIP_S) * 1000)
    return () => window.clearTimeout(id)
  }, [phase, n])
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  const [a, b] = match.sides
  const info: ShareInfo = {
    title: `${a.team.name} v ${b.team.name}`,
    result: match.result?.text ?? '',
    scores: match.innings.map((i) => ({ team: match.sides[i.battingSide].team.name, score: `${i.runs}/${i.wickets} (${Math.floor(i.legalBalls / 6)}.${i.legalBalls % 6})` })),
    motm, moments: bases.map((x) => captionOf(match, x.h)), colors: [a.team.colors.primary, b.team.colors.primary],
  }
  const cur = phase >= 1 && phase <= n ? bases[phase - 1] : null
  const ev = cur?.h.ev
  const inn = ev ? match.innings[ev.innings] : null
  return (
    <motion.div className="fixed inset-0 z-[90] flex flex-col bg-black" style={{ paddingTop: 'var(--sat)', paddingBottom: 'var(--sab)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-label="Match highlights">
      <div className="relative z-10 flex shrink-0 items-center justify-between px-3 py-2">
        <span className="flex items-center gap-2 rounded bg-black/70 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-widest text-amber-300"><span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />Highlights{cur ? ` · ${phase} of ${n}` : ''}</span>
        <div className="flex gap-2">
          {phase >= 1 && phase <= n && <button onClick={() => setPhase((p) => p + 1)} className="cursor-pointer rounded-full bg-white/15 px-3 py-1 text-sm font-bold text-white active:bg-white/25">Next</button>}
          <button onClick={onClose} className="cursor-pointer rounded-full bg-white/15 px-3 py-1 text-sm font-bold text-white active:bg-white/25">Close</button>
        </div>
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden" onClick={() => phase <= n && setPhase((p) => p + 1)}>
        <AnimatePresence mode="wait">
          {phase === 0 && (
            <motion.div key="intro" className="absolute inset-0 grid place-items-center p-6 text-center" style={{ background: `radial-gradient(ellipse at 50% 35%, ${a.team.colors.primary}88, #05070d 70%)` }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div>
                <motion.div className="font-display text-6xl leading-none tracking-wide text-amber-300" initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 14 }}>HIGHLIGHTS</motion.div>
                <motion.div className="mt-3 font-display text-3xl leading-none tracking-wide text-white" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>{a.team.short} v {b.team.short}</motion.div>
                <motion.div className="mt-2 text-base font-semibold text-slate-200" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>{match.result?.text}</motion.div>
              </div>
            </motion.div>
          )}
          {cur && ev && inn && (
            <motion.div key={`clip${phase}`} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="absolute inset-0 grid place-items-center">
                <div className="relative w-full" style={{ aspectRatio: '4 / 3', maxHeight: '100%' }}>
                  <BroadcastView event={ev} striker={match.player(ev.strikerId)} nonStriker={match.player(ev.nonStrikerId)} bowler={match.player(ev.bowlerId)} battingTeam={match.sides[inn.battingSide].team} bowlingTeam={match.sides[1 - inn.battingSide].team} fielders={cur.fielders} pitch={pitch} look={look} fitSeconds={CLIP_S - 1.2} />
                </div>
              </div>
              <div className="pointer-events-none absolute inset-x-3 bottom-4 flex items-stretch overflow-hidden rounded-lg bg-black/85 ring-1 ring-white/15">
                <div className="grid w-28 shrink-0 place-items-center px-2 font-display text-xl leading-none tracking-wide text-black" style={{ background: COLOR[cur.h.kind] }}>{LABEL[cur.h.kind]}</div>
                <div className="min-w-0 flex-1 px-3 py-1.5">
                  <div className="truncate text-[13px] font-bold text-white">{captionOf(match, cur.h)}</div>
                  <div className="text-[11px] font-semibold text-slate-400">{match.sides[inn.battingSide].team.short} {ev.score.runs}/{ev.score.wickets} · over {Math.floor(ev.score.legalBalls / 6)}.{ev.score.legalBalls % 6}</div>
                </div>
              </div>
            </motion.div>
          )}
          {phase > n && (
            <motion.div key="end" className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center" style={{ background: `radial-gradient(ellipse at 50% 30%, ${accentOf(a.team)}66, #05070d 70%)` }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="font-display text-4xl leading-none tracking-wide text-amber-300">{match.result?.text}</div>
              {info.scores.map((s) => <div key={s.team} className="text-lg font-bold text-white">{s.team} <span className="text-slate-300">{s.score}</span></div>)}
              {motm && <div className="text-sm font-semibold text-indigo-200">Man of the Match: {motm}</div>}
              <button onClick={async () => setShared(await shareHighlights(info))} className="mt-3 w-full max-w-xs cursor-pointer rounded-full border-2 border-white/50 bg-amber-400 px-8 py-3 font-display text-2xl leading-none tracking-wide text-black active:brightness-95" style={{ boxShadow: '0 0 24px #fbbf24aa' }}>Share highlights</button>
              <button onClick={() => setPhase(0)} className="w-full max-w-xs cursor-pointer rounded-full border-2 border-white/30 bg-white/10 px-8 py-2.5 font-display text-xl leading-none tracking-wide text-white active:bg-white/20">Watch again</button>
              {shared && <div className="text-xs text-slate-300">{shared === 'shared' ? 'Shared.' : shared === 'saved' ? 'Picture saved and the text copied.' : 'Sharing did not work on this phone.'}</div>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
