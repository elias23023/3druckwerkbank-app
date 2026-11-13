# Wasser-Look für die mobile Ansicht – Zwischenstand (Sicherung)

Stand 13.11., noch in Arbeit. Dieser Ordner ist eine Sicherung der Entwurfsarbeit, damit sie nicht nur auf der
Arbeitsmaschine liegt. Er ist **nicht** in die App eingebaut: nichts hier wird vom Build oder von der Website geladen.

- `knoepfe/` – fertige Buttons als Wassertropfen (`look.css`, `look.js`): ein Tropfen je Button, gezeichnet mit WebGL,
  verbiegt das Landschaftsbild dahinter. Rückfall ohne WebGL: ruhiges Glas aus `look.css`.
- `karten-leiste/` – Buttons plus Karten als „flaches Becken“ und Menüleiste mit fließender Markierung, fertig gebaut
  (noch blau, die Farbe wird noch gewählt). `knoepfe/bericht.md`: Bericht zum Aufbau der Buttons (englisch).
- `farbe-zwei-toene/` – wie `karten-leiste/`, aber ohne Blau und in zwei Farbtönen: „dunkel“ (Standard, neutrales dunkles Wasser)
  und „klar“ (umschaltbar über `data-wa-ton="klar"` am `<html>`-Element). Ein Ton ist nur ein Block von Werten.
  `notizen-zwischenstand.md`: laufende Notizen der Bauschritte für die spätere Anleitung (englisch).
- `alle-elemente/` – der vollständigste Stand: beide Töne, dazu Bögen, Formulare, Eingabefelder, Auswahl, Häkchen,
  Fortschrittsbalken, Hinweis und Suche, in der echten App geprüft. Die Bewegung in Ruhe fehlt noch.
  `entscheidungen.md`: was der Auftraggeber entschieden hat (beide Töne bleiben als heller und dunkler Modus).
- `mit-bewegung/` – der Stand vor der unabhängigen Kontrolle: alles aus `alle-elemente/`, dazu Leben in Ruhe
  (Licht an den Rändern von Karten, Leiste, Bögen), die Antwort aufs Scrollen und gemeinsames Ruhen nach 30 Sekunden.
- `nachgebessert/` – der aktuelle Stand nach der Kontrolle: mehr Leben in Ruhe mit einem Regler (`--wa-leben`),
  der Ton „klar“ als heller Modus (rauchgrau statt schwarz), breite Tropfen ohne Silberstreifen, deutlicher Fokus
  und deutliche Auswahl, Ring erst beim Loslassen, kein Tipp-Blitz des Browsers. Offen: die Bildrate im
  WebKit-Testbrowser (nur am echten iPhone zu klären).
- `werkzeug/` – Testseite und Skripte, mit denen die Bilder entstehen. Die Pfade darin zeigen noch auf die
  Arbeitsmaschine und müssen beim Einbau ins Projekt angepasst werden:
  `base.html` (Nachbau des mobilen Bildschirms mit den echten Stylesheets, lädt einen Look-Ordner per `?look=`),
  `shot.mjs` (Standbilder), `clip.mjs` und `clip-phone.mjs` (Bewegung), `real.mjs` / `real-lib.mjs` (Look in der
  echten App am Handy-Format), `compose.mjs` (Vergleichsbilder).

Die fertige Vorlage mit Anleitung folgt als `docs/Wasser-Look.md`.
