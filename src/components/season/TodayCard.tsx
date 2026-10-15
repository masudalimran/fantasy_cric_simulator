import { Link } from 'react-router'
import { paths } from '../../routes'
import { daysBetween, formatDate } from '../../season/dates'
import { PHYSIOS, physioOf } from '../../season/injuries'
import { needsFocus } from '../../season/coaching'
import { myNextFixture, seasonComplete } from '../../season/results'
import type { Season } from '../../season/types'
import { useTeamMap } from './shared'

interface Row { key: string; tone: string; icon: string; text: React.ReactNode; to?: string; onClick?: () => void }

const when = (n: number) => (n <= 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`)

/** What needs doing today in your career, in a few lines you can tap: the next match, the coach, the market, your physios. */
export function TodayCard({ season, onCoach }: { season: Season; onCoach: () => void }) {
  const teams = useTeamMap()
  const mine = season.myTeamId
  if (!mine) return null
  const rows: Row[] = []
  const next = myNextFixture(season)
  if (next) {
    const opp = teams.get(next.homeId === mine ? (next.awayId ?? '') : (next.homeId ?? ''))
    const n = daysBetween(season.today, next.date)
    rows.push({ key: 'match', tone: '#fbbf24', icon: '🏏', to: `${paths.session(next.date.slice(0, 7))}?day=${next.date}`, text: <>Next match: <b className="text-white">{opp?.name ?? 'TBD'}</b> {when(n)} <span className="text-slate-400">({formatDate(next.date)})</span></> })
  } else if (seasonComplete(season)) {
    rows.push({ key: 'done', tone: '#34d399', icon: '🏆', to: paths.review, text: <>The season is over: <b className="text-white">see how it went</b></> })
  }
  if (needsFocus(season)) rows.push({ key: 'coach', tone: '#818cf8', icon: '🎓', onClick: onCoach, text: <>Your coach needs an instruction: <b className="text-white">choose a focus</b></> })
  const open = season.windows?.find((w) => season.today >= w.start && season.today <= w.end)
  const offers = season.market?.offers?.length ?? 0
  if (open) rows.push({ key: 'market', tone: '#e879f9', icon: '💰', to: paths.market, text: <>The market is open for <b className="text-white">{Math.max(0, daysBetween(season.today, open.end))} more days</b>{offers > 0 && <> · {offers} {offers === 1 ? 'offer' : 'offers'} waiting</>}</> })
  else {
    const soon = season.windows?.find((w) => w.start > season.today && daysBetween(season.today, w.start) <= 10)
    if (soon) rows.push({ key: 'market', tone: '#e879f9', icon: '💰', to: paths.market, text: <>The market opens {when(daysBetween(season.today, soon.start))}: <b className="text-white">plan your signings</b></> })
  }
  const physios = physioOf(season, mine, season.today).length
  if (physios < PHYSIOS) rows.push({ key: 'physio', tone: '#fb7185', icon: '🩺', to: paths.sessionSquad, text: <>Pick your physios: <b className="text-white">{physios} of {PHYSIOS}</b> set</> })
  if (rows.length === 0) return null
  return (
    <section className="mb-4 rounded-2xl border border-line bg-panel px-3 py-2.5" aria-label="What to do today">
      <h3 className="mb-1 text-[11px] font-extrabold uppercase tracking-widest text-amber-300">To do today</h3>
      <ul className="divide-y divide-line/60">
        {rows.map((r) => {
          const inner = (
            <>
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-base" style={{ background: `${r.tone}22`, boxShadow: `inset 0 0 0 1.5px ${r.tone}88` }} aria-hidden>{r.icon}</span>
              <span className="min-w-0 flex-1 text-sm leading-snug text-slate-200">{r.text}</span>
              <span className="shrink-0 text-lg text-slate-500" aria-hidden>›</span>
            </>
          )
          const cls = 'flex w-full cursor-pointer items-center gap-3 py-2 text-left transition active:bg-white/5'
          return <li key={r.key}>{r.to ? <Link to={r.to} className={cls}>{inner}</Link> : <button type="button" onClick={r.onClick} className={cls}>{inner}</button>}</li>
        })}
      </ul>
    </section>
  )
}
