import type { StadiumLook } from '../../engine/stadium'
import type { PitchKind } from '../../engine/pitchInfo'
import type { BallEvent } from '../../engine/types'
import type { Player, Team } from '../../types'
import { BroadcastView } from './BroadcastView'
import { replayCamera, type ReplayCam } from './broadcast'
import type { Placed } from './Stage'

/** Everything the broadcast view needs to play one ball again. */
export interface ReplayBase {
  event: BallEvent
  striker: Player
  nonStriker: Player | null
  bowler: Player
  batTeam: Team
  bowlTeam: Team
  fielders: Placed[]
  pitch: PitchKind
  look: StadiumLook
}

/**
 * The top of the broadcast-style animation screens: the ball played again from the TV camera, with a REPLAY tag. `share` is how much of the screen the
 * picture takes (the rest is for the card under it). A `rate` above 1 plays it slower.
 */
export function ReplayFrame({ base, rate = 1, share = 0.52, tag = 'Replay', cam }: { base: ReplayBase; rate?: number; share?: number; tag?: string; /** The replay camera (a different angle from the live picture) and whether it slows down around the shot. */ cam: ReplayCam }) {
  return (
    <div className="absolute inset-x-0 top-0 overflow-hidden" style={{ height: `${share * 100}%` }}>
      <BroadcastView event={base.event} striker={base.striker} nonStriker={base.nonStriker} bowler={base.bowler} battingTeam={base.batTeam} bowlingTeam={base.bowlTeam} fielders={base.fielders} pitch={base.pitch} look={base.look} rate={rate} replay={{ cam, slowMo: true }} />
      <div className="pointer-events-none absolute left-2 top-2 z-[7000] flex items-center gap-1.5 rounded bg-sky-500 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-widest text-white"><span className="h-2 w-2 animate-pulse rounded-full bg-red-300" />{tag} · {replayCamera(cam, base.event.seq).label}</div>
      <div className="pointer-events-none absolute right-2 top-2 z-[7000] rounded-full bg-black/60 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-300">Tap to skip</div>
    </div>
  )
}
