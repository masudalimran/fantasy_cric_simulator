import { degOf } from '../../engine/aim'
import { SECTORS, sectorIndex } from '../../engine/shots'
import type { DeliveryAim, Length, Pace, ShotAim } from '../../engine/types'

/** Centre of each of the eight sectors, in degrees from straight (+ = off side), in the order of SECTORS. */
const SECTOR_DEG = [0, 45, 90, 135, 180, -135, -90, -45]
export const angleOfDeg = (deg: number) => -Math.PI / 2 + (deg * Math.PI) / 180

const wedge = (cx: number, cy: number, r0: number, r1: number, d0: number, d1: number) => {
  const p = (r: number, d: number) => [cx + r * Math.sin((d * Math.PI) / 180), cy - r * Math.cos((d * Math.PI) / 180)]
  const [a, b, c, e] = [p(r1, d0), p(r1, d1), p(r0, d1), p(r0, d0)]
  return `M${a} A${r1} ${r1} 0 0 1 ${b} L${c} A${r0} ${r0} 0 0 0 ${e} Z`
}

export function shotText(a: ShotAim | null | undefined) {
  if (!a) return null
  return `${SECTORS[sectorIndex(degOf(a.angle))]}, ${a.loft ? 'in the air' : 'along the ground'}`
}

/** Choose where the next shot goes: tap a part of the field, then ground or air. It applies to the next ball only. */
export function ShotPad({ value, onChange }: { value: ShotAim | null; onChange: (v: ShotAim | null) => void }) {
  const cur = value ? sectorIndex(degOf(value.angle)) : -1
  const loft = value?.loft ?? false
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <svg viewBox="0 0 100 100" className="h-36 w-36 shrink-0" role="group" aria-label="Shot direction">
          <circle cx="50" cy="50" r="47" fill="#1a6a3a" stroke="#fff" strokeOpacity="0.5" />
          {SECTOR_DEG.map((d, i) => (
            <g key={i} className="cursor-pointer" onClick={() => onChange({ angle: angleOfDeg(d), loft })} role="button" aria-label={SECTORS[i]} aria-pressed={cur === i}>
              <path d={wedge(50, 50, 13, 46, d - 22, d + 22)} fill={cur === i ? '#fbbf24' : '#ffffff'} fillOpacity={cur === i ? 0.95 : 0.12} stroke="#fff" strokeOpacity="0.45" strokeWidth="0.5" />
              <text x={50 + 31 * Math.sin((d * Math.PI) / 180)} y={50 - 31 * Math.cos((d * Math.PI) / 180) + 1.6} textAnchor="middle" fontSize="5.4" fontWeight="700" fill={cur === i ? '#000' : '#fff'} pointerEvents="none">{SECTORS[i].replace(' ', ' ')}</text>
            </g>
          ))}
          <rect x="48.4" y="42" width="3.2" height="16" rx="1" fill="#d7b87c" />
          <text x="50" y="97" textAnchor="middle" fontSize="4.6" fill="#cbd5e1">bowler is at the top</text>
        </svg>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="grid grid-cols-2 overflow-hidden rounded-lg bg-slate-700">
            {([['Ground', false], ['In the air', true]] as const).map(([label, l]) => (
              <button key={label} onClick={() => onChange({ angle: value?.angle ?? angleOfDeg(0), loft: l })} className={`h-9 text-[12px] font-bold transition ${loft === l && value ? 'bg-amber-400 text-black' : 'text-slate-200 hover:bg-slate-600'}`}>{label}</button>
            ))}
          </div>
          <p className="text-[11px] leading-snug text-slate-400">{value ? <>Next ball: <b className="text-amber-300">{shotText(value)}</b>.</> : 'Tap a part of the field to aim the next ball. Gaps between fielders score more; across the line is risky; in the air is worth sixes but can be caught.'}</p>
          {value && <button onClick={() => onChange(null)} className="rounded-lg border border-line px-2.5 py-1 text-[11px] font-bold text-slate-200 hover:border-slate-400">Clear (let the batsman decide)</button>}
        </div>
      </div>
    </div>
  )
}

const LENGTHS: { id: Length; label: string }[] = [
  { id: 'short', label: 'Short' },
  { id: 'good', label: 'Good' },
  { id: 'full', label: 'Full' },
  { id: 'yorker', label: 'Yorker' },
]
const LINES: { id: DeliveryAim['line']; label: string }[] = [
  { id: -2, label: 'Down leg' },
  { id: -1, label: 'Leg' },
  { id: 0, label: 'Stumps' },
  { id: 1, label: 'Off' },
  { id: 2, label: 'Wide off' },
]

export function deliveryText(a: DeliveryAim | null | undefined) {
  if (!a) return null
  const line = LINES.find((l) => l.id === a.line)?.label.toLowerCase()
  return `${a.length === 'yorker' ? 'a yorker' : `a ${a.length}-length ball`}, ${line === 'stumps' ? 'on the stumps' : line === 'down leg' ? 'down the leg side' : `on the ${line} line`}, ${a.pace}`
}

/** Choose where the next ball pitches (line and length) and how quick it is. It applies to the next ball only. */
export function DeliveryPad({ value, onChange, paceLabels }: { value: DeliveryAim | null; onChange: (v: DeliveryAim | null) => void; paceLabels: [string, string, string] }) {
  const pace: Pace = value?.pace ?? 'medium'
  const set = (patch: Partial<DeliveryAim>) => onChange({ line: value?.line ?? 0, length: value?.length ?? 'good', pace, ...patch })
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3">
        <div className="shrink-0">
          <div className="grid grid-cols-5 gap-px overflow-hidden rounded-lg border border-line bg-line" role="group" aria-label="Line and length">
            {LENGTHS.map((len) => LINES.map((ln) => {
              const on = value?.length === len.id && value.line === ln.id
              return (
                <button
                  key={`${len.id}${ln.id}`} onClick={() => set({ line: ln.id, length: len.id })} aria-pressed={on} aria-label={`${len.label} length, ${ln.label}`} title={`${len.label} length, ${ln.label}`}
                  className={`h-7 w-8 transition ${on ? 'bg-amber-400' : 'bg-[#c8a869] hover:bg-[#dcc185]'}`}
                >
                  {on ? <span className="mx-auto block h-3 w-3 rounded-full bg-red-600 ring-2 ring-white" /> : null}
                </button>
              )
            }))}
          </div>
          <div className="mt-1 flex justify-between text-[9px] text-slate-400"><span>leg</span><span>stumps</span><span>off</span></div>
          <div className="text-center text-[9px] text-slate-500">top = short, bottom = yorker (batsman)</div>
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="grid grid-cols-3 overflow-hidden rounded-lg bg-slate-700">
            {(['fast', 'medium', 'slow'] as const).map((p, i) => (
              <button key={p} onClick={() => set({ pace: p })} className={`h-9 text-[11px] font-bold transition ${value && pace === p ? 'bg-amber-400 text-black' : 'text-slate-200 hover:bg-slate-600'}`}>{paceLabels[i]}</button>
            ))}
          </div>
          <p className="text-[11px] leading-snug text-slate-400">{value ? <>Next ball: <b className="text-amber-300">{deliveryText(value)}</b>.</> : 'Tap a spot on the pitch for the next ball. Mix it up: bowling the same ball twice lets the batsman read it. Yorkers are hard to hit but a miss is a full toss.'}</p>
          {value && <button onClick={() => onChange(null)} className="rounded-lg border border-line px-2.5 py-1 text-[11px] font-bold text-slate-200 hover:border-slate-400">Clear (let the bowler decide)</button>}
        </div>
      </div>
    </div>
  )
}
