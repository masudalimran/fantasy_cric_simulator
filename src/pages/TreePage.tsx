import { AnimatePresence } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Sheet } from '../components/Sheet'
import { BRANCHES, canTake, COST, MAX_LEVEL, NODE_BY_ID, NODES, pointsAt, xpFor, type TreeNode } from '../data/passiveTree'
import { paths } from '../routes'

const KEY = 'fcs.treeproto'
const ROW = 108
const LANE_X = [17, 50, 83]
const SIZE = { s: 54, n: 64, k: 76 }
const KIND_NAME = { s: 'Small perk', n: 'Notable perk', k: 'Keystone' }

interface Saved { level: number; taken: string[] }
function load(): Saved { try { return { level: 1, taken: [], ...(JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Saved>) } } catch { return { level: 1, taken: [] } } }

/** A prototype of the passive tree for phones: pick a role, climb its ladder, tap a perk for its card. Not wired to the match engine yet. */
export function TreePage() {
  const [saved, setSaved] = useState<Saved>(load)
  const [branch, setBranch] = useState<string | null>(null)
  const [open, setOpen] = useState<TreeNode | null>(null)
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(saved)) } catch { /* private mode */ } }, [saved])
  const taken = useMemo(() => new Set(saved.taken), [saved.taken])
  const spent = saved.taken.reduce((n, id) => n + COST[NODE_BY_ID.get(id)?.kind ?? 's'], 0)
  const points = pointsAt(saved.level) - spent
  const b = BRANCHES.find((x) => x.id === branch)
  const take = (node: TreeNode) => { if (points >= COST[node.kind] && canTake(node, taken)) setSaved({ ...saved, taken: [...saved.taken, node.id] }) }
  const remove = (node: TreeNode) => {
    // a perk can only be taken back when nothing taken depends only on it
    const rest = new Set(saved.taken.filter((x) => x !== node.id))
    const ok = [...rest].every((id) => { const t = NODE_BY_ID.get(id) as TreeNode; return t.row === 0 || t.req.some((r) => rest.has(r)) })
    if (ok) setSaved({ ...saved, taken: [...rest] })
  }

  return (
    <div className="pb-24">
      <header className="mb-3 rounded-2xl border border-violet-400/30 bg-panel px-3.5 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-widest text-violet-300">Passive tree · prototype</div>
            <h2 className="font-display text-3xl leading-none tracking-wide text-white">Level {saved.level}<span className="text-base text-slate-500"> / {MAX_LEVEL}</span></h2>
          </div>
          <div className="text-right">
            <div className="font-display text-3xl leading-none text-amber-300">{points}</div>
            <div className="text-[11px] text-slate-400">points to spend</div>
          </div>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/40" aria-label="Progress to the next level"><div className="h-full rounded-full bg-violet-400" style={{ width: '40%' }} /></div>
        <p className="mt-1.5 text-[11px] text-slate-400">The next level needs {xpFor(saved.level)} XP. Perks belong to a role: whoever plays it in your XI gets the benefit.</p>
        <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
          <button className="cursor-pointer rounded-full border border-line px-3 py-1.5 text-slate-200" onClick={() => setSaved({ ...saved, level: Math.min(MAX_LEVEL, saved.level + 1) })}>Prototype: +1 level</button>
          <button className="cursor-pointer rounded-full border border-line px-3 py-1.5 text-slate-200" onClick={() => setSaved({ ...saved, level: Math.min(MAX_LEVEL, saved.level + 10) })}>+10 levels</button>
          <button className="cursor-pointer rounded-full border border-line px-3 py-1.5 text-slate-200" onClick={() => setSaved({ level: 1, taken: [] })}>Reset</button>
          <Link to={paths.club} className="cursor-pointer rounded-full border border-line px-3 py-1.5 text-sky-300">Club ›</Link>
        </div>
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
