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
export function LevelBadge({ size = 18 }: { size?: number }) {
  const lv = useLevel()
  if (!lv) return null
  return (
    <Link
      to={paths.tree} aria-label={`Level ${lv.level}${lv.points > 0 ? `, ${lv.points} points to spend` : ''}. Open the passive tree`}
      className="absolute -right-1 -top-1 grid cursor-pointer place-items-center rounded-full bg-[#14102a] font-extrabold leading-none tabular-nums text-amber-200"
      style={{ width: size, height: size, fontSize: size * 0.5, boxShadow: '0 0 0 1.5px #fbbf24, 0 1px 4px rgba(0,0,0,0.7)' }}
    >
      {lv.level}
      {lv.points > 0 && <span className="absolute -bottom-px -right-px h-1.5 w-1.5 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 0 1px #14102a' }} aria-hidden />}
    </Link>
  )
}
