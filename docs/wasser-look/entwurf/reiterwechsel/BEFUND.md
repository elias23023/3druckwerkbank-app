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
