// Service worker of 3Druckwerkbank (hand-written, no Workbox). See docs/PWA.md.
// The three placeholders are filled in by the build (pwaBuild in vite.config.ts); the file in public/ is only the template.
const BUILD = '__WB_BUILD__';        // id of this build: part of the cache name, so every build has its own shell
const IMG_VERSION = '__WB_IMG__';    // ASSET_VERSION from src/scene/Island.tsx: a new version empties the image cache
const PRECACHE = ['__WB_FILES__'];   // '/', script, stylesheet, fonts (woff2), manifest, small icons
const SHELL = `wb-shell-${BUILD}`;
const IMAGES = `wb-img-${IMG_VERSION}`;
const IMAGES_MAX = 120;              // images are cached as they are used, never all in advance (public/img has about 30 MB)
const NAV_TIMEOUT = 3500;            // ms to wait for the network before an installed app starts from the cache
const shellPaths = new Set(PRECACHE);

self.addEventListener('install', (event) => {
  // 'reload' skips the HTTP cache: the shell must come from the server, not from an old copy in the browser
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll(PRECACHE.map((u) => new Request(u, { cache: 'reload' })))));
  // no skipWaiting here: a running app keeps its build until the page asks for the change (src/lib/pwa.ts)
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith('wb-') && key !== SHELL && key !== IMAGES) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'wb-skip-waiting') void self.skipWaiting();
  if (event.data === 'wb-info') event.ports[0]?.postMessage({ build: BUILD, files: PRECACHE });
});

const fromShell = async (path) => (await caches.open(SHELL)).match(path);

/** The page itself: network first, so a new build arrives at the next start; the cached shell only without network (or when the server fails). */
async function navigate(request) {
  const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), NAV_TIMEOUT);
  try {
    const res = await fetch(request, { signal: ctrl.signal });
    if (res.status < 500) return res;
  } catch { /* offline or too slow */ } finally { clearTimeout(timer); }
  return (await fromShell('/')) ?? fetch(request);
}

/** Pictures: cache first (the address carries the version), stored on first use, oldest entries leave when the limit is reached. */
async function image(request) {
  const cache = await caches.open(IMAGES);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok && res.type === 'basic' && (res.headers.get('content-type') ?? '').startsWith('image/')) {
    const copy = res.clone();
    void cache.put(request, copy).then(async () => { const keys = await cache.keys(); for (const k of keys.slice(0, Math.max(0, keys.length - IMAGES_MAX))) await cache.delete(k); }).catch(() => {});
  }
  return res;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Never touched (no respondWith, the browser handles them as if there were no service worker):
  // other origins (Open-Meteo, Google sign-in) and everything below /api/ (account, sync, live channel, private files).
  if (url.origin !== self.location.origin) return;
  if (url.pathname === '/api' || url.pathname.startsWith('/api/')) return;
  if (req.mode === 'navigate') { event.respondWith(navigate(req)); return; }
  if (url.pathname.startsWith('/img/')) { event.respondWith(image(req)); return; }
  // files of this build (hash in the name) and the other shell files: cache first
  if (shellPaths.has(url.pathname)) event.respondWith(fromShell(url.pathname).then((hit) => hit ?? fetch(req)));
  // anything else (older hashed files, screenshots, …) goes to the network untouched
});
