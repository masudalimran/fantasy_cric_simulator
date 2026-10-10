import { describe, expect, it } from 'vitest'
import { BUILT_IN_TEAMS } from './teams'
import { TOURNAMENTS } from './tournaments'
import { overall, teamStrength } from './builders'

describe('built-in teams', () => {
  it('has 20 teams with unique ids and short codes', () => {
    expect(BUILT_IN_TEAMS).toHaveLength(20)
    expect(new Set(BUILT_IN_TEAMS.map((t) => t.id)).size).toBe(20)
    expect(new Set(BUILT_IN_TEAMS.map((t) => t.short)).size).toBe(20)
  })

  it('has unique player ids across all teams', () => {
    const ids = BUILT_IN_TEAMS.flatMap((t) => t.players.map((p) => p.id))
    expect(new Set(ids).size).toBe(ids.length)
  })

  for (const team of BUILT_IN_TEAMS) {
    describe(team.name, () => {
      const xi = team.players.slice(0, 11)
      it('has 15-20 players', () => {
        expect(team.players.length).toBeGreaterThanOrEqual(15)
        expect(team.players.length).toBeLessThanOrEqual(20)
      })
      it('has exactly one keeper in the XI', () => {
        expect(xi.filter((p) => p.role === 'WK')).toHaveLength(1)
      })
      it('has at least 5 real bowling options in the XI', () => {
        expect(xi.filter((p) => p.bowling && p.bowling.accuracy >= 55).length).toBeGreaterThanOrEqual(5)
      })
      it('has bowling ratings for every bowler and allrounder', () => {
        for (const p of team.players) if (p.role === 'BOWL' || p.role === 'AR') expect(p.bowling).not.toBeNull()
      })
      it('keeps all ratings within 1-100', () => {
        for (const p of team.players) {
          const vals = [...Object.values(p.batting), p.fielding, ...(p.bowling ? [p.bowling.accuracy, p.bowling.variation, p.bowling.stamina] : [])]
          for (const v of vals) {
            expect(v).toBeGreaterThanOrEqual(1)
            expect(v).toBeLessThanOrEqual(100)
          }
        }
      })
      it('is not stacked or hopeless', () => {
        expect(teamStrength(team)).toBeGreaterThan(55)
        expect(teamStrength(team)).toBeLessThan(85)
      })
    })
  }

  it('prints team strengths for review', () => {
    const rows = BUILT_IN_TEAMS.map((t) => [t.short, teamStrength(t), Math.max(...t.players.map(overall))] as const).sort((a, b) => b[1] - a[1])
    console.log(rows.map(([s, v, m]) => `${s} xi=${v} best=${m}`).join('\n'))
  })
})

describe('tournaments', () => {
  it('each originates from a real team, with unique ids', () => {
    const ids = new Set(BUILT_IN_TEAMS.map((t) => t.id))
    for (const t of TOURNAMENTS) expect(ids.has(t.originTeamId)).toBe(true)
    expect(new Set(TOURNAMENTS.map((t) => t.id)).size).toBe(TOURNAMENTS.length)
  })
})
