/**
 * 3Druckwerkbank – Node.js server on Hostinger. Serves the built React app (./public) and the API under /api.
 * Step 1 of the move away from PHP: same MySQL database, same tables, same cookie and password format as public/api/*.php,
 * so existing accounts and saved workshops keep working. Configuration comes from environment variables (never from the repository):
 * DB_NAME, DB_USER, DB_PASS, GOOGLE_CLIENT_ID, MAIL_FROM, BASE_URL, optional SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS.
 */
import crypto from 'node:crypto';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { migrateWorkshops, mountWorkshops } from './workshops.js';
import { migrateFiles, mountFiles } from './files.js';
import { migrateBambu, mountBambu } from './bambu.js';

import os from 'node:os';

/**
 * Configuration: environment variables win; otherwise the existing config of the PHP layer is read (same file, outside the web root:
 * ~/domains/3druckwerkbank.com/werkbank-private/config.php), so the secrets live in exactly one place and never in the repository.
 */
function loadConfig() {
  const e = process.env; const out = { ...e };
  if (!out.DB_PASS && out.DB_PASSWORD) out.DB_PASS = out.DB_PASSWORD; // name used by Hostinger's database setup
  // a database from the environment is used as a whole: never mix its name with the password of another database from the file
  const ownDb = !!(out.DB_NAME || out.DB_USER || out.DB_PASS);
  // the app directory lies below .../domains/<domain>/; the PHP config belongs to the main domain next to its public_html
  const here = path.dirname(fileURLToPath(import.meta.url)); const cut = here.indexOf('/domains/');
  const rel = ['3druckwerkbank.com', 'werkbank-private', 'config.php'];
  const candidates = [e.WERKBANK_CONFIG, cut >= 0 ? path.join(here.slice(0, cut), 'domains', ...rel) : null, path.join(os.homedir(), 'domains', ...rel), path.join(here, '..', 'werkbank-private', 'config.php')].filter(Boolean);
  try {
    const file = candidates.find((c) => fs.existsSync(c)); if (!file) throw new Error('none');
    const php = fs.readFileSync(file, 'utf8'); const map = { db_name: 'DB_NAME', db_user: 'DB_USER', db_pass: 'DB_PASS', google_client_id: 'GOOGLE_CLIENT_ID', mail_from: 'MAIL_FROM', base_url: 'BASE_URL', smtp_host: 'SMTP_HOST', smtp_port: 'SMTP_PORT', smtp_user: 'SMTP_USER', smtp_pass: 'SMTP_PASS', app_secret: 'APP_SECRET' };
    for (const m of php.matchAll(/'(\w+)'\s*=>\s*'((?:[^'\\]|\\.)*)'/g)) { const k = map[m[1]]; if (k && !out[k] && !(ownDb && k.startsWith('DB_'))) out[k] = m[2].replace(/\\(['\\])/g, '$1'); }
  } catch { /* no PHP config here: environment only */ }
  return out;
}
const env = loadConfig();
const BASE_URL = /^https:\/\/[a-z0-9.-]+$/i.test(env.BASE_URL ?? '') ? env.BASE_URL : 'https://3druckwerkbank.com';
const SESSION_DAYS = 30; // sliding: extended while the account is in use
const BCRYPT_COST = 12;
const MAX_PW_BYTES = 72; // bcrypt only looks at the first 72 bytes
const MAX_STATE_BYTES = 12 * 1024 * 1024;
const configured = !!(env.DB_NAME && env.DB_USER && env.DB_PASS);

const pool = configured ? mysql.createPool({ host: '127.0.0.1', port: 3306, database: env.DB_NAME, user: env.DB_USER, password: env.DB_PASS, charset: 'utf8mb4', connectionLimit: 5, timezone: 'Z', dateStrings: true }) : null;
const q = async (sql, params = []) => (await pool.execute(sql, params))[0];
const one = async (sql, params = []) => (await q(sql, params))[0] ?? null;

class ApiError extends Error { constructor(status, message, kind = 'error') { super(message); this.status = status; this.kind = kind; } }
const fail = (status, message, kind) => { throw new ApiError(status, message, kind); };
const wrap = (fn) => (req, res, next) => fn(req, res).catch(next);
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const validEmail = (e) => typeof e === 'string' && e.length <= 190 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
const str = (v, max = 300) => (typeof v === 'string' ? v.slice(0, max) : '');
const TS = "DATE_FORMAT(updated_at, '%Y-%m-%dT%H:%i:%s.%f')";
const iso = (t) => `${String(t).slice(0, 23)}Z`;

/** Tables as created by the PHP layer; every step is repeatable. */
async function migrate() {
  await q(`CREATE TABLE IF NOT EXISTS users (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, email VARCHAR(190) NOT NULL UNIQUE, password_hash VARCHAR(255) NULL, google_sub VARCHAR(64) NULL UNIQUE, name VARCHAR(120) NULL, avatar_url VARCHAR(500) NULL, email_verified TINYINT(1) NOT NULL DEFAULT 0, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, last_login_at DATETIME NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await q(`CREATE TABLE IF NOT EXISTS sessions (token_hash CHAR(64) PRIMARY KEY, user_id INT UNSIGNED NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, expires_at DATETIME NOT NULL, INDEX (user_id), INDEX (expires_at), FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await q(`CREATE TABLE IF NOT EXISTS werkstatt (user_id INT UNSIGNED PRIMARY KEY, state LONGTEXT NOT NULL, updated_at DATETIME(3) NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await q(`CREATE TABLE IF NOT EXISTS resets (token_hash CHAR(64) PRIMARY KEY, user_id INT UNSIGNED NOT NULL, expires_at DATETIME NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  // registrations waiting for the confirmation link from the mail
  await q(`CREATE TABLE IF NOT EXISTS pending (token_hash CHAR(64) PRIMARY KEY, email VARCHAR(190) NOT NULL, password_hash VARCHAR(255) NOT NULL, expires_at DATETIME NOT NULL, INDEX (email), INDEX (expires_at)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await q(`CREATE TABLE IF NOT EXISTS attempts (ip VARBINARY(45) NOT NULL, at DATETIME NOT NULL, INDEX (ip, at)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await migrateWorkshops(q);
  await migrateFiles(q);
  await migrateBambu(q);
}

// ---- helpers shared by the routes ----
const userOut = (u) => ({ id: Number(u.id), email: u.email, name: u.name, avatar: u.avatar_url, provider: u.google_sub ? 'google' : 'email' });
const userById = async (id) => (await one('SELECT id, email, name, avatar_url, google_sub FROM users WHERE id = ?', [id])) ?? fail(500, 'Nutzer nicht gefunden.');
const isLocal = (req) => ['localhost', '127.0.0.1'].includes(req.hostname);
// __Host- pins the cookie to this exact host over HTTPS (no Domain attribute, path /); plain name only for local development
const cookieName = (req) => (isLocal(req) ? 'wb_session' : '__Host-wb_session');
const cookieOpts = (req) => ({ path: '/', secure: !isLocal(req), httpOnly: true, sameSite: 'lax' });
const cookieOf = (req) => { const m = new RegExp(`(?:^|;\\s*)${cookieName(req)}=([a-f0-9]{64})`).exec(req.headers.cookie ?? ''); return m ? m[1] : ''; };
async function currentUser(req) {
  const t = cookieOf(req); if (!t) return null;
  return one('SELECT u.id, u.email, u.name, u.avatar_url, u.google_sub FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > NOW()', [sha256(t)]);
}
/** Sliding session: at most once a day the expiry moves forward and the cookie is sent again. Unused sessions end after SESSION_DAYS. */
async function refreshSession(req, res) {
  const t = cookieOf(req); if (!t) return;
  const r = await q(`UPDATE sessions SET expires_at = DATE_ADD(NOW(), INTERVAL ${SESSION_DAYS} DAY) WHERE token_hash = ? AND expires_at > NOW() AND expires_at < DATE_ADD(NOW(), INTERVAL ${SESSION_DAYS - 1} DAY)`, [sha256(t)]);
  if (r.affectedRows) res.cookie(cookieName(req), t, { ...cookieOpts(req), maxAge: SESSION_DAYS * 86400_000 });
}
const requireUser = async (req) => (await currentUser(req)) ?? fail(401, 'Nicht angemeldet.', 'auth');
async function setSession(req, res, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  await q(`INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ${SESSION_DAYS} DAY))`, [sha256(token), userId]);
  await q('DELETE FROM sessions WHERE expires_at < NOW()');
  await q('UPDATE users SET last_login_at = NOW() WHERE id = ?', [userId]);
  res.cookie(cookieName(req), token, { ...cookieOpts(req), maxAge: SESSION_DAYS * 86400_000 });
}
async function clearSession(req, res) {
  const t = cookieOf(req); if (t) await q('DELETE FROM sessions WHERE token_hash = ?', [sha256(t)]);
  res.clearCookie(cookieName(req), cookieOpts(req));
}
/** Throttle key: IPv4 as is, IPv6 as /64 network. */
function ipKey(req) {
  const ip = String(req.ip ?? '0.0.0.0').replace(/^::ffff:/, '');
  if (!ip.includes(':')) return ip.slice(0, 45);
  const [head, tail = ''] = ip.split('::'); const h = head.split(':').filter(Boolean); const t = tail.split(':').filter(Boolean);
  const full = [...h, ...Array(Math.max(0, 8 - h.length - t.length)).fill('0'), ...t].map((x) => x.padStart(4, '0'));
  return `v6:${full.slice(0, 4).join('')}`;
}
/**
 * Limits in a 15 minute window, counted per action so one action cannot be used to block another:
 * every call counts for the connection; `hit` counts for an extra key (e-mail address) and is called separately, e.g. only for failed logins.
 * The attempt is written first and counted afterwards, so parallel requests cannot slip past the limit.
 */
const LIMIT_WINDOW = 'INTERVAL 15 MINUTE';
const keyOf = (action, value) => `${action}:${sha256(String(value).toLowerCase()).slice(0, 38)}`;
async function hit(key, max) {
  await q('INSERT INTO attempts (ip, at) VALUES (?, NOW())', [key]);
  const r = await one(`SELECT COUNT(*) AS n FROM attempts WHERE ip = ? AND at > (NOW() - ${LIMIT_WINDOW})`, [key]);
  if (Number(r.n) > max) fail(429, 'Zu viele Versuche. Bitte in einigen Minuten noch einmal.', 'rate');
}
const count = async (key, window = LIMIT_WINDOW) => Number((await one(`SELECT COUNT(*) AS n FROM attempts WHERE ip = ? AND at > (NOW() - ${window})`, [key])).n);
async function throttle(req, action, max = 20) {
  if (Math.random() < 0.05) await q('DELETE FROM attempts WHERE at < (NOW() - INTERVAL 1 DAY)');
  await hit(keyOf(action, ipKey(req)), max);
}
const pwBytes = (pw) => Buffer.byteLength(pw, 'utf8');
const checkNewPassword = (pw) => { if (pw.length < 8) fail(400, 'Das Passwort braucht mindestens 8 Zeichen.'); if (pwBytes(pw) > MAX_PW_BYTES) fail(400, 'Das Passwort darf höchstens 72 Zeichen lang sein.'); };
const DUMMY_HASH = bcrypt.hashSync(crypto.randomBytes(16).toString('hex'), BCRYPT_COST);
const hashPw = (pw) => bcrypt.hash(pw, BCRYPT_COST);
const needsRehash = (hash) => { const m = /^\$2[aby]\$(\d\d)\$/.exec(hash ?? ''); return !m || Number(m[1]) < BCRYPT_COST; };
/** Writes per account and minute, kept in memory (one process). */
const writes = new Map();
function writeLimit(userId, max = 30) {
  const now = Date.now(); const list = (writes.get(userId) ?? []).filter((t) => now - t < 60_000);
  if (list.length >= max) fail(429, 'Zu viele Speichervorgänge. Bitte kurz warten.', 'rate');
  list.push(now); writes.set(userId, list);
  if (writes.size > 5000) for (const [k, v] of writes) if (!v.some((t) => now - t < 60_000)) writes.delete(k);
}
/** Only inline images may be stored as pictures; anything else would make every viewer's browser call a foreign address. */
const IMAGE_DATA = /^data:image\/(jpeg|png|webp|gif|avif);base64,[A-Za-z0-9+/=]+$/;
const LISTS = ['projects', 'devices', 'spools', 'tasks', 'prints', 'reports', 'appointments', 'shopping', 'energy'];
function checkState(state) {
  const bad = (why) => fail(400, `Kein gültiger Werkstatt-Stand (${why}).`);
  if (!state || typeof state !== 'object' || Array.isArray(state) || state.version !== 1 || !Array.isArray(state.projects)) bad('Aufbau');
  for (const k of LISTS) { const v = state[k]; if (v === undefined || v === null) continue; if (!Array.isArray(v) || v.length > 5000) bad(k); for (const item of v) if (!item || typeof item !== 'object' || Array.isArray(item) || (item.id !== undefined && (typeof item.id !== 'string' || item.id.length > 80))) bad(k); }
  if (state.settings !== undefined && (typeof state.settings !== 'object' || state.settings === null || Array.isArray(state.settings))) bad('settings');
  for (const p of state.projects) {
    const photo = p.island?.photoDataUrl; if (photo !== undefined && photo !== null && !(typeof photo === 'string' && IMAGE_DATA.test(photo))) bad('Bild');
    if (p.files !== undefined && !Array.isArray(p.files)) bad('files');
    for (const f of p.files ?? []) { if (!f || typeof f !== 'object') bad('files'); if (f.dataUrl !== undefined && f.dataUrl !== null && !(typeof f.dataUrl === 'string' && IMAGE_DATA.test(f.dataUrl))) bad('Bild'); }
  }
  for (const it of state.shopping ?? []) if (it.url !== undefined && it.url !== null && it.url !== '' && !(typeof it.url === 'string' && /^https?:\/\//i.test(it.url) && it.url.length <= 2000)) bad('Link');
}
const googleKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
// Mail goes out through the mailbox of the domain (SMTP). Without it nothing is sent and registration works without confirmation.
const mailer = env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS ? nodemailer.createTransport({ host: env.SMTP_HOST, port: Number(env.SMTP_PORT) || 465, secure: (Number(env.SMTP_PORT) || 465) === 465, auth: { user: env.SMTP_USER, pass: env.SMTP_PASS }, connectionTimeout: 10_000, socketTimeout: 15_000 }) : null;
let mailReady = false;
const checkMail = () => { if (mailer) mailer.verify().then(() => { mailReady = true; }).catch((e) => { mailReady = false; console.error('mail not ready:', e?.code ?? e?.name ?? 'error'); }); };
checkMail(); setInterval(checkMail, 30 * 60_000).unref();
const mailFrom = () => `3Druckwerkbank <${validEmail(env.MAIL_FROM) ? env.MAIL_FROM : env.SMTP_USER}>`;
/** One mail per address in 5 minutes and three per hour, whatever the reason and whoever asks. */
async function mayMail(email) {
  const key = keyOf('mail', email);
  if (await count(key, 'INTERVAL 5 MINUTE') >= 1 || await count(key, 'INTERVAL 1 HOUR') >= 3) return false;
  await q('INSERT INTO attempts (ip, at) VALUES (?, NOW())', [key]); return true;
}
const sendMail = (to, subject, text) => mailer.sendMail({ from: mailFrom(), to, subject, text });

// ---- app ----
const app = express();
app.set('trust proxy', Number(env.TRUST_PROXY ?? 1)); // number of proxies in front of the app (CDN, web server); see docs
app.set('query parser', 'simple');
app.disable('x-powered-by');
// Content-Security-Policy as a second line of defence: only our own scripts plus Google sign-in; styles need 'unsafe-inline' (React inline styles)
const CSP = ["default-src 'self'", "script-src 'self' https://accounts.google.com", "style-src 'self' 'unsafe-inline' https://accounts.google.com", "img-src 'self' data: blob: https:", "font-src 'self' data:",
  "connect-src 'self' https://api.open-meteo.com https://geocoding-api.open-meteo.com https://accounts.google.com", "frame-src https://accounts.google.com", "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'", "object-src 'none'"].join('; ');
app.use((req, res, next) => { res.set({ 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'Strict-Transport-Security': 'max-age=15552000', 'Content-Security-Policy': CSP,
  'Permissions-Policy': 'geolocation=(self), camera=(), microphone=(), payment=(), usb=()', 'Cross-Origin-Opener-Policy': 'same-origin-allow-popups' }); next(); });

const api = express.Router();
api.use((req, res, next) => { res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'same-origin' }); next(); });
/** Only calls from our own pages (in addition to SameSite cookies). */
api.use((req, res, next) => {
  const site = req.headers['sec-fetch-site'];
  if (site && site !== 'same-origin' && site !== 'none' && req.method !== 'GET') return next(new ApiError(403, 'Falsche Herkunft.'));
  const origin = req.headers.origin;
  // a browser always sends Origin or Sec-Fetch-Site with a writing request; without either the call is refused
  if (!origin) return req.method === 'GET' || site ? next() : next(new ApiError(403, 'Falsche Herkunft.'));
  let host = ''; try { host = new URL(origin).hostname.toLowerCase(); } catch { /* invalid origin */ }
  return host && host === String(req.hostname).toLowerCase() ? next() : next(new ApiError(403, 'Falsche Herkunft.'));
});
// small bodies everywhere; the large one only for /state and only after the session has been checked (see putState)
const smallBody = express.json({ limit: '10kb' });
const bigBody = express.json({ limit: '13mb' });
api.use((req, res, next) => (req.path === '/state' || /^\/workshops\/\d+\/(ops|files)$/.test(req.path) ? next() : smallBody(req, res, next)));
api.use((req, _res, next) => (configured || req.path === '/health' ? next() : next(new ApiError(503, 'Konto-Dienst nicht eingerichtet (Konfiguration fehlt).', 'not_configured'))));

api.get('/health', wrap(async (req, res) => {
  if (!configured) return res.status(503).json({ ok: false, error: 'Konto-Dienst nicht eingerichtet (Konfiguration fehlt).', kind: 'not_configured' });
  let u = null; try { u = await currentUser(req); if (u) await refreshSession(req, res); } catch { u = null; }
  res.json({ ok: true, configured: true, google: !!env.GOOGLE_CLIENT_ID, googleClientId: env.GOOGLE_CLIENT_ID || null, mail: mailReady, files: files.ready, bambu: bambu.ready, user: u ? userOut(u) : null });
}));
api.get('/auth/me', wrap(async (req, res) => { const u = await currentUser(req); res.json({ ok: true, user: u ? userOut(u) : null }); }));
api.post('/auth/logout', wrap(async (req, res) => { await clearSession(req, res); res.json({ ok: true }); }));
// ends every session of the account on all devices
api.post('/auth/logout-all', wrap(async (req, res) => { const u = await requireUser(req); await q('DELETE FROM sessions WHERE user_id = ?', [u.id]); res.clearCookie(cookieName(req), cookieOpts(req)); res.json({ ok: true }); }));

api.post('/auth/register', wrap(async (req, res) => {
  const email = str(req.body?.email).trim().toLowerCase(); const pw = str(req.body?.password, 1000);
  await throttle(req, 'reg', 10);
  if (!validEmail(email)) fail(400, 'Bitte eine gültige E-Mail-Adresse angeben.');
  checkNewPassword(pw);
  const exists = async () => !!(await one('SELECT id FROM users WHERE email = ?', [email]));
  const hash = await hashPw(pw); // always computed, so the response time is the same for known and unknown addresses
  if (!mailReady) {
    // no mail available: direct registration (an existing account never gets a password this way)
    if (await exists()) fail(409, 'Für diese E-Mail gibt es schon ein Konto. Bitte anmelden oder „Passwort vergessen“ nutzen.', 'exists');
    const r = await q('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)', [email, hash, email.split('@')[0].slice(0, 120)]);
    await setSession(req, res, r.insertId);
    return res.json({ ok: true, user: userOut(await userById(r.insertId)) });
  }
  // with mail: always the same answer, so nobody learns whether the address has an account. The address gets a confirmation link, or a note that the account exists.
  res.json({ ok: true, pending: true });
  try {
    if (!(await mayMail(email))) return;
    if (await exists()) { await sendMail(email, '3Druckwerkbank: Du hast schon ein Konto', `Hallo,\n\nfür diese Adresse gibt es bereits ein Konto bei 3Druckwerkbank. Melde dich einfach an:\n${BASE_URL}/\n\nPasswort vergessen? Im Konto-Panel gibt es dafür einen Link.\n\nWenn du das nicht warst, ignoriere diese E-Mail.\n`); return; }
    const token = crypto.randomBytes(32).toString('hex');
    await q('DELETE FROM pending WHERE email = ? OR expires_at < NOW()', [email]);
    await q('INSERT INTO pending (token_hash, email, password_hash, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))', [sha256(token), email, hash]);
    await sendMail(email, '3Druckwerkbank: Konto bestätigen', `Hallo,\n\nmit diesem Link bestätigst du deine Adresse und dein Konto ist angelegt (gültig eine Stunde):\n${BASE_URL}/#/konto/bestaetigen/${token}\n\nWenn du das nicht warst, ignoriere diese E-Mail.\n`);
  } catch (e) { console.error('register mail failed:', e?.code ?? e?.name ?? 'error'); }
}));

// the link from the confirmation mail: creates the account (address confirmed) and signs in
api.post('/auth/confirm', wrap(async (req, res) => {
  await throttle(req, 'confirm', 20);
  const token = str(req.body?.token, 200);
  const p = /^[a-f0-9]{64}$/.test(token) ? await one('SELECT email, password_hash FROM pending WHERE token_hash = ? AND expires_at > NOW()', [sha256(token)]) : null;
  if (!p) fail(400, 'Der Link ist ungültig oder abgelaufen. Bitte noch einmal registrieren.');
  await q('DELETE FROM pending WHERE email = ?', [p.email]);
  if (await one('SELECT id FROM users WHERE email = ?', [p.email])) fail(409, 'Für diese E-Mail gibt es schon ein Konto. Bitte anmelden.', 'exists');
  const r = await q('INSERT INTO users (email, password_hash, name, email_verified) VALUES (?, ?, ?, 1)', [p.email, p.password_hash, p.email.split('@')[0].slice(0, 120)]);
  await setSession(req, res, r.insertId);
  res.json({ ok: true, user: userOut(await userById(r.insertId)) });
}));

api.post('/auth/login', wrap(async (req, res) => {
  const email = str(req.body?.email).trim().toLowerCase(); const pw = str(req.body?.password, 1000);
  await throttle(req, 'login', 20);
  // per address only failed attempts count (30 in 15 minutes), separate from password mails, so a few wrong guesses by someone else do not lock the owner out
  const mailKey = keyOf('loginfail', email);
  if (await count(mailKey) >= 30) fail(429, 'Zu viele Versuche. Bitte in einigen Minuten noch einmal.', 'rate');
  const u = await one('SELECT id, password_hash FROM users WHERE email = ?', [email]);
  // always compare a hash, so the response time does not reveal whether the address exists
  const valid = pwBytes(pw) <= 1000 && await bcrypt.compare(pw, u?.password_hash ?? DUMMY_HASH);
  if (!u || !u.password_hash || !valid) { await q('INSERT INTO attempts (ip, at) VALUES (?, NOW())', [mailKey]); fail(401, 'E-Mail oder Passwort stimmen nicht.', 'credentials'); }
  if (needsRehash(u.password_hash) && pwBytes(pw) <= MAX_PW_BYTES) await q('UPDATE users SET password_hash = ? WHERE id = ?', [await hashPw(pw), u.id]);
  await setSession(req, res, u.id);
  res.json({ ok: true, user: userOut(await userById(u.id)) });
}));

api.post('/auth/google', wrap(async (req, res) => {
  await throttle(req, 'google', 20);
  if (!env.GOOGLE_CLIENT_ID) fail(503, 'Google-Anmeldung ist nicht eingerichtet.', 'not_configured');
  let c;
  try { c = (await jwtVerify(str(req.body?.credential, 5000), googleKeys, { issuer: ['https://accounts.google.com', 'accounts.google.com'], audience: env.GOOGLE_CLIENT_ID, algorithms: ['RS256'], clockTolerance: 60 })).payload; }
  catch { fail(401, 'Google-Anmeldung konnte nicht geprüft werden. Bitte noch einmal versuchen.'); }
  if (c.email_verified !== true && c.email_verified !== 'true') fail(401, 'Die Google-E-Mail ist nicht bestätigt.');
  const email = str(c.email).trim().toLowerCase(); const sub = str(String(c.sub ?? ''), 80);
  if (!validEmail(email) || !sub || sub.length > 64) fail(401, 'Google-Anmeldung konnte nicht geprüft werden. Bitte noch einmal versuchen.');
  const name = typeof c.name === 'string' ? c.name.slice(0, 120) : null;
  const pic = typeof c.picture === 'string' && c.picture.length <= 500 && c.picture.startsWith('https://') ? c.picture : null;
  let id; let u = await one('SELECT id FROM users WHERE google_sub = ?', [sub]);
  if (u) { id = u.id; await q('UPDATE users SET name = COALESCE(name, ?), avatar_url = ?, email_verified = 1 WHERE id = ?', [name, pic, id]); }
  else {
    u = await one('SELECT id, google_sub, password_hash, email_verified FROM users WHERE email = ?', [email]);
    if (u && u.google_sub !== null) fail(409, 'Diese E-Mail ist bereits mit einem anderen Google-Konto verknüpft.', 'exists');
    if (u) {
      id = u.id;
      // password on an address that was never confirmed could belong to someone else: remove it, end all sessions, keep the workshop
      if (u.password_hash !== null && Number(u.email_verified) !== 1) { await q('UPDATE users SET password_hash = NULL WHERE id = ?', [id]); await q('DELETE FROM sessions WHERE user_id = ?', [id]); await q('DELETE FROM resets WHERE user_id = ?', [id]); }
      await q('UPDATE users SET google_sub = ?, name = COALESCE(name, ?), avatar_url = ?, email_verified = 1 WHERE id = ?', [sub, name, pic, id]);
    } else { id = (await q('INSERT INTO users (email, google_sub, name, avatar_url, email_verified) VALUES (?, ?, ?, ?, 1)', [email, sub, name ?? email.split('@')[0].slice(0, 120), pic])).insertId; }
  }
  await setSession(req, res, id);
  res.json({ ok: true, user: userOut(await userById(id)) });
}));

api.post('/auth/reset-request', wrap(async (req, res) => {
  const email = str(req.body?.email).trim().toLowerCase();
  await throttle(req, 'resetreq', 10);
  res.json({ ok: true }); // always the same answer, at once; the mail goes out afterwards
  if (!validEmail(email)) return;
  try {
    if (!mailReady || !(await mayMail(email))) return;
    const u = await one('SELECT id FROM users WHERE email = ?', [email]); if (!u) return;
    const token = crypto.randomBytes(32).toString('hex');
    await q('DELETE FROM resets WHERE user_id = ? OR expires_at < NOW()', [u.id]);
    await q('INSERT INTO resets (token_hash, user_id, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))', [sha256(token), u.id]);
    await sendMail(email, '3Druckwerkbank: Passwort zurücksetzen', `Hallo,\n\nüber diesen Link kannst du in der nächsten Stunde ein neues Passwort setzen:\n${BASE_URL}/#/konto/reset/${token}\n\nWenn du das nicht warst, ignoriere diese E-Mail.\n`);
  } catch (e) { console.error('reset mail failed:', e?.code ?? e?.name ?? 'error'); }
}));

api.post('/auth/reset', wrap(async (req, res) => {
  await throttle(req, 'reset', 20);
  const token = str(req.body?.token, 200); const pw = str(req.body?.password, 1000);
  checkNewPassword(pw);
  const r = /^[a-f0-9]{64}$/.test(token) ? await one('SELECT user_id FROM resets WHERE token_hash = ? AND expires_at > NOW()', [sha256(token)]) : null;
  if (!r) fail(400, 'Der Link ist ungültig oder abgelaufen.');
  await q('UPDATE users SET password_hash = ?, email_verified = 1 WHERE id = ?', [await hashPw(pw), r.user_id]);
  await q('DELETE FROM resets WHERE user_id = ?', [r.user_id]);
  await q('DELETE FROM sessions WHERE user_id = ?', [r.user_id]);
  await setSession(req, res, r.user_id);
  res.json({ ok: true, user: userOut(await userById(r.user_id)) });
}));

api.get('/state', wrap(async (req, res) => {
  const u = await requireUser(req);
  const r = await one(`SELECT state, ${TS} AS u FROM werkstatt WHERE user_id = ?`, [u.id]);
  if (!r) return res.json({ ok: true, state: null, updatedAt: null });
  // the stored text is passed through unparsed (it can be 12 MB); a cheap shape check keeps a damaged row from producing a broken answer
  const text = String(r.state).trim(); if (!(text.startsWith('{') && text.endsWith('}'))) fail(500, 'Der gespeicherte Stand ist beschädigt.');
  res.type('json').send(`{"ok":true,"state":${text},"updatedAt":"${iso(r.u)}"}`);
}));
/** Session, size and write limit are checked before a single byte of the (large) body is read. */
const gate = async (req, res, next) => {
  try {
    req.user = await requireUser(req);
    if (Number(req.headers['content-length'] ?? 0) > 13 * 1024 * 1024) fail(413, 'Der Stand ist zu groß (über 12 MB). Bitte große Fotos verkleinern.');
    writeLimit(req.user.id);
  } catch (e) { return next(e); }
  bigBody(req, res, next);
};
const putState = wrap(async (req, res) => {
  const u = req.user;
  const state = req.body?.state;
  checkState(state);
  const json = JSON.stringify(state);
  if (Buffer.byteLength(json) > MAX_STATE_BYTES) fail(413, 'Der Stand ist zu groß (über 12 MB). Bitte große Fotos verkleinern.');
  const force = req.body.force === true; const known = typeof req.body.ifUpdatedAt === 'string' ? req.body.ifUpdatedAt : '';
  // an existing state is only replaced by a caller that knows exactly this state (ifUpdatedAt) or overwrites on purpose (force); check and write under a row lock
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[cur]] = await conn.execute(`SELECT ${TS} AS u FROM werkstatt WHERE user_id = ? FOR UPDATE`, [u.id]);
    if (cur && !force && (known === '' || iso(cur.u) > known)) { await conn.rollback(); fail(409, 'Im Konto liegt ein anderer Stand als auf diesem Gerät.', 'conflict'); }
    await conn.execute('INSERT INTO werkstatt (user_id, state, updated_at) VALUES (?, ?, UTC_TIMESTAMP(3)) ON DUPLICATE KEY UPDATE state = VALUES(state), updated_at = GREATEST(VALUES(updated_at), updated_at + INTERVAL 1000 MICROSECOND)', [u.id, json]);
    const [[now]] = await conn.execute(`SELECT ${TS} AS u FROM werkstatt WHERE user_id = ?`, [u.id]);
    await conn.commit();
    res.json({ ok: true, updatedAt: iso(now.u) });
  } catch (e) { try { await conn.rollback(); } catch { /* already closed */ } throw e; } finally { conn.release(); }
});
api.put('/state', gate, putState); api.post('/state', gate, putState);
const gone = []; // called with the id when a workshop is deleted
const ws = mountWorkshops(api, { q, one, pool, requireUser, fail, wrap, sha256, str, validEmail, throttle, mayMail, sendMail, mailReady: () => mailReady, BASE_URL, bigBody, writeLimit, gone });
const files = mountFiles(api, { q, one, requireUser, fail, wrap, env, here: path.dirname(fileURLToPath(import.meta.url)), access: ws.access, writeLimit });
const bambu = mountBambu(api, { q, one, fail, wrap, str, validEmail, throttle, access: ws.access, tell: ws.tell, env });
gone.push(files.removeWorkshop, bambu.stop);
api.use((_req, _res, next) => next(new ApiError(404, 'Unbekannte Aktion.')));
// errors always as a short JSON answer; details only in the server log
api.use((err, req, res, _next) => {
  if (err instanceof ApiError) return res.status(err.status).json({ ok: false, error: err.message, kind: err.kind });
  if (err?.type === 'entity.too.large') return res.status(413).json({ ok: false, error: req.path.endsWith('/files') ? 'Die Datei ist zu groß (über 25 MB).' : req.path === '/state' || req.path.endsWith('/ops') ? 'Der Stand ist zu groß (über 12 MB). Bitte große Fotos verkleinern.' : 'Die Anfrage ist zu groß.', kind: 'error' });
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ ok: false, error: 'Ungültige Anfrage.', kind: 'error' });
  console.error('api error:', err?.code ?? err?.name ?? 'error'); // no message text: it can contain data
  const db = ['ECONNREFUSED', 'PROTOCOL_CONNECTION_LOST', 'ER_ACCESS_DENIED_ERROR', 'ETIMEDOUT'].includes(err?.code);
  res.status(db ? 503 : 500).json({ ok: false, error: db ? 'Datenbank nicht erreichbar.' : 'Interner Fehler. Bitte später noch einmal versuchen.', kind: db ? 'db' : 'server' });
});
app.use('/api', api);

// ---- the built React app ----
const pub = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
// sw.js is the one script without a hash in its name: never cache it for long, or the CDN keeps handing out an old service worker (the manifest and icons fall under 'no-cache' anyway)
app.use(express.static(pub, { index: false, setHeaders: (res, file) => res.set('Cache-Control', /\.(js|css|avif|webp|woff2?)$/.test(file) && path.basename(file) !== 'sw.js' ? 'public, max-age=31536000, immutable' : 'no-cache') }));
app.get('*', (_req, res) => { const index = path.join(pub, 'index.html'); if (!fs.existsSync(index)) return res.status(404).type('text/plain').send('3Druckwerkbank-Server läuft; die Oberfläche ist noch nicht ausgeliefert.'); res.set('Cache-Control', 'no-cache').sendFile(index); });

const server = http.createServer(app);
if (configured) migrate().then(() => bambu.startAll()).catch((e) => console.error('migrate failed:', e?.code ?? e?.name ?? 'error'));
server.listen(Number(env.PORT) || 3000, () => console.log(`3druckwerkbank server on ${Number(env.PORT) || 3000}, configured=${configured}`));
