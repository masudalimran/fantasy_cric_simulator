import { AnimatePresence, motion } from 'framer-motion'
import { markSeen, useSeen } from '../tips'

/**
 * A friendly first-time hint that floats near the bottom of the screen. It shows once, until it is dismissed
 * (or "Got it"), and never blocks the screen. `lift` leaves room for a bottom bar.
 */
export function TipBanner({ id, title, children, lift = 84, left = false }: { id: string; title: string; children: React.ReactNode; lift?: number; left?: boolean }) {
  const seen = useSeen(id)
  return (
    <AnimatePresence>
      {!seen && (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }} transition={{ delay: 0.6, duration: 0.3 }}
          className={`fixed inset-x-3 z-[55] mx-auto flex max-w-md items-start gap-3 rounded-2xl border border-amber-300/60 bg-ink/95 p-3.5 shadow-2xl backdrop-blur bottom-[calc(var(--sab)+var(--lift))] md:inset-x-auto md:bottom-6 ${left ? 'md:left-6 md:mx-0' : 'md:right-6'}`}
          style={{ '--lift': `${lift}px` } as React.CSSProperties}
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-400 font-display text-xl leading-none text-black">!</span>
          <div className="min-w-0 flex-1">
            <div className="font-display text-xl leading-tight tracking-wide text-amber-300">{title}</div>
            <p className="text-sm leading-snug text-slate-200">{children}</p>
          </div>
          <button onClick={() => markSeen(id)} className="cta-pulse shrink-0 self-center rounded-full bg-emerald-500 px-4 py-2 text-sm font-extrabold text-black active:bg-emerald-400">Got it</button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
