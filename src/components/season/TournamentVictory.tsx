import confetti from 'canvas-confetti'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { sfx } from '../../audio/sfx'
import type { Player, Team } from '../../types'
import { Trophy } from '../match/WinCelebration'
import { PlayerAvatar, accentOf } from '../ui'
import { TeamLogo } from './Details'

/** Everything the celebration needs: who won what, who they beat, how they got there, and who is in the squad. */
export interface TournamentVictoryInfo {
  team: Team
  runnerUp: Team | null
  tournament: string
  /** The final's result in words. */
  resultText: string
  played: number
  won: number
  /** The captain first, then the rest of the XI. */
  players: Player[]
  /** Which of the VARIANTS to play (a tournament always gets the same one, different tournaments differ). */
  variant: number
}

export const VARIANT_NAMES = ['Golden Gala', 'Fireworks Night', 'Lap of Honour', 'The Podium', 'Power Up', 'Royal Coronation', 'Medal Rain', 'Victory Parade'] as const
export const VARIANTS = VARIANT_NAMES.length

/** A tournament's variant, from its id: always the same one for the same tournament. */
export function variantOf(competitionId: string): number {
  let h = 2166136261
  for (let i = 0; i < competitionId.length; i++) { h ^= competitionId.charCodeAt(i); h = Math.imul(h, 16777619) }
  return (h >>> 0) % VARIANTS
}

/** How long each stage lasts (seconds): the final whistle, the ceremony, the team, and then the summary stays until you continue. */
export const STAGES = [3.4, 7.2, 5.4] as const

const THEMES = [
  { bg: 'radial-gradient(ellipse at 50% 30%, #78350f, #0d0904 75%)', accent: '#fbbf24' },
  { bg: 'linear-gradient(180deg, #02030a, #0b1224 70%, #131c33)', accent: '#7dd3fc' },
  { bg: 'radial-gradient(ellipse at 50% 55%, #14532d, #04120a 80%)', accent: '#86efac' },
  { bg: 'radial-gradient(ellipse at 50% 25%, #1e3a8a, #050a1c 78%)', accent: '#93c5fd' },
  { bg: 'radial-gradient(ellipse at 50% 50%, #581c87, #0a0414 78%)', accent: '#e879f9' },
  { bg: 'radial-gradient(ellipse at 50% 35%, #7f1d1d, #120606 78%)', accent: '#fca5a5' },
  { bg: 'radial-gradient(ellipse at 50% 20%, #134e4a, #03100f 78%)', accent: '#5eead4' },
  { bg: 'linear-gradient(180deg, #f97316, #fb923c 28%, #1e293b 29%, #0b1220)', accent: '#fed7aa' },
]

const burst = (colors: string[], x = 0.5, y = 0.4, n = 140) => confetti({ particleCount: n, spread: 100, startVelocity: 38, origin: { x, y }, colors, disableForReducedMotion: true, zIndex: 95 })

// ---- Stage 1: the final whistle -------------------------------------------------------------------------------------------------

function Whistle({ info, accent }: { info: TournamentVictoryInfo; accent: string }) {
  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="absolute inset-0" style={{ background: '#fff' }} initial={{ opacity: 0.9 }} animate={{ opacity: 0 }} transition={{ duration: 0.7 }} />
      <motion.span className="text-7xl" aria-hidden initial={{ scale: 0.2, rotate: -40 }} animate={{ scale: [0.2, 1.3, 1], rotate: [-40, 10, 0] }} transition={{ duration: 0.7 }}>📣</motion.span>
      <motion.div className="mt-2 font-display leading-none tracking-wide text-white" style={{ fontSize: 'clamp(44px, 15vw, 88px)', WebkitTextStroke: '2px #05070d', paintOrder: 'stroke fill', textShadow: `0 0 40px ${accent}` }} initial={{ scale: 3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.5, type: 'spring', stiffness: 220, damping: 14 }}>IT IS OVER!</motion.div>
      <motion.div className="mt-3 text-lg font-semibold text-slate-100" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }}>{info.team.name} have won the {info.tournament}</motion.div>
      <motion.div className="mt-1 text-sm text-slate-300" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.9 }}>{info.resultText}</motion.div>
    </motion.div>
  )
}

// ---- Stage 2: the ceremony, a different one for each variant ---------------------------------------------------------------------

const Title = ({ children, delay = 0, color = '#fff', size = 'clamp(34px, 11vw, 70px)' }: { children: React.ReactNode; delay?: number; color?: string; size?: string }) => (
  <motion.div className="font-display leading-none tracking-wide" style={{ color, fontSize: size, WebkitTextStroke: '2px #05070d', paintOrder: 'stroke fill', textShadow: `0 0 34px ${color}88` }} initial={{ opacity: 0, scale: 2.4 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay, type: 'spring', stiffness: 230, damping: 14 }}>{children}</motion.div>
)

function Gala({ info }: { info: TournamentVictoryInfo }) {
  useEffect(() => {
    const t = [window.setTimeout(() => burst(['#fde68a', '#f59e0b', '#fff', accentOf(info.team)], 0.5, 0.45, 180), 1800), window.setTimeout(() => burst(['#fde68a', '#fff'], 0.2, 0.6, 90), 3200), window.setTimeout(() => burst(['#fde68a', '#fff'], 0.8, 0.6, 90), 3800)]
    return () => t.forEach(clearTimeout)
  }, [info.team])
  return (
    <motion.div className="absolute inset-0 overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="absolute left-1/2 top-0 h-[85%] w-[70%] -translate-x-1/2 opacity-40" style={{ background: 'linear-gradient(180deg, #fde68a, transparent)', clipPath: 'polygon(40% 0,60% 0,100% 100%,0 100%)' }} animate={{ opacity: [0.1, 0.5, 0.35] }} transition={{ duration: 2 }} />
      <motion.div className="absolute inset-y-0 left-0 z-30 w-1/2 bg-gradient-to-r from-red-900 to-red-700" initial={{ x: 0 }} animate={{ x: '-100%' }} transition={{ delay: 0.5, duration: 1.4, ease: 'easeInOut' }} />
      <motion.div className="absolute inset-y-0 right-0 z-30 w-1/2 bg-gradient-to-l from-red-900 to-red-700" initial={{ x: 0 }} animate={{ x: '100%' }} transition={{ delay: 0.5, duration: 1.4, ease: 'easeInOut' }} />
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-end pb-[18%] text-center">
        <motion.div initial={{ y: 320, scale: 0.6 }} animate={{ y: 0, scale: 1 }} transition={{ delay: 1.6, duration: 1.6, type: 'spring', stiffness: 70, damping: 12 }} style={{ filter: 'drop-shadow(0 0 40px #fbbf24)' }}><Trophy size={170} /></motion.div>
        <div className="mt-3"><Title delay={3} color="#fde68a">{info.tournament.toUpperCase()}</Title></div>
        <motion.div className="mt-1 text-sm font-semibold text-amber-100" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.6 }}>Presented to {info.team.name}</motion.div>
      </div>
    </motion.div>
  )
}

function Fireworks({ info }: { info: TournamentVictoryInfo }) {
  const cols = [info.team.colors.primary, '#fde68a', info.team.colors.secondary, '#fff', '#7dd3fc', '#f472b6']
  const bursts = [[20, 28], [72, 20], [46, 36], [84, 42], [12, 48], [58, 18], [34, 22], [66, 40]]
  useEffect(() => { sfx.pops(8); const t = window.setTimeout(() => sfx.pops(8), 2800); return () => window.clearTimeout(t) }, [])
  return (
    <motion.div className="absolute inset-0 overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {bursts.map(([x, y], i) => (
        <div key={i} className="absolute" style={{ left: `${x}%`, top: `${y}%` }}>
          {Array.from({ length: 16 }, (_, k) => {
            const a = (k / 16) * Math.PI * 2
            return <motion.span key={k} className="absolute block h-2 w-2 rounded-full" style={{ background: cols[i % cols.length], boxShadow: `0 0 10px ${cols[i % cols.length]}` }} initial={{ x: 0, y: 0, opacity: 0 }} animate={{ x: Math.cos(a) * 90, y: Math.sin(a) * 90 + 24, opacity: [0, 1, 0] }} transition={{ delay: 0.3 + i * 0.7, duration: 1.5, ease: 'easeOut' }} />
          })}
        </div>
      ))}
      {[18, 50, 82].map((x, i) => <motion.div key={x} className="absolute bottom-0 h-[110%] w-8 origin-bottom opacity-30" style={{ left: `${x}%`, background: 'linear-gradient(0deg,#fff,transparent)', clipPath: 'polygon(40% 100%,60% 100%,100% 0,0 0)' }} animate={{ rotate: [i % 2 ? 18 : -18, i % 2 ? -18 : 18] }} transition={{ duration: 2.6, repeat: Infinity, repeatType: 'reverse' }} />)}
      <div className="absolute inset-x-0 bottom-[14%] flex flex-col items-center text-center">
        <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 1, type: 'spring', stiffness: 150, damping: 12 }}><Trophy size={110} /></motion.div>
        <div className="mt-2 flex">{'CHAMPIONS'.split('').map((ch, i) => <motion.span key={i} className="font-display text-5xl leading-none text-white" style={{ textShadow: '0 0 26px #7dd3fc', WebkitTextStroke: '2px #02030a', paintOrder: 'stroke fill' }} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.8 + i * 0.12 }}>{ch}</motion.span>)}</div>
        <motion.div className="mt-1 text-sm font-semibold text-sky-100" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.4 }}>{info.team.name} light up the night</motion.div>
      </div>
    </motion.div>
  )
}

function Lap({ info }: { info: TournamentVictoryInfo }) {
  const lap = info.players.slice(0, 8)
  const pts = (phase: number) => Array.from({ length: 40 }, (_, i) => { const a = ((i / 39) * 0.9 + phase) * Math.PI * 2 + Math.PI / 2; return { x: Math.cos(a) * 130, y: Math.sin(a) * 78 } })
  return (
    <motion.div className="absolute inset-0 overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute left-1/2 top-1/2 h-[62%] w-[92%] -translate-x-1/2 -translate-y-[44%] rounded-[50%] border-4 border-white/80" style={{ background: 'repeating-linear-gradient(90deg,#166534 0 18px,#15803d 18px 36px)' }} />
      <div className="absolute left-1/2 top-1/2 h-[48%] w-[72%] -translate-x-1/2 -translate-y-[44%] rounded-[50%] border border-white/30" />
      {Array.from({ length: 28 }, (_, i) => { const a = (i / 28) * Math.PI * 2; return <motion.span key={i} className="absolute block h-2.5 w-2.5 rounded-full" style={{ left: `${50 + Math.cos(a) * 49}%`, top: `${46 + Math.sin(a) * 38}%`, background: i % 2 ? info.team.colors.primary : info.team.colors.secondary }} animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: (i % 6) * 0.08 }} /> })}
      <div className="absolute left-1/2 top-[46%]">
        {lap.map((p, i) => { const q = pts(-i * 0.045); return (
          <motion.div key={p.id} className="absolute -translate-x-1/2 -translate-y-1/2" initial={{ x: q[0].x, y: q[0].y, opacity: 0 }} animate={{ x: q.map((z) => z.x), y: q.map((z) => z.y), opacity: 1 }} transition={{ delay: 0.4, duration: 6.4, ease: 'linear', opacity: { delay: 0.2 + i * 0.1 } }}>
            <span className="block rounded-full leading-[0]" style={{ boxShadow: `0 0 0 3px ${accentOf(info.team)}` }}><PlayerAvatar player={p} team={info.team} size={i === 0 ? 50 : 38} /></span>
            {i === 0 && <span className="absolute -right-3 -top-4 text-2xl" aria-hidden>🏆</span>}
          </motion.div>
        ) })}
      </div>
      <div className="absolute inset-x-0 top-[7%] z-10 text-center"><Title delay={0.3} color="#bbf7d0">LAP OF HONOUR</Title></div>
      <div className="absolute inset-x-0 bottom-[8%] z-10 text-center text-sm font-semibold text-emerald-50">{info.team.name} thank the {info.team.short} faithful</div>
    </motion.div>
  )
}

function Podium({ info }: { info: TournamentVictoryInfo }) {
  const step = (h: number, label: string, color: string, delay: number, children: React.ReactNode) => (
    <motion.div className="flex flex-col items-center justify-end" initial={{ y: 200, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay, type: 'spring', stiffness: 110, damping: 14 }}>
      <div className="mb-1 flex flex-col items-center">{children}</div>
      <div className="grid w-24 place-items-center rounded-t-xl font-display text-4xl text-black" style={{ height: h, background: color }}>{label}</div>
    </motion.div>
  )
  return (
    <motion.div className="absolute inset-0 overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-x-0 top-[8%] text-center"><Title delay={0.2} color="#bfdbfe">THE PODIUM</Title></div>
      <div className="absolute inset-x-2 bottom-[10%] flex items-end justify-center gap-1.5">
        {step(96, '2', '#cbd5e1', 0.6, info.runnerUp ? <><TeamLogo team={info.runnerUp} size={54} /><span className="text-[11px] font-bold text-slate-200">{info.runnerUp.short}</span></> : null)}
        {step(150, '1', '#fbbf24', 1.6, <><motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 1.2, repeat: Infinity }}><Trophy size={84} /></motion.div><TeamLogo team={info.team} size={72} /><span className="text-xs font-extrabold text-amber-200">{info.team.short}</span></>)}
        {step(64, '3', '#d6a56a', 1.0, <><span className="text-4xl" aria-hidden>🥉</span><span className="text-[11px] font-bold text-slate-300">Semi-finalists</span></>)}
      </div>
      <motion.div className="absolute inset-x-0 top-[22%] text-center text-sm font-semibold text-sky-100" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.8 }}>{info.tournament}: the final podium</motion.div>
    </motion.div>
  )
}

function Aura({ info }: { info: TournamentVictoryInfo }) {
  const cap = info.players[0]
  useEffect(() => { const t = window.setTimeout(() => sfx.cheer(1.2), 1200); return () => window.clearTimeout(t) }, [])
  return (
    <motion.div className="absolute inset-0 overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="absolute left-1/2 top-1/2 h-[220vmax] w-[220vmax] -translate-x-1/2 -translate-y-1/2 opacity-25" style={{ background: 'repeating-conic-gradient(from 0deg, #e879f900 0deg 6deg, #e879f9cc 6deg 9deg)' }} animate={{ rotate: 360 }} transition={{ duration: 18, repeat: Infinity, ease: 'linear' }} />
      <div className="absolute left-1/2 top-[22%] -translate-x-1/2 select-none font-display text-[40vw] leading-none text-white/10" aria-hidden>勝</div>
      {[0, 1, 2, 3].map((i) => <motion.span key={i} className="absolute left-1/2 top-[44%] block rounded-full border-4" style={{ borderColor: i % 2 ? '#e879f9' : '#fbbf24', width: 120, height: 120, translateX: '-50%', translateY: '-50%' }} initial={{ scale: 0.3, opacity: 0.9 }} animate={{ scale: 4.5, opacity: 0 }} transition={{ delay: 0.3 + i * 0.7, duration: 2.2, repeat: Infinity }} />)}
      <motion.div className="absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2" initial={{ scale: 0 }} animate={{ scale: 1, x: [0, -4, 4, -3, 3, 0] }} transition={{ delay: 0.5, scale: { type: 'spring', stiffness: 160, damping: 11 }, x: { delay: 1.2, duration: 0.5, repeat: 6 } }}>
        <span className="block rounded-full leading-[0]" style={{ boxShadow: '0 0 0 5px #fbbf24, 0 0 60px 20px #e879f9aa' }}>{cap && <PlayerAvatar player={cap} team={info.team} size={140} />}</span>
      </motion.div>
      <motion.svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0, 1, 0] }} transition={{ delay: 1.1, duration: 1.4 }}>
        <polyline points="20,0 28,24 20,26 32,52" fill="none" stroke="#fde68a" strokeWidth="1.2" /><polyline points="80,0 70,28 78,30 66,58" fill="none" stroke="#fde68a" strokeWidth="1.2" />
      </motion.svg>
      <div className="absolute inset-x-0 bottom-[12%] text-center"><Title delay={1.6} color="#f0abfc" size="clamp(44px, 15vw, 86px)">VICTORY!</Title><motion.div className="mt-1 text-sm font-semibold text-fuchsia-100" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.6 }}>The final form of {info.team.name}</motion.div></div>
    </motion.div>
  )
}

function Crown({ info }: { info: TournamentVictoryInfo }) {
  const cap = info.players[0]
  return (
    <motion.div className="absolute inset-0 overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-x-[22%] bottom-0 h-[70%] bg-gradient-to-t from-red-700 to-red-900" style={{ clipPath: 'polygon(30% 0,70% 0,100% 100%,0 100%)' }} />
      {Array.from({ length: 16 }, (_, i) => <motion.span key={i} className="absolute select-none text-xl" style={{ left: `${(i * 37) % 96}%`, top: -20 }} initial={{ y: -20, opacity: 0 }} animate={{ y: 700, rotate: 360, opacity: [0, 1, 1, 0] }} transition={{ delay: (i % 8) * 0.35, duration: 4 + (i % 4), repeat: Infinity, ease: 'linear' }} aria-hidden>🌸</motion.span>)}
      <div className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 text-center">
        <motion.span className="absolute -top-14 left-1/2 -translate-x-1/2 text-7xl" initial={{ y: -300, opacity: 0, rotate: -20 }} animate={{ y: 0, opacity: 1, rotate: 0 }} transition={{ delay: 1.6, type: 'spring', stiffness: 100, damping: 10 }} aria-hidden>👑</motion.span>
        <motion.span className="block rounded-full leading-[0]" style={{ boxShadow: '0 0 0 5px #fbbf24, 0 0 50px #fbbf24aa' }} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4, type: 'spring', stiffness: 140, damping: 12 }}>{cap && <PlayerAvatar player={cap} team={info.team} size={130} />}</motion.span>
        {cap && <motion.div className="mt-2 font-display text-2xl tracking-wide text-amber-200" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>{cap.name}</motion.div>}
      </div>
      <motion.div className="absolute inset-x-0 top-[9%] text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}><Title delay={2.4} color="#fecaca" size="clamp(26px, 8vw, 50px)">LONG LIVE THE CHAMPIONS</Title></motion.div>
      <motion.div className="absolute inset-x-0 bottom-[8%] text-center text-sm font-semibold text-rose-100" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3 }}>{info.team.name} are crowned {info.tournament} champions</motion.div>
    </motion.div>
  )
}

function Medals({ info }: { info: TournamentVictoryInfo }) {
  return (
    <motion.div className="absolute inset-0 overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {Array.from({ length: 26 }, (_, i) => <motion.span key={i} className="absolute select-none text-3xl" style={{ left: `${(i * 41) % 94}%`, top: -30 }} initial={{ y: -40 }} animate={{ y: 760, rotate: [0, 40, -40, 20] }} transition={{ delay: (i % 10) * 0.28, duration: 3.6 + (i % 5) * 0.3, ease: 'easeIn' }} aria-hidden>{i % 3 ? '🥇' : '🏅'}</motion.span>)}
      <div className="absolute inset-x-0 top-[10%] text-center"><Title delay={0.3} color="#99f6e4">GOLD FOR {info.team.short.toUpperCase()}!</Title></div>
      <div className="absolute inset-x-3 bottom-[12%] flex flex-wrap justify-center gap-2.5">
        {info.players.slice(0, 8).map((p, i) => (
          <motion.div key={p.id} className="text-center" initial={{ y: 60, opacity: 0, scale: 0.5 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ delay: 1.8 + i * 0.3, type: 'spring', stiffness: 200, damping: 13 }}>
            <span className="block rounded-full leading-[0]" style={{ boxShadow: `0 0 0 3px ${accentOf(info.team)}` }}><PlayerAvatar player={p} team={info.team} size={50} /></span>
            <motion.span className="-mt-2 block text-2xl" initial={{ scale: 0 }} animate={{ scale: [0, 1.5, 1] }} transition={{ delay: 2.1 + i * 0.3 }} aria-hidden>🥇</motion.span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

function Parade({ info }: { info: TournamentVictoryInfo }) {
  const riders = info.players.slice(0, 4)
  return (
    <motion.div className="absolute inset-0 overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-x-0 top-[6%] text-center"><Title delay={0.2} color="#fff7ed" size="clamp(30px, 10vw, 62px)">VICTORY PARADE</Title></div>
      <motion.div className="absolute inset-x-0 bottom-[26%] flex items-end gap-1" initial={{ x: 0 }} animate={{ x: -60 }} transition={{ duration: 7, ease: 'linear' }}>
        {Array.from({ length: 22 }, (_, i) => <span key={i} className="block shrink-0 rounded-t-sm bg-slate-900/80" style={{ width: 30 + (i % 4) * 8, height: 60 + ((i * 37) % 90) }} />)}
      </motion.div>
      <div className="absolute inset-x-0 bottom-0 h-[26%] bg-slate-800" />
      <div className="absolute inset-x-0 bottom-[12%] h-1 bg-amber-200/60" />
      <motion.div className="absolute bottom-[13%]" initial={{ left: '-70%' }} animate={{ left: '22%' }} transition={{ duration: 3.4, ease: 'easeOut' }}>
        <div className="relative">
          <div className="absolute -top-[52px] left-3 flex gap-2">
            {riders.map((p, i) => <motion.span key={p.id} className="block rounded-full leading-[0]" style={{ boxShadow: `0 0 0 2px ${accentOf(info.team)}` }} animate={{ y: [0, -9, 0] }} transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.12 }}><PlayerAvatar player={p} team={info.team} size={40} /></motion.span>)}
            <motion.span className="text-3xl" aria-hidden animate={{ rotate: [-10, 10, -10] }} transition={{ duration: 0.6, repeat: Infinity }}>🏆</motion.span>
          </div>
          <div className="h-12 w-60 rounded-xl" style={{ background: `linear-gradient(180deg, ${info.team.colors.primary}, ${info.team.colors.secondary})` }}>
            <div className="flex gap-2 p-2">{[0, 1, 2, 3, 4].map((i) => <span key={i} className="h-5 w-8 rounded bg-sky-100/80" />)}</div>
          </div>
          <div className="absolute -bottom-3 left-6 h-7 w-7 rounded-full bg-black ring-4 ring-slate-500" /><div className="absolute -bottom-3 right-6 h-7 w-7 rounded-full bg-black ring-4 ring-slate-500" />
        </div>
      </motion.div>
      {Array.from({ length: 20 }, (_, i) => <motion.span key={i} className="absolute block h-2 w-3" style={{ left: `${(i * 53) % 100}%`, top: -10, background: ['#fbbf24', '#fff', info.team.colors.primary, info.team.colors.secondary][i % 4] }} animate={{ y: 700, rotate: 540 }} transition={{ delay: (i % 7) * 0.4, duration: 3.4, repeat: Infinity, ease: 'linear' }} />)}
    </motion.div>
  )
}

const CEREMONIES = [Gala, Fireworks, Lap, Podium, Aura, Crown, Medals, Parade]

// ---- Stage 3: the team --------------------------------------------------------------------------------------------------------

function TeamStage({ info, accent }: { info: TournamentVictoryInfo; accent: string }) {
  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="font-display text-4xl leading-none tracking-wide" style={{ color: accent, textShadow: `0 0 30px ${accent}88` }} initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>THE CHAMPIONS</motion.div>
      <div className="mt-4 grid max-w-md grid-cols-4 gap-x-2 gap-y-3">
        {info.players.slice(0, 11).map((p, i) => (
          <motion.div key={p.id} className="text-center" initial={{ y: 40, opacity: 0, scale: 0.5 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ delay: 0.2 + i * 0.22, type: 'spring', stiffness: 220, damping: 13 }}>
            <motion.span className="mx-auto block w-fit rounded-full leading-[0]" style={{ boxShadow: `0 0 0 3px ${accentOf(info.team)}` }} animate={{ y: [0, -7, 0] }} transition={{ duration: 0.7, repeat: Infinity, delay: (i % 4) * 0.1 }}><PlayerAvatar player={p} team={info.team} size={52} /></motion.span>
            <div className="mt-1 truncate text-[11px] font-bold text-white">{p.name.split(' ')[0]}</div>
          </motion.div>
        ))}
      </div>
      <motion.div className="mt-4 text-sm text-slate-200" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.6 }}>{info.won} wins from {info.played} matches on the road to the trophy</motion.div>
    </motion.div>
  )
}

// ---- The whole celebration ----------------------------------------------------------------------------------------------------

/**
 * A tournament win gets its own long celebration, not just the usual win screen: the final whistle, a ceremony (one of eight, a
 * tournament always gets the same one), the whole team, then a summary that stays until you continue. Tap to skip ahead a stage.
 */
export function TournamentVictory({ info, onDone }: { info: TournamentVictoryInfo; onDone: () => void }) {
  const [stage, setStage] = useState(0)
  const v = ((info.variant % VARIANTS) + VARIANTS) % VARIANTS
  const theme = THEMES[v]
  useEffect(() => {
    sfx.win()
    const t = window.setTimeout(() => burst([accentOf(info.team), '#fbbf24', '#fff'], 0.5, 0.35, 120), 1600)
    return () => window.clearTimeout(t)
  }, [info.team])
  useEffect(() => {
    if (stage >= STAGES.length) return
    const t = window.setTimeout(() => setStage((s) => s + 1), STAGES[stage] * 1000)
    return () => window.clearTimeout(t)
  }, [stage])
  useEffect(() => {
    if (stage === 2) sfx.applause(4)
    if (stage === 3) { sfx.cheer(1.2); burst([accentOf(info.team), '#fbbf24', '#fff'], 0.2, 0.6); window.setTimeout(() => burst([accentOf(info.team), '#fbbf24', '#fff'], 0.8, 0.6), 250) }
  }, [stage, info.team])
  const Ceremony = CEREMONIES[v]
  return (
    <motion.div className="fixed inset-0 z-[90] overflow-hidden" style={{ background: theme.bg }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-label={`${info.tournament} champions`} onClick={() => setStage((s) => Math.min(STAGES.length, s + 1))}>
      <div className="absolute left-3 top-3 z-50 flex max-w-[58%] items-center gap-2 truncate rounded-lg bg-black/60 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-widest" style={{ color: theme.accent, marginTop: 'var(--sat)' }}><span className="h-2 w-2 animate-pulse rounded-full" style={{ background: theme.accent }} />{info.tournament} · {VARIANT_NAMES[v]}</div>
      {stage < STAGES.length && <div className="absolute right-3 top-3 z-50 rounded-full bg-black/50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-300" style={{ marginTop: 'var(--sat)' }}>Tap to skip ahead</div>}
      <AnimatePresence mode="wait">
        {stage === 0 && <Whistle key="w" info={info} accent={theme.accent} />}
        {stage === 1 && <div key="c" className="absolute inset-0"><Ceremony info={info} /></div>}
        {stage === 2 && <TeamStage key="t" info={info} accent={theme.accent} />}
        {stage >= 3 && (
          <motion.div key="f" className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={(e) => e.stopPropagation()}>
            <motion.div initial={{ scale: 0.3, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 150, damping: 11 }} style={{ filter: `drop-shadow(0 0 40px ${theme.accent})` }}><Trophy size={140} /></motion.div>
            <motion.div className="mt-3 flex items-center gap-3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}><TeamLogo team={info.team} size={64} /><div className="text-left"><div className="font-display text-4xl leading-none tracking-wide text-white">{info.team.name}</div><div className="text-sm text-slate-300">{info.team.series}</div></div></motion.div>
            <motion.div className="mt-4 rounded-full bg-gradient-to-b from-amber-300 to-amber-500 px-7 py-1.5 font-display text-2xl tracking-[0.2em] text-black shadow-xl" initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.6, type: 'spring', stiffness: 220, damping: 14 }}>{info.tournament.toUpperCase()} CHAMPIONS</motion.div>
            <motion.div className="mt-3 max-w-sm text-sm text-slate-200" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}>
              <div className="font-semibold text-white">{info.resultText}</div>
              {info.runnerUp && <div className="mt-0.5">Beat {info.runnerUp.name} in the final</div>}
              <div className="mt-0.5 text-slate-400">{info.won} wins from {info.played} matches</div>
            </motion.div>
            <motion.button className="mt-7 rounded-full border-2 border-amber-200 bg-gradient-to-b from-amber-300 to-amber-500 px-10 py-3 font-display text-2xl leading-none tracking-wide text-black active:brightness-95" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }} onClick={onDone}>Continue</motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
