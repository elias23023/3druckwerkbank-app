#!/usr/bin/env node
// Quick check of the API keys: node src/check.js
import { Onshape } from './onshape.js';

const api = new Onshape({
  accessKey: process.env.ONSHAPE_ACCESS_KEY,
  secretKey: process.env.ONSHAPE_SECRET_KEY,
  baseUrl: process.env.ONSHAPE_BASE_URL || 'https://cad.onshape.com',
  apiVersion: process.env.ONSHAPE_API_VERSION || 'v10',
});
try {
  const s = await api.get('/users/sessioninfo');
  console.log(`Verbunden als ${s.name}.`);
  const docs = await api.get('/documents', { filter: 0, limit: 5, sortColumn: 'modifiedAt', sortOrder: 'desc' });
  console.log('Letzte Dokumente:');
  for (const d of docs.items || []) console.log(`  - ${d.name}`);
} catch (e) {
  console.error('Fehler:', e.message);
  process.exit(1);
}
