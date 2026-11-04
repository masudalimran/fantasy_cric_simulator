import confetti from 'canvas-confetti'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { BONUS_LEVELS, pointsAt } from '../data/passiveTree'
import { Sheet } from './Sheet'
import { paths } from '../routes'
import { careerXp, levelInfo, pointsLeft } from '../season/level'
import { selectSession, useStore } from '../store/useStore'

/** Your career level for the career you have open (null outside a career). */
export function useLevel() {
  const session = useStore(selectSession)
  if (!session) return null
  const info = levelInfo(careerXp([...(session.history ?? []), session.season], session.reviews.length))
  return { ...info, points: pointsLeft(info.level, session.season.market?.club?.perks ?? []) }
}

/** The crest standing on a small level plate, like an avatar frame in a game: "LV 12", filled from the left as XP comes in, with a green dot while points are waiting. Opens the passive tree. */
export function LevelPlate({ children }: { children: React.ReactNode }) {
  const lv = useLevel()
  return (
    <div className="relative mb-1 shrink-0">
      {children}
      {lv && (
        <Link
          to={paths.tree} aria-label={`Level ${lv.level}${lv.points > 0 ? `, ${lv.points} passive tree points to spend` : ''}. Open the passive tree`}
          className="absolute -bottom-[6px] left-1/2 z-10 flex h-[11px] w-[calc(100%+8px)] -translate-x-1/2 cursor-pointer items-center justify-center overflow-hidden rounded-none text-[7px] font-extrabold uppercase leading-none tracking-wide text-amber-100"
          style={{ background: `linear-gradient(90deg, #6d4cd6 ${lv.pct * 100}%, #17112f ${lv.pct * 100}%)`, boxShadow: '0 0 0 1px #fbbf24, 0 1px 3px rgba(0,0,0,0.6)' }}
        >
          <span className="relative">Level {lv.level}</span>
          {lv.points > 0 && <span className="absolute right-0.5 top-1/2 h-1 w-1 -translate-y-1/2 rounded-full bg-emerald-400" aria-hidden />}
        </Link>
      )}
    </div>
  )
}

// ---- the level-up moment ------------------------------------------------------------------------------------------
const SEEN_KEY = 'fcs.levelSeen'
const readSeen = (): Record<string, number> => { try { return JSON.parse(localStorage.getItem(SEEN_KEY) ?? '{}') as Record<string, number> } catch { return {} } }
const writeSeen = (sid: string, level: number) => { try { localStorage.setItem(SEEN_KEY, JSON.stringify({ ...readSeen(), [sid]: level })) } catch { /* just not remembered */ } }

/**
 * Pops up once when a career reaches a new level: a short celebration that says how many perk points you earned, with a button to the tree.
 * A career seen for the first time since this existed is taken as it is (no popup for levels it already had).
 */
export function LevelUpPopup() {
  const session = useStore(selectSession)
  const lv = useLevel()
  const navigate = useNavigate()
  const [shown, setShown] = useState<{ from: number; to: number } | null>(null)
  const sid = session?.id
  const level = lv?.level
  useEffect(() => {
    if (!sid || !level) return
    const before = readSeen()[sid]
    if (before === undefined) { writeSeen(sid, level); return }
    if (level > before) setShown({ from: before, to: level })
  }, [sid, level])
  useEffect(() => {
    if (!shown) return
    confetti({ particleCount: 90, spread: 80, origin: { y: 0.55 }, colors: ['#fbbf24', '#a78bfa', '#34d399'], disableForReducedMotion: true })
  }, [shown])
  const close = () => { if (sid && shown) writeSeen(sid, shown.to); setShown(null) }
  const gained = shown ? pointsAt(shown.to) - pointsAt(shown.from) : 0
  const bonus = shown ? BONUS_LEVELS.filter((l) => l > shown.from && l <= shown.to) : []
  return (
    <AnimatePresence>
      {shown && lv && (
        <Sheet key="levelup" label="Level up" onClose={close} z={88} size="sm">
          <div className="p-6 text-center">
            <div className="text-[11px] font-extrabold uppercase tracking-widest text-amber-300">Level up</div>
            <motion.div initial={{ scale: 0.4, rotate: -8, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }} className="mx-auto my-3 grid h-28 w-28 place-items-center rounded-3xl border-2 border-amber-300 bg-gradient-to-b from-violet-500 to-violet-900 shadow-[0_0_40px_#a78bfa88]">
              <div><div className="text-[10px] font-extrabold uppercase tracking-widest text-amber-100">Level</div><div className="font-display text-6xl leading-none text-white">{shown.to}</div></div>
            </motion.div>
            <h2 className="font-display text-3xl tracking-wide text-white">{shown.to - shown.from > 1 ? `You jumped ${shown.to - shown.from} levels!` : 'Your career grew!'}</h2>
            <p className="mt-1 text-sm text-slate-300">{gained > 0 ? <>You earned <b className="text-emerald-300">{gained} perk {gained === 1 ? 'point' : 'points'}</b>{bonus.length ? ` (a bonus for reaching level ${bonus.join(' and ')})` : ''}.</> : 'Keep winning to earn more perk points.'} You have <b className="text-white">{lv.points}</b> to spend.</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={close} className="h-12 cursor-pointer rounded-full border border-line text-sm font-bold text-slate-200 hover:border-slate-400">Later</button>
              <button onClick={() => { close(); navigate(paths.tree) }} className="cta-pulse h-12 cursor-pointer rounded-full bg-emerald-500 font-display text-xl tracking-wide text-black active:bg-emerald-400">Spend points</button>
            </div>
          </div>
        </Sheet>
      )}
    </AnimatePresence>
  )
}
