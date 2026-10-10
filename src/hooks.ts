import { useEffect, useState } from 'react'

/** True on a phone: narrow (portrait), or short and wide (landscape). Updates when the window or orientation changes. */
export function useIsMobile(): boolean {
  const query = '(max-width: 767px), (max-height: 500px) and (orientation: landscape)'
  const [mobile, setMobile] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(query).matches : false))
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setMobile(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return mobile
}

/** True on a phone or small tablet held sideways (short and wide). */
export function useIsLandscapePhone(): boolean {
  const query = '(max-height: 500px) and (orientation: landscape)'
  const [v, setV] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(query).matches : false))
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setV(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return v
}

interface InstallEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

/** "Add to home screen": Android/Chrome offers a real prompt; iPhones need a hint, since Safari has no prompt. */
export function useInstall() {
  const [event, setEvent] = useState<InstallEvent | null>(null)
  const [installed, setInstalled] = useState(() => typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true))
  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setEvent(e as InstallEvent) }
    const onInstalled = () => { setInstalled(true); setEvent(null) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled) }
  }, [])
  const ios = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent) && !installed
  return {
    installed,
    /** Android/Chrome: a real install prompt is available. */
    canPrompt: !!event,
    /** iPhone/iPad Safari: show the Share, then Add to Home Screen steps. */
    ios,
    prompt: async () => { if (event) { await event.prompt(); await event.userChoice; setEvent(null) } },
  }
}

/** A short buzz on phones that support it (Android), for wickets and boundaries. A no-op elsewhere. */
export function haptic(pattern: number | number[] = 12) {
  try { if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern) } catch { /* not allowed here */ }
}
