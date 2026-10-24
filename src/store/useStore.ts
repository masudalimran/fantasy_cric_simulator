import type { NewsItem } from '../season/selection'
import { useMemo } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { BUILT_IN_TEAMS, LEGACY_TEAMS, refreshRatings } from '../data/teams'
import { generateSeason } from '../season/generate'
import { lastPlayedXI } from '../season/selection'
import { advanceMarket, initMarket, marketWindows, playerIndex } from '../season/market'
import { advanceCoaching, assignCoaches, cpuCoachingMissing, setFocus, startCpuCoaching } from '../season/coaching'
import type { CoachFocus } from '../data/coaches'
import { recordResult } from '../season/results'
import { appendAction, type Action } from '../engine/replay'
import type { Difficulty } from '../engine/types'
import type { RawSummary, Season, SeasonReview } from '../season/types'
import { boostSummary, type BoostState } from '../season/boost'
import type { MatchFormat, Team } from '../types'

export interface SessionFile {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  season: Season
  /** Finished years for your team, oldest first. */
  reviews: SeasonReview[]
  /** Every finished season in full (tournaments, results, ratings), oldest first, so past years can be looked back on. */
  history?: Season[]
  /** Boost tokens: how many have been spent, and whether one is armed for the next match (older careers have none saved). */
  boost?: BoostState
}

/** The match being played right now. It's saved as its seed, squads and the actions taken so far. */
export interface LiveMatch {
  id: string
  key: string
  /** Where to go to pick it up again. */
  url: string
  format: MatchFormat
  teamA: Team
  teamB: Team
  seed: number
  fixtureId?: string
  /** The session a calendar match belongs to, so its result is saved there even if you switch sessions meanwhile. */
  sessionId?: string
  /** What the computer changed in its XI for this match (injuries, form), shown on the toss screen. */
  news?: (NewsItem | string)[]
  /** Career mode: the team you manage in this match (null = you manage both) and how hard the computer plays. */
  myTeamId?: string | null
  difficulty?: Difficulty
  /** True if this fixture already had a result when the match began, so finishing it changes nothing. */
  replay: boolean
  phase: 'toss' | 'play'
  /** What you chose after winning the toss (unset until you do, or if the computer won it). */
  tossChoice?: 'bat' | 'bowl'
  /** True once the coin has been flipped: from then on the match can't be cancelled. */
  tossed?: boolean
  /** Bumped whenever a squad is changed before the toss, so the match is built again from the new squads. */
  squadVersion?: number
  /** Who was in each side's XI when the toss screen first opened, so squad changes can be shown as in and out. */
  startXI?: [string[], string[]]
  /** A boost token is in use for your side in this match (it is spent when the coin is flipped). */
  boost?: boolean
  actions: Action[]
  finished: boolean
}

export const matchKey = (format: string, aId: string, bId: string, seed: number) => `${format}/${aId}-vs-${bId}/${seed}`

interface State {
  /** Teams the user created. */
  customTeams: Team[]
  /** User edits to built-in teams, keyed by team id. The built-in data stays the default underneath. */
  overrides: Record<string, Team>
  /** Save files: each is a year of cricket with its own teams, calendar and results. */
  sessions: SessionFile[]
  activeSessionId: string | null
  /** Builds a new session from the chosen teams and makes it the active one. Returns its id. */
  createSession: (opts: { name: string; year: number; teams: Team[]; seed: number; myTeamId: string | null; difficulty: Difficulty }) => string
  /** Archives the finished year's review and moves the session on to the next season. */
  startNextSeason: (review: SeasonReview, next: Season) => void
  /** Which year the career's Tournaments, Stats and team pages are showing (null = the current year). Not saved. */
  viewYear: number | null
  setViewYear: (year: number | null) => void
  openSession: (id: string) => void
  renameSession: (id: string, name: string) => void
  deleteSession: (id: string) => void
  /** Replace the active session's season with the result of `fn`. */
  updateSeason: (fn: (s: Season) => Season) => void
  /** Older careers have no market yet: set one up (squads as they are, 40 youth in the pool, a purse each). */
  ensureMarket: () => void
  /** Tell your coach what to work on (it stands for at least a month). */
  setCoachFocus: (focus: CoachFocus) => void
  /** Records a finished fixture in the active session, e.g. after watching it live. */
  recordMatch: (summary: RawSummary, date: string) => void
  /** The match in progress (null when there isn't one). Lives until it ends or is discarded. */
  liveMatch: LiveMatch | null
  startLive: (opts: { format: MatchFormat; teamA: Team; teamB: Team; seed: number; fixtureId?: string; news?: NewsItem[]; url: string }) => void
  liveAct: (a: Action) => void
  setLivePhase: (phase: 'toss' | 'play') => void
  setTossChoice: (c: 'bat' | 'bowl') => void
  setTossed: () => void
  /** Arms (or disarms) a boost token for your next match in the open career. */
  armBoost: (on: boolean) => void
  /** Uses (or does not use) a boost token in the match on the toss screen (only before the coin is flipped). */
  setLiveBoost: (on: boolean) => void
  /** For a match that was started before squad changes were tracked: take the XIs as they are now as the starting point. */
  ensureStartXI: () => void
  /** Changes one side's XI, batting order, captain and keeper for the match about to start (only before the toss). */
  setLiveSquad: (side: 0 | 1, order: string[], captainId: string, keeperId: string | undefined) => void
  finishLive: () => void
  discardLive: () => void
  /** Saves a custom team, or an edit of a built-in team. */
  saveTeam: (team: Team) => void
  deleteCustomTeam: (id: string) => void
  /** Drops the user's edits to a built-in team, restoring the default. */
  resetTeam: (id: string) => void
}

// Persistence lives behind this one store: swap `persist`'s storage for a cloud-backed one later.
export const useStore = create<State>()(
  persist(
    (set, get) => ({
      customTeams: [],
      overrides: {},
      sessions: [],
      activeSessionId: null,
      createSession: ({ name, year, teams, seed, myTeamId, difficulty }) => {
        const season = generateSeason({ year, teams, seed, myTeamId, difficulty })
        const now = new Date().toISOString()
        const id = `session-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`
        set((st) => ({ sessions: [...st.sessions, { id, name: name.trim() || `Career ${st.sessions.length + 1}`, createdAt: now, updatedAt: now, season, reviews: [] }], activeSessionId: id }))
        return id
      },
      viewYear: null,
      setViewYear: (year) => set({ viewYear: year }),
      startNextSeason: (review, next) =>
        set((st) => ({
          sessions: st.sessions.map((x) => (x.id === st.activeSessionId ? { ...x, history: [...(x.history ?? []), x.season], season: next, reviews: [...(x.reviews ?? []), review], updatedAt: new Date().toISOString() } : x)),
        })),
      openSession: (id) => set((st) => (st.sessions.some((x) => x.id === id) ? { activeSessionId: id } : st)),
      renameSession: (id, name) => set((st) => ({ sessions: st.sessions.map((x) => (x.id === id ? { ...x, name: name.trim() || x.name } : x)) })),
      deleteSession: (id) =>
        set((st) => {
          const sessions = st.sessions.filter((x) => x.id !== id)
          return { sessions, activeSessionId: st.activeSessionId === id ? (sessions[sessions.length - 1]?.id ?? null) : st.activeSessionId }
        }),
      ensureMarket: () =>
        set((st) => ({
          sessions: st.sessions.map((x) => {
            if (x.id !== st.activeSessionId || (x.season.market && x.season.windows && x.season.coaches && !cpuCoachingMissing(x.season))) return x
            const teams = resolveTeams(st.customTeams, st.overrides, legacyIdsOf(st.sessions)).filter((t) => x.season.teamIds.includes(t.id))
            const filled: typeof x.season = { ...x.season, windows: x.season.windows ?? marketWindows(x.season.year), market: x.season.market ?? initMarket(teams, x.season.seed), coaches: assignCoaches(x.season.teamIds, x.season.seed, x.season.coaches) }
            // the computer's coaches start work straight away
            return { ...x, season: startCpuCoaching(filled, playerIndex(resolveTeams(st.customTeams, st.overrides, legacyIdsOf(st.sessions)), filled.market)) }
          }),
        })),
      setCoachFocus: (focus) =>
        set((st) => ({
          sessions: st.sessions.map((x) => (x.id === st.activeSessionId && x.season.myTeamId ? { ...x, season: setFocus(x.season, x.season.myTeamId, focus, x.season.today), updatedAt: new Date().toISOString() } : x)),
        })),
      updateSeason: (fn) =>
        set((st) => ({
          sessions: st.sessions.map((x) => {
            if (x.id !== st.activeSessionId) return x
            const next = fn(x.season)
            // as the days of a market window go by, the computer teams do their shopping
            const baseIndex = () => playerIndex(resolveTeams(st.customTeams, st.overrides, legacyIdsOf(st.sessions)), next.market)
            const season = advanceCoaching(x.season, advanceMarket(x.season, next, baseIndex), baseIndex)
            return { ...x, season, updatedAt: new Date().toISOString() }
          }),
        })),
      recordMatch: (summary, date) =>
        set((st) => ({
          sessions: st.sessions.map((x) => {
            const target = st.liveMatch?.fixtureId === summary.fixtureId && st.liveMatch.sessionId ? st.liveMatch.sessionId : st.activeSessionId
            if (x.id !== target || x.season.results[summary.fixtureId]) return x
            // the match's players are graded on how they did, and their ratings move a little
            const teams = new Map(resolveTeams(st.customTeams, st.overrides, legacyIdsOf(st.sessions)).map((t) => [t.id, t]))
            const next = recordResult(x.season, summary, teams)
            const moved = { ...next, today: date > next.today ? date : next.today }
            const baseIndex = () => playerIndex(resolveTeams(st.customTeams, st.overrides, legacyIdsOf(st.sessions)), moved.market)
            return { ...x, season: advanceCoaching(x.season, advanceMarket(x.season, moved, baseIndex), baseIndex), updatedAt: new Date().toISOString() }
          }),
        })),
      liveMatch: null,
      startLive: ({ format, teamA, teamB, seed, fixtureId, news, url }) => {
        const season = selectSeason(get())
        // your team's "before" is who played in its last match (so IN and OUT say what changed since then)
        const date = season?.fixtures.find((f) => f.id === fixtureId)?.date
        const startOf = (t: Team) => (season && date && season.myTeamId === t.id ? lastPlayedXI(season, t, date) : null) ?? t.players.slice(0, 11).map((p) => p.id)
        const live: LiveMatch = {
          id: `live-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
          key: matchKey(format, teamA.id, teamB.id, seed), url, format, teamA, teamB, seed, fixtureId, startXI: [startOf(teamA), startOf(teamB)], news: news?.length ? news : undefined, sessionId: fixtureId && season ? (get().activeSessionId ?? undefined) : undefined,
          // a session match is played as the team you manage; a friendly from the Play page has no 'you'
          myTeamId: fixtureId && season ? (season.myTeamId ?? null) : null,
          difficulty: fixtureId && season ? (season.difficulty ?? 'normal') : 'normal',
          replay: !!(fixtureId && season?.results[fixtureId]), phase: 'toss', actions: [], finished: false,
        }
        // a token armed from the squad screen goes into the next match of yours
        const ses = selectSession(get())
        if (ses && live.myTeamId && !live.replay && boostSummary([...(ses.history ?? []), ses.season], ses.boost, ses.season.difficulty).armed) live.boost = true
        set({ liveMatch: live })
      },
      liveAct: (a) => set((st) => (st.liveMatch ? { liveMatch: { ...st.liveMatch, actions: appendAction(st.liveMatch.actions, a) } } : st)),
      setLivePhase: (phase) => set((st) => (st.liveMatch ? { liveMatch: { ...st.liveMatch, phase } } : st)),
      setLiveSquad: (side, order, captainId, keeperId) =>
        set((st) => {
          const live = st.liveMatch
          if (!live || live.tossed || live.actions.length > 0) return st
          const key = side === 0 ? 'teamA' : 'teamB'
          const team = live[key]
          const byId = new Map(team.players.map((p) => [p.id, p]))
          const ordered = order.map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => !!p)
          const rest = team.players.filter((p) => !order.includes(p.id))
          return { liveMatch: { ...live, [key]: { ...team, players: [...ordered, ...rest], captainId, keeperId }, squadVersion: (live.squadVersion ?? 0) + 1 } }
        }),
      ensureStartXI: () => set((st) => (st.liveMatch && !st.liveMatch.startXI ? { liveMatch: { ...st.liveMatch, startXI: [st.liveMatch.teamA.players.slice(0, 11).map((p) => p.id), st.liveMatch.teamB.players.slice(0, 11).map((p) => p.id)] } } : st)),
      setTossed: () =>
        set((st) => {
          const live = st.liveMatch
          if (!live || live.tossed) return st
          // the coin is flipped: a boost token in use is spent
          const spend = !!live.boost && !live.replay
          return {
            liveMatch: { ...live, tossed: true },
            sessions: spend ? st.sessions.map((x) => (x.id === (live.sessionId ?? st.activeSessionId) ? { ...x, boost: { used: (x.boost?.used ?? 0) + 1, armed: false } } : x)) : st.sessions,
          }
        }),
      armBoost: (on) =>
        set((st) => ({
          sessions: st.sessions.map((x) => {
            if (x.id !== st.activeSessionId) return x
            const b = boostSummary([...(x.history ?? []), x.season], x.boost, x.season.difficulty)
            if (on && b.available <= 0) return x
            return { ...x, boost: { used: x.boost?.used ?? 0, armed: on } }
          }),
        })),
      setLiveBoost: (on) =>
        set((st) => {
          const live = st.liveMatch
          if (!live || live.tossed || live.actions.length > 0 || !live.myTeamId || live.replay) return st
          const sid = live.sessionId ?? st.activeSessionId
          const ses = st.sessions.find((x) => x.id === sid)
          if (!ses) return st
          const b = boostSummary([...(ses.history ?? []), ses.season], ses.boost, ses.season.difficulty)
          if (on && b.available <= 0) return st
          return {
            liveMatch: { ...live, boost: on },
            sessions: st.sessions.map((x) => (x.id === sid ? { ...x, boost: { used: x.boost?.used ?? 0, armed: on } } : x)),
          }
        }),
      setTossChoice: (c) => set((st) => (st.liveMatch && st.liveMatch.actions.length === 0 ? { liveMatch: { ...st.liveMatch, tossChoice: c } } : st)),
      finishLive: () => set((st) => (st.liveMatch && !st.liveMatch.finished ? { liveMatch: { ...st.liveMatch, finished: true } } : st)),
      discardLive: () => set({ liveMatch: null }),
      saveTeam: (team) =>
        set((s) => {
          if (!team.isCustom) return { overrides: { ...s.overrides, [team.id]: team } }
          return {
            customTeams: s.customTeams.some((t) => t.id === team.id)
              ? s.customTeams.map((t) => (t.id === team.id ? team : t))
              : [...s.customTeams, team],
          }
        }),
      deleteCustomTeam: (id) => set((s) => ({ customTeams: s.customTeams.filter((t) => t.id !== id) })),
      resetTeam: (id) =>
        set((s) => {
          const { [id]: _removed, ...rest } = s.overrides
          return { overrides: rest }
        }),
    }),
    {
      name: 'fcs.v1',
      version: 4,
      // Older saves kept a single season; it becomes the first session. v1 seasons also lacked rosters.
      migrate: (persisted: unknown) => {
        const state = persisted as { season?: Season | null; sessions?: SessionFile[]; activeSessionId?: string | null }
        if (state?.season) {
          const now = new Date().toISOString()
          const season = state.season.roster ? state.season : { ...state.season, roster: [] }
          state.sessions = [{ id: 'session-1', name: 'Session 1', createdAt: now, updatedAt: now, season, reviews: [] }]
          state.activeSessionId = 'session-1'
        }
        delete state?.season
        // v4: sessions gained a managed team, a difficulty and a list of finished years. Older saves keep playing as before.
        for (const s of state?.sessions ?? []) {
          s.reviews ??= []
          s.season.myTeamId ??= null
          s.season.difficulty ??= 'normal'
        }
        return state as never
      },
      partialize: (s) => ({ customTeams: s.customTeams, overrides: s.overrides, sessions: s.sessions, activeSessionId: s.activeSessionId, liveMatch: s.liveMatch }),
    },
  ),
)

/** Ids of retired built-in teams that a saved career still uses. */
export const legacyIdsOf = (sessions: SessionFile[]): string[] => {
  const retired = new Set(LEGACY_TEAMS.map((t) => t.id))
  const used = new Set<string>()
  for (const s of sessions) for (const season of [...(s.history ?? []), s.season]) for (const id of season.teamIds) if (retired.has(id)) used.add(id)
  return [...used].sort()
}

export const resolveTeams = (custom: Team[], overrides: Record<string, Team>, legacy: string[] = []): Team[] => [
  ...BUILT_IN_TEAMS.map((t) => (overrides[t.id] ? refreshRatings(overrides[t.id]) : t)),
  ...LEGACY_TEAMS.filter((t) => legacy.includes(t.id)).map((t) => overrides[t.id] ?? t),
  ...custom,
]

/** All teams: built-ins (with any user edits applied) plus custom teams. */
export function useTeams(): Team[] {
  const custom = useStore((s) => s.customTeams)
  const overrides = useStore((s) => s.overrides)
  const legacy = useStore((s) => legacyIdsOf(s.sessions).join(',')) // a string, so this only changes when a career starts or ends using a retired team
  return useMemo(() => resolveTeams(custom, overrides, legacy ? legacy.split(',') : []), [custom, overrides, legacy])
}

export const defaultTeam = (id: string) => BUILT_IN_TEAMS.find((t) => t.id === id) ?? LEGACY_TEAMS.find((t) => t.id === id)

/**
 * The season the career's Tournaments, Stats and team pages are looking at: the year picked in the year selector,
 * or the current one. Past years are read-only.
 */
export function useViewedSeason(): { season: Season | null; year: number | null; isCurrent: boolean; years: number[] } {
  const session = useStore(selectSession)
  const viewYear = useStore((s) => s.viewYear)
  const current = session?.season ?? null
  const past = viewYear !== null ? session?.history?.find((h) => h.year === viewYear) : undefined
  const years = session ? [...(session.history ?? []).map((h) => h.year), session.season.year] : []
  return { season: past ?? current, year: (past ?? current)?.year ?? null, isCurrent: !past, years }
}

export const selectSession = (s: { sessions: SessionFile[]; activeSessionId: string | null }): SessionFile | null =>
  s.sessions.find((x) => x.id === s.activeSessionId) ?? null
/** The active session's season, or null if there is none. */
export const selectSeason = (s: { sessions: SessionFile[]; activeSessionId: string | null }): Season | null => selectSession(s)?.season ?? null
