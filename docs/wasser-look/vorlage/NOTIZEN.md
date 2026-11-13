# Wasser-Look, the template: notebook for whoever applies it

State 13.11. Written for a helper who has not seen the look being built. German names of the building blocks are
kept (they are the names the owner knows). Read `LIESMICH.md` first for what is where and how to look at it; the
owner's decisions are in `docs/wasser-look/entwurf/entscheidungen.md` and override everything here.

The template is not built into the app. It was made from the approved look (`docs/wasser-look/entwurf/nachgebessert`,
a stylesheet and a script injected under `.m-shell`) by restructuring only; `scripts/wasser/vergleich.mjs` proves
after every change that it still paints the same (section 9).

---

## 1. The template in one page

| | |
|---|---|
| Files | `kern.css` (the look), `mobil.css` (what only the mobile shell needs), `desktop.css` (empty, for the next step), `wasser.js` (the script). Load order: the app's own stylesheets, then these three, then the script. |
| Switch | The attribute `data-wasser` on a root element. Every rule of `kern.css` starts with `[data-wasser]`, every rule of `mobil.css` with `[data-wasser="mobil"]`. The script looks only inside the root (option `root`, default `[data-wasser]`). No attribute: the app as it is. |
| Tones | `dunkel` (default) = dark mode, `klar` (`<html data-wa-ton="klar">`) = light mode. One block of 54 tokens each in `kern.css`, part 1, same tokens in the same order. No other rule mentions `data-wa-ton`; the script has no tone logic. Text is light in BOTH tones. |
| Tokens | Every colour, radius, gradient, shadow, duration and easing is a `--wa-*` custom property on `[data-wasser]` (`kern.css` parts 1 to 3; the mobile shell's own in `mobil.css` part 1). Two more names are read by the drops: `--water-under`, `--wa-drop-veil` (set by sheets). |
| Blocks | Each building block is ONE nested rule with ONE selector list (`kern.css` part 4). Apply a block by adding a selector to its list, or by giving an element the block's neutral class `.wa-...`. |
| Script | `Wasser.start(options)` / `Wasser.stop()`; `Wasser.MOBIL` = the default options (the mobile shell); `Wasser.info` = state of the drops. One global, one instance. |
| No motion | `prefers-reduced-motion: reduce`, or the app's switch `data-motion="reduziert"` on `<html>`: every block carries both rules itself, nested at its end; the script checks `still()` before every animation. |
| Without the script | The still look with plain glass buttons (no drops, no ring, no light helpers, the marker glides). Without WebGL: the same, but ring, marker, light and sleep work. |

Why the lists are in `kern.css` also for elements that exist only in the mobile shell (`.glass.m-card`, `.m-tabs`,
`.m-ico` ...): CSS cannot add to a selector list from another file. The alternative would be a second copy of every
block per shell. So: block definitions and ALL lists in `kern.css` (mobile entries are marked `mobil`), everything a
shell needs beyond the blocks in its own file.

Dosage, as told to the owner: the more often something appears on a screen and the more text it carries, the less
water. Drops and the marker are the only glossy things; sheets are still; troughs carry the text.

---

## 2. Building blocks

"List" = the selector list of the block in `kern.css` (search for the block name). "Script" = the option of
`Wasser.start()` that must name the same elements.

| Block | Stufe | Neutral class | In the list today | Script | The element needs |
|---|---|---|---|---|---|
| **Tropfen** (drop button) | 3 | `.wa-tropfen`, round: `+ .wa-tropfen--rund` | `.btn:not(.btn--ghost)`; mobil `.m-ico` | `drops` (and `ringFrom`) | nothing. Amber / red: classes `btn--primary` / `btn--danger` (options `primary`, `danger`). A sheet under it should set `--water-under`. |
| **Film** (ghost button) | 1 | - | `.btn.btn--ghost` | - | - |
| **Etikett** (pill) | 1 | - | `.pill`: a glass bead free over the scene; flat on the sheets of the list "Etikett auf Wasser" | - | - |
| **Becken** (sheet with depth) | 2 | `.wa-becken` | mobil `.glass.m-card` | `ringOn`, `light` | about 100 px and more in both directions; its own padding. Sets `position: relative`. |
| **stilles Wasser** (plain sheet) | 2 | `.wa-wasser` | mobil `.glass.m-stat` | (`light` if it should have the helper) | its own padding. Sets no position. |
| **dichtes Wasser** (content scrolls under it) | 2 | `.wa-wasser--dicht` | `.sheet`, `.toast`, `.cmd`; mobil `.m-tabs` | - | its own border-radius and place |
| **Bogen** (bottom sheet) | 2 | `.wa-wasser--dicht.wa-bogen` | `.sheet` | `ringOn`, `light`, `modal`, `scrollers` | its place at the bottom edge, `overflow: hidden`, padding; a scrim behind it (`.sheet-back`) |
| **Tropfen-Hinweis** (toast) | 2 | `.wa-wasser--dicht.wa-hinweis`, error `+ .wa-hinweis--fehler` | `.toast` (also in "dichtes Wasser" and "Lichtlauf") | `toasts` | position, padding |
| **Setzen** (a sheet arrives) | - | `.wa-setzt` | nothing (ready for a sheet without an entrance of its own) | - | several at once: `animation-delay` in steps of `--wa-t-step` |
| **Mulde** (trough) | 1 | `.wa-mulde`, tappable `.wa-mulde--tipp` | rows in sheets (`.sheet .item` ...); mobil `.m-card .m-row`, `.m-card .m-stat` | - | lies on a sheet; its own padding |
| **Feld** | 1 | `.wa-feld`, a select `+ .wa-feld--auswahl` | `.input`, `.select`, `.textarea` | - | padding, font size 16 px |
| **Wahl** (one of several) | 1 | group `.wa-wahl`, chosen child `.on` | `.pills > .pill` (`pill--on`), `.seg > button`, `.tabs > button`, `.tile`, `.island-lib > button` | `groups`, `chosen` | padding per label |
| **Haken** (check) | 1 | `.wa-haken`, ticked `.on`, skipped `.wa-haken--aus` | `.check` (`check--on`, `check--skip`) | `ringFrom`, `tick`, `ticked` | width, height, `border-radius: 50%` |
| **Pegel** (progress) | 1 | `.wa-pegel > i`, amber `.wa-pegel--amber` | `.progress`; the form's `.steps` are a Pegel in pieces | `levels` | tube: height, radius, `overflow: hidden`; `<i>`: `display: block; height: 100%`, width in % inline |
| **Perle** (icon bead) | 1 | `.wa-perle` | `.btn.btn--icon.btn--ghost` | - | width and height (28 px and more) |
| **Perle mit Schrift** | 1 | - | buttons inside the ROWS `.item`; mobil `.m-row` | left out of `drops` and `ringFrom` | - |
| **Ring** (answer to a tap) | - | helper `.wa-floor > .wa-ring` (made by the script) | - | `ringOn`, `ringFrom` | the sheet: `position: relative; isolation: isolate` |
| **Markierung** (flowing marker) + **Atmen** | - | `.wa-markierung` | mobil `.m-tabs` | `bar`, `tabOn` | equal children, the active one has class `on`; `--wa-bar-tabs: <n>`; a position and `isolation: isolate` |
| **Wasserlinie** (keyboard focus) | - | - | two lists (wide gap for drops and pills, narrow for the rest) | - | - |
| **Licht**, **Bodenlicht**, **Zug**, **Schwappen** | - | helper `.wa-licht > .wa-boden` (made by the script) | - | `light`, `scrollers` | the sheet: a position and `isolation: isolate` |
| **Lichtlauf** | - | `.wa-lichtlauf` | `.toast`, `.cmd`; mobil `.m-tabs`, `.glass.m-stat` | - | a position and `isolation: isolate`; its `::after` free |
| **Ruhe** (sleep) | - | attribute `data-wa-ruht` on the root, token `--wa-lauf` | - | `sleep`, `modal` | every loop at rest: `animation-play-state: var(--wa-lauf)` |

Pseudo-elements a block takes (do not use them for something else on such an element): Tropfen `::before` (hit area);
Becken `::before`, `::after` (depth); Markierung `::before` (bead); Bogen `::before` (crest); Wahl, chosen: `::before`
(bead); `.seg > button`, `.tabs > button`: `::after` (hit area); Haken `::before` (drop), `::after` (hit area); Pegel
`> i::after` (meniscus); Lichtlauf `::after`. Mobile shell: `[data-wasser="mobil"]::after` (the dark band under the
bar), `.m-tabs button::after` (hit area). Free: `.sheet::after`, `.toast::before`, `.m-row::before/::after`,
`.cmd::before`.

`node scripts/wasser/pruefen.mjs` (part 4) puts every block on elements the app does not have, by class alone, and
checks that it paints and moves; `--bild out.png` keeps the picture.

---

## 3. Recipes

**Apply a block to another element.** Open `kern.css`, find the block, add the selector to its list on a line of its
own with a note (`/* desktop: the side panels */`). If the block's comment names script options, pass the same
selector there. Run `vergleich.mjs` (nothing else may change) and `pruefen.mjs`.

**Change one member of a block afterwards.** A list has the weight of its heaviest entry: `.glass.m-card` makes the
whole Becken rule weigh three classes. A later rule with less weight loses silently. Write the change nested inside
the block (`&.my-thing { ... }`), or in the shell's file with at least as many classes. (This is how the toast lost
its own small light once - see "Open".)

**A sheet that is none of the blocks** (the same as "stilles Wasser", by hand):

```css
.my-panel {
  border: 0;
  background: var(--wa-still);                    /* or --wa-dense; or var(--wa-whisper) var(--wa-clear) plus the two depth layers of "Becken" */
  -webkit-backdrop-filter: var(--wa-blur);        /* on the element itself, never on a child; prefixed property first */
  backdrop-filter: var(--wa-blur);
  box-shadow: var(--wa-meniscus), var(--wa-shallow), var(--wa-far), var(--wa-lift);
  --water-under: var(--wa-still);                 /* the colour its buttons lie on */
  --text-2: var(--wa-ink-2); --text-3: var(--wa-ink-3); text-shadow: var(--wa-shade);
}
```

**A new sheet with full life** (rim lights, floor light, ring): the material as above or a block, plus
`position: relative` (or any position) and `isolation: isolate`; then

```js
Wasser.start(Object.assign({}, Wasser.MOBIL, {
  light: Wasser.MOBIL.light + ', .my-panel',          // it gets the helper <i class="wa-licht"><i class="wa-boden"></i></i>
  ringOn: Wasser.MOBIL.ringOn + ', .my-panel',        // its floor shows the ring
  scrollers: Wasser.MOBIL.scrollers + ', .my-list',   // if it lives in something that scrolls
}));
```

No floor light on it: `.my-panel > .wa-licht > .wa-boden { display: none; animation: none; }`.
A small or dense sheet: class `wa-lichtlauf` (or its list) instead of the helper; check that `left + 2.7 x width` of
the light ends 30 px before the far corner (see `.glass.m-stat` in `mobil.css`).

**A new bottom sheet, modal or drawer:** `.wa-wasser--dicht.wa-bogen` (or the lists). Another shape: re-declare
`--wa-r-bogen` (four round corners), `--wa-bogen-rim`, `--wa-bogen-lift` for that shell and give it another
`animation-name`; drop the `0 30px 0 0` layer of its box-shadow if it does not touch the bottom edge. Rows inside are
Mulde, fields Feld. The blur goes on the scrim (`--wa-scrim-blur`), never on the sheet. Add it (or its scrim) to the
option `modal` and to the rule "Ruhe hinter einem Bogen" of the shell, so the page behind it rests.

**A drop on a new kind of element:** list of "Tropfen" (and the round list if it is round) + option `drops`. If it
should send a ring from a sheet: option `ringFrom`. If it must NOT be a live drop (many per screen, repeats per
row): leave it out of `drops`; it keeps the plain glass ("Perle mit Schrift" makes that glass lighter in rows).

**How bright the clear drops on a surface are:** set `--wa-drop-veil` on the surface (0 = only rim and highlight,
1 = the silver drops of the cards; a bottom sheet uses `--wa-bogen-veil`, .35). Read within a second.

**A new field / options group / progress bar / check:** class or list of Feld / Wahl (+ option `groups`) / Pegel
(+ option `levels`) / Haken. More than one label of a Wahl may be `.on`.

**Panels that appear together and have no entrance of their own:** `.wa-setzt` on each,
`animation-delay: calc(var(--wa-t-step) * n)`.

**A leaving sheet (not used yet):** when the app delays unmounting by `--wa-t-leave` (0.26 s), add class `wa-geht`
to the sheet; the keyframes `wa-sinkt` are in "Bogen".

**A new loop at rest:** transform and opacity only, on a layer of its own; eight equal keyframe intervals
(`node scripts/wasser/keyframes.mjs` prints them); `animation: <name> var(--wa-t-ruhe-N) var(--wa-gang-N) infinite;
animation-play-state: var(--wa-lauf);` and both "no motion" rules nested in its block.

**Tuning life at rest:** `--wa-leben` first (0 = still sheets, 1 = as built, about 1.5 = the most that reads as
calm; strength only, never speed; set it on the root). Then per tone `--wa-glanz*`, `--wa-boden`. Freeze everything
where it stands: `[data-wasser] { --wa-lauf: paused; }`.

**A third tone, or dropping one:** a tone is the block `:root[data-wa-ton="<name>"] [data-wasser] { ... }` with all
54 tokens. Nothing else to do; the drops re-read within a second (at once when `data-wa-ton` changes).

---

## 4. The script (`wasser.js`)

One classic script, one global. Four parts inside, each a function that returns its own stop: `partDrops` (drops,
the water's clock), `partRing` (ring, marker), `partChange` (bead of a choice, leaving toast, level), `partLight`
(light helpers, pull of scrolling).

```js
Wasser.start();                                   // the mobile shell (defaults)
Wasser.start({ sleep: 0, webgl: false });         // any option replaces its default
Wasser.stop();                                    // leaves no helper, attribute, listener, timer or WebGL context behind
```

In the React app later: `src/wasser/wasser.ts` imports the three stylesheets and `./wasser.js` (side effect: the
global) and exports a hook that calls `window.Wasser.start(options)` in a `useEffect` and `window.Wasser.stop()` in
its clean-up; `Mobile()` uses the hook and its root gets `data-wasser="mobil"`. Start it when the root is in the
document (an effect is). The head of `wasser.js` shows the eight lines.

| Option | Default (mobile shell) | What it is |
|---|---|---|
| `root` | `[data-wasser]` | the element the look lives in; everything else is looked up inside it |
| `scene` | `.m-bg img` | the ONE image a drop free over the scene bends (if several match: the last) |
| `shade` | `.m-bg` | the element whose `::after` darkens the scene; the drops copy that gradient. `''` = no darkening |
| `drops` | `.btn:not(.btn--ghost):not(.m-row .btn, .item .btn), .m-ico, .wa-tropfen` | what becomes a live drop |
| `primary`, `danger`, `badge` | `btn--primary`, `btn--danger`, `badge` | class NAMES: amber drop, red drop, a child that is not part of the label |
| `modal` | `.sheet, .cmd-back` | what covers the page: drops outside it rest |
| `sleep` | `30000` | ms until the water rests; `0` = never |
| `ringOn` | `.glass.m-card, .wa-becken, .sheet` | sheets whose floor shows the ring |
| `ringFrom` | non-ghost buttons (in a sheet only those of its foot, never per-row ones), `.wa-tropfen`, `.m-card .check`, `.wa-becken .wa-haken` | a tap on one of these starts the ring |
| `tick`, `ticked` | `.check, .wa-haken`; `['check--on', 'on']` | checks, and the classes of a ticked one |
| `bar`, `tabOn` | `.m-tabs, .wa-markierung`; `on` | bars with a marker, class of the active child |
| `groups`, `chosen` | `.pills, .seg, .tabs, .tiles, .island-lib, .wa-wahl`; `['on', 'pill--on']` | groups of a Wahl, classes of a chosen label |
| `levels` | `.progress, .wa-pegel` | tubes of a Pegel |
| `toasts` | `.toast, .wa-hinweis` | what leaves like a drop |
| `light` | `.glass.m-card, .wa-becken, .sheet, .wa-bogen` | sheets that get the light helper |
| `scrollers` | `.m-main, .sheet__body` | lists whose scrolling pulls the light |
| `webgl`, `debug` | `true`; `{ flat, prof, noDeriv }` all false | test aids (the harness page maps `?fallback=1`, `?w3flat=1`, `?w3prof=1`, `?w3noderiv=1` to them) |

An empty selector switches its feature off. Helper elements the script makes (all `aria-hidden`, no clicks, React
may throw them away at any time): `canvas.w3-drop` in every drop (attribute `data-w3="on"` on the button while its
drop is drawn), `i.wa-floor > i.wa-ring` for 1.1 s, `i.wa-licht > i.wa-boden` as last child of a lit sheet, a copy
of a removed toast with class `wa-geht` for 0.26 s. Attributes: `data-wa-ruht` on the root, `data-wa-zieht` and
`--wa-zug` on a light helper while its list is scrolled.

**How a drop learns about the sheet it lies on** (`PROP` in Teil 1; read from the button's own computed style, so a
sheet sets them for all its buttons by inheritance; re-read once a second, on class changes inside the root, on
`resize`, and when `data-wa-ton` changes):

| Property | Form | Meaning | When missing |
|---|---|---|---|
| `--water-under` | CSS colour with alpha | everything between button and scene | computed backgrounds of the ancestors |
| `--wa-light` | `r, g, b` | colour of the light a drop gathers on a sheet (also the ring's light) | the built-in sky white |
| `--wa-sat` | number | how much colour the sheet leaves the scene; the same number as in its `saturate()` | 1 |
| `--wa-drop-veil` | 0..1 | how much of that light a clear drop gathers into its body | 1 |
| `--wa-sky` | 0..1 | how much built-in sky blue a drop FREE over the scene keeps | 1 |
| `--wa-drop-amber`, `--wa-drop-red` | `r, g, b, amount` | tint of primary and danger drops | constants `TINT` |

A drop on a sheet never looks at the sharp scene: it estimates what the sheet shows (soft scene under the sheet's
colour) and is handed over as light and shade laid over the real pixels. A wrong estimate only shifts its veil of
light a little.

**Sleep, rest, no motion - how it is wired.** One clock (Teil 1: `doze()`, `wake()`): after `sleep` ms without
touch, scroll or key the drops come to rest and the root gets `data-wa-ruht`; the next touch removes it. CSS follows:
`--wa-lauf` is `running`, `paused` on `[data-wasser][data-wa-ruht]`, and paused for the page behind an open sheet
(`mobil.css`, 7). Never paused: answers to a change of state (a toast must be able to land while the water sleeps).
The clock also runs without WebGL. A hidden page: the browser stops drawing; `visibilitychange` wakes.

**The governor of the drops** (Teil 1, `LEVELS`): pictures that keep eating more than 80 % of their time slot for
3 s step the drops down (60 -> 30 -> 15 pictures a second while touched, then fewer pixels, at last a still drop);
20 s of easy pictures step up again; a try that fails within 30 s doubles the wait (5 min at most).

---

## 5. Tokens: where to turn what

- **Tones** (`kern.css` part 1): the water from rim to deep (`--wa-clear`, `--wa-shelf`, `--wa-deep`, `--wa-under`,
  `--wa-still`, `--wa-dense`, `--wa-sheet`), the light (`--wa-light`, `--wa-core`, `--wa-warm`, `--wa-dark`), the
  rims (`--wa-meniscus`, `--wa-shallow`, `--wa-far`, `--wa-lift`, `--wa-dense-*`), troughs (`--wa-trough*`), ink
  (`--wa-ink-*`, `--wa-shade*`), pills, the bar's labels and bead, softness (`--wa-sat`, `--wa-blur*`), the page
  (`--wa-page-1..4`, `--wa-page-ink-3`, `--wa-abyss`), life (`--wa-glanz*`, `--wa-boden`), the red (`--wa-drop-red`).
- **Form** (part 2): one group per block, named after it (`--wa-r-becken-*`, `--wa-bogen-*`, `--wa-feld-*`,
  `--wa-wahl-*`, `--wa-haken-*`, `--wa-pegel-*`, `--wa-perle-*`, `--wa-ring-*`, `--wa-glass*`, `--wa-amber-*`,
  `--wa-red-*`, `--wa-pill-*`, `--wa-r-tropfen-*`, `--wa-drop-*`, `--wa-focus*`).
- **Motion** (part 3): the language (`--wa-t-*`, `--wa-ease-*`), loops at rest (`--wa-t-ruhe-*`, `--wa-gang-*`,
  `--wa-t-atem`), `--wa-lauf`, `--wa-leben`, the lights (`--wa-licht-*`, `--wa-boden-*`, `--wa-zug-*`,
  `--wa-schwappt-*`, `--wa-lauf-*`, `--wa-atmet*`).
- **Mobile shell** (`mobil.css` part 1): `--wa-page-dark`, the bar (`--wa-bar-lift`, `--wa-bar-side`, `--wa-r-bar`,
  `--wa-r-tab`, `--wa-scrim-over`, `--wa-tab-*`).

The motion language:

| Token | Value | Meaning | Used by |
|---|---|---|---|
| `--wa-t-touch` | 60 ms | under the finger, at once | `--wa-press-in`, `--wa-tab-in` |
| `--wa-t-fast` | 0.14 s | a touch is answered | plain glass, ghost film, check |
| `--wa-t-leave` | 0.26 s | something leaves, or springs back | toast, `--wa-tab-time` |
| `--wa-t-flow` | 0.36 s | something flows to its next place or state | bead of a choice, check, waterline; `--wa-bead-time` = flow + 0.1 s |
| `--wa-t-settle` | 0.62 s | something larger arrives and comes to rest | sheet, toast, level, `--wa-press-out` |
| `--wa-t-wave` | 1.1 s | light travels over a sheet | `--wa-ring-time`, `--wa-kamm-t` |
| `--wa-t-swing` | 1.6 s | water that was moved swings out | after scrolling, arrival of a sheet's light |
| `--wa-t-step` | 40 ms | things that arrive together, one after the other | cards of a new screen |
| `--wa-t-ruhe-1/-2/-3/-4`, `--wa-t-atem` | 24 / 34 / 40 / 46 s, 9 s | loops at rest: lit rim, far rim, bars and sheets, floor; breath of the bead | with `--wa-gang-*`: `steps(n)`, in WebKit `linear` |
| `--wa-ease-flow` / `-settle` / `-drain` / `-wave` / `-swing` | cubic-beziers; swing = a damped `linear()` | runs off and arrives softly / a little past and rests / lets go slowly / a ring that spreads / 35 % past, 12 % back, 4 % past, still | |

The script reads `--wa-t-flow`, `--wa-t-settle`, `--wa-t-leave`, `--wa-ease-flow`, `--wa-ease-settle` and the
bead's transition-duration from the computed style at the moment of a change; change them in `kern.css` only.
Not on the scale, on purpose: the constants of the drops (`sleep`, the press spring, the governor) and the clean-up
timers of helpers.

**Values that were found by eye, and why** (do not "tidy" them):

- dunkel, `--wa-sat: .55`: this is what removes the brown cast over warm wood. Not above about .6.
- dunkel, `--wa-clear` is a breath cool on purpose; it balances the warm scenes. `--wa-dense` is the floor's
  graphite, not black: a black bar read as a hole.
- `--wa-shallow`, `--wa-far` and the fourth layer of `--wa-meniscus` make a sheet read as water over dark ground.
  Without them the lower card is an ordinary dark-mode card.
- Drop on a sheet (shader, "on a sheet the drop is a lens"): its body carries a veil of the sheet's light weighted
  by `(1 - col)^2` - strong on black water, gone on light water. Result: body +20 to +23 L* above the card. Above
  about +28 the drops turned into chrome, at +8 they read as outlines. Brighter is not clearer.
- A LONG drop on a sheet gathers its light at its far end only (shader: `along`); along its whole lower edge it read
  as a chrome tube.
- klar, `--wa-clear`: a veil of mid-grey that lifts dark ground and lowers bright ground, so foliage no longer
  mottles the rim; with `blur(12px)` and `--wa-sat: .52` against brown and olive.
- klar, second layer of `--wa-shallow`: the near wall shades the top band; the card title sits there on open water.
- klar, sheets and bar are smoke-grey, not black (`--wa-sheet`, `--wa-dense`, `--wa-abyss`), and the lower half of
  the page is darkened much less (`--wa-page-3`, `-4`).
- `--wa-sky: .3`: without any sky blue a free drop goes grey over a pale sky; 1 is 3 to 7 b* bluer than the scene.
- Focus (`--wa-feld-on`) and the chosen bead (`--wa-wahl-on-rim`) are found by a full LINE of light, not by a
  brighter fill: a brighter fill lowers the label's contrast faster than it helps finding it.

---

## 6. What moves when

| Element | At rest | On touch | While scrolling | On a change of state |
|---|---|---|---|---|
| Drops | always alive: flowing outline, ripples (15 pictures a second); the glint under a drop on a sheet breathes | spreads, the glint flares, a ripple runs from the finger | the picture inside follows the scene | follows a card that slides in; a press ends when a sheet covers the drop |
| Becken (cards) | a glint with a soft glow wanders along the lit rim and back (24 s), another along the far rim the other way (34 s); a large soft patch of light crosses the floor (46 s); every card at another place of the loop | ONE ring over the floor, when the finger lets go (1.1 s) | the lights lean (up to 90 % deeper / 70 % drawn back), the glints slide 24 px, the floor light stays 28 px behind; let go, all swings out (1.6 s) | the card arrives with the app's own entrance, one 40 ms after the other; its light arrives too deep and swings into place |
| Tab bar | one glint along its top rim (40 s); the bead breathes (9 s) | icon and label of a tab give way and spring back | - | the marker flows to the new tab (0.46 s, 70 ms more per further tab) |
| Bottom sheet | one soft glint on its top rim (40 s) | the ring, from its foot buttons only | its light leans with the scrolling of its body | rises like a wave and settles (0.62 s), a crest of light spreads and fades (1.1 s). Closing: gone in one frame |
| Toast | one glint (the common Lichtlauf) | - | - | lands like a drop (0.62 s), leaves like one (0.26 s) |
| Search panel | one glint along its top rim | the hit under the finger lights up | - | the app's own entrance |
| Number tiles (free) | a short glint along the top rim | - | - | - |
| Rows, tiles | - | a tappable row lights up at once and settles (not while a button inside it is pressed) | - | - |
| Fields | - | - (typing never causes an effect) | - | the waterline runs in on focus (0.36 s) |
| Pills, options, tabs in sheets | - | tint under the finger | - | the bead of the chosen one flows over from the old choice; wells up where several may be chosen |
| Check | - | on a card: one green ring | - | a drop fills the circle and swings in; drains when unticked |
| Progress | - | - | - | a real change of level (1.5 % and more) runs there with a small swing |
| Icon beads, per-row buttons, back link, brand | - | give way and spring back | - | - |
| Text, icons, photos, charts, header, the scene | - | - | - | - |

Dead on purpose or for lack of a hook: a closing sheet, a removed row (both need the app to delay the removal by
`--wa-t-leave`), a toast that replaces another one, the header. The drops do not lean when the list is scrolled.

---

## 7. Pitfalls

Structure and cascade
1. **`:is()` takes the weight of its heaviest entry.** Adding `.panel-col > .glass.panel` to a list raises every rule
   of that block. Rules that change a member afterwards need that weight (recipe 2). `vergleich.mjs stile` finds
   what no picture shows.
2. **Order between blocks matters where weights tie**: Etikett < Etikett auf Wasser < Wahl < Wahl in Mulden; Feld
   before its select variant; "dichtes Wasser" before Bogen and Tropfen-Hinweis; Lichtlauf before what a shell sets on
   one member. Do not reorder part 4 of `kern.css`.
3. **A token built from other tokens resolves where it is declared.** `--wa-meniscus` uses `--wa-core`; setting
   `--wa-core` on one card does not change that card's meniscus. Re-declare the built token there too. (The ring
   helper works because it sets `--wa-light` AND uses it in its own background.) `--wa-leben` belongs on the root.
4. **`--wa-light` has two readers**: the ring (CSS) and the drops on a sheet (script).
5. **A block must not set `position` on an element that has one.** Becken sets `position: relative` - an absolutely
   placed panel jumps into the corner. Its depth steps (22 and 46 px in) fill a 150 px panel black in "dunkel".
6. **CSS nesting.** Every nested selector starts with or contains `&`. Do not nest inside a rule whose selector ends
   in a pseudo-element. The app's build lowers nesting for older browsers (checked with lightningcss, the tool of
   Vite 8: no warning, both `backdrop-filter` properties kept); the files as they are need a browser of 2023 or later.
7. **`:not(:has(...))` drops the whole rule in a browser without `:has()`**: there a tappable trough does not light
   up. `:has()` is also needed for the bead of a bar and for "Ruhe hinter einem Bogen".
8. **`-webkit-backdrop-filter` before `backdrop-filter`**: the app's build keeps only the last of two equal values.
   (The app's own `global.css` has them the other way round, so the built app paints no blur on `.glass` in Chromium
   and Firefox today; the look does.)

Material and paint
9. **Never a blur on a child layer of a sheet**, never animate the sheet element at rest, nothing closer than 14 px
   to a drop may clip (head of `kern.css`).
10. **Dark glass plus a saturated backdrop turns brown** over warm scenes. Lower `--wa-sat` first; a darker sheet
    does not help.
11. **The scrim's blur is the cheap place** (its backdrop is the resting page: blurred once). A blur on the sheet
    would be redone with every picture of every drop on it. Over a page that never rests it is a full-screen blur
    per picture: `--wa-scrim-blur: none` there.
12. **The page darkening is parsed by the script** (`readGradient`): it must stay
    `linear-gradient(180deg, <colour> 0%, ... 30%, ... 70%, ... 100%)` with four stops.
13. **Inputs, selects and textareas cannot have `::before`.** Hence the waterline as a background layer and the one
    paint animation. A second background layer needs its own size on focus (the select's rules name both layers).
14. **A fill-mode `both` animation that ends with a transform overrides the element's own transform.** Never centre
    with a transform what is animated in (the toast is centred by margins).
15. **`rgba(var(--wa-drop-red))`** works because the token is `r, g, b, amount`. Keep four numbers.
16. **`inset` takes four values, no size.** A light with an invalid `inset` collapses silently.
17. **`.bereich-card--on` marks the workspace in use with an inset box-shadow**; a block that sets `box-shadow` on
    rows must give it back.

Motion
18. **`scale` and `translate` are the single parts of a transform** and add to an animated `transform`. That is how
    the loop at rest, the pull and the arrival live on one pseudo-element. `scale` works from the element's own place
    BEFORE its transform: a bead moved by `translateX` and scaled in width drifts - hence the breath in height only.
19. **Lights that start together stay on one beat; a paused light does not.** Never pause single lights (off
    screen); never move a helper in the DOM (it restarts its animations).
20. **A custom property set on the root for every frame restyles the whole page** (2 to 3 ms in the app against
    0.1 ms on one helper). The pull is handed to the light helpers only.
21. **The pulled state is an attribute, not a class**: Teil 1 re-reads every drop when a class inside the root changes.
22. **The app moves a running print's progress a hair every second.** A CSS transition on the width would run all
    the time on a blurred card. The width does not ease; the script animates real changes only.
23. **WebKit keeps the loop of a pseudo-element that is `display: none` or not generated**: the "no motion" rules
    and the Bogen's light also say `animation: none`.
24. **A stepped loop is cheap in Chromium** (its compositor draws only when a step comes) **and WebKit runs it on
    the page's own thread**; hence `linear` for WebKit (`@supports (-webkit-nbsp-mode: space)`). Neither path was
    measured on a phone.

Script and React
25. **The drops do not notice a changed custom property at once.** They re-read once a second, and not at all while
    the water is frozen (reduced motion). After injecting CSS in a test, dispatch `resize` on `window`.
26. **Anything that hides a drop without unmounting it must end its press** (done for `modal`; remember it for any
    new way of covering the page).
27. **React writes `name` and `type` on every input each time the app re-renders** (once a second while a print
    runs). An observer must filter by attribute name.
28. **React reuses the toast node** when one toast follows another, so no copy leaves then. The copy carries the
    toast's classes for 0.26 s (`inert`, `aria-hidden`); a test that counts `.toast` right after it vanished sees it.
29. **Web Animations cannot read custom properties, `getComputedStyle` can.** Do not copy durations into the script.
30. **After `stop()` the WebGL context is given back**; a late "context lost" event of an old instance must not
    touch the new one (guarded by `alive`).

Testing
31. **A frame rate measured with `requestAnimationFrame` alone says nothing about the compositor** when the page
    commits nothing. Couple it (`messen.mjs takt` moves a tiny layer every frame).
32. **Frozen water does not redraw when an element is moved by an inline style**; dispatch `resize` or change a class.
33. **The ring's tests must tap, not hold**: the ring starts on release. Swallow the click if it would open a sheet.
34. **The harness page does not scroll at 844 px height and switches the cards' entrance off.** Scroll and entrance
    are judged in the real app (`film.mjs`). In the app a tab change remounts the cards; a filter, a tick or a select
    does not.
35. **WebKit on the work machine** paints no `backdrop-filter` at all (sheets show the scene sharp, a sheet of
    "klar" shows ghost words of the page behind it), drops the depth layers of small cards in the zoomed close-up,
    and needs more than 100 ms for the first frame of a new screen. Judge blur and depth in Chromium.
36. **Playwright's `click()` on `.m-head .ws-chip` times out** (a span inside the brand button); use
    `evaluate(el => el.click())`.
37. **Ticking a task on "Heute" shows no toast** (the row goes, a ring runs). A real toast with "Rückgängig":
    remove a shopping entry on "Material" (`sheet('toast')` in `lib.mjs`).
38. **In `vergleich.mjs` the app's clock stands still** (`page.clock.setFixedTime`); without that two runs differ by
    the clock and a running print.

---

## 8. Tools (`scripts/wasser/`, run from the repository root)

| Tool | What it does |
|---|---|
| `mobil.html` | the harness page: a mock of the mobile screen with the real app stylesheets, the template on top. `?ton=klar`, `?scene=...`, `?nah=1`, `?alles=1`, `?fallback=1`, `?ohne=1`, `?alt=<folder>`, `?schlaf=<ms>` |
| `lib.mjs` | shared: `session({ engine })` -> `harness(options)`, `app(options)` (the REAL app, look injected once; `go`, `sheet`, `closeSheet`, `project`, `shot`), a file server for the repository, `diff`, `strip` |
| `vergleich.mjs [bilder\|app\|stile\|film\|alles]` | template against the approved look: pixels (inside / outside the drops), computed styles incl. pressed and focused, motion at fixed times. Exit code 1 on a difference |
| `pruefen.mjs [--app]` | checks: start, marker, ring, every block by class alone, sleep, reduced motion, stop / start / options, no WebGL, the real app |
| `bild.mjs <out> [szenen\|nah\|alles\|app]` | stills, both tones, contact sheets |
| `film.mjs <out>` | filmstrips from the real app: ruhe, tab, druck, scroll, bogen, haken (`--reduced`, `--fest`) |
| `clip.mjs <out.mp4>` | a recording of the real app (or `--seite mobil`) |
| `kontrast.mjs [--app]` | WCAG contrast of the texts against the pixels really behind the glyphs |
| `messen.mjs ruhe\|takt` | alive but calm (pixels that change at rest, glyph pixels); frames a second coupled to the compositor |
| `keyframes.mjs` | prints the keyframes of the loops at rest |

All take `--engine chromium|webkit`, most `--ton klar` or `--toene dunkel,klar`, `--look vorlage|<folder>|ohne`.
The real app needs `npm run build && npm run preview` (port 4173; `WASSER_APP=<url>` for another address). WebKit
needs Playwright's WebKit; on the work machine: `source <scratchpad>/judge-phone/env.sh` in the same shell first (and
not for Chromium afterwards: it points Playwright at a folder without Chromium). Playwright is taken from
`/opt/node-tools`, else from `node_modules`. Pictures are compared and composed with `sharp` (a dev dependency).

---

## 9. Verified

VERIFIED_PLACEHOLDER

---

## 10. Building it into the app (not done; the owner decides when)

1. Copy the four files to `src/wasser/`, add `wasser.ts` (head of `wasser.js`). Import order: after `mobile.css` and
   `global.css`.
2. `Mobile()`: root `<div className="m-shell" data-wasser="mobil">`, the hook once.
3. Tone: `src/App.tsx` sets `document.documentElement.dataset.theme` today and forces "dunkel" on mobile. Keep the
   app's theme at "dunkel" wherever the look is on (the look has light text in both tones; the app's
   `[data-theme="hell"]` rules are NOT the light mode of the look) and set `data-wa-ton` from `settings.theme`:
   Dunkel -> no attribute, Hell -> `klar`, Automatisch -> by `DARK_LOOKS` (`src/scene/looks.ts`). A live switch
   works (checked: free and card drops follow within a second).
4. CSP of the Node server: nothing new. The look uses two `data:` images (allowed by `img-src data:`) and WebGL; no
   foreign address.
5. After the build grep the CSS for both `backdrop-filter` properties (pitfall 8), then `vergleich.mjs` against the
   built app is not possible as such - use `bild.mjs app --look ohne` on the new build and compare by eye with
   `docs/wasser-look/bilder/mobil`, and run `pruefen.mjs`-like checks by hand.
6. `scripts/verify.mjs` was never run against a build with the look. Known to matter: a card has one more child
   (`<i class="wa-licht">`), every drop button has a `<canvas>` as first child, a removed toast leaves a copy for
   0.26 s, the ring appears on release.

---

## 11. Desktop (next step; nothing is applied yet)

`desktop.css` is the place; its head lists what belongs there. What the exploration of the desktop found (13.11.):

- **Root and theme.** `data-wasser="desktop"` on the stage (the scene image must be inside the root). The desktop has
  no dark tokens of its own: declare `color`, `--text`, `--text-2`, `--text-3` on the root as `mobile.css` does on
  `.m-shell`, and keep the app's theme at "dunkel" (by day the app switches to dark text on light glass: every
  heading would be invisible on the water).
- **Script options.** `scene`: `.land picture:last-child img` (one image; during the 2.5 s crossfade of two
  landscapes the drop jumps to the new one). `shade: ''` (the desktop has no page darkening). `bar: '.dock'`,
  `scrollers`: `.panel__body, .inner-cluster, .sheet__body, .cmd__list`. `drops`: few (about six per screen): the
  three round top-bar buttons (`.topbar .chip.btn--icon`, not a `.btn`), primary buttons, the hero buttons under
  the island. Wake on pointer movement is not built (the clock counts pointerdown, scroll, key).
- **A drop free over the stage bends ONE image**: it cannot show islands, clouds, leaves, sun glow, tint or the
  crossfade. Anything that may have an island behind it must not be a live drop (use the browser's own
  `backdrop-filter`, or no see-through effect).
- **Blocks.** Side panels (`.panel-col > .glass.panel`, 440 x 150 to 300 px): stilles Wasser, never Becken (pitfall
  5). One main panel per world: Becken. Dock: stilles Wasser + Markierung with seven children (two more `:has()`
  lines, `--wa-bar-tabs: 7`); the dock centres itself with `left: 50%` and a transform - do not give it the mobile
  bar's `left / right`. Rows, hour tiles, AMS slots, gallery cards: Mulde. Top-bar text chips, info chips, filter
  pills, carousel arrows: flat glass or Perle WITHOUT blur (they lie over sky).
- **Sheet.** Same class as on the phone, another shape: a right drawer (460 px, 14 px from top, right, bottom), the
  app's entrance `slide`. Re-declare the Bogen tokens for the desktop and give it its own entrance; `--wa-scrim-blur:
  none` (a blur there is a full-screen blur over a stage that never rests).
- **Panels clip.** Panels in columns are `overflow: hidden`, their bodies scroll behind a fade mask: the 14 px a
  drop's bulge needs are cut there. Buttons on panels: plain glass, not live drops (as the per-row buttons).
- **The stage never rests** (clouds, leaves, islands, the clock): every blurred sheet is blurred again for every
  picture. There are three to four times as many sheets on a screen as on the phone. Blur budget: panels and dock.
- **Hover** does not exist in the look (only the press); the app's own hover rules lose to the look's selectors.
  The desktop needs a hover state (a trough at half its pressed light) and more Wasserlinie entries (`.chip`,
  `.dock button`, `.carousel-nav`, `.gcard`, `.back`).
- **CSS `zoom` on panels** (0.919 at 2000 x 993) works: drops stay aligned.
- Check every desktop picture in both formats (1920 x 1080, 2000 x 993), by day and by night, in both tones; no
  panel or text on an island.

---

## 12. Open

- **Never on a real phone.** Everything was judged in Chromium and in Playwright's WebKit on a machine that renders
  in software. Unverified there: smoothness; whether the glints read as light on water; the floor light on an OLED;
  the blurred scrim; the select with `appearance: none` on iOS; hit areas; `color-scheme: dark` on the native date
  picker; the ring on release; "klar" in daylight.
- **The frame rate in WebKit.** In the software WebKit build the wandering lights alone hold the compositor at about
  14 frames a second (every composite in which a layer moved inside a blurred sheet redoes that sheet), the complete
  look at 9 to 12 (the app without the look: 49 to 62). Chromium is unmoved (49 of 60). Nothing was found that helps
  in that build except pausing the loops. Unknown for an iPhone. First things to try there if it stutters or gets
  warm: `[data-wasser] { --wa-lauf: paused; }`, then `--wa-leben: 0`, then the stepped gait for WebKit too (delete
  the `@supports (-webkit-nbsp-mode: space)` block).
- **Entering a screen** blocks the software WebKit build 2 to 3 times longer than without the look (a dozen soft
  box-shadows per card are rasterised on the CPU). If the iPhone hitches on a tab change: smaller `--wa-deep-soft` /
  `--wa-shelf-soft` first, then `--wa-t-step: 0ms`.
- **Android hand-over of the drops**: every water picture is copied into 4 to 7 small 2D canvases; unmeasured on a
  phone.
- **The toast's own light.** The motion step gave the toast a smaller, quicker light (8 px high, 28 % wide, a 12 s
  loop). Since the step after it that rule lost by weight (pitfall 1), so the approved state - and this template -
  shows the common Lichtlauf on the toast (13 px, 30 %, 40 s). The rule is kept as a comment in "Tropfen-Hinweis";
  the tokens `--wa-t-ruhe-kurz`, `--wa-gang-kurz` are ready. The owner has only seen the toast as it is now.
- **A sheet of "klar" without backdrop blur** shows the page behind it sharp at about a fifth of its strength. If a
  phone shows ghost words: `--wa-sheet` of "klar" to `.9`.
- **Loose white text over the painted scene** (the quote on the start screen) has single stretches at 2.6 : 1 over
  bright foliage in both tones and in today's app.
- **Still dead:** a closing sheet, a removed row, a toast that replaces another one, the header.
- **The marker's observer** forces style in the middle of a tab change (about 8 ms on the work machine).
- **The marker knows five children**; more need one `:has()` line each.
- **Desktop:** nothing applied (section 11). **`scripts/verify.mjs`:** never run against a build with the look.
