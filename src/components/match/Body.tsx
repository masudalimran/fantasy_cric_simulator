import type { ReactNode } from 'react'
import { mirrorPose, solve, type P, type Pose } from './bodyPose'

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
}

export interface Rig {
  /** Puts the body in this pose (a left-hander is the same pose turned round). Does nothing when it has not changed. */
  apply: (pose: Pose, left?: boolean) => void
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
        rigRef(makeRig(el))
      }}
    >
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
        <path data-p="batH" fill="none" stroke="#7c2d12" strokeWidth="3" strokeLinecap="round" />
        <path data-p="batB" fill="none" stroke="#e9c98a" strokeWidth="8.5" strokeLinecap="round" />
        <path data-p="batE" fill="none" stroke="#a16207" strokeWidth="1.2" strokeLinecap="round" opacity="0.55" />
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

function makeRig(root: HTMLElement): Rig {
  const p: Record<string, SVGPathElement> = {}
  const e: Record<string, SVGElement> = {}
  root.querySelectorAll<SVGPathElement>('[data-p]').forEach((n) => { p[n.dataset.p!] = n })
  root.querySelectorAll<SVGElement>('[data-e]').forEach((n) => { e[n.dataset.e!] = n })
  const head = root.querySelector<HTMLElement>('[data-head]')
  let last = ''
  return {
    apply(pose, left = false) {
      const q = left ? mirrorPose(pose) : pose
      const key = [q.hip.x, q.hip.y, q.lean, q.head.dx, q.head.dy, q.head.tilt, q.handL.x, q.handL.y, q.handR.x, q.handR.y, q.footL.x, q.footL.y, q.footR.x, q.footR.y, q.bat, q.two, q.ball].map((v) => (typeof v === 'number' ? Math.round(v * 4) : String(v))).join()
      if (key === last) return
      last = key
      const s = solve(q)
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
      set('batH', s.batEnd && s.batBlade ? line(s.batEnd, s.batBlade) : '')
      set('batB', s.batBlade && s.batTip ? line(s.batBlade, s.batTip) : '')
      set('batE', s.batBlade && s.batTip ? line(s.batBlade, s.batTip) : '')
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
