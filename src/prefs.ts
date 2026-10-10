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
