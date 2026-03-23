const CACHE_NAME = 'job-capture-v7'

const PRECACHE_URLS = [
  '/',
  '/upload',
  '/dashboard',
  '/login',
  '/manifest.json',
  '/icons/icon-192.svg',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn('[sw] Precache partial failure:', err)
      })
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle GET requests
  if (request.method !== 'GET') return

  // Skip blob: URLs (image previews)
  if (url.protocol === 'blob:') return

  // Skip non-http protocols
  if (!url.protocol.startsWith('http')) return

  // Skip Supabase API calls
  if (url.hostname.includes('supabase')) return

  // Skip Next.js data/RSC requests
  if (url.pathname.startsWith('/_next/data')) return
  if (request.headers.get('RSC') === '1') return
  if (request.headers.get('Next-Router-State-Tree')) return

  // Navigation requests: network-first, fall back to cache for offline shell
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          return response
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match('/upload'))
        )
    )
    return
  }

  // Static JS/CSS chunks only: cache-first
  if (url.pathname.startsWith('/_next/static')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone()
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
            }
            return response
          })
          .catch(() => new Response('', { status: 503, statusText: 'Offline' }))
      })
    )
    return
  }

  // Everything else: let it go straight to the network, no SW interception
})
