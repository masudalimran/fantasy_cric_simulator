import { AnimatePresence, motion } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router'
import { paths } from '../../routes'
import { markSeen, useSeenSet } from '../../tips'
import { selectSeason, useStore } from '../../store/useStore'
import { TeamCrest } from '../ui'
import { usePlayerIndex, useTeamMap } from './shared'

/**
 * Shown on every career page while a computer team has an offer on the table for one of your players. The cross only
 * closes the notice: it does not accept or decline anything (do that on the Market page).
 */
export function OfferBanner() {
  const season = useStore(selectSeason)
  const teams = useTeamMap()
  const index = usePlayerIndex()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const seen = useSeenSet()
  if (!season?.market || pathname.startsWith(paths.market)) return null
  const live = (season.market.offers ?? []).filter((o) => o.expires >= season.today)
  const fresh = live.filter((o) => !seen.has(`offer:${o.id}`))
  const first = fresh[0]
  const player = first ? index.get(first.playerId)?.player : undefined
  const buyer = first ? teams.get(first.teamId) : undefined
  return (
    <AnimatePresence>
      {first && player && buyer && (
        <motion.div
          role="status" key="offer-banner"
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
          className="mb-3 flex items-center gap-3 rounded-2xl border-2 border-sky-400/70 bg-sky-400/10 p-2.5 pl-3"
        >
          <TeamCrest team={buyer} size={34} />
          <button onClick={() => navigate(paths.market)} className="min-w-0 flex-1 text-left">
            <span className="block truncate text-sm font-bold text-white">{buyer.name} want {player.name}: {first.fee} {first.fee === 1 ? 'coin' : 'coins'}</span>
            <span className="block truncate text-xs text-sky-200">{fresh.length > 1 ? `+${fresh.length - 1} more offer${fresh.length > 2 ? 's' : ''} · ` : ''}Tap to see the offer on the Market page</span>
          </button>
          <button onClick={() => navigate(paths.market)} className="shrink-0 rounded-full bg-sky-400 px-3.5 py-1.5 text-xs font-extrabold leading-none text-black hover:bg-sky-300 max-md:hidden">See offers</button>
          <button onClick={() => fresh.forEach((o) => markSeen(`offer:${o.id}`))} aria-label="Close this notice" title="Close this notice. It does not accept or decline the offer." className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-black/30 text-lg font-bold leading-none text-white hover:bg-black/50">✕</button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
