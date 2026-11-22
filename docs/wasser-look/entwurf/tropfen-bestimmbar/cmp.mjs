import fs from 'fs';
const [dir, name] = process.argv.slice(2);
const L = ['soll', 'ist'].map((s) => JSON.parse(fs.readFileSync(`${dir}/${name}-${s}.json`)).log);
const key = (e) => e.u.uCtr.map((v) => v.toFixed(1)).join(',') + ' ' + e.u.uHalf.join('x');
const last = L.map((log) => { const m = new Map(); for (const e of log) m.set(key(e), e); return m; });
for (const [k, a] of last[0]) { const b = last[1].get(k); if (!b) { console.log(k, 'missing in ist'); continue; }
  const d = []; for (const u of Object.keys(a.u)) if (JSON.stringify(a.u[u]) !== JSON.stringify(b.u[u])) d.push(`${u}: ${JSON.stringify(a.u[u])} / ${JSON.stringify(b.u[u])}`);
  if (JSON.stringify(a.vp) !== JSON.stringify(b.vp)) d.push(`vp ${a.vp} / ${b.vp}`); if (JSON.stringify(a.cv) !== JSON.stringify(b.cv)) d.push(`glcanvas ${a.cv} / ${b.cv}`);
  console.log(`${a.px === b.px ? 'same px' : 'PX DIFFER'}  ${k}  seed ${a.u.uSeed.toFixed(4)}  draws#${a.n}/${b.n} t ${a.t}/${b.t}  ${d.join('; ') || 'all uniforms, viewport, canvas equal'}`); }
console.log('draws', L.map((l) => l.length));
