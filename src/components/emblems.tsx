import type { ReactNode } from 'react'

/**
 * Hand-drawn emblems, one per built-in team (plus a few generic ones for custom teams).
 * Each is drawn in a 100x100 box. `fg` is the emblem colour, `bg` the badge colour behind it.
 */
type Glyph = (fg: string, bg: string) => ReactNode

const star = (cx: number, cy: number, R: number, r = R * 0.4, n = 5, rot = -90) =>
  Array.from({ length: n * 2 }, (_, i) => {
    const a = ((rot + (i * 180) / n) * Math.PI) / 180
    const rad = i % 2 === 0 ? R : r
    return `${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`
  }).join(' ')

const rays = (cx: number, cy: number, r1: number, r2: number, n: number, w = 0.12) =>
  Array.from({ length: n }, (_, i) => {
    const a = (i * 2 * Math.PI) / n
    const p = (rad: number, da: number) => `${(cx + rad * Math.cos(a + da)).toFixed(1)},${(cy + rad * Math.sin(a + da)).toFixed(1)}`
    return `${p(r1, -w)} ${p(r2, 0)} ${p(r1, w)}`
  })

export const GLYPHS: Record<string, Glyph> = {
  // ---- built-in teams ----
  bleach: (fg, bg) => (
    <>
      <path d="M70 4 A46 46 0 1 0 70 96 A56 56 0 0 1 70 4 Z" fill={fg} />
      <g transform="rotate(35 50 50)" stroke={bg} strokeWidth="3" paintOrder="stroke">
        <path d="M50 2 L55 12 V66 H45 V12 Z" fill={fg} />
        <rect x="34" y="64" width="32" height="7" rx="3.5" fill={fg} />
        <rect x="46" y="71" width="8" height="24" rx="3" fill={fg} />
      </g>
    </>
  ),
  naruto: (fg) => (
    <>
      <path d="M50 12 C76 12 90 34 80 56 C71 76 42 78 33 60 C26 46 37 32 52 36 C62 39 63 52 53 52" fill="none" stroke={fg} strokeWidth="9" strokeLinecap="round" />
      <path d="M33 60 C26 74 20 84 12 92" fill="none" stroke={fg} strokeWidth="9" strokeLinecap="round" />
      <path d="M50 12 L38 2 M50 12 L62 2" stroke={fg} strokeWidth="7" strokeLinecap="round" />
    </>
  ),
  dragonball: (fg, bg) => (
    <>
      <circle cx="50" cy="50" r="44" fill={fg} />
      <ellipse cx="33" cy="27" rx="14" ry="7" fill="#fff" opacity=".35" transform="rotate(-35 33 27)" />
      {[[38, 38], [62, 38], [38, 62], [62, 62]].map(([x, y]) => (
        <polygon key={`${x}${y}`} points={star(x, y, 11)} fill={bg} />
      ))}
    </>
  ),
  onepiece: (fg, bg) => (
    <>
      <g stroke={fg} strokeWidth="9" strokeLinecap="round">
        <line x1="14" y1="66" x2="86" y2="98" />
        <line x1="86" y1="66" x2="14" y2="98" />
      </g>
      <circle cx="50" cy="62" r="23" fill={fg} stroke={bg} strokeWidth="3" />
      <rect x="39" y="76" width="22" height="14" rx="4" fill={fg} stroke={bg} strokeWidth="3" />
      <circle cx="41" cy="62" r="6" fill={bg} />
      <circle cx="59" cy="62" r="6" fill={bg} />
      <path d="M50 68 L46 76 H54 Z" fill={bg} />
      <path d="M26 38 C26 6 74 6 74 38 Z" fill={fg} stroke={bg} strokeWidth="3" />
      <ellipse cx="50" cy="38" rx="42" ry="9" fill={fg} stroke={bg} strokeWidth="3" />
      <rect x="27" y="29" width="46" height="6" fill={bg} opacity=".85" />
    </>
  ),
  aot: (fg, bg) => {
    const wing = 'M48 74 C54 54 70 40 98 10 C94 32 88 44 80 52 C88 48 94 44 100 38 C98 56 86 70 70 76 C76 74 80 72 84 70 C76 82 62 86 48 86 Z'
    return (
      <>
        <path d={wing} fill={fg} stroke={bg} strokeWidth="2.5" />
        <path d={wing} fill={fg} stroke={bg} strokeWidth="2.5" transform="translate(100 0) scale(-1 1)" />
        <path d="M50 30 L58 44 L50 70 L42 44 Z" fill={bg} stroke={fg} strokeWidth="3" />
      </>
    )
  },
  mha: (fg, bg) => (
    <>
      {[0, 20, 40].map((y) => (
        <path key={y} d={`M12 ${58 - y + 6} L50 ${22 - y + 6} L88 ${58 - y + 6} L88 ${72 - y + 6} L50 ${36 - y + 6} L12 ${72 - y + 6} Z`} fill={fg} stroke={bg} strokeWidth="2.5" />
      ))}
      <rect x="44" y="76" width="12" height="18" rx="2" fill={fg} />
    </>
  ),
  demonslayer: (fg, bg) => (
    <g transform="rotate(45 50 50)">
      {Array.from({ length: 16 }, (_, i) => {
        const x = i % 4
        const y = Math.floor(i / 4)
        return <rect key={i} x={14 + x * 18} y={14 + y * 18} width="18" height="18" fill={(x + y) % 2 === 0 ? fg : bg} stroke={fg} strokeWidth="1" />
      })}
    </g>
  ),
  jjk: (fg, bg) => (
    <>
      <path d="M4 50 Q50 6 96 50 Q50 94 4 50 Z" fill={fg} />
      <circle cx="50" cy="50" r="22" fill={bg} />
      <circle cx="50" cy="50" r="22" fill="none" stroke={fg} strokeWidth="3" strokeDasharray="4 4" />
      <ellipse cx="50" cy="50" rx="6" ry="17" fill={fg} />
      <path d="M50 4 V16 M50 84 V96" stroke={fg} strokeWidth="5" strokeLinecap="round" />
    </>
  ),
  fma: (fg) => (
    <g fill="none" stroke={fg} strokeWidth="4" strokeLinejoin="round">
      <circle cx="50" cy="50" r="44" />
      <circle cx="50" cy="50" r="37" strokeWidth="2" />
      <polygon points="50,14 81,68 19,68" />
      <polygon points="50,86 19,32 81,32" />
      <circle cx="50" cy="50" r="12" />
      <circle cx="50" cy="50" r="3" fill={fg} />
    </g>
  ),
  witcher: (fg, bg) => (
    <>
      <circle cx="50" cy="50" r="44" fill="none" stroke={fg} strokeWidth="5" />
      <path d="M50 82 L33 64 L22 30 L38 42 L50 38 L62 42 L78 30 L67 64 Z" fill={fg} stroke={bg} strokeWidth="2" strokeLinejoin="round" />
      <path d="M37 54 L45 58 M63 54 L55 58" stroke={bg} strokeWidth="5" strokeLinecap="round" />
      <path d="M45 70 H55 L50 77 Z" fill={bg} />
      <path d="M44 82 L50 76 L56 82" fill="none" stroke={bg} strokeWidth="2.5" />
    </>
  ),
  dragonage: (fg, bg) => (
    <>
      {rays(50, 50, 30, 48, 12, 0.14).map((pts, i) => <polygon key={i} points={pts} fill={fg} />)}
      <circle cx="50" cy="50" r="28" fill={bg} stroke={fg} strokeWidth="3" />
      <path d="M50 14 L56 24 V68 H44 V24 Z" fill={fg} />
      <rect x="34" y="64" width="32" height="7" rx="3.5" fill={fg} />
      <rect x="46" y="71" width="8" height="13" rx="3" fill={fg} />
    </>
  ),
  dota: (fg, bg) => (
    <>
      <path d="M50 8 A42 42 0 1 0 90 62" fill="none" stroke={fg} strokeWidth="14" strokeLinecap="butt" />
      <path d="M86 12 L56 52 L74 50 L24 94 L48 58 L30 60 Z" fill={fg} stroke={bg} strokeWidth="3" strokeLinejoin="round" />
    </>
  ),
  poe: (fg, bg) => (
    <>
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i * Math.PI) / 3 - Math.PI / 2
        const x = 50 + 38 * Math.cos(a)
        const y = 50 + 38 * Math.sin(a)
        return (
          <g key={i}>
            <line x1="50" y1="50" x2={x} y2={y} stroke={fg} strokeWidth="4" />
            <circle cx={x} cy={y} r="9" fill={bg} stroke={fg} strokeWidth="4" />
          </g>
        )
      })}
      <circle cx="50" cy="50" r="19" fill={bg} stroke={fg} strokeWidth="6" />
      <polygon points={star(50, 50, 10, 4, 4, -45)} fill={fg} />
    </>
  ),
  finalfantasy: (fg, bg) => (
    <>
      <polygon points="50,2 80,32 80,68 50,98 20,68 20,32" fill={fg} />
      <path d="M50 2 L50 98 M20 32 L80 32 M20 68 L80 68 M50 2 L20 32 M50 2 L80 32 M20 32 L50 50 L80 32 M20 68 L50 50 L80 68" fill="none" stroke={bg} strokeWidth="2.5" strokeLinejoin="round" opacity=".85" />
      <polygon points="50,16 62,32 50,44 38,32" fill="#fff" opacity=".35" />
    </>
  ),
  elderscrolls: (fg, bg) => (
    <>
      <path d="M26 72 C8 66 4 40 8 18 C14 34 20 40 30 44 Z" fill={fg} />
      <path d="M74 72 C92 66 96 40 92 18 C86 34 80 40 70 44 Z" fill={fg} />
      <path d="M22 68 C22 30 34 14 50 14 C66 14 78 30 78 68 Z" fill={fg} stroke={bg} strokeWidth="3" />
      <rect x="44" y="30" width="12" height="46" rx="3" fill={bg} />
      <path d="M26 56 H74" stroke={bg} strokeWidth="5" />
      <rect x="22" y="68" width="56" height="12" rx="4" fill={fg} stroke={bg} strokeWidth="3" />
    </>
  ),
  assassinscreed: (fg, bg) => (
    <>
      <path d="M50 4 L88 94 H69 L50 50 L31 94 H12 Z" fill={fg} />
      <path d="M50 20 L60 44 L50 38 L40 44 Z" fill={bg} />
      <path d="M32 82 L50 62 L68 82" fill="none" stroke={bg} strokeWidth="5" strokeLinejoin="round" />
      <circle cx="50" cy="90" r="6" fill={fg} />
    </>
  ),
  jojo: (fg, bg) => (
    <>
      <path d="M50 4 L66 40 L96 44 L72 66 L80 96 L50 78 L20 96 L28 66 L4 44 L34 40 Z" fill={fg} stroke={bg} strokeWidth="3" strokeLinejoin="round" />
      <path d="M50 28 L56 46 L74 48 L60 58 L64 76 L50 66 L36 76 L40 58 L26 48 L44 46 Z" fill={bg} />
    </>
  ),
  yugioh: (fg, bg) => (
    <>
      <path d="M4 50 C22 20 78 20 96 50 C78 80 22 80 4 50 Z" fill={fg} />
      <circle cx="50" cy="50" r="16" fill={bg} />
      <circle cx="50" cy="50" r="7" fill={fg} />
      <path d="M50 18 V4 M50 82 V96 M20 36 L10 28 M80 36 L90 28" stroke={fg} strokeWidth="6" strokeLinecap="round" />
    </>
  ),
  sds: (fg, bg) => (
    <>
      <path d="M26 30 C18 18 30 6 44 12 L50 20 L56 12 C70 6 82 18 74 30 C90 40 88 66 72 74 C64 88 36 88 28 74 C12 66 10 40 26 30 Z" fill={fg} />
      <circle cx="38" cy="48" r="5" fill={bg} /><circle cx="62" cy="48" r="5" fill={bg} />
      <ellipse cx="50" cy="66" rx="12" ry="9" fill={bg} /><circle cx="45" cy="66" r="2.5" fill={fg} /><circle cx="55" cy="66" r="2.5" fill={fg} />
    </>
  ),
  inuyasha: (fg, bg) => (
    <>
      <path d="M50 2 L88 40 L50 98 L12 40 Z" fill={fg} />
      <path d="M50 14 L74 40 L50 82 L26 40 Z" fill={bg} opacity="0.85" />
      <path d="M50 22 L62 40 L50 64 L38 40 Z" fill={fg} />
    </>
  ),
  zelda: (fg) => (
    <g transform="translate(9 8) scale(.84)" fill={fg}>
      <polygon points="50,6 78,54 22,54" />
      <polygon points="22,54 50,102 -6,102" />
      <polygon points="78,54 106,102 50,102" />
    </g>
  ),
  masseffect: (fg, bg) => (
    <>
      <path d="M-4 70 L86 22 L104 44 L14 92 Z" fill={fg} transform="translate(0 -4)" />
      <text x="52" y="58" textAnchor="middle" fontFamily="'Bebas Neue', Impact, sans-serif" fontSize="52" fill={bg} stroke={fg} strokeWidth="2" paintOrder="stroke">N7</text>
    </>
  ),
  overwatch: (fg, bg) => (
    <>
      <circle cx="50" cy="52" r="34" fill="none" stroke={fg} strokeWidth="15" />
      <path d="M38 10 L50 2 L62 10 L62 24 L38 24 Z" fill={fg} />
      <path d="M50 98 L32 78 L68 78 Z" fill={fg} />
      <circle cx="50" cy="52" r="8" fill={bg} stroke={fg} strokeWidth="4" />
    </>
  ),
  halo: (fg, bg) => (
    <>
      <path d="M50 6 C74 6 86 24 84 50 C83 66 76 80 66 90 H34 C24 80 17 66 16 50 C14 24 26 6 50 6 Z" fill={fg} />
      <path d="M24 42 C34 36 42 34 50 34 C58 34 66 36 76 42 C74 56 66 62 50 62 C34 62 26 56 24 42 Z" fill={bg} stroke={fg} strokeWidth="2" />
      <path d="M30 44 C40 40 60 40 70 44" stroke="#fff" strokeWidth="3" opacity=".35" fill="none" />
      <path d="M42 66 H58 V84 H42 Z" fill={bg} opacity=".55" />
    </>
  ),

  // ---- generic emblems for custom teams ----
  star: (fg) => <polygon points={star(50, 52, 44, 18)} fill={fg} />,
  bolt: (fg) => <polygon points="58,4 20,56 44,56 38,96 80,40 54,40" fill={fg} />,
  crown: (fg, bg) => (
    <>
      <path d="M10 76 L16 26 L34 50 L50 18 L66 50 L84 26 L90 76 Z" fill={fg} />
      <rect x="10" y="78" width="80" height="12" rx="4" fill={fg} />
      <circle cx="50" cy="60" r="6" fill={bg} />
    </>
  ),
  skull: (fg, bg) => (
    <>
      <path d="M50 6 C76 6 90 24 88 48 C87 58 82 64 76 68 V86 H24 V68 C18 64 13 58 12 48 C10 24 24 6 50 6 Z" fill={fg} />
      <circle cx="35" cy="48" r="11" fill={bg} />
      <circle cx="65" cy="48" r="11" fill={bg} />
      <path d="M50 58 L44 72 H56 Z" fill={bg} />
      <path d="M38 86 V74 M50 86 V76 M62 86 V74" stroke={bg} strokeWidth="3" />
    </>
  ),
  flame: (fg, bg) => (
    <>
      <path d="M50 4 C58 24 82 38 78 66 C75 86 62 96 50 96 C36 96 22 86 22 66 C22 50 34 44 38 28 C46 36 44 22 50 4 Z" fill={fg} />
      <path d="M50 52 C56 64 66 68 62 80 C60 88 54 92 50 92 C44 92 38 88 38 80 C38 70 46 66 50 52 Z" fill={bg} opacity=".8" />
    </>
  ),
  sword: (fg, bg) => (
    <g transform="rotate(45 50 50)" stroke={bg} strokeWidth="2" paintOrder="stroke">
      <path d="M50 -4 L58 10 V64 H42 V10 Z" fill={fg} />
      <rect x="26" y="62" width="48" height="9" rx="4.5" fill={fg} />
      <rect x="45" y="70" width="10" height="22" rx="3" fill={fg} />
      <circle cx="50" cy="96" r="6" fill={fg} />
    </g>
  ),
}

export const GENERIC_EMBLEMS = ['star', 'bolt', 'crown', 'skull', 'flame', 'sword'] as const

type Frame = 'circle' | 'shield' | 'hex' | 'diamond' | 'rounded'
export const FRAMES: Record<string, Frame> = {
  bleach: 'circle', naruto: 'shield', dragonball: 'circle', onepiece: 'rounded', aot: 'shield',
  mha: 'hex', demonslayer: 'rounded', jjk: 'circle', fma: 'circle', witcher: 'circle',
  dragonage: 'shield', dota: 'hex', poe: 'circle', finalfantasy: 'diamond', elderscrolls: 'shield',
  jojo: 'hex', yugioh: 'diamond', sds: 'shield', inuyasha: 'circle',
  assassinscreed: 'diamond', zelda: 'hex', masseffect: 'rounded', overwatch: 'circle', halo: 'hex',
}

const FRAME_SHAPES: Record<Frame, { path: ReactNode; inner: string; scale: number }> = {
  circle: { path: <circle cx="50" cy="50" r="46" />, inner: 'translate(18 18) scale(.64)', scale: 0.64 },
  shield: { path: <path d="M50 3 L91 15 V52 C91 76 73 90 50 98 C27 90 9 76 9 52 V15 Z" />, inner: 'translate(20 14) scale(.6)', scale: 0.6 },
  hex: { path: <polygon points="50,3 91,26 91,74 50,97 9,74 9,26" />, inner: 'translate(19 19) scale(.62)', scale: 0.62 },
  diamond: { path: <polygon points="50,2 98,50 50,98 2,50" />, inner: 'translate(27 27) scale(.46)', scale: 0.46 },
  rounded: { path: <rect x="5" y="5" width="90" height="90" rx="22" />, inner: 'translate(18 18) scale(.64)', scale: 0.64 },
}

export function frameFor(id: string): Frame {
  return FRAMES[id] ?? 'shield'
}
export const frameShape = (f: Frame) => FRAME_SHAPES[f]
