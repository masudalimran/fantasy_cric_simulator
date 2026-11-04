import { useEffect, useRef, useState } from 'react'

export interface DropOption { value: string; label: string; hint?: string }

/** A pick-one list in the look of the game (the browser's own select box is not). Opens under the button, scrolls, closes on a tap outside. */
export function Dropdown({ value, options, onChange, placeholder = 'Pick…', label, small = false }: { value: string; options: DropOption[]; onChange: (v: string) => void; placeholder?: string; label: string; small?: boolean }) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const away = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', away)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc) }
  }, [open])
  const cur = options.find((o) => o.value === value)
  return (
    <div ref={box} className={`relative ${small ? '' : 'min-w-0 flex-1'}`}>
      <button
        type="button" aria-label={label} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-full border bg-black/30 text-left text-white transition hover:border-amber-300/60 ${open ? 'border-amber-300' : 'border-line'} ${small ? 'px-2.5 py-1.5 text-[11px]' : 'px-3.5 py-2 text-xs'}`}
      >
        <span className={`min-w-0 truncate ${cur ? '' : 'text-slate-400'}`}>{cur?.label ?? placeholder}</span>
        <span className={`shrink-0 text-amber-300 transition ${open ? 'rotate-180' : ''}`} aria-hidden>▾</span>
      </button>
      {open && (
        <ul role="listbox" aria-label={label} className="absolute left-0 right-0 z-30 mt-1.5 max-h-64 min-w-[10rem] overflow-y-auto rounded-2xl border border-amber-300/40 bg-[#10131c] p-1 shadow-[0_12px_32px_rgba(0,0,0,0.6)]">
          {options.map((o) => (
            <li key={o.value} role="option" aria-selected={o.value === value}>
              <button
                type="button" onClick={() => { onChange(o.value); setOpen(false) }}
                className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs transition active:bg-amber-400/20 ${o.value === value ? 'bg-amber-400/15 font-bold text-amber-200' : 'text-slate-200 hover:bg-white/5'}`}
              >
                <span className="min-w-0 truncate">{o.label}</span>
                {o.hint && <span className="shrink-0 text-[11px] text-slate-400">{o.hint}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
