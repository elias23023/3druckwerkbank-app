/**
 * Shared workshops (step 2 of the move to Node.js): a workshop has members with roles, its content is stored entry by entry
 * (table `items`), every change gets a running revision number, and connected browsers are told at once (Server-Sent Events).
 * Each account owns one personal workshop; the former single-document state (`werkstatt`) is taken over into it on first use.
 */
import crypto from 'node:crypto';

export const COLLECTIONS = ['projects', 'devices', 'spools', 'tasks', 'prints', 'reports', 'appointments', 'shopping', 'energy', 'settings'];
const ROLES = ['owner', 'editor', 'reader'];
const IMAGE_DATA = /^data:image\/(jpeg|png|webp|gif|avif);base64,[A-Za-z0-9+/=]+$/;
const MAX_ITEM_BYTES = 3 * 1024 * 1024;
const MAX_OPS = 2000;

export async function migrateWorkshops(q) {
  await q(`CREATE TABLE IF NOT EXISTS workshops (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, owner_id INT UNSIGNED NOT NULL, name VARCHAR(80) NOT NULL, rev BIGINT UNSIGNED NOT NULL DEFAULT 0, personal TINYINT(1) NOT NULL DEFAULT 0, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX (owner_id), FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await q(`CREATE TABLE IF NOT EXISTS members (workshop_id INT UNSIGNED NOT NULL, user_id INT UNSIGNED NOT NULL, role VARCHAR(10) NOT NULL, joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (workshop_id, user_id), INDEX (user_id), FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await q(`CREATE TABLE IF NOT EXISTS invites (token_hash CHAR(64) PRIMARY KEY, workshop_id INT UNSIGNED NOT NULL, email VARCHAR(190) NOT NULL, role VARCHAR(10) NOT NULL, invited_by INT UNSIGNED NOT NULL, expires_at DATETIME NOT NULL, INDEX (workshop_id), INDEX (email), FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await q(`CREATE TABLE IF NOT EXISTS items (workshop_id INT UNSIGNED NOT NULL, coll VARCHAR(20) NOT NULL, id VARCHAR(80) NOT NULL, json MEDIUMTEXT NULL, rev BIGINT UNSIGNED NOT NULL, deleted TINYINT(1) NOT NULL DEFAULT 0, updated_by INT UNSIGNED NULL, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (workshop_id, coll, id), INDEX (workshop_id, rev), FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}

/** One stored entry must be a plain object of its collection; pictures only as inline image data, links only http(s). */
export function checkItem(coll, id, value, fail) {
  const bad = (why) => fail(400, `Ungültiger Eintrag (${why}).`);
  if (!COLLECTIONS.includes(coll)) bad('Liste');
  if (typeof id !== 'string' || id.length < 1 || id.length > 80) bad('Kennung');
  if (value === null) return;
  if (!value || typeof value !== 'object' || Array.isArray(value)) bad('Aufbau');
  if (coll !== 'settings' && value.id !== id) bad('Kennung');
  const image = (v) => v === undefined || v === null || (typeof v === 'string' && IMAGE_DATA.test(v));
  if (coll === 'projects') {
    if (!image(value.island?.photoDataUrl)) bad('Bild');
    if (value.files !== undefined && !Array.isArray(value.files)) bad('Dateien');
    for (const f of value.files ?? []) if (!f || typeof f !== 'object' || !image(f.dataUrl)) bad('Bild');
  }
  if (coll === 'shopping' && value.url !== undefined && value.url !== null && value.url !== '' && !(typeof value.url === 'string' && /^https?:\/\//i.test(value.url) && value.url.length <= 2000)) bad('Link');
}

export function mountWorkshops(api, d) {
  const { q, one, pool, requireUser, fail, wrap, sha256, str, validEmail, throttle, mayMail, sendMail, mailReady, BASE_URL, bigBody, writeLimit } = d;
  const listeners = new Map(); // workshop id -> Set of open event streams
  const tell = (wid, payload) => { for (const res of listeners.get(wid) ?? []) res.write(`data: ${JSON.stringify(payload)}\n\n`); };
  const wid = (req) => { const n = Number(req.params.id); if (!Number.isInteger(n) || n < 1) fail(404, 'Werkstatt nicht gefunden.'); return n; };
  const roleOf = async (userId, workshopId) => (await one('SELECT role FROM members WHERE workshop_id = ? AND user_id = ?', [workshopId, userId]))?.role ?? null;
  const access = async (req, need = 'reader') => {
    const u = await requireUser(req); const id = wid(req); const role = await roleOf(u.id, id);
    if (!role) fail(404, 'Werkstatt nicht gefunden.');
    if (ROLES.indexOf(role) > ROLES.indexOf(need)) fail(403, need === 'owner' ? 'Das darf nur die Eigentümerin oder der Eigentümer.' : 'Du hast in dieser Werkstatt nur Lesezugriff.', 'forbidden');
    return { u, id, role };
  };

  /** Applies entries inside an open transaction and returns the new revision. */
  async function writeItems(conn, workshopId, userId, ops) {
    await conn.execute('UPDATE workshops SET rev = LAST_INSERT_ID(rev + 1) WHERE id = ?', [workshopId]);
    const [[{ rev }]] = await conn.query('SELECT LAST_INSERT_ID() AS rev');
    for (const op of ops) {
      await conn.execute('INSERT INTO items (workshop_id, coll, id, json, rev, deleted, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE json = VALUES(json), rev = VALUES(rev), deleted = VALUES(deleted), updated_by = VALUES(updated_by), updated_at = NOW()',
        [workshopId, op.coll, op.id, op.value === null ? null : JSON.stringify(op.value), rev, op.value === null ? 1 : 0, userId]);
    }
    return Number(rev);
  }
  const inTx = async (fn) => { const conn = await pool.getConnection(); try { await conn.beginTransaction(); const r = await fn(conn); await conn.commit(); return r; } catch (e) { try { await conn.rollback(); } catch { /* closed */ } throw e; } finally { conn.release(); } };

  /** Every account has exactly one personal workshop; the old single-document state moves into it once. */
  async function ensurePersonal(u) {
    const have = await one('SELECT id FROM workshops WHERE owner_id = ? AND personal = 1', [u.id]);
    if (have) return have.id;
    return inTx(async (conn) => {
      const [[again]] = await conn.execute('SELECT id FROM workshops WHERE owner_id = ? AND personal = 1 FOR UPDATE', [u.id]);
      if (again) return again.id;
      const [r] = await conn.execute('INSERT INTO workshops (owner_id, name, personal) VALUES (?, ?, 1)', [u.id, 'Meine Werkstatt']);
      const id = r.insertId;
      await conn.execute("INSERT INTO members (workshop_id, user_id, role) VALUES (?, ?, 'owner')", [id, u.id]);
      const [[old]] = await conn.execute('SELECT state FROM werkstatt WHERE user_id = ?', [u.id]);
      if (old) {
        let state = null; try { state = JSON.parse(old.state); } catch { state = null; }
        const ops = [];
        for (const coll of COLLECTIONS) if (coll !== 'settings') for (const it of Array.isArray(state?.[coll]) ? state[coll] : []) { try { if (it && typeof it.id === 'string') { checkItem(coll, it.id, it, () => { throw new Error('skip'); }); ops.push({ coll, id: it.id, value: it }); } } catch { /* a damaged entry is left out, the rest moves */ } }
        if (state?.settings && typeof state.settings === 'object') ops.push({ coll: 'settings', id: `u${u.id}`, value: state.settings });
        if (ops.length) await writeItems(conn, id, u.id, ops);
      }
      return id;
    });
  }

  api.get('/workshops', wrap(async (req, res) => {
    const u = await requireUser(req); await ensurePersonal(u);
    const rows = await q('SELECT w.id, w.name, w.personal, w.rev, m.role, (SELECT COUNT(*) FROM members x WHERE x.workshop_id = w.id) AS members FROM members m JOIN workshops w ON w.id = m.workshop_id WHERE m.user_id = ? ORDER BY w.personal DESC, w.name', [u.id]);
    res.json({ ok: true, workshops: rows.map((r) => ({ id: Number(r.id), name: r.name, personal: !!Number(r.personal), rev: Number(r.rev), role: r.role, members: Number(r.members) })) });
  }));

  api.post('/workshops', wrap(async (req, res) => {
    const u = await requireUser(req); await throttle(req, 'wsnew', 10);
    const name = str(req.body?.name, 80).trim(); if (!name) fail(400, 'Bitte einen Namen angeben.');
    if (Number((await one('SELECT COUNT(*) AS n FROM workshops WHERE owner_id = ?', [u.id])).n) >= 10) fail(400, 'Mehr als zehn Werkstätten sind nicht möglich.');
    const id = await inTx(async (conn) => { const [r] = await conn.execute('INSERT INTO workshops (owner_id, name) VALUES (?, ?)', [u.id, name]); await conn.execute("INSERT INTO members (workshop_id, user_id, role) VALUES (?, ?, 'owner')", [r.insertId, u.id]); return r.insertId; });
    res.json({ ok: true, id: Number(id) });
  }));

  api.post('/workshops/:id/rename', wrap(async (req, res) => {
    const { id } = await access(req, 'owner'); const name = str(req.body?.name, 80).trim(); if (!name) fail(400, 'Bitte einen Namen angeben.');
    await q('UPDATE workshops SET name = ? WHERE id = ?', [name, id]); tell(id, { members: true }); res.json({ ok: true });
  }));

  api.post('/workshops/:id/delete', wrap(async (req, res) => {
    const { id } = await access(req, 'owner');
    if (Number((await one('SELECT personal FROM workshops WHERE id = ?', [id])).personal)) fail(400, 'Die persönliche Werkstatt lässt sich nicht löschen.');
    await q('DELETE FROM workshops WHERE id = ?', [id]); tell(id, { gone: true }); res.json({ ok: true });
  }));

  // entries changed since a revision (0 = everything that exists)
  api.get('/workshops/:id/items', wrap(async (req, res) => {
    const { u, id, role } = await access(req);
    const since = Math.max(0, Number(req.query.since) || 0);
    const rows = await q(`SELECT coll, id, json, rev, deleted FROM items WHERE workshop_id = ? AND rev > ? ${since === 0 ? 'AND deleted = 0' : ''} ORDER BY rev`, [id, since]);
    const rev = Number((await one('SELECT rev FROM workshops WHERE id = ?', [id])).rev);
    // settings are personal: every member only sees and writes the own entry
    const mine = `u${u.id}`;
    const parts = rows.filter((r) => r.coll !== 'settings' || r.id === mine).map((r) => `{"coll":"${r.coll}","id":${JSON.stringify(r.id)},"rev":${Number(r.rev)},"value":${Number(r.deleted) || r.json === null ? 'null' : r.json}}`);
    res.type('json').send(`{"ok":true,"rev":${rev},"role":"${role}","items":[${parts.join(',')}]}`);
  }));

  // session, role and write limit before the (possibly large) body is read
  const gate = async (req, res, next) => { try { const a = await access(req, 'editor'); req.ws = a; if (Number(req.headers['content-length'] ?? 0) > 13 * 1024 * 1024) fail(413, 'Die Änderung ist zu groß.'); writeLimit(a.u.id, 60); } catch (e) { return next(e); } bigBody(req, res, next); };
  api.post('/workshops/:id/ops', gate, wrap(async (req, res) => {
    const { u, id } = req.ws; const ops = req.body?.ops;
    if (!Array.isArray(ops) || ops.length < 1 || ops.length > MAX_OPS) fail(400, 'Ungültige Änderung.');
    const clean = ops.map((op) => {
      if (!op || typeof op !== 'object') fail(400, 'Ungültige Änderung.');
      const value = op.value ?? null; checkItem(op.coll, op.id, value, fail);
      if (op.coll === 'settings' && op.id !== `u${u.id}`) fail(403, 'Einstellungen sind persönlich.', 'forbidden');
      if (value !== null && Buffer.byteLength(JSON.stringify(value)) > MAX_ITEM_BYTES) fail(413, 'Ein Eintrag ist zu groß (über 3 MB). Bitte Fotos verkleinern.');
      return { coll: op.coll, id: op.id, value };
    });
    const rev = await inTx((conn) => writeItems(conn, id, u.id, clean));
    tell(id, { rev, by: u.id, client: str(req.body?.client, 40) });
    res.json({ ok: true, rev });
  }));

  // live channel: one small message per change, the browser then fetches what is new
  api.get('/workshops/:id/events', wrap(async (req, res) => {
    const { id } = await access(req);
    res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no', Connection: 'keep-alive' }); res.flushHeaders();
    const set = listeners.get(id) ?? new Set(); listeners.set(id, set);
    if (set.size >= 200) { res.end(); return; }
    set.add(res); res.write(`data: ${JSON.stringify({ hello: true, rev: Number((await one('SELECT rev FROM workshops WHERE id = ?', [id])).rev) })}\n\n`);
    const beat = setInterval(() => res.write(': ping\n\n'), 25_000);
    req.on('close', () => { clearInterval(beat); set.delete(res); if (!set.size) listeners.delete(id); });
  }));

  api.get('/workshops/:id/members', wrap(async (req, res) => {
    const { id, role } = await access(req);
    const members = await q('SELECT u.id, u.email, u.name, u.avatar_url, m.role FROM members m JOIN users u ON u.id = m.user_id WHERE m.workshop_id = ? ORDER BY FIELD(m.role, \'owner\', \'editor\', \'reader\'), u.name', [id]);
    const invites = role === 'owner' ? await q('SELECT email, role, expires_at FROM invites WHERE workshop_id = ? AND expires_at > NOW() ORDER BY email', [id]) : [];
    res.json({ ok: true, role, members: members.map((m) => ({ id: Number(m.id), email: m.email, name: m.name, avatar: m.avatar_url, role: m.role })), invites: invites.map((i) => ({ email: i.email, role: i.role })) });
  }));

  api.post('/workshops/:id/invites', wrap(async (req, res) => {
    const { u, id } = await access(req, 'owner'); await throttle(req, 'invite', 20);
    const email = str(req.body?.email).trim().toLowerCase(); const role = req.body?.role === 'reader' ? 'reader' : 'editor';
    if (!validEmail(email)) fail(400, 'Bitte eine gültige E-Mail-Adresse angeben.');
    if (!mailReady()) fail(503, 'Einladungen brauchen den Mailversand, der gerade nicht erreichbar ist.', 'no_mail');
    if (await one('SELECT 1 AS x FROM members m JOIN users u ON u.id = m.user_id WHERE m.workshop_id = ? AND u.email = ?', [id, email])) fail(409, 'Diese Person ist schon Mitglied.', 'exists');
    if (Number((await one('SELECT (SELECT COUNT(*) FROM members WHERE workshop_id = ?) + (SELECT COUNT(*) FROM invites WHERE workshop_id = ? AND expires_at > NOW()) AS n', [id, id])).n) >= 20) fail(400, 'Mehr als 20 Mitglieder und Einladungen sind nicht möglich.');
    if (!(await mayMail(email))) fail(429, 'An diese Adresse ging gerade erst eine E-Mail. Bitte in ein paar Minuten noch einmal.', 'rate');
    const token = crypto.randomBytes(32).toString('hex');
    await q('DELETE FROM invites WHERE (workshop_id = ? AND email = ?) OR expires_at < NOW()', [id, email]);
    await q('INSERT INTO invites (token_hash, workshop_id, email, role, invited_by, expires_at) VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))', [sha256(token), id, email, role, u.id]);
    const ws = await one('SELECT name FROM workshops WHERE id = ?', [id]);
    const who = (u.name || u.email).replace(/[\r\n]/g, ' ');
    try { await sendMail(email, `3Druckwerkbank: Einladung in die Werkstatt „${ws.name.replace(/[\r\n]/g, ' ')}“`, `Hallo,\n\n${who} lädt dich in die Werkstatt „${ws.name}“ ein (${role === 'reader' ? 'nur lesen' : 'mitarbeiten'}).\n\nMit diesem Link nimmst du die Einladung an (gültig sieben Tage). Melde dich dafür mit dieser E-Mail-Adresse an oder lege damit ein Konto an:\n${BASE_URL}/#/einladung/${token}\n\nWenn du die Person nicht kennst, ignoriere diese E-Mail.\n`); }
    catch (e) { await q('DELETE FROM invites WHERE token_hash = ?', [sha256(token)]); console.error('invite mail failed:', e?.code ?? e?.name ?? 'error'); fail(502, 'Die Einladung konnte nicht verschickt werden.', 'no_mail'); }
    tell(id, { members: true }); res.json({ ok: true });
  }));

  api.post('/workshops/:id/invites/revoke', wrap(async (req, res) => {
    const { id } = await access(req, 'owner'); await q('DELETE FROM invites WHERE workshop_id = ? AND email = ?', [id, str(req.body?.email).trim().toLowerCase()]); res.json({ ok: true });
  }));

  // the link from the invitation: only the account with the invited address can accept
  api.post('/invites/accept', wrap(async (req, res) => {
    const u = await requireUser(req); await throttle(req, 'accept', 20);
    const token = str(req.body?.token, 200);
    const inv = /^[a-f0-9]{64}$/.test(token) ? await one('SELECT workshop_id, email, role FROM invites WHERE token_hash = ? AND expires_at > NOW()', [sha256(token)]) : null;
    if (!inv) fail(400, 'Die Einladung ist ungültig oder abgelaufen.');
    if (inv.email !== String(u.email).toLowerCase()) fail(403, 'Diese Einladung gilt für eine andere E-Mail-Adresse. Melde dich mit der eingeladenen Adresse an.', 'forbidden');
    await q('INSERT INTO members (workshop_id, user_id, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE role = role', [inv.workshop_id, u.id, inv.role === 'reader' ? 'reader' : 'editor']);
    await q('DELETE FROM invites WHERE token_hash = ?', [sha256(token)]);
    tell(Number(inv.workshop_id), { members: true });
    res.json({ ok: true, id: Number(inv.workshop_id) });
  }));

  api.post('/workshops/:id/members/:uid', wrap(async (req, res) => {
    const { u, id } = await access(req, 'owner'); const uid = Number(req.params.uid); const role = req.body?.role;
    if (uid === Number(u.id) || !['editor', 'reader'].includes(role)) fail(400, 'Diese Rolle lässt sich so nicht ändern.');
    await q('UPDATE members SET role = ? WHERE workshop_id = ? AND user_id = ? AND role <> \'owner\'', [role, id, uid]); tell(id, { members: true }); res.json({ ok: true });
  }));

  // the owner removes someone, or a member leaves
  api.post('/workshops/:id/members/:uid/remove', wrap(async (req, res) => {
    const { u, id, role } = await access(req); const uid = Number(req.params.uid);
    if (uid !== Number(u.id) && role !== 'owner') fail(403, 'Das darf nur die Eigentümerin oder der Eigentümer.', 'forbidden');
    if ((await roleOf(uid, id)) === 'owner') fail(400, 'Die Eigentümerin oder der Eigentümer kann die Werkstatt nicht verlassen.');
    await q('DELETE FROM members WHERE workshop_id = ? AND user_id = ?', [id, uid]); tell(id, { members: true, removed: uid }); res.json({ ok: true });
  }));
}
