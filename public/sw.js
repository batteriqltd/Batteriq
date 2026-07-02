/* Batteriq Admin — Service Worker
 * Handles Web Push notifications + notification clicks and satisfies PWA
 * installability (registered SW with a fetch handler + linked manifest).
 */

const SW_VERSION = 'batteriq-admin-v1'

self.addEventListener('install', () => {
  // Activate this SW immediately without waiting for old tabs to close
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Minimal pass-through fetch handler. Its presence keeps the app installable;
// we don't cache anything so the admin always sees fresh data.
self.addEventListener('fetch', () => {
  // no-op: let the network handle every request normally
})

// ── Push received ─────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch (e) {
    payload = { title: 'Batteriq Admin', body: event.data ? event.data.text() : '' }
  }

  const title = payload.title || 'Batteriq Admin'
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: payload.tag || 'batteriq',
    // Re-alert even if a notification with the same tag is already showing
    renotify: true,
    // Buzz the phone even on silent — [vibrate, pause, vibrate] in ms
    vibrate: payload.vibrate || [200, 100, 200],
    // Keep order/payment alerts on screen until tapped
    requireInteraction: payload.tag === 'order' || payload.tag === 'payment',
    timestamp: Date.now(),
    data: { url: payload.url || '/admin' },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// ── Notification tapped → open the exact record ───────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = (event.notification.data && event.notification.data.url) || '/admin'

  event.waitUntil((async () => {
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })

    // If an admin tab is already open, focus it and route to the record
    for (const client of clientList) {
      if ('focus' in client) {
        try {
          await client.focus()
          if ('navigate' in client) await client.navigate(targetUrl)
          return
        } catch (e) { /* fall through to openWindow */ }
      }
    }

    // Otherwise open a fresh window at the record
    if (self.clients.openWindow) {
      await self.clients.openWindow(targetUrl)
    }
  })())
})
