import { useState } from 'react'
import type { Match } from '../../engine/match'
import type { Action } from '../../engine/replay'
import type { Intent } from '../../engine/types'
import { FORMATS } from '../../engine/types'
import { PlayerAvatar, TeamCrest } from '../ui'
import { oversText } from './format'

type Auto = 0 | 1 | 2 | 4

/** Moments that stop auto-play by themselves. */
export interface AutoStops { wickets: boolean; boundaries: boolean; innings: boolean }

interface Props {
  match: Match
  /** Does an action, saves it so the match can be resumed, and reacts to the result. */
  act: (a: Action) => void
  auto: Auto
  setAuto: (v: Auto) => void
  /** Career mode: which side is yours. null with `spectating` false means you manage both (a friendly). */
  mySide?: 0 | 1 | null
  /** A session match that doesn't involve your team: you can only watch. */
  spectating?: boolean
  stops: AutoStops
  setStops: (s: AutoStops) => void
}

const Icon = {
  auto: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" />,
  defend: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />,
  normal: <path d="M4 20L20 4M14 4h6v6" />,
  attack: <path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z" />,
  slog: <path d="M13 2L4 14h6l-1 8 9-12h-6z" />,
}

const INTENTS: { id: Intent | null; label: string; hint: string; color: string; icon: keyof typeof Icon }[] = [
  { id: null, label: 'Auto', hint: 'The batsmen decide', color: '#818cf8', icon: 'auto' },
  { id: 'defend', label: 'Defend', hint: 'Safe and slow: fewer boundaries, fewer wickets', color: '#38bdf8', icon: 'defend' },
  { id: 'normal', label: 'Normal', hint: 'Play the phase of the game', color: '#34d399', icon: 'normal' },
  { id: 'attack', label: 'Attack', hint: 'Risky and fast: more boundaries, more wickets', color: '#fbbf24', icon: 'attack' },
  { id: 'slog', label: 'Slog', hint: 'All or nothing', color: '#fb7185', icon: 'slog' },
]

const base = 'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-[13px] font-bold transition disabled:cursor-not-allowed disabled:opacity-40'
const solid = `${base} bg-slate-700 text-white hover:bg-slate-600`

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2 px-3 py-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-200">{title}</h3>
        {hint && <p className="truncate text-[11px] text-slate-500">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

export function ControlDeck({ match, act, auto, setAuto, mySide = null, spectating = false, stops, setStops }: Props) {
  const [overs, setOvers] = useState(5)
  const [askForfeit, setAskForfeit] = useState(false)
  const inn = match.current
  const cfg = FORMATS[match.format]
  const batSide = inn.battingSide
  const bowlSide = (1 - batSide) as 0 | 1
  const bat = match.battingSide()
  const bowl = match.bowlingSide()

  const styleNow = match.bowlStyle[bowlSide] ?? 'normal'
  const intentNow = match.intent[batSide]
  const intentKey = intentNow === null ? null : typeof intentNow === 'string' ? intentNow : 'normal'
  const options = match.bowlerOptions(bowlSide)
  const canChange = match.canChangeBowler
  const bowlerNow = inn.bowlerId

  if (match.isOver) return null
  const showBat = !spectating && (mySide === null || mySide === batSide)
  const showBowl = !spectating && (mySide === null || mySide === bowlSide)
  const cpuNote = (team: string) => <p className="rounded-lg bg-white/5 px-2.5 py-2 text-[12px] text-slate-300"><b className="text-white">{team}</b> is run by the computer, which picks its own plan.</p>

  return (
    <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-panel">
      {/* PLAY */}
      <Section title="Play">
        <div className="grid grid-cols-[1.6fr_1fr] gap-1.5">
          <button className={`${base} bg-emerald-500 text-black hover:bg-emerald-400`} onClick={() => act({ t: 'ball' })}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z" /></svg>
            Next ball
          </button>
          <button className={solid} onClick={() => act({ t: 'over' })}>Finish over</button>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-slate-400">Sim</span>
          <div className="flex h-9 items-center overflow-hidden rounded-lg bg-slate-700">
            <button className="grid h-9 w-8 place-items-center text-base font-bold text-white hover:bg-slate-600" aria-label="Fewer overs" onClick={() => setOvers((n) => Math.max(1, n - 1))}>−</button>
            <div className="w-16 text-center text-[13px] font-bold text-white">{overs} {overs === 1 ? 'over' : 'overs'}</div>
            <button className="grid h-9 w-8 place-items-center text-base font-bold text-white hover:bg-slate-600" aria-label="More overs" onClick={() => setOvers((n) => Math.min(cfg.overs, n + 1))}>+</button>
          </div>
          <button className={`${base} bg-indigo-500 text-white hover:bg-indigo-400`} onClick={() => act({ t: 'overs', n: overs })}>Go</button>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <button className={solid} onClick={() => act({ t: 'wicket' })}>Next wicket</button>
          <button className={solid} onClick={() => act({ t: 'innings' })}>End innings</button>
          <button className={`${base} bg-emerald-700 text-white hover:bg-emerald-600`} onClick={() => act({ t: 'match' })}>Finish match</button>
        </div>
      </Section>

      {/* AUTO-PLAY */}
      <Section title="Auto-play" hint="pauses only where ticked">
        <div className="grid grid-cols-4 overflow-hidden rounded-lg bg-slate-700">
          {([0, 1, 2, 4] as const).map((v) => (
            <button key={v} onClick={() => setAuto(v)} className={`h-8 text-[13px] font-bold transition ${auto === v ? 'bg-indigo-500 text-white' : 'text-slate-200 hover:bg-slate-600'}`}>
              {v === 0 ? 'Off' : `${v}x`}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-0.5">
          <span className="text-[11px] font-semibold text-slate-400">Pause on</span>
          {([['wickets', 'Wickets'], ['boundaries', 'Boundaries'], ['innings', 'Innings end']] as const).map(([k, label]) => (
            <label key={k} className="flex cursor-pointer items-center gap-1.5 text-[12px] font-semibold text-slate-200">
              <input type="checkbox" className="h-3.5 w-3.5 cursor-pointer accent-indigo-500" checked={stops[k]} onChange={(e) => setStops({ ...stops, [k]: e.target.checked })} />
              {label}
            </label>
          ))}
        </div>
      </Section>

      {/* TACTICS */}
      {spectating && <Section title="Watching"><p className="rounded-lg bg-white/5 px-2.5 py-2 text-[12px] text-slate-300">This isn't your team's match. The computer runs both sides, so there are no tactics to set.</p></Section>}
      {!spectating && !showBat && <Section title={`Batting · ${bat.team.name}`}>{cpuNote(bat.team.name)}</Section>}
      {showBat && <Section title={`Batting plan · ${bat.team.name}`}>
        <div className="grid grid-cols-5 gap-1.5">
          {INTENTS.map((i) => {
            const on = intentKey === i.id
            return (
              <button
                key={i.label} title={i.hint}
                onClick={() => act({ t: 'intent', side: batSide, v: i.id })}
                className="flex h-14 flex-col items-center justify-center gap-0.5 rounded-lg border-2 transition hover:brightness-125"
                style={{ borderColor: on ? i.color : '#2b3145', background: on ? `${i.color}26` : '#1a1f2e' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={i.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">{Icon[i.icon]}</svg>
                <span className="text-[11px] font-bold text-white">{i.label}</span>
              </button>
            )
          })}
        </div>
      </Section>}

      {!spectating && !showBowl && <Section title={`Bowling · ${bowl.team.name}`}>{cpuNote(bowl.team.name)}</Section>}
      {showBowl && <Section title={`How to bowl · ${bowl.team.name}`} hint="applies from the next ball">
        <div className="grid grid-cols-3 gap-1.5">
          {([
            ['safe', 'Safe', '#38bdf8', 'Bowl to the fielders. Fewer boundaries, but fewer wickets too.'],
            ['normal', 'Normal', '#94a3b8', 'The usual mix.'],
            ['aggressive', 'Aggressive', '#f87171', 'Tempt the big shot. More wickets, but more boundaries too.'],
          ] as const).map(([id, label, color, hint]) => {
            const on = styleNow === id
            return (
              <button key={id} title={hint} onClick={() => act({ t: 'style', side: bowlSide, v: id })} className="flex h-12 flex-col items-center justify-center rounded-lg border-2 transition hover:brightness-125" style={{ borderColor: on ? color : '#2b3145', background: on ? `${color}26` : '#1a1f2e' }}>
                <span className="text-[12px] font-bold text-white">{label}</span>
                <span className="text-[9px] leading-tight text-slate-400">{id === 'safe' ? 'fewer wickets' : id === 'aggressive' ? 'more wickets' : 'balanced'}</span>
              </button>
            )
          })}
        </div>
        <p className="text-[11px] leading-snug text-slate-400">{styleNow === 'safe' ? 'Bowling to where the fielders are: harder to score off, but batsmen survive more often.' : styleNow === 'aggressive' ? 'Bowling to tempt a big hit: more chances of a catch, and more runs when it goes wrong.' : 'The bowlers mix it up.'}</p>
      </Section>}

      {showBowl && <Section title={`Bowling · ${bowl.team.name}`} hint={canChange ? 'pick the next over' : 'locked until the over ends'}>
        <div className={`grid grid-cols-2 gap-1.5 ${canChange ? '' : 'pointer-events-none opacity-50'}`}>
          {options.map((p) => {
            const line = inn.bowlers.get(p.id)
            const on = bowlerNow === p.id
            return (
              <button
                key={p.id} onClick={() => act({ t: 'bowler', side: bowlSide, id: p.id })} disabled={!canChange}
                className={`flex h-10 items-center gap-1.5 rounded-lg border-2 px-1.5 text-left transition ${on ? 'border-red-400 bg-red-500/15' : 'border-line bg-panel-2 hover:border-slate-500'}`}
              >
                <PlayerAvatar player={p} team={bowl.team} size={26} />
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate text-[12px] font-bold text-white">{p.name}</span>
                  <span className="block truncate text-[10px] text-slate-400">{p.bowling?.type} · {oversText(line?.legalBalls ?? 0)} ov{line ? ` · ${line.wickets}/${line.runs}` : ''}</span>
                </span>
                {on && <span className="rounded bg-red-500 px-1 py-px text-[9px] font-extrabold text-white">NEXT</span>}
              </button>
            )
          })}
        </div>
      </Section>}

      {/* FOOTER: shortcuts + forfeit */}
      <section className="bg-black/20 px-3 py-2">
        {!askForfeit ? (
          <div className="flex items-center justify-between gap-2">
            <p className="hidden text-[11px] leading-tight text-slate-500 [@media(hover:hover)]:block">Keys: Space next ball · O finish over · P auto-play · C this panel</p>
            {!spectating && <button className="shrink-0 rounded-lg border border-red-500/60 px-2.5 py-1.5 text-[12px] font-bold text-red-300 hover:bg-red-500/15" onClick={() => setAskForfeit(true)}>Forfeit…</button>}
          </div>
        ) : (
          <div className="space-y-2 rounded-lg border-2 border-red-500/60 bg-red-950/30 p-2.5">
            <p className="text-[12px] text-red-100">{mySide === null ? 'Pick the team that gives up. ' : 'Your team gives up. '}The rest is played out and that team <b>will lose</b>. The result counts.</p>
            <div className={`grid gap-1.5 ${mySide === null ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {([bat, bowl] as const).map((s, i) => {
                const side = (i === 0 ? batSide : bowlSide) as 0 | 1
                if (mySide !== null && side !== mySide) return null
                return (
                  <button key={s.team.id} onClick={() => { setAskForfeit(false); setAuto(0); act({ t: 'forfeit', side }) }} className="flex items-center gap-2 rounded-lg border-2 border-red-500/70 bg-red-500/15 px-2 py-1.5 text-left text-[12px] font-bold text-white hover:bg-red-500/30">
                    <TeamCrest team={s.team} size={24} /><span className="min-w-0 truncate">{s.team.name} forfeits</span>
                  </button>
                )
              })}
            </div>
            <button className={`${solid} w-full`} onClick={() => setAskForfeit(false)}>Cancel</button>
          </div>
        )}
      </section>
    </div>
  )
}
