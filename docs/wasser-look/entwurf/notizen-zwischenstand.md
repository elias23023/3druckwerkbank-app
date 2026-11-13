# Vorlage "Wasser" - notebook for the people who apply it later

Folder: `/tmp/claude-0/-home-user-3druckwerkbank/c7034e5f-c75e-5dc3-a0df-70a196fe2d21/scratchpad/lg/final`
(`look.css`, `look.js`, `defs.html`). The app repository is not touched; the look is loaded by the harness
(`../base.html?look=final`) or injected into the running app (`../real.mjs`).

Each step appends one section. Newest at the bottom.

---

## Step "Farbe": two tones (dunkel, klar), tokens, building blocks

State before this step: `../final-vor-farbe` (blue-teal cards). Never edit that copy; `tools/regress.mjs` compares
against it.

### 1. What a tone is

A tone is a set of custom-property values on `.m-shell`. Nothing else.

| Tone | How it is selected | Where its values are |
|---|---|---|
| `dunkel` (default) | no attribute | `look.css`, block "Karten", part "1. Töne", first rule `.m-shell { ... }` |
| `klar` | `<html data-wa-ton="klar">` | same place, second rule `:root[data-wa-ton="klar"] .m-shell { ... }` |

- Both rules list the same tokens in the same order (the `klar` rule repeats values that are equal on purpose).
- No selector anywhere else in the file mentions `data-wa-ton`. There are zero rules that differ between tones.
- `look.js` contains no tone logic. A drop reads what it needs from the sheet it lies on (see 3).
- **Delete `klar`:** remove the second rule. **Keep `klar` instead:** replace the body of the first rule by the body
  of the second, then remove the second. In both cases also remove `'data-wa-ton'` from the `attributeFilter` in
  `look.js` (function `wire`); it only makes a live switch of the tone show at once.
- Harness: `?ton=klar`. Real app: fifth argument of `real.mjs`, or `ton: 'klar'` in `openApp` (`real-lib.mjs`).

Outside the tones, neutral for every tone: the page's darkening of the scene (block "Seite", `--wa-page-dark`), the
label halo of the drops (`--w3-halo`), the plain glass without WebGL (`--wa-glass*`), the focus line (`--wa-focus`),
the selected pill (`--wa-pill-on-*`). All in the first rule of the file or in "Seite".

### 2. Building blocks and how to apply them

Every block is defined once, under a class of its own, and the app's mobile selectors sit in the same selector
list (`:is(.wa-becken, .glass.m-card)`). To make another element of a block, give it the class or add its selector
to that list. `tools/bausteine.mjs` puts every block on elements the app does not have and checks ring and marker.

| Block | Class | Defined in | What the element needs |
|---|---|---|---|
| Tropfen (drop button) | `.btn` not `.btn--ghost`, `.m-ico` | CSS "Wasser-Knöpfe" + `look.js` part 1, list `SEL` | nothing; a sheet under it should set `--water-under` |
| Perle (pill) | `.pill`, `.pill--on` ... | CSS "Wasser-Knöpfe", end | nothing |
| Wasserlinie (focus) | `--wa-focus`, `--wa-focus-gap` | CSS "Wasser-Knöpfe", rule `:focus-visible` | add the selector of a new focusable element to that rule |
| Becken (sheet with depth) | `.wa-becken` | CSS "Karten", 3. Bausteine | at least about 100 px wide and high; its own padding |
| stilles Wasser (plain sheet) | `.wa-wasser` | same | its own padding |
| dichtes Wasser (content scrolls under it) | `.wa-wasser--dicht` | CSS "Leiste", Bausteine | a border-radius of its own |
| Mulde (trough) | `.wa-mulde`, tappable: `.wa-mulde--tipp` | CSS "Karten", 3. Bausteine | lies on a sheet; its own padding |
| Ring (answer to a touch) | helper `.wa-floor > .wa-ring` | CSS "Karten" + `look.js` part 2, list `RING_ON` | the sheet: `position: relative; isolation: isolate` (Becken has both) |
| Markierung (flowing marker) | `.wa-markierung` | CSS "Leiste" + `look.js` part 2, list `BAR` | children of equal width, the active one carries class `on`; `--wa-bar-tabs: <n>` |

Recipe for a sheet that is none of the above (for example a desktop panel):

```css
.my-panel {
  border: 0;
  background: var(--wa-still);                    /* or --wa-dense, or var(--wa-whisper) var(--wa-clear) plus the two depth layers */
  -webkit-backdrop-filter: var(--wa-blur);        /* on the element itself, never on a child */
  backdrop-filter: var(--wa-blur);
  box-shadow: var(--wa-meniscus), var(--wa-shallow), var(--wa-far), var(--wa-lift);
  --water-under: var(--wa-still);                 /* the colour its buttons lie on */
  --text-2: var(--wa-ink-2); --text-3: var(--wa-ink-3); text-shadow: var(--wa-shade);
}
```

The tokens are declared on `.m-shell`. For desktop, declare the same two rules on the desktop shell (or on
`:root`) and change the prefix `.m-shell` of the block rules.

Dosage, as told to the owner: the more often something appears on a screen and the more text it carries, the less
water. Drops and the marker are the only glossy things; sheets are still; troughs carry the text.

### 3. How a drop learns about the sheet it lies on (`look.js`, object `PROP`)

Read from the button's own computed style, so a sheet sets them for all its buttons by inheritance:

| Property | Form | Meaning | When missing |
|---|---|---|---|
| `--water-under` | CSS colour with alpha | everything between button and landscape | computed backgrounds of the ancestors |
| `--wa-light` | `r, g, b` | colour of the light a drop gathers on a sheet (glint, crescent, reflections) | the built-in sky white |
| `--wa-sat` | number | how much colour the sheet leaves the landscape; the same number as in its `saturate()` | 1 |
| `--wa-sky` | 0..1 | how much built-in sky blue a drop FREE over the landscape keeps | 1 |
| `--wa-drop-amber`, `--wa-drop-red` | `r, g, b, amount` | tint of primary and danger drops | constants `TINT` |

Re-read once a second, on class changes inside the shell, on `resize`, and when `data-wa-ton` changes.

### 4. Values that were found by eye, and why

**dunkel**
- `--wa-sat: .55`. The backdrop behind a sheet keeps 55 % of its colour. This is what removes the brown cast over
  warm wood. Chroma of the top rim band on the scene "material": 9.5 (first dark variant), 5.7 (judge's
  correction, 70 %), 3.5 now. Do not raise it above about .6.
- `--wa-clear: rgba(8, 12, 20, .27)`. The rim is a breath cool on purpose; it balances the warm scenes.
- `--wa-shallow`, `--wa-far`, fourth layer of `--wa-meniscus`. These three make the sheet read as water over dark
  ground: a lit shallow band, light gathered inside the far (lower right) side, and a dark inner side of the bright
  rim line. Without them the lower card is an ordinary dark-mode card.
- `--wa-dense` is the floor's graphite, not black. A black bar read as a hole.
- Drop on a sheet (shader, comment "on a sheet the drop is a lens"): the body carries a veil of the sheet's light,
  weighted by `(1 - col)^2`, so it is strong on black water and vanishes on light water. Constants
  `.056 + .104*far + .1*glow`. Result: body +20 to +23 L* above the card in both tones. Above about +28 the drops
  turned into chrome; at +8 they read as outlines.

**klar**
- `--wa-clear: rgba(91, 96, 98, .25)`. A veil of mid-grey. It lifts dark ground and lowers bright ground, so foliage
  no longer mottles the rim band. This plus `blur(12px)` (was 9) and `--wa-sat: .78` (was .85) is what calmed the
  start scene.
- Second layer of `--wa-shallow`: the near wall throws a soft shade into the top band. The card title sits there on
  open water; this keeps it at 7:1 or more also without any backdrop blur.
- Loose text carries `--wa-shade` (text-shadow). The contrast numbers below do not count it.

### 5. Pitfalls I hit

1. **The drops do not notice a changed custom property at once.** They re-read once a second, and not at all while
   the water is frozen (reduced motion). After injecting CSS in a test, dispatch `resize` on `window`
   (`tools/var.mjs`, `tools/messen.mjs` and `tools/frei.mjs` do). A measurement taken without this compares the
   old state with itself.
2. **A token built from other tokens resolves where it is declared.** `--wa-meniscus` uses `--wa-core`; setting
   `--wa-core` on one card does not change that card's meniscus. Re-declare the built token there too. The ring
   helper is the exception that works: it sets `--wa-light` and uses it in its own `background`.
3. **`--wa-light` has two readers.** The ring (CSS) and the drops on a sheet (`look.js`). Changing it changes both.
4. **The page darkening is parsed by `look.js`** (`readGradient`): it must stay
   `linear-gradient(180deg, <colour> 0%, ... 30%, ... 70%, ... 100%)` with four stops.
5. **Dark glass plus saturated backdrop turns brown** over warm scenes. Lower `--wa-sat` first; a darker sheet
   does not help.
6. **WebKit on the test machine paints no backdrop-filter**, so sheets show the landscape sharp. In the zoomed
   close-up (`?nah=1`) it also drops the depth layers of the small card, so that card looks like a clear pane.
   The same build paints small cards correctly in the phone view (`t/farbe/extra-wk.png`). Judge depth in the phone
   view only.
7. **Brighter is not clearer.** Lifting the drop body with a flat grey gave pebbles. Light has to depend on how
   dark the sheet is.
8. **Without its sky blue a free drop goes grey over a pale sky** (label zone). `--wa-sky: .3` keeps a breath;
   at 0 the scene "heute" shows a smoke-grey "Bearbeiten".
9. **`rgba(var(--wa-drop-red))`** works because the token is `r, g, b, amount`. Keep four numbers.

### 6. What I verified, and how to repeat it

Server: `python3 -m http.server 4310 --directory <lg>`. All commands from `<lg>/final`.

| Check | Command | Result |
|---|---|---|
| Restructuring moved nothing | `node tools/regress.mjs t/farbe/reg-out` | with the old blue as a test tone (`tools/ton-blau.css`) and the drops hidden: 0 of 255 difference on four views |
| Contrast and drop bodies | `node tools/messen.mjs chromium mess/chromium dunkel,klar <scenes>` then `python3 tools/messen.py mess/chromium dunkel,klar <scenes>` | tables in `mess/*.txt` |
| Same in WebKit | `source ../../judge-phone/env.sh` first, engine `webkit` | `mess/webkit-start-heute-wetter-innen.txt` |
| Blocks by class alone | `node tools/bausteine.mjs out.png [ton=klar]` | ring on `.wa-becken`: 1, marker flight: 1, drops: 2, no errors |
| Ring, bead, React re-render, destroy | `node tools/robust.mjs chromium` (and `webkit`), `node tools/touch.mjs out` | all seven cases pass in both engines; no page errors |
| Buttons: hit area, tap, focus line, a11y, destroy | `node t/checks.mjs chromium <out>` (the buttons' author's script) | passes; focus outline `solid 2px`, offset 5 px |
| Idle stillness | `../clip-phone.mjs`, stills p0 / p1 | differ only inside drops; reduced motion: identical |
| Free drops | `node tools/frei.mjs out wetter "jetzt="`, `node tools/frei-bild.mjs pic.png` | header drops 0.9 / 1.9 / 2.8 b* bluer than the scene behind them on wetter / start / innen (approved state: 3.4 / 4.9 / 7.1) |
| Real app | `node ../real.mjs <final> <out> chromium [klar]` | 11 screens per tone, only Open-Meteo network errors |
| All eight scenes | `node tools/szenen.mjs final szenen [ton=klar]` | `szenen/`, `szenen-klar/` |

Other tools: `tools/var.mjs` (variants side by side, with CSS injection), `tools/zoom.py`, `tools/view.py`,
`tools/loeschen.mjs` (red comparison), `tools/farbbild.py` (owner pictures), `tools/extra.mjs` (more card kinds).

### 7. Open

- **Never on a real phone.** Both tones. On an OLED check: rows and tiles still deeper than the card (dunkel);
  clear drops read as bodies outdoors; the rim over the scene "material".
- **Bottom sheets, text fields and the toast are still the app's navy** with a blue focus border
  (`app/app-sheet-projekt.png`). Not designed in this step. Starting point: `.wa-wasser--dicht` for the sheet,
  `.wa-mulde` for a field, focus `0 0 0 1px rgba(var(--wa-core), .55), 0 0 10px rgba(var(--wa-core), .14)`,
  placeholder at 60 % white or more. In `dunkel` use the floor graphite at about .94 for a sheet so troughs still show.
- **The primary button's fallback glass and the amber ring are fixed colours**, not derived from `--wa-drop-amber`.
- **The marker assumes at most five children** (`:has` rules) and class `on`.
- **Desktop:** nothing was tried. The tokens and blocks are prefixed `.m-shell`.
- **Red:** strength A is active; B is in the comment next to `--wa-drop-red`. The owner decides from
  `loeschen-vergleich.png`.
- **`--wa-sky`:** .3 is a taste decision. 1 restores the buttons exactly as first approved.
- **Not run in the build**, `scripts/verify.mjs` not run against it.

---

## Step "Übrige Elemente": sheets, toast, fields, choices, checks, levels, beads - and the first look in the real app

State before this step: `../final-vor-rest` (never edit). Everything of this step is in `look.css`, block
`/* ---- Übrige Elemente ---- */` (appended at the end), and in `look.js`, section `/* ---- Übrige Elemente ---- */`
(appended at the end). The few lines changed in earlier blocks are listed in 5 and stored as diffs in
`mess/rest-look.css.frueherer-teil.diff` and `mess/rest-look.js.frueherer-teil.diff`.

### 1. What the real app showed (nobody had looked before) and what was done

| Found in the running app | Done |
|---|---|
| Bottom sheets, search overlay and toast were the app's navy glass (97 %), forms had navy fields with a blue focus border, options were amber, the scrim was navy | all of it restyled (2, 3) |
| **The toast was not centred**: the app's entrance animation `rise` ends with `transform: translateY(0)` and so overrides the toast's own `translateX(-50%)`; its left edge stood in the middle of the screen and long texts wrapped into three lines. This is also so in today's app. | the toast is centred by its margins (`left/right: 14px; width: fit-content; margin: 0 auto`), needs no transform, and sits `--wa-bar-lift + 78px` above the bottom so it clears the floating bar on an iPhone |
| **Icon buttons were dots**: `.m-shell .btn { padding: 10px 14px }` (mobile.css) beats `.btn--icon { padding: 6px }`, so the close "X" of every sheet, "skip" in the task rows and "remove" in the shopping list were squeezed to 2-6 px. Also so in today's app. | `padding: 0` in the Perle block; they are visible glass beads now |
| Drops in sheets read the sheet's computed navy background | the sheet states `--water-under: var(--wa-sheet)`; drops on a sheet are the same clear drops as on cards |
| Pills outside cards (in sheets, in the search overlay) still had the glossy bead rim of the button block | the flat-pill rules now apply in `.sheet`, `.cmd`, `.toast` as well |
| Number tiles `.glass.m-stat`, the four header buttons, counters `.cnt.pill.xs` and ghost icon buttons in card titles | already right (the cards' author had handled the tiles); the ghost icon buttons became beads |
| Buttons that repeat per row ("Start" per printer, "+ Liste" per shortage) were live WebGL drops | kept out of the drops (`SEL` in look.js): plain glass beads. A screen now draws at most 7 drops (Projekt), a sheet at most 5 at a time. |
| A `<select>` is a white system box with invisible white text in the Linux WebKit build (also in today's look) | selects draw their own trough and arrow (`appearance: none`), identical in every browser |
| The sheet got a blue focus ring when opened by keyboard (the app focuses the `<aside>`) | `.sheet:focus { outline: none }` |
| In the WebKit build entrance animations sometimes start up to a second late (software rendering), so a picture taken 700 ms after a tap can show a missing card or sheet | not a defect of the look; `tools/wk-eintritt.mjs` shows that every entrance runs to its end. Use `tools/rundgang.mjs` (waits longer) next to `real.mjs`. |

### 2. Dosage as built

| Element | Level | What it is now |
|---|---|---|
| Bottom sheet `.sheet` | 2 | Bogen: dense water (`--wa-sheet`: .95 dunkel, .88 klar), soft uneven shoulders, meniscus on the top edge only, no depth steps. Rises like a wave (68 px, runs 5 px past, settles; a crest of light on its top edge spreads and fades). No backdrop blur of its own. |
| Scrim `.sheet-back`, `.cmd-back` | 2 | neutral dark (.55) and `blur(5px)`: the page sinks out of focus, its words cannot be read, its shapes stay |
| Sheet head / body / foot | 2 | head and body plain; the foot begins with one faint line (`--wa-shore`); `safe-area-inset-bottom` as padding of the sheet |
| Ring on a sheet | 2 | only from the non-ghost buttons in `.sheet__foot` (gold from the primary), as on cards |
| Toast `.toast` | 2 | Tropfen-Hinweis: a small piece of dense water with the bar's rim. Lands like a drop, leaves like one. Error variant ready (`.toast--bad` / `.wa-hinweis--fehler`: rose rim line), the app has no error toast yet. |
| Search overlay `.cmd` | 2 | the same dense water, card outline; chosen hit = lit trough |
| Text field, textarea, select | 1 | Feld: a Mulde with a faint line on its far wall so an empty field is found. Focus: the Wasserlinie (2 px light) runs in from the left, light pools above it, a faint line all around. Replaces the blue border. |
| Pill groups, option groups `.seg`, tabs in sheets `.tabs`, tiles `.tile`, picture tiles `.island-lib > button` | 1 | Wahl: flat tinted labels (tiles: troughs); the chosen one is a small bead of clear water that flows over from the one chosen before |
| Check `.check` | 1 | Haken: an empty hollow; ticked, a drop of green water fills it and swings in; unticked, it drains. Hit area 44 px. |
| Progress `.progress`, form steps `.steps` | 1 | Pegel: light water in a thin dark tube, brighter towards its end; a new level runs there with a small swing |
| Icon buttons (ghost): close, skip, remove, reorder, "more" in card titles | 1 | Perle: glass bead, no bending, no script; gives way under the finger and springs back |
| Buttons inside list rows | 1 | plain glass (the no-WebGL look of the button block), lighter, no heavy shadow |
| Rows in sheets `.item`, `.konto-side`, `.bereich-card`, `.sim-item` | 1 | Mulde, as in cards |
| Status pills in sheets | 1 | flat tinted labels, as on cards |
| Slider `.range`, native checkbox | 1 | tint only (`accent-color`: the app's amber) |
| Text, icons, photos, thumbs, swatches, colour stacks `.stack`, hours strip | 0 | untouched; only `.hour.now` lost its blue tint |
| Desktop | 0 | every rule is under `.m-shell` |

Less than the dosage table said, on purpose: sheets have no backdrop blur of their own (the scrim carries it); the
toast and the search overlay use the bar's material unchanged; ghost text buttons ("Abbrechen", "Bearbeiten") stay
chrome-free.

### 3. Building blocks and recipes

All defined in part "3. Bausteine" of the CSS block. Tokens in parts 1 and 2 (same in every tone). Tone tokens used:
`--wa-sheet` (new, in both tone rules), `--wa-dense`, `--wa-trough*`, `--wa-core`, `--wa-light`, `--wa-dark`,
`--wa-abyss`, `--wa-ink-*`. `tools/bausteine-rest.mjs` puts every block on foreign elements by class alone.

| Block | Class (app selector in the same list) | What the element needs | Script |
|---|---|---|---|
| Bogen | `.wa-wasser--dicht.wa-bogen` (`.sheet`) | its own position at the bottom edge, `overflow: hidden`, padding; a scrim behind it with `background: var(--wa-scrim); backdrop-filter: var(--wa-scrim-blur)` | ring: it is in `RING_ON` |
| Tropfen-Hinweis | `.wa-wasser--dicht.wa-hinweis` (`.toast`); error: `.wa-hinweis--fehler` | position, padding | leaving: list `TOAST` |
| Feld | `.wa-feld` (`.input`, `.textarea`); a select: `.wa-feld.wa-feld--auswahl` (`.select`) | padding, font size 16 px (iOS zooms below that) | none |
| Wahl | group `.wa-wahl`, its children are the labels, the chosen one has class `on` (`.pills > .pill` / `pill--on`, `.seg > button`, `.tabs > button`, `.tiles > .tile`, `.island-lib > button`) | padding per label; the group may wrap | flow: lists `GROUP`, `ON` |
| Haken | `.wa-haken`, ticked: class `on` (`.check`, `.check--on`) | width, height, `border-radius: 50%`; the tick is the app's own SVG | none |
| Pegel | `.wa-pegel > i` (`.progress > i`), amber: `.wa-pegel--amber` | tube: height, radius, `overflow: hidden`; `<i>`: `display: block; height: 100%; width: <n>%` as inline style | flow: list `LEVEL` |
| Perle | `.wa-perle` (`.btn.btn--icon.btn--ghost`) | width and height (32-36 px) | none |

To apply a block to another element: give it the class, or add its selector to the `:is(...)` list of the block
(three places for Wahl: label, chosen label, chosen label's `::before`). For a script-driven block also add the
selector to the list named in the table, at the top of the script section.

Recipes:
- **A new bottom sheet or modal (also desktop):** `.wa-wasser--dicht.wa-bogen`; change `--wa-r-bogen` to four round
  corners and drop the `0 30px 0 0` layer of its box-shadow if it does not touch the bottom edge; rows inside are
  `.wa-mulde`, fields `.wa-feld`. Put the blur on the scrim, never on the sheet.
- **A new field:** `.wa-feld`. Do not give it a border; its 1 px transparent border is today's space.
- **A new group of options:** container `.wa-wahl`, active child `.on`. More than one may be `.on`.
- **A new progress bar:** `.wa-pegel > i` and set the width in percent as inline style.
- **A leaving sheet (not used yet):** when the app delays unmounting by 260 ms, add class `wa-geht` to the sheet; the
  keyframes `wa-sinkt` are in the block.

### 4. Motion

Tokens, declared once at the top of the CSS block (part 1): `--wa-t-fast` .14 s (a touch is answered),
`--wa-t-flow` .36 s (something flows to its next state), `--wa-t-settle` .62 s (something larger arrives and comes
to rest), `--wa-t-leave` .26 s; `--wa-ease-flow` (runs off at once, arrives softly), `--wa-ease-settle` (swings a
little past, comes to rest), `--wa-ease-drain` (lets go slowly, then gone). The script repeats four of these numbers
(`FLOW`, `LEVEL_MS`, `LEVEL_EASE`, `LEAVE_MS`) because the Web Animations API cannot read custom properties; they are
at the top of the section with a comment naming the token.

| What | How | Properties | Driven by |
|---|---|---|---|
| Sheet rises | keyframes `wa-steigt` on the sheet, `wa-kamm` on its `::before` | transform, opacity | CSS, on mount |
| Toast lands | keyframes `wa-landet` (falls 14 px, flattens, rounds off) | transform, opacity | CSS, on mount |
| Toast leaves | a copy with class `wa-geht` (keyframes `wa-geht`), removed after 260 ms | transform, opacity | look.js, removed node |
| Chosen bead flows | Web Animations API on the new label's `::before`: starts at the old label's box, stretches along the way, settles | transform | look.js, class change (one lost, one won) |
| Chosen bead wells up | the same, in place, when a label is chosen in addition | transform, opacity | look.js |
| Check fills / drains | transition on `.check::before` (scale .2 -> 1 with `--wa-ease-settle`; back with `--wa-ease-drain`) | transform, opacity | CSS, class `check--on` |
| Level runs to its place | Web Animations API on the `<i>`: `scaleX(old/new)` -> none, `--wa-ease-settle`; only for changes of 1.5 % or more | transform | look.js, inline width changed |
| Waterline runs in | transition of `background-size` on the field | **paint** (one small box, .36 s, only on focus) | CSS, `:focus` |
| Bead pressed | `scale(.92)` at once, springs back; background lights up | transform, background-color | CSS, `:active` |
| Ring on a sheet | the cards' ring | transform, opacity | look.js part 2 |

Nothing of this step moves at rest. Off: `@media (prefers-reduced-motion: reduce)` and
`:root[data-motion="reduziert"]` set `animation: none` / `transition: none` (part 5 of the block) and the script
checks `still()` before every animation; the toast copy is not made. Checked with `tools/wandel.mjs ... 1` (system
setting) and `tools/pruefen-rest.mjs` (the app's switch): no running animation of the look in any of the changes.

Not animated, and why: a sheet that closes (the app unmounts it at once; a copy of a whole form with fields, scroll
position and drop canvases would be fragile, and the app's own tests address `.sheet`); the entrance of cards after
a tab change (still the app's `rise`); the tick itself (it appears, the drop grows under it).

### 5. Changes in earlier blocks

`look.js`
1. Buttons, `SEL`: `.btn:not(.btn--ghost):not(.m-row .btn, .item .btn), .m-ico` - buttons inside list rows get no drop.
2. Karten und Leiste, `RING_ON`: `+ .sheet`; `DROP`: `.btn:not(.btn--ghost):not(.sheet__body .btn)` - on a sheet only
   the foot's buttons start a ring.

`look.css`
3. Both tone rules: one new token `--wa-sheet` after `--wa-dense` (43 tokens each, same order).
4. Mulde lists: `+ .sheet .item, .sheet .konto-side, .sheet .bereich-card, .sheet .tabs, .sheet .sim-item`;
   tappable: `+ .sheet .item--click, .sheet .sim-item`.
5. Flat pills (six rules): `.m-card` became `:is(.m-card, .sheet, .cmd, .toast)`.
6. Dichtes Wasser list: `+ .sheet, .toast, .cmd`.

Nothing else. `tools/robust.mjs`, `tools/bausteine.mjs` and `t/checks.mjs` still pass.

### 6. Pitfalls

1. **`:is()` takes the specificity of its strongest argument.** The Wahl rule lists `.pills > .pill`, so the whole
   rule is (0,3,0) and beats a later `.m-shell .tile { ... }`. Application rules for Wahl elements need three
   classes (`.m-shell .tiles > .tile`).
2. **A second background layer needs its own size on focus.** The field's focus rule sets
   `background-size: 100% 2px`; on a select that would stretch the arrow, so the select's focus rule comes AFTER
   it and names both layers.
3. **Inputs, selects and textareas cannot have `::before`.** Hence the waterline as a background layer and the one
   paint animation.
4. **A fill-mode `both` animation that ends with a transform overrides the element's own transform** (the toast).
   Never centre with a transform what the app animates in.
5. **The app moves a running print's progress a hair every second.** A CSS transition on the width would run all the
   time on a blurred card. The width does not ease; the script animates real changes only.
6. **React reuses the toast node** when one toast follows another, so no copy leaves then; a copy is only made when
   the node is removed. The copy carries the same classes for 260 ms (`.toast`, `.toast__undo`) but is `inert` and
   `aria-hidden`; a test that counts `.toast` right after it vanished will see it.
7. **`.bereich-card--on` marks the workspace in use with an inset box-shadow**; a block that sets `box-shadow` on
   rows must give it back (`.m-shell .sheet .bereich-card--on`).
8. **WebKit on the test machine** paints no backdrop-filter (so no blurred page behind a sheet), paints a white
   system select unless `appearance: none`, and starts entrance animations late. Judge the blur in Chromium.
9. **The scrim's blur is the cheap place.** Its backdrop is the resting page. A blur on the sheet would be redone
   with every picture of every drop on the sheet (15 a second).
10. **Playwright's `click()` on `.m-head .ws-chip` times out** (the chip is a span inside the brand button); use
    `evaluate(el => el.click())`.

### 7. What I verified, and how to repeat it

Servers: `python3 -m http.server 4310 --directory <lg>` (harness) and the app's `vite preview` on 4173. All commands
from `<lg>/final`; `<F>` is the absolute path of this folder. For WebKit run
`source <scratchpad>/judge-phone/env.sh` first - and NOT for Chromium afterwards in the same shell (it points
Playwright at a folder without Chromium).

| Check | Command | Result |
|---|---|---|
| The eleven screens of `real.mjs`, both tones, both engines | `node ../real.mjs <F> <F>/app chromium [klar]`, `... webkit [klar]` | `app/`, `app-klar/`, `app-webkit/`, `app-webkit-klar/`; only Open-Meteo network errors. In WebKit three of its pictures catch a late entrance (see 1). |
| Every sheet and overlay the shell can open (29 pictures) | `node tools/rundgang.mjs <F> <out> [chromium\|webkit] [ton] [only]` | `rundgang/`, `rundgang-klar/`, `rundgang-webkit/`, `rundgang-webkit-klar/` |
| The five steps of the project form | `node tools/formular.mjs <F> <out> [engine] [ton]` | `t/rest/form2/` |
| Changes of state at exact times (80, 200, 400, 800 ms) | `node tools/wandel.mjs <F> <out> [engine] [ton] [reduced: 1] [only]` | `wandel/`, `wandel-klar/`, `wandel-webkit/`: every strip names the animation it found; `wandel-reduziert/`: "(no animation)" in every strip |
| The ring on a sheet | `node tools/bogenring.mjs <F> <out.png>` | one ring, gold from "Weiter" |
| Contrast, real app, both tones, both engines | `node tools/kontrast-rest.mjs <F> <out> [engine] [ton]`, then `python3 tools/kontrast-rest.py <out> ...` | `mess/rest-kontrast.txt`: 31 probes. Lowest: placeholders 5.0 (floor 3), text 5.6 (worst 5 % of the chosen pill on a clear card; median 9.2). Everything else 6.5 or more. |
| Drops per screen, the app's switch "Bewegung: Reduziert", taps, clean-up | `node tools/pruefen-rest.mjs <F> [engine] [ton]` | `mess/rest-pruefen-chromium.txt`, `mess/rest-pruefen-webkit.txt`: at most 7 drops drawn; nothing moves with the switch; taps on bead, check (6 px beside it), pill, option (3 px above it) arrive; after `destroy()` no canvas, no helper, no global; no page errors |
| Blocks by class alone | `node tools/bausteine-rest.mjs <out.png> [ton=klar] [engine]` | all seven blocks animate on foreign elements, no errors |
| Entrances in WebKit really finish | `node tools/wk-eintritt.mjs <F> <out>` | cards and sheet reach opacity 1; start is sometimes delayed by up to a second on this machine |
| No WebGL in the real app | `node tools/ohne-webgl.mjs <F> <out> [ton]` | `t/rest/fb/`: plain glass buttons on the new sheets, calm and readable |
| Earlier checks still pass | `node tools/robust.mjs chromium`, `node tools/bausteine.mjs out.png`, `node t/checks.mjs chromium out` | all pass |
| Harness stills did not change | `node ../shot.mjs final <F>/shots [ton=klar]` against `../final-vor-rest/shots*` | differences only inside the moving drops (0.2 to 0.9 % of the pixels) |

Overview pictures for the owner: `rest-dunkel.png`, `rest-klar.png` (twelve screens each), `rest-vorher-nachher.png`,
`rest-bewegung.png` (the strips of `wandel/`).

### 8. Open

- **Never on a real phone.** Unverified there: the blurred scrim (`backdrop-filter: blur(5px)` on a full-screen fixed
  element), the feel of the sheet's rise, the bead's flow, the select with `appearance: none` on iOS, the hit areas.
- **A closing sheet is not animated.** Needs the app: delay the unmount by 260 ms and add class `wa-geht`.
- **Cards still enter with the app's `rise`** after a tab change. Life at rest for sheets and toast, the answer to
  scrolling and sleeping with the drops belong to the motion pass that follows this step.
- **The waterline is a paint animation** (`background-size`), the only one. A wrapper element around each field
  would allow a transform instead; the app has none.
- **Clear drops on a dark sheet are bright silver beads** (the lens formula of the colour step). Eight of them in
  "Einstellungen" are the loudest thing in a form. One shader line turns them down (see the colour step).
- **`<input type="number">`** shows white spin buttons in the Linux WebKit build; not checked on iOS (there are none).
- **The error toast** is styled (`.toast--bad`) but the app never sets that class.
- **Desktop:** nothing tried. The same blocks apply; the tokens of parts 1 and 2 sit on `.m-shell`.
- **`scripts/verify.mjs` was not run against a build with the look.** It clicks `.sheet .tile`, `.sheet .seg button`,
  `.toast__undo` - all still plain buttons; the toast copy (pitfall 6) is the one thing that could confuse it.
