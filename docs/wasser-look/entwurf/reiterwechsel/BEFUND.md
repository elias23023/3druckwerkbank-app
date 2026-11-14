# Reiterwechsel am Handy: kurze Wartezeit (Befund vom 14.11.)

Anlass: Entscheidung 11. Der Eigentümer sah am echten Handy auf der Baustelle: Alles läuft flüssig, nur beim Tippen auf einen Reiter dauert es kurz, bis die Seite wechselt. Er vermutete das erste Laden.

## Gemessen
Stand `main` 65b1e44 (Look am Handy eingebaut, Tageskarte), gebaute App, Chromium im Container (Software-Grafik, Maschine nebenbei belastet: Zahlen sind Größenordnungen, kein echtes Handy). Werkzeuge: `messen.mjs` (Zeit vom Tippen bis das erste Bild der neuen Seite steht, erster und zweiter Besuch, mit Look, mit gestopptem Look, mit langsamem Netz) und `profil.mjs` (CPU-Profil eines Wechsels).

| | ohne Look | mit Look |
|---|---|---|
| Bild der neuen Seite steht nach | 40–50 ms | 140–500 ms |
| lange Aufgabe direkt nach dem Wechsel | keine | eine, 90–220 ms (4-fach gebremst 200–370 ms) |
| zweiter Besuch desselben Reiters | gleich | gleich langsam wie der erste |

Das erste Laden kommt nur obendrauf: Bei langsamem Netz ist die Szene beim ersten Besuch erst nach 550–985 ms da (das Bild der Seite steht früher, der Hintergrund kommt nach). Beim zweiten Besuch fällt das weg, die lange Aufgabe bleibt.

## Ursache
Das Profil zeigt eine einzige Stelle: `loadScene()` in `wasser.js` (Abschnitt „landscape texture“). Die App ersetzt das Szenenbild bei jedem Reiterwechsel durch ein neues `<img>`. Das Skript zeichnet es dann sofort und im selben Takt mit `drawImage` auf eine Fläche von 2048 × 1024 (dekodieren, hochskalieren), lädt es als Textur hoch und baut die Verkleinerungsstufen. Über 90 % der langen Aufgabe sind dieser eine `drawImage`-Aufruf. Das passiert bei jedem Wechsel neu, auch wenn die Szene schon einmal da war.

Die übrige Arbeit beim Wechsel (React, Tropfen suchen, Lichter) liegt zusammen unter 30 ms.

## Was im Feinschliff zu tun ist
1. Texturen je Szene behalten (kleiner Vorrat nach Bildadresse, acht Szenen): Der zweite Besuch kostet dann nichts mehr.
2. Nicht im Takt des Wechsels dekodieren: `createImageBitmap(img, { resizeWidth, resizeHeight })` oder `img.decode()` abwarten und erst dann hochladen; bis dahin bleibt die alte Szene in den Tropfen stehen (das Skript kann das schon: „keep the old picture until the new one has loaded“).
3. Prüfen, ob 1024 × 512 für die Textur reicht (die Tropfen sind klein, das Bild darin ist gebrochen und weich). Ein Viertel der Bildpunkte.
4. In der App die Szenen der anderen Reiter in einer ruhigen Sekunde nach dem Start vorladen (Netz), damit auch der erste Besuch nicht wartet.
5. Danach mit `messen.mjs` nachmessen: Ziel ist keine lange Aufgabe über 50 ms beim Wechsel und „Bild steht“ nahe am Wert ohne Look. Am echten Handy bestätigt das nur der Eigentümer.

## Behoben am 14.11. (abends, Schritt „Reiterwechsel ohne Wartezeit“)

### Was die Messung genauer zeigte
Die Zerlegung mit eingewickelten Aufrufen (jeder `drawImage`, `getImageData`, `texImage2D` … gezählt) zeigt auf dieser Maschine ein anderes Bild als oben: Der `drawImage`-Aufruf, der den Großteil der langen Aufgabe ausmacht, ist **nicht** das Szenenbild, sondern das Kopieren des Wasserbilds in die Leinwände der Tropfen (`render()`). Chromium zeichnet eine 2D-Leinwand verzögert; das Szenenbild selbst kostete hier 25 bis 50 ms je Wechsel (in `getImageData` und `texImage2D`), das erste Wasserbild der neuen Seite 50 bis 160 ms – auf dieser Maschine rechnet WebGL in Software, und das Kopieren wartet auf das Rechnen. Auf einem Handy mit Grafikchip ist das Kopieren billig; dafür kosten dort Dekodieren, Hochladen und Verkleinerungsstufen des Szenenbilds echte Zeit. Beides ist jetzt aus dem Takt des Wechsels genommen.

### Gebaut (Vorlage `wasser.js`, Teil 1; App `src/mobile/Mobile.tsx`)
1. **Ein Vorrat an Szenen-Texturen** nach Bildadresse, höchstens sechs (die am längsten nicht gebrauchte geht zuerst, nie die gezeigte). Eine Textur 2048 × 1024 mit Verkleinerungsstufen kostet 8,4 MB, wo der Grafikchip RGB als RGBA hält (iPhone, wahrscheinlich) 11,2 MB: höchstens rund 67 MB. Der zweite Besuch kostet kein Dekodieren und kein Hochladen.
2. **Dekodieren außerhalb des Takts:** die Bytes aus dem Browser-Cache (`fetch`, `force-cache`), `createImageBitmap(blob)` dekodiert auf einem anderen Faden; dann auf eine Leinwand skaliert wie bisher, in vier Streifen, einer nach jedem Bild (`texSubImage2D`), Verkleinerungsstufen nach dem letzten. Gleiche Texel wie vorher (Chromium: webp und avif geprüft). Bis die neue Szene fertig ist, zeigen die Tropfen die alte; eine Szene für eine Seite, die schon wieder verlassen ist, wird aufgegeben. Ersatzweg ohne `createImageBitmap`: `img.decode()` und das Bild selbst, dort bleibt der WebKit-Schutz gegen ein leeres Bild (ein Bildpunkt aus der Mitte, bis zu 30 Mal nach dem nächsten Bild).
3. **Texturgröße: bleibt 2048 × 1024.** Bei 1024 × 512 ist der Zahnrad-Tropfen auf „Projekte“ über den Blättern vergrößert sichtbar weicher (bis 27/255 auf 0,5 % seiner Bildpunkte); Tropfen über Himmel weichen nur um 1/255 ab.
4. **Vorladen in der App** (`usePreloadScenes`): 1,2 s nach dem Start, in einem ruhigen Moment (`requestIdleCallback`), die Szenen der anderen vier Reiter mit demselben `srcset` und `sizes` wie das `<img>` der Seite; nicht, wenn die Verbindung Daten sparen will. Sie gehen an `Wasser.warm()`: Das Skript macht sie nacheinander zu Texturen, solange nichts anderes ansteht. Gemessen lohnend: Ohne das zeigten die Tropfen der Kopfzeile beim ersten Besuch eines Reiters eine Viertelsekunde lang (bis 1 s) noch die alte Szene – genau das, was Schritt 8 der Anleitung unter „Darf nicht passieren“ nennt.
5. **Das erste Bild einer neuen Seite** geht ohne die Arbeit der Tropfen hinaus; ihr erstes Wasserbild folgt im nächsten Bild (bei reduzierter Bewegung sofort, wie bisher).
6. **Desktop:** Ein Weltwechsel tauscht das Landschaftsbild nicht (es hängt am Look der Stunde) – dort wirkt nur Punkt 5. Ein Wechsel der Landschaft läuft durch denselben Weg wie am Handy (Punkte 1, 2).

### Gemessen (14.11., 18:30–19:00, gebaute App, Chromium, Handy 390 × 844 @3x; je App und Bremse drei Läufe, jeder Reiter einmal zum ersten und einmal zum zweiten Mal; Median / größter Wert, ms)
Werkzeug: `node scripts/wasser/reiter.mjs handy --app vorher=<dist von feinschliff-basis>,nachher=<dist dieses Stands> --drossel 1,4 --laeufe 3 --ohne --gestoppt` – die beiden Builds aus Ordnern ausgeliefert mit den Cache-Kopfzeilen des Live-Servers, ohne abgefangene Anfragen (Fallstricke 59, 60 in `NOTIZEN.md`).

| CPU | App | Besuch | Bild steht | längste Aufgabe | Szene in einer Aufgabe | Aufgaben > 50 ms, meist Szene |
|---|---|---|---|---|---|---|
| ×1 | vorher | erster / zweiter | 88/131 · 117/190 | 98/127 · 106/161 | 0/57 · 25/39 | 3 · 0 |
| ×1 | **nachher** | erster / zweiter | **30/100 · 30/59** | 56/108 · 53/114 | **0 · 0** | **0 · 0** |
| ×1 | Skript gestoppt (nur CSS) | | 23/34 · 27/33 | – | – | – |
| ×1 | ohne Look | | 26/33 · 26/33 | – | – | – |
| ×4 | vorher | erster / zweiter | 367/537 · 314/356 | 275/399 · 245/316 | 182/269 · 106/139 | 12 · 2 |
| ×4 | **nachher** | erster / zweiter | **123/197 · 108/151** | 101/152 · 101/165 | **0 · 0** | **0 · 0** |
| ×4 | Skript gestoppt (nur CSS) | | 72/129 · 49/139 | | | |
| ×4 | ohne Look | | 59/122 · 38/76 | | | |

- **Ungebremst steht das neue Bild so schnell wie ohne Look** (30 gegen 26 ms im Median). Keine Aufgabe mehr, die Szenenarbeit ist – auch nicht beim ersten Besuch.
- **Viermal gebremst** bleiben rund 50 ms zum Look mit gestopptem Skript. Aufgeteilt: Vom Tipp bis React fertig ist, wartet die Seite 54 statt 15 ms – das sind Bilder des fließenden Wassers, die gerade laufen, wenn der Tipp kommt (hier je 60 bis 150 ms, weil WebGL in Software rechnet; ein Grafikchip macht das in wenigen ms). Von „React fertig“ bis zum Bild 65 statt 39 ms: Vermessen der neuen Knöpfe, Lichthelfer, Perle. Das Szenenbild ist nicht mehr dabei.
- **Wann die Tropfen die neue Szene zeigen:** zweiter Besuch 37 ms (×4: 119), erster Besuch dank Vorladen 45 ms (×4: 132) – also im Bild nach dem Wechsel. Mit dem Vorrat, aber noch ohne Vorladen waren es beim ersten Besuch 264 ms im Median, bis 1023 ms (×1; gemessen gegen `vite preview` mit abgeschaltetem HTTP-Cache, also eher zu lang).
- Längste Aufgaben über 50 ms bleiben nachher: Das sind die Bilder des Wassers selbst (5 Tropfen, Software-WebGL), nicht der Wechsel.
