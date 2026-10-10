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
