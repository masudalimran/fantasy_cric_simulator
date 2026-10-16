import { motion } from 'framer-motion'
import type { Side } from '../../engine/types'
import type { TournamentIntroData } from '../../season/tournamentIntro'
import type { Fixture } from '../../season/types'
import type { Team } from '../../types'
import { TeamLogo } from '../season/Details'
import { accentOf } from '../ui'
import { TrophyArt, trophyOf } from './TrophyArt'

const KIND_LABEL: Record<string, string> = { league: 'League', cup: 'Cup', knockout: 'Knockout', series: 'Series' }

/** The most standings rows shown (the two teams playing are always included). */
const MAX_ROWS = 8

/**
 * Before the toss: the tournament this match belongs to. Its trophy rises and glints, with the name, the stage, last year's winners and
 * the standings with the two teams about to play picked out. Tap Continue (or Skip) to carry on to the toss.
 */
export function TournamentIntro({ data, name, fixture, sides, mySide, teams, onDone }: {
  data: TournamentIntroData; name: string; fixture: Fixture; sides: [Side, Side]; mySide: 0 | 1 | null; teams: Map<string, Team>; onDone: () => void
}) {
  const { competition, rows, tableTitle, defending, titles } = data
  const accent = accentOf(sides[mySide ?? 0].team)
  const playing = new Set(sides.map((s) => s.team.id))
  // the table, shortened to a few rows around the teams that are playing
  const shown = (() => {
    if (rows.length <= MAX_ROWS) return rows.map((r, i) => ({ r, pos: i + 1 }))
    const keep = new Set<number>(rows.map((r, i) => (i < 4 || playing.has(r.teamId) ? i : -1)).filter((i) => i >= 0))
    for (let i = 0; keep.size < MAX_ROWS && i < rows.length; i++) keep.add(i)
    return [...keep].sort((a, b) => a - b).map((i) => ({ r: rows[i], pos: i + 1 }))
  })()
  const trophy = trophyOf(competition)
  return (
    <div className="fixed inset-0 z-30 flex flex-col overflow-hidden bg-ink" style={{ paddingTop: 'var(--sat)' }} aria-label={`${name}, tournament`}>
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 22%, #fbbf2455, transparent 58%), radial-gradient(ellipse at 50% 100%, #1d4ed833, transparent 60%)' }} />
      <motion.div className="pointer-events-none absolute left-1/2 top-[7%] h-72 w-72 -translate-x-1/2 rounded-full opacity-30" style={{ background: 'conic-gradient(from 0deg, #fbbf2400, #fbbf24aa, #fbbf2400, #fbbf24aa, #fbbf2400, #fbbf24aa, #fbbf2400)' }} animate={{ rotate: 360 }} transition={{ duration: 22, repeat: Infinity, ease: 'linear' }} />
      <div className="relative flex shrink-0 items-center gap-2 px-3 pt-3">
        <div className="min-w-0 flex-1 text-[11px] font-extrabold uppercase tracking-widest text-amber-300">{KIND_LABEL[competition.kind] ?? 'Tournament'} · {competition.format.toUpperCase()}</div>
        <button onClick={onDone} className="rounded-full border border-line px-3.5 py-1.5 text-xs font-bold text-slate-200 active:bg-white/10">Skip</button>
      </div>

      <div className="relative min-h-0 flex-1 overflow-y-auto px-4 pb-3">
        <div className="flex flex-col items-center pt-2 text-center">
          <motion.div initial={{ y: 70, scale: 0.5, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 120, damping: 14 }}>
            <motion.div animate={{ y: [0, -6, 0] }} transition={{ delay: 1, duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}><TrophyArt kind={trophy} size={150} accent={accent} shine /></motion.div>
          </motion.div>
          <motion.h1 className="mt-1 font-display text-4xl leading-none tracking-wide text-white" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>{name}</motion.h1>
          <motion.div className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-200" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}>{fixture.stage}</motion.div>
          {competition.blurb && <p className="mt-2 max-w-sm text-xs text-slate-400">{competition.blurb}</p>}
        </div>

        {defending && (
          <motion.div className="mx-auto mt-3 flex max-w-sm items-center gap-3 rounded-2xl border border-amber-400/40 bg-amber-400/5 p-2.5" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 }}>
            <TeamLogo team={defending.team} size={38} />
            <div className="min-w-0 text-left">
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-amber-300">Defending champions · {defending.year}</div>
              <div className="truncate text-sm font-bold text-white">{defending.team.name}{(titles.get(defending.team.id) ?? 0) > 1 ? ` · ${titles.get(defending.team.id)} titles` : ''}</div>
            </div>
          </motion.div>
        )}

        {shown.length > 0 && (
          <motion.div className="mx-auto mt-3 max-w-sm overflow-hidden rounded-2xl border border-line bg-panel" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}>
            <div className="border-b border-line px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-widest text-slate-300">{tableTitle}</div>
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="px-2 py-1 text-left font-medium">#</th><th className="px-1 py-1 text-left font-medium">Team</th><th className="px-1 py-1 text-right font-medium">P</th><th className="px-1 py-1 text-right font-medium">W</th><th className="px-1 py-1 text-right font-medium">L</th><th className="px-1 py-1 text-right font-medium">NRR</th><th className="px-2 py-1 text-right font-medium">Pts</th></tr></thead>
              <tbody>
                {shown.map(({ r, pos }, i) => {
                  const t = teams.get(r.teamId)
                  const on = playing.has(r.teamId)
                  return (
                    <motion.tr key={r.teamId} className={`border-t border-line/60 ${on ? 'bg-amber-400/10' : ''}`} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.1 + i * 0.07 }}>
                      <td className="px-2 py-1.5 text-slate-400">{pos}</td>
                      <td className="px-1 py-1.5"><span className="flex items-center gap-1.5"><TeamLogo team={t ?? sides[0].team} size={20} /><span className={`truncate text-[13px] ${on ? 'font-extrabold text-white' : 'text-slate-200'}`}>{t?.short ?? r.teamId}</span>{(titles.get(r.teamId) ?? 0) > 0 && <span className="text-[10px] text-amber-300" title="Titles won in this career">🏆{titles.get(r.teamId)}</span>}</span></td>
                      <td className="px-1 py-1.5 text-right tabular-nums text-slate-300">{r.played}</td>
                      <td className="px-1 py-1.5 text-right tabular-nums text-slate-300">{r.won}</td>
                      <td className="px-1 py-1.5 text-right tabular-nums text-slate-300">{r.lost}</td>
                      <td className="px-1 py-1.5 text-right tabular-nums text-slate-400">{r.nrr >= 0 ? '+' : ''}{r.nrr.toFixed(2)}</td>
                      <td className="px-2 py-1.5 text-right font-bold tabular-nums text-white">{r.points}</td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </motion.div>
        )}

        <motion.div className="mx-auto mt-3 flex max-w-sm items-center justify-center gap-4 rounded-2xl bg-white/5 p-3" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.3 }}>
          <div className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center"><TeamLogo team={sides[0].team} size={46} /><span className="max-w-full truncate text-xs font-bold text-white">{sides[0].team.name}</span>{mySide === 0 && <span className="rounded bg-amber-400 px-1 text-[9px] font-extrabold text-black">YOU</span>}</div>
          <span className="font-display text-2xl text-slate-500">V</span>
          <div className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center"><TeamLogo team={sides[1].team} size={46} /><span className="max-w-full truncate text-xs font-bold text-white">{sides[1].team.name}</span>{mySide === 1 && <span className="rounded bg-amber-400 px-1 text-[9px] font-extrabold text-black">YOU</span>}</div>
        </motion.div>
      </div>

      <div className="relative shrink-0 border-t border-line bg-panel px-4 pt-2" style={{ paddingBottom: 'calc(var(--sab) + 10px)' }}>
        <button onClick={onDone} className="cta-pulse h-12 w-full rounded-full bg-emerald-500 font-display text-2xl tracking-wider text-black active:bg-emerald-400">CONTINUE</button>
      </div>
    </div>
  )
}
