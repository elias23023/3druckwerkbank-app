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

Der Hintergrund ist zurzeit die vorhandene Tageslandschaft, per `scripts/grade-landscape.mjs` auf Tag/Abend/Nacht umgefärbt. Sobald eigene Bilder im Referenzstil vorliegen:

1. Landschaft als `assets-src/final-landschaft-abend.png` (Pflicht), optional `final-landschaft-tag.png` und `final-landschaft-nacht.png`. 16:9, mindestens 2048 px breit, Horizont etwa bei 40–45 % der Höhe, keine Inseln, kein Text.
2. Inselmotive quadratisch mit transparentem Hintergrund als `assets-src/<name>.png` und in `scripts/optimize-images.mjs` in die Liste `islands` eintragen; in `src/scene/Island.tsx` (`ISLAND_META`) Breite/Höhe ergänzen und in `src/App.tsx` (`WORLD_IMAGE`) der Welt zuordnen.
3. `node scripts/grade-landscape.mjs && node scripts/optimize-images.mjs`, dann Build und Deploy.

Die 17 Originalbilder und der Gesamtplan liegen unter `reference/` (nicht im Build).

## Abgleich mit dem Gesamtplan

Siehe in der App: Einstellungen → „Über diesen Entwurf“ (funktioniert / nur demonstriert / später).
