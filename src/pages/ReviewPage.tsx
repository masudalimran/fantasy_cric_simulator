import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import { PlayerAvatar, TeamCrest } from '../components/ui'
import { useDetails } from '../components/season/Details'
import { useTeamMap } from '../components/season/shared'
import { DIFFICULTIES, type Difficulty } from '../engine/types'
import { randomSeed } from '../engine/rng'
import { paths } from '../routes'
import { generateSeason } from '../season/generate'
import { buildReview, winRate } from '../season/review'
import { competitionStatus, seasonComplete } from '../season/results'
import { catchUpIncome, developYouth, playerIndex, rolloverMarket } from '../season/market'
import type { PlayerChange, PlayerReview, SeasonReview } from '../season/types'
import { selectSeason, selectSession, useStore, useTeams } from '../store/useStore'

const COLOR: Record<Difficulty, string> = { easy: '#34d399', normal: '#38bdf8', hard: '#fbbf24', legend: '#fb7185' }
const ordinal = (n: number) => `${n}${['th', 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : Math.min(n % 10, 4) % 4]}`
const f1 = (n: number | null, d = 1) => (n === null || !Number.isFinite(n) ? '-' : n.toFixed(d))
const th = 'px-2 py-2 text-right font-medium'
const td = 'px-2 py-2 text-right tabular-nums text-slate-300'

function Tile({ label, value, sub, accent }: { label: string; value: React.ReactNode; sub?: string; accent?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-4">
      <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</div>
      <div className="mt-1 font-display text-5xl leading-none" style={{ color: accent ?? '#fff' }}>{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
    </div>
  )
}

function Award({ title, color, p, line, teamId }: { title: string; color: string; p: PlayerReview | undefined; line: string; teamId: string }) {
  const teams = useTeamMap()
  const details = useDetails()
  const team = teams.get(teamId)
  const player = team?.players.find((x) => x.id === p?.id)
  return (
    <div className="rounded-2xl border border-line bg-panel p-4">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest" style={{ color }}><span className="h-3 w-3 rounded-full" style={{ background: color }} />{title}</div>
      {p && player && team ? (
        <button onClick={() => details?.openPlayer(player.id)} className="flex w-full cursor-pointer items-center gap-3 text-left transition hover:opacity-90" title="View profile"><PlayerAvatar player={player} team={team} size={46} /><div className="min-w-0"><div className="truncate font-bold text-white">{p.name}</div><div className="text-sm text-slate-300">{line}</div></div></button>
      ) : <div className="text-sm text-slate-500">Nobody yet</div>}
    </div>
  )
}

/** +3 in green, -2 in red, so a glance shows who got better and who got worse. */
function Delta({ n, big = false }: { n: number; big?: boolean }) {
  if (n === 0) return <span className="text-slate-500">–</span>
  const up = n > 0
  return <span className={`inline-flex items-center gap-0.5 font-bold tabular-nums ${big ? 'text-base' : 'text-xs'} ${up ? 'text-emerald-400' : 'text-rose-400'}`}>{up ? '▲' : '▼'}{Math.abs(n)}</span>
}

function LeagueMovers({ title, rows, teams }: { title: string; rows: PlayerChange[]; teams: ReturnType<typeof useTeamMap> }) {
  return (
    <section className="rounded-2xl border border-line bg-panel p-4">
      <h3 className="mb-2 font-display text-2xl tracking-wide">{title}</h3>
      {rows.length === 0 && <p className="text-sm text-slate-500">Nobody.</p>}
      {rows.map((r) => (
        <div key={r.id} className="flex items-center gap-2.5 border-t border-line/60 py-1.5 text-sm first:border-0">
          {(() => { const t = teams.get(r.teamId); const p = t?.players.find((x) => x.id === r.id); return p && t ? <PlayerAvatar profile player={p} team={t} size={28} /> : null })()}
          <span className="min-w-0 flex-1 truncate text-slate-100">{r.name} <span className="text-slate-500">· {teams.get(r.teamId)?.short ?? ''}</span></span>
          <span className="tabular-nums text-slate-400">{r.before} → <b className="text-white">{r.after}</b></span>
          <Delta n={r.after - r.before} big />
        </div>
      ))}
    </section>
  )
}

export function ReviewPage() {
  const season = useStore(selectSeason)
  const session = useStore(selectSession)
  const startNext = useStore((s) => s.startNextSeason)
  const teams = useTeamMap()
  const baseTeams = useTeams()
  const navigate = useNavigate()
  const details = useDetails()
  const review = useMemo(() => (season ? buildReview(season, teams) : null), [season, teams])

  if (!season || !session) return <div className="rounded-2xl border border-dashed border-line p-12 text-center text-slate-400">No career yet. <Link to={paths.sessions} className="text-indigo-300 hover:underline">Create one</Link>.</div>
  if (!review) return <div className="rounded-2xl border border-dashed border-line p-12 text-center text-slate-400">Season reviews are for careers where you manage a team. <Link to={paths.sessions} className="text-indigo-300 hover:underline">Start a new career</Link> to try it.</div>

  const team = teams.get(review.teamId)!
  const complete = seasonComplete(season)
  const decided = review.played - review.tied
  const rate = winRate(review)
  const withBat = review.players.filter((p) => p.bat && p.bat.runs > 0).sort((a, b) => b.bat!.runs - a.bat!.runs)
  const withBowl = review.players.filter((p) => p.bowl && p.bowl.wickets > 0).sort((a, b) => b.bowl!.wickets - a.bowl!.wickets)
  const mvp = [...review.players].sort((a, b) => b.impact - a.impact)[0]
  const motm = [...review.players].sort((a, b) => b.potm - a.potm)[0]
  const progress = [...(review.progress ?? [])].sort((a, b) => b.after - b.before - (a.after - a.before) || b.after - a.after)
  const sorted = [...review.players].filter((p) => p.matches > 0).sort((a, b) => b.impact - a.impact)

  const startNextSeason = () => {
    const participants = season.teamIds.map((id) => teams.get(id)).filter((t): t is NonNullable<typeof t> => !!t)
    const seed = randomSeed()
    // everything earned in matches carries over into the new season, and young players grow towards their potential
    let shifts = season.shifts
    let market = season.market
    if (market) {
      const titles: Record<string, number> = {}
      for (const c of season.competitions) { if (c.kind === 'series') continue; const w = competitionStatus(season, c).champion; if (w) titles[w] = (titles[w] ?? 0) + 1 }
      shifts = developYouth(market, shifts ?? {}, playerIndex(baseTeams, market), seed)
      const extra = season.myTeamId ? { [season.myTeamId]: catchUpIncome({ ...season, market, shifts }, playerIndex(baseTeams, market)) } : {}
      market = rolloverMarket(market, titles, seed, extra)
    }
    const next = generateSeason({ year: season.year + 1, teams: participants, seed, myTeamId: season.myTeamId, difficulty: season.difficulty, shifts, lineup: season.lineup, market, previousCoaches: season.coaches ?? {}, coachReport: season.coachReport, physio: season.physio })
    startNext(review, next)
    navigate(paths.session(`${next.year}-01`))
  }

  return (
    <div>
      <Link to={paths.session()} className="mb-4 inline-block text-sm text-slate-400 hover:text-white">← Back to the career</Link>
      <div className="relative overflow-hidden rounded-3xl border border-line bg-panel p-6" style={{ background: `linear-gradient(110deg, ${team.colors.primary}99, #10131c 65%)` }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <TeamCrest team={team} size={84} />
            <div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-slate-300">{session.name} · season review</div>
              <h1 className="font-display text-5xl leading-none tracking-wide text-white md:text-6xl">{review.year}</h1>
              <div className="mt-1 text-base text-slate-100">{team.name} <span className="text-slate-400">· {team.series}</span></div>
            </div>
          </div>
          <div className="text-right">
            <div className="rounded-xl px-4 py-2 font-display text-3xl tracking-wide" style={{ background: `${COLOR[review.difficulty]}22`, color: COLOR[review.difficulty] }} title="The difficulty chosen at the start of the career">{DIFFICULTIES[review.difficulty].label}</div>
            <div className="mt-1 text-xs text-slate-300">difficulty {complete ? 'you finished on' : 'you are playing on'}</div>
            <div className={`mt-2 inline-block rounded-full px-3 py-0.5 text-xs font-bold ${complete ? 'bg-emerald-500 text-black' : 'bg-amber-400 text-black'}`}>{complete ? 'Season complete' : 'In progress'}</div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Tile label="Played" value={review.played} />
        <Tile label="Won" value={review.won} accent="#34d399" />
        <Tile label="Lost" value={review.lost} accent="#f87171" />
        <Tile label="Win rate" value={`${Math.round(rate * 100)}%`} sub={review.tied ? `${review.tied} tied` : `${decided} decided`} />
        <Tile label="Finished" value={ordinal(review.rank)} sub={`of ${review.teams} teams`} accent="#fbbf24" />
        <Tile label="Titles" value={review.titles.length} accent="#f472b6" />
      </div>

      {review.titles.length > 0 && (
        <div className="mt-4 rounded-2xl border border-amber-400/40 bg-amber-400/5 p-4">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-amber-300">Trophies won</div>
          <div className="flex flex-wrap gap-2">{review.titles.map((t) => <span key={t} className="rounded-full bg-amber-400 px-3 py-1 text-sm font-bold text-black">🏆 {t}</span>)}</div>
        </div>
      )}

      <h2 className="mb-2 mt-8 font-display text-3xl tracking-wide">Standout players</h2>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Award title="Top run-scorer" color="#f97316" p={withBat[0]} line={withBat[0]?.bat ? `${withBat[0].bat.runs} runs · HS ${withBat[0].bat.high}${withBat[0].bat.highNotOut ? '*' : ''}` : ''} teamId={review.teamId} />
        <Award title="Top wicket-taker" color="#a855f7" p={withBowl[0]} line={withBowl[0]?.bowl ? `${withBowl[0].bowl.wickets} wickets · best ${withBowl[0].bowl.best}` : ''} teamId={review.teamId} />
        <Award title="Most valuable" color="#fbbf24" p={mvp} line={mvp ? `${mvp.impact} impact points` : ''} teamId={review.teamId} />
        <Award title="Most Man of the Match" color="#38bdf8" p={motm && motm.potm > 0 ? motm : undefined} line={motm ? `${motm.potm} award${motm.potm === 1 ? '' : 's'}` : ''} teamId={review.teamId} />
      </div>

      <h2 className="mb-2 mt-8 font-display text-3xl tracking-wide">Your squad this year</h2>
      <div className="overflow-x-auto rounded-2xl border border-line bg-panel p-3">
        <table className="w-full text-sm">
          <thead className="text-[11px] uppercase tracking-wider text-slate-500">
            <tr><th className="px-2 py-2 text-left font-medium">Player</th><th className={th}>M</th><th className={th}>Runs</th><th className={th}>Avg</th><th className={th}>SR</th><th className={th}>HS</th><th className={th}>50/100</th><th className={th}>Wkts</th><th className={th}>Econ</th><th className={th}>Best</th><th className={th}>MoM</th><th className={th}>Impact</th></tr>
          </thead>
          <tbody>
            {sorted.map((p) => {
              const player = team.players.find((x) => x.id === p.id)!
              const b = p.bat
              const w = p.bowl
              const avg = b && b.innings - b.notOuts > 0 ? b.runs / (b.innings - b.notOuts) : null
              return (
                <tr key={p.id} className="border-t border-line/60">
                  <td className="px-2 py-1.5"><button onClick={() => details?.openPlayer(player.id)} className="flex cursor-pointer items-center gap-2.5 text-left hover:text-white" title="View profile"><PlayerAvatar player={player} team={team} size={30} /><span className="font-medium text-slate-100">{p.name}</span></button></td>
                  <td className={td}>{p.matches}</td>
                  <td className="px-2 text-right font-bold tabular-nums text-white">{b?.runs ?? '-'}</td>
                  <td className={td}>{f1(avg)}</td>
                  <td className={td}>{b && b.balls ? f1((b.runs / b.balls) * 100) : '-'}</td>
                  <td className={td}>{b ? `${b.high}${b.highNotOut ? '*' : ''}` : '-'}</td>
                  <td className={td}>{b ? `${b.fifties}/${b.hundreds}` : '-'}</td>
                  <td className="px-2 text-right font-bold tabular-nums text-white">{w?.wickets ?? '-'}</td>
                  <td className={td}>{w && w.balls ? f1((w.runs / w.balls) * 6, 2) : '-'}</td>
                  <td className={td}>{w && w.wickets ? w.best : '-'}</td>
                  <td className={td}>{p.potm || ''}</td>
                  <td className="px-2 text-right font-bold tabular-nums text-amber-300">{p.impact}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {sorted.length === 0 && <p className="p-6 text-center text-sm text-slate-400">No matches played yet this year.</p>}
      </div>

      {progress.length > 0 && (
        <>
          <h2 className="mb-1 mt-8 font-display text-3xl tracking-wide">How your players changed</h2>
          <p className="mb-2 text-sm text-slate-400">{complete ? `These are the new ratings for ${review.year + 1}.` : 'If the season ended now, this is how ratings would change.'} Players who did better than their ratings suggested gain points; those who struggled lose some. Everyone also drifts a little with age and luck.</p>
          <div className="overflow-x-auto rounded-2xl border border-line bg-panel p-3">
            <table className="w-full text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-slate-500"><tr><th className="px-2 py-2 text-left font-medium">Player</th><th className={th}>Rating</th><th className={th}>Change</th><th className={th}>Batting</th><th className={th}>Bowling</th></tr></thead>
              <tbody>
                {progress.map((c) => {
                  const player = team.players.find((x) => x.id === c.id)
                  const d = c.after - c.before
                  return (
                    <tr key={c.id} className={`border-t border-line/60 ${d > 0 ? 'bg-emerald-500/5' : d < 0 ? 'bg-rose-500/5' : ''}`}>
                      <td className="px-2 py-1.5"><span className="flex items-center gap-2.5">{player && <PlayerAvatar profile player={player} team={team} size={30} />}<span className="font-medium text-slate-100">{c.name}</span></span></td>
                      <td className={td}>{c.before} → <b className="text-white">{c.after}</b></td>
                      <td className="px-2 text-right"><Delta n={d} big /></td>
                      <td className="px-2 text-right"><Delta n={c.bat} /></td>
                      <td className="px-2 text-right">{player?.bowling ? <Delta n={c.bowl} /> : <span className="text-slate-600">–</span>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <LeagueMovers title="Biggest risers in the league" rows={review.risers ?? []} teams={teams} />
            <LeagueMovers title="Biggest fallers in the league" rows={review.fallers ?? []} teams={teams} />
          </div>
        </>
      )}

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-panel p-4">
          <h3 className="mb-2 font-display text-2xl tracking-wide">Top of the table</h3>
          {review.table.map((r, i) => (
            <div key={r.teamId} className={`flex items-center gap-3 border-t border-line/60 py-1.5 text-sm first:border-0 ${r.teamId === review.teamId ? 'font-bold text-amber-300' : 'text-slate-200'}`}>
              <span className="w-5 text-slate-500">{i + 1}</span>
              {teams.get(r.teamId) && <TeamCrest team={teams.get(r.teamId)!} size={24} />}
              <span className="flex-1 truncate">{r.teamName}</span>
              <span className="tabular-nums text-slate-400">{r.won}-{r.played - r.won}</span>
            </div>
          ))}
          {review.rank > 5 && <div className="mt-1 text-xs text-slate-500">You finished {ordinal(review.rank)}.</div>}
        </section>

        {(session.reviews?.length ?? 0) > 0 && (
          <section className="rounded-2xl border border-line bg-panel p-4">
            <h3 className="mb-2 font-display text-2xl tracking-wide">Your career so far</h3>
            <table className="w-full text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-slate-500"><tr><th className="py-1 text-left font-medium">Year</th><th className={th}>W-L</th><th className={th}>Finish</th><th className={th}>Titles</th><th className={th}>Level</th></tr></thead>
              <tbody>
                {[...session.reviews].map((r: SeasonReview) => (
                  <tr key={r.year} className="border-t border-line/60 text-slate-200">
                    <td className="py-1.5 font-semibold text-white">{r.year}</td>
                    <td className={td}>{r.won}-{r.lost}</td>
                    <td className={td}>{ordinal(r.rank)}</td>
                    <td className="px-2 text-right font-bold tabular-nums text-amber-300">{r.titles.length || ''}</td>
                    <td className="px-2 text-right text-xs font-bold" style={{ color: COLOR[r.difficulty] }}>{DIFFICULTIES[r.difficulty].label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>

      <div className="sticky bottom-0 max-md:bottom-[calc(var(--sab)+66px)] mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-panel/95 p-4 backdrop-blur">
        <p className="text-sm text-slate-300">{complete ? `That's ${review.year} done. The ${review.year + 1} season keeps your team, your difficulty and your history.` : 'Play or sim the rest of this season to finish the year.'}</p>
        <button disabled={!complete} onClick={startNextSeason} className="rounded-full bg-emerald-500 px-7 py-2 font-display text-2xl tracking-wide text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40">Start the {review.year + 1} season</button>
      </div>
    </div>
  )
}
