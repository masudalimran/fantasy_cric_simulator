import { motion } from 'framer-motion'
import type { Match } from '../../engine/match'
import type { BallEvent } from '../../engine/types'
import { ClickAvatar } from './PlayerCard'
import { accentOf } from '../ui'
import { economy, oversText, strikeRate } from './format'

export const chip = (ev: BallEvent) => {
  if (ev.wicket) return { t: 'W', c: 'bg-red-500 text-white' }
  if (ev.extraType === 'wide') return { t: ev.wideByes ? `Wd+${ev.wideByes}b` : ev.extraRuns > 1 ? `Wd${ev.extraRuns}` : 'Wd', c: 'bg-amber-500 text-black' }
  if (ev.extraType === 'noball') return { t: ev.total > 1 ? `Nb${ev.total}` : 'Nb', c: 'bg-amber-500 text-black' }
  if (ev.extraType === 'bye' || ev.extraType === 'legbye') return { t: `${ev.extraType === 'bye' ? 'b' : 'lb'}${ev.extraRuns}`, c: 'bg-slate-500 text-white' }
  if (ev.runsBat === 6) return { t: '6', c: 'bg-fuchsia-500 text-white' }
  if (ev.runsBat === 4) return { t: '4', c: 'bg-sky-500 text-white' }
  if (ev.runsBat === 0) return { t: '•', c: 'bg-white/15 text-slate-200' }
  return { t: String(ev.runsBat), c: 'bg-white/25 text-white' }
}

const ACCENT = {
  striker: { bar: '#fbbf24', tag: 'bg-amber-400 text-black', label: 'ON STRIKE' },
  nonstriker: { bar: '#94a3b8', tag: 'bg-slate-300 text-black', label: 'NON-STRIKER' },
  bowler: { bar: '#f87171', tag: 'bg-red-500 text-white', label: 'BOWLING' },
}

function Card({ kind, children }: { kind: keyof typeof ACCENT; children: React.ReactNode }) {
  const a = ACCENT[kind]
  return (
    <div className="relative overflow-hidden rounded-xl border border-line bg-panel-2 p-2.5 pl-4">
      <div className="absolute inset-y-0 left-0 w-1.5" style={{ background: a.bar }} />
      <span className={`mb-2 inline-block rounded px-1.5 py-0.5 text-[11px] font-extrabold tracking-wider ${a.tag}`}>{a.label}</span>
      {children}
    </div>
  )
}

/** Batsman, non-striker and bowler as three colour-coded cards, plus this over and the partnership. */
export function NowPlaying({ match, displayOver }: { match: Match; displayOver: number }) {
  const inn = match.shown
  const bat = match.battingSide(inn)
  const bowl = match.bowlingSide(inn)
  const strikerLine = inn.batters.find((b) => b.id === inn.strikerId)
  const nonLine = inn.batters.find((b) => b.id === inn.nonStrikerId)
  const bowlerId = inn.bowlerId ?? inn.prevBowlerId
  const bowler = bowlerId ? match.player(bowlerId) : null
  const bowlerLine = bowlerId ? inn.bowlers.get(bowlerId) : undefined
  const overEvents = inn.log.filter((e) => e.over === displayOver)

  // Runs and balls since the last wicket.
  const lastWicket = [...inn.log].reverse().findIndex((e) => e.wicket)
  const sinceWicket = lastWicket === -1 ? inn.log : inn.log.slice(inn.log.length - lastWicket)
  const partnership = { runs: sinceWicket.reduce((s, e) => s + e.total, 0), balls: sinceWicket.filter((e) => e.legal).length }

  const batterCard = (kind: 'striker' | 'nonstriker', line: typeof strikerLine) =>
    line && (
      <Card kind={kind}>
        <div className="flex items-center gap-3">
          <ClickAvatar player={match.player(line.id)} team={bat.team} size={kind === 'striker' ? 52 : 44} />
          <div className="min-w-0 flex-1 text-[15px] font-bold leading-tight text-white">{match.player(line.id).name}</div>
          <div className="shrink-0 text-right"><span className="font-display text-3xl leading-none text-white">{line.runs}</span><span className="ml-1 text-sm text-slate-300">({line.balls})</span></div>
        </div>
        <div className="mt-2 flex gap-3 text-xs text-slate-300"><span>SR <b className="text-white">{strikeRate(line.runs, line.balls)}</b></span><span>4s <b className="text-white">{line.fours}</b></span><span>6s <b className="text-white">{line.sixes}</b></span></div>
      </Card>
    )

  return (
    <div className="space-y-2 rounded-2xl border border-line bg-panel p-2.5">
      <div className="grid gap-2 md:grid-cols-3">
        {batterCard('striker', strikerLine)}
        {batterCard('nonstriker', nonLine)}
        {bowler && (
          <Card kind="bowler">
            <div className="flex items-center gap-3">
              <ClickAvatar player={bowler} team={bowl.team} size={44} />
              <div className="min-w-0 flex-1 leading-tight">
                <div className="text-[15px] font-bold text-white">{bowler.name}</div>
                <div className="text-[11px] capitalize text-slate-300">{bowler.bowling?.type ?? 'part-timer'}{bowlerLine && <> · Econ <b className="text-white">{economy(bowlerLine)}</b></>}</div>
              </div>
            </div>
            {/* the figures are longer than a batsman's, so they get a line to themselves (kept small so the card stays short) */}
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="font-display text-xl leading-none text-white">{bowlerLine ? `${oversText(bowlerLine.legalBalls)}-${bowlerLine.maidens}-${bowlerLine.runs}-${bowlerLine.wickets}` : '0-0-0-0'}</span>
              <span className="text-[10px] uppercase tracking-wider text-slate-400">O-M-R-W</span>
            </div>
          </Card>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-black/20 px-3 py-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs font-bold uppercase tracking-wider text-slate-300">Over {displayOver + 1}</span>
          {overEvents.length === 0 && <span className="text-xs text-slate-400">no balls yet</span>}
          {overEvents.map((e) => { const c = chip(e); return <motion.span key={e.seq} initial={{ scale: 0 }} animate={{ scale: 1 }} className={`grid h-8 min-w-8 place-items-center rounded-full px-1.5 text-sm font-bold ${c.c}`}>{c.t}</motion.span> })}
        </div>
        <div className="text-sm text-slate-300">Partnership <b className="text-white">{partnership.runs}</b> <span className="text-slate-400">({partnership.balls} balls)</span></div>
      </div>
    </div>
  )
}

/** Batsman, non-striker and bowler as three small cells in a row (a phone has no room for three tall cards). */
export function MobileNowPlaying({ match, displayOver }: { match: Match; displayOver: number }) {
  const inn = match.shown
  const bat = match.battingSide(inn)
  const bowl = match.bowlingSide(inn)
  const strikerLine = inn.batters.find((b) => b.id === inn.strikerId)
  const nonLine = inn.batters.find((b) => b.id === inn.nonStrikerId)
  const bowlerId = inn.bowlerId ?? inn.prevBowlerId
  const bowler = bowlerId ? match.player(bowlerId) : null
  const bowlerLine = bowlerId ? inn.bowlers.get(bowlerId) : undefined
  const overEvents = inn.log.filter((e) => e.over === displayOver)
  const lastWicket = [...inn.log].reverse().findIndex((e) => e.wicket)
  const sinceWicket = lastWicket === -1 ? inn.log : inn.log.slice(inn.log.length - lastWicket)
  const partnership = { runs: sinceWicket.reduce((s, e) => s + e.total, 0), balls: sinceWicket.filter((e) => e.legal).length }

  const batColor = accentOf(bat.team), bowlColor = accentOf(bowl.team)
  // a batsman's line: portrait, name, runs big and balls small; the one on strike is brighter and has a marker
  const batRow = (line: typeof strikerLine, strike: boolean) => {
    if (!line) return null
    const pl = match.player(line.id)
    return (
      <div key={line.id} className={`flex items-center gap-1.5 ${strike ? '' : 'opacity-75'}`}>
        <ClickAvatar player={pl} team={bat.team} size={strike ? 34 : 28} />
        <div className="min-w-0 flex-1 leading-tight">
          <div className={`truncate font-bold ${strike ? 'text-[13px] text-white' : 'text-[11px] text-slate-200'}`}>{strike && <span className="mr-1 text-amber-300">▶</span>}{pl.name}</div>
          {strike && <div className="text-[10px] text-slate-400">SR {strikeRate(line.runs, line.balls)} · 4s {line.fours} · 6s {line.sixes}</div>}
        </div>
        <div className="shrink-0 whitespace-nowrap text-right leading-none"><span className={`font-display tabular-nums text-white ${strike ? 'text-2xl' : 'text-lg'}`}>{line.runs}</span><span className="ml-0.5 text-[10px] tabular-nums text-slate-400">({line.balls})</span></div>
      </div>
    )
  }

  return (
    <div className="shrink-0 border-b border-line bg-ink px-2 py-1.5">
      <div className="flex overflow-hidden rounded-lg bg-panel-2 ring-1 ring-white/10">
        <div className="min-w-0 flex-[1.25] space-y-1 border-l-4 px-2 py-1.5" style={{ borderColor: batColor }}>
          {batRow(strikerLine, true)}
          {batRow(nonLine, false)}
        </div>
        {bowler && (
          <div className="min-w-0 flex-1 border-l-4 border-l-transparent px-2 py-1.5" style={{ boxShadow: `inset 3px 0 0 ${bowlColor}` }}>
            <div className="flex items-center gap-1.5">
              <ClickAvatar player={bowler} team={bowl.team} size={30} />
              <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate text-[13px] font-bold text-white">{bowler.name}</div>
                <div className="truncate text-[10px] capitalize text-slate-400">{bowler.bowling?.type ?? 'part-timer'}{bowlerLine && <> · Econ {economy(bowlerLine)}</>}</div>
              </div>
            </div>
            <div className="mt-1 flex items-baseline justify-between gap-1">
              <span className="font-display text-lg leading-none tabular-nums text-white">{bowlerLine ? `${oversText(bowlerLine.legalBalls)}-${bowlerLine.maidens}-${bowlerLine.runs}-${bowlerLine.wickets}` : '0-0-0-0'}</span>
              <span className="text-[9px] uppercase tracking-wider text-slate-500">O-M-R-W</span>
            </div>
          </div>
        )}
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 px-0.5">
        <div className="flex min-w-0 items-center gap-1">
          <span className="mr-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Over {displayOver + 1}</span>
          {overEvents.length === 0 && <span className="text-[11px] text-slate-500">no balls yet</span>}
          {overEvents.map((e) => { const c = chip(e); return <motion.span key={e.seq} initial={{ scale: 0 }} animate={{ scale: 1 }} className={`grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-bold ${c.c}`}>{c.t}</motion.span> })}
        </div>
        <div className="shrink-0 whitespace-nowrap text-[11px] text-slate-300">P'ship <b className="text-white">{partnership.runs}</b> <span className="text-slate-500">({partnership.balls})</span></div>
      </div>
    </div>
  )
}
