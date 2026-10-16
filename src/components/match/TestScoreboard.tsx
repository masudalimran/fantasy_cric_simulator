import { motion } from 'framer-motion'
import type { Match } from '../../engine/match'
import { DIFFICULTIES, type Difficulty, type Weather } from '../../engine/types'
import { TeamLogo } from '../season/Details'
import { accentOf } from '../ui'
import { oversText, runRate } from './format'

export const WEATHER_LABEL: Record<Weather, { icon: string; label: string }> = {
  clear: { icon: '☀️', label: 'Sunny' },
  overcast: { icon: '⛅', label: 'Overcast' },
  drizzle: { icon: '🌦️', label: 'Drizzle' },
  rain: { icon: '🌧️', label: 'Rain' },
  'bad light': { icon: '🌥️', label: 'Bad light' },
  washout: { icon: '⛈️', label: 'Washed out' },
}
export const SESSION_LABEL = ['', 'Morning session', 'Afternoon session', 'Evening session'] as const

/** What a Test stands at, in a line: the lead or the deficit, or what the chase needs. */
export function testSituation(match: Match): { text: string; tone: 'good' | 'bad' | 'plain' } {
  const inn = match.shown
  const own = match.innings.filter((i) => i.battingSide === inn.battingSide && i.index <= inn.index).reduce((s, i) => s + i.runs, 0)
  const opp = match.innings.filter((i) => i.battingSide !== inn.battingSide && i.index <= inn.index).reduce((s, i) => s + i.runs, 0)
  if (inn.target !== null) {
    const need = Math.max(inn.target - inn.runs, 0)
    return { text: `Need ${need} to win · ${10 - inn.wickets} wickets left`, tone: 'plain' }
  }
  if (inn.index === 0) return { text: 'First innings', tone: 'plain' }
  const lead = own - opp
  if (inn.index === 1) return lead >= 0 ? { text: `Lead by ${lead}`, tone: 'good' } : { text: `Trail by ${-lead}`, tone: 'bad' }
  return lead >= 0 ? { text: `Lead by ${lead}`, tone: 'good' } : { text: `Trail by ${-lead}`, tone: 'bad' }
}

/** The name of an innings: "1st innings", "2nd innings", "Follow-on", ... */
export const inningsName = (i: { index: number; followOn?: boolean }) => (i.followOn ? 'Follow-on' : ['1st innings', '2nd innings', '3rd innings', '4th innings'][i.index])

function Who({ side, you }: { side: 0 | 1; you: 0 | 1 | null | undefined }) {
  if (you === null || you === undefined) return null
  return side === you
    ? <span className="ml-1.5 rounded bg-amber-400 px-1.5 py-px align-middle text-[10px] font-extrabold tracking-wider text-black">YOU</span>
    : <span className="ml-1.5 rounded bg-slate-500 px-1.5 py-px align-middle text-[10px] font-extrabold tracking-wider text-white">CPU</span>
}

/**
 * The scoreboard of a Test: the batting score and overs, the day and session with the weather, how much of the day is left,
 * and where the match stands (lead, deficit or what the chase needs). A thin bar shows the five days.
 */
export function TestScoreboard({ match, you, difficulty, onBack, backLabel }: { match: Match; you?: 0 | 1 | null; difficulty?: Difficulty | null; onBack?: () => void; backLabel?: string }) {
  const inn = match.shown
  const bat = match.battingSide(inn)
  const bowl = match.bowlingSide(inn)
  const clock = match.clock
  const accent = accentOf(bat.team)
  const sit = testSituation(match)
  const wx = clock ? WEATHER_LABEL[clock.plan.weather] : WEATHER_LABEL.clear
  const dayFill = clock && clock.plan.scheduled > 0 ? Math.min(1, clock.ballsToday / (clock.plan.scheduled * 6)) : 1
  return (
    <div className="relative shrink-0 overflow-hidden border-b border-line bg-panel" style={onBack ? { paddingTop: 'var(--sat)' } : undefined}>
      <div className="pointer-events-none absolute inset-0 opacity-30" style={{ background: `linear-gradient(100deg, ${bat.team.colors.primary}, transparent 60%)` }} />
      <div className="relative flex items-center gap-2 px-2 pb-1 pt-1.5">
        {onBack && (
          <button onClick={onBack} aria-label={backLabel} className="grid h-11 w-9 shrink-0 place-items-center rounded-xl text-slate-200 active:bg-white/10">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m15 5-7 7 7 7" /></svg>
          </button>
        )}
        <TeamLogo team={bat.team} size={32} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <motion.span key={`${inn.runs}-${inn.wickets}`} className="inline-block font-display text-[28px] leading-none" style={{ color: accent }} initial={{ scale: 1.2, filter: 'brightness(1.8)' }} animate={{ scale: 1, filter: 'brightness(1)' }} transition={{ duration: 0.3 }}>
              {inn.runs}<span className="text-slate-500">/</span>{inn.wickets}{inn.declared && <span className="ml-1 text-sm text-amber-300">dec</span>}
            </motion.span>
            <span className="font-display text-base leading-none text-white">{oversText(inn.legalBalls)}<span className="text-xs text-slate-400"> ov</span></span>
          </div>
          <div className="truncate text-[11px] font-semibold leading-tight text-slate-200">
            {bat.team.name}<Who side={inn.battingSide} you={you} />
            <span className="font-normal text-slate-400"> · {inningsName(inn)} · TEST</span>
          </div>
        </div>
        <div className="shrink-0 pl-1 text-right">
          <div className="font-display text-base leading-none text-white">Day {clock?.day ?? 1} <span className="text-[11px] font-sans font-bold text-slate-400">of 5</span></div>
          <div className="text-[11px] text-slate-300"><span aria-hidden>{wx.icon}</span> {wx.label}</div>
        </div>
      </div>
      <div className="relative flex items-center justify-between gap-2 px-3 pb-1.5 text-[11px] text-slate-300">
        <span className={`font-bold ${sit.tone === 'good' ? 'text-emerald-300' : sit.tone === 'bad' ? 'text-rose-300' : 'text-white'}`}>{sit.text}</span>
        <span className="truncate text-slate-400">{clock ? `${SESSION_LABEL[match.session]} · ${match.oversLeftToday} overs left today` : ''}</span>
        <span className="shrink-0 text-slate-400">CRR <b className="text-white">{runRate(inn)}</b></span>
      </div>
      <div className="relative flex h-1.5 gap-px bg-black/40" title="The five days">
        {[1, 2, 3, 4, 5].map((d) => (
          <div key={d} className="relative flex-1 bg-white/10">
            <div className="absolute inset-y-0 left-0" style={{ width: !clock ? '0%' : d < clock.day ? '100%' : d === clock.day ? `${dayFill * 100}%` : '0%', background: accent }} />
          </div>
        ))}
      </div>
      <div className="relative flex items-center justify-between px-3 pb-1 pt-0.5 text-[10px] text-slate-500">
        <span>vs {bowl.team.name}<Who side={(1 - inn.battingSide) as 0 | 1} you={you} /></span>
        {difficulty && you !== null && you !== undefined && <span className="font-bold uppercase tracking-wider text-slate-400">{DIFFICULTIES[difficulty].label}</span>}
        {inn.followOn && <span className="rounded bg-sky-400/20 px-1.5 text-[10px] font-extrabold uppercase text-sky-300">following on</span>}
      </div>
    </div>
  )
}

/** "Soul Reapers 345 & 210/4  ·  Hidden Leaf 320": the scores of a match for a result screen (a Test side shows both its innings). */
export function scoreLineOf(match: Match): string {
  if (match.format !== 'test') return match.innings.map((i) => `${match.battingSide(i).team.name} ${i.runs}/${i.wickets}`).join('  ·  ')
  const order = [...new Set(match.innings.map((i) => i.battingSide))]
  return order.map((side) => {
    const own = match.innings.filter((i) => i.battingSide === side)
    return `${match.sides[side].team.name} ${own.map((i) => `${i.runs}${i.wickets < 10 || i.declared ? `/${i.wickets}` : ''}${i.declared ? 'd' : ''}`).join(' & ')}`
  }).join('  ·  ')
}