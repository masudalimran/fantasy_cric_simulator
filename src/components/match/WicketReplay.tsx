import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import type { DismissalKind } from '../../engine/types'
import type { Player, Team } from '../../types'
import type { Track } from '../../season/moments'
import { sfx } from '../../audio/sfx'
import { PlayerAvatar, accentOf } from '../ui'
import { BallTrackView } from './ReviewScreens'

/** Everything a replay needs to tell the story of one dismissal. */
export interface ReplayInfo {
  kind: DismissalKind
  batsman: Player
  bowler: Player
  /** The fielder who took the catch, made the throw or kept (null when there was none). */
  fielder: Player | null
  /** Where he stood in the field view (160 x 100), when known: a deep catch happens near the rope, a slip catch beside the stumps. */
  spot?: { x: number; y: number } | null
  batTeam: Team
  bowlTeam: Team
  /** 1 = full speed. Higher auto-play speeds play it quicker. */
  rate: number
  /** Where he finished, for the caption. */
  score: string
  /** When the replay is the only screen for the wicket: the details the separate OUT! screen would have shown. */
  details?: { lines: string[]; duck: boolean }
  /** For an lbw: what ball tracking found. When set the replay is the tracking picture instead of the view from above. */
  track?: Track
  /** The batsman's card in the top-left corner: his innings and how he got out (lines[0] is how, lines[1] the score line). */
  card?: { lines: string[]; duck: boolean }
}

const TITLE: Record<DismissalKind, string> = {
  bowled: 'BOWLED!', caught: 'CAUGHT!', lbw: 'LBW!', 'run out': 'RUN OUT!', stumped: 'STUMPED!', 'caught and bowled': 'CAUGHT & BOWLED!', 'hit wicket': 'HIT WICKET!',
}

/** Where a fielder stands for a catch or a throw, a stable spot picked from his name (always on one side or the other of the pitch). */
const spotOf = (name: string) => {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0
  const left = h % 2 === 0
  return { x: left ? 18 + (h % 14) : 82 - (h % 14), y: 34 + (h % 22) }
}

const STUMPS_BOWL = { x: 50, y: 22 }
const STUMPS_BAT = { x: 50, y: 70 }

function Stumps({ x, y, fly, at, rate }: { x: number; y: number; fly: boolean; at: number; rate: number }) {
  const parts = [{ dx: -26, dr: -70 }, { dx: 2, dr: 25 }, { dx: 26, dr: 75 }]
  return (
    <div className="absolute z-10" style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}>
      <div className="relative flex gap-1.5">
        {parts.map((p, i) => (
          <motion.span
            key={i} className="block h-9 w-1.5 rounded-full bg-amber-100 shadow"
            animate={fly ? { x: [0, p.dx], y: [0, -28 - i * 6, 18], rotate: [0, p.dr], opacity: [1, 1, 0.9] } : { x: 0, y: 0, rotate: 0 }}
            transition={{ delay: at * rate, duration: 0.9 * rate }}
          />
        ))}
        <span className="absolute -top-0.5 left-0 right-0 h-1 rounded bg-amber-400" />
      </div>
    </div>
  )
}

export function Actor({ player, team, size, note, from, path, times, dur, jump, tag, hero }: {
  player: Player; team: Team; size: number; note?: string
  /** The star of the screen (a fifty or hundred): a pulsing glow in this colour, a thick ring and glitter all around him. */
  hero?: string
  from: { x: number; y: number }
  /** Where the actor goes: positions at `times` (0 to 1 of `dur`). */
  path?: { x: number; y: number }[]; times?: number[]; dur: number
  /** Seconds at which he jumps for joy, and how many times. */
  jump?: number
  tag: string
}) {
  const pts = path ?? [from]
  return (
    <motion.div
      className="absolute z-20 -translate-x-1/2 -translate-y-1/2 text-center"
      style={{ left: `${from.x}%`, top: `${from.y}%` }}
      animate={{ left: pts.map((p) => `${p.x}%`), top: pts.map((p) => `${p.y}%`) }}
      transition={{ duration: dur, times, ease: 'easeInOut' }}
    >
      <motion.div animate={jump !== undefined ? { y: [0, 0, -size * 0.35, 0, -size * 0.2, 0], scale: [1, 1, 1.15, 1, 1.08, 1] } : {}} transition={jump !== undefined ? { delay: jump, duration: 0.9, times: [0, 0.01, 0.35, 0.6, 0.8, 1] } : {}}>
        {hero ? (
          <div className="relative mx-auto inline-block" style={{ width: size, height: size }}>
            <motion.div
              className="rounded-full leading-[0]"
              animate={{ boxShadow: [`0 0 0 4px ${hero}, 0 0 16px ${hero}aa`, `0 0 0 7px ${hero}, 0 0 52px ${hero}`, `0 0 0 4px ${hero}, 0 0 16px ${hero}aa`], scale: [1, 1.08, 1] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
            >
              <PlayerAvatar player={player} team={team} size={size} />
            </motion.div>
            {/* glitter all around him, twinkling one after another */}
            {Array.from({ length: 10 }, (_, i) => {
              const a = (i / 10) * Math.PI * 2
              const rad = size * (0.62 + (i % 3) * 0.12)
              return (
                <motion.span
                  key={i} className="pointer-events-none absolute leading-none" aria-hidden
                  style={{ left: `calc(50% + ${Math.cos(a) * rad}px)`, top: `calc(50% + ${Math.sin(a) * rad}px)`, x: '-50%', y: '-50%', fontSize: Math.max(10, size * (i % 2 ? 0.26 : 0.36)), color: i % 3 === 0 ? '#ffffff' : hero, textShadow: `0 0 8px ${hero}` }}
                  animate={{ opacity: [0, 1, 0], scale: [0.3, 1.25, 0.3], rotate: [0, 90] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: (i % 5) * 0.24, ease: 'easeInOut' }}
                >✦</motion.span>
              )
            })}
          </div>
        ) : (
          <div className="mx-auto inline-block rounded-full leading-[0]" style={{ boxShadow: `0 0 0 3px ${accentOf(team)}, 0 0 18px ${accentOf(team)}88` }}><PlayerAvatar player={player} team={team} size={size} /></div>
        )}
        <div className="mt-1 flex flex-col items-center gap-0.5">
          <span className="rounded bg-black/70 px-1.5 text-[11px] font-extrabold uppercase tracking-wider" style={{ color: accentOf(team) }}>{tag}</span>
          {/* the whole name, on two lines if it is long, and the score always underneath it */}
          <span className="max-w-[150px] rounded bg-black/60 px-1.5 text-center text-[11px] font-semibold leading-tight text-white">{player.name}</span>
          {note && <span className="whitespace-nowrap rounded bg-black/70 px-1.5 text-[11px] font-extrabold text-red-300">{note}</span>}
        </div>
      </motion.div>
    </motion.div>
  )
}

/**
 * A short replay screen of how the wicket happened, 4 to 5 seconds: the bowler runs in and the ball is delivered, then
 * whatever ended the innings of that batsman: the stumps flying, the catch, the throw, the keeper's gloves.
 * Click anywhere to skip it.
 */
export function WicketReplay({ info }: { info: ReplayInfo }) {
  const { kind, batsman, bowler, fielder, batTeam, bowlTeam, rate, score } = info
  const card = info.card ?? info.details
  const box = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(640)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const size = Math.max(34, Math.min(w * 0.09, 64))
  const r = rate
  const tracked = kind === 'lbw' && !!info.track
  // an appeal for lbw, a stumping or a catch behind starts with the fielders' shout
  useEffect(() => {
    if (kind !== 'lbw' && kind !== 'stumped') return
    const t = window.setTimeout(() => sfx.howzat(), 600 * r)
    return () => window.clearTimeout(t)
  }, [kind, r])
  const F = fielder ? (info.spot ? { x: Math.min(90, Math.max(10, 50 + (info.spot.x - 80) * 0.62)), y: Math.min(76, Math.max(26, 14 + (info.spot.y - 10) * 0.8)) } : spotOf(fielder.name)) : { x: 80, y: 46 }
  const keeper = { x: 50, y: 80 }
  const stumpsFly = kind === 'bowled' || kind === 'stumped' || kind === 'run out' || kind === 'hit wicket'
  // when things happen (seconds at rate 1)
  const T = { run: 0.9, hit: 1.6, big: kind === 'caught' ? 2.5 : kind === 'run out' ? 2.4 : kind === 'caught and bowled' ? 2.1 : kind === 'stumped' ? 2.0 : kind === 'lbw' && info.track ? 3.4 : 1.7 }

  // the ball's journey as positions over time
  const ball: { x: number[]; y: number[]; s: number[]; times: number[]; dur: number } =
    kind === 'caught' ? { x: [50, 50, F.x], y: [24, 64, F.y], s: [1, 1, 1.5], times: [0, 0.4, 1], dur: 2.5 }
    : kind === 'caught and bowled' ? { x: [50, 50, 50], y: [24, 64, 26], s: [1, 1, 1.6], times: [0, 0.45, 1], dur: 2.1 }
    : kind === 'stumped' ? { x: [50, 50, keeper.x], y: [24, 58, keeper.y], s: [1, 1, 1], times: [0, 0.45, 1], dur: 1.9 }
    : kind === 'run out' ? { x: [50, 50, F.x, STUMPS_BAT.x], y: [24, 62, F.y, STUMPS_BAT.y], s: [1, 1, 1, 1], times: [0, 0.2, 0.55, 1], dur: 2.3 }
    : kind === 'hit wicket' ? { x: [50, 50], y: [24, 64], s: [1, 1], times: [0, 1], dur: 1.4 }
    : { x: [50, 50], y: [24, kind === 'lbw' ? 64 : 70], s: [1, 1], times: [0, 1], dur: 1.5 }

  const sub =
    kind === 'bowled' ? `${bowler.name} knocks over the stumps`
    : kind === 'lbw' ? `${bowler.name} traps ${batsman.name} in front`
    : kind === 'caught' ? `${fielder?.name ?? 'The fielder'} takes the catch off ${bowler.name}`
    : kind === 'caught and bowled' ? `${bowler.name} takes it himself`
    : kind === 'run out' ? `${fielder?.name ?? 'A fielder'} hits the stumps with the throw`
    : kind === 'stumped' ? `${fielder?.name ?? 'The keeper'} whips off the bails`
    : `${batsman.name} knocks the stumps with his own bat`

  return (
    <div ref={box} className="absolute inset-0 overflow-hidden rounded-2xl" aria-label={`How the wicket happened: ${TITLE[kind]}`}>
      {tracked ? (
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 40%, #0f2a45, #060b14 80%)' }}><BallTrackView track={info.track as Track} out rate={r} compact /></div>
      ) : (
        <>
      {/* the ground from above, with the pitch down the middle */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 55%, #1e7a44, #0f3d24 75%)' }} />
      <div className="absolute left-1/2 top-[16%] h-[60%] w-[9%] -translate-x-1/2 rounded bg-gradient-to-r from-[#bf9a5f] via-[#d7b87c] to-[#bf9a5f]" />
      {[21, 73].map((y) => <div key={y} className="absolute left-[44%] right-[44%] h-px bg-white/70" style={{ top: `${y}%` }} />)}
      <Stumps x={STUMPS_BOWL.x} y={STUMPS_BOWL.y - 1} fly={false} at={0} rate={r} />
      <Stumps x={STUMPS_BAT.x} y={STUMPS_BAT.y + 1} fly={stumpsFly} at={kind === 'run out' ? 2.1 : kind === 'stumped' ? 1.8 : T.hit} rate={r} />
        </>
      )}

      {/* the replay tag */}
      <div className="absolute left-3 top-3 z-30 flex items-center gap-2 rounded-lg bg-black/70 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-widest text-red-300"><span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />Wicket replay</div>
      <div className="absolute right-3 top-3 z-30 rounded-full bg-black/50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-300">{info.details ? 'Tap to continue' : 'Tap to skip'}</div>

      {/* who is out: his picture and full name, his innings, and how he got out */}
      {card && (
        <motion.div
          className="absolute left-1/2 top-2 z-30 flex max-w-[60%] items-center gap-2.5 rounded-xl bg-black/75 p-2 pr-3 ring-1 ring-red-400/40"
          style={{ x: '-50%' }} initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.35 }}
        >
          <span className="shrink-0 rounded-full leading-[0]" style={{ boxShadow: `0 0 0 2px ${accentOf(batTeam)}` }}><PlayerAvatar player={batsman} team={batTeam} size={Math.max(38, Math.min(w * 0.08, 56))} /></span>
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-x-2 text-sm font-extrabold leading-tight text-white">{batsman.name}{card.duck && <span className="-rotate-6 rounded border-2 border-red-400 px-1.5 font-display text-xs tracking-widest text-red-300">DUCK</span>}</span>
            <span className="block text-xs font-bold leading-tight text-red-300">{card.lines[1]}</span>
            <span className="block text-[11px] leading-tight text-slate-300">{card.lines[0]}</span>
          </span>
        </motion.div>
      )}
      {!tracked && (
        <>
      {/* the ball */}
      <motion.span
        className="absolute z-30 block h-3.5 w-3.5 rounded-full border-2 border-red-200 bg-red-500 shadow-[0_0_10px_#ef4444]"
        style={{ left: '50%', top: '24%', translateX: '-50%', translateY: '-50%' }}
        initial={{ opacity: 0 }}
        animate={{ left: ball.x.map((v) => `${v}%`), top: ball.y.map((v) => `${v}%`), scale: ball.s, opacity: 1 }}
        transition={{ delay: T.run * r, duration: ball.dur * r * 0.6, times: ball.times, ease: 'easeIn' }}
      />

      {/* the bowler runs in, delivers, and celebrates (or runs to the man who caught it) */}
      <Actor
        player={bowler} team={bowlTeam} size={size} tag="Bowler" from={{ x: 50, y: 15 }}
        path={kind === 'caught' && fielder ? [{ x: 50, y: 15 }, { x: 50, y: 18 }, { x: 50, y: 18 }, { x: F.x + (50 - F.x) * 0.25, y: F.y - 4 }] : [{ x: 50, y: 15 }, { x: 50, y: 18 }]}
        times={kind === 'caught' && fielder ? [0, 0.25, 0.6, 1] : [0, 1]} dur={kind === 'caught' && fielder ? 3.6 * r : 0.9 * r}
        jump={(kind === 'caught' && fielder ? 3.2 : T.big) * r}
      />
      {/* the batsman, then the moment he is out */}
      <Actor
        player={batsman} team={batTeam} size={size} tag="Out" note={score} from={{ x: 50, y: 60 }}
        path={kind === 'run out' ? [{ x: 50, y: 60 }, { x: 50, y: 48 }, { x: 50, y: 36 }] : kind === 'stumped' ? [{ x: 50, y: 60 }, { x: 52, y: 52 }] : undefined}
        times={kind === 'run out' ? [0, 0.4, 1] : kind === 'stumped' ? [0, 1] : undefined} dur={kind === 'run out' ? 2.2 * r : kind === 'stumped' ? 1.4 * r : 0.1}
      />
      {/* the fielder or keeper who made it happen */}
      {fielder && (kind === 'caught' || kind === 'run out' || kind === 'stumped') && (
        <Actor
          player={fielder} team={bowlTeam} size={size} tag={kind === 'stumped' ? 'Keeper' : 'Fielder'}
          from={kind === 'stumped' ? keeper : { x: F.x < 50 ? F.x - 6 : F.x + 6, y: F.y + 8 }}
          path={kind === 'stumped' ? undefined : [{ x: F.x < 50 ? F.x - 6 : F.x + 6, y: F.y + 8 }, { x: F.x, y: F.y }]} times={kind === 'stumped' ? undefined : [0, 1]} dur={kind === 'stumped' ? 0.1 : (kind === 'caught' ? 1.9 : 1.1) * r}
          jump={(kind === 'caught' ? 2.4 : kind === 'run out' ? 2.3 : 2.0) * r}
        />
      )}
        </>
      )}

      {/* the umpire, for an lbw: the finger goes up */}
      {kind === 'lbw' && (
        <motion.div className="absolute z-20 text-center" style={tracked ? { right: '4%', top: '38%' } : { left: '66%', top: '40%' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: (tracked ? 3.0 : 1.6) * r }}>
          <motion.div animate={{ y: [14, 0], rotate: [0, -8, 0], scale: [0.6, 1.4, 1.2] }} transition={{ delay: (tracked ? 3.4 : 2.1) * r, duration: 0.6 }} className="text-5xl">☝️</motion.div>
          <span className="rounded bg-black/70 px-1.5 text-[11px] font-bold uppercase tracking-wider text-white">Umpire</span>
        </motion.div>
      )}

      {/* a stumping: a close-up in slow motion on the gloves and the bails */}
      {(kind === 'stumped' || kind === 'bowled') && (() => {
        const lens = Math.max(96, Math.min(w * 0.36, 160))
        const at = (T.big + 0.15) * r
        const bowled = kind === 'bowled'
        return (
          <motion.div
            className="pointer-events-none absolute left-1/2 top-[40%] z-[35] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border-4 border-amber-300 shadow-[0_0_40px_#fbbf24aa]"
            style={{ width: lens, height: lens, background: 'radial-gradient(circle at 50% 60%, #3a2c10, #0b0907)' }}
            initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 1, 1, 0.9], opacity: [0, 1, 1, 0] }} transition={{ delay: at, duration: 2.6 * r, times: [0, 0.15, 0.8, 1] }}
          >
            <div className="absolute inset-x-0 bottom-[22%] flex justify-center gap-[8%]">
              {[0, 1, 2].map((i) => <span key={i} className="block rounded-full bg-amber-100" style={{ width: lens * 0.05, height: lens * 0.42 }} />)}
            </div>
            {[-1, 1].map((d) => (
              <motion.span key={d} className="absolute left-1/2 block rounded-full bg-amber-400" style={{ width: lens * 0.2, height: lens * 0.04, top: '36%' }}
                animate={{ x: [0, d * lens * 0.28], y: [0, -lens * 0.22, lens * 0.1], rotate: [0, d * 220], opacity: [1, 1, 0.8] }} transition={{ delay: at + 0.25 * r, duration: 1.6 * r, ease: 'easeOut' }} />
            ))}
            {bowled
              ? <motion.span className="absolute left-[8%] top-[20%] block h-[12%] w-[12%] rounded-full border-2 border-red-200 bg-red-500" aria-hidden initial={{ x: 0, y: 0 }} animate={{ x: lens * 0.38, y: lens * 0.42 }} transition={{ delay: at, duration: 0.6 * r, ease: 'easeIn' }} />
              : <motion.span className="absolute left-[10%] top-[58%] block select-none" style={{ fontSize: lens * 0.3 }} aria-hidden animate={{ x: [0, lens * 0.18] }} transition={{ delay: at, duration: 0.5 * r }}>🧤</motion.span>}
            <span className="absolute inset-x-0 top-[8%] text-center text-[10px] font-extrabold uppercase tracking-widest text-amber-200">Slow motion</span>
          </motion.div>
        )
      })()}

      {/* the word, slamming in as it happens */}
      <motion.div
        className="absolute inset-x-0 bottom-[2%] z-40 text-center"
        initial={{ opacity: 0, scale: 2.2 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: T.big * r, type: 'spring', stiffness: 260, damping: 15 }}
      >
        <div className="font-display leading-none tracking-wide text-white" style={{ fontSize: Math.max(30, Math.min(w * 0.095, 70)), WebkitTextStroke: '2px #7f1d1d', paintOrder: 'stroke fill', textShadow: '0 0 30px #ef4444aa' }}>{TITLE[kind]}</div>
        <div className="mt-1 text-sm font-semibold text-slate-100" style={{ textShadow: '0 1px 4px #000' }}>{sub}</div>

      </motion.div>
    </div>
  )
}
