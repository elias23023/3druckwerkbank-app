/* Wasser-Look: die Vorlage in die LAUFENDE App einspielen (Vorschau - nichts davon ist in die App eingebaut).
   A plain browser script for the preview tools (scripts/wasser/desktop.mjs: "zeigen" and the pictures). It does by hand
   what the app will do itself once the look is built in (NOTIZEN.md, section 10) - nothing more:

   1. THE ROOT   The mobile shell (.m-shell) gets data-wasser="mobil", the desktop stage (.stage) data-wasser="desktop".
                 React swaps the two when the window crosses 900 px: the script follows and starts the look again
                 (Wasser.start(Wasser.MOBIL) or Wasser.start(Wasser.DESKTOP)).
   2. THE THEME  The look has light text in BOTH tones, so the app's own theme stays "dunkel". What the app WANTED chooses
                 the tone (owner's decision 4): dunkel -> tone "dunkel", hell -> tone "klar" (the app's setting
                 "Erscheinungsbild": Automatisch follows the hour, Hell, Dunkel). The mobile shell always asks for
                 "dunkel" today, so there the tone only follows a fixed choice.
   Options, set before this script runs:  window.__wasserVorschau = { ton: 'auto' | 'dunkel' | 'klar', start: { ...options of Wasser.start } }
   The three stylesheets (kern.css, mobil.css, desktop.css) and wasser.js must already be on the page. */
(function () {
  'use strict';
  if (window.__wasserEingespielt || !window.Wasser) return;
  window.__wasserEingespielt = true;
  var html = document.documentElement, opt = window.__wasserVorschau || {}, fixed = opt.ton === 'dunkel' || opt.ton === 'klar' ? opt.ton : '';
  function setTon(t) { if (t === 'klar') html.setAttribute('data-wa-ton', 'klar'); else html.removeAttribute('data-wa-ton'); }

  /* 2. theme -> tone */
  var themes = new MutationObserver(onTheme);
  function onTheme() {
    var t = html.getAttribute('data-theme');
    if (t === 'hell' || t === 'dunkel') { if (!fixed) setTon(t === 'hell' ? 'klar' : 'dunkel'); }
    if (t !== 'dunkel') { html.setAttribute('data-theme', 'dunkel'); themes.takeRecords(); }   // (our own change is not looked at again)
  }
  if (fixed) setTon(fixed);
  themes.observe(html, { attributes: true, attributeFilter: ['data-theme'] });
  onTheme();

  /* 1. root */
  var shell = null;
  function mount() {
    var el = document.querySelector('.m-shell'), kind = 'mobil';
    if (!el) { el = document.querySelector('.stage'); kind = 'desktop'; }
    if (el === shell) return;
    shell = el;
    if (!el) { window.Wasser.stop(); return; }
    el.setAttribute('data-wasser', kind);
    var o = {}, base = kind === 'desktop' ? window.Wasser.DESKTOP : window.Wasser.MOBIL, k;
    for (k in base) o[k] = base[k];
    for (k in opt.start || {}) o[k] = opt.start[k];
    window.Wasser.start(o);
  }
  new MutationObserver(mount).observe(document.getElementById('root') || document.body, { childList: true });
  mount();
})();
