import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { ConfirmDialog } from '../components/ConfirmDialog'
import {
  applyBackup, backupFileName, buildBackup, isEmpty, parseBackup, summarize,
  type BackupData, type BackupSummary, type ImportMode, type ImportReport,
} from '../data/backup'
import { paths } from '../routes'
import { useStore } from '../store/useStore'

/** What's on this device right now, in the shape a backup file stores it. */
function currentData(): BackupData {
  const s = useStore.getState()
  return { customTeams: s.customTeams, overrides: s.overrides, sessions: s.sessions, activeSessionId: s.activeSessionId, liveMatch: s.liveMatch }
}

function Summary({ s }: { s: BackupSummary }) {
  const rows: string[] = []
  for (const x of s.sessions) rows.push(`Session “${x.name}” (${x.year}): ${x.played} of ${x.total} matches played`)
  if (s.customTeams) rows.push(`${s.customTeams} team${s.customTeams > 1 ? 's' : ''} you created`)
  if (s.editedTeams) rows.push(`${s.editedTeams} built-in team${s.editedTeams > 1 ? 's' : ''} you edited (players, ratings, logos)`)
  if (s.liveMatch) rows.push(`A match in progress: ${s.liveMatch.teams} (${s.liveMatch.format})`)
  if (!rows.length) rows.push('Nothing yet')
  return <ul className="space-y-1 text-sm text-slate-200">{rows.map((r) => <li key={r} className="flex gap-2"><span className="text-emerald-400">•</span>{r}</li>)}</ul>
}

const card = 'rounded-2xl border border-line bg-panel p-5'

export function BackupPage() {
  // re-render when the stored data changes, so the summary stays current
  useStore((s) => s.sessions)
  useStore((s) => s.customTeams)
  useStore((s) => s.overrides)
  useStore((s) => s.liveMatch)
  const now = currentData()

  const fileInput = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState('')
  const [parsed, setParsed] = useState<ReturnType<typeof parseBackup> | null>(null)
  const [mode, setMode] = useState<ImportMode>('merge')
  const [askReplace, setAskReplace] = useState(false)
  const [done, setDone] = useState<{ report: ImportReport; mode: ImportMode } | null>(null)
  const [downloaded, setDownloaded] = useState<string | null>(null)

  const doExport = () => {
    const stamp = new Date()
    const text = JSON.stringify(buildBackup(currentData(), stamp))
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = backupFileName(stamp)
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
    setDownloaded(a.download)
  }

  const readFile = async (file: File | undefined) => {
    setDone(null)
    if (!file) return
    setFileName(file.name)
    if (file.size > 80 * 1024 * 1024) { setParsed({ ok: false, error: 'That file is far too big to be a backup.' }); return }
    setParsed(parseBackup(await file.text()))
  }

  const runImport = () => {
    if (!parsed || !parsed.ok) return
    const { next, report } = applyBackup(currentData(), parsed.backup.data, mode)
    useStore.setState(next)
    setDone({ report, mode })
    setParsed(null)
    setFileName('')
    if (fileInput.current) fileInput.current.value = ''
  }

  const btn = 'inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-40'

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-5xl tracking-wide">Backup & transfer</h1>
      <p className="mb-6 mt-1 text-sm text-slate-400">
        Everything in the game is saved in this browser on this device. A backup file lets you keep a safe copy, or carry your teams, sessions and results to another device.
      </p>

      {/* EXPORT */}
      <section className={card}>
        <h2 className="font-display text-3xl tracking-wide text-emerald-300">Export</h2>
        <p className="mb-3 text-sm text-slate-400">Saves all of this into one file:</p>
        <Summary s={summarize(now)} />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button onClick={doExport} disabled={isEmpty(now)} className={`${btn} bg-emerald-500 text-black hover:bg-emerald-400`}>
            <svg className="mr-2" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v11m0 0 4-4m-4 4-4-4M5 20h14" /></svg>
            Download backup
          </button>
          {isEmpty(now) && <span className="text-sm text-slate-400">Nothing to back up yet. Create a session or edit a team first.</span>}
          {downloaded && <span className="text-sm text-emerald-300">Saved as {downloaded}. Check your Downloads folder.</span>}
        </div>
        <p className="mt-3 text-xs text-slate-500">Only image links you pasted travel with the backup. Portrait files stored with the game aren't part of it.</p>
      </section>

      {/* IMPORT */}
      <section className={`${card} mt-5`}>
        <h2 className="font-display text-3xl tracking-wide text-sky-300">Import</h2>
        <p className="mb-3 text-sm text-slate-400">Pick a backup file from this game. Nothing changes until you confirm.</p>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); void readFile(e.dataTransfer.files[0]) }}
          className={`grid place-items-center rounded-2xl border-2 border-dashed p-8 text-center transition ${dragging ? 'border-sky-400 bg-sky-400/10' : 'border-line'}`}
        >
          <p className="text-sm text-slate-300">Drop a backup file here, or</p>
          <button onClick={() => fileInput.current?.click()} className={`${btn} mt-2 border border-line bg-panel-2 text-white hover:border-sky-400`}>Choose a file…</button>
          <input ref={fileInput} type="file" accept=".json,application/json" className="hidden" onChange={(e) => void readFile(e.target.files?.[0])} />
          {fileName && <p className="mt-2 text-xs text-slate-400">{fileName}</p>}
        </div>

        {parsed && !parsed.ok && <div className="mt-4 rounded-xl border border-red-500/60 bg-red-950/30 p-4 text-sm text-red-100"><b>Can't import this file.</b> {parsed.error}</div>}

        {parsed && parsed.ok && (
          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-line bg-panel-2 p-4">
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                In this file{parsed.backup.exportedAt && <span className="font-normal normal-case"> · saved {new Date(parsed.backup.exportedAt).toLocaleString()}</span>}
              </div>
              <Summary s={parsed.summary} />
              {parsed.skipped.length > 0 && <p className="mt-3 text-xs text-amber-300">Left out because they weren't valid: {parsed.skipped.join('; ')}.</p>}
            </div>

            <fieldset className="space-y-2">
              <legend className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">How to bring it in</legend>
              {([
                ['merge', 'Add to what is on this device (recommended)', 'Keeps everything you have now and adds what is new. Nothing is overwritten: a session with the same name comes in as a separate copy.'],
                ['replace', 'Replace everything on this device', 'Makes this device match the file exactly. Anything here that is not in the file is lost.'],
              ] as const).map(([v, title, text]) => (
                <label key={v} className={`flex cursor-pointer gap-3 rounded-xl border-2 p-3 transition ${mode === v ? (v === 'replace' ? 'border-red-400/70 bg-red-500/10' : 'border-sky-400 bg-sky-400/10') : 'border-line hover:border-slate-500'}`}>
                  <input type="radio" name="mode" checked={mode === v} onChange={() => setMode(v)} className="mt-1" />
                  <span><span className="block text-sm font-bold text-white">{title}</span><span className="block text-xs text-slate-300">{text}</span></span>
                </label>
              ))}
            </fieldset>

            <div className="flex flex-wrap items-center gap-3">
              <button onClick={() => (mode === 'replace' && !isEmpty(now) ? setAskReplace(true) : runImport())} className={`${btn} ${mode === 'replace' ? 'bg-red-500 text-white hover:bg-red-400' : 'bg-sky-400 text-black hover:bg-sky-300'}`}>
                {mode === 'replace' ? 'Replace and import' : 'Import'}
              </button>
              <button onClick={() => { setParsed(null); setFileName(''); if (fileInput.current) fileInput.current.value = '' }} className={`${btn} border border-line text-slate-200 hover:border-slate-400`}>Cancel</button>
            </div>
          </div>
        )}

        {done && (
          <div className="mt-4 rounded-xl border border-emerald-500/60 bg-emerald-950/30 p-4 text-sm text-emerald-100">
            <b>Imported.</b>{' '}
            {done.mode === 'replace' ? 'This device now matches the backup.' : [
              `${done.report.sessionsAdded} session${done.report.sessionsAdded === 1 ? '' : 's'} added`,
              `${done.report.teamsAdded} team${done.report.teamsAdded === 1 ? '' : 's'} added`,
              `${done.report.editsAdded} team edit${done.report.editsAdded === 1 ? '' : 's'} added`,
              done.report.teamsKept + done.report.editsKept ? `${done.report.teamsKept + done.report.editsKept} already here, so yours were kept` : '',
              done.report.liveMatch === 'taken' ? 'match in progress brought over' : done.report.liveMatch === 'kept' ? 'a match in progress was not brought over because you already have one' : '',
            ].filter(Boolean).join(', ') + '.'}
            <div className="mt-2 flex gap-4"><Link to={paths.sessions} className="font-semibold text-emerald-300 hover:underline">Go to sessions</Link><Link to={paths.teams} className="font-semibold text-emerald-300 hover:underline">Go to teams</Link></div>
          </div>
        )}
      </section>

      <ConfirmDialog open={askReplace} tone="danger" title="Replace everything?" confirmLabel="Yes, replace" cancelLabel="Keep what I have" onCancel={() => setAskReplace(false)} onConfirm={() => { setAskReplace(false); runImport() }}>
        <p>This device will end up exactly as the backup says. What you have now:</p>
        <div className="rounded-lg bg-black/25 p-3"><Summary s={summarize(now)} /></div>
        <p className="text-xs text-slate-400">Anything there that isn't in the backup will be gone. If you're unsure, download a backup of this device first.</p>
      </ConfirmDialog>
    </div>
  )
}
