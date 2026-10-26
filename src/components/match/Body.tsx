import type { ReactNode } from 'react'
import { mirrorPose, solve, type P, type Pose } from './bodyPose'
import type { Aura, Head, Weapon } from '../../data/weapons'

/** What a figure wears. */
export interface Kit {
  shirt: string
  trim: string
  trousers: string
  /** Leg pads and batting gloves, or the keeper's gloves. */
  pads: boolean
  gloves: string | null
  /** An umpire's hat, a helmet is not drawn (the head is the player's picture). */
  boots: string
  /** A weapon carried instead of the bat, and a glow round the body (see data/weapons.ts). */
  weapon?: Weapon | null
  aura?: Aura | null
}

export interface Rig {
  /** Puts the body in this pose (a left-hander is the same pose turned round). Does nothing when it has not changed. */
  apply: (pose: Pose, left?: boolean) => void
  /** Where the hands are together (in the 60 x 120 box), for a ball being held. */
  hands: () => P
  /** The middle of the bat's blade, where the ball meets it (null with no bat). */
  bat: () => P | null
  /** Makes the aura flare: 0 is its usual glow, 1 the full surge of a six. */
  surge: (k: number) => void
}

const SKIN = '#f0c8a0'
/** A darker (or lighter) version of a #rrggbb colour, so a sleeve stands out against the shirt. */
export function shade(hex: string, k: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!m) return hex
  const n = parseInt(m[1], 16)
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)))
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => c(v).toString(16).padStart(2, '0')).join('')}`
}
const f1 = (n: number) => n.toFixed(1)
const line = (...pts: (P | null)[]) => pts.map((q, i) => (q ? `${i ? 'L' : 'M'}${f1(q.x)} ${f1(q.y)}` : '')).join('')

/** The head of a weapon, drawn round the tip of the bat with the shaft running along +y (the rig turns it to the way the bat points). */
function headShape(kind: Head, color: string, glow: string) {
  const edge = '#00000066'
  switch (kind) {
    case 'axe': return <path d="M0 -10 Q 15 -13 14 3 Q 8 9 0 5 Z" fill={color} stroke={edge} strokeWidth="0.8" />
    case 'hammer': return <rect x="-9" y="-6" width="18" height="12" rx="2.5" fill={color} stroke={edge} strokeWidth="0.8" />
    case 'spear': return <path d="M0 14 L-4.5 0 L4.5 0 Z" fill={color} stroke={edge} strokeWidth="0.8" />
    case 'scythe': return <path d="M0 -3 Q 18 -4 15 14 Q 9 3 0 3 Z" fill={color} stroke={edge} strokeWidth="0.8" />
    case 'crescent': return <path d="M-11 6 Q 0 -13 11 6 Q 0 -4 -11 6 Z" fill={color} stroke={edge} strokeWidth="0.8" />
    case 'orb': return <><circle r="12" fill={glow} opacity="0.35" /><circle r="7.5" fill={color} stroke="#ffffff" strokeWidth="1" /><circle r="3" cx="-1.5" cy="-1.5" fill="#ffffff" opacity="0.85" /></>
    case 'flame': return <><path d="M0 12 Q -9 0 -4 -9 Q -1 -3 3 -7 Q 9 0 0 12 Z" fill={glow} opacity="0.8" /><path d="M0 9 Q -4 1 -1 -4 Q 2 0 3 -2 Q 5 3 0 9 Z" fill={color} /></>
    case 'crystal': return <path d="M0 11 L-6 0 L0 -10 L6 0 Z" fill={color} stroke="#ffffff" strokeWidth="1" />
    case 'bolt': return <path d="M2 -12 L-5 1 L0 1 L-3 13 L7 -2 L1 -2 Z" fill={color} stroke={glow} strokeWidth="0.8" />
    case 'gun': return <><rect x="-2.4" y="-1" width="4.8" height="11" rx="1" fill={color} /><circle cy="12" r="2.2" fill="#fde047" opacity="0.8" /></>
    default: return null
  }
}

/**
 * A body drawn with a few strokes: legs and trunk behind the head, arms and bat in front of it (so raised hands can cover the face).
 * The head (the player's picture) is the child, and the rig moves it with the body.
 */
export function Body({ kit, rigRef, children }: { kit: Kit; rigRef: (r: Rig | null) => void; children: ReactNode }) {
  return (
    <div
      className="absolute inset-0"
      ref={(el) => {
        if (!el) { rigRef(null); return }
        rigRef(makeRig(el, kit.weapon?.length))
      }}
    >
      {kit.aura && (
        <div data-aura className="pointer-events-none absolute" style={{ left: -22, top: -12, width: 104, height: 146, animation: 'aura-flicker 0.7s ease-in-out infinite', transformOrigin: '50% 80%', background: `radial-gradient(ellipse at 50% 58%, ${kit.aura.c2}cc 0%, ${kit.aura.c1}aa 32%, ${kit.aura.c1}44 55%, transparent 72%)` }} />
      )}
      <svg viewBox="0 0 60 120" width="60" height="120" className="absolute left-0 top-0 overflow-visible" aria-hidden>
        <path data-p="legL" fill="none" stroke={kit.trousers} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        <path data-p="legR" fill="none" stroke={kit.trousers} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        {kit.pads && <path data-p="shinL" fill="none" stroke="#f8fafc" strokeWidth="9.5" strokeLinecap="round" />}
        {kit.pads && <path data-p="shinR" fill="none" stroke="#f8fafc" strokeWidth="9.5" strokeLinecap="round" />}
        <ellipse data-e="bootL" rx="5.5" ry="3" fill={kit.boots} />
        <ellipse data-e="bootR" rx="5.5" ry="3" fill={kit.boots} />
        <path data-p="torso" fill={kit.shirt} stroke={kit.shirt} strokeWidth="7" strokeLinejoin="round" />
        <path data-p="belt" fill="none" stroke={kit.trim} strokeWidth="2.2" strokeLinecap="round" />
      </svg>
      <div data-head className="absolute left-0 top-0 will-change-transform" style={{ width: 60, height: 120, pointerEvents: 'none', transformOrigin: '30px 28px' }}>{children}</div>
      <svg viewBox="0 0 60 120" width="60" height="120" className="absolute left-0 top-0 overflow-visible" aria-hidden>
        {kit.weapon?.glow && <path data-p="batGlow" fill="none" stroke={kit.weapon.glow} strokeWidth={(kit.weapon.width ?? 8) + 7} strokeLinecap="round" opacity="0.45" />}
        {kit.weapon?.glow && <path data-p="batGlow2" fill="none" stroke="#ffffff" strokeWidth={Math.max(2, (kit.weapon.width ?? 8) * 0.45)} strokeLinecap="round" opacity="0.7" />}
        <path data-p="batH" fill="none" stroke={kit.weapon?.handle ?? '#7c2d12'} strokeWidth="3" strokeLinecap="round" />
        <path data-p="batB" fill="none" stroke={kit.weapon?.blade ?? '#e9c98a'} strokeWidth={kit.weapon?.width ?? 8.5} strokeLinecap={kit.weapon?.kind === 'sword' ? 'butt' : 'round'} />
        <path data-p="batE" fill="none" stroke={kit.weapon?.edge ?? '#a16207'} strokeWidth={kit.weapon ? 1.1 : 1.2} strokeLinecap="round" opacity={kit.weapon ? 0.95 : 0.55} />
        {kit.weapon?.head && <g data-g="head">{headShape(kit.weapon.head.kind, kit.weapon.head.color, kit.weapon.glow ?? kit.weapon.head.color)}</g>}
        {kit.weapon && kit.weapon.kind !== 'bat' && <path data-p="batG" fill="none" stroke={kit.weapon.guard ?? kit.weapon.edge} strokeWidth={kit.weapon.kind === 'sword' ? 2.6 : 3.4} strokeLinecap="round" />}
        <path data-p="upL" fill="none" stroke={shade(kit.shirt, -0.28)} strokeWidth="7.5" strokeLinecap="round" />
        <path data-p="foreL" fill="none" stroke={SKIN} strokeWidth="5.5" strokeLinecap="round" />
        <path data-p="upR" fill="none" stroke={shade(kit.shirt, -0.28)} strokeWidth="7.5" strokeLinecap="round" />
        <path data-p="foreR" fill="none" stroke={SKIN} strokeWidth="5.5" strokeLinecap="round" />
        <circle data-e="gloveL" r={kit.gloves ? 4.6 : 2.8} fill={kit.gloves ?? SKIN} stroke={kit.gloves ? '#00000055' : 'none'} strokeWidth="0.8" />
        <circle data-e="gloveR" r={kit.gloves ? 4.6 : 2.8} fill={kit.gloves ?? SKIN} stroke={kit.gloves ? '#00000055' : 'none'} strokeWidth="0.8" />
        <circle data-e="ball" r="2.6" fill="#dc2626" stroke="#fecaca" strokeWidth="0.6" />
      </svg>
    </div>
  )
}

function makeRig(root: HTMLElement, batLen?: number): Rig {
  const p: Record<string, SVGPathElement> = {}
  const e: Record<string, SVGElement> = {}
  root.querySelectorAll<SVGPathElement>('[data-p]').forEach((n) => { p[n.dataset.p!] = n })
  root.querySelectorAll<SVGElement>('[data-e]').forEach((n) => { e[n.dataset.e!] = n })
  const head = root.querySelector<HTMLElement>('[data-head]')
  const headEl = root.querySelector<SVGGElement>('[data-g="head"]')
  let last = ''
  let hand: P = { x: 30, y: 70 }
  let blade: P | null = null
  const aura = root.querySelector<HTMLElement>('[data-aura]')
  let surged = -1
  return {
    hands: () => hand,
    bat: () => blade,
    surge(k) {
      if (!aura) return
      const q = Math.round(k * 20) / 20
      if (q === surged) return
      surged = q
      aura.style.animation = q > 0 ? 'none' : 'aura-flicker 0.7s ease-in-out infinite'
      aura.style.transform = q > 0 ? `scale(${(1 + q * 1.1).toFixed(2)}, ${(1 + q * 1.5).toFixed(2)})` : ''
      aura.style.opacity = q > 0 ? String(Math.min(1, 0.85 + q * 0.3)) : ''
      aura.style.filter = q > 0 ? `brightness(${(1 + q * 0.7).toFixed(2)}) saturate(${(1 + q * 0.5).toFixed(2)})` : ''
    },
    apply(pose, left = false) {
      const q = left ? mirrorPose(pose) : pose
      const key = [q.hip.x, q.hip.y, q.lean, q.head.dx, q.head.dy, q.head.tilt, q.handL.x, q.handL.y, q.handR.x, q.handR.y, q.footL.x, q.footL.y, q.footR.x, q.footR.y, q.bat, q.two, q.ball].map((v) => (typeof v === 'number' ? Math.round(v * 4) : String(v))).join()
      if (key === last) return
      last = key
      const s = solve(q, batLen)
      hand = { x: (s.handL.x + s.handR.x) / 2, y: (s.handL.y + s.handR.y) / 2 }
      blade = s.batBlade && s.batTip ? { x: s.batBlade.x + (s.batTip.x - s.batBlade.x) * 0.62, y: s.batBlade.y + (s.batTip.y - s.batBlade.y) * 0.62 } : null
      const set = (name: string, d: string) => { if (p[name]) p[name].setAttribute('d', d) }
      set('legL', line(s.hipL, s.kneeL, s.footL))
      set('legR', line(s.hipR, s.kneeR, s.footR))
      set('shinL', line(s.kneeL, s.footL))
      set('shinR', line(s.kneeR, s.footR))
      set('torso', `${line(s.shoulderL, s.shoulderR, { x: q.hip.x + 7, y: q.hip.y + 1 }, { x: q.hip.x - 7, y: q.hip.y + 1 })}Z`)
      set('belt', line({ x: q.hip.x - 8, y: q.hip.y - 1 }, { x: q.hip.x + 8, y: q.hip.y - 1 }))
      set('upL', line(s.shoulderL, s.elbowL))
      set('foreL', line(s.elbowL, s.handL))
      set('upR', line(s.shoulderR, s.elbowR))
      set('foreR', line(s.elbowR, s.handR))
      set('batGlow', s.batBlade && s.batTip ? line(s.batBlade, s.batTip) : '')
      set('batGlow2', s.batBlade && s.batTip ? line(s.batBlade, s.batTip) : '')
      set('batH', s.batEnd && s.batBlade ? line(s.batEnd, s.batBlade) : '')
      set('batB', s.batBlade && s.batTip ? line(s.batBlade, s.batTip) : '')
      set('batE', s.batBlade && s.batTip ? line(s.batBlade, s.batTip) : '')
      // the guard of a sword, or the gold cap of a staff, across the blade where it starts (a short stroke at right angles to it)
      if (s.batBlade && s.batTip) {
        const dx = s.batTip.x - s.batBlade.x, dy = s.batTip.y - s.batBlade.y, l = Math.hypot(dx, dy) || 1
        const nx = -dy / l, ny = dx / l
        set('batG', line({ x: s.batBlade.x - nx * 4.4, y: s.batBlade.y - ny * 4.4 }, { x: s.batBlade.x + nx * 4.4, y: s.batBlade.y + ny * 4.4 }))
      } else set('batG', '')
      // the head of a weapon (an axe, a hammer, a glowing orb...) sits on the tip, turned the way the bat points
      if (headEl) {
        if (s.batBlade && s.batTip) {
          const dx = s.batTip.x - s.batBlade.x, dy = s.batTip.y - s.batBlade.y
          headEl.setAttribute('transform', `translate(${f1(s.batTip.x)} ${f1(s.batTip.y)}) rotate(${f1((Math.atan2(-dx, dy) * 180) / Math.PI)})`)
          headEl.removeAttribute('display')
        } else headEl.setAttribute('display', 'none')
      }
      const at = (name: string, pt: P | null, dx = 0, dy = 0) => {
        const n = e[name]
        if (!n) return
        if (!pt) { n.setAttribute('display', 'none'); return }
        n.removeAttribute('display')
        n.setAttribute('cx', f1(pt.x + dx)); n.setAttribute('cy', f1(pt.y + dy))
      }
      at('gloveL', s.handL)
      at('gloveR', s.handR)
      at('ball', q.ball ? s.handR : null, 0, -1)
      at('bootL', s.footL, 0, 1)
      at('bootR', s.footR, 0, 1)
      if (head) head.style.transform = `translate(${f1(s.head.x - 30)}px,${f1(s.head.y - 28)}px) rotate(${f1(q.head.tilt)}deg)`
    },
  }
}
