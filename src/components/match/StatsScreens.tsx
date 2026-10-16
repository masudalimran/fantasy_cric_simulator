import { motion } from 'framer-motion'
import type { BallEvent } from '../../engine/types'
import { eventAngle } from '../../engine/shots'
import type { Player, Team } from '../../types'
import { PlayerAvatar, accentOf } from '../ui'

/**
 * Screens that put the numbers of the match on the field for a few seconds, now and then: a wagon wheel, a run-rate worm, the runs of each
 * over as bars, and how the runs have been scored. They only read the ball log: nothing in the match changes.
 */
export interface StatsInfo {
  team: Team
  /** The balls of the innings so far. */
  log: BallEvent[]
  /** For the worm of a chase or a reply: the balls of the other innings. */
  other?: BallEvent[]
  /** For the wagon wheel: whose shots. */
  batsman?: Player
  /** Words for the headline. */
  title: string
  rate: number
}

const COLOR: Record<number, string> = { 1: '#e2e8f0', 2: '#a5f3fc', 3: '#a5b4fc', 4: '#38bdf8', 6: '#f472b6' }

/** A dark card behind the chart with a headline and a line of small print. */
function Card({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 flex flex-col bg-[#070b14] p-3 pt-10">
      <div className="mb-1 min-w-0">
        <div className="truncate font-display text-2xl leading-none tracking-wide text-white">{title}</div>
        {sub && <div className="truncate text-[11px] text-slate-400">{sub}</div>}
      </div>
      <div className="relative min-h-0 flex-1">{children}</div>
    </div>
  )
}

// ---- Wagon wheel ----------------------------------------------------------------------------------------------------

/** Where the ball went from the bat: one line for every scoring shot of the innings (or of one batsman), drawn one after another. */
export function WagonScreen({ info }: { info: StatsInfo }) {
  const { log, batsman, team, rate: r } = info
  const mine = log.filter((e) => e.runsBat > 0 && (!batsman || e.strikerId === batsman.id))
  const accent = accentOf(team)
  const fours = mine.filter((e) => e.boundary === 4).length
  const sixes = mine.filter((e) => e.boundary === 6).length
  const runs = mine.reduce((s, e) => s + e.runsBat, 0)
  const dur = Math.min(0.09, 2.6 / Math.max(1, mine.length))
  return (
    <Card title={batsman ? `${batsman.name}'s wagon wheel` : `${team.short} wagon wheel`} sub={`${runs} runs · ${fours} fours · ${sixes} sixes`}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full">
        <ellipse cx="50" cy="50" rx="46" ry="46" fill="#14532d" stroke="#fff" strokeOpacity="0.6" strokeWidth="0.8" />
        <ellipse cx="50" cy="50" rx="23" ry="23" fill="none" stroke="#fff" strokeOpacity="0.25" strokeWidth="0.5" strokeDasharray="1.5 1.5" />
        <rect x="47.600" y="40" width="4.800" height="20" rx="0.8" fill="#cdb078" opacity="0.85" />
        {mine.map((e, i) => {
          const a = eventAngle(e)
          const len = e.boundary ? 46 : 12 + e.runsBat * 8 + ((e.seq * 7) % 5)
          const x = 50 + Math.cos(a) * len, y = 50 + Math.sin(a) * len
          return (
            <motion.line
              key={e.seq} x1="50" y1="50" x2={x} y2={y} stroke={COLOR[e.runsBat] ?? '#e2e8f0'} strokeWidth={e.boundary ? 1.1 : 0.6} strokeLinecap="round" opacity="0.9"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: (0.3 + i * dur) * r, duration: 0.25 * r }}
            />
          )
        })}
        <circle cx="50" cy="50" r="1.6" fill={accent} />
      </svg>
      <div className="absolute bottom-0 left-0 flex gap-2 text-[10px] font-semibold text-slate-300">
        {[[1, '1'], [2, '2'], [3, '3'], [4, '4'], [6, '6']].map(([k, l]) => <span key={l} className="flex items-center gap-1"><i className="h-1 w-3 rounded" style={{ background: COLOR[k as number] }} />{l}</span>)}
      </div>
    </Card>
  )
}

// ---- Worm -----------------------------------------------------------------------------------------------------------

/** Runs against balls (as overs) for the innings, drawn as a line with a dot for every wicket. A reply or a chase is drawn against the other innings. */
export function WormScreen({ info }: { info: StatsInfo }) {
  const { log, other, team, rate: r } = info
  const accent = accentOf(team)
  const series = (l: BallEvent[]) => [{ x: 0, y: 0, w: false }, ...l.filter((e) => e.legal || e.wicket).map((e) => ({ x: e.score.legalBalls / 6, y: e.score.runs, w: !!e.wicket }))]
  const a = series(log)
  const b = other ? series(other) : []
  const maxX = Math.max(1, ...a.map((p) => p.x), ...b.map((p) => p.x))
  const maxY = Math.max(10, ...a.map((p) => p.y), ...b.map((p) => p.y))
  const px = (x: number) => 6 + (x / maxX) * 90
  const py = (y: number) => 92 - (y / maxY) * 84
  const path = (s: typeof a) => s.map((p, i) => `${i ? 'L' : 'M'} ${px(p.x).toFixed(2)} ${py(p.y).toFixed(2)}`).join(' ')
  const last = log[log.length - 1]
  const rr = last ? ((last.score.runs / Math.max(1, last.score.legalBalls)) * 6).toFixed(2) : '0.00'
  return (
    <Card title="The worm" sub={`${last?.score.runs ?? 0}/${last?.score.wickets ?? 0} after ${Math.floor((last?.score.legalBalls ?? 0) / 6)} overs · run rate ${rr}`}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        {[0.25, 0.5, 0.75].map((g) => <line key={g} x1="6" x2="96" y1={py(maxY * g)} y2={py(maxY * g)} stroke="#334155" strokeWidth="0.3" strokeDasharray="1.5 1.5" />)}
        <line x1="6" x2="96" y1="92" y2="92" stroke="#64748b" strokeWidth="0.4" />
        {b.length > 1 && <motion.path d={path(b)} fill="none" stroke="#94a3b8" strokeWidth="0.9" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.2 * r, duration: 1.8 * r }} />}
        <motion.path d={path(a)} fill="none" stroke={accent} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.5 * r, duration: 2.2 * r }} />
        {a.filter((p) => p.w).map((p, i) => <motion.circle key={i} cx={px(p.x)} cy={py(p.y)} r="1.4" fill="#f87171" stroke="#fff" strokeWidth="0.3" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: (0.5 + 2.2 * (p.x / maxX)) * r }} />)}
      </svg>
      <div className="absolute bottom-0 right-0 flex gap-3 text-[10px] font-semibold text-slate-300">
        <span className="flex items-center gap-1"><i className="h-1 w-3 rounded" style={{ background: accent }} />{team.short}</span>
        {b.length > 1 && <span className="flex items-center gap-1"><i className="h-1 w-3 rounded bg-slate-400" />Other innings</span>}
        <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-red-400" />Wicket</span>
      </div>
    </Card>
  )
}

// ---- Manhattan ------------------------------------------------------------------------------------------------------

/** The runs of every over as a bar, with a red cap for each wicket in it. */
export function ManhattanScreen({ info }: { info: StatsInfo }) {
  const { log, team, rate: r } = info
  const accent = accentOf(team)
  const overs = new Map<number, { runs: number; wk: number }>()
  for (const e of log) { const o = overs.get(e.over) ?? { runs: 0, wk: 0 }; o.runs += e.total; if (e.wicket) o.wk++; overs.set(e.over, o) }
  // a long innings (a Test) shows its latest 30 overs
  const keys = [...overs.keys()].sort((x, y) => x - y).slice(-30)
  const max = Math.max(6, ...keys.map((k) => overs.get(k)!.runs))
  const best = keys.reduce((b, k) => (overs.get(k)!.runs > (overs.get(b)?.runs ?? -1) ? k : b), keys[0])
  return (
    <Card title="Run by run, over by over" sub={keys.length ? `Best over: ${overs.get(best)!.runs} runs (over ${best + 1})` : ''}>
      <div className="absolute inset-0 flex items-end gap-[2px] pb-4">
        {keys.map((k, i) => {
          const o = overs.get(k)!
          return (
            <div key={k} className="relative flex h-full min-w-0 flex-1 flex-col justify-end">
              <motion.div className="relative w-full rounded-t" style={{ background: o.runs >= 12 ? '#f472b6' : accent }} initial={{ height: 0 }} animate={{ height: `${(o.runs / max) * 86}%` }} transition={{ delay: (0.2 + i * 0.06) * r, duration: 0.45 * r, ease: 'easeOut' }}>
                {o.wk > 0 && <span className="absolute -top-1.5 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full border border-white bg-red-500" />}
              </motion.div>
              <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] text-slate-500">{k + 1}</span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ---- How the runs came ----------------------------------------------------------------------------------------------

/** The innings so far split into dots, singles, twos, threes, fours and sixes, as bars that fill. */
export function ScoringScreen({ info }: { info: StatsInfo }) {
  const { log, team, rate: r } = info
  const legal = log.filter((e) => e.legal && !e.wicket)
  const n = Math.max(1, legal.length)
  const rows: [string, number, string][] = [
    ['Dots', legal.filter((e) => e.total === 0).length, '#64748b'],
    ['Singles', legal.filter((e) => e.runsBat === 1).length, COLOR[1]],
    ['Twos', legal.filter((e) => e.runsBat === 2).length, COLOR[2]],
    ['Threes', legal.filter((e) => e.runsBat === 3).length, COLOR[3]],
    ['Fours', legal.filter((e) => e.boundary === 4).length, COLOR[4]],
    ['Sixes', legal.filter((e) => e.boundary === 6).length, COLOR[6]],
  ]
  const boundaryRuns = rows[4][1] * 4 + rows[5][1] * 6
  const total = log[log.length - 1]?.score.runs ?? 0
  return (
    <Card title="How the runs came" sub={`${team.short}: ${Math.round((boundaryRuns / Math.max(1, total)) * 100)}% of the runs in boundaries · ${Math.round((rows[0][1] / n) * 100)}% dot balls`}>
      <div className="absolute inset-0 flex flex-col justify-center gap-1.5">
        {rows.map(([label, count, color], i) => (
          <div key={label} className="flex items-center gap-2 text-sm">
            <span className="w-14 shrink-0 text-right text-xs font-semibold text-slate-300">{label}</span>
            <div className="h-4 min-w-0 flex-1 overflow-hidden rounded bg-white/5">
              <motion.div className="h-full rounded" style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${Math.max((count / n) * 100, count ? 2 : 0)}%` }} transition={{ delay: (0.25 + i * 0.15) * r, duration: 0.7 * r, ease: 'easeOut' }} />
            </div>
            <span className="w-16 shrink-0 text-xs tabular-nums text-white">{count} <span className="text-slate-500">({Math.round((count / n) * 100)}%)</span></span>
          </div>
        ))}
      </div>
    </Card>
  )
}

/** The batsman's face beside a stat card: used by the wagon wheel when it is one man's shots. */
export const Face = ({ player, team }: { player: Player; team: Team }) => <PlayerAvatar player={player} team={team} size={28} />
