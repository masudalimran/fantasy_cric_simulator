import { dismissalKinds, matchups } from '../../engine/analysis'
import type { Match } from '../../engine/match'
import { ClickAvatar } from './PlayerCard'
import { InningsPicker, useInningsPick } from './InningsPicker'

/** Who did what against whom: runs and balls for every batsman and bowler pair, plus how the wickets fell. */
export function Matchups({ match }: { match: Match }) {
  const [idx, setIdx] = useInningsPick(match)
  const inn = match.innings[idx]
  const bat = match.battingSide(inn).team
  const bowl = match.bowlingSide(inn).team
  const ms = matchups(inn)
  const batters = [...new Set(ms.map((m) => m.batterId))]
  const bowlers = [...new Set(ms.map((m) => m.bowlerId))]
  const get = (b: string, w: string) => ms.find((m) => m.batterId === b && m.bowlerId === w)
  const kinds = dismissalKinds(inn)
  const maxKind = Math.max(...kinds.map((k) => k.count), 1)

  return (
    <div className="space-y-4">
      <InningsPicker match={match} idx={idx} setIdx={setIdx} />
      {ms.length === 0 ? <p className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-slate-400">No balls bowled yet.</p> : (
        <section className="overflow-x-auto rounded-xl border border-line bg-panel-2 p-3">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-white">Batsman v bowler</h3>
          <p className="mb-2 text-xs text-slate-400">Runs (balls). A red cell means the bowler got him out. Brighter means the batsman scored faster.</p>
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="py-1 text-left font-medium text-slate-500">Batsman</th>
                {bowlers.map((w) => (
                  <th key={w} className="px-1 text-center font-medium"><div className="flex flex-col items-center gap-0.5"><ClickAvatar player={match.player(w)} team={bowl} size={22} /><span className="max-w-[58px] truncate text-[10px] text-slate-300">{match.player(w).name.split(' ')[0]}</span></div></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {batters.map((b) => (
                <tr key={b} className="border-t border-line/60">
                  <td className="py-1.5"><span className="flex items-center gap-1.5"><ClickAvatar player={match.player(b)} team={bat} size={22} /><span className="max-w-[86px] truncate font-semibold text-white">{match.player(b).name}</span></span></td>
                  {bowlers.map((w) => {
                    const m = get(b, w)
                    if (!m) return <td key={w} className="px-1 text-center text-slate-700">·</td>
                    const sr = m.balls ? m.runs / m.balls : 0
                    return (
                      <td key={w} className="p-0.5 text-center">
                        <div className="rounded-md px-1 py-1 font-semibold tabular-nums" style={{ background: m.dismissed ? 'rgba(239,68,68,.45)' : `rgba(56,189,248,${Math.min(0.08 + sr * 0.28, 0.6)})`, color: '#fff' }} title={`${m.fours} fours, ${m.sixes} sixes`}>
                          {m.runs}<span className="font-normal opacity-70"> ({m.balls})</span>{m.dismissed && <span className="ml-0.5 font-extrabold">W</span>}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {kinds.length > 0 && (
        <section className="rounded-xl border border-line bg-panel-2 p-3">
          <h3 className="mb-2 text-sm font-extrabold uppercase tracking-wider text-white">How the wickets fell</h3>
          <div className="space-y-1.5">
            {kinds.map((k) => (
              <div key={k.kind} className="flex items-center gap-2 text-xs">
                <span className="w-28 shrink-0 capitalize text-slate-200">{k.kind}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-black/30"><div className="h-full rounded-full bg-red-400" style={{ width: `${(k.count / maxKind) * 100}%` }} /></div>
                <span className="w-5 text-right font-bold tabular-nums text-white">{k.count}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
