import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { phaseSummary } from '../../engine/analysis'
import type { Match } from '../../engine/match'
import { FORMATS } from '../../engine/types'
import { accentOf } from '../ui'
import { TeamLogo } from '../season/Details'

const LABEL = { powerplay: 'Powerplay', middle: 'Middle overs', death: 'Death overs' } as const

/** How each innings went in the powerplay, the middle and the death overs. */
export function Phases({ match }: { match: Match }) {
  const ranges = FORMATS[match.format].phases
  const sets = match.innings.map((inn) => ({ inn, team: match.battingSide(inn).team, rows: phaseSummary(inn, ranges) }))
  const colour = (i: number) => (i === 1 && accentOf(sets[0].team).toLowerCase() === accentOf(sets[1].team).toLowerCase() ? '#e2e8f0' : accentOf(sets[i].team))
  const data = (['powerplay', 'middle', 'death'] as const).map((ph) => ({
    name: LABEL[ph], ...Object.fromEntries(sets.map((s, i) => [`inn${i}`, Number(s.rows.find((r) => r.phase === ph)!.runRate.toFixed(2))])),
  }))

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-line bg-panel-2 p-3">
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-white">Run rate by phase</h3>
        <div className="mt-2 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
              <CartesianGrid stroke="#2b3145" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#0b0d14', border: '1px solid #2b3145', borderRadius: 10, color: '#fff', fontSize: 12 }} cursor={{ fill: '#ffffff10' }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {sets.map((s, i) => <Bar key={i} dataKey={`inn${i}`} name={s.team.name} fill={colour(i)} radius={[4, 4, 0, 0]} isAnimationActive={false} />)}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {sets.map((s, i) => (
        <section key={i} className="rounded-xl border border-line bg-panel-2 p-3">
          <div className="mb-2 flex items-center gap-2"><TeamLogo team={s.team} size={26} /><div><div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{i === 0 ? '1st innings' : '2nd innings'}</div><div className="text-sm font-bold text-white">{s.team.name}</div></div></div>
          <table className="w-full text-xs">
            <thead className="text-[10px] uppercase tracking-wider text-slate-500">
              <tr><th className="py-1 text-left font-medium">Phase</th><th className="text-right font-medium">Overs</th><th className="text-right font-medium">Runs</th><th className="text-right font-medium">RR</th><th className="text-right font-medium">Wkts</th><th className="text-right font-medium">4s/6s</th><th className="text-right font-medium">Dots</th></tr>
            </thead>
            <tbody>
              {s.rows.map((r) => (
                <tr key={r.phase} className="border-t border-line/60 text-slate-200">
                  <td className="py-1.5 font-semibold text-white">{LABEL[r.phase]}</td>
                  <td className="text-right tabular-nums text-slate-400">{r.balls ? r.overs : '-'}</td>
                  <td className="text-right font-bold tabular-nums text-white">{r.runs}</td>
                  <td className="text-right tabular-nums">{r.balls ? r.runRate.toFixed(2) : '-'}</td>
                  <td className="text-right tabular-nums">{r.wickets}</td>
                  <td className="text-right tabular-nums">{r.boundaries}</td>
                  <td className="text-right tabular-nums text-slate-400">{r.balls ? `${Math.round(r.dotPct * 100)}%` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  )
}
