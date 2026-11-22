# Tropfen bestimmbar (22.11.)

Was hier liegt (die Ergebnisse stehen in `docs/wasser-look/vorlage/NOTIZEN.md`, Abschnitt 19):

- `spy.mjs <soll> <ist> <ausgabe> [bildschirme]` – zwei gebaute Stände (Ordner mit `dist/` oder Adresse), der Ablauf von
  `sollist.mjs` für einige Handy-Bildschirme, dazu ein Mitschnitt jedes WebGL-Zeichenaufrufs der Tropfen (alle Uniforms,
  Platz im Atlas, Prüfsumme der gezeichneten Bildpunkte). `LOOKS=<ordnerA>,<ordnerB>` setzt je Seite eine Kopie der
  Vorlage an die Stelle des eingebauten Looks; `MOTION=1` lässt die Bewegung an.
- `cmp.mjs <ausgabe> <bildschirm>` – je Tropfen der letzte Zeichenaufruf beider Seiten: Was ist verschieden?
- `frames.mjs <ausgabe> <bildschirm>` – welche Tropfen in welchem Bild gemeinsam gezeichnet wurden.
- `sonden.cjs` (mit `common.cjs`, aus den Sonden des Prüfers) – vier Sonden zu den vier Fehlern vom 22.11.:
  `WASSER_APP=http://localhost:4610 node docs/wasser-look/entwurf/tropfen-bestimmbar/sonden.cjs`. Vor der Behebung
  (bf5bd11) schlagen alle vier fehl, danach bestehen sie.
- `bilder.mjs <vorher> <nachher> <ordner>`, dann `zusammen.mjs <ordner>` – die Bilder in `bilder/`: Handy Start, Heute,
  Projekte und Desktop Start, Heute, beide Töne, reduzierte Bewegung; links der Stand mit laufender Nummer (bf5bd11),
  rechts der Keim aus dem Knopf. Unterschiede am Desktop außerhalb der Tropfen sind die Inseln (zwei Ladevorgänge).
