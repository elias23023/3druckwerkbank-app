/* Soft leaving (Wasser-Look, owner's decision 10): what the app removes - a bottom sheet or drawer, the search, a row of a
   list - stays as a PICTURE for the look's leaving time and leaves like water; React and the store are done with it at once.

   How: a stable ref callback (React 19: a ref may return its clean-up). React runs that clean-up while the element is still
   in the document, right before it removes it. The clean-up notes where the element stood (parent, neighbours, scroll
   offsets); a microtask - after React's commit, before the next picture - puts the very same node back there with the class
   wa-geht (kern.css: "Bogen", "Gehen einer Zeile"), inert and aria-hidden, and it is removed when its animation ends (a timer
   is the safety net). It is the real node, not a copy: its field values, scroll offsets and the drops'
   canvases are as they were. React no longer knows it (no handlers, no re-render with data that has gone), the store is the
   truth from the first moment, focus has already gone back to the opener (Sheet), Escape and a second tap reach nothing.

   The order "clean-up first, removal second" is React 19's and is not promised. Should a later React call the clean-up when
   the node is already out, the picture still comes: every parent of such an element is watched (one MutationObserver, child
   list only), so the place the node was taken from - parent and neighbours - is known; the node is put back there in the same
   way. What is lost then: scroll offsets inside a sheet (they are gone with the removal). Tried with a clean-up that runs
   late on purpose: docs/wasser-look/entwurf/gehen/spaet.mjs. That the order still holds is checked on every run of
   scripts/wasser/pruefen.mjs --app and desktop.mjs pruefen (a picture placed from memory carries data-gehen-spaet and fails there).

   No look (no data-wasser above the element, or the look's tokens are missing), reduced motion (the app's switch or the
   system's): nothing is kept and nothing waits - the element is gone at once, as before.

   Use:
     sheet, scrim, search      ref={gehtBogen}   (Sheet.tsx, CommandBar.tsx). A new one that opens cuts any that is leaving.
     a row of a list           <div key={t.id} {...weich(t.id)} className="m-row">  - the row sinks, the rows below close the
                               gap. The id lets a row that comes back (Rückgängig) cut its own leaving picture.
   Only for rows that leave because of the user's action on THAT list (ticked, skipped, deleted). A list that shows only a
   part (.slice, a time window) also loses rows that are NOT gone - pushed out by a new one, moved down: give such a row its
   test, weich(t.id, () => !useStore.getState().tasks.some(...)): it leaves softly only when the test says its thing is
   really gone, otherwise it goes at once as before. (The test is kept per id, for as long as a row of that id stands: two lists that
   show the same id WITH a test must mean the same by "gone"; a list without a test never uses another list's.) Not for lists that a filter or search shows (a filter would make every row leave softly).
   The empty text of a list:  <p {...leer()} className="muted small">Alles erledigt.</p>  - when the LAST row leaves, the
   text the app puts in its place waits, unseen, until the row has gone and then comes softly (class wa-leer-kommt, kern.css),
   instead of standing beside the leaving row and sliding up while the gap closes. */

import { HAKEN_SVG } from './haken';

type Kind = 'bogen' | 'zeile';
interface Ghost { el: HTMLElement; kind: Kind; id: string | null; parent: Node; timer: number; done: boolean; shown: boolean; end: () => void }

const ghosts = new Set<Ghost>();
const LEAVE = 'wa-geht';                 // the look's class of everything that leaves (kern.css)
const ROW = 'wa-geht--zeile';            // ... of a leaving row (kern.css, "Gehen einer Zeile")
const COMES = 'wa-leer-kommt';              // ... of the empty text that takes the place of the last row (kern.css, same block)
const EMPTY = 'data-gehen-leer';         // the attribute that marks a list's empty text (leer())
const tests = new Map<string, () => boolean>();   // weich(id, gone): is the thing of this row really gone?
const PART = 'data-gehen-teil';          // marks a row that has such a test: a row without one never asks another list's test
const live = new Map<string, number>();  // rows that stand in the document, per id: the test of an id goes with its last row
const TICK = '.check';                   // the app's check (src/ui/Glass.tsx) ...
const TICKED = 'check--on';              // ... and its class when ticked

/** No motion wanted: the same two switches as the look's rule ".wa-geht { display: none }" (kern.css). */
function still() {
  return document.documentElement.dataset.motion === 'reduziert' || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
}
/** A CSS time ("0.26s", "260ms") in ms; 0 when it is not set. */
function ms(v: string) { const n = parseFloat(v); return !(n > 0) ? 0 : /ms\s*$/.test(v) ? n : n * 1000; }

// the last press, to know whether a row leaves because its check was ticked (then its picture shows the check ticked)
let press: { el: Element; t: number } | null = null;
if (typeof document !== 'undefined') document.addEventListener('click', (e) => { press = e.target instanceof Element ? { el: e.target, t: performance.now() } : null; }, true);

function drop(g: Ghost) {
  if (g.done) return;
  g.done = true; ghosts.delete(g); window.clearTimeout(g.timer);
  g.el.removeEventListener('animationend', g.end);
  // only a picture is taken out. Cut before it was put back, the node is not ours to remove: in development React's StrictMode
  // calls a new ref's clean-up and sets the ref again at once - that second setting cuts the "leaving" of a node that never left
  if (g.shown) g.el.remove();
}

/** Removes leaving pictures at once: every one of a kind, or (with id) the leaving picture of that row in that list. */
export function cut(kind: Kind, id?: string | null, parent?: Node | null) {
  for (const g of [...ghosts]) if (g.kind === kind && (id === undefined || (g.id === id && g.parent === parent))) drop(g);
}
/** Is a sheet, drawer or the search leaving right now? (App: Escape then does not leave the world as well.) */
export function leaving(kind: Kind = 'bogen') { for (const g of ghosts) if (g.kind === kind && !g.done) return true; return false; }

// where a node was taken from, for a clean-up that comes after the removal (see the head): parents are watched from attach()
interface Place { parent: Node; next: Node | null; prev: Node | null }
const places = new WeakMap<Node, Place>();
const note = (rs: MutationRecord[]) => { for (const r of rs) for (const n of Array.from(r.removedNodes)) places.set(n, { parent: r.target, next: r.nextSibling, prev: r.previousSibling }); };
const watch = typeof MutationObserver === 'function' ? new MutationObserver(note) : null;
const LATE = 'data-gehen-spaet';         // marks a leaving picture that had to be placed from memory (never with React 19)

function leave(el: HTMLElement, kind: Kind) {
  let parent: Node | null = el.parentNode, next: Node | null = el.nextSibling, prev: Node | null = el.previousSibling;
  const late = !parent;                                     // already taken out (not React 19's order): its place from memory
  if (late) { if (watch) note(watch.takeRecords()); const p = places.get(el); if (!p) return; ({ parent, next, prev } = p); }
  const at = late ? parent : el;                            // what still stands in the document
  if (!parent || !(at instanceof Element) || !at.isConnected || !at.closest('[data-wasser]') || still()) return;
  const t = ms(getComputedStyle(at).getPropertyValue('--wa-t-leave'));
  if (!t) return;                                           // the look's tokens are not there: nothing to wait for
  // what taking it out of the document loses: scroll offsets (a sheet's body)
  const scrolled: [Element, number, number][] = [];
  if (kind === 'bogen') for (const x of [el, ...Array.from(el.querySelectorAll('*'))]) if (x.scrollTop || x.scrollLeft) scrolled.push([x, x.scrollTop, x.scrollLeft]);
  let h = 0, gap = 0, close = true, ticked: Element | null = null;
  if (kind === 'zeile') {
    const id = el.getAttribute('data-gehen'), gone = id && el.hasAttribute(PART) ? tests.get(id) : undefined;
    if (gone && !gone()) return;                            // only pushed out of a list that shows a part (or moved): no picture
    h = el.offsetHeight;
    const ps = getComputedStyle(parent as Element);
    gap = parseFloat(ps.rowGap) || 0;
    // the gap closes only where the rows stand one below the other (a column); in a grid or a row of tiles the picture only sinks
    close = !/grid/.test(ps.display) && !(/flex/.test(ps.display) && !/column/.test(ps.flexDirection));
    if (press && performance.now() - press.t < 1000 && el.contains(press.el)) ticked = press.el.closest(TICK);
  }
  const g: Ghost = { el, kind, id: el.getAttribute('data-gehen'), parent, timer: 0, done: false, shown: false, end: () => {} };
  const into = parent;
  ghosts.add(g);                                            // already now: a sheet that opens in this same commit cuts it before it is shown
  queueMicrotask(() => {
    if (g.done) return;
    // still in the document (React's StrictMode tries a clean-up in development), or its whole page went with it (a change
    // of tab, of world, the shell): nothing to show
    if (el.isConnected || !into.isConnected) { g.done = true; ghosts.delete(g); return; }
    const place = () => { g.shown = true; into.insertBefore(el, next && next.parentNode === into ? next : prev && prev.parentNode === into ? prev.nextSibling : null); };
    if (late) { el.setAttribute(LATE, ''); place(); h = el.offsetHeight; }     // its height went with the removal: measured where it stands again
    el.classList.add(LEAVE); if (kind === 'zeile') el.classList.add(ROW);
    el.setAttribute('aria-hidden', 'true'); el.removeAttribute('role'); el.removeAttribute('aria-modal'); el.inert = true;
    if (kind === 'zeile') {
      el.style.setProperty('--wa-geht-h', `${h}px`); el.style.setProperty('--wa-geht-gap', `${gap}px`);
      if (!close) el.style.setProperty('--wa-zeile-zu', 'none');
      if (ticked && !ticked.classList.contains(TICKED)) { ticked.classList.add(TICKED); if (!ticked.firstElementChild) ticked.innerHTML = HAKEN_SVG; }
      // the last row: the list's empty text (rendered by React in this same commit) waits until the row has gone
      const kids = Array.from((parent as Element).children);
      if (!kids.some((x) => x !== el && x.hasAttribute('data-gehen') && !x.classList.contains(LEAVE))) for (const x of kids) if (x.hasAttribute(EMPTY)) x.classList.add(COMES);
    }
    if (!late) place();
    for (const [x, top, left] of scrolled) { x.scrollTop = top; x.scrollLeft = left; }
    // its leaving animations: on the element or inside it (the desktop's search: the panel dives, its scrim stays), never the
    // endless loops of the lights. None (a selector of the look that does not reach it): gone at once instead of standing still
    // (only the element and its direct children: putting the node back restarts every CSS animation inside it, and one deeper
    // down - a card's entrance in a sheet's body - must not hold the picture)
    const leavingNow = () => el.getAnimations({ subtree: true }).filter((a) => { const x = (a.effect as KeyframeEffect | null)?.target; return (x === el || x?.parentNode === el) && a.playState !== 'finished' && a.playState !== 'idle' && a.effect?.getTiming().iterations !== Infinity; });
    if (!leavingNow().length) { drop(g); return; }
    g.end = () => { if (!leavingNow().some((a) => a.playState === 'running')) drop(g); };
    el.addEventListener('animationend', g.end);
    // a safety net in case no animationend comes: when it is due, a leaving animation that began late (a busy page starts it a
    // frame or two after the insertion) is given the rest of its time; never more than a few rounds
    let rounds = 0;
    const due = () => {
      const left = Math.max(0, ...leavingNow().filter((a) => a.playState === 'running').map((a) => Number(a.effect?.getComputedTiming().endTime ?? 0) - Number(a.currentTime ?? 0)));
      if (left > 1 && left < 1000 && rounds++ < 4) g.timer = window.setTimeout(due, left + 20); else drop(g);
    };
    g.timer = window.setTimeout(due, t + 20);
  });
}

function attach(kind: Kind) {
  return (el: HTMLElement | null) => {
    if (!el) return;
    if (watch && el.parentNode) watch.observe(el.parentNode, { childList: true });
    if (kind === 'bogen') cut('bogen');                     // a sheet or the search opens: what is still leaving goes at once
    const id = kind === 'zeile' ? el.getAttribute('data-gehen') : null;
    if (id) { cut('zeile', id, el.parentNode); live.set(id, (live.get(id) ?? 0) + 1); }   // the row is back (Rückgängig)
    return () => {
      leave(el, kind);
      if (!id) return;
      // the last row of this id is gone: its test goes too (it holds the render's closure). After this commit, so a row that
      // stands again at once (Rückgängig; StrictMode's second setting of the ref in development) keeps it
      const n = (live.get(id) ?? 1) - 1; if (n > 0) live.set(id, n); else { live.delete(id); queueMicrotask(() => { if (!live.has(id)) tests.delete(id); }); }
    };
  };
}
/** Ref for a sheet, its scrim and the search (one stable function: React calls its clean-up only when the element goes). */
export const gehtBogen = attach('bogen');
/** Ref for a row of a list; use it through weich(id). */
export const gehtZeile = attach('zeile');
/** Props for a row of a list that leaves softly: <div key={id} {...weich(id)} className="…">. In a list that shows only a
 *  part, gone() tells whether the row's thing is really gone (read the store, not the render's values). */
export function weich(id: string, gone?: () => boolean) { if (gone) tests.set(id, gone); return { ref: gehtZeile, 'data-gehen': id, ...(gone ? { [PART]: '' } : {}) }; }
/** For probes only (docs/wasser-look/entwurf/gehen/sonde.mjs): how much the module holds right now. */
export function stand() { return { tests: tests.size, live: live.size, ghosts: ghosts.size }; }
/** Props for the empty text of a list whose rows leave softly: it comes after the last row has gone. */
export function leer() { return { [EMPTY]: '' }; }
