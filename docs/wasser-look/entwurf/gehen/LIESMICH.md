# Weiches Gehen – Nachweise (15.11., nachts)

Schritt „Weiches Gehen“ des Feinschliffs (Entscheidung 10; Anleitung `docs/Wasser-Look.md`, Fahrplan Schritt 11).

| Datei | Was |
|---|---|
| `streifen-handy-bogen-dunkel.webp`, `-klar.webp` | Bogen „Einstellungen“ schließt, 0 / 80 / 160 / 240 / 300 ms, beide Töne |
| `streifen-desktop-schublade.webp` | Schublade schließt, 2000 × 993, rechter Teil |
| `streifen-handy-haken.webp`, `streifen-desktop-haken.webp` | eine abgehakte Aufgabe geht |
| `streifen-handy-einkauf.webp` | ein Eintrag der Einkaufsliste wird entfernt |
| `streifen-handy-hinweis.webp` | ein Hinweis ersetzt einen anderen („Rückgängig“) |
| `streifen-szene-dunkel.webp`, `-klar.webp` | der Hintergrund des Handys blendet über, 0 / 100 / 200 / 300 / 450 / 600 ms |
| `streifen-start-2000.webp`, `-1920.webp`, `streifen-kopf-*.webp` | Desktop-Start: das Suchfeld mittig, vorher / nachher |
| `rennen.log`, `szene.log`, `reiter.log` | die Ausgaben der Prüfläufe |
| `frames.mjs`, `rennen.mjs`, `szene.mjs`, `topbar.mjs` | die Prüfskripte (Vorschau der App auf :4173) |
| `spaet.mjs`, `spaet/` | Versuch vom 22.11.: Aufräumen NACH dem Entfernen (die Reihenfolge, die ein späteres React haben könnte), künstlich hergestellt über einen passiven Effekt; das Abschiedsbild kommt trotzdem an seinen alten Platz. Baut seine Seite selbst, braucht keine Vorschau: `node docs/wasser-look/entwurf/gehen/spaet.mjs` (11 Prüfungen) |
| `sonde.mjs`, `sonde/` | Sonde vom 22.11. für die Tests von `weich(id, gone)`: Die Liste der Tests wächst nicht mit (50 gelöschte Zeilen: 5 Tests vorher, 5 nachher), eine Liste ohne Test fragt nie den Test einer anderen Liste; verdrängt = ohne, gelöscht = mit Abschiedsbild. `node docs/wasser-look/entwurf/gehen/sonde.mjs` (8 Prüfungen) |

Ausführen vom Projektordner aus, z. B. `node docs/wasser-look/entwurf/gehen/rennen.mjs`; `frames.mjs <Ausgabeordner>`; `szene.mjs <Ausgabeordner> [<gebaute App vorher>]`; `topbar.mjs <Ausgabeordner> <gebaute App vorher> <gebaute App nachher>`.
Arbeitsmaschine ohne Grafikchip: Zeiten sagen nur „vorher gegen nachher“.
