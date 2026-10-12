import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { overall } from '../../data/builders'
import type { Player, Team } from '../../types'
import { PlayerAvatar, RatingBadge, TeamCrest, accentOf, tierOf } from '../ui'
import { sfx } from '../../audio/sfx'
import { Sheet } from '../Sheet'

export interface Signing { player: Player; to: Team; from: Team | null; fee: number; kind: 'sign' | 'buy' }

/** The reveal when a new player joins: his portrait lands between the old club and the new one, with what he brings. */
export function SigningOverlay({ signing, onClose }: { signing: Signing; onClose: () => void }) {
  const { player, to, from, fee, kind } = signing
  const ovr = overall(player)
  const tier = tierOf(ovr)
  const accent = accentOf(to)
  useEffect(() => { sfx.cheer(0.9) }, [])
  const bat = player.batting
  const bowl = player.bowling
  const tiles: [string, number][] = [
    ['Technique', bat.technique], ['Power', bat.power],
    ...(bowl ? ([['Accuracy', bowl.accuracy], ['Variation', bowl.variation]] as [string, number][]) : ([['Temperament', bat.temperament], ['Running', bat.running]] as [string, number][])),
  ]
  return (
    <Sheet label={`${player.name} signs`} onClose={onClose} size="sm" z={90} scrim="bg-black/80">
      <div className="relative overflow-hidden p-6 text-center" style={{ background: `radial-gradient(circle at 50% 18%, ${accent}55, #10131c 62%)` }}>
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="text-[11px] font-extrabold uppercase tracking-[0.3em] text-amber-300">
          {kind === 'sign' ? 'New signing' : 'Transfer complete'}
        </motion.div>

        <div className="mt-3 flex items-center justify-center gap-3">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 0.75, x: 0 }} transition={{ delay: 0.15 }} className="flex flex-col items-center gap-1 text-[11px] text-slate-300">
            {from ? <TeamCrest team={from} size={40} /> : <span className="grid h-10 w-10 place-items-center rounded-full border border-dashed border-slate-500 text-lg">?</span>}
            <span className="max-w-[90px] truncate">{from ? from.name : 'Free agent'}</span>
          </motion.div>
          <motion.span initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.3, duration: 0.4 }} className="origin-left text-2xl text-amber-300">➜</motion.span>
          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }} className="flex flex-col items-center gap-1 text-[11px] text-white">
            <TeamCrest team={to} size={40} />
            <span className="max-w-[90px] truncate font-semibold">{to.name}</span>
          </motion.div>
        </div>

        <motion.div
          initial={{ scale: 0.2, rotate: -14, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 14, delay: 0.45 }}
          className="mx-auto mt-4 w-fit rounded-full" style={{ boxShadow: `0 0 0 5px ${accent}, 0 0 60px ${accent}aa` }}
        >
          <PlayerAvatar player={player} team={to} size={132} />
        </motion.div>

        <motion.h2 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="mt-4 font-display text-4xl leading-none tracking-wide text-white">{player.name}</motion.h2>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.95 }} className="mt-2 flex items-center justify-center gap-3">
          <RatingBadge value={ovr} size="md" />
          <div className="text-left"><div className="font-display text-xl leading-none" style={{ color: tier.color }}>{tier.label}</div><div className="text-[11px] text-slate-300">{player.role}{bowl ? ` · ${bowl.type}` : ''} · {fee} {fee === 1 ? 'coin' : 'coins'}</div></div>
        </motion.div>

        <div className="mt-4 grid grid-cols-4 gap-1.5">
          {tiles.map(([label, v], i) => (
            <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.05 + i * 0.08 }} className="rounded-xl bg-white/5 px-1 py-1.5">
              <div className="font-display text-2xl leading-none text-white">{v}</div>
              <div className="truncate text-[9px] uppercase tracking-wider text-slate-400">{label}</div>
            </motion.div>
          ))}
        </div>

        <button onClick={onClose} className="cta-pulse mt-5 w-full rounded-full bg-emerald-500 px-6 py-3 font-display text-2xl leading-none tracking-wide text-black hover:bg-emerald-400 active:bg-emerald-400">Welcome to the team</button>
      </div>
    </Sheet>
  )
}
