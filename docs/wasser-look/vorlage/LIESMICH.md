# Wasser-Look: die Vorlage

Stand 13.11. Der fertige Wasser-Look als Vorlage, die man auf weitere Teile der App anwenden kann.
**Nichts hier ist in die App eingebaut**: Build und Website laden diese Dateien nicht, `src/`, `public/`, `server/`
sind unverändert. Die Vorlage wird von außen dazugeladen (Vorschauseite) oder in die laufende App eingespielt (Werkzeuge).

## Was hier liegt

| Datei | Inhalt |
|---|---|
| `kern.css` | Der Look selbst, für Handy und Desktop gleich: Schalter, die zwei Töne, alle Werte (`--wa-…`), die Bewegungssprache und die **Bausteine** (Tropfen, Becken, stilles Wasser, dichtes Wasser, Bogen, Mulde, Etikett, Feld, Wahl, Haken, Pegel, Perle, Ring, Markierung, Wasserlinie, Licht …). |
| `mobil.css` | Was nur die mobile Ansicht braucht: Seitenabdunklung, Maße der Karten, Menüleiste, Bogen am unteren Rand. |
| `desktop.css` | Der Platz für den Desktop. Noch leer, mit Hinweisen für den nächsten Schritt. |
| `wasser.js` | Das Skript: Wassertropfen (WebGL), Ring, fließende Markierung, Licht, Antwort aufs Scrollen, gemeinsames Ruhen. Zwei Befehle: `Wasser.start(optionen)` und `Wasser.stop()`. |
| `NOTIZEN.md` | Das Notizbuch für alle, die die Vorlage anwenden (englisch): Bausteine, Rezepte, Fallstricke, Prüfbefehle, offene Punkte. |

Bilder der mobilen Vorlage: `docs/wasser-look/bilder/mobil/`. Die Werkzeuge: `scripts/wasser/`.
Die früheren Zwischenstände bleiben unter `docs/wasser-look/entwurf/` (Sicherung; `entwurf/nachgebessert` ist der
freigegebene Stand, mit dem die Vorlage verglichen wird).

## Wie der Look ein- und ausgeschaltet wird

- **Wo:** Der Look gilt nur innerhalb des Elements mit dem Attribut `data-wasser` – mobil ist das `.m-shell`
  (`data-wasser="mobil"`), am Desktop später die Bühne (`data-wasser="desktop"`). Ohne das Attribut ist die App wie heute.
- **Zwei Töne = heller und dunkler Modus:** „dunkel“ ist der Standard, „klar“ wird mit `data-wa-ton="klar"` am
  `<html>`-Element gewählt. Ein Ton ist ein einziger Block von Werten in `kern.css`.
- **Bewegung aus:** Systemeinstellung „Bewegung reduzieren“ oder der Schalter der App (`data-motion="reduziert"`).

## Ansehen

Aus dem Projektordner (nach `npm install`):

```
python3 -m http.server 4310
```

dann im Browser mit schmalem Fenster (oder Handy-Ansicht der Entwicklerwerkzeuge, 390 × 844):

- http://localhost:4310/scripts/wasser/mobil.html – Ton „dunkel“
- http://localhost:4310/scripts/wasser/mobil.html?ton=klar – Ton „klar“
- `&scene=start|heute|projekte|material|druck|wetter|archiv|innen` – das Landschaftsbild dahinter
- `&alles=1` – dazu ein Bogen mit allen kleinen Bausteinen (Felder, Auswahl, Haken, Pegel); „Löschen“ zeigt einen Hinweis
- `&nah=1` – Nahaufnahme der Knöpfe (breites Fenster), `&fallback=1` – ohne WebGL, `&ohne=1` – die App wie heute

Mit `npm run dev` geht dieselbe Seite unter http://localhost:5173/scripts/wasser/mobil.html.

Die Vorschauseite ist ein Nachbau des mobilen Bildschirms mit den echten Stylesheets der App. Den Look **in der echten
App** zeigen die Werkzeuge (sie spielen ihn in die gebaute App ein, ohne sie zu ändern):

```
npm run build && npm run preview                 # die App unter http://localhost:4173 (in einem zweiten Fenster laufen lassen)
node scripts/wasser/bild.mjs /tmp/wasser-bilder  # Standbilder: acht Szenen, Nahaufnahmen, echte App, beide Töne
node scripts/wasser/film.mjs /tmp/wasser-film    # Bewegung als Bildstreifen (Reiterwechsel, Druck, Scrollen, Bogen, Haken)
node scripts/wasser/clip.mjs /tmp/wasser.mp4     # kurzer Film aus der echten App
```

## Prüfen (nach jeder Änderung an der Vorlage)

```
node scripts/wasser/vergleich.mjs     # Ist es noch der freigegebene Look? Bildpunkt für Bildpunkt und Stil für Stil
node scripts/wasser/pruefen.mjs --app # Funktioniert alles? Tropfen, Ring, Markierung, Bausteine, Ruhe, Start/Stopp
node scripts/wasser/kontrast.mjs --app  # Ist die Schrift lesbar? (Kontrast in beiden Tönen)
node scripts/wasser/messen.mjs ruhe   # Lebt es in Ruhe, und bleibt es ruhig?
```

Alle Werkzeuge erklären sich im Kopf ihrer Datei. Die App selbst prüft weiterhin `npm run build`.

## Stand der Prüfung

Die Vorlage zeigt denselben Look wie der freigegebene Stand (Zahlen in `NOTIZEN.md`, Abschnitt „Verified“).
**Noch nie auf einem echten Handy gelaufen** – alles wurde in Chromium und im WebKit-Testbrowser auf der Arbeitsmaschine
geprüft; ob es am iPhone flüssig läuft, ist offen.
