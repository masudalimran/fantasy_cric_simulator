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

/** Holds the screen on (Screen Wake Lock) while the app is showing, so a phone doesn't dim in the middle of a match. */
export function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let stopped = false
    const grab = async () => {
      if (stopped || document.visibilityState !== 'visible' || lock) return
      try {
        lock = await navigator.wakeLock.request('screen')
        lock.addEventListener('release', () => { lock = null })
      } catch { /* refused (low battery, unsupported): nothing to do */ }
    }
    void grab()
    const onVisible = () => { void grab() } // the lock is dropped when the app is hidden, so take it again on return
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('pointerdown', onVisible) // some browsers only allow it after a touch
    return () => {
      stopped = true
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('pointerdown', onVisible)
      void lock?.release()
    }
  }, [enabled])
}
