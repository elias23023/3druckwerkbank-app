# Wasser-Look: die Vorlage

**Die Anleitung zum Ansehen, Anwenden und Einbauen ist [`docs/Wasser-Look.md`](../../Wasser-Look.md)** – Bausteine mit
Rezepten, Dosierung, Töne, Bewegung, der Fahrplan für den Einbau in die App, Fallstricke, offene Punkte. Dort steht
auch der aktuelle Stand (14.11.: am Handy eingebaut und live, der Desktop in Arbeit) und was der Besitzer seither
entschieden hat. Dieses Blatt sagt nur, was in diesem Ordner liegt und was an der Vorlage zuletzt geprüft wurde; wo es
„nichts ist eingebaut“ sagt, gilt die Anleitung.

Stand 14.11. Der fertige Wasser-Look als Vorlage, die man auf weitere Teile der App anwenden kann – jetzt als
**zwei Vorlagen zum Ansehen: Handy und Desktop**.
**Nichts hier ist in die App eingebaut**: Build und Website laden diese Dateien nicht, `src/`, `public/`, `server/`
sind unverändert. Die Vorlage wird von außen dazugeladen (Vorschauseite) oder in die laufende App eingespielt (Werkzeuge).

## Was hier liegt

| Datei | Inhalt |
|---|---|
| `kern.css` | Der Look selbst, für Handy und Desktop gleich: Schalter, die zwei Töne, alle Werte (`--wa-…`), die Bewegungssprache und die **Bausteine** (Tropfen, Becken, stilles Wasser, dichtes Wasser, Bogen, Mulde, Etikett, Feld, Wahl, Haken, Pegel, Perle, Ring, Markierung, Wasserlinie, Licht …). |
| `mobil.css` | Was nur die mobile Ansicht braucht: Seitenabdunklung, Maße der Karten, Menüleiste, Bogen am unteren Rand. |
| `desktop.css` | Was nur die Desktop-Ansicht braucht: flache Becken für die Panels, das Dock mit der fließenden Perle, die Schublade von rechts, Antwort auf den Mauszeiger. |
| `wasser.js` | Das Skript: Wassertropfen (WebGL), Ring, fließende Markierung, Licht, Antwort aufs Scrollen, gemeinsames Ruhen. Zwei Befehle: `Wasser.start(optionen)` und `Wasser.stop()`; `Wasser.DESKTOP` sind die Angaben für den Desktop. |
| `NOTIZEN.md` | Das Notizbuch der Erbauer (englisch): alle Zahlen, Gründe und Messungen. Zum Anwenden zuerst die Anleitung `docs/Wasser-Look.md` lesen. |

Die Werkzeuge: `scripts/wasser/`. Bilder der Desktop-Vorlage: `docs/wasser-look/bilder/desktop/` (siehe unten).
Bilder der mobilen Vorlage: `docs/wasser-look/bilder/mobil/` –

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
  (`data-wasser="mobil"`), am Desktop die Bühne `.stage` (`data-wasser="desktop"`). Ohne das Attribut ist die App wie heute.
- **Zwei Töne = heller und dunkler Modus:** „dunkel“ ist der Standard, „klar“ wird mit `data-wa-ton="klar"` am
  `<html>`-Element gewählt. Ein Ton ist ein einziger Block von Werten in `kern.css`.
- **Bewegung aus:** Systemeinstellung „Bewegung reduzieren“ oder der Schalter der App (`data-motion="reduziert"`).

## Die Desktop-Vorlage ansehen

**Im eigenen Browser, mit der echten App** (das ist der beste Weg – nur dort sieht man, wie flüssig es läuft):

```
npm run build
node scripts/wasser/desktop.mjs zeigen
```

dann http://localhost:4320 öffnen. Das ist die gebaute App mit der Vorlage obendrauf; an der App wird nichts geändert.

- breites Fenster = Desktop-Vorlage, schmales Fenster (unter 900 px) = Handy-Vorlage – **beide Vorlagen in einem Fenster**
- der Ton folgt der Einstellung „Erscheinungsbild“ der App: **Dunkel → „dunkel“, Hell → „klar“, Automatisch → nach
  Tageszeit**. Fest wählen: `?ton=klar` oder `?ton=dunkel` an die Adresse hängen
- `?ohne=1` – die App wie heute (zum Vergleichen), `?weich=aus` – die Vorlage ohne Weichzeichner (falls es ruckelt),
  `?leben=1.5` – mehr Licht in Ruhe

**Bilder:** `docs/wasser-look/bilder/desktop/` –

- `dunkel-1-start` bis `dunkel-8-archiv`: alle acht Welten bei Nacht, 2000 × 993, Ton „dunkel“
- `klar-heute`, `klar-projekte`, `klar-wetter` (bei Tag) und `klar-heute-nacht`: der Ton „klar“
- `format-1920-material`, `format-1920-innenwelt`: zwei Welten in 1920 × 1080
- `vorher-nachher-heute`, `vorher-nachher-bogen`, `vorher-nachher-tag`: oben der Desktop von heute, unten die Vorlage
- `film-1` (Dock, Schublade, Ruhe), `film-2` (Knopfdruck mit Ring, Mauszeiger) und `film-3` (Pfeil neben der Insel
  gedrückt, Lauflinie eines Drucks): Bewegung als Bildstreifen
- `desktop.mp4`: ein Rundgang durch die echte App, am Ende der Wechsel zum Ton „klar“ (auf der Arbeitsmaschine
  aufgenommen: 6 bis 8 Bilder je Sekunde, daher ruckelig – am eigenen Rechner läuft es anders)

**Was am Desktop anders ist als am Handy** (Einzelheiten in `NOTIZEN.md`, Abschnitt 11):

- Die Inseln bleiben frei: Inseln, ihre Beschriftungen, der Tagesring, lose Schrift über der Landschaft und die
  handgeschriebenen Zeilen bekommen nichts. Kein Panel, kein Titel und keine Insel steht anders als heute (geprüft).
- Jedes Panel ist ein flaches Becken, dünner als eine Karte am Handy, damit das Bild durchscheint. Nur das eine große
  Panel einer Welt hat volles Licht (beide Ränder, Boden); die Seitenpanels tragen ein gedämpftes Randlicht, das unter
  dem Mauszeiger erwacht.
- Wenige lebende Tropfen: die drei runden Knöpfe der Kopfzeile, Knöpfe frei über der Landschaft, der Hauptknopf eines
  Panels, Knöpfe in der Schublade – 3 bis 9 je Bildschirm. Alle anderen Knöpfe auf Panels sind stilles Glas.
- Ein freier Tropfen bricht nur die Landschaft, nicht die Inseln davor. Deshalb liegt nirgends ein lebender Tropfen
  vor einer Insel (die Pfeile neben der Insel sind Perlen, die Wetterzeichen kleine stille Flächen).
- Das Dock ist die Leiste des Desktops: dieselbe Perle, die zur aktiven Welt fließt. Der Bogen ist hier eine Schublade,
  die von rechts hereinfließt.
- Maus statt Finger: Was man anklicken kann, wird unter dem Zeiger einen Hauch heller; die Tastatur zeigt überall die
  weiße Wasserlinie statt des blauen Rings; eine bewegte Maus hält das Wasser wach.

**Werkzeuge für den Desktop** (alle in `scripts/wasser/desktop.mjs`; brauchen `npm run build && npm run preview`):

```
node scripts/wasser/desktop.mjs bild /tmp/desktop --alles          # Standbilder: Welten, Bögen, Suche, Hinweis (--ton klar --zeit tag --format 1920)
node scripts/wasser/desktop.mjs film /tmp/desktop-film             # Bewegung als Bildstreifen
node scripts/wasser/desktop.mjs pruefen                            # 24 Prüfungen (Tropfen, Dock, Schublade, Maus, Ruhe, „nichts ist verrückt“, „nichts springt beim Drücken“)
node scripts/wasser/desktop.mjs kontrast                           # Lesbarkeit: beide Töne, Nacht und Tag
node scripts/wasser/desktop.mjs takt                               # Was der Look kostet (Bilder je Sekunde)
node scripts/wasser/desktop.mjs clip /tmp/desktop.mp4              # der Rundgang als Film
```

## Die Handy-Vorlage ansehen

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

**Die Desktop-Vorlage, 14.11.** (Zahlen in `NOTIZEN.md`, Abschnitt 11.4):

- Alle acht Welten, die Innenwelt, zwölf Bögen und Formulare, Suche, Hinweis, Tastatur und die leere Werkstatt wurden
  in beiden Formaten (2000 × 993 und 1920 × 1080), in beiden Tönen, bei Nacht und bei Tag angesehen, dreimal auch im
  WebKit-Testbrowser.
- `desktop.mjs pruefen`: 24 Prüfungen bestanden (22 bei der ersten Abgabe, zwei kamen nach der Kontrolle dazu) –
  darunter „nichts ist verrückt“: Panels, Titel, Kopfzeile und Inseln stehen wie in der App ohne Look (größte
  Abweichung 1,8 px); nur das Dock ist 21 px breiter.
- Lesbarkeit: kein Text unter der Grenze (Titel 7 : 1, Text 4,5 : 1) – in beiden Tönen, bei Nacht und bei Tag. Der
  Desktop von heute liegt bei Tag an elf Stellen darunter (das Bereichs-Etikett bei 1,0 : 1).
- **Die Handy-Vorlage ist unverändert**: derselbe Vergleich wie oben gegen den Stand vor dem Desktop-Schritt – kein
  einziger abweichender Bildpunkt (auch nicht in den Tropfen), kein abweichender Stil.
- An der Vorlage selbst wurde dabei verbessert, was das Anwenden schwer gemacht hat (Liste in `NOTIZEN.md`,
  Abschnitt 9, Punkt 8, und Fallstricke 47 bis 54).

**Nach der Kontrolle der Desktop-Vorlage nachgebessert (14.11.)** – ein unabhängiger Prüfer hat einen schweren und
vier mittlere Mängel gefunden (Tabelle in `NOTIZEN.md`, Abschnitt 11.4):

- **Behoben – die zwei Pfeile neben der Insel in „Projekte“.** Sie sprangen beim Drücken 23 px nach unten, ein Klick auf
  ihre Mitte oder obere Hälfte ging verloren (8 von 10 Probeklicks in Chromium, 7 von 10 im WebKit-Testbrowser). Ursache: eine Regel der Desktop-Vorlage war
  leichter als der Baustein „Perle“ und kam nie an. Jetzt: 60 Probeklicks in beiden Formaten, beiden Tönen, Chromium
  und WebKit-Testbrowser – keiner verloren. Die Pfeile sind dadurch auch zum ersten Mal das Rauchglas, das für sie
  gedacht war (vorher eine fast durchsichtige Perle, bei Tag kaum zu sehen). Bild: `film-3`.
- **Behoben – das letzte Blau der App.** Die Lauflinie eines laufenden Drucks (jetzt ein heller Lichtschein in einem
  Röhrchen, dreimal langsamer; sie ruht mit dem Wasser und steht, wenn Bewegung reduziert ist), die Zeichen der fünf
  Wetterschilder, das Zeichen eines Hinweises und das Zeichen „Nächstes“ in „Aktuelles im Projekt“. Farben, die etwas
  bedeuten (Statuspunkte, Material-Diagramm, Materialnamen), bleiben.
- **Nicht behoben, weil es die Anordnung der App ist:** In „Wetter“ steht bei 2000 × 993 das Schild „Luftdruck“ auf
  dem Namen der kleinen Insel „Archiv“. Das ist auch heute so (heute scheint der Name durch das dünne Glas und stößt
  mit dem Zeichen des Schilds zusammen; unter dem Wasser der Vorlage ist er ganz verdeckt). Ein Look kann nichts
  verschieben – das Schild oder die Insel muss in der App einen anderen Platz bekommen (`NOTIZEN.md`, Abschnitt 10,
  Punkt 8). Bei 1920 × 1080 steht der Name frei.
- **Nicht geändert, weil es das Material ist:** Die blassen Hintergrund-Inseln, über die die App schon heute Panels
  legt (vor allem in der Innenwelt eines Projekts), sieht man durch das Wasser weniger als durch das heutige Glas.
  Die großen Inseln, die sechs Inseln von „Start“ und ihre Namen sind unberührt.
- **Nicht geändert, aber nachgemessen – was es kostet:** Die Vorlage bringt in Chromium zum ersten Mal echten
  Weichzeichner auf den Desktop (heute keine einzige weichgezeichnete Fläche, mit Vorlage in „Heute“ und „Wetter“ 9 und
  12 auf 30 und 42 % des Bildschirms). Auf der Arbeitsmaschine, die ohne Grafikkarte rechnet: 15 bis 29 % weniger Bilder je Sekunde, beim
  Wechsel der Welt eine längste Pause von 267 bis 300 statt 183 bis 233 Millisekunden. Ohne Weichzeichner läuft die
  Vorlage so schnell wie die App heute. Was das auf dem eigenen Rechner heißt, zeigt nur der eigene Rechner:
  `?weich=aus` zum Vergleichen.
- Dabei sind zwei Prüfungen dazugekommen (`desktop.mjs pruefen`): Jedes anklickbare Element wird gedrückt und darf
  seinen Platz nicht verlassen; der Pfeil wird mit echtem Mauszeiger gehalten und muss blättern. Beide schlagen bei
  der Vorlage von vor der Korrektur an.
- **Die Handy-Vorlage ist unverändert** (derselbe Vergleich wie oben gegen den Stand vor diesen Korrekturen, in
  Chromium): 64 Bildpaare mit 99 Millionen Bildpunkten – kein einziger weicht ab, auch nicht in den Tropfen; kein
  abweichender Stil; dieselbe Bewegung in 12 Bildstreifen.

**Noch nie auf einem echten Handy und noch nie auf einer echten Grafikkarte gelaufen** – alles wurde auf der
Arbeitsmaschine geprüft; ob es am iPhone und am eigenen Desktop flüssig läuft, ist offen (die Arbeitsmaschine zeichnet
den Desktop von heute mit 9 bis 11 Bildern je Sekunde, die Vorlage mit 8). Womit man anfängt und welche eine Zeile
man jeweils ändert, steht in `NOTIZEN.md`: Abschnitt 13 fürs Handy, Abschnitt 11.5 für den Desktop.
