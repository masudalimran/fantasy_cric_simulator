import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { sfx } from '../../audio/sfx'
import type { Team } from '../../types'
import { TeamLogo } from '../season/Details'

export interface CheerInfo { team: Team; /** What got them going: a boundary for the batting side, a wicket for the fielding side. */ why: 'boundary' | 'wicket'; rate: number }

const SKIN = ['#f5d0b0', '#e8b48a', '#c98f66', '#8d5a3b', '#f1c9a5']
const HAIR = ['#3b2a1d', '#f2c94c', '#d94f3d', '#1f1f2e', '#7a4a2a']

// the arms and legs are drawn as paths that change shape (same commands, so they blend smoothly), which keeps the dance simple and exact
const ARM_L = ['M14 25 L5 7', 'M14 25 L3 26', 'M14 25 L5 7', 'M14 25 L10 40', 'M14 25 L5 7']
const ARM_R = ['M26 25 L35 7', 'M26 25 L37 26', 'M26 25 L37 40', 'M26 25 L30 40', 'M26 25 L35 7']
const POM_L = [[5, 7], [3, 26], [5, 7], [10, 40], [5, 7]]
const POM_R = [[35, 7], [37, 26], [37, 40], [30, 40], [35, 7]]
const LEG_L = ['M17 49 L17 69', 'M17 49 L10 62', 'M17 49 L17 69', 'M17 49 L17 69', 'M17 49 L17 69']
const LEG_R = ['M23 49 L23 69', 'M23 49 L23 69', 'M23 49 L30 62', 'M23 49 L23 69', 'M23 49 L23 69']

/** One 2D dancer: a top and skirt in the team's colours, pom-poms, a ponytail, arms and legs that move to the beat. */
function Dancer({ team, i, size, delay }: { team: Team; i: number; size: number; delay: number }) {
  const [top, skirt] = [team.colors.primary, team.colors.secondary]
  const skin = SKIN[i % SKIN.length]
  const hair = HAIR[i % HAIR.length]
  const beat = 0.55
  const times = [0, 0.25, 0.5, 0.75, 1]
  const loop = { duration: beat * 4, repeat: Infinity, times, ease: 'easeInOut' as const, delay }
  return (
    <motion.svg viewBox="0 0 40 74" width={size} height={size * 1.85} aria-hidden animate={{ y: [0, -6, 0, -6, 0] }} transition={{ duration: beat * 2, repeat: Infinity, ease: 'easeOut', delay }}>
      {/* ponytail, behind the head */}
      <motion.path d="M20 9 C30 8 33 18 28 24" stroke={hair} strokeWidth="3.2" fill="none" strokeLinecap="round" animate={{ d: ['M20 9 C30 8 33 18 28 24', 'M20 9 C31 10 29 20 31 25', 'M20 9 C30 8 33 18 28 24'] }} transition={{ duration: beat * 2, repeat: Infinity, delay }} />
      {/* legs */}
      <motion.path stroke={skin} strokeWidth="3" strokeLinecap="round" fill="none" animate={{ d: LEG_L }} transition={loop} d={LEG_L[0]} />
      <motion.path stroke={skin} strokeWidth="3" strokeLinecap="round" fill="none" animate={{ d: LEG_R }} transition={loop} d={LEG_R[0]} />
      {/* shoes */}
      <circle cx="17" cy="70" r="2.2" fill="#fff" /><circle cx="23" cy="70" r="2.2" fill="#fff" />
      {/* skirt */}
      <motion.path d="M15 37 L25 37 L31 50 L9 50 Z" fill={skirt} stroke="#00000033" strokeWidth="0.4" animate={{ d: ['M15 37 L25 37 L31 50 L9 50 Z', 'M15 37 L25 37 L33 49 L7 49 Z', 'M15 37 L25 37 L31 50 L9 50 Z'] }} transition={{ duration: beat * 2, repeat: Infinity, delay }} />
      {/* top */}
      <path d="M14 23 L26 23 L25 37 L15 37 Z" fill={top} stroke="#00000033" strokeWidth="0.4" />
      {/* arms and pom-poms */}
      <motion.path stroke={skin} strokeWidth="2.6" strokeLinecap="round" fill="none" animate={{ d: ARM_L }} transition={loop} d={ARM_L[0]} />
      <motion.path stroke={skin} strokeWidth="2.6" strokeLinecap="round" fill="none" animate={{ d: ARM_R }} transition={loop} d={ARM_R[0]} />
      <motion.circle r="4.2" fill={skirt} stroke="#fff" strokeWidth="0.8" strokeDasharray="1 1" animate={{ cx: POM_L.map((p) => p[0]), cy: POM_L.map((p) => p[1]) }} transition={loop} cx={POM_L[0][0]} cy={POM_L[0][1]} />
      <motion.circle r="4.2" fill={top} stroke="#fff" strokeWidth="0.8" strokeDasharray="1 1" animate={{ cx: POM_R.map((p) => p[0]), cy: POM_R.map((p) => p[1]) }} transition={loop} cx={POM_R[0][0]} cy={POM_R[0][1]} />
      {/* head and hair */}
      <circle cx="20" cy="14" r="6.2" fill={skin} />
      <path d="M13.8 13 C14 6 26 6 26.2 13 C23 10 17 10 13.8 13 Z" fill={hair} />
      <circle cx="17.8" cy="14.5" r="0.8" fill="#222" /><circle cx="22.2" cy="14.5" r="0.8" fill="#222" />
      <path d="M17.8 17.4 Q20 19.2 22.2 17.4" stroke="#b4443c" strokeWidth="0.9" fill="none" strokeLinecap="round" />
    </motion.svg>
  )
}

/** The cheerleaders pop up: a row of dancers in the team's colours with pom-poms, over a stage with the team's name. Click to skip. */
export function CheerScreen({ info }: { info: CheerInfo }) {
  const { team, why, rate: r } = info
  const box = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(640)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  useEffect(() => { sfx.cheer(0.6) }, [])
  const size = Math.max(40, Math.min(w * 0.14, 84))
  const [a, b] = [team.colors.primary, team.colors.secondary]
  return (
    <div ref={box} className="absolute inset-0 overflow-hidden rounded-2xl" aria-label={`${team.name} cheerleaders`}>
      <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 50% 30%, ${a}aa, #0a0c14 75%)` }} />
      {/* spotlights */}
      {[-1, 1].map((d) => (
        <motion.div key={d} className="pointer-events-none absolute -top-[10%] h-[120%] w-[34%] origin-top opacity-30" style={{ left: d < 0 ? '4%' : '62%', background: `linear-gradient(180deg, ${b}, transparent 85%)`, clipPath: 'polygon(40% 0, 60% 0, 100% 100%, 0 100%)' }} animate={{ rotate: [d * 14, d * -14, d * 14] }} transition={{ duration: 2.2 * r, repeat: Infinity, ease: 'easeInOut' }} />
      ))}
      {/* sparkles */}
      {Array.from({ length: w < 520 ? 6 : 12 }, (_, i) => (
        <motion.span key={i} className="pointer-events-none absolute select-none text-sm" style={{ left: `${(i * 37 + 8) % 92}%`, top: `${(i * 23 + 6) % 50}%`, color: i % 2 ? a : b }} animate={{ opacity: [0, 1, 0], scale: [0.5, 1.3, 0.5] }} transition={{ duration: 1.2 * r, repeat: Infinity, delay: (i % 6) * 0.2 }} aria-hidden>✦</motion.span>
      ))}
      <div className="absolute left-3 top-3 z-30 flex items-center gap-2 rounded-lg bg-black/70 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-widest text-pink-300"><span className="h-2 w-2 animate-pulse rounded-full bg-pink-400" />Cheerleaders</div>
      <div className="absolute right-3 top-3 z-30 rounded-full bg-black/50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-300">Tap to skip</div>
      <motion.div className="absolute inset-x-0 top-[14%] z-20 flex items-center justify-center gap-3 text-center" initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 * r, type: 'spring', stiffness: 220, damping: 12 }}>
        <TeamLogo team={team} size={Math.max(34, Math.min(w * 0.1, 60))} />
        <div className="font-display leading-none tracking-wide text-white" style={{ fontSize: Math.max(30, Math.min(w * 0.12, 80)), WebkitTextStroke: '2px #0a0c14', paintOrder: 'stroke fill', textShadow: `0 0 28px ${b}` }}>GO {team.short.toUpperCase()}!</div>
      </motion.div>
      <div className="absolute inset-x-0 bottom-[9%] z-10 flex items-end justify-center gap-[2%]">
        {Array.from({ length: w < 520 ? 3 : 5 }, (_, i) => <Dancer key={i} team={team} i={i} size={size} delay={(i % 2) * 0.12} />)}
      </div>
      <div className="absolute inset-x-0 bottom-0 z-0 h-[16%]" style={{ background: `linear-gradient(180deg, transparent, ${a}55)` }} />
      <div className="absolute inset-x-0 bottom-[1%] z-20 text-center text-[11px] font-semibold text-slate-200" style={{ textShadow: '0 1px 3px #000' }}>{why === 'boundary' ? 'The crowd goes wild for a boundary' : 'The crowd erupts for the wicket'}</div>
    </div>
  )
}
