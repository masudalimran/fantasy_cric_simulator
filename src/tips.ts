import { useSyncExternalStore } from 'react'

/**
 * Which first-time tips and tours a person has already seen, and whether the "How to play" sheet is open.
 * Kept in this browser; "Replay the tips" forgets it all.
 */
const KEY = 'fcs.tips'
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb) } }

function load(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[]) } catch { return new Set() }
}
let seen = load()
let seenSnapshot = [...seen].sort().join(',')

function save() {
  seenSnapshot = [...seen].sort().join(',')
  try { localStorage.setItem(KEY, JSON.stringify([...seen])) } catch { /* private mode: they will just show again next time */ }
  emit()
}

export const hasSeen = (id: string) => seen.has(id)
export function markSeen(id: string) { if (!seen.has(id)) { seen = new Set(seen).add(id); save() } }
export function resetTips() { seen = new Set(); save() }

/** Re-renders when anything is marked as seen. */
export function useSeen(id: string): boolean {
  useSyncExternalStore(subscribe, () => seenSnapshot, () => '')
  return seen.has(id)
}

// ---- the "How to play" sheet ------------------------------------------------------------------------------------

let helpOpen = false
export const openHelp = () => { helpOpen = true; emit(); snapshotHelp++ }
export const closeHelp = () => { helpOpen = false; emit(); snapshotHelp++ }
let snapshotHelp = 0
export function useHelpOpen(): boolean {
  useSyncExternalStore(subscribe, () => `${seenSnapshot}|${snapshotHelp}`, () => '')
  return helpOpen
}
