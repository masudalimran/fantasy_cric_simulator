import type { Team } from '../types'
import type { MatchFormat } from '../types'
import type { Weather } from './types'

/**
 * How the ground looks on the broadcast: each team's home ground has its own stands, boards and crowd colours, a match is played by day, at dusk or
 * under floodlights, and some days are grey or wet (with the covers on the pitch when play is washed out). This is scenery only: it comes from the
 * home team and the match seed and the engine never reads it, so no result changes. (A Test uses the weather the engine really planned for the day.)
 */
export type TimeOfDay = 'day' | 'dusk' | 'night'
export type Sky = Weather | 'clear'
export interface StadiumLook {
  time: TimeOfDay
  /** The two colours the stands alternate between (before the time of day lightens or darkens them). */
  stand: [string, string]
  /** The advertising boards alternate between these. */
  board: [string, string]
  /** The crowd: mostly the home team's colours. */
  crowd: string[]
  weather: Sky
  /** 0 dry, 1 drizzle, 2 rain. */
  rain: 0 | 1 | 2
  /** The covers are on the pitch (a washed-out day). */
  covers: boolean
  /** Floodlights are on (night and dusk). */
  lights: boolean
}

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }
const unit = (n: number) => { const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s) }

/** Stand colours a ground can have (each pair is a dark and a slightly lighter shade). */
const STANDS: [string, string][] = [['#162036', '#1b2740'], ['#2a1a1a', '#3a2323'], ['#10261f', '#17352b'], ['#241a33', '#30244a'], ['#262626', '#353535'], ['#1a2a3a', '#223a50']]

export function stadiumLook(home: Pick<Team, 'id' | 'colors'>, matchSeed: number, format: MatchFormat, testWeather?: Weather | null): StadiumLook {
  const h = hash(home.id)
  const u = unit(matchSeed * 0.731 + (h % 997))
  // T20s are mostly under lights, one-day games by day or into the evening, Tests by day
  const time: TimeOfDay = format === 'test' ? 'day' : format === 't20' ? (u < 0.6 ? 'night' : u < 0.82 ? 'dusk' : 'day') : (u < 0.55 ? 'day' : u < 0.8 ? 'dusk' : 'night')
  let weather: Sky = 'clear'
  if (format === 'test' && testWeather) weather = testWeather
  else if (format !== 'test') { const w = unit(matchSeed * 1.913 + (h % 311)); weather = w < 0.8 ? 'clear' : w < 0.93 ? 'overcast' : 'drizzle' }
  const rain = weather === 'drizzle' ? 1 : weather === 'rain' || weather === 'washout' ? 2 : 0
  const { primary, secondary } = home.colors
  return {
    time, weather, rain: rain as 0 | 1 | 2, covers: weather === 'washout', lights: time !== 'day',
    stand: STANDS[h % STANDS.length],
    board: [primary, h % 3 === 0 ? '#e5e7eb' : secondary],
    crowd: [primary, primary, secondary, primary, '#e5e7eb', '#fbbf24', '#94a3b8'],
  }
}

/** A colour mixed towards white (amount above 0) or black (below 0): used to lighten the stands by day and darken them at night. */
export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.round(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount)))
  return `rgb(${ch[0]},${ch[1]},${ch[2]})`
}

export const DEFAULT_LOOK: StadiumLook = { time: 'night', stand: STANDS[0], board: ['#6366f1', '#e5e7eb'], crowd: ['#6366f1', '#e5e7eb', '#fbbf24', '#94a3b8'], weather: 'clear', rain: 0, covers: false, lights: true }
