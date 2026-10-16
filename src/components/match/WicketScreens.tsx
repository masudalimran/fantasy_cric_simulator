import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { sfx } from '../../audio/sfx'
import type { Player, Team } from '../../types'
import { PlayerAvatar, accentOf } from '../ui'
import { TvFrame, useWidth } from './ReviewScreens'

/**
 * The special wicket screens: a dismissal seen the way a broadcast would show it. Which one comes up depends on how the batsman got out
 * (the stump cam for a bowled, the rope check and hang time for a catch in the deep, the catch cam for the hands, the stumping check,
 * the slow-motion hit wicket) and on the story around it (a Nelson, a pair, a big stand broken). All of them are scenery: the result was decided long before.
 */

interface Who { batsman: Player; batTeam: Team; bowler: Player; bowlTeam: Team; rate: number }

export type WicketFxInfo =
  | (Who & { type: 'rope'; fielder: Player; height: number; hang: number; cm: number })
  | (Who & { type: 'hands'; fielder: Player; reaction: number; dive: boolean; caughtAndBowled: boolean })
  | (Who & { type: 'stumping'; keeper: Player | null; cm: number })
  | (Who & { type: 'bowled'; kmh: number; how: string; side: number })
  | (Who & { type: 'hitwicket' })
  | (Who & { type: 'nelson'; runs: number; balls: number })
  | (Who & { type: 'pair'; king: boolean })
  | (Who & { type: 'stand'; partner: Player; runs: number; balls: number })

/** How long each one runs (seconds at full speed), so the moment lasts as long as its picture. */
export const WICKET_FX_SECONDS: Record<WicketFxInfo['type'], number> = { rope: 8.4, hands: 5.6, stumping: 7.2, bowled: 6.2, hitwicket: 6, nelson: 5.2, pair: 5, stand: 5.4 }

const Banner = ({ text, color, delay, w, sub }: { text: string; color: string; delay: number; w: number; sub?: string }) => (
  <motion.div className="absolute inset-x-0 top-[12%] z-30 text-center" initial={{ opacity: 0, scale: 2.4 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay, type: 'spring', stiffness: 260, damping: 15 }}>
    <div className="inline-block rounded-xl bg-black/55 px-3 font-display leading-none tracking-wide" style={{ color, fontSize: Math.max(36, Math.min(w * 0.13, 80)), WebkitTextStroke: '2px #05070d', paintOrder: 'stroke fill', textShadow: `0 0 30px ${color}aa` }}>{text}</div>
    {sub && <div className="mt-1 text-xs font-semibold text-slate-100" style={{ textShadow: '0 1px 4px #000' }}>{sub}</div>}
  </motion.div>
)

const Chip = ({ children, delay, color = '#e2e8f0' }: { children: React.ReactNode; delay: number; color?: string }) => (
  <motion.div className="rounded-lg bg-black/75 px-2 py-1 text-center text-[11px] font-extrabold leading-tight ring-1 ring-white/15" style={{ color }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>{children}</motion.div>
)

/** A catch in the deep: how high the ball went and how long it hung, then the third umpire's close-up of the boot and the rope. */
function RopeCatch({ info, w }: { info: Extract<WicketFxInfo, { type: 'rope' }>; w: number }) {
  const { fielder, bowlTeam, height, hang, cm, rate: r } = info
  const gap = Math.min(26, 5 + cm * 0.34)
  // the arc: from the bat, up to the greatest height, down to the fielder's hands
  const arc = Array.from({ length: 13 }, (_, i) => { const t = i / 12; return { x: 10 + t * 80, y: 34 - 4 * t * (1 - t) * (12 + (height - 18) * 0.55) } })
  const path = arc.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ')
  const topY = Math.min(...arc.map((p) => p.y))
  return (
    <>
      <motion.div className="absolute inset-0" initial={{ opacity: 1 }} animate={{ opacity: [1, 1, 0] }} transition={{ duration: 3.3 * r, times: [0, 0.88, 1] }}>
        <svg viewBox="0 0 100 38" preserveAspectRatio="xMidYMid meet" className="absolute inset-x-[3%] top-[27%] h-[44%] w-[94%]" aria-hidden>
          <rect x="0" y="34" width="100" height="4" fill="#1b7a43" opacity="0.7" />
          <line x1="0" x2="100" y1="34" y2="34" stroke="#fff" strokeWidth="0.4" opacity="0.7" />
          <motion.path d={path} fill="none" stroke="#fbbf24" strokeWidth="1" strokeLinecap="round" strokeDasharray="1.6 1.2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2.4 * r, ease: 'linear' }} />
          <motion.circle r="2.2" fill="#ef4444" stroke="#fecaca" strokeWidth="0.5" initial={{ cx: arc[0].x, cy: arc[0].y }} animate={{ cx: arc.map((p) => p.x), cy: arc.map((p) => p.y) }} transition={{ duration: 2.4 * r, ease: 'linear' }} />
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 * r }}>
            <line x1="50" x2="50" y1={topY} y2="34" stroke="#38bdf8" strokeWidth="0.5" strokeDasharray="1.5 1.5" />
            <text x="52" y={topY + 5} fontSize="5" fontWeight="800" fill="#7dd3fc">{height} m</text>
          </motion.g>
        </svg>
        <div className="absolute inset-x-2 bottom-2 z-20 grid grid-cols-2 gap-1.5">
          <Chip delay={1.2 * r} color="#7dd3fc"><span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Greatest height</span>{height} m</Chip>
          <Chip delay={2.4 * r} color="#fde68a"><span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Hang time</span>{hang} s</Chip>
        </div>
        <div className="absolute inset-x-0 top-[13%] text-center font-display text-2xl leading-none tracking-wide text-amber-300" style={{ textShadow: '0 0 18px #f59e0b99' }}>HIGH AND HANDSOME</div>
      </motion.div>
      <motion.div className="absolute inset-x-[6%] top-[22%] bottom-[16%]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.4 * r }}>
        <div className="mb-1 text-center text-xs font-extrabold uppercase tracking-widest text-sky-300">Third umpire · the rope</div>
        <svg viewBox="0 0 100 34" preserveAspectRatio="xMidYMid meet" className="h-[74%] w-full" aria-hidden>
          <rect x="0" y="0" width="100" height="34" fill="#1f5e35" opacity="0.85" />
          <rect x="70" y="0" width="30" height="34" fill="#0b1b3f" />
          <line x1="70" x2="70" y1="0" y2="34" stroke="#fff" strokeWidth="1.6" />
          <text x="72" y="6" fontSize="3.4" fill="#fff" opacity="0.85">ROPE</text>
          {/* the boot comes down short of the rope */}
          <motion.g initial={{ y: -22, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 3.8 * r, duration: 1.0 * r, ease: 'easeIn' }}>
            <rect x={70 - gap - 16} y="16" width="16" height="6.5" rx="3" fill="#e2e8f0" stroke="#475569" strokeWidth="0.6" />
            <rect x={70 - gap - 16} y="21" width="16" height="2.2" rx="1" fill="#0f172a" />
          </motion.g>
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 5.0 * r }}>
            <line x1={70 - gap} x2="70" y1="27" y2="27" stroke="#34d399" strokeWidth="0.9" />
            <line x1={70 - gap} x2={70 - gap} y1="25" y2="29" stroke="#34d399" strokeWidth="0.9" />
            <line x1="70" x2="70" y1="25" y2="29" stroke="#34d399" strokeWidth="0.9" />
            <text x={70 - gap / 2} y="33" fontSize="3.4" fontWeight="800" textAnchor="middle" fill="#6ee7b7">{cm} cm inside</text>
          </motion.g>
        </svg>
        <motion.div className="mt-1 flex justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 5.0 * r }}>
          <div className="inline-flex items-center gap-2 rounded-full bg-black/70 px-3 py-1 text-xs font-bold text-slate-100"><PlayerAvatar player={fielder} team={bowlTeam} size={22} />{fielder.name}<span className="text-emerald-300">boot inside the rope</span></div>
        </motion.div>
      </motion.div>
      <Banner text="OUT!" color="#f87171" delay={6.4 * r} w={w} sub="A clean catch" />
    </>
  )
}

/** The hands: the ball arrives, the fingers close, and the fielder's reaction time. */
function Hands({ info, w }: { info: Extract<WicketFxInfo, { type: 'hands' }>; w: number }) {
  const { fielder, bowlTeam, reaction, dive, caughtAndBowled, rate: r } = info
  const label = caughtAndBowled ? 'Reflex catch off his own bowling' : dive ? 'Diving catch' : 'Safe hands'
  return (
    <>
      <div className="absolute inset-x-0 top-[13%] text-center font-display text-2xl leading-none tracking-wide text-amber-300" style={{ textShadow: '0 0 18px #f59e0b99' }}>{label.toUpperCase()}</div>
      <svg viewBox="14 6 72 44" preserveAspectRatio="xMidYMid meet" className="absolute inset-x-[8%] top-[24%] h-[52%] w-[84%]" aria-hidden>
        {/* two cupped hands, opening towards the ball, then closing */}
        <motion.g style={{ transformOrigin: '50px 40px' }} initial={{ rotate: dive ? -20 : 0, x: dive ? -16 : 0 }} animate={{ rotate: 0, x: 0 }} transition={{ delay: 0.2 * r, duration: 1.0 * r }}>
          <motion.path d="M34 42 C30 26 36 18 44 20 L47 38 Z" fill="#e8b48a" stroke="#8d5a3b" strokeWidth="0.8" initial={{ rotate: -26 }} animate={{ rotate: [-26, -26, 0] }} transition={{ duration: 2.2 * r, times: [0, 0.65, 0.8] }} style={{ transformOrigin: '47px 40px' }} />
          <motion.path d="M66 42 C70 26 64 18 56 20 L53 38 Z" fill="#f1c9a5" stroke="#8d5a3b" strokeWidth="0.8" initial={{ rotate: 26 }} animate={{ rotate: [26, 26, 0] }} transition={{ duration: 2.2 * r, times: [0, 0.65, 0.8] }} style={{ transformOrigin: '53px 40px' }} />
        </motion.g>
        <motion.circle r="5" fill="#ef4444" stroke="#fecaca" strokeWidth="0.8" initial={{ cx: 8, cy: 4, scale: 0.3 }} animate={{ cx: [8, 30, 50], cy: [4, 14, 30], scale: [0.3, 0.8, 1] }} transition={{ delay: 0.3 * r, duration: 1.5 * r, ease: 'easeIn' }} />
        <motion.circle cx="50" cy="30" r="14" fill="none" stroke="#fbbf24" strokeWidth="1" initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: [0, 1, 0], scale: [0.4, 1.4, 1.8] }} transition={{ delay: 1.8 * r, duration: 0.7 * r }} style={{ transformOrigin: '50px 30px' }} />
      </svg>
      <div className="absolute inset-x-2 bottom-2 z-20 flex items-center justify-center gap-2">
        <Chip delay={1.9 * r}><span className="flex items-center gap-1.5"><PlayerAvatar player={fielder} team={bowlTeam} size={22} />{fielder.name}</span></Chip>
        <Chip delay={2.2 * r} color="#7dd3fc"><span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Reaction</span>{reaction} ms</Chip>
      </div>
      <Banner text="OUT!" color="#f87171" delay={3.4 * r} w={w} />
    </>
  )
}

/** The third umpire's frames for a stumping: the keeper whips the bails off, the batsman's foot is in the air, and how far out of the crease he was. */
function StumpingCheck({ info, w }: { info: Extract<WicketFxInfo, { type: 'stumping' }>; w: number }) {
  const { batsman, batTeam, keeper, cm, rate: r } = info
  const gap = Math.min(24, 4 + cm * 0.5)
  const frame = (n: number, at: number, bailsOff: boolean, foot: number) => (
    <motion.div key={n} className="relative flex-1 overflow-hidden rounded-lg border border-sky-400/40 bg-[#0b2a18]" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: at * r }}>
      <div className="absolute left-1 top-1 rounded bg-black/70 px-1 text-[9px] font-extrabold uppercase tracking-wider text-sky-300">Frame {n}</div>
      <svg viewBox="0 0 40 50" className="h-full w-full" preserveAspectRatio="xMidYMid meet" aria-hidden>
        <line x1="22" x2="22" y1="6" y2="48" stroke="#fff" strokeWidth="0.7" />
        {[0, 1, 2].map((i) => <line key={i} x1={5 + i * 3.2} x2={5 + i * 3.2} y1="16" y2="34" stroke="#fef3c7" strokeWidth="1.3" strokeLinecap="round" />)}
        {!bailsOff && <><rect x="4.5" y="14.8" width="3.4" height="1.2" rx="0.5" fill="#f59e0b" /><rect x="8.7" y="14.8" width="3.4" height="1.2" rx="0.5" fill="#f59e0b" /></>}
        {bailsOff && <><rect x="6" y="9" width="3.4" height="1.2" rx="0.5" fill="#f59e0b" transform="rotate(-30 7 9)" /><rect x="11" y="6" width="3.4" height="1.2" rx="0.5" fill="#f59e0b" transform="rotate(25 12 6)" /></>}
        <rect x={22 - 4 + foot} y={foot < 0 ? 40 : 34} width="9" height="4.2" rx="2" fill="#e2e8f0" stroke="#475569" strokeWidth="0.5" />
      </svg>
    </motion.div>
  )
  return (
    <>
      <div className="absolute inset-x-0 top-[12%] z-20 text-center">
        <motion.div className="font-display text-3xl leading-none tracking-wide text-amber-300" animate={{ opacity: [1, 0.4, 1, 0.4, 1, 0] }} transition={{ duration: 4.6 * r, times: [0, 0.2, 0.4, 0.6, 0.85, 1] }}>STUMPED?</motion.div>
        <motion.div className="text-xs font-semibold text-slate-300" animate={{ opacity: [1, 1, 0] }} transition={{ duration: 4.6 * r, times: [0, 0.85, 1] }}>The keeper whips the bails off: the third umpire checks</motion.div>
      </div>
      <div className="absolute inset-x-[6%] top-[31%] bottom-[24%] flex gap-2">
        {frame(1, 0.8, false, -2)}
        {frame(2, 1.8, true, 3)}
        {frame(3, 2.8, true, gap > 14 ? -2 : 1)}
      </div>
      <motion.div className="absolute inset-x-2 bottom-[7%] z-20 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 4.0 * r }}>
        <div className="inline-flex items-center gap-2 rounded-full bg-black/70 px-3 py-1 text-xs font-bold text-slate-100"><PlayerAvatar player={batsman} team={batTeam} size={22} />{batsman.name}<span className="text-red-300">{cm} cm out of the crease{keeper ? ` · ${keeper.name} behind the stumps` : ''}</span></div>
      </motion.div>
      <Banner text="OUT!" color="#f87171" delay={5.2 * r} w={w} />
    </>
  )
}

/** The stump cam: the ball races at the lens, the stumps cartwheel in slow motion, and the speed and the manner of it. */
function BowledCam({ info, w }: { info: Extract<WicketFxInfo, { type: 'bowled' }>; w: number }) {
  const { bowler, bowlTeam, kmh, how, side, rate: r } = info
  const parts = [{ dx: -34, dr: -80 }, { dx: 6, dr: 30 }, { dx: 36, dr: 85 }]
  return (
    <>
      <motion.div className="absolute bottom-12 right-3 z-20 rounded bg-black/70 px-2 py-0.5 text-[11px] font-extrabold text-amber-300" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 * r }}>{kmh} km/h</motion.div>
      {/* the pitch coming at the lens */}
      <div className="absolute inset-x-0 bottom-0 top-[30%]" style={{ background: 'linear-gradient(180deg, #164a2c 0%, #1b7a43 60%, #123f26 100%)', clipPath: 'polygon(30% 0, 70% 0, 100% 100%, 0 100%)', opacity: 0.55 }} />
      <svg viewBox="0 0 100 60" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full" aria-hidden>
        {parts.map((p, i) => (
          <motion.g key={i} style={{ transformOrigin: `${42 + i * 8}px 40px` }} initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }} animate={{ x: [0, p.dx], y: [0, -14 - i * 3, 26], rotate: [0, p.dr], opacity: [1, 1, 0.9] }} transition={{ delay: 1.7 * r, duration: 2.6 * r, ease: 'easeOut' }}>
            <rect x={40 + i * 8} y="26" width="4" height="28" rx="2" fill="#fef3c7" stroke="#92400e" strokeWidth="0.5" />
          </motion.g>
        ))}
        <motion.g initial={{ opacity: 1, y: 0, rotate: 0 }} animate={{ y: [0, -18, 4], x: [0, -12, 20], rotate: [0, -50, 60], opacity: [1, 1, 0.9] }} transition={{ delay: 1.7 * r, duration: 2.6 * r }}>
          <rect x="39" y="24" width="12" height="2.4" rx="1" fill="#f59e0b" /><rect x="53" y="24" width="12" height="2.4" rx="1" fill="#f59e0b" />
        </motion.g>
        <motion.circle fill="#ef4444" stroke="#fecaca" strokeWidth="0.8" initial={{ cx: 50 + side, cy: 6, r: 1.2 }} animate={{ cx: [50 + side, 52, 52], cy: [6, 36, 36], r: [1.2, 6, 6], opacity: [1, 1, 0] }} transition={{ delay: 0.5 * r, duration: 1.3 * r, times: [0, 0.85, 1], ease: 'easeIn' }} />
      </svg>
      <motion.div className="pointer-events-none absolute inset-0 z-[35] bg-white" initial={{ opacity: 0 }} animate={{ opacity: [0, 0.45, 0] }} transition={{ delay: 1.7 * r, duration: 0.35 }} />
      <motion.div className="absolute bottom-12 left-3 z-20 rounded bg-amber-400 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-black" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.9 * r }}>Slow motion</motion.div>
      <motion.div className="absolute inset-x-2 bottom-2 z-20 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.6 * r }}>
        <div className="inline-flex items-center gap-2 rounded-full bg-black/70 px-3 py-1 text-xs font-bold text-slate-100"><PlayerAvatar player={bowler} team={bowlTeam} size={22} />{bowler.name}<span className="text-amber-300">{how}</span></div>
      </motion.div>
      <Banner text="BOWLED!" color="#fbbf24" delay={2.0 * r} w={w} />
    </>
  )
}

/** A hit wicket in slow motion: the bat or the pad takes the bails off. */
function HitWicketCam({ info, w }: { info: Extract<WicketFxInfo, { type: 'hitwicket' }>; w: number }) {
  const { batsman, batTeam, rate: r } = info
  return (
    <>
      <div className="absolute bottom-12 left-3 z-20 rounded bg-amber-400 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-black">Slow motion</div>
      <svg viewBox="0 0 100 60" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full" aria-hidden>
        <rect x="0" y="48" width="100" height="12" fill="#1b7a43" opacity="0.7" />
        {[0, 1, 2].map((i) => <rect key={i} x={62 + i * 6} y="22" width="3" height="26" rx="1.5" fill="#fef3c7" />)}
        <motion.g initial={{ opacity: 1, y: 0, rotate: 0 }} animate={{ y: [0, -14, 6], x: [0, 8, 22], rotate: [0, 40, 100] }} transition={{ delay: 2.4 * r, duration: 2.4 * r }} style={{ transformOrigin: '70px 21px' }}>
          <rect x="61" y="19" width="8" height="2" rx="1" fill="#f59e0b" /><rect x="71" y="19" width="8" height="2" rx="1" fill="#f59e0b" />
        </motion.g>
        {/* the bat swings back and catches the stumps */}
        <motion.g style={{ transformOrigin: '30px 34px' }} initial={{ rotate: -50 }} animate={{ rotate: [-50, -150, -150] }} transition={{ delay: 0.4 * r, duration: 2.0 * r, times: [0, 0.8, 1], ease: 'easeInOut' }}>
          <rect x="30" y="30" width="6" height="28" rx="2.5" fill="#d6b27a" stroke="#7c5f35" strokeWidth="0.6" transform="rotate(-90 30 34)" />
          <rect x="30" y="32" width="2.4" height="9" rx="1" fill="#3b2a12" transform="rotate(-90 30 34)" />
        </motion.g>
      </svg>
      <motion.div className="pointer-events-none absolute inset-0 z-[35] bg-white" initial={{ opacity: 0 }} animate={{ opacity: [0, 0.4, 0] }} transition={{ delay: 2.4 * r, duration: 0.35 }} />
      <motion.div className="absolute inset-x-2 bottom-2 z-20 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.0 * r }}>
        <div className="inline-flex items-center gap-2 rounded-full bg-black/70 px-3 py-1 text-xs font-bold text-slate-100"><PlayerAvatar player={batsman} team={batTeam} size={22} />{batsman.name}<span className="text-red-300">knocks the bails off himself</span></div>
      </motion.div>
      <Banner text="HIT WICKET!" color="#f87171" delay={3.2 * r} w={w} />
    </>
  )
}

/** Out on 99, 111, 222...: the unluckiest numbers. A figure stands on one leg. */
function Nelson({ info, w }: { info: Extract<WicketFxInfo, { type: 'nelson' }>; w: number }) {
  const { batsman, batTeam, bowler, runs, balls, rate: r } = info
  const near = runs === 99 || runs === 199 || runs === 299
  return (
    <>
      <motion.div className="absolute inset-x-0 top-[12%] text-center font-display tracking-wide text-amber-300" style={{ fontSize: Math.max(30, Math.min(w * 0.1, 64)), textShadow: '0 0 24px #f59e0bcc' }} initial={{ opacity: 0, scale: 2 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 * r, type: 'spring', stiffness: 200, damping: 14 }}>{near ? 'SO CLOSE!' : 'NELSON!'}</motion.div>
      <div className="absolute inset-x-0 top-[28%] flex items-center justify-center gap-8">
        <svg viewBox="0 0 30 50" width={Math.max(60, w * 0.16)} aria-hidden>
          <circle cx="15" cy="7" r="5" fill="#f1c9a5" /><line x1="15" x2="15" y1="12" y2="30" stroke="#e2e8f0" strokeWidth="3" strokeLinecap="round" />
          <line x1="15" x2="4" y1="17" y2="10" stroke="#e2e8f0" strokeWidth="2.4" strokeLinecap="round" /><line x1="15" x2="26" y1="17" y2="10" stroke="#e2e8f0" strokeWidth="2.4" strokeLinecap="round" />
          <motion.line x1="15" x2="15" y1="30" y2="48" stroke="#e2e8f0" strokeWidth="3" strokeLinecap="round" animate={{ rotate: [0, 0] }} />
          <motion.line x1="15" x2="24" y1="30" y2="38" stroke="#e2e8f0" strokeWidth="3" strokeLinecap="round" initial={{ opacity: 0 }} animate={{ opacity: 1, rotate: [0, -8, 8, -8, 0] }} transition={{ delay: 0.8 * r, duration: 1.2 * r, repeat: Infinity }} style={{ transformOrigin: '15px 30px' }} />
        </svg>
        <motion.div className="font-display leading-none text-white" style={{ fontSize: Math.max(70, Math.min(w * 0.3, 160)), WebkitTextStroke: '3px #05070d', paintOrder: 'stroke fill', textShadow: '0 0 34px #f59e0baa' }} initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.7 * r, type: 'spring', stiffness: 180, damping: 12 }}>{runs}</motion.div>
      </div>
      <motion.div className="absolute inset-x-2 bottom-[8%] z-20 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 * r }}>
        <div className="inline-flex items-center gap-2 rounded-full bg-black/70 px-3 py-1 text-xs font-bold text-slate-100"><PlayerAvatar player={batsman} team={batTeam} size={22} /><span className="text-left">{batsman.name} falls on {runs} off {balls}<span className="block text-slate-400">{near ? 'A hundred just out of reach' : 'The unluckiest number in cricket'} · b {bowler.name}</span></span></div>
      </motion.div>
    </>
  )
}

/** A pair (two ducks in a Test) or a king pair (two golden ducks): two eggs, and the second one cracks. */
function Pair({ info, w }: { info: Extract<WicketFxInfo, { type: 'pair' }>; w: number }) {
  const { batsman, batTeam, king, rate: r } = info
  const egg = (x: number, delay: number) => (
    <motion.g key={x} initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: delay * r, type: 'spring', stiffness: 160, damping: 11 }}>
      <ellipse cx={x} cy="34" rx="13" ry="17" fill="#fef3c7" stroke="#d6b27a" strokeWidth="1" />
      <text x={x} y="40" fontSize="16" fontWeight="900" textAnchor="middle" fill="#92400e" fontFamily="sans-serif">0</text>
    </motion.g>
  )
  return (
    <>
      <motion.div className="absolute inset-x-0 top-[12%] text-center font-display tracking-wide text-amber-300" style={{ fontSize: Math.max(34, Math.min(w * 0.12, 74)), textShadow: '0 0 24px #f59e0bcc' }} initial={{ opacity: 0, scale: 2 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 * r, type: 'spring', stiffness: 200, damping: 14 }}>{king ? 'KING PAIR!' : 'A PAIR!'}</motion.div>
      <svg viewBox="0 0 100 60" preserveAspectRatio="xMidYMid meet" className="absolute inset-x-[10%] top-[24%] h-[46%] w-[80%]" aria-hidden>
        {egg(34, 0.7)}{egg(66, 1.3)}
        <motion.path d="M60 24 L64 32 L60 38 L68 46" fill="none" stroke="#92400e" strokeWidth="1.2" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 2.2 * r, duration: 0.5 * r }} />
      </svg>
      <motion.div className="absolute inset-x-2 bottom-[8%] z-20 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.0 * r }}>
        <div className="inline-flex items-center gap-2 rounded-full bg-black/70 px-3 py-1 text-xs font-bold text-slate-100"><PlayerAvatar player={batsman} team={batTeam} size={22} />{batsman.name}<span className="text-slate-400">{king ? 'out first ball in both innings' : 'out for nought in both innings'}</span></div>
      </motion.div>
    </>
  )
}

/** A big stand ends: the bar between the two batsmen snaps. */
function StandBroken({ info, w }: { info: Extract<WicketFxInfo, { type: 'stand' }>; w: number }) {
  const { batsman, partner, batTeam, bowler, bowlTeam, runs, balls, rate: r } = info
  return (
    <>
      <motion.div className="absolute inset-x-0 top-[12%] text-center font-display tracking-wide text-sky-300" style={{ fontSize: Math.max(26, Math.min(w * 0.075, 54)), textShadow: '0 0 24px #38bdf8aa' }} initial={{ opacity: 0, scale: 2 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 * r, type: 'spring', stiffness: 200, damping: 14 }}>PARTNERSHIP BROKEN</motion.div>
      <div className="absolute inset-x-[6%] top-[34%] flex items-center justify-between">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 * r }}><PlayerAvatar player={batsman} team={batTeam} size={Math.max(48, Math.min(w * 0.16, 78))} profile /><div className="mt-1 max-w-[90px] truncate text-center text-[11px] font-bold text-slate-200">{batsman.name}</div></motion.div>
        <div className="relative mx-2 h-3 flex-1">
          <motion.div className="absolute inset-y-0 left-0 w-1/2 origin-left rounded-l-full" style={{ background: accentOf(batTeam) }} initial={{ scaleX: 0 }} animate={{ scaleX: 1, x: [0, 0, -6] }} transition={{ delay: 0.7 * r, duration: 1.2 * r, x: { delay: 3.0 * r, duration: 0.4 } }} />
          <motion.div className="absolute inset-y-0 right-0 w-1/2 origin-right rounded-r-full" style={{ background: accentOf(batTeam) }} initial={{ scaleX: 0 }} animate={{ scaleX: 1, x: [0, 0, 6] }} transition={{ delay: 0.7 * r, duration: 1.2 * r, x: { delay: 3.0 * r, duration: 0.4 } }} />
          <motion.div className="absolute inset-x-0 top-5 whitespace-nowrap text-center font-display text-xl leading-none text-white" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0.5] }} transition={{ delay: 1.0 * r, duration: 2.4 * r }}>{runs} runs · {balls} balls</motion.div>
          <motion.div className="absolute left-1/2 top-1/2 h-6 w-1 -translate-x-1/2 -translate-y-1/2 rotate-12 rounded bg-red-500" initial={{ opacity: 0, scaleY: 0 }} animate={{ opacity: 1, scaleY: 1 }} transition={{ delay: 3.0 * r, duration: 0.2 }} />
        </div>
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 * r }}><PlayerAvatar player={partner} team={batTeam} size={Math.max(48, Math.min(w * 0.16, 78))} profile /><div className="mt-1 max-w-[90px] truncate text-center text-[11px] font-bold text-slate-200">{partner.name}</div></motion.div>
      </div>
      <motion.div className="absolute inset-x-2 bottom-[8%] z-20 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.1 * r }}>
        <div className="inline-flex items-center gap-2 rounded-full bg-black/70 px-3 py-1 text-xs font-bold text-slate-100"><PlayerAvatar player={bowler} team={bowlTeam} size={22} />{bowler.name} ends it<span className="text-slate-400">· {batsman.name} goes</span></div>
      </motion.div>
    </>
  )
}

const TITLES: Record<WicketFxInfo['type'], string> = { rope: 'Catch in the deep', hands: 'Catch cam', stumping: 'Third umpire', bowled: 'Stump cam', hitwicket: 'Hit wicket', nelson: 'Nelson', pair: 'Pair', stand: 'Partnership' }

export function WicketFxScreen({ info }: { info: WicketFxInfo }) {
  const [box, w] = useWidth()
  const r = info.rate
  useEffect(() => {
    const ts: number[] = []
    if (info.type === 'rope') ts.push(window.setTimeout(() => sfx.howzat(), 100), window.setTimeout(() => sfx.thinking(), 3600 * r), window.setTimeout(() => sfx.decisionOut(), 6400 * r))
    else if (info.type === 'stumping') ts.push(window.setTimeout(() => sfx.howzat(), 100), window.setTimeout(() => sfx.thinking(), 1500 * r), window.setTimeout(() => sfx.decisionOut(), 5200 * r))
    else if (info.type === 'bowled' || info.type === 'hitwicket') ts.push(window.setTimeout(() => sfx.wicket(), (info.type === 'bowled' ? 1700 : 2400) * r))
    else if (info.type === 'hands') ts.push(window.setTimeout(() => sfx.howzat(), 1800 * r))
    else if (info.type === 'nelson' || info.type === 'pair') ts.push(window.setTimeout(() => sfx.aww(), 900 * r))
    return () => ts.forEach(clearTimeout)
  }, [info, r])
  return (
    <div ref={box} className="absolute inset-0" aria-label={TITLES[info.type]}>
      <TvFrame title={TITLES[info.type]}>
        {info.type === 'rope' && <RopeCatch info={info} w={w} />}
        {info.type === 'hands' && <Hands info={info} w={w} />}
        {info.type === 'stumping' && <StumpingCheck info={info} w={w} />}
        {info.type === 'bowled' && <BowledCam info={info} w={w} />}
        {info.type === 'hitwicket' && <HitWicketCam info={info} w={w} />}
        {info.type === 'nelson' && <Nelson info={info} w={w} />}
        {info.type === 'pair' && <Pair info={info} w={w} />}
        {info.type === 'stand' && <StandBroken info={info} w={w} />}
      </TvFrame>
    </div>
  )
}
