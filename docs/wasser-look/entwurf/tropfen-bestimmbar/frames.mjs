import fs from 'fs';
const [dir, name] = process.argv.slice(2);
for (const s of ['soll', 'ist']) { const log = JSON.parse(fs.readFileSync(`${dir}/${name}-${s}.json`)).log; console.log('--', s);
  let cur = null; const fr = []; for (const e of log) { if (!cur || e.t - cur.t1 > 6 && e.vp[0] === 0 && (e.vp[1] + e.vp[3] === e.cv[1])) { cur = { t0: e.t, t1: e.t, cv: e.cv, d: [] }; fr.push(cur); } cur.t1 = e.t; cur.d.push(`${Math.round(e.u.uCtr[0])},${Math.round(e.u.uCtr[1])}${e.u.uPress[2] ? '!' : ''}@${e.vp[0]},${e.vp[1]}`); }
  for (const f of fr) console.log(`t ${f.t0} glc ${f.cv}  ${f.d.join('  ')}`); }
