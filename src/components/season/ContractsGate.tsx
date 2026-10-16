import { AnimatePresence } from 'framer-motion'
import { useMemo, useState } from 'react'
import { overall } from '../../data/builders'
import { boardBailout, contractsPending, cutCandidates, extendVeteran, feeOf, letGo, retireVeteran, retireYearOf } from '../../season/careers'
import { playerIndex, SQUAD_FLOOR } from '../../season/market'
import { applyShift } from '../../season/progression'
import { selectSeason, useStore, useTeams } from '../../store/useStore'
import { PlayerAvatar, RatingBadge } from '../ui'
import { Sheet } from '../Sheet'
import { FREE_AGENTS } from './shared'

/**
 * At the turn of the year, before anything else: a veteran of yours reaches the end of his career (keep him one more year for a higher fee, or let
 * him retire and a graduate takes his place), and if the yearly bill has left the purse below zero, you choose who to let go. It cannot be dismissed.
 */
export function ContractsGate() {
  const season = useStore(selectSeason)
  const updateSeason = useStore((s) => s.updateSeason)
  const base = useTeams()
  const [notice, setNotice] = useState<string | null>(null)
  const market = season?.market
  const index = useMemo(() => playerIndex(base, market), [base, market])
  if (!season || !market || !season.myTeamId || !contractsPending(season)) return null
  const me = season.myTeamId
  const purse = market.budgets[me] ?? 0
  const pending = market.pending ?? []
  const shown = (id: string) => { const p = index.get(id); return p ? applyShift(p, season.shifts?.[id]) : undefined }
  const squad = (market.squads[me] ?? []).length
  const cuts = cutCandidates(season, index)
  const report = market.report

  return (
    <AnimatePresence>
      <Sheet key="contracts" label="Contracts" onClose={() => undefined} z={88} size="sm">
        <div className="p-5">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.3em] text-amber-300">New year · contracts</div>
          <h2 className="font-display text-4xl leading-none tracking-wide text-white">{pending.length > 0 ? 'Veterans at the end of the road' : 'The books do not balance'}</h2>
          {report && (
            <p className="mt-2 text-sm text-slate-300">
              Last year the team earned <b className="text-emerald-300">+{report.income}</b> and the squad cost <b className="text-red-300">−{report.bill}</b>. The purse is <b className={purse < 0 ? 'text-red-300' : 'text-amber-300'}>{purse}</b> coins.
            </p>
          )}
          {notice && <div className="mt-2 rounded-lg border border-amber-400/50 bg-amber-400/10 px-3 py-2 text-sm text-amber-100" role="status">{notice}</div>}

          {pending.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-slate-400">Each of them could play one more year. Every extra year costs more than the last. If he retires, a graduate from the academy joins in his place.</p>
              {pending.map((o) => {
                const p = shown(o.playerId)
                if (!p) return null
                const was = feeOf(market, index.get(o.playerId) as NonNullable<ReturnType<typeof index.get>>, season.shifts?.[o.playerId])
                return (
                  <div key={o.playerId} className="rounded-2xl border border-line bg-panel p-2.5">
                    <div className="flex items-center gap-3">
                      <PlayerAvatar player={p} team={FREE_AGENTS} size={40} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold text-white">{p.name}</div>
                        <div className="text-[11px] text-slate-400">{p.role} · career since {retireYearOf({ ...market, retireAt: {} }, o.playerId, season.year) - 7}+ · asks <b className="text-amber-300">{o.fee}</b> a year (now {was}){o.years > 0 ? ` · extended ${o.years}×` : ''}</div>
                      </div>
                      <RatingBadge value={overall(p)} size="sm" />
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => { const out = extendVeteran(season, o.playerId); if (out.error) setNotice(out.error); else { updateSeason(() => out.season); setNotice(null) } }}
                        disabled={purse < o.fee}
                        className="rounded-full bg-amber-400 py-2 text-sm font-extrabold text-black disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                      >{purse < o.fee ? `Cannot afford ${o.fee}` : `Keep · ${o.fee}`}</button>
                      <button onClick={() => { updateSeason((s) => retireVeteran(s, index, o.playerId)); setNotice(null) }} className="rounded-full border border-line py-2 text-sm font-bold text-slate-200 hover:border-slate-400">Let him retire</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {pending.length === 0 && purse < 0 && (
            <div className="mt-3">
              <p className="mb-2 text-sm text-slate-300">You are <b className="text-red-300">{-purse}</b> coins short. Choose who to let go: their yearly fee comes back, and they leave for the unsigned pool.</p>
              <div className="space-y-1.5">
                {cuts.map(({ player, fee }) => (
                  <button
                    key={player.id}
                    disabled={squad <= SQUAD_FLOOR}
                    onClick={() => { const out = letGo(season, index, player.id); if (out.error) setNotice(out.error); else { updateSeason(() => out.season); setNotice(null) } }}
                    className="flex w-full items-center gap-3 rounded-xl border border-line bg-panel p-2 text-left transition hover:border-red-400 disabled:opacity-40"
                  >
                    <PlayerAvatar player={shown(player.id) ?? player} team={FREE_AGENTS} size={36} />
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-white">{player.name}</span><span className="text-[11px] text-slate-400">{player.role} · fee {fee}</span></span>
                    <RatingBadge value={overall(shown(player.id) ?? player)} size="sm" />
                    <span className="text-xs font-bold text-red-300">Let go · +{fee}</span>
                  </button>
                ))}
              </div>
              {squad <= SQUAD_FLOOR && <button onClick={() => updateSeason(boardBailout)} className="mt-3 w-full rounded-full bg-amber-400 py-2.5 text-sm font-extrabold text-black">Ask the board to cover the rest</button>}
            </div>
          )}
        </div>
      </Sheet>
    </AnimatePresence>
  )
}
