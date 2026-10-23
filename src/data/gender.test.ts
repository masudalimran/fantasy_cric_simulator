import { describe, expect, it } from 'vitest'
import youth from './youth.json'
import { BUILT_IN_TEAMS } from './teams'
import { FEMALE_IDS, genderOfId } from './gender'

describe('character gender for the voices', () => {
  it('knows the women among the built-in characters and treats the others as men', () => {
    expect(genderOfId('bleach-rukia-kuchiki')).toBe('f')
    expect(genderOfId('finalfantasy-lightning')).toBe('f')
    expect(genderOfId('yt-frieren')).toBe('f')
    expect(genderOfId('bleach-ichigo-kurosaki')).toBe('m')
    expect(genderOfId('yt-shoyo-hinata')).toBe('m')
    expect(genderOfId('some-custom-id')).toBeUndefined()
  })
  it('every id on the list is a real character (no typos), and both genders are in every big team', () => {
    const ids = new Set([...BUILT_IN_TEAMS.flatMap((t) => t.players.map((p) => p.id)), ...(youth as { id: string }[]).map((p) => p.id)])
    for (const id of ids) expect(genderOfId(id)).toBeDefined()
    const women = [...ids].filter((id) => genderOfId(id) === 'f')
    expect(women.length).toBeGreaterThan(100)
    for (const id of FEMALE_IDS) expect(ids.has(id), id).toBe(true)
  })
})
