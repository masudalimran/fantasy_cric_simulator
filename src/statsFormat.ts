import { useSyncExternalStore } from 'react'
import type { MatchFormat } from './types'

/**
 * Which format the figures on screen belong to. A match sets it to its own format while it is open (a T20 shows T20 figures, caps and
 * profiles); everywhere else it is null, which means every format added together. The stats page has its own format filter.
 */
let current: MatchFormat | null = null
const listeners = new Set<() => void>()

export function setStatsFormat(f: MatchFormat | null) {
  if (f === current) return
  current = f
  listeners.forEach((l) => l())
}

export function useStatsFormat(): MatchFormat | null {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => { listeners.delete(cb) } }, () => current, () => null)
}
