import { inningsOverview } from '../../engine/analysis'
import type { Match } from '../../engine/match'
import { accentOf } from '../ui'
import { TeamLogo } from '../season/Details'
import { ClickAvatar } from './PlayerCard'

const pct = (n: number) => `${Math.round(n * 100)}%`

/** The innings side by side: how each was built. */
export function Overview({ match }: { match: Match }) {
  const cols = match.innings.map((inn) => ({ inn, team: match.battingSide(inn).team, bowlTeam: match.bowlingSide(inn).team, o: inningsOverview(inn) }))
  const rows: { label: string; hint?: string; cell: (c: (typeof cols)[number]) => React.ReactNode }[] = [
    { label: 'Total', cell: (c) => <b className="font-display text-2xl text-white">{c.o.runs}/{c.o.wickets}</b> },
    { label: 'Run rate', cell: (c) => c.o.runRate.toFixed(2) },
    { label: 'Fours / sixes', cell: (c) => `${c.o.fours} / ${c.o.sixes}` },
    { label: 'Runs in boundaries', hint: 'share of the total scored in fours and sixes', cell: (c) => `${c.o.boundaryRuns} (${pct(c.o.boundaryShare)})` },
    { label: 'Balls per boundary', cell: (c) => (c.o.ballsPerBoundary ? c.o.ballsPerBoundary.toFixed(1) : '-') },
    { label: 'Dot balls', hint: 'balls that went for nothing', cell: (c) => `${c.o.dotBalls} (${pct(c.o.dotPct)})` },
    { label: 'Singles', cell: (c) => c.o.ones },
    { label: 'Extras', hint: 'wides, no-balls, byes, leg byes', cell: (c) => `${c.o.extras.total} (${c.o.extras.wides}w ${c.o.extras.noballs}nb ${c.o.extras.byes}b ${c.o.extras.legByes}lb)` },
  ]
  const star = (id: string | null, team: (typeof cols)[number]['team'], value: (c: (typeof cols)[number]) => string, c: (typeof cols)[number]) =>
    id ? <span className="flex items-center gap-1.5"><ClickAvatar player={match.player(id)} team={team} size={22} /><span className="min-w-0 truncate"><b className="text-white">{match.player(id).name}</b> <span className="text-slate-400">{value(c)}</span></span></span> : <span className="text-slate-500">-</span>

  return (
    <div>
      <div className="grid gap-2" style={{ gridTemplateColumns: `minmax(0,1fr) repeat(${cols.length}, minmax(0,1.3fr))` }}>
        <div />
        {cols.map((c, i) => (
          <div key={i} className="flex items-center gap-2 rounded-xl border border-line bg-panel-2 p-2" style={{ boxShadow: `inset 0 -3px 0 ${accentOf(c.team)}` }}>
            <TeamLogo team={c.team} size={30} />
            <div className="min-w-0"><div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{i === 0 ? '1st innings' : '2nd innings'}</div><div className="truncate text-xs font-bold text-white">{c.team.name}</div></div>
          </div>
        ))}
        {rows.map((r) => (
          <div key={r.label} className="contents">
            <div className="flex items-center text-[11px] font-semibold text-slate-400" title={r.hint}>{r.label}</div>
            {cols.map((c, i) => <div key={i} className="rounded-lg bg-white/5 px-2.5 py-2 text-xs font-semibold text-slate-100">{r.cell(c)}</div>)}
          </div>
        ))}
        <div className="flex items-center text-[11px] font-semibold text-slate-400">Top scorer</div>
        {cols.map((c, i) => <div key={i} className="rounded-lg bg-white/5 px-2.5 py-2 text-xs">{star(c.o.topScorerId, c.team, (x) => `${c.inn.batters.find((b) => b.id === x.o.topScorerId)?.runs ?? 0} (${c.inn.batters.find((b) => b.id === x.o.topScorerId)?.balls ?? 0})`, c)}</div>)}
        <div className="flex items-center text-[11px] font-semibold text-slate-400">Best bowler</div>
        {cols.map((c, i) => <div key={i} className="rounded-lg bg-white/5 px-2.5 py-2 text-xs">{c.o.topBowlerId ? (() => { const b = c.inn.bowlers.get(c.o.topBowlerId!); return star(c.o.topBowlerId, c.bowlTeam, () => `${b?.wickets}/${b?.runs}`, c) })() : <span className="text-slate-500">-</span>}</div>)}
      </div>
    </div>
  )
}
