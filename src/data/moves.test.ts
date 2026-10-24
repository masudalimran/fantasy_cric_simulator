import { describe, expect, it } from 'vitest'
import { camWide, prep, type V3 } from '../components/match/broadcast'
import { drawMove, type MoveDraw } from '../components/match/moveFx'
import { BUILT_IN_TEAMS } from './teams'
import { isBigSix, isStrongFour, moveFor, moveForBall, STAR_MOVES, TEAM_MOVES, type MoveStyle } from './moves'

const STYLES: MoveStyle[] = ['beam', 'sphere', 'slash', 'lightning', 'flame', 'rune', 'rush', 'pulse']

describe('signature moves', () => {
  it('every built-in team has a move, and every star is on a real team', () => {
    for (const t of BUILT_IN_TEAMS) expect(TEAM_MOVES[t.id], t.id).toBeTruthy()
    const ids = new Set(BUILT_IN_TEAMS.flatMap((t) => t.players.map((p) => p.id)))
    for (const id of Object.keys(STAR_MOVES)) expect(ids.has(id), id).toBe(true)
    for (const mv of [...Object.values(TEAM_MOVES), ...Object.values(STAR_MOVES)]) {
      expect(STYLES).toContain(mv.style)
      expect(mv.c1).toMatch(/^#[0-9a-f]{6}$/i)
      expect(mv.c2).toMatch(/^#[0-9a-f]{6}$/i)
      expect(mv.name.length).toBeGreaterThan(3)
    }
  })

  it('a star uses his own move and everybody else his team\'s', () => {
    expect(moveFor('dragonball-vegeta', { id: 'dragonball' })?.name).toBe('FINAL FLASH!')
    expect(moveFor('a-youth-player', { id: 'dragonball' })?.name).toBe('KAMEHAMEHA!')
    expect(moveFor('x', { id: 'my-own-team' })).toBeNull()
  })

  it('a six always shows the move, a four only sometimes, a wicket the bowler\'s, and nothing else', () => {
    const ev = { seq: 1, boundary: 0 as 0 | 4 | 6, intent: 1, wicket: null as unknown, extraType: null as unknown }
    const t = { id: 'naruto' }, b = { id: 'a-youth-bowler' }
    const call = (e: Partial<typeof ev>) => moveForBall({ ...ev, ...e } as never, { id: 'naruto-sasuke-uchiha' }, t, b, { id: 'bleach' })
    expect(call({ boundary: 6 })?.move.name).toBe('CHIDORI!')
    expect(call({ boundary: 6 })?.size).toBe(1)
    expect(call({})).toBeNull()
    expect(call({ extraType: 'wide', boundary: 4 })).toBeNull()
    expect(call({ wicket: { kind: 'bowled', playerId: 'x' } })?.by).toBe('bowl')
    expect(call({ wicket: { kind: 'bowled', playerId: 'x' } })?.move.name).toBe('GETSUGA TENSHO!')
    expect(call({ wicket: { kind: 'run out', playerId: 'x' } })).toBeNull()
    const fours = Array.from({ length: 200 }, (_, i) => call({ seq: i + 1, boundary: 4, intent: 1 })).filter(Boolean).length
    expect(fours).toBeGreaterThan(80)
    expect(fours).toBeLessThan(180)
    expect(call({ boundary: 4, intent: -1 })).toBeNull()
    expect(isStrongFour({ seq: 1, boundary: 4, intent: 0 })).toBe(false)
  })

  it('only the longest sixes, or a six that brings up a fifty, get the cut-in', () => {
    expect(isBigSix({ boundary: 6, distance: 95, tags: [] })).toBe(true)
    expect(isBigSix({ boundary: 6, distance: 70, tags: [] })).toBe(false)
    expect(isBigSix({ boundary: 6, distance: 70, tags: ['fifty'] })).toBe(true)
    expect(isBigSix({ boundary: 4, distance: 120, tags: [] })).toBe(false)
  })

  it('every style draws without trouble, at every moment of its life', () => {
    const calls: string[] = []
    const grad = { addColorStop: () => undefined }
    const ctx = new Proxy({}, { get: (_t, k) => (k === 'createRadialGradient' || k === 'createLinearGradient' ? () => grad : () => { calls.push(String(k)) }), set: () => true }) as unknown as CanvasRenderingContext2D
    const r = prep(camWide, 390, 520)
    const path: V3[] = Array.from({ length: 30 }, (_, i) => ({ x: i * 0.3, y: 1 + i * 0.4, z: 4 + i * 1.5 }))
    for (const style of STYLES) for (const k of [0, 0.05, 0.3, 0.7, 1.2, 2, 2.5]) {
      const m: MoveDraw = { style, c1: '#38bdf8', c2: '#e0f2fe', k, life: 2.2, size: 1, from: { x: 0, y: 0.8, z: -0.4 }, path, ball: path[path.length - 1], seed: 4 }
      expect(() => drawMove(ctx, r, m)).not.toThrow()
      expect(() => drawMove(ctx, r, { ...m, c1: '#111827', path: [], ball: null })).not.toThrow()
    }
    expect(calls.length).toBeGreaterThan(50)
  })
})
