# NACHSEHEN – neue Bilder (Branch `welt/neue-bilder`, 15.11.)

Zusammengeführt: `welt/neue-bilder-inseln` (neun Projektinseln) und `welt/neue-bilder-hintergruende` (Alpensee, 24 + 24 Bilder, graue Regenfassung) auf `origin/main` mit dem Wasser-Look-Feinschliff.
Hier steht, was nach Augenmaß entschieden wurde, was ungeprüft ist und wo Risiken liegen. Bitte mit eigenem Auge nachsehen.

## Zusammenführung
- Konflikte nur in `src/mobile/Mobile.tsx` und `src/mobile/mobile.css`. `SceneBg` (weiches Überblenden) bleibt, `MobileBg` des Hintergrund-Zweigs ist entfallen. Das Bild wählt jetzt Jahreszeit × Tageszeit statt Reiter.
- `usePreloadScenes` lädt das Bild der nächsten Tageszeit vor. Bei grauem Wetter zusätzlich das Bild der Stunde. Nachts wird die Morgendämmerung des nächsten Tages gefunden. Geprüft mit festem Wetter: 12:30 → abend, Regen 12:30 → mittag + abend, 21:00 → daemmerung, 15:30 → abend + blau.
- Das eigentliche Überblenden beim Wechsel der Tageszeit habe ich nur im Ergebnis gesehen (das neue Bild steht da), nicht Bild für Bild. `SceneBg` selbst ist unverändert.
- Die Nachladeliste (`preloaded`) gilt je Seitenaufruf. Ein Bild wird nie zweimal vorgeladen.

## Zwischenspeicher (CDN)
- `ASSET_VERSION` = `20261115b` (nach den Korrekturen, siehe unten; vorher `20261115a`). Alle drei Bildadressen tragen jetzt `?v=`: Inseln (wie bisher), Landschaften (`Landscape.tsx`, neu) und Handy-Hintergründe (`Mobile.tsx`, neu).
- Die Landschaften `landschaft-<jahreszeit>-<morgen|mittag|abend|nacht>` behalten ihren Namen, haben aber neuen Inhalt. Ohne `?v=` hätte das CDN ein Jahr lang die alten Bilder gezeigt.
- Der Bild-Zwischenspeicher der installierbaren App (`sw.js`) heißt nach `ASSET_VERSION` und wird damit neu angelegt. Nach dem Einspielen trotzdem `hosting_cache_clear`.

## Abdunkelung am Handy (Wasser-Look)
- Die neuen Bilder sind **oben** heller (Schnee, Himmel hinter der Kopfzeile), nicht unten. Darum nur `--wa-page-1` von .35 auf .58, in beiden Tönen, in der Vorlage `docs/wasser-look/vorlage/kern.css` geändert und mit `uebernehmen.mjs` kopiert. `mobile.css` (ohne Look) hat denselben Wert.
- Der Hintergrund-Zweig hatte das als Überschreibung auf `.m-bg` gelöst. Das habe ich verworfen, weil der Feinschliff Tonwerte nur in der Vorlage ändern will.
- Gemessen (`kontrast.mjs --app`, dunkel und klar, 11:57 Uhr, Herbst-Mittag): kein Mittelwert unter der Grenze. Knapp: Fußnote auf „Mehr“ (dunkel) 4,6 (schlechteste 5 %: 4,5), Platzhalter klar 4,6 (4,2; Grenze 3), Tropfen frei über der Szene 4,4 im schlechtesten Teil.
- Schriftzug „3Druckwerkbank“ in der Kopfzeile: nachher 8,2, vorher 3,9 (unter der Grenze 4,5).
- Die Gipfel oben wirken dadurch dunkler. Ob das gefällt: Augenmaß des Besitzers.
- Nicht gemessen: die grauen Regenbilder, die Nacht- und Abendbilder in der App (nur die Vorschauseite mit sommer-abend), Handys mit anderem Seitenverhältnis.

## Handy-Bilder
- Auflösung nur 830 px breit (Quelle 830–852). Auf Handys mit 3-facher Pixeldichte (390 × 3 = 1170 px) wird das Bild hochskaliert und wirkt weicher als die alten Szenen (1280). Besser wären größere Quellbilder vom Nutzer.
- Ausschnitt `--m-bg-pos: 50% 10%` (Gipfel oben). Nur auf 390×844 angesehen. Auf Tablets im Hochformat können die Gipfel angeschnitten werden.
- Die 1896 hohen Bilder sind unten um 50 px beschnitten, die 852 breiten mittig auf 830. Entscheidung des Hintergrund-Zweigs.
- Retusche herbst/blau (Desktop): bei 3-facher Vergrößerung unauffällig. Das Hochformatbild herbst/blau ist nicht auf einen ähnlichen Fleck untersucht.
- Auf dem Handy-Start verdecken die Karten fast das ganze Bild. Gestaltungsfrage.

## Graue Regenfassung
- Nur Farbarbeit aus dem Mittagsbild (`scripts/grade-regen.mjs`): weniger Farbe, dunkler, kühler, Dunst. Kein Regen, keine Wolken. Ein echtes Regenbild vom Nutzer wäre besser.
- Die Handy-Fassung nur in der Übersicht gesehen, nicht in der App.

## Licht am Desktop
- Sonnenschein und Strahlen sind jetzt sehr zurückhaltend und enden bei 38 % der Höhe. Werte in `LOOK_META` und die Maske sind Einschätzungen des Hintergrund-Zweigs.
- Nachts gibt es keinen gemalten Mond mehr (das neue Nachtbild hat keinen). Seit den Korrekturen auch keinen Lichtschein mehr (`LOOK_META.nacht.glow` 0). Siehe `vgl-start-nacht.jpg`.
- Die kleinen fernen Inseln des Karussells (Projekte) stehen jetzt vor den Bergen statt im Himmel. Das war vorher ähnlich, fällt vor Fels aber mehr auf. Siehe `nachher-projekte-2000x993.png`.
- Die beiden fernen Karussell-Inseln (±2) stehen seit den Korrekturen bei 35,5 % statt 39 % Höhe (siehe unten).

## Projektinseln
- Freistellen mit neuer Option `--waterfall`: der Schaum läuft auf 90 px weiß aus. Teils bleiben Streifen (Organizer, Halterung). Nur der stärkste Wasserfall je Insel wird erkannt; schwächere (Technik, am Wasserrad) laufen ohne Ausblenden aus.
- `cutout-holes`: 258 Stellen einzeln angesehen, 28 per Schutzkasten erhalten (Glas, Licht, Messschieber, Schaum). Grenzfälle: Lücken am Birkenstamm (Organizer), neben Lupinen (Garten). Fensterflächen außer dem Gewächshaus nicht eigens geprüft. Die Schutzkästen passen nur zum heutigen Freistellen.
- Die neuen Inseln sind breit. Bei gleicher Breite wirken sie in der Innenwelt kleiner als die alten, hohen Inseln.
- Namen und Beschreibungen im Formular hat der Insel-Zweig selbst gewählt („Werkstatt am Bach“ gegen Verwechslung mit „Werkstatt“).
- Kein Schatten unter den Inseln (wie bisher).
- Unbekannte Insel-Ids zeichnen jetzt die Werkstatt-Insel statt abzustürzen (`knownIsland`). Die gespeicherte Id bleibt.
- Umstellung gespeicherter Demo-Stände auf die neuen Inseln: nur gelesen und gebaut, nicht mit einem alten localStorage-Stand getestet. Bereich `echt` bleibt unberührt.
- Live-Abgleich mit Konto für die neuen Ids nicht getestet (der Server prüft keine Ids).

## Prüfungen
- `npm run build` und `VITE_API=node npm run build` fehlerfrei. `verify.mjs`: 80/80 (mit festem und echtem Wetter; Open-Meteo antwortete diesmal).
- `scripts/wasser/pruefen.mjs --app`: alle bestanden.
- `scripts/wasser/desktop.mjs pruefen`: **eine Prüfung schlägt fehl** („Nichts ist verrückt“, Größenänderung 18,7 px). Sie schlägt auf `origin/main` (b7f8d0b) genauso fehl, hat also nichts mit den Bildern zu tun. Ursache nach meiner Messung: Die Untertitelzeile im Feldkopf von „Archiv“ bricht ohne Look in zwei Zeilen um, mit Look in eine. Die Meldung nennt fälschlich „material“ (sie nennt die größte Verschiebung, nicht die größte Größenänderung). Sache des Wasser-Look- oder Felder-Chats.
- `kontrast.mjs --app` dunkel und klar: bestanden (siehe oben).
- Die ältere Prüfung „Herbst im November“ und die 06:05-Morgendämmerung in `verify.mjs` hängen am Datum und schlagen ab Dezember fehl (war schon vorher so).

## Werkzeuge des Wasser-Looks
- `scripts/wasser/mobil.html` (Vorschauseite) lud die gelöschten Seitenszenen. Jetzt steht jeder der acht Szenennamen für ein Alpensee-Bild (start = herbst-mittag, wetter = sommer-abend, innen = sommer-mittag, …). Diese Zuordnung ist meine Wahl: die hellsten oben zuerst.
- Auf der Vorschauseite tauscht ein Reiterwechsel weiter das Bild, in der App nicht mehr. `reiter.mjs` misst damit in der App keinen Bildwechsel mehr beim Reiterwechsel.
- Alte Entwürfe unter `docs/wasser-look/entwurf/` laden noch die alten Szenen. Nicht angefasst.
- **Abweichung zum laufenden Branch `wasser-look`:** Dort gibt es weiter Seitenszenen je Reiter und deren Vorladen. Wer dort weiterarbeitet, muss auf diesen Stand umstellen, sonst kommen die alten Szenen zurück oder fehlen die Bilder.

## Korrekturen nach der Prüfung (15.11., zweiter Durchgang)
Zwei Prüfer haben sechs Punkte gemeldet. Jeder wurde zuerst nachgestellt.
- **Wasserfall-Enden Smart Home und Technik** (bestätigt: auf #14161c endet der Schaum in eckigen, dunklen Kerben). Neue Option `cutout-islands.mjs --waterfall --mist`: Im unteren Teil der Wasserfallspalten (und 70 px daneben) wird nur der Alpha-Kanal von Schaum und Hintergrund weichgezeichnet (dreimal Kastenfilter, Radius 4). Fels und Wurzeln zählen nicht mit, die Farbe bleibt. Nur diese zwei Inseln, aus den Originalbildern neu freigestellt. Das alte Verfahren ergab vorher dieselben Bytes wie die eingecheckten PNG, also ist der Neuaufbau sauber. Außerhalb des Wasserfallbereichs ist jedes Pixel gleich geblieben.
  - `cutout-holes.mjs` hätte den neuen Nebel als „eingeschlossene weiße Fläche“ wieder ausgeschnitten. Darum gibt es je Insel einen weiteren Schutzkasten unter dem Fall (`[200,780,510,1010]`, `[500,900,780,1006]`). Danach schneidet `cutout-holes` genau dieselben Stellen wie vorher (34 Regionen/14066 px und 19/30084).
  - Technik ist dadurch 1001 statt 1005 px hoch (`ISLAND_META`). `ASSET_VERSION` steht jetzt auf `20261115b`.
  - Nachsehen: Der Nebel wirkt auf sehr dunklem Grund als grauer Schleier unter dem Fall. Bei Smart Home liegen links zwischen den dünnen Strähnen weiche dunkle Lücken. Organizer und Halterung (Streifen) sind nicht angefasst. Vergleich vorher, nachher und auf Blau: `nb-fix/ab-smarthome.png`, `nb-fix/ab-technik.png` im Scratchpad.
- **Lichtschein „Mondnacht“** (bestätigt: keines der vier Nachtbilder hat einen Mond oder eine helle Stelle bei 74 %/4 %). `glow` für `nacht` ist jetzt 0, das Label bleibt.
- **Schild „ESP32-Wettergehäuse“ über der Baumkrone von art-reparatur** (bestätigt: 1920×1080 rund 30 px, 2000×993 rund 33 px). Gespiegelt lag rechts auch „Werkzeug-Organizer“ auf art-halterung. Die fernen Karussell-Inseln (±2) stehen jetzt bei `y: 35.5` statt 39 (`worldLayouts.ts`). Für alle fünf Karussell-Stellungen und beide Formate nachgemessen: kein Schild liegt mehr auf deckenden Pixeln (Alpha über 40) einer anderen Insel.
  - Nicht neu, nicht angefasst: Das Feld „Projekte“ (Weltkopf) liegt in beiden Formaten über der blassen fernen Welt-Insel „Heute“ (`FAR`, Deckkraft 0,55). Das ist auf `origin/main` genauso.
- **README.md** (bestätigt): Der Abschnitt „Bilder austauschen“ beschreibt jetzt sechs Tageszeiten, die graue Fassung `-regen` (`prepare-alpensee.mjs`, `grade-regen.mjs`, `check-hintergruende.mjs`) und die Handybilder `szene-<jahreszeit>-<phase>` (830/540). `--mist` steht dort und in CLAUDE.md.
- **Handy lädt beim ersten Start ein Bild doppelt** (bestätigt: 12:30 Regen erst `mittag`, dann `regen`; 17:15 erst `abend`, dann `blau`). Ohne gespeichertes Wetter wartet das Hintergrundbild jetzt auf die erste Wetterantwort, höchstens 1,2 s (`BG_WAIT`, `Mobile.tsx`). Die Ebene `.m-bg` mit ihrer Abdunkelung ist von Anfang an da. Das Vorladen der nächsten Tageszeit wartet ebenso. Nachgemessen: Mit 400 ms Wetter kommt nur noch ein Bild, mit 3 s Wetter verhält es sich wie vorher (nach 1,2 s das Bild ohne Wetter). Die Tropfen (`Wasser.info.scene`) zeigen danach das richtige Bild. `scripts/wasser/pruefen.mjs --app`: alle bestanden.
  - Nachsehen: Beim allerersten Start ist das Handy bis zur Wetterantwort (bis 1,2 s) ohne Bild, nur dunkel. Später kommt das Wetter aus dem Speicher und es gibt keine Wartezeit. Ein veralteter gespeicherter Wetterstand (z. B. von gestern) wird nicht abgewartet. Der Desktop (`Landscape`) verhält sich wie auf `origin/main` (auch dort ein Bild zu viel beim ersten Start); nicht geändert.
- **Modellname im Dateinamen** (`NACHSEHEN-FABLE-bilder.md`): Entscheidung des Hauptchats. Nicht umbenannt, weil es das bestehende Muster auf `origin/main` ist (`NACHSEHEN-FABLE-felder.md`) und der Auftrag diese Datei nennt.
- Bilder in `neue-bilder-bilder/` neu: `inseln.jpg` (Zellen Smart Home und Technik), `nachher-projekte-2000x993.png`, `nachher-projekte-abend-2000x993.png`, rechte Hälften von `vgl-projekte.jpg` und `vgl-start-nacht.jpg`. Diesmal mit festem Wetter (klar) aufgenommen.
- Prüfungen nach den Korrekturen: `npm run build` und `VITE_API=node npm run build` fehlerfrei. `verify.mjs`: 80/80 (zwei Läufe davor 79/80, jeweils nur „Mobile: no console errors“ wegen 429 von Open-Meteo, also Netz). `scripts/wasser/pruefen.mjs --app`: alle bestanden. `desktop.mjs` und `kontrast.mjs` nicht erneut gelaufen.
- Hinweis für Tests: Mit Playwright-Uhr auf einem früheren Tag als heute und echtem Open-Meteo liegt der Sonnenaufgang der Antwort in der Zukunft, und die App zeigt mittags die Nacht. Das ist ein Messfehler, kein Fehler der App. Mit festem Wetter (`wetter-mock.mjs`) messen.

## Größe
- Die Bildquellen (PNG) in `assets-src`: 31 MB neue Inseln, 148 MB Hintergründe (Desktop und Handy; 16 alte Landschaften überschrieben, die alten bleiben in der Git-Historie). Das Repo wird um gut 130 MB größer. `public/img`: Desktop-Landschaften rund 15 MB, Handy 6,3 MB.
- Die Prüfung im Build (`check-hintergruende.mjs`) braucht ein Node, das TypeScript direkt lädt (hier 22.23).
