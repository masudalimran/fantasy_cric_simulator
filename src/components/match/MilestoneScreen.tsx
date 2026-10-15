import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import type { Player, Team } from '../../types'
import { OriginTag } from '../ui'
import { Actor } from './WicketReplay'

/** Everything the fifty / century screen needs: the scorer, his partner and how the innings went. */
export interface FistInfo {
  batsman: Player
  /** The other batsman at the crease, who walks over to congratulate him (none if he was alone). */
  partner: Player | null
  team: Team
  /** FIFTY!, CENTURY!, 150! ... */
  title: string
  /** A hundred or more gets the full golden treatment. */
  big: boolean
  /** The innings, as words: runs off balls, then strike rate and boundaries. */
  lines: string[]
  /** 1 = full speed. Higher auto-play speeds play it quicker. */
  rate: number
}

/**
 * A fifty or a hundred on one screen of about 4 seconds: the two batsmen walk to the middle of the pitch and bump fists,
 * then the word slams in with the scorer's innings under it. Click anywhere to skip it.
 */
export function MilestoneScreen({ info }: { info: FistInfo }) {
  const { batsman, partner, team, title, big, lines, rate: r } = info
  const box = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(640)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const compact = w < 520 // a phone: smaller portraits, higher up, so the card underneath has room
  const size = compact ? Math.max(34, Math.min(w * 0.085, 48)) : Math.max(40, Math.min(w * 0.1, 70))
  const gold = big ? '#fde68a' : '#fbbf24'
  // the meeting point, and when the fists touch (seconds at rate 1)
  const MEET = { x: 50, y: compact ? 22 : 30 }
  const bump = 1.7
  const gap = 12.5
  return (
    <div ref={box} className="absolute inset-0 overflow-hidden rounded-2xl" aria-label={`${title} for ${batsman.name}`}>
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 45%, #1e7a44, #0f3d24 75%)' }} />
      <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 50% 30%, ${gold}33, transparent 60%)` }} />
      <div className="absolute left-1/2 top-[6%] h-[48%] w-[9%] -translate-x-1/2 rounded bg-gradient-to-r from-[#bf9a5f] via-[#d7b87c] to-[#bf9a5f]" />
      {big && (
        <motion.div className="pointer-events-none absolute left-1/2 top-[30%] h-[120%] w-[90%] -translate-x-1/2 -translate-y-1/2 opacity-25" style={{ background: 'conic-gradient(from 0deg, #fbbf2400, #fbbf24aa, #fbbf2400, #fbbf24aa, #fbbf2400, #fbbf24aa, #fbbf2400, #fbbf24aa, #fbbf2400)', borderRadius: '50%' }} animate={{ rotate: 360 }} transition={{ duration: 14, repeat: Infinity, ease: 'linear' }} />
      )}

      <div className="absolute left-3 top-3 z-30 flex items-center gap-2 rounded-lg bg-black/70 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-widest" style={{ color: gold }}><span className="h-2 w-2 animate-pulse rounded-full" style={{ background: gold }} />Milestone</div>
      <div className="absolute right-3 top-3 z-30 rounded-full bg-black/50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-300">Tap to continue</div>

      {/* the partner walks down from the other end, the scorer from his own, and they meet in the middle */}
      {partner && (
        <Actor
          player={partner} team={team} size={size * 0.85} tag="Partner" from={{ x: 50, y: 4 }}
          path={[{ x: 50, y: 4 }, { x: MEET.x + gap, y: MEET.y }]} times={[0, 1]} dur={bump * r}
          jump={(bump + 0.15) * r}
        />
      )}
      <Actor
        player={batsman} team={team} size={size * 1.3} hero={gold} tag={title.replace('!', '')} from={{ x: 50, y: 46 }}
        path={[{ x: 50, y: 46 }, { x: MEET.x - gap, y: MEET.y }]} times={[0, 1]} dur={bump * r}
        jump={(bump + 0.15) * r}
      />

      {/* the fist bump */}
      {partner && (
        <>
          <motion.span className="absolute z-30 -translate-x-1/2 -translate-y-1/2" style={{ top: `${MEET.y - 5}%`, fontSize: size * 0.7 }} initial={{ left: `${MEET.x - gap + 3}%`, opacity: 0 }} animate={{ left: `${MEET.x - 2}%`, opacity: 1 }} transition={{ delay: (bump - 0.3) * r, duration: 0.3 * r }}>🤜</motion.span>
          <motion.span className="absolute z-30 -translate-x-1/2 -translate-y-1/2" style={{ top: `${MEET.y - 5}%`, fontSize: size * 0.7 }} initial={{ left: `${MEET.x + gap - 3}%`, opacity: 0 }} animate={{ left: `${MEET.x + 2}%`, opacity: 1 }} transition={{ delay: (bump - 0.3) * r, duration: 0.3 * r }}>🤛</motion.span>
          <motion.span
            className="absolute z-20 block rounded-full border-4" style={{ left: `${MEET.x}%`, top: `${MEET.y - 5}%`, width: size, height: size, translateX: '-50%', translateY: '-50%', borderColor: gold }}
            initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 2.6], opacity: [0.9, 0] }} transition={{ delay: bump * r, duration: 0.7 * r }}
          />
        </>
      )}

      {/* a hundred or more: the helmet comes off and the bat goes up to the sky */}
      {big && (
        <>
          <motion.span className="absolute z-30 select-none" style={{ left: `${MEET.x - gap}%`, top: `${MEET.y - 10}%`, fontSize: size * 0.55 }} aria-hidden
            initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0], x: [0, -size * 0.8, -size * 1.6], y: [0, -size * 1.0, size * 0.4], rotate: [0, -140, -300] }} transition={{ delay: (bump + 0.35) * r, duration: 1.3 * r, times: [0, 0.1, 0.7, 1] }}>⛑️</motion.span>
          <motion.span className="absolute z-30 select-none" style={{ left: `${MEET.x - gap + 4}%`, top: `${MEET.y - 14}%`, fontSize: size * 0.7 }} aria-hidden
            initial={{ opacity: 0, y: size * 0.5, rotate: 40 }} animate={{ opacity: [0, 1, 1], y: [size * 0.5, -size * 0.4, -size * 0.4], rotate: [40, -10, -10], scale: [0.8, 1.2, 1.1] }} transition={{ delay: (bump + 0.5) * r, duration: 0.9 * r }}>🏏</motion.span>
        </>
      )}

      {/* the word, and the innings behind it */}
      <motion.div
        className="absolute inset-x-0 bottom-[2%] z-40 px-3 text-center"
        initial={{ opacity: 0, scale: 2.2 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: (bump + 0.25) * r, type: 'spring', stiffness: 260, damping: 15 }}
      >
        <div className="font-display leading-none tracking-wide" style={{ color: gold, fontSize: Math.max(30, Math.min(w * 0.11, 78)), WebkitTextStroke: '2px #0b0d14', paintOrder: 'stroke fill', textShadow: `0 0 30px ${gold}99` }}>{title}</div>
        <motion.div className="mt-1 inline-block max-w-[96%] rounded-xl bg-black/70 px-3 py-1.5 ring-1" style={{ ['--tw-ring-color' as string]: `${gold}66` }} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: (bump + 0.7) * r, duration: 0.35 }}>
          <div className="text-sm font-extrabold leading-tight text-white">{batsman.name}<span className="font-semibold text-slate-300"> · {team.name}</span></div>
          {lines.map((l, i) => <div key={i} className={i === 0 ? 'text-base font-extrabold leading-tight' : 'text-[11px] leading-tight text-slate-300'} style={i === 0 ? { color: gold } : undefined}>{l}</div>)}
          {!compact && <div className="mt-0.5 flex justify-center text-[11px]"><OriginTag playerId={batsman.id} /></div>}
        </motion.div>
      </motion.div>
    </div>
  )
}
