import { motion, useDragControls } from 'framer-motion'
import { useEffect } from 'react'
import { useIsMobile } from '../hooks'

const WIDTH = { sm: 'md:max-w-md', md: 'md:max-w-2xl', lg: 'md:max-w-3xl', xl: 'md:max-w-4xl' } as const

/**
 * A popup. On a computer it is a centred card; on a phone it is a bottom sheet that slides up, has a grab handle,
 * and can be dragged down to dismiss, like a native app. Escape also closes it.
 */
export function Sheet({ label, onClose, z = 70, size = 'md', children, className = '', scrim = 'bg-black/75', labelledBy, scroll = true }: {
  label: string
  onClose: () => void
  z?: number
  size?: keyof typeof WIDTH
  children: React.ReactNode
  className?: string
  scrim?: string
  labelledBy?: string
  /** False when the content looks after its own scrolling (a fixed header and footer around a scrolling list). */
  scroll?: boolean
}) {
  const mobile = useIsMobile()
  const controls = useDragControls()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  return (
    <motion.div
      className={`fixed inset-0 flex items-end justify-center md:items-center md:overflow-y-auto md:p-4 ${scrim}`}
      style={{ zIndex: z }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
    >
      <motion.div
        role="dialog" aria-modal="true" aria-label={labelledBy ? undefined : label} aria-labelledby={labelledBy}
        onClick={(e) => e.stopPropagation()}
        initial={mobile ? { y: '100%' } : { y: 24, scale: 0.95, opacity: 0 }}
        animate={mobile ? { y: 0 } : { y: 0, scale: 1, opacity: 1 }}
        exit={mobile ? { y: '100%' } : { y: 16, opacity: 0 }}
        transition={mobile ? { type: 'spring', stiffness: 400, damping: 40 } : { type: 'spring', stiffness: 320, damping: 28 }}
        drag={mobile ? 'y' : false} dragControls={controls} dragListener={false} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.7 }}
        onDragEnd={(_, i) => { if (i.offset.y > 110 || i.velocity.y > 700) onClose() }}
        className={`relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-b-0 border-line bg-ink shadow-2xl md:my-auto md:max-h-[92vh] md:rounded-3xl md:border-b ${WIDTH[size]} ${className}`}
        style={mobile ? { paddingBottom: 'var(--sab)' } : undefined}
      >
        {/* grab handle (phones): drag it down to close */}
        <div className="flex shrink-0 cursor-grab justify-center pb-1 pt-2 active:cursor-grabbing md:hidden" onPointerDown={(e) => controls.start(e)} style={{ touchAction: 'none' }} aria-hidden>
          <span className="h-1.5 w-10 rounded-full bg-slate-600" />
        </div>
        <div className={`min-h-0 flex-1 ${scroll ? 'overflow-y-auto overscroll-contain' : 'flex flex-col'}`}>{children}</div>
      </motion.div>
    </motion.div>
  )
}
