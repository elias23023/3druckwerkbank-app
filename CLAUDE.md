# 3Druckwerkbank – Arbeitsregeln für alle Chats

Deutsche Oberfläche, englischer Code. Vite + React + TypeScript, Zustand-Store (localStorage), Hash-Routing. Live: https://3druckwerkbank.com (Hostinger, statisch). Die alte PHP-App läuft unter https://snow-salmon-793472.hostingersite.com und bleibt unberührt.

## Rollen der Chats
- **Hauptchat** („3Druckbank“): einziger Chat, der baut, deployt und `main` zusammenführt.
- **Unterchats** (je Welt/Seite, siehe `docs/Unterchats.md`): arbeiten auf einem eigenen Branch `welt/<name>`, committen dort und pushen. **Nicht deployen**, keine Upload-Credentials anfordern, nicht auf `main` pushen. Am Ende dem Nutzer sagen: „Branch `welt/<name>` ist bereit zum Zusammenführen im Hauptchat.“
- Jeder Chat ändert nur die Dateien seines Bereichs (Liste in `docs/Unterchats.md`). Gemeinsame Dateien (`src/App.tsx`, `src/store.ts`, `src/types.ts`, `src/styles/global.css`, `src/scene/*`) nur mit kleinen, klar abgegrenzten Änderungen; CSS-Regeln für die eigene Welt gehören in einen eigenen Block mit Kommentar `/* ---- <Welt> ---- */`.

## Bilder
- Der Nutzer erzeugt alle Bilder selbst mit seiner Bild-KI. Wir schreiben Prompts (Stil: siehe `docs/Unterchats.md`, Abschnitt Bildstil), erzeugen nie selbst Bilder, schneiden nie aus den 17 Referenz-Mockups aus.
- Neue Insel: PNG auf Weiß → `node scripts/cutout-islands.mjs <ordner>` (Freistellen) → `node scripts/cutout-holes.mjs assets-src/insel-<name>.png` (weiße Restflächen; bei bereits transparenten Bildern weglassen) → `node scripts/optimize-island.mjs <name>` (WebP 1254/640/256, druckt die Maße) → Id in `src/types.ts`, Maße in `ISLAND_META` (`src/scene/Island.tsx`), Eintrag in `LIB` (`src/forms/ProjektForm.tsx`) und **`ASSET_VERSION` erhöhen** (sonst zeigt das CDN alte Bilder). Sichtung vieler Bilder: `node scripts/contact-sheet.mjs <ordner> <ausgabe>`.
- Neue Landschaft: `assets-src/landschaft-<jahreszeit>-<morgen|mittag|abend|nacht>.png` oder `landschaft-regen.png` → `node scripts/optimize-landscapes.mjs`; Zuordnung Look → Bild in `LOOK_PHASE` (`src/scene/looks.ts`).
- Szene für Mobil: `assets-src/szenen/szene-<key>.png` → `node scripts/optimize-scenes.mjs`.

## Bereiche
- Zwei Bereiche mit getrenntem Speicher (`src/lib/workspace.ts`): `demo` = Beispiel-Werkstatt (Demodaten, `3druckwerkbank:v1`), `echt` = Meine Werkstatt (`3druckwerkbank:echt:v1`, startet mit `makeEmptySeed()`). Umschalten per Chip in der Kopfzeile (Sheet `bereich`). Neue Features müssen in beiden Bereichen laufen, besonders mit leeren Listen; `verify.mjs` prüft den leeren Bereich. Sync nur in `echt`.
- `echt` startet ganz leer, auch ohne Geräte. Drucker, AMS, Trockner und Werkzeuge legt der Nutzer selbst an (`src/forms/GeraetForm.tsx`: Formular `geraetForm`, Übersicht `geraete`; Store `upsertDevice`, `deleteDevice`). Nie Demo-Ids (`d-x1c`, `d-p1s`) voraussetzen; jede Ansicht braucht einen Zustand ohne Drucker.
- Drucke buchen sich nie selbst: Ist die geschätzte Zeit um, setzt `tickPrints` nur `resultDue`; das Ergebnis bestätigt der Nutzer.
- Fremde Daten (Import, Konto, alter Speicher) laufen immer durch `normalizeState` (`src/store.ts`).
- Rückgängig: Löschende Store-Aktionen sind am Ende von `src/store.ts` mit `wrap('<aktion>', …)` angemeldet und zeigen den Hinweis mit „Rückgängig“ (`src/ui/Toast.tsx`). Neue Lösch-Aktionen dort eintragen und danach keinen eigenen Toast setzen.
- Ort für das Wetter: `settings.location`, gesetzt über `setLocation` (leert den Wetter-Cache); Suche `searchPlaces` in `src/lib/weather.ts`. Keinen Ort fest im Text nennen.

## Konto (Hostinger, PHP + MySQL)
- Login (Google, E-Mail) und Sync: PHP in `public/api/` (`_lib.php`, `auth.php`, `state.php`, `health.php`), MySQL `u685288958_werkbank`, Konfiguration **außerhalb** des Webroots in `/werkbank-private/config.php` (Vorlage `docs/werkbank-config.example.php`; echte Werte nie ins Git). Browser-Seite `src/lib/cloud.ts`, Panel `src/ui/Konto.tsx`. `.htaccess` leitet `/api/` nicht auf `index.html` um. Google-Knopf erscheint erst mit `google_client_id` in der Konfiguration. Schema-Änderungen in `migrate()` (`_lib.php`) eintragen und `SCHEMA_VERSION` erhöhen. Sync (`src/lib/cloud.ts`) überschreibt nie still: Bei unterschiedlichen Ständen wählt der Nutzer, der Server verlangt `ifUpdatedAt` oder `force`. Einrichtung: `docs/Login-Einrichtung.md`. PHP-Dateien vor dem Deploy mit `php -l` prüfen.

## Prüfen
- `npm run build` muss fehlerfrei sein. `npm run preview` + `node scripts/verify.mjs http://localhost:4173` (69 Playwright-Prüfungen; Open-Meteo-Ausfälle sind Netz, nicht Code).
- Screenshots: `node scripts/shot.mjs <url> <out.png> 1920 1080`, mit fester Uhrzeit `node scripts/shot-day.mjs <url> <out.png> 2026-11-06T13:40:00+01:00`, Mobil `node scripts/shot-mobile.mjs <base> <ordner>`. Playwright liegt unter `/opt/node-tools/node_modules/playwright/index.js`.
- Layout immer in zwei Formaten prüfen: 1920×1080 und 2000×993 (Bildschirm des Nutzers, 2:1). Inseln dürfen nicht von Texten oder Panels überdeckt werden; Seitenpanels liegen in `PanelColumn`-Spalten.

## Xmind-Mindmap (immer aktuell halten)
- Projekt-Mindmap des Nutzers in Xmind: Datei `VtPUHiU1` (https://app.xmind.com/share/VtPUHiU1). Der **Hauptchat** aktualisiert sie **nach jedem abgeschlossenen Schritt** (Deploy, größere Änderung, neue offene Punkte) ohne Nachfrage: Ast „Stand heute“ ergänzen oder korrigieren, Ast „Was noch fehlt“ abhaken bzw. ergänzen, bei Architekturänderungen „Technischer Aufbau“ und „Bilder-Pipeline“ nachziehen. Werkzeuge `xmind_edit_mindmap` / `xmind_read_mindmap`; danach `xmind_show_mindmap` nur, wenn der Nutzer die Map sehen will. Unterchats melden Änderungen dem Hauptchat, sie haben keinen Xmind-Zugriff.

## Git
- Commits als `Elias Pollak <elias.pollak@gmail.com>`, deutsche Betreffzeile, Trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- `reference/`, `dist/`, `*.zip`, `video-raw/` sind nicht im Git.
