/**
 * Photos and files as real files (step 4): stored on disk outside the web root, one folder per workshop, described in table `files`.
 * Only members of the workshop can read them. Pictures are recognised by their content and shown inline; everything else is only offered as a download.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express from 'express';

const MAX_FILE = 25 * 1024 * 1024;
const QUOTA = 500 * 1024 * 1024; // per workshop
export const FILE_URL = /^\/api\/files\/[a-f0-9]{32}$/;

function sniff(buf) {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.length > 6 && ['GIF87a', 'GIF89a'].includes(buf.subarray(0, 6).toString('latin1'))) return 'image/gif';
  if (buf.length > 12 && buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
  if (buf.length > 12 && buf.subarray(4, 12).toString('latin1') === 'ftypavif') return 'image/avif';
  return 'application/octet-stream';
}
function pickDir(env, here) {
  const cut = here.indexOf('/domains/');
  const c = [env.FILES_DIR, cut >= 0 ? path.join(here.slice(0, cut), 'domains', here.slice(cut + 9).split('/')[0], 'werkbank-files') : null, path.join(os.homedir(), 'werkbank-files'), path.join(here, '..', 'werkbank-files')].filter(Boolean);
  for (const dir of c) { try { fs.mkdirSync(dir, { recursive: true, mode: 0o700 }); const probe = path.join(dir, `.probe-${process.pid}`); fs.writeFileSync(probe, 'x'); fs.unlinkSync(probe); return dir; } catch { /* next */ } }
  return null;
}

export async function migrateFiles(q) {
  await q(`CREATE TABLE IF NOT EXISTS files (id CHAR(32) PRIMARY KEY, workshop_id INT UNSIGNED NOT NULL, name VARCHAR(190) NOT NULL, mime VARCHAR(60) NOT NULL, size INT UNSIGNED NOT NULL, created_by INT UNSIGNED NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX (workshop_id), FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}

export function mountFiles(api, d) {
  const { q, one, requireUser, fail, wrap, env, here, access, writeLimit } = d;
  const dir = pickDir(env, here);
  const fileOf = (wid, id) => path.join(dir, String(wid), id);
  const raw = express.raw({ type: () => true, limit: MAX_FILE });

  const gate = async (req, res, next) => {
    try {
      if (!dir) fail(503, 'Der Dateispeicher ist auf dem Server nicht verfügbar.', 'no_files');
      req.ws = await access(req, 'editor');
      const len = Number(req.headers['content-length'] ?? 0); if (len > MAX_FILE) fail(413, 'Die Datei ist zu groß (über 25 MB).');
      writeLimit(req.ws.u.id, 60);
      const used = Number((await one('SELECT COALESCE(SUM(size), 0) AS n FROM files WHERE workshop_id = ?', [req.ws.id])).n);
      if (used + len > QUOTA) fail(413, 'Der Speicher dieser Werkstatt ist voll (500 MB). Bitte Dateien entfernen.');
    } catch (e) { return next(e); }
    raw(req, res, next);
  };
  api.post('/workshops/:id/files', gate, wrap(async (req, res) => {
    const { u, id: wid } = req.ws; const body = req.body;
    if (!Buffer.isBuffer(body) || body.length < 1) fail(400, 'Die Datei ist leer.');
    let name = 'Datei'; try { name = decodeURIComponent(String(req.headers['x-file-name'] ?? 'Datei')); } catch { /* keep */ }
    name = name.replace(/[\u0000-\u001f\\/:*?"<>|]/g, '_').slice(0, 190) || 'Datei';
    const id = crypto.randomBytes(16).toString('hex'); const mime = sniff(body);
    fs.mkdirSync(path.join(dir, String(wid)), { recursive: true, mode: 0o700 });
    fs.writeFileSync(fileOf(wid, id), body, { mode: 0o600 });
    try { await q('INSERT INTO files (id, workshop_id, name, mime, size, created_by) VALUES (?, ?, ?, ?, ?, ?)', [id, wid, name, mime, body.length, u.id]); }
    catch (e) { fs.rmSync(fileOf(wid, id), { force: true }); throw e; }
    res.json({ ok: true, id, url: `/api/files/${id}`, mime, size: body.length, image: mime.startsWith('image/') });
  }));

  api.get('/files/:fid', wrap(async (req, res) => {
    const u = await requireUser(req); const fid = String(req.params.fid);
    const f = /^[a-f0-9]{32}$/.test(fid) ? await one('SELECT f.id, f.workshop_id, f.name, f.mime, f.size FROM files f JOIN members m ON m.workshop_id = f.workshop_id AND m.user_id = ? WHERE f.id = ?', [u.id, fid]) : null;
    if (!f || !dir || !fs.existsSync(fileOf(f.workshop_id, f.id))) fail(404, 'Datei nicht gefunden.');
    const image = String(f.mime).startsWith('image/');
    res.set({ 'Content-Type': f.mime, 'Content-Length': String(f.size), 'Cache-Control': 'private, max-age=31536000, immutable', 'Content-Security-Policy': "default-src 'none'; sandbox", 'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': `${image ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(f.name)}` });
    fs.createReadStream(fileOf(f.workshop_id, f.id)).on('error', () => res.destroy()).pipe(res);
  }));

  api.post('/files/:fid/delete', wrap(async (req, res) => {
    const u = await requireUser(req); const fid = String(req.params.fid);
    const f = /^[a-f0-9]{32}$/.test(fid) ? await one("SELECT f.id, f.workshop_id FROM files f JOIN members m ON m.workshop_id = f.workshop_id AND m.user_id = ? AND m.role IN ('owner', 'editor') WHERE f.id = ?", [u.id, fid]) : null;
    if (!f) fail(404, 'Datei nicht gefunden.');
    await q('DELETE FROM files WHERE id = ?', [f.id]); if (dir) fs.rmSync(fileOf(f.workshop_id, f.id), { force: true });
    res.json({ ok: true });
  }));

  return { ready: !!dir, removeWorkshop: (wid) => { if (dir) fs.rmSync(path.join(dir, String(wid)), { recursive: true, force: true }); } };
}
