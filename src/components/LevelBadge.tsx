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

/** A thin ring around the crest that fills as you earn XP towards the next level. */
export function LevelRing({ size, children }: { size: number; children: React.ReactNode }) {
  const lv = useLevel()
  const pad = 4
  const box = size + pad * 2
  const r = box / 2 - 1.5
  const c = 2 * Math.PI * r
  return (
    <div className="relative shrink-0" style={{ width: box, height: box }}>
      <div className="absolute" style={{ left: pad, top: pad }}>{children}</div>
      {lv && (
        <svg className="pointer-events-none absolute inset-0 -rotate-90" width={box} height={box} aria-hidden>
          <circle cx={box / 2} cy={box / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={2} />
          <circle cx={box / 2} cy={box / 2} r={r} fill="none" stroke="#a78bfa" strokeWidth={2} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - lv.pct)} />
        </svg>
      )}
    </div>
  )
}

/** "Lv 12" as plain text next to the career name; it opens the passive tree, with a small dot when points are waiting. */
export function LevelTag() {
  const lv = useLevel()
  if (!lv) return null
  return (
    <Link to={paths.tree} aria-label={`Level ${lv.level}${lv.points > 0 ? `, ${lv.points} points to spend` : ''}. Open the passive tree`} className="cursor-pointer text-violet-300 hover:text-violet-200">
      {' · '}Lv {lv.level}{lv.points > 0 && <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 align-middle" aria-hidden />}
    </Link>
  )
}
