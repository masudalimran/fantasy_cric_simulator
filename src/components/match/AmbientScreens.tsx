import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { sfx } from '../../audio/sfx'
import type { Player, Team } from '../../types'
import { PlayerAvatar, accentOf } from '../ui'
import { TeamLogo } from '../season/Details'
import { crowdSigns, type SocialPost } from '../../data/social'
import { CommentaryBox } from './CommentaryBox'
import { ManhattanScreen, ScoringScreen, WagonScreen, WormScreen, type StatsInfo } from './StatsScreens'

/**
 * Small screens that only break up the game: the stands, a Mexican wave, the team huddle, the fan cam, the commentators, a blimp, the
 * floodlights and fireworks. They change nothing in the match. Click any of them to skip.
 */
export type AmbientInfo =
  | { variant: 'stands'; team: Team; sign: '4' | '6' | null; name: string | null; seed: number; rate: number }
  | { variant: 'social'; team: Team; posts: SocialPost[]; hashtag: string; rate: number }
  | { variant: 'huddle'; team: Team; players: Player[]; rate: number }
  | { variant: 'box'; lines: string[]; teams: [Team, Team]; rate: number }
  | { variant: 'lights'; teams: [Team, Team]; rate: number }
  | { variant: 'fireworks'; team: Team; rate: number }
  // the numbers of the match on the field: a wagon wheel, the run-rate worm, the runs of each over, how the runs came
  | { variant: 'wagon' | 'worm' | 'manhattan' | 'scoring'; stats: StatsInfo; rate: number }

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

function Stands({ team, sign, name, seed, w, r }: { team: Team; sign: '4' | '6' | null; name: string | null; seed: number; w: number; r: number }) {
  // a whole stand of supporters: rows of fans getting bigger towards the front, jumping at their own pace, with banners held up
  const rows = [{ y: 30, size: 0.055, n: 16 }, { y: 44, size: 0.066, n: 14 }, { y: 59, size: 0.08, n: 12 }, { y: 75, size: 0.095, n: 10 }]
  const signs = crowdSigns({ sign, team, name }, seed)
  const boards: { x: number; y: number; rot: number; delay: number; node: React.ReactNode }[] = [
    { x: 17, y: 13, rot: -4, delay: 0.3, node: <div className="flex items-center gap-1.5 rounded-sm px-2 py-1" style={{ background: `linear-gradient(135deg, ${team.colors.primary}, ${team.colors.secondary})` }}><TeamLogo team={team} size={Math.max(22, w * 0.07)} /><span className="font-display text-sm leading-none text-white">{team.short}</span></div> },
    { x: 50, y: 6, rot: 3, delay: 0.5, node: <div className="grid place-items-center rounded-md border-4 border-white bg-red-600 px-4 py-0.5 font-display leading-none text-white" style={{ fontSize: Math.max(34, w * 0.12), minWidth: Math.max(54, w * 0.15) }}>{signs[0]}</div> },
    { x: 82, y: 13, rot: -3, delay: 0.7, node: <div className="rounded-sm bg-white px-2 py-1 text-center font-display leading-tight text-slate-900" style={{ fontSize: Math.max(13, w * 0.04), maxWidth: w * 0.3 }}>{signs[2]}</div> },
    { x: 68, y: 27, rot: 5, delay: 0.9, node: <div className="rounded-sm px-2 py-0.5 text-center font-display leading-none text-white" style={{ background: team.colors.primary, fontSize: Math.max(12, w * 0.034) }}>{signs[1]}</div> },
  ]
  return (
    <>
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #020309, #0b1224 45%, #111a30)' }} />
      {/* floodlight glow behind the stand */}
      <div className="absolute inset-x-0 top-0 h-[40%]" style={{ background: `radial-gradient(ellipse at 50% 0%, ${team.colors.primary}55, transparent 70%)` }} />
      {rows.map((row, ri) => (
        <div key={ri} className="absolute inset-x-0 flex justify-center" style={{ top: `${row.y}%`, gap: w * 0.004 }}>
          {Array.from({ length: row.n }, (_, k) => {
            const sz = Math.max(16, w * row.size)
            const t = (k + ri) % 3
            const j = (Math.sin((k + 1) * 12.9898 + ri * 78.233 + seed) * 43758.5453) % 1
            return (
              <motion.div key={k} animate={{ y: [0, -sz * (0.25 + Math.abs(j) * 0.5), 0] }} transition={{ duration: 0.45 + Math.abs(j) * 0.4, repeat: Infinity, delay: Math.abs(j) * 1.5 * r }}>
                <Fan i={k * 3 + ri} size={sz} jump={false} shirt={t === 0 ? team.colors.primary : t === 1 ? team.colors.secondary : '#e5e7eb'} trim={t === 0 ? team.colors.secondary : team.colors.primary} />
              </motion.div>
            )
          })}
        </div>
      ))}
      {boards.map((b, i) => (
        <motion.div key={i} className="absolute z-20 -translate-x-1/2 text-center" style={{ left: `${b.x}%`, top: `${b.y}%` }} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: [0, -5, 0], rotate: [b.rot, -b.rot, b.rot] }} transition={{ opacity: { delay: b.delay * r }, y: { delay: b.delay * r, duration: 0.7, repeat: Infinity }, rotate: { delay: b.delay * r, duration: 1.4, repeat: Infinity } }}>
          <div className="shadow-xl">{b.node}</div>
          <div className="mx-auto h-5 w-[3px] bg-slate-400" />
        </motion.div>
      ))}
      <div className="absolute inset-x-0 bottom-[3%] z-20 text-center text-[11px] font-semibold text-slate-200" style={{ textShadow: '0 1px 3px #000' }}>The {team.name} stand is on its feet</div>
    </>
  )
}

/** A feed of the fans' posts scrolling up like a phone screen, with the likes and shares counting up. */
function Social({ posts, team, hashtag, w, r }: { posts: SocialPost[]; team: Team; hashtag: string; w: number; r: number }) {
  const small = w < 520
  const icon = (d: string, c = 'currentColor') => <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>
  return (
    <>
      <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg,#0b1020,#05070d)' }} />
      <div className="absolute inset-x-[6%] bottom-2 top-11 overflow-hidden rounded-2xl border border-white/10 bg-[#0f1420]">
        <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5 text-[11px] font-bold text-slate-200"><span>Fan chat</span><span style={{ color: team.colors.secondary }}>#{hashtag}</span></div>
        <div className="relative h-[calc(100%-29px)] overflow-hidden">
        <motion.div className="px-2.5" initial={{ y: 0 }} animate={{ y: -(posts.length - 1) * (small ? 64 : 76) }} transition={{ delay: 0.9 * r, duration: Math.max(3, posts.length * 1.15) * r, ease: 'linear' }}>
          {posts.map((p, i) => (
            <motion.div key={i} className="flex gap-2 border-b border-white/5 py-2" style={{ minHeight: small ? 64 : 76 }} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 2) * 0.25 }}>
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full font-display text-sm text-white" style={{ background: p.side === 0 ? team.colors.primary : '#475569' }}>{p.name[0]}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5"><span className="truncate text-[12px] font-extrabold text-white">{p.name}</span><span className="truncate text-[10px] text-slate-500">{p.handle} · {p.age}</span></div>
                <div className="text-[12px] leading-snug text-slate-200">{p.text}</div>
                <div className="mt-1 flex gap-4 text-[10px] font-semibold text-slate-400">
                  <span className="flex items-center gap-1">{icon('M21 11.5a8.5 8.5 0 0 1-12.4 7.5L3 21l2-5.6A8.5 8.5 0 1 1 21 11.5z')}{p.replies}</span>
                  <span className="flex items-center gap-1">{icon('M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3')}{p.shares}</span>
                  <span className="flex items-center gap-1 text-rose-400">{icon('M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z', '#fb7185')}{p.likes}</span>
                  <span className="flex items-center gap-1">{icon('M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13')}Share</span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
        </div>
      </div>
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
  stands: ['In the stands', '#fbbf24'], social: ['Fan chat', '#7dd3fc'], huddle: ['Team huddle', '#fde68a'],
  box: ["Commentators' corner", '#c4b5fd'], lights: ['Under the lights', '#fef3c7'], fireworks: ['Fireworks', '#fde68a'],
  wagon: ['Wagon wheel', '#38bdf8'], worm: ['The worm', '#34d399'], manhattan: ['Over by over', '#f472b6'], scoring: ['How the runs came', '#fbbf24'],
}

export function AmbientScreen({ info }: { info: AmbientInfo }) {
  const [box, w] = useWidth()
  const r = info.rate
  useEffect(() => {
    if (info.variant === 'stands' || info.variant === 'huddle') sfx.cheer(0.5)
    if (info.variant === 'fireworks') sfx.pops(7)
    if (info.variant === 'lights') sfx.cheer(0.6)
  }, [info.variant])
  const [tag, color] = TAGS[info.variant]
  return (
    <div ref={box} className="absolute inset-0 overflow-hidden rounded-2xl" aria-label={tag}>
      {info.variant === 'stands' && <Stands team={info.team} sign={info.sign} name={info.name} seed={info.seed} w={w} r={r} />}
      {info.variant === 'social' && <Social posts={info.posts} team={info.team} hashtag={info.hashtag} w={w} r={r} />}
      {info.variant === 'huddle' && <Huddle team={info.team} players={info.players} w={w} r={r} />}
      {info.variant === 'box' && <CommentaryBox lines={info.lines} teams={info.teams} rate={r} />}
      {info.variant === 'lights' && <Lights teams={info.teams} w={w} r={r} />}
      {info.variant === 'fireworks' && <Fireworks team={info.team} w={w} r={r} />}
      {info.variant === 'wagon' && <WagonScreen info={info.stats} />}
      {info.variant === 'worm' && <WormScreen info={info.stats} />}
      {info.variant === 'manhattan' && <ManhattanScreen info={info.stats} />}
      {info.variant === 'scoring' && <ScoringScreen info={info.stats} />}
      <Tag text={tag} color={color} />
      <Skip />
    </div>
  )
}
