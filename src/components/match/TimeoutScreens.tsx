import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { startMusic } from '../../audio/music'
import type { BallEvent } from '../../engine/types'
import type { Player, Team } from '../../types'
import { OriginTag, PlayerAvatar, accentOf } from '../ui'
import { Stage, type Placed } from './Stage'

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

// ---- A partnership of 50, 100... --------------------------------------------------------------------------------

export interface PartnershipInfo {
  a: Player; b: Player; team: Team
  /** The mark passed: 50, 100... */
  mark: number
  runs: number; balls: number
  aRuns: number; aBalls: number; bRuns: number; bBalls: number
  rate: number
}

/** Two batsmen together: they walk toward each other and clasp hands, then the stand's size slams in with who made what. Click to skip. */
export function PartnershipScreen({ info }: { info: PartnershipInfo }) {
  const { a, b, team, mark, runs, balls, aRuns, aBalls, bRuns, bBalls, rate: r } = info
  const [box, w] = useWidth()
  const size = Math.max(40, Math.min(w * 0.13, 68))
  const total = Math.max(1, aRuns + bRuns)
  const aShare = Math.round((aRuns / total) * 100)
  const accent = accentOf(team)
  const word = mark >= 100 ? `${mark} STAND!` : `${mark} PARTNERSHIP!`
  return (
    <div ref={box} className="absolute inset-0 overflow-hidden rounded-2xl" aria-label={`${mark} partnership`}>
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 40%, #1e7a44, #0f3d24 78%)' }} />
      <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 50% 30%, ${accent}44, transparent 62%)` }} />
      <div className="absolute left-3 top-3 z-30 flex items-center gap-2 rounded-lg bg-black/70 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-widest text-emerald-300"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />Partnership</div>
      <div className="absolute right-3 top-3 z-30 rounded-full bg-black/50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-300">Tap to skip</div>

      {/* the two walk together */}
      {[[a, -1], [b, 1]].map(([p, side]) => (
        <motion.div key={(p as Player).id} className="absolute z-20 -translate-x-1/2 text-center" style={{ top: '14%' }}
          initial={{ left: `${50 + (side as number) * 42}%`, opacity: 0 }} animate={{ left: `${50 + (side as number) * 13}%`, opacity: 1 }} transition={{ duration: 1.3 * r, ease: 'easeOut' }}>
          <div className="mx-auto inline-block rounded-full leading-[0]" style={{ boxShadow: `0 0 0 3px ${accent}, 0 0 20px ${accent}88` }}><PlayerAvatar player={p as Player} team={team} size={size} /></div>
          <div className="mx-auto mt-1 max-w-[120px] truncate rounded bg-black/70 px-1.5 text-[11px] font-semibold text-white">{(p as Player).name}</div>
          <div className="text-[11px] font-extrabold text-amber-200">{p === a ? `${aRuns} (${aBalls})` : `${bRuns} (${bBalls})`}</div>
        </motion.div>
      ))}
      <motion.span className="absolute left-1/2 z-30 -translate-x-1/2 select-none" style={{ top: '17%', fontSize: size * 0.6 }} aria-hidden initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 1.5, 1], opacity: 1 }} transition={{ delay: 1.2 * r, duration: 0.5 * r }}>🤝</motion.span>

      <motion.div className="absolute inset-x-0 bottom-[3%] z-40 px-3 text-center" initial={{ opacity: 0, scale: 2.2 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.5 * r, type: 'spring', stiffness: 260, damping: 15 }}>
        <div className="font-display leading-none tracking-wide text-white" style={{ fontSize: Math.max(32, Math.min(w * 0.1, 76)), WebkitTextStroke: '2px #052e16', paintOrder: 'stroke fill', textShadow: '0 0 30px #34d399aa' }}>{word}</div>
        <div className="mt-0.5 text-sm font-semibold text-slate-100" style={{ textShadow: '0 1px 4px #000' }}>{runs} runs off {balls} balls</div>
        {/* who made what */}
        <div className="mx-auto mt-1.5 flex h-2 max-w-xs overflow-hidden rounded-full bg-black/50" aria-hidden>
          <motion.div className="h-full" style={{ background: '#fbbf24' }} initial={{ width: 0 }} animate={{ width: `${aShare}%` }} transition={{ delay: 1.9 * r, duration: 0.7 * r }} />
          <div className="h-full flex-1" style={{ background: '#38bdf8' }} />
        </div>
        <div className="mx-auto mt-0.5 flex max-w-xs justify-between text-[11px] font-bold"><span className="text-amber-300">{a.name.split(' ')[0]} {aRuns}</span><span className="text-sky-300">{bRuns} {b.name.split(' ')[0]}</span></div>
      </motion.div>
    </div>
  )
}

// ---- The strategic timeout: a TV screen for 30 seconds ----------------------------------------------------------

export interface TimeoutChannel {
  /** The small label on the TV: HIGHLIGHT, THE INNINGS SO FAR... */
  tag: string
  title: string
  big?: string
  lines: string[]
  players?: { player: Player; team: Team; label?: string }[]
}

/** Real footage: balls from an earlier match played again on the real field view, small, on the TV. */
export interface TimeoutReel {
  player: Player; team: Team; kind: 'bat' | 'bowl'
  /** "112 (58)" or "5/23", and "Soul Reapers v Hidden Leaf · 3 Jan 2026". */
  headline: string; versus: string
  /** How that match ended: "Soul Reapers won by 5 wickets (11 balls left)". */
  result?: string
  balls: BallEvent[]
  /** The batting team's score as each ball was bowled in that match (for the little scoreboard), and its short name. */
  scores?: { runs: number; wickets: number; balls: number }[]
  teamShort?: string
  /** A commentator who introduces the clip in a text bubble. */
  commentator?: { player: Player; team: Team }
  striker: Player; nonStriker: Player | null; bowler: Player
  battingTeam: Team; bowlingTeam: Team; fielders: Placed[]
}

const captionOf = (b: BallEvent) => (b.wicket ? 'WICKET!' : b.boundary === 6 ? 'SIX!' : b.boundary === 4 ? 'FOUR!' : b.runsBat >= 2 ? `${b.runsBat} RUNS` : 'DOT BALL')

export interface TimeoutInfo {
  /** The highlight reel, played for the first two thirds of the timeout (none in a first game or when no match has a saved reel yet). */
  reel?: TimeoutReel
  /** "After 7 overs: 54/2". */
  headline: string
  teamNames: [string, string]
  channels: TimeoutChannel[]
  /** How long it lasts, in seconds (30 at normal speed, shorter when auto-play is fast). */
  seconds: number
  rate: number
}

/** Both teams talk tactics while a TV shows a highlight from an earlier match (or, early on, stats and fun facts). Click to carry on. */
export function TimeoutScreen({ info }: { info: TimeoutInfo }) {
  const { headline, teamNames, channels, seconds } = info
  const [box, w] = useWidth()
  const [elapsed, setElapsed] = useState(0)
  const [tune, setTune] = useState('')
  // music for the timeout: one of a few tunes, a different one each time, fading out when it ends or the screen is closed
  useEffect(() => {
    const m = startMusic(seconds)
    setTune(m.name)
    return m.stop
  }, [seconds])
  useEffect(() => {
    const t0 = Date.now()
    const id = window.setInterval(() => setElapsed((Date.now() - t0) / 1000), 250)
    return () => window.clearInterval(id)
  }, [])
  const reel = info.reel
  const reelSecs = reel && reel.balls.length ? Math.round((seconds * 2) / 3) : 0
  const inReel = !!reel && elapsed < reelSecs
  const clipDwell = reel ? reelSecs / Math.max(1, reel.balls.length) : 1
  const clip = reel ? Math.min(reel.balls.length - 1, Math.floor(elapsed / clipDwell)) : 0
  const rest = Math.max(1, seconds - reelSecs)
  const dwell = rest / Math.max(1, channels.length)
  const idx = Math.min(channels.length - 1, Math.max(0, Math.floor((elapsed - reelSecs) / dwell)))
  const ch = channels[idx]
  const left = Math.max(0, Math.ceil(seconds - elapsed))
  const small = w < 520
  return (
    <div ref={box} className="absolute inset-0 overflow-hidden rounded-2xl" aria-label="Strategic timeout" style={{ background: 'linear-gradient(160deg,#10151f,#05070b)' }}>
      {/* the two teams in a huddle, along the top */}
      <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between bg-black/60 px-3 py-1.5">
        <span className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-amber-300"><span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />Strategic timeout</span>
        {tune && <span className="hidden rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-bold text-slate-300 sm:inline">♪ {tune}</span>}
        <span className="font-display text-xl leading-none tabular-nums text-white" aria-label="Seconds left">0:{String(left).padStart(2, '0')}</span>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-300">{small ? 'Tap' : 'Tap to carry on'}</span>
      </div>
      {/* the TV */}
      <div className={`absolute inset-x-[5%] top-[14%] overflow-hidden rounded-xl border-2 border-slate-500/70 bg-black shadow-[0_0_30px_#38bdf844] ${inReel && reel?.commentator ? 'bottom-[31%]' : 'bottom-[15%]'}`}>
        {inReel && reel && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black" aria-label="Highlight reel">
            <div className="relative h-full" style={{ aspectRatio: '16 / 10' }}>
              <Stage
                event={reel.balls[clip]} overEvents={[]} striker={reel.striker} nonStriker={reel.nonStriker} bowler={reel.bowler}
                battingTeam={reel.battingTeam} bowlingTeam={reel.bowlingTeam} fielders={reel.fielders}
              />
            </div>
            {/* the score as it was at this moment of that game, on an old TV scoreboard */}
            {reel.scores?.[clip] && (
              <div key={`sc${clip}`} className="pointer-events-none absolute left-1.5 top-1.5 z-30 rounded border border-amber-300/50 bg-black/80 px-1.5 py-0.5 font-mono leading-tight text-amber-300" style={{ textShadow: '0 0 6px #fbbf2488' }}>
                <div className="text-[11px] font-extrabold tracking-wider">{reel.teamShort ?? reel.battingTeam.short} {reel.scores[clip].runs}/{reel.scores[clip].wickets}</div>
                <div className="text-[10px] font-bold text-amber-200/90">Over {Math.floor(reel.scores[clip].balls / 6)}.{reel.scores[clip].balls % 6}</div>
              </div>
            )}
            <motion.div key={`cap${clip}`} className="pointer-events-none absolute bottom-1.5 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/80 px-3 py-0.5 font-display text-lg leading-none tracking-wide text-amber-300 ring-1 ring-amber-300/60" initial={{ opacity: 0, scale: 1.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5, type: 'spring', stiffness: 300, damping: 15 }}>{captionOf(reel.balls[clip])}</motion.div>
            <div className="pointer-events-none absolute bottom-1.5 left-1.5 z-30 max-w-[42%] truncate rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">{reel.player.name} <span className="text-amber-300">{reel.headline}</span></div>
          </div>
        )}
        <motion.div key={idx} className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 px-3 pt-3 text-center" style={{ background: 'radial-gradient(ellipse at 50% 35%, #12385d, #060b14 85%)' }} initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: [0, 1, 0.92, 1], scale: 1 }} transition={{ duration: 0.5 }}>
          <div className="rounded bg-sky-500 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.2em] text-white">{ch.tag}</div>
          {ch.players && ch.players.length > 0 && (
            <div className="flex items-center justify-center gap-3">
              {ch.players.map((p) => (
                <div key={p.player.id} className="text-center">
                  <div className="mx-auto inline-block rounded-full leading-[0]" style={{ boxShadow: `0 0 0 3px ${accentOf(p.team)}, 0 0 18px ${accentOf(p.team)}88` }}><PlayerAvatar player={p.player} team={p.team} size={Math.max(34, Math.min(w * 0.095, 60))} /></div>
                  {p.label && <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-300">{p.label}</div>}
                  {ch.players!.length > 1 && <div className="max-w-[110px] truncate text-[11px] font-semibold text-white">{p.player.name}</div>}
                </div>
              ))}
            </div>
          )}
          <div className="max-w-full truncate text-sm font-bold text-white">{ch.title}</div>
          {ch.big && <div className="font-display leading-none tracking-wide text-amber-300" style={{ fontSize: Math.max(26, Math.min(w * 0.085, 56)), textShadow: '0 0 24px #fbbf2488' }}>{ch.big}</div>}
          <div className="space-y-0.5">{ch.lines.map((l, i) => <div key={i} className="text-xs leading-tight text-slate-300">{l}</div>)}</div>
          {ch.players?.length === 1 && !small && <div className="text-[11px]"><OriginTag playerId={ch.players[0].player.id} /></div>}
        </motion.div>
        <div className="pointer-events-none absolute inset-0 opacity-[0.09]" style={{ background: 'repeating-linear-gradient(0deg, #fff 0 1px, transparent 1px 3px)' }} />
      </div>
      {/* a commentator says what this highlight is about */}
      {inReel && reel?.commentator && (() => {
        const c = reel.commentator
        const opp = reel.team.id === reel.battingTeam.id ? reel.bowlingTeam : reel.battingTeam
        const text = reel.kind === 'bat'
          ? `Remember this? ${reel.player.name} for ${reel.team.name}, ${reel.headline} against ${opp.name}.${reel.result ? ` ${reel.result}.` : ''}`
          : `Look at this spell from ${reel.player.name} of ${reel.team.name}: ${reel.headline} against ${opp.name}.${reel.result ? ` ${reel.result}.` : ''}`
        return (
          <div key="commentator" className="absolute inset-x-[5%] bottom-[15.5%] z-20 flex items-center gap-2">
            <div className="shrink-0 rounded-full leading-[0]" style={{ boxShadow: `0 0 0 2px ${accentOf(c.team)}` }}><PlayerAvatar player={c.player} team={c.team} size={34} /></div>
            <div className="relative min-w-0 flex-1 rounded-xl border border-sky-400/60 bg-black/80 px-2 py-1 text-[11px] leading-tight text-white">
              <span className="absolute -left-1 top-3 h-2 w-2 rotate-45 border-b border-l border-sky-400/60 bg-black" />
              <span className="font-bold text-sky-300">{c.player.name.split(' ')[0]}: </span>{text}
            </div>
          </div>
        )
      })()}
      {/* the progress of the 30 seconds, and the teams */}
      <div className="absolute inset-x-[5%] bottom-[9%] z-20 h-1.5 overflow-hidden rounded-full bg-white/15">
        <motion.div className="h-full rounded-full bg-amber-400" initial={{ width: '100%' }} animate={{ width: '0%' }} transition={{ duration: seconds, ease: 'linear' }} />
      </div>
      <div className="absolute inset-x-0 bottom-1.5 z-20 truncate px-3 text-center text-[11px] font-semibold text-slate-300">{headline} · <span className="text-slate-400">{teamNames[0]} v {teamNames[1]}</span></div>
    </div>
  )
}
