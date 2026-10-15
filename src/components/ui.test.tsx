import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BUILT_IN_TEAMS } from '../data/teams'
import { PlayerAvatar } from './ui'

describe('overseas arrow on the portrait', () => {
  const [A, B] = [BUILT_IN_TEAMS[0], BUILT_IN_TEAMS[1]]
  it('shows on a player who plays for another anime, not on his own team or on tiny portraits', () => {
    const p = A.players[0]
    expect(renderToString(<PlayerAvatar player={p} team={A} size={44} />)).not.toContain('✈')
    expect(renderToString(<PlayerAvatar player={p} team={B} size={44} />)).toContain('✈')
    expect(renderToString(<PlayerAvatar player={p} team={B} size={24} />)).not.toContain('✈')
  })
})
