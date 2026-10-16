import type { Difficulty } from '../engine/types'
import type { MatchFormat } from '../types'

/** Where a fixture's team comes from: known at kickoff, or decided by earlier results. */
export type Slot =
  | { kind: 'team'; teamId: string }
  | { kind: 'winner'; of: string } // winner of another fixture
  | { kind: 'rank'; competitionId: string; group: string | null; rank: number } // nth in a table

export interface Fixture {
  id: string
  date: string
  format: MatchFormat
  competitionId: string
  /** e.g. "Round 3", "Group A", "Semi-final 1", "Final", "Match 2 of 2" */
  stage: string
  /** Stage family, used to work out when a table is complete. */
  phase: 'league' | 'group' | 'knockout' | 'series'
  group: string | null
  homeRef: Slot
  awayRef: Slot
  homeId: string | null
  awayId: string | null
  /** A Test takes five calendar days (the date above is the first); every other match takes one. */
  days?: number
}

export type CompetitionKind = 'league' | 'cup' | 'knockout' | 'series'

export interface Competition {
  id: string
  name: string
  kind: CompetitionKind
  format: MatchFormat
  originTeamId: string | null
  teamIds: string[]
  /** Groups for cups: group name -> team ids. */
  groups: Record<string, string[]> | null
  blurb: string
  startDate: string
  endDate: string
}

export interface TeamScore {
  runs: number
  wickets: number
  balls: number
  allOut: boolean
}

/** Compact per-match lines. The first number indexes `Season.roster`. */
export type BatLine = [player: number, runs: number, balls: number, fours: number, sixes: number, out: 0 | 1]
export type BowlLine = [player: number, balls: number, runs: number, wickets: number, maidens: number]

export interface MatchSummary {
  fixtureId: string
  winnerId: string | null // null = tie or no result
  text: string
  /** How the match was won; null for ties and super overs. */
  margin: 'runs' | 'wickets' | 'innings' | null
  scores: Record<string, TeamScore>
  /** A Test that ran out of time: the points are shared. */
  draw?: boolean
  /** A Test: every innings in order (for the card on the result), and how many days it took. */
  test?: { innings: { teamId: string; runs: number; wickets: number; balls: number; declared?: boolean; followOn?: boolean }[]; days: number }
  /** True if the match was tied and settled by a super over (knockouts only). */
  superOver: boolean
  playerOfMatchId: string | null
  /** What earned the Man of the Match award, e.g. "112 (58) · 2 catches". */
  motmNote?: string
  bat: BatLine[]
  bowl: BowlLine[]
  /** Everyone who was in either XI (roster positions), whether or not he batted or bowled. Missing in older saves. */
  played?: number[]
  /** The longest six each batsman hit in the match, in metres (roster position, metres). Missing in older saves. */
  six?: [number, number][]
  /** The best batting or bowling of the match as a replayable reel (missing in matches played before reels existed). */
  reel?: import('./reel').Reel
  /** The quickest fifty of the match: who (roster position) and how many balls he faced to reach it. */
  ff?: [number, number]
}

/** A summary as the engine produces it, before player ids are swapped for roster indices. */
export type RawSummary = Omit<MatchSummary, 'bat' | 'bowl' | 'played' | 'six' | 'reel' | 'ff'> & {
  ff?: [string, number] | null
  reel?: import('./reel').RawReel | null
  six?: [string, number][]
  /** Ids of everyone in either XI. */
  played?: string[]
  bat: [string, number, number, number, number, 0 | 1][]
  bowl: [string, number, number, number, number][]
}

/** A stretch of the year when players can be bought, sold and released. */
export interface MarketWindow { id: string; name: string; start: string; end: string }

/** One move in the market: a signing, a purchase from another team, or a release. */
export interface Transfer {
  id: string
  date: string
  playerId: string
  name: string
  /** The team he left (null = he was unsigned). */
  from: string | null
  /** The team he joined (null = released to the unsigned pool). */
  to: string | null
  fee: number
  kind: 'sign' | 'buy' | 'release'
}

/** A computer team's offer for one of your players. You can accept it (he moves and you get the fee) or turn it down. */
export interface Offer {
  id: string
  date: string
  playerId: string
  /** The computer team that wants him. */
  teamId: string
  fee: number
  /** The last day the offer stands. */
  expires: string
}

/** Who is on which team, who is unsigned, and what everyone can afford. Lives in the season so a career carries it forward. */
export interface MarketState {
  /** Current squad of every team, as player ids (the first are the usual XI). */
  squads: Record<string, string[]>
  /** Definitions of players who have moved from the team they started with (youth are looked up from the youth pool). */
  players: Record<string, import('../types').Player>
  /** Unsigned players you can sign now (this year's youth, plus anyone released). */
  pool: string[]
  /** Youth who have not been shown yet, drawn from as the years go by. */
  reserve: string[]
  /** What each unsigned player costs. */
  asking: Record<string, number>
  /** Coins each team can spend. */
  budgets: Record<string, number>
  log: Transfer[]
  /** Offers computer teams have made for your players (undefined in older saves). */
  offers?: Offer[]
}

/** What your coach is working on. Once set it stays at least a month. */
export interface Coaching {
  focus: import('../data/coaches').CoachFocus | null
  /** When the instruction was given, and the first day it can be changed again. */
  since: string | null
  lockedUntil: string | null
  history: { focus: import('../data/coaches').CoachFocus; from: string }[]
}

export interface Season {
  id: string
  year: number
  seed: number
  teamIds: string[]
  /** The team the player manages through this session (null in older saves, where you control both sides). */
  myTeamId: string | null
  /** How hard the computer plays against you. Chosen when the session starts. */
  difficulty: Difficulty
  /** Player ids that appear in results; match lines refer to them by position. */
  roster: string[]
  competitions: Competition[]
  fixtures: Fixture[]
  results: Record<string, MatchSummary>
  /** The in-game "today". Matches on or before this date are due. */
  today: string
  /** Career gains and losses of every player, added to his starting ratings. Empty in the first year. */
  shifts?: Record<string, PlayerShift>
  /** Your own squad's batting order and captain for this session only; the team outside the session is untouched. */
  lineup?: { order: string[]; captainId: string; keeperId?: string }
  /** Who each team's physios look after, and from when. A physio on a player means he cannot be injured; the computer's teams cover their three best players. */
  physio?: Record<string, { playerId: string; from: string; to?: string }[]>
  /** Games whose highlight a strategic timeout has shown, and how many matches had been played then, so none comes back for the next 10 matches. */
  highlightsShown?: Record<string, number>
  /** Everybody's shifts when this season began, so "this season" changes can be told apart from earlier ones. */
  startShifts?: Record<string, PlayerShift>
  /** What each played match did to each player's ratings (only players whose ratings moved), by fixture. */
  changes?: Record<string, Record<string, MatchDelta>>
  /** Which coach each team has (coach ids), picked at random when the career starts and kept for its whole life. */
  coaches?: Record<string, string>
  /** True from the first day of a new year, when every team got a new coach, until you give your new coach his first instruction. */
  coachChanged?: boolean
  /** What each team's coach is working on (yours is set by you, the computer's by the computer, a month at a time). */
  coaching?: Record<string, Coaching>
  /** Training that has not added up to a whole rating point yet, by player and rating. */
  coachProgress?: Record<string, Partial<Record<AttrKey, number>>>
  /** The rating points each team's coach has added: by month (YYYY-MM), by team, by player. This is the monthly report. */
  coachReport?: Record<string, Record<string, Record<string, Partial<Record<AttrKey, number>>>>>
  /** Buying, selling and the unsigned pool (undefined in older saves until the market is set up). */
  market?: MarketState
  /** When the market is open this year. */
  windows?: MarketWindow[]
  /** True once matches played before rating changes existed have been graded (new seasons have nothing to catch up on). */
  graded?: boolean
}

/** The ratings a match can move. */
export type AttrKey = 'technique' | 'power' | 'temperament' | 'running' | 'accuracy' | 'variation' | 'stamina' | 'fielding'

/** Rating points a player has gained (positive) or lost. `bat` and `bowl` are older whole-skill shifts; `a` is per rating. */
export interface PlayerShift {
  bat: number
  bowl: number
  a?: Partial<Record<AttrKey, number>>
}

/** What one match did to one player's ratings: the change in his overall rating, and in each rating that moved. */
export interface MatchDelta {
  o: number
  a: Partial<Record<AttrKey, number>>
}

/** How one player's ratings moved at the end of a year. */
export interface PlayerChange {
  id: string
  name: string
  teamId: string
  /** Overall rating before and after. */
  before: number
  after: number
  bat: number
  bowl: number
}

export interface TableRow {
  teamId: string
  played: number
  won: number
  lost: number
  tied: number
  points: number
  nrr: number
}

/** One finished year, for the player's own team. Kept in the session so the career can be looked back on. */
export interface SeasonReview {
  year: number
  difficulty: Difficulty
  teamId: string
  teamName: string
  played: number
  won: number
  lost: number
  tied: number
  /** Where the team ranked among all teams by win rate (1 = best). */
  rank: number
  teams: number
  titles: string[]
  players: PlayerReview[]
  /** The five best teams of the year by win rate, for context. */
  table: { teamId: string; teamName: string; won: number; played: number }[]
  /** How your players' ratings changed at the end of the year. */
  progress?: PlayerChange[]
  /** The biggest risers and fallers across the whole league. */
  risers?: PlayerChange[]
  fallers?: PlayerChange[]
  finishedAt: string
}

export interface PlayerReview {
  id: string
  name: string
  matches: number
  bat: { innings: number; runs: number; balls: number; high: number; highNotOut: boolean; fifties: number; hundreds: number; fours: number; sixes: number; notOuts: number } | null
  bowl: { balls: number; runs: number; wickets: number; best: string; fiveW: number; maidens: number } | null
  potm: number
  impact: number
}
