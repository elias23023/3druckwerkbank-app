import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSketch, buildExtrude, buildVariable, fsToJs, edgeListScript } from '../src/features.js';
import { parseOnshapeUrl } from '../src/onshape.js';

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

test('rectangle becomes 4 lines in metres with corner constraints', () => {
  const f = buildSketch({ plane: 'front', shapes: [{ type: 'rectangle', x: 0, y: 0, width: 40, height: 20 }] }).feature;
  assert.equal(f.parameters[0].queries[0].deterministicIds[0], 'JCC');
  assert.equal(f.entities.length, 4);
  assert.equal(f.constraints.length, 4);
  close(f.entities[0].endParam, 0.04);
  close(f.entities[1].endParam, 0.02);
  // each line ends where the next starts
  for (let i = 0; i < 4; i++) {
    const a = f.entities[i], b = f.entities[(i + 1) % 4];
    close(a.geometry.pntX + a.geometry.dirX * a.endParam, b.geometry.pntX);
    close(a.geometry.pntY + a.geometry.dirY * a.endParam, b.geometry.pntY);
  }
});

test('circle and unique entity ids', () => {
  const f = buildSketch({ shapes: [{ type: 'circle', cx: 5, cy: 5, r: 3 }, { type: 'regularPolygon', cx: 0, cy: 0, r: 10, sides: 6 }] }).feature;
  close(f.entities[0].geometry.radius, 0.003);
  const ids = f.entities.map((e) => e.entityId);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(f.entities.length, 7);
});

test('slot outline is closed', () => {
  const f = buildSketch({ shapes: [{ type: 'slot', x1: 0, y1: 0, x2: 20, y2: 0, width: 6 }] }).feature;
  const end = (e) => {
    const g = e.geometry;
    if (g.btType.startsWith('BTCurveGeometryLine')) return [[g.pntX, g.pntY], [g.pntX + g.dirX * e.endParam, g.pntY + g.dirY * e.endParam]];
    const p = (t) => [g.xCenter + g.radius * Math.cos(t), g.yCenter + g.radius * Math.sin(t)];
    return [p(e.startParam), p(e.endParam)];
  };
  // a.end ~ b(arc end), b.start ~ c.start, c.end ~ d.end, d.start ~ a.start
  const [a, b, c, d] = f.entities.map(end);
  const same = (p, q) => { close(p[0], q[0]); close(p[1], q[1]); };
  same(a[1], b[1]); same(b[0], c[0]); same(c[1], d[1]); same(d[0], a[0]);
});

test('extrude and variable parameters', () => {
  const e = buildExtrude({ sketchFeatureId: 'FAB', depth: 12, operation: 'remove' }).feature;
  assert.equal(e.parameters.find((p) => p.parameterId === 'depth').expression, '12 mm');
  assert.equal(e.parameters.find((p) => p.parameterId === 'operationType').value, 'REMOVE');
  assert.equal(e.parameters.find((p) => p.parameterId === 'entities').queries[0].featureId, 'FAB');
  assert.throws(() => buildExtrude({ sketchFeatureId: 'X', depth: 1, operation: 'cut' }));
  assert.equal(buildVariable({ name: 'dicke', value: 3 }).feature.name, '#dicke');
  assert.throws(() => buildVariable({ name: '3d', value: 1 }));
});

test('unknown shape is rejected', () => {
  assert.throws(() => buildSketch({ shapes: [{ type: 'spline' }] }), /Unbekannte Form/);
});

test('fsToJs flattens FeatureScript values', () => {
  const v = { btType: 'BTFSValueArray-1499', value: [
    { btType: 'BTFSValueMap-2062', value: [{ key: { btType: 'BTFSValueString-1422', value: 'id' }, value: { btType: 'BTFSValueString-1422', value: 'JHK' } }] },
  ] };
  assert.deepEqual(fsToJs(v), [{ id: 'JHK' }]);
  assert.match(edgeListScript('F"x'), /makeId\("Fx"\)/);
});

test('parseOnshapeUrl', () => {
  const d = 'a'.repeat(24), w = 'b'.repeat(24), e = 'c'.repeat(24);
  assert.deepEqual(parseOnshapeUrl(`https://cad.onshape.com/documents/${d}/w/${w}/e/${e}`), { documentId: d, workspaceId: w, elementId: e });
  assert.equal(parseOnshapeUrl('https://example.com'), null);
});
