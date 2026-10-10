import { AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router'
import { paths } from '../routes'
import { closeHelp, resetTips, useHelpOpen } from '../tips'
import { Sheet } from './Sheet'

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

const STEPS: { icon: React.ReactNode; color: string; title: string; text: string }[] = [
  {
    color: '#818cf8', title: 'Pick your team',
    text: 'Start a Career and choose a team. You look after them for the whole season.',
    icon: <svg width="26" height="26" viewBox="0 0 24 24" {...stroke}><path d="M12 3 4 6v6c0 5 3.4 8 8 9 4.6-1 8-4 8-9V6z" /><path d="m9 12 2 2 4-4" /></svg>,
  },
  {
    color: '#34d399', title: 'Play your matches',
    text: 'Open Career, then Calendar, and tap the gold PLAY button. In a match tap NEXT BALL to play one ball, or the double arrow to let it play by itself.',
    icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z" /></svg>,
  },
  {
    color: '#fbbf24', title: 'Skip ahead when you like',
    text: 'The Skip buttons play every other team\'s matches for you. They always stop just before one of yours.',
    icon: <svg width="26" height="26" viewBox="0 0 24 24" {...stroke}><path d="M5 5l8 7-8 7zM15 5v14M19 5v14" /></svg>,
  },
  {
    color: '#38bdf8', title: 'Make choices',
    text: 'Before the toss you can change your team with Edit squad. In a match, the gear button has tactics: how hard to hit, and who bowls.',
    icon: <svg width="26" height="26" viewBox="0 0 24 24" {...stroke}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>,
  },
  {
    color: '#f472b6', title: 'Watch your stars grow',
    text: 'Players who play well get better after every match, and you will see a green +. Tap any face to see a player\'s numbers.',
    icon: <svg width="26" height="26" viewBox="0 0 24 24" {...stroke}><path d="M3 17l6-6 4 4 8-8M15 7h6v6" /></svg>,
  },
  {
    color: '#fb923c', title: 'Win trophies',
    text: 'Win matches, climb the tables and lift trophies. When the season ends, start the next year and keep going.',
    icon: <svg width="26" height="26" viewBox="0 0 24 24" {...stroke}><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" /></svg>,
  },
]

/** A friendly, picture-led "how do I play this?" that opens from the ? button anywhere in the app. */
export function HowToPlay() {
  const open = useHelpOpen()
  const navigate = useNavigate()
  return (
    <AnimatePresence>
      {open && (
        <Sheet label="How to play" onClose={closeHelp} z={95} size="md">
          <div className="p-5 md:p-6">
            <h2 className="font-display text-4xl tracking-wide text-white">How to play</h2>
            <p className="mb-4 text-slate-300">Six easy steps. You can always come back to this with the <b className="text-white">?</b> button.</p>
            <ol className="space-y-3">
              {STEPS.map((s, i) => (
                <li key={s.title} className="flex gap-3.5 rounded-2xl border border-line bg-panel p-3.5">
                  <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl" style={{ background: `${s.color}22`, color: s.color }}>
                    {s.icon}
                    <span className="absolute -left-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-ink text-[11px] font-extrabold text-white ring-1 ring-line">{i + 1}</span>
                  </span>
                  <div className="min-w-0">
                    <div className="font-display text-xl tracking-wide text-white">{s.title}</div>
                    <p className="text-sm leading-snug text-slate-300">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button onClick={() => { closeHelp(); navigate(paths.newSession) }} className="cta-pulse rounded-full bg-emerald-500 px-6 py-3 font-display text-xl tracking-wide text-black active:bg-emerald-400">Start a career</button>
              <button onClick={() => { resetTips(); closeHelp() }} className="rounded-full border border-line px-6 py-3 text-sm font-semibold text-slate-200 hover:border-slate-400" title="Show the little pop-up tips again as you go">Show the tips again</button>
            </div>
          </div>
        </Sheet>
      )}
    </AnimatePresence>
  )
}
