# Abschlussprüfung des Feinschliffs (15.11., früh)

Die letzte, unabhängige Prüfung des ganzen Feinschliffs auf `wasser-look` (Schritt „Abschluss“, Claude Opus 5.5) und das Paket für den Besitzer. „Vorher“ ist überall der Stand mit dem Tag `feinschliff-basis` (`19447f6`, im Code gleich `9c4afa7`, dem Stand, der am 14.11. live ging), „nachher“ der fertige Feinschliff. Alles auf der Arbeitsmaschine (Chromium, ohne Grafikkarte). Zahlen und Befehle: `docs/Wasser-Look.md`, Abschnitt 11, „Abschlussprüfung“.

## Für den Besitzer (`fuer-den-eigentuemer/`)

| Datei | Was |
|---|---|
| `1-handy-hell-start.webp` … `4-handy-hell-bogen.webp` | Handy, heller Modus („klar“), 12:40, feste Uhr, Bewegung angehalten: Start, Heute, Projekte, Bogen „Neues Projekt“ – vorher links, nachher rechts, darunter ein Ausschnitt doppelt so groß |
| `5-handy-dunkel-start-unveraendert.webp` | Handy, dunkler Modus, 21:30, Start: vorher, nachher und der Unterschied 20-fach verstärkt (schwarz: kein Bildpunkt anders; ebenso Heute und Projekte, nachgezählt) |
| `6-desktop-hell-start.webp` … `8-desktop-hell-projekte.webp` | Desktop 2000 × 993, heller Modus, 12:40: Start, Heute, Projekte – oben vorher, unten nachher, darunter ein Ausschnitt |
| `9-fehler-tropfen-bleibt-stehen.webp` | der Fehler von der Live-Seite: Zahnrad antippen, der Bogen geht auf – bisher bleibt der Tropfen mit seinem Ring stehen, neu ruht er (3-fach vergrößert) |
| `10-tempo-der-lichter.mp4` (und `…-streifen.webp`) | 20 s „Heute“ in Ruhe, zwei Handys: „Tempo bisher (24 / 34 / 40 / 46 s)“ und „Tempo neu (17 / 24 / 29 / 33 s)“ – die Längen liest das Werkzeug aus jeder Seite selbst |
| `11-weiches-gehen.mp4` | 14 s am Handy, vorher | nachher: Einstellungen öffnen und schließen, eine Aufgabe abhaken, Reiter „Material“, einen Eintrag entfernen, „Rückgängig“ |

Die Filme sind auf der Arbeitsmaschine aufgenommen (Bild für Bild über die Bildschirmübertragung des Browsers, 390 Bildpunkte breit je Handy): Die Tropfen ruckeln dort, auf einem Handy nicht.

## Die Skripte

Vom Projektordner aus, die Vorschau der App unter zwei Adressen (vorher und nachher, z. B. `npx vite preview --port 4181` in einer gebauten Kopie von `feinschliff-basis`):

| Skript | Was |
|---|---|
| `bilder.mjs <vorher> <nachher> <ordner>` und `streifen.mjs <ordner> <ausgabe>` | die Bilder 1 bis 8 (erst die Einzelbilder, dann die Streifen) |
| `bug.mjs <vorher> <nachher> <bild.png>` | Bild 9 |
| `gehen-film.mjs <vorher> <nachher> <film.mp4>` | Film 11 (Film 10: `scripts/wasser/leben.mjs`, Befehl in der Anleitung, Schritt 9) |
| `layout.mjs vorher=<adresse> nachher=<adresse>` | jede Desktop-Welt, beide Formate, Tag und Nacht, beide Bereiche: Liegt Text, ein Panel oder ein Knopf auf einer Insel oder ihrem Namen? Ist Text abgeschnitten? Vorher gegen nachher |
| `leer-probe.mjs <adresse>` | die letzte Aufgabe auf „Heute“ am Handy geht: Stehen Zeile und Leer-Text je gleichzeitig da? (Befund F13 der zweiten Kontrolle) |
| `misc.mjs <adresse> <ordner>` | Handy im leeren Bereich: alle Bildschirme und ein Bogen, beide Töne, mit und ohne Bewegung; schmal und breit im Wechsel |
| `webkit.cjs <adresse>`, `webkit-bogen.cjs <adresse> webkit <bild>` | Rauchtest in Playwrights WebKit (vorher `judge-phone/env.sh` laden, `NOTIZEN.md`, Abschnitt 8) |
