import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import type { Player, Team } from '../../types'
import { PlayerAvatar, accentOf } from '../ui'

function useWidth(): [React.RefObject<HTMLDivElement | null>, number] {
  const box = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(640)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [box, w]
}

/** The three stumps, which fly apart when `at` seconds have passed. */
function Stumps({ at, size }: { at: number; size: number }) {
  const parts = [{ dx: -size * 0.5, dr: -60 }, { dx: size * 0.05, dr: 20 }, { dx: size * 0.5, dr: 65 }]
  return (
    <div className="flex gap-1" aria-hidden>
      {parts.map((p, i) => (
        <motion.span key={i} className="block rounded-full bg-amber-100 shadow" style={{ width: size * 0.12, height: size * 0.5 }}
          animate={{ x: [0, p.dx], y: [0, -size * 0.4 - i * 4, size * 0.3], rotate: [0, p.dr], opacity: [1, 1, 0.5] }} transition={{ delay: at, duration: 0.8 }} />
      ))}
    </div>
  )
}

/** A wall of flame behind the bowler: a few flickering gradient tongues. */
function Flames({ w, h }: { w: number; h: number }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0" style={{ height: h }} aria-hidden>
      {Array.from({ length: 9 }, (_, i) => (
        <motion.span key={i} className="absolute bottom-0 block origin-bottom rounded-t-full"
          style={{ left: `${i * 11.5}%`, width: w * 0.14, height: h * (0.55 + (i % 3) * 0.2), background: 'linear-gradient(0deg, #f97316cc, #fbbf2477 55%, transparent)', filter: 'blur(6px)' }}
          animate={{ scaleY: [0.8, 1.15, 0.9, 1.1, 0.8], opacity: [0.7, 1, 0.75, 1, 0.7] }} transition={{ duration: 1.1 + (i % 4) * 0.2, repeat: Infinity, delay: i * 0.08 }} />
      ))}
    </div>
  )
}

export interface HatTrickInfo { bowler: Player; bowlTeam: Team; /** The three batsmen, in the order they were out. */ victims: { player: Player; team: Team }[]; rate: number }

/** Three wickets in three balls: the three batsmen go one after another, then HAT-TRICK! slams in over a blazing bowler. Click to skip. */
export function HatTrickScreen({ info }: { info: HatTrickInfo }) {
  const { bowler, bowlTeam, victims, rate: r } = info
  const [box, w] = useWidth()
  const size = Math.max(36, Math.min(w * 0.115, 66))
  const h = w * 0.625
  return (
    <div ref={box} className="absolute inset-0 overflow-hidden rounded-2xl" aria-label={`Hat-trick for ${bowler.name}`}>
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 70%, #7c2d12, #1a0a08 75%)' }} />
      <Flames w={w} h={h * 0.55} />
      <div className="absolute left-3 top-3 z-30 flex items-center gap-2 rounded-lg bg-black/70 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-widest text-orange-300"><span className="h-2 w-2 animate-pulse rounded-full bg-orange-400" />Hat-trick</div>
      <div className="absolute right-3 top-3 z-30 rounded-full bg-black/50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-300">Tap to continue</div>

      {/* the three victims, one ball at a time */}
      <div className="absolute inset-x-0 top-[14%] z-20 flex items-start justify-center gap-[6%]">
        {victims.map((v, i) => (
          <motion.div key={v.player.id} className="text-center" initial={{ opacity: 0, y: -20, scale: 0.6 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: (0.5 + i * 0.7) * r, type: 'spring', stiffness: 240, damping: 15 }}>
            <div className="mx-auto mb-1 flex justify-center"><Stumps at={(0.8 + i * 0.7) * r} size={size * 0.8} /></div>
            <div className="relative mx-auto inline-block rounded-full leading-[0] grayscale-[40%]" style={{ boxShadow: `0 0 0 3px ${accentOf(v.team)}` }}><PlayerAvatar player={v.player} team={v.team} size={size} /><span className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-red-600 text-[10px] font-extrabold leading-none text-white">{i + 1}</span></div>
            <div className="mx-auto mt-1 max-w-[110px] truncate rounded bg-black/70 px-1.5 text-[11px] font-semibold text-white">{v.player.name}</div>
          </motion.div>
        ))}
      </div>

      <motion.div className="absolute inset-x-0 bottom-[3%] z-40 px-3 text-center" initial={{ opacity: 0, scale: 2.4 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 2.3 * r, type: 'spring', stiffness: 260, damping: 15 }}>
        <div className="font-display leading-none tracking-wide" style={{ color: '#fdba74', fontSize: Math.max(34, Math.min(w * 0.12, 84)), WebkitTextStroke: '2px #431407', paintOrder: 'stroke fill', textShadow: '0 0 34px #f97316cc' }}>HAT-TRICK!</div>
        <div className="mt-1 flex items-center justify-center gap-2 text-sm font-semibold text-slate-100" style={{ textShadow: '0 1px 4px #000' }}>
          <span className="inline-block rounded-full leading-[0]" style={{ boxShadow: `0 0 0 2px ${accentOf(bowlTeam)}, 0 0 14px #f97316` }}><PlayerAvatar player={bowler} team={bowlTeam} size={30} /></span>
          <span>{bowler.name} takes three in three balls</span>
        </div>
      </motion.div>
    </div>
  )
}

export interface HaulInfo { bowler: Player; bowlTeam: Team; victims: { player: Player; team: Team }[]; figures: { wickets: number; runs: number; overs: string }; rate: number }

/** Five wickets: the batsmen fall in a row, the bowler holds the ball up, and the figures slam in. Click to skip. */
export function HaulScreen({ info }: { info: HaulInfo }) {
  const { bowler, bowlTeam, victims, figures, rate: r } = info
  const [box, w] = useWidth()
  const size = Math.max(36, Math.min(w * 0.12, 70))
  const small = Math.max(26, Math.min(w * 0.08, 42))
  return (
    <div ref={box} className="absolute inset-0 overflow-hidden rounded-2xl" aria-label={`Five wickets for ${bowler.name}`}>
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 40%, #581c87, #0b0614 75%)' }} />
      <motion.div className="pointer-events-none absolute left-1/2 top-[34%] h-[160%] w-[100%] -translate-x-1/2 -translate-y-1/2 opacity-20" style={{ background: 'repeating-conic-gradient(from 0deg, #c084fc00 0deg 12deg, #c084fccc 12deg 24deg)', borderRadius: '50%' }} animate={{ rotate: 360 }} transition={{ duration: 40, repeat: Infinity, ease: 'linear' }} />
      <div className="absolute left-3 top-3 z-30 flex items-center gap-2 rounded-lg bg-black/70 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-widest text-fuchsia-300"><span className="h-2 w-2 animate-pulse rounded-full bg-fuchsia-400" />Five-wicket haul</div>
      <div className="absolute right-3 top-3 z-30 rounded-full bg-black/50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-300">Tap to continue</div>

      {/* the bowler lifts the ball */}
      <div className="absolute left-1/2 top-[13%] z-20 -translate-x-1/2 text-center">
        <motion.span className="mx-auto mb-1 block h-5 w-5 rounded-full border-2 border-red-200 bg-red-500 shadow-[0_0_18px_#ef4444]" initial={{ y: 40, opacity: 0, scale: 0.5 }} animate={{ y: 0, opacity: 1, scale: 1.2 }} transition={{ delay: 2.0 * r, type: 'spring', stiffness: 200, damping: 12 }} />
        <motion.div className="inline-block rounded-full leading-[0]" style={{ boxShadow: `0 0 0 4px ${accentOf(bowlTeam)}, 0 0 34px #c084fc99` }} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: [1, 1, 1.12, 1], opacity: 1 }} transition={{ delay: 0.1 * r, duration: 0.5, times: [0, 0.01, 0.6, 1] }}>
          <PlayerAvatar player={bowler} team={bowlTeam} size={size} />
        </motion.div>
      </div>

      {/* five slots fill up, one batsman at a time */}
      <div className="absolute inset-x-2 top-[50%] z-20 flex items-start justify-center gap-[2.5%]">
        {victims.slice(-5).map((v, i) => (
          <motion.div key={v.player.id} className="min-w-0 text-center" initial={{ opacity: 0, y: -14, scale: 0.5 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: (0.4 + i * 0.3) * r, type: 'spring', stiffness: 260, damping: 14 }}>
            <div className="mx-auto inline-block rounded-full leading-[0] grayscale-[50%]" style={{ boxShadow: `0 0 0 2px ${accentOf(v.team)}` }}><PlayerAvatar player={v.player} team={v.team} size={small} /></div>
            <div className="mx-auto mt-0.5 max-w-[64px] truncate text-[10px] font-semibold text-slate-200">{v.player.name.split(' ')[0]}</div>
          </motion.div>
        ))}
      </div>

      <motion.div className="absolute inset-x-0 bottom-[3%] z-40 px-3 text-center" initial={{ opacity: 0, scale: 2.4 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.9 * r, type: 'spring', stiffness: 260, damping: 15 }}>
        <div className="font-display leading-none tracking-wide" style={{ color: '#e9d5ff', fontSize: Math.max(32, Math.min(w * 0.1, 76)), WebkitTextStroke: '2px #3b0764', paintOrder: 'stroke fill', textShadow: '0 0 30px #c084fcaa' }}>FIVE-FOR!</div>
        <div className="mt-1 text-base font-extrabold text-fuchsia-200" style={{ textShadow: '0 1px 4px #000' }}>{bowler.name} <span className="font-semibold text-slate-300">{figures.wickets}/{figures.runs} in {figures.overs} overs</span></div>
      </motion.div>
    </div>
  )
}
