# Unterchats: ein Chat je Welt bzw. Seite

Jeder Unterchat bekommt einen Bereich, einen Branch und die Dateien, die er anfassen darf. Deploy und Zusammenführen macht nur der Hauptchat. Vor der Arbeit: `CLAUDE.md` und `docs/Brainstorm-Info.md` lesen, `npm install`, `npm run build`.

| Chat | Branch | Dateien (nur diese ändern) | Was dort hingehört |
|---|---|---|---|
| **Start** | `welt/start` | `src/worlds/Start.tsx`, `src/scene/worldLayouts.ts` (nur `START_POS`), CSS-Block Start | Uhr, Datum, Jahreszeit, Spruch, Wetter-Chip, Anordnung der sechs Inseln, Einstieg |
| **Heute** | `welt/heute` | `src/worlds/Heute.tsx`, `src/ui/InfoRing.tsx`, `src/ui/Tagesring.tsx`, CSS-Blöcke `.inforing*`, `.heute-*`, `.bottom-row` | Info-Ring auf dem Tisch, Panels Aktive Drucke, Aufgaben, Wetter, Termine, Material, Wartung, Druckfenster |
| **Projekte** | `welt/projekte` | `src/worlds/Projekte.tsx`, `src/forms/ProjektForm.tsx`, `src/scene/worldLayouts.ts` (nur `projectCarousel`), CSS-Blöcke Projekte/Karussell | Karussell, Filter, Projektkarte, Projektformular (5 Schritte, Inselbibliothek, eigenes Foto) |
| **Projekt-Innenwelt** | `welt/innenwelt` | `src/worlds/ProjektInnen.tsx`, `src/forms/ProjektDetail.tsx`, `src/forms/Kleine.tsx`, `worldLayouts.ts` (nur `projectInner`), CSS-Block Innenwelt | Meilensteine, Versionen, Material, Drucke, Dateien, Aufgaben, Werkzeuge, Bilder/3D/Notizen, Historie, Abschluss |
| **3D-Druck** | `welt/druck` | `src/worlds/Druck.tsx`, CSS-Block Druck | Drucker, AMS, laufender Druck, Warteschlange mit Wartegrund, Wartung, Statistik, Eingang |
| **Material** | `welt/material` | `src/worlds/Material.tsx`, `src/forms/SpuleForm.tsx`, CSS-Block Material | Bestand, Rollen, Trocknung, Eigenschaften vergleichen, Fehlmengen & Einkauf |
| **Wetter** | `welt/wetter` | `src/worlds/Wetter.tsx`, `src/lib/weather.ts`, `src/lib/season.ts`, CSS-Blöcke Wetter/Season | Chips um die Insel, 24 h, 7 Tage, Tageslicht, beste Stunden, Hinweise, Jahreszeiten-Tipps |
| **Archiv** | `welt/archiv` | `src/worlds/Archiv.tsx`, CSS-Block Archiv | Zeitreise, Tags, Wiederentdecken, Galerie, Vorlagen, Erfahrungen, Berichte |
| **Mobil** | `welt/mobil` | `src/mobile/Mobile.tsx`, `src/mobile/mobile.css` | Mobiler Begleiter (unter 900 px): Reiter Start, Heute, Projekte, Material, Mehr |
| **Szene & Bilder** | `welt/szene` | `src/scene/*` (außer worldLayouts), `src/scene/looks.ts`, `scripts/cutout-*.mjs`, `scripts/optimize-*.mjs`, `assets-src/`, `public/img/` | Landschaften, Looks nach Sonnenstand, Wolken, Jahreszeiten-Partikel, neue Inselbilder, Prompts |

Querschnitt (Kopfzeile, Dock, Suche, Hinweise-Glocke, Einstellungen, Store, Typen) bleibt im Hauptchat.

## Ablauf in einem Unterchat
1. `git checkout -b welt/<name>` (oder den Branch holen, falls er schon existiert).
2. Ändern, `npm run build`, `node scripts/verify.mjs`, Screenshots in 1920×1080 und 2000×993 ansehen.
3. Committen, `git push -u origin welt/<name>`.
4. Dem Nutzer Screenshots zeigen und sagen, dass der Branch bereit ist. Nicht deployen.

## Ablauf im Hauptchat
`git fetch`, Branch ansehen, auf `main` mergen, Build, `verify.mjs`, Zip, TUS-Upload, `hosting_websites_deploy-static-site-archive` mit `archive_path: "site.zip"`, Live-Hash prüfen, Screenshots.

## Bildstil (für Prompts)
Schwebende Felsinsel mit Moos, Wurzeln und Farnen unten, saftiges Gras und Wildblumen oben, warmes Nachmittagslicht von rechts oben, hell und freundlich (nicht dunkel), malerisch-realistischer 3D-Look, klare Kanten, auf reinem Weiß, 1254×1254, Insel füllt etwa 85 % der Breite. Stilreferenz: zwei vorhandene Inseln anhängen (z. B. Garten und Büro). Dateiname immer `insel-<name>.png`. Landschaften: 1672×941, gleiches Tal und gleiche Kamera, nur das Licht wechselt, Dateiname `landschaft-NN-<look>.png`.

## Was fertig ist (Stand 7. 11. 2026, abends)
Sechs neue Hauptinseln (Breitformat), 33 Bibliotheksinseln, 17 Jahreszeiten-Landschaften (4 × 4 plus Regen), 8 Szenen als Mobil-Hintergründe, Info-Ring im gemalten Ring der Heute-Insel, Jahreszeiten, Mobil, Domain, GitHub-Repo `elias23023/3druckwerkbank-app`. Offen aus dem Brainstorming: Scheibe/Ring-Details, weitere Wetter-Landschaften (Gewitter, Schnee, nach dem Regen), echte Jahreszeiten-Landschaften, Nacht auf der Heute-Insel, Druckeranbindung, Login/Sync.
