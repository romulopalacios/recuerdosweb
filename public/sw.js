/**
 * Service Worker — Nuestros Recuerdos
 * ─────────────────────────────────────────────────────────────────────────────
 * Responsibilities:
 *  1. Cache-first strategy for static assets (shell, fonts, icons).
 *  2. Network-first strategy for Supabase API / Storage calls.
 *  3. Handle incoming Push events and show anniversary notifications.
 *  4. Handle notificationclick to open/focus the app.
 *
 * Anniversary detection:
 *  The push event payload (from your server-side scheduler or client check) is
 *  expected to carry:
 *    { type: 'anniversary', title, body, url }
 *  The client-side `usePushNotifications` hook also checks anniversaries on
 *  page load and calls self.registration.showNotification directly.
 */

/**
 * ─── IMPORTANT FOR DEPLOYMENTS ───────────────────────────────────────────────
 * Bump CACHE_VERSION on every production deploy that changes static assets.
 * Failure to do so means users keep stale JS/CSS until their browser
 * evicts the cache on its own (can take weeks).
 *
 * Convention: {app}-v{MAJOR}.{DEPLOY_DATE}  e.g. recuerdos-v1.20260302
 */
const CACHE_NAME    = 'recuerdos-v1.20260302'
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
]

// ─── Install: pre-cache shell ─────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// ─── Activate: clean old caches ───────────────────────────────────────────────

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

// ─── Fetch: cache-first for static, network-first for API ────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET, browser-extension, and Supabase API/Storage calls
  if (
    request.method !== 'GET' ||
    url.hostname.endsWith('supabase.co') ||
    url.protocol === 'chrome-extension:'
  ) {
    return
  }

  // Cache-first for same-origin assets (JS, CSS, fonts, images)
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((response) => {
        // Only cache successful same-origin responses
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      }).catch(() => {
        // Offline fallback: return cached index.html for navigation requests
        if (request.mode === 'navigate') {
          return caches.match('/index.html')
        }
        return new Response('Offline', { status: 503 })
      })
    })
  )
})

// ─── Push Notification ────────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data?.json() ?? {}
  } catch {
    data = { title: 'Recuerdos', body: event.data?.text() ?? '¡Tienes un recuerdo especial hoy! 💕' }
  }

  const {
    type  = 'generic',
    title = 'Nuestros Recuerdos 💕',
    body  = '¡Tienes un recuerdo especial hoy!',
    url   = '/',
    icon  = '/icons/icon-192.svg',
    badge = '/icons/badge-96.svg',
  } = data

  const options = {
    body,
    icon,
    badge,
    vibrate: [200, 100, 200],
    tag:     type === 'anniversary' ? 'anniversary' : 'general',
    renotify: true,
    data: { url },
    actions: [
      { action: 'open',    title: 'Ver recuerdo' },
      { action: 'dismiss', title: 'Cerrar' },
    ],
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// ─── Notification click ───────────────────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'dismiss') return

  const targetUrl = event.notification.data?.url ?? '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing window if open
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }
      // Otherwise open a new tab
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
    })
  )
})
