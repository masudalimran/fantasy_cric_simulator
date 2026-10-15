import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import type { Track } from '../../season/moments'
import type { Player, Team } from '../../types'
import { PlayerAvatar } from '../ui'

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

/** The look of a stadium's big screen: dark bezel, a broadcast tag and a LIVE bug. */
function TvFrame({ title, children, skip = 'Tap to skip' }: { title: string; children: React.ReactNode; skip?: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(160deg,#0b1020,#05070d)' }}>
      <div className="absolute inset-1.5 overflow-hidden rounded-xl border border-sky-400/30" style={{ background: 'radial-gradient(ellipse at 50% 40%, #0f2a45, #060b14 80%)', boxShadow: 'inset 0 0 40px #000' }}>
        {children}
        {/* scan lines */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.08]" style={{ background: 'repeating-linear-gradient(0deg, #fff 0 1px, transparent 1px 3px)' }} />
      </div>
      <div className="absolute left-3 top-3 z-30 flex items-center gap-2 rounded bg-sky-500 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-widest text-white"><span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />{title}</div>
      <div className="absolute right-3 top-3 z-30 rounded-full bg-black/60 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-300">{skip}</div>
    </div>
  )
}

// ---- Ball tracking -------------------------------------------------------------------------------------------------

/** Where a point across the pitch (-1 leg to 1 off) at a height down the pitch (y, 92 near to 14 far) lands on the picture. */
const halfWidth = (y: number) => 14 + ((y - 14) / 78) * 24
const sx = (x: number, y: number) => 50 + x * halfWidth(y) * 1.5

/**
 * The broadcast ball-tracking picture: the pitch from behind the bowler, the ball's path to where it pitched, where it hit the pad,
 * and where it was going to hit the stumps. Three chips say what it found. `out`: the stumps are shown hit (red) or missed.
 */
export function BallTrackView({ track, out, rate = 1, compact = false }: { track: Track; out: boolean; rate?: number; /** Smaller, with the three findings in a column at the side (for the wicket replay, which has a card on top and a word underneath). */ compact?: boolean }) {
  const r = rate
  const P = { x: sx(track.pitchX, 58), y: 58 }
  const I = { x: sx(track.impactX, 32), y: 32 }
  const S = { x: sx(track.stumpsX, 16), y: 16 }
  const release = { x: 50 + (track.pitchX > 0 ? 6 : -6), y: 94 }
  const hit = track.wickets.startsWith('Hitting')
  const col = (v: string) => (v === 'In line' || v === 'Hitting' ? '#34d399' : v.includes("umpire's call") ? '#fb923c' : '#f87171')
  return (
    <div className="absolute inset-0">
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className={compact ? 'absolute bottom-[24%] left-[30%] right-[4%] top-[22%] h-[54%] w-[66%]' : 'absolute inset-0 h-full w-full'}>
        <polygon points={`${50 - halfWidth(92)},92 ${50 + halfWidth(92)},92 ${50 + halfWidth(14)},14 ${50 - halfWidth(14)},14`} fill="#7c5f35" opacity="0.75" />
        <polygon points={`${50 - halfWidth(92) * 1.5},92 ${50 + halfWidth(92) * 1.5},92 ${50 + halfWidth(14) * 1.5},14 ${50 - halfWidth(14) * 1.5},14`} fill="none" stroke="#fff" strokeWidth="0.3" opacity="0.25" />
        {[26, 62].map((y) => <line key={y} x1={50 - halfWidth(y)} x2={50 + halfWidth(y)} y1={y} y2={y} stroke="#fff" strokeWidth="0.35" opacity="0.7" />)}
        {/* the stumps and the zone around them */}
        <rect x={sx(-0.18, 14)} y={8} width={sx(0.18, 14) - sx(-0.18, 14)} height={9} fill={hit ? '#ef444455' : '#ffffff18'} stroke={hit ? '#ef4444' : '#fff'} strokeWidth="0.3" />
        {[-0.12, 0, 0.12].map((x) => <line key={x} x1={sx(x, 14)} x2={sx(x, 14)} y1={8} y2={16} stroke="#fef3c7" strokeWidth="0.7" strokeLinecap="round" />)}
        {/* the path: release to pitching, pitching to impact (a different colour: after the bounce), impact to the stumps (projected) */}
        <motion.polyline points={`${release.x},${release.y} ${P.x},${P.y}`} fill="none" stroke="#fbbf24" strokeWidth="1" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9 * r }} />
        <motion.polyline points={`${P.x},${P.y} ${I.x},${I.y}`} fill="none" stroke="#fb923c" strokeWidth="1" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.9 * r, duration: 0.7 * r }} />
        <motion.polyline points={`${I.x},${I.y} ${S.x},${S.y}`} fill="none" stroke={hit ? '#ef4444' : '#94a3b8'} strokeWidth="0.9" strokeDasharray="1.4 1.1" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 1.8 * r, duration: 0.7 * r }} />
        <motion.circle cx={P.x} cy={P.y} r="2" fill={col(track.pitching)} stroke="#fff" strokeWidth="0.4" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.9 * r, type: 'spring' }} style={{ transformOrigin: `${P.x}px ${P.y}px` }} />
        <motion.circle cx={I.x} cy={I.y} r="2" fill={col(track.impact)} stroke="#fff" strokeWidth="0.4" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.6 * r, type: 'spring' }} style={{ transformOrigin: `${I.x}px ${I.y}px` }} />
        <motion.circle cx={S.x} cy={S.y} r="1.6" fill={col(track.wickets)} stroke="#fff" strokeWidth="0.4" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 2.5 * r, type: 'spring' }} style={{ transformOrigin: `${S.x}px ${S.y}px` }} />
      </svg>
      {(
        <div className={compact ? 'absolute left-2 top-[24%] z-20 flex w-[26%] flex-col gap-1 text-center' : 'absolute inset-x-2 bottom-2 z-20 grid grid-cols-3 gap-1.5 text-center'}>
          {([['Pitching', track.pitching, 0.9], ['Impact', track.impact, 1.6], ['Wickets', track.wickets, 2.5]] as const).map(([label, value, at]) => (
            <motion.div key={label} className="rounded-lg bg-black/75 px-1 py-1 ring-1 ring-white/15" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: at * r }}>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
              <div className="text-[11px] font-extrabold leading-tight" style={{ color: col(value) }}>{value}</div>
            </motion.div>
          ))}
        </div>
      )}
      <span className="sr-only">{out ? 'Out' : 'Not out'}</span>
    </div>
  )
}

// ---- The sound graph for a caught behind ----------------------------------------------------------------------------------------

/** The broadcast's edge-detection picture: a sound wave along the bottom, flat, then a spike as the ball passes the bat. */
export function SnickoView({ rate = 1 }: { rate?: number }) {
  const r = rate
  const pts: string[] = []
  for (let i = 0; i <= 100; i++) {
    const x = i * 2
    const spike = i >= 58 && i <= 64 ? (i % 2 ? -1 : 1) * (26 - Math.abs(i - 61) * 6) : 0
    pts.push(`${x},${50 + Math.sin(i * 12.9898) * 2 + spike}`)
  }
  return (
    <div className="absolute inset-0">
      <svg viewBox="0 0 200 100" preserveAspectRatio="none" className="absolute inset-x-[4%] top-[28%] h-[40%] w-[92%]" aria-hidden>
        <line x1="0" x2="200" y1="50" y2="50" stroke="#ffffff22" strokeWidth="0.5" />
        <line x1="122" x2="122" y1="0" y2="100" stroke="#fbbf24" strokeWidth="0.8" strokeDasharray="3 2" />
        <text x="124" y="8" fontSize="7" fill="#fbbf24" fontWeight="700">BALL PASSES BAT</text>
        <motion.polyline points={pts.join(' ')} fill="none" stroke="#34d399" strokeWidth="1.4" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2.2 * r, ease: 'linear' }} />
      </svg>
      <div className="absolute inset-x-2 bottom-2 z-20 grid grid-cols-3 gap-1.5 text-center">
        {([['Sound', 'Spike', 1.4], ['Bat', 'Ball passes', 1.4], ['Verdict', 'Edge', 2.3]] as const).map(([label, value, at]) => (
          <motion.div key={label} className="rounded-lg bg-black/75 px-1 py-1 ring-1 ring-white/15" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: at * r }}>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
            <div className="text-[11px] font-extrabold leading-tight" style={{ color: '#34d399' }}>{value}</div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ---- A review: the T signal, then ball tracking -------------------------------------------------------------------

export interface ReviewInfo {
  /** Who asked: the batsman (an lbw he was given out to) or the fielding side (a not-out they want overturned). */
  by: 'bat' | 'field'
  batsman: Player; batTeam: Team; bowler: Player; bowlTeam: Team
  /** The decision on the field stands: out or not out. */
  out: boolean
  track: Track
  /** 'edge' is a caught behind checked with the sound graph instead of ball tracking. */
  kind?: 'track' | 'edge'
  rate: number
}

/** A side asks for a review: the T signal, "checking", then the picture and the verdict. The decision never changes (it is what the match already decided). */
export function ReviewScreen({ info }: { info: ReviewInfo }) {
  const { by, batsman, batTeam, bowler, bowlTeam, out, track, rate: r } = info
  const [box, w] = useWidth()
  const asker = by === 'bat' ? batsman : bowler
  const askTeam = by === 'bat' ? batTeam : bowlTeam
  const verdict = out ? 'OUT' : 'NOT OUT'
  const sub = info.kind === 'edge' ? 'A clear spike: the decision stands' : out ? (track.umpiresCall ? "Umpire's call: the decision stands" : 'The decision stands') : (track.wickets === 'Missing' ? 'Missing the stumps: the decision stands' : "Umpire's call: the decision stands")
  return (
    <div ref={box} className="absolute inset-0" aria-label="Review">
      <TvFrame title="Decision review">
        {/* the T signal */}
        <motion.div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2" initial={{ opacity: 1 }} animate={{ opacity: [1, 1, 0] }} transition={{ duration: 2.4 * r, times: [0, 0.8, 1] }}>
          <motion.div className="grid place-items-center rounded-full border-4 border-amber-300 bg-black/50 font-display text-amber-300" style={{ width: Math.max(70, w * 0.2), height: Math.max(70, w * 0.2), fontSize: Math.max(48, w * 0.14) }} initial={{ scale: 0 }} animate={{ scale: [0, 1.2, 1] }} transition={{ type: 'spring', stiffness: 220, damping: 12 }}>T</motion.div>
          <div className="font-display text-4xl leading-none tracking-wide text-white">REVIEW!</div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-100"><PlayerAvatar player={asker} team={askTeam} size={28} />{asker.name} asks for a review</div>
        </motion.div>
        {/* ball tracking and the verdict */}
        <motion.div className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.3 * r }}>
          {info.kind === 'edge' ? <SnickoView rate={r} /> : <BallTrackView track={track} out={out} rate={r} />}
        </motion.div>
        <motion.div className="absolute inset-x-0 top-[10%] z-30 text-center" initial={{ opacity: 0, scale: 2.2 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: (2.3 + 3.3) * r, type: 'spring', stiffness: 260, damping: 15 }}>
          <div className="font-display leading-none tracking-wide" style={{ color: out ? '#f87171' : '#34d399', fontSize: Math.max(36, Math.min(w * 0.13, 84)), WebkitTextStroke: '2px #05070d', paintOrder: 'stroke fill', textShadow: `0 0 30px ${out ? '#ef4444' : '#10b981'}aa` }}>{verdict}</div>
          <div className="text-xs font-semibold text-slate-100" style={{ textShadow: '0 1px 4px #000' }}>{sub}</div>
        </motion.div>
      </TvFrame>
    </div>
  )
}

// ---- A run out sent to the third umpire ----------------------------------------------------------------------------

export interface RunOutInfo { batsman: Player; batTeam: Team; fielder: Player | null; bowlTeam: Team; cm: number; text: string; rate: number }

/** The stadium screen for a run out: the third umpire checks the frames, a close-up shows the bat short of the line and by how much, then OUT. */
export function RunOutReview({ info }: { info: RunOutInfo }) {
  const { batsman, batTeam, cm, text, rate: r } = info
  const [box, w] = useWidth()
  const gap = Math.min(30, 4 + cm * 0.38) // the gap drawn between the bat and the line, in picture units
  return (
    <div ref={box} className="absolute inset-0" aria-label="Run out decision">
      <TvFrame title="Third umpire">
        <div className="absolute inset-x-0 top-[12%] z-20 text-center">
          <motion.div className="font-display text-3xl leading-none tracking-wide text-amber-300" animate={{ opacity: [1, 0.4, 1, 0.4, 1, 0] }} transition={{ duration: 4.1 * r, times: [0, 0.2, 0.4, 0.6, 0.85, 1] }}>RUN OUT?</motion.div>
          <motion.div className="text-xs font-semibold text-slate-300" animate={{ opacity: [1, 1, 0] }} transition={{ duration: 4.1 * r, times: [0, 0.85, 1] }}>The decision goes upstairs</motion.div>
        </div>

        {/* the close-up: the crease, the bat and the gap */}
        <motion.div className="absolute inset-x-[8%] top-[30%] bottom-[30%]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 * r }}>
          <svg viewBox="0 0 100 40" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
            <rect x="0" y="0" width="100" height="40" fill="#1f5e35" opacity="0.8" />
            <rect x="0" y="0" width="100" height="40" fill="#c9a864" opacity="0.35" />
            <line x1="20" x2="20" y1="0" y2="40" stroke="#fff" strokeWidth="1.2" />
            <text x="22" y="5" fontSize="3.4" fill="#fff" opacity="0.8">POPPING CREASE</text>
            {/* the stumps */}
            {[0, 1, 2].map((i) => <line key={i} x1="8" x2="8" y1={15 + i * 5} y2={17 + i * 5} stroke="#fef3c7" strokeWidth="1.4" strokeLinecap="round" />)}
            {/* the bat, short of the line */}
            <motion.g initial={{ x: 30 }} animate={{ x: 0 }} transition={{ delay: 1.6 * r, duration: 1.2 * r, ease: 'easeOut' }}>
              <rect x={20 + gap} y="22" width="26" height="4.5" rx="1.5" fill="#d6b27a" stroke="#7c5f35" strokeWidth="0.5" />
              <rect x={20 + gap + 26} y="23.3" width="9" height="1.9" rx="0.9" fill="#3b2a12" />
            </motion.g>
            {/* the measurement */}
            <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.0 * r }}>
              <line x1="20" x2={20 + gap} y1="31" y2="31" stroke="#f87171" strokeWidth="1" />
              <line x1="20" x2="20" y1="28.5" y2="33.5" stroke="#f87171" strokeWidth="1" />
              <line x1={20 + gap} x2={20 + gap} y1="28.5" y2="33.5" stroke="#f87171" strokeWidth="1" />
              <text x={20 + gap / 2} y="38" fontSize="4.2" fontWeight="800" textAnchor="middle" fill="#fca5a5">{cm} cm</text>
            </motion.g>
          </svg>
        </motion.div>
        <motion.div className="absolute inset-x-2 bottom-[5%] z-20 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.1 * r }}>
          <div className="inline-flex items-center gap-2 rounded-full bg-black/70 px-3 py-1 text-xs font-bold text-slate-100">
            <PlayerAvatar player={batsman} team={batTeam} size={22} />{batsman.name}<span className="text-red-300">{text}</span>
          </div>
        </motion.div>
        <motion.div className="absolute inset-x-0 top-[10%] z-30 text-center" initial={{ opacity: 0, scale: 2.4 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 4.2 * r, type: 'spring', stiffness: 260, damping: 15 }}>
          <div className="rounded-xl bg-black/60 py-1 font-display leading-none tracking-wide" style={{ color: '#f87171', fontSize: Math.max(40, Math.min(w * 0.15, 90)), WebkitTextStroke: '2px #05070d', paintOrder: 'stroke fill', textShadow: '0 0 30px #ef4444aa' }}>OUT!</div>
        </motion.div>
      </TvFrame>
    </div>
  )
}
