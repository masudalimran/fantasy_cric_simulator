import type { Match } from '../../engine/match'
import { Sheet } from '../Sheet'
import { PlayerAvatar, accentOf } from '../ui'
import { TeamLogo } from '../season/Details'
import { oversText } from './format'

/** The result in the style of a TV graphic: each team's score, its two best batsmen and its two best bowlers. */
export function MatchSummary({ match, onClose }: { match: Match; onClose: () => void }) {

  const firstSide = (match.innings[0]?.battingSide ?? 0) as 0 | 1
  const panel = (side: 0 | 1) => {
    const team = match.sides[side].team
    const batInn = match.innings.find((i) => i.battingSide === side)
    // the bowlers who bowled at this side are the other team's: the same innings, seen from the field
    const oppTeam = match.sides[1 - side].team
    const bats = batInn ? [...batInn.batters].filter((b) => b.balls > 0 || b.runs > 0 || b.dismissal).sort((a, b) => b.runs - a.runs || a.balls - b.balls).slice(0, 2) : []
    const bowls = batInn ? [...batInn.bowlers.values()].sort((a, b) => b.wickets - a.wickets || a.runs - b.runs).slice(0, 2) : []
    const won = match.result?.winnerSide === side
    const accent = accentOf(team)
    return (
      <div key={side} className="overflow-hidden rounded-2xl border-2 bg-panel" style={{ borderColor: won ? '#fbbf24' : '#2b3145' }}>
        <div className="flex items-center gap-3 px-4 py-3" style={{ background: `linear-gradient(110deg, ${team.colors.primary}cc, #10131c 75%)` }}>
          <TeamLogo team={team} size={48} />
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-xl leading-none tracking-wide text-white">{team.name}</div>
            <div className="text-xs text-slate-300"><span className="font-bold text-slate-100">{side === firstSide ? '1st innings' : '2nd innings'}</span> · {batInn ? `${oversText(batInn.legalBalls)} overs` : ''}{won ? ' · Winner' : ''}</div>
          </div>
          <div className="font-display text-5xl leading-none text-white">{batInn?.runs ?? '-'}<span className="text-2xl text-slate-400">/{batInn?.wickets ?? '-'}</span></div>
        </div>
        <div className="grid gap-3 p-3">
          <div>
            <div className="mb-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Batting</div>
            {bats.map((b) => (
              <div key={b.id} className="flex items-center gap-2 border-t border-line/60 py-1 text-sm first:border-0">
                <PlayerAvatar player={match.player(b.id)} team={team} size={26} />
                <span className="min-w-0 flex-1 truncate font-semibold text-white">{match.player(b.id).name}</span>
                <span className="tabular-nums font-bold text-white">{b.runs}{b.dismissal ? '' : '*'} <span className="text-xs font-normal text-slate-400">({b.balls})</span></span>
              </div>
            ))}
          </div>
          <div>
            <div className="mb-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Bowling · {oppTeam.name}</div>
            {bowls.map((l) => (
              <div key={l.id} className="flex items-center gap-2 border-t border-line/60 py-1 text-sm first:border-0">
                <PlayerAvatar player={match.player(l.id)} team={oppTeam} size={26} />
                <span className="min-w-0 flex-1 truncate font-semibold text-white">{match.player(l.id).name}</span>
                <span className="tabular-nums font-bold text-white">{l.wickets}/{l.runs} <span className="text-xs font-normal text-slate-400">({oversText(l.legalBalls)})</span></span>
              </div>
            ))}
          </div>
        </div>
        <div className="h-1" style={{ background: accent }} />
      </div>
    )
  }

  return (
    <Sheet label="Match summary" onClose={onClose} size="lg">
      <div data-match-summary className="p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-widest text-amber-300">Match summary</div>
            <h2 className="font-display text-3xl leading-tight tracking-wide text-white">{match.result?.text}</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg border border-line px-2.5 py-1 text-sm font-bold text-slate-200 hover:border-slate-400">✕</button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">{[firstSide, (1 - firstSide) as 0 | 1].map(panel)}</div>
      </div>
    </Sheet>
  )
}
