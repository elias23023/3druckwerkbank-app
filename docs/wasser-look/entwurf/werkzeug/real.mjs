// usage: node real.mjs <look-folder-abs | -> <out-dir> [chromium|webkit] [ton, e.g. klar]
// The REAL app at phone size with the look injected once: the main screens, a project, three sheets with forms and the toast.
// Writes app-start, app-heute, app-projekte, app-projekt, app-material, app-druck, app-sheet-projekt, app-sheet-rolle, app-sheet-einstellungen, app-sheet-konto, app-toast (.png).
// Needs the preview server: (cd <repo> && npx vite preview --port 4173 --strictPort). For webkit: source <scratchpad>/judge-phone/env.sh first.
import fs from 'fs'; import { openApp } from './real-lib.mjs';
const [look, out, engine = 'chromium', ton = ''] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const app = await openApp({ look: look === '-' ? null : look, engine, ton: ton || null });
const step = async (name, fn) => { try { await fn(); await app.shot(`${out}/${name}.png`); } catch (e) { console.log('!!', name, String(e).slice(0, 140)); } };
await step('app-start', () => app.go('#/start')); await step('app-heute', () => app.go('#/heute')); await step('app-projekte', () => app.go('#/projekte'));
await step('app-projekt', () => app.project()); await step('app-material', () => app.go('#/material')); await step('app-druck', () => app.go('#/druck'));
await step('app-sheet-projekt', () => app.sheet('projekt')); await app.closeSheet();
await step('app-sheet-rolle', () => app.sheet('rolle')); await app.closeSheet();
await step('app-sheet-einstellungen', () => app.sheet('einstellungen')); await app.closeSheet();
await step('app-sheet-konto', () => app.sheet('konto')); await app.closeSheet();
await step('app-toast', () => app.sheet('toast'));
if (app.errors.length) console.log('errors', app.errors.slice(0, 4)); await app.close(); console.log('ok', out);
