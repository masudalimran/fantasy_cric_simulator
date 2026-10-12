import { Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { perOver, runMix, worm, wormWickets } from '../../engine/analysis'
import type { Match } from '../../engine/match'
import { FORMATS } from '../../engine/types'
import { accentOf } from '../ui'
import { ClickAvatar } from './PlayerCard'
import { InningsPicker, useInningsPick } from './InningsPicker'

const AXIS = '#94a3b8'
const GRID = '#2b3145'
const tip = { contentStyle: { background: '#0b0d14', border: '1px solid #2b3145', borderRadius: 10, color: '#fff', fontSize: 12 }, labelStyle: { color: '#cbd5e1' }, itemStyle: { color: '#fff' } }

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="mb-4 rounded-xl border border-line bg-panel-2 p-3">
      <h3 className="text-sm font-extrabold uppercase tracking-wider text-white">{title}</h3>
      {hint && <p className="mb-2 text-xs text-slate-400">{hint}</p>}
      {children}
    </section>
  )
}

const MIX = [
  { key: 'dots', label: 'Dots', color: '#475569' },
  { key: 'ones', label: '1s', color: '#e2e8f0' },
  { key: 'twos', label: '2s', color: '#7dd3fc' },
  { key: 'threes', label: '3s', color: '#2dd4bf' },
  { key: 'fours', label: '4s', color: '#38bdf8' },
  { key: 'sixes', label: '6s', color: '#e879f9' },
] as const

/** The run-progression worm, runs per over, and how each batsman spent their balls. */
export function Charts({ match }: { match: Match }) {
  const [idx, setIdx] = useInningsPick(match)
  const cfg = FORMATS[match.format]
  const inn = match.innings[idx]
  const first = match.battingSide(match.innings[0])
  const accent = (i: number) => {
    const a = accentOf(match.battingSide(match.innings[i]).team)
    return i === 1 && a.toLowerCase() === accentOf(first.team).toLowerCase() ? '#e2e8f0' : a // two teams of one colour need telling apart
  }
  const overs = perOver(inn)
  const mix = runMix(inn)
  const target = match.innings[1]?.target ?? null

  return (
    <div>
      <Card title="Run progression" hint="Score after each over. Red dots are wickets.">
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
              <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
              <XAxis type="number" dataKey="over" domain={[0, cfg.overs]} tickCount={Math.min(cfg.overs / 5 + 1, 11)} stroke={AXIS} tick={{ fontSize: 11 }} />
              <YAxis stroke={AXIS} tick={{ fontSize: 11 }} />
              <Tooltip {...tip} formatter={(v) => [v as number, 'Runs']} labelFormatter={(l) => `After ${Number(l).toFixed(1)} overs`} />
              {target !== null && <ReferenceLine y={target} stroke="#fbbf24" strokeDasharray="5 4" label={{ value: `Target ${target}`, fill: '#fbbf24', fontSize: 11, position: 'insideTopLeft' }} />}
              {match.innings.map((i, n) => (
                <Line key={n} data={worm(i)} dataKey="runs" name={match.battingSide(i).team.name} stroke={accent(n)} strokeWidth={2.5} dot={false} isAnimationActive={false} type="monotone" />
              ))}
              {match.innings.flatMap((i, n) => wormWickets(i).map((w, k) => <ReferenceDot key={`${n}-${k}`} x={w.over} y={w.runs} r={4.5} fill="#ef4444" stroke="#fff" strokeWidth={1.2} ifOverflow="extendDomain" />))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-1 flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs text-slate-300">
          {match.innings.map((i, n) => <span key={n} className="flex items-center gap-1.5"><i className="h-1 w-5 rounded" style={{ background: accent(n) }} />{match.battingSide(i).team.name}</span>)}
        </div>
      </Card>

      <Card title="Run rate" hint="Runs an over so far, after each over. The dashed line is the rate the chasing side needs from the start.">
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
              <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
              <XAxis type="number" dataKey="over" domain={[1, cfg.overs]} allowDecimals={false} tickCount={Math.min(cfg.overs / 5 + 1, 11)} stroke={AXIS} tick={{ fontSize: 11 }} />
              <YAxis stroke={AXIS} tick={{ fontSize: 11 }} domain={[0, 'auto']} />
              <Tooltip {...tip} formatter={(v) => [Number(v).toFixed(2), 'Run rate']} labelFormatter={(l) => `After over ${l}`} />
              {target !== null && <ReferenceLine y={(target / (cfg.overs * 6)) * 6} stroke="#fbbf24" strokeDasharray="5 4" />}
              {match.innings.map((i, n) => {
                let total = 0
                const data = perOver(i).map((o, k) => { total += o.runs; return { over: k + 1, rate: total / (k + 1) } })
                return <Line key={n} data={data} dataKey="rate" name={match.battingSide(i).team.name} stroke={accent(n)} strokeWidth={2.5} dot={{ r: 2 }} isAnimationActive={false} type="monotone" />
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <InningsPicker match={match} idx={idx} setIdx={setIdx} />

      <Card title="Runs per over" hint="A red W marks an over with a wicket.">
        {overs.length === 0 ? <p className="py-6 text-center text-sm text-slate-400">Nothing bowled yet.</p> : (
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={overs} margin={{ top: 18, right: 8, bottom: 0, left: -12 }}>
                <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="over" stroke={AXIS} tick={{ fontSize: 11 }} interval={cfg.overs > 20 ? 4 : 1} />
                <YAxis stroke={AXIS} tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip {...tip} cursor={{ fill: '#ffffff10' }} formatter={(v) => [v as number, 'Runs']} labelFormatter={(l) => `Over ${l}`} />
                <Bar dataKey="runs" fill={accent(idx)} radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  <LabelList
                    dataKey="wickets"
                    content={(props) => {
                      const p = props as unknown as { x?: number | string; y?: number | string; width?: number | string; value?: number | string }
                      if (!(Number(p.value) > 0)) return <g />
                      return <text x={Number(p.x) + Number(p.width) / 2} y={Number(p.y) - 5} textAnchor="middle" fill="#ef4444" fontSize="11" fontWeight="800">{Number(p.value) > 1 ? `${p.value}W` : 'W'}</text>
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card title="How they scored" hint="Every ball each batsman faced, split by what happened.">
        <div className="mb-2 flex flex-wrap gap-x-3 gap-y-1">
          {MIX.map((m) => <span key={m.key} className="flex items-center gap-1.5 text-[11px] text-slate-300"><i className="h-2.5 w-2.5 rounded-sm" style={{ background: m.color }} />{m.label}</span>)}
        </div>
        {mix.length === 0 ? <p className="py-4 text-center text-sm text-slate-400">No balls faced yet.</p> : (
          <div className="space-y-2.5">
            {mix.map((m) => (
              <div key={m.id}>
                <div className="mb-1 flex items-center gap-2 text-xs">
                  <ClickAvatar player={match.player(m.id)} team={match.battingSide(inn).team} size={22} />
                  <span className="min-w-0 flex-1 truncate font-semibold text-white">{match.player(m.id).name}</span>
                  <span className="tabular-nums text-slate-400">{m.balls} balls</span>
                </div>
                <div className="flex h-3.5 overflow-hidden rounded-full bg-black/30">
                  {MIX.map((x) => m[x.key] > 0 && <div key={x.key} title={`${x.label}: ${m[x.key]}`} style={{ width: `${(m[x.key] / m.balls) * 100}%`, background: x.color }} />)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
