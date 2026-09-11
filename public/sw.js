// Service Worker for WACRM PWA & Web Push Notifications

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch (e) {
    payload = {
      title: 'WACRM',
      body: event.data.text(),
    };
  }

  const title = payload.title || 'WACRM';
  const targetUrl = payload.url || (payload.data && payload.data.conversationId ? `/inbox?c=${payload.data.conversationId}` : '/inbox');

  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icon-192x192.png',
    badge: payload.badge || '/icon-192x192.png',
    tag: payload.tag || 'wacrm-notification',
    data: {
      url: targetUrl,
      ...payload.data,
    },
    silent: payload.sound === false ? true : false,
    vibrate: payload.vibrate !== false ? [200, 100, 200] : undefined,
    renotify: true,
    actions: [
      { action: 'open', title: 'Abrir Conversa' }
    ]
  };

  // Notify open client tabs to play audio chime in browser context if open
  if (payload.sound !== false) {
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        client.postMessage({ type: 'PLAY_NOTIFICATION_SOUND' });
      }
    });
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/inbox';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client && targetUrl) {
            client.navigate(targetUrl);
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
