# 3Druckwerkbank – Arbeitsregeln für alle Chats

Deutsche Oberfläche, englischer Code. Vite + React + TypeScript, Zustand-Store (localStorage), Hash-Routing. Live: https://3druckwerkbank.com (Hostinger, statisch). Die alte PHP-App läuft unter https://snow-salmon-793472.hostingersite.com und bleibt unberührt.

## Rollen der Chats
- **Hauptchat** („3Druckbank“): einziger Chat, der baut, deployt und `main` zusammenführt.
- **Unterchats** (je Welt/Seite, siehe `docs/Unterchats.md`): arbeiten auf einem eigenen Branch `welt/<name>`, committen dort und pushen. **Nicht deployen**, keine Upload-Credentials anfordern, nicht auf `main` pushen. Am Ende dem Nutzer sagen: „Branch `welt/<name>` ist bereit zum Zusammenführen im Hauptchat.“
- Jeder Chat ändert nur die Dateien seines Bereichs (Liste in `docs/Unterchats.md`). Gemeinsame Dateien (`src/App.tsx`, `src/store.ts`, `src/types.ts`, `src/styles/global.css`, `src/scene/*`) nur mit kleinen, klar abgegrenzten Änderungen; CSS-Regeln für die eigene Welt gehören in einen eigenen Block mit Kommentar `/* ---- <Welt> ---- */`.

## Bilder
- Der Nutzer erzeugt alle Bilder selbst mit seiner Bild-KI. Wir schreiben Prompts (Stil: siehe `docs/Unterchats.md`, Abschnitt Bildstil), erzeugen nie selbst Bilder, schneiden nie aus den 17 Referenz-Mockups aus.
- Neue Insel: PNG 1254×1254 auf Weiß → `node scripts/cutout-islands.mjs <ordner>` (Freistellen) → `node scripts/cutout-holes.mjs assets-src/insel-<name>.png` (weiße Restflächen) → WebP 1254/640/256 nach `public/img/` (Muster in `scripts/optimize-images.mjs`), Maße in `ISLAND_META` (`src/scene/Island.tsx`) eintragen und **`ASSET_VERSION` dort erhöhen** (sonst zeigt das CDN alte Bilder).
- Neue Landschaft: `assets-src/landschaft-NN-<look>.png` → `node scripts/optimize-landscapes.mjs`.

## Prüfen
- `npm run build` muss fehlerfrei sein. `npm run preview` + `node scripts/verify.mjs http://localhost:4173` (51 Playwright-Prüfungen; Open-Meteo-Ausfälle sind Netz, nicht Code).
- Screenshots: `node scripts/shot.mjs <url> <out.png> 1920 1080`, mit fester Uhrzeit `node scripts/shot-day.mjs <url> <out.png> 2026-11-06T13:40:00+01:00`, Mobil `node scripts/shot-mobile.mjs <base> <ordner>`. Playwright liegt unter `/opt/node-tools/node_modules/playwright/index.js`.
- Layout immer in zwei Formaten prüfen: 1920×1080 und 2000×993 (Bildschirm des Nutzers, 2:1). Inseln dürfen nicht von Texten oder Panels überdeckt werden; Seitenpanels liegen in `PanelColumn`-Spalten.

## Git
- Commits als `Elias Pollak <elias.pollak@gmail.com>`, deutsche Betreffzeile, Trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- `reference/`, `dist/`, `*.zip`, `video-raw/` sind nicht im Git.
