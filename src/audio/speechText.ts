/**
 * The pure parts of the voice: turning a written line into something a speech engine says well, cutting it into short pieces, and choosing the
 * best voices from what the phone offers. No browser calls here, so it can be tested.
 */

/** A line as it should be spoken: scores, figures and short forms said the way a commentator says them. */
export function spoken(text: string): string {
  return text
    .replace(/\b(\d+)\s*km\/h\b/gi, '$1 kilometres an hour')
    .replace(/\b(\d+)\*/g, '$1 not out')
    .replace(/\b(\d+)\/(\d+)\b/g, '$1 for $2')
    .replace(/\bSR\b/g, 'strike rate')
    .replace(/\b(\d+)x4\b/g, '$1 fours').replace(/\b(\d+)x6\b/g, '$1 sixes')
    .replace(/\b(\d+)\.(\d)\s*ov(?:ers?)?\b/gi, '$1 point $2 overs')
    .replace(/\bov\b/g, 'overs')
    .replace(/\bvs?\.?\b(?=\s+[A-Z])/g, 'versus')
    .replace(/&/g, ' and ')
    .replace(/#/g, '')
    .replace(/[“”"]/g, '')
    .replace(/\bLBW\b/g, 'L B W')
    .replace(/\bT20\b/g, 'Twenty twenty')
    .replace(/\bODI\b/g, 'one day')
    .replace(/!{2,}/g, '!')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Cuts a line into pieces of whole sentences (some phones stop reading a long piece half way). */
export function chunks(text: string, max = 170): string[] {
  const sentences = text.match(/[^.!?]+[.!?]*\s*/g) ?? [text]
  const out: string[] = []
  let cur = ''
  for (const raw of sentences) {
    const s = raw.trim()
    if (!s) continue
    if (cur && (cur + ' ' + s).length > max) { out.push(cur); cur = s } else cur = cur ? `${cur} ${s}` : s
  }
  if (cur) out.push(cur)
  // a single very long sentence is cut at commas
  return out.flatMap((c) => {
    if (c.length <= max * 1.4) return [c]
    const parts = c.split(/(?<=,)\s+/)
    const res: string[] = []
    let acc = ''
    for (const p of parts) { if (acc && (acc + ' ' + p).length > max) { res.push(acc); acc = p } else acc = acc ? `${acc} ${p}` : p }
    if (acc) res.push(acc)
    return res
  })
}

export interface VoiceLike { name: string; lang: string; localService: boolean }

const FEMALE = /female|samantha|karen|moira|tessa|victoria|aria|jenny|libby|sonia|natasha|zira|susan|catherine|fiona|veena|serena|kate|hazel|emma|amy|joanna|salli|kendra|kimberly|ivy|nicole|google us english|google uk english female|heera|ava|allison|jessa|michelle|ana\b|sara/i
const MALE = /(?<!fe)male|daniel|alex\b|fred|george|thomas|oliver|arthur|james|rishi|ryan|guy\b|davis|mark\b|david|christopher|eric|brian|ravi|liam|matthew|aaron|gordon|lee\b|neerja? ?male|prabhat/i
export const isFemaleVoice = (v: VoiceLike) => FEMALE.test(v.name) && !MALE.test(v.name)
/** What a voice's name says about who is speaking: a woman, a man, or nothing (many phone voices are just "English (United Kingdom)"). */
export function voiceGender(v: VoiceLike): 'f' | 'm' | null {
  if (MALE.test(v.name)) return 'm'
  if (FEMALE.test(v.name)) return 'f'
  return null
}

/** How good a voice is likely to sound for commentary: natural and online voices first, then the plain English ones. */
export function voiceScore(v: VoiceLike): number {
  if (!/^en([-_]|$)/i.test(v.lang)) return -100
  let s = 0
  const lang = v.lang.replace('_', '-').toLowerCase()
  s += lang === 'en-gb' ? 3 : lang === 'en-au' ? 3 : lang === 'en-in' ? 2 : lang === 'en-us' ? 2 : 1
  if (/natural|neural|online/i.test(v.name)) s += 7
  if (/google/i.test(v.name)) s += 4
  if (/enhanced|premium/i.test(v.name)) s += 4
  if (!v.localService) s += 2
  if (/compact|espeak|pico|novelty|whisper|bubbles|bad news|good news|zarvox|trinoids|cellos|bells|organ/i.test(v.name)) s -= 8
  return s
}

/** Whether two voice lists are the same voices (the phone hands back a fresh array each time it is asked, so arrays cannot be compared directly). */
export const sameVoices = (a: VoiceLike[], b: VoiceLike[]) => a.length === b.length && a.every((v, i) => v.name === b[i].name && v.lang === b[i].lang)

export function rankVoices<T extends VoiceLike>(vs: T[]): T[] {
  return vs.filter((v) => voiceScore(v) > -50).sort((a, b) => voiceScore(b) - voiceScore(a) || a.name.localeCompare(b.name))
}

export type VoiceRole = 'host' | 'exp1' | 'exp2' | 'pbp' | 'colour'
export const VOICE_ROLES: VoiceRole[] = ['host', 'exp1', 'exp2', 'pbp', 'colour']

export type SpeakerGender = 'f' | 'm'
export interface VoicePick<T> { voice: T | null; /** The voice's own sound is the wrong one for the character, so the pitch is moved to make up for it. */ pitchFix: number }

/**
 * Picks a voice for each role from the best on offer. Where a speaker is known to be a woman or a man (the studio's characters), the voice is a
 * woman's or a man's, and two speakers of the same kind get different voices; a person who chose a voice for a role keeps it. Where the phone has no
 * voice of the right kind, the nearest one is used with its pitch moved (lower for a man, higher for a woman) so a man does not sound like a woman.
 * Speakers whose gender is not known alternate male and female as before.
 */
export function assignVoices<T extends VoiceLike>(all: T[], chosen: Partial<Record<VoiceRole, string>> = {}, genders: Partial<Record<VoiceRole, SpeakerGender>> = {}): Record<VoiceRole, VoicePick<T>> {
  const ranked = rankVoices(all)
  const top = ranked.slice(0, 14)
  const result = {} as Record<VoiceRole, VoicePick<T>>
  const used = new Set<string>()
  let lastFemale: boolean | null = null
  for (const role of VOICE_ROLES) {
    const want = genders[role]
    const wanted = chosen[role] ? all.find((v) => v.name === chosen[role]) : undefined
    let pick: T | undefined = wanted
    let fix = 1
    if (!pick && want) {
      const free = top.filter((v) => !used.has(v.name))
      pick = free.find((v) => voiceGender(v) === want) ?? free.find((v) => voiceGender(v) === null) ?? free[0] ?? top.find((v) => voiceGender(v) === want) ?? top[VOICE_ROLES.indexOf(role) % Math.max(1, top.length)]
      const g = pick ? voiceGender(pick) : null
      if (pick && g && g !== want) fix = want === 'm' ? 0.78 : 1.25
      // a voice whose name does not say (most Android voices) gets a gentle nudge the right way
      else if (pick && !g && !wanted) fix = want === 'm' ? 0.9 : 1.08
    } else if (!pick) {
      pick = top.find((v) => !used.has(v.name) && (lastFemale === null || isFemaleVoice(v) !== lastFemale)) ?? top.find((v) => !used.has(v.name)) ?? top[VOICE_ROLES.indexOf(role) % Math.max(1, top.length)]
    }
    result[role] = { voice: pick ?? null, pitchFix: fix }
    if (pick) { used.add(pick.name); lastFemale = isFemaleVoice(pick) }
  }
  return result
}

export type VoiceMood = 'excited' | 'serious' | 'laugh' | 'shocked' | 'thoughtful' | 'proud' | 'sarcastic' | 'worried'
const MOOD: Record<VoiceMood, [pitch: number, rate: number]> = {
  excited: [0.1, 0.1], serious: [-0.1, -0.05], laugh: [0.15, 0.03], shocked: [0.2, 0.05], thoughtful: [-0.03, -0.08], proud: [0.03, -0.03], sarcastic: [-0.06, -0.05], worried: [0.05, -0.02],
}
/** Each role has its own pitch and pace so even the same voice sounds like a different person; the mood nudges both. */
const ROLE_BASE: Record<VoiceRole, [number, number]> = { host: [1, 1], exp1: [0.88, 0.97], exp2: [1.12, 1.02], pbp: [1, 1.08], colour: [0.92, 0.96] }

export function prosody(role: VoiceRole, mood: VoiceMood | undefined, speed: number): { pitch: number; rate: number } {
  const [bp, br] = ROLE_BASE[role]
  const [mp, mr] = mood ? MOOD[mood] : [0, 0]
  return { pitch: Math.max(0.5, Math.min(1.6, bp + mp)), rate: Math.max(0.6, Math.min(1.6, (br + mr) * speed)) }
}
