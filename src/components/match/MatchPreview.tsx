import { motion } from 'framer-motion'
import { overall, teamStrength } from '../../data/builders'
import type { Side } from '../../engine/types'
import { edgeText, keyPlayers, type HeadToHead, type Played, rivalryLine } from '../../season/preview'
import { PlayerAvatar, RatingBadge, accentOf } from '../ui'
import { TeamLogo } from '../season/Details'

const FORM_COLOR = { W: '#34d399', L: '#f87171', T: '#fbbf24' } as const

function Side({ side, mine, form, names, delay }: { side: Side; mine: boolean; form: Played[] | null; names: (id: string) => string; delay: number }) {
  const team = side.team
  const accent = accentOf(team)
  const { bat, bowl } = keyPlayers(side.xi)
  return (
    <motion.section className="rounded-2xl border bg-panel p-3" style={{ borderColor: `${accent}77`, background: `linear-gradient(120deg, ${accent}22, #10131c 65%)` }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.4 }}>
      <div className="flex items-center gap-3">
        <TeamLogo team={team} size={46} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><h2 className="truncate font-display text-2xl leading-none tracking-wide text-white">{team.name}</h2>{mine && <span className="rounded bg-amber-400 px-1.5 text-[11px] font-extrabold text-black">YOU</span>}</div>
          {form && (
            <div className="mt-1.5 flex items-center gap-1.5" aria-label="Last results">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Form</span>
              {form.length === 0 ? <span className="text-[11px] text-slate-500">no matches yet</span> : form.map((m, i) => (
                <span key={i} title={`${m.result === 'W' ? 'Won' : m.result === 'L' ? 'Lost' : 'Tied'} against ${names(m.vs)}`} className="grid h-5 w-5 place-items-center rounded-full text-[11px] font-extrabold text-black" style={{ background: FORM_COLOR[m.result] }}>{m.result}</span>
              ))}
            </div>
          )}
        </div>
        <div className="text-center" title="Average rating of the XI"><RatingBadge value={teamStrength({ ...team, players: side.xi })} size="md" /></div>
      </div>
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        {([['Top bat', bat], ['Top bowler', bowl]] as const).map(([label, p]) => (
          <div key={label} className="flex items-center gap-2 rounded-xl bg-black/30 p-1.5">
            {p ? <PlayerAvatar profile player={p} team={team} size={34} /> : <span className="h-[34px] w-[34px]" />}
            <div className="min-w-0 leading-tight">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
              <div className="truncate text-[13px] font-semibold text-white">{p ? p.name : 'none'}</div>
            </div>
            {p && <span className="ml-auto"><RatingBadge value={overall(p)} size="sm" /></span>}
          </div>
        ))}
      </div>
    </motion.section>
  )
}

/** The screen before the toss: who is playing, how they have been doing, how they have got on against each other before. */
export function MatchPreview({ sides, mySide, subtitle, forms, h2h, extra, onNext, onCancel }: {
  sides: [Side, Side]; mySide: 0 | 1 | null; subtitle: string
  /** Each side's last results (a career only). */
  forms: [Played[], Played[]] | null
  /** Their past meetings (a career only). */
  h2h: HeadToHead | null
  /** Anything else to show under the versus line, such as the pitch. */
  extra?: React.ReactNode
  onNext: () => void
  onCancel?: () => void
}) {
  const [a, b] = sides
  const names = (id: string) => (id === a.team.id ? a.team.name : id === b.team.id ? b.team.name : id)
  const line = h2h ? rivalryLine(h2h, a.team.name, b.team.name) : null
  const edge = edgeText(a.team.name, teamStrength({ ...a.team, players: a.xi }), b.team.name, teamStrength({ ...b.team, players: b.xi }))
  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-ink" style={{ paddingTop: 'var(--sat)' }}>
      <div className="flex shrink-0 items-center gap-2 px-3 pb-1 pt-3">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-extrabold uppercase tracking-widest text-amber-300">Match preview</div>
          <div className="truncate text-sm text-slate-300">{subtitle}</div>
        </div>
        {onCancel && <button onClick={onCancel} className="rounded-full border border-line px-3.5 py-1.5 text-xs font-bold text-slate-300 active:bg-white/10">Cancel match</button>}
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-3 pb-3"><div className="my-auto space-y-3">
        <Side side={a} mine={mySide === 0} form={forms ? forms[0] : null} names={names} delay={0.05} />
        <motion.div className="mx-auto max-w-md py-1 text-center" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, type: 'spring', stiffness: 220, damping: 16 }}>
          <div className="font-display text-4xl leading-none tracking-widest text-white" style={{ textShadow: '0 0 24px #818cf8' }}>VS</div>
          {h2h && h2h.last.length > 0 && (
            <div className="mt-1.5 flex items-center justify-center gap-1.5" aria-label="Recent meetings">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Last {h2h.last.length}</span>
              {h2h.last.map((w, i) => <span key={i} className="grid h-5 w-5 place-items-center rounded-full text-[11px] font-extrabold text-black" style={{ background: w === 't' ? '#fbbf24' : accentOf(w === 'a' ? a.team : b.team) }}>{w === 'a' ? a.team.short.slice(0, 1) : w === 'b' ? b.team.short.slice(0, 1) : 'T'}</span>)}
            </div>
          )}
          {line && <p className="mt-1.5 text-sm font-semibold text-amber-200">{line}</p>}
          <p className="mt-0.5 text-sm text-slate-300">{edge}</p>
          {extra && <div className="mt-2">{extra}</div>}
        </motion.div>
        <Side side={b} mine={mySide === 1} form={forms ? forms[1] : null} names={names} delay={0.15} />
      </div></div>
      <div className="shrink-0 border-t border-line bg-panel px-3 pt-2" style={{ paddingBottom: 'calc(var(--sab) + 10px)' }}>
        <button onClick={onNext} className="w-full rounded-full border-2 border-amber-200 bg-gradient-to-b from-amber-300 to-amber-500 px-6 py-3 font-display text-2xl leading-none tracking-wide text-black shadow-[0_0_18px_rgba(251,191,36,.45)] active:brightness-95">Team sheets and toss</button>
      </div>
    </div>
  )
}
