import { overLines } from '../../engine/analysis'
import type { Match } from '../../engine/match'
import { ClickAvatar } from './PlayerCard'
import { InningsPicker, useInningsPick } from './InningsPicker'
import { chip } from './NowPlaying'

/** Every over, with who bowled it, how each ball went, and the score afterwards. */
export function Overs({ match }: { match: Match }) {
  const [idx, setIdx] = useInningsPick(match)
  const inn = match.innings[idx]
  const bowlTeam = match.bowlingSide(inn).team
  const lines = overLines(inn)
  return (
    <div>
      <InningsPicker match={match} idx={idx} setIdx={setIdx} />
      {lines.length === 0 && <p className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-slate-400">No overs yet.</p>}
      <div className="space-y-1.5">
        {[...lines].reverse().map((o) => (
          <div key={o.over} className={`rounded-lg border px-2.5 py-2 ${o.wickets ? 'border-red-500/40 bg-red-500/5' : 'border-line bg-panel-2'}`}>
            <div className="flex items-center gap-2">
              <span className="w-6 shrink-0 text-center font-display text-lg leading-none text-slate-300">{o.over}</span>
              <ClickAvatar player={match.player(o.bowlerId)} team={bowlTeam} size={22} />
              <span className="min-w-0 flex-1 truncate text-xs font-semibold text-white">{match.player(o.bowlerId).name}</span>
              <span className="shrink-0 text-xs tabular-nums text-slate-300"><b className="text-white">{o.runs}</b> runs{o.wickets ? <b className="ml-1.5 text-red-300">{o.wickets}W</b> : null}</span>
              <span className="w-12 shrink-0 text-right text-[11px] tabular-nums text-slate-500">{o.scoreAfter.runs}/{o.scoreAfter.wickets}</span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1 pl-8">
              {o.balls.map((e) => { const c = chip(e); return <span key={e.seq} className={`grid h-6 min-w-6 place-items-center rounded-full px-1 text-[11px] font-bold ${c.c}`}>{c.t}</span> })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
