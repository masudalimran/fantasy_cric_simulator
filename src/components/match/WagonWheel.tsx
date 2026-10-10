import { useMemo, useState } from 'react'
import { SECTORS, reachFactor } from '../../engine/shots'
import { sectorRuns, wagonShots } from '../../engine/analysis'
import type { Match } from '../../engine/match'
import { InningsPicker, useInningsPick } from './InningsPicker'

const C = 130 // centre of the 260 x 260 drawing
const R = 108 // boundary radius

const colour = (runs: number) => (runs >= 6 ? '#e879f9' : runs === 4 ? '#38bdf8' : '#f1f5f9')
const unit = (deg: number) => ({ dx: Math.sin((deg * Math.PI) / 180), dy: -Math.cos((deg * Math.PI) / 180) })
const point = (deg: number, r: number) => { const u = unit(deg); return { x: C + u.dx * r, y: C + u.dy * r } }

/** A wedge for the 45-degree zone centred on `deg`. */
function wedge(deg: number) {
  const a = point(deg - 22.5, R)
  const b = point(deg + 22.5, R)
  return `M${C},${C} L${a.x},${a.y} A${R},${R} 0 0 1 ${b.x},${b.y} Z`
}

/** Where the runs went: every scoring shot as a line from the batsman, with runs per zone. */
export function WagonWheel({ match }: { match: Match }) {
  const [idx, setIdx] = useInningsPick(match)
  const [who, setWho] = useState('all')
  const inn = match.innings[idx]
  const bat = match.battingSide(inn)
  const left = (id: string) => match.player(id).hand === 'L'

  // The wheel is drawn from the batsman's point of view, so a left-hander is mirrored.
  const batters = inn.batters.map((b) => b.id)
  const selected = who !== 'all' && batters.includes(who) ? who : 'all'
  const shots = useMemo(() => wagonShots(inn, left).filter((s) => selected === 'all' || s.batterId === selected), [inn, inn.log.length, selected]) // eslint-disable-line react-hooks/exhaustive-deps
  const zones = sectorRuns(shots)
  const maxZone = Math.max(...zones, 1)
  const total = shots.reduce((s, x) => s + x.runs, 0)
  const count = (r: number) => shots.filter((s) => (r === 1 ? s.runs <= 3 : s.runs === r)).length
  const lefty = selected !== 'all' && left(selected)

  return (
    <div>
      <InningsPicker match={match} idx={idx} setIdx={setIdx} />
      <label className="mb-3 flex items-center gap-2 text-sm text-slate-300">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Batsman</span>
        <select value={selected} onChange={(e) => setWho(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm text-white">
          <option value="all">Everyone ({bat.team.name})</option>
          {batters.map((id) => <option key={id} value={id}>{match.player(id).name}</option>)}
        </select>
      </label>

      {shots.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-slate-400">No scoring shots yet. Bowl a few balls.</p>
      ) : (
        <svg viewBox="0 0 260 260" className="mx-auto w-full max-w-[430px]" role="img" aria-label="Wagon wheel">
          <defs>
            <radialGradient id="ww-grass" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#1f7a43" /><stop offset="1" stopColor="#14532d" /></radialGradient>
          </defs>
          <circle cx={C} cy={C} r={R + 6} fill="#0b1220" />
          <circle cx={C} cy={C} r={R} fill="url(#ww-grass)" stroke="#fff" strokeWidth="1.2" />
          {[0.75, 0.5, 0.25].map((k) => <circle key={k} cx={C} cy={C} r={R * k} fill="none" stroke="#fff" strokeOpacity="0.06" strokeWidth="9" />)}
          <circle cx={C} cy={C} r={R * 0.55} fill="none" stroke="#fff" strokeOpacity="0.4" strokeWidth="0.7" strokeDasharray="3 3" />
          {/* busiest zones glow */}
          {zones.map((z, i) => z > 0 && <path key={i} d={wedge(i * 45)} fill="#fbbf24" fillOpacity={0.05 + (z / maxZone) * 0.22} />)}
          {Array.from({ length: 8 }, (_, i) => { const p = point(i * 45 + 22.5, R); return <line key={i} x1={C} y1={C} x2={p.x} y2={p.y} stroke="#fff" strokeOpacity="0.14" /> })}
          <rect x={C - 4} y={C - 30} width="8" height="60" rx="2" fill="#c9a870" opacity="0.9" />

          {shots.map((s) => {
            const p = point(s.deg, R * reachFactor(s.runs))
            return (
              <g key={s.seq}>
                <line x1={C} y1={C} x2={p.x} y2={p.y} stroke={colour(s.runs)} strokeWidth={s.runs >= 4 ? 1.6 : 1} strokeOpacity={s.runs >= 4 ? 0.95 : 0.7} strokeLinecap="round" />
                {s.runs >= 4 && <circle cx={p.x} cy={p.y} r={s.runs >= 6 ? 3.2 : 2.4} fill={colour(s.runs)} />}
              </g>
            )
          })}
          <circle cx={C} cy={C} r="4.5" fill="#fbbf24" stroke="#000" strokeWidth="1" />

          {SECTORS.map((name, i) => {
            const p = point(i * 45, R * 0.78)
            return (
              <text key={name} x={p.x} y={p.y} textAnchor="middle" fill="#fff" style={{ paintOrder: 'stroke', stroke: '#052e16', strokeWidth: 2.2 }}>
                <tspan x={p.x} fontSize="8" opacity="0.85">{name}</tspan>
                <tspan x={p.x} dy="11" fontSize="11" fontWeight="800">{zones[i] || ''}</tspan>
              </text>
            )
          })}
        </svg>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-slate-300">
        <span className="flex items-center gap-1.5"><i className="h-0.5 w-5 rounded bg-slate-100" />1-3 runs <b className="text-white">{count(1)}</b></span>
        <span className="flex items-center gap-1.5"><i className="h-1 w-5 rounded bg-sky-400" />Fours <b className="text-white">{count(4)}</b></span>
        <span className="flex items-center gap-1.5"><i className="h-1 w-5 rounded bg-fuchsia-400" />Sixes <b className="text-white">{count(6)}</b></span>
        <span className="font-semibold text-white">{total} runs</span>
      </div>
      <p className="mt-2 text-center text-[11px] text-slate-500">
        Shown from the batsman's view: straight is up the page, the off side is on the right{lefty ? ' (mirrored, as this batsman is left-handed)' : ' for a right-hander'}. Shot directions are illustrative.
      </p>
    </div>
  )
}
