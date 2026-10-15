/**
 * The strategic timeout's music: a few short tunes made in the browser (no files, nothing to download), one picked at random each
 * time and never the same one twice in a row. Each is scheduled up front for as long as the timeout lasts and fades out at the end.
 */
import { audio, burst, connectMaster, tone } from './sfx'

type Bus = AudioNode
type Maker = (c: AudioContext, bus: Bus, seconds: number) => void

const kick = (c: AudioContext, bus: Bus, at: number, p = 0.34) => tone(c, { to: bus, at, dur: 0.16, freq: 130, freqEnd: 42, peak: p })
const snare = (c: AudioContext, bus: Bus, at: number, p = 0.16) => { burst(c, { to: bus, at, dur: 0.13, type: 'bandpass', freq: 1900, q: 0.8, peak: p, attack: 0.002 }); tone(c, { to: bus, at, dur: 0.08, freq: 220, freqEnd: 150, peak: p * 0.5 }) }
const hat = (c: AudioContext, bus: Bus, at: number, p = 0.05) => burst(c, { to: bus, at, dur: 0.04, type: 'highpass', freq: 7000, q: 0.7, peak: p, attack: 0.001 })
const clap = (c: AudioContext, bus: Bus, at: number, p = 0.2) => { for (let i = 0; i < 3; i++) burst(c, { to: bus, at: at + i * 0.012, dur: 0.06, type: 'bandpass', freq: 1500, q: 0.9, peak: p, attack: 0.001 }) }

/** Funk: a bouncing bass line, snare on two and four, little chord stabs. */
const funk: Maker = (c, bus, seconds) => {
  const step = 60 / 108 / 2
  const bass = [55, 0, 55, 0, 0, 65.4, 0, 55, 0, 73.4, 0, 0, 82.4, 0, 65.4, 0]
  for (let i = 0; i * step < seconds; i++) {
    const t = i * step
    const k = i % 16
    hat(c, bus, t, k % 2 ? 0.03 : 0.055)
    if (k === 0 || k === 6 || k === 10) kick(c, bus, t)
    if (k === 4 || k === 12) snare(c, bus, t)
    if (bass[k]) tone(c, { to: bus, at: t, dur: 0.2, freq: bass[k], type: 'sawtooth', peak: 0.16 })
    if (k === 2 || k === 10 || k === 15) for (const f of [220, 261.6, 329.6]) tone(c, { to: bus, at: t, dur: 0.11, freq: f, type: 'square', peak: 0.035 })
  }
}

/** Chill: slow, soft drums, warm chords and a simple melody over the top. */
const chill: Maker = (c, bus, seconds) => {
  const step = 60 / 84 / 2
  const chords = [[261.6, 329.6, 392, 493.9], [220, 261.6, 329.6, 392], [174.6, 220, 261.6, 329.6], [196, 246.9, 293.7, 392]]
  const melody = [523.3, 0, 659.3, 0, 587.3, 0, 784, 659.3]
  for (let i = 0; i * step < seconds; i++) {
    const t = i * step
    const k = i % 8
    const bar = Math.floor(i / 8)
    if (k === 0) for (const f of chords[bar % 4]) tone(c, { to: bus, at: t, dur: step * 7.5, freq: f, type: 'triangle', peak: 0.05 })
    if (k === 0 || k === 5) kick(c, bus, t, 0.22)
    if (k === 4) snare(c, bus, t, 0.09)
    if (k % 2) hat(c, bus, t, 0.025)
    const m = melody[k] * (bar % 4 === 1 ? 0.84 : bar % 4 === 2 ? 0.67 : bar % 4 === 3 ? 0.75 : 1)
    if (melody[k] && bar % 2) tone(c, { to: bus, at: t, dur: step * 1.6, freq: m, type: 'sine', peak: 0.07 })
  }
}

/** Arcade: a fast square-wave arpeggio, a bouncing bass and a four-on-the-floor kick. */
const arcade: Maker = (c, bus, seconds) => {
  const step = 60 / 128 / 4
  const roots = [261.6, 392, 220, 349.2]
  for (let i = 0; i * step < seconds; i++) {
    const t = i * step
    const k = i % 16
    const root = roots[Math.floor(i / 16) % 4]
    const arp = [1, 1.25, 1.5, 2, 1.5, 1.25, 1, 1.5][k % 8]
    tone(c, { to: bus, at: t, dur: step * 0.9, freq: root * arp, type: 'square', peak: 0.05 })
    if (k % 4 === 0) kick(c, bus, t, 0.28)
    if (k === 4 || k === 12) snare(c, bus, t, 0.1)
    if (k % 2 === 0) hat(c, bus, t, 0.04)
    if (k % 4 === 0 || k % 4 === 2) tone(c, { to: bus, at: t, dur: step * 1.8, freq: (k % 4 ? root : root / 2) / 2, type: 'triangle', peak: 0.13 })
  }
}

/** Anthem: stomp, stomp, clap, with big brass chords rising through a stadium progression. */
const anthem: Maker = (c, bus, seconds) => {
  const beat = 60 / 100
  const chords = [[261.6, 329.6, 392], [196, 246.9, 392], [220, 261.6, 329.6], [174.6, 220, 261.6]]
  for (let b = 0; b * beat < seconds; b++) {
    const t = b * beat
    const k = b % 4
    const bar = Math.floor(b / 4)
    if (k === 0) for (const f of chords[bar % 4]) tone(c, { to: bus, at: t, dur: beat * 3.6, freq: f, type: 'sawtooth', peak: 0.045 })
    if (k === 0 || k === 2) { kick(c, bus, t, 0.36); kick(c, bus, t + beat / 2, 0.3) }
    if (k === 1 || k === 3) clap(c, bus, t)
    burst(c, { to: bus, at: t, dur: beat * 0.9, type: 'bandpass', freq: 900, q: 0.5, peak: 0.03, attack: beat * 0.4 })
  }
}

export const TRACKS: { name: string; make: Maker }[] = [
  { name: 'Funk', make: funk },
  { name: 'Chill', make: chill },
  { name: 'Arcade', make: arcade },
  { name: 'Anthem', make: anthem },
]

let lastTrack = -1
/** A random tune that is not the one played last time. */
export function pickTrack(rand: () => number = Math.random): number {
  let n = Math.floor(rand() * TRACKS.length)
  if (n === lastTrack) n = (n + 1 + Math.floor(rand() * (TRACKS.length - 1))) % TRACKS.length
  lastTrack = n
  return n
}

/** Starts a tune that lasts `seconds`; the returned function fades it out at once (call it if the screen is closed early). */
export function startMusic(seconds: number, track = pickTrack()): { name: string; stop: () => void } {
  const t = TRACKS[track % TRACKS.length]
  try {
    const c = audio()
    if (!c) return { name: t.name, stop: () => undefined }
    const bus = c.createGain()
    bus.gain.setValueAtTime(0.0001, c.currentTime)
    bus.gain.exponentialRampToValueAtTime(0.55, c.currentTime + 0.5)
    bus.gain.setValueAtTime(0.55, c.currentTime + Math.max(0.6, seconds - 1.2))
    bus.gain.linearRampToValueAtTime(0.0001, c.currentTime + seconds)
    connectMaster(bus)
    t.make(c, bus, seconds)
    return {
      name: t.name,
      stop: () => {
        try { bus.gain.cancelScheduledValues(c.currentTime); bus.gain.setTargetAtTime(0.0001, c.currentTime, 0.12); window.setTimeout(() => bus.disconnect(), 900) } catch { /* nothing to stop */ }
      },
    }
  } catch { return { name: t.name, stop: () => undefined } }
}
