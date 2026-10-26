import { wideDirection } from '../../engine/wide'
import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import type { Player, Team } from '../../types'
import { PlayerAvatar, accentOf } from '../ui'

/** Measures the width of the screen so type and portraits can scale to it. */
function useWidth() {
  const box = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(640)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return { box, w }
}

const SkipTag = () => <div className="absolute right-3 top-3 z-30 rounded-full bg-black/50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-300">Tap to skip</div>
const Tag = ({ text, color }: { text: string; color: string }) => (
  <div className="absolute left-3 top-3 z-30 flex items-center gap-2 rounded-lg bg-black/70 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-widest" style={{ color }}><span className="h-2 w-2 animate-pulse rounded-full" style={{ background: color }} />{text}</div>
)

/** The first word of a name (a one-word name stays whole). */
export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name

// ---- FOUR: one to three fielders chase the ball to the rope ---------------------------------------------------------------

export interface FourInfo {
  batsman: Player
  batTeam: Team
  bowlTeam: Team
  /** The shot's direction on the field view (radians, screen angle). */
  angle: number
  /** The one to three fielders nearest the ball's path, with where they stand (field units, 160 x 100). */
  chasers: { player: Player; x: number; y: number }[]
  rate: number
  /** Hit off a free hit: the ball is on fire and leaves a trail of flames. */
  fire?: boolean
}

/** FOUR, seen from above: the ball races to the rope and one to three fielders chase it and come up short. */
const W = 160, H = 100, CX = 80, CY = 50, RX = 66, RY = 40
const HIT = { x: 80, y: 62 }
/** The point on the rope in a direction, from the middle of the pitch. */
function rope(angle: number) {
  let t = 0
  for (let k = 0; k < 90; k++) {
    const x = HIT.x + Math.cos(angle) * (t + 1)
    const y = HIT.y + Math.sin(angle) * (t + 1)
    if (((x - CX) / RX) ** 2 + ((y - CY) / RY) ** 2 > 1) break
    t += 1
  }
  return { x: HIT.x + Math.cos(angle) * t, y: HIT.y + Math.sin(angle) * t }
}
const pc = (v: number, total: number) => `${(v / total) * 100}%`

export function FourScreen({ info }: { info: FourInfo }) {
  const { batsman, batTeam, bowlTeam, angle, chasers, rate } = info
  const { box, w } = useWidth()
  const r = rate
  const end = rope(angle)
  const mid = { x: HIT.x + (end.x - HIT.x) * 0.55, y: HIT.y + (end.y - HIT.y) * 0.55 }
  const size = Math.max(26, Math.min(w * 0.075, 46))
  const run = 1.0 * r
  // the two chasers run down either side of the ball's path, well apart, and finish short of the rope
  const side = { x: -Math.sin(angle), y: Math.cos(angle) }
  const along = { x: Math.cos(angle), y: Math.sin(angle) }
  // one to three chasers: they fan out across the ball's path (one runs straight at it, two split either side, three do both)
  const lanes = chasers.length === 1 ? [0] : chasers.length === 2 ? [-1, 1] : [-1, 0, 1]
  const spot = (base: { x: number; y: number }, i: number, off: number, back: number) => ({ x: base.x + side.x * lanes[i] * off - along.x * back, y: base.y + side.y * lanes[i] * off - along.y * back })
  return (
    <div ref={box} className="absolute inset-0 overflow-hidden rounded-2xl" aria-label="Four">
      <div className="absolute inset-0 bg-[#070b14]" />
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <ellipse cx={CX} cy={CY} rx={RX} ry={RY} fill="#1b7a43" />
        {Array.from({ length: 18 }, (_, i) => <rect key={i} x={14 + i * 7} y={0} width="3.5" height={H} fill="#fff" opacity="0.045" />)}
        <ellipse cx={CX} cy={CY} rx={RX} ry={RY} fill="none" stroke="#fff" strokeWidth="1" opacity="0.9" />
        <motion.ellipse cx={CX} cy={CY} rx={RX} ry={RY} fill="none" stroke="#38bdf8" strokeWidth="1.8" initial={{ opacity: 0 }} animate={{ opacity: [0, 0, 1, 0.3, 1, 0] }} transition={{ delay: 0.2 * r, duration: 1.6 * r, times: [0, 0.45, 0.5, 0.6, 0.7, 1] }} />
        <rect x="77.2" y="30" width="5.6" height="40" rx="0.8" fill="#cdb078" opacity="0.9" />
        {/* the ball's path along the ground and its trail */}
        <motion.line x1={HIT.x} y1={HIT.y} x2={end.x} y2={end.y} stroke="#e0f2fe" strokeWidth="0.8" strokeLinecap="round" strokeDasharray="1.6 1.2" initial={{ pathLength: 0, opacity: 0.9 }} animate={{ pathLength: 1 }} transition={{ delay: 0.15 * r, duration: run, ease: 'easeOut' }} />
      </svg>
      {info.fire && Array.from({ length: 7 }, (_, i) => (
        <motion.span
          key={`fl${i}`} className="pointer-events-none absolute z-[19] block rounded-full blur-[3px]"
          style={{ left: pc(HIT.x, W), top: pc(HIT.y, H), width: 14 - i, height: 14 - i, translateX: '-50%', translateY: '-50%', background: i < 2 ? '#fde047' : i < 4 ? '#fb923c' : '#ef4444' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.85 - i * 0.09, 0], left: [pc(HIT.x, W), pc(end.x, W)], top: [pc(HIT.y, H), pc(end.y, H)] }} transition={{ delay: (0.15 + (i + 1) * 0.05) * r, duration: run, ease: 'easeOut' }}
        />
      ))}
      <motion.span
        className={`absolute z-20 block h-3.5 w-3.5 rounded-full border-2 ${info.fire ? 'border-yellow-200 bg-orange-500 shadow-[0_0_18px_#f97316,0_0_30px_#ef4444]' : 'border-red-200 bg-red-500 shadow-[0_0_12px_#ef4444]'}`}
        style={{ left: pc(HIT.x, W), top: pc(HIT.y, H), translateX: '-50%', translateY: '-50%' }}
        animate={{ left: [pc(HIT.x, W), pc(end.x, W)], top: [pc(HIT.y, H), pc(end.y, H)] }} transition={{ delay: 0.15 * r, duration: run, ease: 'easeOut' }}
      />
      {/* the one to three fielders who chase it and come up short */}
      {chasers.map((c, i) => (
        <motion.div
          key={c.player.id} className="absolute z-20 -translate-x-1/2 -translate-y-1/2 text-center"
          style={{ left: pc(c.x, W), top: pc(c.y, H) }}
          animate={{ left: [pc(c.x, W), pc(spot(mid, i, 9, 0).x, W), pc(spot(end, i, 11, 5).x, W)], top: [pc(c.y, H), pc(spot(mid, i, 9, 0).y, H), pc(spot(end, i, 11, 5).y, H)], rotate: [0, 0, lanes[i] * 14 || -8] }}
          transition={{ delay: 0.25 * r, duration: 1.15 * r, ease: 'easeIn', times: [0, 0.6, 1] }}
        >
          <span className="inline-block rounded-full leading-[0]" style={{ boxShadow: `0 0 0 2px ${accentOf(bowlTeam)}` }}><PlayerAvatar player={c.player} team={bowlTeam} size={size} /></span>
        </motion.div>
      ))}
      <motion.div className="absolute z-20 -translate-x-1/2 -translate-y-1/2 text-center" style={{ left: pc(HIT.x, W), top: pc(HIT.y + 8, H) }} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }}>
        <span className="inline-block rounded-full leading-[0]" style={{ boxShadow: `0 0 0 3px ${accentOf(batTeam)}, 0 0 16px ${accentOf(batTeam)}99` }}><PlayerAvatar player={batsman} team={batTeam} size={size + 6} /></span>
      </motion.div>
      <Tag text="Boundary" color="#38bdf8" />
      <SkipTag />
      <motion.div className="absolute inset-x-0 bottom-[6%] z-40 text-center" initial={{ opacity: 0, scale: 2.4 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.2 * r, type: 'spring', stiffness: 260, damping: 15 }}>
        <div className="font-display leading-none tracking-wide text-white" style={{ fontSize: Math.max(42, Math.min(w * 0.15, 100)), WebkitTextStroke: '2px #0c4a6e', paintOrder: 'stroke fill', textShadow: '0 0 30px #38bdf8aa' }}>FOUR!</div>
        <div className="text-sm font-semibold text-slate-100" style={{ textShadow: '0 1px 4px #000' }}>{batsman.name} finds the rope</div>
      </motion.div>
    </div>
  )
}

// ---- EXTRAS: wide, bye, leg bye -------------------------------------------------------------------------------

export interface ExtraInfo {
  kind: 'wide' | 'bye' | 'legbye'
  runs: number
  bowler: Player
  bowlTeam: Team
  batsman: Player
  batTeam: Team
  keeper: Player | null
  /** For a wide: which side it went (see engine/wide.ts) and the batsman's hand, so the picture shows the ball going the way it really went. */
  wide?: { side: 'off' | 'leg'; hand: 'L' | 'R'; /** How far outside the wide line the ball went, in centimetres. */ cm?: number }
  rate: number
}

const EXTRA_STYLE = {
  wide: { title: 'WIDE!', color: '#fbbf24', stroke: '#78350f', sub: 'Too wide to hit. The umpire signals a wide.', tag: 'Extra: wide' },
  bye: { title: 'BYE!', color: '#2dd4bf', stroke: '#134e4a', sub: 'It beats the bat and the keeper. They run.', tag: 'Extra: bye' },
  legbye: { title: 'LEG BYE!', color: '#a5b4fc', stroke: '#312e81', sub: 'Off the pad and away. They run.', tag: 'Extra: leg bye' },
} as const

/** The wide, seen from above: the popping crease, the wide lines either side of the stumps, and the ball going past the outside of one. */
function WideView({ info }: { info: ExtraInfo }) {
  const { runs, bowler, bowlTeam, rate: r } = info
  const { box, w } = useWidth()
  // the side the ball really went: outside off or down the leg side
  const wideInfo = info.wide ?? { side: 'off' as const, hand: 'R' as const }
  const side = wideDirection(wideInfo.side, wideInfo.hand, 'above')
  const cm = wideInfo.cm ?? 60
  // the wide line is 15 units from the middle; every 100 cm outside it is 18 more
  const out = Math.min(33, 15 + cm * 0.18)
  const x = (v: number) => 50 + side * v
  return (
    <div ref={box} className="absolute inset-0 overflow-hidden rounded-2xl" aria-label="Wide">
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #0b2a19, #14532d 60%, #0b2a19)' }} />
      <svg viewBox="0 0 100 62" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden>
        {/* the strip */}
        <rect x="38" y="0" width="24" height="62" fill="#c9a864" opacity="0.5" />
        {/* the popping crease across the pitch, and the bowling crease behind the bowler */}
        <line x1="2" x2="98" y1="40" y2="40" stroke="#fff" strokeWidth="0.9" />
        <text x="3" y="38" fontSize="3" fill="#fff" opacity="0.8" fontWeight="700">POPPING CREASE</text>
        {/* the stumps */}
        {[46, 50, 54].map((sx) => <line key={sx} x1={sx} x2={sx} y1="42.5" y2="47" stroke="#fef3c7" strokeWidth="1.2" strokeLinecap="round" />)}
        {/* the wide lines, either side of the stumps */}
        {[-1, 1].map((d) => <line key={d} x1={50 + d * 15} x2={50 + d * 15} y1="8" y2="56" stroke="#ef4444" strokeWidth="0.7" strokeDasharray="2 1.4" />)}
        <text x={50 + side * 15 + 1} y="10" fontSize="3" fill="#fca5a5" fontWeight="700">WIDE LINE</text>
        {/* the ball: from the bowler's end, past the outside of the wide line */}
        <motion.path d={`M50 6 Q${x(out / 3)} 22 ${x(out)} 40 T${x(Math.min(46, out * 1.2))} 56`} fill="none" stroke="#fbbf24" strokeWidth="1" strokeLinecap="round" strokeDasharray="2 1.2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.3 * r, duration: 1.5 * r, ease: 'easeIn' }} />
        <motion.circle r="1.7" fill="#ef4444" stroke="#fecaca" strokeWidth="0.4" initial={{ cx: 50, cy: 6 }} animate={{ cx: [50, x(out / 3), x(out), x(Math.min(46, out * 1.2))], cy: [6, 22, 40, 56] }} transition={{ delay: 0.3 * r, duration: 1.5 * r, ease: 'easeIn', times: [0, 0.4, 0.75, 1] }} />
        <motion.g initial={{ opacity: 0, scale: 0.3 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.1 * r, type: 'spring' }} style={{ transformOrigin: `${x(out)}px 40px` }}>
          <circle cx={x(out)} cy="40" r="3" fill="none" stroke="#fbbf24" strokeWidth="0.8" />
        </motion.g>
        {/* how far outside the line it went */}
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 * r }}>
          <line x1={x(15)} x2={x(out)} y1="46" y2="46" stroke="#fde68a" strokeWidth="0.9" />
          <line x1={x(15)} x2={x(15)} y1="44" y2="48" stroke="#fde68a" strokeWidth="0.8" /><line x1={x(out)} x2={x(out)} y1="44" y2="48" stroke="#fde68a" strokeWidth="0.8" />
          <text x={x((15 + out) / 2)} y="52" fontSize="3.6" fontWeight="800" textAnchor="middle" fill="#fef3c7">{cm} cm wide</text>
        </motion.g>
      </svg>
      <Tag text="Extra: wide" color="#fbbf24" />
      <SkipTag />
      <motion.div className="absolute inset-x-0 bottom-[5%] z-40 text-center" initial={{ opacity: 0, scale: 2.2 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.3 * r, type: 'spring', stiffness: 260, damping: 15 }}>
        <div className="font-display leading-none tracking-wide" style={{ color: '#fbbf24', fontSize: Math.max(40, Math.min(w * 0.13, 88)), WebkitTextStroke: '2px #78350f', paintOrder: 'stroke fill', textShadow: '0 0 30px #fbbf24aa' }}>WIDE!</div>
        <div className="mt-0.5 text-sm font-semibold text-slate-100" style={{ textShadow: '0 1px 4px #000' }}>{wideInfo.side === 'off' ? 'Outside off, past the wide line' : 'Down the leg side, past the wide line'} · +{runs} {runs === 1 ? 'run' : 'runs'} <span className="text-slate-300">({bowlTeam.short}, {bowler.name.split(' ')[0]})</span></div>
      </motion.div>
    </div>
  )
}

export function ExtraScreen({ info }: { info: ExtraInfo }) {
  const { kind, runs, bowler, bowlTeam, batsman, batTeam, keeper, rate } = info
  const { box, w } = useWidth()
  const r = rate
  if ((kind as ExtraInfo['kind']) === 'wide') return <WideView info={info} />
  const st = EXTRA_STYLE[kind]
  const size = Math.max(30, Math.min(w * 0.08, 52))
  // where the ball goes: wide of the stumps, past the keeper, or off the pad down the leg side
  const path = kind === 'wide' ? { x: [50, 70, 80], y: [20, 62, 84] } : kind === 'bye' ? { x: [50, 52, 58], y: [20, 66, 94] } : { x: [50, 50, 22], y: [20, 62, 50] }
  return (
    <div ref={box} className="absolute inset-0 overflow-hidden rounded-2xl" aria-label={st.tag}>
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 50%, #1b6b3d, #0a2a19 78%)' }} />
      <div className="absolute left-1/2 top-[12%] h-[66%] w-[9%] -translate-x-1/2 rounded bg-gradient-to-r from-[#bf9a5f] via-[#d7b87c] to-[#bf9a5f]" />
      {[20, 72].map((y) => <div key={y} className="absolute left-[44%] right-[44%] h-px bg-white/70" style={{ top: `${y}%` }} />)}
      {/* stumps at the batsman's end */}
      <div className="absolute left-1/2 top-[70%] z-10 flex -translate-x-1/2 gap-1.5">{[0, 1, 2].map((i) => <span key={i} className="block h-8 w-1.5 rounded-full bg-amber-100" />)}</div>

      <Tag text={st.tag} color={st.color} />
      <SkipTag />

      {/* the bowler runs in; the batsman stands at the crease */}
      <motion.div className="absolute z-20 -translate-x-1/2 text-center" style={{ left: '50%', top: '2%' }} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <span className="inline-block rounded-full leading-[0]" style={{ boxShadow: `0 0 0 2px ${accentOf(bowlTeam)}` }}><PlayerAvatar player={bowler} team={bowlTeam} size={size} /></span>
      </motion.div>
      <div className="absolute z-20 -translate-x-1/2 text-center" style={{ left: kind === 'legbye' ? '46%' : '50%', top: '58%' }}>
        <motion.span className="inline-block rounded-full leading-[0]" style={{ boxShadow: `0 0 0 3px ${accentOf(batTeam)}` }} animate={kind === 'legbye' ? { rotate: [0, 0, -14, 0] } : kind === 'wide' ? { x: [0, 0, 6, 0] } : {}} transition={{ delay: 0.7 * r, duration: 0.5 }}>
          <PlayerAvatar player={batsman} team={batTeam} size={size} />
        </motion.span>
        {kind === 'legbye' && <motion.span className="absolute -right-1 top-full text-xl" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: [0, 1, 0], scale: [0.3, 1.6, 1] }} transition={{ delay: 0.75 * r, duration: 0.5 }}>💥</motion.span>}
      </div>

      {/* the ball */}
      <motion.span
        className="absolute z-30 block h-3.5 w-3.5 rounded-full border-2 border-red-200 bg-red-500 shadow-[0_0_10px_#ef4444]"
        style={{ left: '50%', top: '20%', translateX: '-50%', translateY: '-50%' }}
        animate={{ left: path.x.map((v) => `${v}%`), top: path.y.map((v) => `${v}%`) }} transition={{ delay: 0.3 * r, duration: 1.2 * r, times: [0, 0.55, 1], ease: 'easeIn' }}
      />

      {/* the keeper dives and misses (bye), or the umpire stretches his arms (wide) */}
      {kind === 'bye' && keeper && (
        <motion.div className="absolute z-20 -translate-x-1/2 text-center" style={{ left: '50%', top: '84%' }} animate={{ x: [0, 0, 36], rotate: [0, 0, 70] }} transition={{ delay: 0.5 * r, duration: 0.6 * r, times: [0, 0.3, 1] }}>
          <span className="inline-block rounded-full leading-[0]" style={{ boxShadow: `0 0 0 2px ${accentOf(bowlTeam)}` }}><PlayerAvatar player={keeper} team={bowlTeam} size={size} /></span>
        </motion.div>
      )}
      {kind === 'wide' && (
        <motion.div className="absolute z-20 text-center" style={{ left: '24%', top: '46%' }} initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.9 * r, type: 'spring', stiffness: 260, damping: 14 }}>
          <div className="text-5xl">🙆</div>
          <span className="rounded bg-black/70 px-1.5 text-[11px] font-bold uppercase tracking-wider text-white">Umpire</span>
        </motion.div>
      )}
      {(kind === 'bye' || kind === 'legbye') && (
        <motion.div className="absolute left-1/2 top-[44%] z-20 -translate-x-1/2 text-xs font-extrabold uppercase tracking-widest text-white" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0] }} transition={{ delay: 1.1 * r, duration: 1.2 * r }}>
          <motion.span className="inline-block" animate={{ y: [0, -10, 0, -10, 0] }} transition={{ delay: 1.1 * r, duration: 1.0 * r }}>🏃 running… {runs}</motion.span>
        </motion.div>
      )}

      <motion.div className="absolute inset-x-0 top-[17%] z-40 text-center" initial={{ opacity: 0, scale: 2.2 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.0 * r, type: 'spring', stiffness: 260, damping: 15 }}>
        <div className="font-display leading-none tracking-wide text-white" style={{ fontSize: Math.max(36, Math.min(w * 0.12, 82)), WebkitTextStroke: `2px ${st.stroke}`, paintOrder: 'stroke fill', textShadow: `0 0 28px ${st.color}99` }}>{runs >= 4 && kind !== 'wide' ? (kind === 'bye' ? 'FOUR BYES!' : 'FOUR LEG BYES!') : st.title}</div>
        <div className="mt-0.5 text-sm font-semibold text-slate-100" style={{ textShadow: '0 1px 4px #000' }}>{runs > 0 ? `+${runs} ${runs === 1 ? 'run' : 'runs'} to the total. ` : ''}{runs >= 4 && kind !== 'wide' ? 'It races away to the rope.' : st.sub}</div>
      </motion.div>
    </div>
  )
}

// ---- MAIDEN: six dots in a row --------------------------------------------------------------------------------

export interface MaidenInfo { bowler: Player; bowlTeam: Team; overs: string; rate: number; /** Maidens in a row by this bowler, this one included (2 or more gets its own pressure effect). */ streak?: number }

export function MaidenScreen({ info }: { info: MaidenInfo }) {
  const { bowler, bowlTeam, overs, rate, streak = 1 } = info
  const { box, w } = useWidth()
  const r = rate
  const word = ['', 'MAIDEN!', 'TWO IN A ROW!', 'THREE IN A ROW!'][Math.min(streak, 3)] ?? 'MAIDEN!'
  return (
    <div ref={box} className="absolute inset-0 overflow-hidden rounded-2xl" aria-label="Maiden over">
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 55%, #064e3b, #04140f 78%)' }} />
      {streak >= 2 && <motion.div className="pointer-events-none absolute inset-0 z-10" style={{ boxShadow: 'inset 0 0 70px #ef4444aa', background: 'radial-gradient(ellipse at 50% 50%, transparent 45%, #7f1d1d66 100%)' }} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 0.9, repeat: Infinity }} />}
      <Tag text="Maiden over" color="#34d399" />
      <SkipTag />
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 px-4 text-center">
        <motion.span initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="inline-block rounded-full leading-[0]" style={{ boxShadow: `0 0 0 4px ${accentOf(bowlTeam)}, 0 0 28px #34d39988` }}>
          <PlayerAvatar player={bowler} team={bowlTeam} size={Math.max(56, Math.min(w * 0.17, 100))} />
        </motion.span>
        <div className="flex gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <motion.span key={i} className="grid h-7 w-7 place-items-center rounded-full border-2 border-emerald-300 bg-emerald-400/20 text-sm font-extrabold text-emerald-200" initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 1.4, 1], opacity: 1 }} transition={{ delay: (0.35 + i * 0.16) * r, duration: 0.3 }}>0</motion.span>
          ))}
        </div>
        <motion.div className="font-display leading-none tracking-wide text-white" style={{ fontSize: Math.max(40, Math.min(w * 0.13, 88)), WebkitTextStroke: '2px #064e3b', paintOrder: 'stroke fill', textShadow: '0 0 30px #34d399aa' }} initial={{ opacity: 0, scale: 2.2 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.45 * r, type: 'spring', stiffness: 260, damping: 15 }}>{word}</motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.7 * r }} className="text-sm font-semibold text-slate-100"><b className="text-emerald-300">{bowler.name}</b> gives away nothing: six dot balls. {overs}{streak >= 2 && <span className="ml-1 font-extrabold text-red-300">The pressure is building.</span>}</motion.div>
      </div>
    </div>
  )
}
