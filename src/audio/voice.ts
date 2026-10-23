import { useSyncExternalStore } from 'react'
import { assignVoices, chunks, prosody, rankVoices, sameVoices, spoken, type VoiceMood, type VoiceRole } from './speechText'

/**
 * Spoken voices for the studio show and the live commentary, using the voices the phone already has (the Web Speech API): nothing to download,
 * no server, no audio files. Quality depends on the phone; on Android, Chrome's "Google" voices are the best of what it offers.
 */
export type VoiceMode = 'off' | 'studio' | 'full'
export type VoiceSpeed = 'slow' | 'normal' | 'fast'
const SPEEDS: Record<VoiceSpeed, number> = { slow: 0.88, normal: 1, fast: 1.18 }

const KEY_MODE = 'fcs.voice'
const KEY_SPEED = 'fcs.voiceSpeed'
const KEY_NAMES = 'fcs.voiceNames'
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
const read = (k: string): string | null => { try { return localStorage.getItem(k) } catch { return null } }
const write = (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* just not remembered */ } }

let mode: VoiceMode = (['off', 'studio', 'full'] as const).find((m) => m === read(KEY_MODE)) ?? 'off'
let speed: VoiceSpeed = (['slow', 'normal', 'fast'] as const).find((m) => m === read(KEY_SPEED)) ?? 'normal'
let names: Partial<Record<VoiceRole, string>> = (() => { try { return JSON.parse(read(KEY_NAMES) ?? '{}') } catch { return {} } })()

export const getVoiceMode = () => mode
export function setVoiceMode(m: VoiceMode) { mode = m; write(KEY_MODE, m); if (m === 'off') cancelSpeech(); emit() }
export function setVoiceSpeed(s: VoiceSpeed) { speed = s; write(KEY_SPEED, s); emit() }
export function setVoiceName(role: VoiceRole, name: string | null) {
  names = { ...names }
  if (name) names[role] = name; else delete names[role]
  write(KEY_NAMES, JSON.stringify(names))
  emit()
}
const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb) } }
export const useVoiceMode = (): VoiceMode => useSyncExternalStore(subscribe, () => mode, () => 'off')
export const useVoiceSpeed = (): VoiceSpeed => useSyncExternalStore(subscribe, () => speed, () => 'normal')
export const useVoiceNames = (): Partial<Record<VoiceRole, string>> => useSyncExternalStore(subscribe, () => names, () => ({}))

const synth = (): SpeechSynthesis | null => (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null)
export const voiceSupported = () => synth() !== null

// ---- the voices on this phone ------------------------------------------------------------------------------------------
let voices: SpeechSynthesisVoice[] = []
const voiceListeners = new Set<() => void>()
/** Reads the phone's voice list; only when it has really changed (getVoices() hands back a new array every time) does anything hear about it. */
function refresh() {
  const s = synth()
  if (!s) return
  const next = s.getVoices()
  if (sameVoices(next, voices)) return
  voices = next
  voiceListeners.forEach((l) => l())
}
if (synth()) {
  refresh()
  synth()!.addEventListener?.('voiceschanged', refresh)
}
/** The English voices the phone offers, best first. */
export function useEnglishVoices(): SpeechSynthesisVoice[] {
  return useSyncExternalStore((cb) => { voiceListeners.add(cb); return () => { voiceListeners.delete(cb) } }, () => cachedRanked(), () => EMPTY)
}
const EMPTY: SpeechSynthesisVoice[] = []
let rankedFor: SpeechSynthesisVoice[] | null = null, ranked: SpeechSynthesisVoice[] = []
function cachedRanked() { if (rankedFor !== voices) { rankedFor = voices; ranked = rankVoices(voices) } return ranked }

// ---- speaking ----------------------------------------------------------------------------------------------------------
let token = 0
let active = 0
let busySince = 0

/** True while something is being said (but never for longer than a few seconds at a time, so a stuck engine cannot hold the game up). */
export function voiceBusy(): boolean { return active > 0 && Date.now() - busySince < 9000 }

export function cancelSpeech() {
  token++
  active = 0
  try { synth()?.cancel() } catch { /* nothing to cancel */ }
}

export type SpeakResult = 'done' | 'cancelled' | 'failed'

/** Says a line in the voice of a role and tells when it has finished (or why it did not). Pieces of a long line are said one after another. */
export function speak(text: string, role: VoiceRole, mood?: VoiceMood, force = false): Promise<SpeakResult> {
  const s = synth()
  if (!s || (mode === 'off' && !force)) return Promise.resolve('failed')
  const my = ++token
  try { s.cancel() } catch { /* fine */ }
  const voice = assignVoices(voices, names)[role]
  const { pitch, rate } = prosody(role, mood, SPEEDS[speed])
  const parts = chunks(spoken(text))
  if (!parts.length) return Promise.resolve('done')
  active = 1
  busySince = Date.now()
  return new Promise<SpeakResult>((resolve) => {
    let i = 0
    const finish = (r: SpeakResult) => { if (my === token) active = 0; resolve(r) }
    const next = () => {
      if (my !== token) { resolve('cancelled'); return }
      if (i >= parts.length) { finish('done'); return }
      const u = new SpeechSynthesisUtterance(parts[i++])
      if (voice) { u.voice = voice; u.lang = voice.lang }
      u.pitch = pitch; u.rate = rate; u.volume = 1
      let started = false
      // an engine that never starts (no voice, a blocked page) must not hold anything up
      const guard = window.setTimeout(() => { if (!started && my === token) { try { s.cancel() } catch { /* fine */ } finish('failed') } }, 2800)
      u.onstart = () => { started = true; window.clearTimeout(guard) }
      u.onend = () => { window.clearTimeout(guard); busySince = Date.now(); next() }
      u.onerror = (e) => { window.clearTimeout(guard); if (my !== token) { resolve('cancelled'); return } finish((e as SpeechSynthesisErrorEvent).error === 'canceled' || (e as SpeechSynthesisErrorEvent).error === 'interrupted' ? 'cancelled' : 'failed') }
      // (a short pause after cancel() keeps Android from dropping the first words)
      window.setTimeout(() => { if (my === token) s.speak(u); else resolve('cancelled') }, i === 1 ? 70 : 0)
    }
    next()
  })
}

/** A few lines one after another, each in its own role's voice; a new call (or cancelSpeech) stops what is being said. */
export async function speakLines(lines: { text: string; role: VoiceRole; mood?: VoiceMood }[]): Promise<void> {
  const my = token + 1
  for (const l of lines) {
    const r = await speak(l.text, l.role, l.mood)
    if (r !== 'done' || token !== my + (lines.indexOf(l))) return
  }
}

if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (document.hidden) cancelSpeech() })
