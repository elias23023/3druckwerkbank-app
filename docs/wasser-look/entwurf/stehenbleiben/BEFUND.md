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
