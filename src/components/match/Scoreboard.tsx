import type { Match } from '../../engine/match'
import { FORMATS } from '../../engine/types'
import { motion } from 'framer-motion'
import { TeamCrest, accentOf } from '../ui'
import { parRunsPerOver } from '../../engine/model'
import { DIFFICULTIES, type Difficulty } from '../../engine/types'
import { oversText, runRate } from './format'

const LEVEL_COLOR: Record<Difficulty, string> = { easy: '#34d399', normal: '#38bdf8', hard: '#fbbf24', legend: '#fb7185' }

/** Marks which team is yours and which the computer's, in career mode. */
function Who({ side, you }: { side: 0 | 1; you: 0 | 1 | null | undefined }) {
  if (you === null || you === undefined) return null
  return side === you
    ? <span className="ml-1.5 rounded bg-amber-400 px-1.5 py-px align-middle text-[9px] font-extrabold tracking-wider text-black">YOU</span>
    : <span className="ml-1.5 rounded bg-slate-500 px-1.5 py-px align-middle text-[9px] font-extrabold tracking-wider text-white">CPU</span>
}

/**
 * Where the innings is heading if the batting side keeps going at the current rate. In the first
 * couple of overs the rate is mostly noise, so it leans on a normal rate for the format until
 * there is enough to go on. Wickets already lost don't change it; it's a simple, readable guide.
 */
export function projectedScore(runs: number, legalBalls: number, totalBalls: number, parPerOver: number): number {
  const left = totalBalls - legalBalls
  if (left <= 0) return runs
  const sample = Math.min(legalBalls / 18, 1) // 0 at the start, fully trusted after 3 overs
  const rate = legalBalls > 0 ? sample * (runs / legalBalls) * 6 + (1 - sample) * parPerOver : parPerOver
  return Math.round(runs + (rate * left) / 6)
}

/** The broadcast-style header: batting score, progress through the innings, and the target. */
export function Scoreboard({ match, you, difficulty }: { match: Match; you?: 0 | 1 | null; difficulty?: Difficulty | null }) {
  const inn = match.current
  const bat = match.battingSide()
  const bowl = match.bowlingSide()
  const cfg = FORMATS[match.format]
  const total = cfg.overs * 6
  const rrr = match.requiredRate()
  const first = match.innings[0]
  const ballsLeft = total - inn.legalBalls
  const projected = projectedScore(inn.runs, inn.legalBalls, total, parRunsPerOver(match.format, 'middle'))
  const pp = cfg.phases.powerplay[1] + 1
  const death = cfg.phases.death[0]

  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-panel">
      <div className="pointer-events-none absolute inset-0 opacity-30" style={{ background: `linear-gradient(100deg, ${bat.team.colors.primary}, transparent 55%)` }} />
      <div className="relative grid items-center gap-3 p-3 md:grid-cols-[1.3fr_1fr_1.3fr] md:px-5 md:py-2.5">
        <div className="flex items-center gap-4">
          <TeamCrest team={bat.team} size={56} />
          <div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-slate-300">{inn.index === 0 ? '1st innings' : '2nd innings'} · {match.format.toUpperCase()} · batting</div>
            <div className="font-display text-5xl leading-none" style={{ color: accentOf(bat.team) }}>
              <motion.span key={`${inn.runs}-${inn.wickets}`} className="inline-block" initial={{ scale: 1.25, filter: 'brightness(1.8)' }} animate={{ scale: 1, filter: 'brightness(1)' }} transition={{ duration: 0.35 }}>{inn.runs}<span className="text-slate-500">/</span>{inn.wickets}</motion.span>
            </div>
            <div className="text-sm font-semibold text-white">{bat.team.name}<Who side={inn.battingSide} you={you} /> <span className="font-normal text-slate-400">· {bat.team.series}</span></div>
          </div>
        </div>

        <div className="text-center">
          <div className="font-display text-3xl leading-none text-white">{oversText(inn.legalBalls)}<span className="text-lg text-slate-400"> / {cfg.overs} overs</span></div>
          <div className="mt-0.5 text-sm text-slate-300">
            Run rate <b className="text-white">{runRate(inn)}</b>
            <span className="mx-2 text-slate-500">·</span>
            <span title="Where the innings ends up if they keep scoring at the current rate">Projected <b className={projected !== null && inn.target !== null ? (projected >= inn.target ? 'text-emerald-300' : 'text-red-300') : 'text-white'}>{projected}</b></span>
          </div>
          <div className="relative mx-auto mt-1.5 h-2 max-w-xs overflow-hidden rounded-full bg-white/10" title="Progress through the innings">
            <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(inn.legalBalls / total) * 100}%`, background: accentOf(bat.team) }} />
            <div className="absolute inset-y-0 w-px bg-white/60" style={{ left: `${((pp * 6) / total) * 100}%` }} />
            <div className="absolute inset-y-0 w-px bg-white/60" style={{ left: `${((death * 6) / total) * 100}%` }} />
          </div>
          <div className="mx-auto mt-1 flex max-w-xs justify-between text-[10px] uppercase tracking-wider text-slate-400"><span>Powerplay</span><span>Middle</span><span>Death</span></div>
          {difficulty && you !== null && you !== undefined && <div className="mt-1.5 inline-block rounded px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider" style={{ background: `${LEVEL_COLOR[difficulty]}26`, color: LEVEL_COLOR[difficulty] }} title="The difficulty you chose for this career">{DIFFICULTIES[difficulty].label} difficulty</div>}
          {inn.freeHit && <div className="mt-2 inline-block rounded bg-amber-400 px-2 py-0.5 text-xs font-extrabold text-black">FREE HIT NEXT</div>}
        </div>

        <div className="text-right">
          {inn.target !== null ? (
            <>
              <div className="text-[11px] font-bold uppercase tracking-widest text-slate-300">Target {inn.target}</div>
              <div className="text-xl font-bold leading-tight text-white">Need {Math.max(inn.target - inn.runs, 0)} off {ballsLeft}</div>
              <div className="text-sm text-slate-300">Required rate <b className="text-white">{rrr !== null ? rrr.toFixed(2) : '-'}</b></div>
              <div className="mt-0.5 text-xs text-slate-400">{bowl.team.name} made {first.runs}/{first.wickets} in {oversText(first.legalBalls)}</div>
            </>
          ) : (
            <div className="flex items-center justify-end gap-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-slate-300">Bowling</div>
                <div className="text-lg font-bold text-white">{bowl.team.name}<Who side={(1 - inn.battingSide) as 0 | 1} you={you} /></div>
                <div className="text-xs text-slate-400">{bowl.team.series}</div>
                <div className="text-sm text-slate-400">Setting a target</div>
              </div>
              <TeamCrest team={bowl.team} size={44} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
