import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MOVE_ART, moveArtFor } from '../../data/moveArt'
import { STAR_MOVES, TEAM_MOVES } from '../../data/moves'
import { BUILT_IN_TEAMS } from '../../data/teams'
import { MoveCutIn } from './MoveCutIn'

describe('the signature-move cut-in', () => {
  const team = BUILT_IN_TEAMS.find((t) => t.id === 'dragonball')!
  const goku = team.players[0]
  it('shows the move and the batsman, with his picture when one has been added', () => {
    const plain = renderToString(<MoveCutIn move={STAR_MOVES['dragonball-son-goku']} batsman={goku} team={team} />)
    expect(plain).toContain('KAMEHAMEHA!')
    expect(plain).not.toContain('<img src="/x.webp"')
    const withArt = renderToString(<MoveCutIn move={TEAM_MOVES.dragonball} batsman={goku} team={team} art="/x.webp" />)
    expect(withArt).toContain('src="/x.webp"')
  })
  it('every picture dropped in src/assets/moves is named after a real player', () => {
    const ids = new Set(BUILT_IN_TEAMS.flatMap((t) => t.players.map((p) => p.id)))
    for (const id of Object.keys(MOVE_ART)) expect(ids.has(id), `${id} is not a player id`).toBe(true)
    expect(moveArtFor('nobody')).toBeNull()
  })
})
