# 3Druckwerkbank – Testentwurf

Persönliche digitale Werkstatt für 3D-Druck-Projekte als räumliche Inselwelt. Prototyp ohne Server: Vite + React + TypeScript, Zustand im Browser (localStorage), Wetter von Open-Meteo.

## Entwickeln

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # dist/
npm run preview    # http://localhost:4173
node scripts/verify.mjs   # Playwright-Prüfungen gegen den Preview-Server
```

## Desktop und Mobil

Die räumliche Inselwelt ist für Desktop und Tablet quer gebaut. Unter 900 px Breite (Handy, Tablet hochkant) rendert `src/App.tsx` stattdessen den mobilen Begleiter aus `src/mobile/Mobile.tsx`: fünf Reiter (Start, Heute, Projekte, Material, Mehr), je Reiter eine gemalte Szene als Hintergrund, keine Parallaxe, große Touchziele. Beide Ansichten nutzen denselben Store, dieselben Sheets und Formulare. Mobil-Screenshots: `node scripts/shot-mobile.mjs <url> <ordner>`.

## Tagesportal auf der Heute-Insel

Die Heute-Insel trägt auf dem Steinsockel einen gemalten Holzring auf einem Gestell; `src/ui/Tagesportal.tsx` legt nur das Lebendige hinein, der Ring ist Teil des Bildes: innen bleibt er durchsichtig (die echte Landschaft scheint durch); am Rand der Sonnenweg von Aufgang (links) bis Untergang (rechts) mit leuchtendem vergangenem Teil und einer Sonne oder einem Mond als Jetzt-Marke; in der Mitte die Uhr und der nächste Lichtwechsel. Position und Neigung stehen in `global.css` (`.portal`) und in den Props `turn` und `lean`. Auf der Startseite läuft es als `compact` nur mit Uhr.

## Zwei Bereiche: Beispiel und Meine Werkstatt

Die App hat zwei getrennte Bereiche mit eigenem Speicher (`src/lib/workspace.ts`): **Beispiel-Werkstatt** (Demodaten, Speicher `3druckwerkbank:v1`) zum Ausprobieren und Weiterentwickeln, und **Meine Werkstatt** (Speicher `3druckwerkbank:echt:v1`), die leer startet, nur mit Druckern, AMS, Trockner und Werkzeugen als Ausgangspunkt. Umschalten über den Chip neben dem Logo oder in den Einstellungen; der Wechsel lädt die Seite neu. Nur „Meine Werkstatt“ wird mit dem Konto synchronisiert. Export/Import gilt für den aktiven Bereich.

## Konto und Synchronisation (optional)

Anmeldung mit Google oder E-Mail und Abgleich der Daten über alle Geräte laufen über Supabase; die App bleibt statisch. Einrichtung in `docs/Login-Einrichtung.md`. Ohne die beiden Werte `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY` in `.env.production` ist das Konto-Panel nur ein Hinweis und die Daten bleiben wie bisher im Browser. Code: `src/lib/cloud.ts` (Sitzung, Sync), `src/ui/Konto.tsx` (Panel).

## Domains

Seit 6. 11. 2026 läuft der Prototyp unter https://3druckwerkbank.com (Hauptdomain des Hostinger-Pakets). Die frühere PHP-App (Codex) läuft unter https://snow-salmon-793472.hostingersite.com weiter; ihre Dateien, `dw-private/` und die SQLite-Datenbank liegen dort neben `public_html`. Vollsicherung der alten App: `reference/alte-app/` (nicht im Git).

## Deploy (Hostinger, statisch)

`npm run build`, `cd dist && zip -r ../site.zip .`, Upload per TUS (`hosting_files_generate-upload-url`), dann `hosting_websites_deploy-static-site-archive`. Ziel steht in `.hostinger/site.json`.

## Bilder austauschen

Landschaften liegen als `assets-src/landschaft-<jahreszeit>-<phase>.png` (16:9; Jahreszeit `fruehling|sommer|herbst|winter`, Phase `morgen|mittag|abend|nacht`) plus `landschaft-regen.png`; `node scripts/optimize-landscapes.mjs` erzeugt AVIF und WebP. Welcher Look welches Bild nimmt, steht in `src/scene/looks.ts` (`LOOK_PHASE`). Inseln liegen als `assets-src/insel-<name>.png` mit Transparenz; KI-Bilder auf weißem Hintergrund zuerst mit `node scripts/cutout-islands.mjs <ordner>` freistellen, dann `node scripts/optimize-island.mjs <name>` (druckt die Maße für `ISLAND_META` in `src/scene/Island.tsx`), Id in `src/types.ts` und `LIB` in `src/forms/ProjektForm.tsx` eintragen und `ASSET_VERSION` erhöhen. Szenen für den mobilen Begleiter: `assets-src/szenen/szene-<key>.png` → `node scripts/optimize-scenes.mjs`. Kontaktbogen zur Sichtung: `node scripts/contact-sheet.mjs <ordner> <ausgabe>`.

## Abgleich mit dem Gesamtplan

Siehe in der App: Einstellungen → „Über diesen Entwurf“ (funktioniert / nur demonstriert / später).
