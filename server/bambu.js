/**
 * Bambu Lab printers through the Bambu cloud (step 5, experimental): the owner of a workshop signs in with the Bambu account once,
 * the server keeps only the access token (encrypted), listens to the status messages of the printers (MQTT) and tells the browsers.
 * Read-only: nothing is sent to the printers except the request for a full status. The cloud interface is not officially documented
 * and can change; every answer is read defensively and errors are shown as a status instead of breaking anything.
 */
import crypto from 'node:crypto';
import mqtt from 'mqtt';

const API = 'https://api.bambulab.com';
const BROKER = 'mqtts://us.mqtt.bambulab.com:8883';
const UA = '3druckwerkbank-server';

export async function migrateBambu(q) {
  await q(`CREATE TABLE IF NOT EXISTS bambu (workshop_id INT UNSIGNED PRIMARY KEY, account VARCHAR(190) NOT NULL, uid VARCHAR(40) NOT NULL, token_enc TEXT NOT NULL, linked_by INT UNSIGNED NULL, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}

export function mountBambu(api, d) {
  const { q, one, fail, wrap, str, validEmail, throttle, access, tell, env } = d;
  const secret = env.APP_SECRET ? crypto.createHash('sha256').update(String(env.APP_SECRET)).digest() : null;
  const seal = (text) => { const iv = crypto.randomBytes(12); const c = crypto.createCipheriv('aes-256-gcm', secret, iv); const body = Buffer.concat([c.update(text, 'utf8'), c.final()]); return [iv, c.getAuthTag(), body].map((b) => b.toString('base64')).join('.'); };
  const open = (sealed) => { const [iv, tag, body] = String(sealed).split('.').map((s) => Buffer.from(s, 'base64')); const c = crypto.createDecipheriv('aes-256-gcm', secret, iv); c.setAuthTag(tag); return Buffer.concat([c.update(body), c.final()]).toString('utf8'); };
  const links = new Map(); // workshop id -> { client, status, devices: Map(dev_id -> info), timer }
  const mask = (a) => String(a).replace(/^(.).*(@.*)$/, '$1…$2');

  async function call(path, { token, json } = {}) {
    const r = await fetch(API + path, { method: json ? 'POST' : 'GET', headers: { 'User-Agent': UA, Accept: 'application/json', ...(json ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: json ? JSON.stringify(json) : undefined, signal: AbortSignal.timeout(15_000) });
    let j = null; try { j = await r.json(); } catch { j = null; }
    return { status: r.status, j: j && typeof j === 'object' ? j : {} };
  }
  async function listDevices(token) {
    const r = await call('/v1/iot-service/api/user/bind', { token });
    if (r.status === 401 || r.status === 403) throw Object.assign(new Error('auth'), { auth: true });
    const list = Array.isArray(r.j.devices) ? r.j.devices : [];
    return list.filter((x) => x && typeof x.dev_id === 'string').map((x) => ({ id: x.dev_id.slice(0, 40), name: String(x.name ?? x.dev_id).slice(0, 80), model: String(x.dev_product_name ?? x.dev_model_name ?? '').slice(0, 60), online: !!x.online }));
  }
  async function uidOf(token) {
    const r = await call('/v1/design-user-service/my/preference', { token }); const uid = r.j.uid ?? r.j.uidStr;
    if (uid !== undefined && /^\d{1,30}$/.test(String(uid))) return String(uid);
    const p = await call('/v1/user-service/my/profile', { token }); const u2 = p.j.uid ?? p.j.uidStr;
    if (u2 !== undefined && /^\d{1,30}$/.test(String(u2))) return String(u2);
    throw new Error('uid');
  }

  function stop(wid) { const l = links.get(wid); if (!l) return; clearTimeout(l.timer); try { l.client?.end(true); } catch { /* closed */ } links.delete(wid); }
  /** Merge one status message; the printers send partial updates, so earlier values stay. */
  function merge(l, wid, devId, print) {
    const cur = l.devices.get(devId); if (!cur || !print || typeof print !== 'object') return;
    const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined); const s = cur.live ?? {};
    const next = { ...s, at: Date.now() };
    if (typeof print.gcode_state === 'string') next.state = print.gcode_state.slice(0, 20);
    if (num(print.mc_percent) !== undefined) next.percent = Math.max(0, Math.min(100, print.mc_percent));
    if (num(print.mc_remaining_time) !== undefined) next.remainingMin = Math.max(0, print.mc_remaining_time);
    if (typeof print.subtask_name === 'string' && print.subtask_name) next.file = print.subtask_name.slice(0, 120); else if (typeof print.gcode_file === 'string' && print.gcode_file) next.file = print.gcode_file.slice(0, 120);
    if (num(print.nozzle_temper) !== undefined) next.nozzle = Math.round(print.nozzle_temper);
    if (num(print.bed_temper) !== undefined) next.bed = Math.round(print.bed_temper);
    if (num(print.layer_num) !== undefined) next.layer = print.layer_num;
    if (num(print.total_layer_num) !== undefined) next.layers = print.total_layer_num;
    cur.live = next; cur.online = true;
    if (!l.timer) l.timer = setTimeout(() => { l.timer = null; tell(wid, { printers: true }); }, 3000); // at most one notice every three seconds
  }
  async function start(wid, row) {
    stop(wid); const l = { client: null, status: 'verbindet', devices: new Map(), timer: null, account: row.account }; links.set(wid, l);
    let token; try { token = open(row.token_enc); } catch { l.status = 'anmeldung'; return; }
    try { for (const dev of await listDevices(token)) l.devices.set(dev.id, dev); }
    catch (e) { l.status = e.auth ? 'anmeldung' : 'fehler'; tell(wid, { printers: true }); return; }
    const client = mqtt.connect(BROKER, { username: `u_${row.uid}`, password: token, clientId: `wb_${crypto.randomBytes(6).toString('hex')}`, reconnectPeriod: 30_000, connectTimeout: 15_000, keepalive: 60, protocolVersion: 4 });
    l.client = client;
    client.on('connect', () => { l.status = 'verbunden'; for (const id of l.devices.keys()) { client.subscribe(`device/${id}/report`); client.publish(`device/${id}/request`, JSON.stringify({ pushing: { sequence_id: '0', command: 'pushall' } })); } tell(wid, { printers: true }); });
    client.on('message', (topic, payload) => { const m = /^device\/([^/]+)\/report$/.exec(topic); if (!m || payload.length > 200_000) return; let j = null; try { j = JSON.parse(payload.toString('utf8')); } catch { return; } merge(l, wid, m[1], j?.print); });
    client.on('error', (e) => { const auth = /not authorized|bad user|5/i.test(String(e?.message ?? '')) && e?.code === 5 || e?.code === 4; l.status = auth ? 'anmeldung' : 'fehler'; if (auth) { try { client.end(true); } catch { /* closed */ } } tell(wid, { printers: true }); });
    client.on('close', () => { if (l.status === 'verbunden') l.status = 'getrennt'; });
  }
  /** Connect every linked workshop when the server starts. */
  async function startAll() { if (!secret) return; try { for (const row of await q('SELECT workshop_id, account, uid, token_enc FROM bambu')) void start(Number(row.workshop_id), row); } catch (e) { console.error('bambu start failed:', e?.code ?? e?.name ?? 'error'); } }

  api.get('/workshops/:id/bambu', wrap(async (req, res) => {
    const { id, role } = await access(req); const l = links.get(id);
    const row = l ? null : await one('SELECT account FROM bambu WHERE workshop_id = ?', [id]);
    res.json({ ok: true, available: !!secret, canManage: role === 'owner', linked: !!(l || row), account: l || row ? mask(l?.account ?? row.account) : null, status: l?.status ?? (row ? 'getrennt' : 'aus'),
      devices: l ? [...l.devices.values()].map((x) => ({ id: x.id, name: x.name, model: x.model, online: x.online, live: x.live ?? null })) : [] });
  }));

  // ask Bambu to send a sign-in code to the account's address (accounts without a password, or when Bambu asks for a code)
  api.post('/workshops/:id/bambu/code', wrap(async (req, res) => {
    await access(req, 'owner'); await throttle(req, 'bambu', 10); if (!secret) fail(503, 'Die Bambu-Anbindung ist auf dem Server nicht eingerichtet.', 'not_configured');
    const account = str(req.body?.account).trim().toLowerCase(); if (!validEmail(account)) fail(400, 'Bitte die E-Mail-Adresse des Bambu-Kontos angeben.');
    const r = await call('/v1/user-service/user/sendemail/code', { json: { email: account, type: 'codeLogin' } });
    if (r.status >= 400) fail(502, 'Bambu hat den Code nicht verschickt. Bitte später noch einmal.', 'bambu');
    res.json({ ok: true });
  }));

  api.post('/workshops/:id/bambu/login', wrap(async (req, res) => {
    const { u, id } = await access(req, 'owner'); await throttle(req, 'bambu', 10); if (!secret) fail(503, 'Die Bambu-Anbindung ist auf dem Server nicht eingerichtet.', 'not_configured');
    const account = str(req.body?.account).trim().toLowerCase(); const password = str(req.body?.password, 200); const code = str(req.body?.code, 12).trim();
    if (!validEmail(account) || (!password && !code)) fail(400, 'Bitte E-Mail und Passwort oder den Code aus der Bambu-Mail angeben.');
    let r;
    try { r = await call('/v1/user-service/user/login', { json: code ? { account, code } : { account, password, apiError: '' } }); }
    catch { fail(502, 'Die Bambu-Cloud ist gerade nicht erreichbar.', 'bambu'); }
    const token = typeof r.j.accessToken === 'string' ? r.j.accessToken : '';
    if (!token) {
      if (r.j.loginType === 'verifyCode') return res.json({ ok: true, need: 'code' }); // Bambu wants the code from its mail
      if (r.j.loginType === 'tfa') fail(400, 'Dieses Bambu-Konto nutzt die Zwei-Faktor-Anmeldung. Die wird hier noch nicht unterstützt.', 'bambu');
      fail(401, 'Bambu hat die Anmeldung abgelehnt. Bitte Zugangsdaten prüfen.', 'bambu');
    }
    let uid; try { uid = await uidOf(token); } catch { fail(502, 'Die Anmeldung hat geklappt, aber Bambu hat die Kontonummer nicht geliefert.', 'bambu'); }
    const row = { account, uid, token_enc: seal(token) };
    await q('INSERT INTO bambu (workshop_id, account, uid, token_enc, linked_by, updated_at) VALUES (?, ?, ?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE account = VALUES(account), uid = VALUES(uid), token_enc = VALUES(token_enc), linked_by = VALUES(linked_by), updated_at = NOW()', [id, account, uid, row.token_enc, u.id]);
    await start(id, row); tell(id, { printers: true });
    res.json({ ok: true, devices: links.get(id)?.devices.size ?? 0 });
  }));

  api.post('/workshops/:id/bambu/logout', wrap(async (req, res) => {
    const { id } = await access(req, 'owner'); stop(id); await q('DELETE FROM bambu WHERE workshop_id = ?', [id]); tell(id, { printers: true }); res.json({ ok: true });
  }));

  return { startAll, stop, ready: !!secret };
}
