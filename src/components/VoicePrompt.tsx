import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { allowVoice, declineVoice, useVoiceAsk } from '../audio/voice'
import { Sheet } from './Sheet'

/**
 * Asks before the game speaks aloud. Shown the first time the commentary is needed (it is on by default) and whenever someone turns it on again.
 * Phones only let a page speak after a tap, so "Allow" is also the tap that lets it; if the phone still refuses, the voices stay off and say why.
 */
export function VoicePrompt() {
  const ask = useVoiceAsk()
  const [busy, setBusy] = useState(false)
  return (
    <AnimatePresence>
      {ask.open && (
        <Sheet key="voice" label="Spoken commentary" onClose={declineVoice} z={90} size="sm">
          <div className="p-5">
            <div className="mb-1 text-[11px] font-extrabold uppercase tracking-widest text-amber-300">Spoken commentary</div>
            <h2 className="font-display text-2xl leading-tight tracking-wide text-white">Let the game talk?</h2>
            <p className="mt-2 text-sm leading-snug text-slate-300">
              {ask.mode === 'full' ? 'Two commentators will call every ball, and the studio show will speak its lines aloud.' : 'The studio show will speak its lines aloud.'} It uses the voices on your phone, and nothing is downloaded. Your phone needs to allow the sound, so tap <b className="text-white">Allow</b> and you should hear a line.
            </p>
            {ask.refused && <p className="mt-3 rounded-lg bg-red-500/15 px-3 py-2 text-[13px] leading-snug text-red-200">Your phone did not let the game speak. Check that the volume is up and the phone is not on silent, and that a text-to-speech voice is installed (Android: Settings, Languages, Text-to-speech output). The commentary stays off; you can try again from Controls, Voices.</p>}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={declineVoice} className="h-11 cursor-pointer rounded-xl border border-line text-sm font-bold text-slate-200 hover:border-slate-400">{ask.refused ? 'Close' : 'No thanks'}</button>
              <motion.button
                disabled={busy} onClick={async () => { setBusy(true); try { await allowVoice() } finally { setBusy(false) } }}
                className="h-11 cursor-pointer rounded-xl bg-indigo-500 font-display text-lg tracking-wide text-white disabled:opacity-60"
                animate={{ boxShadow: ['0 0 0 0 #6366f166', '0 0 0 10px #6366f100'] }} transition={{ duration: 1.4, repeat: Infinity }}
              >{busy ? 'Listening…' : ask.refused ? 'Try again' : 'Allow'}</motion.button>
            </div>
          </div>
        </Sheet>
      )}
    </AnimatePresence>
  )
}
