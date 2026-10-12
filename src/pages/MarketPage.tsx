import { AnimatePresence } from 'framer-motion'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Sheet } from '../components/Sheet'
import { MarketConfirm, type Confirm } from '../components/season/MarketConfirm'
import { SigningOverlay, type Signing } from '../components/season/SigningOverlay'
import { FREE_AGENTS, useTeamMap } from '../components/season/shared'
import { PlayerAvatar, RatingBadge, TeamCrest } from '../components/ui'
import { overall } from '../data/builders'
import { YOUTH_BY_ID } from '../data/youthPool'
import { daysBetween, formatDate } from '../season/dates'
import { acceptOffer, askingFromTeam, declineOffer, marketValue, nextWindow, openWindow, playerIndex, recentForm, refundOf, releasePlayer, signPlayer, SQUAD_CAP, SQUAD_FLOOR } from '../season/market'
import { applyShift } from '../season/progression'
import { paths } from '../routes'
import { selectSeason, selectSession, useStore, useTeams } from '../store/useStore'
import type { Player, Team } from '../types'

const stars = (potential: number) => Math.max(1, Math.min(5, Math.round((potential - 50) / 8)))

function Stars({ n }: { n: number }) {
  return <span className="whitespace-nowrap text-[11px] leading-none tracking-tight text-amber-300" title="How far he could grow">{'★'.repeat(n)}<span className="text-slate-600">{'★'.repeat(5 - n)}</span></span>
}

type View = 'unsigned' | 'teams' | 'squad'

export function MarketPage() {
  const season = useStore(selectSeason)
  const session = useStore(selectSession)
  const updateSeason = useStore((s) => s.updateSeason)
  const teams = useTeamMap()
  const base = useTeams()
  const [view, setView] = useState<View>('unsigned')
  const [teamPick, setTeamPick] = useState<string | null>(null)
  const [roomFor, setRoomFor] = useState<{ player: Player; from: string | null; price: number } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [signed, setSigned] = useState<Signing | null>(null)
  const [confirm, setConfirm] = useState<Confirm | null>(null)
  const [role, setRole] = useState<'all' | Player['role']>('all')

  const market = season?.market
  const index = useMemo(() => playerIndex(base, market), [base, market])
  if (!season || !market || !season.myTeamId) {
    return <div className="rounded-2xl border border-dashed border-line p-12 text-center text-slate-400">The market opens for careers where you manage a team. <Link to={paths.sessions} className="text-indigo-300 hover:underline">Your careers</Link></div>
  }
  const me = teams.get(season.myTeamId)
  const today = season.today
  const win = openWindow(season, today)
  const next = nextWindow(season, today)
  const purse = market.budgets[season.myTeamId] ?? 0
  const squadIds = market.squads[season.myTeamId] ?? []
  const shown = (p: Player) => applyShift(p, season.shifts?.[p.id])
  const worth = (p: Player) => marketValue(p, recentForm(season, p.id), season.shifts?.[p.id])

  const attempt = (p: Player, from: string | null, price: number, dropId?: string) => {
    const out = signPlayer(season, index, season.myTeamId as string, p.id, today, dropId)
    if (out.error) { setNotice(out.error); return }
    updateSeason(() => out.season)
    setNotice(null)
    setRoomFor(null)
    if (me) setSigned({ player: shown(p), to: me, from: from ? (teams.get(from) ?? null) : null, fee: price, kind: from ? 'buy' : 'sign' })
  }
  const start = (p: Player, from: string | null, price: number) => {
    if (squadIds.length >= SQUAD_CAP) setRoomFor({ player: p, from, price })
    else attempt(p, from, price)
  }
  const release = (p: Player) => {
    const out = releasePlayer(season, index, season.myTeamId as string, p.id, today)
    if (out.error) setNotice(out.error)
    else { updateSeason(() => out.season); setNotice(`${p.name} has been released. You got ${refundOf(season, index, season.myTeamId as string, p.id)} coins back.`) }
  }

  const row = (p: Player, opts: { price?: number; from?: string | null; action?: React.ReactNode; teamBadge?: Team | null }) => {
    const sp = shown(p)
    const pot = YOUTH_BY_ID.get(p.id)?.potential
    const o = overall(sp)
    return (
      <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-line bg-panel p-2.5">
        <PlayerAvatar profile player={sp} team={opts.teamBadge ?? FREE_AGENTS} size={46} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold text-white">{p.name}</div>
          <div className="truncate text-[11px] text-slate-400">{p.role}{sp.bowling ? ` · ${sp.bowling.type}` : ''}{YOUTH_BY_ID.get(p.id) ? ` · ${YOUTH_BY_ID.get(p.id)!.series}` : opts.teamBadge ? ` · ${opts.teamBadge.name}` : ''}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[10px] tabular-nums text-slate-500">
            <span>BAT {Math.round((sp.batting.technique + sp.batting.power + sp.batting.temperament) / 3)}</span>
            {sp.bowling && <span>BOWL {Math.round((sp.bowling.accuracy + sp.bowling.variation) / 2)}</span>}
            <span>FLD {sp.fielding}</span>
            {pot ? <Stars n={stars(pot)} /> : null}
          </div>
        </div>
        <RatingBadge value={o} size="sm" />
        {opts.action}
      </div>
    )
  }

  const buyBtn = (p: Player, price: number, from: string | null, disabledWhy?: string) => {
    const why = disabledWhy ?? (!win ? 'Market closed' : price > purse && squadIds.length < SQUAD_CAP ? 'Too expensive' : null)
    return (
      <button
        disabled={!!why} onClick={() => setConfirm({ kind: 'buy', player: shown(p), from: from ? (teams.get(from) ?? null) : null, price })} title={why ?? `Sign him for ${price} coins`}
        className="shrink-0 rounded-full bg-amber-400 px-3.5 py-2 text-xs font-extrabold leading-none text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
      >{why ?? <>Cost · {price}</>}</button>
    )
  }

  const offers = (market.offers ?? []).filter((o) => o.expires >= today)
  const takeOffer = (id: string) => {
    const o = offers.find((x) => x.id === id)
    const out = acceptOffer(season, index, id, today)
    if (out.error) { setNotice(out.error); return }
    updateSeason(() => out.season)
    setNotice(o ? `${index.get(o.playerId)?.name ?? 'He'} has joined ${teams.get(o.teamId)?.name ?? 'them'}. You got ${o.fee} coins.` : null)
  }

  const matches = (p: Player) => role === 'all' || p.role === role
  const pool = market.pool.map((id) => index.get(id)).filter((p): p is Player => !!p && matches(p)).sort((a, b) => overall(shown(b)) - overall(shown(a)))
  const otherTeams = Object.keys(market.squads).filter((id) => id !== season.myTeamId)
  const pickedTeam = teamPick ?? otherTeams[0]
  const theirs = (market.squads[pickedTeam] ?? []).map((id) => index.get(id)).filter((p): p is Player => !!p && matches(p)).sort((a, b) => overall(shown(b)) - overall(shown(a)))
  const mine = squadIds.map((id) => index.get(id)).filter((p): p is Player => !!p && matches(p))
  const log = [...market.log].reverse().slice(0, 12)
  const chip = (on: boolean) => `rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${on ? 'border-indigo-400 bg-indigo-500 text-white' : 'border-line text-slate-300 hover:text-white'}`

  return (
    <div>
      <div className="mb-4 rounded-3xl border bg-panel p-4" style={{ borderColor: win ? '#fbbf24' : '#252a3a', background: win ? 'linear-gradient(110deg, #fbbf2422, #10131c 70%)' : undefined }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-widest text-amber-300">{win ? `${win.name} is open` : 'Market closed'}</div>
            <h2 className="font-display text-4xl leading-none tracking-wide text-white">Player market</h2>
            <p className="mt-1 text-sm text-slate-300">
              {win
                ? <>It closes on <b className="text-white">{formatDate(win.end)}</b> ({Math.max(0, daysBetween(today, win.end))} days left). Computer teams are shopping too, so good players do not wait.</>
                : next ? <>The next window is the <b className="text-white">{next.name}</b>, {formatDate(next.start)} to {formatDate(next.end)} ({daysBetween(today, next.start)} days away).</> : 'No more windows this year.'}
            </p>
          </div>
          <div className="flex items-center gap-4 text-center">
            <div><div className="font-display text-4xl leading-none text-amber-300">{purse}</div><div className="text-[10px] uppercase tracking-wider text-slate-400">coins</div></div>
            <div><div className={`font-display text-4xl leading-none ${squadIds.length >= SQUAD_CAP ? 'text-red-300' : 'text-white'}`}>{squadIds.length}<span className="text-xl text-slate-500">/{SQUAD_CAP}</span></div><div className="text-[10px] uppercase tracking-wider text-slate-400">squad</div></div>
          </div>
        </div>
        {win && <p className="mt-2 text-xs text-slate-400">A full squad ({SQUAD_CAP}) has to release someone to sign someone. Releasing pays 70% of what another team would charge for him.</p>}
      </div>

      {notice && <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-amber-400/50 bg-amber-400/10 px-3 py-2 text-sm text-amber-100" role="status"><span>{notice}</span><button onClick={() => setNotice(null)} className="font-bold" aria-label="Dismiss">✕</button></div>}

      {offers.length > 0 && (
        <section className="mb-4 rounded-3xl border-2 border-sky-400/60 bg-sky-400/5 p-3">
          <h3 className="mb-2 font-display text-2xl tracking-wide text-sky-200">Offers for your players</h3>
          <div className="space-y-2">
            {offers.map((o) => {
              const p = index.get(o.playerId)
              const buyer = teams.get(o.teamId)
              if (!p || !buyer) return null
              return (
                <div key={o.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-panel p-2.5">
                  <PlayerAvatar profile player={shown(p)} team={me ?? FREE_AGENTS} size={44} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-white">{p.name} <span className="text-xs font-normal text-slate-400">· worth {worth(p)}</span></div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-300"><TeamCrest team={buyer} size={16} />{buyer.name} offers <b className="text-amber-300">{o.fee} coins</b> <span className="text-slate-500">· until {formatDate(o.expires)}</span></div>
                  </div>
                  <div className="flex gap-2">
                    <button disabled={!win || squadIds.length <= SQUAD_FLOOR} onClick={() => setConfirm({ kind: 'sell', player: shown(p), from: me ?? null, price: o.fee, buyer, offerId: o.id })} title={!win ? 'Market closed' : squadIds.length <= SQUAD_FLOOR ? `A squad needs ${SQUAD_FLOOR}` : 'Sell him'} className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-extrabold leading-none text-black hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">Accept</button>
                    <button onClick={() => updateSeason((s) => declineOffer(s, o.id))} className="rounded-full border border-line px-4 py-2 text-xs font-bold leading-none text-slate-200 hover:border-slate-400">Decline</button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button className={chip(view === 'unsigned')} onClick={() => setView('unsigned')}>Unsigned ({market.pool.length})</button>
        <button className={chip(view === 'teams')} onClick={() => setView('teams')}>Other teams</button>
        <button className={chip(view === 'squad')} onClick={() => setView('squad')}>My squad ({squadIds.length})</button>
        <select value={role} onChange={(e) => setRole(e.target.value as typeof role)} className="ml-auto rounded-lg border border-line bg-panel-2 px-2 py-1.5 text-sm text-white" aria-label="Filter by role">
          <option value="all">All roles</option><option value="BAT">Batsmen</option><option value="BOWL">Bowlers</option><option value="AR">All-rounders</option><option value="WK">Keepers</option>
        </select>
      </div>

      {view === 'unsigned' && (
        <div className="space-y-2">
          <p className="text-xs text-slate-400">Young players with no team. The stars show how far each could grow, and some will. Their price is what they are worth today.</p>
          {pool.length === 0 ? <p className="rounded-2xl border border-dashed border-line p-8 text-center text-slate-400">Nobody unsigned matches. The other teams have been busy.</p> : pool.map((p) => row(p, { teamBadge: null, action: buyBtn(p, market.asking[p.id] ?? worth(p), null) }))}
        </div>
      )}

      {view === 'teams' && (
        <div>
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {otherTeams.map((id) => { const t = teams.get(id); return t ? <button key={id} onClick={() => setTeamPick(id)} className={`flex shrink-0 items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold ${pickedTeam === id ? 'border-indigo-400 bg-indigo-500/20 text-white' : 'border-line text-slate-300'}`}><TeamCrest team={t} size={20} />{t.short}</button> : null })}
          </div>
          <div className="space-y-2">
            <p className="text-xs text-slate-400">Teams charge more than a player is worth, and a lot more for their stars. A team with only {SQUAD_FLOOR} players will not sell.</p>
            {theirs.map((p) => {
              const price = askingFromTeam(season, index, pickedTeam, p.id)
              const t = teams.get(pickedTeam) ?? null
              return row(p, { teamBadge: t, action: buyBtn(p, price, pickedTeam, (market.squads[pickedTeam]?.length ?? 0) <= SQUAD_FLOOR ? 'Not for sale' : undefined) })
            })}
          </div>
        </div>
      )}

      {view === 'squad' && (
        <div className="space-y-2">
          {mine.map((p) => row(p, {
            teamBadge: me ?? null,
            action: <button disabled={!win || squadIds.length <= SQUAD_FLOOR} onClick={() => setConfirm({ kind: 'release', player: shown(p), from: me ?? null, price: refundOf(season, index, season.myTeamId as string, p.id) })} title={!win ? 'Market closed' : squadIds.length <= SQUAD_FLOOR ? `A squad needs ${SQUAD_FLOOR}` : `Release for ${refundOf(season, index, season.myTeamId as string, p.id)} coins back`} className="shrink-0 rounded-full border border-red-400/60 px-3 py-2 text-xs font-bold leading-none text-red-200 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-40">Release · +{refundOf(season, index, season.myTeamId as string, p.id)}</button>,
          }))}
        </div>
      )}

      {log.length > 0 && (
        <section className="mt-6">
          <h3 className="mb-2 font-display text-2xl tracking-wide">Latest moves</h3>
          <div className="divide-y divide-line/60 rounded-2xl border border-line bg-panel">
            {log.map((t) => {
              const from = t.from ? teams.get(t.from) : null
              const to = t.to ? teams.get(t.to) : null
              const p = index.get(t.playerId)
              const crest = (team: Team | null | undefined) => team && (
                <Link to={paths.careerTeam(team.id)} className="inline-flex items-center gap-1 font-semibold text-white hover:underline" title={`Go to ${team.name}`}><TeamCrest team={team} size={18} />{team.name}</Link>
              )
              return (
                <div key={t.id} className="flex items-center gap-3 px-3 py-2 text-sm text-slate-300">
                  {p ? <PlayerAvatar profile player={shown(p)} team={to ?? from ?? FREE_AGENTS} size={40} /> : <span className="h-10 w-10 shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2">
                      <b className="text-white">{t.name}</b>
                      {p && <span className="rounded bg-white/10 px-1.5 text-[11px] font-bold text-slate-200">{overall(shown(p))}</span>}
                      <span className="text-xs text-slate-500">{formatDate(t.date)}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[13px]">
                      {t.kind === 'release'
                        ? <>released by {crest(from)}</>
                        : <>{t.kind === 'sign' ? 'signed by' : 'bought by'} {crest(to)}{from ? <>from {crest(from)}</> : <span className="text-slate-400">from the unsigned pool</span>}<span className="text-slate-500">· {t.fee} {t.fee === 1 ? 'coin' : 'coins'}</span></>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <AnimatePresence>
        {roomFor && (
          <Sheet label="Make room" onClose={() => setRoomFor(null)} size="sm">
            <div className="p-5">
              <button onClick={() => setRoomFor(null)} aria-label="Close" className="absolute right-3 top-3 rounded-lg bg-black/40 px-2.5 py-1 text-sm font-bold text-white hover:bg-black/60">✕</button>
              <h2 className="pr-10 font-display text-3xl tracking-wide text-white">Your squad is full</h2>
              <p className="mb-3 text-sm text-slate-300">To sign <b className="text-white">{roomFor.player.name}</b> for {roomFor.price}, choose someone to release. They go back to the unsigned pool and you get 70% of what another team would charge for them.</p>
              <div className="space-y-1.5">
                {squadIds.map((id) => index.get(id)).filter((p): p is Player => !!p).sort((a, b) => overall(shown(a)) - overall(shown(b))).map((p) => (
                  <button key={p.id} onClick={() => attempt(roomFor.player, roomFor.from, roomFor.price, p.id)} className="flex w-full items-center gap-3 rounded-xl border border-line bg-panel p-2 text-left transition hover:border-red-400">
                    <PlayerAvatar player={shown(p)} team={me ?? FREE_AGENTS} size={36} />
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-white">{p.name}</span><span className="text-[11px] text-slate-400">{p.role} · worth {worth(p)}</span></span>
                    <RatingBadge value={overall(shown(p))} size="sm" />
                    <span className="text-xs font-bold text-red-300">Release</span>
                  </button>
                ))}
              </div>
            </div>
          </Sheet>
        )}
        {confirm && (
          <MarketConfirm
            confirm={confirm} season={season} teams={teams} me={me} purse={purse}
            seasons={[...(session?.history ?? []), season]}
            full={confirm.kind === 'buy' && squadIds.length >= SQUAD_CAP}
            onClose={() => setConfirm(null)}
            onConfirm={() => {
              const c = confirm
              setConfirm(null)
              const raw = index.get(c.player.id) ?? c.player
              if (c.kind === 'buy') start(raw, c.from?.id ?? null, c.price)
              else if (c.kind === 'release') release(raw)
              else if (c.offerId) takeOffer(c.offerId)
            }}
          />
        )}
        {signed && <SigningOverlay signing={signed} onClose={() => setSigned(null)} />}
      </AnimatePresence>
    </div>
  )
}
