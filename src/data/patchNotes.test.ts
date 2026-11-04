import { describe, expect, it } from 'vitest'
import { PATCH_NOTES, LATEST_PATCH } from './patchNotes'
import { markPatchesRead, resetPatchesRead, unreadPatches } from '../patchSeen'

describe('patch notes', () => {
  it('have unique ids, newest first, and every item says something', () => {
    expect(new Set(PATCH_NOTES.map((p) => p.id)).size).toBe(PATCH_NOTES.length)
    const dates = PATCH_NOTES.map((p) => p.date)
    expect([...dates].sort().reverse()).toEqual(dates)
    expect(LATEST_PATCH).toBe(PATCH_NOTES[0].id)
    for (const p of PATCH_NOTES) {
      expect(p.items.length).toBeGreaterThan(0)
      for (const it of p.items) { expect(it.title.length).toBeGreaterThan(2); expect(it.text.length).toBeGreaterThan(20) }
    }
  })
  it('read means read: marking them leaves nothing unread, and new ones show up again', () => {
    resetPatchesRead()
    expect(unreadPatches().length).toBe(PATCH_NOTES.length)
    markPatchesRead()
    expect(unreadPatches().length).toBe(0)
    expect(unreadPatches(new Set(PATCH_NOTES.slice(1).map((p) => p.id))).map((p) => p.id)).toEqual([PATCH_NOTES[0].id])
  })
  it('do not use the words the game avoids', () => {
    const text = JSON.stringify(PATCH_NOTES)
    expect(text).not.toMatch(/\bbatter\b/i)
    expect(text).not.toMatch(/\bsession\b/i)
  })
})
