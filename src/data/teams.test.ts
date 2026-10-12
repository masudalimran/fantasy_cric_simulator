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
      it('has at least 5 bowling options in the XI', () => {
        expect(xi.filter((p) => p.bowling && p.bowling.accuracy >= 30).length).toBeGreaterThanOrEqual(5)
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
        expect(teamStrength(team)).toBeGreaterThan(50)
        expect(teamStrength(team)).toBeLessThan(90)
      })
    })
  }

  it('prints team strengths for review', () => {
    const rows = BUILT_IN_TEAMS.map((t) => [t.short, teamStrength(t), Math.max(...t.players.map(overall))] as const).sort((a, b) => b[1] - a[1])
    console.log(rows.map(([s, v, m]) => `${s} xi=${v} best=${m}`).join('\n'))
  })
})

describe('team tiers', () => {
  const str = (id: string) => teamStrength(BUILT_IN_TEAMS.find((t) => t.id === id)!)
  const top = ['dragonball', 'onepiece', 'assassinscreed']
  const mid = ['naruto', 'demonslayer', 'bleach']
  it('the three most popular teams are the top tier, then the middle, then everyone else', () => {
    const rest = BUILT_IN_TEAMS.filter((t) => ![...top, ...mid].includes(t.id)).map((t) => teamStrength(t))
    expect(Math.min(...top.map(str))).toBeGreaterThan(Math.max(...mid.map(str)))
    expect(Math.max(...rest)).toBeLessThanOrEqual(Math.max(...mid.map(str)))
    expect(Math.min(...rest)).toBeLessThan(Math.min(...mid.map(str)) - 3) // and the bottom is properly weak
  })
  it('none of the new teams share a character with the youth pool or another team', () => {
    const names = BUILT_IN_TEAMS.flatMap((t) => t.players.map((p) => p.name.toLowerCase()))
    expect(new Set(names).size).toBe(names.length)
  })
})

describe('portraits', () => {
  it('every player on every built-in team has a portrait in the game (not only in one browser)', async () => {
    const manifest = (await import('./imageManifest.json')).default.players as Record<string, string>
    const missing = BUILT_IN_TEAMS.flatMap((t) => t.players.filter((p) => !manifest[p.id]).map((p) => `${t.id}/${p.name}`))
    expect(missing).toEqual([])
  })
})

describe('youth pool', () => {
  it('has no one who already plays for a team, and every one has a portrait', async () => {
    const { YOUTH } = await import('./youthPool')
    const manifest = (await import('./imageManifest.json')).default.players as Record<string, string>
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')
    const onTeams = new Set([...BUILT_IN_TEAMS].flatMap((t) => t.players.map((p) => norm(p.name))))
    expect(YOUTH.length).toBeGreaterThan(200)
    for (const y of YOUTH) { expect(onTeams.has(norm(y.name))).toBe(false); expect(manifest[y.id]).toBeTruthy() }
  })
})

describe('tournaments', () => {
  it('each originates from a real team, with unique ids', () => {
    const ids = new Set(BUILT_IN_TEAMS.map((t) => t.id))
    for (const t of TOURNAMENTS) expect(ids.has(t.originTeamId)).toBe(true)
    expect(new Set(TOURNAMENTS.map((t) => t.id)).size).toBe(TOURNAMENTS.length)
  })
})
