import { AnimatePresence } from 'framer-motion'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Sheet } from '../components/Sheet'
import { useLevel } from '../components/LevelBadge'
import { BRANCHES, canTake, COST, MAX_LEVEL, NODE_BY_ID, NODES, type TreeNode } from '../data/passiveTree'
import { dropPerk, respec, respecCost, takePerk } from '../season/level'
import { selectSeason, useStore } from '../store/useStore'
import { paths } from '../routes'

const ROW = 108
const LANE_X = [17, 50, 83]
const SIZE = { s: 54, n: 64, k: 76 }
const KIND_NAME = { s: 'Small perk', n: 'Notable perk', k: 'Keystone' }

/** The passive tree: pick a role, climb its ladder, tap a perk for its card. Points come from your career level. */
export function TreePage() {
  const season = useStore(selectSeason)
  const updateSeason = useStore((s) => s.updateSeason)
  const lv = useLevel()
  const [branch, setBranch] = useState<string | null>(null)
  const [open, setOpen] = useState<TreeNode | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const perks = season?.market?.club?.perks ?? []
  const taken = useMemo(() => new Set(perks), [perks])
  if (!season || !lv) return <p className="text-slate-300">Start a career to grow your tree.</p>
  const points = lv.points
  const b = BRANCHES.find((x) => x.id === branch)
  const say = (error?: string) => setNote(error ?? null)
  const take = (node: TreeNode) => { const out = takePerk(season, node.id, lv.level); say(out.error); if (!out.error) updateSeason(() => out.season) }
  const remove = (node: TreeNode) => { const out = dropPerk(season, node.id); say(out.error); if (!out.error) updateSeason(() => out.season) }
  const cost = respecCost(season)
  const doRespec = () => {
    if (perks.length === 0 || !window.confirm(cost === 0 ? 'Take back every perk? This first reset is free.' : `Take back every perk for ${cost} coins?`)) return
    const out = respec(season)
    say(out.error)
    if (!out.error) updateSeason(() => out.season)
  }

  return (
    <div className="pb-24">
      <header className="mb-3 rounded-2xl border border-violet-400/30 bg-panel px-3.5 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-widest text-violet-300">Passive tree</div>
            <h2 className="font-display text-3xl leading-none tracking-wide text-white">Level {lv.level}<span className="text-base text-slate-500"> / {MAX_LEVEL}</span></h2>
          </div>
          <div className="text-right">
            <div className="font-display text-3xl leading-none text-amber-300">{points}</div>
            <div className="text-[11px] text-slate-400">points to spend</div>
          </div>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/40" aria-label="Progress to the next level"><div className="h-full rounded-full bg-violet-400" style={{ width: `${lv.pct * 100}%` }} /></div>
        <p className="mt-1.5 text-[11px] leading-snug text-slate-400">{lv.maxed ? 'Top level reached.' : `${lv.into} / ${lv.need} XP to level ${lv.level + 1}.`} You earn XP from matches played (20), wins (30 more), finished seasons (150) and building your club. Perks belong to a role: whoever plays it in your XI gets the benefit. Extra points at levels 10, 20, 30, 40, 50 and 60.</p>
        <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
          <button disabled={perks.length === 0} className="cursor-pointer rounded-full border border-line px-3 py-1.5 text-slate-200 disabled:cursor-not-allowed disabled:opacity-40" onClick={doRespec}>Reset perks{cost > 0 ? ` · ${cost}` : ' · free once'}</button>
          <Link to={paths.club} className="cursor-pointer rounded-full border border-line px-3 py-1.5 text-sky-300">Club ›</Link>
        </div>
        {note && <p role="status" className="mt-2 rounded-lg bg-rose-500/10 px-2.5 py-1.5 text-xs text-rose-200">{note}</p>}
      </header>

      {!b && (
        <>
          <p className="mb-2 px-1 text-xs text-slate-300">Pick the part of the game you love. Each role has its own ladder of perks.</p>
          <div className="grid grid-cols-2 gap-2.5">
            {BRANCHES.map((br) => {
              const all = NODES.filter((x) => x.branch === br.id)
              const mine = all.filter((x) => taken.has(x.id))
              return (
                <button key={br.id} onClick={() => setBranch(br.id)} className={`cursor-pointer rounded-2xl border bg-panel p-3 text-left transition active:scale-[0.98] ${BRANCHES.length % 2 === 1 && br.id === BRANCHES[BRANCHES.length - 1].id ? "col-span-2" : ""}`} style={{ borderColor: `${br.color}66`, boxShadow: mine.length ? `inset 0 0 24px ${br.color}22` : undefined }}>
                  <div className="text-3xl" aria-hidden>{br.icon}</div>
                  <div className="mt-1 font-display text-xl leading-none tracking-wide text-white">{br.name}</div>
                  <div className="mt-1 text-[11px] leading-snug text-slate-400">{br.who}</div>
                  <div className="mt-2 flex items-center gap-1.5">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/40"><div className="h-full rounded-full" style={{ width: `${(mine.length / all.length) * 100}%`, background: br.color }} /></div>
                    <span className="text-[11px] font-bold tabular-nums text-slate-300">{mine.length}/{all.length}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}

      {b && (
        <>
          <div className="sticky top-0 z-10 -mx-1 mb-2 flex items-center gap-2 bg-[#0b0e15]/90 px-1 py-2 backdrop-blur">
            <button onClick={() => setBranch(null)} className="cursor-pointer rounded-full border border-line px-3.5 py-2 text-xs font-bold text-slate-200">‹ All roles</button>
            <div className="min-w-0 flex-1 truncate font-display text-xl tracking-wide text-white"><span aria-hidden>{b.icon}</span> {b.name}</div>
            <span className="rounded-full bg-black/40 px-2.5 py-1 text-xs font-bold text-amber-300">{points} pts</span>
          </div>
          <Ladder branch={b.id} color={b.color} taken={taken} points={points} onOpen={setOpen} />
        </>
      )}

      <AnimatePresence>
        {open && (
          <Sheet label={open.name} onClose={() => setOpen(null)} size="sm">
            <div className="p-4">
              <div className="text-[11px] font-extrabold uppercase tracking-widest" style={{ color: BRANCHES.find((x) => x.id === open.branch)?.color }}>{KIND_NAME[open.kind]} · {COST[open.kind]} point{COST[open.kind] > 1 ? 's' : ''}</div>
              <h3 className="font-display text-3xl leading-none tracking-wide text-white">{open.name}</h3>
              <p className="mt-2 text-sm leading-snug text-slate-200">{open.text}</p>
              {open.real && <p className="mt-2 rounded-xl bg-black/30 px-3 py-2 text-xs leading-snug text-slate-300">What it really does: {open.real}</p>}
              {open.req.length > 0 && <p className="mt-2 text-xs text-slate-400">Needs one of: {open.req.map((r) => NODE_BY_ID.get(r)?.name).join(' or ')}</p>}
              <div className="mt-4 flex gap-2">
                {taken.has(open.id) ? (
                  <button onClick={() => { remove(open); setOpen(null) }} className="flex-1 cursor-pointer rounded-full border border-line py-3 text-sm font-bold text-slate-200">Take it back</button>
                ) : (
                  <button disabled={!canTake(open, taken) || points < COST[open.kind]} onClick={() => { take(open); setOpen(null) }} className="flex-1 cursor-pointer rounded-full bg-amber-400 py-3 text-sm font-extrabold text-black disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">
                    {!canTake(open, taken) ? 'Take a connected perk first' : points < COST[open.kind] ? `Needs ${COST[open.kind]} points` : `Take · ${COST[open.kind]} pt`}
                  </button>
                )}
                <button onClick={() => setOpen(null)} className="cursor-pointer rounded-full border border-line px-5 py-3 text-sm font-bold text-slate-200">Close</button>
              </div>
            </div>
          </Sheet>
        )}
      </AnimatePresence>
    </div>
  )
}

function Ladder({ branch, color, taken, points, onOpen }: { branch: string; color: string; taken: ReadonlySet<string>; points: number; onOpen: (n: TreeNode) => void }) {
  const nodes = NODES.filter((x) => x.branch === branch)
  const rows = Math.max(...nodes.map((x) => x.row)) + 1
  const pos = (x: TreeNode) => ({ x: LANE_X[x.lane] * 3, y: x.row * ROW + ROW / 2 })
  return (
    <div className="relative mx-auto w-full max-w-md" style={{ height: rows * ROW }}>
      <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 300 ${rows * ROW}`} preserveAspectRatio="none" aria-hidden>
        {nodes.flatMap((x) => x.req.map((r) => {
          const a = pos(NODE_BY_ID.get(r) as TreeNode), c = pos(x)
          const on = taken.has(r) && taken.has(x.id)
          const live = taken.has(r)
          return <line key={`${r}-${x.id}`} x1={a.x} y1={a.y} x2={c.x} y2={c.y} stroke={on ? color : live ? `${color}99` : '#334155'} strokeWidth={on ? 4 : 2.5} strokeDasharray={on ? undefined : '5 5'} vectorEffect="non-scaling-stroke" />
        }))}
      </svg>
      {nodes.map((x) => {
        const have = taken.has(x.id)
        const can = canTake(x, taken)
        const size = SIZE[x.kind]
        const afford = points >= COST[x.kind]
        return (
          <div key={x.id} className="absolute flex w-[30%] -translate-x-1/2 -translate-y-1/2 flex-col items-center" style={{ left: `${LANE_X[x.lane]}%`, top: x.row * ROW + ROW / 2 }}>
            <button
              onClick={() => onOpen(x)} aria-label={`${x.name}, ${have ? 'taken' : can ? 'available' : 'locked'}`}
              className={`grid cursor-pointer place-items-center transition active:scale-95 ${x.kind === 'k' ? 'rotate-45 rounded-2xl' : x.kind === 'n' ? 'rounded-2xl' : 'rounded-full'} ${can && afford && !have ? 'animate-pulse' : ''}`}
              style={{ width: size, height: size, background: have ? color : '#0f131c', border: `3px solid ${have ? '#fff' : can ? color : '#334155'}`, boxShadow: have ? `0 0 18px ${color}aa` : can && afford ? `0 0 12px ${color}66` : undefined, opacity: have || can ? 1 : 0.55 }}
            >
              <span className={x.kind === 'k' ? '-rotate-45' : ''} style={{ color: have ? '#0b0e15' : can ? color : '#64748b', fontWeight: 800, fontSize: x.kind === 'k' ? 20 : 16 }}>{have ? '✓' : COST[x.kind]}</span>
            </button>
            <span className={`mt-1.5 text-center text-[11px] font-bold leading-tight ${have ? 'text-white' : can ? 'text-slate-200' : 'text-slate-500'}`}>{x.name}</span>
          </div>
        )
      })}
    </div>
  )
}
