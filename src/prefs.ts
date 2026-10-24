import { useSyncExternalStore } from 'react'

/** Small display preferences kept in this browser (not in the saved careers). */
const KEY = 'fcs.hideImages'
const listeners = new Set<() => void>()

function read(): boolean {
  try { return localStorage.getItem(KEY) === '1' } catch { return false }
}
let current = read()

export function setHideImages(hide: boolean) {
  current = hide
  try { localStorage.setItem(KEY, hide ? '1' : '0') } catch { /* private mode: it just won't be remembered */ }
  listeners.forEach((l) => l())
}

/** Whether player pictures are hidden everywhere (initials are shown instead). */
export function useHideImages(): boolean {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => { listeners.delete(cb) } }, () => current, () => false)
}

// ---- Keep the screen awake ------------------------------------------------------------------------------------
const AWAKE_KEY = 'fcs.keepAwake'
const awakeListeners = new Set<() => void>()
let awake = (() => { try { return localStorage.getItem(AWAKE_KEY) !== '0' } catch { return true } })() // on unless turned off

export function setKeepAwake(on: boolean) {
  awake = on
  try { localStorage.setItem(AWAKE_KEY, on ? '1' : '0') } catch { /* just not remembered */ }
  awakeListeners.forEach((l) => l())
}

/** Whether the app asks the phone not to switch the screen off while it is open (on by default). */
export function useKeepAwake(): boolean {
  return useSyncExternalStore((cb) => { awakeListeners.add(cb); return () => { awakeListeners.delete(cb) } }, () => awake, () => true)
}

// ---- Swipe on the field to aim a shot -------------------------------------------------------------------------
const SWIPE_KEY = 'fcs.swipeAim'
const swipeListeners = new Set<() => void>()
let swipe = (() => { try { return localStorage.getItem(SWIPE_KEY) !== '0' } catch { return true } })()

export function setSwipeAim(on: boolean) {
  swipe = on
  try { localStorage.setItem(SWIPE_KEY, on ? '1' : '0') } catch { /* just not remembered */ }
  swipeListeners.forEach((l) => l())
}

/** Whether dragging a finger (or the mouse) across the field aims the next shot (on by default). */
export function useSwipeAim(): boolean {
  return useSyncExternalStore((cb) => { swipeListeners.add(cb); return () => { swipeListeners.delete(cb) } }, () => swipe, () => true)
}

// ---- Broadcast view: the field drawn the way a TV camera sees it --------------------------------------------
const BCAST_KEY = 'fcs.broadcast'
const bcastListeners = new Set<() => void>()
let bcast = (() => { try { return localStorage.getItem(BCAST_KEY) !== '0' } catch { return true } })() // on unless turned off

export function setBroadcastView(on: boolean) {
  bcast = on
  try { localStorage.setItem(BCAST_KEY, on ? '1' : '0') } catch { /* just not remembered */ }
  bcastListeners.forEach((l) => l())
}

export const getBroadcastView = () => bcast

/** Whether the field is shown as a TV broadcast (a camera behind the bowler that follows the ball) instead of from above (on by default; the choice is remembered in this browser). */
export function useBroadcastView(): boolean {
  return useSyncExternalStore((cb) => { bcastListeners.add(cb); return () => { bcastListeners.delete(cb) } }, () => bcast, () => true)
}

// ---- Captions: the commentary line on the broadcast picture ------------------------------------------------
const CAPTION_KEY = 'fcs.captions'
const captionListeners = new Set<() => void>()
let captions = (() => { try { return localStorage.getItem(CAPTION_KEY) === '1' } catch { return false } })()

export function setCaptions(on: boolean) {
  captions = on
  try { localStorage.setItem(CAPTION_KEY, on ? '1' : '0') } catch { /* just not remembered */ }
  captionListeners.forEach((l) => l())
}

/** Whether the commentary line of each ball is written along the top of the broadcast picture (off by default). */
export function useCaptions(): boolean {
  return useSyncExternalStore((cb) => { captionListeners.add(cb); return () => { captionListeners.delete(cb) } }, () => captions, () => false)
}

// ---- Score bar: the score in the corner of the broadcast picture ---------------------------------------------
const SCOREBAR_KEY = 'fcs.scorebar'
const scoreBarListeners = new Set<() => void>()
let scoreBar = (() => { try { return localStorage.getItem(SCOREBAR_KEY) !== '0' } catch { return true } })()

export function setScoreBar(on: boolean) {
  scoreBar = on
  try { localStorage.setItem(SCOREBAR_KEY, on ? '1' : '0') } catch { /* just not remembered */ }
  scoreBarListeners.forEach((l) => l())
}

/** Whether the score bar (score, overs, the two batsmen, the bowler) is drawn in the corner of the broadcast picture (on by default). */
export function useScoreBar(): boolean {
  return useSyncExternalStore((cb) => { scoreBarListeners.add(cb); return () => { scoreBarListeners.delete(cb) } }, () => scoreBar, () => true)
}

// ---- Play manually: no auto-play, the controls take its place --------------------------------------------------
const MANUAL_KEY = 'fcs.manual'
const manualListeners = new Set<() => void>()
let manual = (() => { try { return localStorage.getItem(MANUAL_KEY) === '1' } catch { return false } })()

export function setManualPlay(on: boolean) {
  manual = on
  try { localStorage.setItem(MANUAL_KEY, on ? '1' : '0') } catch { /* just not remembered */ }
  manualListeners.forEach((l) => l())
}

/** Whether you play every ball yourself from the controls, with all the auto-play options out of the way (off by default). */
export function useManualPlay(): boolean {
  return useSyncExternalStore((cb) => { manualListeners.add(cb); return () => { manualListeners.delete(cb) } }, () => manual, () => false)
}

// ---- Which match animations to show ---------------------------------------------------------------------------
/** Each group of animation screens has its own switch; `animLevel` flips them all at once. */
export interface AnimPrefs { wicket: boolean; six: boolean; four: boolean; milestone: boolean; freeHit: boolean; extras: boolean; reviews: boolean; timeout: boolean; intro: boolean; drama: boolean; cheer: boolean; studio: boolean; wicketcam: boolean; nearmiss: boolean; moves: boolean }
const ANIM_ALL: AnimPrefs = { wicket: true, six: true, four: true, milestone: true, freeHit: true, extras: true, reviews: true, timeout: true, intro: true, drama: true, cheer: true, studio: true, wicketcam: true, nearmiss: true, moves: true }
/** Full: every screen. Light: only the big three (wickets, sixes, fifties and hundreds). Off: none. */
export type AnimLevel = 'full' | 'light' | 'off'
const ANIM_LEVELS: Record<AnimLevel, AnimPrefs> = {
  full: ANIM_ALL,
  light: { wicket: true, six: true, four: false, milestone: true, freeHit: false, extras: false, reviews: false, timeout: false, intro: false, drama: false, cheer: false, studio: false, wicketcam: false, nearmiss: false, moves: true },
  off: { wicket: false, six: false, four: false, milestone: false, freeHit: false, extras: false, reviews: false, timeout: false, intro: false, drama: false, cheer: false, studio: false, wicketcam: false, nearmiss: false, moves: false },
}
const ANIM_KEY = 'fcs.anim'
const animListeners = new Set<() => void>()
let anim: AnimPrefs = (() => {
  try {
    const saved = JSON.parse(localStorage.getItem(ANIM_KEY) ?? '{}')
    // older saves had one switch for both boundary screens
    if (typeof saved.boundary === 'boolean') { saved.six ??= saved.boundary; saved.four ??= saved.boundary }
    const out = { ...ANIM_ALL }
    for (const k of Object.keys(ANIM_ALL) as (keyof AnimPrefs)[]) if (typeof saved[k] === 'boolean') out[k] = saved[k]
    return out
  } catch { return { ...ANIM_ALL } }
})()

export const getAnimPrefs = () => anim
export function setAnimPrefs(next: Partial<AnimPrefs>) {
  anim = { ...anim, ...next }
  try { localStorage.setItem(ANIM_KEY, JSON.stringify(anim)) } catch { /* just not remembered */ }
  animListeners.forEach((l) => l())
}
export const setAnimLevel = (l: AnimLevel) => setAnimPrefs(ANIM_LEVELS[l])
/** Which level the current switches add up to, or null when they are mixed. */
export function animLevelOf(p: AnimPrefs): AnimLevel | null {
  return (Object.keys(ANIM_LEVELS) as AnimLevel[]).find((l) => (Object.keys(ANIM_ALL) as (keyof AnimPrefs)[]).every((k) => p[k] === ANIM_LEVELS[l][k])) ?? null
}

/** Each kind of animation screen has its own switch (all on by default). */
export function useAnimPrefs(): AnimPrefs {
  return useSyncExternalStore((cb) => { animListeners.add(cb); return () => { animListeners.delete(cb) } }, () => anim, () => ANIM_ALL)
}
