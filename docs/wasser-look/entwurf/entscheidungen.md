# Decisions of the owner (kept by the main chat; newest last)

These override older notes wherever they disagree.

1. **Buttons on a card show the card's water**, not the landscape behind the card. Buttons free over the scene bend the landscape.
2. **Colour: no blue.** Two tones were built: "dunkel" (neutral dark water, default) and "klar" (clear water), switched by `data-wa-ton="klar"` on `<html>`.
3. **Red of "Löschen":** strength B (deeper, quieter) on "dunkel", strength A (clear red) on "klar".
4. **Both tones stay, as the two modes of the app (13.11., 12:40).** He first wanted exactly one design without any switching; he changed his mind: "ich möchte jetzt doch hell und dunkel Modus wieder wie's geplant war ... beide Varianten von dir aktuell passen dafür gut".
   - Dark mode = tone "dunkel". Light mode = tone "klar".
   - The app already has the setting "Erscheinungsbild: Automatisch (Tageszeit) / Hell / Dunkel" (`settings.theme`; `src/App.tsx` sets `document.documentElement.dataset.theme`, and today forces "dunkel" on mobile). When the template is applied to the app, that setting chooses the tone on mobile AND desktop: Dunkel -> "dunkel", Hell -> "klar", Automatisch -> by the look of the hour (`DARK_LOOKS` in `src/scene/looks.ts`).
   - So neither tone will be deleted. A tone is still only a block of token values.
   - The app's old light theme (light panels with dark text, `:root[data-theme="hell"]` in `src/styles/tokens.css`) is NOT what he means: the light mode of the water look is the tone "klar", with light text on clear water.
5. **Everything is dynamically animated** (alive at rest, answering touch and scrolling), but calm. Off with reduced motion.
6. **Template first.** The look is prepared as two templates to look at (mobile, desktop) with a guide; the app itself is not changed until he says so.
7. **Life at rest: the strength stays 1, the pace becomes a little faster (14.11., 10:50).** Shown side by side, strength 1 and 1.5 cannot be told apart by eye; the lever is the pace of the wandering lights. His words: "beim Tempo bin ich mir nicht so sicher, aber ich denke schon ein bisschen schneller." So: a LITTLE faster than built (24 / 34 / 40 / 46 s a lap), clearly less than the 2.5-fold trial he was shown. To be built and shown to him before it goes live.
8. **The light mode ("klar") a little lighter (14.11., 10:50).** About the desktop panels: "bei dem hellen noch ein bisschen heller. Vielleicht auch sogar bei der mobilen Version noch ein bisschen heller." So: tone "klar" a little lighter on the desktop, and probably on the phone too - within the contrast floors (titles 7, text 4.5, placeholders 3). "dunkel" stays as it is unless he says otherwise. To be built and shown to him. (His sentence broke off after "Aber" - a condition may follow.)
9. **The phone version may go live (14.11., 10:50).** "Die Handy-Version können wir gerne schon auf die echte Seite laden." The mobile integration (branch welt/wasser-mobil, commit c7e8299) was put on the staging site first, checked there, then merged into main and delivered to the live site by a deploy helper chat. The desktop stays unchanged until he has seen the desktop integration on his own screen.
