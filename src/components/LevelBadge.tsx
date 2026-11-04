import { Link } from 'react-router'
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
          <span className="relative">Lv {lv.level}</span>
          {lv.points > 0 && <span className="absolute right-0.5 top-1/2 h-1 w-1 -translate-y-1/2 rounded-full bg-emerald-400" aria-hidden />}
        </Link>
      )}
    </div>
  )
}
