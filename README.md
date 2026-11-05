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

## Deploy (Hostinger, statisch)

`npm run build`, `cd dist && zip -r ../site.zip .`, Upload per TUS (`hosting_files_generate-upload-url`), dann `hosting_websites_deploy-static-site-archive`. Ziel steht in `.hostinger/site.json`.

## Bilder austauschen

Landschaften liegen als `assets-src/landschaft-NN-<name>.png` (16:9). Der Name bestimmt den Look: `mittag`, `nachmittag`, `goldene-stunde`, `sonnenuntergang`, `blaue-stunde`, `mondnacht`, `bedeckt`, `nebel`, `regen` (Zuordnung in `src/scene/looks.ts`). Inseln liegen als `assets-src/insel-<name>.png` mit Transparenz; neue KI-Bilder auf weißem Hintergrund zuerst mit `node scripts/cutout-islands.mjs <ordner>` freistellen, dann in `scripts/optimize-images.mjs` und `src/scene/Island.tsx` (`ISLAND_META`) eintragen. Danach `npm run images`, Build und Deploy.

## Abgleich mit dem Gesamtplan

Siehe in der App: Einstellungen → „Über diesen Entwurf“ (funktioniert / nur demonstriert / später).
