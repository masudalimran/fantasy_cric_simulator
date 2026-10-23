import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BUILT_IN_TEAMS } from '../../data/teams'
import { challengeTalk } from '../../season/challenge'
import { trackFor } from '../../season/moments'
import { ChallengeScreen, challengeSeconds } from './ChallengeScreen'
import { ReviewScreen } from './ReviewScreens'

const [A, B] = [BUILT_IN_TEAMS[2], BUILT_IN_TEAMS[9]]
const [p1, p2, p3, p4, p5] = [A.players[0], A.players[1], B.players[0], B.players[1], B.players[2]]

describe('the challenge screens', () => {
  it('the huddle shows the people and what the first of them says, for both sides', () => {
    const names = { bowler: p3.name, captain: p4.name, keeper: p5.name, striker: p1.name, partner: p2.name }
    const bowl = challengeTalk({ by: 'bowl', kind: 'edge', desperate: false, left: 2, total: 2, seq: 4, names })
    const html = renderToString(<ChallengeScreen info={{ by: 'bowl', kind: 'edge', desperate: false, left: 2, total: 2, people: bowl.people.map((role) => ({ role, player: { bowler: p3, captain: p4, keeper: p5, striker: p1, partner: p2 }[role], team: B })), lines: bowl.lines, rate: 1 }} />)
    expect(html).toContain(p3.name)
    expect(html).toContain(p4.name)
    expect(html).toContain(p5.name)
    expect(html.replace(/<!-- -->/g, '')).toContain('2 of 2')
    const bat = challengeTalk({ by: 'bat', kind: 'lbw', desperate: true, left: 1, total: 2, seq: 9, names })
    const html2 = renderToString(<ChallengeScreen info={{ by: 'bat', kind: 'lbw', desperate: true, left: 1, total: 2, people: bat.people.map((role) => ({ role, player: role === 'striker' ? p1 : p2, team: A })), lines: bat.lines, rate: 1 }} />)
    expect(html2).toContain(p1.name)
    expect(html2).toContain('Last chance')
    expect(challengeSeconds(bowl.lines)).toBeGreaterThan(bowl.lines.length * 1.5)
  })
  it('the review shows the new verdict when a decision is overturned, and says the challenge was lost when it stands', () => {
    const base = { batsman: p1, batTeam: A, bowler: p3, bowlTeam: B, rate: 1 }
    const over = renderToString(<ReviewScreen info={{ ...base, by: 'bat', out: true, finalOut: false, overturned: true, left: 2, total: 2, track: trackFor(5, false) }} />)
    expect(over).toContain('NOT OUT')
    expect(over).toContain('overturned')
    expect(over).toContain('Challenge upheld')
    const stands = renderToString(<ReviewScreen info={{ ...base, by: 'bat', out: true, finalOut: true, overturned: false, left: 1, total: 2, track: trackFor(5, true) }} />)
    expect(stands).toContain('OUT')
    expect(stands).toContain('Challenge lost')
    const flat = renderToString(<ReviewScreen info={{ ...base, by: 'field', kind: 'edge', out: false, finalOut: false, overturned: false, left: 1, total: 2, track: trackFor(6, false) }} />)
    expect(flat).toContain('No spike')
  })
})
