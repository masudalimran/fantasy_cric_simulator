import confetti from 'canvas-confetti'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'

export interface FxEvent {
  key: number
  kind: 'four' | 'six' | 'wicket' | 'milestone' | 'win'
  text: string
  colors: string[]
}

const STYLE: Record<FxEvent['kind'], { color: string; size: string }> = {
  four: { color: '#38bdf8', size: 'text-4xl md:text-8xl' },
  six: { color: '#f472b6', size: 'text-5xl md:text-9xl' },
  wicket: { color: '#f87171', size: 'text-5xl md:text-9xl' },
  milestone: { color: '#fbbf24', size: 'text-4xl md:text-8xl' },
  win: { color: '#fbbf24', size: 'text-4xl md:text-7xl' },
}

function burst(fx: FxEvent) {
  const base = { disableForReducedMotion: true, colors: fx.colors, zIndex: 60 }
  switch (fx.kind) {
    case 'four':
      confetti({ ...base, particleCount: 40, spread: 55, origin: { y: 0.55 } })
      break
    case 'six':
      confetti({ ...base, particleCount: 130, spread: 90, startVelocity: 45, origin: { y: 0.6 } })
      break
    case 'wicket':
      confetti({ ...base, particleCount: 60, spread: 360, startVelocity: 25, gravity: 1.4, ticks: 120, colors: ['#f87171', '#fca5a5', '#ffffff'], origin: { y: 0.5 } })
      break
    case 'milestone':
      for (const x of [0.2, 0.8]) confetti({ ...base, particleCount: 90, spread: 70, angle: x < 0.5 ? 60 : 120, origin: { x, y: 0.7 } })
      break
    case 'win': {
      const end = Date.now() + 2500
      const frame = () => {
        confetti({ ...base, particleCount: 6, angle: 60, spread: 60, origin: { x: 0, y: 0.8 } })
        confetti({ ...base, particleCount: 6, angle: 120, spread: 60, origin: { x: 1, y: 0.8 } })
        if (Date.now() < end) requestAnimationFrame(frame)
      }
      frame()
    }
  }
}

/** Big callout text and confetti for the moments that deserve it. */
export function Fx({ fx }: { fx: FxEvent | null }) {
  useEffect(() => {
    if (fx) burst(fx)
  }, [fx])
  return (
    <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center">
      <AnimatePresence>
        {fx && fx.text && (
          <motion.div
            key={fx.key}
            initial={{ scale: 0.3, opacity: 0, rotate: -6 }}
            animate={{ scale: [0.3, 1.25, 1], opacity: [0, 1, 1], rotate: [-6, 3, 0] }}
            exit={{ scale: 1.4, opacity: 0, transition: { duration: 0.35 } }}
            transition={{ duration: 0.5 }}
            className={`font-display ${fx.text.length > 14 ? 'text-3xl md:text-6xl' : STYLE[fx.kind].size} max-w-[92vw] text-center tracking-wide`}
            style={{ color: STYLE[fx.kind].color, WebkitTextStroke: '3px #0b0d14', paintOrder: 'stroke fill', textShadow: `0 0 40px ${STYLE[fx.kind].color}99` }}
          >
            {fx.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
