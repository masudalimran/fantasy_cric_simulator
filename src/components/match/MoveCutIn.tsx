import { motion } from 'framer-motion'
import type { Move } from '../../data/moves'
import type { Player, Team } from '../../types'
import { PlayerAvatar, accentOf } from '../ui'

/**
 * The cut-in for the biggest sixes, like a fighting game's special move: the screen flashes, speed lines rush across in the team's colours, the
 * batsman's face slides in big and the name of the move slams down. It plays over the start of the six screen and then goes away by itself.
 */
export const CUT_IN_SECONDS = 1.9

export function MoveCutIn({ move, batsman, team, rate = 1, art = null }: { move: Move; batsman: Player; team: Team; rate?: number; /** A power-up picture of the batsman (see data/moveArt.ts): shown big instead of his round portrait. */ art?: string | null }) {
  const d = CUT_IN_SECONDS * rate
  const accent = accentOf(team)
  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-40 overflow-hidden"
      initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0] }} transition={{ duration: d, times: [0, 0.08, 0.82, 1] }}
      aria-label={move.name}
    >
      <div className="absolute inset-0" style={{ background: `linear-gradient(115deg, #020617 0%, ${move.c1}55 38%, #020617 70%)` }} />
      {/* speed lines */}
      {Array.from({ length: 22 }, (_, i) => (
        <motion.span key={i} className="absolute h-[2px] rounded-full" style={{ top: `${(i * 37) % 100}%`, left: 0, width: `${35 + (i * 13) % 45}%`, background: `linear-gradient(90deg, transparent, ${i % 3 ? move.c1 : '#ffffff'})` }}
          initial={{ x: '-110%', opacity: 0 }} animate={{ x: '260%', opacity: [0, 1, 0] }} transition={{ delay: (i % 7) * 0.05 * rate, duration: 0.55 * rate, repeat: 2 }} />
      ))}
      {/* a bright slash of the team's colour behind the face */}
      <motion.div className="absolute -inset-y-4 w-[58%] -skew-x-12" style={{ left: '4%', background: `linear-gradient(180deg, ${move.c1}cc, ${accent}aa)`, boxShadow: `0 0 40px ${move.c1}` }} initial={{ x: '-120%' }} animate={{ x: 0 }} transition={{ duration: 0.25 * rate, ease: 'easeOut' }} />
      {art ? (
        <motion.div className="absolute inset-y-0 left-0 w-[58%] overflow-hidden" style={{ clipPath: 'polygon(0 0, 100% 0, 84% 100%, 0 100%)', boxShadow: `0 0 40px ${move.c1}` }} initial={{ x: '-100%' }} animate={{ x: 0 }} transition={{ delay: 0.05 * rate, duration: 0.28 * rate, ease: 'easeOut' }}>
          <motion.img src={art} alt="" className="h-full w-full object-cover" initial={{ scale: 1.25 }} animate={{ scale: 1.05 }} transition={{ duration: CUT_IN_SECONDS * rate, ease: 'easeOut' }} />
          <div className="absolute inset-0" style={{ background: `linear-gradient(90deg, transparent 55%, ${move.c1}55)` }} />
        </motion.div>
      ) : (
        <motion.div className="absolute bottom-0 left-[6%] aspect-square w-[44%] max-w-[300px] overflow-hidden rounded-full" style={{ boxShadow: `0 0 0 4px #fff, 0 0 30px ${move.c1}` }} initial={{ x: -140, scale: 1.4, opacity: 0 }} animate={{ x: 0, scale: 1, opacity: 1 }} transition={{ delay: 0.12 * rate, duration: 0.3 * rate, type: 'spring', stiffness: 200, damping: 18 }}>
          <PlayerAvatar player={batsman} team={team} size={300} />
        </motion.div>
      )}
      <motion.div className="absolute right-[4%] top-[18%] w-[52%] text-right" initial={{ scale: 2.6, opacity: 0, rotate: -6 }} animate={{ scale: 1, opacity: 1, rotate: -3 }} transition={{ delay: 0.3 * rate, type: 'spring', stiffness: 260, damping: 15 }}>
        <div className="font-display text-xl uppercase leading-none tracking-widest text-white/90 sm:text-3xl">{batsman.name}</div>
        <div className="mt-1 font-display text-3xl uppercase leading-[0.95] tracking-wide text-white sm:text-6xl" style={{ WebkitTextStroke: `3px ${move.c1}`, paintOrder: 'stroke fill', textShadow: `0 0 26px ${move.c1}` }}>{move.name}</div>
      </motion.div>
      <motion.div className="absolute inset-0 bg-white" initial={{ opacity: 0.9 }} animate={{ opacity: 0 }} transition={{ duration: 0.3 * rate }} />
    </motion.div>
  )
}
