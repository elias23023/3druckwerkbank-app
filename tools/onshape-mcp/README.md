# Claude in Onshape (MCP-Server)

Mit diesem kleinen Programm kann Claude direkt in deinem Onshape-Konto modellieren:
Dokumente anlegen, Skizzen zeichnen, extrudieren, drehen, verrunden, das Ergebnis als
Bild ansehen, nachmessen und als STL für den 3D-Druck exportieren.

Es ist ein **MCP-Server**: Claude Desktop oder Claude Code starten ihn im Hintergrund und
bekommen dadurch neue Werkzeuge. Du schreibst dann einfach im Chat z. B.
„Zeichne mir in Onshape eine Halterung 60 × 40 × 5 mm mit zwei M4-Löchern, Abstand 40 mm“.

## 1. Onshape-API-Schlüssel holen

1. https://dev-portal.onshape.com/keys öffnen (mit deinem Onshape-Konto anmelden).
2. „Create new API key“, Rechte **Read** und **Write** ankreuzen (Delete ist nicht nötig).
3. *Access key* und *Secret key* kopieren. Der Secret key wird nur einmal angezeigt.
   Die Schlüssel nie ins Git oder in einen Chat schreiben.

## 2. Installieren

Voraussetzung: Node.js 18 oder neuer.

```bash
cd tools/onshape-mcp
npm install
```

Verbindung prüfen (zeigt deinen Namen und die letzten Dokumente):

```bash
ONSHAPE_ACCESS_KEY=dein_access_key ONSHAPE_SECRET_KEY=dein_secret_key npm run check
```

## 3a. In Claude Desktop einbinden

Einstellungen → Entwickler → „Konfiguration bearbeiten“ (Datei `claude_desktop_config.json`) und eintragen
(Pfad an deinen Rechner anpassen, unter Windows mit `\\`):

```json
{
  "mcpServers": {
    "onshape": {
      "command": "node",
      "args": ["/PFAD/ZU/3druckwerkbank-app/tools/onshape-mcp/src/index.js"],
      "env": {
        "ONSHAPE_ACCESS_KEY": "dein_access_key",
        "ONSHAPE_SECRET_KEY": "dein_secret_key",
        "ONSHAPE_EXPORT_DIR": "/PFAD/FÜR/STL-DATEIEN"
      }
    }
  }
}
```

Claude Desktop neu starten. Im Chat erscheint beim Werkzeug-Symbol „onshape“.

## 3b. In Claude Code einbinden

```bash
claude mcp add onshape --scope user -e ONSHAPE_ACCESS_KEY=dein_access_key -e ONSHAPE_SECRET_KEY=dein_secret_key -- node /PFAD/ZU/tools/onshape-mcp/src/index.js
```

## Werkzeuge

| Werkzeug | Zweck |
|---|---|
| `whoami` | Verbindung prüfen |
| `list_documents`, `open_url`, `list_elements` | Dokumente finden, Onshape-Link öffnen |
| `create_document`, `create_part_studio` | Neues Dokument / neue Part Studio |
| `add_sketch` | Skizze aus Linien, Rechtecken, Kreisen, Bögen, Polygonen, Langlöchern (mm) |
| `add_extrude`, `add_revolve` | Extrudieren (neu, vereinen, abziehen), Drehen |
| `add_fillet`, `add_chamfer` | Verrundung und Fase an Kanten |
| `add_variable` | Variablen wie `#dicke` |
| `find_edges`, `find_faces` | Kanten und Flächen mit Ids und Lage in mm suchen |
| `get_features`, `delete_feature` | Feature-Liste ansehen, Feature löschen |
| `add_feature_raw`, `update_feature_raw` | Beliebige Features als Onshape-JSON |
| `eval_featurescript` | Lesendes FeatureScript ausführen (Messen, Prüfen) |
| `get_parts`, `get_bounding_box` | Teile, Volumen, Masse, Außenmaße |
| `get_view` | Bild des Modells (isometrisch, vorne, oben …), damit Claude das Ergebnis sieht |
| `export_stl` | STL in mm speichern, direkt für den Slicer |

Tipp: Gib Claude den Link zur Part Studio (aus der Adresszeile), dann arbeitet es in genau diesem Dokument.
Alles, was kein eigenes Werkzeug hat (Muster, Spiegeln, Shell, Gewinde …): einmal von Hand in Onshape
anlegen und Claude bitten, es mit `get_features` (raw) anzusehen und nachzubauen.

## Stand

- Getestet: Aufbau der Feature-Daten (Skizzen, Extrusion, Variablen), Start des Servers und Werkzeugliste (`npm test`).
- **Noch nicht mit einem echten Onshape-Konto getestet.** Beim ersten Einsatz mit `npm run check` anfangen,
  dann eine einfache Platte zeichnen lassen. Meldet ein Feature `ERROR`, liegt es fast immer an einem
  Parameternamen der Onshape-Schnittstelle; das lässt sich in `src/features.js` schnell anpassen.
- Andere Onshape-Adresse (Enterprise): `ONSHAPE_BASE_URL=https://firma.onshape.com`, API-Version über `ONSHAPE_API_VERSION` (Standard `v10`).
