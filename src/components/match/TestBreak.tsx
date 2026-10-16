import { motion } from 'framer-motion'
import type { Match } from '../../engine/match'
import { PlayerAvatar, accentOf } from '../ui'
import { TeamLogo } from '../season/Details'
import { oversText, strikeRate } from './format'
import { inningsName, testSituation, WEATHER_LABEL } from './TestScoreboard'

/** Every innings so far as a short list of scores, the way a broadcaster would show a Test: "Soul Reapers 345 & 210/4". */
function CardLines({ match }: { match: Match }) {
  return (
    <div className="space-y-1.5">
      {match.innings.map((i) => {
        const t = match.sides[i.battingSide].team
        return (
          <div key={i.index} className="flex items-center gap-2 rounded-xl bg-white/5 px-2.5 py-1.5">
            <TeamLogo team={t} size={26} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold text-white">{t.name}</div>
              <div className="text-[11px] text-slate-400">{inningsName(i)}{i.declared ? ' · declared' : ''}</div>
            </div>
            <div className="text-right font-display text-2xl leading-none text-white">{i.runs}<span className="text-base text-slate-400">/{i.wickets}</span><div className="font-sans text-[10px] text-slate-400">{oversText(i.legalBalls)} ov</div></div>
          </div>
        )
      })}
    </div>
  )
}

function Shell({ label, accent, children }: { label: string; accent: string; children: React.ReactNode }) {
  return (
    <motion.div data-scroll-lock className="fixed inset-0 z-[55] grid place-items-center bg-black/65 p-3 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div
        role="dialog" aria-label={label}
        initial={{ y: -30, scale: 0.95, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: -20, opacity: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="relative max-h-full w-full max-w-md overflow-y-auto rounded-3xl border-2 bg-ink shadow-2xl"
        style={{ borderColor: accent, boxShadow: `0 0 60px ${accent}55` }}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}

/**
 * Between the innings of a Test, or at stumps: the scores so far, where the match stands, and the best of what has just been played.
 * At stumps it carries the Next day button; between innings it only needs closing, then Next innings starts play.
 */
export function TestBreak({ match, stumps, onClose, onNextDay }: { match: Match; stumps: boolean; onClose: () => void; onNextDay: () => void }) {
  const clock = match.clock
  // the innings that has just finished (the live one is the one after it, or the same one at stumps)
  const done = stumps && !match.current.done ? match.current : match.innings[Math.max(0, match.current.done ? match.current.index : match.current.index - 1)]
  const bat = match.sides[done.battingSide]
  const bowl = match.sides[1 - done.battingSide]
  const accent = accentOf(bat.team)
  const sit = testSituation(match)
  const topBat = [...done.batters].sort((a, b) => b.runs - a.runs || a.balls - b.balls).slice(0, 2)
  const topBowl = [...done.bowlers.values()].sort((a, b) => b.wickets - a.wickets || a.runs - b.runs).slice(0, 2)
  const wx = clock ? WEATHER_LABEL[clock.plan.weather] : WEATHER_LABEL.clear
  const next = !stumps && match.current !== done ? match.sides[match.current.battingSide].team : null
  return (
    <Shell label={stumps ? `Stumps, day ${clock?.day}` : 'Innings break'} accent={accent}>
      <div className="px-5 pb-3 pt-4" style={{ background: `linear-gradient(120deg, ${bat.team.colors.primary}cc, #10131c 70%)` }}>
        <div className="text-[11px] font-extrabold uppercase tracking-widest text-amber-300">{stumps ? `Stumps · Day ${clock?.day} of 5` : `Innings break · ${inningsName(done)} done`}</div>
        <div className="font-display text-3xl leading-none tracking-wide text-white">{stumps ? 'End of the day' : bat.team.name}</div>
        <div className="mt-1 text-xs text-slate-300">{wx.icon} {wx.label}{clock && clock.plan.lost > 0 ? ` · ${clock.plan.lost} overs lost` : ''} · {clock ? Math.min(clock.plan.scheduled, Math.floor(clock.ballsToday / 6)) : 0} overs bowled today</div>
      </div>
      <div className="space-y-3 p-4">
        <CardLines match={match} />
        <div className={`rounded-xl border px-3 py-2 text-center ${sit.tone === 'good' ? 'border-emerald-400/50 bg-emerald-400/10' : sit.tone === 'bad' ? 'border-rose-400/50 bg-rose-400/10' : 'border-line bg-white/5'}`}>
          <div className="text-[11px] font-extrabold uppercase tracking-widest text-slate-300">Where it stands</div>
          <div className="font-display text-2xl leading-none text-white">{sit.text}</div>
        </div>
        {(topBat.length > 0 || topBowl.length > 0) && (
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <div className="mb-1 text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Top bats</div>
              {topBat.map((b) => (
                <div key={b.id} className="flex items-center gap-2 border-t border-line/60 py-1 text-sm first:border-0">
                  <PlayerAvatar player={match.player(b.id)} team={bat.team} size={22} />
                  <span className="min-w-0 flex-1 truncate font-semibold text-white">{match.player(b.id).name}</span>
                  <span className="tabular-nums text-white">{b.runs}{b.dismissal ? '' : '*'} <span className="text-[11px] text-slate-400">({b.balls}) SR {strikeRate(b.runs, b.balls)}</span></span>
                </div>
              ))}
            </div>
            <div>
              <div className="mb-1 text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Best bowling</div>
              {topBowl.map((l) => (
                <div key={l.id} className="flex items-center gap-2 border-t border-line/60 py-1 text-sm first:border-0">
                  <PlayerAvatar player={match.player(l.id)} team={bowl.team} size={22} />
                  <span className="min-w-0 flex-1 truncate font-semibold text-white">{match.player(l.id).name}</span>
                  <span className="tabular-nums text-white">{l.wickets}/{l.runs} <span className="text-[11px] text-slate-400">({oversText(l.legalBalls)})</span></span>
                </div>
              ))}
            </div>
          </div>
        )}
        {next && <div className="text-center text-xs text-slate-400">Next: <b className="text-slate-200">{next.name}</b> bat</div>}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-line bg-black/20 px-4 py-3">
        <button onClick={onClose} className="rounded-full bg-white/10 px-5 py-2 font-display text-lg tracking-wide text-white active:bg-white/20">Close</button>
        {stumps && <button onClick={onNextDay} className="cta-pulse rounded-full bg-emerald-500 px-6 py-2 font-display text-xl tracking-wide text-black active:bg-emerald-400">NEXT DAY</button>}
      </div>
    </Shell>
  )
}

/** The side that leads by enough says whether the other side follows on, or bats again itself. */
export function FollowOnPrompt({ match, onChoose }: { match: Match; onChoose: (enforce: boolean) => void }) {
  const first = match.innings[0]
  const lead = first.runs - match.innings[1].runs
  const lead_ = match.sides[first.battingSide].team
  const trail = match.sides[1 - first.battingSide].team
  return (
    <Shell label="Follow-on" accent={accentOf(lead_)}>
      <div className="p-5 text-center">
        <div className="text-[11px] font-extrabold uppercase tracking-widest text-amber-300">Captain's call</div>
        <div className="mt-1 flex items-center justify-center gap-3"><TeamLogo team={lead_} size={44} /><h2 className="font-display text-3xl leading-none tracking-wide text-white">Enforce the follow-on?</h2></div>
        <p className="mt-2 text-sm text-slate-300"><b className="text-white">{lead_.name}</b> lead by <b className="text-white">{lead}</b> runs on the first innings. {trail.name} can be made to bat again at once, or you can bat yourselves with the lead.</p>
        <p className="mt-1 text-xs text-slate-400">About {match.oversLeftExpected} overs are left in the match.</p>
        <div className="mt-4 grid gap-2">
          <button onClick={() => onChoose(true)} className="rounded-full bg-amber-400 px-6 py-3 font-display text-2xl leading-none tracking-wide text-black active:bg-amber-300">Enforce the follow-on</button>
          <button onClick={() => onChoose(false)} className="rounded-full border border-line px-6 py-2.5 text-sm font-bold text-slate-200 active:bg-white/10">Bat again ourselves</button>
        </div>
      </div>
    </Shell>
  )
}
