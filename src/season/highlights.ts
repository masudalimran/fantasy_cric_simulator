import type { BallEvent } from '../engine/types'

/** One ball of the match's highlights, and what kind of moment it is. */
export interface Highlight { ev: BallEvent; kind: 'hattrick' | 'hundred' | 'fifty' | 'wicket' | 'six' | 'four' | 'last'; score: number }

/**
 * The best balls of a match, for the highlights: a hat-trick, a hundred, a fifty, a wicket, a big six, the last ball of the game, a four. Never more than four from one
 * innings, and never two from the same over unless one of them is a big moment. In the order they were played. Nothing in the match changes.
 */
export function pickHighlights(logs: BallEvent[][], max = 7): Highlight[] {
  const all: Highlight[] = []
  logs.forEach((log, li) => {
    log.forEach((ev, i) => {
      let kind: Highlight['kind'] | null = null
      let score = 0
      if (ev.tags.includes('hat-trick')) { kind = 'hattrick'; score = 12 }
      else if (ev.tags.includes('hundred')) { kind = 'hundred'; score = 11 }
      else if (ev.tags.includes('fifty')) { kind = 'fifty'; score = 8 }
      else if (ev.wicket) { kind = 'wicket'; score = 6 + (ev.boundary ? 0 : 0) }
      else if (ev.boundary === 6) { kind = 'six'; score = 5 + Math.max(0, Math.min(3, ((ev.distance ?? 70) - 70) / 30)) }
      else if (ev.boundary === 4) { kind = 'four'; score = 2 }
      if (!kind) return
      if (li === logs.length - 1 && i === log.length - 1) score += 5 // the last ball of the match
      all.push({ ev, kind, score })
    })
  })
  const picked: Highlight[] = []
  const perInnings = new Map<number, number>()
  const overs = new Set<string>()
  for (const h of [...all].sort((a, b) => b.score - a.score || a.ev.seq - b.ev.seq)) {
    if (picked.length >= max) break
    const n = perInnings.get(h.ev.innings) ?? 0
    const over = `${h.ev.innings}:${h.ev.over}`
    if (n >= 4 || (overs.has(over) && h.score < 8)) continue
    picked.push(h); perInnings.set(h.ev.innings, n + 1); overs.add(over)
  }
  return picked.length >= 2 ? picked.sort((a, b) => a.ev.innings - b.ev.innings || a.ev.seq - b.ev.seq) : []
}
