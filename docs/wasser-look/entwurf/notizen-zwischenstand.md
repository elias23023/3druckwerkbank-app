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

Two helpers worked on this step. The first built it and was cut off by a restart of the machine during its final
renders; the second reviewed every screen again, fixed what the review found and finished it. Changes of the second
pass are marked **(2nd)**. State before the step: `../final-vor-rest` (never edit). State between the two helpers:
`t/z/vor-zweitem/`.

Everything of this step is in `look.css`, block `/* ---- Übrige Elemente ---- */` (appended at the end), and in
`look.js`, section `/* ---- Übrige Elemente ---- */` (appended at the end). The lines changed in earlier blocks are
listed in 5 and stored as diffs in `mess/rest-look.css.frueherer-teil.diff` and `mess/rest-look.js.frueherer-teil.diff`.

### 1. What the real app showed (nobody had looked before) and what was done

| Found in the running app | Done |
|---|---|
| Bottom sheets, search overlay and toast were the app's navy glass (97 %), forms had navy fields with a blue focus border, options were amber, the scrim was navy | all of it restyled (2, 3) |
| **The toast was not centred**: the app's entrance animation `rise` ends with `transform: translateY(0)` and so overrides the toast's own `translateX(-50%)`; its left edge stood in the middle of the screen and long texts wrapped into three lines. Also so in today's app. | the toast is centred by its margins (`left/right: 14px; width: fit-content; margin: 0 auto`), needs no transform, and sits `--wa-bar-lift + 78px` above the bottom so it clears the floating bar on an iPhone |
| **Icon buttons were dots**: `.m-shell .btn { padding: 10px 14px }` (mobile.css) beats `.btn--icon { padding: 6px }`, so the close "X" of every sheet, "skip" in the task rows and "remove" in the shopping list were squeezed to 2-6 px. Also so in today's app. | `padding: 0` in the Perle block; they are visible glass beads now |
| Drops in sheets read the sheet's computed navy background | the sheet states `--water-under: var(--wa-sheet)` |
| **(2nd) Drops on a sheet were the loudest thing in a form**: with the lens formula of the colour step a clear drop on the nearly black sheet came out as a bright silver bead; "Einstellungen" has eight of them | a sheet can say how much light its drops gather: `--wa-drop-veil` (new, read by the drops like `--wa-light`). Bottom sheets set `.35` (`--wa-bogen-veil`); cards keep 1. Picture of 1 / .55 / .3 / .1: `t/z/veil-1.png` (`tools/schleier.mjs`) |
| Pills outside cards (in sheets, in the search overlay) still had the glossy bead rim of the button block | the flat-pill rules now apply in `.sheet`, `.cmd`, `.toast` as well |
| Number tiles `.glass.m-stat`, the four header buttons, counters `.cnt.pill.xs` and ghost icon buttons in card titles | already right (the cards' author had handled the tiles); the ghost icon buttons became beads |
| Buttons that repeat per row ("Start" per printer, "+ Liste" per shortage) were live WebGL drops | kept out of the drops (`SEL` in look.js): plain glass beads. A screen draws at most 7 drops (Projekt), a sheet 2 to 4 at a time. |
| **(2nd) The water never came down from the pace of a touched drop while a sheet was open.** A drop that is pressed and then covered by the sheet it opened (every header button, "Neues Projekt", ...) is no longer drawn, so its press spring and its ring never ended; the loop took that for "a drop is being touched" and drew the drops ON the sheet 20 to 25 times a second instead of 15 (60 on a fast phone), and with a sheet without buttons it kept a 60-per-second timer alive doing nothing. A bug of the button code, present since the buttons. | one line in `scan()`: a drop that goes behind a sheet ends its press and ring. Measured before / after with `t/z/probe4.mjs`: 47, 49, 39 pictures per 2 s -> 25, 24, 24 |
| **(2nd) The drops kept flowing behind the search overlay** (15 pictures a second behind a full-screen blurred scrim) | the list of what covers the page is now `MODAL = '.sheet, .cmd-back'` (button section): 30 pictures per 2 s -> 0 (`t/z/probe3.mjs`) |
| **(2nd) Ticking a task on "Heute" gave no answer at all**: the app removes the ticked row in the same instant, so the check never shows its drop, and there is no toast (`real.mjs` photographs "app-toast" there - that picture never contains a toast; a real toast is in `rundgang*/s-toast.png`) | a check that is ticked on a card sends ONE ring over the floor of the card, in the green of its water (the cards' ring; lists `DROP`, `TICK` in look.js). It is the one thing that stays when the row is gone. Not in sheets, not when a tick is taken back. |
| **(2nd) The cards of a new screen still faded in with the app's `rise`** while everything around them moved like water | building block "Setzen": they rise 16 px, run 2 px past, sink back, one 45 ms after the other |
| **(2nd) An empty native checkbox was a white square on the dark sheet, the calendar sign of a date field black on black** | `color-scheme: dark` on inputs, selects and textareas inside the shell |
| A `<select>` is a white system box with invisible white text in the Linux WebKit build (also in today's look) | selects draw their own trough and arrow (`appearance: none`), identical in every browser |
| The sheet got a blue focus ring when opened by keyboard (the app focuses the `<aside>`) | `.sheet:focus { outline: none }` |
| In the WebKit build of the test machine entrance animations start late, so a picture taken 700 ms after a tap can show a half-risen card or sheet | **(2nd)** measured with `tools/wk-stau.mjs` (`mess/rest-wk-stau.txt`): the first frame after a screen mounts takes a little more than 100 ms in that build, which paints everything on the CPU; taking away any ONE of the costly things (the backdrop filters, the depth steps, the cards' soft box-shadows, the drop canvases) brings the start of the entrance back under 120 ms, and after that the animation runs on time. Not a defect of the look, but the one place where a real iPhone could show a hitch (see 8). Use `tools/rundgang.mjs` (waits longer) next to `real.mjs`. |

### 2. Dosage as built

| Element | Level | What it is now |
|---|---|---|
| Bottom sheet `.sheet` | 2 | Bogen: dense water (`--wa-sheet`: .95 dunkel, .88 klar), soft uneven shoulders, meniscus on the top edge only, no depth steps. Rises like a wave (68 px, runs 5 px past, settles; a crest of light on its top edge spreads and fades). No backdrop blur of its own. |
| Scrim `.sheet-back`, `.cmd-back` | 2 | neutral dark (.55) and `blur(5px)`: the page sinks out of focus, its words cannot be read, its shapes stay |
| Sheet head / body / foot | 2 | head and body plain; the foot begins with one faint line (`--wa-shore`); `safe-area-inset-bottom` as padding of the sheet |
| Drops on a sheet | 3, turned down | clear drops that gather about a third of the light they gather on a card (`--wa-bogen-veil: .35`): rim, highlight and a soft glow at the far end, a dark clear body. Amber and red are unchanged. |
| Ring on a sheet | 2 | only from the non-ghost buttons in `.sheet__foot` (gold from the primary), as on cards |
| Toast `.toast` | 2 | Tropfen-Hinweis: a small piece of dense water with the bar's rim. Lands like a drop, leaves like one. Error variant ready (`.toast--bad` / `.wa-hinweis--fehler`: rose rim line), the app has no error toast yet. |
| Search overlay `.cmd` | 2 | the same dense water, card outline; chosen hit = lit trough; the drops behind it rest |
| Cards of a new screen | 2 | Setzen: they come to rest like water instead of fading in |
| Text field, textarea, select | 1 | Feld: a Mulde with a faint line on its far wall so an empty field is found. Focus: the Wasserlinie (2 px light) runs in from the left, light pools above it, a faint line all around. Replaces the blue border. |
| Pill groups, option groups `.seg`, tabs in sheets `.tabs`, tiles `.tile`, picture tiles `.island-lib > button` | 1 | Wahl: flat tinted labels (tiles: troughs); the chosen one is a small bead of clear water that flows over from the one chosen before |
| Check `.check` | 1 | Haken: an empty hollow; ticked, a drop of green water fills it and swings in; unticked, it drains. Hit area 44 px. On a card a tick also sends one green ring over the floor. |
| Progress `.progress`, form steps `.steps` | 1 | Pegel: light water in a thin dark tube, brighter towards its end; a new level runs there with a small swing |
| Icon buttons (ghost): close, skip, remove, reorder, "more" in card titles | 1 | Perle: glass bead, no bending, no script; gives way under the finger and springs back |
| Buttons inside list rows | 1 | plain glass (the no-WebGL look of the button block), lighter, no heavy shadow |
| Rows in sheets `.item`, `.konto-side`, `.bereich-card`, `.sim-item` | 1 | Mulde, as in cards |
| Status pills in sheets | 1 | flat tinted labels, as on cards |
| Slider `.range`, native checkbox, date field | 1 | tint only: `accent-color` (the app's amber) and `color-scheme: dark` |
| Text, icons, photos, thumbs, swatches, colour stacks `.stack`, hours strip | 0 | untouched; only `.hour.now` lost its blue tint |
| Desktop | 0 | every rule is under `.m-shell` |

Less than the dosage table said, on purpose: sheets have no backdrop blur of their own and are denser than "about .8"
(a form with twenty labels needs calm ground; the scrim carries the blur); drops on sheets gather a third of the
light; the toast and the search overlay use the bar's material unchanged; ghost text buttons ("Abbrechen",
"Bearbeiten") stay chrome-free. More than the table said: the ring from a ticked check on a card.

### 3. Building blocks and recipes

All defined in part "3. Bausteine" of the CSS block. Tokens in parts 1 and 2 (same in every tone). Tone tokens used:
`--wa-sheet` (new, in both tone rules), `--wa-dense`, `--wa-trough*`, `--wa-core`, `--wa-light`, `--wa-dark`,
`--wa-abyss`, `--wa-ink-*`. `tools/bausteine-rest.mjs` puts every block on foreign elements by class alone
(Setzen and the check's ring: `t/z/probe7.mjs`).

| Block | Class (app selector in the same list) | What the element needs | Script |
|---|---|---|---|
| Bogen | `.wa-wasser--dicht.wa-bogen` (`.sheet`) | its own position at the bottom edge, `overflow: hidden`, padding; a scrim behind it with `background: var(--wa-scrim); backdrop-filter: var(--wa-scrim-blur)` | ring: it is in `RING_ON`; drops behind it rest: `MODAL` |
| Tropfen-Hinweis | `.wa-wasser--dicht.wa-hinweis` (`.toast`); error: `.wa-hinweis--fehler` | position, padding | leaving: list `TOAST` |
| Setzen | `.wa-setzt` (`.glass.m-card`) | nothing; several at once: `animation-delay` in steps of `--wa-t-step` | none |
| Feld | `.wa-feld` (`.input`, `.textarea`); a select: `.wa-feld.wa-feld--auswahl` (`.select`) | padding, font size 16 px (iOS zooms below that) | none |
| Wahl | group `.wa-wahl`, its children are the labels, the chosen one has class `on` (`.pills > .pill` / `pill--on`, `.seg > button`, `.tabs > button`, `.tiles > .tile`, `.island-lib > button`) | padding per label; the group may wrap | flow: lists `GROUP`, `ON` |
| Haken | `.wa-haken`, ticked: class `on` (`.check`, `.check--on`) | width, height, `border-radius: 50%`; the tick is the app's own SVG | ring on a Becken: lists `DROP`, `TICK` (section "Karten und Leiste") |
| Pegel | `.wa-pegel > i` (`.progress > i`), amber: `.wa-pegel--amber` | tube: height, radius, `overflow: hidden`; `<i>`: `display: block; height: 100%; width: <n>%` as inline style | flow: list `LEVEL` |
| Perle | `.wa-perle` (`.btn.btn--icon.btn--ghost`) | width and height (32-36 px) | none |

To apply a block to another element: give it the class, or add its selector to the `:is(...)` list of the block
(three places for Wahl: label, chosen label, chosen label's `::before`). For a script-driven block also add the
selector to the list named in the table, at the top of the script section.

Recipes:
- **A new bottom sheet or modal (also desktop):** `.wa-wasser--dicht.wa-bogen`; change `--wa-r-bogen` to four round
  corners and drop the `0 30px 0 0` layer of its box-shadow if it does not touch the bottom edge; rows inside are
  `.wa-mulde`, fields `.wa-feld`. Put the blur on the scrim, never on the sheet. Add its selector (or its scrim's) to
  `MODAL` in the button section of look.js, so the drops behind it rest.
- **How bright the clear drops on a surface are:** set `--wa-drop-veil` on the surface (0 = only rim and highlight,
  1 = the silver drops of the cards). The drops read it within a second, at once after a class change.
- **A new field:** `.wa-feld`. Do not give it a border; its 1 px transparent border is today's space.
- **A new group of options:** container `.wa-wahl`, active child `.on`. More than one may be `.on`.
- **A new progress bar:** `.wa-pegel > i` and set the width in percent as inline style.
- **Panels that appear together (a desktop column):** `.wa-setzt` on each, `animation-delay: calc(var(--wa-t-step) * n)`.
- **A leaving sheet (not used yet):** when the app delays unmounting by 260 ms, add class `wa-geht` to the sheet; the
  keyframes `wa-sinkt` are in the block.

### 4. Motion

Tokens, declared once at the top of the CSS block (part 1): `--wa-t-fast` .14 s (a touch is answered),
`--wa-t-flow` .36 s (something flows to its next state), `--wa-t-settle` .62 s (something larger arrives and comes
to rest), `--wa-t-leave` .26 s, `--wa-t-step` 45 ms (things that arrive together, one after the other);
`--wa-ease-flow` (runs off at once, arrives softly), `--wa-ease-settle` (swings a little past, comes to rest),
`--wa-ease-drain` (lets go slowly, then gone). **(2nd)** The script no longer repeats these numbers: it reads the
properties from `.m-shell` at the moment of a change (lists `T` and `E` at the top of the section; the numbers
there are only used when a property is missing). Change a duration in look.css and CSS and script follow.

Motion tokens of the EARLIER blocks, for the colleague who reviews all motion (not changed here): `--wa-press-in`
60 ms / `--wa-press-out` .5 s (a trough under the finger), `--wa-ring-time` 1.2 s / `--wa-ring-ease` /
`--wa-ring-hush` .18 s, `--wa-bead-time` .42 s / `--wa-bead-ease`, `--wa-tab-time` .26 s / `--wa-tab-ease` /
`--wa-tab-in` 70 ms, and in look.js `FLIGHT` 460 ms, `FLIGHT_MORE` 70 ms (flight of the tab bar's bead),
`RING_LIFE`, `HUSH`, `SLEEP_AFTER` 30 s.

| What | How | Properties | Driven by |
|---|---|---|---|
| Sheet rises | keyframes `wa-steigt` on the sheet, `wa-kamm` on its `::before` | transform, opacity | CSS, on mount |
| Cards of a new screen settle **(2nd)** | keyframes `wa-setzt` on each card, staggered by `--wa-t-step` (0 to 180 ms) | transform, opacity | CSS, on mount |
| Toast lands | keyframes `wa-landet` (falls 14 px, flattens, rounds off) | transform, opacity | CSS, on mount |
| Toast leaves | a copy with class `wa-geht` (keyframes `wa-geht`), removed after 260 ms | transform, opacity | look.js, removed node |
| Chosen bead flows | Web Animations API on the new label's `::before`: starts at the old label's box, stretches along the way, settles | transform | look.js, class change (one lost, one won) |
| Chosen bead wells up | the same, in place, when a label is chosen in addition | transform, opacity | look.js |
| Check fills / drains | transition on `.check::before` (scale .2 -> 1 with `--wa-ease-settle`; back with `--wa-ease-drain`) | transform, opacity | CSS, class `check--on` |
| Ring from a ticked check on a card **(2nd)** | the cards' ring (`wa-ring`), class `wa-ring--ok` | transform, opacity | look.js part "Karten und Leiste", pointerdown |
| Level runs to its place | Web Animations API on the `<i>`: `scaleX(old/new)` -> none, `--wa-ease-settle`; only for changes of 1.5 % or more | transform | look.js, inline width changed |
| Waterline runs in | transition of `background-size` on the field | **paint** (one small box, .36 s, only on focus) | CSS, `:focus` |
| Bead pressed | `scale(.92)` at once, springs back; background lights up | transform, background-color | CSS, `:active` |
| Ring on a sheet | the cards' ring | transform, opacity | look.js part 2 |

Nothing of this step moves at rest. Off: `@media (prefers-reduced-motion: reduce)` and
`:root[data-motion="reduziert"]` set `animation: none` / `transition: none` (part 5 of the block) and the script
checks `still()` before every animation; the toast copy is not made, no ring starts. Checked with
`tools/wandel.mjs ... 1` and `tools/haken-ring.mjs ... 1` (system setting) and `tools/pruefen-rest.mjs` (the app's
switch): no running animation of the look in any of the changes.

Not animated, and why: a sheet that closes (the app unmounts it at once; a copy of a whole form with fields, scroll
position and drop canvases would be fragile, and the app's own tests address `.sheet`); a row that the app removes
(the ticked task on "Heute" is gone in the same frame - only the ring answers); the tick itself (it appears, the
drop grows under it).

**For the motion pass that follows** (life at rest, the answer to scrolling, sleeping and waking together):
- Sleep and wake: the water loop of the button section knows it (`SLEEP_AFTER`, `wake()`, `speed` 1 -> 0). Nothing
  of this step runs at rest, so nothing has to be put to sleep yet. A resting-life layer should stop when
  `window.__w3` reports no frames, when `.m-shell` contains an element matching `MODAL`, and when the page is hidden.
- Free pseudo-elements: `.sheet::after`, `.toast::before` / `::after`, `.m-tabs::after`, `.m-row::before/::after`,
  `.m-stat::before/::after`, `.cmd::before/::after`. Taken: see the header comment of the CSS block.
- A card already carries an entrance animation on itself (`wa-setzt`, transform + opacity, fill `both`). A second
  animation on the card element would replace it; put resting life on a child layer or use the Web Animations API
  with `composite: 'add'`.
- Every picture of a drop makes the browser redo the backdrop blur of the sheet it lies on; the scrim of a bottom
  sheet is blurred once because the page behind it rests. Keep it that way: nothing may move UNDER an open scrim.

### 5. Changes in earlier blocks

`look.js`, button section
1. `SEL`: `.btn:not(.btn--ghost):not(.m-row .btn, .item .btn), .m-ico` - buttons inside list rows get no drop.
2. **(2nd)** `PROP.veil = '--wa-drop-veil'`, uniform `uVeil` (declared, in `UNI`, set per drop, read in `measure()`,
   default 1) and ONE factor in the shader: the veil of light of a drop on a sheet is multiplied by `uVeil`
   (`... room*uWet*uVeil*(.056 + ...)`). With the property missing nothing changes: cards and free drops are
   pixel-identical to before (harness stills differ only inside the moving drops, 0 to 0.3 % of the pixels).
3. **(2nd)** `MODAL = '.sheet, .cmd-back'` replaces the literal `'.sheet'` in `scan()`.
4. **(2nd)** `scan()`: `if (r.behind) { r.ptarget = r.pv = r.pvel = 0; r.ripT = -1; }` - see the finding in 1.

`look.js`, section "Karten und Leiste"
5. `RING_ON`: `+ .sheet`; `DROP`: `.btn:not(.btn--ghost):not(.sheet__body .btn)` - on a sheet only the foot's
   buttons start a ring.
6. **(2nd)** `DROP`: `+ .m-card .check, .wa-becken .wa-haken`; new list `TICK` / `TICKED`; `down()` skips a check
   that is already ticked and gives the ring the class `wa-ring--ok`.

`look.css`
7. Both tone rules: one new token `--wa-sheet` after `--wa-dense` (43 tokens each, same order).
8. Mulde lists: `+ .sheet .item, .sheet .konto-side, .sheet .bereich-card, .sheet .tabs, .sheet .sim-item`;
   tappable: `+ .sheet .item--click, .sheet .sim-item`.
9. Flat pills (six rules): `.m-card` became `:is(.m-card, .sheet, .cmd, .toast)`.
10. Dichtes Wasser list: `+ .sheet, .toast, .cmd`.

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
   system select unless `appearance: none`, shows spin buttons in number fields, and takes more than 100 ms for the
   first frame of a new screen. Judge the blur in Chromium.
9. **The scrim's blur is the cheap place.** Its backdrop is the resting page. A blur on the sheet would be redone
   with every picture of every drop on the sheet (15 a second).
10. **Playwright's `click()` on `.m-head .ws-chip` times out** (the chip is a span inside the brand button); use
    `evaluate(el => el.click())`.
11. **(2nd) Anything that hides a drop without unmounting it must end its press.** A drop that is covered while its
    spring or ring is still running keeps the loop at full pace for as long as it stays covered (fixed for `MODAL`;
    remember it for any new way of covering the page, for example a desktop dialog outside `.m-shell`).
12. **(2nd) React writes `name` and `type` on every input each time the app re-renders** (once a second while a print
    runs). An observer that listens to all attributes fires 20 times a second. Filter by attribute name
    (`attributeFilter`) and check `m.attributeName` before reading `oldValue`.
13. **(2nd) Web Animations cannot read custom properties, `getComputedStyle` can.** The script resolves
    `--wa-t-*` and `--wa-ease-*` from `.m-shell` when a change happens; do not copy the numbers into JS.
14. **(2nd) A local helper named `ms` shadows the usual name of a MutationObserver's records** (`function (ms)`).
    The duration helper is called `dur`.
15. **(2nd) `real.mjs` writes `app-toast.png` after ticking a task on "Heute" - the app shows no toast there.** The
    picture is a ticked task (with the ring passing), not a toast.
16. **(2nd) The harness page and the real app differ in what makes a screen "new".** In the app React remounts the
    cards on a tab change (so `wa-setzt` runs); a pill filter, a ticked check or a changed select do NOT remount
    them (checked with `t/z/probe1.mjs`: no entrance animation restarts).

### 7. What was verified, and how to repeat it

Servers: `python3 -m http.server 4310 --directory <lg>` (harness) and the app's `vite preview` on 4173 (both are
gone after a restart of the machine). All commands from `<lg>/final`; `<F>` is the absolute path of this folder.
For WebKit run `source <scratchpad>/judge-phone/env.sh` first - and NOT for Chromium afterwards in the same shell
(it points Playwright at a folder without Chromium). Everything at once: `t/z/final-render.sh` (about 30 minutes).

| Check | Command | Result |
|---|---|---|
| The eleven screens of `real.mjs`, both tones, both engines | `node ../real.mjs <F> <F>/app chromium [klar]`, `... webkit [klar]` | `app/`, `app-klar/`, `app-webkit/`, `app-webkit-klar/`; only Open-Meteo network errors |
| Every sheet and overlay the shell can open (29 pictures) | `node tools/rundgang.mjs <F> <out> [chromium\|webkit] [ton] [only]` | `rundgang/`, `rundgang-klar/`, `rundgang-webkit/`, `rundgang-webkit-klar/` |
| Changes of state at exact times (80, 200, 400, 800 ms) | `node tools/wandel.mjs <F> <out> [engine] [ton] [reduced: 1] [only]` | `wandel/`, `wandel-klar/`, `wandel-webkit/`: every strip names the animation it found; `wandel-reduziert/`: "(no animation)" in every strip |
| A check ticked with a real press: ring, drop, level | `node tools/haken-ring.mjs <F> <out> [engine] [ton] [reduced: 1]` | `wandel*/haken-ring-heute.png`, `haken-ring-projekt.png` |
| The ring on a sheet | `node tools/bogenring.mjs <F> <out.png>` | one ring, gold from "Weiter" |
| Drops on a sheet at several strengths of light | `node tools/schleier.mjs <F> <out.png> [ton] [values]` | `t/z/veil-1.png` |
| Water pictures per 2 s at rest, with sheets, with the search overlay | `node t/z/probe3.mjs <F>`, `node t/z/probe4.mjs <F>` | 30 at rest; 0 behind a sheet without buttons and behind the search overlay; 24 to 30 with drops on a sheet |
| Contrast, real app, both tones, both engines | `node tools/kontrast-rest.mjs <F> <out> [engine] [ton]`, then `python3 tools/kontrast-rest.py <out> ...` | `mess/rest-kontrast.txt`: 31 probes, see below |
| Drops per screen, water pictures per second, the app's switch "Bewegung: Reduziert", taps, clean-up | `node tools/pruefen-rest.mjs <F> [engine] [ton]` | `mess/rest-pruefen-*.txt`: at most 7 drops drawn, 10 to 16 pictures a second (0 behind a sheet without buttons); nothing moves with the switch; taps on bead, check (6 px beside it), pill, option (3 px above it) arrive; after `destroy()` no canvas, no helper, no global; no page errors |
| Blocks by class alone | `node tools/bausteine-rest.mjs <out.png> [ton=klar] [engine]`, `node t/z/probe7.mjs` | every block animates on foreign elements, no errors |
| Why entrances start late in the WebKit build | `node tools/wk-stau.mjs <F> webkit` | `mess/rest-wk-stau.txt` |
| No WebGL in the real app | `node tools/ohne-webgl.mjs <F> <out> [ton]` | `t/z/fb-final*/`: plain glass buttons on the new sheets, calm and readable |
| Earlier checks still pass | `node tools/robust.mjs chromium`, `node tools/bausteine.mjs out.png`, `node t/checks.mjs chromium out` | all pass |
| Harness stills did not change | `node ../shot.mjs final <F>/shots [ton=klar]` against `../final-vor-rest/shots*` | differences only inside the moving drops (0 to 0.3 % of the pixels) |

**Contrast** (WCAG, the computed text colour against the pixels really behind the glyphs, text-shadow not counted;
median, worst 5 % of the glyph pixels in brackets where it is lower; real app, Chromium; the WebKit build without any
backdrop blur is within 0.4 of these except where noted). Floor 4.5, placeholders 3. Full table of 31 probes in both
engines: `mess/rest-kontrast.txt`.

| Text | dunkel | klar |
|---|---|---|
| Field label, 12 px | 11.5 | 12.8 |
| Typed text in a field, 16 px | 18.2 | 16.8 (15.9) |
| Placeholder in a field, 16 px | 5.0 | 7.4 |
| Text of a select, 16 px | 18.2 | 16.8 |
| Chosen option / other option, 12 px | 12.4 (11.5) / 10.3 | 11.2 (10.2) / 11.4 |
| Chosen tab in a sheet / other tab | 13.6 (12.5) / 10.9 | 12.0 (10.8) / 12.0 |
| Chosen filter pill on a card / other pill | 11.9 (10.6) / 10.1 | 9.5 (5.7) / 10.7 (7.5) |
| Status label in a sheet (warn / bad) | 10.7 / 11.0 | 9.5 / 9.9 |
| Title of a sheet, 18 px | 17.3 | 16.0 (14.7) |
| Text in a sheet, 12 px | 17.3 | 16.0 |
| Small muted text in a sheet, 11 px | 11.8 | 13.7 |
| Row in a sheet: title / muted line | 18.2 / 10.0 | 16.8 / 10.8 |
| Tile in the form: title / small line | 18.2 / 12.2 | 16.7 / 14.3 |
| Hit in the search overlay, small text | 9.0 | 8.7 |
| Check row on a card: title / small muted line | 17.3 / 9.7 | 9.6 / 6.6 |
| Select on a card / placeholder on a card | 18.0 / 5.0 | 14.5 (10.1) / 6.9 (5.8) |
| Toast text, 13 px / "Rückgängig" | 17.0 / 11.3 | 15.0 (11.8; WebKit without blur 9.2) / 10.1 |

Lowest text value anywhere: 5.6 (worst 5 % of the chosen filter pill on a clear card over the bright scene; its median
is 9.2 to 9.5). Lowest placeholder: 5.0. Nothing is under the floor in either tone or engine.

Overview pictures for the owner (made by `tools/rest-bild.py`): `rest-dunkel.png`, `rest-klar.png` (twelve screens
each), `rest-vorher-nachher.png`, `rest-bewegung.png` (strips of `wandel/`).

### 8. Open

- **Never on a real phone.** Unverified there: the blurred scrim (`backdrop-filter: blur(5px)` on a full-screen fixed
  element), the feel of the sheet's rise and of the settling cards, the bead's flow, the select with
  `appearance: none` on iOS, the hit areas, `color-scheme: dark` on the native date picker.
- **First frame of a new screen.** Each card paints about a dozen soft box-shadows (rim, depth steps, troughs) once
  when it mounts. The software WebKit build needs a little more than 100 ms for the first frame of a screen; box-shadows
  are rasterised on the CPU on a phone as well. If the settle of a new screen stutters at its start on the iPhone,
  the first thing to try is a smaller `--wa-deep-soft` / `--wa-shelf-soft`, the second `--wa-t-step: 0ms`.
- **A closing sheet is not animated.** Needs the app: delay the unmount by 260 ms and add class `wa-geht`.
- **A removed row is not animated** (ticked task, deleted shopping item). Needs the app as well.
- **Life at rest for cards, bar, sheets and toast, the answer to scrolling, and sleeping with the drops** belong to
  the motion pass that follows this step.
- **The waterline is a paint animation** (`background-size`), the only one. A wrapper element around each field
  would allow a transform instead; the app has none.
- **`<input type="number">`** shows white spin buttons in the Linux WebKit build; not checked on iOS (there are none).
- **The error toast** is styled (`.toast--bad`) but the app never sets that class.
- **Desktop:** nothing tried. The same blocks apply; the tokens of parts 1 and 2 sit on `.m-shell`.
- **`scripts/verify.mjs` was not run against a build with the look.** It clicks `.sheet .tile`, `.sheet .seg button`,
  `.toast__undo` - all still plain buttons; the toast copy (pitfall 6) is the one thing that could confuse it.


## Decision of the owner, 13.11.: the red of "Löschen"
He was shown two strengths (final/loeschen-vergleich.png) and took the main designer's recommendation: strength B (deeper, quieter: `--wa-drop-red: 150, 28, 38, .7`) on the tone "dunkel", strength A (clear red: `189, 31, 41, .72`) on the tone "klar". The token sits in the first rule of look.css; the tone "klar" overrides it in its own block. Renders made before this change still show A on "dunkel".


---

## Step "Bewegung": everything is alive - one calm motion language, light at rest, the pull of scrolling, sleep

State before this step: `../final-vor-bewegung` (never edit that copy; `tools/bw-takt.mjs` and the cadence runs compare
against it). The owner's wish behind it (R8): "bitte vergiss nicht das alles dynamisch animiert sein soll" - everything
is dynamically animated, as one coherent, calm language. It overrides the earlier plan of surfaces that stand perfectly
still at rest; sentences in the sections above such as "nothing moves at rest" describe the state before this step.

Files: `look.css`, new block `/* ---- Bewegung ---- */` at the end (the motion language, rest, the lights);
`look.js`, new last section `/* ---- Bewegung ---- */` (94 lines: light helper, pull of scrolling), and a few lines in the
button section (the water's clock announces rest). look.css is now 1301 lines (93 KB), look.js 1160 lines (80 KB, four
self-contained sections). Diffs against the state before: `mess/bewegung-look.css.diff`, `mess/bewegung-look.js.diff`,
and only the earlier parts of each file: `mess/bewegung-look.js.frueherer-teil.diff` (11 lines out, 30 in),
`mess/bewegung-look.css.frueherer-teil.diff` (34 out, 40 in).

### 1. What moves when (the inventory, as built)

| Element | At rest | On touch | While scrolling | On a change of state |
|---|---|---|---|---|
| Drop buttons (`.btn` not ghost, `.m-ico`), level 3 | always alive: flowing outline, ripples, moving highlight (WebGL, 15 pictures a second). NEW: the glint under a drop on a sheet breathes with the swelling of its drop (27 s) | spreads, the glint flares, a ring runs from the finger | the picture inside follows the landscape frame by frame | follows a card that slides in; a press ends when a sheet covers the drop |
| Cards (`.glass.m-card`), level 2 | NEW: a glint with a soft glow wanders along the lit (top) rim and back (24 s), a second one along the far (bottom) rim the other way (34 s); both swell and breathe; every card starts at another point of the loop | flare and ONE ring over the floor, from a drop or a check on the card (1.1 s) | NEW: the light leans - deeper on the lit rim, drawn back on the far rim, up to 60 % - and both glints slide up to 20 px along their rim; when the list stops they swing back, damped (1.1 s) | CHANGED: the card itself arrives with the app's own short "rise" (0.42 s), one 40 ms after the other; NEW: its light arrives 60 % too deep and swings into place (1.1 s) |
| Tab bar (`.m-tabs`), level 2 | NEW: one glint wanders along its top rim (40 s) | icon and label of a tab give way and spring back | - (it does not travel with the list) | the marker flows to the new tab (0.46 s, 70 ms more per further tab) |
| Bottom sheet (`.sheet`), level 2 | NEW: one soft glint on its top rim (40 s) | the ring, from its foot buttons only | NEW: its light leans and slides with the scrolling of its body, swings back | rises like a wave and settles (0.62 s), a crest of light spreads and fades (1.1 s). Closing: gone in one frame (the app unmounts it) |
| Scrim behind a sheet / the search | - | - | - | the app's own fade |
| Toast (`.toast`), level 2 | NEW: a small glint along its top rim (12 s loop - it only lives a few seconds) | - | - | lands like a drop (0.62 s), leaves like one (0.26 s) |
| Search panel (`.cmd`), level 2 | NEW: one glint along its top rim (40 s) | the chosen hit is lit | - | the app's own entrance |
| Rows and tiles in cards and sheets, level 1 | - | a tappable row lights up at once (60 ms) and settles (0.62 s) | - (carried by their card) | - (a row the app removes is gone in one frame) |
| Fields, level 1 | - | - (typing never causes an effect) | - | the waterline runs in on focus (0.36 s) |
| Pills, options, tabs in sheets, tiles, level 1 | - | tint under the finger | - | the bead of the chosen one flows over from the old choice (0.36 s and up); wells up where several may be chosen |
| Check, level 1 | - | on a card: one green ring over the floor | - | a drop fills the circle from the middle and swings in (0.36 s); drains when unticked |
| Progress bar, level 1 | - | - | - | a real change of level (1.5 % or more) runs to its place with a small swing (0.62 s) |
| Icon beads, per-row buttons, level 1 | - | give way (scale .92) and spring back | - | - |
| Ghost text buttons | - | a film of water under the finger | - | - |
| Free number tiles (`.glass.m-stat`), slider, checkbox, date field | - | native | - | native |
| Text, icons, photos, charts, header, the scene (level 0); desktop | - (the scene's 2 s crossfade on a tab change is the app's own) | - | - | - |

Dead on purpose or for lack of a hook: a closing sheet, a removed row, the free number tiles, the header. The drops
do not lean when the list is scrolled (they follow it; their code was left alone).

### 2. The motion language (look.css, block "Bewegung", part "1. Die Sprache")

ONE place declares every duration and easing of the look. The tokens of the previous step moved there unchanged
(`--wa-t-fast`, `--wa-t-flow`, `--wa-t-settle`, `--wa-t-leave`, `--wa-ease-flow`, `--wa-ease-settle`, `--wa-ease-drain`);
the earlier blocks keep their own names but point at the language:

| Token | Value | Meaning | Earlier names that now point at it |
|---|---|---|---|
| `--wa-t-touch` | 60 ms | under the finger, at once | `--wa-press-in` (was 60 ms), `--wa-tab-in` (was 70 ms) |
| `--wa-t-fast` | 0.14 s | a touch is answered; something sinks away | `--wa-ring-hush` (was 0.18 s) |
| `--wa-t-leave` | 0.26 s | something leaves, or springs back | `--wa-tab-time` (was 0.26 s) |
| `--wa-t-flow` | 0.36 s | something flows from one place or state to the next | `--wa-bead-time` = flow + 0.1 s (was 0.42 s in CSS and 460 ms in look.js - now one value, the script reads it) |
| `--wa-t-settle` | 0.62 s | something larger arrives and comes to rest | `--wa-press-out` (was 0.5 s) |
| `--wa-t-wave` | 1.1 s | light travels over a sheet or swings back | `--wa-ring-time` (was 1.2 s), `--wa-kamm-t` (was 1.05 s), the swing after scrolling, the arrival of a card's light |
| `--wa-t-step` | 40 ms | things that arrive together come one after the other | (was 45 ms) |
| `--wa-t-ruhe-1/-2/-3/-kurz` | 24 / 34 / 40 / 12 s | loops at rest (lit rim, far rim, bars and sheets, toast) | new |
| `--wa-gang-1/-2/-3/-kurz` | `steps(24)` ... , in WebKit `linear` | the "gait" of those loops, see 4 | new |
| `--wa-ease-flow` | cubic-bezier(.3,.7,.2,1) | runs off at once, arrives softly | |
| `--wa-ease-settle` | cubic-bezier(.3,1.45,.5,1) | arrives, a little past, rests | `--wa-bead-ease` (was 1.3), `--wa-tab-ease` (was 1.4) |
| `--wa-ease-drain` | cubic-bezier(.55,0,.85,.45) | lets go slowly, then gone | |
| `--wa-ease-wave` | cubic-bezier(.3,.5,.6,1) | a ring that spreads | `--wa-ring-ease` (unchanged) |
| `--wa-ease-swing` | a damped swing as `linear(...)`: 16 % past the rest after a third of the time, 3 % back, still; `--wa-ease-settle` where the browser has no `linear()` | water that was moved and is let go | new |

Not on the scale, on purpose: the constants of the WebGL drops (`SLEEP_AFTER` 30 s, the press spring, the governor), the
clean-up timers of helpers (`RING_LIFE`, `HUSH`), and the app's own `--t-fast` in the plain glass without WebGL.
Light comes from the upper left everywhere: drops, cards, bead, and now the wandering lights (the bright "lit" light
on the top rim, the warm gathered light on the far, bottom rim).

### 3. Building blocks and recipes

| Block | Where | What it is | To put it on another element |
|---|---|---|---|
| **Licht** (`.wa-licht`) | CSS "Bewegung" 3 + look.js "Bewegung" 1 | a helper `<i class="wa-licht" aria-hidden>` as last child of a sheet; its `::before` is the light on the lit rim, its `::after` the light on the far rim. Each is a half ellipse whose flat side lies ON the rim line: a 2 px glint on the line, a bloom close to it, a soft glow 18 / 24 px deep. They only ever slide along the rim or grow from it, so nothing has to clip them. | add the selector to `LIGHT_ON` in look.js (the sheet needs a position and `isolation: isolate`; Becken and "dichtes Wasser" have both). A Becken (`.wa-becken`) gets it by itself. |
| **Lichtlauf** (`.wa-lichtlauf`) | CSS "Bewegung" 3 | the same light as the `::after` of a dense sheet that has that pseudo-element to spare and is never scrolled along: bar, toast, search | give the element the class, or add it to the `:is(...)` list; it needs a position and `isolation: isolate` |
| **Zug** (`--wa-zug`, attribute `data-wa-zieht`) | CSS "Bewegung" 3 + look.js "Bewegung" 2 | the pull of scrolling on a light helper, -1 .. 1; CSS turns it into `scale` (lean) and `translate` (slide) | add the scrolling element to `SCROLLER` in look.js; the helpers inside it and the helper of the sheet around it are pulled |
| **Schwappen** (`wa-schwappt-oben/-unten`) | CSS "Bewegung" 3 | a new helper's lights start displaced and swing into place, once | nothing: every new helper does it (a bottom sheet switches it off, it has its crest) |
| **Ruhe** (`data-wa-ruht`, `--wa-lauf`) | CSS "Bewegung" 2 + look.js button section | see 4 | give every loop at rest `animation-play-state: var(--wa-lauf)` |

Recipe, a new sheet with light (for example a desktop panel made of "stilles Wasser"):

```css
.my-panel { position: relative; isolation: isolate; }           /* plus the material, see the recipe of the step "Farbe" */
```
```js
var LIGHT_ON = '.glass.m-card, .wa-becken, .sheet, .wa-bogen, .my-panel';      // look.js, section "Bewegung"
var SCROLLER = '.m-main, .sheet__body, .my-scrolling-column';                    // if it lives in something that scrolls
```

Recipe, a new loop at rest for something else: transform and opacity only, on a layer of its own; eight equal keyframe
intervals (`tools/bw-keyframes.mjs` prints them); `animation: <name> var(--wa-t-ruhe-N) var(--wa-gang-N) infinite;
animation-play-state: var(--wa-lauf);` and the element in both "no motion" lists of part 5 of the block.

Tuning, all tokens: how bright (`--wa-glanz`, `--wa-glanz-linie`, `--wa-glanz-fern`, `--wa-glanz-fern-linie` - tone
tokens, in both tone blocks of "Karten"), how thick the glint (`--wa-licht-linie`), how long and deep the lights
(`--wa-licht-*`), how far they lean and slide (`--wa-zug-oben`, `--wa-zug-unten`, `--wa-zug-weit`), where an arriving
light starts (`--wa-schwappt-*`), how fast a list must run for the full pull (`FULL` in look.js, px per second).
**To switch the life at rest off without touching anything else: `.m-shell { --wa-lauf: paused; }`** (the glints
then stand still where they are).

### 4. Sleep, rest behind a cover, reduced motion - how it is wired

- **One clock.** It lives where the water loop lives: look.js, button section (`SLEEP_AFTER` 30 s, `wake()`, new
  `doze()`). After 30 s without touch, scroll or key the drops come to rest and `.m-shell` gets the attribute
  `data-wa-ruht`; the next touch removes it. One timer per time awake, re-armed only when it fires. The clock also
  runs without WebGL (the forced fallback `?fallback=1` no longer leaves the script at its first line; it now behaves
  like a browser that has no WebGL, as the harness convention asks).
- **CSS follows.** `.m-shell { --wa-lauf: running }`, `.m-shell[data-wa-ruht] { --wa-lauf: paused }`; every loop at
  rest has `animation-play-state: var(--wa-lauf)`. Paused loops stop where they are and go on from there.
- **Behind a cover.** `.m-shell:has(.sheet, .cmd-back) > :is(.m-head, .m-main, .m-tabs) { --wa-lauf: paused }` - the
  page behind an open bottom sheet or the search rests (the drops there are stopped by `MODAL` in look.js; keep both
  lists the same). The sheet's own light goes on.
- **Never paused:** answers to a change of state (a toast landing, a sheet rising, a ring). They are short, and the
  app may show a toast while the water sleeps - a paused entrance with fill-mode "both" would leave it invisible.
- **Off screen** nothing is drawn (measured: 0 pictures a second with all lights below the fold); the loops are not
  paused there on purpose - a loop that is paused and resumed leaves the common beat of its screen (see 6, pitfall 3).
- **Hidden page:** the browser stops drawing; the clock's timer may fire and mark the shell as resting, the next
  `visibilitychange` wakes it (button section, unchanged).
- **No motion wanted** (`prefers-reduced-motion: reduce`, or the app's `data-motion="reduziert"` on `<html>`): the
  light helpers and the Lichtlauf pseudo-elements are `display: none` and `animation: none`, the stagger of the cards
  is 0, the script hands over no pull. The still is the look of the previous step.

### 5. Changes in earlier code

`look.js`, button section (comments included: 11 lines out, 30 in; `mess/bewegung-look.js.frueherer-teil.diff`)
1. `REST = 'data-wa-ruht'`, `nap`, `doze()`, a longer `wake()`; `start()` ends with `wake()` instead of `kick()`;
   `destroy()` clears the timer and the attribute.
2. `FORCED`: the test switch `?fallback=1` now fails inside `initGL()` like a missing WebGL does (state still
   `fallback (forced)`), so listeners and the clock run in the fallback too. No console warning in that case.
3. Shader, one term: the glint under a drop on a sheet is `.42 + .12*sin(uTime*.23 + uSeed*4.398)` instead of `.42` -
   it breathes with the swelling that wanders along the lower edge of its drop. Frozen with reduced motion like the
   rest of the water.

`look.js`, section "Karten und Leiste": the bead's flight takes its time from the bead's own `transition-duration`
(`--wa-bead-time`); `FLIGHT` is only the value used when that is missing.

`look.css`, earlier blocks
4. Both tone rules: four new tokens after `--wa-whisper` (`--wa-glanz`, `--wa-glanz-linie`, `--wa-glanz-fern`,
   `--wa-glanz-fern-linie`), same order in both.
5. Motion tokens of "Karten", "Leiste" and "Übrige Elemente" point at the language (table in 2); the eight tokens of
   "Übrige Elemente, 1. Bewegung" moved to "Bewegung, 1. Die Sprache".
6. **Setzen is no longer applied to the cards.** The previous step animated `.glass.m-card` itself (rise 16 px, 2 px
   past, 0.62 s). Now the app's own entrance `rise` (mobile.css, 0.42 s) stays untouched and is only staggered; what
   comes to rest like water is the light inside the card. The class `.wa-setzt` remains for sheets that have no
   entrance of their own.
7. Three comments that said "nothing moves at rest" were corrected.

### 6. Pitfalls

1. **A custom property set on `.m-shell` for every frame restyles the whole page.** Measured in the real app: 2.3 to
   3.3 ms per frame on the shell against 0.2 to 0.5 ms on one card (118 to 292 elements; a phone is several times
   slower). So the pull is handed to the light helpers only (one small element with two pseudo-elements each), not to
   the shell as first planned.
2. **A stepped loop is cheap in Chromium and expensive in WebKit.** Chromium runs `steps()` in its compositor and
   draws only when a step comes (measured: 8 pictures a second per loop instead of 60, the page's own thread untouched).
   WebKit does not hand a stepped loop to its compositor; it runs on the page's thread (measured in the software build
   here, lights only, no drops: 17 frames a second for the page instead of 61; with the gait `linear` 61). Hence the
   gait tokens and the `@supports (-webkit-nbsp-mode: space)` block (a property only WebKit knows). **Neither path was
   measured on a phone.** If the lights stutter or warm an iPhone: delete that block (stepped loops there too) or
   pause the life at rest (`--wa-lauf: paused`).
3. **Lights that start together stay on one beat; a paused light does not.** All helpers of a screen are inserted in
   one go and their delays are whole steps, so one screen of cards is redrawn 8 times a second, not 8 times per card.
   The bar started earlier and has its own beat (together: 16). Pausing single lights (for example off screen) would
   give each its own beat when it resumes. Moving a helper in the DOM restarts its animations - the script never moves it.
4. **Rim lights without a clip.** A light that should be brightest AT the rim and move must either be clipped by a
   wrapper (a mask or rounded clip per card, composited every frame) or be shaped so that it never leaves the pool:
   flat side on the rim line, slide only along the straight part of the rim (`--wa-licht-links`, the travel in the
   keyframes), grow only from the rim (`transform-origin` on it). The percentages are chosen for the four card
   outlines (shoulders up to 46 px); a new outline with larger shoulders needs a larger `--wa-licht-links`.
5. **`scale` and `translate` are the single parts of a transform** and add to an animated `transform`. That is how
   the loop at rest (animation of `transform`), the pull (transition of `scale` / `translate`) and the arrival
   (animation of `scale`, fill "backwards") live on one pseudo-element without overwriting each other.
6. **The pulled state is an attribute, not a class.** The button section re-reads every drop when a class inside the
   shell changes; a class toggled at every start and stop of a scroll would cost that each time.
7. **The harness page does not scroll at 844 px height** and switches the cards' entrance off (`.m-card { animation:
   none !important }`). Scroll tests need a shorter viewport or the real app; entrances are judged in the real app.
8. **In the software WebKit build one frame can take 100 ms and more.** A test that scrolls "for 450 ms" may not get
   a single frame; `tools/bw-pruefen.mjs` scrolls for at least twelve frames. The script itself tells a moving list
   by its position, not by the time between scroll events, for the same reason.
9. **WebKit keeps the loop of a pseudo-element that is `display: none`** in `document.getAnimations()`; the
   "no motion" rules therefore also say `animation: none`.
10. **No check in the app shows a toast.** The strip `haken.png` therefore shows a check ticked and then an entry
    removed (that shows the toast). The toast with "Rückgängig" stays about ten seconds; in the video it comes last.
11. **Playwright records the page at 1x into the top left quarter of the video frame.** `tools/bw-video.mjs` cuts
    that quarter out and scales it.
12. **A row or tile is never the place for a light.** Light at rest stays in the strip along the rim (at most 29 px
    deep, limited to 14 / 18 % of the height of a small card), so no glyph pixel changes (measured, see 7).

### 7. What was verified, and how to repeat it

Servers as in the sections above (4310 harness, 4173 app). All commands from `<lg>/final`, `<F>` its absolute path.
Everything at once: `nohup bash tools/bw-final.sh all > mess/bewegung-final.log 2>&1 &` (Chromium part first, then
WebKit; about 40 minutes).

| Check | Command | Result |
|---|---|---|
| The six filmstrips, real app, both tones | `node tools/bw-film.mjs <F> <F>/film [chromium\|webkit] [ton] [only] [reduced: 1]` | `film/`, `film-klar/`, `film-webkit/`, `film-webkit-klar/`, `film-reduziert/` |
| The recording of the real app | `node tools/bw-video.mjs <F> <F>/film/app.mp4 [ton]` | `film/app.mp4`, `film-klar/app.mp4` (choppy: software WebGL) |
| Alive but calm; glyph pixels | `node tools/bw-ruhe.mjs <out> ["scene=start&ton=klar"] [engine]` | `mess/bewegung-ruhe.txt`, `mess/bewegung-ruhe-webkit.txt` - see below |
| Asleep together, awake together | `node tools/bw-schlaf.mjs <out> [engine] [extra query]` | `mess/bewegung-schlaf.txt`, `-webkit.txt` - see below |
| Pictures drawn per second, before and after | `node tools/bw-takt.mjs -,final-vor-bewegung,final [extra query]` | `mess/bewegung-takt.txt` |
| Frame cadence of the page (the judge's `cad.mjs`) | see `tools/bw-final.sh`, part "kadenz" | `mess/bewegung-kadenz.txt`, `-webkit.txt` |
| Real app: a light per card, the pull (list and sheet), rest behind sheet and search, the app's switch, clean-up | `node tools/bw-pruefen.mjs <F> [engine] [ton]` | `mess/bewegung-pruefen-*.txt`: all pass in both engines and tones |
| Blocks by class alone | `node tools/bw-bausteine.mjs <out.png> [ton=klar] [engine]` | a foreign `.wa-becken` gets its helper and two running lights, a `.wa-lichtlauf` one; all pause with `data-wa-ruht` |
| With reduced motion the still is the look of the step before | `node tools/bw-still.mjs <out> [ton=klar]` | `mess/bewegung-still.txt`: 0 pixels differ outside the drops |
| Earlier checks | `node tools/robust.mjs chromium`, `node t/checks.mjs chromium <out>`, `node tools/pruefen-rest.mjs <F>`, `node tools/bausteine.mjs <out.png>` | pass |
| The strips of the previous step | `node tools/wandel.mjs ...`, `node tools/haken-ring.mjs ...` (both now leave the loops at rest alone: one filter in their `grab()`) | `wandel*/` re-rendered; `wandel-reduziert`: "(no animation)" in every strip |

Own tools of this step, all in `tools/`: `bw-film.mjs` + `bw-strip.py` (filmstrips), `bw-video.mjs`, `bw-ruhe.mjs` +
`bw-ruhe.py`, `bw-schlaf.mjs`, `bw-takt.mjs`, `bw-pruefen.mjs`, `bw-bausteine.mjs`, `bw-still.mjs`, `bw-keyframes.mjs`
(prints the keyframes of the loops), `bw-diff.py` / `bw-crop.py` (looking at two stills), `bw-final.sh`.

**Alive but calm** (harness phone view at 2x, two stills one second apart, largest difference of the three channels,
0..255; `mess/bewegung-ruhe.txt`, `-webkit.txt`):

| Surface outside the drops | pixels that change in 1 s | mean change, all pixels | mean change, changed pixels | largest | after 4 s: pixels / largest |
|---|---|---|---|---|---|
| Cards, dunkel (Chromium) | 5.4 % | 0.26 | 4.8 | 49 | 7.4 % / 154 |
| Cards, klar (Chromium, start and wetter) | 5.4 to 5.5 % | 0.29 to 0.32 | 5.4 to 5.7 | 60 | 7.5 % / 163 to 168 |
| Tab bar, dunkel / klar (Chromium) | 4.2 / 4.3 to 4.4 % | 0.24 / 0.23 to 0.27 | 5.6 / 5.3 to 6.0 | 33 / 32 to 37 | 6.6 / 6.8 % / 161 / 155 |
| Cards, dunkel / klar (WebKit, 1.2 / 1.1 s) | 6.0 / 6.0 % | 0.35 / 0.33 | 5.8 / 5.6 | 74 / 62 | 7.9 / 8.0 % / 171 / 186 |
| Tab bar, dunkel / klar (WebKit) | 5.0 / 5.0 % | 0.56 / 0.48 | 11.2 / 9.7 | 74 / 65 | 6.7 / 6.8 % / 159 / 150 |

The large single values are the 2 px glint on the rim line where it passes; 94 to 95 % of the pixels of a card do not
change at all. **Glyph pixels** (the text painted magenta in a fourth still gives the mask): row title (2509 to 2675
pixels), small muted line in a row (808 to 885), card title, count in the title row, caption of a number tile, label
of an inactive tab - **0 pixels changed after 1 s and after 4 s, in both tones and both engines**.

**Asleep together, awake together** (`mess/bewegung-schlaf.txt`, harness; Chromium both tones and without WebGL, WebKit):

| | `data-wa-ruht` | loops running / paused | water pictures a second | drawn a second (Chromium) | stills 1 s apart |
|---|---|---|---|---|---|
| awake | no | 5 / 0 | 8 (software WebGL; 12.5 in WebKit) | 20 to 24 (16 without WebGL) | differ |
| 34 s without input | yes | 0 / 5 | 0 | 0, and 0 ticks of the compositor | byte-identical |
| after one touch | no | 5 / 0 | 8 (13 in WebKit) | 20 to 21 (16 without WebGL) | differ |

**Reduced motion:** the two idle stills of the reduced phone clip are byte-identical in both tones; in the real app
the strips of `film-reduziert/` find no animation of the look and the only pixels that change in 4 s are the app's
clock; `tools/bw-still.mjs` compares the harness with `prefers-reduced-motion` before and after this step: 0 pixels
differ outside the drops in both tones (inside the drop canvases 1.3 %, by at most 27: the frozen breath of the glint).

**Cost** (software rendering on the test machine - only the relations count; `mess/bewegung-takt.txt`, `-kadenz*.txt`):

| | without the look | before this step | with it |
|---|---|---|---|
| Chromium, pictures drawn a second at rest (harness, 12 drops) | 0 | 8.8 | 20 to 24 |
| ... without the drops (`fallback=1`) | 0 | 0 | 16 (two beats of 8: cards, bar) |
| Chromium, frames a second of the page's own thread (rAF, 2x) | 60.3 | 39.8 to 40.3 | 37.8 to 39.0 |
| ... without the drops | 60.3 | 60.3 | 60.0 |
| WebKit, frames a second of the page (rAF, 3x) | 61.8 | 13.5 to 13.8 | 9.8 to 10.0 |
| ... at 2x | | 45.3 | 22.8 |
| ... without the drops, 3x | 61.8 | 61.8 | 61.0 (gliding gait); 17.5 with stepped loops |
| ... 3x, stepped loops in WebKit as well | | | 10.5 |

Animated layers on a screen of the real app (`mess/bewegung-pruefen-*.txt`): 2 rim lights per card in view (4 to 6;
about 166 x 18 and 188 x 24 px each), 1 light on the bar (112 x 11 px), the bead of the bar and 4 to 5 drop canvases
as before; an open sheet adds 1 (156 x 14 px), a toast 1. Off screen: 0 pictures drawn. Asleep, behind a sheet,
with reduced motion: nothing runs.
The page's own thread does nothing at rest for the lights in either engine (Chromium: 0 main-thread frames without
the drops). While a list is scrolled the script writes one custom property on each light helper per frame (0.1 ms
in the app here; on `.m-shell` it would be 2.3 to 3.3 ms).

### 8. Open

- **Never on a real phone.** Whether the glints read as light on water or as lines, whether 9 px a second is the
  right pace, what the loops cost on a phone GPU, and which gait is right for the iPhone: all inferred.
- **The answer to scrolling is small and shows mostly when a list is stopped by the finger.** A flick that runs out
  by itself slows down smoothly, so the light returns smoothly and does not swing. A response to acceleration instead
  of speed would swing at the start of a flick too; not tried.
- **A lean thickens the glint** (the whole light is scaled from the rim: 2 px become up to 3.2 px). A separate layer
  for the glint would avoid it and cost a third layer per card.
- **Bar and cards are redrawn on two beats** (16 pictures a second in Chromium instead of 8). One beat would need the
  script to align the start times of all loops.
- **A closing sheet and a removed row** are still not animated (need the app, see the step above).
- **Free number tiles and the header are still.** The tiles could take a Lichtlauf (their `::after` is free); left out
  because they carry large numbers and sit two in a row.
- **The drops do not lean when scrolled.** A uniform for the pull in the shader would do it.
- **Desktop:** nothing tried. `LIGHT_ON`, `SCROLLER` and the `:is(...)` lists carry this app's mobile selectors.
- **`scripts/verify.mjs` was not run against a build with the look.** A test that counts the children of a card now
  finds one more (`<i class="wa-licht">`).
