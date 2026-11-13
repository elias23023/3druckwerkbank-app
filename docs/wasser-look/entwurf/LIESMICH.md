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
- `werkzeug/` – Testseite und Skripte, mit denen die Bilder entstehen. Die Pfade darin zeigen noch auf die
  Arbeitsmaschine und müssen beim Einbau ins Projekt angepasst werden:
  `base.html` (Nachbau des mobilen Bildschirms mit den echten Stylesheets, lädt einen Look-Ordner per `?look=`),
  `shot.mjs` (Standbilder), `clip.mjs` und `clip-phone.mjs` (Bewegung), `real.mjs` / `real-lib.mjs` (Look in der
  echten App am Handy-Format), `compose.mjs` (Vergleichsbilder).

Die fertige Vorlage mit Anleitung folgt als `docs/Wasser-Look.md`.
