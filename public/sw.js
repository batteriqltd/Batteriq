/* Batteriq Admin — Service Worker
 * Handles Web Push notifications + notification clicks, catches up on alerts
 * that were missed while the device was offline, and satisfies PWA
 * installability (registered SW with a fetch handler + linked manifest).
 */

const SW_VERSION = 'batteriq-admin-v2'
const CURSOR_DB = 'batteriq-admin'
const CURSOR_STORE = 'meta'
const CURSOR_KEY = 'alert-cursor'

// Show at most this many individual notifications in one catch-up burst; the
// remainder collapse into a single summary so reconnecting after a long gap
// does not bury the phone in a hundred separate alerts.
const MAX_CATCHUP_NOTIFICATIONS = 5

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

// ── Cursor storage (IndexedDB — localStorage is unavailable in a SW) ──
function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(CURSOR_DB, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(CURSOR_STORE)) {
        req.result.createObjectStore(CURSOR_STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function readCursor() {
  try {
    const db = await openDb()
    return await new Promise((resolve) => {
      const tx = db.transaction(CURSOR_STORE, 'readonly')
      const req = tx.objectStore(CURSOR_STORE).get(CURSOR_KEY)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => resolve(null)
    })
  } catch (e) {
    return null
  }
}

async function writeCursor(value) {
  if (!value) return
  try {
    const db = await openDb()
    await new Promise((resolve) => {
      const tx = db.transaction(CURSOR_STORE, 'readwrite')
      tx.objectStore(CURSOR_STORE).put(value, CURSOR_KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    })
  } catch (e) {
    /* storage unavailable — catch-up simply re-checks a wider window */
  }
}

// ── Push received ─────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch (e) {
    payload = { title: 'Batteriq Admin', body: event.data ? event.data.text() : '' }
  }

  const kind = payload.tag || 'batteriq'
  const title = payload.title || 'Batteriq Admin'
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    // A per-record tag so several orders stack as separate notifications
    // instead of silently replacing one another.
    tag: payload.id ? `${kind}:${payload.id}` : kind,
    // Re-alert even if a notification with the same tag is already showing
    renotify: true,
    // Buzz the phone even on silent — [vibrate, pause, vibrate] in ms
    vibrate: payload.vibrate || [200, 100, 200],
    // Keep order/payment alerts on screen until tapped
    requireInteraction: kind === 'order' || kind === 'payment',
    timestamp: Date.now(),
    data: { url: payload.url || '/admin' },
  }

  event.waitUntil((async () => {
    await self.registration.showNotification(title, options)
    // Anything at or before this push has now been surfaced, so a later
    // catch-up must not show it a second time.
    if (payload.sentAt) await writeCursor(payload.sentAt)
  })())
})

// ── Catch-up: surface anything that landed while we were unreachable ──
async function catchUp() {
  const since = await readCursor()

  let res
  try {
    res = await fetch(
      `/api/admin/alerts${since ? `?since=${encodeURIComponent(since)}` : ''}`,
      { credentials: 'include', cache: 'no-store' }
    )
  } catch (e) {
    // Still offline — Background Sync will retry this automatically.
    throw e
  }

  // Signed out or server trouble: leave the cursor untouched so nothing is skipped.
  if (!res.ok) return

  let data
  try {
    data = await res.json()
  } catch (e) {
    return
  }

  const alerts = Array.isArray(data.alerts) ? data.alerts : []

  // Don't re-announce what is already sitting in the tray.
  const existing = await self.registration.getNotifications()
  const shown = new Set(existing.map((n) => n.tag))
  const fresh = alerts.filter((a) => !shown.has(`${a.kind}:${a.id}`))

  const head = fresh.slice(0, MAX_CATCHUP_NOTIFICATIONS)
  for (const a of head) {
    await self.registration.showNotification(
      a.kind === 'order' ? '🛒 New Order Received' : '💬 New Message',
      {
        body: a.subtitle || '',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: `${a.kind}:${a.id}`,
        renotify: true,
        vibrate: [200, 100, 200],
        requireInteraction: a.kind === 'order',
        timestamp: new Date(a.createdAt).getTime() || Date.now(),
        data: { url: a.url || '/admin' },
      }
    )
  }

  const overflow = fresh.length - head.length
  if (overflow > 0) {
    await self.registration.showNotification('Batteriq Admin', {
      body: `+${overflow} more new ${overflow === 1 ? 'alert' : 'alerts'} while you were away`,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'catchup-summary',
      renotify: true,
      data: { url: '/admin/orders' },
    })
  }

  if (data.serverTime) await writeCursor(data.serverTime)
}

// Fires when connectivity returns, even with every tab closed (Chromium).
self.addEventListener('sync', (event) => {
  if (event.tag === 'bq-catchup') {
    // Rejecting tells the browser to retry with backoff while still offline.
    event.waitUntil(catchUp())
  }
})

// Periodic wake-up for installed PWAs (Chromium, best-effort cadence).
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'bq-poll') {
    event.waitUntil(catchUp().catch(() => {}))
  }
})

// The page asks for a catch-up when it regains focus or connectivity.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'BQ_CATCHUP') {
    event.waitUntil(catchUp().catch(() => {}))
  }
  if (event.data && event.data.type === 'BQ_SET_CURSOR' && event.data.cursor) {
    event.waitUntil(writeCursor(event.data.cursor))
  }
})

// ── Subscription rotated/expired → re-register so push keeps working ──
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil((async () => {
    try {
      const old = event.oldSubscription || (await self.registration.pushManager.getSubscription())
      const key =
        (event.newSubscription && event.newSubscription.options.applicationServerKey) ||
        (old && old.options && old.options.applicationServerKey)

      const sub =
        event.newSubscription ||
        (await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key,
        }))

      await fetch('/api/admin/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(sub),
      })
    } catch (e) {
      /* nothing more we can do from here; the page re-subscribes on next open */
    }
  })())
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
