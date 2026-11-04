import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { overall } from '../data/builders'
import { COACH_BY_ID } from '../data/coaches'
import { Dropdown } from '../components/Dropdown'
import { PlayerAvatar, RatingBadge } from '../components/ui'
import { useTeamMap } from '../components/season/shared'
import { boostSummary } from '../season/boost'
import { projectedBill, seasonScore } from '../season/careers'
import {
  ACADEMY_SHARE, boostBought, BOOSTS_PER_YEAR, boostPrice, buildCost, buildStatue, buyBoost, buyWildcard, campFor, CAMP_ODDS, campOdds, campPrice, campsAllowed, clubOf, coachFee, coachWage,
  FACILITIES, FACILITY_KEYS, freeCoaches, goldenTicket, hireCoach, levelOf, MAX_LEVEL, scaleOf, scoutOdds, scoutPrice, scoutTrip, SCOUTS_PER_YEAR, statuePrice, ticketPrice, TICKET_ODDS,
  TICKET_PITY, TICKETS_PER_YEAR, upgradeFacility, upkeepOf, wildcardOffer, WILDCARD_SHARE, physioSlots, type FacilityKey, type Result,
} from '../season/club'
import { openWindow, playerIndex, potentialOf, SQUAD_CAP } from '../season/market'
import { applyShift } from '../season/progression'
import { perkSum } from '../season/perkNums'
import { paths } from '../routes'
import { useLevel } from '../components/LevelBadge'
import { selectSeason, selectSession, useStore, useTeams } from '../store/useStore'
import {
  BOWL_NAME, focusesFor, focusLabel, lessonsAllowed, lessonsFor, lessonOdds, PROGRAMME_DAYS, programmeCap, programmePrice, programmeSlots, ROLE_NAME, startProgramme, takeLesson, traitChance, traitsLeft, daysLeft,
  type Lesson,
} from '../season/develop'
import type { BowlType } from '../types'
import type { Season } from '../season/types'
import type { Player } from '../types'

const rate = (p: Player) => overall(p)
/** How many specialist programmes are running today. */
const live0 = (club: ReturnType<typeof clubOf>, today: string) => (club.programmes ?? []).filter((g) => g.to > today).length

function Section({ icon, title, hint, children, open = false }: { icon: string; title: string; hint: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group mb-3 rounded-2xl border border-line bg-panel">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-3.5 py-3">
        <span className="text-2xl" aria-hidden>{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-xl leading-none tracking-wide text-white">{title}</span>
          <span className="mt-0.5 block text-xs leading-snug text-slate-400">{hint}</span>
        </span>
        <span className="text-lg text-slate-500 transition group-open:rotate-90" aria-hidden>›</span>
      </summary>
      <div className="space-y-2.5 border-t border-line/70 px-3.5 py-3">{children}</div>
    </details>
  )
}

const btn = 'shrink-0 cursor-pointer rounded-full bg-amber-400 px-4 py-2 text-xs font-extrabold leading-none text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400'
const Odds = ({ rows }: { rows: { name: string; odds: number }[] }) => (
  <div className="flex flex-wrap gap-1.5 text-[11px]">
    {rows.map((r) => <span key={r.name} className="rounded-full border border-line bg-black/20 px-2 py-1 text-slate-300">{r.name} <b className="text-white">{Math.round(r.odds)}%</b></span>)}
  </div>
)

/** Everything the coins can be spent on besides players. Each part says in plain words what it does, what it costs and what is luck. */
export function ClubPage() {
  const season = useStore(selectSeason)
  const session = useStore(selectSession)
  const updateSeason = useStore((s) => s.updateSeason)
  const giveBoost = useStore((s) => s.giveBoost)
  const base = useTeams()
  const teams = useTeamMap()
  const [note, setNote] = useState<{ text: string; good: boolean } | null>(null)
  const [campFor_, setCampFor] = useState<string>('')
  const lv = useLevel()
  const market = season?.market
  const me = season?.myTeamId
  const index = useMemo(() => playerIndex(base, market), [base, market])
  if (!season || !market || !me || !session) return <p className="text-slate-300">Start a career to run a club.</p>

  const club = clubOf(season)
  const purse = market.budgets[me] ?? 0
  const bill = projectedBill(season, index).total
  const scale = scaleOf(bill)
  const score = seasonScore(season, me)
  const bScale = scale * (1 + perkSum(season, 'build'))
  const sScale = scale * (1 + perkSum(season, 'scoutCost'))
  const dblBoost = perkSum(season, 'boostPrice') > 0
  const year = season.year
  const squad = (market.squads[me] ?? []).map((id) => index.get(id)).filter((p): p is Player => !!p).map((p) => applyShift(p, season.shifts?.[p.id])).sort((a, b) => rate(b) - rate(a))
  const myTeam = teams.get(me)
  const upkeep = upkeepOf(club, scale)
  const upkeepTotal = upkeep.reduce((n, [, v]) => n + v, 0)
  const bs = boostSummary([...(session.history ?? []), season], session.boost, season.difficulty)
  const win = !!openWindow(season, season.today)
  const camps = club.year === year ? club.camps ?? 0 : 0
  const scouts = club.year === year ? club.scouts ?? 0 : 0
  const tickets = club.year === year ? club.tickets ?? 0 : 0
  const bought = boostBought(club, year)
  const wild = wildcardOffer(season, index, score, rate)
  const nameOf = (id: string) => index.get(id)?.name ?? 'a youngster'

  // what is worth doing right now, in one glance
  const todo: { icon: string; text: string; to?: string }[] = []
  if ((lv?.points ?? 0) > 0) todo.push({ icon: '🌳', text: `${lv?.points} perk ${lv?.points === 1 ? 'point' : 'points'} waiting in the passive tree`, to: paths.tree })
  const cheapest = FACILITY_KEYS.map((k) => ({ k, lv: levelOf(club, k), cost: buildCost(k, levelOf(club, k), bScale) })).filter((x) => x.lv < MAX_LEVEL).sort((a, b) => a.cost - b.cost)[0]
  if (cheapest && purse >= cheapest.cost) todo.push({ icon: '🏗️', text: `You can afford a ${FACILITIES[cheapest.k].name.toLowerCase()} upgrade (${cheapest.cost} coins)` })
  if (bs.available > 0) todo.push({ icon: '⚡', text: `${bs.available} boost ${bs.available === 1 ? 'token' : 'tokens'} ready for a big match` })
  if (camps < campsAllowed(club) && purse >= campPrice(camps, scale)) todo.push({ icon: '🏋️', text: 'A training camp place is free this year' })
  if (live0(club, season.today) < programmeSlots(club) && purse >= programmePrice(squad[0] ?? ({} as Player), scale) && squad.length > 0) todo.push({ icon: '🎯', text: 'A specialist programme slot is free' })

  const run = (text: string, fn: (s: Season) => Result, after?: () => void) => {
    if (!window.confirm(text)) return
    const out = fn(season)
    if (out.error) { setNote({ text: out.error, good: false }); return }
    updateSeason(() => out.season)
    after?.()
    setNote({ text: out.message ?? 'Done.', good: true })
  }

  return (
    <div>
      <header className="mb-3 rounded-2xl border border-amber-400/30 bg-panel px-3.5 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-widest text-amber-300">Club · {year}</div>
            <h2 className="font-display text-3xl leading-none tracking-wide text-white">{myTeam?.name ?? 'Your club'}</h2>
          </div>
          <div className="text-right">
            <div className="font-display text-3xl leading-none text-amber-300">{purse}</div>
            <div className="text-[11px] text-slate-400">coins to spend</div>
          </div>
        </div>
        <p className="mt-2 text-xs leading-snug text-slate-300">Players are not the only thing coins buy. Build, train, scout and take a gamble. Prices grow with your wage bill, so a rich club pays more. {upkeepTotal > 0 && <>Running the club costs <b className="text-white">{upkeepTotal} coins</b> at the turn of the year.</>}</p>
        <Link to={paths.market} className="mt-2 inline-block text-xs font-bold text-sky-300 underline-offset-2 hover:underline">Back to the player market ›</Link>
        <Link to={paths.tree} className="ml-4 mt-2 inline-block text-xs font-bold text-violet-300 underline-offset-2 hover:underline">Passive tree ›</Link>
      </header>

      <section className="mb-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/5 px-3.5 py-3" aria-label="Worth doing now">
        <div className="mb-1 text-[11px] font-extrabold uppercase tracking-widest text-emerald-300">Worth doing now</div>
        {todo.length === 0 ? <p className="text-xs text-slate-300">Nothing pressing. Save your coins, or play on and come back after a few wins.</p> : (
          <ul className="space-y-1">
            {todo.map((x) => <li key={x.text} className="flex items-center gap-2 text-sm text-slate-100"><span aria-hidden>{x.icon}</span><span className="min-w-0 flex-1">{x.text}</span>{x.to && <Link to={x.to} className="shrink-0 text-xs font-bold text-emerald-300">Go ›</Link>}</li>)}
          </ul>
        )}
        <details className="mt-2 text-xs text-slate-300">
          <summary className="cursor-pointer font-bold text-slate-200">How the Club works</summary>
          <ul className="mt-1.5 list-disc space-y-1 pl-4 leading-snug">
            <li><b className="text-white">Buildings</b> make training, healing, youth and match days better. They cost a little every year to run.</li>
            <li><b className="text-white">Staff, boosts and development</b> are sure things: you pay, you get what it says.</li>
            <li><b className="text-white">Luck and long shots</b> are gambles. Their odds are always shown, and bad luck gets a safety net.</li>
            <li>Prices rise with your wage bill, so a bigger club pays more for everything.</li>
          </ul>
        </details>
      </section>

      {note && <p role="status" className={`mb-3 rounded-xl border px-3 py-2 text-sm ${note.good ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200' : 'border-rose-400/40 bg-rose-500/10 text-rose-200'}`}>{note.text}</p>}

      <Section icon="🏗️" title="Buildings" hint="Pay once, then a small yearly upkeep. Safe, never luck." open>
        {FACILITY_KEYS.map((k: FacilityKey) => {
          const f = FACILITIES[k]
          const lv = levelOf(club, k)
          const cost = buildCost(k, lv, bScale)
          return (
            <div key={k} className="rounded-xl border border-line bg-black/20 p-2.5">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl" aria-hidden>{f.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-white">{f.name} <span className="text-amber-300">level {lv}/{MAX_LEVEL}</span></div>
                  <div className="text-xs leading-snug text-slate-400">{f.blurb}</div>
                </div>
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400">{f.perLevel} · upkeep {Math.round(f.upkeep * scale)}/level a year</span>
                <button disabled={lv >= MAX_LEVEL || purse < cost} className={btn} onClick={() => run(`Build ${f.name} level ${lv + 1} for ${cost} coins?`, (s) => upgradeFacility(s, k, bScale))}>
                  {lv >= MAX_LEVEL ? 'Maxed' : `Build · ${cost}`}
                </button>
              </div>
            </div>
          )
        })}
      </Section>

      <Section icon="🧑‍🏫" title="Staff" hint="A better coach trains your players faster, and asks a yearly wage.">
        <p className="text-xs leading-snug text-slate-300">Your coach is <b className="text-white">{COACH_BY_ID.get(season.coaches?.[me] ?? '')?.name ?? 'not chosen'}</b>{club.coach ? <> (hired by you, <b className="text-white">{coachWage(COACH_BY_ID.get(club.coach)?.skill ?? 0, scale)}</b> coins a year)</> : ' (free, comes with the club)'}. Physios: <b className="text-white">{physioSlots(season)}</b> places on the squad page{levelOf(club, 'medical') < 4 ? ' (a medical centre adds more)' : ''}.</p>
        {freeCoaches(season).filter((c) => c.skill > (COACH_BY_ID.get(season.coaches?.[me] ?? '')?.skill ?? 0)).slice(0, 4).map((c) => (
          <div key={c.id} className="flex items-center gap-2.5 rounded-xl border border-line bg-black/20 p-2.5">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-white">{c.name} <span className="text-xs font-normal text-slate-400">· {c.game}</span></div>
              <div className="text-xs leading-snug text-slate-400">Skill {c.skill}, best at {c.specialty}. Wage {coachWage(c.skill, scale)}/yr. {c.style}</div>
            </div>
            <button disabled={purse < coachFee(c.skill, scale)} className={btn} onClick={() => run(`Hire ${c.name} for ${coachFee(c.skill, scale)} coins, then ${coachWage(c.skill, scale)} coins a year?`, (s) => hireCoach(s, c.id, scale))}>Hire · {coachFee(c.skill, scale)}</button>
          </div>
        ))}
        {freeCoaches(season).every((c) => c.skill <= (COACH_BY_ID.get(season.coaches?.[me] ?? '')?.skill ?? 0)) && <p className="text-xs text-slate-400">Nobody better is free right now.</p>}
      </Section>

      <Section icon="🎯" title="Player development" hint="Change what a player is, or make him grow faster in one way.">
        <Develop season={season} index={index} squad={squad} scale={scale} purse={purse} run={run} />
      </Section>

      <Section icon="⚡" title="Boost tokens" hint={`Make the whole team 50% better for one match. You have ${bs.available}.`}>
        {!bs.allowed ? <p className="text-xs text-slate-400">Boosts are only on Easy and Normal careers.</p> : (
          <>
            <p className="text-xs leading-snug text-slate-300">You also earn one for every 5 wins ({bs.toNext} to go). Buying is for the matches that matter. Each one bought this year costs more.</p>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-400">Bought this year {bought}/{BOOSTS_PER_YEAR}</span>
              <button disabled={bought >= BOOSTS_PER_YEAR || purse < boostPrice(bought, scale, dblBoost)} className={btn} onClick={() => run(`Buy a boost token for ${boostPrice(bought, scale, dblBoost)} coins?`, (s) => buyBoost(s, scale), giveBoost)}>
                {bought >= BOOSTS_PER_YEAR ? 'Sold out' : `Buy · ${boostPrice(bought, scale, dblBoost)}`}
              </button>
            </div>
          </>
        )}
      </Section>

      <Section icon="🎲" title="Luck and long shots" hint="The odds are always shown. Bad luck has a safety net.">
        <div className="rounded-xl border border-line bg-black/20 p-2.5">
          <div className="text-sm font-bold text-white">🏋️ Training camp <span className="text-xs font-normal text-slate-400">· {camps}/{campsAllowed(club)} this year</span></div>
          <p className="text-xs leading-snug text-slate-400">Send one player to camp. He may gain a few rating points, or nothing. Two flops in a row and the next camp always teaches something.</p>
          <Odds rows={campOdds(score, club).map((o, i) => ({ name: CAMP_ODDS[i].name, odds: o }))} />
          <div className="mt-2 flex items-center gap-2">
            <Dropdown label="Who goes to camp" value={campFor_} onChange={setCampFor} placeholder="Pick a player…" options={squad.map((x) => ({ value: x.id, label: x.name, hint: String(overall(x)) }))} />
            <button disabled={!campFor_ || camps >= campsAllowed(club) || purse < campPrice(camps, scale)} className={btn} onClick={() => run(`Send ${nameOf(campFor_)} to camp for ${campPrice(camps, scale)} coins?`, (s) => campFor(s, index, campFor_, score, scale))}>Camp · {campPrice(camps, scale)}</button>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-black/20 p-2.5">
          <div className="text-sm font-bold text-white">🔭 Scouting trip <span className="text-xs font-normal text-slate-400">· {scouts}/{SCOUTS_PER_YEAR} this year</span></div>
          <p className="text-xs leading-snug text-slate-400">The scouts bring back a young talent at half price that only you can sign this year.{score < 0.45 ? ' Your club is struggling, so the odds are kinder.' : ''} Ordinary finds in a row raise the chance of a prodigy.</p>
          <Odds rows={scoutOdds(club, score)} />
          <div className="mt-2 flex justify-end">
            <button disabled={scouts >= SCOUTS_PER_YEAR || purse < scoutPrice(scouts, sScale)} className={btn} onClick={() => run(`Send the scouts for ${scoutPrice(scouts, sScale)} coins?`, (s) => scoutTrip(s, index, score, sScale, (id) => potentialOf(index.get(id) as Player), nameOf))}>Scout · {scoutPrice(scouts, sScale)}</button>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-black/20 p-2.5">
          <div className="text-sm font-bold text-white">🎟️ Golden ticket <span className="text-xs font-normal text-slate-400">· {tickets}/{TICKETS_PER_YEAR} this year</span></div>
          <p className="text-xs leading-snug text-slate-400">A raffle with coins only. On average you get back a little less than you pay. After {TICKET_PITY - 1} rained-off tickets in a row, the next is a sell-out.</p>
          <Odds rows={TICKET_ODDS.map((t) => ({ name: `${t.name} ×${t.back}`, odds: t.odds }))} />
          <div className="mt-2 flex justify-end">
            <button disabled={tickets >= TICKETS_PER_YEAR || purse < ticketPrice(scale)} className={btn} onClick={() => run(`Buy a golden ticket for ${ticketPrice(scale)} coins?`, (s) => goldenTicket(s, scale))}>Ticket · {ticketPrice(scale)}</button>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-black/20 p-2.5">
          <div className="text-sm font-bold text-white">🃏 Wildcard legend <span className="text-xs font-normal text-slate-400">· once a year, for clubs having a hard time</span></div>
          {wild ? (
            <div className="mt-1.5 flex items-center gap-2.5">
              {myTeam && <PlayerAvatar player={wild.player} team={teams.get(wild.from) ?? myTeam} size={44} profile />}
              <div className="min-w-0 flex-1 text-xs text-slate-300"><b className="text-white">{wild.player.name}</b> from {teams.get(wild.from)?.name ?? 'another club'} at {Math.round(WILDCARD_SHARE * 100)}% of his price.</div>
              <RatingBadge value={overall(wild.player)} size="sm" />
              <button disabled={!win || (market.squads[me]?.length ?? 0) >= SQUAD_CAP} className={btn} title={!win ? 'Needs an open market window' : undefined}
                onClick={() => run(`Sign ${wild.player.name} at ${Math.round(WILDCARD_SHARE * 100)}% of his price?`, (s) => buyWildcard(s, index, wild, score, rate))}>Sign</button>
            </div>
          ) : <p className="text-xs text-slate-400">{score < 0.45 ? 'You have used this year\'s wildcard (or there is nobody to offer).' : 'Only clubs that are losing more than they win get a wildcard. Not you, this year.'}</p>}
          {wild && !win && <p className="mt-1 text-[11px] text-slate-500">Signing needs an open market window.</p>}
          {wild && (market.squads[me]?.length ?? 0) >= SQUAD_CAP && <p className="mt-1 text-[11px] text-slate-500">Your squad is full. Release someone on the market page first.</p>}
        </div>
      </Section>

      <Section icon="🏆" title="Trophy hall" hint="Statues of your heroes. Pure pride, they cost coins and nothing else.">
        {(club.statues ?? []).length === 0 && <p className="text-xs text-slate-400">No statues yet. Pick a player below.</p>}
        <ul className="space-y-1.5">
          {(club.statues ?? []).map((s) => <li key={s.id} className="flex items-center gap-2 rounded-xl border border-line bg-black/20 px-3 py-2 text-sm text-white">🗿 <b>{s.name}</b> <span className="text-xs text-slate-400">· unveiled {s.year}</span></li>)}
        </ul>
        <StatuePicker squad={squad} done={(club.statues ?? []).map((s) => s.id)} price={statuePrice((club.statues ?? []).length, scale)} purse={purse} onBuild={(p) => run(`Build a statue of ${p.name} for ${statuePrice((club.statues ?? []).length, scale)} coins?`, (s) => buildStatue(s, index, p.id, scale))} />
      </Section>

      <p className="mt-4 px-1 text-[11px] leading-snug text-slate-500">Your wage bill is about {Math.round(bill)} coins, so prices are ×{scale.toFixed(2)}. Academy prospects cost {Math.round(ACADEMY_SHARE * 100)}% of their price. {upkeep.length > 0 && <>Yearly costs: {upkeep.map(([n, v]) => `${n} ${v}`).join(', ')}.</>}</p>
    </div>
  )
}

function StatuePicker({ squad, done, price, purse, onBuild }: { squad: Player[]; done: string[]; price: number; purse: number; onBuild: (p: Player) => void }) {
  const [id, setId] = useState('')
  const p = squad.find((x) => x.id === id)
  return (
    <div className="flex items-center gap-2">
      <Dropdown label="Who gets a statue" value={id} onChange={setId} placeholder="Pick a player…" options={squad.filter((x) => !done.includes(x.id)).map((x) => ({ value: x.id, label: x.name, hint: String(overall(x)) }))} />
      <button disabled={!p || purse < price} className={btn} onClick={() => p && onBuild(p)}>Statue · {price}</button>
    </div>
  )
}

function Develop({ season, index, squad, scale, purse, run }: { season: Season; index: Map<string, Player>; squad: Player[]; scale: number; purse: number; run: (text: string, fn: (s: Season) => Result) => void }) {
  const [id, setId] = useState('')
  const [bowl, setBowl] = useState<BowlType>('medium')
  const club = clubOf(season)
  const p = squad.find((x) => x.id === id)
  const done = club.year === season.year ? club.retrains ?? 0 : 0
  const live = (club.programmes ?? []).filter((g) => g.to > season.today)
  const bowlNeeds = (l: Lesson) => !p?.bowling && (l.role === 'BOWL' || l.role === 'AR')
  return (
    <>
      <p className="text-xs leading-snug text-slate-300">Pick a player. <b className="text-white">Lessons</b> change his role, hand or bowling ({done}/{lessonsAllowed(club)} this year). <b className="text-white">Programmes</b> train one rating about 3× faster for {PROGRAMME_DAYS} days ({live.length}/{programmeSlots(club)} running).</p>
      <Dropdown label="Pick a player to develop" value={id} onChange={setId} placeholder="Pick a player…" options={squad.map((x) => ({ value: x.id, label: x.name, hint: `${ROLE_NAME[x.role]} · ${overall(x)}` }))} />
      {live.length > 0 && (
        <ul className="space-y-1 text-xs text-slate-300">
          {live.map((g) => { const q = index.get(g.id); return <li key={g.id + g.attr} className="rounded-lg bg-black/20 px-2.5 py-1.5">🎯 <b className="text-white">{q?.name}</b>: {q ? focusLabel(q, g.attr).split(':')[0] : g.attr}, +{g.gained} so far (up to +{g.cap}), {daysLeft(g, season.today)} days left</li> })}
        </ul>
      )}
      {p && (
        <>
          <div className="rounded-xl border border-line bg-black/20 p-2.5">
            <div className="text-sm font-bold text-white">{p.name} <span className="text-xs font-normal text-slate-400">· {ROLE_NAME[p.role]}, {p.hand === 'R' ? 'right' : 'left'}-handed{p.bowling ? `, ${BOWL_NAME[p.bowling.type].toLowerCase()}` : ', does not bowl'}</span></div>
            <p className="mt-1 text-xs leading-snug text-slate-400">Lessons: how it goes is luck. A hard one makes his ratings dip for a while, and the next one will not go as badly.</p>
            <Odds rows={lessonOdds(club)} />
            <div className="mt-2 space-y-1.5">
              {lessonsFor(p, scale).map((l) => (
                <div key={l.label} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 text-xs text-slate-200">{l.label}</span>
                  {bowlNeeds(l) && (
                    <div className="w-32"><Dropdown small label="Kind of bowling" value={bowl} onChange={(v) => setBowl(v as BowlType)} options={(Object.keys(BOWL_NAME) as BowlType[]).map((b) => ({ value: b, label: BOWL_NAME[b] }))} /></div>
                  )}
                  <button disabled={purse < l.price || done >= lessonsAllowed(club)} className={btn} onClick={() => run(`${p.name}: ${l.label.toLowerCase()} for ${l.price} coins?`, (s) => takeLesson(s, index, p.id, l, bowlNeeds(l) ? bowl : undefined))}>{l.price}</button>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-line bg-black/20 p-2.5">
            <div className="text-sm font-bold text-white">Specialist programme · {programmePrice(p, scale)} coins</div>
            <p className="mt-1 text-xs leading-snug text-slate-400">Up to +{programmeCap(club)} on one rating in {PROGRAMME_DAYS} days (a good coach and a low rating make it faster). At the end he may earn a trait, a {traitChance(club)}% chance that grows by 15% after each programme without one.</p>
            <div className="mt-2 space-y-1.5">
              {focusesFor(p).map((a) => {
                const t = traitsLeft(p, a)
                return (
                  <div key={a} className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 text-xs text-slate-200">{focusLabel(p, a)}{t.length > 0 && <span className="text-slate-500"> · may earn {t.join(' / ')}</span>}</span>
                    <button disabled={purse < programmePrice(p, scale) || live.length >= programmeSlots(club) || live.some((g) => g.id === p.id)} className={btn} onClick={() => run(`Start a ${PROGRAMME_DAYS}-day programme for ${p.name} (${focusLabel(p, a).split(':')[0]}) for ${programmePrice(p, scale)} coins?`, (s) => startProgramme(s, index, p.id, a, scale))}>Train</button>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </>
  )
}
