import { useMemo } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { BUILT_IN_TEAMS } from '../data/teams'
import { generateSeason } from '../season/generate'
import { recordResult } from '../season/results'
import { appendAction, type Action } from '../engine/replay'
import type { Difficulty } from '../engine/types'
import type { RawSummary, Season, SeasonReview } from '../season/types'
import type { MatchFormat, Team } from '../types'

export interface SessionFile {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  season: Season
  /** Finished years for your team, oldest first. */
  reviews: SeasonReview[]
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
  news?: string[]
  /** Career mode: the team you manage in this match (null = you manage both) and how hard the computer plays. */
  myTeamId?: string | null
  difficulty?: Difficulty
  /** True if this fixture already had a result when the match began, so finishing it changes nothing. */
  replay: boolean
  phase: 'toss' | 'play'
  /** What you chose after winning the toss (unset until you do, or if the computer won it). */
  tossChoice?: 'bat' | 'bowl'
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
  openSession: (id: string) => void
  renameSession: (id: string, name: string) => void
  deleteSession: (id: string) => void
  /** Replace the active session's season with the result of `fn`. */
  updateSeason: (fn: (s: Season) => Season) => void
  /** Records a finished fixture in the active session, e.g. after watching it live. */
  recordMatch: (summary: RawSummary, date: string) => void
  /** The match in progress (null when there isn't one). Lives until it ends or is discarded. */
  liveMatch: LiveMatch | null
  startLive: (opts: { format: MatchFormat; teamA: Team; teamB: Team; seed: number; fixtureId?: string; news?: string[]; url: string }) => void
  liveAct: (a: Action) => void
  setLivePhase: (phase: 'toss' | 'play') => void
  setTossChoice: (c: 'bat' | 'bowl') => void
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
        set((st) => ({ sessions: [...st.sessions, { id, name: name.trim() || `Session ${st.sessions.length + 1}`, createdAt: now, updatedAt: now, season, reviews: [] }], activeSessionId: id }))
        return id
      },
      startNextSeason: (review, next) =>
        set((st) => ({
          sessions: st.sessions.map((x) => (x.id === st.activeSessionId ? { ...x, season: next, reviews: [...(x.reviews ?? []), review], updatedAt: new Date().toISOString() } : x)),
        })),
      openSession: (id) => set((st) => (st.sessions.some((x) => x.id === id) ? { activeSessionId: id } : st)),
      renameSession: (id, name) => set((st) => ({ sessions: st.sessions.map((x) => (x.id === id ? { ...x, name: name.trim() || x.name } : x)) })),
      deleteSession: (id) =>
        set((st) => {
          const sessions = st.sessions.filter((x) => x.id !== id)
          return { sessions, activeSessionId: st.activeSessionId === id ? (sessions[sessions.length - 1]?.id ?? null) : st.activeSessionId }
        }),
      updateSeason: (fn) =>
        set((st) => ({
          sessions: st.sessions.map((x) => (x.id === st.activeSessionId ? { ...x, season: fn(x.season), updatedAt: new Date().toISOString() } : x)),
        })),
      recordMatch: (summary, date) =>
        set((st) => ({
          sessions: st.sessions.map((x) => {
            const target = st.liveMatch?.fixtureId === summary.fixtureId && st.liveMatch.sessionId ? st.liveMatch.sessionId : st.activeSessionId
            if (x.id !== target || x.season.results[summary.fixtureId]) return x
            const next = recordResult(x.season, summary)
            return { ...x, season: { ...next, today: date > next.today ? date : next.today }, updatedAt: new Date().toISOString() }
          }),
        })),
      liveMatch: null,
      startLive: ({ format, teamA, teamB, seed, fixtureId, news, url }) => {
        const season = selectSeason(get())
        const live: LiveMatch = {
          id: `live-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
          key: matchKey(format, teamA.id, teamB.id, seed), url, format, teamA, teamB, seed, fixtureId, news: news?.length ? news : undefined, sessionId: fixtureId && season ? (get().activeSessionId ?? undefined) : undefined,
          // a session match is played as the team you manage; a friendly from the Play page has no 'you'
          myTeamId: fixtureId && season ? (season.myTeamId ?? null) : null,
          difficulty: fixtureId && season ? (season.difficulty ?? 'normal') : 'normal',
          replay: !!(fixtureId && season?.results[fixtureId]), phase: 'toss', actions: [], finished: false,
        }
        set({ liveMatch: live })
      },
      liveAct: (a) => set((st) => (st.liveMatch ? { liveMatch: { ...st.liveMatch, actions: appendAction(st.liveMatch.actions, a) } } : st)),
      setLivePhase: (phase) => set((st) => (st.liveMatch ? { liveMatch: { ...st.liveMatch, phase } } : st)),
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

export const resolveTeams = (custom: Team[], overrides: Record<string, Team>): Team[] => [
  ...BUILT_IN_TEAMS.map((t) => overrides[t.id] ?? t),
  ...custom,
]

/** All teams: built-ins (with any user edits applied) plus custom teams. */
export function useTeams(): Team[] {
  const custom = useStore((s) => s.customTeams)
  const overrides = useStore((s) => s.overrides)
  return useMemo(() => resolveTeams(custom, overrides), [custom, overrides])
}

export const defaultTeam = (id: string) => BUILT_IN_TEAMS.find((t) => t.id === id)

export const selectSession = (s: { sessions: SessionFile[]; activeSessionId: string | null }): SessionFile | null =>
  s.sessions.find((x) => x.id === s.activeSessionId) ?? null
/** The active session's season, or null if there is none. */
export const selectSeason = (s: { sessions: SessionFile[]; activeSessionId: string | null }): Season | null => selectSession(s)?.season ?? null
