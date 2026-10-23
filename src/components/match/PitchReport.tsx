import { motion } from 'framer-motion'
import { describePitch, pitchColors, tossAdvice } from '../../engine/pitchInfo'
import type { Pitch } from '../../engine/types'

const SPREAD = { ease: 0.24, pace: 0.3, spin: 0.3 }
/** A pitch value as a 0-100 meter, 50 being an average pitch. */
const meter = (v: number, spread: number) => Math.max(6, Math.min(94, 50 + (v / spread) * 22))

/** The pitch seen from above: the strip, with the marks that tell what it is like (grass, cracks, shine). */
function Strip({ kind }: { kind: ReturnType<typeof describePitch>['kind'] }) {
  const c = pitchColors(kind)
  return (
    <svg viewBox="0 0 100 160" className="h-full w-full" preserveAspectRatio="xMidYMid meet" aria-hidden>
      <rect width="100" height="160" fill={c.grass[0]} />
      {Array.from({ length: 8 }, (_, i) => <rect key={i} x="0" y={i * 20} width="100" height="10" fill={c.grass[1]} />)}
      <rect x="34" y="8" width="32" height="144" rx="3" fill={c.strip[1]} />
      <rect x="34" y="8" width="32" height="144" rx="3" fill="none" stroke={c.strip[0]} strokeWidth="1.5" />
      {/* the creases */}
      <line x1="30" y1="28" x2="70" y2="28" stroke="#fff" strokeWidth="1" opacity="0.9" />
      <line x1="30" y1="132" x2="70" y2="132" stroke="#fff" strokeWidth="1" opacity="0.9" />
      {[44, 50, 56].map((x) => <rect key={x} x={x - 0.8} y="22" width="1.6" height="7" fill="#f8fafc" />)}
      {[44, 50, 56].map((x) => <rect key={`b${x}`} x={x - 0.8} y="131" width="1.6" height="7" fill="#f8fafc" />)}
      {(kind === 'green') && Array.from({ length: 34 }, (_, i) => (
        <motion.path key={i} d={`M ${37 + (i * 7) % 26} ${14 + (i * 23) % 130} l 0 -5`} stroke="#4ade80" strokeWidth="1.2" strokeLinecap="round" animate={{ rotate: [-6, 6, -6] }} transition={{ duration: 1.6, repeat: Infinity, delay: (i % 7) * 0.12 }} style={{ transformOrigin: 'center' }} />
      ))}
      {(kind === 'dry') && [
        'M 40 40 L 46 56 L 42 70 L 50 88', 'M 60 50 L 54 66 L 58 84', 'M 38 100 L 47 112 L 44 128', 'M 62 104 L 55 118 L 60 130', 'M 50 30 L 53 44',
      ].map((d, i) => <motion.path key={i} d={d} stroke="#6b4423" strokeWidth="1.1" fill="none" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.6 + i * 0.35, duration: 0.8 }} />)}
      {(kind === 'flat' || kind === 'true') && <motion.rect x="34" y="8" width="10" height="144" fill="#fff" opacity="0.18" animate={{ x: [34, 56, 34] }} transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }} />}
      {(kind === 'slow' || kind === 'dead') && [[44, 50], [56, 92], [48, 120]].map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx="7" ry="9" fill="#000" opacity="0.14" />)}
      {/* a scan line that sweeps down the pitch */}
      <motion.rect x="26" width="48" height="2.5" fill="#38bdf8" opacity="0.7" initial={{ y: 8 }} animate={{ y: [8, 150, 8] }} transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }} />
    </svg>
  )
}

/**
 * The pitch report: what the pitch is like, and which toss call it rewards. Shown after the coin has landed. The same advice is what
 * the computer follows when it wins the toss.
 */
export function PitchReport({ pitch, onClose }: { pitch: Pitch; onClose: () => void }) {
  const info = describePitch(pitch)
  const adv = tossAdvice(pitch)
  const bars: [string, number, string][] = [
    ['Pace help', meter(pitch.pace, SPREAD.pace), '#34d399'],
    ['Spin help', meter(pitch.spin, SPREAD.spin), '#fbbf24'],
    ['Batting ease', meter(pitch.ease, SPREAD.ease), '#38bdf8'],
  ]
  return (
    <motion.div data-scroll-lock className="fixed inset-0 z-[80] flex flex-col bg-[#05080f]" style={{ paddingTop: 'var(--sat)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-label="Pitch report">
      <div className="flex shrink-0 items-center gap-2 px-4 pb-2 pt-3">
        <span className="rounded-md bg-gradient-to-r from-amber-400 to-orange-500 px-2.5 py-1 font-display text-lg leading-none tracking-widest text-black">PITCH REPORT</span>
        <span className="flex-1" />
        <span className="text-2xl" aria-hidden>{info.icon}</span>
      </div>
      <div className="mx-auto flex min-h-0 w-full max-w-lg flex-1 gap-3 px-4">
        <div className="relative w-[34%] shrink-0 overflow-hidden rounded-2xl border-2 border-sky-400/50 shadow-[0_0_30px_#38bdf833]"><Strip kind={info.kind} /></div>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-3">
          <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
            <div className="font-display text-3xl leading-none tracking-wide text-white">{info.label}</div>
            <p className="mt-1 text-sm leading-snug text-slate-300">{info.tip}</p>
          </motion.div>
          <div className="space-y-2">
            {bars.map(([label, v, color], i) => (
              <div key={label}>
                <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400"><span>{label}</span><span>{v > 60 ? 'High' : v < 40 ? 'Low' : 'Average'}</span></div>
                <div className="relative h-2.5 overflow-hidden rounded-full bg-white/10">
                  <motion.div className="h-full rounded-full" style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${v}%` }} transition={{ delay: 0.4 + i * 0.25, duration: 0.8 }} />
                  <div className="absolute inset-y-0 left-1/2 w-px bg-white/50" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <motion.div className="mx-auto mt-3 w-full max-w-lg shrink-0 px-4" initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.4, type: 'spring', stiffness: 200, damping: 20 }}>
        <div className="rounded-2xl border-2 px-4 py-3 text-center" style={{ borderColor: adv.choice === 'bat' ? '#34d399' : adv.choice === 'bowl' ? '#38bdf8' : '#94a3b8', background: '#0b1220' }}>
          <div className="text-[11px] font-extrabold uppercase tracking-widest text-amber-300">The toss call</div>
          <div className="font-display text-4xl leading-none tracking-wide text-white">{adv.choice === 'bat' ? 'BAT FIRST' : adv.choice === 'bowl' ? 'BOWL FIRST' : 'EITHER WAY'}</div>
          <p className="mt-1 text-sm leading-snug text-slate-300">{adv.text}</p>
          {adv.choice && <p className="mt-1 text-xs text-slate-400">Getting it right is worth about a fifth of the first innings, and half of that back in the second.</p>}
        </div>
      </motion.div>
      <div className="shrink-0 px-4 pt-3" style={{ paddingBottom: 'calc(var(--sab) + 14px)' }}>
        <motion.button onClick={onClose} className="mx-auto block w-full max-w-lg cursor-pointer rounded-full bg-indigo-500 py-3 font-display text-xl tracking-wide text-white" animate={{ boxShadow: ['0 0 0 0 #6366f166', '0 0 0 10px #6366f100'] }} transition={{ duration: 1.4, repeat: Infinity }}>Got it</motion.button>
      </div>
    </motion.div>
  )
}
