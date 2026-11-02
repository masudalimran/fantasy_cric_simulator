import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BUILT_IN_TEAMS } from '../../data/teams'
import { TransferNews, type TransferRow } from './TransferScreens'

describe('transfer screens', () => {
  it('draw a signing, a move between clubs and a release for players of every tier', () => {
    const [a, b] = BUILT_IN_TEAMS
    const players = [...a.players].sort((x, y) => (y.batting.power + (y.bowling?.variation ?? 0)) - (x.batting.power + (x.bowling?.variation ?? 0)))
    const rows: TransferRow[] = [
      { t: { id: 't1', date: '2026-03-01', playerId: players[0].id, name: players[0].name, from: null, to: a.id, fee: 12, kind: 'sign' }, player: players[0], from: null, to: a, mates: b.players.slice(0, 3) },
      { t: { id: 't2', date: '2026-03-01', playerId: players[5].id, name: players[5].name, from: a.id, to: b.id, fee: 30, kind: 'buy' }, player: players[5], from: a, to: b, mates: b.players.slice(0, 3) },
      { t: { id: 't3', date: '2026-03-01', playerId: players[9].id, name: players[9].name, from: a.id, to: null, fee: 3, kind: 'release' }, player: players[9], from: a, to: null, mates: a.players.slice(0, 2) },
    ]
    for (let i = 0; i < rows.length; i++) {
      const html = renderToString(<TransferNews rows={[rows[i]]} mine={a.id} extra={2} onClose={() => {}} />)
      expect(html).toContain(rows[i].player.name)
      expect(html).toContain(i === 2 ? 'RELEASED' : 'Done')
    }
    expect(renderToString(<TransferNews rows={rows} mine={null} extra={0} onClose={() => {}} />)).toContain('Transfer news')
  })
})
