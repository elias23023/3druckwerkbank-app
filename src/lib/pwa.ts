import { useSyncExternalStore } from 'react';

/**
 * Installable app (PWA): registers the service worker (public/sw.js) and tells the page when a newer build is ready.
 * Nothing reloads by itself. A running app keeps its build until the user presses „Neu laden“; a freshly started app
 * already has the new build (the page comes from the network first) and only lets the new service worker take over. See docs/PWA.md.
 */
const CHECK_EVERY = 30 * 60_000;
let updateReady = false;
let reloading = false;
let registration: ServiceWorkerRegistration | undefined;
const listeners = new Set<() => void>();
const setReady = (v: boolean) => { if (v !== updateReady) { updateReady = v; listeners.forEach((l) => l()); } };

/** True while a newer build than the running one is installed and waits for a reload. */
export const useUpdateReady = () => useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, () => updateReady);

/** Asks a service worker which files its build consists of. */
const filesOf = (sw: ServiceWorker) => new Promise<string[] | null>((resolve) => {
  const ch = new MessageChannel(); const timer = setTimeout(() => resolve(null), 3000);
  ch.port1.onmessage = (e) => { clearTimeout(timer); resolve(Array.isArray(e.data?.files) ? e.data.files : null); };
  sw.postMessage('wb-info', [ch.port2]);
});

/** Does this page already run the build of that service worker? (All of its scripts and stylesheets belong to the worker's file list.) */
async function sameBuild(sw: ServiceWorker) {
  const files = await filesOf(sw); if (!files) return false;
  const own = [...document.querySelectorAll<HTMLScriptElement>('script[src]')].map((s) => s.src)
    .concat([...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')].map((l) => l.href))
    .map((u) => new URL(u, location.href)).filter((u) => u.origin === location.origin).map((u) => u.pathname);
  return own.length > 0 && own.every((p) => files.includes(p));
}

/** A new worker is installed and waits: take it over silently if the page is already its build, otherwise show the hint. */
async function onWaiting(sw: ServiceWorker) {
  if (await sameBuild(sw)) sw.postMessage('wb-skip-waiting'); else setReady(true);
}

/** „Neu laden“ in the hint: let the waiting worker take over, then reload once. */
export function applyUpdate() {
  if (reloading) return;
  const waiting = registration?.waiting;
  if (!waiting) { reloading = true; location.reload(); return; }
  reloading = true;
  waiting.postMessage('wb-skip-waiting'); // the reload follows on 'controllerchange'
  setTimeout(() => location.reload(), 4000); // in case the change never arrives
}

export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  const sw = navigator.serviceWorker;
  const start = async () => {
    try {
      let hadController = !!sw.controller;
      const reg = await sw.register('/sw.js', { scope: '/', updateViaCache: 'none' });
      registration = reg;
      const watch = (w: ServiceWorker | null) => { if (!w) return; w.addEventListener('statechange', () => { if (w.state === 'installed' && sw.controller && reg.waiting === w) void onWaiting(w); }); };
      if (reg.waiting && sw.controller) void onWaiting(reg.waiting);
      watch(reg.installing);
      reg.addEventListener('updatefound', () => watch(reg.installing));
      sw.addEventListener('controllerchange', () => {
        if (reloading) { location.reload(); return; }
        const first = !hadController; hadController = true;
        if (first || !sw.controller) return; // first installation: nothing to announce
        // another window let a new build take over: this one still runs the old build
        void sameBuild(sw.controller).then((same) => setReady(!same));
      });
      // an installed app can stay open for days: while it is visible and online, look for a new build every 30 minutes,
      // also when it comes back to the front and when the network returns; only a check that reached the server counts
      let checked = Date.now();
      const check = (minAge: number) => {
        if (document.visibilityState !== 'visible' || !navigator.onLine || Date.now() - checked < minAge) return;
        reg.update().then(() => { checked = Date.now(); }, () => {});
      };
      setInterval(() => check(CHECK_EVERY), 5 * 60_000);
      document.addEventListener('visibilitychange', () => check(CHECK_EVERY));
      window.addEventListener('online', () => check(60_000));
    } catch { /* no service worker (private mode, blocked, http): the app works as before */ }
  };
  // after the first picture of the page, so the registration never competes with the start
  const idle = () => ('requestIdleCallback' in window ? requestIdleCallback(() => void start(), { timeout: 4000 }) : setTimeout(() => void start(), 1500));
  if (document.readyState === 'complete') idle(); else window.addEventListener('load', idle, { once: true });
}
