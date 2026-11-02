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
import { isSixScene, SIX_SCENE_TEXT } from '../components/match/sixScenes'
import { Highlights } from '../components/match/Highlights'
import { PHANTOM_CAST_SECONDS } from '../components/match/ReplayScreens'
import { TIRED_SECONDS } from '../components/match/EventScreens'
import { haptic, useIsLandscapePhone, useIsMobile } from '../hooks'
import { eventAngle } from '../engine/shots'
import { getAnimPrefs, getBroadcastView, setManualPlay, useManualPlay, useSwipeAim } from '../prefs'
import { useDetails } from '../components/season/Details'
import { ClickAvatar, PlayerCardProvider } from '../components/match/PlayerCard'
import { overall } from '../data/builders'
import { setStatsFormat } from '../statsFormat'
import { average, collect, duelBetween, economy, strikeRate as seasonSR } from '../season/stats'
import { MatchSummary } from '../components/match/MatchSummary'
import { useCoachGate } from '../components/season/CoachGate'
import { ManualControls } from '../components/match/ManualControls'
import { InningsBreak } from '../components/match/InningsBreak'
import { FollowOnPrompt, TestBreak } from '../components/match/TestBreak'
import { MotmOverlay } from '../components/match/MotmOverlay'
import { StudioShow } from '../components/match/StudioShow'
import { ambientCaption, type CaptionCtx, type CaptionKind } from '../season/captions'
import { boxChat } from '../season/studio'
import { isBigSix, moveFor } from '../data/moves'
import { BOOST_MULT, boostSummary } from '../season/boost'
import { callName } from '../components/match/format'
import { deliveryOf, deliveryScreen, isPoorLength, LENGTH_WORDS } from '../engine/delivery'
import { almostCaught } from '../components/match/almost'
import { nearMiss } from '../components/match/nearMiss'
import { batHitsBall, clipNow, contactAt, fielderWorld, planBall, sixReach } from '../components/match/broadcast'
import { ballSpeed } from '../engine/speed'
import { commentary } from '../engine/commentary'
import { catchCause, catchContact, fourContact, sixContact } from '../engine/contact'
import { shotText } from '../components/match/AimPads'
import { cheerVariantFor } from '../components/match/CheerScreen'
import { hugFocusOf, moonOutcome, spaceOutcome, SPACE_SIX_METRES, SHOW_SECONDS, type ShowKind, type StadiumShow } from '../components/match/stadiumShow'
import type { Cast } from '../components/match/StadiumCam'
import { pitchSpot, stumpsSpot } from '../engine/delivery'
import { trophyOf } from '../components/match/TrophyArt'
import { StadiumCam } from '../components/match/StadiumCam'
import { ceremonyScript, type CeremonyCtx } from '../components/match/ceremonyScript'
import { PRESENTERS } from '../data/presenters'
import { LineupWalkout, ShowScreen } from '../components/match/LineupWalkout'
import type { ReplayBase } from '../components/match/ReplayFrame'
import { ALMOST_CAST_SECONDS, EXTRA_CAST_SECONDS, FOUR_SECONDS, DELIVERY_CAST_SECONDS, MISS_CAST_SECONDS, NO_BALL_CAST_SECONDS, SIX_CAST_SECONDS, WICKET_CAST_SECONDS } from '../components/match/ReplayScreens'
import { wicketCard } from '../season/wicketCards'
import { CATCH_SECONDS } from '../components/match/CatchScreen'
import { matchBefore } from '../engine/asOf'
import { stadiumLook } from '../engine/stadium'
import { challengeTalk } from '../season/challenge'
import { challengeSeconds } from '../components/match/ChallengeScreen'
import { CHALLENGE_RESULT_SECONDS } from '../components/match/ChallengeResult'
import { RAIN_DELAY_SECONDS } from '../components/match/RainDelay'
import { wideCm, wideSide } from '../engine/wide'
import { askVoice, cancelSpeech, getVoiceConsent, getVoiceMode, speakLines, voiceBusy } from '../audio/voice'
import { liveLines } from '../season/liveVoice'
import { WinCelebration } from '../components/match/WinCelebration'
import type { Moment } from '../components/match/MomentOverlay'
import { Stage, endPoint, placeFielders, type StageNote } from '../components/match/Stage'
import { fieldPlan } from '../components/match/fieldSets'
import { describePitch, tossAdvice } from '../engine/pitchInfo'
import { socialPosts } from '../data/social'
import { MatchPreview } from '../components/match/MatchPreview'
import { BigMatchIntro } from '../components/match/LineupScreens'
import { WICKET_FX_SECONDS, type WicketFxInfo } from '../components/match/WicketScreens'
import { TournamentIntro } from '../components/match/TournamentIntro'
import { tournamentIntro } from '../season/tournamentIntro'
import { UpgradeScreen, type UpgradeRow } from '../components/season/NewsScreens'
import { campaignOf, upgradesFrom } from '../season/stories'
import { TournamentVictory, variantOf } from '../components/season/TournamentVictory'
import { markSeen } from '../tips'
import { formOf, headToHead } from '../season/preview'
import { dismissalText, strikeRate } from '../components/match/format'
import { crowdHush, crowdSwell, startCrowd, stopCrowd } from '../audio/crowd'
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
import { SquadProblemCard, squadProblem } from '../components/season/SquadProblem'
import { cpuSelections, formTable, type NewsItem } from '../season/selection'
import { matchKey, selectSeason, selectSession, useStore, useTeams, type LiveMatch } from '../store/useStore'
import { Delta, PlayerAvatar, ROLE_LABEL, bowlLabel } from '../components/ui'
import { TeamLogo } from '../components/season/Details'
import { competitionName, matchHref, usePlayerIndex, useBaseTeamMap, useTeamMap } from '../components/season/shared'
import { addDays, formatDate } from '../season/dates'
import { partnershipAt, partnershipMark, ambientLights, ambientOver, ambientPick, cheersAfter, cooledDown, overstepCm, markShown, pickReel, recentHighlight, reelCandidates, runOutGap, trackFor, bowledFor, catchFor, handsFor, stumpGap } from '../season/moments'
import { toEvent } from '../season/reel'
import type { AmbientInfo } from '../components/match/AmbientScreens'
import { keyPlayers } from '../season/preview'
import { seasonBests, superOverOutcome } from '../season/stories'
import { winChanceSeries } from '../engine/analysis'
import { teamStrength } from '../data/builders'
import type { TimeoutChannel, TimeoutReel } from '../components/match/TimeoutScreens'
import { BeforeYoursSheet, matchesBefore } from '../components/season/BeforeYours'
import { TipBanner } from '../components/TipBanner'
import type { MatchFormat, Player, Team } from '../types'

/** How long auto-play waits before the next ball. Big moments hold for a few seconds (shorter at higher speeds). */
// the screens that settle whether the batsman is out, so the result waits for them
const DECIDING = new Set(['runout', 'review', 'challenge', 'challengewon'])

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

/** The first name of a player, for the words the commentary box puts on screen. */
const first = (name: string) => name.trim().split(/\s+/)[0] ?? name
/** Strategic timeouts: after this many completed overs of each innings. */
const TIMEOUT_AFTER: Record<MatchFormat, number[]> = { t20: [7, 14], odi: [12, 30], test: [] }

const STOPS_KEY = 'fcs.autostops'
const DEFAULT_STOPS: AutoStops = { wickets: true, milestones: true, boundaries: false, innings: true }
function loadStops(): AutoStops {
  try { return { ...DEFAULT_STOPS, ...JSON.parse(localStorage.getItem(STOPS_KEY) ?? '{}') } } catch { return DEFAULT_STOPS }
}

function buildFromLive(live: LiveMatch): Match {
  const m = new Match({ teamA: live.teamA, teamB: live.teamB, format: live.format, seed: live.seed, tossDecision: live.tossChoice, career: live.myTeamId ? { myTeamId: live.myTeamId, difficulty: live.difficulty ?? 'normal', boost: live.boost ? BOOST_MULT : undefined } : undefined })
  for (const a of live.actions) applyAction(m, a) // replays everything the player did, so we land exactly where they left off
  return m
}

function LiveMatch({ live }: { live: LiveMatch }) {
  const [, force] = useReducer((x: number) => x + 1, 0)
  // Built once per match from its saved actions; later actions are applied live and logged.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const match = useMemo(() => buildFromLive(live), [live.id, live.tossChoice, live.squadVersion, live.boost])
  const liveAct = useStore((s) => s.liveAct)
  const setLivePhase = useStore((s) => s.setLivePhase)
  const setTossChoice = useStore((s) => s.setTossChoice)
  const setTossed = useStore((s) => s.setTossed)
  const setLiveBoost = useStore((s) => s.setLiveBoost)
  const session = useStore(selectSession)
  const setLiveSquad = useStore((s) => s.setLiveSquad)
  const ensureStartXI = useStore((s) => s.ensureStartXI)
  useEffect(() => { if (!live.startXI) ensureStartXI() }, [live.startXI, ensureStartXI])
  const updateSeasonForSquad = useStore((s) => s.updateSeason)
  const discardLive = useStore((s) => s.discardLive)
  const finishLive = useStore((s) => s.finishLive)
  // `?skip` opens straight into play (handy for links and testing)
  const [bigDone, setBigDone] = useState(false) // the semi-final or final intro has played
  const [tourneyDone, setTourneyDone] = useState(false) // the tournament's trophy screen has played
  const [phase, setPhase] = useState<'pre' | 'lineup' | 'toss' | 'play'>(() => (live.phase === 'play' || new URLSearchParams(location.search).has('skip') ? 'play' : live.tossed ? 'toss' : 'pre'))
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
  const [studio, setStudio] = useState<null | 'innings' | 'stumps' | 'end'>(null) // the studio show between innings, at stumps and after the match
  const studioEnded = useRef(false)
  const openStudioRef = useRef<(k: 'innings' | 'stumps' | 'end') => void>(() => {})
  const everyTeam = useTeams()
  const seenInnings = useRef(match.current.index)
  const inningsNow = match.current.index
  useEffect(() => {
    if (inningsNow > seenInnings.current && !match.isOver) { setBreakOpen(true); setBreakPopup(true); setAuto(0); setControlsOpen(false); if (match.format !== 'test' && getAnimPrefs().studio) openStudioRef.current('innings') } // the next innings starts when you say so
    seenInnings.current = inningsNow
  }, [inningsNow, match])
  // a Test waiting at stumps: show the end-of-day card
  const awaitingNow = match.awaiting
  useEffect(() => { if (awaitingNow === 'day') { setBreakPopup(true); setAuto(0); setControlsOpen(false); if (getAnimPrefs().studio) openStudioRef.current('stumps') } }, [awaitingNow])
  stopsRef.current = stops
  const [tab, setTab] = useState<Tab>('scorecard')
  const [controlsOpen, setControlsOpen] = useState(false)
  const fxTimer = useRef<number | undefined>(undefined)
  const noteTimer = useRef<number | undefined>(undefined)
  const motmTimer = useRef<number | undefined>(undefined)
  const [note, setNote] = useState<StageNote | null>(null)
  // The first ball whose outcome the screen must not show yet: the engine has played it, but its animations are still going, so the scoreboard, scorecard and commentary read the match as it was before it.
  const [revealHold, setRevealHold] = useState<number | null>(null)
  const [motmOpen, setMotmOpen] = useState(false)
  const [motmStep, setMotmStep] = useState(0) // at the end the teams shake hands (0), the presentation is on the stage (1), then the detail card (2)
  const motmPitch = motmStep < 2
  const setMotmPitch = (on: boolean) => setMotmStep(on ? 0 : 2)
  useEffect(() => { if (!motmOpen) { setMotmStep(0); return } if (!getAnimPrefs().intro) { setMotmStep(2); return } setMotmStep(0); const a = window.setTimeout(() => setMotmStep(1), SHOW_SECONDS.handshake * 1000 + 300); const b = window.setTimeout(() => setMotmStep(2), (SHOW_SECONDS.handshake + SHOW_SECONDS.ceremony) * 1000 + 700); return () => { window.clearTimeout(a); window.clearTimeout(b) } }, [motmOpen])
  const [upgradesOpen, setUpgradesOpen] = useState(false)
  const [winOpen, setWinOpen] = useState(false)
  const upgradesSeen = useRef(false) // the rating-upgrade screen has been shown for this match
  const shownReels = useRef(new Set<string>()) // the highlight reels the timeouts of this match have used, so none repeats
  const lastCheer = useRef(-100)
  const lastTalk = useRef(-100)
  const lastSwing = useRef(-100) // the ball a momentum screen last played on, so they do not come one after another
  const matchOverRef = useRef(false) // the match has ended and its last screens are still to play
  const winShownRef = useRef(false)
  const [highlightsOpen, setHighlightsOpen] = useState(false)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [moment, setMoment] = useState<Moment | null>(null)
  const momentTimer = useRef<number | undefined>(undefined)
  const noMirrorRef = useRef(false) // a person is aiming shots at the field: keep the right-hander's field so the gaps match
  const manualRef = useRef(false) // play manually with a side of your own to control
  const holdRef = useRef(false) // the screen is holding on the finished first innings
  const autoRef = useRef(auto)
  autoRef.current = auto
  const fixtureId = live.fixtureId

  // A calendar fixture: save the result when the match ends (unless it was already played).
  const season = useStore(selectSeason)
  const history = useStore((s) => selectSession(s)?.history)
  const sessionId = useStore((s) => selectSession(s)?.id ?? '')
  const [victoryOpen, setVictoryOpen] = useState(false) // the tournament-winning celebration (a final won by your team)
  const [beforeOpen, setBeforeOpen] = useState(false)
  const updateSeasonNow = useStore((s) => s.updateSeason)
  const allBaseTeams = useBaseTeamMap()
  const teamMap = useTeamMap()
  const playerIndex = usePlayerIndex()
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
    if (fixture && !alreadyPlayed) recordMatch(summarizeMatch(match, fixture, match.seed), addDays(fixture.date, (fixture.days ?? 1) - 1))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished])

  // (these two are needed by callbacks below, so they are worked out before any early return: a callback made on the toss screen must still know them)
  const pitchKind = describePitch(match.pitch).kind
  // the home ground's look on the broadcast (a friendly is played at the first team's ground)
  const homeTeam = (fixture?.homeId ? teamMap.get(fixture.homeId) : undefined) ?? match.sides[0].team
  const stadium = stadiumLook(homeTeam, match.seed, match.format, match.clock?.plan.weather ?? null)
  /** The field as it stands now, for the stadium shows that are not about one ball (the fly-over, a new batsman, the timeout, the studio, the trophy). */
  const nowBase = useCallback((): ReplayBase => {
    const inn = match.current
    const batS = match.battingSide(inn), bowlS = match.bowlingSide(inn)
    const bowlerId = inn.bowlerId ?? inn.prevBowlerId ?? bowlS.xi.find((p) => p.bowling)?.id ?? bowlS.xi[0].id
    const bowlerP = match.player(bowlerId)
    const strikerP = match.player(inn.strikerId)
    const plan = fieldPlan({ format: match.format, over: Math.floor(inn.legalBalls / 6), maxOvers: FORMATS[match.format].overs, runs: inn.runs, legalBalls: inn.legalBalls, target: inn.target, freeHit: false, bowlType: bowlerP.bowling?.type ?? null, hand: strikerP.hand, noMirror: false })
    return { event: (match.events[match.events.length - 1] ?? { seq: 0, tags: [], wicket: null, extraType: null, boundary: 0, runsBat: 0 }) as unknown as BallEvent, striker: strikerP, nonStriker: match.player(inn.nonStrikerId), bowler: bowlerP, batTeam: batS.team, bowlTeam: bowlS.team, fielders: placeFielders(bowlS.xi, bowlerId, plan.spots), pitch: pitchKind, look: stadium }
  }, [match, pitchKind, stadium])
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
  /** Once the last ball's screens have all played, the winners' celebration takes over. */
  const openWinWhenIdle = useCallback(() => {
    if (!matchOverRef.current || winShownRef.current || current.current || queue.current.length > 0) return
    winShownRef.current = true
    setWinOpen(true)
  }, [])
  const clipWait = useRef<{ seq: number; since: number }>({ seq: -1, since: 0 })
  const startNextMoment = useCallback(() => {
    window.clearTimeout(momentTimer.current)
    // In the broadcast view the screens for a ball wait until its clip has finished playing, then start right away.
    const head = queue.current[0]
    if (head && getBroadcastView() && head.key < 1_000_000 && !['batsman', 'bowler', 'target', 'superover'].includes(head.kind)) {
      const seq = Math.floor(head.key)
      if (clipWait.current.seq !== seq) clipWait.current = { seq, since: Date.now() }
      // (if the clip has not been planned yet the field has not drawn this ball: give it a moment, but not forever)
      const left = clipNow.seq === seq ? clipNow.until - Date.now() : Date.now() - clipWait.current.since < 1500 ? 150 : 0
      if (left > 0) { busyUntil.current = Infinity; momentTimer.current = window.setTimeout(startNextMoment, Math.min(left + 40, 250)); return }
    }
    const m = queue.current.shift() ?? null
    current.current = m
    setMoment(m)
    if (!m) { busyUntil.current = 0; openWinWhenIdle(); return }
    // One rule: where auto-play pauses (wickets, fifties and hundreds, boundaries), that event's screen waits for a tap too.
    const st = stopsRef.current
    if (((m.kind === 'replay' || m.kind === 'catch' || m.kind === 'wicketcast' || m.kind === 'hattrick' || m.kind === 'haul') && st.wickets) || (m.kind === 'milestone' && st.milestones) || ((m.kind === 'six' || m.kind === 'four' || m.kind === 'fourcast') && st.boundaries)) { busyUntil.current = Infinity; return }
    const total = m.delay + m.ms + (queue.current.length ? 0 : 350) // no pause when another moment follows straight away
    busyUntil.current = Date.now() + total
    momentTimer.current = window.setTimeout(startNextMoment, total)
  }, [openWinWhenIdle])
  const enqueueMoment = useCallback((m: Moment) => {
    // a wicket gets one replay, not three of different kinds (the wicket replay, the catch screen, the phantom camera on a bowled, a swing or close-call replay). Different kinds of moment still stack: a six, a fifty, a no ball each keep their own replay.
    if (m.key < 1_000_000) {
      const ball = Math.floor(m.key)
      const same = (q: Moment) => q.key < 1_000_000 && Math.floor(q.key) === ball
      const strong = (q: Moment) => WICKET_STRONG.includes(q.kind)
      const weak = (q: Moment) => WICKET_WEAK.includes(q.kind) && !(q.kind === 'phantomcast' && q.phantomCast?.what === 'six')
      if (strong(m)) {
        if (current.current && same(current.current) && strong(current.current)) return
        const clash = queue.current.findIndex((q) => same(q) && strong(q))
        if (clash >= 0) {
          if (WICKET_STRONG.indexOf(m.kind) >= WICKET_STRONG.indexOf(queue.current[clash].kind)) return
          queue.current.splice(clash, 1)
        }
        queue.current = queue.current.filter((q) => !(same(q) && weak(q)))
      } else if (weak(m)) {
        if ((current.current && same(current.current) && strong(current.current)) || queue.current.some((q) => same(q) && strong(q))) return
      }
    }
    queue.current.push(m)
    if (!current.current) startNextMoment()
  }, [startNextMoment])
  /** Close what's showing; the next one in line (if any) takes its place. */
  const dismissMoment = useCallback(() => startNextMoment(), [startNextMoment])
  /** Drop everything: the next delivery is what matters now. */
  const clearMoments = useCallback(() => { queue.current = []; startNextMoment() }, [startNextMoment])

  // First time a batsman faces or a bowler bowls in this match: a few seconds of who he is.
  // (the figures on the introduction cards are this format's: a T20 shows T20 runs, wickets and averages)
  const seasonStats = useMemo(() => (fixture && season ? collect(season, { format: match.format }) : null), [fixture, season, match.format])
  useEffect(() => { setStatsFormat(match.format); return () => setStatsFormat(null) }, [match.format])
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
    // the start of an innings: the camera flies in over the stadium and settles behind the bowler
    if (getAnimPrefs().intro && inn.legalBalls === 0 && !seen.current!.has(`fly:${inn.index}`)) {
      seen.current!.add(`fly:${inn.index}`)
      const bat = match.battingSide(inn), bowl = match.bowlingSide(inn)
      const rate = sp === 4 ? 0.55 : sp === 2 ? 0.75 : 1
      const ord = ['1st', '2nd', '3rd', '4th'][inn.index] ?? `${inn.index + 1}th`
      enqueueMoment({ key: introSeq.current++, kind: 'stadium', player: match.player(inn.strikerId), team: bat.team, title: 'FLY-OVER', lines: [], delay: 0, ms: Math.round(SHOW_SECONDS.flyover * 1000 * rate), stadium: { show: { kind: 'flyover', seed: match.seed + inn.index, colors: [bat.team.colors.primary, bat.team.colors.secondary], lower: { title: `${bat.team.name} v ${bowl.team.name}`, lines: [`${ord} innings · ${match.format === 'test' ? 'Test' : match.format.toUpperCase()}`] } }, base: nowBase(), label: 'Fly-over', rate } })
    }
    // the start of a chase: the target, before anyone is introduced
    if (getAnimPrefs().intro && inn.index === 1 && inn.legalBalls === 0 && inn.target !== null && !seen.current!.has('target')) {
      seen.current!.add('target')
      const bat = match.battingSide(inn)
      const bowl = match.bowlingSide(inn)
      enqueueMoment({ key: introSeq.current++, kind: 'target', player: match.player(inn.strikerId), team: bat.team, title: 'TARGET', lines: [], delay: 0, ms: Math.round(5200 * (sp === 4 ? 0.55 : sp === 2 ? 0.75 : 1)), target: { chasing: bat.team, defending: bowl.team, target: inn.target, balls: FORMATS[match.format].overs * 6, format: match.format, rate: sp === 4 ? 0.55 : sp === 2 ? 0.75 : 1 } })
      if (getAnimPrefs().cheer && ambientLights(match.seed)) enqueueMoment({ key: introSeq.current++, kind: 'stadium', player: match.player(inn.strikerId), team: bat.team, title: 'FLOODLIGHTS', lines: [], delay: 0, ms: Math.round(SHOW_SECONDS.lights * 1000 * (sp === 4 ? 0.55 : sp === 2 ? 0.75 : 1)), stadium: { show: { kind: 'lights', seed: match.seed, colors: [bat.team.colors.primary, bat.team.colors.secondary], lower: { title: 'Floodlights', lines: ['The lights come on as the evening draws in'] } }, base: nowBase(), label: 'Floodlights', rate: sp === 4 ? 0.55 : sp === 2 ? 0.75 : 1 } })
    }
    const ms = (sp === 4 ? 7000 : sp === 2 ? 9000 : 12000) / (quick ? 2 : 1) // long enough to read in full; a click moves on sooner
    const mk = (kind: 'batsman' | 'bowler', id: string): Moment => {
      const p = match.player(id)
      const team = (kind === 'batsman' ? match.battingSide() : match.bowlingSide()).team
      const t = (label: string, value: string | number) => ({ label, value: String(value) })
      let tiles: { label: string; value: string }[]
      let lines: string[]
      if (kind === 'batsman') {
        const s = seasonStats?.bat.get(id)
        lines = [`${ROLE_LABEL[p.role]} · ${p.hand === 'L' ? 'Left' : 'Right'}-hand`, s ? `This season in ${match.format === 'odi' ? 'ODI' : match.format === 'test' ? 'Test' : 'T20'}: ${s.runs} runs in ${s.innings} innings` : fixture ? `No ${match.format === 'odi' ? 'ODI' : match.format === 'test' ? 'Test' : 'T20'} runs yet this season` : 'Ratings']
        tiles = s
          ? [t('Apps', s.batApps + 1), t('Runs', s.runs), t('Average', average(s) === null ? '-' : average(s)!.toFixed(1)), t('Best', `${s.high}${s.highNotOut ? '*' : ''}`), t('50s / 100s', `${s.fifties}/${s.hundreds}`), t('Strike rate', seasonSR(s) === null ? '-' : seasonSR(s)!.toFixed(0))]
          : [t('Technique', p.batting.technique), t('Power', p.batting.power), t('Temperament', p.batting.temperament), t('Running', p.batting.running)]
      } else {
        const s = seasonStats?.bowl.get(id)
        const w = p.bowling
        lines = [`${bowlLabel(w?.type)} bowler`, s ? `This season in ${match.format === 'odi' ? 'ODI' : match.format === 'test' ? 'Test' : 'T20'}: ${s.wickets} wickets in ${s.matches} matches` : fixture ? `No ${match.format === 'odi' ? 'ODI' : match.format === 'test' ? 'Test' : 'T20'} wickets yet this season` : 'Ratings']
        tiles = s
          ? [t('Apps', s.bowlApps + 1), t('Wickets', s.wickets), t('Economy', economy(s) === null ? '-' : economy(s)!.toFixed(2)), t('Best', `${s.bestW}/${s.bestR}`), t('Maidens', s.maidens), t('5-wicket hauls', s.fiveW)]
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
    // whoever comes in (on strike or at the other end, the moment he arrives) walks out from the dressing room; the two openers come out together
    const fresh = [inn.strikerId, inn.nonStrikerId].map((id) => inn.batters.find((b) => b.id === id)).filter((b): b is NonNullable<typeof b> => !!b && b.balls === 0 && !b.dismissal && !seen.current!.has(`bat:${b.id}`))
    if (fresh.length > 0) {
      for (const b of fresh) seen.current!.add(`bat:${b.id}`)
      const intros = fresh.map((b) => mk('batsman', b.id))
      if (getAnimPrefs().intro) {
        const bat = match.battingSide(inn)
        const rate = sp === 4 ? 0.55 : sp === 2 ? 0.75 : 1
        const players = fresh.map((b) => match.player(b.id))
        const pair = players.length === 2
        const lead = players[0]
        const chip = pair ? 'OPENING PAIR' : intros[0].title.startsWith('NEW SIGNING') ? 'NEW SIGNING' : 'NEW BATSMAN' + (seasonStats ? ` · ${match.format === 'odi' ? 'ODI' : match.format === 'test' ? 'TEST' : 'T20'} STATS` : '')
        const lines = pair ? intros.map((it, i) => `${players[i].name}: ${it.lines.slice(0, 2).join(' · ')}`) : intros[0].lines.slice(0, 2)
        enqueueMoment({ key: introSeq.current++, kind: 'stadium', player: lead, team: bat.team, title: pair ? 'THE OPENERS' : intros[0].title, lines: [], delay: 0, ms: Math.round(SHOW_SECONDS.entrance * 1000 * rate), stadium: { show: { kind: 'entrance', pair, seed: match.seed + lead.name.length + inn.wickets * 7 + inn.index * 31, colors: [bat.team.colors.primary, bat.team.colors.secondary], left: lead.hand === 'L', lower: pair ? { title: `${players[0].name} & ${players[1].name}`, lines: [], chip, pair: intros.map((it, i) => ({ title: players[i].name.split(' ')[0], sub: it.lines[0] ?? '', rating: it.rating, tiles: (it.tiles ?? []).slice(0, 5) })) } : { title: lead.name, lines, chip, tiles: intros[0].tiles, rating: intros[0].rating } }, base: nowBase(), label: pair ? 'The openers' : intros[0].title, rate, cast: { team: bat.team, players } } })
        // wickets have been falling and a set batsman is still there: when the new one comes in he walks down the pitch for a word (looks only)
        if (getAnimPrefs().talks && !pair && inn.wickets >= 3 && !seen.current!.has(`mentor:${inn.index}:${inn.wickets}`)) {
          const otherId = [inn.strikerId, inn.nonStrikerId].find((id) => id !== lead.id)
          const ol = otherId ? inn.batters.find((b) => b.id === otherId) : undefined
          const lately = inn.log.slice(-36).filter((e) => e.wicket).length
          if (ol && otherId && (ol.runs >= 20 || ol.balls >= 18) && (lately >= 2 || inn.wickets >= 5)) {
            seen.current!.add(`mentor:${inn.index}:${inn.wickets}`)
            const setP = match.player(otherId)
            enqueueMoment({ key: introSeq.current++, kind: 'stadium', player: setP, team: bat.team, title: 'WORDS AT THE CREASE', lines: [], delay: 0, ms: Math.round(SHOW_SECONDS.talk * 1000 * rate), stadium: { show: { kind: 'talk', talk: 'mentor', seed: match.seed + inn.wickets * 5 + inn.index, colors: [bat.team.colors.primary, bat.team.colors.secondary], left: setP.hand === 'L', lower: { title: 'WORDS AT THE CREASE', lines: [`${first(setP.name)} (${ol.runs} off ${ol.balls}) walks down the pitch to settle ${first(lead.name)}`], chip: `${inn.wickets} DOWN`, color: '#fbbf24' } }, base: nowBase(), label: 'Words at the crease', rate, cast: { team: bat.team, players: [setP, lead] } } })
          }
        }
      } else for (const it of intros) enqueueMoment(it)
    }
    const bowlerId = inn.bowlerId
    if (bowlerId && (inn.bowlers.get(bowlerId)?.legalBalls ?? 0) === 0 && !seen.current!.has(`bowl:${bowlerId}`)) {
      seen.current!.add(`bowl:${bowlerId}`)
      const intro = mk('bowler', bowlerId)
      if (getAnimPrefs().intro) {
        // the bowler jogs in from the deep, marks his run-up and rubs the ball on his trousers, with a strip of who he is
        const p = match.player(bowlerId), bowl = match.bowlingSide(inn)
        const rate = sp === 4 ? 0.55 : sp === 2 ? 0.75 : 1
        const opening = [...inn.bowlers.values()].every((l) => l.legalBalls === 0)
        const chip = intro.title.startsWith('NEW SIGNING') ? 'NEW SIGNING' : opening ? 'OPENING BOWLER' : 'NEW BOWLER' + (seasonStats ? ` · ${match.format === 'odi' ? 'ODI' : match.format === 'test' ? 'TEST' : 'T20'} STATS` : '')
        enqueueMoment({ key: introSeq.current++, kind: 'stadium', player: p, team: bowl.team, title: intro.title, lines: [], delay: 0, ms: Math.round(SHOW_SECONDS.bowler * 1000 * rate), stadium: { show: { kind: 'bowler', seed: match.seed + inn.legalBalls + inn.index * 17, colors: [bowl.team.colors.primary, bowl.team.colors.secondary], lower: { title: p.name, lines: intro.lines.slice(0, 2), chip, tiles: intro.tiles, rating: intro.rating } }, base: nowBase(), label: intro.title, rate, cast: { team: bowl.team, players: [p] } } })
      } else enqueueMoment(intro)
    }
  }, [match, seasonStats, fixture, enqueueMoment, nowBase])

  // the studio show: the camera flies to the stadium's giant screen (the scores on it) and the studio takes over from there
  openStudioRef.current = (k) => {
    const inn = match.current
    const batS = match.battingSide(inn)
    const rows = match.innings.filter((i) => i.legalBalls > 0 || i.runs > 0).map((i) => ({ label: match.sides[i.battingSide].team.name, value: `${i.runs}/${i.wickets}` }))
    if (k === 'end' && match.result) rows.push({ label: 'Result', value: match.result.text })
    enqueueMoment({ key: introSeq.current++, kind: 'stadium', player: match.player(inn.strikerId), team: batS.team, title: 'THE STUDIO', lines: [], delay: 200, ms: Math.round(SHOW_SECONDS.studio * 1000), stadium: { show: { kind: 'studio', seed: match.seed + match.events.length, colors: [batS.team.colors.primary, batS.team.colors.secondary], board: { title: 'THE STUDIO', sub: k === 'innings' ? 'Innings break' : k === 'stumps' ? 'Stumps' : 'After the match', rows } }, base: nowBase(), label: 'The studio', rate: 1 } })
    setStudio(k)
  }
  // the live commentary: said aloud when the voices are on in "full" mode
  const voiceTimer = useRef(0)
  const pendingOutcome = useRef<(() => void)[]>([])
  const flushOutcome = useCallback(() => { const run = pendingOutcome.current; pendingOutcome.current = []; run.forEach((fn) => fn()) }, [])
  const boxLines = useRef<string[] | null>(null)
  /** A review on the stadium's giant screen: the camera flies up to it, the ball tracking (or the sound graph) is drawn on it and the verdict comes up, with the crowd roaring or groaning. */
  const reviewStadium = (ev: BallEvent, askBy: string, kind: 'track' | 'edge', out: boolean, overturned: boolean, rate: number): Moment['stadium'] => {
    const tr = trackFor(ev.seq, out)
    return { show: { kind: 'review', seed: ev.seq, colors: [match.sides[0].team.colors.primary, match.sides[0].team.colors.secondary], review: { kind, pitchX: tr.pitchX, impactX: tr.impactX, stumpsX: tr.stumpsX, pitching: tr.pitching, impact: tr.impact, wickets: tr.wickets, out, overturned, by: askBy } }, base: nowBase(), label: 'Review', rate }
  }
  /** An appeal turned down on the field: the ball tracking or sound graph shows why, or the third umpire clears the batsman of a run out. */
  const turnedDownMoments = (ev: BallEvent, rate: number, delay: number) => {
    const ap = ev.appeal
    if (!ap || ap.out) return
    const inn = match.innings[ev.innings]
    const batS = match.sides[inn.battingSide]
    const bowlS = match.sides[1 - inn.battingSide]
    const striker = match.player(ev.strikerId)
    const bowler = match.player(ev.bowlerId)
    if (ap.kind === 'runout') {
      const gap = runOutGap(ev.seq)
      enqueueMoment({ key: ev.seq + 0.3, kind: 'runout', player: striker, team: batS.team, title: 'RUN OUT?', lines: [], delay, ms: Math.round(7200 * rate), runout: { batsman: striker, batTeam: batS.team, fielder: null, bowlTeam: bowlS.team, cm: gap.cm, text: gap.text, out: false, rate } })
      return
    }
    enqueueMoment({ key: ev.seq + 0.3, kind: 'review', player: striker, team: batS.team, title: 'APPEAL', lines: [], delay, ms: Math.round(10200 * rate), stadium: getAnimPrefs().cheer ? reviewStadium(ev, bowler.name, ap.kind === 'edge' ? 'edge' : 'track', false, false, rate) : undefined, review: { plain: true, by: 'field', kind: ap.kind === 'edge' ? 'edge' : 'track', batsman: striker, batTeam: batS.team, bowler, bowlTeam: bowlS.team, out: false, finalOut: false, track: trackFor(ev.seq, false), rate } })
  }
  /** The screens for a challenge: the huddle (the bowler, the captain and the keeper; or the two batsmen), then the review and its verdict. */
  const challengeMoments = (ev: BallEvent, rate: number, delay: number) => {
    const r = ev.review
    if (!r) return
    const inn = match.innings[ev.innings]
    const batS = match.sides[inn.battingSide]
    const bowlS = match.sides[1 - inn.battingSide]
    const keeperId = match.keeperOf((1 - inn.battingSide) as 0 | 1)
    const bowler = match.player(ev.bowlerId)
    const cap = bowlS.xi.find((p) => p.id === bowlS.team.captainId && p.id !== ev.bowlerId && p.id !== keeperId) ?? bowlS.xi.find((p) => p.id !== ev.bowlerId && p.id !== keeperId) ?? bowler
    const keeperP = keeperId ? match.player(keeperId) : (bowlS.xi.find((p) => p.id !== ev.bowlerId && p.id !== cap.id) ?? cap)
    const striker = match.player(ev.strikerId)
    const partner = match.player(ev.nonStrikerId)
    const leftBefore = r.left + (r.overturned ? 0 : 1)
    const talk = challengeTalk({ by: r.by, kind: r.kind, desperate: r.desperate, left: leftBefore, total: r.total, seq: ev.seq, names: { bowler: bowler.name, captain: cap.name, keeper: keeperP.name, striker: striker.name, partner: partner.name } })
    const who = { bowler, captain: cap, keeper: keeperP, striker, partner }
    const side = r.by === 'bowl' ? bowlS.team : batS.team
    enqueueMoment({ key: ev.seq + 0.28, kind: 'challenge', player: r.by === 'bowl' ? cap : striker, team: side, title: 'CHALLENGE', lines: [], delay, ms: Math.round(challengeSeconds(talk.lines) * 1000 * rate), challenge: { by: r.by, kind: r.kind, desperate: r.desperate, left: leftBefore, total: r.total, people: talk.people.map((role) => ({ role, player: who[role], team: side })), lines: talk.lines, rate } })
    enqueueMoment({ key: ev.seq + 0.3, kind: 'review', player: striker, team: batS.team, title: 'REVIEW', lines: [], delay: Math.round(delay * 0.6), ms: Math.round(((getAnimPrefs().cheer ? 10200 : r.kind === 'edge' ? 12200 : 8200)) * rate), stadium: getAnimPrefs().cheer ? reviewStadium(ev, r.by === 'bat' ? striker.name : bowler.name, r.kind === 'edge' ? 'edge' : 'track', r.finalOut, r.overturned, rate) : undefined, review: { by: r.by === 'bat' ? 'bat' : 'field', kind: r.kind === 'edge' ? 'edge' : 'track', batsman: striker, batTeam: batS.team, bowler, bowlTeam: bowlS.team, out: r.originalOut, finalOut: r.finalOut, overturned: r.overturned, left: r.left, total: r.total, track: trackFor(ev.seq, r.finalOut), rate } })
    // a successful challenge gets its own moment: the decision flips and the winners celebrate
    if (r.overturned) {
      const winnersSide = r.by === 'bowl' ? bowlS.team : batS.team
      const winners = (r.by === 'bowl' ? [bowler, cap, keeperP] : [striker, partner]).map((player) => ({ player, team: winnersSide }))
      enqueueMoment({ key: ev.seq + 0.31, kind: 'challengewon', player: striker, team: winnersSide, title: 'CHALLENGE SUCCESSFUL', lines: [], delay: 200, ms: Math.round(CHALLENGE_RESULT_SECONDS * 1000 * rate), challengeWon: { by: r.by, batsman: striker, batTeam: batS.team, winners, left: r.left, total: r.total, rate } })
    }
  }
  const announceEvents = useCallback(
    (events: BallEvent[]) => {
      force()
      // while a ball is being shown on the broadcast picture the display holds back its result until the animations are done
      const holding = events.length === 1 && getBroadcastView()
      flushOutcome()
      setRevealHold(holding ? events[0].seq : null)
      // celebrations (sounds, confetti, banners) wait for the result to be shown, so they never give the ball away
      const later = (fn: () => void) => { if (holding) pendingOutcome.current.push(fn); else fn() }
      if (getVoiceMode() === 'full' && !match.isOver && events.length > 0 && events.length <= 12) {
        const ev = events[events.length - 1]
        window.clearTimeout(voiceTimer.current)
        cancelSpeech()
        boxLines.current = null
        const names = { striker: match.player(ev.strikerId).name, bowler: match.player(ev.bowlerId).name, out: ev.wicket ? match.player(ev.wicket.playerId).name : undefined, fielder: ev.wicket?.fielderId ? match.player(ev.wicket.fielderId).name : undefined }
        const lines = liveLines(ev, names)
        const rf = autoRef.current === 4 ? 0.5 : autoRef.current === 2 ? 0.75 : 1
        // in the broadcast view the commentator speaks once the ball has been hit
        const speak = () => {
          voiceTimer.current = window.setTimeout(() => {
            const extra = boxLines.current
            boxLines.current = null
            void speakLines([...lines, ...(extra ?? []).map((text, i) => ({ text, role: (i % 2 ? 'colour' : 'pbp') as 'pbp' | 'colour' }))])
          }, holding ? 250 : getBroadcastView() ? 1500 * rf : 350)
        }
        later(speak)
      }
      // Sound for the last delivery (or the final result). The crowd "awws" at wickets and roars at boundaries.
      const lastEv = events[events.length - 1]
      if (lastEv && (lastEv.review || lastEv.appeal)) crowdHush(5)
      // a tied knockout goes to a super over: the screen comes after the last ball's own screens
      const finalMoments = () => {
        // a final: the winners gather in the middle of the ground and lift the trophy under confetti and fireworks
        const ws = match.result?.winnerSide
        if (match.isOver && (ws === 0 || ws === 1) && fixture?.phase === 'knockout' && fixture.stage === 'Final' && getAnimPrefs().intro && !seen.current!.has('trophy')) {
          seen.current!.add('trophy')
          const wsd = match.sides[ws]
          const comp = season?.competitions.find((c) => c.id === fixture.competitionId)
          const players = [...wsd.xi].sort((a, b) => (b.id === wsd.team.captainId ? 1 : 0) - (a.id === wsd.team.captainId ? 1 : 0))
          enqueueMoment({ key: (lastEv?.seq ?? 0) + 0.99, kind: 'stadium', player: players[0], team: wsd.team, title: 'CHAMPIONS', lines: [], delay: 600, ms: Math.round(SHOW_SECONDS.trophy * 1000), stadium: { show: { kind: 'trophy', seed: match.seed, colors: [wsd.team.colors.primary, wsd.team.colors.secondary], trophy: comp ? trophyOf(comp) : 'cup', lower: { title: wsd.team.name, lines: [comp ? `Winners of the ${competitionName(comp, teamMap)}` : 'Winners of the final'], chip: 'CHAMPIONS' } }, base: nowBase(), label: 'Champions', rate: 1, cast: { team: wsd.team, players } } })
        }
        if (!match.isOver || match.result?.winnerSide !== null || fixture?.phase !== 'knockout' || !getAnimPrefs().intro) return
        const o = superOverOutcome(match.seed)
        const win = match.sides[o.winnerSide]
        enqueueMoment({ key: (lastEv?.seq ?? 0) + 0.95, kind: 'stadium', player: win.xi[0], team: win.team, title: 'SUPER OVER', lines: [], delay: 800, ms: Math.round(SHOW_SECONDS.board * 1000), stadium: { show: { kind: 'board', seed: match.seed, colors: [win.team.colors.primary, win.team.colors.secondary], board: { title: 'SUPER OVER', sub: 'Scores level: one over each decides it', big: `${o.winnerRuns} v ${o.loserRuns}/${o.loserWickets}`, rows: [{ label: win.team.name, value: String(o.winnerRuns) }, { label: match.sides[1 - o.winnerSide].team.name, value: `${o.loserRuns}/${o.loserWickets}` }, { label: 'Winner', value: win.team.name }] } }, base: nowBase(), label: 'Super over', rate: 1 } })
      }
      if (match.isOver) {
        // the celebration (or defeat) screen has its own sound
      } else if (lastEv && events.length <= 12) {
        // the crack of the bat is heard when the ball meets it (the clip's moment of contact), not when the result is shown
        if (batHitsBall(lastEv) && !lastEv.wicket) {
          const crack = () => { if (lastEv.boundary) sfx.crack(lastEv.boundary === 6); else sfx.hit(lastEv.runsBat >= 2 ? 0.55 : 0.25) }
          if (holding) {
            const speedNow = ballSpeed(lastEv, match.player(lastEv.bowlerId))
            window.setTimeout(crack, (contactAt(speedNow) * 1000) / Math.max(0.15, autoRef.current === 4 ? 0.5 : autoRef.current === 2 ? 0.75 : 1))
          } else crack()
        }
        later(() => {
          if (lastEv.tags.some((t) => t === 'fifty' || t === 'hundred' || t === '150' || t === '200')) haptic([30, 80, 30, 60, 90]) // the fist bump
          else if (lastEv.wicket) haptic([60, 40, 90])
          else if (lastEv.boundary === 6) haptic([20, 30, 20])
          else if (lastEv.boundary === 4) haptic(18)
          if (lastEv.tags.includes('hat-trick')) sfx.hatTrick()
          else if (lastEv.tags.some((t) => t === 'fifty' || t === 'hundred' || t === '150' || t === '200')) { sfx.fistBump(); crowdSwell(1, 4) }
          else if (lastEv.tags.includes('five-wickets')) sfx.milestone()
          else if (lastEv.wicket) { sfx.wicket(); crowdSwell(0.85, 3) }
          else if (lastEv.boundary === 6) { sfx.crowdSix(); crowdSwell(1, 3.2) }
          else if (lastEv.boundary === 4) { sfx.crowdFour(); crowdSwell(0.65, 2.4) }
          else if (lastEv.extraType === 'noball') sfx.noBall()
        })
      }
      if (match.isOver) {
        // The match is over: the last ball's own screens (a six, a wicket, a hundred) play first, then the whole screen becomes a celebration.
        setAuto(0)
        matchOverRef.current = true
        winShownRef.current = false
        window.setTimeout(openWinWhenIdle, 0)
      }
      if (!events.length || events.length > 12) { finalMoments(); window.setTimeout(openWinWhenIdle, 0); return }
      // a no-ball: the next delivery is a free hit, so say so
      // where the bowling side stood for a ball: the field of that stage of the game
      const placedAt = (ev: BallEvent) => {
        const innE = match.innings[ev.innings]
        const bowlerE = match.player(ev.bowlerId)
        const plan = fieldPlan({
          format: match.format, over: ev.over, maxOvers: FORMATS[match.format].overs, runs: ev.score.runs - ev.total, legalBalls: ev.score.legalBalls - (ev.legal ? 1 : 0),
          target: innE.target, freeHit: ev.freeHit, bowlType: bowlerE.bowling?.type ?? null, hand: match.player(ev.strikerId).hand, noMirror: noMirrorRef.current,
        })
        return placeFielders(match.sides[1 - innE.battingSide].xi, ev.bowlerId, plan.spots)
      }
      /** What the broadcast view needs to play a ball again inside an animation screen. */
      const replayBase = (ev: BallEvent): ReplayBase => {
        const innE = match.innings[ev.innings]
        return { event: ev, striker: match.player(ev.strikerId), nonStriker: match.player(ev.nonStrikerId), bowler: match.player(ev.bowlerId), batTeam: match.sides[innE.battingSide].team, bowlTeam: match.sides[1 - innE.battingSide].team, fielders: placedAt(ev), pitch: pitchKind, look: stadium }
      }
      // the no-ball itself: the front foot over the line, before the free hit
      if (lastEv?.extraType === 'noball' && getAnimPrefs().freeHit && !match.isOver) {
        const spd = autoRef.current
        const innNb = match.innings[lastEv.innings]
        const bowlNb = match.sides[1 - innNb.battingSide].team
        const rateNb = spd === 4 ? 0.55 : spd === 2 ? 0.75 : 1
        const dvNb = deliveryOf(lastEv, match.player(lastEv.bowlerId), { overcast: stadium.weather === 'overcast' })
        const nbDelay = spd === 4 ? 150 : spd === 2 ? 250 : 450
        if (dvNb.noBallCause === 'beamer') {
          // a ball above the waist: a replay of it from the side with how high it was
          enqueueMoment({ key: lastEv.seq + 0.7, kind: 'deliverycast', player: match.player(lastEv.bowlerId), team: bowlNb, title: 'BEAMER', lines: [], delay: nbDelay, ms: Math.round(DELIVERY_CAST_SECONDS * 1000 * rateNb), deliveryCast: { replay: replayBase(lastEv), screen: 'beamer', dv: dvNb, kmh: ballSpeed(lastEv, match.player(lastEv.bowlerId)), batsman: match.player(lastEv.strikerId), bowler: match.player(lastEv.bowlerId), bowlTeam: bowlNb, left: match.player(lastEv.strikerId).hand === 'L', rate: rateNb } })
        } else {
          enqueueMoment({ key: lastEv.seq + 0.7, kind: 'noball', player: match.player(lastEv.bowlerId), team: bowlNb, title: 'NO BALL', lines: [], delay: nbDelay, ms: Math.round(NO_BALL_CAST_SECONDS * 1000 * rateNb), noballCast: { replay: replayBase(lastEv), bowler: match.player(lastEv.bowlerId), bowlTeam: bowlNb, cm: overstepCm(lastEv.seq), rate: rateNb } })
        }
      }
      // (not when that ball ended the innings: the free hit would be shown against the next innings' batsman)
      if (lastEv?.extraType === 'noball' && getAnimPrefs().freeHit && !match.isOver && match.current.index === lastEv.innings) {
        const cur = match.current
        const spd = autoRef.current
        const bat = match.battingSide(cur)
        const bowl = match.bowlingSide(cur)
        const batsmanP = match.player(cur.strikerId)
        const bowlerP = match.player(lastEv.bowlerId)
        enqueueMoment({ key: lastEv.seq + 0.75, kind: 'freehit', player: bowlerP, team: bowl.team, title: 'FREE HIT!', lines: [], delay: spd === 4 ? 150 : spd === 2 ? 250 : 450, ms: spd === 4 ? 1400 : spd === 2 ? 1900 : 2700, freeHit: { bowler: bowlerP, bowlTeam: bowl.team, batsman: batsmanP, batTeam: bat.team, rate: spd === 4 ? 0.55 : spd === 2 ? 0.75 : 1 } })
      }
      // a single ball can also earn a screen of its own: a four, an extra, a maiden over
      if (events.length === 1 && lastEv && !lastEv.wicket) {
        const prefs = getAnimPrefs()
        const spd = autoRef.current
        const rate = spd === 4 ? 0.55 : spd === 2 ? 0.75 : 1
        const delay = spd === 4 ? 150 : spd === 2 ? 250 : 450
        const innNow = match.innings[lastEv.innings]
        const batT = match.sides[innNow.battingSide].team
        const bowlS = match.sides[1 - innNow.battingSide]
        if (prefs.four && lastEv.boundary === 4) {
          const ang = eventAngle(lastEv)
          enqueueMoment({ key: lastEv.seq + 0.4, kind: 'fourcast', player: match.player(lastEv.strikerId), team: batT, title: 'FOUR!', lines: [], delay, ms: Math.round(FOUR_SECONDS * 1000 * rate), fourCast: { replay: replayBase(lastEv), contact: fourContact(lastEv, match.player(lastEv.strikerId).batting.power), shot: shotText({ angle: ang, loft: !!lastEv.shot?.loft }) ?? 'Along the ground', batsman: match.player(lastEv.strikerId), batTeam: batT, fire: lastEv.freeHit, poor: (() => { const d = deliveryOf(lastEv, match.player(lastEv.bowlerId), { overcast: stadium.weather === 'overcast' }); return isPoorLength(d) ? LENGTH_WORDS[d.length] : undefined })(), rate } })
        }
        if (prefs.extras && (lastEv.extraType === 'wide' || lastEv.extraType === 'bye' || lastEv.extraType === 'legbye')) {
          const nameOf = lastEv.extraType === 'wide' ? (lastEv.wideByes ? 'WIDE + 4 BYES!' : 'WIDE!') : lastEv.extraRuns >= 4 ? (lastEv.extraType === 'bye' ? 'FOUR BYES!' : 'FOUR LEG BYES!') : lastEv.extraType === 'bye' ? 'BYE!' : 'LEG BYE!'
          const extraTotal = lastEv.extraRuns + (lastEv.wideByes ?? 0)
          const subOf = `+${extraTotal} ${extraTotal === 1 ? 'run' : 'runs'} to the total${lastEv.extraType === 'wide' ? (wideSide(lastEv) === 'off' ? ' · outside off' : ' · down the leg side') + ` · ${wideCm(lastEv.seq)} cm outside the wide line` : lastEv.extraType === 'bye' ? ' · it beats the bat and the keeper' : ' · off the pad'}`
          enqueueMoment({ key: lastEv.seq + 0.6, kind: 'extracast', player: match.player(lastEv.bowlerId), team: bowlS.team, title: lastEv.extraType.toUpperCase(), lines: [], delay, ms: Math.round(EXTRA_CAST_SECONDS * 1000 * rate), extraCast: { replay: replayBase(lastEv), title: nameOf, sub: subOf, wide: lastEv.extraType === 'wide' ? { side: wideSide(lastEv), hand: match.player(lastEv.strikerId).hand === 'L' ? 'L' : 'R', cm: wideCm(lastEv.seq) } : undefined, color: lastEv.extraType === 'wide' ? '#fbbf24' : lastEv.extraType === 'bye' ? '#2dd4bf' : '#a5b4fc', rate } })
        }
        // a ball that beat the bat and went very close to the stumps or the edge of the bat gets a close-call replay
        const close = prefs.nearmiss ? nearMiss(lastEv, match.player(lastEv.strikerId).hand === 'L') : null
        if (close) {
          const striker = match.player(lastEv.strikerId), bowlerNow = match.player(lastEv.bowlerId)
          enqueueMoment({ key: lastEv.seq + 0.45, kind: 'misscast', player: striker, team: batT, title: close.kind === 'stumps' ? 'SO CLOSE!' : 'BEATEN!', lines: [], delay, ms: Math.round(MISS_CAST_SECONDS * 1000 * rate), missCast: { replay: replayBase(lastEv), miss: close, batsman: striker, bowler: bowlerNow, batTeam: batT, rate } })
        }
        // a lofted shot that dropped just in front of a fielder: so nearly a catch
        const almost = prefs.nearmiss ? almostCaught(lastEv, replayBase(lastEv).fielders, match.player(lastEv.strikerId).hand === 'L', match.player(lastEv.bowlerId)) : null
        if (almost) {
          const striker = match.player(lastEv.strikerId)
          enqueueMoment({ key: lastEv.seq + 0.46, kind: 'almostcast', player: striker, team: batT, title: almost.dropped ? 'DROPPED!' : 'SO NEARLY!', lines: [], delay, ms: Math.round(ALMOST_CAST_SECONDS * 1000 * rate), almostCast: { replay: replayBase(lastEv), almost, batsman: striker, batTeam: batT, bowlTeam: bowlS.team, rate } })
        }
        // how the ball was bowled: a big swing or turn (with a compass), a good yorker that was kept out
        const dvl = prefs.delivery ? deliveryOf(lastEv, match.player(lastEv.bowlerId), { overcast: stadium.weather === 'overcast' }) : null
        const dscreen = dvl ? deliveryScreen(lastEv, dvl, ballSpeed(lastEv, match.player(lastEv.bowlerId))) : null
        if (dvl && dscreen && dscreen !== 'beamer') {
          const bowlerNow2 = match.player(lastEv.bowlerId)
          enqueueMoment({ key: lastEv.seq + 0.48, kind: 'deliverycast', player: bowlerNow2, team: bowlS.team, title: dscreen.toUpperCase(), lines: [], delay, ms: Math.round(DELIVERY_CAST_SECONDS * 1000 * rate), deliveryCast: { replay: replayBase(lastEv), screen: dscreen, dv: dvl, kmh: ballSpeed(lastEv, bowlerNow2), batsman: match.player(lastEv.strikerId), bowler: bowlerNow2, bowlTeam: bowlS.team, left: match.player(lastEv.strikerId).hand === 'L', rate } })
        }
        // three runs run: the batsman is worn out
        if (prefs.cheer && !lastEv.wicket && !lastEv.boundary && lastEv.total === 3 && lastEv.legal) {
          const tiredBat = match.player(lastEv.strikerId)
          enqueueMoment({ key: lastEv.seq + 0.56, kind: 'tired', player: tiredBat, team: batT, title: 'EXHAUSTED!', lines: [], delay, ms: Math.round(TIRED_SECONDS * 1000 * rate), tired: { batsman: tiredBat, batTeam: batT, rate } })
        }
        if (prefs.extras && lastEv.tags.includes('maiden')) {
          const ln = innNow.bowlers.get(lastEv.bowlerId)
          // maidens in a row: this bowler's own overs, newest first, as long as each was a maiden
          const mine = [...new Set(innNow.log.filter((e) => e.bowlerId === lastEv.bowlerId).map((e) => e.over))].sort((a, b) => b - a)
          let streak = 0
          for (const o of mine) { if (innNow.log.some((e) => e.over === o && e.bowlerId === lastEv.bowlerId && e.tags.includes('maiden'))) streak++; else break }
          enqueueMoment({ key: lastEv.seq + 0.8, kind: 'maiden', player: match.player(lastEv.bowlerId), team: bowlS.team, title: 'MAIDEN!', lines: [], delay, ms: Math.round(2900 * rate), maiden: { bowler: match.player(lastEv.bowlerId), bowlTeam: bowlS.team, overs: ln ? `(${Math.floor(ln.legalBalls / 6)}.${ln.legalBalls % 6} overs, ${ln.runs} runs, ${ln.wickets} wickets)` : '', rate, streak } })
        }
      }
      // the team's total passes 100, 150, 200...: a quick scoreboard banner
      if (lastEv && getAnimPrefs().milestone) {
        const before = lastEv.score.runs - lastEv.total
        const mark = Math.floor(lastEv.score.runs / 50) * 50
        if (mark >= 100 && before < mark && lastEv.score.runs >= mark) {
          const t = match.sides[match.innings[lastEv.innings].battingSide].team
          later(() => showNote({ key: lastEv.seq + 0.3, tone: 'milestone', title: `${mark} UP`, sub: `${t.name} ${lastEv.score.runs}/${lastEv.score.wickets} in ${Math.floor(lastEv.score.legalBalls / 6)}.${lastEv.score.legalBalls % 6} overs` }))
        }
      }
      // single-ball extras: a stand of 50, 100..., and the odd review of a not-out
      if (lastEv && events.length === 1) {
        const prefs = getAnimPrefs()
        const spd = autoRef.current
        const rate = spd === 4 ? 0.55 : spd === 2 ? 0.75 : 1
        const delay = spd === 4 ? 150 : spd === 2 ? 250 : 450
        const innE = match.innings[lastEv.innings]
        const batT = match.sides[innE.battingSide].team
        const bowlS = match.sides[1 - innE.battingSide]
        const mark = prefs.milestone ? partnershipMark(innE.log, lastEv) : null
        if (mark) {
          const pt = partnershipAt(innE.log, lastEv)
          enqueueMoment({ key: lastEv.seq + 0.35, kind: 'partnership', player: match.player(pt.a.id), team: batT, title: `${mark} PARTNERSHIP`, lines: [], delay, ms: Math.round(4200 * rate), partnership: { a: match.player(pt.a.id), b: match.player(pt.b.id), team: batT, mark, runs: pt.runs, balls: pt.balls, aRuns: pt.a.runs, aBalls: pt.a.balls, bRuns: pt.b.runs, bBalls: pt.b.balls, rate } })
        }
        // a Test day with rain or bad light: play stops for a while (the overs it costs are already in the day's plan; this is the picture of it)
        if (prefs.drama && match.clock && match.clock.plan.lost > 0 && ['drizzle', 'rain', 'bad light'].includes(match.clock.plan.weather) && match.clock.ballsToday === Math.floor((match.clock.plan.scheduled * 6) * 0.45)) {
          enqueueMoment({ key: lastEv.seq + 0.98, kind: 'raindelay', player: match.player(lastEv.bowlerId), team: bowlS.team, title: 'RAIN STOPS PLAY', lines: [], delay: 600, ms: Math.round(getAnimPrefs().cheer ? SHOW_SECONDS.rain * 1000 * rate : RAIN_DELAY_SECONDS * 1000 * rate), rainDelay: { weather: match.clock.plan.weather as 'drizzle' | 'rain' | 'bad light', lost: match.clock.plan.lost, day: match.clock.day, rate }, stadium: getAnimPrefs().cheer ? { show: { kind: 'rain', seed: lastEv.seq, rain: match.clock.plan.weather === 'drizzle' ? 1 : 2, colors: [bowlS.team.colors.primary, bowlS.team.colors.secondary], lower: { title: match.clock.plan.weather === 'bad light' ? 'BAD LIGHT' : 'RAIN STOPS PLAY', lines: ['The players leave and the covers come on', `${match.clock.plan.lost} overs lost on day ${match.clock.day}`] } }, base: nowBase(), label: 'Rain', rate, cast: { team: bowlS.team, players: [], crew: 6 } } : undefined })
        }
        // a challenge: the huddle, the T signal, the picture and the verdict (the engine decided it; see engine/drs.ts)
        if (prefs.reviews && lastEv.review) challengeMoments(lastEv, rate, delay)
        // an appeal the umpire turned down (and nobody challenged), or a run out the third umpire found not out
        if (prefs.reviews && lastEv.appeal && !lastEv.appeal.out && !lastEv.review) turnedDownMoments(lastEv, rate, delay)
        // a batsman reaching the nineties
        if (prefs.milestone && !lastEv.wicket) {
          const bl = innE.batters.find((b) => b.id === lastEv.strikerId)
          if (bl && bl.runs - lastEv.runsBat < 90 && bl.runs >= 90 && bl.runs < 100) {
            const p = match.player(bl.id)
            enqueueMoment({ key: lastEv.seq + 0.5, kind: 'tension', player: p, team: batT, title: 'NERVOUS NINETIES', lines: [], delay, ms: Math.round(4200 * rate), tension: { variant: 'ninety', player: p, team: batT, title: 'NERVOUS NINETIES', sub: `${p.name} is on ${bl.runs}: ${100 - bl.runs} to a hundred`, rate } })
          }
        }
        // the end of an over: a swing in who is winning, a new phase of the game, and a small card for a big over
        if (prefs.drama && lastEv.legal && lastEv.score.legalBalls % 6 === 0 && !innE.done) {
          const done = lastEv.score.legalBalls / 6
          if (match.format !== 'test' && innE.index === 1 && lastEv.seq - lastSwing.current > 18) {
            const pts = winChanceSeries({ format: match.format, maxOvers: match.maxOvers, innings: match.innings }).filter((x) => x.innings === 1)
            const [a, b] = [pts[pts.length - 3], pts[pts.length - 1]]
            if (a && b && Math.abs(b.p - a.p) >= 0.22) {
              lastSwing.current = lastEv.seq
              enqueueMoment({ key: lastEv.seq + 0.52, kind: 'swing', player: match.player(lastEv.bowlerId), team: bowlS.team, title: 'MOMENTUM SHIFT', lines: [], delay, ms: Math.round(5000 * rate), swing: { chasing: batT, defending: bowlS.team, before: a.p, after: b.p, rate } })
            }
          }
          const ph = FORMATS[match.format].phases
          const variant = done === ph.powerplay[1] + 1 ? 'powerplay' : done === ph.death[0] ? 'death' : null
          if (variant) {
            const ctx = { format: match.format, maxOvers: FORMATS[match.format].overs, runs: lastEv.score.runs, legalBalls: lastEv.score.legalBalls, target: innE.target, freeHit: false, bowlType: null, hand: 'R' as const }
            enqueueMoment({ key: lastEv.seq + 0.53, kind: 'phase', player: match.player(lastEv.bowlerId), team: bowlS.team, title: variant === 'powerplay' ? 'POWERPLAY OVER' : 'DEATH OVERS', lines: [], delay, ms: Math.round(4600 * rate), phase: { variant, from: fieldPlan({ ...ctx, over: done - 1 }).spots, to: fieldPlan({ ...ctx, over: done }).spots, bowlTeam: bowlS.team, batTeam: batT, overs: done, runs: lastEv.score.runs, wickets: lastEv.score.wickets, rate } })
          }
          const thisOver = innE.log.filter((e) => e.over === lastEv.over)
          const overRuns = thisOver.reduce((s, e) => s + e.total, 0)
          const overWkts = thisOver.filter((e) => e.wicket).length
          const teamMark = Math.floor(lastEv.score.runs / 50) * 50
          const teamBanner = teamMark >= 100 && lastEv.score.runs - lastEv.total < teamMark
          if (!teamBanner && (overRuns >= 12 || overWkts >= 2)) later(() => showNote({ small: true, key: lastEv.seq + 0.2, tone: overWkts >= 2 ? 'wicket' : overRuns >= 18 ? 'six' : 'four', title: `Over ${done}: ${overRuns} ${overRuns === 1 ? 'run' : 'runs'}`, sub: `${match.player(lastEv.bowlerId).name}${overWkts ? ` · ${overWkts} ${overWkts === 1 ? 'wicket' : 'wickets'}` : ''}` }))
        }
      }
      // the strategic timeout: a TV screen for 30 seconds at set points in each innings (after the over is complete and nothing else is on)
      const timeoutMoment = () => {
        if (!lastEv || !getAnimPrefs().timeout || !lastEv.legal || lastEv.score.legalBalls % 6 !== 0) return
        const innE = match.innings[lastEv.innings]
        const done = lastEv.score.legalBalls / 6
        if (innE.done || match.isOver || !TIMEOUT_AFTER[match.format].includes(done)) return
        const spd = autoRef.current
        const seconds = spd === 4 ? 8 : spd === 2 ? 15 : 30
        const bt = match.sides[innE.battingSide].team
        const wt = match.sides[1 - innE.battingSide]
        const btSide = match.sides[innE.battingSide]
        // a game's highlight does not come back for the next 10 matches (the same games kept turning up)
        const cool = season ? cooledDown(season) : undefined
        const hl = fixture && season ? recentHighlight(season, fixture.id, 8, cool) : null
        // real footage: the best balls of a recent match, played again on the field view
        let reel: TimeoutReel | undefined
        // (if the cool-down leaves nothing, any recent innings will do: there is always a highlight)
        const cands = fixture && season ? (() => { const fresh = reelCandidates(season, fixture.id, 24, cool); return fresh.length ? fresh : reelCandidates(season, fixture.id, 24) })() : []
        const rl = pickReel(cands, shownReels.current, match.seed + shownReels.current.size * 7919 + lastEv.seq)
        const focus = rl ? playerIndex.get(rl.playerId) : undefined
        if (rl && focus) {
          const oppId = [rl.homeId, rl.awayId].find((id) => id && id !== focus.team.id) ?? rl.awayId
          const opp = oppId ? teamMap.get(oppId) : undefined
          if (opp) {
            const oppXI = opp.players.slice(0, 11)
            const ownXI = focus.team.players.slice(0, 11)
            const k = rl.kind
            const striker = k === 'bat' ? focus.player : (keyPlayers(oppXI).bat ?? oppXI[0])
            const nonStriker = (k === 'bat' ? ownXI : oppXI).find((p) => p.id !== striker.id) ?? null
            const bowler = k === 'bowl' ? focus.player : (keyPlayers(oppXI).bowl ?? oppXI[1] ?? oppXI[0])
            const batTeam = k === 'bat' ? focus.team : opp
            const bowlTeam = k === 'bat' ? opp : focus.team
            const ids = { striker: striker.id, nonStriker: nonStriker?.id ?? striker.id, bowler: bowler.id }
            reel = {
              player: focus.player, team: focus.team, kind: k, headline: rl.headline,
              versus: [teamMap.get(rl.homeId ?? '')?.name, teamMap.get(rl.awayId ?? '')?.name].filter(Boolean).join(' v ') + ` · ${formatDate(rl.date)}`, result: rl.result, scores: rl.scores, teamShort: focus.team.short,
              commentator: (() => { const o = studioPool.filter((x) => !match.sides.some((sd) => sd.team.id === x.team.id)); const c = o[(match.seed + lastEv.seq) % Math.max(1, o.length)]; return c ? { player: c.player, team: c.team } : undefined })(),
              balls: rl.balls.map((b, i) => toEvent(b, ids, i)), striker, nonStriker, bowler, battingTeam: batTeam, bowlingTeam: bowlTeam,
              fielders: placeFielders(k === 'bat' ? oppXI : ownXI, bowler.id),
            }
          }
        }
        // remember which game's highlight goes on air, so it sits out the next 10 matches
        const aired = reel && rl ? rl.fixtureId : hl ? hl.fixtureId : null
        if (aired) updateSeasonNow((s) => markShown(s, aired))
        const hp = hl ? playerIndex.get(hl.playerId) : undefined
        const fixtureTeams = hl ? [hl.homeId, hl.awayId].map((id) => (id ? (teamMap.get(id)?.name ?? '') : '')).filter(Boolean).join(' v ') : ''
        const watch = [keyPlayers(btSide.xi).bat && { player: keyPlayers(btSide.xi).bat!, team: bt, label: 'Top bat' }, keyPlayers(wt.xi).bowl && { player: keyPlayers(wt.xi).bowl!, team: wt.team, label: 'Top bowler' }].filter((x): x is { player: Player; team: Team; label: string } => !!x)
        const log = innE.log
        const fours = log.filter((e) => e.boundary === 4).length
        const sixes = log.filter((e) => e.boundary === 6).length
        const dots = log.filter((e) => e.legal && e.runsBat === 0 && !e.extraRuns).length
        const rr = innE.legalBalls ? ((innE.runs / innE.legalBalls) * 6).toFixed(2) : '0.00'
        const pt = partnershipAt(log, lastEv)
        const longest = Math.max(0, ...log.map((e) => e.distance ?? 0))
        const pitch = describePitch(match.pitch)
        const need = innE.target !== null ? innE.target - innE.runs : null
        const left = FORMATS[match.format].overs * 6 - innE.legalBalls
        const channels: TimeoutChannel[] = [
          ...(reel ? [] : [hl && hp
            ? { tag: 'Highlight from an earlier match', title: hp.player.name, big: hl.headline, lines: [hl.detail, [fixtureTeams, formatDate(hl.date)].filter(Boolean).join(' · '), hl.result], players: [{ player: hp.player, team: hp.team, label: hl.kind === 'bat' ? 'With the bat' : 'With the ball' }] }
            : { tag: 'Players to watch', title: 'No highlights yet: here is who to watch', lines: ['The best bat and the best bowler on show today'], players: watch }]),
          { tag: 'The innings so far', title: bt.name, big: `${innE.runs}/${innE.wickets}`, lines: [`${Math.floor(innE.legalBalls / 6)} overs · run rate ${rr}`, `${fours} ${fours === 1 ? 'four' : 'fours'} · ${sixes} ${sixes === 1 ? 'six' : 'sixes'} · ${dots} dot balls`, `The current stand: ${pt.runs} off ${pt.balls}`] },
          { tag: 'Tactics board', title: `${pitch.icon} ${pitch.label}`, lines: [pitch.tip, need !== null && need > 0 ? `${bt.short} need ${need} off ${left} balls` : `${bt.short} are looking for a big finish`] },
          { tag: 'Did you know?', title: 'A few numbers', lines: [`${btSide.team.short}'s XI averages ${teamStrength({ ...btSide.team, players: btSide.xi })}, ${wt.team.short}'s ${teamStrength({ ...wt.team, players: wt.xi })}`, longest > 0 ? `The longest six so far went ${longest} m` : `No six has been hit yet`, `${dots} of ${innE.legalBalls} balls have been dots (${innE.legalBalls ? Math.round((dots / innE.legalBalls) * 100) : 0}%)`] },
        ]
        // first the umpire stops play and signals the timeout, so it is plain that one has begun
        enqueueMoment({ key: lastEv.seq + 0.88, kind: 'stadium', player: match.player(lastEv.bowlerId), team: bt, title: 'STRATEGIC TIMEOUT', lines: [], delay: 500, ms: Math.round(SHOW_SECONDS.board * 1000 * (autoRef.current === 4 ? 0.55 : autoRef.current === 2 ? 0.75 : 1)), stadium: { show: { kind: 'board', seed: lastEv.seq, colors: [bt.colors.primary, bt.colors.secondary], board: { title: 'STRATEGIC TIMEOUT', sub: `After ${done} overs`, big: `${innE.runs}/${innE.wickets}`, rows: [{ label: 'Run rate', value: rr }, need !== null && need > 0 ? { label: `${bt.short} need`, value: `${need} off ${left}` } : { label: 'Projected', value: String(Math.round((innE.runs / Math.max(1, innE.legalBalls)) * FORMATS[match.format].overs * 6)) }, { label: 'Current stand', value: `${pt.runs} (${pt.balls})` }] } }, base: nowBase(), label: 'Strategic timeout', rate: autoRef.current === 4 ? 0.55 : autoRef.current === 2 ? 0.75 : 1 } })
        enqueueMoment({ key: lastEv.seq + 0.9, kind: 'timeout', player: match.player(lastEv.bowlerId), team: wt.team, title: 'STRATEGIC TIMEOUT', lines: [], delay: 200, ms: seconds * 1000, timeout: { headline: `After ${done} overs: ${innE.runs}/${innE.wickets}`, teamNames: [bt.name, wt.team.name], channels, seconds, rate: 1, reel } })
      }
      // screens that only break up the game, now and then: the cheerleaders, the stands, a huddle, fireworks after a boundary or a wicket,
      // and at the end of some overs the wave, the fan cam, the commentators or a blimp (never two within 30 balls)
      const cheerMoment = () => {
        if (!lastEv || events.length !== 1 || match.isOver || !getAnimPrefs().cheer || lastEv.seq - lastCheer.current < (lastEv.legal && lastEv.score.legalBalls % 6 === 0 ? 5 : 12)) return
        const innE = match.innings[lastEv.innings]
        const batT = match.sides[innE.battingSide].team
        const bowlS = match.sides[1 - innE.battingSide]
        const spd = autoRef.current
        const rate = spd === 4 ? 0.55 : spd === 2 ? 0.75 : 1
        const put = (ambient: AmbientInfo, ms: number, title: string, team: Team, caption?: string) => {
          lastCheer.current = lastEv.seq
          enqueueMoment({ key: lastEv.seq + 0.97, kind: 'ambient', player: match.player(lastEv.strikerId), team, title, lines: [], delay: 300, ms: Math.round(ms * rate), ambient, caption })
        }
        // the stadium shows: the camera leaves the live picture for the cheerleaders, the stands, the huddle or the fireworks
        const stadiumShow = (kind: ShowKind, team: Team, extra: Partial<StadiumShow>, title: string, caption?: string, cast?: Cast) => {
          lastCheer.current = lastEv.seq
          const show: StadiumShow = { kind, seed: lastEv.seq, colors: [team.colors.primary, team.colors.secondary], word: team.short, ...extra }
          enqueueMoment({ key: lastEv.seq + (kind === 'cheer' ? 0.96 : 0.97), kind: 'stadium', player: match.player(lastEv.strikerId), team, title, lines: [], delay: 300, ms: Math.round(SHOW_SECONDS[kind] * 1000 * rate), stadium: { show, base: replayBase(lastEv), label: title, rate, cast }, caption })
        }
        // what the commentary box says about the screen (the cheerleaders, the crowd, the stats desk...)
        const cap = (k: CaptionKind, ctx: CaptionCtx) => ambientCaption(k, ctx, lastEv.seq)
        const scorer = first(match.player(lastEv.strikerId).name)
        const teamMark = Math.floor(lastEv.score.runs / 50) * 50
        // a blow to the pad off a quick bowler: the physio runs on
        if (lastEv.extraType === 'legbye' && ballSpeed(lastEv, match.player(lastEv.bowlerId)) >= 118 && Math.sin(lastEv.seq * 2.9) > 0.35) {
          const hurt = match.player(lastEv.strikerId)
          stadiumShow('physio', batT, { left: hurt.hand === 'L', lower: { title: 'PHYSIO ON', lines: [`${hurt.name} takes a blow on the leg and needs a look`], chip: 'TREATMENT' } }, 'Physio on', undefined, { team: batT, players: [hurt], staff: { count: 1, tint: '#f8fafc' } })
          return
        }
        // the drinks break in a one-day match, twice an innings
        if (match.format === 'odi' && lastEv.legal && (lastEv.score.legalBalls === 90 || lastEv.score.legalBalls === 210) && !innE.done) {
          stadiumShow('drinks', bowlS.team, { lower: { title: 'DRINKS BREAK', lines: [`${lastEv.score.legalBalls / 6} overs gone: ${innE.runs}/${innE.wickets}`, 'The players take a drink and a breather'] } }, 'Drinks break', undefined, { team: bowlS.team, players: [], staff: { count: 4, tint: bowlS.team.colors.primary } })
          return
        }
        if (teamMark >= 100 && lastEv.score.runs - lastEv.total < teamMark && lastEv.score.runs >= teamMark && ambientPick(lastEv.seq, 2) === 0) { stadiumShow('fireworks', batT, {}, 'Fireworks', cap('fireworks', { team: batT.name, extra: `` })); return }
        if ((lastEv.boundary || lastEv.wicket) && cheersAfter(lastEv.seq)) {
          const team = lastEv.wicket ? bowlS.team : batT
          const pool = lastEv.wicket ? ['cheer', 'huddle', 'fans', 'dugout'] : lastEv.boundary === 6 && innE.legalBalls >= 90 ? ['cheer', 'stands', 'fireworks', 'fans', 'dugout'] : ['cheer', 'stands', 'fans', 'dugout']
          const v = pool[ambientPick(lastEv.seq, pool.length)]
          if (v === 'cheer') stadiumShow('cheer', team, { variant: cheerVariantFor(lastEv.seq), why: lastEv.wicket ? 'wicket' : 'boundary' }, 'Cheerleaders', cap(lastEv.wicket ? 'cheer-wicket' : 'cheer-boundary', { team: team.name, player: lastEv.wicket ? first(match.player(lastEv.bowlerId).name) : scorer }))
          else if (v === 'fans') stadiumShow('fans', team, { mood: lastEv.wicket && Math.sin(lastEv.seq * 5.1) > 0 ? 'groan' : 'cheer', lower: { title: 'IN THE STANDS', lines: [lastEv.wicket ? 'The crowd reacts to the wicket' : lastEv.boundary === 6 ? 'A six, and the fans go wild' : 'A four, and the fans love it'] } }, 'Fan cam')
          else if (v === 'dugout') {
            const dTeam = lastEv.wicket ? batT : batT
            // the whole squad is in the dressing room (the eleven and the bench, the ones already out too), apart from the two batsmen in the middle
            const mates = match.battingSide(innE).team.players.filter((p) => p.id !== lastEv.strikerId && p.id !== lastEv.nonStrikerId).slice(0, 18)
            stadiumShow('dugout', dTeam, { mood: lastEv.wicket ? 'groan' : 'cheer', lower: { title: 'IN THE DRESSING ROOM', lines: [lastEv.wicket ? `${dTeam.name} are stunned: the balcony goes quiet` : `${dTeam.name} are up on their feet on the balcony`] } }, 'Dressing room', undefined, { team: dTeam, players: mates, staff: { count: 1, tint: dTeam.colors.primary } })
          }
          else if (v === 'huddle') stadiumShow('huddle', team, {}, 'Huddle', cap('huddle', { team: team.name }))
          else if (v === 'fireworks') stadiumShow('fireworks', team, {}, 'Fireworks', cap('fireworks', { team: team.name, extra: 'big hit' }))
          else stadiumShow('stands', team, { sign: lastEv.boundary === 6 ? '6' : lastEv.boundary === 4 ? '4' : null, name: lastEv.wicket ? match.player(lastEv.bowlerId).name : match.player(lastEv.strikerId).name, why: lastEv.wicket ? 'wicket' : 'boundary' }, 'In the stands', cap(lastEv.wicket ? 'stands-bowling' : 'stands-batting', { team: team.name, player: lastEv.wicket ? first(match.player(lastEv.bowlerId).name) : scorer }))
          return
        }
        // a quiet moment at the end of an over
        if (lastEv.legal && lastEv.score.legalBalls % 6 === 0 && !innE.done && lastEv.seq - lastCheer.current >= 5 && ambientOver(lastEv.seq)) {
          const over = lastEv.score.legalBalls / 6
          // a bowler who has been hit about: the captain walks over for a word, and if it keeps happening he loses his temper (looks only)
          {
            const bid = lastEv.bowlerId
            const limit = match.format === 'test' ? 8 : match.format === 'odi' ? 10 : 12
            const runsIn = (o: number) => innE.log.filter((e) => e.over === o && e.bowlerId === bid).reduce((a, e) => a + e.total, 0)
            const mine = [...new Set(innE.log.filter((e) => e.bowlerId === bid).map((e) => e.over))].sort((a, b) => b - a)
            const capt = bowlS.team.players.find((p) => p.id === bowlS.team.captainId)
            if (getAnimPrefs().talks && capt && capt.id !== bid && bowlS.xi.some((p) => p.id === capt.id) && runsIn(lastEv.over) >= limit && lastEv.seq - lastTalk.current >= 18) {
              const prev = mine[1] !== undefined ? runsIn(mine[1]) : 0
              const angry = prev >= limit
              const bw = match.player(bid)
              lastTalk.current = lastEv.seq
              stadiumShow('talk', bowlS.team, { talk: angry ? 'angry' : 'encourage', lower: angry ? { title: 'THE CAPTAIN LOSES HIS TEMPER', lines: [`${first(capt.name)} cannot hide it: ${first(bw.name)} has gone for ${prev} and ${runsIn(lastEv.over)} in his last two overs`], chip: 'FRUSTRATION', color: '#f87171' } : { title: 'A WORD FROM THE CAPTAIN', lines: [`${first(capt.name)} walks over to ${first(bw.name)} after ${runsIn(lastEv.over)} off the over`], chip: 'KEEP YOUR HEAD UP', color: '#fbbf24' } }, angry ? 'Captain angry' : 'Captain encourages', undefined, { team: bowlS.team, players: [capt, bw] })
              return
            }
          }
          const chase = innE.target !== null ? { need: innE.target - innE.runs, balls: FORMATS[match.format].overs * 6 - innE.legalBalls } : null
          // now and then the numbers of the innings go up on screen instead: a wagon wheel, the worm, the runs of each over, how the runs came
          const stats = innE.log.length >= 18
          // a rivalry: this batsman and this bowler keep meeting. The two walk to the middle of the pitch and stand face to face, with how it has gone between them (looks only)
          if (getAnimPrefs().rivalry && lastEv.seq - lastTalk.current >= 18) {
            const bid = lastEv.bowlerId, sid = lastEv.strikerId
            const dkey = `duel:${innE.index}:${sid}:${bid}`
            if (!seen.current!.has(dkey)) {
              const nowBalls = innE.log.filter((e) => e.strikerId === sid && e.bowlerId === bid && e.legal).length
              const nowRuns = innE.log.filter((e) => e.strikerId === sid && e.bowlerId === bid).reduce((a, e) => a + e.runsBat, 0)
              const nowOuts = innE.log.filter((e) => e.strikerId === sid && e.bowlerId === bid && e.wicket).length
              const past = season ? duelBetween(season, sid, bid, match.format, fixture?.id) : { balls: 0, runs: 0, outs: 0, matches: 0 }
              if (nowBalls >= 10 || (past.outs >= 2 && nowBalls >= 4) || (past.balls >= 30 && nowBalls >= 4)) {
                seen.current!.add(dkey)
                lastTalk.current = lastEv.seq
                const bt = match.player(sid), bw = match.player(bid)
                const totBalls = past.balls + nowBalls, totRuns = past.runs + nowRuns, totOuts = past.outs + nowOuts
                const line = nowOuts > 0 ? `${first(bw.name)} has had ${first(bt.name)} out already today` : past.outs >= 2 ? `${first(bw.name)} has dismissed ${first(bt.name)} ${past.outs} times this season` : `${first(bt.name)} and ${first(bw.name)} are going head to head`
                stadiumShow('talk', bowlS.team, { talk: 'duel', left: bt.hand === 'L', lower: { title: `${first(bt.name)} v ${first(bw.name)}`, lines: [line], chip: 'RIVALRY', color: '#f87171', tiles: [{ label: 'Balls', value: String(totBalls) }, { label: 'Runs', value: String(totRuns) }, { label: 'Out', value: String(totOuts) }, { label: 'Strike rate', value: totBalls ? String(Math.round((totRuns / totBalls) * 100)) : '-' }] } }, 'Rivalry', undefined, { team: bowlS.team, players: [bw, bt] })
                return
              }
            }
          }
          const chartsOn = getAnimPrefs().charts
          // between overs it is always numbers or a chart (the crowd, the commentators and the fans have their own moments in the match)
          const pool = chartsOn ? ['pitchmap', 'beehive', 'projection', 'partnership', 'bowlers', ...(stats ? ['wagon', 'worm', 'manhattan', 'scoring', 'form'] : [])] : []
          if (pool.length === 0) return
          const v = pool[ambientPick(lastEv.seq + 1, pool.length)]
          const shots = innE.log.filter((e) => e.strikerId === lastEv.strikerId && e.runsBat > 0).length
          const si = { team: batT, log: innE.log, rate, title: '', other: innE.index > 0 ? match.innings[innE.index - 1].log : undefined, overs: FORMATS[match.format].overs, target: innE.target, names: Object.fromEntries([...batT.players, ...bowlS.team.players].map((p) => [p.id, callName(p)])) }
          if (v === 'wagon') put({ variant: 'wagon', stats: { ...si, other: undefined, batsman: shots >= 8 ? match.player(lastEv.strikerId) : undefined }, rate }, 6200, 'WAGON WHEEL', batT, cap('wagon', { team: batT.name, player: scorer }))
          else if (v === 'projection') put({ variant: 'projection', stats: si, rate }, 6200, 'PROJECTED SCORE', batT, cap('worm', { team: batT.name }))
          else if (v === 'partnership') put({ variant: 'partnership', stats: si, rate }, 5800, 'THE PARTNERSHIP', batT, cap('worm', { team: batT.name }))
          else if (v === 'bowlers') put({ variant: 'bowlers', stats: si, rate }, 6200, 'THE BOWLING', bowlS.team, cap('worm', { team: batT.name }))
          else if (v === 'form') put({ variant: 'form', stats: si, rate }, 6200, 'IN FORM', batT, cap('worm', { team: batT.name }))
          else if (v === 'worm') put({ variant: 'worm', stats: si, rate }, 6000, 'THE WORM', batT, cap('worm', { team: batT.name }))
          else if (v === 'manhattan') put({ variant: 'manhattan', stats: si, rate }, 5600, 'OVER BY OVER', batT, cap('manhattan', { team: batT.name }))
          else if (v === 'pitchmap') {
            const balls = innE.log.filter((e) => e.over === lastEv.over && e.innings === lastEv.innings).map((e) => { const spot = pitchSpot(e, deliveryOf(e, match.player(e.bowlerId), { overcast: stadium.weather === 'overcast' })); return { x: spot.x, z: spot.z, c: e.wicket ? '#ef4444' : e.boundary === 6 ? '#e879f9' : e.boundary === 4 ? '#38bdf8' : e.total > 0 ? '#e2e8f0' : '#94a3b8' } })
            stadiumShow('pitchmap', bowlS.team, { board: { title: 'THE OVER', sub: `${first(match.player(lastEv.bowlerId).name)} · over ${over}`, rows: [], map: { balls, legend: 'Grey: dot · White: runs · Blue: four · Pink: six · Red: wicket' } } }, 'Pitch map')
          }
          else if (v === 'beehive') {
            const balls = innE.log.filter((e) => e.over === lastEv.over && e.innings === lastEv.innings).map((e) => { const spot = stumpsSpot(e, deliveryOf(e, match.player(e.bowlerId), { overcast: stadium.weather === 'overcast' })); return { x: spot.x, y: spot.y, c: e.wicket ? '#ef4444' : e.boundary === 6 ? '#e879f9' : e.boundary === 4 ? '#38bdf8' : e.total > 0 ? '#e2e8f0' : '#94a3b8' } })
            stadiumShow('beehive', bowlS.team, { board: { title: 'BEEHIVE', sub: `${first(match.player(lastEv.bowlerId).name)} · over ${over}`, rows: [], hive: { balls, legend: 'Where each ball passed the stumps' } } }, 'Beehive')
          }
          else if (v === 'fans') stadiumShow('fans', batT, { mood: 'cheer', lower: { title: 'IN THE STANDS', lines: ['The fans are enjoying the cricket'] } }, 'Fan cam')
          else if (v === 'scoring') put({ variant: 'scoring', stats: si, rate }, 5600, 'HOW THE RUNS CAME', batT, cap('scoring', { team: batT.name }))
          else if (v === 'stands') stadiumShow('stands', batT, { sign: null, name: innE.batters.slice().sort((x, y) => y.runs - x.runs)[0] ? match.player(innE.batters.slice().sort((x, y) => y.runs - x.runs)[0].id).name : null }, 'In the stands', cap('stands-batting', { team: batT.name, player: scorer }))
          else if (v === 'social') {
            const best = [...innE.bowlers.entries()].sort((x, y) => y[1].wickets - x[1].wickets)[0]
            const top = [...innE.batters].sort((x, y) => y.runs - x.runs)[0]
            const posts = socialPosts({ bat: batT, bowl: bowlS.team, runs: lastEv.score.runs, wickets: lastEv.score.wickets, overs: `${over}.0`, striker: scorer, bowler: first(match.player(lastEv.bowlerId).name), top: top ? { name: first(match.player(top.id).name), runs: top.runs } : null, best: best ? { name: first(match.player(best[0]).name), wickets: best[1].wickets } : null, chase }, lastEv.seq)
            stadiumShow('social', batT, { posts, hashtag: `${batT.short}v${bowlS.team.short}` }, 'Fan wall', cap('social', { team: batT.name }))
          }
          else { const chat = boxChat(match, lastEv.seq); boxLines.current = chat; put({ variant: 'box', lines: chat, teams: [batT, bowlS.team], rate }, 10400, 'COMMENTARY BOX', batT) }
        }
      }
      const notable =
        events.find((e) => e.tags.some((t) => t === 'fifty' || t === 'hundred' || t === '150' || t === '200' || t === 'hat-trick' || t === 'five-wickets')) ??
        events.find((e) => e.wicket) ?? events.find((e) => e.boundary === 6) ?? events.find((e) => e.boundary === 4)
      if (!notable) { timeoutMoment(); cheerMoment(); finalMoments(); window.setTimeout(openWinWhenIdle, 0); return }
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
        const show = (m: Moment) => enqueueMoment(m)
        // a six gets a short screen of its own: the ball leaving the ground and how far it went
        if (notable.boundary === 6 && notable.distance && !notable.wicket && getAnimPrefs().six) {
          const hitter = match.player(notable.strikerId)
          const earlier = Math.max(0, ...inn.log.filter((e) => e.seq < notable.seq && e.strikerId === notable.strikerId && e.boundary === 6).map((e) => e.distance ?? 0), seasonStats?.bat.get(notable.strikerId)?.longSix ?? 0)
          const rate6 = sp === 4 ? 0.5 : sp === 2 ? 0.7 : 1
          show({ key: notable.seq + 0.25, kind: 'six', player: hitter, team, title: 'SIX!', lines: [], delay: Math.round(delay * 0.7), ms: Math.round(SIX_CAST_SECONDS * 1000 * rate6), sixCast: { replay: replayBase(notable), poor: (() => { const d = deliveryOf(notable, match.player(notable.bowlerId), { overcast: stadium.weather === 'overcast' }); return isPoorLength(d) ? LENGTH_WORDS[d.length] : undefined })(), batsman: hitter, team, distance: notable.distance, rate: rate6, contact: sixContact(notable, hitter.batting.power), longest: earlier > 0 && notable.distance > earlier, fire: notable.freeHit, move: getAnimPrefs().moves && isBigSix(notable) ? moveFor(hitter.id, team) ?? undefined : undefined } })
        }
        // the phantom camera: a very close, extra-slow look at the bat meeting the ball on some sixes, and at the stumps going on some bowled wickets
        if (getAnimPrefs().phantom && ((notable.boundary === 6 && Math.sin(notable.seq * 4.7) > 0.2) || (notable.wicket && (notable.wicket.kind === 'bowled') && Math.sin(notable.seq * 3.3) > 0.1))) {
          const hitterP = match.player(notable.strikerId), bowlerPh = match.player(notable.bowlerId)
          const bowlTP = match.sides[1 - match.innings[notable.innings].battingSide].team
          show({ key: notable.seq + 0.265, kind: 'phantomcast', player: notable.boundary === 6 ? hitterP : bowlerPh, team: notable.boundary === 6 ? team : bowlTP, title: 'PHANTOM CAM', lines: [], delay: Math.round(delay * 0.5), ms: Math.round(PHANTOM_CAST_SECONDS * 1000 * (sp === 4 ? 0.55 : sp === 2 ? 0.75 : 1)), phantomCast: { replay: replayBase(notable), what: notable.boundary === 6 ? 'six' : 'bowled', batsman: hitterP, batTeam: team, bowler: bowlerPh, bowlTeam: bowlTP, kmh: ballSpeed(notable, bowlerPh), rate: sp === 4 ? 0.55 : sp === 2 ? 0.75 : 1 } })
        }
        // a six: the camera cuts to the stands where it came down (a fan catches it, or they duck; or it clears the stadium)
        if (notable.boundary === 6 && getAnimPrefs().six && getAnimPrefs().cheer) {
          const hitter = match.player(notable.strikerId)
          const rate6 = sp === 4 ? 0.5 : sp === 2 ? 0.7 : 1
          const bs = replayBase(notable)
          const pl = planBall(notable, bs.fielders.map((f) => ({ id: f.player.id, x: f.x, y: f.y, spot: f.spot })), endPoint(notable, bs.fielders), bs.striker.hand === 'L', ballSpeed(notable, bs.bowler), { bowler: bs.bowler })
          const gone = !!notable.distance && sixReach(notable.distance) > 1.34
          const fan = Math.abs(Math.sin(notable.seq * 12.9898 + 78.233) * 43758.5453) % 1
          // out of the stadium: the camera chases the ball up over the roof and out over the city to where it comes down (a parked car, the river or a blimp)
          if (gone) {
            const outcome = (notable.distance ?? 0) >= SPACE_SIX_METRES ? spaceOutcome(notable.seq) : moonOutcome(notable.seq)
            const what = isSixScene(outcome) ? SIX_SCENE_TEXT[outcome] : outcome === 'satellite' ? 'It leaves the atmosphere and clips a satellite' : outcome === 'rocket' ? 'It climbs into space and hits a rocket on its way up' : outcome === 'car' ? 'It smashes into a parked car: the alarm is going off'  : 'It hits the blimp above the stadium'
            show({ key: notable.seq + 0.27, kind: 'stadium', player: hitter, team, title: (notable.distance ?? 0) >= SPACE_SIX_METRES ? 'INTO ORBIT!' : 'OUT OF THE STADIUM!', lines: [], delay: Math.round(delay * 0.5), ms: Math.round(SHOW_SECONDS.moonshot * 1000 * rate6), stadium: { show: { kind: 'moonshot', seed: notable.seq, colors: [team.colors.primary, team.colors.secondary], from: pl.meet, landing: pl.end, outcome, lower: (notable.distance ?? 0) >= SPACE_SIX_METRES ? { title: `INTO ORBIT! ${notable.distance} m`, lines: [what], chip: 'ORBITAL SIX', color: '#a78bfa' } : (notable.distance ?? 0) >= 150 ? { title: `MEGA SIX! ${notable.distance} m`, lines: [what], chip: 'MONSTER ENERGY MEGA SIX', color: '#7CFC00' } : { title: `OUT OF THE STADIUM! ${notable.distance ?? ''} m`.trim(), lines: [what], chip: 'MOON SHOT', color: '#f472b6' } }, base: bs, label: 'Out of the stadium', rate: rate6 } })
          } else
          show({ key: notable.seq + 0.27, kind: 'stadium', player: hitter, team, title: 'SIX!', lines: [], delay: Math.round(delay * 0.5), ms: Math.round(SHOW_SECONDS.landing * 1000 * rate6), stadium: { show: { kind: 'landing', seed: notable.seq, colors: [team.colors.primary, team.colors.secondary], landing: pl.end, caught: fan < 0.4, gone, lower: { title: `SIX! ${notable.distance ?? ''} m`.trim(), lines: [gone ? 'Out of the stadium!' : fan < 0.4 ? 'A fan takes it in the stands' : 'It crashes into the seats'] } }, base: bs, label: 'Six', rate: rate6 } })
        }
        // a wicket: the team runs to mob whoever took it, then the batsman walks off through the crowd (standing up for him after a big score)
        // a hat-trick or a five-wicket haul: the bowler runs to the crowd, kisses the ball and holds it up while the team mobs him
        if (notable.wicket && getAnimPrefs().wicketcam && notable.tags.some((t) => t === 'hat-trick' || t === 'five-wickets')) {
          const bw = match.player(notable.bowlerId), bowlT2 = match.sides[1 - match.innings[notable.innings].battingSide].team
          const hat = notable.tags.includes('hat-trick')
          show({ key: notable.seq + 0.58, kind: 'stadium', player: bw, team: bowlT2, title: hat ? 'HAT-TRICK!' : 'FIVE WICKETS!', lines: [], delay: Math.round(delay * 0.4), ms: Math.round(SHOW_SECONDS.salute * 1000 * (sp === 4 ? 0.55 : sp === 2 ? 0.75 : 1)), stadium: { show: { kind: 'salute', seed: notable.seq, colors: [bowlT2.colors.primary, bowlT2.colors.secondary], focus: hugFocusOf(notable.seq), celebrant: 'bowler', lower: { title: hat ? 'HAT-TRICK!' : 'FIVE WICKETS', lines: [`${bw.name} kisses the ball and shows it to the crowd`], chip: hat ? 'THREE IN THREE' : 'A FIVE-FOR' } }, base: replayBase(notable), label: hat ? 'Hat-trick' : 'Five wickets', rate: sp === 4 ? 0.55 : sp === 2 ? 0.75 : 1 } })
        }
        if (notable.wicket && outLine && getAnimPrefs().wicketcam) {
          const bs = replayBase(notable)
          const wk = notable.wicket
          const fi = wk.fielderId ? bs.fielders.findIndex((f) => f.player.id === wk.fielderId) : -1
          const celebrant: 'bowler' | number = fi >= 0 && wk.kind !== 'run out' ? fi : 'bowler'
          const focus = typeof celebrant === 'number' ? fielderWorld(bs.fielders[celebrant].x, bs.fielders[celebrant].y, bs.fielders[celebrant].spot) : { x: 0.8, y: 0, z: -22 + 3.5 }
          const rW = sp === 4 ? 0.55 : sp === 2 ? 0.75 : 1
          const bowlT = match.sides[1 - match.innings[notable.innings].battingSide].team
          show({ key: notable.seq + 0.55, kind: 'stadium', player: match.player(notable.bowlerId), team: bowlT, title: 'WICKET!', lines: [], delay: Math.round(delay * 0.4), ms: Math.round(SHOW_SECONDS.hug * 1000 * rW), stadium: { show: { kind: 'hug', seed: notable.seq, colors: [bowlT.colors.primary, bowlT.colors.secondary], focus, celebrant, lower: { title: 'WICKET!', lines: [dismissalText(match, outLine, match.innings[notable.innings])], chip: `${match.player(notable.bowlerId).name.split(' ')[0]}` } }, base: bs, label: 'Wicket', rate: rW } })
          const ov = outLine.runs >= 50
          show({ key: notable.seq + 0.56, kind: 'stadium', player: match.player(outLine.id), team, title: ov ? 'STANDING OVATION' : 'OUT', lines: [], delay: 0, ms: Math.round(SHOW_SECONDS.walkoff * 1000 * rW), stadium: { show: { kind: 'walkoff', seed: notable.seq, colors: [team.colors.primary, team.colors.secondary], left: match.player(outLine.id).hand === 'L', walk: { ovation: ov, duck: outLine.runs === 0 }, lower: { title: match.player(outLine.id).name, big: { value: String(outLine.runs), sub: String(outLine.balls) }, color: ov ? '#fbbf24' : outLine.runs === 0 ? '#f87171' : undefined, lines: [dismissalText(match, outLine, match.innings[notable.innings])], tiles: [{ label: 'Fours', value: String(outLine.fours) }, { label: 'Sixes', value: String(outLine.sixes) }, { label: 'Strike rate', value: String(strikeRate(outLine.runs, outLine.balls)) }], chip: ov ? (outLine.runs >= 100 ? 'A HUNDRED: STANDING OVATION' : 'STANDING OVATION') : outLine.runs === 0 ? 'A DUCK' : 'OUT' } }, base: bs, label: 'Walk off', rate: rW, cast: { team, players: [match.player(outLine.id)] } } })
        }
        if (battingMilestone && outLine) {
          // the two batsmen meet in the middle and bump fists, with the innings on it
          if (getAnimPrefs().milestone) {
            const mLines = [`${outLine.runs} off ${outLine.balls} balls`, `SR ${strikeRate(outLine.runs, outLine.balls)} · ${outLine.fours}x4 · ${outLine.sixes}x6`]
            const mRate = sp === 4 ? 0.55 : sp === 2 ? 0.75 : 1
            const partnerId = notable.strikerId === outLine.id ? notable.nonStrikerId : notable.strikerId
            const mates = match.battingSide(inn).team.players.filter((p) => p.id !== notable.strikerId && p.id !== notable.nonStrikerId).slice(0, 18) // (the whole squad, not only the batsmen still to come)
            const bigM = battingMilestone !== 'fifty'
            show({ key: notable.seq, kind: 'milestone', player: match.player(outLine.id), team, title: tagLabel[battingMilestone], big: bigM, delay, ms: Math.round(7200 * mRate),
              stadium: getAnimPrefs().cheer ? { show: { kind: 'milestone', seed: notable.seq, score: outLine.runs, colors: [team.colors.primary, team.colors.secondary], lower: { title: match.player(outLine.id).name, lines: mLines, chip: bigM ? 'A HUNDRED!' : 'A FIFTY!' } }, base: replayBase(notable), label: tagLabel[battingMilestone], rate: mRate, cast: { team, players: [match.player(outLine.id), ...mates] } } : undefined,
              lines: mLines,
              fist: { batsman: match.player(outLine.id), partner: partnerId && partnerId !== outLine.id ? match.player(partnerId) : null, team, title: tagLabel[battingMilestone], big: battingMilestone !== 'fifty', lines: mLines, rate: mRate } })
          }
          // a season record: the highest score, or the quickest fifty
          if (getAnimPrefs().drama && fixture && season) {
            const best = seasonBests(season)
            const nameOf = (id: string) => playerIndex.get(id)?.player.name ?? 'an earlier player'
            const batterP = match.player(outLine.id)
            const rec = (category: string, value: string, previous: string | undefined) => enqueueMoment({ key: notable.seq + 0.1, kind: 'record', player: batterP, team, title: 'RECORD!', lines: [], delay: 0, ms: Math.round(4800 * (sp === 4 ? 0.55 : sp === 2 ? 0.75 : 1)), record: { category, value, previous, player: batterP, team, rate: sp === 4 ? 0.55 : sp === 2 ? 0.75 : 1 } })
            if (best.highScore && outLine.runs > best.highScore.runs && outLine.runs >= 50) rec('Highest score of the season', `${outLine.runs}${outLine.dismissal ? '' : '*'}`, `The old mark was ${best.highScore.runs} by ${nameOf(best.highScore.id)}`)
            else if (battingMilestone === 'fifty' && best.fastestFifty && outLine.balls < best.fastestFifty.balls) rec('Fastest fifty of the season', `${outLine.balls} balls`, `The old mark was ${best.fastestFifty.balls} balls by ${nameOf(best.fastestFifty.id)}`)
          }
        } else if (notable.wicket && outLine) {
          // one screen for the wicket: how it happened, and his innings on a card
          const w = notable.wicket
          const bowlSideNow = match.sides[1 - match.innings[notable.innings].battingSide]
          const fielderP = w.fielderId ? match.player(w.fielderId) : null
          const bowlerP = match.player(notable.bowlerId)
          const rate = sp === 4 ? 0.5 : sp === 2 ? 0.7 : 1
          const wantReplay = getAnimPrefs().wicket
          const outLines = [dismissalText(match, outLine, inn), `${outLine.runs} (${outLine.balls}) · SR ${strikeRate(outLine.runs, outLine.balls)} · ${outLine.fours}x4 · ${outLine.sixes}x6`]
          const reviews = getAnimPrefs().reviews
          // a run out goes to the third umpire first; some lbw outs are reviewed by the batsman first
          if (reviews && w.kind === 'run out') { const gap = runOutGap(notable.seq); show({ key: notable.seq + 0.3, kind: 'runout', player: match.player(outLine.id), team, title: 'RUN OUT?', lines: [], delay: Math.round(delay * 0.6), ms: Math.round(9800 * rate), runout: { batsman: match.player(outLine.id), batTeam: team, fielder: fielderP, bowlTeam: bowlSideNow.team, cm: gap.cm, text: gap.text, rate, replay: replayBase(notable) } }) }
          if (reviews && !notable.review && w.kind === 'lbw') show({ key: notable.seq + 0.3, kind: 'review', player: match.player(outLine.id), team, title: 'REVIEW', lines: [], delay: Math.round(delay * 0.6), ms: Math.round(6200 * rate), review: { plain: true, by: 'bat', batsman: match.player(outLine.id), batTeam: team, bowler: bowlerP, bowlTeam: bowlSideNow.team, out: true, track: trackFor(notable.seq, true), rate } })
          const bowlIdx = (1 - match.innings[notable.innings].battingSide) as 0 | 1
          if (reviews && !notable.review && w.kind === 'caught' && w.fielderId && w.fielderId === match.keeperOf(bowlIdx)) show({ key: notable.seq + 0.32, kind: 'review', player: match.player(outLine.id), team, title: 'REVIEW', lines: [], delay: Math.round(delay * 0.6), ms: Math.round(10000 * rate), review: { plain: true, by: 'bat', kind: 'edge', batsman: match.player(outLine.id), batTeam: team, bowler: bowlerP, bowlTeam: bowlSideNow.team, out: true, track: trackFor(notable.seq, true), rate } })
          // the special wicket screens: how it happened, seen the way a broadcast would show it (they have their own switch)
          const prefsNow = getAnimPrefs()
          const fx = (type: WicketFxInfo['type'], extra: Record<string, unknown>, key: number) => show({ key: notable.seq + key, kind: 'wicketfx', player: match.player(outLine.id), team, title: 'WICKET', lines: [], delay: Math.round(delay * 0.6), ms: Math.round(WICKET_FX_SECONDS[type] * 1000 * rate), wfx: { type, batsman: match.player(outLine.id), batTeam: team, bowler: bowlerP, bowlTeam: bowlSideNow.team, rate, ...extra } as WicketFxInfo })
          if (prefsNow.wicketcam) {
            if (w.kind === 'bowled') fx('bowled', { ...bowledFor(notable.seq, bowlerP.bowling?.type), kmh: ballSpeed(notable, bowlerP) }, 0.33)
            else if (w.kind === 'stumped') fx('stumping', { keeper: fielderP, cm: stumpGap(notable.seq), replay: replayBase(notable), bowlTeam: bowlSideNow.team }, 0.34)
            else if (w.kind === 'hit wicket') fx('hitwicket', {}, 0.35)
            else if ((w.kind === 'caught' || w.kind === 'caught and bowled') && (w.kind === 'caught and bowled' ? bowlerP : fielderP) && w.fielderId !== match.keeperOf(bowlIdx)) {
              const spotNow = placedAt(notable).find((f) => f.player.id === w.fielderId)
              const out = spotNow ? Math.hypot((spotNow.x - 80) / 66, (spotNow.y - 50) / 40) : 0.5
              const catcher = (w.kind === 'caught and bowled' ? bowlerP : fielderP) as NonNullable<typeof fielderP>
              void catcher; void out // (a catch in the deep is the replay itself, and the reaction time is shown on it)
            }
          }
          // a catch in the deep (not the keeper's): the replay is the third umpire's rope check; any other catch shows the fielder's reaction time
          const catchBy = w.kind === 'caught and bowled' ? bowlerP : fielderP
          const spotNow2 = placedAt(notable).find((f) => f.player.id === w.fielderId)
          const outward = spotNow2 ? Math.hypot((spotNow2.x - 80) / 66, (spotNow2.y - 50) / 40) : 0.5
          const normalCatch = (w.kind === 'caught' || w.kind === 'caught and bowled') && !!catchBy && w.fielderId !== match.keeperOf(bowlIdx)
          const ropeCatch = normalCatch && w.kind === 'caught' && outward > 0.68 && prefsNow.wicketcam
          // a catch gets the broadcast replay with the contact analysis (where the ball met the bat, the bat speed, the timing); every other wicket keeps the stick-man replay
          const isCatch = (w.kind === 'caught' || w.kind === 'caught and bowled') && !!catchBy
          if (wantReplay && isCatch && catchBy) {
            const placed = placedAt(notable)
            const spotNow = placed.find((f) => f.player.id === w.fielderId)
            const dist = spotNow ? Math.hypot((spotNow.x - 80) * 0.72, (spotNow.y - 70) * 0.78) : 12
            const peakGuess = Math.min(12, 0.8 + dist * 0.17 + (Math.abs(Math.sin(notable.seq * 4.7 * 12.9898 + 78.233) * 43758.5453) % 1) * 4)
            const cause = catchCause({ seq: notable.seq, byKeeper: w.fielderId === match.keeperOf(bowlIdx), peak: peakGuess, dist })
            const lookNow = stadiumLook(match.sides[0].team, match.seed, match.format, match.clock?.plan.weather ?? null)
            show({
              key: notable.seq + 0.5, kind: 'catch', player: match.player(outLine.id), team, title: 'CAUGHT', lines: [], delay: Math.round(delay * 0.6), ms: Math.round(CATCH_SECONDS * 1000 * rate),
              catchInfo: { event: notable, kind: w.kind as 'caught' | 'caught and bowled', batsman: match.player(outLine.id), nonStriker: match.player(notable.nonStrikerId), bowler: bowlerP, fielder: catchBy, batTeam: team, bowlTeam: bowlSideNow.team, fielders: placed, pitch: pitchKind, look: lookNow, cause, contact: catchContact(notable.seq, cause, match.player(outLine.id).batting.power), reaction: normalCatch && !ropeCatch ? handsFor(notable.seq).reaction : undefined, score: `${outLine.runs} (${outLine.balls})`, rate },
            })
          } else if (w.kind === 'stumped' && prefsNow.wicketcam) {
            // (the stumping screen above is its replay)
          } else if (wantReplay && (w.kind === 'bowled' || w.kind === 'lbw' || w.kind === 'stumped' || w.kind === 'hit wicket' || w.kind === 'run out')) {
            // every other way of getting out also gets the broadcast replay, with three facts on how it happened
            const keeperP = match.keeperOf(bowlIdx) ? match.player(match.keeperOf(bowlIdx)!) : null
            show({
              key: notable.seq + 0.5, kind: 'wicketcast', player: match.player(outLine.id), team, title: 'WICKET', lines: [], delay: Math.round(delay * 0.6), ms: Math.round(WICKET_CAST_SECONDS * 1000 * rate),
              wicketCast: { replay: replayBase(notable), kind: w.kind, card: wicketCard(w.kind, notable.seq, { bowlerName: bowlerP.name, bowlerType: bowlerP.bowling?.type, kmh: ballSpeed(notable, bowlerP), keeperName: keeperP?.name, fielderName: fielderP?.name }), batsman: match.player(outLine.id), batTeam: team, score: `${outLine.runs} (${outLine.balls})`, how: outLines[0], rate },
            })
          } else if (wantReplay) show({
            key: notable.seq + 0.5, kind: 'replay', player: match.player(outLine.id), team, title: 'WICKET REPLAY', lines: [], delay: Math.round(delay * 0.6), ms: Math.round((ropeCatch ? 9200 : 6300) * rate),
            replay: { rope: ropeCatch ? catchFor(notable.seq) : undefined, reaction: normalCatch && !ropeCatch ? handsFor(notable.seq) : undefined, kind: w.kind, batsman: match.player(outLine.id), bowler: bowlerP, fielder: w.kind === 'caught and bowled' ? bowlerP : fielderP, spot: placedAt(notable).find((f) => f.player.id === w.fielderId) ?? null, batTeam: team, bowlTeam: bowlSideNow.team, rate, score: `${outLine.runs} (${outLine.balls})`, details: { lines: outLines, duck: outLine.runs === 0 }, track: w.kind === 'lbw' && !reviews ? trackFor(notable.seq, true) : undefined, card: { lines: outLines, duck: outLine.runs === 0 } },
          })
          // the bowler's big moments follow the replay: three in three balls, and five wickets
          const victimsOf = (n: number) => inn.log.filter((e) => e.wicket && e.wicket.kind !== 'run out' && e.bowlerId === notable.bowlerId).slice(-n).map((e) => ({ player: match.player(e.wicket!.playerId), team }))
          if (getAnimPrefs().drama) {
            // out on 99, 111, 222...; a pair in a Test; the end of a big stand
            if ([99, 111, 199, 222, 299, 333, 444].includes(outLine.runs)) fx('nelson', { runs: outLine.runs, balls: outLine.balls }, 0.52)
            if (match.format === 'test' && outLine.runs === 0) {
              const earlier = match.innings.filter((x) => x.battingSide === inn.battingSide && x.index < inn.index).map((x) => x.batters.find((b) => b.id === outLine.id)).find((b) => b?.dismissal && b.runs === 0)
              if (earlier) fx('pair', { king: earlier.balls <= 1 && outLine.balls <= 1 }, 0.53)
            }
            const stand = partnershipAt(inn.log.filter((e) => e.seq <= notable.seq), notable)
            if (stand.runs >= (match.format === 't20' ? 60 : 100)) {
              const partnerId = [stand.a.id, stand.b.id].find((id) => id !== outLine.id) ?? stand.b.id
              fx('stand', { partner: match.player(partnerId), runs: stand.runs, balls: stand.balls }, 0.51)
            }
          }
          if (wantReplay && outLine.runs === 0) show({ key: notable.seq + 0.55, kind: 'duck', player: match.player(outLine.id), team, title: 'DUCK!', lines: [], delay: 0, ms: Math.round(3200 * rate), duck: { batsman: match.player(outLine.id), batTeam: team, bowler: bowlerP, bowlTeam: bowlSideNow.team, golden: outLine.balls <= 1, balls: outLine.balls, rate } })
          if (wantReplay && notable.tags.includes('hat-trick')) show({ key: notable.seq + 0.6, kind: 'hattrick', player: bowlerP, team: bowlSideNow.team, title: 'HAT-TRICK!', lines: [], delay: 0, ms: Math.round(5200 * rate), hattrick: { bowler: bowlerP, bowlTeam: bowlSideNow.team, victims: victimsOf(3), rate } })
          if (wantReplay && notable.tags.includes('five-wickets')) {
            const ln = inn.bowlers.get(notable.bowlerId)
            show({ key: notable.seq + 0.7, kind: 'haul', player: bowlerP, team: bowlSideNow.team, title: 'FIVE-FOR!', lines: [], delay: 0, ms: Math.round(5000 * rate), haul: { bowler: bowlerP, bowlTeam: bowlSideNow.team, victims: victimsOf(5), figures: { wickets: ln?.wickets ?? 5, runs: ln?.runs ?? 0, overs: ln ? `${Math.floor(ln.legalBalls / 6)}.${ln.legalBalls % 6}` : '' }, rate } })
          }
          // two wickets in two balls: the next ball is a hat-trick ball
          if (wantReplay && !notable.tags.includes('hat-trick')) {
            const last2 = inn.log.filter((e) => e.bowlerId === notable.bowlerId && e.legal).slice(-2)
            const next = inn.batters[inn.batters.length - 1]
            if (last2.length === 2 && last2.every((e) => e.wicket && e.wicket.kind !== 'run out') && next && !inn.done && !match.isOver) {
              const nb = match.player(next.id)
              show({ key: notable.seq + 0.65, kind: 'tension', player: bowlerP, team: bowlSideNow.team, title: 'HAT-TRICK BALL', lines: [], delay: 0, ms: Math.round(4200 * rate), tension: { variant: 'hattrick', player: bowlerP, team: bowlSideNow.team, other: nb, otherTeam: team, title: 'HAT-TRICK BALL!', sub: `${bowlerP.name} is on two in two. ${nb.name} faces it`, rate } })
            }
          }
          // the best bowling of the season
          if (getAnimPrefs().drama && fixture && season) {
            const ln = inn.bowlers.get(notable.bowlerId)
            const best = seasonBests(season).bestBowling
            if (ln && ln.wickets >= 3 && best && (ln.wickets > best.wickets || (ln.wickets === best.wickets && ln.runs < best.runs))) {
              enqueueMoment({ key: notable.seq + 0.81, kind: 'record', player: bowlerP, team: bowlSideNow.team, title: 'RECORD!', lines: [], delay: 0, ms: Math.round(4800 * rate), record: { category: 'Best bowling of the season', value: `${ln.wickets}/${ln.runs}`, previous: `The old mark was ${best.wickets}/${best.runs} by ${playerIndex.get(best.id)?.player.name ?? 'an earlier player'}`, player: bowlerP, team: bowlSideNow.team, rate } })
            }
          }
        } else if (milestone && outLine) {
          later(() => showNote({ key: notable.seq, tone: 'milestone', title: tagLabel[milestone], sub: `${match.player(notable.bowlerId).name}` })) // hat-trick or a five-wicket haul
        }
        void who
      }
      if (milestone) later(() => showFx({ key: notable.seq, kind: 'milestone', text: milestone === 'hat-trick' || milestone === 'five-wickets' ? tagLabel[milestone] : '', colors }))
      else if (notable.wicket) later(() => showFx({ key: notable.seq, kind: 'wicket', text: '', colors }))
      else if (notable.boundary === 6) later(() => showFx({ key: notable.seq, kind: 'six', text: 'SIX!', colors }))
      else later(() => showFx({ key: notable.seq, kind: 'four', text: 'FOUR!', colors }))
      timeoutMoment()
      cheerMoment()
      finalMoments()
      window.setTimeout(openWinWhenIdle, 0)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [match, showFx, showNote, enqueueMoment, clearMoments, openWinWhenIdle, fixture, season, playerIndex, teamMap],
  )
  // between the innings the next innings' introductions wait too (this is true from the very render the innings ends)
  const holdNow = !match.isOver && (breakOpen || match.current.index > seenInnings.current || match.awaiting !== null) // (a Test also waits at stumps and for the follow-on call)
  const breakRef = useRef(false)
  breakRef.current = holdNow
  const announce = useCallback(
    (events: BallEvent[]) => {
      announceEvents(events)
      // whoever has just come on gets introduced: not while the innings break is on, and not on the very ball that ended the innings
      // (breakRef only catches up on the next render, so ask the match itself whether the innings has just moved on)
      const inningsJustEnded = match.current.index > seenInnings.current
      if (!match.isOver && events.length <= 12 && !breakRef.current && !inningsJustEnded) enqueueIntros()
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
      if (holdRef.current && ['ball', 'over', 'overs', 'wicket', 'innings', 'match', 'intent', 'bowler', 'style', 'shot', 'delivery', 'session', 'day', 'declare'].includes(a.t)) return // nothing is played until Next innings (or Next day) is pressed
      if (a.t === 'forfeit') sfx.sadTrombone()
      else if (a.t !== 'ball') sfx.tick()
      // Animations are never cut short: pressing Next ball while screens are still waiting moves on to the next one instead of playing the ball.
      // Only a ball (or a bigger sim) that actually plays takes over; changing the tactics, the aim or the bowler leaves what is on screen alone.
      if (a.t === 'ball' && queue.current.length > 0) { sfx.tick(); dismissMoment(); return }
      if (['ball', 'over', 'overs', 'wicket', 'innings', 'match', 'session', 'day'].includes(a.t)) clearMoments()
      const events = applyAction(match, a)
      liveAct(a)
      announce(events)
    },
    [match, liveAct, announce, clearMoments, dismissMoment],
  )

  // Starting auto-play again closes a dismissal that was being held on screen.
  const wasAuto = useRef(auto)
  useEffect(() => {
    if (auto && !wasAuto.current) dismissMoment()
    wasAuto.current = auto
  }, [auto, dismissMoment])

  // the result of the ball is shown once its clip and every screen for it have played (or when somebody moves on)
  useEffect(() => {
    if (revealHold === null) return
    const started = Date.now()
    const id = window.setInterval(() => {
      // only the screens that decide the ball (appeal, challenge, run-out check) keep the result back; the replays and cheers that follow it do not
      const deciding = (m: Moment | null) => !!m && DECIDING.has(m.kind) && m.key >= revealHold && m.key < revealHold + 1
      const waiting = deciding(current.current) || queue.current.some((m) => deciding(m)) || (getBroadcastView() && clipNow.until > Date.now())
      if (!waiting || Date.now() - started > 20000) { setRevealHold(null); flushOutcome() }
    }, 120)
    return () => window.clearInterval(id)
  }, [revealHold, flushOutcome])

  // Auto-play: one ball at a time at the chosen speed, but linger on the moments that matter
  // (wickets, boundaries, milestones) so the celebration, banner and sound have time to land.
  // (the timer must not be restarted by every redraw of the page: it would never fire if something keeps redrawing, so the effect calls the newest `act` through a ref)
  const actRef = useRef(act)
  actRef.current = act
  const lastStep = useRef(0)
  const [kick, setKick] = useState(0)
  useEffect(() => {
    if (!auto || phase !== 'play' || match.isOver) return
    let timer = 0
    const step = () => {
      lastStep.current = Date.now()
      // wait while a wicket, milestone or introduction is on screen
      if (holdRef.current) { setAuto(0); return } // between innings nothing plays by itself
      // a screen that has stayed up long after its time (its timer was lost) is closed, or auto-play would wait for it for ever
      if (current.current && busyUntil.current !== Infinity && Date.now() > busyUntil.current + 4000) { dismissMoment(); timer = window.setTimeout(step, 120); return }
      // never play on while a screen is up or still waiting its turn (a ball played now would cut the rest short)
      if (current.current || queue.current.length > 0) { timer = window.setTimeout(step, 120); return }
      const wait = busyUntil.current - Date.now()
      if (wait > 0) { timer = window.setTimeout(step, Math.min(wait, 500)); return }
      // the commentators finish what they are saying first
      if (getVoiceMode() === 'full' && voiceBusy()) { timer = window.setTimeout(step, 200); return }
      // the broadcast view's clip of the last ball has to finish first
      const clipLeft = getBroadcastView() ? clipNow.until - Date.now() : 0
      if (clipLeft > 0) { timer = window.setTimeout(step, Math.min(clipLeft, 300)); return }
      const innings = match.current.index
      actRef.current({ t: 'ball' })
      if (match.isOver) return
      // stop where the options say to (wicket, boundary, end of an innings)
      const ev = match.events[match.events.length - 1]
      const st = stopsRef.current
      if ((match.current.index !== innings && st.innings) || (ev?.wicket && st.wickets) || (ev?.boundary && st.boundaries)) { setAuto(0); return }
      timer = window.setTimeout(step, delayAfter(match.events[match.events.length - 1], auto))
    }
    lastStep.current = Date.now()
    timer = window.setTimeout(step, 1300 / auto)
    return () => window.clearTimeout(timer)
  }, [auto, phase, match, kick, dismissMoment])
  // a safety net: if auto-play is on and nothing has been tried for a long while (a lost timer), start it again
  useEffect(() => {
    if (!auto || phase !== 'play' || match.isOver) return
    const id = window.setInterval(() => {
      if (holdRef.current) return
      if (Date.now() - lastStep.current > 9000) { lastStep.current = Date.now(); setKick((k) => k + 1) }
    }, 2000)
    return () => window.clearInterval(id)
  }, [auto, phase, match])
  useEffect(() => () => { window.clearTimeout(voiceTimer.current); cancelSpeech() }, [])
  // the murmur of the stadium while a match is being played (with the crowd and fun screens on; the sound switch mutes it)
  useEffect(() => {
    if (phase !== 'play' || match.isOver || !getAnimPrefs().cheer) { stopCrowd(); return }
    startCrowd()
    return () => stopCrowd()
  }, [phase, match.isOver])
  // the commentary is on by default: the first time a match is played, ask the phone's owner before the game speaks
  useEffect(() => {
    const m = getVoiceMode()
    if (phase === 'play' && m !== 'off' && getVoiceConsent() === 'unknown') askVoice(m, true)
  }, [phase])
  useEffect(() => () => { window.clearTimeout(fxTimer.current); window.clearTimeout(noteTimer.current); window.clearTimeout(motmTimer.current) }, []) // (the moment timer is left to finish: it only walks the queue)

  // Keyboard: Space = next ball, O = finish the over, P = pause or resume auto-play.
  useEffect(() => {
    if (phase !== 'play') return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (e.metaKey || e.ctrlKey || e.altKey || ['INPUT', 'SELECT', 'TEXTAREA'].includes(t.tagName) || match.isOver) return
      if (e.code === 'Space' && holdRef.current) { e.preventDefault(); setBreakOpen(false); if (match.awaiting === 'day') act({ t: 'nextday' }) }
      else if (e.code === 'Space' && manualRef.current) e.preventDefault() // manual play: choosing the aim is what plays the ball
      else if (e.code === 'Space') { e.preventDefault(); if (t.tagName === 'BUTTON') t.blur(); act({ t: 'ball' }) }
      else if (e.key === 'o' || e.key === 'O') act({ t: 'over' })
      else if ((e.key === 'p' || e.key === 'P') && !manual) setAuto((a) => (a === 0 ? 1 : 0))
      else if (e.key === 'c' || e.key === 'C') setControlsOpen((o) => !o)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, match, act, manual])

  // the studio show's guests: the best few players of every team, so the pundits are faces you know (the script keeps teams that are playing off the desk)
  const studioPool = useMemo(() => everyTeam.flatMap((t) => [...t.players].sort((a, b) => overall(b) - overall(a)).slice(0, 4).map((player) => ({ player, team: t }))), [everyTeam])

  if (phase === 'lineup') return <LineupWalkout key="lineup" show={{ kind: 'lineup', seed: match.seed, colors: [match.sides[0].team.colors.primary, match.sides[0].team.colors.secondary], toss: { winner: match.toss.winnerSide, bat: match.toss.decision === 'bat' }, lower: { title: 'THE TOSS', lines: [`${match.sides[match.toss.winnerSide].team.name} won the toss and chose to ${match.toss.decision}`, `${match.sides[0].team.name} v ${match.sides[1].team.name}`] } }} base={nowBase()} cast={{ team: match.sides[0].team, players: match.sides[0].xi, rivals: { team: match.sides[1].team, players: match.sides[1].xi } }} onDone={() => { setPhase('play'); setLivePhase('play') }} />
  if (phase === 'pre') {
    // a career match opens with its tournament: the trophy, the standings, last year's winners
    if (fixture && season && !tourneyDone && getAnimPrefs().intro) {
      const data = tournamentIntro(season, history, fixture, teamMap)
      if (data) return <TournamentIntro data={data} name={competitionName(data.competition, teamMap)} fixture={fixture} sides={match.sides} mySide={match.mySide} teams={teamMap} onDone={() => setTourneyDone(true)} />
    }
    const bigMatch = !!fixture && fixture.phase === 'knockout' && /final/i.test(fixture.stage)
    if (bigMatch && !bigDone && getAnimPrefs().intro && fixture) {
      const c = season?.competitions.find((x) => x.id === fixture.competitionId)
      return <BigMatchIntro sides={match.sides} competition={c ? competitionName(c, teamMap) : ''} stage={fixture.stage.replace(/ \d+$/, '')} onDone={() => setBigDone(true)} />
    }
    const seasons = fixture && season ? [...(history ?? []), season] : null
    const [sa, sb] = match.sides
    const compName = fixture ? (() => { const c = season?.competitions.find((x) => x.id === fixture.competitionId); return c ? competitionName(c, teamMap) : '' })() : ''
    return (
      <MatchPreview
        sides={match.sides} mySide={match.mySide} subtitle={fixture ? `${compName} · ${fixture.stage}` : `Friendly · ${match.format.toUpperCase()}`}
        forms={seasons ? [formOf(seasons, sa.team.id), formOf(seasons, sb.team.id)] : null}
        h2h={seasons ? headToHead(seasons, sa.team.id, sb.team.id) : null}
        extra={(() => { const pi = describePitch(match.pitch); return <div className="inline-flex max-w-full items-start gap-2 rounded-2xl bg-white/5 px-3 py-1.5 text-left"><span className="text-lg" aria-hidden>{pi.icon}</span><span className="text-sm leading-snug"><b className="text-white">{pi.label}.</b> <span className="text-slate-300">{pi.tip}</span></span></div> })()}
        onNext={() => setPhase('toss')}
        onCancel={() => { navigate(fixture ? `${paths.session(fixture.date.slice(0, 7))}?day=${fixture.date}` : paths.play); window.setTimeout(discardLive, 0) }}
      />
    )
  }
  const boostInfo = boostSummary([...(session?.history ?? []), ...(session ? [session.season] : [])], session?.boost, session?.season.difficulty)
  if (phase === 'toss') return <CoinToss renderReport={(close) => { return <ShowScreen show={{ kind: 'pitchreport', seed: match.seed, colors: [match.sides[0].team.colors.primary, match.sides[0].team.colors.secondary], lower: pitchReportLower(match.pitch) }} base={nowBase()} label="Pitch report" cast={{ team: match.sides[0].team, players: [], host: PRESENTERS[(match.seed + 3) % PRESENTERS.length] }} onDone={close} /> }} boost={match.mySide !== null && !live.replay && boostInfo.allowed ? { available: boostInfo.available, on: !!live.boost, onChange: setLiveBoost } : undefined} sides={match.sides} toss={match.toss} pitch={match.pitch} mySide={match.mySide} tossed={!!live.tossed} startXI={live.startXI} onTossed={setTossed} editable={editableSides} careerSquad={!!live.myTeamId} onSaveSquad={(side, order, cap, keep) => { setLiveSquad(side, order, cap, keep); if (live.myTeamId && match.mySide === side) updateSeasonForSquad((s) => ({ ...s, lineup: { order, captainId: cap, keeperId: keep } })) /* your lineup is kept for the rest of the career */ }} news={live.news} mustChoose={!live.tossChoice && !(live.myTeamId && match.mySide === null) && (match.mySide === null || match.mySide === match.toss.winnerSide)} onChoose={setTossChoice} onCancel={() => { navigate(fixture ? `${paths.session(fixture.date.slice(0, 7))}?day=${fixture.date}` : paths.play); window.setTimeout(discardLive, 0) /* after we've left, or this page would start the match again */ }} onStart={() => { if (getAnimPrefs().intro) setPhase('lineup'); else { setPhase('play'); setLivePhase('play') } }} />

  // between the innings the screen stays on the first innings until you press Next innings
  const holding = holdNow
  holdRef.current = holding
  // the innings break panel waits until the last wicket or ball of the innings has had its screens
  const showBreak = holding && !moment
  // (a Test shows the innings that has just finished while it waits, or the live one at stumps)
  const holdText = match.awaiting === 'day' ? 'Next day' : 'Next innings'
  /** Press the hold button: start the next day, or the next innings (the follow-on call has a prompt of its own). */
  const resume = () => {
    if (match.awaiting === 'day') { act({ t: 'nextday' }); setBreakOpen(false); setBreakPopup(false) }
    else if (match.awaiting === null) setBreakOpen(false)
  }
  match.hold = holding ? (match.format === 'test' ? (match.awaiting ? match.current.index : Math.max(0, match.current.index - 1)) : 0) : null
  // what the screen shows: the match as it stood before the ball that is still being shown (see revealHold)
  const view = revealHold === null ? match : matchBefore(match, revealHold)
  const inn = view.shown
  const batSide = view.battingSide(inn)
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
  const bowlSide = view.bowlingSide(inn)
  const last = match.events[match.events.length - 1] ?? null
  const lastHere = last && last.innings === inn.index ? last : null
  // the two batsmen of the last ball: the broadcast picture keeps showing them (not whoever is on strike now), so when the over ends and the strike changes the
  // picture does not swap their faces: a fifty reached off the last ball of an over is still celebrated by the right batsman
  const clipWho = lastHere && !lastHere.wicket ? { clipStriker: match.player(lastHere.strikerId), clipNonStriker: match.player(lastHere.nonStrikerId) } : {}
  // the broadcast's score bug: the score, the two batsmen, the bowler and what a chase needs
  const bugBat = (id: string) => { const line = inn.batters.find((b) => b.id === id); return line ? { name: callName(match.player(id)), runs: line.runs, balls: line.balls, strike: id === inn.strikerId } : null }
  const bugBowlerId = inn.bowlerId ?? lastHere?.bowlerId ?? null
  const bugBowl = bugBowlerId ? inn.bowlers.get(bugBowlerId) : undefined
  const caption = lastHere ? commentary(lastHere, { striker: match.player(lastHere.strikerId).name, bowler: match.player(lastHere.bowlerId).name, out: lastHere.wicket ? match.player(lastHere.wicket.playerId).name : undefined, fielder: lastHere.wicket?.fielderId ? match.player(lastHere.wicket.fielderId).name : undefined }) : null
  // how worn the pitch is: a Test builds it up over the five days (about 450 overs); a limited-overs match only a little
  const pitchWear = match.clock ? Math.min(1, (((match.clock.day - 1) * 90 * 6) + match.clock.ballsToday) / (5 * 90 * 6)) : Math.min(0.25, (match.innings[0].legalBalls + (match.innings[1]?.legalBalls ?? 0)) / (match.maxOvers * 12) * 0.25)
  const scoreBug = {
    team: batSide.team.short, runs: inn.runs, wickets: inn.wickets, balls: inn.legalBalls,
    batters: [bugBat(inn.strikerId), bugBat(inn.nonStrikerId)].filter((b): b is NonNullable<ReturnType<typeof bugBat>> => !!b),
    bowler: bugBowlerId && bugBowl ? { name: callName(match.player(bugBowlerId)), figures: `${bugBowl.wickets}/${bugBowl.runs}` } : null,
    lastKmh: lastHere ? ballSpeed(lastHere, match.player(lastHere.bowlerId)) : null,
    need: inn.target !== null && inn.target - inn.runs > 0 ? `Need ${inn.target - inn.runs} off ${match.maxOvers * 6 - inn.legalBalls}` : null,
    // the TV extras: the partnership, the chasing side's chance of winning, and the bowler's figures at the end of an over
    stand: lastHere && inn.log.some((e) => e.seq === lastHere.seq) ? (() => { const pt = partnershipAt(inn.log, lastHere); return pt.runs > 0 ? `${pt.runs} (${pt.balls})` : null })() : null,
    win: inn.index === 1 && inn.target !== null && match.format !== 'test' && !view.isOver ? (() => { const ser = winChanceSeries({ format: match.format, maxOvers: match.maxOvers, innings: view.innings }); const p = ser[ser.length - 1]?.p; return p === undefined ? null : { team: batSide.team.short, pct: Math.round(p * 100) } })() : null,
    spell: lastHere && inn.log.some((e) => e.seq === lastHere.seq) && lastHere.legal && lastHere.score.legalBalls % 6 === 0 && lastHere.score.legalBalls > 0 && !view.isOver && inn.bowlers.get(lastHere.bowlerId) ? (() => { const l = inn.bowlers.get(lastHere.bowlerId)!; return { key: lastHere.seq, name: callName(match.player(lastHere.bowlerId)), figures: `${Math.floor(l.legalBalls / 6)}-${l.maidens}-${l.runs}-${l.wickets}`, over: Math.floor(l.legalBalls / 6) } })() : null,
  }
  // a free hit: the ball about to be bowled ('next') or the one just bowled, whose outcome is on the field ('ball')
  const freeHitState: 'next' | 'ball' | null = view.isOver ? null : inn.freeHit ? 'next' : lastHere?.freeHit ? 'ball' : null
  const striker = view.player(inn.strikerId)
  const nonStriker = view.player(inn.nonStrikerId)
  const bowlerId = inn.bowlerId ?? inn.prevBowlerId ?? bowlSide.xi.find((p) => p.bowling)?.id ?? bowlSide.xi[0].id
  const bowler = match.player(bowlerId)
  const displayOver = inn.legalBalls % 6 === 0 && inn.legalBalls > 0 && inn.bowlerId !== null && !inn.log.some((e) => e.over === view.over) ? view.over - 1 : view.over
  const overEvents = inn.log.filter((e) => e.over === displayOver)
  // the field for this stage of the game (scenery only: the engine never reads it)
  noMirrorRef.current = userBats && (manual || swipeOn)
  // your players whose rating rose in this match (a career match only, once its result is saved)
  const upgrades: UpgradeRow[] = (() => {
    if (!match.isOver || !fixture || !season?.myTeamId) return []
    const mine = new Set(match.sides.flatMap((x) => (x.team.id === season.myTeamId ? x.xi.map((p) => p.id) : [])))
    return upgradesFrom(season.changes?.[fixture.id], mine, (id) => { const e = playerIndex.get(id); return e ? overall(e.player) : null })
      .flatMap((u) => { const e = playerIndex.get(u.playerId); return e ? [{ player: e.player, team: e.team, before: u.before, after: u.after }] : [] })
  })()
  // chasing in the last two overs: what is needed
  const chase = inn.target !== null && !view.isOver && match.format !== 'test' ? { need: inn.target - inn.runs, balls: FORMATS[match.format].overs * 6 - inn.legalBalls, wickets: 10 - inn.wickets } : null
  const plan = fieldPlan({
    format: match.format, over: displayOver, maxOvers: FORMATS[match.format].overs, runs: inn.runs, legalBalls: inn.legalBalls, target: inn.target,
    freeHit: freeHitState !== null, bowlType: bowler.bowling?.type ?? null, hand: striker.hand, noMirror: noMirrorRef.current,
  })
  const inningsBreak = match.format !== 'test' && inn.index === 1 && inn.legalBalls === 0 && !view.isOver
  const cfg = FORMATS[match.format]
  const pom = awards?.motm ?? null
  // a final your team has won: the long tournament celebration plays after the winners' screen
  const champComp = fixture && fixture.stage === 'Final' && match.isOver && match.mySide !== null && match.result?.winnerSide === match.mySide ? season?.competitions.find((c) => c.id === fixture.competitionId && c.kind !== 'series') : undefined
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
  const compNameOf = (f: NonNullable<typeof fixture>) => { const c = season?.competitions.find((x) => x.id === f.competitionId); return c ? competitionName(c, teamMap) : '' }
  const showUpgrades = () => { if (upgrades.length > 0 && !upgradesSeen.current) { upgradesSeen.current = true; window.setTimeout(() => setUpgradesOpen(true), 250) } }
  const resultCard = view.isOver && match.result ? (
<motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl border border-amber-400/60 bg-gradient-to-r from-amber-500/20 to-fuchsia-500/10 p-5 text-center">
          <div className="font-display text-4xl tracking-wide text-amber-300">{match.result.text}</div>
          {getAnimPrefs().highlights && <button onClick={() => setHighlightsOpen(true)} className="cta-pulse cta-pulse-gold mt-3 cursor-pointer rounded-full border-2 border-amber-200 bg-gradient-to-b from-amber-300 to-amber-500 px-6 py-2.5 font-display text-2xl leading-none tracking-wide text-black shadow-lg active:scale-[0.98]">▶ Watch highlights</button>}
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
      <AnimatePresence>{highlightsOpen && match.isOver && <Highlights match={match} look={stadium} pitch={pitchKind} motm={pom ? match.player(pom.id).name : undefined} onClose={() => setHighlightsOpen(false)} />}</AnimatePresence>
      <AnimatePresence>{summaryOpen && match.isOver && <MatchSummary match={match} onClose={() => setSummaryOpen(false)} />}</AnimatePresence>
      <AnimatePresence>{showBreak && breakPopup && match.awaiting !== 'followon' && (match.format === 'test' ? <TestBreak match={match} stumps={match.awaiting === 'day'} onClose={() => setBreakPopup(false)} onNextDay={resume} /> : <InningsBreak match={match} onClose={() => setBreakPopup(false)} />)}</AnimatePresence>
      <AnimatePresence>{match.awaiting === 'followon' && !moment && <FollowOnPrompt match={match} onChoose={(enforce) => act({ t: 'followon', enforce })} />}</AnimatePresence>
      <ControlsSheet match={match} act={act} auto={auto} setAuto={setAuto} open={controlsOpen && !finished} setOpen={setControlsOpen} mySide={match.mySide} spectating={!!live.myTeamId && match.mySide === null} stops={stops} setStops={setStops} hideDock={mobile} holdLabel={holding ? holdText : undefined} onHold={resume} manual={manual} setManual={setManualPlay} />
      {/* the last ball's own screens (the field is gone by then) play over a dark backdrop before the celebration */}
      <AnimatePresence>{match.isOver && view.isOver && moment && !winOpen && <motion.div key="finalmoment" className="fixed inset-0 z-[70] grid place-items-center bg-black/80 px-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><div className="relative aspect-[16/10] w-full max-w-3xl"><AnimatePresence><MomentOverlay key={moment.key} moment={moment} onDismiss={dismissMoment} /></AnimatePresence></div></motion.div>}</AnimatePresence>
      <AnimatePresence>{winOpen && <WinCelebration match={match} mySide={match.mySide} final={finalName} onContinue={() => { setWinOpen(false); if (champComp) { setVictoryOpen(true); return } if (awards) { window.clearTimeout(motmTimer.current); motmTimer.current = window.setTimeout(() => setMotmOpen(true), 250) } }} />}</AnimatePresence>
      <AnimatePresence>{victoryOpen && champComp && season && (() => { const c = campaignOf(season, champComp, season.myTeamId as string); const mine = match.sides.find((x) => x.team.id === season.myTeamId); const team = mine?.team; if (!team) return null; return <TournamentVictory key="victory" info={{ team, runnerUp: c.runnerUpId ? teamMap.get(c.runnerUpId) ?? null : null, tournament: competitionName(champComp, teamMap), resultText: c.resultText || (match.result?.text ?? ''), played: c.played, won: c.won, players: [...(mine?.xi ?? [])].sort((a, b) => (b.id === team.captainId ? 1 : 0) - (a.id === team.captainId ? 1 : 0)), variant: variantOf(champComp.id) }} onDone={() => { setVictoryOpen(false); markSeen(`champ:${sessionId}:${season.year}:${champComp.id}`); if (awards) { window.clearTimeout(motmTimer.current); motmTimer.current = window.setTimeout(() => setMotmOpen(true), 250) } }} /> })()}</AnimatePresence>
      <AnimatePresence>{motmOpen && awards && motmPitch && getAnimPrefs().intro && awards.motm && (() => {
        const w = awards.motm
        const entry = match.sides.flatMap((sd) => sd.xi.map((p) => ({ p, team: sd.team }))).find((x) => x.p.id === w.id)
        if (!entry || !match.result) return null
        // the post-match presentation: a stage in the middle of the ground, the host, both captains one after the other, then the Man of the Match and his prize
        const winSide = (match.result.winnerSide ?? 0) as 0 | 1
        const win = match.sides[winSide], lose = match.sides[1 - winSide]
        const capOf = (sd: typeof win) => sd.xi.find((p) => p.id === sd.team.captainId) ?? sd.xi[0]
        const c = awards.contenders.find((x) => x.id === w.id)
        const batDeed = c?.bat && c.bat.balls > 0 ? `${c.bat.runs}${c.bat.out ? '' : '*'} off ${c.bat.balls} balls` : ''
        const bowlDeed = c?.bowl && c.bowl.balls > 0 ? `${c.bowl.wickets}/${c.bowl.runs} in ${Math.floor(c.bowl.balls / 6)}.${c.bowl.balls % 6} overs` : ''
        const mg = match.result.margin
        const margin = match.result.winnerSide === null ? 'tie' : !mg ? 'normal' : mg.type === 'runs' ? (mg.value < 10 ? 'close' : mg.value >= 40 ? 'big' : 'normal') : mg.type === 'wickets' ? (mg.value <= 2 ? 'close' : mg.value >= 7 ? 'big' : 'normal') : 'big'
        const host = PRESENTERS[match.seed % PRESENTERS.length]
        const knockout = fixture?.phase === 'knockout'
        const comp = fixture ? season?.competitions.find((x) => x.id === fixture.competitionId) : undefined
        const title = comp ? competitionName(comp, teamMap) : `${match.format === 'test' ? 'Test' : match.format.toUpperCase()} match`
        const ctx: CeremonyCtx = { host: host.name.split(' ')[0], winTeam: win.team.name, loseTeam: lose.team.name, winCaptain: callName(capOf(win)), loseCaptain: callName(capOf(lose)), motm: callName(entry.p), motmIsCaptain: entry.p.id === capOf(win).id || entry.p.id === capOf(lose).id, result: (/won by.+$/.exec(match.result.text)?.[0] ?? match.result.text).replace(/\.$/, ''), margin, winnersChased: mg?.type === 'wickets', motmDeed: [batDeed, bowlDeed].filter(Boolean).join(' and ') || 'a fine all-round performance', motmWith: batDeed && bowlDeed ? 'both' : bowlDeed ? 'ball' : 'bat', prize: knockout ? '10,000 coins' : '5,000 coins', seed: match.seed }
        const ceremony = { script: ceremonyScript(ctx), winCaptainId: capOf(win).id, loseCaptainId: capOf(lose).id, motmId: entry.p.id, cheque: ctx.prize.toUpperCase(), title, hostName: host.name }
        if (motmStep === 0) return <motion.div key="handshake" className="fixed inset-0 z-[70] cursor-pointer bg-black" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMotmStep(1)}><StadiumCam show={{ kind: 'handshake', seed: match.seed, colors: [win.team.colors.primary, win.team.colors.secondary], lower: { title: 'GOOD GAME', lines: [`${win.team.name} and ${lose.team.name} shake hands`] } }} base={nowBase()} label="Handshakes" cast={{ team: win.team, players: win.xi, rivals: { team: lose.team, players: lose.xi } }} /></motion.div>
        return <motion.div key="motmpitch" className="fixed inset-0 z-[70] cursor-pointer bg-black" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMotmPitch(false)}><StadiumCam show={{ kind: 'ceremony', seed: match.seed, colors: [win.team.colors.primary, win.team.colors.secondary], ceremony }} base={nowBase()} label="Presentation" cast={{ team: win.team, players: win.xi, rivals: { team: lose.team, players: lose.xi }, host }} /></motion.div>
      })()}</AnimatePresence>
      <AnimatePresence>{motmOpen && awards && !(motmPitch && getAnimPrefs().intro && awards.motm) && <MotmOverlay match={match} awards={awards} onClose={() => { setMotmOpen(false); if (getAnimPrefs().studio && !studioEnded.current) { studioEnded.current = true; openStudioRef.current('end') } else showUpgrades() }} onScorecard={() => setSummaryOpen(true)} />}</AnimatePresence>
      <AnimatePresence>
        {studio && !moment && (
          <StudioShow
            key={`${studio}-${match.innings.length}-${match.clock?.day ?? 0}`} match={match} kind={studio} seed={match.seed}
            extra={fixture ? { competition: compNameOf(fixture), stage: fixture.stage } : undefined}
            onDone={() => { const k = studio; setStudio(null); if (k === 'end') showUpgrades() }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>{upgradesOpen && upgrades.length > 0 && <UpgradeScreen rows={upgrades} onClose={() => setUpgradesOpen(false)} />}</AnimatePresence>
    </>
  )

  if (mobile && landscape) {
    // a phone held sideways: the field on the left, everything else beside it
    return (
      <PlayerCardProvider match={view} career={!!live.fixtureId}>
        {overlays}
        <div className="fixed inset-0 z-30 flex bg-ink" data-scroll-lock style={{ paddingLeft: 'var(--sal)', paddingRight: 'var(--sar)' }}>
          <div className="flex min-w-0 flex-[1.3] flex-col">
            <MobileScoreboard match={view} you={match.mySide} difficulty={match.difficulty} onBack={leave} backLabel={fixture ? 'Back to the calendar' : 'Back to Play'} />
            {view.isOver ? <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">{resultCard}</div> : showBreak ? <div className="grid min-h-0 flex-1 place-items-center p-4 text-center text-sm text-slate-300"><span><b className="block font-display text-3xl tracking-wide text-white">{match.awaiting === 'day' ? 'Stumps' : 'Innings break'}</b>{match.awaiting === 'day' ? 'Play is over for the day. Press Next day to go on.' : 'Look the innings over, then press Next innings.'}</span></div> : <div className="relative flex min-h-0 flex-1 items-center justify-center p-1.5">
              <div className="w-full" style={{ maxWidth: 'calc((100dvh - 96px) * 1.6)' }}>
                <Stage held={revealHold !== null}
                  event={lastHere} overEvents={overEvents} striker={striker} nonStriker={nonStriker} {...clipWho} bowler={bowler}
                  battingTeam={batSide.team} bowlingTeam={bowlSide.team} fielders={placeFielders(bowlSide.xi, bowler.id, plan.spots)} fieldTag={plan} pitch={pitchKind} chase={chase} note={note} freeHit={freeHitState} rate={auto === 4 ? 0.5 : auto === 2 ? 0.75 : 1} look={stadium} wear={pitchWear} scoreBug={scoreBug} caption={caption} {...aimProps}
                />
              </div>
              <AnimatePresence>{moment && <MomentOverlay key={moment.key} moment={moment} onDismiss={dismissMoment} />}</AnimatePresence>
            </div>}
          </div>
          <div className="flex min-w-0 flex-1 flex-col border-l border-line" style={{ paddingTop: 'var(--sat)' }}>
            {!view.isOver && !showBreak && <MobileNowPlaying match={view} displayOver={displayOver} />}
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-2">
              {!view.isOver && resultCard}
              <Commentary match={view} tab={tab} setTab={setTab} controls={controlsNode} />
            </div>
            {!finished && (!manual || holding) && <MobileDock holdLabel={holding ? holdText.toUpperCase() : undefined} onBall={() => (holding ? resume() : act({ t: 'ball' }))} auto={auto} setAuto={setAuto} onControls={() => setControlsOpen(true)} over={finished} />}
          </div>
        </div>
      </PlayerCardProvider>
    )
  }

  if (mobile) {
    return (
      <PlayerCardProvider match={view} career={!!live.fixtureId}>
        {overlays}
        <div className="fixed inset-0 z-30 flex flex-col bg-ink" data-scroll-lock>
          <MobileScoreboard match={view} you={match.mySide} difficulty={match.difficulty} onBack={leave} backLabel={fixture ? 'Back to the calendar' : 'Back to Play'} />
          {!view.isOver && !showBreak && <div className="relative shrink-0">
            <div className="px-2 pb-1 pt-2">
              <Stage held={revealHold !== null}
                event={lastHere} overEvents={overEvents} striker={striker} nonStriker={nonStriker} {...clipWho} bowler={bowler}
                battingTeam={batSide.team} bowlingTeam={bowlSide.team} fielders={placeFielders(bowlSide.xi, bowler.id, plan.spots)} fieldTag={plan} pitch={pitchKind} chase={chase} note={note} freeHit={freeHitState} rate={auto === 4 ? 0.5 : auto === 2 ? 0.75 : 1} look={stadium} wear={pitchWear} scoreBug={scoreBug} caption={caption} {...aimProps}
              />
            </div>
            <MobileNowPlaying match={view} displayOver={displayOver} />
            <AnimatePresence>{moment && <MomentOverlay key={moment.key} moment={moment} onDismiss={dismissMoment} />}</AnimatePresence>
          </div>}
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-2 py-2">
            {resultCard}
            <Commentary match={view} tab={tab} setTab={setTab} controls={controlsNode} />
          </div>
          {!finished && (!manual || holding) && <MobileDock holdLabel={holding ? holdText.toUpperCase() : undefined} onBall={() => (holding ? resume() : act({ t: 'ball' }))} auto={auto} setAuto={setAuto} onControls={() => setControlsOpen(true)} over={finished} />}
        </div>
      </PlayerCardProvider>
    )
  }

  return (
    <PlayerCardProvider match={view} career={!!live.fixtureId}>
    <div className="space-y-4">
      {overlays}
      <Scoreboard match={view} you={match.mySide} difficulty={match.difficulty} />

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
        {showBreak ? (
          <div className="rounded-2xl border border-line bg-panel p-8 text-center text-slate-300 xl:sticky xl:top-3 xl:self-start"><b className="block font-display text-4xl tracking-wide text-white">Innings break</b>Look the innings over in the scorecard, then press <b className="text-white">Next innings</b>.</div>
        ) : (
        <div className="space-y-3 xl:sticky xl:top-3 xl:self-start">
          <div className="mx-auto w-full" style={{ maxWidth: 'max(460px, calc((100vh - 490px) * 1.6))' }}>
            <Stage held={revealHold !== null}
              event={lastHere} overEvents={overEvents} striker={striker} nonStriker={nonStriker} {...clipWho} bowler={bowler}
              battingTeam={batSide.team} bowlingTeam={bowlSide.team} fielders={placeFielders(bowlSide.xi, bowler.id, plan.spots)} fieldTag={plan} pitch={pitchKind} chase={chase} note={note} freeHit={freeHitState} rate={auto === 4 ? 0.5 : auto === 2 ? 0.75 : 1} look={stadium} wear={pitchWear} scoreBug={scoreBug} caption={caption} {...aimProps} moment={moment} onDismissMoment={dismissMoment}
            />
          </div>
          <NowPlaying match={view} displayOver={displayOver} />
        </div>
        )}
        <div className="space-y-4">
          <Commentary match={view} tab={tab} setTab={setTab} controls={controlsNode} />
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

/** The pitch report's card: the verdict in big coloured words (BAT FIRST, BOWL FIRST or EITHER WAY), what the pitch is like in a line, and three tiles in plain words. */
/** The replays of a wicket, best first: a wicket shows one of them. The others (a close call, a swing, the phantom camera on a bowled) are dropped for a ball that has a wicket replay. */
const WICKET_STRONG: Moment['kind'][] = ['wicketcast', 'replay', 'catch']
const WICKET_WEAK: Moment['kind'][] = ['phantomcast', 'deliverycast', 'misscast', 'almostcast']

function pitchReportLower(pitch: Match['pitch']) {
  const pi = describePitch(pitch), adv = tossAdvice(pitch)
  const word = (v: number, spread: number, good: string, mid: string, bad: string) => { const m = 50 + (v / spread) * 22; return m > 60 ? good : m < 40 ? bad : mid }
  const verdict = adv.choice === 'bat' ? { t: 'BAT FIRST', c: '#34d399' } : adv.choice === 'bowl' ? { t: 'BOWL FIRST', c: '#38bdf8' } : { t: 'EITHER WAY', c: '#fbbf24' }
  return {
    title: verdict.t, color: verdict.c, chip: adv.choice ? (adv.strength === 'strong' ? 'STRONG EDGE' : adv.strength === 'clear' ? 'CLEAR EDGE' : 'SLIGHT EDGE') : 'NO EDGE',
    lines: [`${pi.icon} ${pi.label}: ${pi.tip}`],
    tiles: [{ label: 'Batting', value: word(pitch.ease, 0.24, 'EASY', 'FAIR', 'TOUGH') }, { label: 'Pace', value: word(pitch.pace, 0.3, 'HELPS', 'FAIR', 'NO HELP') }, { label: 'Spin', value: word(pitch.spin, 0.3, 'TURNS', 'FAIR', 'FLAT') }],
  }
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
  const valid = (format === 't20' || format === 'odi' || format === 'test') && !!a && !!b && a.id !== b.id
  const key = matchKey(format, aId, bId, Number(seed) || 1)
  const ready = live?.key === key
  const blocked = !ready && !!live && !live.finished // another match is still being played
  // A career match that already has a result is final: it can be looked at, never played again.
  const fixtureNow = fxId && season ? season.fixtures.find((f) => f.id === fxId) : undefined
  // Every match dated before this one is played first (the computer plays them out) so the season goes on in order.
  const catchUp = !!fixtureNow && !!season && !season.results[fixtureNow.id] && !ready && hasEarlierUnplayed(season, fixtureNow.date)
  const alreadyDone = !!fxId && !!season?.results[fxId] && !(ready && live && !live.replay)
  // Your match cannot start with an injured player in your XI: swap him out first (or forfeit if there are not enough fit players).
  const myNow = season?.myTeamId ? [a0, b0].find((t) => t?.id === season.myTeamId) : undefined
  const squadIssue = fixtureNow && season && myNow && !season.results[fixtureNow.id] && !ready ? squadProblem(season, myNow, fixtureNow) : null
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
    if (valid && !ready && !blocked && !alreadyDone && !waitFor && !catchUp && !squadIssue && location.pathname.startsWith('/match/')) startLive({ format: format as MatchFormat, teamA: a as Team, teamB: b as Team, seed: Number(seed) || 1, fixtureId: query.get('fx') ?? undefined, news: picked.news, url: location.pathname + location.search })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valid, ready, blocked, key, catchUp, !!squadIssue])
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
  if (squadIssue && season && myNow && fixtureNow) {
    return (
      <div className="mx-auto max-w-xl space-y-3">
        <SquadProblemCard season={season} team={myNow} fixture={fixtureNow} />
        <Link to={paths.session(fixtureNow.date.slice(0, 7))} className="block rounded-xl border border-line px-5 py-3 text-center text-sm font-bold text-slate-200 hover:border-slate-400">Back to the calendar</Link>
      </div>
    )
  }
  if (blocked && live) return <InProgress live={live} onDiscard={discardLive} wanted={`${a?.name} v ${b?.name}`} />
  if (!ready || !live) return null
  return <LiveMatch key={live.id} live={live} />
}
