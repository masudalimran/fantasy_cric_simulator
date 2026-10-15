import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import type { FieldSpot } from './fieldSets'
import type { Player, Team } from '../../types'
import { PlayerAvatar, accentOf } from '../ui'
import { TeamLogo } from '../season/Details'

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

const SkipTag = ({ text = 'Tap to skip' }: { text?: string }) => <div className="absolute right-3 top-3 z-30 rounded-full bg-black/50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-300">{text}</div>
const Tag = ({ text, color }: { text: string; color: string }) => <div className="absolute left-3 top-3 z-30 flex items-center gap-2 rounded-lg bg-black/70 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-widest" style={{ color }}><span className="h-2 w-2 animate-pulse rounded-full" style={{ background: color }} />{text}</div>
const Slam = ({ children, color, stroke, w, delay, max = 84 }: { children: React.ReactNode; color: string; stroke: string; w: number; delay: number; max?: number }) => (
  <motion.div className="font-display leading-none tracking-wide" style={{ color, fontSize: Math.max(30, Math.min(w * 0.12, max)), WebkitTextStroke: `2px ${stroke}`, paintOrder: 'stroke fill', textShadow: `0 0 30px ${color}99` }} initial={{ opacity: 0, scale: 2.3 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay, type: 'spring', stiffness: 260, damping: 15 }}>{children}</motion.div>
)

// ---- Tension: a hat-trick ball, or a batsman in the nineties --------------------------------------------------------------

export interface TensionInfo {
  variant: 'hattrick' | 'ninety'
  /** The bowler on two in two, or the batsman who is close. */
  player: Player; team: Team
  /** The new batsman walking in (hat-trick ball). */
  other?: Player; otherTeam?: Team
  title: string; sub: string
  rate: number
}

/** The room goes quiet: a pulsing red vignette, a heartbeat line, and one person in the middle of it. Click to skip. */
export function TensionScreen({ info }: { info: TensionInfo }) {
  const { variant, player, team, other, otherTeam, title, sub, rate: r } = info
  const [box, w] = useWidth()
  const size = Math.max(52, Math.min(w * 0.16, 92))
  const col = variant === 'hattrick' ? '#fb923c' : '#f87171'
  return (
    <div ref={box} className="absolute inset-0 overflow-hidden rounded-2xl" aria-label={title}>
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 45%, #2a0f10, #050304 80%)' }} />
      <motion.div className="pointer-events-none absolute inset-0 z-10" style={{ background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, #7f1d1dcc 100%)', boxShadow: 'inset 0 0 80px #ef4444aa' }} animate={{ opacity: [0.35, 1, 0.35, 0.9, 0.35] }} transition={{ duration: 1.5, repeat: Infinity }} />
      <Tag text={variant === 'hattrick' ? 'Hat-trick ball' : 'Nervous nineties'} color={col} />
      <SkipTag />
      <div className="absolute inset-x-0 top-[14%] z-20 flex items-center justify-center gap-6">
        <motion.div className="text-center" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 * r }}>
          <motion.div className="inline-block rounded-full leading-[0]" style={{ boxShadow: `0 0 0 4px ${accentOf(team)}` }} animate={{ scale: [1, 1.06, 1, 1.04, 1] }} transition={{ duration: 1.4, repeat: Infinity }}><PlayerAvatar player={player} team={team} size={size} /></motion.div>
          <div className="mx-auto mt-1 max-w-[130px] truncate rounded bg-black/70 px-1.5 text-[11px] font-semibold text-white">{player.name}</div>
        </motion.div>
        {other && otherTeam && (
          <motion.div className="text-center" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.7 * r }}>
            <div className="inline-block rounded-full leading-[0] grayscale-[30%]" style={{ boxShadow: `0 0 0 3px ${accentOf(otherTeam)}` }}><PlayerAvatar player={other} team={otherTeam} size={size * 0.8} /></div>
            <div className="mx-auto mt-1 max-w-[110px] truncate rounded bg-black/70 px-1.5 text-[11px] font-semibold text-white">{other.name}</div>
            <div className="mx-auto mt-0.5 w-fit rounded bg-red-600 px-1.5 text-[10px] font-extrabold uppercase tracking-wider text-white">Next in</div>
          </motion.div>
        )}
      </div>
      {/* the heartbeat */}
      <svg viewBox="0 0 200 40" preserveAspectRatio="none" className="absolute inset-x-0 bottom-[30%] z-20 h-[14%] w-full opacity-80" aria-hidden>
        <motion.polyline points="0,20 40,20 50,20 56,4 64,36 72,12 78,20 120,20 130,20 136,4 144,36 152,12 158,20 200,20" fill="none" stroke={col} strokeWidth="1.6" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: [0, 1, 1], opacity: [1, 1, 0.3] }} transition={{ duration: 2.4, repeat: Infinity }} />
      </svg>
      <div className="absolute inset-x-0 bottom-[4%] z-40 px-3 text-center">
        <Slam color={col} stroke="#1c0a0a" w={w} delay={0.9 * r} max={76}>{title}</Slam>
        <div className="mt-1 text-sm font-semibold text-slate-100" style={{ textShadow: '0 1px 4px #000' }}>{sub}</div>
      </div>
    </div>
  )
}

// ---- Target reveal --------------------------------------------------------------------------------------------------------------

export interface TargetInfo { chasing: Team; defending: Team; target: number; balls: number; format: string; rate: number }

/** The start of a chase: the target counts up on a scoreboard, with what it asks of the chasing side. Click to skip. */
export function TargetScreen({ info }: { info: TargetInfo }) {
  const { chasing, defending, target, balls, rate: r } = info
  const [box, w] = useWidth()
  const [n, setN] = useState(0)
  useEffect(() => {
    const t0 = Date.now()
    const dur = 1100 * r
    const id = window.setInterval(() => { const k = Math.min(1, (Date.now() - t0) / dur); setN(Math.round(target * (1 - (1 - k) ** 3))); if (k >= 1) window.clearInterval(id) }, 30)
    return () => window.clearInterval(id)
  }, [target, r])
  const rr = ((target / balls) * 6).toFixed(2)
  const accent = accentOf(chasing)
  return (
    <div ref={box} className="absolute inset-0 overflow-hidden rounded-2xl" aria-label={`Target ${target}`}>
      <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 50% 40%, ${accent}55, #07090f 72%)` }} />
      <Tag text="The chase" color="#fbbf24" />
      <SkipTag />
      <div className="absolute inset-x-0 top-[12%] z-20 flex items-center justify-center gap-3 text-center">
        <TeamLogo team={defending} size={Math.max(36, Math.min(w * 0.1, 60))} />
        <span className="font-display text-2xl text-slate-300">SET</span>
        <TeamLogo team={chasing} size={Math.max(44, Math.min(w * 0.13, 76))} />
      </div>
      <div className="absolute inset-x-0 top-[33%] z-20 text-center">
        <div className="text-xs font-extrabold uppercase tracking-[0.3em] text-slate-300">Target</div>
        <div className="font-display leading-none tabular-nums text-white" style={{ fontSize: Math.max(56, Math.min(w * 0.26, 150)), textShadow: `0 0 40px ${accent}` }}>{n}</div>
      </div>
      <motion.div className="absolute inset-x-0 bottom-[6%] z-20 px-3 text-center" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 * r }}>
        <div className="text-base font-extrabold text-amber-300">{chasing.name} need {target} off {balls} balls</div>
        <div className="text-sm text-slate-200">That is {rr} an over, from the first ball</div>
      </motion.div>
    </div>
  )
}

// ---- Super over -----------------------------------------------------------------------------------------------------------------

export interface SuperOverInfo { winner: Team; loser: Team; winnerRuns: number; loserRuns: number; loserWickets: number; rate: number }

/** A tied knockout: TIED!, then six balls a side, then who goes through. Click to skip. */
export function SuperOverScreen({ info }: { info: SuperOverInfo }) {
  const { winner, loser, winnerRuns, loserRuns, loserWickets, rate: r } = info
  const [box, w] = useWidth()
  const row = (team: Team, runs: number, wkts: number, delay: number) => (
    <motion.div className="flex items-center gap-2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: delay * r }}>
      <TeamLogo team={team} size={32} />
      <div className="flex gap-1">
        {Array.from({ length: 6 }, (_, i) => (
          <motion.span key={i} className="grid h-6 w-6 place-items-center rounded-full border text-[11px] font-extrabold" style={{ borderColor: accentOf(team), color: '#fff', background: `${accentOf(team)}33` }} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: (delay + 0.3 + i * 0.25) * r }}>{i < 5 ? '•' : ''}</motion.span>
        ))}
      </div>
      <motion.span className="ml-1 font-display text-3xl leading-none tabular-nums text-white" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: (delay + 1.9) * r }}>{runs}/{wkts}</motion.span>
    </motion.div>
  )
  return (
    <div ref={box} className="absolute inset-0 overflow-hidden rounded-2xl" aria-label="Super over">
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 40%, #3b0764, #07040d 78%)' }} />
      <Tag text="Super over" color="#e879f9" />
      <SkipTag />
      <motion.div className="absolute inset-x-0 top-[12%] z-30 text-center" initial={{ opacity: 0, scale: 2 }} animate={{ opacity: [0, 1, 1, 0.4], scale: [2, 1, 1, 0.8] }} transition={{ duration: 1.6 * r, times: [0, 0.3, 0.8, 1] }}>
        <Slam color="#e9d5ff" stroke="#3b0764" w={w} delay={0}>MATCH TIED!</Slam>
      </motion.div>
      <div className="absolute inset-x-0 top-[30%] z-20 flex flex-col items-center gap-2">
        {row(loser, loserRuns, loserWickets, 1.6)}
        {row(winner, winnerRuns, 0, 4.2)}
      </div>
      <motion.div className="absolute inset-x-0 bottom-[5%] z-40 px-3 text-center" initial={{ opacity: 0, scale: 2.2 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 7.2 * r, type: 'spring', stiffness: 260, damping: 15 }}>
        <div className="font-display leading-none tracking-wide text-white" style={{ fontSize: Math.max(26, Math.min(w * 0.085, 60)), textShadow: '0 0 28px #e879f9aa' }}>{winner.name}</div>
        <div className="text-sm font-bold text-fuchsia-200">win the super over and go through</div>
      </motion.div>
    </div>
  )
}

// ---- Momentum swing -------------------------------------------------------------------------------------------------------------

export interface SwingInfo { chasing: Team; defending: Team; before: number; after: number; rate: number }

/** The win-chance bar swinging from one side to the other. Click to skip. */
export function SwingScreen({ info }: { info: SwingInfo }) {
  const { chasing, defending, before, after, rate: r } = info
  const [box, w] = useWidth()
  const up = after > before
  const lead = after >= 0.5 ? chasing : defending
  const pct = Math.round((after >= 0.5 ? after : 1 - after) * 100)
  const [c1, c2] = [accentOf(chasing), accentOf(defending)]
  return (
    <div ref={box} className="absolute inset-0 overflow-hidden rounded-2xl" aria-label="Momentum shift">
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 45%, #10243a, #05080e 80%)' }} />
      <Tag text="Momentum shift" color="#38bdf8" />
      <SkipTag />
      <div className="absolute inset-x-[7%] top-[26%] z-20">
        <div className="mb-1 flex items-center justify-between text-xs font-bold text-white"><span className="flex items-center gap-1.5"><TeamLogo team={chasing} size={22} />{chasing.short} <span className="text-slate-400">chasing</span></span><span className="flex items-center gap-1.5"><span className="text-slate-400">defending</span>{defending.short}<TeamLogo team={defending} size={22} /></span></div>
        <div className="relative h-7 overflow-hidden rounded-full bg-black/60 ring-1 ring-white/20">
          <motion.div className="absolute inset-y-0 left-0" style={{ background: `linear-gradient(90deg, ${c1}, ${c1}aa)` }} initial={{ width: `${before * 100}%` }} animate={{ width: `${after * 100}%` }} transition={{ delay: 0.8 * r, duration: 1.2 * r, ease: 'easeInOut' }} />
          <div className="absolute inset-y-0 right-0 w-1/2" style={{ background: `linear-gradient(270deg, ${c2}33, transparent)` }} />
          <div className="absolute inset-y-0 left-1/2 w-px bg-white/60" />
        </div>
        <div className="mt-1 flex justify-between font-display text-2xl leading-none tabular-nums text-white"><span>{Math.round(after * 100)}%</span><span>{Math.round((1 - after) * 100)}%</span></div>
      </div>
      <div className="absolute inset-x-0 bottom-[6%] z-40 px-3 text-center">
        <Slam color={up ? '#38bdf8' : '#fbbf24'} stroke="#04111c" w={w} delay={2.1 * r} max={70}>{up ? `${chasing.short} SURGE!` : `${defending.short} FIGHT BACK!`}</Slam>
        <motion.div className="mt-1 text-sm font-semibold text-slate-100" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.4 * r }}>{lead.name} are now {pct}% to win</motion.div>
      </div>
    </div>
  )
}

// ---- A record broken ------------------------------------------------------------------------------------------------------------

export interface RecordInfo { category: string; value: string; previous?: string; player: Player; team: Team; rate: number }

/** A season record: gold flash, the portrait and what the old mark was. Click to skip. */
export function RecordScreen({ info }: { info: RecordInfo }) {
  const { category, value, previous, player, team, rate: r } = info
  const [box, w] = useWidth()
  return (
    <div ref={box} className="absolute inset-0 overflow-hidden rounded-2xl" aria-label={`Record: ${category}`}>
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 40%, #78350f, #0b0703 78%)' }} />
      <motion.div className="pointer-events-none absolute left-1/2 top-[38%] h-[160%] w-[100%] -translate-x-1/2 -translate-y-1/2 opacity-25" style={{ background: 'repeating-conic-gradient(from 0deg, #fbbf2400 0deg 12deg, #fbbf24cc 12deg 24deg)', borderRadius: '50%' }} animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: 'linear' }} />
      <Tag text="New record" color="#fbbf24" />
      <SkipTag />
      <div className="absolute inset-x-0 top-[13%] z-20 text-center">
        <motion.div className="inline-block rounded-full leading-[0]" style={{ boxShadow: `0 0 0 4px ${accentOf(team)}, 0 0 30px #fbbf24aa` }} initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.2 * r, type: 'spring', stiffness: 200, damping: 12 }}><PlayerAvatar player={player} team={team} size={Math.max(52, Math.min(w * 0.15, 90))} /></motion.div>
        <div className="mt-1 text-sm font-bold text-white">{player.name} <span className="font-semibold text-slate-300">· {team.short}</span></div>
      </div>
      <div className="absolute inset-x-0 bottom-[4%] z-40 px-3 text-center">
        <Slam color="#fde68a" stroke="#451a03" w={w} delay={0.9 * r} max={80}>RECORD!</Slam>
        <motion.div className="mt-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 * r }}>
          <div className="text-base font-extrabold text-amber-300">{category}: {value}</div>
          {previous && <div className="text-[11px] text-slate-300">{previous}</div>}
        </motion.div>
      </div>
    </div>
  )
}

// ---- The field resets for a new phase of the game -------------------------------------------------------------------------------

export interface PhaseInfo {
  variant: 'powerplay' | 'death'
  /** Where the fielders stood, and where they go (field units, 160 x 100). */
  from: FieldSpot[]; to: FieldSpot[]
  bowlTeam: Team; batTeam: Team
  overs: number; runs: number; wickets: number
  rate: number
}

/** The field being reset: a top-down ground with the fielders walking to their new places. Click to skip. */
export function PhaseScreen({ info }: { info: PhaseInfo }) {
  const { variant, from, to, bowlTeam, batTeam, overs, runs, wickets, rate: r } = info
  const [box, w] = useWidth()
  const title = variant === 'powerplay' ? 'POWERPLAY OVER' : 'DEATH OVERS'
  const sub = variant === 'powerplay' ? `${batTeam.short} are ${runs}/${wickets} after ${overs} overs: the ring goes back` : `${batTeam.short} ${runs}/${wickets} after ${overs} overs: everyone to the rope`
  return (
    <div ref={box} className="absolute inset-0 overflow-hidden rounded-2xl" aria-label={title}>
      <div className="absolute inset-0 bg-[#070b14]" />
      <svg viewBox="0 0 160 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
        <ellipse cx="80" cy="50" rx="66" ry="40" fill="#1b7a43" />
        <ellipse cx="80" cy="50" rx="66" ry="40" fill="none" stroke="#fff" strokeWidth="1" opacity="0.9" />
        <ellipse cx="80" cy="50" rx="36" ry="22" fill="none" stroke="#fff" strokeWidth="0.4" strokeDasharray="1.6 1.4" opacity="0.5" />
        <rect x="77.2" y="30" width="5.6" height="40" rx="0.8" fill="#cdb078" opacity="0.9" />
        {to.map((t, i) => {
          const f = from[i] ?? t
          return (
            <motion.circle key={i} r="3" fill={accentOf(bowlTeam)} stroke="#fff" strokeWidth="0.6" initial={{ cx: f.x, cy: f.y }} animate={{ cx: t.x, cy: t.y }} transition={{ delay: 0.6 * r, duration: 1.8 * r, ease: 'easeInOut' }} />
          )
        })}
      </svg>
      <Tag text="The field changes" color="#7dd3fc" />
      <SkipTag />
      <div className="absolute inset-x-0 bottom-[4%] z-40 px-3 text-center">
        <Slam color="#7dd3fc" stroke="#06202f" w={w} delay={0.3 * r} max={66}>{title}</Slam>
        <motion.div className="mt-1 text-sm font-semibold text-slate-100" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 * r }} style={{ textShadow: '0 1px 4px #000' }}>{sub}</motion.div>
      </div>
    </div>
  )
}
