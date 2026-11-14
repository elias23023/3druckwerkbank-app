// Holt die Vorlage des Wasser-Looks in die App: kopiert die drei Stylesheets und das Skript aus
// docs/wasser-look/vorlage nach src/wasser. Die Kopien nie von Hand ändern; die Quelle ist die Vorlage.
//
//   node scripts/wasser/uebernehmen.mjs
//
// Das Skript heißt in der App wasser-skript.js (nicht wasser.js: neben wasser.ts fände ein Import ohne Endung
// sonst die .js zuerst, siehe Kopf von wasser.js).
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FROM = path.join(REPO, 'docs/wasser-look/vorlage'), TO = path.join(REPO, 'src/wasser');
const HEAD = '/* Kopie – nicht von Hand ändern. Quelle: docs/wasser-look/vorlage. Neu holen: node scripts/wasser/uebernehmen.mjs */\n';
fs.mkdirSync(TO, { recursive: true });
for (const [from, to] of [['kern.css', 'kern.css'], ['mobil.css', 'mobil.css'], ['desktop.css', 'desktop.css'], ['wasser.js', 'wasser-skript.js']]) {
  fs.writeFileSync(path.join(TO, to), HEAD + fs.readFileSync(path.join(FROM, from), 'utf8'));
  console.log(`${from} -> src/wasser/${to}`);
}
