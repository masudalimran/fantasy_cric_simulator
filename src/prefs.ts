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
export interface AnimPrefs { wicket: boolean; boundary: boolean; freeHit: boolean }
const ANIM_KEY = 'fcs.anim'
const animListeners = new Set<() => void>()
let anim: AnimPrefs = (() => { try { return { wicket: true, boundary: true, freeHit: true, ...JSON.parse(localStorage.getItem(ANIM_KEY) ?? '{}') } } catch { return { wicket: true, boundary: true, freeHit: true } } })()

export const getAnimPrefs = () => anim
export function setAnimPrefs(next: Partial<AnimPrefs>) {
  anim = { ...anim, ...next }
  try { localStorage.setItem(ANIM_KEY, JSON.stringify(anim)) } catch { /* just not remembered */ }
  animListeners.forEach((l) => l())
}

/** The wicket replay and the six animation each have a switch (both on by default). */
export function useAnimPrefs(): AnimPrefs {
  return useSyncExternalStore((cb) => { animListeners.add(cb); return () => { animListeners.delete(cb) } }, () => anim, () => ({ wicket: true, boundary: true, freeHit: true }))
}
