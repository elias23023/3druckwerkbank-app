# Installierbare App (PWA)

Die Werkbank lässt sich als App installieren (Desktop: „App installieren“, Android: „Zum Startbildschirm“, iPhone: Teilen → „Zum Home-Bildschirm“). Sie startet dann ohne Browserleiste und auch ohne Netz, mit den Daten aus dem Browser-Speicher.

## Dateien
| Datei | Zweck |
|---|---|
| `public/manifest.webmanifest` | Steckbrief: Name „3Druckwerkbank“, Kurzname „Werkbank“, `display: standalone`, Farben `#0b1220`, Symbole, Kurzbefehle (Heute, Projekte, Material), zwei Bildschirmfotos für den Installationsdialog |
| `public/sw.js` | Service Worker, von Hand geschrieben (kein Workbox). In `public/` liegt nur die Vorlage mit drei Platzhaltern |
| `vite.config.ts` (`pwaBuild`) | trägt nach dem Build in `dist/sw.js` ein: Kennung des Builds, `ASSET_VERSION`, Liste der Dateien |
| `src/lib/pwa.ts` | Anmeldung (nur gebauter Stand, nach dem ersten Bild) und Erkennen einer neuen Version |
| `src/ui/Toast.tsx` | Hinweis „Neue Version verfügbar – Neu laden“ |
| `scripts/optimize-appicon.mjs` | Symbol-Pipeline nach `public/icons/` |
| `index.html` | Manifest, Favicon als Datei, `apple-touch-icon`, Angaben fürs iPhone |

## App-Symbol
- **Im Git liegt ein Platzhalter**: das Sechseck-Logo der App auf dunklem Grund, aus der eigenen Vektorzeichnung gerendert.
- Das echte Symbol erzeugt der Nutzer mit seiner Bild-KI: `assets-src/app-symbol.png`, quadratisch, mindestens 1024 × 1024, Hintergrund bis zum Rand (keine Transparenz, keine runden Ecken, kein Text), Motiv in der Mitte mit Luft zum Rand.
- Danach: `node scripts/optimize-appicon.mjs` → `icon-192.png`, `icon-512.png` („any“, runde Ecken), `icon-maskable-192.png`, `icon-maskable-512.png` („maskable“: Bild auf 80 % verkleinert, Rand in der Randfarbe des Bildes; hat das Bild selbst schon genug Rand: `--maskable-scale 1`), `apple-touch-icon.png` (180, ohne Transparenz), `favicon-32.png`, `favicon-16.png`. Das Skript druckt, was es geschrieben hat. `ASSET_VERSION` muss dafür nicht erhöht werden: Die Symbole stecken in der Kennung des Builds.
- Bildschirmfotos für den Installationsdialog neu aufnehmen (Beispiel-Werkstatt, feste Uhrzeit, braucht Open-Meteo): `npm run preview`, dann `node scripts/optimize-appicon.mjs --screenshots http://localhost:4173`.
- Betriebssysteme merken sich Symbol und Namen beim Installieren. Nach einem neuen Symbol: App am Gerät entfernen und neu installieren (Chrome am Desktop und Android gleichen nach einiger Zeit selbst ab, das iPhone nie).

## Was der Service Worker tut
- **Oberfläche** (`/`, Skript, Stylesheet, Schriften als woff2, Manifest, kleine Symbole): beim Installieren in den Speicher `wb-shell-<Kennung>`. Die Kennung ist ein Hash über diese Dateien; jeder Build hat seinen eigenen Speicher, alte werden beim Aktivieren gelöscht.
- **Seitenaufruf**: zuerst Netz (3,5 s Wartezeit), nur ohne Netz oder bei einem Serverfehler (5xx) die gespeicherte Seite. So bleibt nie ein alter Build hängen. Die Antwort aus dem Netz wird nicht in den Speicher gelegt, damit Seite und Dateien im Speicher immer zum selben Build gehören.
- **Dateien des Builds**: zuerst aus dem Speicher.
- **Bilder** `/img/…`: beim ersten Gebrauch in `wb-img-<ASSET_VERSION>`, höchstens 120 Einträge (die ältesten fallen heraus). Nichts wird vorab geladen. Eine neue `ASSET_VERSION` leert diesen Speicher. Landschaften und Szenen haben kein `?v=`: Wer ein solches Bild unter gleichem Namen ersetzt, erhöht `ASSET_VERSION` (das galt wegen „ein Jahr, unveränderlich“ schon vorher).
- **Nie angefasst** (kein `respondWith`): alles unter `/api/` (Konto, Abgleich, Live-Kanal, private Dateien), alle fremden Adressen (Open-Meteo, Google), alles außer `GET`.

## Aktualisierung
- Nächster Start mit Netz: Die Seite kommt aus dem Netz, also läuft sofort der neue Build. Der neue Service Worker lädt im Hintergrund, die Seite erkennt „das ist mein Build“ und lässt ihn still übernehmen. Kein Hinweis, kein Neuladen.
- App läuft gerade (alter Build): Der neue Service Worker wartet. Unten erscheint „Neue Version verfügbar – Neu laden“ und bleibt stehen, bis der Nutzer tippt. Andere Hinweise (z. B. „Rückgängig“) haben Vorrang. Nichts lädt von selbst neu.
- Eine installierte App, die tagelang offen bleibt, fragt beim Zurückholen in den Vordergrund höchstens einmal je Stunde nach einem neuen Build.

## Server
- `server/index.js`: `sw.js` bekommt `no-cache` (die Regel „`.js` = ein Jahr, unveränderlich“ gilt für sie nicht). Manifest und Symbole fallen ohnehin unter `no-cache`. **`sw.js` darf nie lange im CDN liegen**, sonst bekommt niemand mehr einen neuen Build angekündigt.
- Die CSP braucht keine Änderung (`default-src 'self'` deckt Service Worker und Manifest; mit der echten CSP-Zeile im Browser geprüft).
- Alter PHP-Weg: `public/.htaccess` setzt für jede `.js`-Datei ein Jahr. Sollte dieser Weg je wieder live gehen, dort `sw.js` ausnehmen. Die App läuft dort auch ohne diese Änderung, nur käme ein neuer Service Worker verspätet an.
- Nach dem Einspielen `hosting_cache_clear` wie immer; danach prüfen: `curl -sI https://3druckwerkbank.com/sw.js` zeigt `cache-control: no-cache`.

## Prüfen
- `scripts/verify.mjs`: sechs Prüfungen „PWA: …“ (Manifest, Größen der Symbole, Service Worker steuert die Seite, nichts unter `/api/` im Speicher, Start ohne Netz, `/api` ohne Netz nicht aus dem Speicher).
- Von Hand in Chromium: DevTools → Application → Manifest / Service Workers / Cache Storage.

## Notausgang
Sollte ein Service Worker je Ärger machen: eine `sw.js` ausliefern, die nur alle Speicher löscht und sich abmeldet (`caches.keys()` → `delete`, `self.registration.unregister()`), und die Anmeldung in `src/main.tsx` entfernen. Die Datei `sw.js` nicht einfach löschen: Browser behalten den alten Service Worker sonst.
