import { motion } from 'framer-motion'
import { useState } from 'react'
import { overall, teamStrength } from '../../data/builders'
import { keeperIn } from '../../data/squad'
import type { NewsItem } from '../../season/selection'
import type { Side, TossResult } from '../../engine/types'
import { OverseasTag, PlayerAvatar, RatingBadge, ROLE_LABEL, accentOf } from '../ui'
import { TeamLogo } from '../season/Details'
import { sfx } from '../../audio/sfx'
import { useIsMobile } from '../../hooks'
import { TipBanner } from '../TipBanner'
import { SquadDialog } from './SquadDialog'

/** A gold coin that spins six times and lands on the right face. */
function Coin({ result, flipping, size }: { result: 'heads' | 'tails'; flipping: boolean; size: number }) {
  const rotate = flipping ? 360 * 6 + (result === 'heads' ? 0 : 180) : 0
  const face = 'absolute inset-0 grid place-items-center rounded-full border-4 border-amber-200 font-display text-amber-900 [backface-visibility:hidden]'
  const bg = 'radial-gradient(circle at 30% 30%, #fde68a, #f59e0b 60%, #b45309)'
  return (
    <div className="[perspective:900px]">
      <motion.div
        className="relative [transform-style:preserve-3d]"
        style={{ width: size, height: size }}
        animate={{ rotateY: rotate, y: flipping ? [0, -size * 1.1, 0] : 0 }}
        transition={{ duration: 2.2, ease: 'easeOut', y: { duration: 2.2, times: [0, 0.45, 1] } }}
      >
        <div className={face} style={{ background: bg, boxShadow: '0 10px 40px #f59e0b55', fontSize: size * 0.4 }}>H</div>
        <div className={face} style={{ background: bg, transform: 'rotateY(180deg)', boxShadow: '0 10px 40px #f59e0b55', fontSize: size * 0.4 }}>T</div>
      </motion.div>
    </div>
  )
}

/** One team's sheet, packed to fit: the XI in batting order, one line each, and the bench on a single line. */
function TeamSheet({ side, mine, news, startXI, onEdit }: { side: Side; mine: boolean; news: NewsItem[]; startXI?: string[]; onEdit?: () => void }) {
  const team = side.team
  const accent = accentOf(team)
  const keeper = keeperIn(side.xi, team.keeperId)?.id
  const bench = team.players.filter((p) => !side.xi.some((x) => x.id === p.id))
  // the computer's changes (injuries, form), plus anything different from the XI this screen opened with (your own edits)
  const changes: NewsItem[] = [...news]
  if (startXI) {
    const nowXI = new Set(side.xi.map((p) => p.id))
    for (const id of startXI) if (!nowXI.has(id) && !changes.some((n) => n.playerId === id && n.kind === 'out')) changes.push({ playerId: id, teamId: team.id, kind: 'out', why: 'dropped by you' })
    for (const p of side.xi) if (!startXI.includes(p.id) && !changes.some((n) => n.playerId === p.id && n.kind === 'in')) changes.push({ playerId: p.id, teamId: team.id, kind: 'in', why: 'called up' })
  }
  const isIn = (id: string) => changes.some((n) => n.playerId === id && n.kind === 'in')
  const ins = side.xi.filter((p) => isIn(p.id))
  const outs = changes.filter((n) => n.kind === 'out' && !side.xi.some((p) => p.id === n.playerId)) // someone brought back is no longer out
  const moved = changes.filter((n) => n.kind === 'moved' && side.xi.some((p) => p.id === n.playerId))
  return (
    <section className="flex min-h-0 flex-col rounded-2xl border bg-panel p-3" style={{ borderColor: mine ? '#fbbf24' : '#252a3a' }}>
      <div className="flex shrink-0 items-center gap-3">
        <TeamLogo team={team} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate font-display text-xl leading-none tracking-wide text-white">{team.name}</h2>
            {mine && <span className="rounded bg-amber-400 px-1.5 py-0.5 text-[11px] font-extrabold text-black">YOUR TEAM</span>}
          </div>
          <div className="truncate text-[11px] text-slate-400">{team.series} · Playing XI in batting order</div>
        </div>
        {onEdit && <button onClick={onEdit} className="shrink-0 rounded-lg border border-indigo-400/60 px-3 py-1.5 text-xs font-bold text-indigo-200 transition hover:bg-indigo-400/15" title="Change the XI, batting order, captain and keeper before the toss">Edit squad</button>}
        <div className="text-center" title="Average rating of the XI"><RatingBadge value={teamStrength({ ...team, players: side.xi })} size="md" /></div>
      </div>

      <ol className="mt-2 flex min-h-0 flex-1 flex-col" style={{ borderTop: `2px solid ${accent}55` }}>
        {side.xi.map((p, i) => (
          <li key={p.id} className="flex min-h-[26px] flex-1 items-center gap-2 border-b border-line/50 last:border-0">
            <span className="w-4 shrink-0 text-center font-display text-sm text-slate-500">{i + 1}</span>
            <PlayerAvatar profile player={p} team={team} size={24} />
            <span className="flex min-w-0 flex-1 items-center gap-1.5">
              <span className="truncate text-[13px] font-semibold text-white">{p.name}</span><OverseasTag playerId={p.id} team={team} />
              {team.captainId === p.id && <span className="rounded bg-amber-400/25 px-1 text-[11px] font-bold text-amber-300">C</span>}
              {keeper === p.id && <span className="rounded bg-sky-400/25 px-1 text-[11px] font-bold text-sky-300">WK</span>}
              {isIn(p.id) && <span className="rounded bg-emerald-400/25 px-1 text-[11px] font-bold text-emerald-300">IN</span>}
            </span>
            <span className="hidden shrink-0 text-[11px] text-slate-400 xl:block">{ROLE_LABEL[p.role]}{p.bowling ? ` · ${p.bowling.type}` : ''}</span>
            <RatingBadge value={overall(p)} size="sm" />
          </li>
        ))}
      </ol>

      {/* two lines of fixed height, always there, so both sheets stay the same size whether or not anyone is in or out */}
      <div className="mt-1.5 shrink-0 space-y-1 text-[11px]" aria-label="Changes to the XI">
        <div className="flex h-[22px] items-center gap-2 overflow-hidden whitespace-nowrap">
          <span className="w-12 shrink-0 rounded bg-emerald-500/20 px-1.5 py-0.5 text-center text-[11px] font-extrabold uppercase tracking-wider text-emerald-300">▲ In</span>
          <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {ins.length === 0 ? <span className="text-slate-600">no changes</span> : ins.map((p) => (
            <span key={p.id} className="flex shrink-0 items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 py-0.5 pl-0.5 pr-2" title={`${p.name} comes in`}>
              <PlayerAvatar profile player={p} team={team} size={18} /><span className="font-semibold text-emerald-100">{p.name}</span>
            </span>
          ))}
          </div>
        </div>
        <div className="flex h-[22px] items-center gap-2 overflow-hidden whitespace-nowrap">
          <span className="w-12 shrink-0 rounded bg-rose-500/20 px-1.5 py-0.5 text-center text-[11px] font-extrabold uppercase tracking-wider text-rose-300">▼ Out</span>
          <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {outs.length === 0 ? <span className="text-slate-600">no changes</span> : outs.map((n) => {
            const p = team.players.find((x) => x.id === n.playerId)
            return p ? (
              <span key={n.playerId} className="flex shrink-0 items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 py-0.5 pl-0.5 pr-2" title={`${p.name}: ${n.why}`}>
                <span className="opacity-60 grayscale"><PlayerAvatar profile player={p} team={team} size={18} /></span>
                <span className="font-semibold text-rose-100">{p.name}</span><span className="text-rose-300/80">{n.why}</span>
              </span>
            ) : null
          })}
          </div>
        </div>
      </div>
      {moved.length > 0 && (
        <div className="mt-1 flex shrink-0 items-center gap-2 overflow-hidden whitespace-nowrap text-[11px]" aria-label="Batting order changes">
          <span className="w-12 shrink-0 rounded bg-amber-500/20 px-1.5 py-0.5 text-center text-[11px] font-extrabold uppercase tracking-wider text-amber-300">↕ Order</span>
          <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {moved.map((n) => { const p = side.xi.find((x) => x.id === n.playerId)!; return <span key={n.playerId} className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-semibold text-amber-100" title={`${p.name}: ${n.why}`}>{p.name.split(' ')[0]} <span className="text-amber-300/80">{n.why}</span></span> })}
          </div>
        </div>
      )}
      {bench.length > 0 && <div className="shrink-0 truncate text-[11px] text-slate-500" title={bench.map((p) => p.name).join(', ')}><b className="text-slate-400">Bench:</b> {bench.map((p) => p.name).join(', ')}</div>}
    </section>
  )
}

/**
 * Before the toss you see both team sheets, filling the screen so there is nothing to scroll. The coin sits in a
 * bar along the bottom: tap it, it spins, the toss is decided (and, if you won it, you choose to bat or bowl),
 * and then play begins.
 */
export function CoinToss({ sides, toss, onStart, mustChoose = false, onChoose, news = [], onCancel, mySide = null, tossed = false, onTossed, startXI, editable = [false, false], careerSquad = false, onSaveSquad }: {
  sides: [Side, Side]; toss: TossResult; onStart: () => void
  /** The toss winner is a person, who hasn't picked yet. */
  mustChoose?: boolean; onChoose?: (c: 'bat' | 'bowl') => void
  /** Changes the computer made to its XI. */
  news?: (NewsItem | string)[]
  /** Leave before a ball is bowled. Nothing is recorded. */
  onCancel?: () => void
  /** The side you manage in a career. */
  mySide?: 0 | 1 | null
  /** The coin has already been flipped (this match was left and came back to): show the result, no way out. */
  tossed?: boolean
  /** Called the moment the coin is flipped, so it is remembered. */
  onTossed?: () => void
  /** Who started in each XI when this screen opened: anything different now is shown as in or out. */
  startXI?: [string[], string[]]
  /** Which sides you may change the squad of before the toss. */
  editable?: [boolean, boolean]
  /** Squad changes are kept for the career (true) or only for this match. */
  careerSquad?: boolean
  onSaveSquad?: (side: 0 | 1, order: string[], captainId: string, keeperId: string | undefined) => void
}) {
  const [editing, setEditing] = useState<0 | 1 | null>(null)
  const [stage, setStage] = useState<'idle' | 'flipping' | 'done'>(tossed ? 'done' : 'idle')
  const caller = sides[toss.callerSide].team
  const winner = sides[toss.winnerSide].team
  const items = news.filter((n): n is NewsItem => typeof n !== 'string')

  const flip = () => {
    if (stage !== 'idle') return
    setStage('flipping')
    onTossed?.() // from here on the match can't be cancelled, even after a refresh
    sfx.coin()
    setTimeout(() => setStage('done'), 2400)
  }

  const mobile = useIsMobile()
  const [shown, setShown] = useState<0 | 1>(mySide ?? 0)

  const result = (
    <div className="min-w-0 flex-1">
      {stage === 'idle' && (
        <>
          <p className="text-sm text-slate-300"><span className="font-semibold text-white">{caller.name}</span> call <span className="font-semibold uppercase text-amber-300">{toss.call}</span>.</p>
          <p className="font-display text-2xl leading-tight tracking-wide text-amber-300">Tap the coin to toss</p>
        </>
      )}
      {stage === 'flipping' && <p className="text-lg text-slate-300">Flipping…</p>}
      {stage === 'done' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-sm text-slate-300">It's <span className="font-bold uppercase text-amber-300">{toss.coin}</span>.</p>
          <p className="text-base font-bold leading-tight" style={{ color: accentOf(winner) }}>
            {mustChoose && onChoose ? `${winner.name} won the toss. What will you do?` : `${winner.name} won the toss and chose to ${toss.decision === 'bat' ? 'bat first' : 'bowl first'}.`}
          </p>
        </motion.div>
      )}
    </div>
  )

  if (mobile) {
    return (
      <div className="fixed inset-0 z-30 flex flex-col bg-ink" style={{ paddingTop: 'var(--sat)' }}>
        <TipBanner id="toss" title="Time for the toss" lift={96}>Tap the coin to flip it. Want a different team? Press <b>Edit squad</b> first, because it locks once the coin is flipped.</TipBanner>
        <div className="flex shrink-0 items-center gap-2 px-3 pb-2 pt-2">
          <h1 className="font-display text-2xl tracking-wider text-white">TEAM SHEETS</h1>
          <span className="flex-1" />
          {onCancel && stage === 'idle' && !tossed && <button onClick={onCancel} className="rounded-full border border-line px-3.5 py-1.5 text-xs font-bold text-slate-300 active:bg-white/10">Cancel match</button>}
          {stage !== 'idle' && <span className="text-[11px] text-slate-500">No turning back</span>}
        </div>
        <div className="mx-3 mb-2 grid shrink-0 grid-cols-2 gap-1 rounded-2xl bg-panel p-1" role="tablist">
          {sides.map((s, i) => (
            <button key={s.team.id} role="tab" aria-selected={shown === i} onClick={() => setShown(i as 0 | 1)} className={`flex items-center justify-center gap-2 rounded-xl px-2 py-2 text-sm font-bold transition ${shown === i ? 'bg-indigo-500 text-white' : 'text-slate-300'}`}>
              <TeamLogo team={s.team} size={22} /><span className="truncate">{s.team.short}</span>{mySide === i && <span className="rounded bg-amber-400 px-1 text-[10px] font-extrabold text-black">YOU</span>}
            </button>
          ))}
        </div>
        <div className="mx-3 flex min-h-0 flex-1 flex-col [&>section]:flex-1">
          <TeamSheet key={shown} side={sides[shown]} mine={mySide === shown} news={items.filter((n) => n.teamId === sides[shown].team.id)} startXI={startXI?.[shown]} onEdit={editable[shown] && stage === 'idle' && !tossed && onSaveSquad ? () => setEditing(shown) : undefined} />
        </div>
        <div className="relative mt-2 flex shrink-0 items-center gap-3 border-t border-line bg-panel px-3 pt-2" style={{ paddingBottom: 'calc(var(--sab) + 10px)' }}>
          <div className="relative z-10 -mt-7 h-[76px] w-[76px] shrink-0">
            <button onClick={flip} disabled={stage !== 'idle'} aria-label="Flip the coin" className="block rounded-full active:scale-95"><Coin result={toss.coin} flipping={stage !== 'idle'} size={76} /></button>
          </div>
          {result}
          <div className="flex shrink-0 flex-col gap-1.5">
            {stage === 'done' && mustChoose && onChoose && (
              <>
                <button onClick={() => onChoose('bat')} className="rounded-full bg-emerald-500 px-4 py-2 font-display text-lg tracking-wide text-black active:bg-emerald-400">Bat first</button>
                <button onClick={() => onChoose('bowl')} className="rounded-full bg-sky-500 px-4 py-2 font-display text-lg tracking-wide text-black active:bg-sky-400">Bowl first</button>
              </>
            )}
            {stage === 'done' && !(mustChoose && onChoose) && <button onClick={onStart} className="rounded-full bg-indigo-500 px-6 py-3 font-display text-xl tracking-wide text-white active:bg-indigo-400">Play ball</button>}
          </div>
        </div>
        {editing !== null && onSaveSquad && (
          <SquadDialog team={sides[editing].team} scope={careerSquad ? 'for this career' : 'for this match only'} onClose={() => setEditing(null)} onSave={(order, cap, keep) => { onSaveSquad(editing, order, cap, keep); setEditing(null) }} />
        )}
      </div>
    )
  }

  return (
    // on a desktop screen this is exactly one screen tall; on a phone it simply flows and scrolls
    <div className="mx-auto flex max-w-6xl flex-col gap-3 md:h-[calc(100dvh-142px)] md:min-h-[520px]">
      <TipBanner id="toss" title="Time for the toss" lift={96}>Tap the coin to flip it. Want a different team? Press <b>Edit squad</b> first, because it locks once the coin is flipped.</TipBanner>
      <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-2">
        {sides.map((s, i) => <TeamSheet key={s.team.id} side={s} mine={mySide === i} news={items.filter((n) => n.teamId === s.team.id)} startXI={startXI?.[i]} onEdit={editable[i] && stage === 'idle' && !tossed && onSaveSquad ? () => setEditing(i as 0 | 1) : undefined} />)}
      </div>

      {/* the coin lives in a bar along the bottom */}
      <div className="relative flex shrink-0 flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-line bg-panel px-4 py-2.5">
        <div className="relative z-10 -my-1 h-[84px] w-[84px] shrink-0">
          <button onClick={flip} disabled={stage !== 'idle'} aria-label="Flip the coin" className={`block rounded-full ${stage === 'idle' ? 'cursor-pointer transition hover:scale-105' : 'cursor-default'}`}>
            <Coin result={toss.coin} flipping={stage !== 'idle'} size={84} />
          </button>
        </div>

        <div className="min-w-0 flex-1">
          {stage === 'idle' && (
            <>
              <p className="text-sm text-slate-300"><span className="font-semibold text-white">{caller.name}</span> call <span className="font-semibold uppercase text-amber-300">{toss.call}</span>.</p>
              <button onClick={flip} className="font-display text-2xl leading-tight tracking-wide text-amber-300 hover:text-amber-200">Flip the coin</button>
            </>
          )}
          {stage === 'flipping' && <p className="text-lg text-slate-300">Flipping…</p>}
          {stage === 'done' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <p className="text-sm text-slate-300">It's <span className="font-bold uppercase text-amber-300">{toss.coin}</span>.</p>
              <p className="truncate text-lg font-bold leading-tight" style={{ color: accentOf(winner) }}>
                {mustChoose && onChoose ? `${winner.name} won the toss. What will you do?` : `${winner.name} won the toss and chose to ${toss.decision === 'bat' ? 'bat first' : 'bowl first'}.`}
              </p>
            </motion.div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {stage === 'done' && mustChoose && onChoose && (
            <>
              <button onClick={() => onChoose('bat')} className="rounded-full bg-emerald-500 px-6 py-2 font-display text-xl tracking-wide text-black transition hover:bg-emerald-400">Bat first</button>
              <button onClick={() => onChoose('bowl')} className="rounded-full bg-sky-500 px-6 py-2 font-display text-xl tracking-wide text-black transition hover:bg-sky-400">Bowl first</button>
            </>
          )}
          {stage === 'done' && !(mustChoose && onChoose) && (
            <button onClick={onStart} className="rounded-full bg-indigo-500 px-7 py-2 font-display text-xl tracking-wide text-white transition hover:bg-indigo-400">Play ball</button>
          )}
          {onCancel && stage === 'idle' && !tossed && <button onClick={onCancel} title="Nothing is recorded and there is no penalty" className="rounded-full border border-line px-4 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-red-400 hover:text-red-200">Cancel match</button>}
          {stage !== 'idle' && <span className="hidden text-[11px] text-slate-500 lg:block">The toss is done. There's no turning back.</span>}
        </div>
      </div>
      {editing !== null && onSaveSquad && (
        <SquadDialog
          team={sides[editing].team}
          scope={careerSquad ? 'for this career' : 'for this match only'}
          onClose={() => setEditing(null)}
          onSave={(order, cap, keep) => { onSaveSquad(editing, order, cap, keep); setEditing(null) }}
        />
      )}
    </div>
  )
}
