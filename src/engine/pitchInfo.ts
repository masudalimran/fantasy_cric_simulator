import type { Pitch } from './types'

/**
 * How much the pitch rewards the side that makes the right toss call: from -1 (bowling first is the smart choice) to +1 (batting first is).
 * A flat or turning pitch is at its best early on and wears down, so it favours batting first; a green, fast pitch gives the new ball
 * a lot early on and then settles, so it favours bowling first. Worked out from the same hidden pitch values, so nothing new is drawn.
 */
export function pitchLean(p: Pitch): number {
  const v = 0.5 * (p.ease / SPREAD.ease) + 0.4 * (p.spin / SPREAD.spin) - 0.55 * (p.pace / SPREAD.pace)
  return Math.max(-1, Math.min(1, v * 0.8))
}

/** How strongly the pitch changes each innings, as a share of the batting-versus-bowling balance: 20% in the first innings, 10% (the other way) in the second. */
export const PITCH_SWING = [0.2, -0.1] as const

/** The toss advice a pitch report gives: which choice the pitch favours, and how strongly. */
export function tossAdvice(p: Pitch): { choice: 'bat' | 'bowl' | null; strength: 'slight' | 'clear' | 'strong'; text: string } {
  const lean = pitchLean(p)
  const a = Math.abs(lean)
  if (a < 0.2) return { choice: null, strength: 'slight', text: 'No clear edge: the pitch plays the same for both innings, so either call is fine.' }
  const strength = a > 0.6 ? 'strong' : a > 0.4 ? 'clear' : 'slight'
  const adj = strength === 'strong' ? 'strongly' : strength === 'clear' ? 'clearly' : 'slightly'
  return lean > 0
    ? { choice: 'bat', strength, text: `The pitch ${adj} favours batting first: it is at its best now and will tire, so put runs on the board.` }
    : { choice: 'bowl', strength, text: `The pitch ${adj} favours bowling first: the new ball will do the most early, and batting gets easier later.` }
}

/**
 * Every match already has a hidden pitch (how easy it is to bat on, and how much it helps pace and spin), drawn from the match
 * seed. This puts words on it so the player can see it (the engine reads `pitchLean` for the toss edge).
 */
export type PitchKind = 'balanced' | 'flat' | 'slow' | 'green' | 'dead' | 'dry' | 'true'
export interface PitchInfo { kind: PitchKind; icon: string; label: string; tip: string }

// The spread of each value (see Match's constructor), so they can be compared on one scale.
const SPREAD = { ease: 0.24, pace: 0.3, spin: 0.3 }
const LIMIT = 0.8

export function describePitch(p: Pitch): PitchInfo {
  const z = [
    { k: 'ease', v: p.ease / SPREAD.ease }, { k: 'pace', v: p.pace / SPREAD.pace }, { k: 'spin', v: p.spin / SPREAD.spin },
  ].sort((a, b) => Math.abs(b.v) - Math.abs(a.v))[0]
  if (Math.abs(z.v) < LIMIT) return { kind: 'balanced', icon: '⚖️', label: 'Balanced pitch', tip: 'A fair contest between bat and ball.' }
  if (z.k === 'ease') return z.v > 0
    ? { kind: 'flat', icon: '🏏', label: 'Flat pitch', tip: 'Good for batting: expect big scores and plenty of boundaries.' }
    : { kind: 'slow', icon: '🐢', label: 'Slow pitch', tip: 'Hard to score on: runs will be scarce and wickets more likely.' }
  if (z.k === 'pace') return z.v > 0
    ? { kind: 'green', icon: '🌱', label: 'Green pitch', tip: 'The seamers get help: pace bowlers are at their best.' }
    : { kind: 'dead', icon: '🪨', label: 'Dead pitch', tip: 'Little in it for the fast bowlers.' }
  return z.v > 0
    ? { kind: 'dry', icon: '🏜️', label: 'Dry, turning pitch', tip: 'Spinners get help, more so in the second innings.' }
    : { kind: 'true', icon: '🛣️', label: 'Hard, true pitch', tip: 'Spinners will find little to work with.' }
}

/** The colours the field is drawn with for a pitch: grass, and the strip down the middle. */
export function pitchColors(kind: PitchKind): { grass: [string, string]; strip: [string, string, string] } {
  switch (kind) {
    case 'green': return { grass: ['#1d7a3e', '#186b35'], strip: ['#9aae66', '#b4c27c', '#9aae66'] }
    case 'dry': return { grass: ['#2c7a3a', '#276d34'], strip: ['#c98f52', '#e0ad72', '#c98f52'] }
    case 'flat': return { grass: ['#1c7040', '#176236'], strip: ['#c9a864', '#e2c78c', '#c9a864'] }
    case 'slow': return { grass: ['#1b6a3b', '#165d32'], strip: ['#a98a58', '#bf9f6c', '#a98a58'] }
    default: return { grass: ['#1c7040', '#176236'], strip: ['#bf9a5f', '#d7b87c', '#bf9a5f'] }
  }
}
