import { useMemo } from 'react'
import { average, bowlAverage, collect, economy, mergeBat, mergeBowl, strikeRate } from '../../season/stats'
import type { BatStat, BowlStat } from '../../season/stats'
import type { Season } from '../../season/types'

const f1 = (n: number | null, d = 1) => (n === null ? '-' : n.toFixed(d))
const tile = (label: string, value: React.ReactNode) => (
  <div key={label} className="rounded-lg bg-white/5 px-2.5 py-1.5">
    <div className="cursor-help text-[10px] font-bold uppercase tracking-widest text-slate-500" data-gloss={label}>{label}</div>
    <div className="font-display text-xl leading-tight text-white">{value}</div>
  </div>
)

/**
 * A player's overall numbers: this season so far, and (once there are finished seasons) the whole career.
 * `seasons` is every season of the career, oldest first; the last one is the season being played.
 */
export function OverallStats({ playerId, seasons, live }: { playerId: string; seasons: Season[]; live?: { bat?: BatStat; bowl?: BowlStat } }) {
  const lines = useMemo(() => seasons.map((s) => {
    const c = collect(s)
    const bat = c.bat.get(playerId), bowl = c.bowl.get(playerId)
    // matches he was in the XI for (older saves only know about the ones where he batted or bowled)
    return { year: s.year, bat, bowl, potm: c.potm.get(playerId) ?? 0, played: c.played.get(playerId) ?? Math.max(bat?.matches ?? 0, bowl?.matches ?? 0) }
  }), [seasons, playerId])
  if (lines.length === 0) return null
  // the match being played right now counts as it goes: being in the XI is a match, and his runs and wickets are added straight away
  const withLive = (bat: BatStat | undefined, bowl: BowlStat | undefined) => ({ bat: mergeBat([bat, live?.bat].filter((x): x is BatStat => !!x)), bowl: mergeBowl([bowl, live?.bowl].filter((x): x is BowlStat => !!x)) })
  const cur = lines[lines.length - 1]
  const current = { year: cur.year, ...withLive(cur.bat, cur.bowl), potm: cur.potm, played: cur.played + (live ? 1 : 0) }
  const career = { ...withLive(mergeBat(lines.flatMap((l) => (l.bat ? [l.bat] : []))), mergeBowl(lines.flatMap((l) => (l.bowl ? [l.bowl] : [])))), potm: lines.reduce((x, l) => x + l.potm, 0), played: lines.reduce((x, l) => x + l.played, 0) + (live ? 1 : 0) }

  const block = (title: string, l: { bat?: ReturnType<typeof mergeBat>; bowl?: ReturnType<typeof mergeBowl>; potm: number; played: number }) => (
    <div key={title}>
      <h4 className="mb-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">{title}</h4>
      {l.played || l.bat || l.bowl || l.potm ? (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">{tile('Matches', l.played)}{l.potm > 0 && tile('Man of the Match', l.potm)}</div>
          {l.bat && (
            <div>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-amber-300/90">Batting</div>
              <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">{tile('Bat apps', l.bat.batApps)}{tile('Runs', l.bat.runs)}{tile('Average', f1(average(l.bat)))}{tile('Strike rate', f1(strikeRate(l.bat), 0))}{tile('Best', `${l.bat.high}${l.bat.highNotOut ? '*' : ''}`)}{tile('50s / 100s', `${l.bat.fifties} / ${l.bat.hundreds}`)}{tile('Fours / sixes', `${l.bat.fours} / ${l.bat.sixes}`)}{l.bat.longSix > 0 && tile('Longest six', `${l.bat.longSix} m`)}</div>
            </div>
          )}
          {l.bowl && (
            <div>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-sky-300/90">Bowling</div>
              <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">{tile('Bowl apps', l.bowl.bowlApps)}{tile('Wickets', l.bowl.wickets)}{tile('Economy', f1(economy(l.bowl), 2))}{tile('Bowling avg', f1(bowlAverage(l.bowl)))}{tile('Best', `${l.bowl.bestW}/${l.bowl.bestR}`)}{tile('5-wicket hauls', l.bowl.fiveW)}</div>
            </div>
          )}
        </div>
      ) : <p className="text-sm text-slate-500">Nothing yet.</p>}
    </div>
  )

  return (
    <div className="space-y-3">
      {block(`This season (${current.year})${live ? ', including this match so far' : ''}`, current)}
      {seasons.length > 1 && block(`Career · ${seasons.length} seasons`, career)}
    </div>
  )
}
