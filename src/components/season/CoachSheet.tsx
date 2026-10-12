import { useState } from 'react'
import { type CoachFocus } from '../../data/coaches'
import { ATTR_LABEL } from '../../season/progression'
import { FOCUS_BLURB, FOCUS_LABEL, LOCK_DAYS, canChange, coachOf, coachingOf, monthReport, seasonBoost } from '../../season/coaching'
import { addDays, formatDate, MONTHS } from '../../season/dates'
import type { AttrKey, Season } from '../../season/types'
import { selectSeason, useStore } from '../../store/useStore'
import { Sheet } from '../Sheet'
import { PlayerAvatar, TeamCrest } from '../ui'
import { usePlayerIndex, useTeamMap } from './shared'

const FOCI: CoachFocus[] = ['batting', 'bowling', 'fielding']
const COLOR: Record<CoachFocus, string> = { batting: '#fbbf24', bowling: '#f87171', fielding: '#34d399' }
const ICON: Record<CoachFocus, string> = { batting: '🏏', bowling: '🎯', fielding: '🧤' }
const monthName = (ym: string) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`

/** One month's gains: which player got which rating up. */
function Report({ season, teamId, ym }: { season: Season; teamId: string; ym: string }) {
  const index = usePlayerIndex()
  const rows = monthReport(season, teamId, ym)
  if (rows.length === 0) return <p className="text-sm text-slate-500">No rating has moved up yet this month. Training adds up slowly.</p>
  return (
    <div className="divide-y divide-line/60 rounded-2xl border border-line bg-panel">
      {rows.map((g) => {
        const e = index.get(g.playerId)
        return (
          <div key={g.playerId} className="flex items-center gap-3 px-3 py-2">
            {e ? <PlayerAvatar profile player={e.player} team={e.team} size={34} /> : <span className="h-[34px] w-[34px]" />}
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{e?.player.name ?? g.playerId}</span>
            <span className="flex flex-wrap justify-end gap-1">
              {Object.entries(g.attrs).map(([k, n]) => <span key={k} className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11px] font-bold text-emerald-300">+{n} {ATTR_LABEL[k as AttrKey]}</span>)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/**
 * A team's coach: who he is, what he is working on and the report of what he has done. For your own team you can also
 * give the instruction here; it stands for at least a month and you are told so before it is set.
 */
export function CoachSheet({ teamId, onClose }: { teamId: string; onClose: () => void }) {
  const season = useStore(selectSeason)
  const setCoachFocus = useStore((s) => s.setCoachFocus)
  const teams = useTeamMap()
  const [pick, setPick] = useState<CoachFocus | null>(null)
  if (!season) return null
  const team = teams.get(teamId)
  const coach = coachOf(season, teamId)
  const co = coachingOf(season, teamId)
  const mine = teamId === season.myTeamId
  const today = season.today
  const thisMonth = today.slice(0, 7)
  const boost = seasonBoost(season, teamId)
  const months = Object.keys(season.coachReport ?? {}).filter((m) => (season.coachReport?.[m]?.[teamId] && Object.keys(season.coachReport![m][teamId]).length > 0) || m === thisMonth).sort().reverse()
  const locked = !!co.focus && !canChange(co, today)
  if (!coach) return null
  const confirmDate = addDays(today, LOCK_DAYS)

  return (
    <Sheet label={`${coach.name}, coach`} onClose={onClose} size="md" z={85}>
      <div>
        <div className="relative px-5 pb-4 pt-5" style={{ background: `linear-gradient(135deg, ${team?.colors.primary ?? '#334155'}cc, #10131c 70%)` }}>
          <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 rounded-lg bg-black/40 px-2.5 py-1 text-sm font-bold text-white hover:bg-black/60">✕</button>
          <div className="flex items-center gap-3 pr-10">
            {team && <TeamCrest team={team} size={52} />}
            <div className="min-w-0">
              <div className="text-[11px] font-extrabold uppercase tracking-widest text-amber-300">{mine ? 'Your coach' : `${team?.name ?? 'Team'} coach`}</div>
              <h2 className="font-display text-4xl leading-none tracking-wide text-white">{coach.name}</h2>
              <div className="text-sm text-slate-200">from {coach.game}</div>
            </div>
          </div>
          <p className="mt-2 text-sm italic text-slate-100">"{coach.style}"</p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
            <span className="rounded-full bg-black/40 px-2.5 py-0.5 font-bold text-white">Coaching skill {coach.skill}</span>
            <span className="rounded-full bg-black/40 px-2.5 py-0.5 font-bold" style={{ color: COLOR[coach.specialty] }}>{ICON[coach.specialty]} Best at {FOCUS_LABEL[coach.specialty].toLowerCase()}</span>
            <span className="rounded-full bg-emerald-400/20 px-2.5 py-0.5 font-bold text-emerald-300">+{boost.total} rating points this year{boost.players ? ` across ${boost.players} players` : ''}</span>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <section>
            <h3 className="mb-1.5 text-[11px] font-extrabold uppercase tracking-widest text-slate-400">What the coach is working on</h3>
            {co.focus ? (
              <div className="rounded-2xl border-2 p-3" style={{ borderColor: `${COLOR[co.focus]}88`, background: `${COLOR[co.focus]}14` }}>
                <div className="font-display text-3xl leading-none tracking-wide" style={{ color: COLOR[co.focus] }}>{ICON[co.focus]} {FOCUS_LABEL[co.focus]}</div>
                <div className="mt-1 text-sm text-slate-200">{FOCUS_BLURB[co.focus]}</div>
                <div className="mt-1 text-xs text-slate-400">Since {co.since ? formatDate(co.since) : 'the start'}. {mine ? (locked ? <>You can change it again on <b className="text-white">{formatDate(co.lockedUntil as string)}</b>.</> : 'You can change it now.') : (co.lockedUntil ? `The computer reviews it on ${formatDate(co.lockedUntil)}.` : '')}</div>
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-amber-400/60 p-3 text-sm text-amber-200">{mine ? 'You have not told your coach what to work on yet. Until you do, nobody trains.' : 'The computer has not given an instruction yet.'}</p>
            )}
          </section>

          {mine && (!co.focus || !locked) && (
            <section>
              <h3 className="mb-1.5 text-[11px] font-extrabold uppercase tracking-widest text-slate-400">{co.focus ? 'Change the instruction' : 'Set the instruction'}</h3>
              {!pick ? (
                <div className="grid gap-2 sm:grid-cols-3">
                  {FOCI.map((f) => (
                    <button key={f} onClick={() => setPick(f)} className={`rounded-2xl border-2 p-3 text-left transition hover:brightness-125 ${!co.focus ? 'cta-pulse' : ''}`} style={{ borderColor: co.focus === f ? COLOR[f] : '#2b3145', background: co.focus === f ? `${COLOR[f]}1f` : '#10131c' }}>
                      <div className="font-display text-2xl leading-none tracking-wide" style={{ color: COLOR[f] }}>{ICON[f]} {FOCUS_LABEL[f]}</div>
                      <div className="mt-1 text-[11px] leading-snug text-slate-400">{FOCUS_BLURB[f]}</div>
                      {coach.specialty === f && <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-amber-300">His speciality</div>}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-amber-400/60 bg-amber-400/10 p-4">
                  <div className="font-display text-2xl leading-none tracking-wide text-white">{coach.name} will work on <span style={{ color: COLOR[pick] }}>{FOCUS_LABEL[pick].toLowerCase()}</span>.</div>
                  <p className="mt-2 text-sm text-slate-200">It stays that way for a month. You can come back and change it after <b className="text-white">{formatDate(confirmDate)}</b>, or keep it going.</p>
                  <div className="mt-3 grid grid-cols-[1fr_1.4fr] gap-2">
                    <button onClick={() => setPick(null)} className="rounded-full border border-line py-2.5 text-sm font-bold text-slate-200 hover:border-slate-400">Choose again</button>
                    <button onClick={() => { setCoachFocus(pick); setPick(null) }} className="rounded-full bg-emerald-500 py-2.5 font-display text-xl leading-none tracking-wide text-black hover:bg-emerald-400">Set it</button>
                  </div>
                </div>
              )}
            </section>
          )}

          <section>
            <h3 className="mb-1.5 text-[11px] font-extrabold uppercase tracking-widest text-slate-400">This month: {monthName(thisMonth)}</h3>
            <Report season={season} teamId={teamId} ym={thisMonth} />
          </section>
          {months.filter((m) => m !== thisMonth).map((m) => (
            <details key={m} className="group rounded-2xl border border-line bg-panel/50 p-3">
              <summary className="cursor-pointer list-none text-sm font-semibold text-slate-200">{monthName(m)} <span className="text-slate-500">· {monthReport(season, teamId, m).reduce((n, g) => n + g.total, 0)} points</span></summary>
              <div className="mt-2"><Report season={season} teamId={teamId} ym={m} /></div>
            </details>
          ))}
        </div>
      </div>
    </Sheet>
  )
}

