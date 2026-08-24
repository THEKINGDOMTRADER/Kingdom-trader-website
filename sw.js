const CACHE_NAME = 'kingdom-trader-v2';
const urlsToCache = ['/', '/index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .catch((err) => console.log('SW cache install failed:', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// Network-first: always try to fetch the latest version.
// Only fall back to the cached copy if the network request fails (e.g. offline).
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// ---- Push notifications (Firebase Cloud Messaging) ----
// These scripts run inside the service worker, so the site can receive
// pushes even when it isn't open in a browser tab.
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBTMWE--vpIlQPS081VEv1RoaGCDbvIZhM",
  authDomain: "the-kingdom-trader-app.firebaseapp.com",
  projectId: "the-kingdom-trader-app",
  storageBucket: "the-kingdom-trader-app.firebasestorage.app",
  messagingSenderId: "590959238217",
  appId: "1:590959238217:web:3fc9f54aec6ccaa14ab398"
});

const messaging = firebase.messaging();

// Fires when a push arrives and the site is NOT open/focused in any tab.
messaging.onBackgroundMessage((payload) => {
  const title = (payload.notification && payload.notification.title) || 'The Kingdom Trader';
  const options = {
    body: (payload.notification && payload.notification.body) || 'You have a new update.',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    data: { url: (payload.data && payload.data.url) || '/' }
  };
  self.registration.showNotification(title, options);
});

// Clicking the notification opens (or focuses) the site.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
