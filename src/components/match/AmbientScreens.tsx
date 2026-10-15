import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { sfx } from '../../audio/sfx'
import type { Player, Team } from '../../types'
import { PlayerAvatar, accentOf } from '../ui'
import { TeamLogo } from '../season/Details'

/**
 * Small screens that only break up the game: the stands, a Mexican wave, the team huddle, the fan cam, the commentators, a blimp, the
 * floodlights and fireworks. They change nothing in the match. Click any of them to skip.
 */
export type AmbientInfo =
  | { variant: 'stands'; team: Team; rate: number }
  | { variant: 'wave'; teams: [Team, Team]; rate: number }
  | { variant: 'huddle'; team: Team; players: Player[]; rate: number }
  | { variant: 'fancam'; team: Team; mood: 'happy' | 'shock'; seed: number; rate: number }
  | { variant: 'box'; lines: [string, string]; rate: number }
  | { variant: 'blimp'; team: Team; rate: number }
  | { variant: 'lights'; teams: [Team, Team]; rate: number }
  | { variant: 'fireworks'; team: Team; rate: number }

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

const Tag = ({ text, color }: { text: string; color: string }) => <div className="absolute left-3 top-3 z-30 flex items-center gap-2 rounded-lg bg-black/70 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-widest" style={{ color }}><span className="h-2 w-2 animate-pulse rounded-full" style={{ background: color }} />{text}</div>
const Skip = () => <div className="absolute right-3 top-3 z-30 rounded-full bg-black/50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-300">Tap to skip</div>
const Title = ({ children, w, color = '#fff', delay = 0.3, stroke = '#0a0c14' }: { children: React.ReactNode; w: number; color?: string; delay?: number; stroke?: string }) => (
  <motion.div className="font-display leading-none tracking-wide" style={{ color, fontSize: Math.max(28, Math.min(w * 0.11, 76)), WebkitTextStroke: `2px ${stroke}`, paintOrder: 'stroke fill', textShadow: `0 0 26px ${color}88` }} initial={{ opacity: 0, scale: 2.2 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay, type: 'spring', stiffness: 240, damping: 15 }}>{children}</motion.div>
)

/** One fan: a head over a shirt in the team's colour, bouncing, with an arm raised (and sometimes a scarf). */
function Fan({ shirt, trim, i, size, jump = true, up = false, scarf = false }: { shirt: string; trim: string; i: number; size: number; jump?: boolean; up?: boolean; scarf?: boolean }) {
  const skin = ['#f5d0b0', '#e8b48a', '#c98f66', '#8d5a3b'][i % 4]
  return (
    <motion.div className="relative" style={{ width: size, height: size * 1.25 }} animate={jump ? { y: [0, -size * 0.35, 0] } : up ? { y: [0, -size * 0.55, 0] } : undefined} transition={{ duration: 0.55, repeat: jump ? Infinity : 0, delay: (i % 5) * 0.09 }}>
      <motion.span className="absolute -top-1 block origin-bottom rounded-sm" style={{ left: i % 2 ? '64%' : '10%', width: size * 0.12, height: size * 0.6, background: i % 3 ? trim : '#fff' }} animate={{ rotate: i % 2 ? [20, -20, 20] : [-20, 20, -20] }} transition={{ duration: 0.5, repeat: Infinity, delay: (i % 4) * 0.1 }} />
      {scarf && <span className="absolute left-0 right-0 top-[46%] block h-[10%] rounded-full" style={{ background: trim }} />}
      <span className="absolute left-1/2 top-[18%] block -translate-x-1/2 rounded-full" style={{ width: size * 0.5, height: size * 0.5, background: skin }} />
      <span className="absolute inset-x-[12%] bottom-0 block rounded-t-2xl" style={{ height: size * 0.55, background: shirt }} />
    </motion.div>
  )
}

function Stands({ team, w, r }: { team: Team; w: number; r: number }) {
  const size = Math.max(22, Math.min(w * 0.075, 40))
  const cols = w < 520 ? 7 : 10
  return (
    <>
      <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, #05070d, ${team.colors.primary}55 70%, #05070d)` }} />
      <div className="absolute inset-x-0 top-[40%] z-10 flex flex-col items-center gap-1 px-2">
        {[0, 1, 2].map((row) => (
          <div key={row} className="flex justify-center" style={{ gap: size * 0.12 }}>
            {Array.from({ length: cols - (row % 2) }, (_, k) => <Fan key={k} i={k + row * 3} size={size * (0.85 + row * 0.1)} shirt={k % 2 ? team.colors.primary : team.colors.secondary} trim={k % 2 ? team.colors.secondary : '#fff'} scarf={k % 3 === 0} />)}
          </div>
        ))}
      </div>
      <motion.div className="absolute inset-x-0 top-[15%] z-20 flex items-center justify-center gap-3" initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 * r }}>
        <TeamLogo team={team} size={Math.max(30, w * 0.08)} />
        <Title w={w} delay={0.3 * r}>THE {team.short.toUpperCase()} ARMY!</Title>
      </motion.div>
      <div className="absolute inset-x-0 bottom-[3%] z-20 text-center text-[11px] font-semibold text-slate-200">The {team.name} stand is on its feet</div>
    </>
  )
}

function Wave({ teams, w, r }: { teams: [Team, Team]; w: number; r: number }) {
  const cols = w < 520 ? 12 : 18
  const size = Math.max(16, Math.min(w / (cols + 1), 34))
  return (
    <>
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,#0a0e18,#10182a)' }} />
      <div className="absolute inset-x-1 top-[44%] z-10 space-y-0.5">
        {[0, 1, 2].map((row) => (
          <div key={row} className="flex justify-center" style={{ gap: size * 0.1 }}>
            {Array.from({ length: cols }, (_, k) => {
              const t = teams[(k + row) % 2]
              return (
                <motion.div key={k} animate={{ y: [0, -size * 0.9, 0], scaleY: [1, 1.18, 1] }} transition={{ delay: (k * 0.11 + row * 0.05) * r, duration: 0.55 * r, repeat: 1, repeatDelay: cols * 0.11 * r }}>
                  <Fan i={k + row} size={size} jump={false} shirt={t.colors.primary} trim={t.colors.secondary} />
                </motion.div>
              )
            })}
          </div>
        ))}
      </div>
      <div className="absolute inset-x-0 top-[15%] z-20 text-center"><Title w={w} delay={0.2 * r} color="#7dd3fc">THE WAVE!</Title></div>
      <div className="absolute inset-x-0 bottom-[4%] z-20 text-center text-[11px] font-semibold text-slate-300">Both ends of the ground join in</div>
    </>
  )
}

function Huddle({ team, players, w, r }: { team: Team; players: Player[]; w: number; r: number }) {
  const size = Math.max(34, Math.min(w * 0.1, 56))
  const n = players.length
  return (
    <>
      <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 50% 55%, ${team.colors.primary}99, #070a12 75%)` }} />
      <div className="absolute inset-x-0 top-[14%] z-20 text-center"><Title w={w} delay={0.25 * r} color="#fde68a">HUDDLE!</Title></div>
      <div className="absolute inset-0 z-10">
        {players.map((p, i) => {
          const a = (i / n) * Math.PI * 2 - Math.PI / 2
          const rx = w * 0.27
          const ry = w * 0.1
          return (
            <motion.div key={p.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: '50%', top: '68%' }}
              initial={{ x: Math.cos(a) * rx * 2.2, y: Math.sin(a) * ry * 2.2, opacity: 0 }} animate={{ x: Math.cos(a) * rx, y: [Math.sin(a) * ry, Math.sin(a) * ry - 12, Math.sin(a) * ry], opacity: 1 }}
              transition={{ x: { delay: (0.2 + i * 0.07) * r, duration: 0.6 * r }, opacity: { delay: (0.2 + i * 0.07) * r }, y: { delay: 0.9 * r, duration: 0.45, repeat: Infinity, repeatDelay: (i % 3) * 0.08 } }}>
              <span className="block rounded-full leading-[0]" style={{ boxShadow: `0 0 0 3px ${accentOf(team)}` }}><PlayerAvatar player={p} team={team} size={size} /></span>
            </motion.div>
          )
        })}
        <motion.span className="absolute left-1/2 top-[68%] -translate-x-1/2 -translate-y-1/2 text-3xl" aria-hidden animate={{ scale: [1, 1.3, 1], rotate: [0, 12, -12, 0] }} transition={{ duration: 0.8, repeat: Infinity }}>🔥</motion.span>
      </div>
      <div className="absolute inset-x-0 bottom-[3%] z-20 text-center text-[11px] font-semibold text-slate-200">{team.name} celebrate together</div>
    </>
  )
}

const HAPPY = ['🤩', '😍', '🥳', '😆', '🙌']
const SHOCK = ['😱', '😭', '😬', '🤯', '🥲']
const CAPS = { happy: ['Biggest fan', 'Lucky charm', 'Face painter', 'Snack champion'], shock: ["Can't watch", 'Heart in mouth', 'Lost for words', 'Nail biter'] }
function FanCam({ team, mood, seed, w, r }: { team: Team; mood: 'happy' | 'shock'; seed: number; w: number; r: number }) {
  const [n, setN] = useState(0)
  useEffect(() => { const id = window.setInterval(() => setN((x) => x + 1), 1100 * r); return () => window.clearInterval(id) }, [r])
  const faces = mood === 'happy' ? HAPPY : SHOCK
  const f = faces[(seed + n) % faces.length]
  const cap = CAPS[mood][(seed + n) % CAPS[mood].length]
  return (
    <>
      <div className="absolute inset-0 bg-black" />
      <div className="absolute inset-2 overflow-hidden rounded-xl border border-sky-400/30" style={{ background: `radial-gradient(ellipse at 50% 45%, ${team.colors.primary}88, #05080e 80%)` }}>
        <motion.div key={n} className="absolute inset-0 flex flex-col items-center justify-center" initial={{ scale: 1.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.3 }}>
          <motion.span className="select-none" style={{ fontSize: Math.max(60, w * 0.22) }} animate={{ rotate: mood === 'shock' ? [-4, 4, -4] : [0, 6, -6, 0], scale: [1, 1.08, 1] }} transition={{ duration: 0.6, repeat: Infinity }} aria-hidden>{f}</motion.span>
          <span className="mt-1 rounded bg-black/70 px-2 py-0.5 text-xs font-bold text-white">{cap} · {team.short} fan</span>
        </motion.div>
        <div className="pointer-events-none absolute inset-0 opacity-[0.08]" style={{ background: 'repeating-linear-gradient(0deg, #fff 0 1px, transparent 1px 3px)' }} />
        <div className="absolute bottom-2 right-2 z-30 flex items-center gap-1 rounded bg-red-600 px-1.5 py-px text-[10px] font-extrabold tracking-wider text-white"><span className="h-1.5 w-1.5 rounded-full bg-white" />LIVE</div>
      </div>
    </>
  )
}

function Box({ lines, w, r }: { lines: [string, string]; w: number; r: number }) {
  return (
    <>
      <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg,#1c1530,#0a0a14)' }} />
      <div className="absolute inset-x-0 top-[15%] z-20 text-center"><Title w={w} delay={0.2 * r} color="#c4b5fd" stroke="#1c1530">IN THE BOX</Title></div>
      <div className="absolute inset-x-3 bottom-[6%] z-10 flex items-end justify-center gap-3">
        {[0, 1].map((k) => (
          <motion.div key={k} className="flex max-w-[48%] flex-1 flex-col items-center" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: (0.4 + k * 1.3) * r }}>
            <div className="mb-1 rounded-2xl bg-white px-3 py-1.5 text-left text-[12px] font-semibold leading-snug text-slate-900 shadow-lg" style={{ borderBottomLeftRadius: k ? 16 : 2, borderBottomRightRadius: k ? 2 : 16 }}>{lines[k]}</div>
            <motion.span className="select-none text-5xl" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.5, repeat: Infinity, delay: k * 0.2 }} aria-hidden>{k ? '👩‍💼' : '🧑‍💼'}</motion.span>
            <span className="text-lg" aria-hidden>🎙️</span>
          </motion.div>
        ))}
      </div>
    </>
  )
}

function Blimp({ team, w, r }: { team: Team; w: number; r: number }) {
  return (
    <>
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,#60a5fa,#bfdbfe 70%,#86efac)' }} />
      {[12, 30, 52].map((t, i) => <motion.span key={i} className="absolute select-none text-3xl opacity-80" style={{ top: `${t}%` }} initial={{ left: '-10%' }} animate={{ left: '110%' }} transition={{ duration: (6 + i * 2) * r, ease: 'linear' }} aria-hidden>☁️</motion.span>)}
      <motion.div className="absolute top-[26%] z-20 flex items-center" initial={{ left: '-45%' }} animate={{ left: '105%' }} transition={{ duration: 4.2 * r, ease: 'linear' }}>
        <div className="relative rounded-[999px] px-8 py-3 shadow-xl" style={{ background: `linear-gradient(180deg, ${team.colors.primary}, ${team.colors.secondary})` }}>
          <span className="font-display text-xl tracking-wider text-white" style={{ fontSize: Math.max(16, w * 0.045) }}>GO {team.short.toUpperCase()}!</span>
          <span className="absolute -bottom-3 left-1/2 h-3 w-8 -translate-x-1/2 rounded-b-lg bg-slate-700" />
          <span className="absolute -right-3 top-0 h-full w-4 rounded-r-full" style={{ background: team.colors.secondary }} />
        </div>
      </motion.div>
      <div className="absolute inset-x-0 bottom-0 z-10 h-[22%] bg-gradient-to-t from-emerald-700 to-emerald-500" />
      <div className="absolute inset-x-0 bottom-[6%] z-20 text-center"><span className="rounded bg-black/60 px-2 py-0.5 text-[11px] font-bold text-white">A blimp floats over the ground</span></div>
    </>
  )
}

function Lights({ teams, w, r }: { teams: [Team, Team]; w: number; r: number }) {
  return (
    <>
      <div className="absolute inset-0 bg-[#03050a]" />
      <motion.div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 70%, #1b7a43, #06140c 70%)' }} initial={{ opacity: 0.05 }} animate={{ opacity: [0.05, 0.05, 1] }} transition={{ duration: 2.4 * r, times: [0, 0.5, 1] }} />
      {[10, 36, 64, 90].map((x, i) => (
        <motion.div key={x} className="absolute top-0 z-10" style={{ left: `${x}%`, transform: 'translateX(-50%)' }} initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0.7, 1] }} transition={{ delay: (0.3 + i * 0.4) * r, duration: 0.5 }}>
          <span className="mx-auto block h-3 w-3 rounded-full bg-white shadow-[0_0_30px_14px_#fff7d6aa]" />
          <span className="mx-auto block h-[90px] w-[60px]" style={{ background: 'linear-gradient(180deg,#fff7d666,transparent)', clipPath: 'polygon(35% 0,65% 0,100% 100%,0 100%)' }} />
        </motion.div>
      ))}
      <div className="absolute inset-x-0 top-[38%] z-20 text-center"><Title w={w} delay={1.8 * r} color="#fef3c7" stroke="#1c1917">FLOODLIGHTS ON!</Title><motion.div className="mt-1 text-sm font-semibold text-slate-100" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.3 * r }}>{teams[0].short} v {teams[1].short}: the chase goes on under the lights</motion.div></div>
    </>
  )
}

function Fireworks({ team, w, r }: { team: Team; w: number; r: number }) {
  const bursts = [{ x: 22, y: 34, c: team.colors.primary, d: 0.2 }, { x: 70, y: 26, c: '#fde68a', d: 0.8 }, { x: 46, y: 44, c: team.colors.secondary, d: 1.4 }, { x: 84, y: 48, c: '#fff', d: 2.0 }, { x: 14, y: 52, c: '#fde68a', d: 2.4 }]
  return (
    <>
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,#02030a,#0b1224 80%,#10182a)' }} />
      {bursts.map((b, i) => (
        <div key={i} className="absolute" style={{ left: `${b.x}%`, top: `${b.y}%` }}>
          {Array.from({ length: 14 }, (_, k) => {
            const a = (k / 14) * Math.PI * 2
            return <motion.span key={k} className="absolute block h-1.5 w-1.5 rounded-full" style={{ background: b.c, boxShadow: `0 0 8px ${b.c}` }} initial={{ x: 0, y: 0, opacity: 0 }} animate={{ x: Math.cos(a) * w * 0.12, y: Math.sin(a) * w * 0.12 + 14, opacity: [0, 1, 0] }} transition={{ delay: b.d * r, duration: 1.1 * r, ease: 'easeOut' }} />
          })}
        </div>
      ))}
      <div className="absolute inset-x-0 bottom-[8%] z-20 text-center"><Title w={w} delay={0.4 * r} color="#fde68a">FIREWORKS!</Title><div className="mt-1 text-sm font-semibold text-slate-100">{team.name} light up the night</div></div>
    </>
  )
}

const TAGS: Record<AmbientInfo['variant'], [string, string]> = {
  stands: ['In the stands', '#fbbf24'], wave: ['The wave', '#7dd3fc'], huddle: ['Team huddle', '#fde68a'], fancam: ['Fan cam', '#38bdf8'],
  box: ["Commentators' corner", '#c4b5fd'], blimp: ['Up above', '#bae6fd'], lights: ['Under the lights', '#fef3c7'], fireworks: ['Fireworks', '#fde68a'],
}

export function AmbientScreen({ info }: { info: AmbientInfo }) {
  const [box, w] = useWidth()
  const r = info.rate
  useEffect(() => {
    if (info.variant === 'stands' || info.variant === 'huddle') sfx.cheer(0.5)
    if (info.variant === 'wave') sfx.applause(2.4)
    if (info.variant === 'fireworks') sfx.pops(7)
    if (info.variant === 'lights') sfx.cheer(0.6)
  }, [info.variant])
  const [tag, color] = TAGS[info.variant]
  return (
    <div ref={box} className="absolute inset-0 overflow-hidden rounded-2xl" aria-label={tag}>
      {info.variant === 'stands' && <Stands team={info.team} w={w} r={r} />}
      {info.variant === 'wave' && <Wave teams={info.teams} w={w} r={r} />}
      {info.variant === 'huddle' && <Huddle team={info.team} players={info.players} w={w} r={r} />}
      {info.variant === 'fancam' && <FanCam team={info.team} mood={info.mood} seed={info.seed} w={w} r={r} />}
      {info.variant === 'box' && <Box lines={info.lines} w={w} r={r} />}
      {info.variant === 'blimp' && <Blimp team={info.team} w={w} r={r} />}
      {info.variant === 'lights' && <Lights teams={info.teams} w={w} r={r} />}
      {info.variant === 'fireworks' && <Fireworks team={info.team} w={w} r={r} />}
      <Tag text={tag} color={color} />
      <Skip />
    </div>
  )
}
