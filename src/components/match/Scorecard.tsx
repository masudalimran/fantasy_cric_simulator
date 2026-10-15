import type { Match } from '../../engine/match'
import { accentOf } from '../ui'
import { TeamLogo } from '../season/Details'
import { ClickAvatar } from './PlayerCard'
import { useInningsPick } from './InningsPicker'
import { dismissalText, economy, oversText, runRate, strikeRate } from './format'

export function Scorecard({ match }: { match: Match }) {
  // Opens on the innings in play, and moves on to the next one by itself until you choose otherwise
  const [idx, setTab] = useInningsPick(match)
  const inn = match.innings[idx]
  const bat = match.battingSide(inn)
  const bowl = match.bowlingSide(inn)
  const extras = inn.extras.wides + inn.extras.noballs + inn.extras.byes + inn.extras.legByes
  // While the innings is live, mark who is at the crease and who is bowling
  const live = idx === match.innings.length - 1 && !match.isOver && !inn.done
  const yetToBat = bat.xi.filter((p) => !inn.batters.some((b) => b.id === p.id))
  const th = 'px-2 py-1.5 text-right font-medium'

  return (
    <div>
      {/* Which innings you're reading: a header for the score, and a switcher once there are two */}
      <div className="mb-4 overflow-hidden rounded-xl border border-line" style={{ background: `linear-gradient(100deg, ${bat.team.colors.primary}66, transparent 70%)` }}>
        <div className={`flex items-center gap-3 p-3 ${live ? 'max-md:hidden' : ''}`}>
          <TeamLogo team={bat.team} size={46} />
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-widest text-slate-300">
              {inn.index === 0 ? '1st innings' : '2nd innings'}{live && <span className="ml-2 rounded bg-red-500 px-1.5 py-px text-[10px] font-extrabold tracking-wider text-white">LIVE</span>}
            </div>
            <div className="truncate text-sm font-bold leading-tight text-white md:text-base">{bat.team.name}</div>
            <div className="truncate text-[11px] text-slate-400 md:text-xs">{bat.team.series}</div>
          </div>
          <div className="ml-auto shrink-0 text-right">
            <div className="font-display text-2xl leading-none md:text-4xl" style={{ color: accentOf(bat.team) }}>{inn.runs}<span className="text-slate-500">/</span>{inn.wickets}</div>
            <div className="mt-0.5 text-[11px] text-slate-300 md:text-xs">{oversText(inn.legalBalls)} ov · RR {runRate(inn)}</div>
          </div>
        </div>
        {match.innings.length > 1 && (
          <div className="grid grid-cols-2 border-t border-line bg-black/20" role="tablist" aria-label="Innings">
            {match.innings.map((i, n) => {
              const on = n === idx
              const t = match.battingSide(i).team
              return (
                <button
                  key={n} role="tab" aria-selected={on} onClick={() => setTab(n)}
                  className={`flex min-w-0 flex-col items-start px-3 py-2 text-left transition ${on ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                  style={{ boxShadow: on ? `inset 0 -3px 0 ${accentOf(t)}` : undefined }}
                >
                  <span className="text-[11px] font-bold uppercase tracking-wider opacity-70">{n === 0 ? '1st innings' : '2nd innings'}</span>
                  <span className="flex w-full items-baseline justify-between gap-2 text-xs font-semibold">
                    <span className="truncate">{t.name}</span>
                    <span className="shrink-0 tabular-nums">{i.runs}/{i.wickets}</span>
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-[11px] uppercase tracking-wider text-slate-500">
            <tr><th className="px-2 py-1.5 text-left font-medium" style={{ color: accentOf(bat.team) }}>{bat.team.name} batting</th><th className={th}>R</th><th className={th}>B</th><th className={th}>4s</th><th className={th}>6s</th><th className={th}>SR</th></tr>
          </thead>
          <tbody>
            {inn.batters.map((b) => {
              const onStrike = live && b.id === inn.strikerId
              const nonStrike = live && b.id === inn.nonStrikerId
              return (
              <tr key={b.id} className={`border-t border-line/60 ${onStrike ? 'bg-amber-400/15' : nonStrike ? 'bg-slate-300/10' : ''}`} style={onStrike ? { boxShadow: 'inset 3px 0 0 #fbbf24' } : nonStrike ? { boxShadow: 'inset 3px 0 0 #94a3b8' } : undefined}>
                <td className="px-2 py-1.5">
                  <div className="flex items-center gap-2.5">
                    <ClickAvatar player={match.player(b.id)} team={bat.team} size={32} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-medium leading-tight text-white">
                        {match.player(b.id).name}
                        {onStrike && <span className="rounded bg-amber-400 px-1.5 py-px text-[10px] font-extrabold tracking-wider text-black">ON STRIKE</span>}
                        {nonStrike && <span className="rounded bg-slate-300 px-1.5 py-px text-[10px] font-extrabold tracking-wider text-black">NON-STRIKER</span>}
                      </div>
                      <div className="text-[11px] leading-tight text-slate-500">{onStrike || nonStrike ? 'batting' : dismissalText(match, b, inn)}</div>
                    </div>
                  </div>
                </td>
                <td className="px-2 text-right font-semibold tabular-nums text-white">{b.runs}</td>
                <td className="px-2 text-right tabular-nums text-slate-300">{b.balls}</td>
                <td className="px-2 text-right tabular-nums text-slate-300">{b.fours}</td>
                <td className="px-2 text-right tabular-nums text-slate-300">{b.sixes}</td>
                <td className="px-2 text-right tabular-nums text-slate-400">{strikeRate(b.runs, b.balls)}</td>
              </tr>
              )
            })}
            <tr className="border-t border-line/60 text-slate-300">
              <td className="px-2 py-1.5">Extras <span className="text-[11px] text-slate-500">(w {inn.extras.wides}, nb {inn.extras.noballs}, b {inn.extras.byes}, lb {inn.extras.legByes})</span></td>
              <td className="px-2 text-right tabular-nums" colSpan={5}>{extras}</td>
            </tr>
            <tr className="border-t border-line text-white">
              <td className="px-2 py-1.5 font-semibold">Total <span className="text-[11px] font-normal text-slate-500">({oversText(inn.legalBalls)} ov, RR {runRate(inn)})</span></td>
              <td className="px-2 text-right font-semibold tabular-nums" colSpan={5}>{inn.runs}/{inn.wickets}</td>
            </tr>
          </tbody>
        </table>
      </div>
      {yetToBat.length > 0 && (
        <div className="mt-3">
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">Yet to bat</div>
          <div className="flex flex-wrap gap-1.5">
            {yetToBat.map((p) => (
              <span key={p.id} className="inline-flex items-center gap-1.5 rounded-full bg-white/5 py-0.5 pl-0.5 pr-2.5 text-xs text-slate-300">
                <ClickAvatar player={p} team={bat.team} size={22} />{p.name}
              </span>
            ))}
          </div>
        </div>
      )}
      {inn.fow.length > 0 && (
        <p className="mt-2 text-xs text-slate-500">
          Fall of wickets: {inn.fow.map((f) => `${f.runs}-${f.wickets} (${match.player(f.playerId).name}, ${oversText(f.balls)})`).join(', ')}
        </p>
      )}

      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-[11px] uppercase tracking-wider text-slate-500">
            <tr><th className="px-2 py-1.5 text-left font-medium" style={{ color: accentOf(bowl.team) }}>{bowl.team.name} bowling</th><th className={th}>O</th><th className={th}>M</th><th className={th}>R</th><th className={th}>W</th><th className={th}>Econ</th></tr>
          </thead>
          <tbody>
            {[...inn.bowlers.values()].map((b) => {
              const bowling = live && b.id === inn.bowlerId
              return (
              <tr key={b.id} className={`border-t border-line/60 ${bowling ? 'bg-red-500/15' : ''}`} style={bowling ? { boxShadow: 'inset 3px 0 0 #f87171' } : undefined}>
                <td className="px-2 py-1.5 font-medium text-white">
                  <span className="flex items-center gap-2.5">
                    <ClickAvatar player={match.player(b.id)} team={bowl.team} size={32} />
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 leading-tight">{match.player(b.id).name}{bowling && <span className="rounded bg-red-500 px-1.5 py-px text-[10px] font-extrabold tracking-wider text-white">BOWLING</span>}</span>
                  </span>
                </td>
                <td className="px-2 text-right tabular-nums text-slate-300">{oversText(b.legalBalls)}</td>
                <td className="px-2 text-right tabular-nums text-slate-300">{b.maidens}</td>
                <td className="px-2 text-right tabular-nums text-slate-300">{b.runs}</td>
                <td className="px-2 text-right font-semibold tabular-nums text-white">{b.wickets}</td>
                <td className="px-2 text-right tabular-nums text-slate-400">{economy(b)}</td>
              </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
