// Service worker of 3Druckwerkbank (hand-written, no Workbox). See docs/PWA.md.
// The three placeholders are filled in by the build (pwaBuild in vite.config.ts); the file in public/ is only the template.
const BUILD = '__WB_BUILD__';        // id of this build: part of the cache name, so every build has its own shell
const IMG_VERSION = '__WB_IMG__';    // ASSET_VERSION from src/scene/Island.tsx: a new version empties the image cache
const PRECACHE = ['__WB_FILES__'];   // '/', script, stylesheet, fonts (woff2), manifest
const SHELL = `wb-shell-${BUILD}`;
const IMAGES = `wb-img-${IMG_VERSION}`;
const IMAGES_MAX = 120;              // images are cached as they are used, never all in advance (public/img has about 30 MB)
const NAV_TIMEOUT = 3500;            // ms to wait for the network before an installed app starts from the cache
const shellPaths = new Set(PRECACHE);

/**
 * Loads the files of this build into its cache, and checks every answer first: the server answers a missing file with the
 * page (200, text/html), and while a deploy is half done, or an old sw.js comes from an intermediate cache, the page may
 * belong to another build. One wrong answer and nothing is stored: the install fails, the old worker stays, the browser
 * tries again at a later check.
 */
async function precache() {
  const answers = await Promise.all(PRECACHE.map(async (path) => {
    // hashed files may come from the browser's HTTP cache (one year, immutable); the page and the manifest from the server
    const res = await fetch(path, { cache: path.startsWith('/assets/') ? 'default' : 'reload' });
    const html = (res.headers.get('content-type') ?? '').startsWith('text/html');
    if (!res.ok || res.redirected || res.type !== 'basic' || html !== (path === '/')) throw new Error(`${path}: ${res.status} ${res.headers.get('content-type')}`);
    if (path === '/') {
      const refs = [...(await res.clone().text()).matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]);
      if (!refs.length || !refs.every((f) => shellPaths.has(f))) throw new Error(`/ belongs to another build`);
    }
    return [path, res];
  }));
  const cache = await caches.open(SHELL);
  await Promise.all(answers.map(([path, res]) => cache.put(path, res)));
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache());
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

/** The page itself: network first, so a new build arrives at the next start; the cached shell only without network, when the server fails (5xx) or has no page (404, only while index.html is missing). */
async function navigate(request) {
  const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), NAV_TIMEOUT);
  try {
    const res = await fetch(request, { signal: ctrl.signal });
    if (res.status < 500 && res.status !== 404) return res;
  } catch { /* offline or too slow */ } finally { clearTimeout(timer); }
  return (await fromShell('/')) ?? fetch(request);
}

/** After a page load: if the shell cache was emptied while this worker stayed (DevTools, a cleaning tool), fill it again. */
const refill = async () => { if (!(await fromShell('/'))) await precache().catch(() => {}); };

/** Pictures: cache first (the address carries the version), stored on first use; a hit moves to the end once per worker run, so the entries used least recently leave first. */
const touched = new Set();
async function image(request, url) {
  const cache = await caches.open(IMAGES);
  const hit = await cache.match(request);
  if (hit) {
    if (!touched.has(request.url)) { touched.add(request.url); void cache.put(request, hit.clone()).catch(() => {}); }
    return hit;
  }
  const res = await fetch(request);
  const type = res.headers.get('content-type') ?? '';
  // .avif: older servers send application/octet-stream for it
  if (res.ok && res.type === 'basic' && !res.redirected && (type.startsWith('image/') || (type === 'application/octet-stream' && url.pathname.endsWith('.avif')))) {
    touched.add(request.url);
    void cache.put(request, res.clone()).then(async () => { const keys = await cache.keys(); for (const k of keys.slice(0, Math.max(0, keys.length - IMAGES_MAX))) await cache.delete(k); }).catch(() => {});
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
  if (req.mode === 'navigate') { const res = navigate(req); event.respondWith(res); event.waitUntil(res.then(refill, () => {})); return; }
  if (url.pathname.startsWith('/img/')) { event.respondWith(image(req, url)); return; }
  // files of this build (hash in the name) and the other shell files: cache first
  if (shellPaths.has(url.pathname)) event.respondWith(fromShell(url.pathname).then((hit) => hit ?? fetch(req)));
  // anything else (older hashed files, icons, screenshots, …) goes to the network untouched
});
