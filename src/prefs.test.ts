import { beforeEach, describe, expect, it } from 'vitest'

describe('animation levels', () => {
  beforeEach(() => { (globalThis as { localStorage?: unknown }).localStorage = { getItem: () => null, setItem: () => undefined } })
  it('add up from the individual switches', async () => {
    const { animLevelOf, setAnimLevel, getAnimPrefs, setAnimPrefs } = await import('./prefs')
    setAnimLevel('light')
    expect(getAnimPrefs()).toMatchObject({ wicket: true, six: true, milestone: true, four: false, extras: false, freeHit: false })
    expect(animLevelOf(getAnimPrefs())).toBe('light')
    setAnimLevel('off')
    expect(animLevelOf(getAnimPrefs())).toBe('off')
    setAnimLevel('full')
    expect(animLevelOf(getAnimPrefs())).toBe('full')
    setAnimPrefs({ four: false })
    expect(animLevelOf(getAnimPrefs())).toBeNull() // a mix is "custom"
  })
})
