# Wasser-Look, the template: notebook for whoever applies it

State 14.11. (packed 13.11.; the corrections after the two checkers of the package are in: section 9, "What changed on
14.11."; the DESKTOP template was added on 14.11.: section 11, and corrected after its checker the same day: 11.4,
"After the checker"). Written for a helper who has not seen the look being built. German names of the building blocks are
kept (they are the names the owner knows). Read `LIESMICH.md` first for what is where and how to look at it; the
owner's decisions are in `docs/wasser-look/entwurf/entscheidungen.md` and override everything here.

**The guide for applying the template and building it into the app is `docs/Wasser-Look.md` (German).** It was written
after this notebook, tested in scratch copies, and knows the owner's later decisions (7 to 11) and the state of the
integration; where the two disagree about the state or about HOW to build the look in (section 10 here), the guide is
right. This notebook stays the place for numbers, reasons and measurements.

The template is not built into the app. It was made from the approved look (`docs/wasser-look/entwurf/nachgebessert`,
a stylesheet and a script injected under `.m-shell`) by restructuring, plus the few corrections of 14.11.;
`scripts/wasser/vergleich.mjs` proves after every change that it still paints the same (section 9).

---

## 1. The template in one page

| | |
|---|---|
| Files | `kern.css` (the look), `mobil.css` (what only the mobile shell needs), `desktop.css` (what only the desktop shell needs), `wasser.js` (the script). Load order: the app's own stylesheets, then these three, then the script. |
| Switch | The attribute `data-wasser` on a root element: `data-wasser="mobil"` on `.m-shell`, `data-wasser="desktop"` on `.stage`. Every rule of `kern.css` starts with `[data-wasser]`, every rule of `mobil.css` with `[data-wasser="mobil"]`, every rule of `desktop.css` with `[data-wasser="desktop"]`. The script looks only inside the root (option `root`, default `[data-wasser]`). No attribute: the app as it is. |
| Tones | `dunkel` (default) = dark mode, `klar` (`<html data-wa-ton="klar">`) = light mode. One block of 57 tokens each in `kern.css`, part 1, same tokens in the same order (the last two, `--wa-weit-*`, are read by the desktop shell only). No other rule mentions `data-wa-ton`; the script has no tone logic. Text is light in BOTH tones. |
| Tokens | Every colour, radius, gradient, shadow, duration and easing is a `--wa-*` custom property on `[data-wasser]` (`kern.css` parts 1 to 3; the mobile shell's own in `mobil.css` part 1). One more name is read by the drops: `--water-under` (set by sheets). |
| Blocks | Each building block is ONE nested rule with ONE selector list (`kern.css` part 4). Apply a block by adding a selector to its list, or by giving an element the block's neutral class `.wa-...`. |
| Script | `Wasser.start(options)` / `Wasser.stop()`; `Wasser.MOBIL` = the default options (the mobile shell), `Wasser.DESKTOP` = the options of the desktop shell; `Wasser.info` = state of the drops. One global, one instance. |
| No motion | `prefers-reduced-motion: reduce`, or the app's switch `data-motion="reduziert"` on `<html>`: every block carries both rules itself, nested at its end; the script checks `still()` before every animation. |
| Without the script | The still look with plain glass buttons (no drops, no ring, no light helpers, the marker glides). Without WebGL: the same, but ring, marker, light and sleep work. |

Why the lists are in `kern.css` also for elements that exist only in the mobile shell (`.glass.m-card`, `.m-tabs`,
`.m-ico` ...): CSS cannot add to a selector list from another file. The alternative would be a second copy of every
block per shell. So: block definitions and ALL lists in `kern.css` (mobile entries are marked `mobil`), everything a
shell needs beyond the blocks in its own file. (`.m-ico` also stands in the two lines of "Tropfen" that say which
drops are round.) The desktop's elements are in the same lists, marked `desktop`.

**The weight of a list entry.** A list weighs as much as its heaviest entry, and the rules of the shells are written
against that weight. So: A NEW ENTRY IS NEVER HEAVIER THAN THE HEAVIEST ENTRY ALREADY IN ITS LIST (two classes in most
lists; one in "Etikett", "Etikett auf Wasser", "dichtes Wasser", "Markierung", "Bogen", "Feld", "Haken", "Pegel";
THREE in "Perle" alone - `.btn.btn--icon.btn--ghost`). What
it needs beyond that to be found goes inside `:where()`, which weighs nothing: `.panel .glass:where(.col)`,
`.chip:where(:not(.btn--icon))`, `:where(.topbar) .brand`, `.panel .item--click:where(.item)`.
A heavier entry changes the phone without a word (pitfall 1); `vergleich.mjs stile` shows it.
The other direction is as silent: A RULE OF A SHELL THAT IS LIGHTER THAN THE LIST LOSES, and no still shows it
(pitfall 55: the arrows beside the island). After writing a rule in `mobil.css` or `desktop.css` that changes what a
block has set, read the computed value once.

Dosage, as told to the owner: the more often something appears on a screen and the more text it carries, the less
water. Drops and the marker are the only glossy things; sheets are still; troughs carry the text.

---

## 2. Building blocks

"List" = the selector list of the block in `kern.css` (search for the block name). "Script" = the option of
`Wasser.start()` that must name the same elements.

| Block | Stufe | Neutral class | In the list today | Script | The element needs |
|---|---|---|---|---|---|
| **Tropfen** (drop button) | 3 | `.wa-tropfen`, round: `+ .wa-tropfen--rund` | `.btn:not(.btn--ghost)`; mobil `.m-ico`; desktop `.chip.btn--icon` | `drops` (and `ringFrom`) | nothing. Amber / red: classes `btn--primary` / `btn--danger` (options `primary`, `danger`). A sheet under it should set `--water-under`. |
| **Film** (ghost button) | 1 | - | `.btn.btn--ghost` | - | - |
| **Etikett** (pill) | 1 | `.wa-etikett` | `.pill`; desktop `.chip` (not the round ones): a glass bead free over the scene; flat on the sheets of the list "Etikett auf Wasser" (desktop: `.panel`, `.wchip`) | - | its own fill |
| **Becken** (sheet with depth) | 2 | `.wa-becken` | mobil `.glass.m-card`; desktop `.glass.panel` | `ringOn`, `light` | about 100 px and more in both directions (smaller: re-declare the depth tokens, as `desktop.css` does); its own padding; a position (it sets none: an absolutely placed element keeps its place - the shell gives `position: relative` where there is none) |
| **stilles Wasser** (plain sheet) | 2 | `.wa-wasser` | mobil `.glass.m-stat`; desktop `.glass.wchip` | (`light` if it should have the helper) | its own padding. Sets no position. |
| **dichtes Wasser** (content scrolls under it) | 2 | `.wa-wasser--dicht` | `.sheet`, `.toast`, `.cmd`; mobil `.m-tabs`; desktop `.dock` | - | its own border-radius and place |
| **Bogen** (bottom sheet; on the desktop a drawer) | 2 | `.wa-wasser--dicht.wa-bogen` | `.sheet` | `ringOn`, `light`, `modal`, `scrollers` | its place, `overflow: hidden`, padding; a scrim behind it (`.sheet-back`). Its shape is tokens (`--wa-r-bogen`, `--wa-bogen-rim`, `--wa-bogen-lift`, `--wa-bogen-fuss`, `--wa-kamm`), its entrance an `animation-name` |
| **Tropfen-Hinweis** (toast) | 2 | `.wa-wasser--dicht.wa-hinweis`, error `+ .wa-hinweis--fehler` | `.toast` (also in "dichtes Wasser" and "Lichtlauf") | `toasts` | position, padding |
| **Setzen** (a sheet arrives) | - | `.wa-setzt` | nothing (ready for a sheet without an entrance of its own) | - | several at once: `animation-delay` in steps of `--wa-t-step` |
| **Mulde** (trough) | 1 | `.wa-mulde`, tappable `.wa-mulde--tipp` | rows in sheets (`.sheet .item` ...); mobil `.m-card .m-row`, `.m-card .m-stat`; desktop: rows, hour tiles, slots, gallery cards, tab groups and nested boxes of a panel | - | lies on a sheet; its own padding |
| **Feld** | 1 | `.wa-feld`, a select `+ .wa-feld--auswahl` | `.input`, `.select`, `.textarea` | - | padding, font size 16 px |
| **Wahl** (one of several) | 1 | group `.wa-wahl`, chosen child `.on` | `.pills > .pill` (`pill--on`), `.seg > button`, `.tabs > button`, `.tile`, `.island-lib > button` | `groups`, `chosen` | padding per label |
| **Haken** (check) | 1 | `.wa-haken`, ticked `.on`, skipped `.wa-haken--aus` | `.check` (`check--on`, `check--skip`) | `ringFrom`, `tick`, `ticked` | width, height, `border-radius: 50%` |
| **Pegel** (progress) | 1 | `.wa-pegel > i`, amber `.wa-pegel--amber` | `.progress`; the form's `.steps` are a Pegel in pieces | `levels` | tube: height, radius, `overflow: hidden`; `<i>`: `display: block; height: 100%`, width in % inline |
| **Perle** (icon bead) | 1 | `.wa-perle` | `.btn.btn--icon.btn--ghost`; desktop `.glass.carousel-nav` | - | width and height (28 px and more; the desktop has some of 22 px, they hold). Its press is a `transform`: an element that is placed by a transform of its own must repeat it in its `:active` - in a rule with THREE classes, the weight of this list (the carousel arrows: `desktop.css` 5, pitfall 55) |
| **Perle mit Schrift** | 1 | - | buttons inside the ROWS `.item`; mobil `.m-row`; desktop: every plain button on a `.panel` | left out of `drops` and `ringFrom` | - |
| **Ring** (answer to a tap) | - | helper `.wa-floor > .wa-ring` (made by the script) | - | `ringOn`, `ringFrom` | the sheet: `position: relative; isolation: isolate` |
| **Markierung** (flowing marker) + **Atmen** | - | `.wa-markierung` | mobil `.m-tabs`; desktop `.dock` | `bar`, `tabOn` | EQUALLY wide children without a gap (a flex row of labels is not: the dock is a grid of `1fr` columns), the active one has class `on`; `--wa-bar-tabs: <n>` (up to nine); a position and `isolation: isolate` |
| **Wasserlinie** (keyboard focus) | - | - | two lists (wide gap for drops and pills, narrow for the rest) | - | - |
| **Licht**, **Bodenlicht**, **Zug**, **Schwappen** | - | helper `.wa-licht > .wa-boden` (made by the script) | - | `light`, `scrollers` | the sheet: a position and `isolation: isolate` |
| **Lichtlauf** | - | `.wa-lichtlauf` | `.toast`, `.cmd`; mobil `.m-tabs`, `.glass.m-stat`; desktop `.dock` | - | a position and `isolation: isolate`; its `::after` free |
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
own with a note (`/* desktop: the side panels */`). Keep the entry at the weight of the list - never heavier than
its heaviest entry, everything beyond that inside `:where()` (section 1, "The weight of a list entry"). If the block's comment names script
options, pass the same selector there (for the desktop: in `Wasser.DESKTOP`, `wasser.js`). Run `vergleich.mjs` (nothing
else may change), `pruefen.mjs` and, for the desktop, `desktop.mjs pruefen`.

**A class that both shells have, applied for one shell only** (the brand button of the header): scope it with a class
only that shell has, inside `:where()` - `:where(.topbar) .brand`. Without the scope the phone changes too.

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
`--wa-r-bogen` (four round corners), `--wa-bogen-rim`, `--wa-bogen-lift`, `--wa-bogen-fuss` (`0 0 0 0 transparent`
when it does not stand on the bottom edge) and `--wa-kamm` for that shell and give the element and its `::before`
another `animation-name` - `desktop.css`, part 6, is the worked example (a drawer from the right). Rows inside are
Mulde, fields Feld. On the phone the blur goes on the scrim (`--wa-scrim-blur`), never on the sheet; over a page that
never rests (the desktop stage) it is the other way round: no blur on the scrim, the sheet carries its own. Add it (or its scrim) to the
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
Wasser.start(Wasser.DESKTOP);                     // the desktop shell
Wasser.start({ sleep: 0, webgl: false });         // any option replaces its default
Wasser.stop();                                    // leaves no helper, attribute, listener, timer or WebGL context behind
```

In the React app later: `src/wasser/wasser.ts` imports the three stylesheets and the script (side effect: the
global) and exports a hook that calls `window.Wasser.start(options)` in a `useEffect` and `window.Wasser.stop()` in
its clean-up; `Mobile()` uses the hook and its root gets `data-wasser="mobil"`. Start it when the root is in the
document (an effect is). The whole file and the lines that use it are printed in `docs/Wasser-Look.md`, section 8.2
(in that one place only). The script must NOT lie beside `wasser.ts` under
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

`Wasser.DESKTOP` is `Wasser.MOBIL` with eight options replaced (the list is in `wasser.js`, right under `MOBIL`):

| Option | Desktop | Why |
|---|---|---|
| `scene` | `.land img` | the landscape (during the 2.5 s crossfade of two landscapes two images match: the last, the new one, is taken) |
| `shade` | `''` | the stage is not darkened |
| `drops` | `.btn:not(.btn--ghost):not(.item .btn):not(.panel .btn:not(.btn--primary)), .topbar .chip.btn--icon, .wa-tropfen` | free over the stage and in sheets every button that is no ghost; on a panel only the primary one; the three round buttons of the top bar |
| `ringOn` | `.glass.panel, .wa-becken, .sheet` | |
| `ringFrom` | `.btn:not(.btn--ghost):not(.sheet__body .btn):not(.item .btn), .wa-tropfen, .panel .check, .wa-becken .wa-haken` | also the plain glass buttons of a panel send a ring |
| `bar` | `.dock, .wa-markierung` | |
| `light` | `.glass.panel, .wa-becken, .sheet, .wa-bogen` | |
| `scrollers` | `.panel__body, .sheet__body` | |

A moving MOUSE counts as a touch for the water's clock (looked at once a second at most; on a phone nothing changes: a
finger always begins with `pointerdown`).

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
touch, scroll, key or a moving mouse the drops come to rest and the root gets `data-wa-ruht`; the next touch removes it. CSS follows:
`--wa-lauf` is `running`, `paused` on `[data-wasser][data-wa-ruht]`, and paused for the page behind an open sheet
(`mobil.css`, 7; `desktop.css`, 7). Never paused: answers to a change of state (a toast must be able to land while the water sleeps).
The clock also runs without WebGL. A hidden page: the browser stops drawing; `visibilitychange` wakes.

**The governor of the drops** (Teil 1, `LEVELS`): pictures that keep eating more than 80 % of their time slot for
3 s step the drops down (60 -> 30 -> 15 pictures a second while touched, then fewer pixels, at last a still drop);
20 s of easy pictures step up again; a try that fails within 30 s doubles the wait (5 min at most); a level reached
by a climb that has held for the wait sets it back to 20 s (before 14.11. one failed try slowed every later climb
until reload). `Wasser.info.level` and `.wait` show it; `node scripts/wasser/pruefen.mjs --regler` walks through all
of it in three minutes with pretended picture costs (start option `debug.cost`). The waits count the time of drawn
pictures, at most 0.1 s each: at 12 pictures a second 20 s take about 25 s by the clock.

**The scene inside the drops** (Teil 1, "landscape texture"; rebuilt 14.11. evening, finding
`docs/wasser-look/entwurf/reiterwechsel/BEFUND.md`). Until then every change of tab drew the new scene image
synchronously onto a 2048 x 1024 canvas, uploaded it and built its mipmaps - in the frame of the change, also for a scene
seen before. Now:
- **A store of scene textures**, by image address (`store`, at most `KEEP` = 6, the one used longest ago goes first,
  never the one shown). A second visit is a bind: no decode, no upload. Memory: 2048 x 1024 RGB with mipmaps is 8.4 MB,
  11.2 MB where the GPU keeps RGB as RGBA (likely on an iPhone): at most about 67 MB for six. Five tabs and one more
  (a project's inner world, or Wetter / Archiv) fit; a ninth scene costs a decode and an upload again.
- **Made away from the beat of the change** (`make()`): the bytes from the HTTP cache (`fetch`, `cache: 'force-cache'`)
  and `createImageBitmap(blob)` - the decode runs on another thread in Chromium and in WebKit (measured: the page's
  thread is free while it decodes). `createImageBitmap(img)` decodes on the page's thread in Chromium (14 ms, 4 x
  throttled 60 ms), and `img.decode()` does not help a canvas there (the canvas decodes again): both measured. Fallback
  where fetch or `createImageBitmap` is missing or fails: `img.decode()`, then the image itself.
- **Scaled exactly as before, in four strips** (`STRIPS`, one after each frame: `later()` = rAF + setTimeout 0): a canvas
  of one strip's height gets the whole picture drawn moved up, `texSubImage2D` puts it into a new texture, mipmaps after
  the last one. Texels identical to the old one-piece upload (checked in Chromium for webp and avif; WebKit: webp
  identical, the avif landscape 1/255 on 0.5 % of the texels). `createImageBitmap` with `resizeWidth` was NOT taken: it
  scales differently (mean 0.45/255, up to 11/255) and the drops would no longer be pixel-identical.
- **Until the new picture is ready the drops keep the old scene**; a scene that is being made for a page the user has
  left is given up (`want`), so ten quick taps end with the scene of the last tab. A scene in the store is shown at once,
  even before the page's new `<img>` has loaded (its `src` serves as the key until `currentSrc` is known).
- **`Wasser.warm(imgs)`**: images the page will show later (the app hands in the scenes of the other tabs, loaded with
  the same `srcset` and `sizes` in a quiet moment after the start: `usePreloadScenes` in `src/mobile/Mobile.tsx`). They
  are made one at a time while nothing else is being made and the page's own scene is ready, and fill the store up to
  `KEEP - 1`. Measured worth it: without it the first visit of a tab showed the old scene in the header drops for
  0.1 to 0.6 s on this machine (the guide's step 8 lists exactly that under "must not happen").
- **The texture size stays 2048 x 1024**: 1024 x 512 (and 1024 x 1024) were compared at 3x - the gear drop of
  "Projekte" over leaves is visibly softer when enlarged (up to 27/255 on 0.5 % of its pixels); the drops over sky
  differ by 1/255. Pictures and numbers: the finding.
- **The WebKit guard** (an image whose `load` fired before it can be drawn gives an empty picture) is kept only on the
  fallback path (the image itself): its middle sampled into one pixel, looked at again after the next frame, at most 30
  times (`Wasser.info.blank`). A bitmap decoded from the bytes cannot be empty.
- Lost context: the store is emptied with it and the current scene made again on restore. `stop()`: every texture,
  the scene being made (bitmap closed, canvas set to 0 x 0, frame and timer cancelled), the image's load listener and
  the `warm` queue go.
- `Wasser.info`: `scene` (address shown), `scenes` (kept), `uploads`, `reused`, `warmed`.

**The first frame of a new screen** (tab, world, a sheet: `scan()` found new drops) goes out without the drops' work;
their first water picture follows in the next frame. The new buttons show their plain glass for that one frame - they
arrive inside cards, panels and sheets that enter from opacity 0, so it is not seen. With reduced motion (no entrance)
they are drawn at once, as before. On this machine the drops' picture is the expensive part (WebGL in software): this
alone brought the new screen 60 to 80 ms earlier.

**Behind a sheet** (`modal`; finding `docs/wasser-look/entwurf/stehenbleiben/BEFUND.md`). A drop that goes behind an
open sheet finishes its answer first: the press springs back, a running ring fades within `RING_OUT` (300 ms), and at
`SETTLE` (380 ms) at the latest the drop is set to its rest pose and drawn one last time - then it is `quiet`, not drawn
any more, and costs nothing. Until 14.11. it was reset but never drawn again, so its canvas kept the picture of the
moment: for the drop that opened the sheet always one in the middle of its answer (rings and all). Its water time stands
still with it (`lag`): when the sheet goes, it goes on from its last picture instead of jumping to the page's water time.
A pointer that reaches a resting drop beside a drawer (desktop) wakes it for its answer. `Wasser.info.resting` and
`.settling` count them. The CSS side needed nothing: `--wa-lauf: paused` ("Ruhe hinter einem Bogen") holds only the
loops at rest; the one-time answers (ring on the floor, `:active` of plain glass and rows, the bead's flight - Web
Animations - and the Schwappen transitions) never read it.

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
- **Desktop shell** (`desktop.css` part 1): the app's text colours, the panels (`--wa-r-panel-1..3`,
  `--wa-panel-shelf`, `-deep` and their softness: the depth of a shallow basin; `--wa-panel-ruhe`: the rim light at
  rest), free labels (`--wa-frei`, `--wa-frei-ink-2`, `--wa-frei-feld`, `--wa-r-chip`), the dock (`--wa-r-dock`,
  `--wa-r-tab`, `--wa-tab-lens`), the drawer (the Bogen tokens re-declared, `--wa-bogen-zug`, `--wa-scrim`,
  `--wa-scrim-blur: none`), the pointer (`--wa-zeiger`, `--wa-zeiger-film`, `--wa-zeiger-licht`, `--wa-haken-hit`).
- **The two tone tokens of a wide stage** (`kern.css` part 1, last two of each tone; read by `desktop.css` only):
  `--wa-weit-tiefe` (how much of a basin's depth is left where the painted scene is the star: dunkel .7, klar 1) and
  `--wa-weit-grund` (what a sheet does to the scene seen THROUGH it, a filter function added to its blur: dunkel
  `brightness(.88)`, klar `brightness(.7)`). The second one is the desktop's stand-in for the page's darkening
  (`--wa-page-*`): without it light text has no ground by day in the tone "klar". Turn them with
  `node scripts/wasser/desktop.mjs kontrast` open: lighter water costs contrast at once (numbers in section 11).

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

On the desktop the same table holds, with these differences: a side panel has ONE rim light at 60 % that becomes full
under the pointer, only the one large panel of a world has the far light and the floor light; the dock is the bar (its
bead flows 0.46 s plus 70 ms per further world, at most three); the sheet is a drawer that flows in from the right
(0.62 s) with its crest along its left edge; under a resting mouse clickable things light up and a live drop gives
way a breath; the ring answers a click on any non-ghost button of a panel. The stage itself (leaves, clouds, floating
islands, parallax) is the app's and untouched.

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
   and Firefox today; the look does.) The other side of it: an element that carries `.glass` in the app and is put
   into a block that sets no backdrop-filter of its own (Mulde, Perle, Etikett) keeps the app's 18 px blur in WebKit,
   and Chromium shows nothing of it, not even in the computed style (Playwright's WebKit does: `stelle.mjs --engine
   webkit` reads `blur(18px) saturate(1.4)` on such an element, `none` once the shell has taken it away; it paints
   none). The shell takes it away (`desktop.css` does for `.panel .glass:where(.col)`); "Perle" also leaves the border of `.glass` standing. Found on 14.11. when the round
   header buttons were moved from "Tropfen" to "Perle" in a copy (guide, 4.8).

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
26. **Anything that hides a drop without unmounting it must let its answer END - and draw that end.** Resetting the
    press without drawing again froze the drop in the middle of its answer behind every sheet (live from 14.11. 13:09
    to the evening). Done for `modal` (render: ring out, rest pose, one last picture, then quiet); remember it for any new
    way of covering the page.
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
    `evaluate(el => el.click())`. Changing the workspace then needs the button "Zu ... wechseln" and reloads the
    page; an init script that sets the workspace on every load undoes the change. The tools switch with
    `h.bereich('echt')` (the storage key, then a reload).
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

Desktop, found on 14.11.
47. **An ancestor whose opacity is ANIMATED is a backdrop root for good when the animation has `fill-mode: both`.**
    The search panel lies inside its scrim, the scrim fades in with `both`: the panel's own `backdrop-filter` saw
    nothing behind the scrim (sharp words of the page between the hits, in "klar"). `desktop.css` takes the scrim's
    animation away. A drawer is a SIBLING of its scrim: no such problem.
48. **The app styles some places inline, and an inline style beats every rule.** Small selects carry
    `padding: 3px 6px` inline (11 places, also in sheets): the room the block "Feld" keeps for its arrow is gone and
    the arrow lies on the text. `desktop.css` gives it back with `!important` (part 5). The same root cause is in the
    sheets of the PHONE (drying profile, status selects) and was left there to keep its pictures identical - see
    "Open". Also inline: the blue line of the current version (`border: 1px solid #7cc6ff`), the place of the large
    panel (`bottom: 10.5%`, used to find it).
49. **A row of labels in a flex box is not a row of equal children.** The dock's "3D-Druck" was 5 px wider than its
    neighbours, the marker stood 1.75 px off; with `flex: 1 1 0` the label wrapped. The dock is a grid of `1fr`
    columns now (every column as wide as the longest label needs).
50. **A class of both shells in a list changes both shells.** `.brand` in the Wasserlinie list turned the phone's
    brand focus ring white (found by `vergleich.mjs stile`, pressed / focused). Scoped: `:where(.topbar) .brand`.
51. **On the desktop pausing the lights saves nothing** (measured: 144 against 148 ms per picture): the stage itself
    never rests, every blurred sheet is blurred again for every picture anyway. What costs is the blur (about half of
    the look's extra work) and the drops (about a tenth).
52. **The stage can be scrolled by 40 px** (the landscape is drawn 4 % larger; `overflow: hidden` still scrolls by
    script). Playwright scrolls what it clicks "into view": after a click everything may stand 40 px to the left in a
    screenshot. No person can do that; `desktop-lib.mjs` puts the stage back before every picture (`still()`).
53. **The app's theme must be "dunkel" wherever the look is on.** By day the app switches to its light theme (dark
    text, 17 rules `:root[data-theme="hell"] ...`); `desktop.css` re-declares the text colours on its root, but the
    light pills, rows and buttons of those rules would stay. The preview tools hold the theme (`einspielen.js`).
54. **A filmstrip of the desktop:** pause only the animations of the interface (`.ui`), not the stage's own - the
    islands' flight and the leaves are the app's, and the drops must follow them (`desktop.mjs film`, `grab()`).

Desktop, found by its checker on 14.11.
55. **A shell's rule that is lighter than a block's list loses without a word - and it can take a click with it.**
    The rule for the arrows beside the island was written with two classes (`.glass.carousel-nav`), the list of
    "Perle" weighs three. Nothing of the rule arrived: no smoke glass, and the block's own press (`transform:
    scale(.92)`) replaced the app's centring (`translateY(-50%)`) - the pressed arrow hopped 23 px down, out from
    under the pointer, and a click on its centre or upper half was lost. Stills and the first 22 checks were green.
    Cure: one more class of weight (`.glass.carousel-nav.carousel-nav`). Habit: read the computed value of a new shell
    rule once, and press what can be pressed; `desktop.mjs pruefen` now forces every clickable element into `:active`
    and holds a real pointer on the arrow.
56. **Compare an element with ITSELF, not the n-th with the n-th.** The app re-creates elements while one looks (in
    the inner world of a project 8 of 57 clickable elements were new within a second): a scan that compares two lists
    by their order reports shifts of 80 to 900 px that are a neighbour's place. Keep the elements (`isConnected`).
57. **A loop of the APP on a sheet does not sleep with the water** - and it may move by a layout property. The running
    line of a print (`.flow > i`) ran on at 2.2 s a lap while everything else slept, moved by `left`, in the app's
    blue. A loop the look takes over gets `animation-play-state: var(--wa-lauf)`, keyframes of `transform` and the
    "no motion" rule (the app's own switch stops only `data-motion="reduziert"`, not the system setting).
58. **React writes an inline colour into the attribute as `rgb(124, 198, 255)`**, whatever the source says (`#7cc6ff`,
    `rgba(124,198,255,.2)`): an attribute selector that has to find it spells it that way, with the spaces.

Tab change, scene textures, measuring (14.11. evening)
59. **Playwright switches the browser's HTTP cache off while a route is set** (`page.route`, also the made-up weather).
    A measurement of loading then fetches every image anew - the script's `fetch(..., { cache: 'force-cache' })` went to
    the network a second time. `reiter.mjs` sets no route (the weather service is made unreachable by a resolver rule).
60. **vite preview sends `no-cache` for images; the live server `immutable`** (`server/index.js`). Under preview every new
    `<img>` of a scene asks the server again (a round trip, `currentSrc` empty until then). Measure loading against a
    folder served with the live headers (`reiter.mjs --app name=<dist folder>`).
61. **`createImageBitmap(img)` decodes on the page's thread in Chromium**, and `img.decode()` does not help a canvas
    there. Off the thread: `createImageBitmap(blob)`. With `resizeWidth` it also scales - differently from a canvas.
62. **Two function declarations of one name in one scope: the later one wins without a word.** Teil 1 has `next()` for
    the frame loop; a second `next()` for the scene silently replaced it during this rebuild (now `onward()`).
63. **On this machine a drop's picture is a long task** (WebGL in software: copying the water into the drop canvases
    waits for the shading, 60 to 150 ms per picture with five drops). A tap that lands in one waits for it. Compare the
    app against itself with the script stopped (`reiter.mjs --gestoppt`), never against a phone.

---

## 8. Tools (`scripts/wasser/`, run from the repository root)

| Tool | What it does |
|---|---|
| `mobil.html` | the harness page: a mock of the mobile screen with the real app stylesheets, the template on top. Since 14.11. it begins with the card of the day like the app's start tab and is therefore longer than a phone (the second card is reached by scrolling). `?ton=klar`, `?scene=...`, `?nah=1`, `?alles=1`, `?fallback=1`, `?ohne=1`, `?alt=<folder>`, `?vorlage=<folder>`, `?schlaf=<ms>` |
| `lib.mjs` | shared: `session({ engine })` -> `harness(options)`, `app(options)` (the REAL app at phone size; `go`, `sheet`, `closeSheet`, `project`, `bereich`, `shot`), WHICH LOOK a page shows (`lookBefore` / `lookAfter`: built in, injected, replaced, none - section 14), the tone through the app's own setting (`setTheme`), made-up weather, a file server for the repository or a built app, `diff` (with the box around what differs), `strip`, `stack`, the screencast recorder `cast` / `encodeCast`, and the command line (`args`: an unknown option ends the tool) |
| `sollist.mjs [handy\|desktop\|alles] --soll <state>` | SOLL GEGEN IST: two states of the APP (`git:<rev>`, `baum` = the working tree built now, an address, a folder with a built app), the same 164 screens pixel by pixel - phone and desktop in both formats, both tones, both workspaces, reduced motion, clock and weather standing still. Lists the screens that differ, with the box of the difference and a picture Soll / Ist / difference. `--erwartet <name parts>`: screens meant to differ. Builds a commit itself (cache: `<tmp>/wasser-sollist-staende`) |
| `vergleich.mjs [bilder\|app\|stile\|film\|alles]` | TWO LOOKS in one app (in the real app each takes the place of the built-in look). Default: template against the approved look: pixels (inside / outside the drops), computed styles incl. pressed and focused, motion at fixed times. Exit code 1 on a difference that is not on its list of deliberate ones (`KNOWN`). `--alt git:HEAD` or `--alt <a copy of the template folder>`: against the template as it was before YOUR change |
| `pruefen.mjs [--app] [--regler]` | checks (harness: the template; `--app`: the look the app has built in; fails when the copies in `src/wasser` are not the template): start, marker, ring, every block by class alone, sleep, reduced motion, stop / start / options, no WebGL, the real app (with: the drop that opened a sheet comes to rest behind it - with reduced motion its very picture at rest - and lives again after it), pull and arrival of the light, the bounds of `--wa-leben`, the token lists of the two tones; `--regler`: the governor of the drops (three minutes) |
| `reiter.mjs handy\|desktop\|landschaft\|profil` | THE CHANGE OF SCREEN in numbers: a tab (phone), a world (desktop, both formats), a new landscape (desktop): ms until the new screen has gone out, the longest task, the scene work in one task, long tasks that are mostly scene work, the drops' copying before the new screen, ms until the drops show the new scene. `--app vorher=<url or dist folder>,nachher=...` side by side, `--drossel 1,4`, `--laeufe 3`, `--ohne` (look taken out), `--gestoppt` (script stopped: the CSS alone), `--netz langsam`; `profil`: CPU profile with readable names. A folder is served with the live server's cache headers |
| `bogen.mjs [handy\|desktop]` | BEHIND A SHEET: a live drop, plain glass, a row and the search open a sheet with a real pointer; pictures and the drop's own canvas 60 to 2500 ms after: it stands from 600 ms on, nothing behind the sheet still answers, with reduced motion it is the picture of the same drop at rest (sheet opened without a touch), it lives again after closing and does not jump. `--app` two apps, `--bild` strips |
| `bild.mjs <out> [szenen\|nah\|alles\|app]` | stills, both tones, contact sheets; `--zeit tag\|nacht\|<ISO>`: the app's clock stands still (repeatable) |
| `film.mjs <out>` | filmstrips from the real app: ruhe, tab, druck, scroll, bogen, haken (`--reduced`, `--fest`) |
| `clip.mjs <out.mp4> [--cast]` | a recording of the real app (or `--seite mobil`). `--cast`: through the browser's screencast - use it whenever soft light is to be judged (pitfall 42) |
| `leben.mjs <out> [--werte 1,1.5]` | how much life? The same walk through the real app once per value of `--wa-leben`, side by side as labelled phones: `<out>.mp4` and a filmstrip `<out>.png` |
| `kontrast.mjs [--app]` | WCAG contrast of the texts - and of the labels on drops - against the pixels really behind the glyphs. ONE element of your own without editing the tool: `--css '<selector>' [--welt] [--bogen] [--klick] [--art text\|platzhalter\|wert] [--grenze 4.5] [--desktop]` |
| `messen.mjs ruhe\|takt` | alive but calm (pixels that change at rest, glyph pixels); frames a second coupled to the compositor (`--css '<rules>' --mal 3`: what does a change buy?) |
| `keyframes.mjs` | prints the keyframes of the loops at rest |
| `desktop.mjs zeigen` | THE BUILT APP IN YOUR OWN BROWSER: a small server with `dist/` - `http://localhost:4320`. Wide window = desktop, narrow = phone. Without `--look`: the app as it is built; `--look vorlage\|<folder>`: that copy of the template in the place of the built-in look (a change in the folder shows after a reload). `?ton=klar`, `?ton=dunkel` (sets the app's own setting), `?ohne=1` (the app without the look), `?weich=aus` (no blur), `?leben=1.5` |
| `desktop.mjs bild <out>` | stills of the real app at desktop size: the eight worlds; `--alles`: sheets, forms, search, keyboard focus, toast, the empty workspace. `--format 2000\|1920`, `--zeit nacht\|tag\|morgen\|abend`, `--ton klar`, `--look ohne` (the app with its look taken out) |
| `desktop.mjs film <out>` | filmstrips: ruhe, dock, druck (press and ring), zeiger (hover), zeiger-panel, bogen (the drawer), pfeil (the arrow beside the island held down, a line marks its centre at rest), fluss (the running line of a print at fixed times) |
| `desktop.mjs kontrast` | WCAG contrast of 50 kinds of text on the desktop, both tones, by night and by day |
| `desktop.mjs pruefen` | 27 checks: live drops per world (3 to 12, none free over an island), nothing leaves its place while pressed (about 300 clickable elements forced into `:active`; Chromium only), the arrows beside the island under a real pointer, the marker, the drawer, the search, the toast, keyboard focus, sleep and waking by the mouse, reduced motion, stop / start, the drop that opened a drawer comes to rest behind it and lives again (with reduced motion: its very picture at rest), and "nothing has moved" against the same app with its look taken out |
| `desktop.mjs takt` | what the look costs: pictures a second and work per picture - the app without the look, with it, with it but without lights / drops / blur |
| `desktop.mjs clip <out.mp4>` | a tour through the real app as a film (screencast, a drawn pointer) |
| `desktop-lib.mjs` | `openDesktop({ look, format, ton, zeit, uhr, wetter, engine, reduced, start, app })`: the real app at 2000 x 993 or 1920 x 1080 with a fixed hour (`uhr: 'steht'`: the clock does not run on) and made-up weather, with the look it has built in or another one in its place; `go`, `welt`, `project`, `sheet`, `search`, `toast`, `bereich`, `shot`, `park`, `still` |
| `einspielen.js` | the browser script for a shell WITHOUT a built-in look (an older state of the app): root attribute for whichever shell is mounted, `Wasser.start()` with its options, the app's theme held at "dunkel", the tone from what the app wanted. In a shell that already carries `data-wasser` it does nothing |
| `stelle.mjs <out.png>` | ONE spot of the real app (with its built-in look, or `--look <folder>` in its place), looked at and read (desktop, or `--mobil`): `--welt`, `--bogen`, `--klick '<text>'`, then one picture and, for `--css '<selector>'`, how many elements it matches, in which shell, and the computed values a block sets (background, border, shadow, backdrop-filter, radius, padding, position, colour, live drop). For a sheet the other tools do not know and for whoever has no browser window |
| `uebernehmen.mjs` | fetches the template into the app: copies the four files to `src/wasser/` (the script as `wasser-skript.js`), each with one head line. Then `npm run build`: the tools measure the built-in look |

All take `--engine chromium|webkit` (the screencast tools: Chromium only), most `--ton klar` or `--toene dunkel,klar`,
and all but `keyframes.mjs` and `uebernehmen.mjs` take `--look`: nothing or `auto` = the look the app has BUILT IN (a
shell without one gets the template injected), `eingebaut` = the app exactly as built, `vorlage` / a folder /
`git:<rev>` = that copy of the template (in the app IN PLACE OF the built-in look), `ohne` = no look (a built-in one is
taken out). `vergleich.mjs` calls its two looks `--alt` and `--neu`. Every tool prints which look it took.
An option a tool does not know, a missing value, a value that is not allowed and a folder that does not exist END the
tool with a message (exit code 2). Until 14.11. such an option was ignored without a word.
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
8. The desktop step (14.11.; section 11) - for the phone nothing to see and nothing to measure (numbers in 11.4):
   a card's `position: relative` moved from the block "Becken" to `mobil.css` (a basin no longer sets a position);
   "Etikett" became a list with the neutral class `.wa-etikett`; the water below a bottom sheet's foot is the token
   `--wa-bogen-fuss`; the marker places up to nine children; two more tone tokens (`--wa-weit-*`, read by the desktop
   only); the lists carry the desktop's entries; `Wasser.DESKTOP`; a moving MOUSE wakes the water, and a live drop
   gives way a breath under a resting mouse (`HOVER` - a finger never hovers).
9. After the checker of the desktop template (14.11.; section 11.4, "After the checker") - rules in `desktop.css`
   only, two comments in `kern.css`, two more checks in `desktop.mjs pruefen`: the arrows' rule outweighs the list of
   "Perle" (pitfall 55); the running line of a print and four kinds of icons lost the app's blue (pitfalls 57, 58).
   For the phone nothing to see and nothing to measure (numbers in 11.4).

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
| `stile` against the approved look, Chromium | 72 comparisons, 17,792 styles: 0 differ beyond the list; 478 differ only as listed (the faster transitions of the package, and of 14.11.: the animation lists of the lights, and `--wa-schwappt-oben` on the helper of a bottom sheet - 84 styles on 28 screens with a sheet open). Pressed and focused, 1,132 elements: 0 differ. (The three inherited tokens `--wa-zug-weit`, `--wa-zug-boden`, `--wa-drop-veil` are left out of this comparison: every element would differ in them) |
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

**After a newcomer's test of the guide (14.11., midday).** A developer who knew nothing of the project followed
`docs/Wasser-Look.md` and got stuck in 19 places; the guide's section 11 lists what was changed for each. In the
template itself only the head comment of `wasser.js` changed (the React recipe there was out of date and now points
to the guide). In the tools: `pruefen.mjs`, `vergleich.mjs` and `desktop.mjs zeigen` take `--look <folder>`
(`pruefen.mjs --app --look` had silently checked the template instead of the copy); `desktop.mjs pruefen` stops the
app's own bobbing hint before it presses (the guide's step 5 c); `stelle.mjs` is new; `uebernehmen.mjs` is on this
branch too, byte for byte the one on `main`. Checked afterwards, Chromium: `vergleich.mjs bilder --alt git:a81ee77`
(the commit before) - 32 picture pairs, no pixel differs, inside or outside the drops; `pruefen.mjs --app` 60 of 60;
`desktop.mjs pruefen` 24 of 24; the worlds "Heute" (dunkel, night, 2000 x 993) and "Wetter" (klar, day, 1920 x 1080)
looked at.

---

## 10. Building it into the app (not done; the owner decides when)

> Superseded as a to-do list by `docs/Wasser-Look.md`, section 8 ("Fahrplan"). State 14.11., afternoon: the look IS
> built into both shells (phone `c7e8299`, desktop `a24ce60` .. `5132a10`), on `main` and live. What is different from
> the points below: (1) the copies are fetched by `node scripts/wasser/uebernehmen.mjs` (they carry one head line more
> than the template); (2) the hook is called in `Mobile()` and - with a second argument "the stage is mounted" - in
> `App()`, which returns `<Mobile />` early on a phone and so cannot call a hook conditionally; it is called AFTER the
> effect that sets `--ui-scale` (started before it, the drops are measured at the wrong scale); the three places that
> were styled inline carry classes and `desktop.css` names them (the bridge `src/wasser/einbau.css` is gone); the
> inline paddings of the small selects STAY (point 2 said "11 places": it is ten, with five different paddings, and
> dropping them changes sizes in both shells - guide, step 6); (5) two states of the built app ARE compared pixel by
> pixel: `scripts/wasser/sollist.mjs`; (6) `scripts/verify.mjs` runs unchanged against builds with the look; (7) all
> tools measure the built-in look by default (section 14). The three safeguards of the guide's step 5 are in:
> `wasser.ts` imports the app's own stylesheets first, the tools set the tone through the app's setting, and
> `desktop.mjs pruefen` holds the app's bobbing hint.

1. Copy the four files to `src/wasser/` (the script as `wasser-skript.js`), add `wasser.ts` (head of `wasser.js`).
   Import order: after `mobile.css` and `global.css`. Tried in a scratch project with the app's Vite 8 and target
   es2022: the build lowers the nesting (no `&` left), keeps both `backdrop-filter` properties, CSS 50 KB (10 KB
   gzip), script 38 KB (15 KB gzip); tokens, blocks, `start()` and `stop()` work in the built page.
2. `Mobile()`: root `<div className="m-shell" data-wasser="mobil">`, the hook once.
   Desktop: `Stage` (`src/scene/Stage.tsx`): root `<div className="stage" data-wasser="desktop" ...>`, and the hook with
   the desktop's options in `App()` beside the stage: `useWasser(window.Wasser.DESKTOP)`. One instance at a time: when
   the window crosses 900 px React swaps the two shells, the clean-up of one hook stops the look, the other starts it
   (`scripts/wasser/einspielen.js` does the same by hand for the preview - read it, it is 40 lines).
   Then take the five inline styles away that `desktop.css` has to fight (each rule there says so): give the large
   panel of druck, material, wetter and archiv a class (`<Panel className="panel--haupt">`) and name it in
   `desktop.css` part 2 instead of `[style*="bottom:"]`; mark the current version with a class instead of the inline
   blue border (`ProjektInnen.tsx`); drop the inline paddings of the small selects (11 places); take the inline blue
   off the icon of a plain note (`Wetter.tsx`, `IInfo`) and off the tile of the "next task" row (`Projekte.tsx`) -
   then the two `!important` rules of `desktop.css` part 2 go, or shrink to a class.
3. Tone: `src/App.tsx` sets `document.documentElement.dataset.theme` today and forces "dunkel" on mobile (on the
   desktop it follows the setting - by day the old light theme with DARK text: that must go). Keep the
   app's theme at "dunkel" wherever the look is on (the look has light text in both tones; the app's
   `[data-theme="hell"]` rules are NOT the light mode of the look) and set `data-wa-ton` from `settings.theme`:
   Dunkel -> no attribute, Hell -> `klar`, Automatisch -> by `DARK_LOOKS` (`src/scene/looks.ts`). A live switch
   works (checked: free and card drops follow within a second).
4. CSP of the Node server: nothing new. The look uses two `data:` images (allowed by `img-src data:`) and WebGL; no
   foreign address.
5. After the build grep the CSS for both `backdrop-filter` properties (pitfall 8), then `vergleich.mjs` against the
   built app is not possible as such - use `bild.mjs app --look ohne` on the new build and compare by eye with
   `docs/wasser-look/bilder/mobil`, and run `pruefen.mjs`-like checks by hand.
6. `scripts/verify.mjs` was never run against a build with the look. Known to matter: a card (and a desktop panel)
   has one more child (`<i class="wa-licht">`), every drop button has a `<canvas>` as first child, a removed toast
   leaves a copy for 0.26 s, the ring appears on release, the dock is a grid and 21 px wider.
7. After building it in: `node scripts/wasser/desktop.mjs pruefen` needs one change - it injects the template; point
   it at the built app without injecting (`--look ohne` opens the app as it is).
8. One thing in the APP'S LAYOUT to settle on the way (it is there today, the look only shows it differently): in the
   world "Wetter" at 2000 x 993 - the owner's screen - the weather sign "Luftdruck" stands on the label of the small
   island in the fifth slot of the ring ("Archiv": label 1184..1222 x 118..136, sign 1136..1232 x 111..189; at
   1920 x 1080 the label ends 23 px above the sign). Cause: the signs are placed by the stage's WIDTH in both
   directions (`chip(6.8, -19.3, ...)` = `top: calc(50% - 19.3cqw)`, `src/worlds/Wetter.tsx`), the small islands by
   width and HEIGHT (`HIGH_RING`, `[61.5, 9, 8]`, `src/scene/worldLayouts.ts`): on a screen of 2:1 the sign stands
   48 px higher against that label than at 1920 x 1080. Today the label shows through the app's thin glass and
   collides with the sign's icon; under the look's water it is gone. A sheet of water cannot cure a place: the sign
   or the island needs another place in the app, or "Wetter" a ring of its own (right beside the island the date line
   of the clock begins). Nothing was tried - the app is not changed now. Section 12 keeps it as open.

---

## 11. Desktop: the second template (applied on 14.11.; not built into the app)

The desktop shell is the stage (`.stage`, `data-wasser="desktop"`): a painted landscape, islands in front of it, glass
panels around them, a top bar, a dock. The template was APPLIED to it, not designed again: selectors in the lists of
`kern.css`, what the shell needs on top in `desktop.css` (10 parts, about 270 lines), eight options in `Wasser.DESKTOP`.
How to look at it: `LIESMICH.md` ("Die Desktop-Vorlage ansehen") - `node scripts/wasser/desktop.mjs zeigen`.

### 11.1 What got what

| Desktop element | Block (Stufe) | How it was applied |
|---|---|---|
| every panel `.glass.panel` (4 to 9 per world) | Becken (2), shallow | list of "Becken" + options `ringOn`, `light`; `desktop.css` 2: padding, three outlines, smaller depth steps, the depth thinned by `--wa-weit-tiefe`, the scene dimmed THROUGH the sheet by `--wa-weit-grund`, one rim light at part strength |
| the one large panel of a world, the first-project card | Becken, full | `desktop.css` 2: the phone's depth steps, both rim lights at full strength, the light on its floor. Found by its inline `bottom:` until the app gives it a class |
| dock `.dock`, its seven buttons | dichtes Wasser, Markierung, Lichtlauf | three lists + option `bar`; `desktop.css` 4: `--wa-bar-tabs: 7`, a grid of equal columns, labels, press |
| round buttons of the top bar `.chip.btn--icon` | Tropfen (3), live | list (and the round lines) + option `drops` |
| text chips of the top bar, chips under the island | Etikett (1) | list; `desktop.css` 3: smoke glass `--wa-frei`, no blur |
| buttons free over the stage (hero row of "Projekte", title row of the inner world, "Öffnen" under the islands of "Start") | Tropfen (3), live | nothing to do: `.btn:not(.btn--ghost)` was in the list; option `drops` |
| primary button on a panel | Tropfen (3), live: shows the panel's water | nothing in CSS; option `drops` keeps it |
| every other plain button on a panel | plain glass ("Perle mit Schrift", 1) | `.panel` in the list of rows; option `drops` leaves them out |
| ghost buttons, ghost icon buttons | Film, Perle (1) | shared lists, nothing to do; hover in `desktop.css` 9 |
| arrows beside the island `.glass.carousel-nav` | Perle (1) | list; `desktop.css` 5: smoke ground, its own centring kept while pressed - in a rule of three classes, the weight of that list (pitfall 55) |
| weather signs on the island `.glass.wchip` | stilles Wasser (2), small | list (+ "Etikett auf Wasser"); `desktop.css` 5 |
| rows, hour tiles, AMS slots, gallery cards, tab groups, nested boxes on panels | Mulde / Mulde zum Tippen (1) | lists |
| pills on panels; filter pills under a world title | Etikett auf Wasser; Wahl (1) | `.panel` in the list of sheets; the filter group was already a `.pills` group - `desktop.css` 5 gives it smoke ground |
| selects (filter, station, small ones in rows) | Feld (1) | shared list; `desktop.css` 5: ground for the free ones, room for the arrow where the app sets the padding inline |
| checks, progress bars, fields, options, tabs, tiles | Haken, Pegel, Feld, Wahl (1) | shared lists, nothing to do (`--wa-haken-hit: -5px` for the pointer) |
| drawer `.sheet` | Bogen (2), another shape | shared list; `desktop.css` 1 and 6: the Bogen tokens re-declared, entrance `wa-fliesst` from the right, crest along its left edge, its own blur |
| search panel, toast | dichtes Wasser, Tropfen-Hinweis (2) | shared lists; `desktop.css` 6: the panel's own blur, the scrim without fade (pitfall 47) |
| scrims | tint | `--wa-scrim: .3`, `--wa-scrim-blur: none` |
| the running line under the material of a print `.flow` | none of the blocks: a glint of light in the tube of a Pegel | `desktop.css` 2, by hand: the tube tokens of "Pegel", keyframes `wa-fluss` (a transform; 6.6 s a lap, `--wa-t-fluss`; the app: 2.2 s, by `left`), it rests with the water and stands without motion |
| icons that were the app's blue and are no data: the five weather signs, a plain note, the "next task" row of "Aktuelles im Projekt" | none (0): a colour | `desktop.css` 1: `--wa-zeichen`, `--wa-zeichen-grund`; parts 2 and 5. Two of them are coloured inline by the app: `!important` |
| data colours: status dots, the print's ring, the material chart, material names, the three coloured row signs | none (0) | nothing - they say WHAT something is (blue there means "druckt", "ABS", "Planung") |
| islands, their labels, the day ring, loose text over the stage, hand-written notes, charts, the scene | none (0) | nothing |

Counted (`desktop.mjs pruefen`, 2000 x 993, demo data): live drops per world 9 (start), 3, 8, 7, 4, 3, 3, 3 - never more
than 9; blurred surfaces 1, 9, 3, 10, 7, 6, 12, 6 covering 2 to 41 % of the screen; lights 0 to 9.

### 11.2 Decisions, and why

- **The islands are the stars.** No place and no size changes: `desktop.mjs pruefen` compares the boxes of panels, top
  bar, titles, hero, islands, weather signs and notes in all eight worlds with the app without the look - largest shift
  1.8 px, largest change of size 2 px (a panel that lost its 1 px border). The dock is 21 px wider (equal columns).
- **How dense the water is** is the one real change against the phone. A wall of the phone's dark cards buried the
  painting (first round: black slabs). Now, per tone (`--wa-weit-*`): "dunkel" keeps 70 % of a basin's depth and dims
  the scene behind a sheet by 12 %; "klar" keeps its depth and dims the scene behind a sheet by 30 % - the stand-in for
  the page's darkening, which the desktop does not have. Lighter is not possible without losing the floor of 4.5 : 1
  for faint text in "dunkel" by day (4.7 now); "klar" has room left (see 11.4), kept as margin.
- **What a drop free over the stage shows:** the landscape image, bent - as on the phone. It does NOT see islands,
  clouds, leaves, sun glow, mist or the 2.5 s crossfade of two landscapes (it jumps to the new one). So no live drop
  lies where an island can be behind it: checked for every world (the sprite's own pixel under the drop's centre).
  The better solution would be to draw the islands into the drops' picture as well (each island as one more textured
  quad in the shader, with its place, scale and opacity read per picture): about a day of work and a texture per
  island; not started - nothing on today's screens needs it. If a layout ever puts a button over an island: leave it
  out of `drops` (it stays plain glass).
- **Dosage of life.** The stage already moves forty things. Side panels: ONE rim light at 60 % (`--wa-panel-ruhe`), no
  far light, no floor light; under the pointer the light becomes full. The large panel: all three lights. Dock: its
  Lichtlauf and the breathing bead. Pausing lights saves nothing here (pitfall 51) - this is a decision of calm, not of
  cost.
- **Pointer.** Hover is one rule block (`desktop.css` 9): clickable troughs, ghost buttons, beads, labels, chips and the
  dock answer with a little light; plain glass and drops get 16 % brighter; a LIVE drop also gives way a breath under
  the mouse (`HOVER` in `wasser.js`: 30 % of a press, no ring). Rows that cannot be clicked do not answer (the app
  lit every row). The ring answers a click on any non-ghost button of a panel and a ticked check.
- **Keyboard.** Wasserlinie everywhere: the lists of `kern.css` plus one catch-all in `desktop.css` 10. Checked: 24 tab
  stops, 24 white lines, no blue ring.
- **The drawer and the search carry their own blur**, the scrims none: the stage never rests, a blur behind a scrim
  would be a full-screen blur for every picture. In "klar" the drawer without blur would show the page's words.
- **Sleep:** a moving mouse counts as a touch (`wasser.js`); the page behind a drawer or the search rests
  (`desktop.css` 7).
- **What lies BEHIND a sheet belongs to the water.** A panel blurs and dims what is behind it; that is the material.
  So the faded islands the app's layout already lays panels over (in the inner world of a project six ghosts at 20 to
  25 % opacity; in "Projekte" and the inner world the small "Heute" island behind the title and the filter labels)
  show less than in today's Chromium: their brightness is 0.73 to 0.87 of today's at night, 0.33 to 0.55 by day (the
  checker's numbers). Nothing moved, and the large islands, the six of "Start", every free label and the day ring are
  untouched. It is less new than it looks: the app's own glass ASKS for an 18 px blur (`global.css`, `.glass`); today's
  build keeps it only as `-webkit-backdrop-filter` (pitfall 8), which Chromium ignores and Safari should paint (not
  seen: the WebKit test build paints no backdrop-filter at all). Not changed: thinner water would cost the contrast
  floor (above), and a panel through which a ghost island shows is harder to read, not better.
- **Not done on purpose:** no blur on chips and labels free over the stage (smoke glass instead); no drop on the
  per-row buttons, the queue's 22 px buttons stay beads; the app's own entrance of the panels ("rise") stays.

### 11.3 To apply the look to one more desktop element

1. Find its block in section 2. Add its selector to the block's list in `kern.css`, marked `desktop`, no heavier than
   the list (section 1). If the class also exists on the phone, scope it: `:where(.topbar) .brand`.
2. If the block names script options: add the selector to the same option in `Wasser.DESKTOP` (`wasser.js`).
3. What it needs on top (place, size, hover) goes into `desktop.css`, with at least the weight of the list.
4. Free over the stage and carrying text: give it `background: var(--wa-frei)` and no blur. May an island lie behind
   it: never a live drop.
5. `node scripts/wasser/desktop.mjs pruefen`, `... bild <out> --nur <world>` in BOTH formats and both tones,
   `... kontrast`; `node scripts/wasser/vergleich.mjs --alt git:HEAD` (the phone must not change).

### 11.4 Verified (14.11., work machine: software rendering; Chromium, and Playwright's WebKit which paints no backdrop-filter)

- `desktop.mjs pruefen`: 22 checks passed at the first hand-over (three runs in a row; `--format 1920` and `--ton klar`
  as well); 24 since the corrections after the checker (below).
- Looked at: every world, the inner world, 12 sheets and forms, search, keyboard focus, toast, the empty workspace -
  2000 x 993 and 1920 x 1080, both tones, by night and by day; WebKit three times.
- Contrast (`desktop.mjs kontrast`, 50 kinds of text, median; worst 5 % in brackets):

| Text | dunkel, night | dunkel, day | klar, night | klar, day | today's app, night / day (its light theme) |
|---|---|---|---|---|---|
| panel titles (four places) | 15.5 to 16.8 | 12.3 to 15.9 | 13.6 to 15.5 | 9.6 to 14.1 (8.9) | 13.0 to 15.9 / 6.6 to 11.2 |
| text on open water / small muted in a row | 10.2 / 9.8 | 9.9 / 9.6 | 9.9 / 10.1 | 9.1 / 9.5 | 6.4 / 7.5 night; 5.4 / 4.1 day |
| small faint text on open water | 4.9 | 4.7 (4.6) | 9.1 | 7.7 | 4.6 / 3.2 |
| status pill / clickable pill | 9.1 / 10.3 | 7.6 / 8.9 | 7.8 / 8.8 | 5.8 / 7.0 | 8.1 / 8.9 night; 5.7 / 9.7 day |
| dock: world / active world | 10.0 / 16.5 | 9.8 / 15.5 | 7.2 / 9.8 | 5.8 / 7.4 | 8.8 / 8.5 night; 5.1 / 5.1 day |
| top bar: search / weather / workspace chip | 11.4 / 13.2 / 11.7 | 6.2 / 8.1 / 5.3 | as dunkel | as dunkel | 9.0 / 13.4 / 12.1 night; 5.9 / 10.9 / **1.0** day |
| free: chosen filter / chip under the island / clear drop / amber drop / "Öffnen" | 9.5 / 14.9 / 13.6 / 7.8 / 5.6 | 6.0 / 9.6 / 5.0 / 8.8 / 4.9 | as dunkel | as dunkel | 7.6 / 15.7 / 9.8 / 10.2 / **3.9** night; **3.1 / 1.7** / 4.8 / **3.4 / 2.5** day |
| drawer: title / field label / typed text / placeholder | 16.9 / 11.4 / 18.0 / 4.6 | 16.7 / 11.2 / 17.8 / 4.5 | 10.1 / 8.5 / 12.5 / 4.4 | 9.4 / 7.6 / 10.9 / 3.8 | 16.6 / 9.0 / 17.2 / 4.0 night |
| search: group, small hit; toast: text, "Rückgängig" | 11.4, 8.7; 16.9, 11.1 | 11.4, 8.6; 16.6, 10.9 | 8.2, 5.6; 9.9, 6.3 | 8.0, 5.6 (5.1); 8.5, 5.3 (4.7) | 4.8, 6.9; 17.0, 11.2 night; **3.2**, 6.2; 16.5, **1.6** day |

  No median below its floor in the template (titles 7, text 4.5, placeholders 3). Today's app: 1 below the floor by
  night, 11 by day (bold). The lowest worst-5-% values of the template: placeholder 3.6 (klar, day), faint text 4.6
  (dunkel, day), "Öffnen" 4.6.
- What it costs (`desktop.mjs takt`, 2000 x 993, night; pictures drawn a second / CPU ms of the GPU process per picture):

| | "Heute" (9 blurred sheets, 30 % of the screen) | "Wetter" (12, 42 %) |
|---|---|---|
| the app today | 9.4 / 105 | 10.8 / 91 |
| the template | 7.8 / 144 | 8.2 / 140 |
| ... lights paused | 7.6 / 148 | 8.0 / 141 |
| ... no live drops | 7.6 / 129 | 7.8 / 127 |
| ... no blur at all | 9.6 / 120 | 10.4 / 113 |

  On this machine a picture costs 37 to 54 % more work than today; the blur is about half of that, the drops about a
  tenth, the lights nothing. A water picture of three to nine drops: 9 to 11 ms. NOT measured on a real graphics card.
- The phone is unchanged: `vergleich.mjs alles --alt <the template as it was before the desktop step>`, Chromium:
  186 comparisons, no pixel differs outside AND inside the drops (64 pairs, 99 million pixels), no computed style
  differs (72 comparisons, 17,792 styles; 1,132 pressed / focused elements), the same motion in 12 filmstrips (the two
  "scroll" strips differ as always: real frame times). After the script had learned the hover, `bilder`, `app` and
  `film` once more: again no pixel, outside or inside. `pruefen.mjs --app`: all 60 checks, 57 and 57 tone tokens.
  WebKit test build: `bilder` and `app` against the same reference, 64 pairs: no pixel differs, outside or inside the
  drops; `pruefen.mjs --app --engine webkit`: all 60 checks. (To compare against the state before a step when
  intermediate commits exist: `--alt git:<commit before the step>` - for the desktop step that is `git:ae614b7` - or a
  copy of the folder.)

**After the checker (14.11.).** An independent checker went through the desktop template: one defect of grade "hoch",
four of grade "mittel". What was done, and what was not:

| Finding | State | What |
|---|---|---|
| The two arrows beside the island in "Projekte" hopped 23 px down while pressed; a click on their centre or upper half was lost (both formats, both tones, Chromium and WebKit) | **fixed** | pitfall 55: the shell's rule had two classes against the three of "Perle". Now `.glass.carousel-nav.carousel-nav`. Reproduced first (2000 x 993, reduced motion, 110 ms clicks at five heights on both arrows: 8 of 10 lost in Chromium, 7 of 10 in WebKit, pressed box 518..561 instead of 493..539), then: 60 clicks, none lost, pressed box 495..538 - 2000 x 993 and 1920 x 1080, "dunkel" and "klar" in Chromium; 2000 "dunkel" and 1920 "klar" in WebKit. The rule's other values arrive for the first time too: the arrows ARE smoke glass now (the first hand-over showed the plain bead, almost invisible over a bright lake by day) |
| Still the app's blue by accident: the running line of a print, the icons of the five weather signs, the icon of a plain note, the tile of the "next task" row | **fixed** | `desktop.css` 1, 2, 5 (`--wa-zeichen`, `wa-fluss`); pitfalls 57, 58. The checker's own scan (every visible element for the app's blue, glass, frame and blur) now finds only data colours: status dots, the material chart, a material name. The running line: 6.6 s a lap instead of 2.2 s, moved by a transform instead of `left`, paused when the water sleeps (measured: its place does not change over 0.5 s asleep), a full faint line without motion (system setting and the app's switch) |
| "Wetter" at 2000 x 993: the label "Archiv" of the small island lies under the sign "Luftdruck" and is gone (today it shows through and collides with the sign's icon) | **not fixed: the app's layout** | measured with and without the look: the same boxes, the label lies entirely under the sign at 2000 x 993 and 23 px above it at 1920 x 1080. A sheet of water cannot cure a place; section 10, point 8, has the cause and the options |
| Faded background islands under panels show less than today | **not changed: the material** | section 11.2, "What lies BEHIND a sheet" |
| Cost: the first real backdrop blur on the desktop in Chromium (0 blurred surfaces today, 9 to 12 covering 30 to 42 % with the look) | **not changed; numbers confirmed** | the checker's own measurement (pictures a second by `requestAnimationFrame`, 2000 x 993, night): "Heute" 9.9 today, 7.8 template, 9.4 without blur; "Wetter" 11.1 / 7.8 / 9.9; with the mouse moving 9.3 -> 7.0 and 10.0 -> 6.7; a change of world: 17 -> 11 and 16 -> 12 pictures in the first 1.5 s, longest pause 183 -> 267 ms and 233 -> 300 ms. WebKit test build: "Heute" 3.9 -> 2.1, "Wetter" 3.7 -> 3.5, longest pause at a change of world 578 -> 922 ms and 631 -> 1123 ms. Software rendering: on a graphics card a blur of this size is ordinary work, but nobody has seen it there. The lever stays the one of 11.5, row 1 (`?weich=aus` to compare; fewer blurred sheets) |

After these corrections: `desktop.mjs pruefen` 24 of 24 at 2000 x 993 "dunkel" and at 1920 x 1080 "klar" (the two new
checks FAIL on the template as it was: both arrows 23 px away, the click lost, no smoke glass).
In the WebKit test build (`--engine webkit`; the press scan needs Chromium's DevTools protocol and is skipped there):
22 of the 23 checks that run there pass, the arrow under a real pointer among them. The one that fails failed before
the corrections as well (the checker's log): "nothing has moved" finds a size change of 8.1 px in "Material" - that
build draws the app's own small selects 33 px high (its native control) and the look's Feld 25 px (as Chromium draws
both), so a panel head is 8 px lower with the look. Whether Safari on a Mac does the same is unknown. The check "a
moving mouse wakes the water" failed there too until its wait went from 0.4 s to at most 1.2 s: that build delivers
the pointer after about 0.4 s - the water does wake.
The phone
is unchanged against the template before the corrections (`vergleich.mjs alles --alt <copy>`, Chromium): 64 picture
pairs, 98.9 million pixels - no pixel differs, outside or inside the drops; 17,792 computed styles and 1,132 pressed /
focused elements - none differs; 12 filmstrips - the same motion, no pixel in ten of them, the two "scroll" strips
differ as always (real frame times); `pruefen.mjs --app`: all 60 checks. WebKit was not run for the phone this time:
no rule outside `[data-wasser="desktop"]` was touched, `kern.css` got two comments.
Looked at again: "Projekte", "3D-Druck" and "Wetter" in six combinations (each format in both tones, by night and by
day) and twice in the WebKit test build. Not run again: `desktop.mjs kontrast` (no text and no ground under a text
was changed) and `desktop.mjs takt` (what the running line costs as a transform was not measured).

### 11.5 The first look on the owner's own desktop (nothing has run on a real graphics card)

| # | Look at | Good | Bad | The one line |
|---|---|---|---|---|
| 1 | **Smoothness**: `zeigen`, move the mouse over "Heute" and "Wetter" (parallax), change worlds; then the same with `?weich=aus` and with `?ohne=1` | no difference to `?ohne=1` | choppier than the app today, and `?weich=aus` cures it | fewer blurred sheets: in `desktop.css` 2 take `-webkit-backdrop-filter` / `backdrop-filter` off `.bottom-row .glass.panel` first (four sheets over the lake's shore, where the blur shows least) |
| 2 | **Is the painting still the star?** every world, "dunkel" at night | panels read as dark water, the lake glows through their rims | a wall of slabs | `--wa-weit-tiefe: .55;` (`kern.css`, tone "dunkel"; today .7) - then check `desktop.mjs kontrast`: faint text by day falls below 4.5 |
| 3 | **"klar" by day**: `?ton=klar` at noon | smoked clear water, every text easy to read | too grey / too dark | `--wa-weit-grund: brightness(.8);` (`kern.css`, tone "klar"; today .7) - titles stay above 8, small text about 5 |
| 4 | **Life at rest**: sit still for a minute on "3D-Druck" | calm; the large basin breathes a little | panels shimmer / nothing lives | `--wa-panel-ruhe: .35;` or `1` (`desktop.css` 1); all of it: `?leben=1.5` / `--wa-leben` |
| 5 | **Hover**: move over the hero buttons of "Projekte" and over rows | each drop answers, nothing flickers | not noticed / too much | `HOVER` in `wasser.js` (0.3) and `--wa-zeiger-licht` (`desktop.css` 1) |
| 6 | **Free drops**: "Start" and "Projekte" with the mouse moving (parallax) | the lake inside the drops moves with the lake outside | a drop shows a different place than its surroundings | report it; `drops: '.topbar .chip.btn--icon, .btn--primary'` in `Wasser.DESKTOP` makes the free plain buttons glass |

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
- **The marker knows nine children** (five before the desktop step); a tenth needs one more `:has()` line.
- **`scripts/verify.mjs`:** never run against a build with the look.

Desktop (section 11):
- **"Wetter" at 2000 x 993: the sign "Luftdruck" stands on the label of the small island "Archiv".** The app's layout,
  there today; under the look's water the label is gone instead of colliding with the sign's icon. To settle in the
  app when the look is built in (section 10, point 8). It is the only one: of the 36 labels of islands that are not
  faded (opacity 0.5 and more) in the eight worlds, no other lies under a panel, sign, chip, pill, select or button -
  at 2000 x 993 one of 36, at 1920 x 1080 none (boxes against boxes).
- **Faded islands the app lays panels over** are blurred away by the water (11.2). If the owner misses them: that is a
  wish for thinner water (`--wa-weit-tiefe`, `--wa-blur`), bounded by the contrast floor.
- **Never on a real graphics card.** Smoothness of the desktop template is unknown: the work machine draws today's
  desktop at 9 to 11 pictures a second and the template at 8. Section 11.5 is the order in which to look.
- **A free drop does not see islands** (11.2). Safe on today's screens (checked per world); a layout change can move
  an island behind a free button.
- **"klar" needs `backdrop-filter`.** Its ground under light text by day is the dimming of the scene THROUGH the sheet
  (`--wa-weit-grund`) plus the blur. In Playwright's WebKit build, which paints no backdrop-filter, panels of "klar" by
  day show the sharp bright scene and small text gets hard to read (picture: the third WebKit run). Every current
  browser paints it (Safari through the prefixed property, which is written first); no fallback for a browser
  without it was built, because none could be tested.
- **Small selects with an inline padding on the PHONE** (in sheets: drying profile, status of a version, a tool, a
  member): the same root cause as pitfall 48 - the arrow has no room of its own. It was not touched there (the phone's
  pictures had to stay identical; in the approved pictures the arrow happens to stand clear). The cure is the rule of
  `desktop.css` part 5 moved to `kern.css` without its shell.
- **The brand button of the phone's header keeps the app's blue focus ring** (the last blue there): `.brand` is not in
  the Wasserlinie list for the phone, again to keep it identical. One entry.
- **Three places are found or fought by the app's inline styles** (the large panel, the current version, small
  selects): section 10, point 2.
- **The empty workspace** shows large empty basins in "3D-Druck" and "Material" (one line of text in 835 x 290 px of
  dark water): the app's layout; nothing was changed.
- **Dead on the desktop:** a closing drawer (gone in one frame, as on the phone), panels that leave a world (the app
  unmounts them), the top bar's text chips at rest, the weather signs.
- **Firefox** was not run for the desktop (its build here has no WebGL: plain glass buttons, everything else CSS).

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

---

## 14. The tools after the integration (14.11., afternoon)

Until the look was built in, every tool INJECTED the template into an app without a look. Against an app WITH the
look that measured a mixture: two stylesheets on top of each other, and the injected script never started
(`wasser.js` begins with `if (window.Wasser) return;`), so the bundled script ran with rules of both. What the tools
do now (all of it in `lib.mjs`, used by `app()` and by `openDesktop()`):

- **Built in** (`look: 'auto'`, the default; `'eingebaut'`): nothing is injected. The shell carries `data-wasser`,
  the app's own hook started the script. Start options a tool needs (`sleep: 0` ...) go in by a second
  `Wasser.start()` on top of the shell's own options.
- **Replaced** (`look: 'vorlage'` / a folder / `git:<rev>` against a built-in look): BEFORE the page loads, a route on
  the app's stylesheet cuts the look out - it is the tail of the bundle, from the first `[data-wasser` on (the app's
  own rules never name the attribute; `lookStart()` throws when ANY top-level rule of that tail names neither
  `[data-wasser` nor `data-wa-ton` - keyframes aside, `@media` / `@supports` looked into -, i.e. when rules of the app
  follow because the build order is wrong: cutting would take them away) - and appends the folder's three stylesheets in one piece; an init script defines the folder's `wasser.js`
  before the bundle runs, so the bundled copy steps back and THE APP'S OWN HOOK starts the folder's script with the
  folder's `Wasser.DESKTOP`. Checked with a copy that carried a marker token and another sleep time: both arrive,
  on the phone and on the desktop; `Wasser.info.state` is `gl`; the same number of live drops as built in.
  The folder's CSS is the unbuilt one (nesting, colours not shortened): compared with the built look a few pixels at
  round corners can differ by 1 of 255, so proofs of "nothing changed" are made on built states (`sollist.mjs`).
- **Injected** (the same looks against a shell WITHOUT a look - an older commit, or the desktop of `65b1e44`): the
  stylesheet goes in by the same route (appended to the app's), the script by the same init script; the tool then
  sets the attribute and starts (`einspielen.js` on the desktop). Tried against `a54b030` (no look at all) and
  `65b1e44` (phone built in, desktop not): 4 and 9 live drops, marker token and sleep time of the copy arrive.
- **None** (`look: ''`, `--look ohne`): the look's rules are cut, the script is replaced by one that does nothing.
  This is "the app without the look" for `desktop.mjs pruefen` ("nothing has moved") and `desktop.mjs takt`.
- **The tone** is the app's business wherever its bundle carries a look (`settings.theme` and the hour) - also when a
  tool has taken that look out and injected the earlier one (the reference of `vergleich.mjs`): the app's effect still
  owns `data-wa-ton` there (until the evening of 14.11. the tools set the attribute in that case, and the sheet
  "Einstellungen" showed "Automatisch" on one side and "Dunkel" on the other). The tools write the
  setting into the stored state (`3druckwerkbank:v1`, or `...:echt:v1`), freeze `Storage.setItem` for the moment
  (the app saves its state often) and reload - one more load of about a second - then read `data-wa-ton` back and
  throw when it is not what was asked. A partial state cannot be planted BEFORE the first load: the store's `merge`
  ignores a stored state without projects, devices and spools.
- **Pixel-equal desktop pictures** needed one more thing than the helpers had found (clock, clouds, window nudge, two
  equal shots): `.island` has `will-change: transform` and a 600 ms transition on `transform`, also with reduced
  motion, so the browser rasters the island's layer at whatever scale it had while the world changed. The day ring and
  the island labels then come out in two ways from one and the same page (174 to 6030 px on Start and Heute between two
  loads of ONE build). With `.island { transition: none !important; will-change: auto !important; }` on both sides
  the same build is equal to itself on all screens (`sollist.mjs`, its constant `STILL`).

