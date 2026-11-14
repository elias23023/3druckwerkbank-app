# Wasser-Look: die Vorlage

Stand 14.11. Der fertige Wasser-Look als Vorlage, die man auf weitere Teile der App anwenden kann.
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

Die Werkzeuge: `scripts/wasser/`. Bilder der mobilen Vorlage: `docs/wasser-look/bilder/mobil/` –

- `dunkel-start`, `klar-start`: die Vorschauseite in beiden Tönen; `dunkel-szenen`, `klar-szenen`: alle acht Landschaften
- `dunkel-nah`, `klar-nah`: die Knöpfe aus der Nähe (frei über der Landschaft und auf einer Karte)
- `dunkel-alles`, `klar-alles`: ein Bogen mit allen kleinen Bausteinen
- `dunkel-app`, `klar-app`: zwölf Bildschirme der echten App mit eingespielter Vorlage; `…-app-heute`: einer davon groß
- `bausteine`: jeder Baustein auf fremden Elementen, nur über seine neutrale Klasse (`.wa-…`)
- `film-tab`, `film-druck`, `film-bogen`: Bewegung als Bildstreifen (Reiterwechsel, Knopfdruck mit Ring, Bogen steigt)
- `mobil.mp4`: 25 Sekunden aus der echten App (auf der Arbeitsmaschine aufgenommen, daher etwas ruckelig)
- `leben-vergleich.mp4` und `leben-vergleich.png`: **Wie viel Leben?** Zwei Handys nebeneinander, links „Leben 1 (jetzt)“,
  rechts „Leben 1,5“ – 6 s Ruhe auf Start, Reiter „Heute“, Liste gerollt und angehalten, 4 s Ruhe. Zum Entscheiden,
  ob das Wasser in Ruhe so bleiben soll (ein einziger Wert: `--wa-leben` in `kern.css`)
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
node scripts/wasser/clip.mjs /tmp/wasser.mp4     # kurzer Film aus der echten App (mit --cast: scharf genug, um weiches Licht zu beurteilen)
node scripts/wasser/leben.mjs /tmp/leben --werte 1,1.5   # zwei Werte von „Leben“ nebeneinander: Film und Bildstreifen
```

## Prüfen (nach jeder Änderung an der Vorlage)

```
node scripts/wasser/vergleich.mjs     # Ist es noch der freigegebene Look? Bildpunkt für Bildpunkt und Stil für Stil
node scripts/wasser/pruefen.mjs --app # Funktioniert alles? Tropfen, Ring, Markierung, Bausteine, Ruhe, Start/Stopp, Zug, Töne
node scripts/wasser/kontrast.mjs --app  # Ist die Schrift lesbar? (Kontrast in beiden Tönen)
node scripts/wasser/messen.mjs ruhe   # Lebt es in Ruhe, und bleibt es ruhig?
```

Alle Werkzeuge erklären sich im Kopf ihrer Datei. Die App selbst prüft weiterhin `npm run build`.

## Stand der Prüfung

Die Vorlage zeigt denselben Look wie der freigegebene Stand: in Chromium und im WebKit-Testbrowser kein einziger
abweichender Bildpunkt außerhalb der Tropfen und kein abweichender Stil (Zahlen in `NOTIZEN.md`, Abschnitt 9).
Dabei gefunden und in der Vorlage behoben: Im WebKit-Testbrowser wurden die Tropfen der Kopfzeile nach einem
Seitenwechsel gelegentlich schwarz (im freigegebenen Stand bei 8 von 48 Wechseln, in der Vorlage bei keinem).

**Nachgebessert am 14.11.** (nach zwei unabhängigen Prüfungen des Pakets; Zahlen in Abschnitt 9):

- Der Ton „dunkel“ ist in Ruhe unverändert – kein einziger Bildpunkt.
- Im Ton „klar“ sind die klaren Tropfen auf Karten etwas weniger silbrig: ihre weiße Schrift ist wieder so gut
  lesbar wie vor dem Aufhellen der Seite (ein einziger Wert, `--wa-drop-veil`).
- Das Licht einer Karte schwingt jetzt auch dann aus, wenn man gleich nach dem Reiterwechsel rollt.
- Der Regler „Leben“ (`--wa-leben`, 0 bis 2) kann nichts mehr aus einer Karte hinausschieben.
- Zum Entscheiden liegt der Vergleich „Leben 1 gegen 1,5“ bei den Bildern (`leben-vergleich`). Ehrlich gesagt: Der
  Unterschied ist auf Handygröße kaum zu sehen; mehr Leben käme vom Tempo des Lichts, nicht von seiner Stärke.

**Noch nie auf einem echten Handy gelaufen** – alles wurde auf der Arbeitsmaschine geprüft; ob es am iPhone flüssig
läuft, ist offen. Womit man am Handy anfängt und welche eine Zeile man jeweils ändert, steht in `NOTIZEN.md`,
Abschnitt 13.
