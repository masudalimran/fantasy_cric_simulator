/* Fantasy Cric Sim: a small service worker so the app opens instantly and works offline once it has been loaded.
 * Bump VERSION to throw the caches away. Pages are network-first (so a new deploy shows up), hashed assets are
 * cache-first, pictures and fonts are served from the cache while they refresh in the background. */
const VERSION = 'v1'
const SHELL = `fcs-shell-${VERSION}`
const RUNTIME = `fcs-runtime-${VERSION}`

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll(['/', '/favicon.svg', '/manifest.webmanifest', '/icons/icon-192.png'])).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('fcs-') && k !== SHELL && k !== RUNTIME).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  )
})

const cacheFirst = async (req) => {
  const hit = await caches.match(req)
  if (hit) return hit
  const res = await fetch(req)
  if (res.ok) (await caches.open(RUNTIME)).put(req, res.clone())
  return res
}

const staleWhileRevalidate = async (req) => {
  const cache = await caches.open(RUNTIME)
  const hit = await cache.match(req)
  const fetched = fetch(req).then((res) => { if (res.ok || res.type === 'opaque') cache.put(req, res.clone()); return res }).catch(() => hit)
  return hit || fetched
}

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)

  // fonts
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') return event.respondWith(staleWhileRevalidate(req))
  if (url.origin !== self.location.origin) return

  // pages: the network first, the saved app as the fallback when offline (every address is the same single page)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((res) => { const copy = res.clone(); caches.open(SHELL).then((c) => c.put('/', copy)); return res }).catch(() => caches.match('/')),
    )
    return
  }
  if (url.pathname.startsWith('/assets/')) return event.respondWith(cacheFirst(req))
  if (url.pathname.startsWith('/images/') || url.pathname.startsWith('/icons/')) return event.respondWith(staleWhileRevalidate(req))
})
