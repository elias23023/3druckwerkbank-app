# Anmerkungen des Unterchats „Wasser-Look einbauen (Mobil)“ zu LIESMICH / NOTIZEN / Werkzeugen (14.11., 09:48 Wiener Zeit)
Zweig welt/wasser-mobil, Commit c7e8299. Für den letzten Schliff an Anleitung und Werkzeugen:
1. NOTIZEN Abschnitt 10, Punkt 5 nennt den Vergleich gegen die gebaute App „nicht möglich“. Er geht, und exakt: alten Build getrennt
   servieren (Kopie von dist, vite preview --outDir … --port 4174); s.app({look:'vorlage', reduced:true, zeit}) gegen den alten Build,
   s.app({look:''}) gegen den neuen; mit diff() aus lib.mjs vergleichen. Ein fertiges Werkzeug dafür würde viel Zeit sparen.
2. Ton: lib.mjs setzt data-wa-ton direkt am <html>. Im eingebauten Stand setzt ihn die App, der nächste Effekt überschreibt den Wert.
   Werkzeuge müssen dort die Einstellung im Bogen umstellen (in Soll und Ist gleich, weil der Bogen „Einstellungen“ sie zeigt).
3. --look: Abschnitt 8 sagt, alle Werkzeuge nähmen --look; pruefen.mjs kennt es nicht. Es fehlt ein Modus „Look ist schon eingebaut“
   (Teil 9 spielt die Vorlage zusätzlich ein: doppeltes CSS, start() ersetzt die laufende Instanz).
4. bild.mjs app ist ohne feste Uhr nicht wiederholbar; lib.mjs hat die Option zeit, bild.mjs reicht sie nicht durch.
5. Kopf von wasser.js: Import in Mobile.tsx muss direkt nach ./mobile.css stehen; das leere Abhängigkeitsfeld braucht die ESLint-Zeile.
6. Fallstrick 36 ergänzen: Bereichswechsel braucht nach dem Chip den Knopf „Zu … wechseln“ und lädt die Seite neu; ein addInitScript,
   das den Bereich setzt, macht den Wechsel rückgängig.
7. Abschnitt 10, Punkt 6 kann heißen: verify.mjs läuft unverändert durch (69/69).
Desktop-Rauschen: Start und Heute sind zwischen zwei Läufen desselben Stands nicht stabil (569 bzw. 6865 Bildpunkte) – 2 bis 3 Läufe je Seite.
Nicht geprüft: WebKit (im Container nur Chromium), echtes Handy, StrictMode-Doppelstart im Dev-Modus.
Vorschläge für später: SheetHost hält den Bogen 0,26 s länger und setzt wa-geht (Keyframes wa-sinkt liegen bereit); Zeile: gleiche
Verzögerung + Klasse; Toast.tsx: key je Hinweis.
