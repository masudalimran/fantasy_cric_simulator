import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BUILT_IN_TEAMS } from '../../data/teams'
import { Match } from '../../engine/match'
import { ambientCaption, captionVariants, type CaptionKind } from '../../season/captions'
import { boxChat, type Pundit } from '../../season/studio'
import { CommentaryBox } from './CommentaryBox'
import { StudioShow } from './StudioShow'

const [A, B] = [BUILT_IN_TEAMS[2], BUILT_IN_TEAMS[9]]
const pool: Pundit[] = BUILT_IN_TEAMS.flatMap((t) => t.players.slice(0, 3).map((player) => ({ player, team: t })))

describe('captions, the commentary box and the studio show', () => {
  it('every caption reads as a sentence about the screen, with the names filled in', () => {
    const kinds: CaptionKind[] = ['cheer-boundary', 'cheer-wicket', 'stands-batting', 'stands-bowling', 'huddle', 'wave', 'fancam-happy', 'fancam-shock', 'blimp', 'fireworks', 'lights', 'wagon', 'worm', 'manhattan', 'scoring']
    for (const k of kinds) {
      const seen = new Set<string>()
      for (let seed = 0; seed < 60; seed++) {
        const c = ambientCaption(k, { team: 'Soul Reapers', other: 'Stand Users', player: 'Ichigo', extra: '100' }, seed)
        expect(c).not.toMatch(/[{}]|undefined/)
        expect(c.length).toBeGreaterThan(15)
        seen.add(c)
      }
      expect(seen.size).toBe(captionVariants(k)) // all the wordings get used
    }
    expect(ambientCaption('cheer-boundary', { team: 'Soul Reapers', player: 'Ichigo' }, 1)).toMatch(/Soul Reapers|Ichigo/)
  })

  it('the commentary box shows the window, the two of them and their words', () => {
    const m = new Match({ teamA: A, teamB: B, format: 't20', seed: 6 })
    m.playOvers(6)
    const lines = boxChat(m, 4)
    expect(lines).toHaveLength(4)
    expect(new Set(lines).size).toBe(4)
    const html = renderToString(<CommentaryBox lines={lines} teams={[A, B]} rate={1} />)
    expect(html).toContain('Commentary box')
    expect(html).toContain('<svg')
  })

  it('the studio show sets the stage: the show name, the three people and the ticker', () => {
    const m = new Match({ teamA: A, teamB: B, format: 't20', seed: 8 })
    m.playMatch()
    const html = renderToString(<StudioShow match={m} kind="end" pool={pool} seed={8} onDone={() => undefined} />)
    expect(html).toContain('Post-Match Show')
    expect(html).toContain('FCS')
    expect(html).toContain(m.result!.text)
  })
})
