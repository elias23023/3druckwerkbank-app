// Desktop Start: the search centred. Before/after pictures in 2000x993 and 1920x1080; the header of another world compared pixel by pixel.
import { serve, abs, mkdir, strip, diff, sharp } from '../../../../scripts/wasser/lib.mjs';
import { openDesktop } from '../../../../scripts/wasser/desktop-lib.mjs';
const [OUT, VORHER, NACHHER] = process.argv.slice(2); mkdir(OUT);
const sv = { vorher: await serve(abs(VORHER), { app: true }), nachher: await serve(abs(NACHHER), { app: true }) };
for (const format of ['2000', '1920']) {
  const shots = {};
  for (const name of ['vorher', 'nachher']) {
    const d = await openDesktop({ app: sv[name].url, format, zeit: 'tag', uhr: 'steht', ton: 'dunkel', reduced: true, scale: 2 });
    const p = d.page;
    await d.go('start', 2500); await d.shot(`${OUT}/${format}-start-${name}.png`);
    const m = await p.evaluate(() => { const s = document.querySelector('.topbar__search').getBoundingClientRect(); return { mitte: +((s.left + s.right) / 2).toFixed(1), schirm: innerWidth / 2, links: s.left, rechts: s.right, b: [...document.querySelectorAll('.topbar > *')].map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right)]; }) }; });
    console.log(format, name, 'Start: search centre', m.mitte, 'screen centre', m.schirm, 'boxes', JSON.stringify(m.b));
    // the islands must stay free: does the search overlap an island label or anything of the stage's top?
    await d.go('heute', 2500); await d.shot(`${OUT}/${format}-heute-${name}.png`, { x: 0, y: 0, width: d.format.w, height: 90 });
    shots[name] = m; await d.close();
  }
  const r = await diff(`${OUT}/${format}-heute-vorher.png`, `${OUT}/${format}-heute-nachher.png`);
  console.log(format, 'header of "Heute" before vs after:', JSON.stringify(r).slice(0, 300));
  await strip([{ file: `${OUT}/${format}-start-vorher.png`, label: 'vorher' }, { file: `${OUT}/${format}-start-nachher.png`, label: 'nachher' }], `${OUT}/streifen-start-${format}.png`, { title: `Desktop ${format === '2000' ? '2000 × 993' : '1920 × 1080'}, Start: das Suchfeld steht in der Mitte`, note: `Mitte des Suchfelds: vorher ${shots.vorher.mitte} px, nachher ${shots.nachher.mitte} px (Bildschirmmitte ${shots.nachher.schirm} px)`, scale: 0.25 });
  // the header alone, larger
  for (const name of ['vorher', 'nachher']) await sharp(`${OUT}/${format}-start-${name}.png`).extract({ left: 0, top: 0, width: format === '2000' ? 4000 : 3840, height: 180 }).toFile(`${OUT}/${format}-kopf-${name}.png`);
  await strip([{ file: `${OUT}/${format}-kopf-vorher.png`, label: 'vorher' }, { file: `${OUT}/${format}-kopf-nachher.png`, label: 'nachher' }], `${OUT}/streifen-kopf-${format}.png`, { title: `Kopfzeile auf Start, ${format}`, cols: 1, scale: 0.5 });
}
for (const s of Object.values(sv)) await s.close();
