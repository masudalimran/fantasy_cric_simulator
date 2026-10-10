import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { winChanceSeries } from '../../engine/analysis'
import type { Match } from '../../engine/match'
import { TeamCrest, accentOf } from '../ui'

/** An estimate of who is winning, over the course of the match. */
export function WinChance({ match }: { match: Match }) {
  const series = winChanceSeries({ format: match.format, maxOvers: match.maxOvers, innings: match.innings })
  const first = match.battingSide(match.innings[0]).team
  const second = match.battingSide({ ...match.innings[0], battingSide: (1 - match.innings[0].battingSide) as 0 | 1 }).team
  const now = series[series.length - 1]?.p ?? 0.5
  const over = match.isOver
  const winner = match.result?.winnerSide
  const pSecond = over ? (winner === null ? 0.5 : winner === match.innings[1]?.battingSide ? 1 : 0) : now
  const c1 = accentOf(first)
  const c2 = accentOf(second).toLowerCase() === c1.toLowerCase() ? '#e2e8f0' : accentOf(second)
  const data = series.map((s) => ({ x: s.x, chase: Math.round(s.p * 100) }))

  return (
    <div>
      <div className="mb-3 grid grid-cols-2 gap-2">
        {[{ team: second, p: pSecond, c: c2, tag: 'chasing' }, { team: first, p: 1 - pSecond, c: c1, tag: 'defending' }].map((x) => (
          <div key={x.tag} className="rounded-xl border border-line bg-panel-2 p-2.5" style={{ boxShadow: `inset 0 -3px 0 ${x.c}` }}>
            <div className="flex items-center gap-2"><TeamCrest team={x.team} size={26} /><div className="min-w-0"><div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{x.tag}</div><div className="truncate text-xs font-bold text-white">{x.team.name}</div></div></div>
            <div className="mt-1 font-display text-4xl leading-none" style={{ color: x.c }}>{Math.round(x.p * 100)}%</div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-line bg-panel-2 p-3">
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-white">Win chance</h3>
        <p className="mb-2 text-xs text-slate-400">The chasing team's chance of winning, after each over. Up is good for them, down is good for the defenders.</p>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 10, bottom: 0, left: -14 }}>
              <defs>
                <linearGradient id="wc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={c2} stopOpacity="0.55" /><stop offset="0.5" stopColor={c2} stopOpacity="0.1" /><stop offset="1" stopColor={c1} stopOpacity="0.45" /></linearGradient>
              </defs>
              <CartesianGrid stroke="#2b3145" strokeDasharray="3 3" />
              <XAxis type="number" dataKey="x" domain={[0, match.maxOvers * 2]} ticks={[0, match.maxOvers, match.maxOvers * 2]} tickFormatter={(v) => (v === match.maxOvers ? 'break' : v === 0 ? 'start' : 'end')} stroke="#94a3b8" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v}%`} stroke="#94a3b8" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#0b0d14', border: '1px solid #2b3145', borderRadius: 10, color: '#fff', fontSize: 12 }} formatter={(v) => [`${v}%`, 'Chasing team']} labelFormatter={(l) => (Number(l) <= match.maxOvers ? `Over ${l} of the first innings` : `Over ${Number(l) - match.maxOvers} of the chase`)} />
              <ReferenceLine y={50} stroke="#fbbf24" strokeDasharray="5 4" />
              <ReferenceLine x={match.maxOvers} stroke="#64748b" strokeDasharray="2 3" />
              <Area type="monotone" dataKey="chase" stroke="#fff" strokeWidth={2} fill="url(#wc)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">A rough estimate from the score, overs left and wickets in hand, not a simulation of the rest of the match.</p>
      </div>
    </div>
  )
}
