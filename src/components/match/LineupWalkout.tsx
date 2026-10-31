import { useEffect } from 'react'
import { SHOW_SECONDS, type StadiumShow } from './stadiumShow'
import { StadiumCam, type Cast } from './StadiumCam'
import type { ReplayBase } from './ReplayFrame'

/**
 * The start of a match as TV shows it: the camera swoops down from above the stadium to the middle where the two captains meet for the coin (the result is on the strip),
 * then both teams run out and line up with their names over their heads. It replaces the old line-up cards. Tap to start the match.
 */
export function LineupWalkout({ show, base, cast, onDone }: { show: StadiumShow; base: ReplayBase; cast: Cast; onDone: () => void }) {
  useEffect(() => {
    const id = window.setTimeout(onDone, SHOW_SECONDS.lineup * 1000 + 600)
    const onKey = (e: KeyboardEvent) => { if (e.code === 'Space' || e.key === 'Enter' || e.key === 'Escape') onDone() }
    window.addEventListener('keydown', onKey)
    return () => { window.clearTimeout(id); window.removeEventListener('keydown', onKey) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div className="fixed inset-0 z-30 cursor-pointer bg-black" style={{ paddingTop: 'var(--sat)' }} onClick={onDone} aria-label="Toss and line-ups">
      <StadiumCam show={show} base={base} cast={cast} label="Toss" />
    </div>
  )
}
