# 3Druckwerkbank – Info-Dokument für Brainstorming

Stand: 5. November 2026. Prototyp live unter https://3druckwerkbank.com (Hostinger, statische Website, kein Server, kein Login). Die frühere Codex-App ist unter https://snow-salmon-793472.hostingersite.com erreichbar.

Dieses Dokument fasst alles zusammen, was es über die Idee, den Aufbau, die Bilder und den aktuellen Stand zu wissen gibt. Es ist als Grundlage gedacht, um in einem neuen Chat eine Liste, eine Übersichtsgrafik oder weitere Ideen zu erarbeiten.

---

## 1. Die Idee in einem Satz

Eine persönliche digitale Werkstatt für 3D-Druck-Projekte, dargestellt als räumliche Welt aus schwebenden Inseln über einem Alpental: jede Insel ist ein Lebensbereich der Werkstatt, Licht und Wetter sind echt, alle Daten gehören dem Nutzer und bleiben in seinem Browser.

**Leitmotive:** „Ideen. Machen. Erleben.“ · Ruhe statt Dashboard-Hektik · Ein Blick genügt (Heute-Welt) · Alles hat einen Ort (Inseln) · Zeit ist sichtbar (Tagesportal, Sonnenstand, Jahreszeiten) · Ehrlichkeit über Schätzung vs. Messung.

**Standort:** Weitra, Niederösterreich (Wetter und Sonnenstand werden dafür geladen).

---

## 2. Die Welten (Inseln)

| Welt | Insel-Motiv | Was man dort sieht und tut |
|---|---|---|
| **Start** | sechs Inseln in zwei Reihen | Uhr, Datum, Begrüßung, Tagesspruch, Wetter-Chip, Landschaft nach Tageszeit; „Scrollen zum Erkunden“ führt nach Heute |
| **Heute** | Holzplattform mit Sonnenuhr, Laterne, Bank, Kaffee, Bonsai | Sonnenuhr mit drehender Scheibe und Tagesring (24 h: Tageslicht, Solarfenster, Drucke je Drucker, Aufgaben, Termine, Wartung), Aktive Drucke, Aufgaben heute, Wetter jetzt, Wetterentwicklung, Nächste Termine, Materialhinweis, Wartung, Druckfenster |
| **Projekte** | Werkstatt / Elektronik / Ideen (je Projekt wählbar) | Karussell der aktiven Projekte, Status an der Insel (Bereit / Blockiert / Geplant), Fortschritt, Chips (Drucker, Material, Restzeit, Version), „Aktuelles im Projekt“, „Ähnliche Projekte“, Filter mit Zählern, Neues Projekt |
| **Projekt-Innenwelt** | die Projektinsel groß in der Mitte | Panels rundherum: Meilensteine, Versionen (mit Vergleich), Material, Drucke, Dateien, Aufgaben (Checklisten-Vorlagen), Werkzeuge, Bilder / 3D / Notizen, Historie; „Als Vorlage“, „Abschließen“ |
| **3D-Druck** | Werkstattinsel (X1C) + kleine Druckerinsel (P1S) | Drucker mit Zustand, AMS mit vier Slots und Füllstand, aktueller Druck, Warteschlange mit Bereit / Blockiert und Wartegrund, Wartung, Statistiken 30 Tage, Energie, Eingang für nicht zugeordnete Drucke |
| **Material** | Regal mit Filamentrollen | Bestand (Donut), Top-Materialien, Rollen einzeln (vorhanden / reserviert / verfügbar), Trocknung mit Geräteprofilen, Eigenschaften vergleichen, Produktkatalog, Fehlmengen & Einkauf |
| **Wetter** | Wetterstation mit Windrad und Solarpanel | schwebende Chips um die Insel (Wind, Luftdruck, UV, Temperatur, Niederschlag), Aktuell, Tageslicht, 24-h-Kurve, 7 Tage, beste Stunden & Zeitfenster, Wetter-Hinweise |
| **Archiv** | Vitrine / Galerie | Zeitreise (Balken je Monat), beliebte Tags, Wiederentdecken, Galerie, Vorlagen, Erfahrungen, Filter (Art, Bereich, Material, Drucker, Jahr) |

**Querschnitt:** Kopfzeile mit Suche (Strg+K), Uhr, Wetter-Chip, Hinweise-Glocke mit Zähler, Einstellungen, Begrüßung „Schön, dass du da bist!“ mit Name · Dock unten mit den sieben Zielen · Tasten 0–6, Esc · handschriftliche Randnotizen („Mehr machen – mit Ideen, die bleiben.“).

---

## 3. Funktionen (Stand heute)

**Funktioniert bereits**
- Startwelt, räumliche Navigation mit Parallaxe, Wolken unter den Inseln, Landschaft nach echtem Sonnenstand und Wetter.
- Tagesportal auf der Heute-Insel: der gemalte Ring ist ein Fenster auf den Tag: innen bleibt er durchsichtig, die echte Landschaft und das echte Wetter scheinen durch; am Rand ein einziger Bogen, der Sonnenweg von Aufgang (links) bis Untergang (rechts), der vergangene Teil leuchtet, eine Sonne oder ein Mond markiert jetzt; in der Mitte die Uhr und der nächste Lichtwechsel. Auf der Startseite nur Uhr und Bogen. Drucke, Aufgaben und Termine stehen in den Panels, nicht am Ring.
- Echtes Wetter von Open-Meteo: aktuell, 24 h mit Temperaturkurve, 7 Tage, Tageslicht, Luftdruck, UV, regelbasierte Hinweise, beste Stunden nach Solar-Regel.
- Projekt-Flow in fünf Schritten: Idee → Projektart (11 + eigene) → Einsatzbereiche (12 + eigene) → Projektwelt (drei Vorschläge oder eigenes Bild mit Rahmen) → Details; Meilenstein-Vorlagen je Projektart.
- Projekte: Karussell, Status, Fortschritt, Aktuelles, Ähnliche, Filter. Innenwelt mit allen Panels, Versionen mit Vergleich, Werkzeuge, Historie.
- Drucke planen, Warteschlange mit Bereit / Blockiert und Grund, Ergebnis Erfolg / Nacharbeit / Fehldruck (Nacharbeit erzeugt Aufgabe), Eingang mit Projektvorschlägen oder „Neues Projekt aus Druck“.
- AMS-Slots, Statistiken 30 Tage, Energie-Messwerte, Kalibrierungs-Vorlagen am Gerät.
- Material: Verbrauch wird genau einmal gebucht, Trocknung mit Profilen, Herstellerfarben, Produktkatalog (16 Materialien), Vergleichstabelle, Fehlmengen.
- Archiv: Galerie, Zeitreise, Tags, Wiederentdecken, Vorlagen, Erfahrungen.
- Hinweise-Glocke: überfällige Wartung, Fehlmengen, Fehldruck ohne Folge, leere Rollen, Eingang, fehlendes Werkzeug, finale Version → Abschluss. Halo an blockierten Inseln.
- Papierkorb mit Wiederherstellen, Export / Import als JSON, Demodaten zurücksetzen, Speicheranzeige, Einstellungen (Name, Thema hell / dunkel / automatisch, Bewegung, Parallaxe, Hinweise, Standarddrucker, bevorzugte Materialien, PV-Leistung, Strompreis).
- Suche über Projekte, Versionen, Aufgaben, Drucke, Rollen, Geräte, Historie; zuletzt genutzte Einträge werden bevorzugt.
- Mobiler Begleiter unter 900 px Breite: eigene einfache Oberfläche mit Reitern Start, Heute, Projekte, Material, Mehr; gleiche Daten und Formulare. Tablet quer und Desktop zeigen die räumliche Welt.

**Nur demonstriert (Demodaten, Simulation)**
- Druckerstatus und Fortschritt sind zeitbasiert simuliert, keine Geräteanbindung.
- Solarstrom und Stromkosten sind Schätzungen (Formel kWp × Einstrahlung / 1000 × 0,82). Wetter-Hinweise sind Regeln, keine amtlichen Warnungen.
- Termine, Dateien und 3D-Modelle sind Platzhalter (eigene Fotos werden gespeichert).
- Projektvorschläge im Eingang sind ein einfacher Namensabgleich.

**Später (Ideen, noch nicht gebaut)**
- Anmeldung, Freigaben, Rollen (Eigentümer / Bearbeiter / Leser), Synchronisation, Offline-Abgleich.
- Entwicklungszweige (V3A / V3B), Merge mit Änderungsbericht, räumliche Zeitreise, alte Zustände wiederherstellen.
- Lebendige Vorlagen und ähnliche Projekte mit selektiver Übernahme und Konfliktansicht.
- STL / 3MF-Betrachter, automatische Renders, Slicer-Import, Druckeranbindung, Kameras, Sensoren, reale PV-Daten, dynamische Stromtarife.
- Natürliche Sprache in der Suche, Werkstattkalender (Woche / Monat), externe Kalender, Push, installierbare App.
- Gerätevorlagen (X2D, A1, AMS 2 Pro, AMS HT), Düsenverwaltung, Diagnose mit Symptomen, freie Ortswahl, Etiketten / QR-Erkennung, Demomodus.

---

## 4. Datenmodell (Begriffe)

- **Projekt:** Name, Beschreibung, Art, Bereiche, Tags, Priorität 1–3, Schwierigkeit 1–5, Station (Idee, Konstruktion, Planung, Vorbereitung, Druck, Nacharbeit, Qualität, Abgeschlossen), Fortschritt 0–100 (manuell korrigierbar), Favorit, Inselbild (Bibliothek oder eigenes Foto mit Rahmen), Meilensteine, Versionen, Drucke, Dateien, Notizen, Erfahrungen, Historie, Materialbedarf (Rolle + Gramm), Werkzeuge, Papierkorb-Datum, Vorlage ja / nein.
- **Projektarten (11):** Reparatur / Ersatzteil, Halterung / Befestigung, Organizer / Aufbewahrung, Werkzeug / Hilfsmittel, Gehäuse / Elektronik, Mechanisches Bauteil, Prototyp / Testteil, Deko / Geschenk, Modell / Miniatur, Experiment / Neue Idee, Sonstiges / Universal.
- **Einsatzbereiche (12):** Werkstatt, Garten & Outdoor, Haushalt, Elektronik & Smart Home, Fahrzeug & Mobilität, Büro & Arbeitsplatz, Hobby & Freizeit, Technik & Maschinen, Deko & Persönliches, Prototyping & Entwicklung, Schule / Lernen, Universal / Sonstiges.
- **Aufgabe:** Art (allgemein, druck, wartung, nacharbeit, einkauf), erledigt / übersprungen, fällig, Reihenfolge.
- **Version:** Status (aktuell, beste, final, verworfen), Änderungen, Vergleich zweier Versionen.
- **Druck:** Status (geplant, wartend, läuft, fertig, fehlgeschlagen, abgebrochen), Ergebnis (Erfolg, Nacharbeit, Fehldruck), Dauer, geplante / verbrauchte Gramm, Buchung genau einmal, Wartegrund (Rolle fehlt, Drucker belegt, Wartung überfällig).
- **Gerät:** Drucker (X1C, P1S), AMS mit vier Slots, Trockner (Sunlu S2), sechs Werkzeuge; Wartungsplan, Kalibrierungen, Stunden, Düse.
- **Rolle (Filament):** Material, Marke, Farbe (Hex + Herstellerfarbe), Anfangs- / Rest- / reservierte Gramm, Lagerort, geöffnet am, zuletzt getrocknet, Trocknungsprofil.
- **Archivbericht:** Versionen, Drucke gesamt / Fehldrucke, Gramm, Stunden, Kosten, Lehren.
- **Energie:** Messwerte je Tag (kWh, Kosten) getrennt von Schätzung.
- **Einstellungen:** Name, Thema, Bewegung, Parallaxe, Spruch, Hinweise, Standarddrucker, bevorzugte Materialien, Standort, PV-kWp, Strompreis, Drucker-Watt.

Demodaten: fünf aktive Projekte (Sensorhalter Garten, Bewässerungsclip, Werkzeug-Organizer, ESP32-Wettergehäuse, Zahnrad Mixer), archivierte Projekte mit Berichten, neun Rollen, Drucke in Warteschlange und laufend, ein importierter Druck im Eingang, Termine, Wartungen, Energiewerte.

---

## 5. Visuelle Sprache

- **Stil:** VisionOS-inspiriertes Glas-UI (halbtransparente Panels, weiche Schatten) über einer fotorealistisch-gemalten Fantasy-Landschaft. Deutsch, ruhig, warm.
- **Raum:** Fester 16:9-Rahmen, aktive Insel groß vorn, Nachbarinseln als Ring dahinter (kleiner, leicht unscharf), Parallaxe mit der Maus, Inseln schweben sanft, Wolkenbänke und Bodennebel unter den Inseln, Lichtstrahlen und Sonnenglühen passend zur Tageszeit.
- **Licht nach echtem Sonnenstand (Open-Meteo):** Nacht → Morgendämmerung → Sonnenaufgang → Morgen → Mittag → Nachmittag → goldene Stunde → Sonnenuntergang → blaue Stunde → Mondnacht. Wetter überschreibt tagsüber: Nebel, Regen, bedeckt. Dunkles Thema bei dunklen Looks, helles Thema am Tag (oder manuell).
- **Sonnenuhr (Heute):** Scheibe als Draufsicht-Bild, per CSS in die Neigung der gemalten Uhr gekippt (62°) und mit 15° pro Stunde gedreht, kurzes Eindrehen beim Öffnen; Zeiger als eigenes Bild oben drauf; Schatten des Zeigers wandert mit der Zeit; Tagesring als dünne Lichtspur auf dem Scheibenrand mit Marken 00 / 06 / 12 / 18.
- **Mobil:** eigene, einfache Oberfläche (Reiter unten, ein Landschaftsbild, große Touchziele, Bottom-Sheets).

---

## 6. Bilder (alle vom Nutzer mit Bild-KI erzeugt, von mir freigestellt und optimiert)

**Landschaften (1672 × 941, Bergsee mit gleichbleibendem Bildaufbau):** je Jahreszeit vier Bilder (früher Morgen, Mittag, Sonnenuntergang, Nacht) für Frühling, Sommer, Herbst und Winter, dazu ein regennasser Bergsee für bedeckt, Nebel und Regen. Die zwölf Licht-Looks (Dämmerung bis Mondnacht) steuern weiter Sonnenstand, Himmelsfarbe und Wolken und werden auf die vier Tagesbilder der aktuellen Jahreszeit abgebildet (`src/scene/looks.ts`, `LOOK_PHASE`). Die früheren zwölf Tal-Landschaften liegen in `reference/alte-assets/`.

**Hauptinseln (1536 × 1024, freigestellt geliefert):** Heute (Garten mit Bank, Hütte und leerem Steinsockel; darauf zeichnet die App das Tagesportal als Eichenring mit Messing-Einlage), Projekte (Werkstatthütte mit Baum), 3D-Druck (Druckwerkstatt mit AMS), Material (Spulenregal), Wetter (Kuppel, Wettermast, Wasserfall), Archiv (Bibliothek mit Vitrinen).

**Bibliotheksinseln für Projekte (1254 × 1254):** Werkstatt, Elektronik, Ideen, Drucker, acht Projektwelten (Garten, Haushalt, Fahrzeug, Büro, Hobby, Technik, Deko, Modellbau) sowie 16 weitere Motive: Haus & Bauen, Sammlung, Druckhütte, Pergola-Garten, Holzwerkstatt, Computerstudio, Elektroniklabor, Spulenlager, Solarpavillon, Metallwerkstatt, Atelier, Observatorium, Planungsgarten, Garten mit Ring, Werkstatt-Pavillon; für eigene Fotos zwei Rahmen-Inseln (Holztafel, Staffelei).

**Szenen (1672 × 941, deckend):** acht Bilder mit Insel über dem See bzw. Innenraum; sie sind die Hintergründe des mobilen Begleiters (Start, Heute, Projekte, Projekt-Innenansicht, Material, Drucker, Wetter, Archiv).

**Regel:** Die 17 ursprünglichen Mockup-Bilder dienen nur als Referenz und werden nie ausgeschnitten oder ausgeliefert. Alle neuen Bilder erzeugt der Nutzer selbst; ich liefere Prompts und baue ein.

---

## 7. Technik (kurz)

- Vite + React + TypeScript, Zustand-Store mit Speicherung im Browser (localStorage), Hash-Routing (#/start, #/heute, #/projekte/<id> …). Keine UI-, Router- oder Animationsbibliothek.
- Bild-Pipeline mit sharp: Freistellen (Flood-Fill auf Weiß), Trimmen, WebP / AVIF in mehreren Größen; Zeiger als Vite-Asset mit Hash im Dateinamen (verhindert CDN-Stau).
- Wetter: eine Open-Meteo-Anfrage (aktuell, stündlich 7 Tage inkl. Einstrahlung, Luftdruck, UV; täglich Sonnenauf- / -untergang), 30-Minuten-Cache, Fehlerzustand „Wetter nicht verfügbar“.
- Qualität: 48 automatische Playwright-Prüfungen (Desktop und iPhone), Screenshots und Video-Rundgang per Skript.
- Deploy: Build → Zip → Upload zu Hostinger → statisches Deploy; Live-Bundle wird gegen den lokalen Build geprüft. Lokales Git-Repository mit allen Schritten.

---

## 8. Offene Punkte und Ideen für das Brainstorming

- Weitere Wetter-Landschaften je Jahreszeit: Gewitter, Schnee, nach dem Regen (derzeit ein Regenbild für alle Jahreszeiten).
- Nacht auf der Heute-Insel: Laterne als Lichtquelle, Mondschatten.
- Mobiler Begleiter: was fehlt, was ist zu viel.
- Inhalte aus „Später“ priorisieren: Druckeranbindung (Bambu), Slicer-Import, STL-Vorschau, Synchronisation / Login, Kalender.
- Eigene Projektinseln: weitere Motive (Garten, Küche, Fahrzeug), Rahmen-Stile für eigene Fotos.
- Hinweise und Konflikte: welche Regeln fehlen noch (z. B. Filament-Alter, Düsenverschleiß).
- Energie: echte Messwerte (Shelly / Tasmota), Stromtarife.
- Video / Rundgang als Erklärfilm für Neueinsteiger.
- Name, Logo, Domain (3druckwerkbank.com ist vorhanden, derzeit nicht mit dem Prototyp verbunden).

---

## 9. Kurzglossar

- **Welt / Insel:** ein Bereich der Werkstatt als schwebende Insel.
- **Innenwelt:** die Detailansicht eines Projekts rund um seine Insel.
- **Tagesring:** 24-Stunden-Ring mit allen Ereignissen des Tages, liegt auf der Sonnenuhr.
- **Look:** Lichtstimmung der Landschaft (z. B. goldene Stunde), folgt dem echten Sonnenstand.
- **Druckfenster / Solarfenster:** Zeitraum mit genug Solarstrom und trockenem Wetter für einen Druck.
- **Eingang:** importierte Drucke ohne Projektzuordnung.
- **Blockiert:** Projekt oder Druck kann nicht weiter (Fehlmenge, Drucker belegt, Wartung überfällig).
- **Bericht:** Zusammenfassung beim Projektabschluss (Versionen, Drucke, Material, Stunden, Kosten, Lehren).
