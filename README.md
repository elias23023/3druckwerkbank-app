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

Die räumliche Inselwelt ist für Desktop und Tablet quer gebaut. Unter 900 px Breite (Handy, Tablet hochkant) rendert `src/App.tsx` stattdessen den mobilen Begleiter aus `src/mobile/Mobile.tsx`: fünf Reiter (Start, Heute, Projekte, Material, Mehr), ein Landschaftsbild, keine Parallaxe, große Touchziele. Beide Ansichten nutzen denselben Store, dieselben Sheets und Formulare. Mobil-Screenshots: `node scripts/shot-mobile.mjs <url> <ordner>`.

## Sonnenuhr auf der Heute-Insel

Die Scheibe (`assets-src/sonnenuhr-scheibe.png`, Draufsicht) wird per CSS in die Neigung der gemalten Uhr gekippt und dreht sich mit der Uhrzeit; der Tagesring liegt auf ihrem Rand. Der Zeiger ist ein eigenes Bild (`assets-src/zeiger-gnomon.png` → `src/assets/zeiger-gnomon.webp`, per Vite mit Hash im Dateinamen) und liegt als oberste Ebene darüber. Tausch: Datei ersetzen, `npm run images`, Position in `.sundial-gnomon` (global.css) prüfen.

## Domains

Seit 6. 11. 2026 läuft der Prototyp unter https://3druckwerkbank.com (Hauptdomain des Hostinger-Pakets). Die frühere PHP-App (Codex) läuft unter https://snow-salmon-793472.hostingersite.com weiter; ihre Dateien, `dw-private/` und die SQLite-Datenbank liegen dort neben `public_html`. Vollsicherung der alten App: `reference/alte-app/` (nicht im Git).

## Deploy (Hostinger, statisch)

`npm run build`, `cd dist && zip -r ../site.zip .`, Upload per TUS (`hosting_files_generate-upload-url`), dann `hosting_websites_deploy-static-site-archive`. Ziel steht in `.hostinger/site.json`.

## Bilder austauschen

Landschaften liegen als `assets-src/landschaft-NN-<name>.png` (16:9). Der Name bestimmt den Look: `mittag`, `nachmittag`, `goldene-stunde`, `sonnenuntergang`, `blaue-stunde`, `mondnacht`, `bedeckt`, `nebel`, `regen` (Zuordnung in `src/scene/looks.ts`). Inseln liegen als `assets-src/insel-<name>.png` mit Transparenz; neue KI-Bilder auf weißem Hintergrund zuerst mit `node scripts/cutout-islands.mjs <ordner>` freistellen, dann in `scripts/optimize-images.mjs` und `src/scene/Island.tsx` (`ISLAND_META`) eintragen. Danach `npm run images`, Build und Deploy.

## Abgleich mit dem Gesamtplan

Siehe in der App: Einstellungen → „Über diesen Entwurf“ (funktioniert / nur demonstriert / später).
