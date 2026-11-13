// Prints the keyframes of the loops at rest (docs/wasser-look/vorlage/kern.css, "Leben in Ruhe" and "Markierung").
// Eight equal intervals per loop: with the gait steps(n) a loop of n seconds is drawn eight times a second. The values
// are samples of slow sine waves. Change the numbers here, paste the output into kern.css.     node scripts/wasser/keyframes.mjs
const S = (t, ph = 0) => Math.sin(2 * Math.PI * (t + ph));
const f = (v, d = 3) => +v.toFixed(d);
const there = (t) => (1 - Math.cos(2 * Math.PI * t)) / 2;                    // there and back, slow at both ends
const rim = {
  // name: drift from..to in % of its own width, swells per loop, swell amount, swell phase, breath low..high, breath phase
  'wa-licht-oben':  { x: [0, 52],  yn: 2, ya: .3,  yph: .1,  o: [.6, 1],  oph: .3 },
  'wa-licht-unten': { x: [0, -40], yn: 2, ya: .3,  yph: .55, o: [.55, 1], oph: .05 },
  'wa-licht-lauf':  { x: [0, 170], yn: 1, ya: .24, yph: .2,  o: [.5, 1],  oph: .35 },
};
for (const [name, k] of Object.entries(rim)) {
  let out = `@keyframes ${name} {\n`;
  for (let i = 0; i <= 8; i++) { const t = i / 8;
    out += `  ${(f(t * 100, 1) + '%').padEnd(5)} { transform: translateX(${f(k.x[0] + (k.x[1] - k.x[0]) * there(t), 1)}%) scaleY(${f(1 + k.ya * S(t * k.yn, k.yph))}); opacity: ${f(k.o[0] + (k.o[1] - k.o[0]) * (0.5 + 0.5 * S(t, k.oph)), 2)}; }\n`; }
  console.log(out + '}');
}
// Bodenlicht: a large soft patch wanders over the floor - across and back (x, % of its own width), bobbing twice (y, % of its
// own height), turning a little, growing and shrinking, breathing
{ let out = '@keyframes wa-boden {\n';
  for (let i = 0; i <= 8; i++) { const t = i / 8; const s = 1.9 + 0.2 * S(t * 2, 0.15);
    out += `  ${(f(t * 100, 1) + '%').padEnd(5)} { transform: translate(${f(60 * there(t), 1)}%, ${f(16 * S(t * 2, 0.05), 1)}%) rotate(${f(9 * S(t, 0.25), 1)}deg) scale(${f(s * (1 + 0.06 * S(t, 0.6)))}, ${f(s * (1 - 0.06 * S(t, 0.6)))}); opacity: ${f(0.7 + 0.3 * S(t, 0.4), 2)}; }\n`; }
  console.log(out + '}'); }
// Atmen: the bead of a bar breathes - it swells a little in height (only in height: the bead is moved sideways by its
// transform, and the single property "scale" works from the place of the first child) and its light dims and returns
{ let out = '@keyframes wa-atmet {\n';
  for (let i = 0; i <= 8; i++) { const t = i / 8; const b = 0.5 - 0.5 * Math.cos(2 * Math.PI * t);
    out += `  ${(f(t * 100, 1) + '%').padEnd(5)} { scale: 1 calc(1 + ${f(b, 3)} * var(--wa-atmet) * var(--wa-leben)); opacity: calc(1 - ${f(b, 3)} * var(--wa-atmet-licht) * var(--wa-leben)); }\n`; }
  console.log(out + '}'); }
