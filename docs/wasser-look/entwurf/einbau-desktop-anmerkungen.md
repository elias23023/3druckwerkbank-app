# Bericht des Unterchats „Wasser-Look einbauen (Desktop)“ (14.11., 11:19 Wiener Zeit) – Zweig welt/wasser-desktop
Letzter Commit 5132a10 (Schritt 6: Insel „Archiv“ in der Welt Wetter etwas höher, Beschriftung frei bei 2000×993; bei 1920×1080 3 px neben
der Datumszeile). Einbau selbst a24ce60; davor Zwischenstand e6eb9ef; enthält den Handy-Einbau (51fa5f6) und neu geholte Kopien (11cf99a).
Prüfungen: Build ok, beide backdrop-filter-Eigenschaften (Panel blur 16px, Dock blur 18px); Soll gegen Ist 80 Bilder: 63 sofort punktgleich,
71 nach drei Aufnahmen, 76 ohne die Beschriftung „Heute“; Handy 32 Bildschirme punktgleich; verify 69/69; von Hand alles bestanden.
Abweichungen: Beschriftung „Heute“ auf Start eine Spur weicher (Ursache unbekannt); 5–8 Bildpunkte an runden Ecken im hellen Ton (Build
kürzt Farben); kleine Auswahlfelder: Inline-Abstände gelassen. Ungeprüft: WebKit, echte Grafikkarte, nur Bogen „Einstellungen“ verglichen.
Abweichungen vom Auftrag: Hook in App() als useWasser(Wasser.DESKTOP, !mobile) (zweiter Parameter); neu src/wasser/einbau.css (zwei Regeln
für col--aktuell und thumb--naechstes – kann weg, sobald desktop.css die Klassen nennt); panel--haupt an den vier großen Panels gesetzt
(desktop.css Teil 2 kann auf .ui > .glass.panel.panel--haupt wechseln); Inline-Blau in Wetter.tsx entfernt; drei Regeln für das Aussehen
ohne Look am Ende von global.css.
Was in LIESMICH/NOTIZEN/Anleitung gehakt hat:
1. NOTIZEN 10.2 verlangt, Klassen in desktop.css zu nennen – geht nicht, wenn die Vorlage tabu ist; es fehlt, wer das wann tut.
2. „Drop the inline paddings (11 places)“: es sind acht Stellen mit vier verschiedenen Abständen, auch in Bögen am Handy; ohne Ersatzregel
   ändert das beide Schalen.
3. „Hook in App() beside the stage“ sagt nicht, wie das mit `if (mobile) return <Mobile />` zusammengeht.
4. pruefen kann am eingebauten Stand keine Startoptionen setzen; Punkt 10 vergleicht dort die App mit sich selbst – Adresse für den
   Vergleichsstand würde helfen.
5. Für punktgenaue Desktop-Bilder fehlt ein Werkzeug (stehende Uhr vor dem Laden, Wolkenbänke anhalten, Fenster 1 px höher und zurück,
   zwei gleiche Aufnahmen abwarten; trotzdem zwei Rasterzustände: Schatten der Insel „Material“, Tagesportal).
6. Wolkenbänke ziehen auch bei reduzierter Bewegung: global.css nennt .cloud, die Klasse heißt .cloudbank (Fehler der App).
7. vite preview im Hintergrund endet nach 30 Minuten.
8. CLAUDE.md verlangt den Trailer „Claude Fable 5.1“, die Sitzung meldet 5.2 (er hielt sich an CLAUDE.md).
Vorschläge: Bogen weich schließen in SheetHost + Baustein „Bogen“ (Einfahrt rückwärts); Inseln im Tropfenbild ~1 Tag; Rückfall ohne
Unschärfe per @supports not (backdrop-filter) in kern.css.
