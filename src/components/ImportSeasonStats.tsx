import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { overall } from '../data/builders'
import { applyShifts } from '../season/progression'
import { useStore, useTeams } from '../store/useStore'
import { Delta, PlayerAvatar } from './ui'

/**
 * Copies the rating changes a career earned in a season onto the teams themselves, so those players start with
 * the new ratings everywhere (Play, new careers). Nothing happens until you confirm.
 */
export function ImportSeasonStats({ open, onClose }: { open: boolean; onClose: () => void }) {
  const sessions = useStore((s) => s.sessions)
  const activeId = useStore((s) => s.activeSessionId)
  const saveTeam = useStore((s) => s.saveTeam)
  const teams = useTeams()
  const [sessionId, setSessionId] = useState('')
  const [year, setYear] = useState<number | null>(null)
  const [done, setDone] = useState<number | null>(null)

  const session = sessions.find((s) => s.id === (sessionId || activeId || sessions[0]?.id))
  const seasons = useMemo(() => (session ? [...(session.history ?? []), session.season] : []), [session])
  const season = seasons.find((s) => s.year === year) ?? seasons[seasons.length - 1]

  useEffect(() => {
    if (!open) return
    setDone(null)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const preview = useMemo(() => {
    if (!season) return { teams: [] as { id: string; after: typeof teams[number] }[], rows: [] as { teamId: string; player: typeof teams[number]['players'][number]; team: typeof teams[number]; before: number; after: number }[] }
    const changed: { id: string; after: typeof teams[number] }[] = []
    const rows: { teamId: string; player: typeof teams[number]['players'][number]; team: typeof teams[number]; before: number; after: number }[] = []
    for (const t of teams) {
      if (!season.teamIds.includes(t.id)) continue
      const after = applyShifts(t, season.shifts)
      let any = false
      for (const p of after.players) {
        const b = t.players.find((x) => x.id === p.id)
        if (!b) continue
        const o0 = overall(b), o1 = overall(p)
        if (JSON.stringify(b.batting) !== JSON.stringify(p.batting) || JSON.stringify(b.bowling) !== JSON.stringify(p.bowling)) { any = true; rows.push({ teamId: t.id, player: p, team: t, before: o0, after: o1 }) }
      }
      if (any) changed.push({ id: t.id, after })
    }
    rows.sort((a, b) => Math.abs(b.after - b.before) - Math.abs(a.after - a.before))
    return { teams: changed, rows }
  }, [season, teams])

  const apply = () => {
    for (const c of preview.teams) saveTeam(c.after)
    setDone(preview.rows.length)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-black/75 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            role="dialog" aria-modal="true" aria-label="Import stats from a season"
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.94, y: 16, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
            className="my-auto w-full max-w-2xl rounded-3xl border border-line bg-ink p-6 shadow-2xl"
          >
            <h2 className="font-display text-3xl tracking-wide text-white">Import stats from a season</h2>
            <p className="mt-1 text-sm text-slate-300">Players' ratings move as a career is played. This copies the ratings a season ended with onto the teams themselves, so those players start that way in friendlies and new careers.</p>

            {sessions.length === 0 ? (
              <p className="mt-5 rounded-xl border border-dashed border-line p-6 text-center text-sm text-slate-400">There is no career yet. Play some matches in a career first.</p>
            ) : done !== null ? (
              <div className="mt-5 rounded-xl border border-emerald-500/50 bg-emerald-500/10 p-4 text-emerald-100">Done: {done} player{done === 1 ? '' : 's'} on {preview.teams.length} team{preview.teams.length === 1 ? '' : 's'} now have the ratings from that season. You can undo it for a team with "Reset to default" on its page.</div>
            ) : (
              <>
                <div className="mt-4 flex flex-wrap gap-3">
                  <label className="text-sm text-slate-300"><span className="mb-1 block text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Career</span>
                    <select value={session?.id ?? ''} onChange={(e) => { setSessionId(e.target.value); setYear(null) }} className="rounded-lg border border-line bg-panel px-3 py-2 text-sm text-white">
                      {sessions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </label>
                  <label className="text-sm text-slate-300"><span className="mb-1 block text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Season</span>
                    <select value={season?.year ?? ''} onChange={(e) => setYear(Number(e.target.value))} className="rounded-lg border border-line bg-panel px-3 py-2 text-sm text-white">
                      {[...seasons].reverse().map((s) => <option key={s.year} value={s.year}>{s.year}{s === session?.season ? ' (current)' : ''}</option>)}
                    </select>
                  </label>
                </div>

                {preview.rows.length === 0 ? (
                  <p className="mt-4 rounded-xl border border-dashed border-line p-6 text-center text-sm text-slate-400">No ratings have changed in that season yet.</p>
                ) : (
                  <div className="mt-4">
                    <div className="mb-1.5 text-sm text-slate-300"><b className="text-white">{preview.rows.length}</b> players on <b className="text-white">{preview.teams.length}</b> teams would change. The biggest moves:</div>
                    <div className="max-h-64 divide-y divide-line/60 overflow-y-auto rounded-xl border border-line bg-panel">
                      {preview.rows.slice(0, 20).map((r) => (
                        <div key={r.player.id} className="flex items-center gap-2.5 px-3 py-1.5 text-sm">
                          <PlayerAvatar player={r.player} team={r.team} size={26} />
                          <span className="min-w-0 flex-1 truncate font-semibold text-white">{r.player.name} <span className="font-normal text-slate-500">· {r.team.short}</span></span>
                          <span className="tabular-nums text-slate-400">{r.before}→<span className="text-white">{r.after}</span></span>
                          <span className="w-8 text-right"><Delta n={r.after - r.before} /></span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-amber-200/90">This edits the teams. Careers you've already started keep adding their own changes on top of these ratings, so avoid importing a career's season back into that same career. Each edited team has "Reset to default" if you change your mind.</p>
                  </div>
                )}
              </>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button onClick={onClose} className="rounded-full border border-line px-4 py-2 text-sm text-slate-300 hover:border-slate-500">{done !== null ? 'Close' : 'Cancel'}</button>
              {done === null && <button disabled={preview.rows.length === 0} onClick={apply} className="rounded-full bg-indigo-500 px-6 py-2 font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-40">Apply to my teams</button>}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
