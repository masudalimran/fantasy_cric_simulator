import { partnerships } from '../../engine/analysis'
import type { Match } from '../../engine/match'
import { accentOf } from '../ui'
import { ClickAvatar } from './PlayerCard'
import { InningsPicker, useInningsPick } from './InningsPicker'

const nth = (n: number) => `${n}${['th', 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : Math.min(n % 10, 4) % 4]}`

/** Each stand between two batsmen: how long it lasted and who scored the runs. */
export function Partnerships({ match }: { match: Match }) {
  const [idx, setIdx] = useInningsPick(match)
  const inn = match.innings[idx]
  const team = match.battingSide(inn).team
  const list = partnerships(inn)
  const best = Math.max(...list.map((p) => p.runs), 1)
  const accent = accentOf(team)

  return (
    <div>
      <InningsPicker match={match} idx={idx} setIdx={setIdx} />
      {list.length === 0 && <p className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-slate-400">No partnership yet. Bowl a few balls.</p>}
      <div className="space-y-1.5">
        {list.map((p) => {
          const a = match.player(p.a)
          const b = match.player(p.b)
          const mine = p.aRuns + p.bRuns
          const extras = Math.max(p.runs - mine, 0)
          const w = (n: number) => `${p.runs ? (n / p.runs) * 100 : 0}%`
          return (
            <div key={p.wicket} className={`rounded-lg border px-2.5 py-1.5 ${p.unbroken ? 'border-amber-400/50 bg-amber-400/5' : 'border-line bg-panel-2'}`} title={p.endedBy ? `Ended when ${match.player(p.endedBy).name} was out` : undefined}>
              <div className="flex items-center gap-2">
                <span className="w-7 shrink-0 text-[10px] font-extrabold uppercase text-slate-400">{nth(p.wicket)}</span>
                <ClickAvatar player={a} team={team} size={20} />
                <span className="min-w-0 truncate text-xs font-semibold text-white">{a.name} <span className="font-normal text-slate-400">{p.aRuns}({p.aBalls})</span></span>
                <span className="text-slate-600">&amp;</span>
                <ClickAvatar player={b} team={team} size={20} />
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-white">{b.name} <span className="font-normal text-slate-400">{p.bRuns}({p.bBalls})</span></span>
                {p.unbroken && <span className="shrink-0 rounded bg-amber-400 px-1 py-px text-[9px] font-extrabold text-black">{inn.done ? 'NOT OUT' : 'NOW'}</span>}
                {p.runs === best && list.length > 1 && <span className="shrink-0 rounded bg-emerald-500 px-1 py-px text-[9px] font-extrabold text-black">BEST</span>}
                <span className="shrink-0 text-right text-sm font-extrabold tabular-nums text-white">{p.runs}<span className="ml-0.5 text-[11px] font-normal text-slate-400">({p.balls})</span></span>
              </div>
              <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-black/30">
                <div style={{ width: w(p.aRuns), background: accent }} />
                <div style={{ width: w(extras), background: '#64748b' }} title="Extras" />
                <div style={{ width: w(p.bRuns), background: '#f1f5f9' }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
