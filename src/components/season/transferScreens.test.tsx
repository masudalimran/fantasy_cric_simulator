import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BUILT_IN_TEAMS } from '../../data/teams'
import { overall } from '../../data/builders'
import { cameraAt, signingMate, signingPlayer, SHOW_SECONDS } from '../match/stadiumShow'
import { SIGN, signingScript } from '../match/signingScript'
import { TransferNews, signingShow, type TransferRow } from './TransferScreens'
import { transferFacts } from './transferFacts'
import { ROOM, roomScript } from './transferScript'

const [a, b] = BUILT_IN_TEAMS
const sorted = [...a.players].sort((x, y) => overall(y) - overall(x))
const row = (i: number, kind: 'sign' | 'buy' | 'release'): TransferRow => ({
  t: { id: `t${i}${kind}`, date: '2026-03-01', playerId: sorted[i].id, name: sorted[i].name, from: kind === 'sign' ? null : a.id, to: kind === 'release' ? null : b.id, fee: 12, kind },
  player: sorted[i], from: kind === 'sign' ? null : a, to: kind === 'release' ? null : b, club: kind === 'release' ? a : b, squad: (kind === 'release' ? a : b).players.filter((p) => p.id !== sorted[i].id),
})

describe('transfer scenes', () => {
  it('build a stage scene for a signing, a move and a release of every tier, with the words one voice at a time', () => {
    for (const [i, kind] of [[0, 'buy'], [6, 'sign'], [14, 'sign'], [15, 'release']] as const) {
      const { show, cast } = signingShow(row(i, kind))
      expect(show.signing?.mode).toBe(kind === 'buy' ? 'buy' : kind)
      expect(cast.players[0].id).toBe(sorted[i].id)
      const lines = show.signing!.script
      expect(lines.length).toBeGreaterThanOrEqual(3)
      for (let k = 1; k < lines.length; k++) expect(lines[k].at).toBeGreaterThanOrEqual(lines[k - 1].end)
      expect(lines[lines.length - 1].end).toBeLessThanOrEqual(SHOW_SECONDS.signing)
    }
  })
  it('a new player walks out to the stage and stops there; a leaving one walks away at the end; the camera never jumps', () => {
    const inn = signingShow(row(0, 'buy')).show, out = signingShow(row(1, 'release')).show
    const stop = signingPlayer(inn, SIGN.arrive + 0.5).pos
    expect(Math.hypot(stop.x - 0.9, stop.z + 7.7)).toBeLessThan(0.1)
    expect(Math.hypot(signingPlayer(out, 0.4).pos.x - 10, 0)).toBeLessThan(1)
    expect(Math.hypot(signingPlayer(out, SIGN.end).pos.x - 0.9, signingPlayer(out, SIGN.end).pos.z + 7.7)).toBeGreaterThan(5)
    for (const sh of [inn, out]) {
      let prev = cameraAt(sh, 0)
      for (let t = 0.05; t <= SHOW_SECONDS.signing; t += 0.05) {
        const c = cameraAt(sh, t)
        expect(Number.isFinite(c.yaw + c.pitch + c.hfov)).toBe(true)
        expect(Math.hypot(c.p.x - prev.p.x, c.p.y - prev.p.y, c.p.z - prev.p.z)).toBeLessThan(4.5)
        prev = c
      }
    }
    for (let k = 0; k < 6; k++) { const m = signingMate(inn, 6, k, k === 0); expect(Number.isFinite(m.pos.x + m.pos.z)).toBe(true) }
    expect(signingScript({ host: 'A', team: 'T', player: 'P', captain: 'C', mode: 'sign', fee: 0, tier: 5, seed: 1 }).length).toBe(3)
  })
  it('the transfer overlay draws', () => {
    expect(renderToString(<TransferNews rows={[row(0, 'buy'), row(3, 'release')]} extra={2} onClose={() => {}} />)).toContain('Transfer')
  })
  it('the card says clearly which club bought him from which, for how much, and whether it concerns you', () => {
    const buy = transferFacts({ ...row(0, 'buy'), wage: 9 }, b.id)
    expect(buy.kind).toBe('buy')
    expect(buy.from.name).toBe(a.name)
    expect(buy.to.name).toBe(b.name)
    expect(buy.rows).toContainEqual(['Transfer fee', '12 coins'])
    expect(buy.rows).toContainEqual(['Paid by', b.name])
    expect(buy.rows).toContainEqual(['Received by', a.name])
    expect(buy.rows).toContainEqual(['Yearly wage', '9 coins'])
    expect(buy.yours).toBe('bought')
    expect(transferFacts(row(0, 'buy'), a.id).yours).toBe('sold')
    expect(transferFacts(row(0, 'buy'), 'nobody').yours).toBeNull()
    const free = transferFacts(row(6, 'sign'), b.id)
    expect(free.from.name).toBe('Unsigned pool')
    expect(free.yours).toBe('signed')
    const out = transferFacts(row(15, 'release'), a.id)
    expect(out.to.name).toBe('Unsigned pool')
    expect(out.rows[0][0]).toBe('Refund')
    expect(out.yours).toBe('released')
  })
  it('the room script has one voice at a time and finishes before the scene ends', () => {
    for (const mode of ['buy', 'sign', 'release'] as const) {
      const lines = roomScript({ mode, player: 'P', to: 'B', from: 'A', fee: 12, tier: 4, seed: 3, rating: 80 })
      expect(lines.length).toBeGreaterThanOrEqual(3)
      for (let k = 1; k < lines.length; k++) expect(lines[k].at).toBeGreaterThanOrEqual(lines[k - 1].end)
      expect(lines[lines.length - 1].end).toBeLessThanOrEqual(ROOM.end)
    }
  })
})
