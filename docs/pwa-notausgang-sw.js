// Emergency exit for the service worker (docs/PWA.md, section "Notausgang"). NOT served from here: in an emergency this file
// is copied over the built sw.js (server/public/sw.js) and deployed, then the CDN is cleared. Every browser that still has the
// old worker fetches it at its next update check (each page load), and it removes the app's service worker for good:
// it takes over at once, deletes every cache of this origin, unregisters itself and reloads the windows it took over, which
// then come straight from the server. A page that registers sw.js again afterwards is not controlled by it, so it does not
// reload that page again (no loop); it only removes itself once more. To stop even that, remove registerServiceWorker() from src/main.tsx.
self.addEventListener('install', () => { void self.skipWaiting(); });
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) await caches.delete(key);
    await self.registration.unregister();
    for (const client of await self.clients.matchAll({ type: 'window' })) client.navigate(client.url).catch(() => {});
  })());
});
