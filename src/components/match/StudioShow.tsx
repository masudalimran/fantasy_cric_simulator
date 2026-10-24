import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { sfx } from '../../audio/sfx'
import type { Match } from '../../engine/match'
import { eventAngle } from '../../engine/shots'
import { ballSpeed } from '../../engine/speed'
import { cancelSpeech, setCastGenders, setVoiceMode, speak, useVoiceMode, voiceSupported } from '../../audio/voice'
import { GRADE_COLOR, GRADE_LABEL } from '../../season/grade'
import { PresenterAvatar } from '../PresenterAvatar'
import { buildScript, type Beat, type Cast, type Clip, type Mood, type Persona, type ShowKind } from '../../season/studio'
import type { PlayerForm } from '../../season/stats'
import { PlayerAvatar } from '../ui'
import { FourScreen } from './EventScreens'
import { MilestoneScreen } from './MilestoneScreen'
import { SixReplay } from './SixReplay'
import { ManhattanScreen, ScoringScreen, WagonScreen, WormScreen } from './StatsScreens'
import { WicketReplay } from './WicketReplay'

const MOOD_EMOJI: Record<Mood, string> = { excited: '🔥', serious: '🧐', laugh: '😂', shocked: '😱', thoughtful: '🤔', proud: '👏', sarcastic: '😏', worried: '😬' }
const MOOD_COLOR: Record<Mood, string> = { excited: '#fb923c', serious: '#94a3b8', laugh: '#facc15', shocked: '#f472b6', thoughtful: '#60a5fa', proud: '#34d399', sarcastic: '#c084fc', worried: '#f87171' }
const ROLE: Record<Persona, string> = { host: 'Host', analyst: 'The Analyst', firebrand: 'The Firebrand', veteran: 'The Veteran', jester: 'The Joker', tactician: 'The Tactician' }
const CLIP_TAG: Record<Clip['kind'], string> = { card: 'Studio graphics', worm: 'The worm', manhattan: 'Over by over', scoring: 'How the runs came', wagon: 'Wagon wheel', six: 'Instant replay · six', four: 'Instant replay · four', wicket: 'Instant replay · wicket', milestone: 'Milestone moment', stat: 'Player stats' }

/** How a person on the desk moves while he talks, by mood. */
const MOVE: Record<Mood, object> = {
  excited: { y: [0, -9, 0, -6, 0], transition: { duration: 0.8, repeat: Infinity } },
  shocked: { x: [0, -5, 5, -4, 4, 0], scale: [1, 1.08, 1.08, 1.08, 1.08, 1], transition: { duration: 0.5, repeat: Infinity, repeatDelay: 0.6 } },
  laugh: { rotate: [-4, 4, -3, 3, 0], y: [0, -3, 0, -3, 0], transition: { duration: 0.7, repeat: Infinity } },
  proud: { scale: [1, 1.05, 1], transition: { duration: 1.4, repeat: Infinity } },
  serious: { y: [0, -1, 0], transition: { duration: 2, repeat: Infinity } },
  thoughtful: { rotate: [0, -3, 0, 2, 0], transition: { duration: 2.4, repeat: Infinity } },
  sarcastic: { rotate: [0, 5, 5, 0], x: [0, 3, 3, 0], transition: { duration: 1.6, repeat: Infinity } },
  worried: { x: [0, -2, 2, -2, 0], transition: { duration: 0.6, repeat: Infinity, repeatDelay: 0.8 } },
}

/** What is on the studio's big screen: a moment of the match, or a stats graphic, built from the match itself. */
function Wall({ clip, match }: { clip: Clip; match: Match }) {
  const side = (i: number) => match.sides[match.innings[Math.min(i, match.innings.length - 1)].battingSide].team
  const inn = (i: number) => match.innings[Math.min(i, match.innings.length - 1)]
  const ev = 'seq' in clip ? match.events.find((e) => e.seq === clip.seq) : undefined
  const evTeams = ev ? { bat: match.sides[match.innings[ev.innings].battingSide].team, bowl: match.sides[1 - match.innings[ev.innings].battingSide].team } : null
  switch (clip.kind) {
    case 'card':
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-[radial-gradient(ellipse_at_center,#1e3a8a,#070b14_75%)] px-4 pt-6 text-center">
          <div className="font-display text-4xl leading-none tracking-wider text-amber-300">{clip.title}</div>
          {clip.lines.filter(Boolean).slice(0, 6).map((l, i) => <div key={i} className={i === 0 ? 'text-base font-bold text-white' : 'text-xs text-slate-300'}>{l}</div>)}
        </div>
      )
    case 'worm': case 'manhattan': case 'scoring': case 'wagon': {
      const i = inn(clip.innings)
      const info = { team: side(clip.innings), log: i.log, other: clip.innings > 0 ? inn(clip.innings - 1).log : undefined, batsman: clip.kind === 'wagon' && clip.batsmanId ? match.player(clip.batsmanId) : undefined, title: '', rate: 1 }
      return clip.kind === 'worm' ? <WormScreen info={info} /> : clip.kind === 'manhattan' ? <ManhattanScreen info={info} /> : clip.kind === 'scoring' ? <ScoringScreen info={info} /> : <WagonScreen info={{ ...info, other: undefined }} />
    }
    case 'six':
      if (!ev || !evTeams) return null
      return <SixReplay info={{ batsman: match.player(ev.strikerId), team: evTeams.bat, distance: ev.distance ?? 80, rate: 1, fire: ev.freeHit }} />
    case 'four': {
      if (!ev || !evTeams) return null
      const xi = match.sides[1 - match.innings[ev.innings].battingSide].xi.filter((p) => p.id !== ev.bowlerId)
      const count = 1 + (ev.seq % 3)
      const chasers = xi.slice(ev.seq % Math.max(1, xi.length - count), (ev.seq % Math.max(1, xi.length - count)) + count).map((player) => ({ player, x: 110, y: 40 }))
      return <FourScreen info={{ batsman: match.player(ev.strikerId), batTeam: evTeams.bat, bowlTeam: evTeams.bowl, angle: eventAngle(ev), chasers, rate: 1, fire: ev.freeHit }} />
    }
    case 'wicket': {
      if (!ev || !evTeams || !ev.wicket) return null
      const out = match.innings[ev.innings].batters.find((b) => b.id === ev.wicket!.playerId)
      return <WicketReplay info={{ kind: ev.wicket.kind, batsman: match.player(ev.wicket.playerId), bowler: match.player(ev.bowlerId), fielder: ev.wicket.fielderId ? match.player(ev.wicket.fielderId) : null, batTeam: evTeams.bat, bowlTeam: evTeams.bowl, rate: 1, score: out ? `${out.runs} (${out.balls})` : '' }} />
    }
    case 'stat': {
      const p = match.player(clip.playerId)
      const team = clip.as === 'bat' ? side(clip.innings) : match.sides[1 - match.innings[Math.min(clip.innings, match.innings.length - 1)].battingSide].team
      const col = GRADE_COLOR[clip.grade]
      let big = '', small = '', fastest = ''
      if (clip.as === 'bat') {
        const b = inn(clip.innings).batters.find((x) => x.id === clip.playerId)
        if (b) { big = `${b.runs}${b.dismissal ? '' : '*'}`; small = `${b.balls} balls · ${b.fours}x4 · ${b.sixes}x6 · SR ${b.balls ? Math.round((b.runs / b.balls) * 100) : 0}` }
      } else {
        const l = inn(clip.innings).bowlers.get(clip.playerId)
        if (l) { big = `${l.wickets}/${l.runs}`; small = `${Math.floor(l.legalBalls / 6)}.${l.legalBalls % 6} ov · ${l.maidens} maidens · econ ${l.legalBalls ? ((l.runs / l.legalBalls) * 6).toFixed(1) : '0.0'}`; const mine = inn(clip.innings).log.filter((e) => e.bowlerId === clip.playerId); if (mine.length) { const top = Math.max(...mine.map((e) => ballSpeed(e, p))); fastest = `Fastest ${top} km/h` } }
      }
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-[radial-gradient(ellipse_at_center,#1e3a8a,#070b14_75%)] px-4 pt-6 text-center">
          <PlayerAvatar player={p} team={team} size={52} profile />
          <div className="text-sm font-bold text-white">{p.name}</div>
          <div className="font-display text-5xl leading-none text-white">{big}</div>
          <div className="text-xs text-slate-300">{small}</div>
          {fastest && <div className="text-[11px] font-bold text-sky-300">{fastest}</div>}
          <div className="mt-0.5 rounded-full px-3 py-0.5 text-[11px] font-extrabold uppercase tracking-widest text-black" style={{ background: col }}>{GRADE_LABEL[clip.grade]} {clip.as === 'bat' ? 'batting' : 'bowling'}</div>
        </div>
      )
    }
    case 'milestone': {
      const line = inn(clip.innings).batters.find((b) => b.id === clip.playerId)
      if (!line) return null
      const big = line.runs >= 100
      return <MilestoneScreen info={{ batsman: match.player(clip.playerId), partner: null, team: side(clip.innings), title: big ? 'CENTURY!' : 'FIFTY!', big, lines: [`${line.runs} off ${line.balls} balls`, `SR ${line.balls ? Math.round((line.runs / line.balls) * 100) : 0} · ${line.fours}x4 · ${line.sixes}x6`], rate: 1 }} />
    }
  }
}

/** One person at the desk: a portrait that comes forward and moves when he talks, and dims when he does not. */
function Anchor({ cast, active, mood, big }: { cast: Cast; active: boolean; mood: Mood; big?: boolean }) {
  const size = big ? 78 : 64
  const accent = cast.presenter.accent
  return (
    <motion.div className="relative flex w-1/3 flex-col items-center" animate={{ scale: active ? 1.12 : 0.92, opacity: active ? 1 : 0.55, y: active ? -6 : 0 }} transition={{ type: 'spring', stiffness: 220, damping: 20 }}>
      <motion.div animate={active ? (MOVE[mood] as never) : {}} className="rounded-full leading-[0]" style={{ boxShadow: active ? `0 0 0 3px ${accent}, 0 0 28px ${accent}aa` : `0 0 0 2px ${accent}66` }}>
        <PresenterAvatar presenter={cast.presenter} size={size} />
      </motion.div>
      <div className="relative z-10 -mt-2 w-[104%] overflow-hidden rounded-md border border-white/15 bg-black/80 px-1 py-0.5 text-center shadow-lg">
        <div className="truncate text-[11px] font-extrabold leading-tight text-white">{cast.presenter.name}</div>
        <div className="truncate text-[9px] font-bold uppercase leading-tight tracking-wider" style={{ color: accent }}>{ROLE[cast.persona]}</div>
      </div>
    </motion.div>
  )
}

/**
 * The studio show: a host and two experts at a desk, in front of a big screen that plays the moments they talk about. It runs between the
 * innings, at stumps in a Test and after the match. Tap to move on a line; Skip to leave.
 */
export function StudioShow({ match, kind, seed, extra, onDone }: { match: Match; kind: ShowKind; seed: number; extra?: { competition?: string; stage?: string; form?: (playerId: string) => PlayerForm | null }; onDone: () => void }) {
  const script = useMemo(() => buildScript(match, kind, seed, extra), [match, kind, seed, extra])
  const [stage, setStage] = useState<'intro' | 'show' | 'outro'>('intro')
  const [i, setI] = useState(0)
  const beat: Beat = script.beats[Math.min(i, script.beats.length - 1)]
  const introduced = useRef(new Set<number>())
  const [strap, setStrap] = useState<number | null>(null)
  // the clip on the wall stays until another one is asked for
  const clip = useMemo(() => { for (let k = Math.min(i, script.beats.length - 1); k >= 0; k--) if (script.beats[k].clip) return { clip: script.beats[k].clip as Clip, at: k }; return null }, [i, script])
  const finished = useRef(false)
  const done = useCallback(() => { if (finished.current) return; finished.current = true; cancelSpeech(); onDone() }, [onDone])
  // the voices: each line is spoken by the person who says it, and the show moves on when the line has been said
  const voiceMode = useVoiceMode()
  const talking = voiceMode !== 'off' && voiceSupported()
  const [voiceFailed, setVoiceFailed] = useState(false)
  const voiced = talking && !voiceFailed
  // a man speaks in a man's voice and a woman in a woman's: tell the voices who is on the desk
  useEffect(() => { setCastGenders({ host: 'f', exp1: 'f', exp2: 'f' }); return () => setCastGenders({}) }, [script])

  useEffect(() => { sfx.whoosh(); const t = window.setTimeout(() => { setStage('show'); sfx.applause(1.6) }, 2200); return () => window.clearTimeout(t) }, [])
  // a name strap the first time each person talks
  useEffect(() => {
    if (stage !== 'show') return
    if (!introduced.current.has(beat.who)) { introduced.current.add(beat.who); setStrap(beat.who); const t = window.setTimeout(() => setStrap(null), 2400); return () => window.clearTimeout(t) }
  }, [stage, i, beat.who])
  const next = useCallback(() => {
    if (stage !== 'show') return
    cancelSpeech()
    if (i >= script.beats.length - 1) { setStage('outro'); sfx.applause(2); window.setTimeout(done, 1800); return }
    setI((x) => x + 1)
  }, [stage, i, script.beats.length, done])
  // a line shows whole; it moves on by itself after a reading time (or, with the voices on, once it has been said), or the moment the screen is tapped
  useEffect(() => {
    if (stage !== 'show') return
    let alive = true
    let t = 0
    if (voiced) {
      void speak(beat.text, (['host', 'exp1', 'exp2'] as const)[beat.who], beat.mood).then((r) => {
        if (!alive) return
        if (r === 'done') t = window.setTimeout(next, 500)
        else if (r === 'failed') setVoiceFailed(true)
      })
      // (a safety net in case the speech engine stalls)
      const net = window.setTimeout(next, 6000 + beat.text.length * 130)
      return () => { alive = false; window.clearTimeout(t); window.clearTimeout(net) }
    }
    t = window.setTimeout(next, 3200 + beat.text.length * 55)
    return () => { alive = false; window.clearTimeout(t) }
  }, [stage, i, beat.text, beat.who, beat.mood, next, voiced])
  useEffect(() => () => cancelSpeech(), [])
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') done(); else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); next() } }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  })

  const speaker = script.cast[beat.who]
  const accent = speaker.presenter.accent
  const ticker = useMemo(() => {
    const scores = match.innings.map((x) => `${match.sides[x.battingSide].team.short} ${x.runs}/${x.wickets} (${Math.floor(x.legalBalls / 6)}.${x.legalBalls % 6})`).join('   ·   ')
    return `${scores}   ·   ${match.result?.text ?? script.title}   ·   ${extra?.competition ?? 'Fantasy Cric Sim'}   ·   `
  }, [match, script.title, extra?.competition])

  return (
    <motion.div data-studio data-scroll-lock onClick={next} className="fixed inset-0 z-[60] flex cursor-pointer flex-col overflow-hidden bg-[#04060d]" style={{ paddingTop: 'var(--sat)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} aria-label={script.title}>
      {/* the set: stage lights and a glossy floor */}
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 12%, #1e3a8a66, transparent 55%), radial-gradient(ellipse at 15% 70%, #7c3aed33, transparent 45%), radial-gradient(ellipse at 85% 70%, #0ea5e933, transparent 45%)' }} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[38%]" style={{ background: 'linear-gradient(180deg, transparent, #0b1226 40%, #070b18)' }} />

      {/* the show's own bar: logo, what show this is, and the live bug */}
      <div className="relative z-20 flex shrink-0 items-center gap-2 px-3 pb-1 pt-2">
        <div className="flex items-center gap-2 rounded-md bg-gradient-to-r from-amber-400 to-orange-500 px-2.5 py-1">
          <span className="font-display text-lg leading-none tracking-widest text-black">FCS</span>
          <span className="text-[10px] font-extrabold uppercase leading-none tracking-wider text-black/80">Studio</span>
        </div>
        <div className="min-w-0 flex-1 truncate text-[11px] font-extrabold uppercase tracking-widest text-slate-200">{script.title}</div>
        <span className="flex items-center gap-1 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />Live</span>
        {voiceSupported() && <button onClick={(e) => { e.stopPropagation(); setVoiceFailed(false); if (voiceMode === 'off') setVoiceMode('studio'); else setVoiceMode('off') }} aria-label={voiceMode === 'off' ? 'Turn the voices on' : 'Turn the voices off'} className="cursor-pointer rounded-full border border-white/20 px-2.5 py-1 text-sm active:bg-white/10">{voiceMode === 'off' ? '🔇' : '🔊'}</button>}
        <button onClick={(e) => { e.stopPropagation(); done() }} className="cursor-pointer rounded-full border border-white/20 px-3 py-1 text-xs font-bold text-slate-200 active:bg-white/10">Skip</button>
      </div>

      {/* the big screen behind the desk */}
      <div className="relative z-10 mx-3 mt-1 shrink-0 overflow-hidden rounded-xl border-2 border-sky-400/60 bg-black shadow-[0_0_40px_#38bdf855]" style={{ aspectRatio: '16 / 10', maxHeight: '40vh', margin: '4px auto 0', width: 'min(94%, 420px)' }}>
        <AnimatePresence mode="wait">
          {clip && stage === 'show' && (
            <motion.div key={`${clip.at}-${clip.clip.kind}`} className="absolute inset-0" initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <Wall clip={clip.clip} match={match} />
            </motion.div>
          )}
        </AnimatePresence>
        {/* a strip across the top hides the tags of the screens that play inside it and says what is on */}
        <div className="absolute inset-x-0 top-0 z-[60] flex h-7 items-center justify-between bg-black/95 px-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-sky-300">
          <span>{clip ? CLIP_TAG[clip.clip.kind] : 'Fantasy Cric Sim'}</span>
          <span className="text-slate-400">{script.title}</span>
        </div>
        {/* a name strap the first time somebody speaks */}
        <AnimatePresence>
          {strap !== null && stage === 'show' && (
            <motion.div key={`strap${strap}`} className="absolute bottom-2 left-2 z-[65] flex items-center overflow-hidden rounded bg-black/85 ring-1 ring-white/20" initial={{ x: -140, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -140, opacity: 0 }}>
              <span className="h-full w-1.5 self-stretch" style={{ background: script.cast[strap].presenter.accent }} />
              <span className="px-2 py-1 leading-tight"><span className="block text-xs font-extrabold text-white">{script.cast[strap].presenter.name}</span><span className="block text-[9px] font-bold uppercase tracking-wider text-slate-300">{ROLE[script.cast[strap].persona]}</span></span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* what is being said */}
      <div className="relative z-10 mx-auto mt-2 flex min-h-0 w-[min(94%,420px)] flex-1 items-center">
        <AnimatePresence mode="wait">
          {stage === 'show' && (
            <motion.div
              key={i}
              className="relative w-full cursor-pointer rounded-2xl border-2 bg-black/80 p-3 shadow-xl"
              style={{ borderColor: MOOD_COLOR[beat.mood], boxShadow: `0 0 24px ${MOOD_COLOR[beat.mood]}44` }}
              initial={{ opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8 }} transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            >
              <div className="mb-1 flex items-center gap-2">
                <span className="text-sm font-extrabold" style={{ color: accent }}>{first(speaker.presenter.name)}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{ROLE[speaker.persona]}</span>
                <motion.span className="ml-auto text-xl" animate={{ scale: [1, 1.25, 1] }} transition={{ duration: 0.9, repeat: Infinity }} aria-hidden>{MOOD_EMOJI[beat.mood]}</motion.span>
              </div>
              <p className="min-h-[3.6em] text-[15px] leading-snug text-white">{beat.text}</p>
              {/* the tail of the bubble points at whoever is talking */}
              <span className="absolute -bottom-2 h-3 w-3 rotate-45 border-b-2 border-r-2 bg-black" style={{ borderColor: MOOD_COLOR[beat.mood], left: beat.who === 0 ? '48%' : beat.who === 1 ? '16%' : '80%' }} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* the desk, with the host in the middle */}
      <div className="relative z-10 shrink-0 px-2 pb-1 pt-3">
        <div className="mx-auto flex w-[min(100%,440px)] items-end justify-center gap-1">
          <Anchor cast={script.cast[1]} active={stage === 'show' && beat.who === 1} mood={beat.mood} />
          <Anchor cast={script.cast[0]} active={stage === 'show' && beat.who === 0} mood={beat.mood} big />
          <Anchor cast={script.cast[2]} active={stage === 'show' && beat.who === 2} mood={beat.mood} />
        </div>
        <div className="mx-auto -mt-3 h-6 w-[min(100%,460px)] rounded-t-[28px] border-t-2 border-sky-300/50 bg-gradient-to-b from-[#1e293b] to-[#0b1226] shadow-[0_-8px_30px_#38bdf822]" />
      </div>

      {/* the ticker along the bottom */}
      <div className="relative z-20 shrink-0 overflow-hidden border-t border-white/10 bg-black/90 py-1" style={{ paddingBottom: 'calc(var(--sab) + 4px)' }}>
        <motion.div className="whitespace-nowrap text-xs font-bold uppercase tracking-wider text-amber-200" animate={{ x: ['0%', '-50%'] }} transition={{ duration: 26, repeat: Infinity, ease: 'linear' }}>{ticker}{ticker}{ticker}{ticker}</motion.div>
      </div>

      {/* the opening sting and the sign-off */}
      <AnimatePresence>
        {stage !== 'show' && (
          <motion.div key={stage} className="absolute inset-0 z-[70] grid place-items-center bg-[#04060d]" initial={{ opacity: stage === 'intro' ? 1 : 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.4 } }}>
            <motion.div className="pointer-events-none absolute left-1/2 top-1/2 h-[120vmax] w-[120vmax] -translate-x-1/2 -translate-y-1/2 opacity-25" style={{ background: 'repeating-conic-gradient(from 0deg, #fbbf2400 0deg 10deg, #fbbf24aa 10deg 20deg)', willChange: 'transform' }} animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: 'linear' }} />
            <div className="relative text-center">
              <motion.div initial={{ scale: 0.4, rotate: -8, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 12 }} className="mx-auto inline-block rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-2 font-display text-6xl leading-none tracking-widest text-black shadow-2xl">FCS</motion.div>
              <motion.div className="mt-3 font-display text-4xl leading-none tracking-wide text-white" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35 }}>{stage === 'intro' ? script.title : 'Thanks for watching'}</motion.div>
              <motion.div className="mt-2 text-sm font-bold uppercase tracking-[0.3em] text-sky-300" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>{stage === 'intro' ? (extra?.competition ?? 'Live from the studio') : 'See you next time'}</motion.div>
              {stage === 'intro' && (
                <motion.div className="mt-5 flex items-center justify-center gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
                  {script.cast.map((c) => <PresenterAvatar key={c.presenter.id} presenter={c.presenter} size={46} />)}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

const first = (name: string) => { const p = name.trim().split(/\s+/); return p.length > 2 && /^[A-Z]\.?$/.test(p[1]) ? p[p.length - 1] : p[0] ?? name }
