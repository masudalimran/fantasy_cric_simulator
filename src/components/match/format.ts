import type { Match } from '../../engine/match'
import type { BatterLine, BowlerLine, Innings } from '../../engine/types'

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
