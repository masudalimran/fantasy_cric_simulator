import { haptic } from '../../hooks'

type Auto = 0 | 1 | 2 | 4

/**
 * The thumb-reach bar along the bottom of a phone match: controls on the left, a big NEXT BALL in the middle, and
 * auto-play on the right (tap to cycle 1x, 2x, 4x, off). Everything else lives in the controls sheet.
 */
export function MobileDock({ onBall, auto, setAuto, onControls, over, holdLabel }: { onBall: () => void; auto: Auto; setAuto: (v: Auto) => void; onControls: () => void; over: boolean; /** Between innings the big button says this instead of NEXT BALL. */ holdLabel?: string }) {
  const circle = 'relative grid h-12 w-12 shrink-0 place-items-center rounded-full transition active:scale-95'
  return (
    <div className="shrink-0 border-t border-line bg-ink/95 px-3 pt-2" style={{ paddingBottom: 'calc(var(--sab) + 10px)' }}>
      <div className="mx-auto flex max-w-md items-center gap-3">
        {!holdLabel && <button onClick={onControls} aria-label="Open match controls" className={`${circle} bg-slate-700 text-white`}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></svg>
        </button>}
        <button
          onClick={() => { haptic(10); onBall() }} disabled={over} aria-label="Next ball"
          className={`${(!auto && !over) || holdLabel ? 'cta-pulse ' : ''}flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-emerald-500 font-display text-lg tracking-wider text-black shadow-[0_6px_20px_rgba(16,185,129,.35)] transition active:scale-[0.98] active:bg-emerald-400 disabled:opacity-40`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z" /></svg>
          {holdLabel ?? 'NEXT BALL'}
        </button>
        {!holdLabel && <button
          onClick={() => setAuto(auto === 0 ? 1 : auto === 1 ? 2 : auto === 2 ? 4 : 0)} aria-label="Auto-play"
          className={`${circle} ${auto ? 'bg-indigo-500 text-white ring-2 ring-indigo-300' : 'bg-slate-700 text-white'}`}
        >
          {auto ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M3 5.5v13a1 1 0 0 0 1.5.86L13 14v4.5a1 1 0 0 0 1.5.86l8-6a1 1 0 0 0 0-1.72l-8-6A1 1 0 0 0 13 6.5V11L4.5 4.64A1 1 0 0 0 3 5.5z" /></svg>
          )}
          {auto > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-white px-1.5 text-[11px] font-extrabold leading-4 text-indigo-700">{auto}x</span>}
        </button>}
      </div>
    </div>
  )
}
