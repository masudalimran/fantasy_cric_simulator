import { describe, expect, it } from 'vitest'
import { assignVoices, chunks, prosody, rankVoices, sameVoices, spoken, voiceGender, type VoiceLike } from './speechText'

describe('speaking lines', () => {
  it('says scores and figures the way a commentator would', () => {
    expect(spoken('Jolyne has 3/24 from 4.0 overs')).toBe('Jolyne has 3 for 24 from 4 point 0 overs')
    expect(spoken('Fastest 148 km/h')).toBe('Fastest 148 kilometres an hour')
    expect(spoken('Goku made 52* with 4x4 and 2x6, SR 160')).toBe('Goku made 52 not out with 4 fours and 2 sixes, strike rate 160')
    expect(spoken('LBW! Plumb in front!!')).toBe('L B W! Plumb in front!')
  })
  it('cuts long lines into whole sentences', () => {
    const long = 'First sentence here. ' + 'Second sentence goes on for a while, with a few commas, and more words to read out loud. '.repeat(4)
    const parts = chunks(long, 100)
    expect(parts.length).toBeGreaterThan(2)
    for (const p of parts) expect(p.length).toBeLessThan(200)
    expect(chunks('Short one.')).toEqual(['Short one.'])
  })
})

const V = (name: string, lang = 'en-GB', localService = true): VoiceLike => ({ name, lang, localService })
describe('choosing voices', () => {
  it('knows a fresh copy of the same voice list is not a change (it caused an endless redraw in Controls)', () => {
    expect(sameVoices([V('A'), V('B')], [V('A'), V('B')])).toBe(true)
    expect(sameVoices([V('A')], [V('A'), V('B')])).toBe(false)
    expect(sameVoices([V('A')], [V('C')])).toBe(false)
  })
  const all = [V('Google UK English Female', 'en-GB', false), V('Google UK English Male', 'en-GB', false), V('Google US English', 'en-US', false), V('eSpeak English', 'en'), V('Deutsch', 'de-DE'), V('Samantha', 'en-US'), V('Daniel', 'en-GB')]
  it('keeps only English, best first, and drops the robotic ones', () => {
    const r = rankVoices(all).map((v) => v.name)
    expect(r).not.toContain('Deutsch')
    expect(r[0]).toMatch(/Google/)
    expect(r.indexOf('eSpeak English')).toBeGreaterThan(r.indexOf('Samantha'))
  })
  it('gives each role a different voice when there are enough, alternating male and female', () => {
    const a = assignVoices(all)
    const names = Object.values(a).map((v) => v.voice?.name)
    expect(new Set(names).size).toBe(names.length)
    expect(assignVoices(all, { host: 'Daniel' }).host.voice?.name).toBe('Daniel')
    expect(assignVoices([]).host.voice).toBeNull()
  })
  it('gives a man a man\'s voice and a woman a woman\'s, and each speaker of the same kind a different one', () => {
    const a = assignVoices(all, {}, { host: 'm', exp1: 'f', exp2: 'm' })
    expect(voiceGender(a.host.voice!)).toBe('m')
    expect(voiceGender(a.exp1.voice!)).toBe('f')
    expect(voiceGender(a.exp2.voice!)).toBe('m')
    expect(a.host.voice!.name).not.toBe(a.exp2.voice!.name)
    expect(a.host.pitchFix).toBe(1)
    const unnamed = assignVoices([V('English (United Kingdom)'), V('English (United States)')], {}, { host: 'm', exp1: 'f' })
    expect(unnamed.host.pitchFix).toBeLessThan(1)
    expect(unnamed.exp1.pitchFix).toBeGreaterThan(1)
  })
  it('lowers the pitch when the phone has only women\'s voices for a man (and raises it the other way)', () => {
    const women = [V('Google UK English Female', 'en-GB', false), V('Samantha', 'en-US')]
    const a = assignVoices(women, {}, { host: 'm', exp1: 'f' })
    expect(a.host.pitchFix).toBeLessThan(1)
    expect(a.exp1.pitchFix).toBe(1)
    const men = [V('Google UK English Male', 'en-GB', false)]
    expect(assignVoices(men, {}, { host: 'f' }).host.pitchFix).toBeGreaterThan(1)
  })
  it('gives every role a different pitch, and excitement is quicker than a serious tone', () => {
    expect(prosody('exp1', undefined, 1).pitch).not.toBe(prosody('exp2', undefined, 1).pitch)
    expect(prosody('host', 'excited', 1).rate).toBeGreaterThan(prosody('host', 'serious', 1).rate)
    expect(prosody('host', undefined, 1.2).rate).toBeGreaterThan(prosody('host', undefined, 1).rate)
  })
})
