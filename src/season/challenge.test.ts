import { describe, expect, it } from 'vitest'
import { challengeTalk, type TalkCtx } from './challenge'

const names = { bowler: 'Dio Brando', captain: 'Jotaro Kujo', keeper: 'Noriaki Kakyoin', striker: 'Son Goku', partner: 'Vegeta' }
const ctx = (o: Partial<TalkCtx> = {}): TalkCtx => ({ by: 'bowl', kind: 'lbw', desperate: false, left: 2, total: 2, seq: 7, names, ...o })

describe('the challenge huddle', () => {
  it('has the bowler, the captain and the keeper talk when the fielding side asks, and the two batsmen when the batting side asks', () => {
    expect(challengeTalk(ctx()).people).toEqual(['bowler', 'captain', 'keeper'])
    expect(challengeTalk(ctx({ by: 'bat' })).people).toEqual(['striker', 'partner'])
    const t = challengeTalk(ctx())
    expect(new Set(t.lines.map((l) => l.who))).toEqual(new Set(['bowler', 'captain', 'keeper']))
    const b = challengeTalk(ctx({ by: 'bat' }))
    expect(new Set(b.lines.map((l) => l.who))).toEqual(new Set(['striker', 'partner']))
  })
  it('talks about the sound for an edge and about the stumps for an lbw, and a side against the wall says it has nothing to lose', () => {
    const joined = (c: TalkCtx) => challengeTalk(c).lines.map((l) => l.text).join(' ')
    let sound = 0
    for (let s = 1; s <= 20; s++) if (/nick|sound|noise|touch|heard|brushed/i.test(joined(ctx({ kind: 'edge', seq: s })))) sound++
    expect(sound).toBe(20)
    let wall = 0
    for (let s = 1; s <= 20; s++) if (/nothing to lose|miracle|probably out|bad/i.test(joined(ctx({ by: 'bat', desperate: true, seq: s })))) wall++
    expect(wall).toBe(20)
  })
  it('is the same for the same ball, varies between balls, and leaves no gaps', () => {
    expect(challengeTalk(ctx())).toEqual(challengeTalk(ctx()))
    const texts = new Set<string>()
    for (let s = 1; s <= 40; s++) for (const l of challengeTalk(ctx({ seq: s })).lines) { texts.add(l.text); expect(l.text).not.toMatch(/undefined|NaN|[{}]/) }
    expect(texts.size).toBeGreaterThan(9)
  })
})
