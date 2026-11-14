# Wasser-Look, the template: notebook for whoever applies it

State 14.11. (packed 13.11.; the corrections after the two checkers of the package are in: section 9, "What changed on
14.11."). Written for a helper who has not seen the look being built. German names of the building blocks are
kept (they are the names the owner knows). Read `LIESMICH.md` first for what is where and how to look at it; the
owner's decisions are in `docs/wasser-look/entwurf/entscheidungen.md` and override everything here.

The template is not built into the app. It was made from the approved look (`docs/wasser-look/entwurf/nachgebessert`,
a stylesheet and a script injected under `.m-shell`) by restructuring, plus the few corrections of 14.11.;
`scripts/wasser/vergleich.mjs` proves after every change that it still paints the same (section 9).

---

## 1. The template in one page

| | |
|---|---|
| Files | `kern.css` (the look), `mobil.css` (what only the mobile shell needs), `desktop.css` (empty, for the next step), `wasser.js` (the script). Load order: the app's own stylesheets, then these three, then the script. |
| Switch | The attribute `data-wasser` on a root element. Every rule of `kern.css` starts with `[data-wasser]`, every rule of `mobil.css` with `[data-wasser="mobil"]`. The script looks only inside the root (option `root`, default `[data-wasser]`). No attribute: the app as it is. |
| Tones | `dunkel` (default) = dark mode, `klar` (`<html data-wa-ton="klar">`) = light mode. One block of 55 tokens each in `kern.css`, part 1, same tokens in the same order. No other rule mentions `data-wa-ton`; the script has no tone logic. Text is light in BOTH tones. |
| Tokens | Every colour, radius, gradient, shadow, duration and easing is a `--wa-*` custom property on `[data-wasser]` (`kern.css` parts 1 to 3; the mobile shell's own in `mobil.css` part 1). One more name is read by the drops: `--water-under` (set by sheets). |
| Blocks | Each building block is ONE nested rule with ONE selector list (`kern.css` part 4). Apply a block by adding a selector to its list, or by giving an element the block's neutral class `.wa-...`. |
| Script | `Wasser.start(options)` / `Wasser.stop()`; `Wasser.MOBIL` = the default options (the mobile shell); `Wasser.info` = state of the drops. One global, one instance. |
| No motion | `prefers-reduced-motion: reduce`, or the app's switch `data-motion="reduziert"` on `<html>`: every block carries both rules itself, nested at its end; the script checks `still()` before every animation. |
| Without the script | The still look with plain glass buttons (no drops, no ring, no light helpers, the marker glides). Without WebGL: the same, but ring, marker, light and sleep work. |

Why the lists are in `kern.css` also for elements that exist only in the mobile shell (`.glass.m-card`, `.m-tabs`,
`.m-ico` ...): CSS cannot add to a selector list from another file. The alternative would be a second copy of every
block per shell. So: block definitions and ALL lists in `kern.css` (mobile entries are marked `mobil`), everything a
shell needs beyond the blocks in its own file. (`.m-ico` also stands in the two lines of "Tropfen" that say which
drops are round.)

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

No floor light on it: `.my-panel > .wa-licht > .wa-boden { display: none; animation: none; }`. No arrival of its light
(it has an entrance light of its own, like the bottom sheet): `.my-panel > .wa-licht { --wa-schwappt-oben: 1 1;
--wa-schwappt-unten: 1 1; --wa-schwappt-boden: 0 0; }`.
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

**How bright the clear drops on a surface are:** `--wa-drop-veil`, 0 .. 1 (0 = only rim and highlight, 1 = silver
drops). It is a tone token - `dunkel` 1, `klar` .3 (a lighter page under the cards: with 1 the white labels lost up to
1.5 of contrast) - and a surface may set its own (a bottom sheet does: `--wa-bogen-veil`, .35). Read within a second.
A label on a clear drop that is hard to read is cured HERE, not by a darker sheet: the drop is light laid over the
real pixels of the sheet, and what the sheet is "told" (`--water-under`) hardly moves the label's ground (tried).

**A new field / options group / progress bar / check:** class or list of Feld / Wahl (+ option `groups`) / Pegel
(+ option `levels`) / Haken. More than one label of a Wahl may be `.on`.

**Panels that appear together and have no entrance of their own:** `.wa-setzt` on each,
`animation-delay: calc(var(--wa-t-step) * n)`.

**A leaving sheet (not used yet):** when the app delays unmounting by `--wa-t-leave` (0.26 s), add class `wa-geht`
to the sheet; the keyframes `wa-sinkt` are in "Bogen".

**A new loop at rest:** transform and opacity only, on a layer of its own; eight equal keyframe intervals
(`node scripts/wasser/keyframes.mjs` prints them); `animation: <name> var(--wa-t-ruhe-N) var(--wa-gang-N) infinite;
animation-play-state: var(--wa-lauf);` and both "no motion" rules nested in its block.

**Tuning life at rest:** `--wa-leben` first, a number from 0 to 2 set on the root (0 = nothing is seen, 1 = as
built, about 1.5 = the most that reads as calm). It is strength only, never speed, and it is a control of TASTE: at 0
every loop still runs, unseen, at the full cost (measured). Then per tone `--wa-glanz*`, `--wa-boden`. Where the token
moves something it is bounded (`--wa-zug-min`, `--wa-zug-max`, the `min()` in `--wa-zug-weit` and `--wa-zug-boden`):
above 1 the lights get brighter and lean further, they do not slide or lag further - a basin has no more room.
To SEE two values side by side: `node scripts/wasser/leben.mjs <out> --werte 1,1.5` (a film and a filmstrip of the
real app; the one made on 14.11. is `docs/wasser-look/bilder/mobil/leben-vergleich`).
**Saving work** is another switch: `[data-wasser] { --wa-lauf: paused; }` freezes every loop where it stands (the
only thing that bought frames in the WebKit test build), see section 13.

**A third tone, or dropping one:** a tone is the block `:root[data-wa-ton="<name>"] [data-wasser] { ... }` with all
55 tokens (`pruefen.mjs`, check 10, compares the two lists). Nothing else to do; the drops re-read within a second (at once when `data-wa-ton` changes).

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

In the React app later: `src/wasser/wasser.ts` imports the three stylesheets and the script (side effect: the
global) and exports a hook that calls `window.Wasser.start(options)` in a `useEffect` and `window.Wasser.stop()` in
its clean-up; `Mobile()` uses the hook and its root gets `data-wasser="mobil"`. Start it when the root is in the
document (an effect is). The head of `wasser.js` shows the lines. The script must NOT lie beside `wasser.ts` under
the name `wasser.js` (an import without extension finds the `.js` first): copy it as `wasser-skript.js`.

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
| `webgl`, `debug` | `true`; `{ flat, prof, noDeriv }` all false, `cost: null` | test aids (the harness page maps `?fallback=1`, `?w3flat=1`, `?w3prof=1`, `?w3noderiv=1` to them). `debug.cost`: a function (ms) -> ms through which the governor of the drops sees what each water picture cost - to pretend a slow phone (`pruefen.mjs --regler`) |

An empty selector switches its feature off. Helper elements the script makes (all `aria-hidden`, no clicks, React
may throw them away at any time): `canvas.w3-drop` in every drop (attribute `data-w3="on"` on the button while its
drop is drawn), `i.wa-floor > i.wa-ring` for the 1.1 s of the ring (removed after 1.7 s at the latest),
`i.wa-licht > i.wa-boden` as last child of a lit sheet, a copy of a removed toast with class `wa-geht` for 0.26 s.
Attributes: `data-wa-ruht` on the root, `data-wa-zieht` and `--wa-zug` on a light helper while its list is scrolled,
`data-wa-kommt` on a NEW light helper for its first two frames (its lights stand where they arrive from, then swing in).

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
20 s of easy pictures step up again; a try that fails within 30 s doubles the wait (5 min at most); a level reached
by a climb that has held for the wait sets it back to 20 s (before 14.11. one failed try slowed every later climb
until reload). `Wasser.info.level` and `.wait` show it; `node scripts/wasser/pruefen.mjs --regler` walks through all
of it in three minutes with pretended picture costs (start option `debug.cost`). The waits count the time of drawn
pictures, at most 0.1 s each: at 12 pictures a second 20 s take about 25 s by the clock.

---

## 5. Tokens: where to turn what

- **Tones** (`kern.css` part 1): the water from rim to deep (`--wa-clear`, `--wa-shelf`, `--wa-deep`, `--wa-under`,
  `--wa-still`, `--wa-dense`, `--wa-sheet`), the light (`--wa-light`, `--wa-core`, `--wa-warm`, `--wa-dark`), the
  rims (`--wa-meniscus`, `--wa-shallow`, `--wa-far`, `--wa-lift`, `--wa-dense-*`), troughs (`--wa-trough*`), ink
  (`--wa-ink-*`, `--wa-shade*`), pills, the bar's labels and bead, softness (`--wa-sat`, `--wa-blur*`), the page
  (`--wa-page-1..4`, `--wa-page-ink-3`, `--wa-abyss`), life (`--wa-glanz*`, `--wa-boden`), the drops (`--wa-drop-red`,
  `--wa-drop-veil`).
- **Form** (part 2): one group per block, named after it (`--wa-r-becken-*`, `--wa-bogen-*`, `--wa-feld-*`,
  `--wa-wahl-*`, `--wa-haken-*`, `--wa-pegel-*`, `--wa-perle-*`, `--wa-ring-*`, `--wa-glass*`, `--wa-amber-*`,
  `--wa-red-*`, `--wa-pill-*`, `--wa-r-tropfen-*`, `--wa-drop-*`, `--wa-focus*`).
- **Motion** (part 3): the language (`--wa-t-*`, `--wa-ease-*`), loops at rest (`--wa-t-ruhe-*`, `--wa-gang-*`,
  `--wa-t-atem`), `--wa-lauf` (running / paused: the switch for SPEED), `--wa-leben` (0 .. 2: the control of TASTE),
  the lights (`--wa-licht-*`, `--wa-boden-*`, `--wa-zug-*` with the bounds `--wa-zug-min` / `-max`, `--wa-schwappt-*`,
  `--wa-lauf-*`, `--wa-atmet*`).
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
- klar, `--wa-drop-veil: .3`: the value at which no label on a clear drop on a card is more than 0.3 below what it
  was before the page of "klar" was lightened (eight scenes); .35 misses that by a hair, .6 by up to 0.9. The small
  drops gain more than they had lost (up to +1.9): one number cannot restore each drop exactly.
- `--wa-zug-weit` 24 px and `--wa-zug-boden` 28 px are the room a phone-wide basin has: at rest the glints end 12 px
  before the corners of the widest outline, and the floor light touches the foot of its basin at the low points of
  its loop. A basin narrower than about 300 px needs smaller values (not needed in the mobile shell).

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
38. **In `vergleich.mjs` the app's clock stands still** (`page.clock.setFixedTime`) **and Open-Meteo is blocked**;
    without that two runs differ by the clock, a running print, and a weather card that comes on one run and not on
    the next.
39. **The three stylesheets must arrive together.** Loaded one after the other from a script, the page is painted once
    with `kern.css` alone, the cards then change their padding (`mobil.css`), and Chromium draws the soft shadows of the
    zoomed close-up a few grey levels differently for good (up to 17 of 255 on 4 % of the picture; same computed
    styles). `mobil.html` writes the links into the head; the tools inject one style element; the app's build bundles.
40. **WebKit can fire `load` of the scene image one frame before the image can be drawn.** The approved script
    uploaded an empty picture then: the drops free over the scene (the header buttons) stayed BLACK until the next
    scene - in Playwright's WebKit after 8 of 48 changes of screen. `wasser.js` does not upload an empty picture and
    looks again with the next frame (`Wasser.info.blank` counts how often): 0 of 48. Whether an iPhone does the same
    is unknown; the cure costs one pixel read per scene.
41. **Under reduced motion the first picture of the drops can come late on a slow machine.** A screenshot taken too
    early shows a drop with the scene of the screen before. `vergleich.mjs` looks a second time before it reports.
42. **Playwright's video recorder swallows soft light.** It is a low-bitrate VP8 stream: two pictures of a page at rest
    differ by 4 of 255 or more on 47 % of their pixels, a light of +10 to +17 is lost in that. To judge life at rest,
    the floor light or the lean, record through the browser's screencast: `clip.mjs --cast`, `leben.mjs` (`lib.mjs`,
    `cast` / `encodeCast`; Chromium only). A palette PNG (`strip(..., { palette: true })`) is for small stills only.

Motion, found on 14.11.
43. **While a keyframe animation runs on `scale` or `translate`, a transition on the same property does not start.**
    The arrival of a sheet's light was such an animation (1.6 s): a list scrolled within that time was followed in
    steps and did not swing out. Anything that must stay interruptible by the pull is built as a pull: an attribute
    holds the start value for two frames, its removal lets the transition run (`data-wa-kommt`, "Schwappen").
44. **A master number that multiplies geometry needs a bound at every product.** `1 - pull x strength x --wa-leben`
    went below 0 above 1.11: a negative scale flips a light over its rim line, out of the sheet. Lean: `clamp()`;
    lengths: `min()`. `pruefen.mjs` (check 10) reads the computed values from 0 to 2 at full pull.
45. **`--wa-leben: 0` saves nothing.** Every loop keeps running on its layer, unseen (WebKit test build at 3x:
    10.1 / 8.6 frames a second at 0, 10.7 / 8.8 complete, 37.9 / 22.4 with `--wa-lauf: paused`).
46. **A drop on a sheet is light laid over the sheet's real pixels.** What lies under it shows through: the floor
    light passing under a clear drop lifts the ground of its label a little (a living label measured 11.2 without
    and 10.1 with the floor light, in "dunkel"), and a lighter page under a card lifts it for good (cure:
    `--wa-drop-veil`).

---

## 8. Tools (`scripts/wasser/`, run from the repository root)

| Tool | What it does |
|---|---|
| `mobil.html` | the harness page: a mock of the mobile screen with the real app stylesheets, the template on top. `?ton=klar`, `?scene=...`, `?nah=1`, `?alles=1`, `?fallback=1`, `?ohne=1`, `?alt=<folder>`, `?vorlage=<folder>`, `?schlaf=<ms>` |
| `lib.mjs` | shared: `session({ engine })` -> `harness(options)`, `app(options)` (the REAL app, look injected once; `go`, `sheet`, `closeSheet`, `project`, `shot`), a file server for the repository, `diff`, `strip`, `stack`, and the screencast recorder `cast` / `encodeCast` |
| `vergleich.mjs [bilder\|app\|stile\|film\|alles]` | template against the approved look: pixels (inside / outside the drops), computed styles incl. pressed and focused, motion at fixed times. Exit code 1 on a difference that is not on its list of deliberate ones (`KNOWN`). `--alt git:HEAD` or `--alt <a copy of the template folder>`: against the template as it was before YOUR change |
| `pruefen.mjs [--app] [--regler]` | checks: start, marker, ring, every block by class alone, sleep, reduced motion, stop / start / options, no WebGL, the real app, pull and arrival of the light, the bounds of `--wa-leben`, the token lists of the two tones; `--regler`: the governor of the drops (three minutes) |
| `bild.mjs <out> [szenen\|nah\|alles\|app]` | stills, both tones, contact sheets |
| `film.mjs <out>` | filmstrips from the real app: ruhe, tab, druck, scroll, bogen, haken (`--reduced`, `--fest`) |
| `clip.mjs <out.mp4> [--cast]` | a recording of the real app (or `--seite mobil`). `--cast`: through the browser's screencast - use it whenever soft light is to be judged (pitfall 42) |
| `leben.mjs <out> [--werte 1,1.5]` | how much life? The same walk through the real app once per value of `--wa-leben`, side by side as labelled phones: `<out>.mp4` and a filmstrip `<out>.png` |
| `kontrast.mjs [--app]` | WCAG contrast of the texts - and of the labels on drops - against the pixels really behind the glyphs |
| `messen.mjs ruhe\|takt` | alive but calm (pixels that change at rest, glyph pixels); frames a second coupled to the compositor (`--css '<rules>' --mal 3`: what does a change buy?) |
| `keyframes.mjs` | prints the keyframes of the loops at rest |

All take `--engine chromium|webkit` (the screencast tools: Chromium only), most `--ton klar` or `--toene dunkel,klar`,
`--look vorlage|<folder>|ohne` (a folder is another copy of the template, or an earlier `look.css` + `look.js`).
The real app needs `npm run build && npm run preview` (port 4173; `WASSER_APP=<url>` for another address). WebKit
needs Playwright's WebKit; on the work machine: `source <scratchpad>/judge-phone/env.sh` in the same shell first (and
not for Chromium afterwards: it points Playwright at a folder without Chromium). Playwright is taken from
`/opt/node-tools`, else from `node_modules`. Pictures are compared and composed with `sharp` (a dev dependency).

---

## 9. Verified

All on the work machine (software rendering; Chromium and Playwright's WebKit for Linux, which paints no
`backdrop-filter`). Reference: the approved look, `docs/wasser-look/entwurf/nachgebessert`. Nothing ran on a phone.

**What the template changes against the approved files - and nothing else**

1. Structure: rules under `[data-wasser]` instead of `.m-shell` (170 rules became 75 rules with 125 nested ones in
   three files, one selector list per block); one script with options instead of four sections that started
   themselves and had the mobile selectors wired in.
2. Tokens: the buttons block reads every colour, radius, gradient and shadow from 33 new tokens with the same values;
   `--w3-pad` is `--wa-drop-pad`, `--w3-halo` is `--wa-drop-halo`; `--wa-focus-gap-nah` (2 px) is new. The plain glass
   and the film of a ghost button ease with the look's `--wa-t-fast` (0.14 s) instead of the app's `--t-fast` (0.18 s).
3. With no motion wanted every trough says `transition: none` (before: rows only). Nothing to see: their time is 0 s.
4. Script, behaviour: a scene image that cannot be drawn yet is not uploaded (pitfall 40: the black drops in WebKit);
   a late "context lost" of a stopped instance is ignored; without a `shade` element the scene is not darkened
   (before: a built-in copy of the mobile page's darkening).
5. Reach of three rules, without effect in today's app: `.wa-tropfen` is a drop by class alone (`drops`, `ringFrom`);
   pills are flat also on `.wa-becken`, `.wa-wasser`, `.wa-wasser--dicht`; a `.badge` is styled in any drop (before:
   in `.m-ico` only).
6. Not carried over: the toast's own small light, a rule that never applied (section 12).
7. The corrections of 14.11., after the two checkers of the package (numbers below). "dunkel" at rest does not move by
   one pixel; "klar" changes inside the drops on cards and nowhere else:
   a. the pull of scrolling is bounded for every `--wa-leben` from 0 to 2 (pitfall 44);
   b. the light of a new sheet arrives by the transition of the pull instead of a keyframe animation (pitfall 43);
   c. "klar": the tone token `--wa-drop-veil` is .3 ("dunkel": 1, as it was);
   d. the governor of the drops sets its wait back after a climb that held; start option `debug.cost`,
      `Wasser.info.wait`.

**Is it the same look?** `node scripts/wasser/vergleich.mjs` (machine otherwise idle), Chromium. The table is the
state of the package (13.11.); what the same comparisons say after the corrections of 14.11. follows below it.

| Comparison | What | Result |
|---|---|---|
| `bilder` | harness page, reduced motion: 8 scenes x phone view and close-up x 2 tones = 32 pairs, 56.8 million pixels | 0 pixels differ - outside AND inside the 288 drop canvases |
| `app` | real app, reduced motion, clock standing still: 16 screens (start, heute, projekte, a project, material, mehr, wetter, archiv, five sheets, search, a ticked task, a toast) x 2 tones = 32 pairs, 42.1 million pixels | 0 pixels differ - outside and inside the 166 drop canvases |
| `stile` | computed style of every element, `::before`, `::after`, `::placeholder` (all properties and the look's custom properties): harness page with motion, reduced motion and `data-motion="reduziert"`; 15 app screens with and without motion; both tones - 72 comparisons, 17,792 styles | 0 differ; 124 differ only as listed under 2 and 3 above |
| `stile`, pressed and focused | 1,132 tappable or focusable elements on 38 screens, each forced `:active` (with its ancestors) and `:focus-visible`, the element, its subtree and its ancestors compared | 0 differ |
| `film` | motion, real app: 12 filmstrips (ruhe, tab, druck, scroll, bogen, haken x 2 tones), every animation with an end set to the same times, loops at rest stopped at one place | the same animations ran in all 12; ruhe, tab, druck, bogen, haken: 0 pixels differ outside the drops in all 58 stills; scroll: first and last still identical, 12,000 to 150,000 pixels in the five stills while the light swings (it starts from the pull of real frame times: the reference compared with ITSELF gives the same numbers - 0, 148,289, 81,178, 101,814, 59,982, 24,143, 0 against 0, 147,930, 84,182, 104,949, 60,630, 25,383, 0) |
| the approved harness page itself (`base.html?look=final` on the work machine) against `mobil.html` | 32 pairs as in `bilder` | 0 pixels differ, inside and outside |

WebKit (`--engine webkit`): `bilder` 32 pairs, 0 pixels differ, outside and inside the drops. `app` 32 pairs, 0
pixels differ outside the drops; inside the drops 31 pairs are identical and one differs (dunkel, "Mehr", 79,008
pixels): there the REFERENCE shows black header drops (pitfall 40), the template the scene. `film`: the same
animations in all 12 strips, 0 pixels outside the drops in the 58 stills of ruhe, tab, druck, bogen, haken; scroll as
in Chromium. `stile` on the harness page (12 comparisons, 2,328 styles): 0 differ. The approved harness page against
`mobil.html`: 32 pairs, 0 pixels differ. The black drops, counted in fresh sessions (reduced and not, in turn; six
changes of screen each): reference 8 of 48, template 0 of 48 (its scene image was not drawable at "load" 9 times).

Firefox (its build here has no WebGL: plain glass on both sides): start scene, phone and close-up, both tones:
0 pixels differ.

On the way the comparison found, and the template or the tools now handle: the black drops of pitfall 40 (in the
approved look), the paint between two stylesheets of pitfall 39 (in the first version of `mobil.html`), late first
pictures of drops (41), weather that comes and goes (38).

**After the corrections of 14.11.** the same comparisons, the deliberate changes on the tool's list (`KNOWN`, point 4):

| Comparison | Result on 14.11. |
|---|---|
| `bilder` against the approved look, Chromium | "dunkel", 16 pairs: 0 pixels differ, outside and inside the drops. "klar", 16 pairs: 0 outside; inside the drops 84,000 (phone view) / 283,000 (close-up) pixels differ, largest 43 of 255 - the veil |
| `app` against the approved look, Chromium | "dunkel", 16 screens: 0 pixels differ, outside and inside the drops. "klar": 0 outside the drops on 14 screens; inside the drops on the five screens with clear drops on cards (46,000 to 56,000 pixels, largest 40); on two screens the changed drops are seen through a blur and differ by 1 of 255 beyond their boxes (the form sheet over "Projekte": 6 pixels; the toast: 3,134) - the tool marks these `ok~` |
| `film` against the approved look, Chromium | the same motion in all 12 strips (the arrival of the light named as transitions); 0 pixels differ outside the drops in the 58 stills of ruhe, tab, druck, bogen, haken - also in "tab", where the light arrives; scroll as before (real frame times) |
| `stile` against the approved look, Chromium | REF_STILE |
| `bilder`, `app` against the template as it was packed (`--alt <copy of commit f811b9d>`), Chromium | harness, 32 pairs: "dunkel" 0 pixels, outside and inside; "klar" 0 outside, inside the drops as above. App, 32 pairs: "dunkel" 0 pixels on all 16 screens; "klar" 0 outside the drops on 14 screens, inside the drops on the five screens with clear drops on cards; on two screens 6 and 3,134 pixels differ by 1 of 255 outside the drop boxes - the changed drops seen through a blur (behind the scrim of the form sheet; under the toast) |
| the same in the WebKit test build | harness, 32 pairs: "dunkel" 0 pixels, outside and inside the drops; "klar" 0 outside, inside the drops as in Chromium. App, 32 pairs: "dunkel" 0 pixels on all 16 screens; "klar" 0 outside the drops on all 16 (that build paints no blur, nothing spreads). In the first of two runs two single pixels behind the sheet "Hinweise" differed by 1 of 255; in the repeat none, and the template compared with itself there gives 0 |

**The corrections of 14.11., in numbers** (Chromium unless said; "before" = the template as packed, commit `f811b9d`;
the probes are the second checker's, run on both states):

| What | Before | After |
|---|---|---|
| Full pull (`--wa-zug` 1 and -1), light OUTSIDE the basins: device px at 2x that the lights change by 3 of 255 or more / the largest change; harness "start", worst of four places in the loops | `--wa-leben` 1: 3,792 px / 25 - 1.5: 9,037 px / 200 - 2: 20,086 px / 224 | 1: 3,792 px / 25 (unchanged: the soft tail of the floor light below its card, a glint in a corner) - 1.5: 2,325 px / 12 - 2: 1,373 px / 16 |
| the same in the real app ("Material", list scrolled) | 1: 21 px / 9 - 1.5: 5,099 px / 173 - 2: 8,059 px / 216 | 1: 21 px / 9 - 1.5: 34 px / 13 - 2: 44 px / 16 (both tones alike) |
| nearest light of +12 and more to a corner of its card, top rim, at full pull | 1: 35 px - 1.5: 19.5 px - 2: 6.5 px | 1: 35 px - 1.5: 34 px - 2: 32.5 px |
| computed at full pull, `--wa-leben` 1 / 1.5 / 2: lean of the lit rim (deeper, shallower); slide; lag of the floor light | 1.9, 0.1 / 2.35, -0.35 / 2.8, -0.8; 24 / 36 / 48 px; 28 / 42 / 56 px | 1.9, 0.1 / 2.35, 0.1 / 2.4, 0.1; 24 px; 28 / 18.7 / 14 px |
| A list rolled 0.7 s after its screen was entered (1300 px a second for 0.4 s, stopped dead): lean of the lit rim after the stop | 1.26 at 83 ms, 0.98 at 150 ms, then still - no swing | 1.71 at 67 ms, 1.49 at 133 ms, 0.86 at 450 ms, 1.06 at 900 ms, at rest after 1.4 s (3.2 s after entering, before and after alike: 1.71, 1.62, 0.75 at 467 ms, 1.08, rest) |
| The arrival itself: lean of the lit rim 0 / 0.2 / 0.4 / 0.9 / 1.6 s after its card appeared | 1.60 / 1.28 / 0.82 / 1.07 / 1.00 | 1.60 / 1.38 / 0.86 / 1.07 / 1.01 - the same curve, two frames later |
| "klar", white labels on clear drops on a card, eight scenes, living drops: medians; the lowest worst-5-% value | "Bearbeiten" 5.7 to 8.2, "Foto" 5.5 to 9.2, "Verbrauch buchen" 7.5 to 10.2; lowest 4.4 (WebKit build without blur: 3.9) | 6.5 to 9.9, 6.2 to 11.2, 9.0 to 12.4; lowest 5.0 (WebKit: 4.5). Against the values before the page of "klar" was lightened: no median more than 0.3 lower; "Foto" and the round "+" up to 1.6 and 1.9 higher |
| The governor after ONE failed climb: the wait of every later climb | 40 s (up to 5 min), until reload | 20 s again as soon as a climb has held for the wait. The walk of `pruefen.mjs --regler`: 5 s level 1 - 9 s level 2 - 35 s level 1 - 38 s level 2, wait 40 s (the climb failed) - 90 s level 1 - 135 s level 0, wait 20 s - 170 s level 1 (a later step down, no failed climb) - 193 s level 0 |

**Does it work?** `node scripts/wasser/pruefen.mjs --app`: 60 checks pass in Chromium (both tones) and 60 in WebKit
(14.11.; 55 at the package, the five of part 10 are new), and the nine of `--regler` in Chromium: start;
marker (tap, class moved by script, second tap during a flight, a bar that was replaced); ring (tap, re-rendered card,
held finger, drag, disabled button); every block on foreign elements by its class alone (17 checks); sleep and waking;
reduced motion and the app's switch; `stop()` leaves nothing behind, `start()` twice gives one instance, options are
honoured, one global; without WebGL; real app (a light per card, the page rests behind a sheet, the sheet's light
is pulled by scrolling, the toast is centred, `stop()` cleans up); pull and arrival of the light, the bounds of
`--wa-leben`, the token lists of the two tones (55 and 55, one rule names the tone).

**Can the text be read?** `node scripts/wasser/kontrast.mjs --app --szenen <all eight>`, Chromium; median (worst
5 % of the glyph pixels), floor 4.5, placeholders 3:

| Text | dunkel | klar |
|---|---|---|
| Card title, eight scenes | 15.6 to 17.2 (15.1) | 8.9 to 15.4 (7.8) |
| Count in the title row | 10.7 to 11.8 (10.2) | 6.8 to 12.9 (6.1) |
| Row title / muted line in a row | 17.7 to 18.2 / 9.9 to 10.0 | 11.7 to 15.8 (8.8) / 8.3 to 10.0 (6.7) |
| Inactive tab / active tab | 10.2 / 16.9 (12.3) | 7.1 / 9.8 (6.9) |
| Title of a sheet / text in a sheet | 17.3 / 17.3 | 11.1 (9.3) / 11.1 |
| Field label / typed text / placeholder | 11.3 / 18.2 / 4.7 | 8.0 / 13.2 / 4.6 (4.3) |
| Chosen option / other option | 10.0 (9.1) / 10.6 | 6.3 (5.8) / 8.3 |
| Chosen tab in a sheet / other | 10.9 / 11.3 | 7.5 (6.8) / 9.8 |
| Chosen filter pill on a card / other | 9.5 (8.5) / 10.5 | 7.7 (4.7) / 11.1 (7.6) |
| Search hit, small text | 9.0 | 6.1 (5.6) |
| Toast text / "Rückgängig" | 17.0 / 11.3 | 9.7 (6.5) / 7.0 |
| Foot note directly on the page | 4.9 (4.2) - the app's own faint ink | 8.9 (5.0) |
| Label on a clear drop on a card: short / small / long (the frozen drop) | 10.5 to 11.7 (8.9) / 10.0 to 11.6 (8.0) / 11.9 to 12.6 (9.2) | 8.1 to 11.0 (5.4) / 5.9 to 12.5 (4.6) / 8.9 to 13.1 (5.8) |
| Label on the red drop / on the amber drop | 7.9 to 8.0 (7.6) / 7.9 to 8.0 (7.5) | 5.7 to 6.0 (5.5) / 7.9 to 8.5 (7.5) |
| Label on a clear drop free over the scene | 5.1 to 13.4 (4.6) | 5.1 to 13.5 (4.6) |

No median below the floor (run on 14.11.). These are the numbers of the approved look; only the labels on clear
drops on cards of "klar" are new (`--wa-drop-veil`), and they are the tool's own, with the frozen drop of reduced
motion - a living drop moves them by about 0.2. Not in the tool: the icon of a round drop (the "+" in a card title;
the checker's measure: 6.1 to 11.3 in "klar", worst 5 %: 5.3).

**Alive but calm** (`node scripts/wasser/messen.mjs ruhe`, harness page, Chromium, 14.11.): of the pixels of the
cards outside the drops 20 % (dunkel) / 20 % (klar) change within a second, 3 to 4 % by 4 of 255 or more, the mean
change is 0.4 / 0.5; after four seconds 28 to 29 % have changed, 8 to 9 % by 4 or more; the tab bar 10 % / 16 %. The
single large values (60 to 210) are the 2 px glint on a rim line where it passes. Text: in these stills no glyph
pixel of row title, card title, count, tile caption and inactive tab changes, and 33 to 61 of the 800 to 900 pixels
of the small muted line change by 1 of 255. That is NOT "text never changes": with a mask of ALL text the second
checker found 3.0 % of the glyph pixels changed within one second and 6.5 % within four (up to 8 % of a card's in the
real app) - by 1 to 3 of 255, never by 4 or more - and up to 30 of 255 right beside the label of the active tab (the
bead breathes behind it). See-through ink over moving light is not still; the eye does not see it.

**How much of it is SEEN** (`node scripts/wasser/leben.mjs`, the real app, recorded through the screencast and
measured in the finished film `bilder/mobil/leben-vergleich.mp4`; left `--wa-leben` 1, right 1.5):

| | Leben 1 | Leben 1.5 |
|---|---|---|
| "Start" at rest: card pixels that change within one second by 4 of 255 and more / by 8 and more | 3.3 % / 0.9 % | 4.4 % / 1.2 % |
| the same over 5.4 s | 11.5 % / 4.1 % | 16.4 % / 6.2 % |
| "Heute", 0.12 s after the list was stopped, against 1.8 s after: by 4 and more / by 16 and more | 16.4 % / 1.8 % | 16.8 % / 3.0 % |
| the two phones against each other at the same moment | 11 to 16 % of the pixels differ by 4 and more, 2 to 3 % by 8 and more, the largest difference 29 to 55 | |

(The film is true to the page: decoded, it differs from the recorded pictures by 1.4 of 255 on average, two frames
at rest differ by 4 and more on 0.1 % of the pixels at most.) By eye, frame by frame: in both phones the glint on
the top rims wanders (about 8 px a second - it is found when one looks for it) and the rims of the cards light up
for half a second when the list stops; the light on the floor is seen in neither. Between the phones no difference
can be told at phone size, in stills not at all, in motion a slightly brighter rim. A try for this page only, not
built in: the same loops 2.5 times as fast at `--wa-leben` 1 change 5.5 % of the card pixels within a second by 4
and more and 1.05 % by 16 and more - against 2.8 % and 0.19 % as built, and 3.6 % and 0.26 % at 1.5. The pace
decides what the eye finds, not the strength.

**The pace of the page** (`node scripts/wasser/messen.mjs takt --scale 3`, real app on "Start", frames a second
coupled to the compositor; software rendering - only the relations count):

| | as it is | loops at rest paused | no drops, lights only | the app without the look |
|---|---|---|---|---|
| Chromium, template | 50 | 59 | 60 | |
| WebKit, template | 11 | 45 | 14 | 51 |
| WebKit, reference | 12 | | | |

The template is as fast and as slow as the approved look; section 12 says what the WebKit numbers mean. (14.11.,
machine idle, three runs each: Chromium as it is 58 on "Start", 54 on "Heute", 53 on "Material"; WebKit 12 and 10.)

**Not measured again** (the numbers of the builders stand): taps on hit areas in pixels, contrast in WebKit beyond
the labels on drops, the L* of the drops' bodies over their card in "dunkel". The governor has only ever been walked
with pretended costs or forced levels, never by a machine that really got slow and fast again.

**The app is untouched:** `npm run build` passes; `git status` shows only `docs/wasser-look/vorlage`,
`docs/wasser-look/bilder/mobil` and `scripts/wasser`.

---

## 10. Building it into the app (not done; the owner decides when)

1. Copy the four files to `src/wasser/` (the script as `wasser-skript.js`), add `wasser.ts` (head of `wasser.js`).
   Import order: after `mobile.css` and `global.css`. Tried in a scratch project with the app's Vite 8 and target
   es2022: the build lowers the nesting (no `&` left), keeps both `backdrop-filter` properties, CSS 50 KB (10 KB
   gzip), script 38 KB (15 KB gzip); tokens, blocks, `start()` and `stop()` work in the built page.
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
  picker; the ring on release; "klar" in daylight. Section 13 is the order in which to look.
- **The frame rate in WebKit.** In the software WebKit build the wandering lights alone hold the compositor at about
  14 frames a second (every composite in which a layer moved inside a blurred sheet redoes that sheet), the complete
  look at 9 to 12 (the app without the look: 49 to 62). Chromium is unmoved (49 of 60). Nothing was found that helps
  in that build except pausing the loops (`--wa-lauf: paused`; NOT `--wa-leben: 0`, pitfall 45). Unknown for an
  iPhone: section 13, point 1.
- **Entering a screen** blocks the software WebKit build 2 to 3 times longer than without the look (a dozen soft
  box-shadows per card are rasterised on the CPU). Section 13, point 2. In that build the first two frames of a new
  screen can take half a second: the light of the new cards then stands at its arrival place that long before it
  swings (before 14.11. the swing ran during those frames, unseen).
- **Life at rest is there by numbers and hard to find by eye** - at `--wa-leben` 1 and at 1.5 alike
  (`docs/wasser-look/bilder/mobil/leben-vergleich.mp4` / `.png`, numbers in section 9). What the eye finds is the
  glint on the rim lines and the lean when a list stops; the light on the floor (at most +17 of 255, a loop of 46 s)
  is not seen. 1.5 makes the lights brighter, not livelier: they move at the same pace (the glint about 8 px a
  second). The owner decides; if more is wanted, the lever is the pace (`--wa-t-ruhe-*` with their `--wa-gang-*`),
  not the strength - nothing was built for that.
- **The blur under the tab bar of "dunkel" stays** (tried on 14.11.: water of .93 opacity, does it need its blur?).
  Without it the picture inside the bar changes by 0.02 to 0.5 of 255 on average (largest 8), but rows that pass
  under the bar leave a faint sharp ghost of their words in it; and it buys nothing that can be told from the
  scatter: Chromium, coupled, 3x: Start 58.4 -> 57.7, Heute 53.6 -> 55.7, Material 52.9 -> 54.5 frames a second (three
  runs each, in turn); the WebKit test build, which paints no backdrop blur anyway: 12.2 -> 13.3 and 10.1 -> 10.5.
- **Android hand-over of the drops**: every water picture is copied into 4 to 7 small 2D canvases; unmeasured on a
  phone.
- **The toast's own light.** The motion step gave the toast a smaller, quicker light (8 px high, 28 % wide, a 12 s
  loop). Since the step after it that rule lost by weight (pitfall 1), so the approved state - and this template -
  shows the common Lichtlauf on the toast (13 px, 30 %, 40 s). The rule is kept as a comment in "Tropfen-Hinweis";
  the tokens `--wa-t-ruhe-kurz`, `--wa-gang-kurz` are ready. The owner has only seen the toast as it is now.
- **A sheet of "klar" without backdrop blur** shows the page behind it sharp at about a fifth of its strength, the
  search panel at about a third (its water is `--wa-dense`, .66): in the WebKit test build the clock, the greeting
  and row titles of the start screen stand between the search hits. With blur (Chromium) nothing of it. Section 13,
  point 4.
- **Labels on clear drops in "klar"** are back at the contrast they had before the page of "klar" was lightened, by
  one number (`--wa-drop-veil: .3`): none is more than 0.3 below, the small drops are up to 1.9 above (section 9).
  The drops on cards of "klar" therefore look a little different from the pictures the owner approved on 13.11.:
  less silver in the body, the same rim, highlight and glow (`bilder/mobil/klar-nah`, `klar-start`).
- **Loose white text over the painted scene** (the quote on the start screen) has single stretches at 2.6 : 1 over
  bright foliage in both tones and in today's app.
- **Still dead:** a closing sheet, a removed row, a toast that replaces another one, the header.
- **The marker's observer** forces style in the middle of a tab change (about 8 ms on the work machine).
- **The marker knows five children**; more need one `:has()` line each.
- **Desktop:** nothing applied (section 11). **`scripts/verify.mjs`:** never run against a build with the look.

---

## 13. The first test on a real phone

Nothing has run on a phone. Look in this order; each point says what a good and a bad result looks like and the ONE
line to change. A line is tried fastest from the browser's remote inspector (Safari: Develop menu; Chrome:
`chrome://inspect`) in the console of the running page, e.g.
`document.querySelector('[data-wasser]').style.setProperty('--wa-lauf', 'paused')` - tokens set this way on the
root win over the stylesheet; a tone token is set the same way (the drops follow within a second). What proves
itself goes into `kern.css` (the line is named).

| # | Look at | Good | Bad | The one line |
|---|---|---|---|---|
| 1 | **Frame rate**, complete look against lights paused: scroll the long list of "Material" slowly and fast, then the same with `--wa-lauf: paused` on the root | no difference in smoothness between the two; the phone stays cool after two minutes | the list is choppier, or the phone gets warm, with the lights running | `[data-wasser] { --wa-lauf: paused; }` (kern.css, part 3: the token is `running`) - the lights stand, everything else lives. If only an iPhone is choppy, try FIRST the stepped gait there: delete the block `@supports (-webkit-nbsp-mode: space) { ... }` in part 3 (the lights are then drawn 8 times a second instead of gliding). `--wa-leben` is no switch for this |
| 2 | **Entering a screen**: tap through the five tabs | the bead flows without a stall, the cards arrive in one movement | a freeze of a fifth of a second or more before the new screen moves | `--wa-deep-soft: 20px; --wa-shelf-soft: 8px;` (part 2, "Becken": smaller soft shadows of the depth steps); if still bad `--wa-t-step: 0ms` (part 3) |
| 3 | **The first picture after a tap**: open a bottom sheet ("Neues Projekt"), tick a task, tap a button on a card | the sheet starts to rise, the ring starts, at once | a pause before anything moves (in the test builds 0.4 to 1 s in single cases) | the same line as in 1: if pausing the lights cures it, the lights hold the compositor |
| 4 | **"klar", weak blur**: open the search and a form sheet over "Start" and over "Heute" (`data-wa-ton="klar"` on `<html>`) | behind the hits and the form only soft shapes | words of the page can be read between the hits or behind the fields | search, bar, toast: `--wa-dense: rgba(62, 66, 70, .9);` - sheets: `--wa-sheet: rgba(56, 60, 64, .9);` (part 1, tone "klar"; today .66 and .82) |
| 5 | **Banding of the floor light**: an OLED phone in a dark room, "dunkel", a card with open floor (the lower third of "Als Nächstes"), half a minute | an even, soft brightening that comes and goes, or nothing at all | slow concentric rings or steps on the floor of a card | `--wa-boden: .15;` (part 1, tone "dunkel"; today .26). Rings still there: `--wa-boden: 0;` - the floor light is the part of the life at rest that is least seen anyway |
| 6 | **The ring on release**: tap buttons on cards quickly and slowly, tick a task | the ring reads as the answer to the tap, also after a slow finger | it reads as a late echo, or is not noticed | quicker: `--wa-ring-time: .8s;` (part 2, "Ring"; today 1.1 s). Not wanted at all: `Wasser.start({ ringOn: '' })`. (It starts when the finger lifts on purpose: on touch-down it flashed whenever a scroll began on a button) |
| 7 | **The drops on Android** (every water picture is copied into 4 to 7 small canvases): scroll "Heute" and "Material", hold a button; in the console `Wasser.info.level` and `Wasser.info.ms` | level 0, a picture costs a few ms, the drops flow while the list scrolls | the level climbs to 2 and more, or the list stutters only where drops are in view | fewer live drops: `Wasser.start({ drops: '.btn--primary, .m-ico' })` (the others stay plain glass); or sharper limit `DPR_CAP = 2` in `wasser.js`, Teil 1 (a 3x phone draws like a 2x phone) |

Then, in any order: whether the glints read as light on water at arm's length; "klar" in daylight; the select and
the date picker on iOS; hit areas of the header drops and of the tabs with a thumb.
