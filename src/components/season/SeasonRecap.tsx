import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import type { RecapCard } from '../../season/recap'
import type { Team } from '../../types'
import { OriginTag, PlayerAvatar, accentOf } from '../ui'

const COLOR: Record<RecapCard['kind'], string> = { intro: '#818cf8', titles: '#fbbf24', bat: '#f97316', bowl: '#a855f7', wins: '#34d399', milestones: '#38bdf8', risers: '#f472b6' }
const ICON: Record<RecapCard['kind'], string> = { intro: '📅', titles: '🏆', bat: '🏏', bowl: '🎯', wins: '💪', milestones: '⭐', risers: '📈' }

/** The season as a few full-screen pages: tap the right side for the next one, the left to go back. */
export function SeasonRecap({ cards, team, onClose }: { cards: RecapCard[]; team: Team; onClose: () => void }) {
  const [i, setI] = useState(0)
  const card = cards[i]
  if (!card) return null
  const color = COLOR[card.kind]
  const last = i === cards.length - 1
  const next = () => (last ? onClose() : setI(i + 1))
  const back = () => setI(Math.max(0, i - 1))
  const player = (id?: string) => team.players.find((p) => p.id === id)
  const lead = player(card.playerId)
  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-ink" style={{ paddingTop: 'var(--sat)', paddingBottom: 'var(--sab)' }} role="dialog" aria-label="Season recap">
      <div className="flex shrink-0 items-center gap-1.5 px-3 pt-3" aria-hidden>
        {cards.map((_, k) => <span key={k} className="h-1 flex-1 rounded-full" style={{ background: k <= i ? color : '#ffffff26' }} />)}
      </div>
      <div className="flex shrink-0 items-center justify-between px-3 pt-2">
        <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Season recap</span>
        <button onClick={onClose} aria-label="Close" className="rounded-full bg-white/10 px-3 py-1 text-sm font-bold text-white active:bg-white/20">✕</button>
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={i} className="relative flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center"
          style={{ background: `radial-gradient(ellipse at 50% 35%, ${color}44, transparent 65%)` }}
          initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25 }}
        >
          <div className="text-5xl" aria-hidden>{ICON[card.kind]}</div>
          <div className="mt-2 text-sm font-extrabold uppercase tracking-widest" style={{ color }}>{card.title}</div>
          {lead && (
            <div className="mt-4 rounded-full" style={{ boxShadow: `0 0 0 4px ${accentOf(team)}, 0 0 40px ${color}88` }}><PlayerAvatar profile player={lead} team={team} size={110} /></div>
          )}
          {!lead && card.more && card.more.length > 0 && (
            <div className="mt-4 flex justify-center -space-x-3">
              {card.more.map((id) => { const p = player(id); return p ? <span key={id} className="rounded-full" style={{ boxShadow: `0 0 0 3px ${accentOf(team)}` }}><PlayerAvatar profile player={p} team={team} size={70} /></span> : null })}
            </div>
          )}
          <motion.div className="mt-4 font-display text-5xl leading-none tracking-wide text-white" style={{ textShadow: `0 0 30px ${color}99` }} initial={{ scale: 1.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.15, type: 'spring', stiffness: 220, damping: 15 }}>{card.big}</motion.div>
          <div className="mt-3 max-w-sm space-y-1">
            {card.lines.map((l, k) => <p key={k} className={k === 0 ? 'text-lg font-bold text-slate-100' : 'text-sm text-slate-300'}>{l}</p>)}
          </div>
          {lead && <div className="mt-2 text-xs"><OriginTag playerId={lead.id} /></div>}
          {/* tap zones: left goes back, right goes on */}
          <button className="absolute inset-y-0 left-0 w-1/3" onClick={back} aria-label="Previous page" />
          <button className="absolute inset-y-0 right-0 w-2/3" onClick={next} aria-label="Next page" />
        </motion.div>
      </AnimatePresence>
      <div className="shrink-0 px-4 pb-3 pt-1">
        <button onClick={next} className="w-full rounded-full border-2 px-6 py-3 font-display text-2xl leading-none tracking-wide text-black active:brightness-95" style={{ background: color, borderColor: '#ffffff88' }}>{last ? 'Done' : 'Next'}</button>
      </div>
    </div>
  )
}
