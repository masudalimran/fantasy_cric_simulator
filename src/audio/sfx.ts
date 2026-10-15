/**
 * Sound effects, synthesised with the Web Audio API so there are no audio files to find,
 * license or load. Everything is short and quiet by default; there's a mute switch.
 */
const KEY = 'fcs.sound'

let ctx: AudioContext | null = null
let master: GainNode | null = null
let noiseBuf: AudioBuffer | null = null

export function isMuted(): boolean {
  try { return localStorage.getItem(KEY) === 'off' } catch { return false }
}
export function setMuted(muted: boolean) {
  try { localStorage.setItem(KEY, muted ? 'off' : 'on') } catch { /* private mode: fine */ }
  if (master) master.gain.value = muted ? 0 : 0.55
}

function audio(): AudioContext | null {
  if (isMuted()) return null
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!C) return null
    ctx = new C()
    master = ctx.createGain()
    master.gain.value = 0.55
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function noise(c: AudioContext): AudioBuffer {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  return noiseBuf
}

interface NoiseOpts { at?: number; dur: number; type: BiquadFilterType; freq: number; q?: number; peak: number; attack?: number; freqEnd?: number }
/** Filtered noise with a simple attack/decay envelope. */
function burst(c: AudioContext, o: NoiseOpts) {
  const t = c.currentTime + (o.at ?? 0)
  const src = c.createBufferSource()
  src.buffer = noise(c)
  src.loop = true
  const f = c.createBiquadFilter()
  f.type = o.type
  f.frequency.setValueAtTime(o.freq, t)
  if (o.freqEnd) f.frequency.exponentialRampToValueAtTime(o.freqEnd, t + o.dur)
  f.Q.value = o.q ?? 1
  const g = c.createGain()
  const attack = o.attack ?? 0.004
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(o.peak, t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur)
  src.connect(f).connect(g).connect(master as GainNode)
  src.start(t, Math.random())
  src.stop(t + o.dur + 0.05)
}

interface ToneOpts { at?: number; dur: number; freq: number; freqEnd?: number; type?: OscillatorType; peak: number }
function tone(c: AudioContext, o: ToneOpts) {
  const t = c.currentTime + (o.at ?? 0)
  const osc = c.createOscillator()
  osc.type = o.type ?? 'sine'
  osc.frequency.setValueAtTime(o.freq, t)
  if (o.freqEnd) osc.frequency.exponentialRampToValueAtTime(o.freqEnd, t + o.dur)
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(o.peak, t + 0.006)
  g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur)
  osc.connect(g).connect(master as GainNode)
  osc.start(t)
  osc.stop(t + o.dur + 0.05)
}

/** Crowd noise: a swell of band-passed noise. */
function crowd(c: AudioContext, dur: number, peak: number, freq = 700, at = 0) {
  burst(c, { at, dur, type: 'bandpass', freq, q: 0.6, peak, attack: dur * 0.25 })
  burst(c, { at, dur, type: 'bandpass', freq: freq * 2.4, q: 0.8, peak: peak * 0.5, attack: dur * 0.3 })
}


interface VoiceOpts { at?: number; dur: number; f0: number; f1: number; formants: [freq: number, q: number, gain: number][]; peak: number; type?: OscillatorType; vibrato?: number }
/** A vowel-ish voice: a buzzing oscillator that glides in pitch through formant filters. It's how we fake a crowd "aww" or "yeah". */
function voice(c: AudioContext, o: VoiceOpts) {
  const t = c.currentTime + (o.at ?? 0)
  const osc = c.createOscillator()
  osc.type = o.type ?? 'sawtooth'
  osc.frequency.setValueAtTime(o.f0, t)
  osc.frequency.exponentialRampToValueAtTime(o.f1, t + o.dur)
  const out = c.createGain()
  out.gain.setValueAtTime(0.0001, t)
  out.gain.exponentialRampToValueAtTime(o.peak, t + Math.min(0.12, o.dur * 0.3))
  out.gain.exponentialRampToValueAtTime(0.0001, t + o.dur)
  for (const [freq, q, g] of o.formants) {
    const f = c.createBiquadFilter()
    f.type = 'bandpass'
    f.frequency.value = freq
    f.Q.value = q
    const fg = c.createGain()
    fg.gain.value = g
    osc.connect(f).connect(fg).connect(out)
  }
  if (o.vibrato) {
    const lfo = c.createOscillator()
    lfo.frequency.value = 5.5
    const depth = c.createGain()
    depth.gain.value = o.vibrato
    lfo.connect(depth).connect(osc.frequency)
    lfo.start(t)
    lfo.stop(t + o.dur + 0.05)
  }
  out.connect(master as GainNode)
  osc.start(t)
  osc.stop(t + o.dur + 0.05)
}

/** Individual hand claps scattered over `spread` seconds. */
function claps(c: AudioContext, count: number, spread: number, at = 0, peak = 0.12) {
  for (let i = 0; i < count; i++) {
    burst(c, { at: at + Math.random() * spread, dur: 0.045, type: 'bandpass', freq: 1400 + Math.random() * 1800, q: 0.9, peak: peak * (0.4 + Math.random() * 0.6), attack: 0.002 })
  }
}

/** A crowd of voices all saying the same vowel at slightly different pitches. */
function crowdVoices(c: AudioContext, n: number, o: Omit<VoiceOpts, 'f0' | 'f1' | 'peak'> & { f0: number; f1: number; peak: number; stagger?: number }) {
  for (let i = 0; i < n; i++) {
    const d = 0.85 + Math.random() * 0.4
    voice(c, { ...o, at: (o.at ?? 0) + Math.random() * (o.stagger ?? 0.12), f0: o.f0 * d, f1: o.f1 * d, peak: o.peak / Math.sqrt(n), dur: o.dur * (0.85 + Math.random() * 0.3) })
  }
}

const safely = (fn: (c: AudioContext) => void) => {
  try {
    const c = audio()
    if (c) fn(c)
  } catch { /* audio is a nicety; never break the game over it */ }
}

const AW = [[620, 5, 1], [980, 7, 0.6], [2400, 8, 0.12]] as [number, number, number][]
const AH = [[780, 5, 1], [1250, 7, 0.7], [2600, 8, 0.15]] as [number, number, number][]

export const sfx = {
  /** Metal ring and a few spin ticks. */
  coin() {
    safely((c) => {
      for (let i = 0; i < 9; i++) tone(c, { at: i * 0.12, dur: 0.05, freq: 3400 + i * 60, type: 'triangle', peak: 0.06 })
      tone(c, { at: 1.9, dur: 0.9, freq: 2600, type: 'sine', peak: 0.2 })
      tone(c, { at: 1.9, dur: 0.7, freq: 3900, type: 'sine', peak: 0.12 })
    })
  },
  /** Bat on ball. `power` is 0 (a soft push) to 1 (a full swing). */
  hit(power = 0.5) {
    safely((c) => {
      const v = 0.85 + Math.random() * 0.3 // no two bat cracks sound quite the same
      burst(c, { dur: 0.07, type: 'bandpass', freq: (1900 + power * 900) * v, q: 1.3, peak: 0.25 + power * 0.4 })
      tone(c, { dur: 0.1, freq: 190 * v, freqEnd: 70, peak: 0.2 + power * 0.25 })
    })
  },
  /** The crowd's disappointed "awwww", sinking in pitch. */
  aww(strength = 1, at = 0) {
    safely((c) => {
      crowdVoices(c, 9, { at, dur: 1.15, f0: 360, f1: 215, formants: AW, peak: 0.55 * strength, type: 'sawtooth', stagger: 0.18, vibrato: 3 })
      burst(c, { at, dur: 1.3, type: 'lowpass', freq: 650, q: 0.5, peak: 0.12 * strength, attack: 0.25 })
    })
  },
  /** A rising "ahhhh" cheer with clapping. */
  cheer(level = 1) {
    safely((c) => {
      crowdVoices(c, 10, { dur: 0.9 + level * 0.8, f0: 250, f1: 330, formants: AH, peak: 0.5 * level, type: 'sawtooth', stagger: 0.2 })
      crowd(c, 1.4 + level * 1.4, 0.2 * level, 700, 0.05)
      claps(c, Math.round(10 + level * 18), 1.1 + level, 0.25, 0.1)
    })
  },
  whistle(at = 0) {
    safely((c) => {
      tone(c, { at, dur: 0.32, freq: 2700, freqEnd: 3100, type: 'sine', peak: 0.12 })
      tone(c, { at: at + 0.38, dur: 0.22, freq: 3000, type: 'sine', peak: 0.1 })
    })
  },
  /** Fireworks-style pops. */
  pops(n = 5) {
    safely((c) => {
      for (let i = 0; i < n; i++) {
        burst(c, { at: 0.15 + i * 0.13 + Math.random() * 0.06, dur: 0.18, type: 'lowpass', freq: 900 + Math.random() * 700, q: 0.8, peak: 0.28, attack: 0.002 })
        burst(c, { at: 0.2 + i * 0.13, dur: 0.3, type: 'highpass', freq: 5000, q: 0.5, peak: 0.07, attack: 0.01 })
      }
    })
  },
  four() {
    safely((c) => {
      burst(c, { dur: 0.08, type: 'bandpass', freq: 2300, q: 1.3, peak: 0.6 })
      tone(c, { dur: 0.12, freq: 200, freqEnd: 70, peak: 0.4 })
    })
    sfx.cheer(0.7)
  },
  six() {
    safely((c) => {
      burst(c, { dur: 0.09, type: 'bandpass', freq: 2600, q: 1.4, peak: 0.75 })
      tone(c, { dur: 0.14, freq: 210, freqEnd: 60, peak: 0.5 })
      burst(c, { at: 0.1, dur: 1.2, type: 'highpass', freq: 600, freqEnd: 4200, q: 0.7, peak: 0.1, attack: 0.5 }) // the ball sailing away
    })
    sfx.cheer(1.15)
    sfx.whistle(0.5)
    sfx.pops(4)
  },
  /** The crowd goes quiet as the ball is on its way: a low hush that dips in, then the stumps rattle and the "awww". */
  wicket() {
    safely((c) => {
      burst(c, { dur: 0.8, type: 'lowpass', freq: 260, freqEnd: 90, q: 0.6, peak: 0.1, attack: 0.5 })
      const at = 0.78
      for (let i = 0; i < 7; i++) burst(c, { at: at + i * 0.035 + Math.random() * 0.02, dur: 0.05, type: 'highpass', freq: 3200, q: 2, peak: 0.28 }) // stumps rattling
      tone(c, { at, dur: 0.18, freq: 140, freqEnd: 55, peak: 0.35 })
    })
    sfx.aww(1, 0.85)
  },
  /** Two fists meeting: a soft thud, then the milestone applause. */
  fistBump() {
    safely((c) => {
      tone(c, { at: 1.65, dur: 0.14, freq: 120, freqEnd: 55, peak: 0.35 })
      burst(c, { at: 1.65, dur: 0.06, type: 'lowpass', freq: 900, q: 0.8, peak: 0.25, attack: 0.002 })
    })
    sfx.milestone()
  },
  /** A short rising swoosh for a screen sliding in (the match preview). */
  whoosh() {
    safely((c) => burst(c, { dur: 0.35, type: 'bandpass', freq: 400, freqEnd: 2600, q: 0.8, peak: 0.12, attack: 0.15 }))
  },
  /** Bowler's side celebrating: a short, sharp cheer. */
  celebrate() {
    safely((c) => {
      crowdVoices(c, 6, { dur: 0.7, f0: 300, f1: 420, formants: AH, peak: 0.35, type: 'sawtooth', stagger: 0.1, at: 0.15 })
    })
  },
  applause(seconds = 2.4) {
    safely((c) => {
      burst(c, { dur: seconds, type: 'bandpass', freq: 2300, q: 0.7, peak: 0.3, attack: 0.3 })
      burst(c, { at: 0.2, dur: seconds, type: 'bandpass', freq: 1500, q: 0.9, peak: 0.2, attack: 0.4 })
      claps(c, 40, seconds, 0, 0.1)
    })
  },
  /** A milestone: warm applause, a cheer and a rising little fanfare. */
  milestone() {
    sfx.applause(3)
    sfx.cheer(0.9)
    safely((c) => [523.25, 659.25, 783.99].forEach((f, i) => tone(c, { at: 0.1 + i * 0.12, dur: 0.45, freq: f, type: 'triangle', peak: 0.13 })))
  },
  hatTrick() {
    sfx.milestone()
    sfx.pops(6)
  },
  noBall() {
    sfx.whistle()
  },
  /** Fanfare and a roar for the winners. */
  win() {
    safely((c) => {
      ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(c, { at: i * 0.13, dur: 0.5, freq: f, type: 'triangle', peak: 0.2 }))
      tone(c, { at: 0.55, dur: 1.2, freq: 1046.5, type: 'triangle', peak: 0.16 })
    })
    sfx.cheer(1.3)
    sfx.pops(7)
  },
  /** Drumroll into a cymbal crash and a bell, for the Man of the Match reveal. */
  award() {
    safely((c) => {
      for (let i = 0; i < 34; i++) burst(c, { at: i * 0.045, dur: 0.06, type: 'bandpass', freq: 220, q: 0.7, peak: 0.1 + i * 0.006, attack: 0.002 })
      burst(c, { at: 1.55, dur: 1.4, type: 'highpass', freq: 3500, q: 0.6, peak: 0.28, attack: 0.004 })
      tone(c, { at: 1.55, dur: 1.4, freq: 1568, type: 'sine', peak: 0.2 })
      tone(c, { at: 1.55, dur: 1.1, freq: 2093, type: 'sine', peak: 0.12 })
    })
    window.setTimeout(() => sfx.cheer(1), 1550)
  },
  /** "Wah wah wahhh" for giving up. */
  sadTrombone() {
    safely((c) => {
      ;[[233, 0.42], [220, 0.42], [208, 0.42], [196, 1.1]].reduce((at, [f, d], i) => {
        voice(c, { at, dur: d, f0: f, f1: i === 3 ? f * 0.88 : f * 0.97, formants: [[500, 3, 1], [1100, 4, 0.5]], peak: 0.22, type: 'sawtooth', vibrato: i === 3 ? 6 : 0 })
        return at + d + 0.04
      }, 0)
    })
  },
  tick() {
    safely((c) => tone(c, { dur: 0.04, freq: 1200, type: 'triangle', peak: 0.08 }))
  },
}
