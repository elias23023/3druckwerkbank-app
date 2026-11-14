# Für Fable zum Nachsehen: Zweig `welt/desktop-felder`

Gebaut am 14.11. von einem Unterchat auf Opus 5.5 (der erste Versuch auf Fable 5.2 wurde vor dem ersten Push gestoppt).
Hier steht ehrlich, was eine zweite, sorgfältige Durchsicht noch einmal ansehen sollte. Je Punkt: Datei, was, warum, wie prüfen.

## Bausteine des Looks, die ich nachgebaut statt benutzt habe
1. **`src/styles/global.css`, Block „Felder“, Regel `.feld-etikett, .island__label--feld > .island__name`**
   Was: Das Etikett (Rand, Randlicht, Radius) steht als eigene Regel mit den Variablen des Looks (`--wa-pill-frei-line`, `--wa-pill-frei-rim`, `--wa-r-pill`) und der Füllung `--wa-frei` aus `desktop.css` Teil 5.
   Warum: Weg B (Eintrag in die Liste von „Etikett“ in `kern.css`) war mir verboten (Vorlage gehört dem Hauptchat). Weg A (`.wa-etikett` ins Markup) hätte die Inselnamen nicht mit EINER Klasse schaltbar gemacht.
   Prüfen: Soll das in die Vorlage? Dann `.feld-etikett` und `.island__label--feld > .island__name` in die Liste „Etikett“ von `kern.css` eintragen, die Regel hier auf Füllung und Innenabstand kürzen, `node scripts/wasser/desktop.mjs pruefen`.
2. **`src/wasser/desktop.css` Teil 5** (nicht von mir geändert): Die Regeln für `.world-title .pills`, `.world-title .select` treffen nichts mehr, weil es `.world-title` nicht mehr gibt. Filter in Projekte und Archiv liegen jetzt in Panels und bekommen „Etikett auf Wasser“ und „Feld“. Prüfen: Regeln in der Vorlage entfernen oder auf `.feld-kopf` umstellen; Filter am klaren Tag ansehen.
3. **Tote Regeln in `global.css`**: `.world-title`, `.heute-greet`, `.hand*`, `.topbar__user`, `.topbar__clock` (alte Fassung) stehen noch drin, werden aber nicht mehr benutzt. Ich habe sie stehen lassen, um Konflikte mit dem Feinschliff klein zu halten. Prüfen: `grep -rn "world-title\|heute-greet\|hand--\|topbar__user" src` und löschen.

## Inseln verdeckt – bekannte Ausnahmen
4. **Projekte und Innenwelt, blasse Fern-Inseln** (`projectCarousel`/`projectInner` in `src/scene/worldLayouts.ts`, `FAR`): Der Weltkopf liegt auf der Fern-Insel „Heute“ (Deckkraft 0,55 bzw. 0,25, ohne Beschriftung, x 216–301 / y 210–267 bei 2000×993) und in der Innenwelt auf einer anderen Projekt-Insel (Deckkraft 0,2). Vorher lagen dort die Filter bzw. Beschreibung und Etiketten – also schon vorher verdeckt, jetzt aber ganz. Meilensteine/Versionen/Drucke verdecken ebenfalls solche Fern-Inseln (unverändert). Prüfen: `FAR[0]` verschieben oder in diesen beiden Welten ausblenden; Messung mit dem Skript unten.
5. **Projekte, Schild des Projektnamens** (`src/worlds/Projekte.tsx`, `.project-hero__schild`): Liegt wie jede Inselbeschriftung auf dem unteren Rand der eigenen Insel, dort hängt Moos bis etwa 100 px (2000×993) bzw. 110 px (1920×1080) in das Schild. Vorher stand der Name lose auf demselben Moos. Geschmacksfrage: Schild weglassen oder nur um Beschreibung und Stand legen.
6. **Uhr-Chip der Kopfzeile** (`src/ui/TopBar.tsx`, `.topbar__clock.chip`): Die kleine Insel rechts vom Suchfeld reicht bis y 51 (2000×993) / 56 (1920×1080). Der Chip ist deshalb 30 statt 40 px hoch und oben an den Knöpfen ausgerichtet: Abstand 3 px bzw. 8 px. Er sitzt dadurch 1–2 px höher als der Wetter-Chip daneben. Geschmacksfrage; prüfen am Bildschirm des Nutzers.
7. **Inselbeschriftungen im Projekte-Karussell**: „ESP32-Wettergehäuse“ und „Werkzeug-Organizer“ liegen (wie vorher) über dem Rand der Nachbarinsel; mit Etikett deckt das jetzt etwas mehr ab. Unverändert gelassen.

## Entscheidungen, die der Nutzer anders sehen könnte
8. **Handschriftliche Notizen `.hand` entfallen** in allen Welten; an ihrer Stelle (rechts oben, gleicher Ort in jeder Welt) steht das Spruchfeld. Ist „Spruch des Tages“ aus, steht dort nichts – auch keine Notiz der Welt. Die sieben Weltsprüche („Kleine Dinge können Großes bewirken.“ usw.) sind damit aus der App verschwunden. Prüfen: Wenn er sie vermisst, könnten sie bei ausgeschaltetem Spruch im selben Feld stehen (`Spruchfeld` in `src/ui/Felder.tsx`).
9. **Kopfzeile**: „Schön, dass du da bist! / Name“ ist entfernt (Dopplung zur Begrüßung in Heute und Tageskarte). In Heute zeigt der Uhr-Chip nur das Datum (die Uhr steht im Ring). Leitspruch und Logo stehen auf einem Etikett.
10. **Heute**: Ort (früher unter dem Spruch) fehlt im Weltkopf, er steht im Titel des Wetter-Panels. Die Zeile „Tag · 6 offen · 1 Druck läuft“ ist geblieben (mit Etikett), obwohl „6“ und „1“ auch in den Panels stehen.
11. **Archiv**: Die fünf Filter stehen jetzt im Galerie-Panel statt unter dem Titel (unter dem Titel hätten sie die Heute-Insel verdeckt).
12. **Ring ohne Wetterdaten**: zeigt weiter den alten Ersatz („Sonnenuntergang 17:00 · in …“), weil er seinen Bogen auch von 07:00 bis 17:00 zeichnet. Wetter-Panels und Tageskarte zeigen ohne Daten nichts. Nachts sagt der Ring jetzt „in 9 h 12 min“ statt „Nacht“.
13. **Rundung**: `sunTurn` rundet auf („in 1 min“ bis zum Augenblick selbst, nie „in 0 min“); der Ring hat früher gerundet. Prüfen: `src/lib/sun.ts`.
14. **Handy**: Die Tageskarte zeigt auch am Handy die neue Zeile unter der Tageslicht-Leiste (alles darunter rückt 24 px nach unten). Alle anderen Reiter pixelgleich. Lehnt der Nutzer das ab: `{turn ? … }` in `src/ui/Tageskarte.tsx` an `desktop` binden.

## Nicht oder nur teilweise geprüft
15. **WebKit/Safari**: nicht geprüft – Playwrights WebKit fehlt im Container (`/opt/pw-browsers/webkit-2359` gibt es nicht). Besonders ansehen: Etiketten (Füllung ohne Weichzeichner), `text-wrap: balance` im Spruchfeld, `display: contents` an `.island__name`.
16. **„Ohne Ort“**: Die leere „Meine Werkstatt“ hat in diesem Stand einen Ort in den Einstellungen, ich habe „ohne Ort“ nur als „ohne Wetter“ geprüft (Wetter-Antwort abgebrochen).
17. **Kontrast**: gemessen mit der Methode von `desktop.mjs kontrast` für die neuen Texte, Ton dunkel/klar, Tag/Nacht, 2000×993. Alle über der Grenze. Am niedrigsten: Leitspruch unter dem Logo am klaren Tag 5,5 (schlechteste 5 %: 4,5), Name im Logo 5,9. Kleine Inselnamen, Ringzeile und der Hinweis „5 von 5 …“ konnte das Verfahren nicht messen („zu wenige Schriftpunkte“). 1920×1080 nicht gemessen.
18. **Messung „verdeckt“**: eigenes Skript (gemalte Pixel der Inseln mit Alpha > 40, auf 160 px Breite verkleinert) – nicht im Repo. Kleinste Abstände (2000×993 / 1920×1080): Weltkopf zur Insel oben 21 px / 13 px, Uhr-Chip 4 px / 8 px (gemessen als Rand der gemalten Pixel: 3 px / 8 px), Zeile unter der Heute-Insel 2 px (sie stand vorher genauso). Prüfen: mit eigenem Werkzeug nachmessen, besonders 1920×1080.
19. **Geprüfte Prüfungen angepasst** (`scripts/verify.mjs`): Zeile 28 sucht den Titel jetzt als `.feld-kopf h1` statt `.world-title h1`; Zeile 43 nimmt das erste Panel, das nicht der Weltkopf ist (`.ui .panel:not(.feld-kopf)`), weil der Weltkopf in der Innenwelt jetzt selbst ein Panel ist und vor den Meilensteinen steht.
20. **Commit-Trailer**: Meine Commits tragen `Co-Authored-By: Claude Opus 5.5`, nicht den in `CLAUDE.md` genannten Trailer.

## Aufgabe 4 (nachgereicht vom Hauptchat): Heute, linke Spalte
21. **`src/ui/Glass.tsx`, `PanelColumn` mit neuer Eigenschaft `even`** (Klasse `panel-col--gleich`, Regel im Block „Felder“): alle Panels der Spalte gleich hoch (`flex: 1 1 0`), ein volleres scrollt in sich. Standardverhalten aller anderen Spalten unverändert. Benutzt nur in `src/worlds/Heute.tsx`.
    Spalte jetzt `top 36.5%`, `bottom 26%`, `width 24.5%` (vorher 38 % / 27 % / 23 %). Höhen je Feld: 181/181 px bei 2000×993 (vorher 159/178), 197/196 px bei 1920×1080.
    Kleinste Abstände (2000×993 / 1920×1080): zur Beschriftung der Projekte-Insel oben 24 / 28 px, zur unteren Reihe 14 / 15 px, zur gemalten Heute-Insel rechts 99 / 46 px.
    Prüfen: Die linke Spalte ist jetzt 1,5 % breiter als die rechte und als das erste Feld der unteren Reihe: die Kanten fluchten nicht mehr (Geschmacksfrage). „Aktive Drucke“ mit nur einem Druck hat jetzt Leerraum, „Aufgaben heute“ zeigt weiter höchstens fünf Aufgaben (`open.slice(0, 5)`, unverändert) und scrollt ab etwa drei.
