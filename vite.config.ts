import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Installable app (PWA): fills the service worker (public/sw.js is the template) with the files of this build and an id for them.
 * The id is a hash over everything the shell consists of, so the same sources give the same id and any change gives a new one. See docs/PWA.md.
 */
function pwaBuild(): Plugin {
  // no PNG icons in the shell: nothing offline needs them, and Hostinger's CDN runs .png/.jpg through an image service (docs/PWA.md)
  const SHELL_EXTRA = ['manifest.webmanifest'];
  let outDir = 'dist'; let files: string[] = [];
  return {
    name: 'wb-pwa-build', apply: 'build',
    configResolved(c) { outDir = path.resolve(c.root, c.build.outDir); },
    generateBundle(_o, bundle) { files = Object.keys(bundle).filter((f) => /\.(js|css|woff2)$/.test(f)).sort(); },
    closeBundle() {
      const sw = path.join(outDir, 'sw.js'); if (!fs.existsSync(sw) || !files.length) return;
      const extra = SHELL_EXTRA.filter((f) => fs.existsSync(path.join(outDir, f)));
      const template = fs.readFileSync(sw, 'utf8');
      const hash = createHash('sha256').update(template).update(files.join('|'));
      for (const f of ['index.html', ...extra]) hash.update(fs.readFileSync(path.join(outDir, f)));
      const img = /ASSET_VERSION = '([^']+)'/.exec(fs.readFileSync('src/scene/Island.tsx', 'utf8'))?.[1] ?? '0';
      const list = ['/', ...files.map((f) => `/${f}`), ...extra.map((f) => `/${f}`)];
      fs.writeFileSync(sw, template.replace('__WB_BUILD__', hash.digest('hex').slice(0, 12)).replace('__WB_IMG__', img).replace("['__WB_FILES__']", JSON.stringify(list)));
    },
  };
}

export default defineConfig({
  plugins: [react(), pwaBuild()],
  base: '/',
  build: { target: 'es2022', sourcemap: false },
});
