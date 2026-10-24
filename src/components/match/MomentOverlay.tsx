import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import type { Player, Team } from '../../types'
import { OriginTag, RatingBadge, accentOf } from '../ui'
import { ExtraScreen, FourScreen, MaidenScreen, NoBallScreen, type ExtraInfo, type FourInfo, type MaidenInfo, type NoBallInfo } from './EventScreens'
import { FreeHitScreen, type FreeHitInfo } from './FreeHitScreen'
import { AmbientScreen, type AmbientInfo } from './AmbientScreens'
import { CheerScreen, type CheerInfo } from './CheerScreen'
import { DuckScreen, HatTrickScreen, HaulScreen, type DuckInfo, type HatTrickInfo, type HaulInfo } from './BowlerScreens'
import { MilestoneScreen, type FistInfo } from './MilestoneScreen'
import { ChallengeScreen, type ChallengeInfo } from './ChallengeScreen'
import { ChallengeResultScreen, type ChallengeResultInfo } from './ChallengeResult'
import { RainDelayScreen, type RainDelayInfo } from './RainDelay'
import { CatchScreen, type CatchInfo } from './CatchScreen'
import { TimeoutIntroScreen, type TimeoutIntroInfo } from './TimeoutIntro'
import { ReviewScreen, RunOutReview, type ReviewInfo, type RunOutInfo } from './ReviewScreens'
import { PartnershipScreen, TimeoutScreen, type PartnershipInfo, type TimeoutInfo } from './TimeoutScreens'
import { PhaseScreen, RecordScreen, SuperOverScreen, SwingScreen, TargetScreen, TensionScreen, type PhaseInfo, type RecordInfo, type SuperOverInfo, type SwingInfo, type TargetInfo, type TensionInfo } from './StoryScreens'
import { SixReplay, type SixInfo } from './SixReplay'
import { WicketReplay, type ReplayInfo } from './WicketReplay'
import { WicketFxScreen, type WicketFxInfo } from './WicketScreens'
import { BallIcon, BatIcon, MoodPortrait, type Mood } from './Portrait'

/**
 * A big moment that takes over the field for a few seconds, TV-graphic style: a milestone, a dismissal, or the
 * introduction of a batsman or bowler the first time he gets going in the match.
 */
export interface Moment {
  key: number
  kind: 'milestone' | 'hattrick' | 'haul' | 'duck' | 'review' | 'runout' | 'timeout' | 'partnership' | 'tension' | 'target' | 'superover' | 'swing' | 'record' | 'phase' | 'cheer' | 'ambient' | 'noball' | 'batsman' | 'bowler' | 'replay' | 'six' | 'freehit' | 'four' | 'extra' | 'maiden' | 'wicketfx' | 'challenge' | 'timeoutintro' | 'challengewon' | 'raindelay' | 'catch'
  /** Screens for a four, an extra (wide, bye, leg bye) and a maiden over. */
  four?: FourInfo
  extra?: ExtraInfo
  maiden?: MaidenInfo
  /** For a free hit: who overstepped and who gets the swing. */
  freeHit?: FreeHitInfo
  /** The bowler's big moments: three in three balls, and five wickets. */
  hattrick?: HatTrickInfo
  duck?: DuckInfo
  /** A review (the T signal and ball tracking), a run out sent upstairs, the strategic timeout TV, and a partnership milestone. */
  review?: ReviewInfo
  /** The huddle before a challenge. */
  challenge?: ChallengeInfo
  /** A catch: the ball again from the TV camera and where it met the bat. */
  catchInfo?: CatchInfo
  /** Rain or bad light stops play in a Test. */
  rainDelay?: RainDelayInfo
  /** A successful challenge: the decision flips and the winners celebrate. */
  challengeWon?: ChallengeResultInfo
  /** The umpire's signal that starts a strategic timeout. */
  timeoutIntro?: TimeoutIntroInfo
  runout?: RunOutInfo
  timeout?: TimeoutInfo
  partnership?: PartnershipInfo
  /** More story screens: a hat-trick ball or the nineties, the target, a super over, a momentum swing, a record, a new phase of the game. */
  tension?: TensionInfo
  target?: TargetInfo
  superover?: SuperOverInfo
  swing?: SwingInfo
  record?: RecordInfo
  phase?: PhaseInfo
  cheer?: CheerInfo
  ambient?: AmbientInfo
  /** The bowler's front foot over the line, shown before the free hit. */
  noball?: NoBallInfo
  /** What the commentary box says about the screen, on a bar along the bottom (the crowd, the cheerleaders, the stats desk...). */
  caption?: string
  haul?: HaulInfo
  /** For a fifty or hundred: the one-screen version (the two batsmen meet and bump fists). Without it the original card is used. */
  fist?: FistInfo
  /** For a six: how far it went. */
  six?: SixInfo
  /** For a replay: how the wicket happened. */
  replay?: ReplayInfo
  /** A special wicket screen: the stump cam, a catch cam, the stumping check, a Nelson, a pair, a stand broken. */
  wfx?: WicketFxInfo
  player: Player
  team: Team
  title: string
  /** Lines under the name: the score, or how he got out. */
  lines: string[]
  /** Little stat boxes (an introduction): label and value. */
  tiles?: { label: string; value: string }[]
  /** Overall rating, shown as a badge. */
  rating?: number
  /** A hundred or more gets the full golden treatment. */
  big?: boolean
  /** Wait this long (ms) so the delivery that caused it can be seen first, then show for `ms`. */
  delay: number
  ms: number
}

/** A sweep of team colour across the screen, for introductions. */
function Sweep({ color }: { color: string }) {
  return (
    <>
      <motion.div className="pointer-events-none absolute inset-y-0 w-1/2 -skew-x-12 opacity-25" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} initial={{ left: '-60%' }} animate={{ left: '120%' }} transition={{ duration: 1.4, ease: 'easeInOut' }} />

    </>
  )
}

/** The commentary box's words about what the screen is showing, on a bar along the bottom: "the {team} cheerleaders are so happy for {player}". */
function CommentaryCaption({ text, delay }: { text: string; delay: number }) {
  return (
    <motion.div className="pointer-events-none absolute inset-x-0 bottom-0 z-[80] flex items-center gap-2 border-t-2 border-violet-400/70 bg-black/85 px-3 py-1.5" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay, type: 'spring', stiffness: 260, damping: 24 }}>
      <span className="shrink-0 rounded bg-violet-500 px-1.5 py-0.5 text-[9px] font-extrabold uppercase leading-none tracking-widest text-white">🎙️ Commentary</span>
      <span className="min-w-0 text-[12px] font-semibold leading-snug text-white">{text}</span>
    </motion.div>
  )
}

export function MomentOverlay({ moment, onDismiss }: { moment: Moment; onDismiss: () => void }) {
  const box = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(700)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  if (moment.kind === 'replay' && moment.replay) {
    // a screen of its own: how the wicket happened, a few seconds long (click to skip)
    return (
      <motion.div
        data-moment="replay" onClick={onDismiss} className="absolute inset-0 z-[45] cursor-pointer overflow-hidden rounded-2xl"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.05, transition: { duration: 0.45, delay: 0, ease: 'easeInOut' } }} transition={{ duration: 0.3, delay: moment.delay / 1000 }}
        aria-label="Wicket replay"
      >
        <WicketReplay info={moment.replay} />
      </motion.div>
    )
  }
  if (moment.kind === 'noball' && moment.noball) {
    return (
      <motion.div data-moment="noball" onClick={onDismiss} className="absolute inset-0 z-[45] cursor-pointer overflow-hidden rounded-2xl" initial={{ opacity: 0, scale: 1.03 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, transition: { duration: 0.2, delay: 0 } }} transition={{ duration: 0.2, delay: moment.delay / 1000 }}>
        <NoBallScreen info={moment.noball} />
      </motion.div>
    )
  }
  if (moment.kind === 'ambient' && moment.ambient) {
    return (
      <motion.div data-moment="ambient" onClick={onDismiss} className="absolute inset-0 z-[45] cursor-pointer overflow-hidden rounded-2xl" initial={{ opacity: 0, scale: 1.03 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, transition: { duration: 0.25, delay: 0 } }} transition={{ duration: 0.25, delay: moment.delay / 1000 }}>
        <AmbientScreen info={moment.ambient} />
        {moment.caption && <CommentaryCaption text={moment.caption} delay={moment.delay / 1000 + 0.45} />}
      </motion.div>
    )
  }
  if (moment.kind === 'cheer' && moment.cheer) {
    return (
      <motion.div data-moment="cheer" onClick={onDismiss} className="absolute inset-0 z-[45] cursor-pointer overflow-hidden rounded-2xl" initial={{ opacity: 0, scale: 1.03 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, transition: { duration: 0.25, delay: 0 } }} transition={{ duration: 0.25, delay: moment.delay / 1000 }}>
        <CheerScreen info={moment.cheer} />
        {moment.caption && <CommentaryCaption text={moment.caption} delay={moment.delay / 1000 + 0.45} />}
      </motion.div>
    )
  }
  if ((moment.kind === 'tension' && moment.tension) || (moment.kind === 'target' && moment.target) || (moment.kind === 'superover' && moment.superover) || (moment.kind === 'swing' && moment.swing) || (moment.kind === 'record' && moment.record) || (moment.kind === 'phase' && moment.phase)) {
    return (
      <motion.div
        data-moment={moment.kind} onClick={onDismiss} className="absolute inset-0 z-[45] cursor-pointer overflow-hidden rounded-2xl"
        initial={{ opacity: 0, scale: 1.03 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, transition: { duration: 0.25, delay: 0 } }} transition={{ duration: 0.25, delay: moment.delay / 1000 }}
      >
        {moment.kind === 'tension' && moment.tension && <TensionScreen info={moment.tension} />}
        {moment.kind === 'target' && moment.target && <TargetScreen info={moment.target} />}
        {moment.kind === 'superover' && moment.superover && <SuperOverScreen info={moment.superover} />}
        {moment.kind === 'swing' && moment.swing && <SwingScreen info={moment.swing} />}
        {moment.kind === 'record' && moment.record && <RecordScreen info={moment.record} />}
        {moment.kind === 'phase' && moment.phase && <PhaseScreen info={moment.phase} />}
      </motion.div>
    )
  }
  if ((moment.kind === 'catch' && moment.catchInfo) || (moment.kind === 'raindelay' && moment.rainDelay) || (moment.kind === 'challengewon' && moment.challengeWon) || (moment.kind === 'timeoutintro' && moment.timeoutIntro) || (moment.kind === 'challenge' && moment.challenge) || (moment.kind === 'review' && moment.review) || (moment.kind === 'runout' && moment.runout) || (moment.kind === 'timeout' && moment.timeout) || (moment.kind === 'partnership' && moment.partnership)) {
    return (
      <motion.div
        data-moment={moment.kind} onClick={onDismiss} className="absolute inset-0 z-[45] cursor-pointer overflow-hidden rounded-2xl"
        initial={{ opacity: 0, scale: 1.03 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, transition: { duration: 0.25, delay: 0 } }} transition={{ duration: 0.25, delay: moment.delay / 1000 }}
      >
        {moment.kind === 'catch' && moment.catchInfo && <CatchScreen info={moment.catchInfo} />}
        {moment.kind === 'raindelay' && moment.rainDelay && <RainDelayScreen info={moment.rainDelay} />}
        {moment.kind === 'challengewon' && moment.challengeWon && <ChallengeResultScreen info={moment.challengeWon} />}
        {moment.kind === 'timeoutintro' && moment.timeoutIntro && <TimeoutIntroScreen info={moment.timeoutIntro} />}
        {moment.kind === 'challenge' && moment.challenge && <ChallengeScreen info={moment.challenge} />}
        {moment.kind === 'review' && moment.review && <ReviewScreen info={moment.review} />}
        {moment.kind === 'runout' && moment.runout && <RunOutReview info={moment.runout} />}
        {moment.kind === 'timeout' && moment.timeout && <TimeoutScreen info={moment.timeout} />}
        {moment.kind === 'partnership' && moment.partnership && <PartnershipScreen info={moment.partnership} />}
      </motion.div>
    )
  }
  if ((moment.kind === 'hattrick' && moment.hattrick) || (moment.kind === 'haul' && moment.haul) || (moment.kind === 'duck' && moment.duck)) {
    return (
      <motion.div
        data-moment={moment.kind} onClick={onDismiss} className="absolute inset-0 z-[45] cursor-pointer overflow-hidden rounded-2xl"
        initial={{ opacity: 0, scale: 1.03 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, transition: { duration: 0.25, delay: 0 } }} transition={{ duration: 0.25, delay: moment.delay / 1000 }}
      >
        {moment.kind === 'hattrick' && moment.hattrick && <HatTrickScreen info={moment.hattrick} />}
        {moment.kind === 'haul' && moment.haul && <HaulScreen info={moment.haul} />}
        {moment.kind === 'duck' && moment.duck && <DuckScreen info={moment.duck} />}
      </motion.div>
    )
  }
  if (moment.kind === 'wicketfx' && moment.wfx) {
    return (
      <motion.div
        data-moment="wicketfx" onClick={onDismiss} className="absolute inset-0 z-[45] cursor-pointer overflow-hidden rounded-2xl"
        initial={{ opacity: 0, scale: 1.03 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, transition: { duration: 0.25, delay: 0 } }} transition={{ duration: 0.25, delay: moment.delay / 1000 }}
      >
        <WicketFxScreen info={moment.wfx} />
      </motion.div>
    )
  }
  if (moment.kind === 'milestone' && moment.fist) {
    return (
      <motion.div
        data-moment="milestone" onClick={onDismiss} className="absolute inset-0 z-[45] cursor-pointer overflow-hidden rounded-2xl"
        initial={{ opacity: 0, scale: 1.03 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, transition: { duration: 0.25, delay: 0 } }} transition={{ duration: 0.25, delay: moment.delay / 1000 }}
        aria-label="Milestone"
      >
        <MilestoneScreen info={moment.fist} />
      </motion.div>
    )
  }
  const small = (moment.kind === 'four' && moment.four) || (moment.kind === 'extra' && moment.extra) || (moment.kind === 'maiden' && moment.maiden)
  if (small) {
    return (
      <motion.div
        data-moment={moment.kind} onClick={onDismiss} className="absolute inset-0 z-[45] cursor-pointer overflow-hidden rounded-2xl"
        initial={{ opacity: 0, scale: 1.03 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, transition: { duration: 0.2, delay: 0 } }} transition={{ duration: 0.2, delay: moment.delay / 1000 }}
      >
        {moment.kind === 'four' && moment.four && <FourScreen info={moment.four} />}
        {moment.kind === 'extra' && moment.extra && <ExtraScreen info={moment.extra} />}
        {moment.kind === 'maiden' && moment.maiden && <MaidenScreen info={moment.maiden} />}
      </motion.div>
    )
  }
  if (moment.kind === 'freehit' && moment.freeHit) {
    return (
      <motion.div
        data-moment="freehit" onClick={onDismiss} className="absolute inset-0 z-[45] cursor-pointer overflow-hidden rounded-2xl"
        initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, transition: { duration: 0.25, delay: 0 } }} transition={{ duration: 0.2, delay: moment.delay / 1000 }}
        aria-label="Free hit"
      >
        <FreeHitScreen info={moment.freeHit} />
      </motion.div>
    )
  }
  if (moment.kind === 'six' && moment.six) {
    return (
      <motion.div
        data-moment="six" onClick={onDismiss} className="absolute inset-0 z-[45] cursor-pointer overflow-hidden rounded-2xl"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.3, delay: 0 } }} transition={{ duration: 0.25, delay: moment.delay / 1000 }}
        aria-label="Six"
      >
        <SixReplay info={moment.six} />
      </motion.div>
    )
  }
  const intro = moment.kind === 'batsman' || moment.kind === 'bowler'
  const accent = accentOf(moment.team)
  // narrow (a phone): the portrait goes on top and the words below it; wide: side by side as before
  const stacked = w < 520
  const fig = stacked ? Math.max(84, Math.min(w * 0.3, 118)) : Math.max(110, Math.min(w * 0.3, 210))
  const scale = stacked ? Math.max(0.5, Math.min(w / 640, 0.66)) : Math.max(0.62, Math.min(w / 730, 1.1))
  const mood: Mood = 'intro'
  const titleColor = accent
  const Badge = moment.kind === 'bowler' ? BallIcon : BatIcon
  const bg = `radial-gradient(ellipse at 25% 50%, ${accent}66, transparent 60%), linear-gradient(160deg,#0b1220,#10131c)`

  return (
    <motion.div
      ref={box}
      data-moment={moment.kind}
      onClick={onDismiss}
      className={`absolute inset-0 z-[45] flex cursor-pointer justify-center overflow-hidden rounded-2xl ${stacked ? 'flex-col items-center gap-1.5 px-3 text-center' : 'items-center gap-[4%] px-[5%]'}`}
      style={{ background: bg, boxShadow: `inset 0 0 80px ${accent}44` }}
      initial={{ opacity: 0, scale: 1.06 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.18, delay: 0 } }}
      transition={{ duration: moment.delay === 0 ? 0.5 : 0.28, delay: moment.delay / 1000, ease: 'easeOut' }} // straight after a replay: it fades in as the replay fades out
      aria-label={moment.kind === 'bowler' ? 'Bowler introduction' : 'Batsman introduction'}
    >
      {intro && (
        <>
          {/* time left, and a way out: click anywhere to carry on */}
          <motion.div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 origin-left" style={{ background: accent }} initial={{ scaleX: 1 }} animate={{ scaleX: 0 }} transition={{ duration: moment.ms / 1000 + 0.35, delay: moment.delay / 1000, ease: 'linear' }} />
          <div className={`pointer-events-none absolute right-3 rounded-full bg-black/40 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-300 ${stacked ? 'top-2' : 'bottom-2.5'}`}>{stacked ? 'Tap to continue' : 'Click anywhere to continue'}</div>
        </>
      )}
      <Sweep color={accent} />

      <div className="relative shrink-0" style={{ width: fig, height: fig }}>
        <MoodPortrait player={moment.player} team={moment.team} size={fig} mood={mood} delay={moment.delay / 1000} />
        <motion.div
          className="absolute -bottom-1 -right-1 grid place-items-center rounded-full border-2 bg-ink shadow-lg"
          style={{ width: fig * 0.3, height: fig * 0.3, borderColor: titleColor }}
          initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 14, delay: moment.delay / 1000 + 0.25 }}
        >
          <Badge size={Math.round(fig * 0.17)} />
        </motion.div>
      </div>

      <motion.div
        className={`relative min-w-0 ${stacked ? 'w-full max-w-full' : 'max-w-[56%]'}`}
        initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: moment.delay / 1000 + 0.15, type: 'spring', stiffness: 200, damping: 18 }}
      >
        <div
          className="font-display leading-none tracking-wide"
          style={{ fontSize: (intro ? 34 : 66) * scale, color: titleColor, WebkitTextStroke: `${2 * scale}px #0b0d14`, paintOrder: 'stroke fill', textShadow: `0 0 30px ${titleColor}88` }}
        >
          {moment.title}
        </div>
        <div className={`mt-1 flex items-center gap-2 ${stacked ? 'justify-center' : ''}`}>
          <div className="font-bold leading-tight text-white" style={{ fontSize: (intro ? 28 : 22) * scale }}>{moment.player.name}</div>
          {moment.rating !== undefined && <RatingBadge value={moment.rating} size="sm" />}
        </div>
        <div className="text-slate-300" style={{ fontSize: 13 * scale }}>{moment.team.name}</div>
        <div className={`mt-0.5 ${stacked ? 'flex justify-center' : ''}`} style={{ fontSize: 12 * scale }}><OriginTag playerId={moment.player.id} /></div>
        <div className="mt-1 space-y-0.5">
          {moment.lines.map((l, i) => (
            <div key={i} className={i === 0 ? 'font-extrabold text-white' : 'text-slate-300'} style={{ fontSize: (i === 0 ? 19 : 14) * scale }}>{l}</div>
          ))}
        </div>
        {moment.tiles && moment.tiles.length > 0 && (
          <div className={`grid grid-cols-3 gap-1.5 ${stacked ? 'mt-2 mx-auto max-w-sm' : 'mt-3'}`}>
            {moment.tiles.map((t, i) => (
              <motion.div key={t.label} className="rounded-lg bg-white/10 px-2 py-1 text-center" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: moment.delay / 1000 + 0.35 + i * 0.07 }}>
                <div className="font-display leading-none text-white" style={{ fontSize: 22 * scale }}>{t.value}</div>
                <div className="font-bold uppercase tracking-wider text-slate-400" style={{ fontSize: Math.max(8, 9 * scale) }}>{t.label}</div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
