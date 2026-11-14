# Ein gedrückter Tropfen bleibt stehen, wenn sich ein Bogen öffnet (Befund vom 14.11., 13:30)

Gemeldet vom Eigentümer an der echten Seite, eine halbe Stunde nachdem der Desktop live ging:
„wenn ich auf einen Button klicke, bei dem sich dann ein größeres Feld öffnet, dann stoppt in dem Moment, wo sich das Feld öffnet, die Animation und bleibt dann quasi mit der Wasserperle so stehen.“ Am Desktop und am Handy.

## Nachgestellt
Stand 9c4afa7 (live), gebaute App, Chromium. `probe.mjs` tippt einen Tropfen an, der einen Bogen öffnet, und nimmt ihn vor dem Tippen und 60, 200, 500, 1000, 2500 und 6000 ms danach auf.

Handy, Zahnrad oben rechts (`handy-streifen.png`, links der ruhende Tropfen, dann die sechs Zeitpunkte): Der Tropfen zeigt die Ringe der Berührung, und zwar in allen sechs Bildern genau gleich. Er bleibt so stehen, solange der Bogen offen ist. `Wasser.info.drops` fällt beim Öffnen von 4 auf 1.

Am Desktop verdeckt die Schublade von rechts die Knöpfe der Kopfzeile, dort sieht man es nicht. Sichtbar ist es bei jedem Tropfen, der neben dem Bogen stehen bleibt (ein Knopf in einem Panel links, die Knöpfe unter den Inseln). Am Desktop habe ich das nicht mehr mit einem Bild belegt (mein Selektor traf nicht); der Eigentümer nennt beide.

## Ursache
`wasser.js`, Funktion `scan()`, die Stelle mit dem Kommentar „a drop that disappears behind a sheet is not drawn any more“:

    r.behind = !!modal && !modal.contains(btn);
    if (r.behind) { r.ptarget = r.pv = r.pvel = r.hov = 0; r.ripT = -1; }

Der Zustand des Tropfens wird zurückgesetzt (Druck, Ring), aber gezeichnet wird er danach nie wieder: Die Zeichenschleife überspringt jeden Tropfen mit `r.behind`. Seine Zeichenfläche behält das letzte Bild, und das ist bei dem Tropfen, der den Bogen geöffnet hat, immer ein Bild mitten in der Antwort auf die Berührung. Dasselbe gilt für jeden Tropfen, der gerade in Bewegung war (Zeiger darüber, Nachschwingen), nur fällt es dort weniger auf.

Die Absicht dahinter ist richtig und bleibt: Hinter einem offenen Bogen ruht die Seite (die Unschärfe des Bogens wird einmal berechnet, die Schleife soll nicht im Takt eines berührten Tropfens weiterlaufen).

## Was zu tun ist
1. Ein Tropfen, der hinter einen Bogen gerät, wird noch zu Ende gezeichnet: entweder ein letztes Bild in Ruhelage oder – schöner – die Antwort klingt in wenigen Bildern aus (der Ring läuft aus, der Druck federt zurück), dann ruht er. Danach kostet er nichts mehr.
2. Dasselbe prüfen für alles, was hinter einem Bogen ruht und gerade eine einmalige Antwort zeigt: Knöpfe aus schlichtem Glas, Mulden zum Tippen, die Perle der Leiste, der Lichtlauf, der Ring. `--wa-lauf: paused` darf nur die Schleifen der Ruhe anhalten, nie eine einmalige Antwort mitten im Lauf.
3. Beim Schließen des Bogens wacht die Seite auf wie bisher; der Tropfen darf dabei nicht springen.
4. Beweis mit `probe.mjs` (oder einer besseren Fassung unter scripts/wasser): Handy und Desktop, beide Töne, ein lebender Tropfen, ein Knopf aus schlichtem Glas, eine Zeile, die einen Bogen öffnet, die Suche; spätestens 600 ms nach dem Öffnen steht jeder Tropfen in Ruhelage (Bildvergleich mit dem ruhenden Tropfen unter derselben Abdunklung), und nach dem Schließen lebt er wieder.

## Behoben am 14.11. (abends, Schritt „Reiterwechsel ohne Wartezeit“, zweite Aufgabe)

### Gebaut (Vorlage `wasser.js`, Teil 1)
1. **Der Tropfen klingt aus, dann ruht er.** Geht ein Tropfen hinter einen Bogen, wird er weiter gezeichnet, bis seine Antwort zu Ende ist: Der Druck federt zurück, ein laufender Ring blendet in 300 ms aus (`RING_OUT`), und spätestens nach 380 ms (`SETTLE`) wird er in die Ruhelage gesetzt und ein letztes Mal gezeichnet. Erst dann ruht er („quiet“): kein Bild mehr, keine Kosten. Bei reduzierter Bewegung gibt es kein Federn: ein einziges Bild in Ruhelage.
2. **Seine Wasserzeit steht mit ihm** (je Tropfen ein Rückstand, `lag`): Schließt der Bogen, geht er von seinem letzten Bild aus weiter, statt auf die Wasserzeit der Seite zu springen.
3. **Hinter einem Bogen kein Schweben mehr unter der Maus:** Chromium schickt nach dem Öffnen der Schublade unter der stehenden Maus neue Grenz-Ereignisse; sie setzten den Tropfen in zwei von fünf Läufen zurück in die Haltung „Maus darüber“. Ein Druck weckt einen ruhenden Tropfen weiterhin.
4. **CSS: nichts zu ändern.** `--wa-lauf: paused` („Ruhe hinter einem Bogen“, `mobil.css` 7 und `desktop.css` 7) hält nur Schleifen der Ruhe an. Die einmaligen Antworten – der Ring auf dem Boden einer Karte (`wa-ring`), das Nachgeben von schlichtem Glas und Zeilen (`:active`, Übergänge), der Flug der Perle (Web Animations), das Schwappen neuer Lichter (Übergänge) – lesen `--wa-lauf` nicht und laufen zu Ende. Geprüft am Quelltext (jede `animation-play-state` des Looks gehört zu einer Schleife mit `infinite`) und mit dem Werkzeug unten.

`Wasser.info.resting` und `.settling` zählen die Tropfen hinter einem Bogen, die ruhen und die noch ausklingen.

### Bewiesen
Werkzeug `node scripts/wasser/bogen.mjs alles --app vorher=<feinschliff-basis>,nachher=<dieser Stand> --bild` (Nachfolger von `probe.mjs` hier). Handy 390 × 844 und Desktop 2000 × 993, je @2x, beide Töne, mit Bewegung und reduziert; vier Fälle: ein lebender Tropfen, der einen Bogen öffnet (Handy das Zahnrad, Desktop „Ergebnis buchen“ neben der Schublade), schlichtes Glas („verwalten“, nur Desktop – am Handy öffnet kein Knopf aus schlichtem Glas einen Bogen), eine Zeile, die Suche. Echter Zeiger: ein Finger 90 ms, die Maus 0,3 s darüber und 90 ms gedrückt. Die Leinwand des Tropfens wird in der Seite bei jedem Bild gelesen; die Bühne selbst (Inseln, Wolken) steht für die Bilder still, die Uhr der App auch.

ERGEBNIS_BOGEN

Bildstreifen (Ruhe, REF = derselbe Bogen ohne Tippen geöffnet, dann die Bilder nach dem Tippen mit ihrer echten Zeit, zuletzt nach dem Schließen): `vorher-nachher-handy.webp`, `vorher-nachher-desktop.webp`.

In `pruefen.mjs --app` (drei Prüfungen) und `desktop.mjs pruefen` (drei Prüfungen) steht der Fall jetzt als Prüfung: Der Tropfen, der den Bogen geöffnet hat, ruht dahinter (`Wasser.info.settling` 0, sein Bild steht), bei reduzierter Bewegung ist er Bildpunkt für Bildpunkt sein Bild in Ruhe, und nach dem Schließen lebt er wieder.

Live ist das erst mit dem nächsten Einspielen (die Live-Seite läuft auf `9c4afa7`).
