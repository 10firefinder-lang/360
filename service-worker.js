const CACHE_NAME = 'gold-360-v0.5.2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(['/', '/index.html', '/manifest.json']).catch(() => {})
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;

  if (
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.json')
  ) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('/index.html'));
    })
  );
});

/** Open app on notification click */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const target = data.url || (data.route ? '/#' + data.route : '/#dashboard');
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(target);
    })
  );
});

/**
 * Remote push would arrive here (needs backend + VAPID).
 * Without a server we only support local showNotification from the page/SW.
 */
self.addEventListener('push', (event) => {
  let payload = { title: 'GOLD 360', body: 'יש עדכון', url: '/#dashboard' };
  try {
    if (event.data) {
      const j = event.data.json();
      payload = { ...payload, ...j };
    }
  } catch (e) {
    try {
      payload.body = event.data ? event.data.text() : payload.body;
    } catch (e2) {}
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/assets/icons/icon-192.png',
      badge: '/assets/icons/icon-192.png',
      dir: 'rtl',
      lang: 'he',
      data: { url: payload.url || '/#dashboard' },
    })
  );
});
