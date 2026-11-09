<?php
/**
 * 3Druckwerkbank – kleine PHP-Schicht für Konto und Synchronisation auf Hostinger (MySQL auf demselben Server).
 * Konfiguration liegt außerhalb von public_html: ../../werkbank-private/config.php (db_name, db_user, db_pass, app_secret, google_client_id).
 * Tabellen werden beim ersten Aufruf angelegt. Jede Nutzerin hat genau eine Zeile in `werkstatt` mit dem ganzen Stand als JSON.
 */
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function cfg(): array {
  static $c = null;
  if ($c !== null) return $c;
  $path = dirname(__DIR__, 2) . '/werkbank-private/config.php';
  if (!is_file($path)) fail(503, 'Konto-Dienst nicht eingerichtet (Konfiguration fehlt).', 'not_configured');
  $c = require $path;
  return $c;
}

function fail(int $code, string $msg, string $kind = 'error'): never {
  http_response_code($code);
  echo json_encode(['ok' => false, 'error' => $msg, 'kind' => $kind], JSON_UNESCAPED_UNICODE);
  exit;
}
function ok(array $data = []): never { echo json_encode(['ok' => true] + $data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit; }

function body(): array {
  $raw = file_get_contents('php://input') ?: '';
  if ($raw === '') return [];
  $j = json_decode($raw, true);
  if (!is_array($j)) fail(400, 'Ungültige Anfrage.');
  return $j;
}

/** Nur Aufrufe von der eigenen Seite (Schutz gegen Cross-Site-Requests zusätzlich zu SameSite-Cookies). */
function same_origin(): void {
  $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
  if ($origin === '') return; // gleiche Quelle ohne Origin-Header (z. B. GET) ist in Ordnung
  $host = $_SERVER['HTTP_HOST'] ?? '';
  $o = parse_url($origin, PHP_URL_HOST) ?: '';
  if (strcasecmp($o, $host) !== 0 && !in_array($o, ['localhost', '127.0.0.1'], true)) fail(403, 'Falsche Herkunft.');
}

function db(): PDO {
  static $pdo = null;
  if ($pdo) return $pdo;
  $c = cfg();
  try {
    $pdo = new PDO('mysql:host=127.0.0.1;port=3306;dbname=' . $c['db_name'] . ';charset=utf8mb4', $c['db_user'], $c['db_pass'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
  } catch (Throwable $e) { fail(503, 'Datenbank nicht erreichbar.', 'db'); }
  $pdo->exec("CREATE TABLE IF NOT EXISTS users (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(190) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NULL,
      google_sub VARCHAR(64) NULL UNIQUE,
      name VARCHAR(120) NULL,
      avatar_url VARCHAR(500) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_login_at DATETIME NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  $pdo->exec("CREATE TABLE IF NOT EXISTS sessions (
      token_hash CHAR(64) PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      INDEX (user_id), INDEX (expires_at),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  $pdo->exec("CREATE TABLE IF NOT EXISTS werkstatt (
      user_id INT UNSIGNED PRIMARY KEY,
      state LONGTEXT NOT NULL,
      updated_at DATETIME(3) NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  $pdo->exec("CREATE TABLE IF NOT EXISTS resets (
      token_hash CHAR(64) PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      expires_at DATETIME NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  $pdo->exec("CREATE TABLE IF NOT EXISTS attempts (
      ip VARBINARY(45) NOT NULL,
      at DATETIME NOT NULL,
      INDEX (ip, at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  return $pdo;
}

const COOKIE = 'wb_session';
const SESSION_DAYS = 60;

function client_ip(): string { return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'; }

/** Einfache Bremse: höchstens 20 Versuche je IP in 15 Minuten für Anmeldung/Registrierung. */
function throttle(): void {
  $pdo = db(); $ip = client_ip();
  $pdo->prepare('DELETE FROM attempts WHERE at < (NOW() - INTERVAL 15 MINUTE)')->execute();
  $n = (int) $pdo->prepare('SELECT COUNT(*) FROM attempts WHERE ip = ?')->execute([$ip]) ?: 0;
  $st = $pdo->prepare('SELECT COUNT(*) AS n FROM attempts WHERE ip = ?'); $st->execute([$ip]); $n = (int) $st->fetch()['n'];
  if ($n >= 20) fail(429, 'Zu viele Versuche. Bitte in einigen Minuten noch einmal.', 'rate');
  $pdo->prepare('INSERT INTO attempts (ip, at) VALUES (?, NOW())')->execute([$ip]);
}

function set_session(int $userId): void {
  $token = bin2hex(random_bytes(32));
  $pdo = db();
  $pdo->prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))')->execute([hash('sha256', $token), $userId, SESSION_DAYS]);
  $pdo->prepare('DELETE FROM sessions WHERE expires_at < NOW()')->execute();
  $pdo->prepare('UPDATE users SET last_login_at = NOW() WHERE id = ?')->execute([$userId]);
  $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
  setcookie(COOKIE, $token, ['expires' => time() + SESSION_DAYS * 86400, 'path' => '/', 'secure' => $secure, 'httponly' => true, 'samesite' => 'Lax']);
}

function clear_session(): void {
  $t = $_COOKIE[COOKIE] ?? '';
  if ($t !== '') db()->prepare('DELETE FROM sessions WHERE token_hash = ?')->execute([hash('sha256', $t)]);
  setcookie(COOKIE, '', ['expires' => time() - 3600, 'path' => '/', 'httponly' => true, 'samesite' => 'Lax']);
}

function current_user(): ?array {
  $t = $_COOKIE[COOKIE] ?? '';
  if ($t === '' || strlen($t) !== 64) return null;
  $st = db()->prepare('SELECT u.id, u.email, u.name, u.avatar_url, (u.google_sub IS NOT NULL) AS via_google FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > NOW()');
  $st->execute([hash('sha256', $t)]);
  $u = $st->fetch();
  return $u ?: null;
}

function user_by_id(int $id): array {
  $st = db()->prepare('SELECT id, email, name, avatar_url, (google_sub IS NOT NULL) AS via_google FROM users WHERE id = ?'); $st->execute([$id]); $u = $st->fetch();
  if (!$u) fail(500, 'Nutzer nicht gefunden.');
  return $u;
}

function require_user(): array { $u = current_user(); if (!$u) fail(401, 'Nicht angemeldet.', 'auth'); return $u; }

function user_out(array $u): array {
  return ['id' => (int) $u['id'], 'email' => $u['email'], 'name' => $u['name'], 'avatar' => $u['avatar_url'], 'provider' => ((int) ($u['via_google'] ?? 0)) ? 'google' : 'email'];
}

/** Google-ID-Token (JWT, RS256) gegen Googles aktuelle Schlüssel prüfen. Liefert die Claims oder null. */
function verify_google_id_token(string $jwt, string $clientId): ?array {
  $parts = explode('.', $jwt);
  if (count($parts) !== 3) return null;
  [$h64, $p64, $s64] = $parts;
  $b64 = fn(string $s) => base64_decode(strtr($s, '-_', '+/') . str_repeat('=', (4 - strlen($s) % 4) % 4), true);
  $header = json_decode($b64($h64) ?: '', true); $claims = json_decode($b64($p64) ?: '', true); $sig = $b64($s64);
  if (!is_array($header) || !is_array($claims) || $sig === false || ($header['alg'] ?? '') !== 'RS256') return null;
  $certs = google_certs(); $kid = $header['kid'] ?? '';
  $key = $certs[$kid] ?? null;
  if (!$key) { $certs = google_certs(true); $key = $certs[$kid] ?? null; }
  if (!$key) return null;
  $pub = openssl_pkey_get_public($key);
  if (!$pub || openssl_verify("$h64.$p64", $sig, $pub, OPENSSL_ALGO_SHA256) !== 1) return null;
  if (!in_array($claims['iss'] ?? '', ['https://accounts.google.com', 'accounts.google.com'], true)) return null;
  if (($claims['aud'] ?? '') !== $clientId) return null;
  if ((int) ($claims['exp'] ?? 0) < time() - 60) return null;
  if (empty($claims['email']) || empty($claims['sub'])) return null;
  return $claims;
}

/** Googles Zertifikate (PEM je kid), 6 h zwischengespeichert in einer Datei neben der Konfiguration. */
function google_certs(bool $force = false): array {
  $cache = dirname(__DIR__, 2) . '/werkbank-private/google-certs.json';
  if (!$force && is_file($cache) && filemtime($cache) > time() - 6 * 3600) { $j = json_decode((string) file_get_contents($cache), true); if (is_array($j)) return $j; }
  $ctx = stream_context_create(['http' => ['timeout' => 6]]);
  $raw = @file_get_contents('https://www.googleapis.com/oauth2/v1/certs', false, $ctx);
  $j = json_decode((string) $raw, true);
  if (!is_array($j)) return is_file($cache) ? (json_decode((string) file_get_contents($cache), true) ?: []) : [];
  @file_put_contents($cache, json_encode($j));
  return $j;
}

function valid_email(string $e): bool { return filter_var($e, FILTER_VALIDATE_EMAIL) !== false && strlen($e) <= 190; }
