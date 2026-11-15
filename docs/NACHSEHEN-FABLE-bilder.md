# NACHSEHEN – neue Bilder (Branch `welt/neue-bilder`, 15.11.)

Zusammengeführt: `welt/neue-bilder-inseln` (neun Projektinseln) und `welt/neue-bilder-hintergruende` (Alpensee, 24 + 24 Bilder, graue Regenfassung) auf `origin/main` mit dem Wasser-Look-Feinschliff.
Hier steht, was nach Augenmaß entschieden wurde, was ungeprüft ist und wo Risiken liegen. Bitte mit eigenem Auge nachsehen.

## Zusammenführung
- Konflikte nur in `src/mobile/Mobile.tsx` und `src/mobile/mobile.css`. `SceneBg` (weiches Überblenden) bleibt, `MobileBg` des Hintergrund-Zweigs ist entfallen. Das Bild wählt jetzt Jahreszeit × Tageszeit statt Reiter.
- `usePreloadScenes` lädt das Bild der nächsten Tageszeit vor. Bei grauem Wetter zusätzlich das Bild der Stunde. Nachts wird die Morgendämmerung des nächsten Tages gefunden. Geprüft mit festem Wetter: 12:30 → abend, Regen 12:30 → mittag + abend, 21:00 → daemmerung, 15:30 → abend + blau.
- Das eigentliche Überblenden beim Wechsel der Tageszeit habe ich nur im Ergebnis gesehen (das neue Bild steht da), nicht Bild für Bild. `SceneBg` selbst ist unverändert.
- Die Nachladeliste (`preloaded`) gilt je Seitenaufruf. Ein Bild wird nie zweimal vorgeladen.

## Zwischenspeicher (CDN)
- `ASSET_VERSION` = `20261115a`. Alle drei Bildadressen tragen jetzt `?v=`: Inseln (wie bisher), Landschaften (`Landscape.tsx`, neu) und Handy-Hintergründe (`Mobile.tsx`, neu).
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
- Nachts gibt es keinen gemalten Mond mehr (das neue Nachtbild hat keinen). Siehe `vgl-start-nacht.jpg`.
- Die kleinen fernen Inseln des Karussells (Projekte) stehen jetzt vor den Bergen statt im Himmel. Das war vorher ähnlich, fällt vor Fels aber mehr auf. Siehe `nachher-projekte-2000x993.png`.

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

## Größe
- Die Bildquellen (PNG) in `assets-src`: 31 MB neue Inseln, 148 MB Hintergründe (Desktop und Handy; 16 alte Landschaften überschrieben, die alten bleiben in der Git-Historie). Das Repo wird um gut 130 MB größer. `public/img`: Desktop-Landschaften rund 15 MB, Handy 6,3 MB.
- Die Prüfung im Build (`check-hintergruende.mjs`) braucht ein Node, das TypeScript direkt lädt (hier 22.23).
