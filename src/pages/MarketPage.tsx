import { AnimatePresence } from 'framer-motion'
import { useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Sheet } from '../components/Sheet'
import { TransferRow } from '../components/season/TransferRow'
import { MarketConfirm, type Confirm } from '../components/season/MarketConfirm'
import { SigningOverlay, type Signing } from '../components/season/SigningOverlay'
import { FREE_AGENTS, useTeamMap } from '../components/season/shared'
import { OverseasTag, PlayerAvatar, RatingBadge, TeamCrest } from '../components/ui'
import { NewTalents, type TalentCard } from '../components/season/NewsScreens'
import { markSeen, useSeen } from '../tips'
import { overall } from '../data/builders'
import { YOUTH_BY_ID } from '../data/youthPool'
import { originOf } from '../data/origin'
import { daysBetween, formatDate } from '../season/dates'
import { windowOfDate, acceptOffer, askingFromTeam, declineOffer, marketValue, nextWindow, openWindow, playerIndex, recentForm, refundOf, releasePlayer, signPlayer, SQUAD_CAP, SQUAD_FLOOR } from '../season/market'
import { applyShift } from '../season/progression'
import { billOf, feeOf, retireYearOf } from '../season/careers'
import { paths } from '../routes'
import { selectSeason, selectSession, useStore, useTeams } from '../store/useStore'
import type { Season } from '../season/types'
import type { Player, Team } from '../types'

const stars = (potential: number) => Math.max(1, Math.min(5, Math.round((potential - 50) / 8)))

function Stars({ n }: { n: number }) {
  return <span className="whitespace-nowrap text-[11px] leading-none tracking-tight text-amber-300" title="How far he could grow">{'★'.repeat(n)}<span className="text-slate-600">{'★'.repeat(5 - n)}</span></span>
}

type View = 'unsigned' | 'teams' | 'squad' | 'transfers'

export function MarketPage() {
  const season = useStore(selectSeason)
  const session = useStore(selectSession)
  const updateSeason = useStore((s) => s.updateSeason)
  const teams = useTeamMap()
  const base = useTeams()
  const [params] = useSearchParams()
  const [view, setView] = useState<View>(() => (['unsigned', 'teams', 'squad', 'transfers'].includes(params.get('tab') ?? '') ? (params.get('tab') as View) : 'unsigned'))
  const [windowPick, setWindowPick] = useState<string>(() => params.get('window') ?? 'all')
  const [teamPick, setTeamPick] = useState<string | null>(null)
  const [roomFor, setRoomFor] = useState<{ player: Player; from: string | null; price: number } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [signed, setSigned] = useState<Signing | null>(null)
  const [confirm, setConfirm] = useState<Confirm | null>(null)
  const [role, setRole] = useState<'all' | Player['role']>('all')
  const [q, setQ] = useState('') // search by name or anime
  const [sortBy, setSortBy] = useState<'rating' | 'price' | 'name'>('rating')
  const [series, setSeries] = useState('all') // only players from one anime or game
  const [undo, setUndo] = useState<{ text: string; before: Season; logLen: number } | null>(null)
  const undoTimer = useRef<number | undefined>(undefined)

  const market = season?.market
  const index = useMemo(() => playerIndex(base, market), [base, market])
  // the first time you open the market in a window: the best young players waiting in the pool
  const talentsKey = season ? `talents:${session?.id ?? ''}:${season.year}:${openWindow(season, season.today)?.id ?? ''}` : ''
  const talentsSeen = useSeen(talentsKey)
  const [talentsOpen, setTalentsOpen] = useState<boolean | null>(null)
  const talents: TalentCard[] = useMemo(() => {
    if (!season || !market || !openWindow(season, season.today)) return []
    return market.pool
      .map((id) => ({ id, p: index.get(id), pot: YOUTH_BY_ID.get(id)?.potential ?? 0 }))
      .filter((x): x is { id: string; p: Player; pot: number } => !!x.p)
      .sort((a, b) => b.pot - a.pot || overall(b.p) - overall(a.p))
      .slice(0, 4)
      .map((x) => ({ player: x.p, stars: stars(x.pot), price: market.asking[x.id] ?? 0 }))
  }, [season, market, index])
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

  // A few seconds to take a signing or a release back, as long as nothing else has happened in the market since.
  const offerUndo = (text: string, before: Season, after: Season) => {
    window.clearTimeout(undoTimer.current)
    setUndo({ text, before, logLen: after.market?.log.length ?? 0 })
    undoTimer.current = window.setTimeout(() => setUndo(null), 12000)
  }
  const takeBack = () => {
    if (!undo) return
    window.clearTimeout(undoTimer.current)
    if ((season.market?.log.length ?? 0) === undo.logLen) { updateSeason(() => undo.before); setNotice('Done, it never happened.') }
    else setNotice('Too late to undo: the market has moved on.')
    setUndo(null)
  }
  const attempt = (p: Player, from: string | null, price: number, dropId?: string) => {
    const out = signPlayer(season, index, season.myTeamId as string, p.id, today, dropId)
    if (out.error) { setNotice(out.error); return }
    updateSeason(() => out.season)
    offerUndo(`Signed ${p.name} for ${price} coins.`, season, out.season)
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
    else { updateSeason(() => out.season); offerUndo(`${p.name} released. You got ${refundOf(season, index, season.myTeamId as string, p.id)} coins back.`, season, out.season) }
  }

  const row = (p: Player, opts: { price?: number; from?: string | null; action?: React.ReactNode; teamBadge?: Team | null }) => {
    const sp = shown(p)
    const pot = YOUTH_BY_ID.get(p.id)?.potential
    const o = overall(sp)
    return (
      <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-line bg-panel p-2.5">
        <PlayerAvatar profile player={sp} team={opts.teamBadge ?? FREE_AGENTS} size={46} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5 font-semibold text-white"><span className="truncate">{p.name}</span>{opts.teamBadge && <OverseasTag playerId={p.id} team={opts.teamBadge} />}</div>
          <div className="truncate text-[11px] text-slate-400">{p.role}{sp.bowling ? ` · ${sp.bowling.type}` : ''}{originOf(p.id) ? ` · ${originOf(p.id)!.series}` : opts.teamBadge ? ` · ${opts.teamBadge.name}` : ''}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] tabular-nums text-slate-500">
            <span>BAT {Math.round((sp.batting.technique + sp.batting.power + sp.batting.temperament) / 3)}</span>
            {sp.bowling && <span>BOWL {Math.round((sp.bowling.accuracy + sp.bowling.variation) / 2)}</span>}
            <span>FLD {sp.fielding}</span>
            {pot ? <Stars n={stars(pot)} /> : null}
            {squadIds.includes(p.id) && <span className="text-sky-300" title="Yearly fee · seasons left in his career">{feeOf(market, p, season.shifts?.[p.id])}/yr · {Math.max(0, retireYearOf(market, p.id, season.year) - season.year)}y left</span>}
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

  const needle = q.trim().toLowerCase()
  const matches = (p: Player) => (role === 'all' || p.role === role) && (series === 'all' || originOf(p.id)?.series === series) && (!needle || p.name.toLowerCase().includes(needle) || (originOf(p.id)?.series ?? '').toLowerCase().includes(needle))
  const seriesList = [...new Set([...index.keys()].map((id) => originOf(id)?.series).filter((x): x is string => !!x))].sort()
  const byOrder = (price: (p: Player) => number) => (a: Player, b: Player) =>
    sortBy === 'name' ? a.name.localeCompare(b.name) : sortBy === 'price' ? price(a) - price(b) : overall(shown(b)) - overall(shown(a))
  const pool = market.pool.map((id) => index.get(id)).filter((p): p is Player => !!p && matches(p)).sort(byOrder((p) => market.asking[p.id] ?? 0))
  const otherTeams = Object.keys(market.squads).filter((id) => id !== season.myTeamId)
  // every other team's players by default; a team's crest narrows it to that team
  const pickedTeam = teamPick ?? 'all'
  const owners = new Map<string, string>()
  const theirs = (pickedTeam === 'all' ? otherTeams : [pickedTeam])
    .flatMap((owner) => (market.squads[owner] ?? []).map((id) => { owners.set(id, owner); return { owner, p: index.get(id) } }))
    .filter((x): x is { owner: string; p: Player } => !!x.p && matches(x.p))
    .sort((a, b) => byOrder((p) => askingFromTeam(season, index, owners.get(p.id) ?? '', p.id))(a.p, b.p))
  const mine = squadIds.map((id) => index.get(id)).filter((p): p is Player => !!p && matches(p)).sort(byOrder(worth))
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
                ? <>Closes <b className="text-white">{formatDate(win.end)}</b> ({Math.max(0, daysBetween(today, win.end))} days left). Good players do not wait.</>
                : next ? <>The next window is the <b className="text-white">{next.name}</b>, {formatDate(next.start)} to {formatDate(next.end)} ({daysBetween(today, next.start)} days away).</> : 'No more windows this year.'}
            </p>
          </div>
          <div className="flex items-center gap-4 text-center">
            <div><div className={`font-display text-4xl leading-none ${purse < 0 ? 'text-red-300' : 'text-amber-300'}`}>{purse}</div><div className="text-[11px] uppercase tracking-wider text-slate-400">coins</div></div>
            <div title="What your squad costs every year, paid out of the income your team earns"><div className="font-display text-4xl leading-none text-sky-200">{billOf(market, season.myTeamId, index, season.shifts)}</div><div className="text-[11px] uppercase tracking-wider text-slate-400">a year</div></div>
            <div><div className={`font-display text-4xl leading-none ${squadIds.length >= SQUAD_CAP ? 'text-red-300' : 'text-white'}`}>{squadIds.length}<span className="text-xl text-slate-500">/{SQUAD_CAP}</span></div><div className="text-[11px] uppercase tracking-wider text-slate-400">squad</div></div>
          </div>
        </div>
        {win && <details className="mt-2 text-xs text-slate-400"><summary className="cursor-pointer font-semibold text-slate-300">How it works</summary><p className="mt-1">A full squad ({SQUAD_CAP}) has to release someone to sign someone. Releasing pays 70% of what another team would charge for him. Computer teams are shopping too.</p><p className="mt-1">Every player also costs a yearly fee (half of what he is worth, more or less as he improves or fades). At the end of the year your team earns its income and pays the bill; if the purse goes below zero you choose who to let go. Careers last 7 to 10 years: then a veteran retires, unless you pay a higher fee to keep him, and a young graduate takes his place.</p></details>}
      </div>

      <AnimatePresence>{(talentsOpen ?? (!talentsSeen && !!season?.myTeamId)) && talents.length > 0 && <NewTalents key="talents" cards={talents} onClose={() => { setTalentsOpen(false); markSeen(talentsKey) }} />}</AnimatePresence>
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

      <button
        onClick={() => setView(view === 'transfers' ? 'unsigned' : 'transfers')}
        className={`mb-3 flex w-full items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3 text-left transition md:w-auto md:min-w-[320px] ${view === 'transfers' ? 'border-fuchsia-300 bg-fuchsia-400 text-black' : 'border-fuchsia-400/70 bg-fuchsia-500/10 text-fuchsia-100 hover:bg-fuchsia-500/20'}`}
      >
        <span><span className="block font-display text-2xl leading-none tracking-wide">{view === 'transfers' ? 'Back to the market' : 'All transfers'}</span><span className={`block text-xs ${view === 'transfers' ? 'text-black/70' : 'text-fuchsia-200/80'}`}>{view === 'transfers' ? 'Sign, buy or release players' : `Every move across all the teams · ${market.log.length}`}</span></span>
        <span className="font-display text-3xl leading-none">{view === 'transfers' ? '‹' : '›'}</span>
      </button>

      {view !== 'transfers' && <div className="mb-3 flex flex-wrap items-center gap-2">
        <button className={chip(view === 'unsigned')} onClick={() => setView('unsigned')}>Unsigned ({market.pool.length})</button>
        <button className={chip(view === 'teams')} onClick={() => setView('teams')}>Other teams</button>
        <button className={chip(view === 'squad')} onClick={() => setView('squad')}>My squad ({squadIds.length})</button>
      </div>}

      {view !== 'transfers' && <div className="mb-3 grid grid-cols-2 gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a name or anime" aria-label="Search players" className="col-span-2 rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm text-white placeholder:text-slate-500" />
        <select value={role} onChange={(e) => setRole(e.target.value as typeof role)} className="rounded-lg border border-line bg-panel-2 px-2 py-2 text-sm text-white" aria-label="Filter by role">
          <option value="all">All roles</option><option value="BAT">Batsmen</option><option value="BOWL">Bowlers</option><option value="AR">All-rounders</option><option value="WK">Keepers</option>
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="rounded-lg border border-line bg-panel-2 px-2 py-2 text-sm text-white" aria-label="Sort players">
          <option value="rating">Best rated first</option><option value="price">Cheapest first</option><option value="name">Name A to Z</option>
        </select>
        <select value={series} onChange={(e) => setSeries(e.target.value)} className="col-span-2 rounded-lg border border-line bg-panel-2 px-2 py-2 text-sm text-white" aria-label="Filter by anime or game">
          <option value="all">Any anime or game</option>
          {seriesList.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
      </div>}

      {view === 'unsigned' && (
        <div className="space-y-2">
          <p className="text-xs text-slate-400">Young players with no team. The stars show how far each could grow, and some will. Their price is what they are worth today.</p>
          {pool.length === 0 ? <p className="rounded-2xl border border-dashed border-line p-8 text-center text-slate-400">Nobody unsigned matches. The other teams have been busy.</p> : pool.map((p) => row(p, { teamBadge: null, action: buyBtn(p, market.asking[p.id] ?? worth(p), null) }))}
        </div>
      )}

      {view === 'teams' && (
        <div>
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            <button onClick={() => setTeamPick(null)} className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${pickedTeam === 'all' ? 'border-indigo-400 bg-indigo-500/20 text-white' : 'border-line text-slate-300'}`}>All teams</button>
            {otherTeams.map((id) => { const t = teams.get(id); return t ? <button key={id} onClick={() => setTeamPick(id)} className={`flex shrink-0 items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold ${pickedTeam === id ? 'border-indigo-400 bg-indigo-500/20 text-white' : 'border-line text-slate-300'}`}><TeamCrest team={t} size={20} />{t.short}</button> : null })}
          </div>
          <div className="space-y-2">
            <p className="text-xs text-slate-400">Teams charge more than a player is worth, and a lot more for their stars. A team with only {SQUAD_FLOOR} players will not sell.</p>
            {theirs.length === 0 && <p className="rounded-2xl border border-dashed border-line p-8 text-center text-slate-400">No player matches.</p>}
            {theirs.map(({ owner, p }) => {
              const price = askingFromTeam(season, index, owner, p.id)
              const t = teams.get(owner) ?? null
              return row(p, { teamBadge: t, action: buyBtn(p, price, owner, (market.squads[owner]?.length ?? 0) <= SQUAD_FLOOR ? 'Not for sale' : undefined) })
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

      {view === 'transfers' && (() => {
        const windows = [...new Map(market.log.map((t) => [windowOfDate(t.date).id, windowOfDate(t.date)])).values()].sort((a, b) => b.id.localeCompare(a.id))
        const list = [...market.log].filter((t) => windowPick === 'all' || windowOfDate(t.date).id === windowPick).reverse()
        const moves = list.filter((t) => t.kind !== 'release')
        const biggest = [...moves].sort((a, b) => b.fee - a.fee)[0]
        return (
          <div>
            <div className="mb-3 flex flex-wrap gap-1.5">
              <button className={chip(windowPick === 'all')} onClick={() => setWindowPick('all')}>All</button>
              {windows.map((w) => <button key={w.id} className={chip(windowPick === w.id)} onClick={() => setWindowPick(w.id)}>{w.name} {w.year}</button>)}
            </div>
            {list.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-line p-8 text-center text-slate-400">No transfers yet. They appear here as teams sign, buy and release players during a window.</p>
            ) : (
              <>
                <p className="mb-2 text-sm text-slate-300">{list.length} {list.length === 1 ? 'move' : 'moves'}: {list.filter((t) => t.kind === 'sign').length} signed from the pool, {list.filter((t) => t.kind === 'buy').length} bought from other teams, {list.filter((t) => t.kind === 'release').length} released.{biggest ? <> Biggest deal: <b className="text-white">{biggest.name}</b> for {biggest.fee} coins.</> : null}</p>
                <div className="divide-y divide-line/60 rounded-2xl border border-line bg-panel">
                  {list.map((t) => { const p = index.get(t.playerId); return <TransferRow key={t.id} t={t} player={p ? shown(p) : undefined} teams={teams} mine={season.myTeamId} /> })}
                </div>
              </>
            )}
          </div>
        )
      })()}

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
        {undo && !signed && !confirm && (
          <div key="undo" className="fixed inset-x-3 bottom-20 z-[60] mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl border border-amber-400/60 bg-panel px-4 py-3 shadow-2xl" role="status">
            <span className="text-sm text-slate-100">{undo.text}</span>
            <button onClick={takeBack} className="shrink-0 rounded-full bg-amber-400 px-4 py-1.5 text-sm font-extrabold text-black active:bg-amber-300">Undo</button>
          </div>
        )}
        {signed && <SigningOverlay signing={signed} onClose={() => setSigned(null)} />}
      </AnimatePresence>
    </div>
  )
}
