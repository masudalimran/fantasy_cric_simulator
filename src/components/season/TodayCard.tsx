import { Link } from 'react-router'
import { paths } from '../../routes'
import { daysBetween } from '../../season/dates'
import { PHYSIOS, physioOf } from '../../season/injuries'
import { needsFocus } from '../../season/coaching'
import { seasonComplete } from '../../season/results'
import { nudgeFor, scaleOf } from '../../season/club'
import { markSeen, useSeenSet } from '../../tips'
import type { Season } from '../../season/types'

interface Row { key: string; tone: string; icon: string; text: React.ReactNode; to?: string; onClick?: () => void; seen?: string }

const when = (n: number) => (n <= 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`)

/** What needs doing today in your career, in a few lines you can tap: the next match, the coach, the market, your physios. */
export function TodayCard({ season, onCoach }: { season: Season; onCoach: () => void }) {
  const mine = season.myTeamId
  const seenSet = useSeenSet()
  if (!mine) return null
  const rows: Row[] = []
  if (seasonComplete(season)) {
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
  // now and then, a reminder of something the club could do with idle coins (once a month, and not if you have already tried it all)
  const squadIds = season.market?.squads[mine] ?? []
  const bill = squadIds.reduce((n, id) => n + (season.market?.fees?.[id] ?? 4), 0)
  const month = Number(season.today.slice(5, 7))
  const hint = nudgeFor(season, season.market?.budgets[mine] ?? 0, scaleOf(bill), month)
  const hintKey = `clubnudge:${season.today.slice(0, 7)}`
  if (hint && !seenSet.has(hintKey)) rows.push({ key: 'club', tone: '#f59e0b', icon: hint.icon, to: paths.club, seen: hintKey, text: <>Your coins are sitting idle. <b className="text-white">{hint.text}</b></> })
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
          return <li key={r.key}>{r.to ? <Link to={r.to} className={cls} onClick={() => r.seen && markSeen(r.seen)}>{inner}</Link> : <button type="button" onClick={r.onClick} className={cls}>{inner}</button>}</li>
        })}
      </ul>
    </section>
  )
}
