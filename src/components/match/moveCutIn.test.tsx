import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { STAR_MOVES } from '../../data/moves'
import { BUILT_IN_TEAMS } from '../../data/teams'
import { MoveCutIn } from './MoveCutIn'

describe('the signature-move cut-in', () => {
  const team = BUILT_IN_TEAMS.find((t) => t.id === 'dragonball')!
  const goku = team.players[0]
  it('shows the move and the batsman', () => {
    const html = renderToString(<MoveCutIn move={STAR_MOVES['dragonball-son-goku']} batsman={goku} team={team} />)
    expect(html).toContain('KAMEHAMEHA!')
  })
})
