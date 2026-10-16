import { useMemo } from 'react'
import { overall } from '../../data/builders'
import { YOUTH_BY_ID } from '../../data/youthPool'
import type { Season } from '../../season/types'
import type { Player, Team } from '../../types'
import { Sheet } from '../Sheet'
import { OriginTag, PlayerAvatar, RatingBadge, ROLE_LABEL, StatBar, TeamCrest, accentOf, tierOf } from '../ui'
import { CareerPath, RecentMatches } from './Details'
import { OverallStats } from './OverallStats'

export interface Confirm {
  kind: 'buy' | 'release' | 'sell'
  player: Player
  /** The team he is leaving (null if he is unsigned). */
  from: Team | null
  /** Coins that change hands. */
  price: number
  /** For an accepted offer: the team that is buying him. */
  buyer?: Team | null
  offerId?: string
}

const stars = (potential: number) => Math.max(1, Math.min(5, Math.round((potential - 50) / 8)))

/**
 * The look-before-you-leap card for a market move: everything about the player (ratings, traits, his numbers so far, his
 * recent matches and where he has played) and what it does to your coins. Nothing happens until you confirm.
 */
export function MarketConfirm({ confirm, season, seasons, teams, me, purse, onConfirm, onClose, full }: {
  confirm: Confirm; season: Season; seasons: Season[]; teams: Map<string, Team>; me: Team | undefined; purse: number
  onConfirm: () => void; onClose: () => void
  /** Buying with a full squad: he will have to release someone next. */
  full?: boolean
}) {
  const { kind, player, from, price, buyer } = confirm
  const team = kind === 'buy' ? (from ?? me) : (me ?? from)
  const accent = team ? accentOf(team) : '#94a3b8'
  const o = overall(player)
  const tier = tierOf(o)
  const b = player.batting
  const w = player.bowling
  const pot = YOUTH_BY_ID.get(player.id)?.potential
  const hasMatches = useMemo(() => seasons.some((s) => (s.roster ?? []).includes(player.id)), [seasons, player.id])
  const title = kind === 'buy' ? (from ? `Buy ${player.name}?` : `Sign ${player.name}?`) : kind === 'release' ? `Release ${player.name}?` : `Sell ${player.name}?`
  const money =
    kind === 'buy'
      ? { line: `Costs ${price} ${price === 1 ? 'coin' : 'coins'}`, after: `You have ${purse}, so ${Math.max(0, purse - price)} left.`, ok: purse >= price || !!full }
      : kind === 'release'
        ? { line: `You get ${price} ${price === 1 ? 'coin' : 'coins'} back`, after: `He goes back to the unsigned pool. You would have ${purse + price}.`, ok: true }
        : { line: `${buyer?.name ?? 'They'} pay ${price} ${price === 1 ? 'coin' : 'coins'}`, after: `He leaves your squad. You would have ${purse + price}.`, ok: true }
  const confirmLabel = kind === 'buy' ? (full ? 'Choose who to release' : from ? `Buy for ${price}` : `Sign for ${price}`) : kind === 'release' ? 'Release him' : `Sell for ${price}`

  return (
    <Sheet label={title} onClose={onClose} size="sm" z={85}>
      <div>
        <div className="relative px-5 pb-4 pt-5" style={{ background: `linear-gradient(135deg, ${team?.colors.primary ?? '#334155'}cc, ${team?.colors.secondary ?? '#64748b'}55 55%, #10131c)` }}>
          <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 rounded-lg bg-black/40 px-2.5 py-1 text-sm font-bold text-white hover:bg-black/60">✕</button>
          <div className="flex items-center gap-4 pr-10">
            <div className="rounded-full" style={{ boxShadow: `0 0 0 4px ${accent}, 0 10px 30px rgba(0,0,0,.5)` }}>
              <PlayerAvatar player={player} team={team ?? { colors: { primary: '#334155', secondary: '#94a3b8' } }} size={92} />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-3xl leading-none tracking-wide text-white">{player.name}</h2>
              <div className="mt-1 flex items-center gap-2 text-sm text-slate-100">{from ? <><TeamCrest team={from} size={20} /><span className="truncate">{from.name}</span></> : <span className="text-slate-300">Free agent</span>}</div>
              <div className="mt-1"><OriginTag playerId={player.id} /></div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                <span className="rounded-full bg-black/40 px-2 py-0.5 font-bold text-white">{ROLE_LABEL[player.role]}</span>
                {w && <span className="rounded-full bg-black/40 px-2 py-0.5 text-slate-200">{w.type}</span>}
                {pot ? <span className="rounded-full bg-black/40 px-2 py-0.5 text-amber-300" title="How far he could grow">{'★'.repeat(stars(pot))}<span className="text-slate-500">{'★'.repeat(5 - stars(pot))}</span> potential</span> : null}
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <RatingBadge value={o} size="lg" />
            <div><div className="font-display text-2xl leading-none" style={{ color: tier.color }}>{tier.label}</div><div className="text-xs text-slate-300">overall rating</div></div>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div className={`rounded-2xl border-2 p-3 ${money.ok ? 'border-amber-400/60 bg-amber-400/10' : 'border-red-400/60 bg-red-500/10'}`}>
            <div className="font-display text-2xl leading-none tracking-wide text-white">{money.line}</div>
            <div className="mt-1 text-sm text-slate-200">{money.ok ? money.after : `${money.after} That is not enough.`}</div>
            {full && kind === 'buy' && <div className="mt-1 text-xs text-amber-200">Your squad is full, so you will pick someone to release next.</div>}
          </div>

          <section className="space-y-1.5">
            <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Batting</h3>
            <StatBar label="Technique" value={b.technique} color={accent} />
            <StatBar label="Power" value={b.power} color={accent} />
            <StatBar label="Temperament" value={b.temperament} color={accent} />
            <StatBar label="Running" value={b.running} color={accent} />
          </section>
          <section className="space-y-1.5">
            <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Bowling{w ? ` · ${w.type}` : ''}</h3>
            {w ? (<><StatBar label="Accuracy" value={w.accuracy} color={accent} /><StatBar label="Variation" value={w.variation} color={accent} /><StatBar label="Stamina" value={w.stamina} color={accent} /></>) : <p className="text-sm text-slate-500">Does not bowl.</p>}
          </section>
          <section className="space-y-1.5">
            <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Fielding</h3>
            <StatBar label={player.role === 'WK' ? 'Keeping' : 'Fielding'} value={player.fielding} color={accent} />
          </section>
          {player.traits.length > 0 && (
            <div className="flex flex-wrap gap-1.5">{player.traits.map((t) => <span key={t} className="rounded-full border border-line bg-panel-2 px-2.5 py-1 text-xs capitalize text-slate-200">{t.replace(/-/g, ' ')}</span>)}</div>
          )}

          <section className="rounded-2xl border border-line bg-panel p-3">
            <h3 className="mb-1.5 text-[11px] font-extrabold uppercase tracking-widest text-sky-300">His numbers</h3>
            {hasMatches ? <OverallStats playerId={player.id} seasons={seasons} /> : <p className="text-sm text-slate-500">No matches played in this career yet.</p>}
          </section>
          <RecentMatches season={season} playerId={player.id} teamId={from?.id ?? me?.id ?? ''} teams={teams} />
          <CareerPath season={season} playerId={player.id} teams={teams} />
        </div>

        <div className="sticky bottom-0 grid grid-cols-[1fr_1.4fr] gap-2 border-t border-line bg-ink/95 p-3">
          <button onClick={onClose} className="rounded-full border border-line py-3 text-sm font-bold text-slate-200 hover:border-slate-400">Not now</button>
          <button
            onClick={onConfirm} disabled={!money.ok}
            className={`rounded-full py-3 font-display text-xl leading-none tracking-wide text-black transition disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 ${kind === 'release' ? 'bg-red-400 hover:bg-red-300' : 'cta-pulse bg-emerald-500 hover:bg-emerald-400'}`}
          >{confirmLabel}</button>
        </div>
      </div>
    </Sheet>
  )
}
