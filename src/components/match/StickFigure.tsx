import { motion } from 'framer-motion'
import type { Player, Team } from '../../types'
import { PlayerAvatar, accentOf } from '../ui'

/**
 * A stick man with a player's portrait for a head. Drawn on a 200 x 260 sheet; the arms and legs are
 * jointed (shoulder/elbow, hip/knee) so a few angles are enough to make him jump for joy or slump.
 * Angle 0 points a limb straight down; a negative angle swings the right-hand limbs up and out.
 */
export type Pose = 'cheer' | 'victory' | 'sad' | 'idle'

const SHOULDER = { x: 100, y: 98 }
const HIP = { x: 100, y: 162 }
const UPPER = 38
const LOWER = 38
const THIGH = 44
const SHIN = 44
const STROKE = 9

interface Props {
  player: Player
  team: Team
  pose: Pose
  /** Width in px; the figure is 1.3 times as tall. */
  width?: number
  /** Seconds to wait before starting, so a row of them doesn't move in lockstep. */
  delay?: number
  /** Hold a bat. */
  bat?: boolean
}

const loop = (duration: number, delay = 0) => ({ duration, repeat: Infinity, ease: 'easeInOut' as const, delay })

/** One segment, drawn with a dark outline underneath so it reads against any background. */
function Seg({ x1, y1, x2, y2, color, width = STROKE }: { x1: number; y1: number; x2: number; y2: number; color: string; width?: number }) {
  return (
    <>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#0b0d14" strokeWidth={width + 4.5} strokeLinecap="round" />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={width} strokeLinecap="round" />
    </>
  )
}

function Limb({ at, len1, len2, up, down, d = 0, color, extra, hand = false }: {
  at: { x: number; y: number }; len1: number; len2: number
  up: { rotate: number[]; transition: object }; down: { rotate: number[]; transition: object }
  d?: number; color: string; extra?: React.ReactNode; hand?: boolean
}) {
  const knee = { x: at.x, y: at.y + len1 }
  return (
    <motion.g style={{ originX: `${at.x}px`, originY: `${at.y}px` }} animate={up} initial={{ rotate: up.rotate[0] }} transition={{ delay: d }}>
      <Seg x1={at.x} y1={at.y} x2={knee.x} y2={knee.y} color={color} />
      <motion.g style={{ originX: `${knee.x}px`, originY: `${knee.y}px` }} animate={down} initial={{ rotate: down.rotate[0] }}>
        <Seg x1={knee.x} y1={knee.y} x2={knee.x} y2={knee.y + len2} color={color} />
        {hand && <circle cx={knee.x} cy={knee.y + len2 + 3} r="6.5" fill="#f1f5f9" stroke="#0b0d14" strokeWidth="2.2" />}
        {extra}
      </motion.g>
    </motion.g>
  )
}

export function StickFigure({ player, team, pose, width = 200, delay = 0, bat = false }: Props) {
  const shirt = accentOf(team)
  const color = '#f1f5f9' // limbs
  const w = width
  const head = w * 0.4
  const sad = pose === 'sad'
  const joy = pose === 'cheer' || pose === 'victory'
  const both = pose === 'victory'
  const period = pose === 'victory' ? 0.5 : 0.62

  // arms
  const rUpper = joy ? { rotate: [-158, -178, -158], transition: loop(period / 1, delay) } : sad ? { rotate: [-20, -15, -20], transition: loop(2.4, delay) } : { rotate: [-14, -10, -14], transition: loop(3, delay) }
  const rLower = joy ? { rotate: [12, -14, 12], transition: loop(period, delay) } : sad ? { rotate: [-4, 6, -4], transition: loop(2.4, delay) } : { rotate: [4, -4, 4], transition: loop(3, delay) }
  const lUpper = both ? { rotate: [158, 178, 158], transition: loop(period, delay + 0.1) } : joy ? { rotate: [120, 160, 120], transition: loop(period, delay + 0.15) } : sad ? { rotate: [20, 15, 20], transition: loop(2.4, delay) } : { rotate: [14, 10, 14], transition: loop(3, delay) }
  const lLower = joy ? { rotate: [-14, 10, -14], transition: loop(period, delay + 0.15) } : { rotate: [4, -4, 4], transition: loop(3, delay) }
  // legs: a jump with tucked knees, or a slow shuffle
  const rThigh = joy ? { rotate: [-6, -28, -6], transition: loop(period, delay) } : sad ? { rotate: [-22, 14, -22], transition: loop(1.5, delay) } : { rotate: [-8, -8, -8], transition: loop(3, delay) }
  const lThigh = joy ? { rotate: [6, 28, 6], transition: loop(period, delay) } : sad ? { rotate: [22, -14, 22], transition: loop(1.5, delay) } : { rotate: [8, 8, 8], transition: loop(3, delay) }
  const shin = (s: number) => (joy ? { rotate: [0, 34 * s, 0], transition: loop(period, delay) } : sad ? { rotate: [0, 10 * s, 0], transition: loop(1.5, delay) } : { rotate: [0, 0, 0], transition: loop(3, delay) })

  const batShape = (
    <motion.g
      initial={{ y: 0, rotate: 0, opacity: 1 }}
      animate={sad ? { y: [0, 0, 150], rotate: [0, 0, 78], x: [0, 0, 10] } : { y: 0, rotate: 0 }}
      transition={sad ? { duration: 1.6, times: [0, 0.45, 1], delay: delay + 0.3 } : undefined}
      style={{ originX: '100px', originY: `${SHOULDER.y + UPPER + LOWER}px` }}
    >
      <rect x="95" y={SHOULDER.y + UPPER + LOWER - 6} width="10" height="14" rx="3" fill="#78350f" />
      <rect x="91" y={SHOULDER.y + UPPER + LOWER + 7} width="18" height="46" rx="4" fill="#e9c98a" stroke="#a16207" strokeWidth="1.5" />
    </motion.g>
  )

  return (
    <motion.div
      className="relative"
      style={{ width: w, height: w * 1.3 }}
      animate={joy ? { y: [0, -w * 0.16, 0] } : sad ? { x: [0, -w * 0.28], rotate: 0 } : { y: 0 }}
      transition={joy ? loop(period, delay) : sad ? { duration: 3.2, ease: 'easeInOut', delay } : undefined}
    >
      <svg viewBox="0 0 200 260" className="absolute inset-0 h-full w-full overflow-visible" style={{ filter: 'drop-shadow(0 3px 4px rgba(0,0,0,.55))' }}>
        {/* ground shadow */}
        <ellipse cx="100" cy="252" rx="46" ry="6" fill="#000" opacity="0.35" />
        {/* the upper body leans forward when sad */}
        <motion.g style={{ originX: `${HIP.x}px`, originY: `${HIP.y}px` }} animate={sad ? { rotate: 9 } : { rotate: 0 }} transition={{ duration: 1.2, delay }}>
          <Seg x1={SHOULDER.x} y1={SHOULDER.y - 8} x2={HIP.x} y2={HIP.y} color={shirt} width={17} />
          <Limb at={SHOULDER} len1={UPPER} len2={LOWER} up={lUpper} down={lLower} color={color} hand />
          <Limb at={SHOULDER} len1={UPPER} len2={LOWER} up={rUpper} down={rLower} color={color} hand extra={bat ? batShape : null} />
        </motion.g>
        <Limb at={HIP} len1={THIGH} len2={SHIN} up={lThigh} down={shin(-1)} color={color} extra={<Seg x1={100} y1={HIP.y + THIGH + SHIN} x2={87} y2={HIP.y + THIGH + SHIN} color={color} />} />
        <Limb at={HIP} len1={THIGH} len2={SHIN} up={rThigh} down={shin(1)} color={color} extra={<Seg x1={100} y1={HIP.y + THIGH + SHIN} x2={113} y2={HIP.y + THIGH + SHIN} color={color} />} />
        {/* sweat drops when it all goes wrong */}
        {sad && [0, 1, 2].map((i) => (
          <motion.ellipse key={i} cx={74 + i * 26} cy={26} rx="3" ry="5" fill="#7dd3fc" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0], y: [0, 36] }} transition={{ duration: 1.1, repeat: Infinity, delay: delay + i * 0.35 }} />
        ))}
      </svg>
      {/* the head: the player's portrait, which nods or hangs depending on the mood */}
      <motion.div
        className="absolute z-10 -translate-x-1/2"
        style={{ left: '50%', top: `${(50 / 260) * 100 - (head / (w * 1.3)) * 50}%`, width: head, height: head, originX: 0.5, originY: 1 }}
        animate={sad ? { rotate: 24, y: head * 0.22 } : joy ? { rotate: [-7, 7, -7] } : { rotate: 0 }}
        transition={sad ? { duration: 1.0, delay } : joy ? loop(period, delay) : undefined}
      >
        <div className="rounded-full" style={{ boxShadow: `0 0 0 3px ${shirt}, 0 4px 12px rgba(0,0,0,.5)` }}>
          <PlayerAvatar player={player} team={team} size={head} />
        </div>
        {/* an open mouth when delighted, a flat one when not */}
        {w >= 120 && (
          <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0" style={{ opacity: 0.9 }}>
            {joy ? <path d="M32 74 Q50 96 68 74 Z" fill="#7f1d1d" stroke="#fff" strokeWidth="2.5" /> : sad ? <path d="M34 80 Q50 66 66 80" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" /> : null}
          </svg>
        )}
      </motion.div>
    </motion.div>
  )
}
