import { audio, connectMaster } from './sfx'

/**
 * The stadium crowd as a sound bed, made of noise (no audio files): a low murmur that never quite stops, with swells for a four, a six or a wicket, and a hush
 * for a review or a nervous moment. It goes through the same volume and mute switch as the other sounds. Looks (and sounds) only.
 */
const BASE = 0.03
const PEAK = 0.17
/** The audio context, or null where there is none (muted, an old browser, a test run with no window). */
const ctxOf = (): AudioContext | null => { try { return audio() } catch { return null } }
let nodes: { src: AudioBufferSourceNode; gain: GainNode; chant: GainNode; lfo: OscillatorNode } | null = null

/** The level the murmur would be at: how loud for each moment, 0 to 1. */
export const crowdLevel = (amount: number): number => BASE + (PEAK - BASE) * Math.max(0, Math.min(1, amount))

/** Starts the murmur (does nothing when it is already running, the sound is muted, or the phone has no audio). */
export function startCrowd() {
  if (nodes) return
  const c = ctxOf()
  if (!c) return
  const buf = c.createBuffer(1, c.sampleRate * 3, c.sampleRate)
  const d = buf.getChannelData(0)
  let b0 = 0, b1 = 0
  for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; b0 = 0.97 * b0 + 0.03 * w; b1 = 0.8 * b1 + 0.2 * w; d[i] = (b0 * 4 + b1 * 0.7) } // (brown-ish noise: a rumble with a little fizz)
  const src = c.createBufferSource()
  src.buffer = buf; src.loop = true
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1300
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 520; bp.Q.value = 0.6
  const gain = c.createGain(); gain.gain.value = 0.0001
  // the murmur rises and falls a little, as a crowd does
  const chant = c.createGain(); chant.gain.value = 0.35
  const lfo = c.createOscillator(); lfo.frequency.value = 0.23
  const lfoGain = c.createGain(); lfoGain.gain.value = 0.18
  lfo.connect(lfoGain).connect(chant.gain)
  src.connect(lp).connect(bp).connect(chant).connect(gain)
  connectMaster(gain)
  src.start(); lfo.start()
  gain.gain.setTargetAtTime(BASE, c.currentTime, 1.2)
  nodes = { src, gain, chant, lfo }
}

/** Stops the murmur (leaving the match). */
export function stopCrowd() {
  if (!nodes) return
  const c = ctxOf()
  const n = nodes
  nodes = null
  if (!c) return
  n.gain.gain.setTargetAtTime(0.0001, c.currentTime, 0.4)
  globalThis.setTimeout(() => { try { n.src.stop(); n.lfo.stop() } catch { /* already stopped */ } }, 1800)
}

/** The crowd swells (a boundary, a wicket) and settles back: `amount` is 0 to 1, `secs` how long the swell lasts. */
export function crowdSwell(amount: number, secs = 2.6) {
  const c = ctxOf()
  if (!c || !nodes) return
  const g = nodes.gain.gain, t = c.currentTime
  g.cancelScheduledValues(t)
  g.setTargetAtTime(crowdLevel(amount), t, 0.18)
  g.setTargetAtTime(BASE, t + Math.max(0.6, secs * 0.45), Math.max(0.5, secs * 0.35))
}

/** The ground goes quiet (a review, a nervous ninety, the last ball of a tight chase) and comes back. */
export function crowdHush(secs = 3.5) {
  const c = ctxOf()
  if (!c || !nodes) return
  const g = nodes.gain.gain, t = c.currentTime
  g.cancelScheduledValues(t)
  g.setTargetAtTime(0.006, t, 0.25)
  g.setTargetAtTime(BASE, t + secs, 0.6)
}
