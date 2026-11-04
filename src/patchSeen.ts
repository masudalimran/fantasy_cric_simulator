import { useSyncExternalStore } from 'react'
import { PATCH_NOTES } from './data/patchNotes'

/**
 * Which patch notes this person has already read. Kept in this browser (not in a career), so it is the same for every career on the phone.
 * Somebody opening the game for the very first time has nothing saved yet, so for them everything counts as read: "what's new" only means something
 * to people who have played before.
 */
const KEY = 'fcs.patchSeen'
const listeners = new Set<() => void>()

function load(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw !== null) return new Set(JSON.parse(raw) as string[])
    // never opened before and nothing saved: a brand-new player, so there is nothing "new" to tell them
    if (localStorage.getItem('fcs.v1') === null) {
      const all = new Set(PATCH_NOTES.map((p) => p.id))
      localStorage.setItem(KEY, JSON.stringify([...all]))
      return all
    }
  } catch { /* private mode: treat everything as unread, it will just show once per visit */ }
  return new Set()
}

let seen = load()
let snapshot = [...seen].sort().join(',')

const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb) } }

function save() {
  snapshot = [...seen].sort().join(',')
  try { localStorage.setItem(KEY, JSON.stringify([...seen])) } catch { /* just not remembered */ }
  listeners.forEach((l) => l())
}

/** The patches not read yet, newest first. */
export const unreadPatches = (read: ReadonlySet<string> = seen) => PATCH_NOTES.filter((p) => !read.has(p.id))

export function markPatchesRead(ids: string[] = PATCH_NOTES.map((p) => p.id)) {
  const next = new Set(seen)
  let changed = false
  for (const id of ids) if (!next.has(id)) { next.add(id); changed = true }
  if (changed) { seen = next; save() }
}

/** The ids already read (re-renders when it changes). */
export function usePatchesRead(): ReadonlySet<string> {
  useSyncExternalStore(subscribe, () => snapshot, () => '')
  return seen
}

/** For tests: forget everything read. */
export function resetPatchesRead() { seen = new Set(); save() }
