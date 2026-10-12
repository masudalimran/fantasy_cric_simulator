import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState, type ReactNode } from 'react'

interface Props {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel: string
  cancelLabel?: string
  tone?: 'danger' | 'warn'
  /** When set, the confirm button stays off until this exact word has been typed (for things that cannot be undone). */
  typeToConfirm?: string
  onConfirm: () => void
  onCancel: () => void
}

const TONE = {
  danger: { ring: 'border-red-500/70', button: 'bg-red-500 text-white hover:bg-red-400', title: 'text-red-200' },
  warn: { ring: 'border-amber-400/70', button: 'bg-amber-400 text-black hover:bg-amber-300', title: 'text-amber-200' },
}

/** An in-app "are you sure?" that says what will happen. Escape or clicking outside cancels. */
export function ConfirmDialog({ open, title, children, confirmLabel, cancelLabel = 'Keep it', tone = 'warn', typeToConfirm, onConfirm, onCancel }: Props) {
  const [typed, setTyped] = useState('')
  useEffect(() => { if (open) setTyped('') }, [open])
  const ready = !typeToConfirm || typed === typeToConfirm
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])
  const t = TONE[tone]
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[80] grid place-items-center bg-black/75 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onCancel}>
          <motion.div
            role="alertdialog" aria-modal="true" aria-label={title}
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.92, y: 16, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className={`w-full max-w-md rounded-2xl border-2 bg-panel p-6 shadow-2xl ${t.ring}`}
          >
            <h2 className={`font-display text-3xl tracking-wide ${t.title}`}>{title}</h2>
            <div className="mt-2 space-y-2 text-sm text-slate-200">{children}</div>
            {typeToConfirm && (
              <label className="mt-4 block">
                <span className="mb-1 block text-xs text-slate-300">To be sure, type <b className="rounded bg-red-500/20 px-1.5 py-0.5 font-mono tracking-widest text-red-200">{typeToConfirm}</b> below.</span>
                <input
                  autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && ready) onConfirm() }}
                  autoComplete="off" autoCapitalize="characters" spellCheck={false} aria-label={`Type ${typeToConfirm} to confirm`}
                  className="w-full rounded-lg border-2 border-line bg-panel-2 px-3 py-2 font-mono text-base tracking-widest text-white outline-none focus:border-red-400"
                />
              </label>
            )}
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button autoFocus={!typeToConfirm} onClick={onCancel} className="rounded-xl border border-line bg-panel-2 px-5 py-2.5 text-sm font-bold text-white hover:border-slate-400">{cancelLabel}</button>
              <button onClick={onConfirm} disabled={!ready} className={`rounded-xl px-5 py-2.5 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-35 ${t.button}`}>{confirmLabel}</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
