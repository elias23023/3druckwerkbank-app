#!/usr/bin/env node
// MCP server: lets Claude (Claude Desktop, Claude Code, …) model in Onshape.
// Start: ONSHAPE_ACCESS_KEY=… ONSHAPE_SECRET_KEY=… node src/index.js
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { Onshape, parseOnshapeUrl, wvm } from './onshape.js';
import {
  buildSketch, buildExtrude, buildRevolve, buildFillet, buildChamfer, buildVariable,
  edgeListScript, fsToJs,
} from './features.js';

const api = new Onshape({
  accessKey: process.env.ONSHAPE_ACCESS_KEY,
  secretKey: process.env.ONSHAPE_SECRET_KEY,
  baseUrl: process.env.ONSHAPE_BASE_URL || 'https://cad.onshape.com',
  apiVersion: process.env.ONSHAPE_API_VERSION || 'v10',
});
const EXPORT_DIR = process.env.ONSHAPE_EXPORT_DIR || join(homedir(), 'Onshape-Export');

const INSTRUCTIONS = `Onshape-Werkzeuge. Arbeitsweise:
1. Dokument finden (list_documents, open_url) oder anlegen (create_document). Jede Änderung braucht documentId, workspaceId und elementId der Part Studio (oder einfach url).
2. Skizze anlegen (add_sketch, Maße in mm, Ebenen top/front/right oder Flächen-Id), dann add_extrude / add_revolve mit der featureId der Skizze.
3. Nach jedem Feature featureStatus prüfen (OK/WARNING/ERROR). Bei ERROR das Feature mit delete_feature entfernen und korrigiert neu anlegen.
4. Ergebnis mit get_view ansehen (Bild) und get_parts / get_bounding_box nachmessen, bevor du dem Nutzer Fertigstellung meldest.
5. Kanten für Verrundung/Fase mit find_edges suchen (Mittelpunkt in mm hilft beim Auswählen).
6. Für alles ohne eigenes Werkzeug: get_features mit raw=true auf ein von Hand gebautes Feature anschauen und das JSON mit add_feature_raw nachbauen.
Koordinaten: Top = XY, Front = XZ, Right = YZ. Für 3D-Druck: export_stl.`;

const server = new McpServer({ name: 'onshape', version: '0.1.0' }, { instructions: INSTRUCTIONS });

// ---- helpers ----

const ref = {
  url: z.string().optional().describe('Onshape-Link https://cad.onshape.com/documents/<did>/w/<wid>/e/<eid> (statt der Ids)'),
  documentId: z.string().optional(),
  workspaceId: z.string().optional(),
  elementId: z.string().optional().describe('Id der Part Studio'),
};

function resolveRef(a, needElement = true) {
  const fromUrl = a.url ? parseOnshapeUrl(a.url) : null;
  if (a.url && !fromUrl) throw new Error('Link nicht erkannt');
  const r = { ...fromUrl };
  for (const k of ['documentId', 'workspaceId', 'elementId']) if (a[k]) r[k] = a[k];
  if (!r.documentId) throw new Error('documentId oder url fehlt');
  if (!r.workspaceId && !r.versionId && !r.microversionId) throw new Error('workspaceId fehlt');
  if (needElement && !r.elementId) throw new Error('elementId fehlt (Part Studio)');
  return r;
}

const ps = (r) => `/partstudios/d/${r.documentId}/${wvm(r)}/e/${r.elementId}`;
const docUrl = (r) => `https://cad.onshape.com/documents/${r.documentId}/${wvm(r)}${r.elementId ? `/e/${r.elementId}` : ''}`;
const text = (obj) => ({ content: [{ type: 'text', text: typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2) }] });

function tool(name, description, schema, fn) {
  server.registerTool(name, { description, inputSchema: schema }, async (args) => {
    try {
      return await fn(args);
    } catch (e) {
      return { isError: true, content: [{ type: 'text', text: String(e.message || e) }] };
    }
  });
}

function featureResult(res) {
  const st = res?.featureState || {};
  return text({
    featureId: res?.feature?.featureId,
    name: res?.feature?.name,
    featureStatus: st.featureStatus || 'UNKNOWN',
    hinweis: st.featureStatus === 'ERROR' ? 'Feature fehlerhaft: Parameter prüfen, delete_feature und neu anlegen.' : undefined,
  });
}

async function addFeature(r, body) {
  return featureResult(await api.post(`${ps(r)}/features`, body));
}

async function evalFs(r, script) {
  const res = await api.post(`${ps(r)}/featurescript`, { script, queries: [] });
  const notices = (res.notices || []).map((n) => n.message?.message || n.message).filter(Boolean);
  return { result: fsToJs(res.result), notices };
}

const VIEWS = {
  isometric: [1 / Math.SQRT2, 1 / Math.SQRT2, 0, -1 / Math.sqrt(6), 1 / Math.sqrt(6), 2 / Math.sqrt(6), 1 / Math.sqrt(3), -1 / Math.sqrt(3), 1 / Math.sqrt(3)],
  front: [1, 0, 0, 0, 0, 1, 0, -1, 0],
  back: [-1, 0, 0, 0, 0, 1, 0, 1, 0],
  top: [1, 0, 0, 0, 1, 0, 0, 0, 1],
  bottom: [1, 0, 0, 0, -1, 0, 0, 0, -1],
  right: [0, 1, 0, 0, 0, 1, 1, 0, 0],
  left: [0, -1, 0, 0, 0, 1, -1, 0, 0],
};
// rows of the 3x3 rotation (camera right, up, towards viewer) -> Onshape's 3x4 matrix
const viewMatrix = (m) => [m[0], m[1], m[2], 0, m[3], m[4], m[5], 0, m[6], m[7], m[8], 0].map((x) => +x.toFixed(6)).join(',');

// ---- documents ----

tool('whoami', 'Prüft die Verbindung zu Onshape und zeigt das Konto.', {}, async () => {
  const s = await api.get('/users/sessioninfo');
  return text({ name: s.name, email: s.email, id: s.id });
});

tool('list_documents', 'Listet eigene Onshape-Dokumente, optional gefiltert nach Suchtext.', {
  query: z.string().optional(),
  limit: z.number().int().min(1).max(50).optional(),
}, async ({ query, limit = 20 }) => {
  const res = await api.get('/documents', { q: query, filter: 0, owner: '', limit, sortColumn: 'modifiedAt', sortOrder: 'desc' });
  return text((res.items || []).map((d) => ({
    name: d.name, documentId: d.id, workspaceId: d.defaultWorkspace?.id, modifiedAt: d.modifiedAt,
  })));
});

tool('create_document', 'Legt ein neues Onshape-Dokument an und gibt Ids und Link der ersten Part Studio zurück.', {
  name: z.string(),
  isPublic: z.boolean().optional().describe('Standard: privat'),
}, async ({ name, isPublic = false }) => {
  const d = await api.post('/documents', { name, isPublic });
  const r = { documentId: d.id, workspaceId: d.defaultWorkspace.id };
  const els = await api.get(`/documents/d/${r.documentId}/w/${r.workspaceId}/elements`);
  const studio = els.find((e) => e.elementType === 'PARTSTUDIO');
  if (studio) r.elementId = studio.id;
  return text({ ...r, url: docUrl(r) });
});

tool('open_url', 'Liest einen Onshape-Link und listet die Elemente (Part Studios, Baugruppen …) des Dokuments.', {
  url: z.string(),
}, async ({ url }) => {
  const r = resolveRef({ url }, false);
  const doc = await api.get(`/documents/${r.documentId}`);
  if (!r.workspaceId && !r.versionId) r.workspaceId = doc.defaultWorkspace?.id;
  const els = await api.get(`/documents/d/${r.documentId}/${wvm(r)}/elements`);
  return text({
    document: doc.name, ...r,
    elements: els.map((e) => ({ name: e.name, elementId: e.id, type: e.elementType })),
  });
});

tool('list_elements', 'Listet die Elemente eines Dokuments.', {
  documentId: z.string(), workspaceId: z.string(),
}, async (a) => {
  const els = await api.get(`/documents/d/${a.documentId}/w/${a.workspaceId}/elements`);
  return text(els.map((e) => ({ name: e.name, elementId: e.id, type: e.elementType })));
});

tool('create_part_studio', 'Legt eine weitere Part Studio im Dokument an.', {
  documentId: z.string(), workspaceId: z.string(), name: z.string(),
}, async (a) => {
  const res = await api.post(`/partstudios/d/${a.documentId}/w/${a.workspaceId}`, { name: a.name });
  const r = { documentId: a.documentId, workspaceId: a.workspaceId, elementId: res.id };
  return text({ ...r, url: docUrl(r) });
});

// ---- features ----

tool('get_features', 'Zeigt die Feature-Liste einer Part Studio (Id, Name, Typ, Status). raw=true liefert das vollständige JSON.', {
  ...ref,
  raw: z.boolean().optional(),
  featureId: z.string().optional().describe('nur dieses Feature (mit raw)'),
}, async (a) => {
  const r = resolveRef(a);
  const res = await api.get(`${ps(r)}/features`);
  if (a.raw) {
    const feats = a.featureId ? res.features.filter((f) => f.featureId === a.featureId) : res.features;
    return text(feats);
  }
  return text((res.features || []).map((f) => ({
    featureId: f.featureId, name: f.name, type: f.featureType,
    status: res.featureStates?.[f.featureId]?.featureStatus,
    suppressed: f.suppressed || undefined,
  })));
});

const shape = z.object({
  type: z.enum(['line', 'rectangle', 'centerRectangle', 'circle', 'arc', 'polygon', 'regularPolygon', 'slot']),
  x: z.number().optional(), y: z.number().optional(),
  cx: z.number().optional(), cy: z.number().optional(),
  x1: z.number().optional(), y1: z.number().optional(),
  x2: z.number().optional(), y2: z.number().optional(),
  width: z.number().optional(), height: z.number().optional(),
  r: z.number().optional(), sides: z.number().optional(), rotation: z.number().optional(),
  startAngle: z.number().optional(), endAngle: z.number().optional(),
  points: z.array(z.tuple([z.number(), z.number()])).optional(),
}).passthrough();

tool('add_sketch', `Legt eine Skizze an (Maße in mm, Winkel in Grad, Koordinaten in der Skizzenebene).
Formen: line {x1,y1,x2,y2}; rectangle {x,y,width,height} (Ecke unten links); centerRectangle {cx,cy,width,height};
circle {cx,cy,r}; arc {cx,cy,r,startAngle,endAngle} (gegen Uhrzeigersinn); polygon {points:[[x,y],…]} (wird geschlossen);
regularPolygon {cx,cy,r,sides,rotation?} (r = Umkreis); slot {x1,y1,x2,y2,width} (Langloch).
Innere Formen (z. B. Kreis in Rechteck) ergeben Löcher in der Region.`, {
  ...ref,
  name: z.string().optional(),
  plane: z.string().optional().describe('top | front | right oder Id einer ebenen Fläche (find_faces)'),
  shapes: z.array(shape).min(1),
}, async (a) => addFeature(resolveRef(a), buildSketch(a)));

tool('add_extrude', 'Extrudiert alle Regionen einer Skizze. depth in mm oder Ausdruck (z. B. "#dicke").', {
  ...ref,
  sketchFeatureId: z.string(),
  depth: z.union([z.number(), z.string()]),
  operation: z.enum(['new', 'add', 'remove', 'intersect']).optional().describe('new = neues Teil, add = vereinen, remove = abziehen'),
  oppositeDirection: z.boolean().optional(),
  name: z.string().optional(),
}, async (a) => addFeature(resolveRef(a), buildExtrude(a)));

tool('add_revolve', 'Dreht Skizzenregionen um eine Achse (Id einer geraden Kante, z. B. aus find_edges).', {
  ...ref,
  sketchFeatureId: z.string(),
  axisDeterministicId: z.string(),
  angle: z.number().optional().describe('Grad, Standard 360'),
  operation: z.enum(['new', 'add', 'remove', 'intersect']).optional(),
  name: z.string().optional(),
}, async (a) => addFeature(resolveRef(a), buildRevolve(a)));

tool('add_fillet', 'Verrundet Kanten (Ids aus find_edges).', {
  ...ref,
  edgeIds: z.array(z.string()).min(1),
  radius: z.union([z.number(), z.string()]),
  name: z.string().optional(),
}, async (a) => addFeature(resolveRef(a), buildFillet(a)));

tool('add_chamfer', 'Fase an Kanten (Ids aus find_edges), gleiche Schenkel.', {
  ...ref,
  edgeIds: z.array(z.string()).min(1),
  width: z.union([z.number(), z.string()]),
  name: z.string().optional(),
}, async (a) => addFeature(resolveRef(a), buildChamfer(a)));

tool('add_variable', 'Legt eine Variable an (#name), die spätere Maße nutzen können. Zahl = mm, sonst Ausdruck wie "30 deg".', {
  ...ref,
  name: z.string(),
  value: z.union([z.number(), z.string()]),
  description: z.string().optional(),
}, async (a) => addFeature(resolveRef(a), buildVariable(a)));

tool('add_feature_raw', 'Fügt ein beliebiges Feature als Onshape-JSON hinzu (BTMFeature-134 oder BTMSketch-151, ohne featureId).', {
  ...ref,
  feature: z.record(z.string(), z.any()),
}, async (a) => addFeature(resolveRef(a), { btType: 'BTFeatureDefinitionCall-1406', feature: a.feature }));

tool('update_feature_raw', 'Ersetzt ein vorhandenes Feature durch neues JSON (featureId im JSON muss passen).', {
  ...ref,
  featureId: z.string(),
  feature: z.record(z.string(), z.any()),
}, async (a) => {
  const r = resolveRef(a);
  const res = await api.post(`${ps(r)}/features/featureid/${a.featureId}`, {
    btType: 'BTFeatureDefinitionCall-1406', feature: { ...a.feature, featureId: a.featureId },
  });
  return featureResult(res);
});

tool('delete_feature', 'Löscht ein Feature.', { ...ref, featureId: z.string() }, async (a) => {
  const r = resolveRef(a);
  await api.delete(`${ps(r)}/features/featureid/${a.featureId}`);
  return text(`Feature ${a.featureId} gelöscht.`);
});

// ---- geometry queries ----

tool('find_edges', 'Listet Kanten mit Id, Typ (LINE/CURVE), Mittelpunkt und Länge in mm. Optional nur Kanten eines Features.', {
  ...ref,
  featureId: z.string().optional(),
}, async (a) => text(await evalFs(resolveRef(a), edgeListScript(a.featureId))));

tool('find_faces', 'Listet ebene Flächen mit Id, Mittelpunkt und Normale (für Skizzen auf Flächen).', {
  ...ref,
  featureId: z.string().optional(),
}, async (a) => {
  const q = a.featureId ? `qCreatedBy(makeId("${a.featureId.replace(/"/g, '')}"), EntityType.FACE)` : 'qEverything(EntityType.FACE)';
  const script = `function(context is Context, queries) {
  var out = [];
  for (var f in evaluateQuery(context, qGeometry(${q}, GeometryType.PLANE))) {
    var p = evPlane(context, { "face" : f });
    var c = evApproximateCentroid(context, { "entities" : f });
    out = append(out, { "id" : transientQueriesToStrings(f), "center" : [c[0] / millimeter, c[1] / millimeter, c[2] / millimeter], "normal" : [p.normal[0], p.normal[1], p.normal[2]], "areaMm2" : evArea(context, { "entities" : f }) / (millimeter * millimeter) });
  }
  return out;
}`;
  return text(await evalFs(resolveRef(a), script));
});

tool('eval_featurescript', 'Führt eine lesende FeatureScript-Funktion aus: function(context is Context, queries) { … return …; }. Ändert nichts am Modell.', {
  ...ref,
  script: z.string(),
}, async (a) => text(await evalFs(resolveRef(a), a.script)));

tool('get_parts', 'Listet die Teile einer Part Studio mit Masse/Volumen (falls Material gesetzt).', ref, async (a) => {
  const r = resolveRef(a);
  const parts = await api.get(`/parts/d/${r.documentId}/${wvm(r)}/e/${r.elementId}`);
  let mass = {};
  try { mass = (await api.get(`${ps(r)}/massproperties`, { massAsGroup: false })).bodies || {}; } catch {}
  return text(parts.map((p) => {
    const m = mass[p.partId];
    return {
      name: p.name, partId: p.partId, material: p.material?.displayName,
      volumeCm3: m?.volume ? +(m.volume[0] * 1e6).toFixed(3) : undefined,
      massG: m?.mass?.[0] ? +(m.mass[0] * 1000).toFixed(2) : undefined,
    };
  }));
});

tool('get_bounding_box', 'Außenmaße aller Teile in mm.', ref, async (a) => {
  const b = await api.get(`${ps(resolveRef(a))}/boundingboxes`, { includeHidden: false });
  const mm = (v) => +(v * 1000).toFixed(3);
  return text({
    min: [mm(b.lowX), mm(b.lowY), mm(b.lowZ)],
    max: [mm(b.highX), mm(b.highY), mm(b.highZ)],
    size: [mm(b.highX - b.lowX), mm(b.highY - b.lowY), mm(b.highZ - b.lowZ)],
  });
});

tool('get_view', 'Rendert die Part Studio als Bild, damit du das Ergebnis selbst ansehen kannst.', {
  ...ref,
  view: z.enum(['isometric', 'front', 'back', 'top', 'bottom', 'right', 'left']).optional(),
  width: z.number().int().min(100).max(1600).optional(),
  height: z.number().int().min(100).max(1600).optional(),
}, async (a) => {
  const r = resolveRef(a);
  const res = await api.get(`${ps(r)}/shadedviews`, {
    viewMatrix: viewMatrix(VIEWS[a.view || 'isometric']),
    outputWidth: a.width || 800,
    outputHeight: a.height || 600,
    pixelSize: 0,
    edges: 'show',
  });
  const img = res?.images?.[0];
  if (!img) return text('Keine Ansicht erhalten (leere Part Studio?).');
  return { content: [{ type: 'image', data: img, mimeType: 'image/png' }] };
});

tool('export_stl', `Exportiert die Part Studio (oder einzelne Teile) als STL in mm und speichert die Datei lokal (Standardordner ${EXPORT_DIR}).`, {
  ...ref,
  fileName: z.string().optional(),
  partIds: z.array(z.string()).optional(),
  resolution: z.enum(['coarse', 'medium', 'fine']).optional(),
}, async (a) => {
  const r = resolveRef(a);
  const buf = await api.get(`${ps(r)}/stl`, {
    mode: 'binary', units: 'millimeter', grouping: true,
    partIds: a.partIds?.join(','), resolution: a.resolution || 'fine',
  }, { accept: 'application/vnd.onshape.v1+octet-stream,application/octet-stream,*/*', binary: true });
  const name = (a.fileName || `onshape-${r.elementId}`).replace(/[\\/:*?"<>|]/g, '_').replace(/\.stl$/i, '') + '.stl';
  const out = resolve(EXPORT_DIR, name);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, buf);
  return text({ datei: out, bytes: buf.length });
});

await server.connect(new StdioServerTransport());
