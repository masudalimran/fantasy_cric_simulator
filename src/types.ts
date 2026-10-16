/**
 * Rating scale (1-100) used for every attribute:
 *   20-35  tailender / part-timer
 *   50-60  solid international regular
 *   70-80  star
 *   85-92  all-time great
 *   93+    legendary / beyond human
 */
export type Role = 'BAT' | 'BOWL' | 'AR' | 'WK'
export type Hand = 'R' | 'L'
export type BowlType = 'fast' | 'medium' | 'offspin' | 'legspin' | 'leftspin'
export type Universe = 'anime' | 'game' | 'custom'

export type Trait =
  | 'anchor' // steadies the innings, rarely throws it away
  | 'finisher' // lifts in the last overs
  | 'pace-crusher'
  | 'spin-master'
  | 'weak-vs-pace'
  | 'weak-vs-spin'
  | 'clutch' // rises under pressure
  | 'big-match'
  | 'slow-starter'
  | 'hothead' // more aggressive, more fragile
  | 'big-hitter'
  | 'unpredictable' // higher variance, both ways
  | 'wicket-taker'
  | 'economical'
  | 'powerplay-specialist'
  | 'death-specialist'
  | 'safe-hands'
  | 'electric-fielder'

export interface BattingRatings {
  technique: number // defence, handling movement, avoiding dismissal
  power: number // boundary hitting
  temperament: number // composure, converting starts, handling pressure
  running: number // running between the wickets
}

export interface BowlingRatings {
  type: BowlType
  accuracy: number // economy, dot balls
  variation: number // wicket-taking threat: swing, spin, deception
  stamina: number // holds quality through a long spell
}

export interface Player {
  id: string
  name: string
  role: Role
  hand: Hand
  batting: BattingRatings
  bowling: BowlingRatings | null
  fielding: number // catching, ground fielding, throwing (and keeping for WK)
  traits: Trait[]
  imageUrl?: string // optional override; default is /images/players/<id>.png
}

export interface TeamColors {
  primary: string
  secondary: string
}

export interface Team {
  id: string
  name: string
  short: string
  series: string // the franchise it comes from
  universe: Universe
  colors: TeamColors
  home: string
  /** Generic emblem key for custom teams (built-in teams have their own). */
  emblem?: string
  /** Optional logo image URL; when set it replaces the drawn emblem. */
  logoUrl?: string
  captainId: string
  /** Who keeps wicket. If unset, the XI's keeper-role player does. */
  keeperId?: string
  /** First 11 are the default XI in batting order; the rest are the bench. */
  players: Player[]
  isCustom?: boolean
}

export type MatchFormat = 't20' | 'odi' | 'test'

export interface TournamentDef {
  id: string
  name: string
  originTeamId: string // the team "that founded it"
  format: MatchFormat
  kind: 'league' | 'cup' | 'knockout'
  blurb: string
}
