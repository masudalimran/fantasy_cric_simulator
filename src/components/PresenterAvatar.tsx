import type { Presenter } from '../data/presenters'

/** A presenter's portrait, drawn in code: a round picture with her hair, face, glasses and the colour of her outfit. */
export function PresenterAvatar({ presenter: p, size = 64 }: { presenter: Presenter; size?: number }) {
  const id = `pa-${p.id}`
  const dark = '#2b1b17'
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="block rounded-full" role="img" aria-label={p.name}>
      <defs>
        <radialGradient id={id} cx="50%" cy="35%" r="75%"><stop offset="0" stopColor={p.accent} stopOpacity="0.55" /><stop offset="1" stopColor="#0b1020" /></radialGradient>
        <clipPath id={`${id}-c`}><circle cx="50" cy="50" r="50" /></clipPath>
      </defs>
      <g clipPath={`url(#${id}-c)`}>
        <rect width="100" height="100" fill={`url(#${id})`} />
        {/* the hair behind the head */}
        {(p.hairStyle === 'long' || p.hairStyle === 'wavy') && <path d={p.hairStyle === 'long' ? 'M26 40 Q24 20 50 16 Q76 20 74 40 L78 92 L22 92 Z' : 'M25 40 Q22 18 50 15 Q78 18 75 40 Q82 60 74 76 Q78 88 70 94 L30 94 Q22 88 26 76 Q18 60 25 40 Z'} fill={p.hair} />}
        {p.hairStyle === 'bob' && <path d="M26 38 Q26 16 50 15 Q74 16 74 38 L75 64 Q62 70 50 66 Q38 70 25 64 Z" fill={p.hair} />}
        {p.hairStyle === 'ponytail' && <path d="M68 28 Q92 34 86 62 Q84 76 74 82 Q80 62 66 44 Z" fill={p.hair} />}
        {p.hairStyle === 'bun' && <circle cx="50" cy="12" r="10" fill={p.hair} />}
        {p.hairStyle === 'curly' && [[28, 30], [36, 20], [50, 16], [64, 20], [72, 30], [24, 44], [76, 44], [30, 56], [70, 56]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="11" fill={p.hair} />)}
        {/* the shoulders and neck */}
        <path d="M6 100 Q10 74 50 72 Q90 74 94 100 Z" fill={p.outfit} />
        <path d="M40 74 Q50 86 60 74 Z" fill={p.skin} />
        <rect x="43" y="58" width="14" height="18" rx="5" fill={p.skin} />
        <rect x="43" y="66" width="14" height="6" fill="#000" opacity="0.1" />
        {/* the face */}
        <ellipse cx="50" cy="44" rx="19" ry="22" fill={p.skin} />
        <circle cx="38" cy="52" r="4" fill="#e11d48" opacity="0.14" /><circle cx="62" cy="52" r="4" fill="#e11d48" opacity="0.14" />
        <circle cx="41.5" cy="45" r="2.3" fill={dark} /><circle cx="58.5" cy="45" r="2.3" fill={dark} />
        <circle cx="42.2" cy="44.2" r="0.8" fill="#fff" /><circle cx="59.2" cy="44.2" r="0.8" fill="#fff" />
        <path d="M36.5 39.5 Q41.5 37 46 39.5 M54 39.5 Q58.5 37 63.5 39.5" stroke={p.hair} strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <path d="M44 56 Q50 61 56 56" stroke="#9f1239" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        {p.glasses && <g fill="none" stroke="#111827" strokeWidth="1.6"><rect x="32.5" y="39" width="17" height="12" rx="5" /><rect x="50.5" y="39" width="17" height="12" rx="5" /><path d="M49.5 44 L50.5 44" /></g>}
        {/* the hair in front */}
        {p.hairStyle === 'short' || p.hairStyle === 'curly' ? <path d="M30 40 Q30 20 50 20 Q70 20 70 40 Q62 30 50 31 Q38 30 30 40 Z" fill={p.hair} /> : null}
        {p.hairStyle === 'bob' && <path d="M29 46 L29 30 Q50 12 71 30 L71 46 Q62 33 50 34 Q38 33 29 46 Z" fill={p.hair} />}
        {(p.hairStyle === 'long' || p.hairStyle === 'wavy' || p.hairStyle === 'ponytail' || p.hairStyle === 'bun') && <path d="M30 42 Q30 19 50 19 Q70 19 70 42 Q64 30 54 29 Q42 33 30 42 Z" fill={p.hair} />}
      </g>
      <circle cx="50" cy="50" r="48.5" fill="none" stroke={p.accent} strokeWidth="3" />
    </svg>
  )
}
