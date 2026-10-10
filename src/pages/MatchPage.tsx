import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { CoinToss } from '../components/match/CoinToss'
import { Fx, type FxEvent } from '../components/match/Fx'
import { Commentary, type Tab } from '../components/match/Commentary'
import { ControlsSheet } from '../components/match/ControlsSheet'
import type { AutoStops } from '../components/match/ControlDeck'
import { NowPlaying } from '../components/match/NowPlaying'
import { Scoreboard } from '../components/match/Scoreboard'
import { ClickAvatar, PlayerCardProvider } from '../components/match/PlayerCard'
import { MatchSummary } from '../components/match/MatchSummary'
import { InningsBreak } from '../components/match/InningsBreak'
import { MotmOverlay } from '../components/match/MotmOverlay'
import { WinCelebration } from '../components/match/WinCelebration'
import type { Moment } from '../components/match/MomentOverlay'
import { Stage, placeFielders, type StageNote } from '../components/match/Stage'
import { dismissalText, strikeRate } from '../components/match/format'
import { sfx } from '../audio/sfx'
import { tagLabel } from '../engine/commentary'
import { Match } from '../engine/match'
import { applyAction, type Action } from '../engine/replay'
import { computeAwards } from '../engine/awards'
import { randomSeed } from '../engine/rng'
import { FORMATS, type BallEvent } from '../engine/types'
import { paths } from '../routes'
import { summarizeMatch } from '../season/results'
import { sessionTeam } from '../season/progression'
import { cpuSelections, formTable } from '../season/selection'
import { matchKey, selectSeason, useStore, useTeams, type LiveMatch } from '../store/useStore'
import { TeamCrest } from '../components/ui'
import { competitionName, useTeamMap } from '../components/season/shared'
import type { MatchFormat, Team } from '../types'

/** How long auto-play waits before the next ball. Big moments hold for a few seconds (shorter at higher speeds). */
function delayAfter(ev: BallEvent | undefined, speed: 1 | 2 | 4): number {
  const base = 1300 / speed
  if (!ev) return base
  const hold =
    ev.tags.includes('hat-trick') || ev.tags.includes('five-wickets') ? 4800
    : ev.tags.some((t) => t === 'fifty' || t === 'hundred' || t === '150' || t === '200') ? 4200
    : ev.wicket ? 3800
    : ev.boundary === 6 ? 3200
    : ev.boundary === 4 ? 2400
    : ev.extraType === 'noball' ? 1900
    : 0
  return Math.max(base, hold / (speed === 1 ? 1 : speed === 2 ? 1.4 : 1.8))
}

const STOPS_KEY = 'fcs.autostops'
const DEFAULT_STOPS: AutoStops = { wickets: true, boundaries: false, innings: true }
function loadStops(): AutoStops {
  try { return { ...DEFAULT_STOPS, ...JSON.parse(localStorage.getItem(STOPS_KEY) ?? '{}') } } catch { return DEFAULT_STOPS }
}

function buildFromLive(live: LiveMatch): Match {
  const m = new Match({ teamA: live.teamA, teamB: live.teamB, format: live.format, seed: live.seed, tossDecision: live.tossChoice, career: live.myTeamId ? { myTeamId: live.myTeamId, difficulty: live.difficulty ?? 'normal' } : undefined })
  for (const a of live.actions) applyAction(m, a) // replays everything the player did, so we land exactly where they left off
  return m
}

function LiveMatch({ live }: { live: LiveMatch }) {
  const [, force] = useReducer((x: number) => x + 1, 0)
  // Built once per match from its saved actions; later actions are applied live and logged.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const match = useMemo(() => buildFromLive(live), [live.id, live.tossChoice])
  const liveAct = useStore((s) => s.liveAct)
  const setLivePhase = useStore((s) => s.setLivePhase)
  const setTossChoice = useStore((s) => s.setTossChoice)
  const finishLive = useStore((s) => s.finishLive)
  // `?skip` opens straight into play (handy for links and testing)
  const [phase, setPhase] = useState<'toss' | 'play'>(() => (live.phase === 'play' || new URLSearchParams(location.search).has('skip') ? 'play' : 'toss'))
  const [fx, setFx] = useState<FxEvent | null>(null)
  const [auto, setAuto] = useState<0 | 1 | 2 | 4>(0)
  // What makes auto-play stop by itself. Anything left unticked just plays on.
  const [stops, setStopsState] = useState<AutoStops>(loadStops)
  const setStops = (s: AutoStops) => { setStopsState(s); try { localStorage.setItem(STOPS_KEY, JSON.stringify(s)) } catch { /* private mode */ } }
  const stopsRef = useRef(stops)
  // The innings break card: shown when the first innings ends during play (not when you reopen a match that is already in the chase).
  const [breakOpen, setBreakOpen] = useState(false)
  const seenInnings = useRef(match.current.index)
  const inningsNow = match.current.index
  useEffect(() => {
    if (inningsNow > seenInnings.current && !match.isOver) setBreakOpen(true)
    seenInnings.current = inningsNow
  }, [inningsNow, match])
  stopsRef.current = stops
  const [tab, setTab] = useState<Tab>('scorecard')
  const [controlsOpen, setControlsOpen] = useState(false)
  const fxTimer = useRef<number | undefined>(undefined)
  const noteTimer = useRef<number | undefined>(undefined)
  const motmTimer = useRef<number | undefined>(undefined)
  const [note, setNote] = useState<StageNote | null>(null)
  const [motmOpen, setMotmOpen] = useState(false)
  const [winOpen, setWinOpen] = useState(false)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [moment, setMoment] = useState<Moment | null>(null)
  const momentTimer = useRef<number | undefined>(undefined)
  const autoRef = useRef(auto)
  autoRef.current = auto
  const fixtureId = live.fixtureId

  // A calendar fixture: save the result when the match ends (unless it was already played).
  const season = useStore(selectSeason)
  const teamMap = useTeamMap()
  const recordMatch = useStore((s) => s.recordMatch)
  const fixture = fixtureId ? season?.fixtures.find((f) => f.id === fixtureId) : undefined
  const alreadyPlayed = live.replay
  const navigate = useNavigate()
  const finished = match.isOver
  // (hooks must all come before the early return for the toss screen below)
  const awards = useMemo(() => (finished ? computeAwards(match) : null), [finished, match])
  useEffect(() => {
    if (!finished) return
    finishLive() // this match is over, so it no longer counts as "in progress"
    if (fixture && !alreadyPlayed) recordMatch(summarizeMatch(match, fixture, match.seed), fixture.date)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished])

  const showFx = useCallback((next: FxEvent) => {
    setFx(next)
    window.clearTimeout(fxTimer.current)
    fxTimer.current = window.setTimeout(() => setFx(null), next.kind === 'win' ? 3200 : 1300)
  }, [])

  const showNote = useCallback((n: StageNote) => {
    setNote(n)
    window.clearTimeout(noteTimer.current)
    noteTimer.current = window.setTimeout(() => setNote(null), 3000)
  }, [])

  const announce = useCallback(
    (events: BallEvent[]) => {
      force()
      // Sound for the last delivery (or the final result). The crowd "awws" at wickets and roars at boundaries.
      const lastEv = events[events.length - 1]
      if (match.isOver) {
        // the celebration (or defeat) screen has its own sound
      } else if (lastEv && events.length <= 12) {
        if (lastEv.tags.includes('hat-trick')) sfx.hatTrick()
        else if (lastEv.tags.some((t) => t === 'fifty' || t === 'hundred' || t === '150' || t === '200' || t === 'five-wickets')) sfx.milestone()
        else if (lastEv.wicket) sfx.wicket()
        else if (lastEv.boundary === 6) sfx.six()
        else if (lastEv.boundary === 4) sfx.four()
        else if (lastEv.extraType === 'noball') sfx.noBall()
        else sfx.hit(lastEv.runsBat >= 2 ? 0.55 : 0.25)
      }
      if (match.isOver) {
        // The match is over: the field has nothing left to show, so the whole screen becomes a celebration.
        setAuto(0)
        setMoment(null)
        setWinOpen(true)
        return
      }
      if (!events.length || events.length > 12) return
      const notable =
        events.find((e) => e.tags.some((t) => t === 'fifty' || t === 'hundred' || t === '150' || t === '200' || t === 'hat-trick' || t === 'five-wickets')) ??
        events.find((e) => e.wicket) ?? events.find((e) => e.boundary === 6) ?? events.find((e) => e.boundary === 4)
      if (!notable) return
      const team = match.sides[match.innings[notable.innings].battingSide].team
      const colors = [team.colors.primary, team.colors.secondary, '#ffffff']
      const milestone = notable.tags.find((t) => tagLabel[t] && t !== 'maiden' && t !== 'duck')
      {
        const inn = match.innings[notable.innings]
        const outLine = notable.wicket ? inn.batters.find((b) => b.id === notable.wicket!.playerId) : inn.batters.find((b) => b.id === notable.strikerId)
        const who = outLine ? match.player(outLine.id).name : ''
        const battingMilestone = notable.tags.find((t) => t === 'fifty' || t === 'hundred' || t === '150' || t === '200')
        // timings shrink with the auto-play speed so a celebration never outlasts the pause that makes room for it
        const sp = autoRef.current
        const delay = sp === 4 ? 350 : sp === 2 ? 500 : 800
        const ms = sp === 4 ? 1300 : sp === 2 ? 1800 : 2600
        const show = (m: Moment) => {
          setMoment(m)
          window.clearTimeout(momentTimer.current)
          // With "pause on wickets" ticked the dismissal stays up until you resume, play the next ball or click it.
          if (m.kind === 'wicket' && stopsRef.current.wickets) return
          momentTimer.current = window.setTimeout(() => setMoment(null), m.delay + m.ms + 350)
        }
        if (battingMilestone && outLine) {
          show({ key: notable.seq, kind: 'milestone', player: match.player(outLine.id), team, title: tagLabel[battingMilestone], big: battingMilestone !== 'fifty', delay, ms,
            lines: [`${outLine.runs} off ${outLine.balls} balls`, `SR ${strikeRate(outLine.runs, outLine.balls)} · ${outLine.fours}x4 · ${outLine.sixes}x6`] })
        } else if (notable.wicket && outLine) {
          show({ key: notable.seq, kind: 'wicket', player: match.player(outLine.id), team, title: 'OUT!', duck: outLine.runs === 0, delay, ms,
            lines: [dismissalText(match, outLine, inn), `${outLine.runs} (${outLine.balls}) · SR ${strikeRate(outLine.runs, outLine.balls)}`] })
        } else if (milestone && outLine) {
          showNote({ key: notable.seq, tone: 'milestone', title: tagLabel[milestone], sub: `${match.player(notable.bowlerId).name}` }) // hat-trick or a five-wicket haul
        }
        void who
      }
      if (milestone) showFx({ key: notable.seq, kind: 'milestone', text: milestone === 'hat-trick' || milestone === 'five-wickets' ? tagLabel[milestone] : '', colors })
      else if (notable.wicket) showFx({ key: notable.seq, kind: 'wicket', text: '', colors })
      else if (notable.boundary === 6) showFx({ key: notable.seq, kind: 'six', text: 'SIX!', colors })
      else showFx({ key: notable.seq, kind: 'four', text: 'FOUR!', colors })
    },
    [match, showFx, showNote],
  )

  /** Every player action goes through here: do it, save it (so the match can be resumed), then react to it. */
  const act = useCallback(
    (a: Action) => {
      if (a.t === 'forfeit') sfx.sadTrombone()
      else if (a.t !== 'ball') sfx.tick()
      if (a.t !== 'forfeit') { window.clearTimeout(momentTimer.current); setMoment(null) } // the next delivery takes over from any big moment
      const events = applyAction(match, a)
      liveAct(a)
      announce(events)
    },
    [match, liveAct, announce],
  )

  // Starting auto-play again closes a dismissal that was being held on screen.
  const wasAuto = useRef(auto)
  useEffect(() => {
    if (auto && !wasAuto.current) { window.clearTimeout(momentTimer.current); setMoment(null) }
    wasAuto.current = auto
  }, [auto])

  // Auto-play: one ball at a time at the chosen speed, but linger on the moments that matter
  // (wickets, boundaries, milestones) so the celebration, banner and sound have time to land.
  useEffect(() => {
    if (!auto || phase !== 'play' || match.isOver) return
    let timer = 0
    const step = () => {
      const innings = match.current.index
      act({ t: 'ball' })
      if (match.isOver) return
      // stop where the options say to (wicket, boundary, end of an innings)
      const ev = match.events[match.events.length - 1]
      const st = stopsRef.current
      if ((match.current.index !== innings && st.innings) || (ev?.wicket && st.wickets) || (ev?.boundary && st.boundaries)) { setAuto(0); return }
      timer = window.setTimeout(step, delayAfter(match.events[match.events.length - 1], auto))
    }
    timer = window.setTimeout(step, 1300 / auto)
    return () => window.clearTimeout(timer)
  }, [auto, phase, match, act])
  useEffect(() => () => { window.clearTimeout(fxTimer.current); window.clearTimeout(noteTimer.current); window.clearTimeout(motmTimer.current); window.clearTimeout(momentTimer.current) }, [])

  // Keyboard: Space = next ball, O = finish the over, P = pause or resume auto-play.
  useEffect(() => {
    if (phase !== 'play') return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (e.metaKey || e.ctrlKey || e.altKey || ['INPUT', 'SELECT', 'TEXTAREA'].includes(t.tagName) || match.isOver) return
      if (e.code === 'Space') { e.preventDefault(); if (t.tagName === 'BUTTON') t.blur(); act({ t: 'ball' }) }
      else if (e.key === 'o' || e.key === 'O') act({ t: 'over' })
      else if (e.key === 'p' || e.key === 'P') setAuto((a) => (a === 0 ? 1 : 0))
      else if (e.key === 'c' || e.key === 'C') setControlsOpen((o) => !o)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, match, act])

  if (phase === 'toss') return <CoinToss sides={match.sides} toss={match.toss} news={live.news} mustChoose={!live.tossChoice && !(live.myTeamId && match.mySide === null) && (match.mySide === null || match.mySide === match.toss.winnerSide)} onChoose={setTossChoice} onStart={() => { setPhase('play'); setLivePhase('play') }} />

  const inn = match.current
  const batSide = match.battingSide()
  const bowlSide = match.bowlingSide()
  const last = match.events[match.events.length - 1] ?? null
  const lastHere = last && last.innings === inn.index ? last : null
  const striker = match.player(inn.strikerId)
  const nonStriker = match.player(inn.nonStrikerId)
  const bowlerId = inn.bowlerId ?? inn.prevBowlerId ?? bowlSide.xi.find((p) => p.bowling)?.id ?? bowlSide.xi[0].id
  const bowler = match.player(bowlerId)
  const displayOver = inn.legalBalls % 6 === 0 && inn.legalBalls > 0 && inn.bowlerId !== null && !inn.log.some((e) => e.over === match.over) ? match.over - 1 : match.over
  const overEvents = inn.log.filter((e) => e.over === displayOver)
  const inningsBreak = inn.index === 1 && inn.legalBalls === 0 && !match.isOver
  const cfg = FORMATS[match.format]
  const pom = awards?.motm ?? null
  const finalName = fixture?.stage === 'Final' ? (() => { const c = season?.competitions.find((x) => x.id === fixture.competitionId); return c ? competitionName(c, teamMap) : undefined })() : undefined
  const btn = 'inline-flex min-h-10 items-center justify-center rounded-xl border border-line bg-panel-2 px-4 text-sm font-bold text-white transition hover:border-indigo-400'

  return (
    <PlayerCardProvider match={match}>
    <div className="space-y-4">
      <Fx fx={fx} />
      <AnimatePresence>{summaryOpen && match.isOver && <MatchSummary match={match} onClose={() => setSummaryOpen(false)} />}</AnimatePresence>
      <AnimatePresence>{breakOpen && !match.isOver && <InningsBreak match={match} waiting={!auto} onContinue={() => setBreakOpen(false)} />}</AnimatePresence>
      <ControlsSheet match={match} act={act} auto={auto} setAuto={setAuto} open={controlsOpen && !finished} setOpen={setControlsOpen} mySide={match.mySide} spectating={!!live.myTeamId && match.mySide === null} stops={stops} setStops={setStops} />
      <AnimatePresence>{winOpen && <WinCelebration match={match} mySide={match.mySide} final={finalName} onContinue={() => { setWinOpen(false); if (awards) { window.clearTimeout(motmTimer.current); motmTimer.current = window.setTimeout(() => setMotmOpen(true), 250) } }} />}</AnimatePresence>
      <AnimatePresence>{motmOpen && awards && <MotmOverlay match={match} awards={awards} onClose={() => setMotmOpen(false)} onScorecard={() => setSummaryOpen(true)} />}</AnimatePresence>
      <Scoreboard match={match} you={match.mySide} difficulty={match.difficulty} />

      {fixture && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-panel px-4 py-2 text-sm text-slate-200">
          <span>{(() => { const c = season?.competitions.find((x) => x.id === fixture.competitionId); return c ? competitionName(c, teamMap) : '' })()} · {fixture.stage}{alreadyPlayed && <span className="ml-2 font-semibold text-amber-300">Already played. This replay doesn't change the record.</span>}</span>
          <Link to={`${paths.session(fixture.date.slice(0, 7))}?day=${fixture.date}`} className="font-semibold text-indigo-300 hover:underline">Back to the session</Link>
        </div>
      )}

      {inningsBreak && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-indigo-400/50 bg-indigo-500/15 p-3 text-center text-sm font-semibold text-indigo-100">
          Innings break. {batSide.team.name} need <b>{inn.target}</b> to win{inn.target ? ` (${(inn.target / cfg.overs).toFixed(2)} an over)` : ''}.
        </motion.div>
      )}

      {match.isOver && match.result && (
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl border border-amber-400/60 bg-gradient-to-r from-amber-500/20 to-fuchsia-500/10 p-5 text-center">
          <div className="font-display text-4xl tracking-wide text-amber-300">{match.result.text}</div>
          {pom && (
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-sm text-slate-100">
              Man of the Match: <ClickAvatar player={match.player(pom.id)} team={match.sides[pom.side].team} size={30} /> <b>{match.player(pom.id).name}</b>
              <span className="text-slate-300">({pom.line})</span>
            </div>
          )}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {/* A session match is final: no rematch, no new match, just back to the session. */}
            {!fixture && <button className={btn} onClick={() => navigate(paths.match(match.sides[0].team.id, match.sides[1].team.id, match.format, randomSeed()))}>Rematch</button>}
            <button className={`${btn} border-amber-400/70 text-amber-200`} onClick={() => setMotmOpen(true)}>Man of the Match</button>
            <button className={btn} onClick={() => setWinOpen(true)}>Celebrate again</button>
            <button className={btn} onClick={() => setSummaryOpen(true)}>Match summary</button>
            {fixture
              ? <Link to={`${paths.session(fixture.date.slice(0, 7))}?day=${fixture.date}`} className={`${btn} border-emerald-400/70 text-emerald-200`}>Back to the session</Link>
              : <Link to={paths.play} className={btn}>New match</Link>}
          </div>
        </motion.div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        {/* The field and the live mini-scorecard stay pinned in view while the rest of the page scrolls. */}
        <div className="space-y-3 xl:sticky xl:top-3 xl:self-start">
          <div className="mx-auto w-full" style={{ maxWidth: 'max(460px, calc((100vh - 490px) * 1.6))' }}>
            <Stage
              event={lastHere} overEvents={overEvents} striker={striker} nonStriker={nonStriker} bowler={bowler}
              battingTeam={batSide.team} bowlingTeam={bowlSide.team} fielders={placeFielders(bowlSide.xi, bowler.id)} note={note} moment={moment} onDismissMoment={() => setMoment(null)}
            />
          </div>
          <NowPlaying match={match} displayOver={displayOver} />
        </div>
        <div className="space-y-4">
          <Commentary match={match} tab={tab} setTab={setTab} />
        </div>
      </div>
    </div>
    </PlayerCardProvider>
  )
}

/** Shown when you open a different match while one is still in progress. */
function InProgress({ live, onDiscard, wanted }: { live: LiveMatch; onDiscard: () => void; wanted: string }) {
  const navigate = useNavigate()
  const m = useMemo(() => buildFromLive(live), [live.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const inn = m.current
  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-amber-400/50 bg-panel p-8 text-center">
      <div className="font-display text-4xl tracking-wide text-amber-300">A match is already in progress</div>
      <div className="mt-5 flex items-center justify-center gap-5">
        <TeamCrest team={live.teamA} size={56} />
        <span className="font-display text-3xl text-slate-500">VS</span>
        <TeamCrest team={live.teamB} size={56} />
      </div>
      <p className="mt-3 text-slate-200"><b>{live.teamA.name}</b> <span className="text-slate-400">({live.teamA.series})</span> v <b>{live.teamB.name}</b> <span className="text-slate-400">({live.teamB.series})</span></p>
      <p className="text-xs text-slate-500">{live.format.toUpperCase()} · {live.fixtureId ? 'a session match, its result counts when it finishes' : 'a friendly from the Play page'}</p>
      <p className="text-sm text-slate-400">{m.sides[inn.battingSide].team.name} are {inn.runs}/{inn.wickets} after {Math.floor(inn.legalBalls / 6)}.{inn.legalBalls % 6} overs{inn.index === 1 ? ' in the chase' : ''}.</p>
      <div className="mt-6 flex flex-col gap-2">
        <button onClick={() => navigate(live.url)} className="rounded-xl bg-emerald-500 px-5 py-3 text-base font-bold text-black hover:bg-emerald-400">Resume that match</button>
        <button onClick={onDiscard} className="rounded-xl border-2 border-red-500/70 px-5 py-3 text-sm font-bold text-red-200 hover:bg-red-500/15">Discard it and start {wanted}</button>
      </div>
    </div>
  )
}

export function MatchPage() {
  const { format = 't20', pair = '', seed = '1' } = useParams()
  const [query] = useSearchParams()
  const baseTeams = useTeams()
  const sessionShifts = useStore((s) => selectSeason(s)?.shifts)
  const sessionLineup = useStore((s) => selectSeason(s)?.lineup)
  const sessionMine = useStore((s) => selectSeason(s)?.myTeamId ?? null)
  // Matches from the session are played with the players' current ratings and your session lineup; friendlies use the team as it is.
  const teams = useMemo(() => (query.get('fx') ? baseTeams.map((t) => sessionTeam(t, { shifts: sessionShifts, lineup: sessionLineup, myTeamId: sessionMine })) : baseTeams), [baseTeams, sessionShifts, sessionLineup, sessionMine, query])
  const live = useStore((s) => s.liveMatch)
  const startLive = useStore((s) => s.startLive)
  const discardLive = useStore((s) => s.discardLive)
  const [aId, bId] = pair.split('-vs-').map(decodeURIComponent)
  const season = useStore(selectSeason)
  const fxId = query.get('fx')
  const a0 = teams.find((t) => t.id === aId)
  const b0 = teams.find((t) => t.id === bId)
  // In a session the computer picks its own XI for the other team (form, injuries, batting order) and says what changed.
  const picked = useMemo(() => {
    const fixture = fxId ? season?.fixtures.find((f) => f.id === fxId) : undefined
    if (!a0 || !b0 || !season || !fixture || !season.myTeamId) return { a: a0, b: b0, news: [] as string[] }
    const [pa, pb] = cpuSelections(season, fixture, [a0, b0], season.myTeamId, formTable(season, new Map(teams.map((t) => [t.id, t])))) 
    return { a: pa.team, b: pb.team, news: [...pa.news.map((n) => `${a0.name}: ${n}`), ...pb.news.map((n) => `${b0.name}: ${n}`)] }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a0, b0, fxId, season?.results, season?.myTeamId])
  const { a, b } = picked
  const valid = (format === 't20' || format === 'odi') && !!a && !!b && a.id !== b.id
  const key = matchKey(format, aId, bId, Number(seed) || 1)
  const ready = live?.key === key
  const blocked = !ready && !!live && !live.finished // another match is still being played

  // Opening a match (from Play, the session, or a link) makes it the live one, unless another is mid-way.
  useEffect(() => {
    if (valid && !ready && !blocked) startLive({ format: format as MatchFormat, teamA: a as Team, teamB: b as Team, seed: Number(seed) || 1, fixtureId: query.get('fx') ?? undefined, news: picked.news, url: location.pathname + location.search })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valid, ready, blocked, key])

  if (!valid) {
    return (
      <div className="rounded-2xl border border-dashed border-line p-12 text-center text-slate-400">
        That match can't be set up. <Link to={paths.play} className="text-indigo-300 hover:underline">Pick two teams</Link>
      </div>
    )
  }
  if (blocked && live) return <InProgress live={live} onDiscard={discardLive} wanted={`${a?.name} v ${b?.name}`} />
  if (!ready || !live) return null
  return <LiveMatch key={live.id} live={live} />
}
