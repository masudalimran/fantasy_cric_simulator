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

/** A round level badge for the corner of the team crest. It opens the passive tree, and shows a dot when points are waiting. */
export function LevelBadge({ size = 22 }: { size?: number }) {
  const lv = useLevel()
  if (!lv) return null
  return (
    <Link
      to={paths.tree} aria-label={`Level ${lv.level}${lv.points > 0 ? `, ${lv.points} points to spend` : ''}. Open the passive tree`}
      className="absolute -right-2 -top-2 grid cursor-pointer place-items-center rounded-full border-2 border-[#0b0e15] bg-gradient-to-b from-violet-400 to-violet-600 font-display leading-none text-white shadow-[0_2px_6px_rgba(0,0,0,0.6)]"
      style={{ width: size, height: size, fontSize: size * 0.52 }}
    >
      {lv.level}
      {lv.points > 0 && <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-[#0b0e15] bg-amber-300" aria-hidden />}
    </Link>
  )
}
