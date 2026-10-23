import { describe, expect, it } from 'vitest'
import { BUILT_IN_TEAMS } from '../data/teams'
import { shade, stadiumLook } from './stadium'

describe('stadium looks', () => {
  it('is the same for the same ground and match, and different between grounds', () => {
    const a = stadiumLook(BUILT_IN_TEAMS[0], 11, 't20')
    expect(stadiumLook(BUILT_IN_TEAMS[0], 11, 't20')).toEqual(a)
    const stands = new Set(BUILT_IN_TEAMS.map((t) => stadiumLook(t, 1, 't20').stand.join()))
    expect(stands.size).toBeGreaterThanOrEqual(4)
    // the crowd wears the home team's colours
    expect(a.crowd).toContain(BUILT_IN_TEAMS[0].colors.primary)
  })
  it('T20s are mostly played at night, Tests by day, and the covers come on for a washed-out Test day', () => {
    let night = 0, day = 0
    for (let s = 1; s <= 300; s++) { if (stadiumLook(BUILT_IN_TEAMS[3], s, 't20').time === 'night') night++; if (stadiumLook(BUILT_IN_TEAMS[3], s, 'test').time === 'day') day++ }
    expect(night).toBeGreaterThan(130)
    expect(night).toBeLessThan(230)
    expect(day).toBe(300)
    const wash = stadiumLook(BUILT_IN_TEAMS[3], 5, 'test', 'washout')
    expect(wash.covers).toBe(true)
    expect(wash.rain).toBe(2)
    expect(stadiumLook(BUILT_IN_TEAMS[3], 5, 'test', 'clear').covers).toBe(false)
  })
  it('limited-overs games are never washed out in the picture: at most a drizzle', () => {
    for (let s = 1; s <= 300; s++) { const l = stadiumLook(BUILT_IN_TEAMS[1], s, 'odi'); expect(l.covers).toBe(false); expect(l.rain).toBeLessThanOrEqual(1) }
  })
  it('lightens and darkens colours', () => {
    expect(shade('#000000', 0.5)).toBe('rgb(128,128,128)')
    expect(shade('#ffffff', -0.5)).toBe('rgb(128,128,128)')
  })
})
