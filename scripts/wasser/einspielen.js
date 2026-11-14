/* Wasser-Look: den Look in einer Hülle starten, die ihn NICHT eingebaut hat (ein älterer Stand der App).
   A plain browser script for the tools (scripts/wasser/desktop-lib.mjs, and "desktop.mjs zeigen"). In a shell without a
   built-in look it does by hand what the app does itself where the look is built in (src/wasser/wasser.ts, App(), Mobile())
   - nothing more:

   1. THE ROOT   The mobile shell (.m-shell) gets data-wasser="mobil", the desktop stage (.stage) data-wasser="desktop".
                 React swaps the two when the window crosses 900 px: the script follows and starts the look again
                 (Wasser.start(Wasser.MOBIL) or Wasser.start(Wasser.DESKTOP)).
   2. THE THEME  The look has light text in BOTH tones, so the app's own theme stays "dunkel". What the app WANTED chooses
                 the tone (owner's decision 4): dunkel -> tone "dunkel", hell -> tone "klar" (the app's setting
                 "Erscheinungsbild": Automatisch follows the hour, Hell, Dunkel).
   A SHELL THAT ALREADY CARRIES data-wasser HAS THE LOOK BUILT IN: there this script does nothing at all - the app starts
   the look itself and chooses the tone itself (a fixed tone is then set through the app's setting, not here).
   Options, set before this script runs:  window.__wasserVorschau = { ton: 'auto' | 'dunkel' | 'klar', start: { ...options of Wasser.start } }
   The three stylesheets (kern.css, mobil.css, desktop.css) and wasser.js must already be on the page. */
(function () {
  'use strict';
  if (window.__wasserEingespielt || !window.Wasser) return;
  window.__wasserEingespielt = true;
  var html = document.documentElement, opt = window.__wasserVorschau || {}, fixed = opt.ton === 'dunkel' || opt.ton === 'klar' ? opt.ton : '';
  var shell = null, ours = false;                                  // ours: WE gave this shell the look (it has none built in)
  function setTon(t) { if (t === 'klar') html.setAttribute('data-wa-ton', 'klar'); else html.removeAttribute('data-wa-ton'); }

  /* 2. theme -> tone (only in a shell we started the look in) */
  var themes = new MutationObserver(onTheme);
  function onTheme() {
    if (!ours) return;
    var t = html.getAttribute('data-theme');
    if (t === 'hell' || t === 'dunkel') { if (!fixed) setTon(t === 'hell' ? 'klar' : 'dunkel'); }
    if (t !== 'dunkel') { html.setAttribute('data-theme', 'dunkel'); themes.takeRecords(); }   // (our own change is not looked at again)
  }
  themes.observe(html, { attributes: true, attributeFilter: ['data-theme'] });

  /* 1. root */
  function mount() {
    var el = document.querySelector('.m-shell'), kind = 'mobil';
    if (!el) { el = document.querySelector('.stage'); kind = 'desktop'; }
    if (el === shell) return;
    var was = ours; shell = el; ours = false;
    if (!el) { if (was) window.Wasser.stop(); return; }
    if (el.hasAttribute('data-wasser')) return;                    // built in: the app's own hook runs the look in this shell
    ours = true;
    el.setAttribute('data-wasser', kind);
    if (fixed) setTon(fixed);
    onTheme();
    var o = {}, base = kind === 'desktop' ? window.Wasser.DESKTOP : window.Wasser.MOBIL, k;
    for (k in base) o[k] = base[k];
    for (k in opt.start || {}) o[k] = opt.start[k];
    if (was === false && window.__wasserGestartet) setTimeout(function () { if (shell === el) window.Wasser.start(o); }, 80);   // (the window crossed 900 px out of a built-in shell: the app's hook stops its own instance a moment later - start after that)
    else window.Wasser.start(o);
    window.__wasserGestartet = true;
  }
  new MutationObserver(mount).observe(document.getElementById('root') || document.body, { childList: true });
  mount();
  window.__wasserGestartet = true;
})();
