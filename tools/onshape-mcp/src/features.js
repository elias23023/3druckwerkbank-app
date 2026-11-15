// Builders for Onshape feature JSON (BTMFeature). Inputs are in millimetres and degrees,
// Onshape sketch geometry is stored in metres and radians.

const MM = 0.001;

// Deterministic ids of the default planes in every Part Studio.
export const PLANES = { top: 'JDC', front: 'JCC', right: 'JEC' };

export function planeId(plane) {
  const key = String(plane || 'top').toLowerCase();
  return PLANES[key] || plane; // otherwise: deterministic id of a planar face
}

const str = (parameterId, value) => ({ btType: 'BTMParameterString-149', parameterId, value });
const bool = (parameterId, value) => ({ btType: 'BTMParameterBoolean-144', parameterId, value });
const enumP = (parameterId, enumName, value) => ({ btType: 'BTMParameterEnum-145', parameterId, enumName, value });
const qty = (parameterId, expression) => ({ btType: 'BTMParameterQuantity-147', parameterId, expression });

function line(id, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len === 0) throw new Error(`Linie ${id} hat die Länge 0`);
  return {
    btType: 'BTMSketchCurveSegment-155',
    entityId: id,
    startPointId: `${id}.start`,
    endPointId: `${id}.end`,
    startParam: 0,
    endParam: len * MM,
    geometry: {
      btType: 'BTCurveGeometryLine-117',
      pntX: x1 * MM,
      pntY: y1 * MM,
      dirX: dx / len,
      dirY: dy / len,
    },
    isConstruction: false,
  };
}

function circleGeom(cx, cy, r) {
  if (!(r > 0)) throw new Error('Radius muss größer als 0 sein');
  return {
    btType: 'BTCurveGeometryCircle-115',
    radius: r * MM,
    xCenter: cx * MM,
    yCenter: cy * MM,
    xDir: 1,
    yDir: 0,
    clockwise: false,
  };
}

function coincident(id, a, b) {
  return {
    btType: 'BTMSketchConstraint-2',
    constraintType: 'COINCIDENT',
    entityId: id,
    parameters: [str('localFirst', a), str('localSecond', b)],
  };
}

// Closed polyline: lines plus coincident constraints at every corner.
function closedPolyline(prefix, pts, entities, constraints) {
  if (pts.length < 3) throw new Error('Polygon braucht mindestens 3 Punkte');
  const ids = pts.map((_, i) => `${prefix}.l${i}`);
  pts.forEach(([x, y], i) => {
    const [nx, ny] = pts[(i + 1) % pts.length];
    entities.push(line(ids[i], x, y, nx, ny));
  });
  ids.forEach((id, i) => {
    constraints.push(coincident(`${prefix}.c${i}`, `${id}.end`, `${ids[(i + 1) % ids.length]}.start`));
  });
}

/**
 * Shapes (all in mm, angles in degrees):
 *  { type: 'line', x1, y1, x2, y2 }
 *  { type: 'rectangle', x, y, width, height }          (x, y = lower left corner)
 *  { type: 'centerRectangle', cx, cy, width, height }
 *  { type: 'circle', cx, cy, r }
 *  { type: 'arc', cx, cy, r, startAngle, endAngle }    (counter-clockwise)
 *  { type: 'polygon', points: [[x, y], ...] }          (closed automatically)
 *  { type: 'regularPolygon', cx, cy, r, sides, rotation? }  (r = circumradius)
 *  { type: 'slot', x1, y1, x2, y2, width }             (rounded slot between two centres)
 */
export function buildSketch({ name = 'Skizze', plane = 'top', shapes }) {
  if (!Array.isArray(shapes) || shapes.length === 0) throw new Error('shapes ist leer');
  const entities = [];
  const constraints = [];
  shapes.forEach((s, n) => {
    const p = `s${n}`;
    switch (s.type) {
      case 'line':
        entities.push(line(p, s.x1, s.y1, s.x2, s.y2));
        break;
      case 'rectangle':
      case 'centerRectangle': {
        const x = s.type === 'rectangle' ? s.x : s.cx - s.width / 2;
        const y = s.type === 'rectangle' ? s.y : s.cy - s.height / 2;
        closedPolyline(p, [[x, y], [x + s.width, y], [x + s.width, y + s.height], [x, y + s.height]], entities, constraints);
        break;
      }
      case 'polygon':
        closedPolyline(p, s.points, entities, constraints);
        break;
      case 'regularPolygon': {
        const sides = Math.round(s.sides);
        if (!(sides >= 3)) throw new Error('regularPolygon braucht sides >= 3');
        const rot = ((s.rotation || 0) * Math.PI) / 180;
        const pts = Array.from({ length: sides }, (_, i) => {
          const a = rot + (2 * Math.PI * i) / sides;
          return [s.cx + s.r * Math.cos(a), s.cy + s.r * Math.sin(a)];
        });
        closedPolyline(p, pts, entities, constraints);
        break;
      }
      case 'circle':
        entities.push({
          btType: 'BTMSketchCurve-4',
          entityId: p,
          centerId: `${p}.center`,
          geometry: circleGeom(s.cx, s.cy, s.r),
          isConstruction: false,
        });
        break;
      case 'arc':
        entities.push(arc(p, s.cx, s.cy, s.r, s.startAngle, s.endAngle));
        break;
      case 'slot': {
        const dx = s.x2 - s.x1;
        const dy = s.y2 - s.y1;
        const len = Math.hypot(dx, dy);
        if (len === 0) throw new Error('slot: beide Mittelpunkte sind gleich, nimm einen Kreis');
        const h = s.width / 2;
        const nx = (-dy / len) * h;
        const ny = (dx / len) * h;
        const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
        entities.push(line(`${p}.a`, s.x1 + nx, s.y1 + ny, s.x2 + nx, s.y2 + ny));
        entities.push(arc(`${p}.b`, s.x2, s.y2, h, ang - 90, ang + 90));
        entities.push(line(`${p}.c`, s.x2 - nx, s.y2 - ny, s.x1 - nx, s.y1 - ny));
        entities.push(arc(`${p}.d`, s.x1, s.y1, h, ang + 90, ang + 270));
        // arcs run counter-clockwise: right cap b from -n to +n, left cap d from +n to -n
        constraints.push(coincident(`${p}.k0`, `${p}.a.end`, `${p}.b.end`));
        constraints.push(coincident(`${p}.k1`, `${p}.b.start`, `${p}.c.start`));
        constraints.push(coincident(`${p}.k2`, `${p}.c.end`, `${p}.d.end`));
        constraints.push(coincident(`${p}.k3`, `${p}.d.start`, `${p}.a.start`));
        break;
      }
      default:
        throw new Error(`Unbekannte Form "${s.type}" (Form ${n + 1})`);
    }
  });
  return {
    btType: 'BTFeatureDefinitionCall-1406',
    feature: {
      btType: 'BTMSketch-151',
      featureType: 'newSketch',
      name,
      parameters: [
        {
          btType: 'BTMParameterQueryList-148',
          parameterId: 'sketchPlane',
          queries: [{ btType: 'BTMIndividualQuery-138', deterministicIds: [planeId(plane)] }],
        },
      ],
      entities,
      constraints,
    },
  };
}

// Counter-clockwise arc from startDeg to endDeg.
function arc(id, cx, cy, r, startDeg, endDeg) {
  const a0 = (startDeg * Math.PI) / 180;
  let a1 = (endDeg * Math.PI) / 180;
  while (a1 <= a0) a1 += 2 * Math.PI;
  return {
    btType: 'BTMSketchCurveSegment-155',
    entityId: id,
    centerId: `${id}.center`,
    startPointId: `${id}.start`,
    endPointId: `${id}.end`,
    startParam: a0,
    endParam: a1,
    geometry: circleGeom(cx, cy, r),
    isConstruction: false,
  };
}

const OPS = { new: 'NEW', add: 'ADD', remove: 'REMOVE', intersect: 'INTERSECT' };

function opParam(operation) {
  const op = OPS[String(operation || 'new').toLowerCase()];
  if (!op) throw new Error(`operation muss new, add, remove oder intersect sein`);
  return enumP('operationType', 'NewBodyOperationType', op);
}

function sketchRegions(sketchFeatureId) {
  return {
    btType: 'BTMParameterQueryList-148',
    parameterId: 'entities',
    queries: [
      {
        btType: 'BTMIndividualSketchRegionQuery-140',
        featureId: sketchFeatureId,
        filterInnerLoops: true,
        queryString: `query = qSketchRegion(id + "${sketchFeatureId}", true);`,
      },
    ],
  };
}

const mmExpr = (v) => (typeof v === 'number' ? `${v} mm` : String(v));
const degExpr = (v) => (typeof v === 'number' ? `${v} deg` : String(v));

/** Extrude all regions of a sketch. depth in mm (or an expression like "#dicke"). */
export function buildExtrude({ name = 'Extrusion', sketchFeatureId, depth, operation = 'new', oppositeDirection = false }) {
  if (!sketchFeatureId) throw new Error('sketchFeatureId fehlt');
  return {
    btType: 'BTFeatureDefinitionCall-1406',
    feature: {
      btType: 'BTMFeature-134',
      featureType: 'extrude',
      name,
      parameters: [
        enumP('bodyType', 'ExtendedToolBodyType', 'SOLID'),
        opParam(operation),
        sketchRegions(sketchFeatureId),
        enumP('endBound', 'BoundingType', 'BLIND'),
        qty('depth', mmExpr(depth)),
        bool('oppositeDirection', !!oppositeDirection),
        bool('defaultScope', true),
      ],
    },
  };
}

/** Revolve sketch regions around a sketch line (axisQuery: deterministic id of a line edge). */
export function buildRevolve({ name = 'Drehung', sketchFeatureId, axisDeterministicId, angle = 360, operation = 'new' }) {
  if (!sketchFeatureId || !axisDeterministicId) throw new Error('sketchFeatureId und axisDeterministicId nötig');
  const full = Number(angle) >= 360;
  return {
    btType: 'BTFeatureDefinitionCall-1406',
    feature: {
      btType: 'BTMFeature-134',
      featureType: 'revolve',
      name,
      parameters: [
        enumP('bodyType', 'ExtendedToolBodyType', 'SOLID'),
        opParam(operation),
        sketchRegions(sketchFeatureId),
        {
          btType: 'BTMParameterQueryList-148',
          parameterId: 'axis',
          queries: [{ btType: 'BTMIndividualQuery-138', deterministicIds: [axisDeterministicId] }],
        },
        enumP('revolveType', 'RevolveType', full ? 'FULL' : 'ONE_DIRECTION'),
        ...(full ? [] : [qty('angle', degExpr(angle))]),
        bool('defaultScope', true),
      ],
    },
  };
}

/** Fillet or chamfer on edges given by deterministic ids (from find_edges). */
export function buildFillet({ name = 'Verrundung', edgeIds, radius }) {
  if (!edgeIds?.length) throw new Error('edgeIds ist leer');
  return {
    btType: 'BTFeatureDefinitionCall-1406',
    feature: {
      btType: 'BTMFeature-134',
      featureType: 'fillet',
      name,
      parameters: [
        {
          btType: 'BTMParameterQueryList-148',
          parameterId: 'entities',
          queries: [{ btType: 'BTMIndividualQuery-138', deterministicIds: edgeIds }],
        },
        qty('radius', mmExpr(radius)),
      ],
    },
  };
}

export function buildChamfer({ name = 'Fase', edgeIds, width }) {
  if (!edgeIds?.length) throw new Error('edgeIds ist leer');
  return {
    btType: 'BTFeatureDefinitionCall-1406',
    feature: {
      btType: 'BTMFeature-134',
      featureType: 'chamfer',
      name,
      parameters: [
        {
          btType: 'BTMParameterQueryList-148',
          parameterId: 'entities',
          queries: [{ btType: 'BTMIndividualQuery-138', deterministicIds: edgeIds }],
        },
        enumP('chamferType', 'ChamferType', 'EQUAL_OFFSETS'),
        qty('width', mmExpr(width)),
      ],
    },
  };
}

/** Part Studio variable (#name), usable in later expressions. */
export function buildVariable({ name, value, description = '' }) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name || '')) throw new Error('Variablenname ungültig');
  return {
    btType: 'BTFeatureDefinitionCall-1406',
    feature: {
      btType: 'BTMFeature-134',
      featureType: 'assignVariable',
      name: `#${name}`,
      parameters: [
        enumP('variableType', 'VariableType', 'ANY'),
        str('name', name),
        qty('anyValue', typeof value === 'number' ? `${value} mm` : String(value)),
        str('description', description),
      ],
    },
  };
}

// FeatureScript that lists edges with their deterministic ids, type and midpoint (mm).
export function edgeListScript(featureId) {
  const q = featureId
    ? `qCreatedBy(makeId("${featureId.replace(/"/g, '')}"), EntityType.EDGE)`
    : 'qEverything(EntityType.EDGE)';
  return `function(context is Context, queries) {
  var out = [];
  for (var e in evaluateQuery(context, ${q})) {
    var ids = transientQueriesToStrings(e);
    var mid = evEdgeTangentLine(context, { "edge" : e, "parameter" : 0.5 }).origin;
    var kind = "CURVE";
    try silent { evLine(context, { "edge" : e }); kind = "LINE"; }
    var len = evLength(context, { "entities" : e });
    out = append(out, { "id" : ids, "type" : kind, "mid" : [mid[0] / millimeter, mid[1] / millimeter, mid[2] / millimeter], "lengthMm" : len / millimeter });
  }
  return out;
}`;
}

// Turns the typed BTFSValue tree from /featurescript into plain JSON.
export function fsToJs(v) {
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(fsToJs);
  const t = String(v.btType || v.typeTag || '');
  if (t.startsWith('BTFSValueMap')) {
    const o = {};
    for (const { key, value } of v.value || []) o[String(fsToJs(key))] = fsToJs(value);
    return o;
  }
  if (t.startsWith('BTFSValueArray')) return (v.value || []).map(fsToJs);
  if (t.startsWith('BTFSValueUndefined')) return null;
  if (t.startsWith('BTFSValueWithUnits')) return { value: v.value, units: v.unitToPower };
  if (t.startsWith('BTFSValue')) return fsToJs(v.value);
  return v;
}
