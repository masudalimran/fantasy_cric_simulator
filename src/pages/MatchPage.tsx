import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { CoinToss } from '../components/match/CoinToss'
import { Fx, type FxEvent } from '../components/match/Fx'
import { Commentary, type Tab } from '../components/match/Commentary'
import { ControlsSheet } from '../components/match/ControlsSheet'
import type { AutoStops } from '../components/match/ControlDeck'
import { MobileNowPlaying, NowPlaying } from '../components/match/NowPlaying'
import { MobileScoreboard, Scoreboard } from '../components/match/Scoreboard'
import { MobileDock } from '../components/match/MobileDock'
import { MomentOverlay } from '../components/match/MomentOverlay'
import { haptic, useIsLandscapePhone, useIsMobile } from '../hooks'
import { getAnimPrefs, setManualPlay, useManualPlay, useSwipeAim } from '../prefs'
import { useDetails } from '../components/season/Details'
import { ClickAvatar, PlayerCardProvider } from '../components/match/PlayerCard'
import { overall } from '../data/builders'
import { average, bowlAverage, collect, economy, strikeRate as seasonSR } from '../season/stats'
import { MatchSummary } from '../components/match/MatchSummary'
import { useCoachGate } from '../components/season/CoachGate'
import { ManualControls } from '../components/match/ManualControls'
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
import { hasEarlierUnplayed, mustPlayFirst, myNextFixture, playEarlierMatches, seasonComplete, simUntil as simSeasonUntil, summarizeMatch } from '../season/results'
import { ATTR_LABEL, sessionTeam } from '../season/progression'
import { cpuSelections, formTable, type NewsItem } from '../season/selection'
import { matchKey, selectSeason, useStore, useTeams, type LiveMatch } from '../store/useStore'
import { Delta, PlayerAvatar, ROLE_LABEL } from '../components/ui'
import { TeamLogo } from '../components/season/Details'
import { competitionName, matchHref, useBaseTeamMap, useTeamMap } from '../components/season/shared'
import { formatDate } from '../season/dates'
import { BeforeYoursSheet, matchesBefore } from '../components/season/BeforeYours'
import { TipBanner } from '../components/TipBanner'
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
  const match = useMemo(() => buildFromLive(live), [live.id, live.tossChoice, live.squadVersion])
  const liveAct = useStore((s) => s.liveAct)
  const setLivePhase = useStore((s) => s.setLivePhase)
  const setTossChoice = useStore((s) => s.setTossChoice)
  const setTossed = useStore((s) => s.setTossed)
  const setLiveSquad = useStore((s) => s.setLiveSquad)
  const ensureStartXI = useStore((s) => s.ensureStartXI)
  useEffect(() => { if (!live.startXI) ensureStartXI() }, [live.startXI, ensureStartXI])
  const updateSeasonForSquad = useStore((s) => s.updateSeason)
  const discardLive = useStore((s) => s.discardLive)
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
  const swipeOn = useSwipeAim()
  const gate = useCoachGate() // your coach needs an instruction before the next match
  const manual = useManualPlay() // play every ball from the controls: no auto-play anywhere
  const [breakPopup, setBreakPopup] = useState(false) // the innings summary card (it does not start anything)
  const seenInnings = useRef(match.current.index)
  const inningsNow = match.current.index
  useEffect(() => {
    if (inningsNow > seenInnings.current && !match.isOver) { setBreakOpen(true); setBreakPopup(true); setAuto(0); setControlsOpen(false) } // the next innings starts when you say so
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
  const manualRef = useRef(false) // play manually with a side of your own to control
  const holdRef = useRef(false) // the screen is holding on the finished first innings
  const autoRef = useRef(auto)
  autoRef.current = auto
  const fixtureId = live.fixtureId

  // A calendar fixture: save the result when the match ends (unless it was already played).
  const season = useStore(selectSeason)
  const [beforeOpen, setBeforeOpen] = useState(false)
  const updateSeasonNow = useStore((s) => s.updateSeason)
  const allBaseTeams = useBaseTeamMap()
  const teamMap = useTeamMap()
  const recordMatch = useStore((s) => s.recordMatch)
  const fixture = fixtureId ? season?.fixtures.find((f) => f.id === fixtureId) : undefined
  const alreadyPlayed = live.replay
  const navigate = useNavigate()
  const finished = match.isOver
  const mobile = useIsMobile()
  const landscape = useIsLandscapePhone()
  // Before the toss you can set your own XI: in a career only your team, in a friendly both sides.
  const editableSides: [boolean, boolean] = live.myTeamId ? [match.mySide === 0, match.mySide === 1] : [true, true]
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

  // Big moments (a wicket, a fifty, a batsman or bowler being introduced) wait their turn: one on the field at a time.
  const queue = useRef<Moment[]>([])
  const current = useRef<Moment | null>(null)
  const busyUntil = useRef(0)
  const startNextMoment = useCallback(() => {
    window.clearTimeout(momentTimer.current)
    const m = queue.current.shift() ?? null
    current.current = m
    setMoment(m)
    if (!m) { busyUntil.current = 0; return }
    // With "pause on wickets" ticked the dismissal stays up until you resume, play the next ball or click it.
    if (m.kind === 'wicket' && stopsRef.current.wickets) { busyUntil.current = Infinity; return }
    const total = m.delay + m.ms + (queue.current.length ? 0 : 350) // no pause when another moment follows straight away
    busyUntil.current = Date.now() + total
    momentTimer.current = window.setTimeout(startNextMoment, total)
  }, [])
  const enqueueMoment = useCallback((m: Moment) => {
    queue.current.push(m)
    if (!current.current) startNextMoment()
  }, [startNextMoment])
  /** Close what's showing; the next one in line (if any) takes its place. */
  const dismissMoment = useCallback(() => startNextMoment(), [startNextMoment])
  /** Drop everything: the next delivery is what matters now. */
  const clearMoments = useCallback(() => { queue.current = []; startNextMoment() }, [startNextMoment])

  // First time a batsman faces or a bowler bowls in this match: a few seconds of who he is.
  const seasonStats = useMemo(() => (fixture && season ? collect(season) : null), [fixture, season])
  const seen = useRef<Set<string> | null>(null)
  if (seen.current === null) {
    const s = new Set<string>()
    for (const i of match.innings) {
      for (const b of i.batters) if (b.balls > 0 || b.dismissal) s.add(`bat:${b.id}`)
      for (const [id, l] of i.bowlers) if (l.legalBalls > 0) s.add(`bowl:${id}`)
    }
    seen.current = s
  }
  const introSeq = useRef(1_000_000)
  const enqueueIntros = useCallback(() => {
    if (match.isOver) return
    const inn = match.current
    const sp = autoRef.current
    const quick = sp > 0 && !stopsRef.current.wickets // auto-play that never pauses: don't hold things up
    const ms = (sp === 4 ? 7000 : sp === 2 ? 9000 : 12000) / (quick ? 2 : 1) // long enough to read in full; a click moves on sooner
    const mk = (kind: 'batsman' | 'bowler', id: string): Moment => {
      const p = match.player(id)
      const team = (kind === 'batsman' ? match.battingSide() : match.bowlingSide()).team
      const t = (label: string, value: string | number) => ({ label, value: String(value) })
      let tiles: { label: string; value: string }[]
      let lines: string[]
      if (kind === 'batsman') {
        const s = seasonStats?.bat.get(id)
        lines = [`${ROLE_LABEL[p.role]} · ${p.hand === 'L' ? 'left' : 'right'}-hand`, s ? `This season: ${s.runs} runs in ${s.innings} innings` : fixture ? 'No runs yet this season' : 'Ratings']
        tiles = s
          ? [t('Bat apps', s.batApps + 1), t('Runs', s.runs), t('Average', average(s) === null ? '-' : average(s)!.toFixed(1)), t('Strike rate', seasonSR(s) === null ? '-' : seasonSR(s)!.toFixed(0)), t('Best', `${s.high}${s.highNotOut ? '*' : ''}`), t('50s / 100s', `${s.fifties}/${s.hundreds}`)]
          : [t('Technique', p.batting.technique), t('Power', p.batting.power), t('Temperament', p.batting.temperament), t('Running', p.batting.running)]
      } else {
        const s = seasonStats?.bowl.get(id)
        const w = p.bowling
        lines = [`${w?.type ?? ''} bowler`, s ? `This season: ${s.wickets} wickets in ${s.matches} matches` : fixture ? 'No wickets yet this season' : 'Ratings']
        tiles = s
          ? [t('Bowl apps', s.bowlApps + 1), t('Wickets', s.wickets), t('Economy', economy(s) === null ? '-' : economy(s)!.toFixed(2)), t('Average', bowlAverage(s) === null ? '-' : bowlAverage(s)!.toFixed(1)), t('Best', `${s.bestW}/${s.bestR}`), t('5-wicket hauls', s.fiveW)]
          : [t('Accuracy', w?.accuracy ?? 0), t('Variation', w?.variation ?? 0), t('Stamina', w?.stamina ?? 0)]
      }
      // a player who joined this year gets a different introduction: where he came from, and what he cost
      const move = fixture ? [...(season?.market?.log ?? [])].reverse().find((t) => t.playerId === id && t.to === team.id) : undefined
      if (move) {
        const was = move.from ? teamMap.get(move.from)?.name : null
        lines = [`${move.kind === 'sign' ? 'Signed from the unsigned pool' : `Bought from ${was ?? 'another team'}`} for ${move.fee} ${move.fee === 1 ? 'coin' : 'coins'}`, ...lines.slice(1)]
      }
      return { key: introSeq.current++, kind, player: p, team, title: move ? (kind === 'batsman' ? 'NEW SIGNING AT THE CREASE' : 'NEW SIGNING INTO THE ATTACK') : kind === 'batsman' ? 'AT THE CREASE' : 'INTO THE ATTACK', lines, tiles, rating: overall(p), delay: 150, ms }
    }
    const striker = inn.batters.find((b) => b.id === inn.strikerId)
    if (striker && striker.balls === 0 && !seen.current!.has(`bat:${striker.id}`)) { seen.current!.add(`bat:${striker.id}`); enqueueMoment(mk('batsman', striker.id)) }
    const bowlerId = inn.bowlerId
    if (bowlerId && (inn.bowlers.get(bowlerId)?.legalBalls ?? 0) === 0 && !seen.current!.has(`bowl:${bowlerId}`)) { seen.current!.add(`bowl:${bowlerId}`); enqueueMoment(mk('bowler', bowlerId)) }
  }, [match, seasonStats, fixture, enqueueMoment])

  const announceEvents = useCallback(
    (events: BallEvent[]) => {
      force()
      // Sound for the last delivery (or the final result). The crowd "awws" at wickets and roars at boundaries.
      const lastEv = events[events.length - 1]
      if (match.isOver) {
        // the celebration (or defeat) screen has its own sound
      } else if (lastEv && events.length <= 12) {
        if (lastEv.wicket) haptic([40, 50, 40])
        else if (lastEv.boundary === 6) haptic([20, 30, 20])
        else if (lastEv.boundary === 4) haptic(18)
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
        clearMoments()
        setWinOpen(true)
        return
      }
      if (!events.length || events.length > 12) return
      // a no-ball: the next delivery is a free hit, so say so
      if (lastEv?.extraType === 'noball' && getAnimPrefs().freeHit) {
        const cur = match.current
        const spd = autoRef.current
        const bat = match.battingSide(cur)
        const bowl = match.bowlingSide(cur)
        const batsmanP = match.player(cur.strikerId)
        const bowlerP = match.player(lastEv.bowlerId)
        enqueueMoment({ key: lastEv.seq + 0.75, kind: 'freehit', player: bowlerP, team: bowl.team, title: 'FREE HIT!', lines: [], delay: spd === 4 ? 150 : spd === 2 ? 250 : 450, ms: spd === 4 ? 1400 : spd === 2 ? 1900 : 2700, freeHit: { bowler: bowlerP, bowlTeam: bowl.team, batsman: batsmanP, batTeam: bat.team, rate: spd === 4 ? 0.55 : spd === 2 ? 0.75 : 1 } })
      }
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
        const show = (m: Moment) => enqueueMoment(m)
        // a six gets a short screen of its own: the ball leaving the ground and how far it went
        if (notable.boundary === 6 && notable.distance && !notable.wicket && getAnimPrefs().boundary) {
          const hitter = match.player(notable.strikerId)
          const earlier = Math.max(0, ...inn.log.filter((e) => e.seq < notable.seq && e.strikerId === notable.strikerId && e.boundary === 6).map((e) => e.distance ?? 0), seasonStats?.bat.get(notable.strikerId)?.longSix ?? 0)
          const rate6 = sp === 4 ? 0.5 : sp === 2 ? 0.7 : 1
          show({ key: notable.seq + 0.25, kind: 'six', player: hitter, team, title: 'SIX!', lines: [], delay: Math.round(delay * 0.7), ms: Math.round(3300 * rate6), six: { batsman: hitter, team, distance: notable.distance, rate: rate6, longest: earlier > 0 && notable.distance > earlier } })
        }
        if (battingMilestone && outLine) {
          show({ key: notable.seq, kind: 'milestone', player: match.player(outLine.id), team, title: tagLabel[battingMilestone], big: battingMilestone !== 'fifty', delay, ms,
            lines: [`${outLine.runs} off ${outLine.balls} balls`, `SR ${strikeRate(outLine.runs, outLine.balls)} · ${outLine.fours}x4 · ${outLine.sixes}x6`] })
        } else if (notable.wicket && outLine) {
          // first a screen of its own showing how the wicket happened, then the batsman's moment
          const w = notable.wicket
          const bowlSideNow = match.sides[1 - match.innings[notable.innings].battingSide]
          const fielderP = w.fielderId ? match.player(w.fielderId) : null
          const bowlerP = match.player(notable.bowlerId)
          const rate = sp === 4 ? 0.5 : sp === 2 ? 0.7 : 1
          const wantReplay = getAnimPrefs().wicket
          if (wantReplay) show({
            key: notable.seq + 0.5, kind: 'replay', player: match.player(outLine.id), team, title: 'WICKET REPLAY', lines: [], delay: Math.round(delay * 0.6), ms: Math.round(4300 * rate),
            replay: { kind: w.kind, batsman: match.player(outLine.id), bowler: bowlerP, fielder: w.kind === 'caught and bowled' ? bowlerP : fielderP, batTeam: team, bowlTeam: bowlSideNow.team, rate, score: `${outLine.runs} (${outLine.balls})` },
          })
          show({ key: notable.seq, kind: 'wicket', player: match.player(outLine.id), team, title: 'OUT!', duck: outLine.runs === 0, delay: wantReplay ? 0 : delay, ms, // straight after the replay, no gap
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
    [match, showFx, showNote, enqueueMoment, clearMoments],
  )
  // between the innings the next innings' introductions wait too (this is true from the very render the innings ends)
  const holdNow = !match.isOver && (breakOpen || match.current.index > seenInnings.current)
  const breakRef = useRef(false)
  breakRef.current = holdNow
  const announce = useCallback(
    (events: BallEvent[]) => {
      announceEvents(events)
      if (!match.isOver && events.length <= 12 && !breakRef.current) enqueueIntros() // whoever has just come on gets introduced
    },
    [match, announceEvents, enqueueIntros],
  )
  // The openers and the first bowler are introduced as play begins; the batsman and bowler of the chase, once the break is over.
  useEffect(() => { if (phase === 'play' && !holdNow) enqueueIntros() }, [phase, holdNow, enqueueIntros])
  // Play manually: auto-play stops and the controls take the lower panel; switching it off brings the auto-play options back
  useEffect(() => { if (manual) { setAuto(0); setTab('controls'); setControlsOpen(false) } else setTab((t) => (t === 'controls' ? 'scorecard' : t)) }, [manual])

  /** Every player action goes through here: do it, save it (so the match can be resumed), then react to it. */
  const act = useCallback(
    (a: Action) => {
      if (holdRef.current && ['ball', 'over', 'overs', 'wicket', 'innings', 'match', 'intent', 'bowler', 'style', 'shot', 'delivery'].includes(a.t)) return // nothing is played until Next innings is pressed
      if (a.t === 'forfeit') sfx.sadTrombone()
      else if (a.t !== 'ball') sfx.tick()
      if (a.t !== 'forfeit') clearMoments() // the next delivery takes over from any big moment
      const events = applyAction(match, a)
      liveAct(a)
      announce(events)
    },
    [match, liveAct, announce, clearMoments],
  )

  // Starting auto-play again closes a dismissal that was being held on screen.
  const wasAuto = useRef(auto)
  useEffect(() => {
    if (auto && !wasAuto.current) dismissMoment()
    wasAuto.current = auto
  }, [auto, dismissMoment])

  // Auto-play: one ball at a time at the chosen speed, but linger on the moments that matter
  // (wickets, boundaries, milestones) so the celebration, banner and sound have time to land.
  useEffect(() => {
    if (!auto || phase !== 'play' || match.isOver) return
    let timer = 0
    const step = () => {
      // wait while a wicket, milestone or introduction is on screen
      if (holdRef.current) { setAuto(0); return } // between innings nothing plays by itself
      const wait = busyUntil.current - Date.now()
      if (wait > 0) { timer = window.setTimeout(step, Math.min(wait, 500)); return }
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
  useEffect(() => () => { window.clearTimeout(fxTimer.current); window.clearTimeout(noteTimer.current); window.clearTimeout(motmTimer.current) }, []) // (the moment timer is left to finish: it only walks the queue)

  // Keyboard: Space = next ball, O = finish the over, P = pause or resume auto-play.
  useEffect(() => {
    if (phase !== 'play') return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (e.metaKey || e.ctrlKey || e.altKey || ['INPUT', 'SELECT', 'TEXTAREA'].includes(t.tagName) || match.isOver) return
      if (e.code === 'Space' && holdRef.current) { e.preventDefault(); setBreakOpen(false) }
      else if (e.code === 'Space' && manualRef.current) e.preventDefault() // manual play: choosing the aim is what plays the ball
      else if (e.code === 'Space') { e.preventDefault(); if (t.tagName === 'BUTTON') t.blur(); act({ t: 'ball' }) }
      else if (e.key === 'o' || e.key === 'O') act({ t: 'over' })
      else if ((e.key === 'p' || e.key === 'P') && !manual) setAuto((a) => (a === 0 ? 1 : 0))
      else if (e.key === 'c' || e.key === 'C') setControlsOpen((o) => !o)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, match, act, manual])

  if (phase === 'toss') return <CoinToss sides={match.sides} toss={match.toss} mySide={match.mySide} tossed={!!live.tossed} startXI={live.startXI} onTossed={setTossed} editable={editableSides} careerSquad={!!live.myTeamId} onSaveSquad={(side, order, cap, keep) => { setLiveSquad(side, order, cap, keep); if (live.myTeamId && match.mySide === side) updateSeasonForSquad((s) => ({ ...s, lineup: { order, captainId: cap, keeperId: keep } })) /* your lineup is kept for the rest of the career */ }} news={live.news} mustChoose={!live.tossChoice && !(live.myTeamId && match.mySide === null) && (match.mySide === null || match.mySide === match.toss.winnerSide)} onChoose={setTossChoice} onCancel={() => { navigate(fixture ? `${paths.session(fixture.date.slice(0, 7))}?day=${fixture.date}` : paths.play); window.setTimeout(discardLive, 0) /* after we've left, or this page would start the match again */ }} onStart={() => { setPhase('play'); setLivePhase('play') }} />

  // between the innings the screen stays on the first innings until you press Next innings
  const holding = holdNow
  holdRef.current = holding
  match.hold = holding ? 0 : null
  const inn = match.shown
  const batSide = match.battingSide(inn)
  // lining up a shot or a delivery: only for the side(s) a person is running, never for the computer's
  const batIdx = inn.battingSide
  const watching = !!live.myTeamId && match.mySide === null
  const userBats = !watching && !match.isOver && !holding && (match.mySide === null || match.mySide === batIdx)
  const userBowls = !watching && !match.isOver && !holding && (match.mySide === null || match.mySide === 1 - batIdx)
  const controlsNode = manual && !holding ? <ManualControls match={match} act={act} userBats={userBats} userBowls={userBowls} setManual={setManualPlay} /> : undefined
  manualRef.current = manual && (userBats || userBowls)
  const aimProps = {
    aimShot: userBats ? match.shotAim[batIdx] : null,
    aimDelivery: userBowls ? match.deliveryAim[(1 - batIdx) as 0 | 1] : null,
    onSwipe: swipeOn && userBats ? (a: { angle: number; loft: boolean }) => { haptic(8); act({ t: 'shot', side: batIdx, v: a }); if (manual) act({ t: 'ball' }) } : undefined,
  }
  const bowlSide = match.bowlingSide(inn)
  const last = match.events[match.events.length - 1] ?? null
  const lastHere = last && last.innings === inn.index ? last : null
  // a free hit: the ball about to be bowled ('next') or the one just bowled, whose outcome is on the field ('ball')
  const freeHitState: 'next' | 'ball' | null = match.isOver ? null : inn.freeHit ? 'next' : lastHere?.freeHit ? 'ball' : null
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

  // After a career match: skip the other teams' matches and go straight to the toss of your next one
  const nextMine = season ? myNextFixture(season) : null
  const nextLabel = !fixture ? null : nextMine ? 'Play my next match' : season && seasonComplete(season) ? 'See my season review' : null
  const goNext = () => gate(() => {
    if (season && matchesBefore(season).length > 0) { setBeforeOpen(true); return } // show the matches that come first

    const s = selectSeason(useStore.getState())
    if (!s) return navigate(paths.session())
    const mine = myNextFixture(s)
    if (!mine) return navigate(seasonComplete(s) ? paths.review : paths.session())
    const r = simSeasonUntil(s, mine.date, allBaseTeams)
    updateSeasonNow(() => r.season)
    navigate(matchHref(r.season, mine))
  })
  const resultCard = match.isOver && match.result ? (
<motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl border border-amber-400/60 bg-gradient-to-r from-amber-500/20 to-fuchsia-500/10 p-5 text-center">
          <div className="font-display text-4xl tracking-wide text-amber-300">{match.result.text}</div>
          {pom && (
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-sm text-slate-100">
              Man of the Match: <ClickAvatar player={match.player(pom.id)} team={match.sides[pom.side].team} size={30} /> <b>{match.player(pom.id).name}</b>
              <span className="text-slate-300">({pom.line})</span>
            </div>
          )}
          {(() => {
            // how this match moved your players' ratings (it is recorded when the match ends)
            const mine = season?.myTeamId ? teamMap.get(season.myTeamId) : undefined
            const log = fixture && !alreadyPlayed ? season?.changes?.[fixture.id] : undefined
            const rows = mine && log ? mine.players.filter((p) => log[p.id]).map((p) => ({ p, d: log[p.id] })) : []
            if (!mine || rows.length === 0) return null
            return (
              <div className="mx-auto mt-4 max-w-2xl rounded-xl border border-line bg-black/20 p-3 text-left">
                <div className="mb-1.5 text-[11px] font-extrabold uppercase tracking-widest text-sky-300">Rating changes from this match</div>
                <div className="flex flex-wrap gap-x-5 gap-y-1.5">
                  {rows.map(({ p, d }) => (
                    <span key={p.id} className="flex items-center gap-1.5 text-sm" title={Object.entries(d.a).map(([k, n]) => `${ATTR_LABEL[k as keyof typeof ATTR_LABEL]} ${(n as number) > 0 ? '+' : ''}${n}`).join(', ')}>
                      <PlayerAvatar profile player={p} team={mine} size={22} />
                      <span className="font-semibold text-white">{p.name}</span>
                      {d.o !== 0 ? <Delta n={d.o} /> : <span className="text-xs text-slate-400">{Object.entries(d.a).map(([k, n]) => `${ATTR_LABEL[k as keyof typeof ATTR_LABEL]} ${(n as number) > 0 ? '+' : ''}${n}`).join(', ')}</span>}
                    </span>
                  ))}
                </div>
              </div>
            )
          })()}
          {fixture && (
            <Link to={paths.session(season?.today.slice(0, 7))} className="mt-4 inline-flex w-full max-w-md items-center justify-center rounded-full border-2 border-slate-300/60 bg-white/10 px-6 py-3 text-lg font-bold text-white hover:bg-white/20">Go to the calendar</Link>
          )}
          {nextLabel && (
            <button onClick={goNext} className="cta-pulse cta-pulse-gold mt-3 w-full max-w-md rounded-full bg-amber-400 px-6 py-3.5 font-display text-2xl leading-none tracking-wide text-black active:bg-amber-300 hover:bg-amber-300">{nextLabel}</button>
          )}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {/* A session match is final: no rematch, no new match, just back to the career. */}
            {!fixture && <button className={btn} onClick={() => navigate(paths.match(match.sides[0].team.id, match.sides[1].team.id, match.format, randomSeed()))}>Rematch</button>}
            <button className={`${btn} border-amber-400/70 text-amber-200`} onClick={() => setMotmOpen(true)}>Man of the Match</button>
            <button className={btn} onClick={() => setWinOpen(true)}>Celebrate again</button>
            <button className={btn} onClick={() => setSummaryOpen(true)}>Match summary</button>
            {fixture
              ? null
              : <Link to={paths.play} className={btn}>New match</Link>}
          </div>
        </motion.div>
  ) : null

  const leave = () => navigate(fixture && match.isOver ? paths.session(season?.today.slice(0, 7)) : fixture ? `${paths.session(fixture.date.slice(0, 7))}?day=${fixture.date}` : paths.play)

  // the same overlays serve the phone and the desktop layout
  const overlays = (
    <>
      <Fx fx={fx} />
      <AnimatePresence>{beforeOpen && <BeforeYoursSheet onClose={() => setBeforeOpen(false)} />}</AnimatePresence>
      {!match.isOver && <TipBanner id="match" title="Playing the match" lift={96} left>Press the glowing <b>NEXT BALL</b> to play one ball. Use the double arrow to let it play by itself. Tap any face to see that player.</TipBanner>}
      <AnimatePresence>{summaryOpen && match.isOver && <MatchSummary match={match} onClose={() => setSummaryOpen(false)} />}</AnimatePresence>
      <AnimatePresence>{holding && breakPopup && <InningsBreak match={match} onClose={() => setBreakPopup(false)} />}</AnimatePresence>
      <ControlsSheet match={match} act={act} auto={auto} setAuto={setAuto} open={controlsOpen && !finished} setOpen={setControlsOpen} mySide={match.mySide} spectating={!!live.myTeamId && match.mySide === null} stops={stops} setStops={setStops} hideDock={mobile} holdLabel={holding ? 'Next innings' : undefined} onHold={() => setBreakOpen(false)} manual={manual} setManual={setManualPlay} />
      <AnimatePresence>{winOpen && <WinCelebration match={match} mySide={match.mySide} final={finalName} onContinue={() => { setWinOpen(false); if (awards) { window.clearTimeout(motmTimer.current); motmTimer.current = window.setTimeout(() => setMotmOpen(true), 250) } }} />}</AnimatePresence>
      <AnimatePresence>{motmOpen && awards && <MotmOverlay match={match} awards={awards} onClose={() => setMotmOpen(false)} onScorecard={() => setSummaryOpen(true)} />}</AnimatePresence>
    </>
  )

  if (mobile && landscape) {
    // a phone held sideways: the field on the left, everything else beside it
    return (
      <PlayerCardProvider match={match} career={!!live.fixtureId}>
        {overlays}
        <div className="fixed inset-0 z-30 flex bg-ink" data-scroll-lock style={{ paddingLeft: 'var(--sal)', paddingRight: 'var(--sar)' }}>
          <div className="flex min-w-0 flex-[1.3] flex-col">
            <MobileScoreboard match={match} you={match.mySide} difficulty={match.difficulty} onBack={leave} backLabel={fixture ? 'Back to the calendar' : 'Back to Play'} />
            {match.isOver ? <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">{resultCard}</div> : holding ? <div className="grid min-h-0 flex-1 place-items-center p-4 text-center text-sm text-slate-300"><span><b className="block font-display text-3xl tracking-wide text-white">Innings break</b>Look the innings over, then press Next innings.</span></div> : <div className="relative flex min-h-0 flex-1 items-center justify-center p-1.5">
              <div className="w-full" style={{ maxWidth: 'calc((100dvh - 96px) * 1.6)' }}>
                <Stage
                  event={lastHere} overEvents={overEvents} striker={striker} nonStriker={nonStriker} bowler={bowler}
                  battingTeam={batSide.team} bowlingTeam={bowlSide.team} fielders={placeFielders(bowlSide.xi, bowler.id)} note={note} freeHit={freeHitState} {...aimProps}
                />
              </div>
              <AnimatePresence>{moment && <MomentOverlay key={moment.key} moment={moment} onDismiss={dismissMoment} />}</AnimatePresence>
            </div>}
          </div>
          <div className="flex min-w-0 flex-1 flex-col border-l border-line" style={{ paddingTop: 'var(--sat)' }}>
            {!match.isOver && !holding && <MobileNowPlaying match={match} displayOver={displayOver} />}
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-2">
              {!match.isOver && resultCard}
              <Commentary match={match} tab={tab} setTab={setTab} controls={controlsNode} />
            </div>
            {!finished && (!manual || holding) && <MobileDock holdLabel={holding ? 'NEXT INNINGS' : undefined} onBall={() => (holding ? setBreakOpen(false) : act({ t: 'ball' }))} auto={auto} setAuto={setAuto} onControls={() => setControlsOpen(true)} over={finished} />}
          </div>
        </div>
      </PlayerCardProvider>
    )
  }

  if (mobile) {
    return (
      <PlayerCardProvider match={match} career={!!live.fixtureId}>
        {overlays}
        <div className="fixed inset-0 z-30 flex flex-col bg-ink" data-scroll-lock>
          <MobileScoreboard match={match} you={match.mySide} difficulty={match.difficulty} onBack={leave} backLabel={fixture ? 'Back to the calendar' : 'Back to Play'} />
          {!match.isOver && !holding && <div className="relative shrink-0">
            <div className="px-2 pb-1 pt-2">
              <Stage
                event={lastHere} overEvents={overEvents} striker={striker} nonStriker={nonStriker} bowler={bowler}
                battingTeam={batSide.team} bowlingTeam={bowlSide.team} fielders={placeFielders(bowlSide.xi, bowler.id)} note={note} freeHit={freeHitState} {...aimProps}
              />
            </div>
            <MobileNowPlaying match={match} displayOver={displayOver} />
            <AnimatePresence>{moment && <MomentOverlay key={moment.key} moment={moment} onDismiss={dismissMoment} />}</AnimatePresence>
          </div>}
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-2 py-2">
            {resultCard}
            <Commentary match={match} tab={tab} setTab={setTab} controls={controlsNode} />
          </div>
          {!finished && (!manual || holding) && <MobileDock holdLabel={holding ? 'NEXT INNINGS' : undefined} onBall={() => (holding ? setBreakOpen(false) : act({ t: 'ball' }))} auto={auto} setAuto={setAuto} onControls={() => setControlsOpen(true)} over={finished} />}
        </div>
      </PlayerCardProvider>
    )
  }

  return (
    <PlayerCardProvider match={match} career={!!live.fixtureId}>
    <div className="space-y-4">
      {overlays}
      <Scoreboard match={match} you={match.mySide} difficulty={match.difficulty} />

      {fixture && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-panel px-4 py-2 text-sm text-slate-200">
          <span>{(() => { const c = season?.competitions.find((x) => x.id === fixture.competitionId); return c ? competitionName(c, teamMap) : '' })()} · {fixture.stage}{alreadyPlayed && <span className="ml-2 font-semibold text-amber-300">Already played. This replay doesn't change the record.</span>}</span>
          <Link to={`${paths.session(fixture.date.slice(0, 7))}?day=${fixture.date}`} className="font-semibold text-indigo-300 hover:underline">‹ Back to the calendar</Link>
        </div>
      )}

      {inningsBreak && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-indigo-400/50 bg-indigo-500/15 p-3 text-center text-sm font-semibold text-indigo-100">
          Innings break. {batSide.team.name} need <b>{inn.target}</b> to win{inn.target ? ` (${(inn.target / cfg.overs).toFixed(2)} an over)` : ''}.
        </motion.div>
      )}

      {resultCard}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        {/* The field and the live mini-scorecard stay pinned in view while the rest of the page scrolls. */}
        {holding ? (
          <div className="rounded-2xl border border-line bg-panel p-8 text-center text-slate-300 xl:sticky xl:top-3 xl:self-start"><b className="block font-display text-4xl tracking-wide text-white">Innings break</b>Look the innings over in the scorecard, then press <b className="text-white">Next innings</b>.</div>
        ) : (
        <div className="space-y-3 xl:sticky xl:top-3 xl:self-start">
          <div className="mx-auto w-full" style={{ maxWidth: 'max(460px, calc((100vh - 490px) * 1.6))' }}>
            <Stage
              event={lastHere} overEvents={overEvents} striker={striker} nonStriker={nonStriker} bowler={bowler}
              battingTeam={batSide.team} bowlingTeam={bowlSide.team} fielders={placeFielders(bowlSide.xi, bowler.id)} note={note} freeHit={freeHitState} {...aimProps} moment={moment} onDismissMoment={dismissMoment}
            />
          </div>
          <NowPlaying match={match} displayOver={displayOver} />
        </div>
        )}
        <div className="space-y-4">
          <Commentary match={match} tab={tab} setTab={setTab} controls={controlsNode} />
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
        <TeamLogo team={live.teamA} size={56} />
        <span className="font-display text-3xl text-slate-500">VS</span>
        <TeamLogo team={live.teamB} size={56} />
      </div>
      <p className="mt-3 text-slate-200"><b>{live.teamA.name}</b> <span className="text-slate-400">({live.teamA.series})</span> v <b>{live.teamB.name}</b> <span className="text-slate-400">({live.teamB.series})</span></p>
      <p className="text-xs text-slate-500">{live.format.toUpperCase()} · {live.fixtureId ? 'a career match, its result counts when it finishes' : 'a friendly from the Play page'}</p>
      <p className="text-sm text-slate-400">{m.sides[inn.battingSide].team.name} are {inn.runs}/{inn.wickets} after {Math.floor(inn.legalBalls / 6)}.{inn.legalBalls % 6} overs{inn.index === 1 ? ' in the chase' : ''}.</p>
      <div className="mt-6 flex flex-col gap-2">
        <button onClick={() => navigate(live.url)} className="rounded-xl bg-emerald-500 px-5 py-3 text-base font-bold text-black hover:bg-emerald-400">Resume that match</button>
        {/* a career match can't be thrown away once the coin has been flipped: finish it, or forfeit it from inside */}
        {live.fixtureId && (live.tossed || live.phase === 'play')
          ? <p className="rounded-xl border border-line px-4 py-3 text-xs text-slate-400">This career match can't be abandoned once the toss is done. Finish it, or forfeit from the match controls.</p>
          : <button onClick={onDiscard} className="rounded-xl border-2 border-red-500/70 px-5 py-3 text-sm font-bold text-red-200 hover:bg-red-500/15">Discard it and start {wanted}</button>}
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
  const sessionMarket = useStore((s) => selectSeason(s)?.market)
  // Matches from the session are played with the players' current ratings and your session lineup; friendlies use the team as it is.
  const teams = useMemo(() => (query.get('fx') ? baseTeams.map((t) => sessionTeam(t, { shifts: sessionShifts, lineup: sessionLineup, myTeamId: sessionMine, market: sessionMarket })) : baseTeams), [baseTeams, sessionShifts, sessionLineup, sessionMine, sessionMarket, query])
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
    if (!a0 || !b0 || !season || !fixture || !season.myTeamId) return { a: a0, b: b0, news: [] as NewsItem[] }
    const [pa, pb] = cpuSelections(season, fixture, [a0, b0], season.myTeamId, formTable(season, new Map(teams.map((t) => [t.id, t])))) 
    return { a: pa.team, b: pb.team, news: [...pa.news, ...pb.news] }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a0, b0, fxId, season?.results, season?.myTeamId])
  const { a, b } = picked
  const teamMapOf = (id: string | null) => (id ? teams.find((t) => t.id === id)?.name : undefined)
  const valid = (format === 't20' || format === 'odi') && !!a && !!b && a.id !== b.id
  const key = matchKey(format, aId, bId, Number(seed) || 1)
  const ready = live?.key === key
  const blocked = !ready && !!live && !live.finished // another match is still being played
  // A career match that already has a result is final: it can be looked at, never played again.
  const fixtureNow = fxId && season ? season.fixtures.find((f) => f.id === fxId) : undefined
  // Every match dated before this one is played first (the computer plays them out) so the season goes on in order.
  const catchUp = !!fixtureNow && !!season && !season.results[fixtureNow.id] && !ready && hasEarlierUnplayed(season, fixtureNow.date)
  const alreadyDone = !!fxId && !!season?.results[fxId] && !(ready && live && !live.replay)
  const details = useDetails()
  const updateSeason = useStore((s) => s.updateSeason)
  const leagueTeams = useBaseTeamMap()
  // Matches go in order: you can't open a later one while a match of yours before it is still waiting.
  const waitFor = (() => {
    const fx = fxId && season ? season.fixtures.find((f) => f.id === fxId) : undefined
    return fx && season && !season.results[fx.id] && !ready ? mustPlayFirst(season, fx) : null
  })()

  // Opening a match (from Play, the session, or a link) makes it the live one, unless another is mid-way.
  useEffect(() => {
    // (if we're already on our way out of this page, e.g. after cancelling, don't start anything)
    if (valid && !ready && !blocked && !alreadyDone && !waitFor && !catchUp && location.pathname.startsWith('/match/')) startLive({ format: format as MatchFormat, teamA: a as Team, teamB: b as Team, seed: Number(seed) || 1, fixtureId: query.get('fx') ?? undefined, news: picked.news, url: location.pathname + location.search })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valid, ready, blocked, key, catchUp])
  useEffect(() => {
    if (catchUp && !waitFor && fixtureNow) updateSeason((s) => playEarlierMatches(s, fixtureNow.date, leagueTeams))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catchUp, waitFor])

  if (!valid) {
    return (
      <div className="rounded-2xl border border-dashed border-line p-12 text-center text-slate-400">
        That match can't be set up. <Link to={paths.play} className="text-indigo-300 hover:underline">Pick two teams</Link>
      </div>
    )
  }
  if (catchUp && !waitFor) return <div className="mx-auto max-w-xl rounded-3xl border border-line bg-panel p-8 text-center text-slate-300"><div className="font-display text-3xl tracking-wide text-white">Playing the earlier matches…</div><p className="mt-1 text-sm">Every match before this one is played first.</p></div>
  if (waitFor && season) {
    const [h, w] = [teamMapOf(waitFor.homeId), teamMapOf(waitFor.awayId)]
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-amber-400/50 bg-panel p-8 text-center">
        <div className="font-display text-4xl tracking-wide text-amber-300">Not yet</div>
        <p className="mt-2 text-sm text-slate-300">Matches are played in order. Your match on <b className="text-white">{formatDate(waitFor.date)}</b>{h && w ? ` (${h} v ${w})` : ''} comes first.</p>
        <div className="mt-6 flex flex-col gap-2">
          <Link to={matchHref(season, waitFor)} className="rounded-xl bg-amber-400 px-5 py-3 text-base font-bold text-black hover:bg-amber-300">Play that match</Link>
          <Link to={paths.session()} className="rounded-xl border border-line px-5 py-3 text-sm font-bold text-slate-200 hover:border-slate-400">Back to the career</Link>
        </div>
      </div>
    )
  }
  if (alreadyDone) {
    const fx = season?.fixtures.find((f) => f.id === fxId)
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-line bg-panel p-8 text-center">
        <div className="font-display text-4xl tracking-wide text-amber-300">This match has been played</div>
        <p className="mt-2 text-sm text-slate-300">{a?.name} v {b?.name}. A career match is final: the result stands and it can't be played again.</p>
        <div className="mt-6 flex flex-col gap-2">
          {fxId && <button onClick={() => details?.openMatch(fxId)} className="rounded-xl bg-sky-400 px-5 py-3 text-base font-bold text-black hover:bg-sky-300">See the match summary and scorecards</button>}
          <Link to={fx ? `${paths.session(fx.date.slice(0, 7))}?day=${fx.date}` : paths.session()} className="rounded-xl border border-line px-5 py-3 text-sm font-bold text-slate-200 hover:border-slate-400">Back to the career</Link>
        </div>
      </div>
    )
  }
  if (blocked && live) return <InProgress live={live} onDiscard={discardLive} wanted={`${a?.name} v ${b?.name}`} />
  if (!ready || !live) return null
  return <LiveMatch key={live.id} live={live} />
}
