# Report of the author of the buttons (before the card work changed how a drop on a card looks)

## basedOn
w3-shader (WebGL drop per button). It is the only candidate whose bending ran fast in WebKit and it needs nothing a current iPhone or Android phone lacks, so one technique serves both phones. Its files were copied to /tmp/claude-0/-home-user-3druckwerkbank/c7034e5f-c75e-5dc3-a0df-70a196fe2d21/scratchpad/lg/final and rewritten there (look.css, look.js, defs.html); no candidate, harness or app file was touched.

## technique
One shared WebGL 1 context draws the drop of every visible button into a small atlas. Each button (.btn except ghost, and .m-ico) gets one helper canvas (.w3-drop, aria-hidden, pointer-events none, z-index -1, first child) that receives its part of the atlas.

The shader bends the page's own landscape image, aligned to the viewport exactly as the page paints it. With the test switch ?w3flat=1 a free drop vanishes into the page (largest difference 2 of 255 on the phone view, 7 of 255 in the zoomed close-up) in Chromium and WebKit, including after scrolling, after a tab's scene swap and after a slide-in animation.

- **Shape (R3):** the button's pill, breathing through three slow wave fields plus two swellings that wander along the upper and lower edge. It spreads 2.6 px when pressed.
- **Water (R1):** no fill colour in the clear drop. A steep rim and a flat dome give one crisp highlight, a bright crescent on the far side, a thin light rim line and a shadow.
- **Reaction (R2):** the rim squeezes the landscape inwards and the body magnifies it about 1.07x. Slow ripples keep it moving. A press sends one concentric ring from the finger that bends the landscape and has a lit and a shaded slope.
- **Labels:** where the label sits, the water is kept just dark enough for white text (as deeper, bluer water, at most 38 %) or bright enough for the dark primary label. The ends and the rim stay clear.
- **Primary and danger:** primary is amber water (about 50 % amber at the rim, 70 % in the middle, more over dark ground). Danger is deep red water with a light label.

Without WebGL, with ?fallback=1, after a lost context or a shader error, the plain CSS glass of look.css stays.

## fixed
[
 "Rainbow fringes (soap-bubble look): no colour fringe at rest, only a faint one while a drop is touched.",
 "Smoky grey core over bright sky: the darkening is limited to the label zone and tinted blue. Over the bright weather scene the free 'Bearbeiten' body is 0.86x the plain scene (label zone 0.70, ends 1.10); on the start scene 1.17x.",
 "Honey primary with a hot yellow band, pink 'Löschen': amber reduced to about 50-70 % with the landscape showing through, and the far-side glow damped. 'Löschen' is deep red with a light label at 9.4-9.9:1 (was 5.5).",
 "Idle motion so lively that a press hardly stood out: ripples roughly halved and calmed under labels. In the clip stills 10-15 % of a drop's pixels change between idle frames, against 73 % (primary held) and 60 % (card button held).",
 "Second press in a row showed no held state: a focus change released the new press at once (this bug was already in w3). Fixed; t4 now shows the held card button.",
 "Restless backdrop behind labels: brightness behind labels now varies by 0.4-1.1 L* (w3: 2.2-5.4).",
 "Card header '+' stayed amber on a bright window: icons inside a drop take the label colour. Now 5.0:1 on the weather scene (worst decile 4.6), 9.2-9.7 on the other two.",
 "Label contrast, measured with the legibility judge's own scripts on start / weather / interior: every text label is at least 8.1:1 with its halo and at least 5.1:1 with the text-shadow removed. Lowest are 'Bearbeiten' over bright sky at 10.0 (worst decile 5.9, raw 5.1) and the primary at 8.1-10.2. Header and '+' icons are 4.5-11.2.",
 "Taps on the visible bulge did nothing: the hit area now reaches 4 px beyond the button box (a tap 3 px above the box clicks in Chromium and WebKit). Layout boxes are unchanged.",
 "Neighbouring drops ignored each other: facing flanks now lean towards each other, and at least 4 px of gap always stays, also while one is pressed.",
 "Soft drop edges on 3x phones: the pixel ratio cap is 3 instead of 2.",
 "Rectangular tap flash over the drop: -webkit-tap-highlight-color is off.",
 "Fallback heavier than the main path and unreadable on bright scenes: the fallback is now static (no animation, no filter, no backdrop-filter). Firefox without WebGL holds 60 fps on it, and 'Bearbeiten' over bright sky is 11.6:1 (was 2.5).",
 "Loop never slept: resting water draws 15 pictures a second with a timer in between (13 wake-ups a second measured in WebKit), 60 only while a drop is touched and 2 s after. It stops after 30 s without touch or scroll, when hidden and when no drop is on screen.",
 "Reduced motion: the system setting and the app's 'Bewegung: Reduziert' both give 0 frames a second, also while a button is held. The reduced phone clip's two idle stills are pixel-identical.",
 "Sheet buttons were windows through an opaque panel and all drops kept animating behind a sheet: a 97 % opaque sheet now gives near-solid beads, and drops behind an open .sheet rest.",
 "Observer watched the whole document: it now watches only the shell's children except the tab bar. The tab bar gets no helper, no attribute and no style.",
 "Slow governor (tens of seconds): now 3 s of over-budget pictures per step, down to a still drop.",
 "Scene swap by a new <img> element: the old picture stays until the new one has loaded (phone clip stills p3-p5).",
 "Cards sliding in with their buttons: the copy follows frame by frame while buttons move and is exact at the end."
]

## notFixed
[
 "The bending is staged. Only the landscape image is bent; cards, text and anything else between landscape and button are never refracted. A header drop over a card that scrolled underneath shows sky.",
 "A drop on a card is a clear window onto the landscape behind the card. That is a design decision, not physics.",
 "The fallback has no reaction of the background at all (R2 is not met there). The brief asked for one plain fallback, so the judges' wish for a second, SVG-based refracting fallback was declined. A current iPhone or Android phone should never see the fallback.",
 "While scrolling, the picture inside a drop trails the true background by at least one frame; on iOS momentum scrolling probably two.",
 "Hand-over cost on a real Android GPU is still unmeasured. It was about 1 ms for all 12 drops in WebKit here. In Chromium here the first copy absorbs the whole CPU shading time (about 45 ms), so that says nothing about a phone.",
 "Each water picture makes the browser redo the backdrop blur of the cards the drops sit on. With today's blur(18px) cards the software WebKit build here falls to 7-8 frames a second; without card blur it runs at 49-56. A real phone GPU blurs far faster, but this is the main open cost and it sits in the cards.",
 "First page load shows the plain glass until the scene image is uploaded, then the drops pop in. Tab changes do not flash.",
 "The focus ring is a plain pill 5 px outside the drop; it does not follow the flowing outline.",
 "Pills and ghost buttons are not water: pills are small CSS beads, ghost buttons get a film only under the finger.",
 "Neighbours lean but never merge; merging would blur two tap targets into one.",
 "Not run in the real React app, and scripts/verify.mjs was not run against it."
]

## cardInterface
A button learns about the card it sits on in two ways, checked in this order.

1. **Explicit:** the inherited custom property `--water-under` on the card or any ancestor, holding one CSS colour with alpha (for example `--water-under: rgba(120,190,235,.3)`). It means "average colour and opacity of everything between this button and the landscape". Use it when the sheet is painted by something the script cannot read (canvas, pseudo-element, image, mask). `transparent` makes the buttons behave as if free over the landscape.
2. **Automatic** (when the property is absent): the script walks from the button's parent up to .m-shell and composites each ancestor's computed `background-color`. If that is transparent and `background-image` is a gradient, it uses the mean of the gradient's colours. Nothing else is read: not borders, backdrop-filter, opacity or pseudo-elements. No class name is used; `.glass` and `.m-card` mean nothing to the script.

From that colour and alpha `a` the drop keeps `0.22a + 0.78a^12` of the sheet's colour (0.23 for today's rgba(14,22,38,.8) card, about 0.05 at alpha .25, about 0.75 for a 97 % sheet, 1 for an opaque panel) and shows the landscape for the rest. Above alpha 0.4 it counts fully as "on a sheet": landscape sampled softer, page darkening halved, a slight light lift.

**When it is re-read:** once a second while the water runs, after any class change inside the shell (the tab bar excluded) and after a class or data-look change on .m-shell itself, after resize, and on waking. A light, see-through card and both `--water-under` cases were checked in Chromium and WebKit; the drops followed within about a second.

**What to keep in mind when restyling cards:**
- Do not rely on a change being picked up faster than a second, unless a class changes.
- An inline style change alone is only caught by the once-a-second read.
- If the sheet paints itself with a canvas or pseudo-element and you set neither a background colour nor `--water-under`, the buttons will act as free drops with the full page darkening.
- Buttons need nothing else from the card: label contrast is computed from what the drop actually shows, and shadow and rim are drawn by the drop.
- Each helper canvas reaches 14 px beyond its button (--w3-pad), so `overflow: hidden` or a clip-path closer than that clips the drop's bulge and shadow.
- Drops redraw 15 times a second (60 while touched), which makes the browser redo a card's backdrop-filter at that rate. A cheaper or absent backdrop blur on cards helps more than anything in the buttons.
- An element matching `.sheet` inside the shell pauses all drops outside it.
- look.css contains no rule for .glass.m-card, .m-row, .m-stat or .m-tabs, and the script neither styles nor observes .m-tabs.
- Beyond buttons, look.css changes .pill (bead border, radius, shadow), .m-ico .badge, the focus ring offset and the :active film of ghost buttons.

## iphone
Not run on a real iPhone. It was run in Playwright's WebKit (same engine family, iPhone user agent, 390x844 at 3x, software GL); that is the basis for everything below.

- **R1:** clear drops with no fill colour, amber primary, deep red danger. The WebKit stills match Chromium to within 1 of 255 in mean colour per drop.
- **R2:** the landscape is bent and magnified, ripples keep moving, and a press sends a ring from the finger that visibly bends the picture (shots-webkit/nah-start-press.png). Only the landscape copy reacts; cards and text do not.
- **R3:** the same flowing outline, spreading on press.

The WebGL path starts there (state 'gl', 12 drops at full 3x resolution), with and without the derivative extension. One picture cost 9 ms at 2x and 11-26 ms at 3x on the CPU, the hand-over about 1 ms. Hit area, tap, focus ring, card re-read and teardown passed the same checks as in Chromium.

**How sure:** fairly sure about the look and that it runs, because it needs only WebGL 1, a 2D canvas and one widely supported extension with a built-in path without it. Not sure about smoothness: Apple's shader compiler, the real cost of redoing the cards' blur under moving drops, and the lag during momentum scrolling can only be seen on the phone. If WebGL fails, the phone shows the plain glass.

## android
Same engine family as the main test (Chromium), so the picture should match the stills. Tested only with the software renderer, where every pixel is shaded on the CPU (about 45 ms per picture for the phone view at 2x), so nothing here says how fast a phone is.

On a phone GPU the shading load is small: about 340,000 device px per picture at 2x, 757,000 at 3x. The open point is the copy from the WebGL canvas into the 12 small canvases. If Chrome keeps those canvases on the GPU it is a cheap copy; if not, each picture costs one readback. Very small canvases are drawn slightly larger so they are likelier to stay on the GPU; this is a precaution, not a verified fix.

The governor measures exactly that cost and steps down within 3 s per level: first fewer pictures, then fewer pixels, finally a still drop that still follows scrolling and presses. Firefox for Android was not tested with WebGL; the headless build here has none and correctly showed the plain glass at 60 fps.

## fallback
One plain fallback, in look.css alone. It is shown with ?fallback=1, without script, without WebGL, after a lost context or a shader error.

It is a still, water-shaped pane of see-through glass: an irregular pebble outline from four different corner radii (three variants), a deep-water tint of about 50 %, a light rim, a soft sheen and a small shadow. Primary is amber, danger deep red. A press squeezes and brightens it.

It has no animation, no filter and no backdrop-filter, so it costs nothing. Text labels measure 8.2-18.7:1, the '+' over bright sky 6.4. On dark cards it reads as a dark pebble again.

It does not bend or move the background, so R2 is not met there. Stills are in /tmp/claude-0/-home-user-3druckwerkbank/c7034e5f-c75e-5dc3-a0df-70a196fe2d21/scratchpad/lg/final/shots-fallback.

## performance
Phone view, 12 visible drops:
- **Layers:** 12 small canvas layers (each with will-change: transform, so a new water picture never repaints labels or cards). No CSS filter or backdrop-filter on any button.
- **Per picture:** 12 rectangle reads, one WebGL pass with 12 scissored draws into one atlas (747x551 at 2x, 1118x823 at 3x), 12 copies into the helpers. The surface is evaluated once per pixel using screen-space derivatives.
- **Rate:** 15 pictures a second at rest, 60 while a drop is touched and 2 s after, every frame for 160 ms after a scroll event and while buttons are being moved.
- **Zero work:** after 30 s without touch or scroll, when the page is hidden, when no drop is on screen, and with reduced motion.
- **Caps:** pixel ratio 3; 340,000 px per drop; 1.5 million px in total. Off-screen drops and drops behind an open sheet are skipped.
- **Governor:** 3 s of pictures over 80 % of their time slot steps down 60 → 30 → 15 pictures, then 0.67x and 0.5x resolution, then a still drop.
- **Memory:** one GL context, one 2048x1024 mip-mapped texture (about 11 MB), the atlas and 12 small canvases.

Measured here, software GL only:

| Engine | One picture | Hand-over | Page frame rate, card blur removed |
|---|---|---|---|
| WebKit, 2x | 9 ms | 0.3 ms | 56 fps |
| WebKit, 3x | 11-26 ms | about 1 ms | 49 fps |
| WebKit, 3x, no derivatives | 32 ms | 1.8 ms | 32 fps |
| Chromium, 2x | about 45 ms | included | not representative |

With today's card blur left on, WebKit here falls to 7-8 fps, because each recomposite re-runs the blur on the CPU. Nothing was measured on a phone. Battery cost of a permanent 15 pictures a second is real, which is why the water rests after 30 s.

## integration
For the main chat, on a branch:
1. Put look.css into src/mobile/mobile.css as its own block `/* ---- Wasser-Knöpfe ---- */`. Every rule is under .m-shell.
2. Turn look.js into a module (for example src/mobile/wasser.ts) exporting start and the existing destroy, and call them from a useEffect in src/mobile/Mobile.tsx. destroy removes helpers, listeners, observers and the GL context (checked: nothing left behind).
3. Keep or drop the ?fallback=1 / ?w3flat=1 / ?w3prof=1 switches. defs.html is not needed.
4. No CSP change: the scene image is same-origin and nothing uses data: or blob:.

Already handled and checked in the harness: the scene `<img key={scene}>` replaced by a new element, srcset (currentSrc), the main area remounting three times, React resetting a button's text (helper back within two frames), a button mounting later, the shell unmounting and returning, a sheet inside the shell, cards sliding in, a disabled button, and the app's data-motion setting.

Decisions for the owner:
- Whether the water should rest after 30 s (constant SLEEP_AFTER; 0 turns it off).
- Whether sheet buttons should stay as near-solid beads.

Any test that counts a button's children sees one more. Try it on the Baustelle with a real iPhone and a real Android phone before live; ?w3prof=1 shows the cost split in window.__w3.prof.

## bestStill
/tmp/claude-0/-home-user-3druckwerkbank/c7034e5f-c75e-5dc3-a0df-70a196fe2d21/scratchpad/lg/final/shots/nah-start.png

## weaknesses
1. Never run on a real phone. The look matches between Chromium and WebKit, but smoothness, battery cost and the Android hand-over are unknown until the owner tries it.
2. The refraction is a trick: only the landscape bends, and a drop on a card looks through the card. Some people may read card buttons as holes.
3. Moving drops on blurred cards make the browser redo the card blur 15 times a second. This is probably the largest real cost and depends on how the cards are restyled.
4. The picture inside a drop lags scrolling by a frame or two.
5. White labels over bright sky still need the label zone about 30 % darker than the scene. It reads as deeper blue water, but it is not perfectly clear there. Dark ink on bright backdrops would be clearer and was not tried.
6. The primary is tinted water, not clear water (50-70 % amber), and shows the landscape as warm light and dark shapes, so it is busier than today's flat gradient.
7. Over very dark scenes a clear drop is dark too; only rim, highlight and crescent mark it.
8. The water rests after 30 s without touch. That saves battery but breaks "keeps moving" for someone who only watches the screen.
9. The fallback has no background reaction and is a dark pebble on dark cards.
10. On this test machine the Chromium video is choppy (software GL, about 45 ms per picture, more under load), so motion is better judged from the stills and from the WebKit press strips (/tmp/claude-0/-home-user-3druckwerkbank/c7034e5f-c75e-5dc3-a0df-70a196fe2d21/scratchpad/lg/final/t/press-frei-wk.png and /tmp/claude-0/-home-user-3druckwerkbank/c7034e5f-c75e-5dc3-a0df-70a196fe2d21/scratchpad/lg/final/t/press-card-wk.png).
11. The script is 45 KB unminified and puts a foreign canvas into React-managed buttons; that worked in simulation only.
12. Header icons over the brightest sky sit at 4.5:1. That is fine for icons, but lower than today's dark chips (13:1).