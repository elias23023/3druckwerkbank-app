/* Kopie – nicht von Hand ändern. Quelle: docs/wasser-look/vorlage. Neu holen: node scripts/wasser/uebernehmen.mjs */
/* ---- Wasser-Look: das Skript ----
   ONE module for everything of the look that CSS cannot do: the water drops (WebGL), the ring that answers a tap, the
   marker that flows to the active tab, the bead of a choice, a toast that leaves, a level that runs, the light helpers
   of the still sheets, the answer to scrolling, sleep. The look itself is CSS (kern.css, mobil.css, desktop.css); without
   this script it is the still look with plain glass buttons.

   It runs as a plain script (a classic <script>, or injected by the tools in scripts/wasser) and sets ONE global:

     Wasser.start(options)   starts the look inside the root element. One instance at a time: a second start() stops the
                             first. Call it when the root is in the document; returns Wasser.
     Wasser.stop()           removes every helper, listener, observer and timer and gives the WebGL context back. Call it
                             when the root goes away.
     Wasser.MOBIL            the default options: the mobile shell of this app. The base for another shell:
                             Wasser.start(Object.assign({}, Wasser.MOBIL, { scene: '...', shade: '', bar: '...' }))
     Wasser.DESKTOP          the options of the desktop shell (the stage with its panels, top bar and dock):
                             Wasser.start(Wasser.DESKTOP)
     Wasser.info             what the drops are doing, for tests: state ('init', 'gl', 'fallback (reason)', 'context lost',
                             'stopped'), level (governor: 0 = full pace), wait (governor: ms of easy pictures before its
                             next step up), drops, px, atlas, frames, ms, prof, blank (how often a scene image could not be
                             drawn yet)

   Where the look applies is decided by CSS: inside the element that carries the attribute data-wasser
   (data-wasser="mobil" on .m-shell, data-wasser="desktop" on the desktop root). The script only looks inside it.

   In the React app (later): the four files go to src/wasser/, this script under the name wasser-skript.js, and beside
   them a file src/wasser/wasser.ts:
       import './kern.css'; import './mobil.css'; import './desktop.css';        // after the app's own stylesheets
       import './wasser-skript.js';                                              // side effect: window.Wasser
       import { useEffect } from 'react';
       declare global { interface Window { Wasser: { start(o?: Record<string, unknown>): unknown; stop(): unknown } } }
       export function useWasser(options?: Record<string, unknown>) {
         useEffect(() => { window.Wasser.start(options); return () => { window.Wasser.stop(); }; }, []);
       }
   and the root gets the attribute: <div className="m-shell" data-wasser="mobil"> with useWasser() in Mobile().
   (Not wasser.js beside wasser.ts: an import of './wasser/wasser' without extension finds the .js first and the
   build fails with "not exported". Tried with Vite 8: with the names above the build lowers the CSS nesting, keeps
   both backdrop-filter properties, and start / stop work.)

   Four parts, each a function that starts its listeners and returns its own stop:
     Teil 1  Tropfen            the drops and the water's clock (sleep)
     Teil 2  Ring, Markierung   the two answers to a touch
     Teil 3  Wahl, Hinweis, Pegel   three changes of state CSS cannot see
     Teil 4  Licht, Zug         light helpers of the still sheets, the pull of scrolling */
(function () {
  'use strict';
  if (window.Wasser) return;

  /* ------------------------------------------------------------------ options
     Everything the script takes from the page, in one place. All selectors are looked up INSIDE the root. The values
     are the mobile shell; the notes say what each one is for. An empty selector switches its feature off. */
  var MOBIL = {
    root: '[data-wasser]',            // the element the look lives in (the CSS switch itself)
    /* Teil 1: drops */
    scene: '.m-bg img',               // the painted image a drop that lies FREE over the scene bends (one image; if several match, the last one)
    shade: '.m-bg',                   // the element whose ::after darkens that image (a linear-gradient with four stops); the drops copy it. '' = the scene is not darkened
    drops: '.btn:not(.btn--ghost):not(.m-row .btn, .item .btn), .m-ico, .wa-tropfen',   // what becomes a drop (the same elements carry the block "Tropfen" in kern.css). Buttons that repeat per list row stay plain glass beads
    primary: 'btn--primary',          // CLASS of a drop of amber water (--wa-drop-amber); it also sends an amber ring
    danger: 'btn--danger',            // CLASS of a drop of red water (--wa-drop-red); red ring
    badge: 'badge',                   // CLASS of a child of a drop that is not part of its label (the water is kept calm and readable under the label only)
    modal: '.sheet, .cmd-back',       // what covers the page (bottom sheet, the scrim of the search): drops outside it rest while it is there. Keep the same list in the CSS rule "Ruhe hinter einem Bogen" (mobil.css)
    sleep: 30000,                     // ms without touch, scroll or key until the water rests (attribute data-wa-ruht on the root). 0 = never
    /* Teil 2: ring and marker */
    ringOn: '.glass.m-card, .wa-becken, .sheet',   // sheets whose floor shows the ring (they need position: relative and isolation: isolate - the block "Becken" has both)
    ringFrom: '.btn:not(.btn--ghost):not(.sheet__body .btn):not(.m-row .btn, .item .btn), .wa-tropfen, .m-card .check, .wa-becken .wa-haken',   // a tap on one of these starts the ring: buttons (on a bottom sheet only those in its foot, never the ones that repeat per list row), and a check on a card
    tick: '.check, .wa-haken',        // which of them are checks ...
    ticked: ['check--on', 'on'],      // ... and the CLASSES of a ticked one (a check sends its green ring only when it is being ticked)
    bar: '.m-tabs, .wa-markierung',   // bars whose marker (their ::before, block "Markierung") flows to the active child; drops are never made inside a bar
    tabOn: 'on',                      // CLASS of the active child of a bar
    /* Teil 3: changes of state */
    groups: '.pills, .seg, .tabs, .tiles, .island-lib, .wa-wahl',   // groups of labels to choose from (block "Wahl"); the labels are their direct children
    chosen: ['on', 'pill--on'],       // CLASSES of a chosen label
    levels: '.progress, .wa-pegel',   // tubes (block "Pegel"): the water is their first child, its inline width in % is the level
    toasts: '.toast, .wa-hinweis',    // what leaves like a drop when the app removes it (block "Tropfen-Hinweis")
    /* Teil 4: light and pull */
    light: '.glass.m-card, .wa-becken, .sheet, .wa-bogen',   // sheets that get the light helper (block "Licht"; they need a position and isolation: isolate)
    scrollers: '.m-main, .sheet__body',   // lists whose scrolling pulls the light
    /* test aids */
    webgl: true,                      // false: behave like a browser without WebGL (the plain glass of kern.css stays, the clock still runs)
    debug: { flat: false, prof: false, noDeriv: false, cost: null }   // flat: plain copy of the scene inside the drops (to check the alignment); prof: frame cost in Wasser.info.prof; noDeriv: shader path without OES_standard_derivatives; cost: a function (ms) -> ms through which the governor of the drops sees what each water picture cost - to pretend a slow phone and watch it step down and up (scripts/wasser/pruefen.mjs --regler)
  };
  /* The desktop shell (root: the stage, data-wasser="desktop"): only what differs from the mobile shell. Which block each
     desktop element is made of is written in kern.css (the lists) and desktop.css; here only what the script must know. */
  var DESKTOP = {
    scene: '.land img',               // the landscape. ONE image: a drop free over the stage bends the landscape, not the islands, clouds or leaves in front of it - so no live drop where an island may lie behind
    shade: '',                        // the stage is not darkened
    drops: '.btn:not(.btn--ghost):not(.item .btn):not(.panel .btn:not(.btn--primary)), .topbar .chip.btn--icon, .wa-tropfen',   // free over the stage and in sheets: every button that is not a ghost; on a panel only the primary one (the others stay plain glass: there are too many of them); the three round buttons of the top bar
    ringOn: '.glass.panel, .wa-becken, .sheet',
    ringFrom: '.btn:not(.btn--ghost):not(.sheet__body .btn):not(.item .btn), .wa-tropfen, .panel .check, .wa-becken .wa-haken',
    bar: '.dock, .wa-markierung',
    light: '.glass.panel, .wa-becken, .sheet, .wa-bogen',
    scrollers: '.panel__body, .sheet__body'
  };
  (function () { for (var k in MOBIL) if (!(k in DESKTOP)) DESKTOP[k] = MOBIL[k]; })();   // everything else as in the mobile shell
  var SELECTORS = ['scene', 'shade', 'drops', 'modal', 'ringOn', 'ringFrom', 'tick', 'bar', 'groups', 'levels', 'toasts', 'light', 'scrollers'];
  var NOTHING = ':not(*)';            // what an empty selector option becomes: matches no element

  var cur = null, stops = [], info = {};   // the running instance: its options, the stop function of each part, what Wasser.info shows
  var mqReduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  // no motion wanted: the system setting, or the app's own switch "Bewegung: Reduziert" (data-motion on <html>; kern.css reads the same two)
  function still() { return mqReduce.matches || document.documentElement.getAttribute('data-motion') === 'reduziert'; }
  function rootEl() { return cur ? document.querySelector(cur.root) : null; }
  function inRoot(el) { return !!(cur && el && el.closest && el.closest(cur.root)); }

  /* ==================================================================== Teil 1: Tropfen */
  /* ONE shared WebGL context (WebGL 1: every current iPhone and Android phone has it) draws the water drop of every
     visible button into an atlas; each button owns a small 2D canvas helper (.w3-drop, aria-hidden, pointer-events
     none) that receives its part of the atlas. The shader samples the scene image (option "scene"), aligned to the
     viewport like the page paints it (object-fit cover, object-position, scrolling, CSS zoom, the darkening that the
     ::after of option "shade" lays over it), and bends it through an organic drop: flowing outline, lens at the rim,
     slow ripples, one highlight, a shadow, and a ring that runs from the finger.

     What lies between a button and the scene (a card, a sheet) is never assumed: it is read from the computed
     styles at run time (see underOf) and re-read once a second and after class changes. A drop on such a sheet shows
     the SHEET, not the scene behind it: it is handed over as light and shade laid over the sheet (see the end of
     the shader), with a glint of gathered light on the floor below its far side. The colour of that light and how
     much colour the sheet leaves the scene come from the sheet as well (custom properties, see PROP), so a
     colour tone of the look never needs a change in this file. A marker bar (option "bar") is not observed here.

     The water's clock lives here: after "sleep" ms without touch, scroll, key or a moving mouse the drops come to rest, and the root
     carries the attribute REST (data-wa-ruht) until the next touch - everything else in the look that moves at rest
     stops and starts with it (kern.css, "Ruhe", --wa-lauf).

     Without WebGL, with option webgl: false, after a lost context or after an error the plain glass of kern.css stays. */
  function partDrops(cfg, info) {
    var W3 = info; W3.state = 'init'; W3.level = 0;
    var FORCED = cfg.webgl === false;   // test aid: behave like a browser without WebGL (the clock below still runs)
    var SEL = cfg.drops;                // what becomes a drop: looked up inside the root only, never inside a marker bar (BAR)
    var BAR = cfg.bar;
    var MODAL = cfg.modal;              // what covers the page inside the root (bottom sheet, the scrim of the search overlay): drops outside it rest while it is open
    var PAD = 14;                       // local css px the helper reaches beyond the button (== --wa-drop-pad in kern.css)
    var MAX_PX_ONE = 340000;            // device px per drop
    var MAX_PX_ALL = 1500000;           // device px for all visible drops together
    var TEX_W = 2048, TEX_H = 1024;     // landscape texture (power of two, mip-mapped)
    var SLEEP_AFTER = cfg.sleep;        // ms without touch or scroll until the water comes to rest (0 frames a second)
    var REST = 'data-wa-ruht';          // attribute on the root while the water rests: every other loop of the look pauses with it (kern.css, "Ruhe")
    var DPR_CAP = 3;                    // sharp on 3x phones
    var LEVELS = [                      // the governor: stepped DOWN when pictures keep eating more than 80 % of their time slot for 3 s,
      { fps: 60, idle: 15, q: 1 },      // 60 pictures a second while a drop is touched (and 2 s after), 15 while the water only flows
      { fps: 30, idle: 15, q: 1 },      // first fewer pictures,
      { fps: 15, idle: 12, q: 1 },
      { fps: 15, idle: 12, q: 0.67 },   // then fewer pixels (a 3x phone draws like a 2x phone);
      { fps: 12, idle: 12, q: 0.5 },    // this level is left downwards only when one picture takes longer than 100 ms
      { fps: 0, idle: 0, q: 0.5 }       // at last a still drop that only follows scrolling and presses
    ];
    var UP_AFTER = 20000, UP_MAX = 300000;   // ... and UP again one level after UP_AFTER ms of easy pictures (less than 40 % of their slot; from the still level: after that time). A try that fails within 30 s doubles the wait, up to UP_MAX - a phone that was hot for a moment recovers, a slow one is not asked every few seconds. The wait is set back to UP_AFTER when a level reached by a climb has held for the wait (so one failed try does not slow every later climb until reload)
    var TINT = [[1, 1, 1, 0], [1, 0.72, 0.38, 0.7], [0.74, 0.12, 0.16, 0.72]];   // clear, amber (primary), red (danger): used when the properties below are missing
    var PROP = {                        // custom properties a drop reads from its own computed style (all inherited, so a sheet can set them for its buttons)
      under: '--water-under',           // colour + opacity of everything between the button and the landscape (else: computed backgrounds, see underOf)
      light: '--wa-light',              // "r, g, b": colour of the light a drop gathers when it lies on a sheet (glint, crescent, reflections)
      sat: '--wa-sat',                  // number: how much colour the sheet leaves the landscape behind it (the same number as in its backdrop-filter: saturate())
      veil: '--wa-drop-veil',           // number 0..1: how much of the sheet's light a drop on it gathers into its body (1 when missing: the silver drops of the cards)
      sky: '--wa-sky',                  // number 0..1: how much of the built-in cool sky light a drop FREE over the landscape keeps (1 when missing)
      amber: '--wa-drop-amber',         // "r, g, b, amount": tint of the primary drop
      red: '--wa-drop-red'              // "r, g, b, amount": tint of the danger drop
    };
    var FLAT = !!cfg.debug.flat, PROF = !!cfg.debug.prof;   // test aids: plain copy of the landscape (to check the alignment), frame cost in Wasser.info.prof
    var COST = cfg.debug.cost;          // test aid: a function (ms) -> ms through which the governor sees what every water picture cost (pretend a slow phone)
    var STILL_T = 2.4;                  // frozen water time for reduced motion
    var HOVER = 0.3;                    // how far a drop gives way under a MOUSE that rests on it (1 = pressed): it swells a breath towards the pointer and its glint brightens. No ring. A finger never hovers

    var reduced = still, alive = true;

    var shell = null, home = null, modal = null;
    var recs = new Map();               // button -> record
    var seedN = 0, frameNo = 0;
    var gl = null, glc = null, prog = null, U = {}, tex = null, texReady = false, lost = false, deriv = false;
    var scene = { el: null, src: '', nw: 1280, nh: 720, pos: null, wait: null, tried: null, tries: 0 };
    var NO_SHADE = [0, 0, 0.3, 0, 0.7, 0, 1, 0];
    var grad = { col: [0, 0, 0], stops: NO_SHADE, key: '' };   // the page's darkening of the scene (colour, four stops); read from the page (readGradient) before the first picture
    var raf = 0, timer = 0, lastFrame = 0, lastTick = 0, vt = 0, speed = 1, dirty = true, restyle = false, needOne = true;
    var followUntil = 0, nextStyle = 0, lastInput = performance.now(), slow = 0, nap = 0;
    var calm = 0, patience = UP_AFTER, upAt = -1e9, downAt = 0, held = 0;   // governor, the way up (held: ms of pictures drawn since the last climb)
    W3.wait = patience;
    var io = null, ro = null, mo = null, offs = [];
    var bgCache = new Map(), rng = document.createRange(), probe = null, texCv = null;

    /* ------------------------------------------------------------------ shader */
    var VS = 'attribute vec2 aP; void main(){ gl_Position = vec4(aP, 0., 1.); }';
    var FS = [
      // (build() puts "#define DERIV" and the extension line in front when OES_standard_derivatives exists - everywhere in practice)
      '#ifdef GL_FRAGMENT_PRECISION_HIGH',
      'precision highp float;',
      '#else',
      'precision mediump float;',
      '#endif',
      'uniform sampler2D uTex;',
      'uniform vec4 uVp;',      // x, top edge (gl y), w, h of this drop inside the atlas, device px
      'uniform float uPx;',     // device px per local css px
      'uniform vec2 uHalf;',    // half size of the button box, local px
      'uniform float uRad;',    // corner radius, local px
      'uniform vec2 uCtr;',     // button centre, screen css px
      'uniform float uZoom;',   // screen css px per local px (CSS zoom / transforms)
      'uniform vec4 uImg;',     // where the landscape image is painted: x, y, w, h in screen css px
      'uniform vec2 uBgY;',     // top and height of the darkening layer (option "shade"), for its gradient
      'uniform vec4 uG0;',      // darkening stops: pos0, a0, pos1, a1
      'uniform vec4 uG1;',      //                  pos2, a2, pos3, a3
      'uniform vec3 uGCol;',
      'uniform float uTime;',
      'uniform float uSeed;',
      'uniform vec4 uTint;',    // rgb + amount in the middle of the drop (amber for primary, red for danger)
      'uniform vec4 uUnder;',   // the sheet between button and landscape: rgb + its opacity
      'uniform float uWet;',    // 0 = free over the landscape, 1 = the drop lies on a sheet
      'uniform vec4 uLight;',   // colour of the light where the drop lies (the sheet's --wa-light) + how much it replaces the built-in cool white of the open sky
      'uniform float uSat;',    // how much colour the sheet leaves the landscape behind it (the sheet's --wa-sat; 1 = all)
      'uniform float uVeil;',   // how much of the sheet's light a drop gathers into its body (the sheet's --wa-drop-veil; 1 = all)
      'uniform vec4 uPress;',   // touch x, y (local px), press amount, age of the ring in s
      'uniform float uRipA;',   // ring amplitude
      'uniform float uInk;',    // 1 = light label, 0 = dark label
      'uniform vec4 uLab;',     // where the label sits: centre x, y, half width, half height (local px)
      'uniform vec4 uNbL;',     // neighbouring drop on the left: centre x, y, half width, half height (half width 0 = none)
      'uniform vec4 uNbR;',     // ... on the right
      'uniform float uFlat;',   // test aid (?w3flat=1): plain copy of the landscape, to check the alignment
      '',
      'float sdBox(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - r; }',
      'float smin(float a, float b, float k){ float h = clamp(.5 + .5*(b - a)/k, 0., 1.); return mix(b, a, h) - k*h*(1. - h); }',
      // two drops next to each other: the facing flanks swell towards each other (surface tension reaching over),
      // but 4 px of dry glass always stay between them - also while one of them is pressed and spreads
      'float lean(float d, float box, vec2 p, vec4 nb){',
      '  float dn = sdBox(p - nb.xy, nb.zw, min(nb.z, nb.w));',
      '  d -= 2.6*(1. - smoothstep(2., 15., dn));',
      '  return -smin(-d, -((box - dn)*.5 + 2.), 2.);',
      '}',
      '',
      // organic outline: the pill of the button, breathing through three slow wave fields, plus a swelling that
      // wanders along the lower edge and a smaller one along the upper edge. Spreads when pressed.
      'float sdf(vec2 p){',
      '  float t = uTime, s = uSeed*6.2832;',
      '  float n = sin(p.x*.062 + p.y*.085 + t*.52 + s)',
      '          + .45*sin(p.x*.105 - p.y*.071 - t*.41 + s*1.9)',
      '          + .5*sin(-p.x*.047 + p.y*.132 + t*.33 + s*.5);',
      '  float box = sdBox(p, uHalf, uRad);',
      '  float d = box - (.45 + .95*n);',
      '  float run = max(uHalf.x - uRad, 0.);',
      '  float rb = uHalf.y*.62;',
      '  float wide = 1. + clamp(run/max(uRad, 1.), 0., 1.5)*.7;',   // long drops get long, flat swellings
      '  float trav = max(run + uRad*.3 - rb*wide, 2.5);',          // ... that never reach the round ends
      '  vec2 c1 = vec2(sin(t*.23 + s*.7)*trav, uHalf.y - rb + 2.1);',
      '  d = smin(d, length((p - c1)/vec2(wide, 1.)) - rb, 10.);',
      '  vec2 c2 = vec2(sin(t*.17 + s*1.4 + 2.)*trav, -(uHalf.y - rb*.8) - 1.2);',
      '  d = smin(d, length((p - c2)/vec2(wide, 1.)) - rb*.8, 9.);',
      '  d -= uPress.z*2.6;',
      '  if (uNbL.z > .5) d = lean(d, box, p, uNbL);',
      '  if (uNbR.z > .5) d = lean(d, box, p, uNbR);',
      '  return d;',
      '}',
      // 1 where the label sits, 0 towards the rim: there the water rests calmer and is kept readable
      'float lab(vec2 p){ return 1. - smoothstep(-2., 10., sdBox(p - uLab.xy, uLab.zw, min(uLab.z, uLab.w))); }',
      '',
      // height of the water surface above the glass, local px: a steep rim (surface tension) and a flat dome (gH),
      // plus the fine part that hgt() returns: small waves, the ring from the finger, the dimple under it
      'float gH;',              // dome
      'float gB;',              // its exact slope along the distance to the outline
      'float gW;',              // the small waves alone (for their shimmer)
      'float gR;',              // the ring from the finger alone (for its lit and shaded slope)
      'float hgt(vec2 p, float d){',
      '  float hy = min(uHalf.y, 22.);',
      '  float a1 = clamp(-d/(hy*.52), 0., 1.), a2 = clamp(-d/hy, 0., 1.);',
      '  float k1 = 1. - a1, k2 = 1. - a2;',
      '  float prof = 1. - k1*k1*k1, flat_ = 1. - .3*uPress.z;',
      '  gH = (hy*.25*prof + hy*.2*(1. - k2*k2))*flat_;',
      '  gB = -(1.4423*k1*k1*step(1e-4, a1)*step(a1, .9999) + .4*k2*step(1e-4, a2)*step(a2, .9999))*flat_;',
      '  float t = uTime;',
      '  float w = .55*sin(dot(p, vec2(.19, .11)) - t*1.2 + uSeed*19.)',
      '          + .45*sin(dot(p, vec2(-.10, .23)) - t*.92 + uSeed*31.)',
      '          + .35*sin(length(p - vec2(uHalf.x*.6, -uHalf.y*2.2))*.27 - t*1.45);',
      '  gW = w*prof*(1. - max(.75*lab(p), .6*uWet*clamp((uHalf.x - uRad - 26.)/50., 0., 1.)));',   // (a long drop on a sheet is calmer all over, not only under its label: small waves over a long body read as mottle)
      '  float r = length(p - uPress.xy);',
      '  float fr = 5. + uPress.w*66.;',
      '  float q = (r - fr)/7.5;',
      '  gR = uRipA*exp(-q*q)*cos((r - fr)*.46)*prof;',
      '  return .42*gW + gR - uPress.z*hy*.2*exp(-r*r/(uHalf.y*uHalf.y*1.3))*prof;',
      '}',
      '',
      'float darkA(float y){',
      '  float f = clamp((y - uBgY.x)/uBgY.y, 0., 1.);',
      '  float a = mix(uG0.y, uG0.w, clamp((f - uG0.x)/max(uG0.z - uG0.x, 1e-4), 0., 1.));',
      '  a = mix(a, uG1.y, clamp((f - uG0.z)/max(uG1.x - uG0.z, 1e-4), 0., 1.));',
      '  a = mix(a, uG1.w, clamp((f - uG1.x)/max(uG1.z - uG1.x, 1e-4), 0., 1.));',
      '  return a;',
      '}',
      'vec3 scene(vec2 sp, float lod){',
      '  vec2 uv = (sp - uImg.xy)/uImg.zw;',
      '  vec3 c = texture2D(uTex, clamp(uv, 0., 1.), lod).rgb;',
      '  return mix(c, uGCol, darkA(sp.y)*(1. - .5*uWet));',
      '}',
      // the landscape as a SHEET (card, panel) lets it through: as soft as the sheet's backdrop blur (about 32 local px
      // wide), with the page's full darkening
      'vec3 soft(vec2 sp){',
      '  vec3 c = texture2D(uTex, clamp((sp - uImg.xy)/uImg.zw, 0., 1.), 5. + log2(uPx)).rgb;',
      '  c = mix(c, uGCol, darkA(sp.y));',
      '  return mix(vec3(dot(c, vec3(.2126, .7152, .0722))), c, uSat);',   // the sheet mutes the colours behind it (backdrop-filter: saturate)
      '}',
      // a fixed cool white of the open sky, re-tinted to the light of the place where the drop lies (same brightness).
      // uLight.a = 0 (a free drop with --wa-sky: 1) leaves every colour below exactly as it is written.
      'vec3 lt(vec3 c){ return mix(c, uLight.rgb*(dot(c, vec3(.299, .587, .114))/max(dot(uLight.rgb, vec3(.299, .587, .114)), .05)), uLight.a); }',
      '',
      'void main(){',
      '  vec2 fc = vec2(gl_FragCoord.x - uVp.x, uVp.y - gl_FragCoord.y);',
      '  vec2 p = (fc - .5*uVp.zw)/uPx;',
      '  float d = sdf(p);',
      '  gH = 0.; gB = 0.; gW = 0.; gR = 0.;',
      '  float h0 = 0.; if (d < .5) h0 = hgt(p, d);',           // outside the outline the surface is flat
      '  float w0 = gW; float r0 = gR;',
      // slope of the water surface (points uphill = into the drop), of the small waves and of the ring.
      // With screen-space derivatives the surface is evaluated once per pixel instead of three times; the steep dome
      // is differentiated exactly (its slope times the direction of the outline), so the rim stays smooth.
      '#ifdef DERIV',
      '  vec2 g = (gB*vec2(dFdx(d), -dFdy(d)) + vec2(dFdx(h0), -dFdy(h0)))*uPx;',
      '  vec2 gw = vec2(dFdx(w0), -dFdy(w0))*uPx, gr = vec2(dFdx(r0), -dFdy(r0))*uPx;',
      '#else',
      '  float e = .8; h0 += gH;',
      '  float hx = hgt(p + vec2(e, 0.), sdf(p + vec2(e, 0.))) + gH; vec2 gw = vec2(gW - w0, 0.), gr = vec2(gR - r0, 0.);',
      '  float hz = hgt(p + vec2(0., e), sdf(p + vec2(0., e))) + gH; gw.y = gW - w0; gr.y = gR - r0;',
      '  vec2 g = vec2(hx - h0, hz - h0)/e; gw /= e; gr /= e;',
      '#endif',
      '  if (d > 11.){ gl_FragColor = vec4(0.); return; }',
      '  float aIn = clamp(.5 - d*uPx, 0., 1.);',
      '  vec2 L2 = normalize(vec2(-.5, -.86));',                 // light comes from the upper left
      '  vec3 outC = vec3(0.); float outA = 0.;',
      // shadow and the bright spot the drop throws onto the surface below it
      '  if (aIn < 1.){',
      '    float ds = sdf(p - vec2(1.8, 4.));',
      '    float sh = (1. - smoothstep(-4.5, 6., ds))*.34;',
      '    float cs = (1. - smoothstep(-2., 2.5, ds + 1.))*smoothstep(-1., 2., d)*.17;',
      // on a sheet the drop gathers light into a glint on the floor below its far side (lower right), in the colour
      // of the drop; never a line under the whole width. Under the finger it flares. At rest it breathes with its drop:
      // brighter while the swelling that wanders along the lower edge (c1 in sdf, same phase) is at the far end.
      '    if (uWet > 0.){',
      '      float side = smoothstep(uHalf.x - 118., uHalf.x - 50., p.x)*(1. - .55*smoothstep(uHalf.x - 14., uHalf.x + 4., p.x));',
      '      float gl = (1. - smoothstep(-1.5, 3.6 + 2.*uPress.z, ds))*smoothstep(-1., 1.6, d)*side;',
      '      cs = max(cs, gl*(.42 + .12*sin(uTime*.23 + uSeed*4.398) + .5*uPress.z)*uWet);',
      '    }',
      '    vec3 lightC = mix(lt(vec3(.82, .93, 1.)), uTint.rgb, uTint.a*.8);',
      '    outA = sh + cs*(1. - sh);',
      '    outC = lightC*cs;',                                   // premultiplied: the shadow itself is black-blue
      '    outC += lt(vec3(.008, .03, .07))*sh*(1. - cs);',
      '  }',
      '  if (uFlat > .5){ gl_FragColor = vec4(scene(uCtr + p*uZoom, 0.)*aIn, aIn); return; }',
      '  if (aIn > 0.){',
      '    float hy = min(uHalf.y, 22.);',
      '    float gLen = length(g);',
      '    g *= min(1., 2.2/max(gLen, 1e-4));',
      '    vec3 n = normalize(vec3(-g, 1.));',
      '    float u = clamp(-d/(hy*.52), 0., 1.);',               // 0 at the outline, 1 where the rim ends
      '    float core = smoothstep(.15, 1., u);',
      '    float zone = lab(p)*core;',
      // refraction: the rim bends the landscape towards the middle, the body magnifies it
      '    vec2 off = g*hy*.2 - p*.07 - (p - uPress.xy)*.07*uPress.z;',
      '    vec2 sp = uCtr + (p + off)*uZoom;',
      // the squeezed rim is sampled softer (no comb of streaks); softer too on a sheet and under a dark label
      '    float lod = uWet*1.6 + (1. - u)*2. + (1. - uInk)*(.8 + .9*zone);',
      '    vec3 col = vec3(0.), est = vec3(0.);',
      // A LONG drop on a sheet gathers its light at its far END, like a short one - not along its whole lower edge, where it
      // read as a chrome tube. How long: the straight run of the pill, 0 at 26 px ("Bearbeiten" stays as it was approved) to 1
      // at 76 px and more ("Verbrauch buchen" .6, the full-width buttons 1). along = how much of the gathered light a place
      // gets: 1 everywhere on a short drop, on a long one 1 at the far end and .2 elsewhere.
      '    float along = mix(1., .2 + .8*smoothstep(uHalf.x - 130., uHalf.x - 24., p.x), uWet*clamp((uHalf.x - uRad - 26.)/50., 0., 1.));',
      '    if (uWet < 1.){',                                      // (a drop that lies fully on a sheet never looks at the sharp landscape)
      '      col = scene(sp, lod);',
      // no colour fringe at rest (it is water, not a soap bubble); a breath of it while the drop is touched
      '      float disp = .014*uPress.z + .003*uRipA;',
      '      if (disp > .002){',
      '        col.r = scene(uCtr + (p + off*(1. - disp))*uZoom, lod).r;',
      '        col.b = scene(uCtr + (p + off*(1. + disp))*uZoom, lod).b;',
      '      }',
      '      col = mix(col, uUnder.rgb, uUnder.a);',
      '    }',
      // a drop on a sheet shows the SHEET, not the landscape behind it. est = what the sheet shows at this very place
      // (soft landscape under the sheet colour at its real opacity); the water of the drop is a touch clearer than that
      '    if (uWet > 0.){',
      '      vec3 sl = soft(uCtr + p*uZoom);',
      '      est = mix(sl, uUnder.rgb, uUnder.a);',
      '      col = mix(col, mix(sl, uUnder.rgb, uUnder.a*.92), uWet);',
      '    }',
      // a breath of sky in the water, so that a drop over dark ground is still a drop
      '    col += (1. - col)*lt(vec3(.03, .045, .065));',
      // ... and on a sheet the drop is a lens: it gathers the sheet's light. Its lit side stays nearly as dark as the water
      // around it, its far side glows, and its whole body carries a veil of that light - the darker the sheet, the more
      // ("room"), so a clear drop is a body of water on black water too and never a grey pebble on light water
      '    if (uWet > 0.){',
      '      float far = clamp(dot(p/uHalf, vec2(.3, .95))*.5 + .5, 0., 1.);',
      '      float glow = far*far*(.5 + .5*smoothstep(uHalf.x - 150., uHalf.x - 40., p.x));',   // a long drop glows at its far end, not along its whole length
      '      vec3 room = (1. - col)*(1. - col);',
      '      col = col*(1. + uWet*(-.12 + glow)) + lt(vec3(.75, .9, 1.))*room*uWet*uVeil*(.056 + .104*far*(.55 + .45*along) + .1*glow);',
      '    }',
      '    col *= lt(vec3(.95, .985, 1.));',                      // clear water: a touch of blue-green absorption
      '    float luma = dot(col, vec3(.299, .587, .114));',
      // tinted water (amber = the primary action): the rim stays more see-through than the middle,
      // and over dark ground the tint carries more
      '    float ty = clamp(p.y/uHalf.y*.5 + .5, 0., 1.);',
      '    vec3 tintC = uTint.rgb*mix(vec3(1.05, 1.05, 1.08), vec3(1., .9, .82), ty)*(.94 + .2*luma);',
      '    float tintK = min(uTint.a*mix(.72, 1., core) + (1. - luma)*.22*core, .94)*step(.01, uTint.a);',
      '    col = mix(col, tintC, tintK);',
      // the label stays readable. Light label: where it sits, the water is kept just dark enough for 4.5:1 - as
      // deeper, bluer water, never more than 38 %. Dark label: the water is kept bright enough.
      '    float L = dot(col*col, vec3(.2126, .7152, .0722));',
      '    float k = clamp(sqrt(.21/max(L, 1e-4)), .62, 1.);',
      '    col *= mix(vec3(1.), pow(lt(vec3(.80, .94, 1.07)), vec3((1. - k)*3.))*k, zone*uInk);',
      // (a free drop without the built-in sky blue: the deeper water keeps the colour of what lies behind it instead - richer, never grey)
      '    col = mix(vec3(dot(col, vec3(.299, .587, .114))), col, 1. + 1.2*(1. - k)*zone*uInk*uLight.a*(1. - uWet));',
      '    col += uTint.rgb*max(.6 - dot(col, vec3(.299, .587, .114)), 0.)*zone*(1. - uInk);',
      // water texture: the small waves catch the light; the ring from the finger has a lit and a shaded slope
      '    col *= 1. + clamp(dot(gw, L2)*1.1, -.09, .13)*(1. - .55*uTint.a);',
      '    float rl = dot(gr, L2);',
      '    col = col*(1. + clamp(rl*.55, -.26, .4)) + lt(vec3(.75, .88, 1.))*clamp(rl*.08, 0., .13);',
      // light gathers on the side away from the light, the lit side gets a thin dark contour
      '    vec2 dir = gLen > 1e-3 ? -g/gLen : vec2(0.);',        // outward
      '    float away = max(dot(dir, -L2), 0.);',
      '    float toward = max(dot(dir, L2), 0.);',
      '    float band = smoothstep(0., .25, u)*(1. - smoothstep(.35, 1., u));',
      '    col += (col*.62 + mix(lt(vec3(.75, .9, 1.)), uTint.rgb, min(uTint.a*1.3, 1.))*(.15 + .12*uWet))*band*pow(away, 1.5 + uWet)*(1. - .6*uTint.a)*along;',
      '    col *= 1. - .3*(1. - smoothstep(0., .45, u))*toward;',
      // reflection of the sky on the steep rim
      '    float fres = pow(max(1. - n.z, 0.), 2.2);',
      '    vec3 sky = mix(lt(vec3(.3, .4, .52)), lt(vec3(.92, .97, 1.)), smoothstep(-.35, .75, -n.y - n.x*.4));',
      '    col = mix(col, sky, fres*.36);',
      // one crisp highlight and a faint second one
      '    vec3 Lk = normalize(vec3(-.42, -.72, .55));',
      '    vec3 Hk = normalize(Lk + vec3(0., 0., 1.));',
      '    float nh = max(dot(n, Hk), 0.);',
      '    vec3 Hf = normalize(normalize(vec3(.5, .8, .45)) + vec3(0., 0., 1.));',
      '    float sp3 = pow(max(dot(n, Hf), 0.), 40.);',
      '    col += vec3(1.)*(smoothstep(.984, .996, nh)*.9 + pow(nh, 36.)*.1) + mix(lt(vec3(.8, .92, 1.)), uTint.rgb, uTint.a*.6)*sp3*.18;',
      // meniscus: one thin light line
      '    float rim = 1. - smoothstep(0., 1.3, -d);',
      '    col += vec3(1.)*rim*(.05 + .46*pow(toward, 2.) + .3*pow(away, 2.));',
      '    col += vec3(1.)*uPress.z*.06;',
      '    col = clamp(col, 0., 1.);',
      // On a sheet the drop is handed over as light and shade LAID OVER the sheet, as see-through as it can be while
      // still giving exactly this picture over the sheet as estimated ("colour to alpha" against est). So whatever the
      // sheet really shows under the drop - its real blur, its depth steps, a row, a ring of light passing by - stays
      // visible through the clear water, and no patch of a different picture can appear. Tinted water hides as much as its tint.
      '    float cov = 1.;',
      '    if (uWet > 0.){',
      '      est = clamp(est, .004, .98);',
      '      vec3 lo = 1. - col/est, hi = (col - est)/(1. - est);',
      '      cov = mix(1., clamp(max(max(max(lo.r, lo.g), max(lo.b, hi.r)), max(max(hi.g, hi.b), tintK)), 0., 1.), uWet);',
      '      col -= (1. - cov)*est;',                              // premultiplied from here on
      '    }',
      '    outC = col*aIn + outC*(1. - aIn);',
      '    outA = cov*aIn + outA*(1. - aIn);',
      '  }',
      '  gl_FragColor = vec4(outC, outA);',
      '}'
    ].join('\n');
    var UNI = ['uTex', 'uVp', 'uPx', 'uHalf', 'uRad', 'uCtr', 'uZoom', 'uImg', 'uBgY', 'uG0', 'uG1', 'uGCol', 'uTime', 'uSeed', 'uTint', 'uUnder', 'uWet', 'uLight', 'uSat', 'uVeil',
      'uPress', 'uRipA', 'uInk', 'uLab', 'uNbL', 'uNbR', 'uFlat'];

    /* ------------------------------------------------------------------ GL setup */
    function initGL() {
      if (gl) return true;
      try {
        glc = document.createElement('canvas'); glc.width = 16; glc.height = 16;
        var opt = { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' };
        gl = FORCED ? null : glc.getContext('webgl', opt) || glc.getContext('experimental-webgl', opt);
        if (!gl) throw new Error(FORCED ? 'forced' : 'no webgl');
        glc.addEventListener('webglcontextlost', function (e) { if (!alive) return; e.preventDefault(); lost = true; texReady = false; allOff(); W3.state = 'context lost'; });   // (not alive: stop() has given the context back itself)
        glc.addEventListener('webglcontextrestored', function () { if (!alive) return; lost = false; try { build(); loadScene(true); kick(); } catch (err) { fail(err); } });
        build();
        return true;
      } catch (err) { fail(err); return false; }
    }
    function sh(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('shader: ' + gl.getShaderInfoLog(s));
      return s;
    }
    function build() {
      deriv = !cfg.debug.noDeriv && !!gl.getExtension('OES_standard_derivatives');
      prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, (deriv ? '#extension GL_OES_standard_derivatives : enable\n#define DERIV 1\n' : '') + FS));
      gl.bindAttribLocation(prog, 0, 'aP'); gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link: ' + gl.getProgramInfoLog(prog));
      gl.useProgram(prog);
      UNI.forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
      var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND); gl.clearColor(0, 0, 0, 0);
      tex = gl.createTexture(); texReady = false;
      W3.state = 'gl';
    }
    function fail(err) {
      W3.state = 'fallback (' + (err && err.message ? err.message : err) + ')';
      lost = true; recs.forEach(function (r) { detach(r); }); gl = null;      // the plain glass of kern.css takes over
      if (window.console && !FORCED) console.warn('[wasser] fallback:', err);
    }
    function allOff() { recs.forEach(function (r) { r.btn.removeAttribute('data-w3'); r.painted = false; }); }

    /* ------------------------------------------------------------------ landscape texture */
    // The app replaces the scene <img> by a NEW element when the tab changes: always look the current one up,
    // keep the old picture until the new one has loaded, then upload it.
    function sceneImg() { var all = shell && cfg.scene ? shell.querySelectorAll(cfg.scene) : []; return all.length ? all[all.length - 1] : null; }   // (several images, for example during a crossfade: the newest)
    function shadeEl() { return shell && cfg.shade ? shell.querySelector(cfg.shade) : null; }
    function loadScene(force) {
      var img = sceneImg();
      scene.el = img;
      if (!img) return;
      if (scene.wait !== img) {             // every image tells us when it (or another srcset candidate) has loaded
        scene.wait = img;
        img.addEventListener('load', function () { if (scene.el === img) { loadScene(false); kick(); } });
      }
      if (!img.complete || !img.naturalWidth) return;
      var src = img.currentSrc || img.src;
      if (!force && src === scene.src && texReady) return;
      if (!gl || lost) return;
      try {
        var max = gl.getParameter(gl.MAX_TEXTURE_SIZE), w = Math.min(TEX_W, max), h = Math.min(TEX_H, max);
        var c = texCv || (texCv = document.createElement('canvas')); c.width = w; c.height = h;
        var cx = c.getContext('2d'); cx.drawImage(img, 0, 0, w, h);
        // WebKit can fire "load" one frame before the image can be drawn: the canvas stays empty, and the drops free over the
        // scene would be black until the next scene. An empty canvas (the scene is a photo: its middle is never see-through)
        // is not uploaded; the old picture stays and the next frame looks again (at most 30 times per image).
        if (scene.tried !== img) { scene.tried = img; scene.tries = 0; }
        if (scene.tries < 30 && cx.getImageData(w >> 1, h >> 1, 1, 1).data[3] === 0) {
          scene.tries++; W3.blank = (W3.blank || 0) + 1; requestAnimationFrame(function () { if (alive && scene.el === img) { loadScene(false); kick(); } }); return;
        }
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, c);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        scene.src = src; scene.nw = img.naturalWidth; scene.nh = img.naturalHeight; scene.pos = null; texReady = true;
        readGradient();
      } catch (err) { fail(err); }
    }
    // the darkening the page lays over the scene (::after of option "shade"), read from the real style so the copy never drifts from the page
    function readGradient() {
      var bg = shadeEl(); if (!bg) { grad.key = ''; grad.stops = NO_SHADE; return; }   // no darkening layer on this page
      var s = getComputedStyle(bg, '::after').backgroundImage || '';
      if (s === grad.key) return; grad.key = s;
      var re = /rgba?\(([^)]+)\)\s*([\d.]+)%/g, m, st = [], col = null;
      while ((m = re.exec(s))) {
        var v = m[1].split(/[,\s/]+/).filter(Boolean).map(parseFloat);
        if (!col) col = [v[0] / 255, v[1] / 255, v[2] / 255];
        st.push(parseFloat(m[2]) / 100, v.length > 3 ? v[3] : 1);
      }
      if (/^linear-gradient\((?:180deg,\s*|to bottom,\s*)?rgb/.test(s) && st.length === 8) { grad.col = col; grad.stops = st; }
      else if (s === 'none' || !s) { grad.stops = NO_SHADE; }
    }

    /* ------------------------------------------------------------------ what lies under a button */
    function parseCol(s) {
      var m = /(rgba?|color)\(([^()]+)\)/.exec(s || ''); if (!m) return null;
      var v = m[2].split(/[,\s/]+/).filter(Boolean), f = 1 / 255;
      if (m[1] === 'color') { v.shift(); f = 1; }
      v = v.map(parseFloat);
      if (v.length < 3 || v.some(isNaN)) return null;
      return [v[0] * f, v[1] * f, v[2] * f, v.length > 3 ? v[3] : 1];
    }
    // any CSS colour (custom property, as written) -> [r, g, b, a]
    function cssCol(v) {
      if (!probe) probe = document.createElement('canvas').getContext('2d');
      probe.fillStyle = '#010203'; probe.fillStyle = v;
      var s = probe.fillStyle;
      if (s === '#010203') return null;
      if (s.charAt(0) === '#') return [parseInt(s.substr(1, 2), 16) / 255, parseInt(s.substr(3, 2), 16) / 255, parseInt(s.substr(5, 2), 16) / 255, 1];
      return parseCol(s);
    }
    // the paint of one ancestor: its background colour, or the mean of its gradient colours
    function bgOf(el) {
      var c = bgCache.get(el); if (c !== undefined) return c;
      var cs = getComputedStyle(el); c = parseCol(cs.backgroundColor);
      if ((!c || !c[3]) && /gradient\(/.test(cs.backgroundImage)) {
        var re = /rgba?\([^()]+\)/g, m, n = 0, acc = [0, 0, 0, 0], k;
        while ((m = re.exec(cs.backgroundImage))) { k = parseCol(m[0]); if (k) { acc[0] += k[0] * k[3]; acc[1] += k[1] * k[3]; acc[2] += k[2] * k[3]; acc[3] += k[3]; n++; } }
        c = n && acc[3] ? [acc[0] / acc[3], acc[1] / acc[3], acc[2] / acc[3], acc[3] / n] : c;
      }
      bgCache.set(el, c || null); return c || null;
    }
    // Colour and opacity of everything between this button and the landscape. A sheet that paints itself in a way
    // the script cannot read (canvas, pseudo-element, image) states it with the inherited property --water-under.
    // Returns rgb, the opacity of that colour, and "lies on a sheet" (0..1).
    function underOf(btn, cs) {
      var v = cs.getPropertyValue(PROP.under), c = v && v.trim() ? cssCol(v.trim()) : null, el, k, a;
      if (!c) {
        c = [0, 0, 0, 0];
        for (el = btn.parentElement; el && el !== shell; el = el.parentElement) {
          k = bgOf(el); if (!k || !(k[3] > 0)) continue;
          a = c[3] + k[3] * (1 - c[3]);                                  // c lies over k
          c = [(c[0] * c[3] + k[0] * k[3] * (1 - c[3])) / a, (c[1] * c[3] + k[1] * k[3] * (1 - c[3])) / a, (c[2] * c[3] + k[2] * k[3] * (1 - c[3])) / a, a];
          if (a > 0.995) break;
        }
      }
      a = Math.max(0, Math.min(1, c[3]));
      // the drop shows the sheet at its real opacity (it no longer turns the sheet clear where it lies)
      return [c[0], c[1], c[2], a, Math.min(1, a * 2.5)];
    }

    // a list of numbers in a custom property ("r, g, b" or "r, g, b, amount"), or null
    function nums(cs, name, n) {
      var v = cs.getPropertyValue(name).split(',').map(parseFloat);
      return v.length >= n && !v.slice(0, n).some(isNaN) ? v : null;
    }
    // The light of the place where a drop lies: rgb of the sheet's light, and how much it replaces the shader's own
    // cool sky white - fully on a sheet; for a drop free over the landscape as much as --wa-sky leaves (1 = nothing).
    function lightOf(cs, wet) {
      var l = nums(cs, PROP.light, 3), sky = parseFloat(cs.getPropertyValue(PROP.sky));
      if (!l) return [1, 1, 1, 0];
      if (!(sky >= 0 && sky <= 1)) sky = 1;
      return [l[0] / 255, l[1] / 255, l[2] / 255, wet + (1 - wet) * (1 - sky)];
    }

    /* ------------------------------------------------------------------ helpers per button */
    function attach(btn) {
      var cv = document.createElement('canvas');
      cv.className = 'w3-drop'; cv.setAttribute('aria-hidden', 'true'); cv.width = 2; cv.height = 2;
      var r = { btn: btn, cv: cv, ctx: cv.getContext('2d'), seed: (seedN++ * 0.6180339887) % 1, vis: true, painted: false, behind: false, stale: false,
        w: 0, h: 0, cw: 0, ch: 0, rad: 0, tint: TINT[0], under: [0, 0, 0, 0, 0], light: [1, 1, 1, 0], sat: 1, veil: 1, ink: 1, lab: [0, 0, 6, 6], parent: null, rect: null, seen: -1, last: '',
        px: 0, py: 0, pv: 0, pvel: 0, ptarget: 0, hov: 0, ripT: -1, ripA: 0 };
      recs.set(btn, r);
      btn.insertBefore(cv, btn.firstChild);
      if (io) io.observe(btn); if (ro) ro.observe(btn);
      measure(r);
      return r;
    }
    function detach(r) {
      recs.delete(r.btn);
      if (io) io.unobserve(r.btn); if (ro) ro.unobserve(r.btn);
      if (r.cv.parentNode) r.cv.parentNode.removeChild(r.cv);
      r.btn.removeAttribute('data-w3');
    }
    function measure(r) {
      var btn = r.btn, cs = getComputedStyle(btn);
      var w = parseFloat(cs.width) || 0, h = parseFloat(cs.height) || 0;
      var bl = parseFloat(cs.borderLeftWidth) || 0, bt = parseFloat(cs.borderTopWidth) || 0;
      r.w = w; r.h = h;
      r.cw = w - 2 * bl + 2 * PAD; r.ch = h - 2 * bt + 2 * PAD;   // the helper hangs on the padding box
      r.rad = Math.min(w, h) / 2;                                 // every drop starts from the pill of its button
      var cl = btn.classList, kind = cl.contains(cfg.primary) ? 1 : cl.contains(cfg.danger) ? 2 : 0;
      var t = kind ? nums(cs, kind === 1 ? PROP.amber : PROP.red, 4) : null;
      r.tint = t ? [t[0] / 255, t[1] / 255, t[2] / 255, t[3]] : TINT[kind]; r.ink = kind === 1 ? 0 : 1;
      r.parent = btn.parentNode; r._cls = btn.className; r.stale = false;
      r.under = underOf(btn, cs);
      r.light = lightOf(cs, r.under[4]);
      var sat = parseFloat(cs.getPropertyValue(PROP.sat)); r.sat = sat >= 0 ? sat : 1;
      var veil = parseFloat(cs.getPropertyValue(PROP.veil)); r.veil = veil >= 0 ? veil : 1;
      // where the label sits (text and icons, not the badge): there the water is calmer and kept readable
      var b = btn.getBoundingClientRect(), z = b.width / (w || 1) || 1, L = 1e9, T = 1e9, R = -1e9, B = -1e9, i, n, q;
      for (i = 0; i < btn.childNodes.length; i++) {
        n = btn.childNodes[i]; q = null;
        if (n === r.cv) continue;
        if (n.nodeType === 3) { if (/\S/.test(n.nodeValue)) { rng.selectNodeContents(n); q = rng.getBoundingClientRect(); } }
        else if (n.nodeType === 1 && !(n.classList && n.classList.contains(cfg.badge))) q = n.getBoundingClientRect();
        if (q && q.width && q.height) { L = Math.min(L, q.left); T = Math.min(T, q.top); R = Math.max(R, q.right); B = Math.max(B, q.bottom); }
      }
      r.lab = R > L ? [((L + R) / 2 - (b.left + b.width / 2)) / z, ((T + B) / 2 - (b.top + b.height / 2)) / z, (R - L) / 2 / z + 2, (B - T) / 2 / z + 2] : [0, 0, 8, 8];
    }
    function measureAll() { bgCache.clear(); readGradient(); recs.forEach(measure); nextStyle = performance.now() + 1000; }   // (the page's darkening too: its strengths are tone tokens, a live switch of the tone changes them)

    function scan() {
      dirty = false;
      if (!shell || !shell.isConnected) { shell = rootEl(); wire(); }
      var all = shell ? shell.querySelectorAll(SEL) : [], seen = new Set(), i, btn, r, fresh = false;
      if (all.length && !gl && !lost) { if (!initGL()) return; }
      if (lost && !gl) return;
      modal = shell ? shell.querySelector(MODAL) : null;          // an open sheet or the search overlay: the drops behind it rest
      if (restyle) { bgCache.clear(); readGradient(); }
      for (i = 0; i < all.length; i++) {
        btn = all[i];
        if (BAR && btn.closest(BAR)) continue;
        seen.add(btn); r = recs.get(btn);
        if (!r) { r = attach(btn); fresh = true; }
        else {
          if (r.cv.parentNode !== btn) btn.insertBefore(r.cv, btn.firstChild);
          if (restyle || r.stale || r.parent !== btn.parentNode || r._cls !== btn.className) measure(r);
        }
        r.behind = !!modal && !modal.contains(btn);
        if (r.behind) { r.ptarget = r.pv = r.pvel = r.hov = 0; r.ripT = -1; }   // a drop that disappears behind a sheet is not drawn any more, so its press and its ring would never end: they end here (else the water behind kept the whole loop at the pace of a touched drop for as long as the sheet was open)
      }
      restyle = false;
      recs.forEach(function (rr, b) { if (!seen.has(b) || !b.isConnected) detach(rr); });
      if (fresh) followUntil = performance.now() + 700;         // new buttons may still slide in (card animation)
      loadScene(false);
    }

    /* ------------------------------------------------------------------ frame */
    function next() { timer = 0; if (!raf && !document.hidden) raf = requestAnimationFrame(frame); }
    function kick() { needOne = true; if (timer) clearTimeout(timer); next(); }
    // Asleep together, awake together: SLEEP_AFTER ms after the last touch, scroll or key the shell is marked as resting
    // (REST); the next one wakes it. One timer per time awake, re-armed only when it fires - a scroll event costs nothing.
    function doze() {
      nap = 0;
      var left = SLEEP_AFTER - (performance.now() - lastInput);
      if (left > 30) { nap = setTimeout(doze, left); return; }
      var sh = shell && shell.isConnected ? shell : rootEl();
      if (sh) sh.setAttribute(REST, '');
    }
    function wake() {
      lastInput = performance.now();
      if (SLEEP_AFTER && !nap) { var sh = document.querySelectorAll('[' + REST + ']'); for (var i = 0; i < sh.length; i++) sh[i].removeAttribute(REST); nap = setTimeout(doze, SLEEP_AFTER); }
      kick();
    }
    function frame(now) {
      raf = 0;
      if (dirty) scan();
      if (lost || !gl || !recs.size) return;
      if (now > nextStyle) measureAll();                          // cards may have changed their paint
      if (!LEVELS[W3.level].fps && now - downAt > patience) { W3.level--; upAt = now; calm = slow = held = 0; }   // governor: the still level is left after the wait (the loop only comes here on a touch or scroll)
      var lv = LEVELS[W3.level], still = reduced() || !lv.fps;
      var tick = Math.min(0.1, Math.max(0, (now - lastTick) / 1000)); lastTick = now;
      // the water comes to rest when nobody has touched the screen for a while and wakes with the next touch
      var awake = !SLEEP_AFTER || now - lastInput < SLEEP_AFTER;
      speed += ((awake ? 1 : 0) - speed) * Math.min(1, tick * (awake ? 5 : 1.3));
      if (!awake && speed < 0.03) speed = 0;
      var active = false;                                         // a pressed drop or a running ring
      recs.forEach(function (r) {
        if (still) { if (r.pv !== r.ptarget || r.ripT >= 0) { r.pv = r.ptarget; r.pvel = 0; r.ripT = -1; needOne = true; } }   // no spring, no ring: the pressed state is one still picture
        else if (r.vis && (r.ptarget >= 1 || Math.abs(r.pv - r.ptarget) > 0.002 || Math.abs(r.pvel) > 0.01 || r.ripT >= 0)) active = true;   // (a drop under a resting mouse has come to rest too: only a pressed one, a moving one or a ring keeps the fast pace)
      });
      var flowing = !still && (speed > 0 || active), follow = now < followUntil;
      var fps = active ? lv.fps : lv.idle;
      var timeDue = needOne || (flowing && now - lastFrame >= 1000 / fps - 3);
      var any = true;
      if (timeDue || follow) {
        var dt = Math.min(0.1, Math.max(0.001, (now - lastFrame) / 1000));
        var t1 = performance.now(), res;
        try { res = render(now, dt, still, timeDue); } catch (err) { fail(err); return; }
        any = res !== 0;
        if (res === 2) {                                          // a picture was drawn
          var cost = performance.now() - t1;
          if (COST) cost = COST(cost);
          W3.ms = W3.ms ? W3.ms * 0.9 + cost * 0.1 : cost;
          // governor: three seconds of pictures that eat more than 80 % of their time slot (or, while a drop is
          // touched, a screen that manages fewer than 20 pictures a second) -> one level down; a calm stretch of easy
          // pictures (UP_AFTER) -> one level up again
          if (timeDue && flowing) {
            if (patience > UP_AFTER && upAt > downAt && (held += Math.min(dt * 1000, 250)) > patience) W3.wait = patience = UP_AFTER;   // the level reached by the last climb has held for the wait: the next climb waits the short time again
            var last = W3.level >= LEVELS.length - 2;
            if (cost > (last ? 100 : 800 / fps) || (active && !last && tick > 0.05)) {
              slow += Math.min(dt * 1000, 250); calm = 0;
              if (slow > 3000 && W3.level < LEVELS.length - 1) { W3.level++; slow = 0; downAt = now; if (now - upAt < 30000) W3.wait = patience = Math.min(patience * 2, UP_MAX); }   // (a try to go up that failed: wait longer before the next one)
            } else {
              slow = Math.max(0, slow - 2 * dt * 1000);
              if (W3.level) { calm = cost < 400 / fps ? calm + Math.min(dt * 1000, 250) : Math.max(0, calm - 2 * dt * 1000); if (calm > patience) { W3.level--; upAt = now; calm = slow = held = 0; } }
            }
          }
        }
      }
      if ((any && flowing) || active || follow || dirty) {
        // between two pictures of the resting water the page sleeps (about 15 wake-ups a second, not 60)
        var wait = active || follow || dirty || needOne ? 0 : 1000 / fps - (now - lastFrame);
        if (wait > 30) timer = setTimeout(next, wait - 14); else raf = requestAnimationFrame(frame);
      }
    }

    var NONE = [0, 0, 0, 0];
    function neighbour(r, el) {            // the drop next to this one in the same row, in local px of this drop
      var q = el ? recs.get(el) : null;
      if (!q || q.seen !== frameNo) return NONE;
      var z = r.rect.width / r.cw;
      var cx = ((q.rect.left + q.rect.right) - (r.rect.left + r.rect.right)) / 2 / z, cy = ((q.rect.top + q.rect.bottom) - (r.rect.top + r.rect.bottom)) / 2 / z;
      if (Math.abs(cy) > Math.min(r.h, q.h) * 0.5 || Math.abs(cx) - (r.w + q.w) / 2 > 16) return NONE;
      return [cx, cy, q.w / 2, q.h / 2];
    }

    // returns 0 = nothing visible, 1 = nothing changed, 2 = drawn
    function render(now, dt, still, force) {
      if (!texReady) { loadScene(false); if (!texReady) return 0; }   // the image's load event starts the water
      var img = scene.el && scene.el.isConnected ? scene.el : null;
      var bgEl = shadeEl();
      if (!img && !bgEl) return 0;
      var pA = PROF ? performance.now() : 0;
      var dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, DPR_CAP) * LEVELS[W3.level].q);
      var vw = window.innerWidth, vh = window.innerHeight;
      var list = [], total = 0, moved = false, key;
      frameNo++;
      recs.forEach(function (r) {
        if (!r.vis || r.behind || r.w < 6 || r.h < 6) return;
        var b = r.cv.getBoundingClientRect();
        if (b.width < 2 || b.height < 2 || b.bottom < 0 || b.top > vh || b.right < 0 || b.left > vw) return;
        r.rect = b; r.seen = frameNo;
        key = b.left + ',' + b.top + ',' + b.width + ',' + b.height; if (key !== r.last) { r.last = key; moved = true; }
        var s = dpr, a = b.width * b.height * s * s;
        if (a > MAX_PX_ONE) s *= Math.sqrt(MAX_PX_ONE / a);
        else if (a < 17000) s *= Math.min(1.6, Math.sqrt(17000 / a));   // very small canvases may not get a GPU surface
        r.s = s; total += b.width * b.height * s * s;
        list.push(r);
      });
      if (!list.length) return 0;
      if (moved) followUntil = Math.max(followUntil, now + 250);  // something carries the buttons along: keep following while it moves
      else if (!force) return 1;                                  // following a scroll or an animation: nothing moved
      lastFrame = now; needOne = false;
      if (!still) vt += dt * speed;
      var squeeze = total > MAX_PX_ALL ? Math.sqrt(MAX_PX_ALL / total) : 1;
      // shelf packing into a tight, roughly square atlas
      var x = 0, y = 0, rowH = 0, i, r, area = 0, maxW = 0;
      for (i = 0; i < list.length; i++) {
        r = list[i];
        r.bw = Math.max(2, Math.round(r.rect.width * r.s * squeeze)); r.bh = Math.max(2, Math.round(r.rect.height * r.s * squeeze));
        area += r.bw * r.bh; if (r.bw > maxW) maxW = r.bw;
      }
      var AW = Math.max(maxW, Math.min(2048, Math.ceil(Math.sqrt(area) * 1.3))), needW = 0;
      for (i = 0; i < list.length; i++) {
        r = list[i];
        if (x + r.bw > AW && x > 0) { x = 0; y += rowH + 1; rowH = 0; }
        r.ax = x; r.ay = y; x += r.bw + 1; if (r.bh > rowH) rowH = r.bh; if (x > needW) needW = x;
      }
      var needH = y + rowH;
      if (glc.width < needW || glc.height < needH || glc.width * glc.height > needW * needH * 2.5 + 65536) { glc.width = needW; glc.height = needH; }
      var GH = glc.height;

      // where the landscape image is painted (object-fit: cover + object-position)
      var ir = (img || bgEl).getBoundingClientRect(), nw = scene.nw, nh = scene.nh;
      if (!scene.pos && img) {
        var op = (getComputedStyle(img).objectPosition || '50% 50%').split(' ');
        scene.pos = [/%/.test(op[0]) ? parseFloat(op[0]) / 100 : 0.5, /%/.test(op[1] || '') ? parseFloat(op[1]) / 100 : 0.5];
      }
      var fx = scene.pos ? scene.pos[0] : 0.5, fy = scene.pos ? scene.pos[1] : 0.5;
      var sc = Math.max(ir.width / nw, ir.height / nh), dw = nw * sc, dh = nh * sc;
      var br = bgEl ? bgEl.getBoundingClientRect() : ir;
      var time = reduced() ? STILL_T : vt;

      var pB = PROF ? performance.now() : 0;
      gl.useProgram(prog);
      gl.viewport(0, 0, glc.width, glc.height); gl.disable(gl.SCISSOR_TEST); gl.clear(gl.COLOR_BUFFER_BIT); gl.enable(gl.SCISSOR_TEST);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(U.uTex, 0);
      gl.uniform4f(U.uImg, ir.left + (ir.width - dw) * fx, ir.top + (ir.height - dh) * fy, dw, dh);
      gl.uniform2f(U.uBgY, br.top, Math.max(1, br.height));
      var g = grad.stops;
      gl.uniform4f(U.uG0, g[0], g[1], g[2], g[3]); gl.uniform4f(U.uG1, g[4], g[5], g[6], g[7]);
      gl.uniform3f(U.uGCol, grad.col[0], grad.col[1], grad.col[2]);
      gl.uniform1f(U.uTime, time);
      gl.uniform1f(U.uFlat, FLAT ? 1 : 0);

      for (i = 0; i < list.length; i++) {
        r = list[i];
        // press spring (the drop spreads and wobbles back) and the ring from the touch point
        if (!still) {
          var steps = dt > 0.04 ? 4 : 2, hdt = Math.min(dt, 0.066) / steps;
          for (var k = 0; k < steps; k++) { r.pvel += (-(r.pv - r.ptarget) * 210 - r.pvel * 13) * hdt; r.pv += r.pvel * hdt; }
          if (r.ripT >= 0) { r.ripT += dt; if (r.ripT > 2) r.ripT = -1; }
        }
        var ripAge = r.ripT >= 0 ? r.ripT : 0, ripA = r.ripT >= 0 ? r.ripA * Math.exp(-r.ripT * 1.6) * Math.min(1, (2 - r.ripT) * 4) : 0;
        var zoom = r.rect.width / r.cw, yTop = GH - r.ay, nL = neighbour(r, r.btn.previousElementSibling), nR = neighbour(r, r.btn.nextElementSibling);
        gl.viewport(r.ax, yTop - r.bh, r.bw, r.bh); gl.scissor(r.ax, yTop - r.bh, r.bw, r.bh);
        gl.uniform4f(U.uVp, r.ax, yTop, r.bw, r.bh);
        gl.uniform1f(U.uPx, r.bw / r.cw);
        gl.uniform2f(U.uHalf, r.w / 2, r.h / 2);
        gl.uniform1f(U.uRad, r.rad);
        gl.uniform2f(U.uCtr, r.rect.left + r.rect.width / 2, r.rect.top + r.rect.height / 2);
        gl.uniform1f(U.uZoom, zoom);
        gl.uniform1f(U.uSeed, r.seed);
        gl.uniform4f(U.uTint, r.tint[0], r.tint[1], r.tint[2], r.tint[3]);
        gl.uniform4f(U.uUnder, r.under[0], r.under[1], r.under[2], r.under[3]);
        gl.uniform1f(U.uWet, r.under[4]);
        gl.uniform4f(U.uLight, r.light[0], r.light[1], r.light[2], r.light[3]);
        gl.uniform1f(U.uSat, r.sat);
        gl.uniform1f(U.uVeil, r.veil);
        gl.uniform4f(U.uPress, r.px, r.py, r.pv, ripAge);
        gl.uniform1f(U.uRipA, ripA);
        gl.uniform1f(U.uInk, r.ink);
        gl.uniform4f(U.uLab, r.lab[0], r.lab[1], r.lab[2], r.lab[3]);
        gl.uniform4f(U.uNbL, nL[0], nL[1], nL[2], nL[3]);
        gl.uniform4f(U.uNbR, nR[0], nR[1], nR[2], nR[3]);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      var pC = 0; if (PROF) { gl.finish(); pC = performance.now(); }
      // hand every drop to its helper canvas (same task, so the GL buffer needs no preserving)
      for (i = 0; i < list.length; i++) {
        r = list[i];
        if (r.cv.width !== r.bw || r.cv.height !== r.bh) { r.cv.width = r.bw; r.cv.height = r.bh; }
        r.ctx.globalCompositeOperation = 'copy';
        r.ctx.drawImage(glc, r.ax, r.ay, r.bw, r.bh, 0, 0, r.bw, r.bh);
        if (!r.painted) { r.painted = true; r.btn.setAttribute('data-w3', 'on'); }
      }
      if (PROF) { var pD = performance.now(), k1 = 0.1; W3.prof = W3.prof || [0, 0, 0]; W3.prof[0] += (pB - pA - W3.prof[0]) * k1; W3.prof[1] += (pC - pB - W3.prof[1]) * k1; W3.prof[2] += (pD - pC - W3.prof[2]) * k1; }
      W3.drops = list.length; W3.px = Math.round(total * squeeze * squeeze); W3.atlas = glc.width + 'x' + glc.height; W3.frames = (W3.frames || 0) + 1;
      return 2;
    }

    /* ------------------------------------------------------------------ wiring */
    function mine(el) { var b = el && el.closest ? el.closest(SEL) : null; return b && recs.has(b) ? b : null; }
    function press(btn, cx, cy) {
      var r = recs.get(btn); if (!r || btn.disabled) return;
      var b = r.cv.getBoundingClientRect(), zoom = b.width / (r.cw || 1) || 1;
      r.px = cx == null ? 0 : (cx - (b.left + b.width / 2)) / zoom;
      r.py = cy == null ? 0 : (cy - (b.top + b.height / 2)) / zoom;
      r.ptarget = 1; r.ripT = 0; r.ripA = 4.2;
    }
    function release() {
      var any = false;
      recs.forEach(function (r) { if (r.ptarget >= 1) { r.ptarget = r.hov || 0; any = true; if (r.ripT < 0 || r.ripT > 0.7) { r.ripT = 0; r.ripA = 2.4; } } });   // long press: a second, smaller ring on release. (A drop the mouse still rests on goes back to its hover)
      if (any) kick();
    }
    // a mouse comes to rest on a drop, or leaves it: the drop gives way a little under the pointer and comes back (no ring)
    function hover(btn, cx, cy, on) {
      var r = recs.get(btn); if (!r || btn.disabled) return;
      r.hov = on ? HOVER : 0;
      if (r.ptarget >= 1) return;                                  // pressed: the press decides
      if (on) { var b = r.cv.getBoundingClientRect(), zoom = b.width / (r.cw || 1) || 1; r.px = (cx - (b.left + b.width / 2)) / zoom; r.py = (cy - (b.top + b.height / 2)) / zoom; }
      r.ptarget = r.hov; kick();
    }

    // The observer sees the children of the shell except the tab bar, the shell's own child list (main area and
    // sheets come and go), its parent's child list (the shell itself unmounts) and, on <html>, data-motion and the
    // colour tone data-wa-ton (a change of tone re-reads every sheet at once).
    function wire() {
      if (!mo) return;
      mo.disconnect();
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion', 'data-wa-ton'] });
      if (shell && shell.parentNode) home = shell.parentNode;
      if (home && home.isConnected) mo.observe(home, { childList: true });
      if (!shell) return;
      mo.observe(shell, { childList: true, attributes: true, attributeFilter: ['class', 'data-look'] });
      for (var el = shell.firstElementChild; el; el = el.nextElementSibling)
        if (!(BAR && el.matches(BAR))) mo.observe(el, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'src', 'srcset', 'disabled'] });
    }
    function onMutations(ms) {
      var rewire = false, i, m, r, own;
      for (i = 0; i < ms.length; i++) {
        m = ms[i];
        if (m.type === 'attributes') { restyle = true; dirty = true; continue; }
        own = m.addedNodes.length + m.removedNodes.length === 1 && (m.addedNodes[0] || m.removedNodes[0]).className === 'w3-drop';
        // React reset the content of a button: put the helper back before the next paint (its picture is kept)
        r = recs.get(m.target);
        if (r && r.cv.parentNode !== r.btn && r.btn.isConnected) { r.btn.insertBefore(r.cv, r.btn.firstChild); r.stale = true; dirty = true; continue; }
        if (own && m.addedNodes.length) continue;                // our own insert
        if (r) r.stale = true;
        if (m.target === shell || m.target === home) rewire = true;
        dirty = true;
      }
      if (rewire) wire();
      if (dirty) kick();
    }

    function on(target, name, fn, opt) { target.addEventListener(name, fn, opt); offs.push(function () { target.removeEventListener(name, fn, opt); }); }
    function listen() {
      var cap = { capture: true, passive: true };
      shell = rootEl();
      if ('IntersectionObserver' in window) io = new IntersectionObserver(function (es) {
        for (var i = 0; i < es.length; i++) { var r = recs.get(es[i].target); if (r) r.vis = es[i].isIntersecting; }
        kick();
      }, { rootMargin: '40px' });
      if ('ResizeObserver' in window) ro = new ResizeObserver(function (es) {
        for (var i = 0; i < es.length; i++) { var r = recs.get(es[i].target); if (r) measure(r); }
        kick();
      });
      mo = new MutationObserver(onMutations); wire();
      on(window, 'scroll', function () { followUntil = performance.now() + 160; wake(); }, cap);       // follow scrolling frame by frame
      on(window, 'resize', function () { scene.pos = null; grad.key = ''; readGradient(); measureAll(); followUntil = performance.now() + 300; wake(); }, { passive: true });
      on(window, 'pointerdown', function (e) { var b = mine(e.target); if (b) press(b, e.clientX, e.clientY); wake(); }, cap);
      on(window, 'pointermove', function (e) { if (e.pointerType === 'mouse' && performance.now() - lastInput > 1000) wake(); }, cap);
      on(window, 'pointerover', function (e) { if (e.pointerType !== 'mouse') return; var b = mine(e.target); if (b && !(e.relatedTarget && b.contains(e.relatedTarget))) hover(b, e.clientX, e.clientY, true); }, cap);
      on(window, 'pointerout', function (e) { if (e.pointerType !== 'mouse') return; var b = mine(e.target); if (b && !(e.relatedTarget && b.contains(e.relatedTarget))) hover(b, 0, 0, false); }, cap);   // a mouse that moves is someone at the screen: it keeps the water awake (looked at once a second at most; a finger always begins with pointerdown)
      ['pointerup', 'pointercancel', 'dragend', 'keyup'].forEach(function (n) { on(window, n, release, cap); });
      on(window, 'blur', function (e) { if (e.target === window) release(); }, cap);   // the window lost focus (not: focus moved from one button to the next)
      on(window, 'keydown', function (e) { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { var b = mine(e.target); if (b) { press(b, null, null); wake(); } } }, cap);
      // a card that slides or fades in carries its buttons along: follow until it has arrived
      ['animationstart', 'transitionstart'].forEach(function (n) {
        on(window, n, function (e) { var t = e.target; if (shell && t && t.nodeType === 1 && t !== shell && shell.contains(t) && !recs.has(t) && t.querySelector(SEL)) { followUntil = performance.now() + 700; kick(); } }, cap);
      });
      on(document, 'visibilitychange', function () { if (!document.hidden) { lastFrame = lastTick = performance.now(); wake(); } });
      if (mqReduce.addEventListener) on(mqReduce, 'change', kick);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (alive) { measureAll(); kick(); } });
      wake();
    }
    function destroy() {
      alive = false;
      if (raf) cancelAnimationFrame(raf); raf = 0; if (timer) clearTimeout(timer); timer = 0;
      if (nap) clearTimeout(nap); nap = 0; if (shell) shell.removeAttribute(REST);
      if (mo) mo.disconnect(); if (io) io.disconnect(); if (ro) ro.disconnect(); mo = io = ro = null;
      offs.forEach(function (f) { f(); }); offs = [];
      recs.forEach(function (r) { detach(r); });
      var ext = gl && gl.getExtension('WEBGL_lose_context'); lost = true; if (ext) ext.loseContext();
      gl = null; W3.state = 'stopped';
    }
    listen();
    return destroy;
  }

  /* ==================================================================== Teil 2: Ring und Markierung */
  /* Sheets and bars are CSS (kern.css). This part only adds the two answers to a touch, both transform and opacity
     only, nothing at rest:
     1. Ring: when a drop on a sheet of list "ringOn" is tapped, ONE thin ring of light runs over the floor of that
        sheet, from under the finger. Helper <i class="wa-floor"><i class="wa-ring"></i></i> inside the sheet
        (aria-hidden, takes no clicks, gone after --wa-ring-time, 1.1 s; nothing depends on it, React may throw it away
        at any time). The ring starts when the finger LETS GO - only then the tap is certain. The drop's own answer (it
        spreads, its glint flares, a ripple runs inside it: Teil 1) is instant; a touch that turns into scrolling never
        shows a ring. The same ring answers the action buttons in the foot of a bottom sheet and - in the green of its
        water - a check that is ticked on a card (options ringOn, ringFrom, tick). Buttons that repeat per list row give
        way themselves and send no ring.
     2. Markierung: the bead that marks the active child of a bar FLOWS to the new one - its leading edge runs ahead,
        the body stretches, the tail follows, it settles with a small overshoot. Driven only by which child carries the
        class "tabOn" (one MutationObserver for class changes); the bead is the bar's ::before and is animated with the
        Web Animations API. Without this script the bead still glides (CSS transition), with reduced motion it jumps. */
  function partRing(cfg) {
    var RING_ON = cfg.ringOn;                                        // sheets whose floor shows the ring (they need position: relative and isolation: isolate)
    var DROP = cfg.ringFrom;                                         // a tap on one of these starts the ring
    var TICK = cfg.tick, TICKED = cfg.ticked;                        // a check answers only when it is ticked (not when the tick is taken back), with a ring in the green of its water: the app may remove a ticked row at once, the ring on the floor stays
    var BAR = cfg.bar;                                               // bars whose marker (their ::before) flows to the child that carries class ON
    var ON = cfg.tabOn;                                              // class of the active tab
    var RING_LIFE = 1700;                                            // ms until the ring's helper is removed at the latest (it normally goes when its animation ends: CSS --wa-ring-time, 1.1 s)
    var DRAG = 9;                                                    // px of finger travel after which a touch is no tap any more
    var FLIGHT = 460, FLIGHT_MORE = 70, FLIGHT_STEPS = 20;           // the bead's flight: ms to the next tab (only used when the bead has no transition-duration; kern.css declares it as --wa-bead-time), ms more per further tab (at most 3), number of keyframes

    /* -- 1. ring of light -- */
    // The ring starts when the finger lets go, not when it comes down: a finger that rests on a button for a moment and then
    // scrolls the list (pointercancel, or more than DRAG px of travel) never shows one. down() only remembers what was touched.
    var held = null;                                                 // the press that may still become a tap: { btn, card, x, y }
    function down(e) {
      var t = e.target, btn = t && t.closest ? t.closest(DROP) : null, card = btn && !btn.disabled ? btn.closest(RING_ON) : null;
      held = card && inRoot(card) && !still() ? { btn: btn, card: card, x: e.clientX, y: e.clientY } : null;
    }
    function move(e) { if (held && (Math.abs(e.clientX - held.x) > DRAG || Math.abs(e.clientY - held.y) > DRAG)) held = null; }   // the finger drags: no tap
    function cancel() { held = null; }                               // the touch became a scroll
    function up() {                                                  // let go in place: a tap - the ring runs from where the finger was
      var h = held; held = null;
      if (!h || !h.card.isConnected || still()) return;
      var btn = h.btn, card = h.card, tick = btn.matches(TICK);
      if (tick && (btn.classList.contains(TICKED[0]) || btn.classList.contains(TICKED[1]))) return;   // (pointerup comes before the click that ticks it: a check that is already ticked is being unticked)
      var r = card.getBoundingClientRect(); if (!r.width || !card.offsetWidth) return;
      var zoom = r.width / card.offsetWidth;                         // CSS zoom or a transform on an ancestor
      var floor = document.createElement('i'), ring = document.createElement('i');
      floor.className = 'wa-floor'; floor.setAttribute('aria-hidden', 'true');
      ring.className = 'wa-ring' + (tick ? ' wa-ring--ok' : btn.classList.contains(cfg.primary) ? ' wa-ring--primary' : btn.classList.contains(cfg.danger) ? ' wa-ring--danger' : '');
      ring.style.left = (h.x - r.left) / zoom + 'px'; ring.style.top = (h.y - r.top) / zoom + 'px';
      floor.appendChild(ring); card.appendChild(floor);
      var gone = function () { if (floor.parentNode) floor.parentNode.removeChild(floor); };
      ring.addEventListener('animationend', gone); setTimeout(gone, RING_LIFE);
    }

    /* -- 2. the bead of the tab bar -- */
    var at = new WeakMap(), fly = null, canPseudo = null;
    function idx(nav) { var b = nav.children, i; for (i = 0; i < b.length; i++) if (b[i].classList && b[i].classList.contains(ON)) return i; return -1; }
    function ease(t) { t = t < 0 ? 0 : t > 1 ? 1 : t; return 1 - Math.pow(1 - t, 3); }
    function flow(nav) {
      var to = idx(nav), from = at.get(nav); at.set(nav, to);
      if (to < 0 || from === undefined || from < 0 || from === to || still() || !nav.animate) return;
      if (canPseudo === null) { try { var probe = nav.animate([], { pseudoElement: '::before', duration: 1 }); canPseudo = !!probe.effect && probe.effect.pseudoElement === '::before'; probe.cancel(); } catch (err) { canPseudo = false; } }
      if (!canPseudo) return;                                        // the CSS transition alone moves the bead
      // where the bead is right now (a flight may still be under way): its centre in tab widths
      var cs = getComputedStyle(nav, '::before'), w = parseFloat(cs.width), m = /matrix\(([^)]+)\)/.exec(cs.transform || '');
      var pos = m && w ? parseFloat(m[1].split(',')[4]) / w : from;
      if (fly) fly.cancel();
      var d = to - pos, n = Math.abs(d), frames = [], k, t, lead, tail, a, b, sx, sy;
      for (k = 0; k <= FLIGHT_STEPS; k++) {
        t = k / FLIGHT_STEPS;
        lead = ease(t / 0.5) + 0.07 / Math.max(1, n) * Math.sin(Math.min(1, t / 0.86) * Math.PI) * (1 - t);   // the leading edge runs ahead and overshoots a little
        tail = ease((t - 0.14) / 0.66);                                                       // the tail lets go late and catches up
        tail += 0.1 * Math.sin(Math.max(0, Math.min(1, (t - 0.62) / 0.38)) * Math.PI) / Math.max(1, n);   // ... and pushes in: the bead is squeezed before it settles
        a = pos + d * (d > 0 ? tail : lead); b = pos + 1 + d * (d > 0 ? lead : tail);         // left and right edge, in tab widths
        a = Math.max(a, -0.03); b = Math.min(b, nav.children.length + 0.03);                    // the bead never leaves the pool
        sx = Math.max(0.5, b - a); sy = sx > 1 ? 1 - 0.2 * Math.min(1, (sx - 1) / 1.6) : 1 + (1 - sx) * 0.7;   // long and thin while it flows, squat when squeezed
        frames.push({ transform: 'translateX(' + ((a + b) / 2 - 0.5) * 100 + '%) scale(' + sx + ',' + sy + ')' });
      }
      fly = nav.animate(frames, { pseudoElement: '::before', duration: (parseFloat(cs.transitionDuration) * 1000 || FLIGHT) + FLIGHT_MORE * Math.min(3, n - 1), easing: 'linear' });   // the time of the bead's own glide (--wa-bead-time), so CSS and script agree
      fly.onfinish = fly.oncancel = function () { fly = null; };
    }
    var mo = new MutationObserver(function (ms) {
      for (var i = 0, seen = null, p; i < ms.length; i++) {
        p = ms[i].target.parentNode;
        if (p && p !== seen && p.matches && p.matches(BAR) && inRoot(p)) { seen = p; flow(p); }
      }
    });
    function watch() {                                               // remember where the bead is; class changes anywhere below <body> are cheap to filter
      var r = rootEl(), navs = r ? r.querySelectorAll(BAR) : [], i;
      for (i = 0; i < navs.length; i++) if (!at.has(navs[i])) at.set(navs[i], idx(navs[i]));
    }
    function tabDown(e) { var t = e.target; if (t && t.closest && t.closest(BAR)) watch(); }   // a tab bar that mounted later: known before its first change

    function noop() {}
    var cap = { capture: true, passive: true };
    window.addEventListener('pointerdown', down, cap); window.addEventListener('pointerdown', tabDown, cap);
    window.addEventListener('pointerup', up, cap); window.addEventListener('pointercancel', cancel, cap); window.addEventListener('pointermove', move, cap);
    document.addEventListener('touchstart', noop, { passive: true });   // iPhone: Safari shows :active (pressed row, pressed tab) only when a touch listener exists
    mo.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
    watch();
    return function () {
      window.removeEventListener('pointerdown', down, cap); window.removeEventListener('pointerdown', tabDown, cap);
      window.removeEventListener('pointerup', up, cap); window.removeEventListener('pointercancel', cancel, cap); window.removeEventListener('pointermove', move, cap);
      document.removeEventListener('touchstart', noop); mo.disconnect(); if (fly) fly.cancel();
      var f = document.querySelectorAll('.wa-floor'); for (var i = 0; i < f.length; i++) f[i].parentNode.removeChild(f[i]);
    };
  }

  /* ==================================================================== Teil 3: Wahl, Hinweis, Pegel */
  /* Fields, labels to choose from, checks, progress bars, sheets and the toast are CSS (kern.css). This part adds the
     three changes of state CSS cannot see, all transform and opacity only, nothing at rest, nothing with reduced
     motion. Durations and easings are read from the custom properties of kern.css (lists T and E below), so they are
     declared in one place only:
     1. Wahl: when the choice in a group of labels moves from one label to another, the bead of the new one (its
        ::before) FLOWS over from the place of the old one - it stretches on the way and settles. A label that is
        chosen in addition (several may be chosen) wells up in place.
     2. Tropfen-Hinweis: the app removes a toast from one moment to the next; a copy of it stays for a quarter of a
        second and leaves like a drop (class wa-geht, keyframes in kern.css).
     3. Pegel: when the level of a progress bar really changes (not the hair a running print moves every second), the
        water runs from the old level to the new one and swings in - the bar is already at its new width, the way
        there is a transform (scaleX from its left end).
     Driven only by class changes, style changes of the levels and removed nodes (one MutationObserver). Nothing
     depends on the helpers. */
  function partChange(cfg) {
    var GROUP = cfg.groups;                                          // groups of labels; the labels are their direct children
    var ON = cfg.chosen;                                             // classes that mark a chosen label (its bead is its ::before)
    var T = { flow: ['--wa-t-flow', 360], settle: ['--wa-t-settle', 620], leave: ['--wa-t-leave', 260] };   // durations: custom property on the root (kern.css, "Bewegung: die Sprache") and the ms used when it is missing
    var E = { flow: ['--wa-ease-flow', 'cubic-bezier(.3,.7,.2,1)'], settle: ['--wa-ease-settle', 'cubic-bezier(.3,1.45,.5,1)'] };   // easings, the same way
    var FLOW_FAR = 160, FLOW_STEPS = 14;                             // the bead's flow takes --wa-t-flow, plus up to this many ms for a long way; number of keyframes
    var WELL = 0.85;                                                 // a bead that wells up in place needs this share of --wa-t-flow
    var LEVEL = cfg.levels;                                          // tubes; the water is their first child and its inline width (in %) is the level
    var LEVEL_MIN = 1.5;                                             // the smallest change of level (in % of the tube) that is shown as a flow (it takes --wa-t-settle with --wa-ease-settle)
    var TOAST = cfg.toasts;                                          // what leaves like a drop ...
    var LEAVE = 'wa-geht';                                           // ... with this class (its keyframes take --wa-t-leave)
    // durations and easings are declared once, in kern.css: read them where they are needed (only at a change of state)
    function tok(pair) { var sh = rootEl(); return sh ? getComputedStyle(sh).getPropertyValue(pair[0]).trim() : ''; }
    function dur(pair) { var v = tok(pair), n = parseFloat(v); return isNaN(n) ? pair[1] : /ms$/.test(v) ? n : n * 1000; }   // in ms
    function ease(pair) { return tok(pair) || pair[1]; }

    /* -- 1. the bead of the chosen label -- */
    var canPseudo = null;
    function pseudoOk(el) {
      if (canPseudo === null) { try { var a = el.animate([], { pseudoElement: '::before', duration: 1 }); canPseudo = !!a.effect && a.effect.pseudoElement === '::before'; a.cancel(); } catch (err) { canPseudo = false; } }
      return canPseudo;
    }
    function isOn(cls) { cls = ' ' + (cls || '') + ' '; for (var i = 0; i < ON.length; i++) if (cls.indexOf(' ' + ON[i] + ' ') >= 0) return true; return false; }
    function flow(from, to) {
      var a = from.getBoundingClientRect(), b = to.getBoundingClientRect(); if (!a.width || !b.width || !to.offsetWidth) return;
      var z = b.width / to.offsetWidth;                              // CSS zoom or a transform on an ancestor
      var dx = ((a.left + a.right) - (b.left + b.right)) / 2 / z, dy = ((a.top + a.bottom) - (b.top + b.bottom)) / 2 / z;
      var sx = a.width / b.width, sy = a.height / b.height, far = Math.sqrt(dx * dx + dy * dy), wx = Math.abs(dx) / (far || 1), wy = Math.abs(dy) / (far || 1);
      var long = Math.min(0.5, far / (b.width / z) * 0.16), frames = [], k, t, e, s, rest, fx, fy;
      for (k = 0; k <= FLOW_STEPS; k++) {
        t = k / FLOW_STEPS;
        e = 1 - Math.pow(1 - t, 3) + 0.045 * Math.sin(Math.min(1, t / 0.8) * Math.PI) * t;      // runs off at once, a little past, settles
        s = Math.sin(Math.PI * Math.min(1, t / 0.7)) * (1 - t);                                  // stretched along the way while it flows
        rest = 1 - Math.min(1, e);
        fx = (sx + (1 - sx) * Math.min(1, e)) * (1 + long * s * wx) * (1 - 0.1 * s * wy);
        fy = (sy + (1 - sy) * Math.min(1, e)) * (1 + long * s * wy) * (1 - 0.14 * s * wx);
        frames.push({ transform: 'translate(' + (dx * (1 - e)).toFixed(2) + 'px,' + (dy * (1 - e)).toFixed(2) + 'px) scale(' + fx.toFixed(4) + ',' + fy.toFixed(4) + ')', opacity: 1 });
      }
      frames[FLOW_STEPS] = { transform: 'none', opacity: 1 };
      to.animate(frames, { pseudoElement: '::before', duration: dur(T.flow) + FLOW_FAR * Math.min(1, far / 220), easing: 'linear' });
    }
    function well(el) {
      el.animate([{ transform: 'scale(.55)', opacity: 0 }, { transform: 'scale(1.06)', opacity: 1, offset: 0.6 }, { transform: 'none', opacity: 1 }], { pseudoElement: '::before', duration: dur(T.flow) * WELL, easing: ease(E.flow) });
    }
    function choice(ms) {
      var groups = [], lost = [], won = [], i, m, t, p, g, was, now;
      for (i = 0; i < ms.length; i++) {
        m = ms[i]; if (m.type !== 'attributes' || m.attributeName !== 'class') continue;
        t = m.target; p = t.parentNode;
        if (!p || !p.matches || !p.matches(GROUP)) continue;
        was = isOn(m.oldValue); now = isOn(t.className);
        if (was === now) continue;
        g = groups.indexOf(p); if (g < 0) { g = groups.push(p) - 1; lost[g] = []; won[g] = []; }
        (now ? won[g] : lost[g]).push(t);
      }
      for (g = 0; g < groups.length; g++) {
        if (!inRoot(groups[g]) || still() || !won[g].length || !pseudoOk(won[g][0])) continue;
        if (won[g].length === 1 && lost[g].length === 1) flow(lost[g][0], won[g][0]);
        else for (i = 0; i < won[g].length; i++) well(won[g][i]);
      }
    }

    /* -- 2. a toast leaves like a drop -- */
    var ghosts = [];
    function drop(g) { var i = ghosts.indexOf(g); if (i >= 0) ghosts.splice(i, 1); if (g.parentNode) g.parentNode.removeChild(g); }
    function leave(node, parent) {
      if (still() || !parent.isConnected || !inRoot(parent)) return;
      var g = node.cloneNode(true);
      g.classList.add(LEAVE); g.setAttribute('aria-hidden', 'true'); g.removeAttribute('role'); g.inert = true;
      parent.appendChild(g); ghosts.push(g);
      g.addEventListener('animationend', function () { drop(g); }); setTimeout(function () { drop(g); }, dur(T.leave) + 200);
    }
    function gone(ms) {
      for (var i = 0, m, j, n; i < ms.length; i++) {
        m = ms[i]; if (m.type !== 'childList' || !m.removedNodes.length) continue;
        for (j = 0; j < m.removedNodes.length; j++) {
          n = m.removedNodes[j];
          if (n.nodeType === 1 && n.matches(TOAST) && !n.classList.contains(LEAVE)) leave(n, m.target);
        }
      }
    }

    /* -- 3. the level of a tube -- */
    function pct(style) { var m = /(?:^|;)\s*width:\s*([\d.]+)%/.exec(style || ''); return m ? parseFloat(m[1]) : NaN; }
    function levels(ms) {
      for (var i = 0, m, t, p, was, now; i < ms.length; i++) {
        m = ms[i]; if (m.type !== 'attributes' || m.attributeName !== 'style') continue;
        t = m.target; p = t.parentNode;
        if (!p || !p.matches || !p.matches(LEVEL) || !t.animate) continue;
        was = pct(m.oldValue); now = pct(t.getAttribute('style'));
        if (!(Math.abs(was - now) >= LEVEL_MIN) || !(now > 0.5) || still() || !inRoot(p)) continue;
        t.animate([{ transform: 'scaleX(' + (Math.max(was, 0.5) / now).toFixed(4) + ')' }, { transform: 'none' }], { duration: dur(T.settle), easing: ease(E.settle) });
      }
    }

    var mo = new MutationObserver(function (ms) { choice(ms); levels(ms); gone(ms); });
    mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'style'], attributeOldValue: true });
    return function () { mo.disconnect(); while (ghosts.length) drop(ghosts[0]); };
  }

  /* ==================================================================== Teil 4: Licht und Zug */
  /* The still sheets of water are alive through CSS alone (kern.css, "Leben in Ruhe"): light that slowly wanders along
     their rim at rest. This part adds the two things CSS cannot do, and nothing that runs at rest:
     1. Licht: a basin has no pseudo-element left for its light, so every sheet in option "light" gets ONE helper
        <i class="wa-licht"><i class="wa-boden"></i></i> as its last child (aria-hidden, takes no clicks; its ::before and
        ::after are the lights at the rim, its child is the light on the floor; nothing depends on it, React may throw it
        away at any time - it is put back with the next change of the page).
        Each helper gets its own place in the loop (--wa-phase), so no two sheets move in step. A new helper carries
        the attribute data-wa-kommt for its first two pictures: CSS holds its lights where the way has left them
        ("Schwappen") and, when the attribute goes, lets them swing into place with the same transition that ends a
        pull - that is how the cards of a new screen come to rest, and why a list can be scrolled at once.
     2. Zug: while a list in option "scrollers" is scrolled, its speed is read once per animation frame and handed to the
        helpers inside it (and to the helper of the sheet around it) as --wa-zug, -1 .. 1; CSS lets the light lean by that
        much. When the scrolling stops the property goes back to 0 and CSS lets the light swing out. The property is set
        on the helpers only: set on the root it would restyle the whole page with every frame (measured in the app: 2 to
        3 ms instead of 0.1 ms).
     Sleep needs nothing here: a scroll wakes the water's clock (Teil 1), and the loops are CSS.
     With reduced motion (system setting or the app's switch) no pull is handed over; the helpers are hidden by CSS. */
  function partLight(cfg) {
    var LIGHT_ON = cfg.light;                                        // sheets that get the light helper (they need a position and isolation: isolate; Becken and "dichtes Wasser" have both)
    var LIGHT = 'wa-licht', FLOOR = 'wa-boden';                      // class of the helper (kern.css, "Licht") and of its one child, the light on the floor ("Bodenlicht")
    var PHASE = '--wa-phase';                                        // where in its loop the light of a helper starts, 0 .. 1 in eighths (the loops are 8 x n beats long, so lights that start together stay on one beat)
    var NEW = 'data-wa-kommt';                                       // attribute of a helper for its first two pictures: its lights stand where they arrive from (kern.css, "Schwappen")
    var SCROLLER = cfg.scrollers;                                    // lists whose scrolling pulls the water
    var PULL = '--wa-zug', PULLED = 'data-wa-zieht';                 // the pull on a helper (-1 .. 1), and its attribute while the list is being scrolled (an attribute, not a class: Teil 1 re-reads every drop when a class changes)
    var FULL = 1100;                                                 // px per second of scrolling that pull the water all the way (--wa-zug = 1 or -1); an ordinary swipe of the thumb reaches about half of it
    var QUIET = 110;                                                 // ms without any movement of the list after which the scrolling counts as stopped
    var GRAIN = 0.05;                                                // the pull is handed over in steps of this size (smaller changes are not worth a restyle); while the list moves it never falls below one step, so a slow finger does not switch the pull on and off
    var EVEN = 0.5;                                                  // how much of the speed of the frame before is kept (0 .. 1): uneven frames do not make the light twitch

    /* -- 1. the light helper -- */
    var count = 0, fresh = [], settle = 0;
    function sow() {
      var r = rootEl(), hosts = r && LIGHT_ON ? r.querySelectorAll(LIGHT_ON) : [], i, h, l, made = false;
      for (i = 0; i < hosts.length; i++) {
        h = hosts[i]; l = h.lastElementChild;
        if ((l && l.classList.contains(LIGHT)) || h.querySelector(':scope > .' + LIGHT)) continue;   // it has one (never moved: moving an element starts its animations again)
        l = document.createElement('i'); l.className = LIGHT; l.setAttribute('aria-hidden', 'true');
        l.style.setProperty(PHASE, String((count++ * 5 % 8) / 8));
        l.setAttribute(NEW, ''); fresh.push(l); made = true;
        l.appendChild(document.createElement('i')).className = FLOOR;
        h.appendChild(l);
      }
      // Schwappen: the new helpers have been painted once where their light arrives from (the first frame styles them, the
      // second finds them styled) - now let go: the transition of the pull swings the light into place
      if (!made) return;
      if (settle) cancelAnimationFrame(settle);                      // (more helpers came before the first ones were let go: all of them wait the two frames from now)
      settle = requestAnimationFrame(function () { settle = requestAnimationFrame(function () { settle = 0; var f = fresh; fresh = []; for (var k = 0; k < f.length; k++) f[k].removeAttribute(NEW); }); });
    }
    var mo = new MutationObserver(function (ms) {
      for (var i = 0, a; i < ms.length; i++) {
        a = ms[i].addedNodes;
        if (a.length && !(a.length === 1 && a[0].className === LIGHT)) { sow(); return; }   // something other than our own helper was added
      }
    });

    /* -- 2. the pull of scrolling -- */
    var sc = null, targets = [], raf = 0, y0 = 0, t0 = 0, last = 0, cur = 0, v = 0;
    function hand(z) {
      cur = z;
      for (var i = 0; i < targets.length; i++) {
        if (z) { targets[i].setAttribute(PULLED, ''); targets[i].style.setProperty(PULL, z.toFixed(2)); }
        else { targets[i].removeAttribute(PULLED); targets[i].style.removeProperty(PULL); }
      }
    }
    function tick(now) {
      raf = 0;
      if (!sc || !sc.isConnected) { hand(0); sc = null; return; }
      var y = sc.scrollTop, dt = Math.max(4, now - t0), z = 0;
      if (!t0) { y0 = y; t0 = last = now; raf = requestAnimationFrame(tick); return; }   // the first frame only sets the clock (the time of the scroll event and the time of a frame are two clocks: no speed from their difference)
      if (y !== y0) last = now;                                      // still moving (told by the position itself, so slow frames cannot end a pull early)
      if (now - last <= QUIET) {
        v = v * EVEN + (y - y0) / dt * 1000 * (1 - EVEN);            // px per second; + = the content moves up: the water stays behind, its light leans down
        z = Math.round(Math.max(-1, Math.min(1, v / FULL)) / GRAIN) * GRAIN;
        if (!z && cur) z = cur > 0 ? GRAIN : -GRAIN;                 // moving slowly: the smallest pull stays until the list has stopped
      } else v = 0;
      y0 = y; t0 = now;
      if (z !== cur) hand(z);
      if (now - last <= QUIET) raf = requestAnimationFrame(tick);    // nothing runs once the list has stopped and the pull is back at 0
    }
    function onScroll(e) {
      if (raf) return;                                               // a pull is under way: tick() follows the list by itself
      var t = e.target;                                              // a list starts to move: whose light does it pull?
      if (!t || t.nodeType !== 1 || !t.matches(SCROLLER) || !inRoot(t) || still()) return;
      var host = LIGHT_ON ? t.closest(LIGHT_ON) : null, own = host ? host.querySelector(':scope > .' + LIGHT) : null;
      sc = t; y0 = t.scrollTop; t0 = last = 0; v = 0;
      targets = Array.prototype.slice.call(t.querySelectorAll('.' + LIGHT)); if (own) targets.push(own);   // the lights inside the list, and the light of the sheet around it
      raf = requestAnimationFrame(tick);
    }

    var cap = { capture: true, passive: true };
    window.addEventListener('scroll', onScroll, cap);
    mo.observe(document.body, { subtree: true, childList: true });
    sow();
    return function () {
      window.removeEventListener('scroll', onScroll, cap); mo.disconnect(); if (raf) cancelAnimationFrame(raf); if (settle) cancelAnimationFrame(settle);
      var l = document.querySelectorAll('.' + LIGHT); for (var i = 0; i < l.length; i++) l[i].parentNode.removeChild(l[i]);
    };
  }

  /* ------------------------------------------------------------------ start / stop */
  function start(options) {
    if (cur) stop();
    var o = {}, k, i;
    for (k in MOBIL) o[k] = MOBIL[k];
    for (k in options || {}) if (options[k] !== undefined && options[k] !== null) o[k] = options[k];
    o.debug = { flat: !!o.debug.flat, prof: !!o.debug.prof, noDeriv: !!o.debug.noDeriv, cost: typeof o.debug.cost === 'function' ? o.debug.cost : null };
    for (i = 0; i < SELECTORS.length; i++) if (!o[SELECTORS[i]]) o[SELECTORS[i]] = NOTHING;
    for (k in info) delete info[k];
    cur = o;
    stops = [partDrops(o, info), partRing(o), partChange(o), partLight(o)];
    return api;
  }
  function stop() {
    var s = stops; stops = [];
    for (var i = 0; i < s.length; i++) s[i]();
    cur = null;
    return api;
  }
  var api = window.Wasser = { start: start, stop: stop, MOBIL: MOBIL, DESKTOP: DESKTOP, info: info };
})();
