import { CALL_NAMES } from '../../data/callNames'
import type { Match } from '../../engine/match'
import type { BatterLine, BowlerLine, Innings } from '../../engine/types'

/** What a player is called on a name plate: the first name (and for a name like "Monkey D. Luffy", the name after the initial). */
export const firstName = (name: string) => { const p = name.trim().split(/\s+/); return p.length > 2 && /^[A-Z]\.?$/.test(p[1]) ? p[p.length - 1] : p[0] ?? name }
/** What a player is called on a name plate and the score bar: his own call name if he has one (Goku, Mustang, Whitebeard), otherwise his first name. */
export const callName = (p: { id: string; name: string }) => CALL_NAMES[p.id] ?? firstName(p.name)
export const oversText = (legalBalls: number) => `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`
export const strikeRate = (runs: number, balls: number) => (balls ? ((runs / balls) * 100).toFixed(1) : '-')
export const economy = (b: BowlerLine) => (b.legalBalls ? ((b.runs / b.legalBalls) * 6).toFixed(1) : '-')
export const runRate = (inn: Innings) => (inn.legalBalls ? ((inn.runs / inn.legalBalls) * 6).toFixed(2) : '0.00')

export function dismissalText(m: Match, b: BatterLine, inn: Innings): string {
  const d = b.dismissal
  if (!d) return inn.done || m.isOver ? 'not out' : b.id === inn.strikerId || b.id === inn.nonStrikerId ? 'batting' : 'not out'
  const name = (id: string | null) => (id ? m.player(id).name : '')
  switch (d.kind) {
    case 'bowled': return `b ${name(d.bowlerId)}`
    case 'caught': return `c ${name(d.fielderId)} b ${name(d.bowlerId)}`
    case 'caught and bowled': return `c & b ${name(d.bowlerId)}`
    case 'lbw': return `lbw b ${name(d.bowlerId)}`
    case 'stumped': return `st ${name(d.fielderId)} b ${name(d.bowlerId)}`
    case 'run out': return `run out (${name(d.fielderId)})`
    case 'hit wicket': return `hit wicket b ${name(d.bowlerId)}`
  }
}
