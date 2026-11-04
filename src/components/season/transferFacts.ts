import { overall } from '../../data/builders'
import { formatDate } from '../../season/dates'
import type { Transfer } from '../../season/types'
import type { Player, Team } from '../../types'
import { bowlLabel, ROLE_LABEL, tierOf } from '../ui'

export interface Side { name: string; team: Team | null; note: string }
export interface TransferFacts {
  kind: 'buy' | 'sign' | 'release'
  /** "TRANSFER", "SIGNING" or "RELEASE". */
  label: string
  headline: string
  player: { name: string; role: string; detail: string; rating: number; tier: string; tierColor: string }
  from: Side
  to: Side
  /** The clean rows of the card: what was paid, by whom, to whom. */
  rows: [string, string][]
  /** How it concerns you: your club bought, sold, signed or released him. */
  yours: 'bought' | 'sold' | 'signed' | 'released' | null
}

const coins = (n: number) => `${n} ${n === 1 ? 'coin' : 'coins'}`

/** Everything the card says about a move, as plain data (so it can be tested and drawn cleanly). */
export function transferFacts(row: { t: Transfer; player: Player; from: Team | null; to: Team | null; wage?: number }, mine?: string | null): TransferFacts {
  const { t, player, from, to, wage } = row
  const kind = t.kind === 'release' || !to ? 'release' : t.kind === 'buy' ? 'buy' : 'sign'
  const tier = tierOf(overall(player))
  const detail = [player.hand === 'R' ? 'Right-handed' : 'Left-handed', player.bowling ? bowlLabel(player.bowling.type) : null].filter(Boolean).join(' · ')
  const fromSide: Side = { name: from?.name ?? 'Unsigned pool', team: from, note: from ? 'Selling club' : 'No club' }
  const toSide: Side = { name: to?.name ?? 'Unsigned pool', team: to, note: to ? 'Buying club' : 'No club' }
  const rows: [string, string][] = []
  if (kind === 'buy') {
    rows.push(['Transfer fee', coins(t.fee)], ['Paid by', to?.name ?? ''], ['Received by', from?.name ?? ''])
  } else if (kind === 'sign') {
    rows.push(['Signing fee', coins(t.fee)], ['Paid by', to?.name ?? ''], ['Previous club', 'None (he was unsigned)'])
  } else {
    rows.push(['Refund', coins(t.fee)], ['Paid to', from?.name ?? ''], ['Next', 'Joins the unsigned pool'])
  }
  if (kind !== 'release' && wage) rows.push(['Yearly wage', coins(wage)])
  rows.push(['Date', formatDate(t.date)])
  const yours = !mine ? null : kind === 'release' ? (from?.id === mine ? 'released' : null) : to?.id === mine ? (kind === 'buy' ? 'bought' : 'signed') : from?.id === mine ? 'sold' : null
  const headline = kind === 'release' ? `${player.name} released by ${from?.name ?? 'his club'}` : kind === 'buy' ? `${player.name} moves from ${from?.name} to ${to?.name}` : `${to?.name} sign ${player.name}`
  return {
    kind, label: kind === 'buy' ? 'TRANSFER' : kind === 'sign' ? 'SIGNING' : 'RELEASE', headline,
    player: { name: player.name, role: ROLE_LABEL[player.role], detail, rating: overall(player), tier: tier.label, tierColor: tier.color },
    from: fromSide, to: toSide, rows, yours,
  }
}
