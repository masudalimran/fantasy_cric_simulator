import { useEffect, useState } from 'react'
import { glossaryFor } from '../data/glossary'

interface Tip { text: string; x: number; y: number; below: boolean }

/** What a stat or rating is called, if the element under the pointer is one: a table heading or anything marked `data-gloss`. */
function textFor(el: Element | null): { text: string; rect: DOMRect } | null {
  const marked = el?.closest('[data-gloss]')
  if (marked) { const t = glossaryFor(marked.getAttribute('data-gloss')); if (t) return { text: t, rect: marked.getBoundingClientRect() } }
  const th = el?.closest('th')
  if (th) { const t = glossaryFor(th.textContent); if (t) return { text: t, rect: th.getBoundingClientRect() } }
  return null
}

/**
 * One tooltip for the whole app. Hover (or keyboard focus on) a stat or rating name anywhere and it explains what
 * it means. Table headings are picked up automatically; elsewhere add `data-gloss="Power"` to the label.
 */
export function Glossary() {
  const [tip, setTip] = useState<Tip | null>(null)
  useEffect(() => {
    const show = (e: Event) => {
      const found = textFor(e.target instanceof Element ? e.target : null)
      if (!found) return setTip((t) => (t ? null : t))
      const { rect, text } = found
      const below = rect.top < 90
      setTip({ text, x: Math.max(130, Math.min(window.innerWidth - 130, rect.left + rect.width / 2)), y: below ? rect.bottom + 8 : rect.top - 8, below })
    }
    const hide = () => setTip(null)
    document.addEventListener('mouseover', show)
    document.addEventListener('focusin', show)
    document.addEventListener('mouseleave', hide)
    window.addEventListener('scroll', hide, true)
    document.addEventListener('keydown', hide)
    return () => { document.removeEventListener('mouseover', show); document.removeEventListener('focusin', show); document.removeEventListener('mouseleave', hide); window.removeEventListener('scroll', hide, true); document.removeEventListener('keydown', hide) }
  }, [])
  if (!tip) return null
  return (
    <div
      role="tooltip" data-glossary-tip
      className="pointer-events-none fixed z-[200] w-60 rounded-lg bg-black px-3 py-2 text-xs font-medium leading-snug text-slate-100 shadow-xl ring-1 ring-white/20"
      style={{ left: tip.x, top: tip.y, transform: `translate(-50%, ${tip.below ? '0' : '-100%'})` }}
    >
      {tip.text}
    </div>
  )
}
