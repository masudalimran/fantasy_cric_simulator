import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import type { Team } from '../../types'

/**
 * The commentary box as the commentators see it: the camera sits behind the two of them, headsets on, looking out of a big window onto
 * the ground where play goes on (a small delivery plays over and over out there) while they talk, one speech bubble at a time.
 */
export function CommentaryBox({ lines, teams, rate: r }: { lines: string[]; teams: [Team, Team]; rate: number }) {
  const [k, setK] = useState(0)
  const per = Math.max(1.6, 2.5 * r)
  useEffect(() => {
    const t = window.setInterval(() => setK((x) => (x + 1 < lines.length ? x + 1 : x)), per * 1000)
    return () => window.clearInterval(t)
  }, [lines.length, per])
  const [bat, bowl] = [teams[0].colors.primary, teams[1].colors.secondary]
  const speaker = k % 2 // 0 is the one on the left
  // the delivery that plays in the window, again and again
  const loop = { duration: 3.4, repeat: Infinity, ease: 'linear' as const }
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#06050d]">
      {/* the window */}
      <div className="absolute inset-x-[5%] top-[9%] h-[56%] overflow-hidden rounded-xl border-[5px] border-slate-700 bg-slate-900 shadow-[inset_0_0_30px_#000]">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,#0b1430 0%,#1d2f63 22%,#27502f 23%,#1b7a43 60%,#166a3a 100%)' }} />
        {/* the far stands, full of people */}
        <div className="absolute inset-x-0 top-0 h-[22%] overflow-hidden">
          {Array.from({ length: 56 }, (_, i) => <span key={i} className="absolute rounded-full" style={{ left: `${(i * 31) % 100}%`, top: `${6 + ((i * 17) % 80)}%`, width: 3, height: 3, background: i % 3 === 0 ? bat : i % 3 === 1 ? '#fde68a' : '#e2e8f0', opacity: 0.6 }} />)}
        </div>
        <svg viewBox="0 0 100 60" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          <ellipse cx="50" cy="38" rx="46" ry="21" fill="none" stroke="#fff" strokeOpacity="0.25" strokeWidth="0.4" />
          <path d="M47 18 53 18 56 54 44 54Z" fill="#cdb078" opacity="0.85" />
          {/* fielders, standing about */}
          {[[18, 30], [30, 22], [68, 22], [82, 31], [14, 44], [86, 46], [30, 54], [70, 54]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.5" fill={bowl} stroke="#00000066" strokeWidth="0.3" />)}
          {/* the bowler runs in */}
          <motion.circle r="1.9" fill={bowl} stroke="#fff" strokeWidth="0.4" animate={{ cx: [50, 50, 50, 50], cy: [14, 22, 26, 14], opacity: [1, 1, 1, 0] }} transition={{ ...loop, times: [0, 0.35, 0.45, 0.5] }} />
          {/* the batsman, who plays at it */}
          <circle cx="50" cy="51" r="2.2" fill={bat} stroke="#fff" strokeWidth="0.4" />
          <motion.line x1="51.500" y1="50" x2="56" y2="46" stroke="#e2e8f0" strokeWidth="0.9" strokeLinecap="round" animate={{ rotate: [0, 0, -70, 0, 0] }} transition={{ ...loop, times: [0, 0.5, 0.56, 0.62, 1] }} style={{ transformOrigin: '51.5px 50px' }} />
          {/* the ball: down the pitch, then away over the rope */}
          <motion.circle r="1" fill="#ef4444" animate={{ cx: [50, 50, 50, 78, 92], cy: [24, 28, 50, 20, 6], opacity: [0, 1, 1, 1, 0] }} transition={{ ...loop, times: [0.35, 0.4, 0.55, 0.72, 0.8] }} />
        </svg>
        {/* glass: a sweep of light across the pane */}
        <motion.div className="pointer-events-none absolute inset-y-0 w-1/4 -skew-x-12 bg-white/10" animate={{ left: ['-30%', '130%'] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', repeatDelay: 2 }} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent" />
      </div>

      {/* the desk, the two commentators from behind, headsets on */}
      <svg viewBox="0 0 100 60" preserveAspectRatio="xMidYMax meet" className="absolute inset-x-0 bottom-0 h-[42%] w-full">
        <defs>
          <linearGradient id="deskg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1e2a4a" /><stop offset="1" stopColor="#0a0f1f" /></linearGradient>
          <linearGradient id="rimg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6aa8ff" stopOpacity="0.7" /><stop offset="1" stopColor="#6aa8ff" stopOpacity="0" /></linearGradient>
        </defs>
        {([{ x: 29, hair: '#2a1b12', skin: '#a8714b', shirt: '#2b3a67' }, { x: 71, hair: '#d9b45f', skin: '#d9a77d', shirt: '#5b2b4f' }] as const).map((p, i) => (
          <motion.g key={i} animate={{ y: speaker === i ? [0, -1.4, 0, -1, 0] : 0, rotate: speaker === i ? [0, i ? -1.5 : 1.5, 0] : 0 }} transition={{ duration: 0.6, repeat: speaker === i ? Infinity : 0 }} style={{ transformOrigin: `${p.x}px 40px` }}>
            {/* shoulders and back */}
            <path d={`M${p.x - 15} 60 C${p.x - 15} 42 ${p.x - 9} 36 ${p.x} 36 C${p.x + 9} 36 ${p.x + 15} 42 ${p.x + 15} 60Z`} fill={p.shirt} />
            <path d={`M${p.x - 15} 60 C${p.x - 15} 42 ${p.x - 9} 36 ${p.x} 36 C${p.x + 9} 36 ${p.x + 15} 42 ${p.x + 15} 60Z`} fill="url(#rimg)" opacity="0.5" />
            {/* neck, head from behind (hair), ears */}
            <rect x={p.x - 2.600} y="31" width="5.200" height="6" rx="2" fill={p.skin} />
            <circle cx={p.x} cy="26" r="8" fill={p.hair} />
            <ellipse cx={p.x - 8} cy="27" rx="1.600" ry="2.600" fill={p.skin} /><ellipse cx={p.x + 8} cy="27" rx="1.600" ry="2.600" fill={p.skin} />
            {/* the headset: a band over the top and an ear cup on each side, with a boom mic */}
            <path d={`M${p.x - 9} 28 C${p.x - 9} 15 ${p.x + 9} 15 ${p.x + 9} 28`} fill="none" stroke="#0f172a" strokeWidth="1.500" />
            <rect x={p.x - 11} y="24" width="3.600" height="7" rx="1.600" fill="#0f172a" /><rect x={p.x + 7.400} y="24" width="3.600" height="7" rx="1.600" fill="#0f172a" />
            <circle cx={p.x} cy="26" r="8" fill="url(#rimg)" opacity="0.35" />
          </motion.g>
        ))}
        {/* the desk in front of them: screens glowing, microphones */}
        <rect x="0" y="48" width="100" height="12" fill="url(#deskg)" />
        <rect x="0" y="48" width="100" height="0.800" fill="#6aa8ff" opacity="0.6" />
        {[16, 50, 84].map((x) => <g key={x}><rect x={x - 6} y="50.500" width="12" height="6" rx="0.800" fill="#0b1b3a" stroke="#38bdf8" strokeOpacity="0.5" strokeWidth="0.3" /><rect x={x - 5} y="51.500" width="10" height="1.200" fill="#38bdf8" opacity="0.5" /></g>)}
        {[38, 62].map((x) => <g key={x}><rect x={x - 0.400} y="43" width="0.800" height="7" fill="#111827" /><ellipse cx={x} cy="42.500" rx="1.600" ry="2" fill="#1f2937" stroke="#94a3b8" strokeWidth="0.3" /></g>)}
      </svg>

      {/* what they say: a bubble over the one who is talking */}
      {lines.slice(0, k + 1).map((l, i) => i === k && (
        <motion.div
          key={i} className="absolute z-20 max-w-[58%] rounded-2xl bg-white px-3 py-1.5 text-left text-[12px] font-semibold leading-snug text-slate-900 shadow-xl"
          style={{ bottom: '41%', [speaker === 0 ? 'left' : 'right']: '5%' }}
          initial={{ opacity: 0, y: 12, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 22 }}
        >
          <span className="mb-0.5 block text-[9px] font-extrabold uppercase tracking-widest text-violet-600">{speaker === 0 ? 'Play by play' : 'Expert comment'} 🎙️</span>
          {l}
        </motion.div>
      ))}
      <div className="absolute left-3 top-2 z-30 flex items-center gap-1.5 rounded bg-black/70 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-violet-300"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" />Commentary box</div>
    </div>
  )
}
