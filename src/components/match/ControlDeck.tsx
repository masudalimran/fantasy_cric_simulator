import { useState } from 'react'
import type { Match } from '../../engine/match'
import type { Action } from '../../engine/replay'
import type { Intent } from '../../engine/types'
import { FORMATS } from '../../engine/types'
import { PlayerAvatar } from '../ui'
import { TeamLogo } from '../season/Details'
import { oversText } from './format'
import { askVoice, cancelSpeech, setVoiceMode, setVoiceName, setVoiceSpeed, speak, useEnglishVoices, useVoiceMode, useVoiceNames, useVoiceSpeed, voiceSupported, type VoiceMode, type VoiceSpeed } from '../../audio/voice'
import { VOICE_ROLES, assignVoices, type VoiceRole } from '../../audio/speechText'
import { animLevelOf, setAnimLevel, setAnimPrefs, setBroadcastView, setCaptions, setScoreBar, setSwipeAim, useAnimPrefs, useBroadcastView, useCaptions, useScoreBar, useSwipeAim, type AnimLevel, type AnimPrefs } from '../../prefs'
import { DeliveryPad, ShotPad } from './AimPads'

type Auto = 0 | 1 | 2 | 4

/** Moments that stop auto-play by themselves. */
export interface AutoStops { wickets: boolean; milestones: boolean; boundaries: boolean; innings: boolean }

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
  /** Play every ball yourself: the auto-play options go away. */
  manual?: boolean
  setManual?: (v: boolean) => void
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

/** A section that stays folded until you open it, for the optional controls. */
function Fold({ title, hint, badge, children }: { title: string; hint?: string; badge?: string | null; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <details className="group px-3 py-2.5" open={open} onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
      <summary className="flex cursor-pointer list-none items-baseline justify-between gap-2">
        <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-200">{title} <span className="ml-1 text-slate-500 transition group-open:rotate-90">›</span></h3>
        {badge ? <span className="truncate rounded bg-amber-400 px-1.5 py-px text-[11px] font-extrabold text-black">{badge}</span> : hint && <p className="truncate text-[11px] text-slate-500">{hint}</p>}
      </summary>
      <div className="mt-2 space-y-2">{children}</div>
    </details>
  )
}

/** One on/off row of the controls. */
function SwitchRow({ title, hint, on, set, tip }: { title: string; hint: string; on: boolean; set: (v: boolean) => void; tip?: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg bg-white/5 px-2.5 py-2" title={tip}>
      <span><span className="block text-[13px] font-bold text-white">{title}</span><span className="block text-[11px] text-slate-400">{hint}</span></span>
      <span role="switch" aria-checked={on} onClick={(e) => { e.preventDefault(); set(!on) }} className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? 'bg-indigo-500' : 'bg-slate-600'}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} /></span>
      <input type="checkbox" className="sr-only" checked={on} onChange={(e) => set(e.target.checked)} />
    </label>
  )
}

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

export function ControlDeck({ match, act, auto, setAuto, mySide = null, spectating = false, stops, setStops, manual = false, setManual }: Props) {
  const swipeOn = useSwipeAim()
  const bcast = useBroadcastView()
  const captionsOn = useCaptions()
  const scoreBarOn = useScoreBar()
  const voiceMode = useVoiceMode()
  const voiceSpeed = useVoiceSpeed()
  const voiceNames = useVoiceNames()
  const englishVoices = useEnglishVoices()
  const anim = useAnimPrefs()
  const [overs, setOvers] = useState(5)
  const [askForfeit, setAskForfeit] = useState(false)
  const [askDeclare, setAskDeclare] = useState(false)
  const inn = match.shown
  const cfg = FORMATS[match.format]
  const batSide = inn.battingSide
  const bowlSide = (1 - batSide) as 0 | 1
  const bat = match.battingSide(inn)
  const bowl = match.bowlingSide(inn)

  const styleNow = match.bowlStyle[bowlSide] ?? 'normal'
  const intentNow = match.intent[batSide]
  const intentKey = intentNow === null ? null : typeof intentNow === 'string' ? intentNow : 'normal'
  const options = match.bowlerOptions(bowlSide)
  const canChange = match.canChangeBowler
  const bowlerNow = inn.bowlerId

  if (match.isOver) return null
  // between the innings nothing can be set: the sides swap when Next innings is pressed
  if (match.hold !== null) return <div className="rounded-xl border border-line bg-panel p-4 text-sm text-slate-300"><b className="text-white">Innings break.</b> Press <b className="text-white">Next innings</b> to swap the sides and carry on. The controls come back with the next innings.</div>
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
        {match.format === 'test' && (
          <>
            <div className="grid grid-cols-2 gap-1.5">
              <button className={solid} onClick={() => act({ t: 'session' })} title="Play on to lunch, tea or stumps">Sim session</button>
              <button className={solid} onClick={() => act({ t: 'day' })} title="Play on to stumps">Sim day</button>
            </div>
            {showBat && inn.index < 3 && !inn.done && (
              !askDeclare
                ? <button className={`${base} w-full border border-amber-400/60 bg-amber-400/10 text-amber-200 hover:bg-amber-400/20`} onClick={() => setAskDeclare(true)}>Declare the innings</button>
                : (
                  <div className="space-y-1.5 rounded-lg border border-amber-400/60 bg-amber-400/10 p-2">
                    <p className="text-[12px] text-amber-100">Close the innings at <b>{inn.runs}/{inn.wickets}</b>? Your bowlers go out to bowl at once.</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button className={`${base} bg-amber-400 text-black hover:bg-amber-300`} onClick={() => { setAskDeclare(false); act({ t: 'declare' }) }}>Declare</button>
                      <button className={solid} onClick={() => setAskDeclare(false)}>Keep batting</button>
                    </div>
                  </div>
                )
            )}
          </>
        )}
        <Fold title="Display options" hint="broadcast view, score bar, captions, play manually" badge={manual ? 'Playing manually' : null}>
          <SwitchRow title="Broadcast view" tip="Show the match the way it looks on TV" on={bcast} set={setBroadcastView} hint={bcast ? 'On: a TV camera follows the bowler and the ball (aim shots with the shot pad)' : 'Off: the field is shown from above'} />
          {bcast && <SwitchRow title="Score bar" tip="The score, the two batsmen and the bowler in the corner of the picture" on={scoreBarOn} set={setScoreBar} hint={scoreBarOn ? 'On: the score is shown in the corner of the picture' : 'Off: the corner of the picture is clear'} />}
          {bcast && <SwitchRow title="Captions" tip="Write the commentary line of each ball along the top of the picture" on={captionsOn} set={setCaptions} hint={captionsOn ? 'On: the commentary line is written on the picture' : 'Off: no captions on the picture'} />}
          {setManual && <SwitchRow title="Play manually" tip="Play every ball yourself: the auto-play options go away and the controls stay in view" on={manual} set={setManual} hint={manual ? 'On: no auto-play, the controls stay in view' : 'Off: auto-play is available'} />}
        </Fold>
        <Fold title="More ways to play" hint="sim ahead, next wicket, finish">
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
        </Fold>
      </Section>

      {/* AUTO-PLAY (not shown when you play manually) */}
      {!manual && <Section title="Auto-play" hint="where it pauses, that screen waits for a tap">
        <div className="grid grid-cols-4 overflow-hidden rounded-lg bg-slate-700">
          {([0, 1, 2, 4] as const).map((v) => (
            <button key={v} onClick={() => setAuto(v)} className={`h-8 text-[13px] font-bold transition ${auto === v ? 'bg-indigo-500 text-white' : 'text-slate-200 hover:bg-slate-600'}`}>
              {v === 0 ? 'Off' : `${v}x`}
            </button>
          ))}
        </div>
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center gap-1 text-[12px] text-slate-300">
            <span className="font-semibold text-slate-400">Pause on</span>
            <span className="min-w-0 flex-1 truncate">{([['wickets', 'wickets'], ['milestones', 'fifties and hundreds'], ['boundaries', 'boundaries'], ['innings', 'innings end']] as const).filter(([k]) => stops[k]).map(([, l]) => l).join(', ') || 'nothing'}</span>
            <span className="text-slate-500 transition group-open:rotate-90">›</span>
          </summary>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {([['wickets', 'Wickets'], ['milestones', 'Fifties and hundreds'], ['boundaries', 'Boundaries'], ['innings', 'Innings end']] as const).map(([k, label]) => (
            <label key={k} className="flex cursor-pointer items-center gap-1.5 text-[12px] font-semibold text-slate-200">
              <input type="checkbox" className="h-3.5 w-3.5 cursor-pointer accent-indigo-500" checked={stops[k]} onChange={(e) => setStops({ ...stops, [k]: e.target.checked })} />
              {label}
            </label>
          ))}
        </div>
        </details>
      </Section>}

      {/* ANIMATIONS: whether the big screens play */}
      <Fold title="Animations" hint={animLevelOf(anim) ? { full: 'all screens', light: 'big moments only', off: 'none' }[animLevelOf(anim) as AnimLevel] : 'custom'}>
        <div className="grid grid-cols-3 overflow-hidden rounded-lg bg-slate-700">
          {([['full', 'Full'], ['light', 'Light'], ['off', 'Off']] as const).map(([l, label]) => (
            <button key={l} onClick={() => setAnimLevel(l)} className={`h-8 text-[13px] font-bold transition ${animLevelOf(anim) === l ? 'bg-indigo-500 text-white' : 'text-slate-200 hover:bg-slate-600'}`}>{label}</button>
          ))}
        </div>
        <p className="text-[11px] leading-snug text-slate-400">Light keeps wickets, sixes, fifties and hundreds, and skips the rest.</p>
        <details className="group">
          <summary className="cursor-pointer list-none text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200">Advanced <span className="ml-1 text-slate-500 transition group-open:rotate-90">›</span></summary>
          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5">
            {([['wicket', 'Wicket replay'], ['wicketcam', 'Special wicket screens (stump cam, catch cams, stumping and rope checks, hit wicket)'], ['milestone', 'Fifties and hundreds'], ['six', 'Sixes'], ['four', 'Fours'], ['extras', 'Extras and maidens'], ['freeHit', 'Free hit'], ['nearmiss', 'Close calls (replay of a ball that nearly bowled him or nearly found the edge)'], ['moves', 'Signature moves (a team\'s special move on sixes, big fours and wickets)'], ['reviews', 'Reviews and third umpire'], ['timeout', 'Strategic timeouts'], ['intro', 'Match intros (lineups, big games, target, super over)'], ['drama', 'Momentum, records, phase changes, over banners'], ['cheer', 'Crowd and fun screens (cheerleaders, stands, huddle, wave, fan cam...)'], ['studio', 'The studio show (between innings, at stumps and after the match)']] as [keyof AnimPrefs, string][]).map(([k, label]) => (
              <label key={k} className="flex cursor-pointer items-center gap-1.5 text-[12px] font-semibold text-slate-200">
                <input type="checkbox" className="h-3.5 w-3.5 cursor-pointer accent-indigo-500" checked={anim[k]} onChange={(e) => setAnimPrefs({ [k]: e.target.checked })} />{label}
              </label>
            ))}
          </div>
        </details>
      </Fold>

      {/* VOICES: the studio show and the commentary, spoken */}
      {voiceSupported() && <Fold title="Voices" hint={{ off: 'off', studio: 'studio show', full: 'show + commentary' }[voiceMode]}>
        <div className="grid grid-cols-3 overflow-hidden rounded-lg bg-slate-700">
          {([['off', 'Off'], ['studio', 'Studio'], ['full', 'Full']] as [VoiceMode, string][]).map(([m, label]) => (
            <button key={m} onClick={() => (m === 'off' ? setVoiceMode('off') : askVoice(m))} className={`h-8 cursor-pointer text-[13px] font-bold transition ${voiceMode === m ? 'bg-indigo-500 text-white' : 'text-slate-200 hover:bg-slate-600'}`}>{label}</button>
          ))}
        </div>
        <p className="text-[11px] leading-snug text-slate-400">Studio: the show's host and experts speak their lines. Full: two commentators also call every ball. The voices come from your phone, nothing is downloaded.</p>
        <div className="grid grid-cols-3 overflow-hidden rounded-lg bg-slate-700">
          {([['slow', 'Slower'], ['normal', 'Normal'], ['fast', 'Faster']] as [VoiceSpeed, string][]).map(([m, label]) => (
            <button key={m} onClick={() => setVoiceSpeed(m)} className={`h-8 cursor-pointer text-[13px] font-bold transition ${voiceSpeed === m ? 'bg-indigo-500 text-white' : 'text-slate-200 hover:bg-slate-600'}`}>{label}</button>
          ))}
        </div>
        <button onClick={() => { cancelSpeech(); void speak('That is out of the ground! What a hit from the captain.', 'pbp', 'excited', true).then((r) => (r === 'done' ? speak('A superb shot, and the crowd loves it.', 'colour', 'proud', true) : r)) }} className="h-8 cursor-pointer rounded-lg bg-white/10 text-[13px] font-bold text-slate-100 hover:bg-white/20">Hear a sample</button>
        <details className="group">
          <summary className="cursor-pointer list-none text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200">Choose voices <span className="ml-1 text-slate-500 transition group-open:rotate-90">›</span></summary>
          <div className="mt-2 space-y-1.5">
            {englishVoices.length === 0 && <p className="text-[11px] text-slate-400">No English voices were found on this device. On Android: Settings, then Languages, then Text-to-speech output, to add one.</p>}
            {VOICE_ROLES.map((role: VoiceRole) => {
              const auto = assignVoices(englishVoices, {})[role].voice
              return (
                <label key={role} className="flex items-center justify-between gap-2 text-[12px] font-semibold text-slate-200">
                  <span className="w-24 shrink-0">{{ host: 'Host', exp1: 'Expert 1', exp2: 'Expert 2', pbp: 'Commentator', colour: 'Co-commentator' }[role]}</span>
                  <select value={voiceNames[role] ?? ''} onChange={(e) => setVoiceName(role, e.target.value || null)} className="min-w-0 flex-1 cursor-pointer rounded bg-slate-700 px-1.5 py-1 text-[12px] text-white">
                    <option value="">Automatic{auto ? ` (${auto.name})` : ''}</option>
                    {englishVoices.map((v) => <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}
                  </select>
                </label>
              )
            })}
            <p className="text-[11px] leading-snug text-slate-400">On Android, Chrome's "Google" voices usually sound best.</p>
          </div>
        </details>
      </Fold>}

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

      {showBat && <Fold title="Aim your shot" hint="optional" badge={match.shotAim[batSide] ? 'AIMED' : null}>
        <ShotPad value={match.shotAim[batSide]} onChange={(v) => act({ t: 'shot', side: batSide, v })} />
        <label className="flex cursor-pointer items-center gap-1.5 text-[12px] font-semibold text-slate-200">
          <input type="checkbox" className="h-3.5 w-3.5 cursor-pointer accent-indigo-500" checked={swipeOn} onChange={(e) => setSwipeAim(e.target.checked)} />
          Drag across the field to aim (a short drag keeps it on the ground, a long one lifts it)
        </label>
      </Fold>}

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
                <span className="text-[10px] leading-tight text-slate-400">{id === 'safe' ? 'fewer wickets' : id === 'aggressive' ? 'more wickets' : 'balanced'}</span>
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
                  <span className="block truncate text-[11px] text-slate-400">{p.bowling?.type} · {oversText(line?.legalBalls ?? 0)} ov{line ? ` · ${line.wickets}/${line.runs}` : ''}</span>
                </span>
                {on && <span className="rounded bg-red-500 px-1 py-px text-[10px] font-extrabold text-white">NEXT</span>}
              </button>
            )
          })}
        </div>
      </Section>}

      {showBowl && <Fold title="Line, length and pace" hint="optional" badge={match.deliveryAim[bowlSide] ? 'AIMED' : null}>
        <DeliveryPad value={match.deliveryAim[bowlSide]} onChange={(v) => act({ t: 'delivery', side: bowlSide, v })} paceLabels={bowlerNow && /spin|break|googly|chinaman|orthodox|leg|off/i.test(match.player(bowlerNow).bowling?.type ?? '') ? ['Quicker', 'Normal', 'Flighted'] : ['Fast', 'Medium', 'Slower ball']} />
      </Fold>}

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
                    <TeamLogo team={s.team} size={24} /><span className="min-w-0 truncate">{s.team.name} forfeits</span>
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
