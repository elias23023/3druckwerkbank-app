<?php
declare(strict_types=1);
require __DIR__ . '/_lib.php';
same_origin();
$a = $_GET['a'] ?? '';
$c = cfg();

if ($a === 'me') { $u = current_user(); ok(['user' => $u ? user_out($u) : null]); }

if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail(405, 'Nur POST.');
$in = body();

if ($a === 'logout') { clear_session(); ok(); }

if ($a === 'register') {
  throttle();
  $email = strtolower(trim((string) ($in['email'] ?? ''))); $pw = (string) ($in['password'] ?? '');
  if (!valid_email($email)) fail(400, 'Bitte eine gültige E-Mail-Adresse angeben.');
  if (strlen($pw) < 8) fail(400, 'Das Passwort braucht mindestens 8 Zeichen.');
  $pdo = db();
  $st = $pdo->prepare('SELECT id, password_hash FROM users WHERE email = ?'); $st->execute([$email]); $ex = $st->fetch();
  if ($ex && $ex['password_hash'] !== null) fail(409, 'Für diese E-Mail gibt es schon ein Konto. Bitte anmelden.', 'exists');
  if ($ex) { $pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?')->execute([password_hash($pw, PASSWORD_DEFAULT), $ex['id']]); $id = (int) $ex['id']; }
  else { $pdo->prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)')->execute([$email, password_hash($pw, PASSWORD_DEFAULT), strstr($email, '@', true)]); $id = (int) $pdo->lastInsertId(); }
  set_session($id);
  ok(['user' => user_out(user_by_id($id))]);
}

if ($a === 'login') {
  throttle();
  $email = strtolower(trim((string) ($in['email'] ?? ''))); $pw = (string) ($in['password'] ?? '');
  $st = db()->prepare('SELECT id, password_hash FROM users WHERE email = ?'); $st->execute([$email]); $u = $st->fetch();
  if (!$u || $u['password_hash'] === null || !password_verify($pw, $u['password_hash'])) fail(401, 'E-Mail oder Passwort stimmen nicht.', 'credentials');
  if (password_needs_rehash($u['password_hash'], PASSWORD_DEFAULT)) db()->prepare('UPDATE users SET password_hash = ? WHERE id = ?')->execute([password_hash($pw, PASSWORD_DEFAULT), $u['id']]);
  set_session((int) $u['id']);
  ok(['user' => user_out(user_by_id((int) $u['id']))]);
}

if ($a === 'google') {
  throttle();
  $clientId = (string) ($c['google_client_id'] ?? '');
  if ($clientId === '') fail(503, 'Google-Anmeldung ist nicht eingerichtet.', 'not_configured');
  $claims = verify_google_id_token((string) ($in['credential'] ?? ''), $clientId);
  if (!$claims) fail(401, 'Google-Anmeldung konnte nicht geprüft werden. Bitte noch einmal versuchen.');
  if (empty($claims['email_verified'])) fail(401, 'Die Google-E-Mail ist nicht bestätigt.');
  $email = strtolower($claims['email']); $sub = (string) $claims['sub'];
  $pdo = db();
  $st = $pdo->prepare('SELECT id FROM users WHERE google_sub = ?'); $st->execute([$sub]); $u = $st->fetch();
  if (!$u) { $st = $pdo->prepare('SELECT id FROM users WHERE email = ?'); $st->execute([$email]); $u = $st->fetch(); }
  if ($u) { $pdo->prepare('UPDATE users SET google_sub = ?, name = COALESCE(name, ?), avatar_url = ? WHERE id = ?')->execute([$sub, $claims['name'] ?? null, $claims['picture'] ?? null, $u['id']]); $id = (int) $u['id']; }
  else { $pdo->prepare('INSERT INTO users (email, google_sub, name, avatar_url) VALUES (?, ?, ?, ?)')->execute([$email, $sub, $claims['name'] ?? strstr($email, '@', true), $claims['picture'] ?? null]); $id = (int) $pdo->lastInsertId(); }
  set_session($id);
  ok(['user' => user_out(user_by_id($id))]);
}

if ($a === 'reset-request') {
  throttle();
  $email = strtolower(trim((string) ($in['email'] ?? '')));
  $st = db()->prepare('SELECT id FROM users WHERE email = ? AND password_hash IS NOT NULL'); $st->execute([$email]); $u = $st->fetch();
  if ($u) {
    $token = bin2hex(random_bytes(32));
    db()->prepare('INSERT INTO resets (token_hash, user_id, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))')->execute([hash('sha256', $token), $u['id']]);
    $link = 'https://' . ($_SERVER['HTTP_HOST'] ?? '3druckwerkbank.com') . '/#/konto/reset/' . $token;
    $from = $c['mail_from'] ?? ('no-reply@' . ($_SERVER['HTTP_HOST'] ?? '3druckwerkbank.com'));
    @mail($email, '3Druckwerkbank: Passwort zurücksetzen', "Hallo,\n\nüber diesen Link kannst du in der nächsten Stunde ein neues Passwort setzen:\n$link\n\nWenn du das nicht warst, ignoriere diese E-Mail.\n", "From: $from\r\nContent-Type: text/plain; charset=utf-8");
  }
  ok(); // immer gleich antworten, verrät nicht, ob die Adresse existiert
}

if ($a === 'reset') {
  throttle();
  $token = (string) ($in['token'] ?? ''); $pw = (string) ($in['password'] ?? '');
  if (strlen($pw) < 8) fail(400, 'Das Passwort braucht mindestens 8 Zeichen.');
  $st = db()->prepare('SELECT user_id FROM resets WHERE token_hash = ? AND expires_at > NOW()'); $st->execute([hash('sha256', $token)]); $r = $st->fetch();
  if (!$r) fail(400, 'Der Link ist ungültig oder abgelaufen.');
  db()->prepare('UPDATE users SET password_hash = ? WHERE id = ?')->execute([password_hash($pw, PASSWORD_DEFAULT), $r['user_id']]);
  db()->prepare('DELETE FROM resets WHERE user_id = ?')->execute([$r['user_id']]);
  db()->prepare('DELETE FROM sessions WHERE user_id = ?')->execute([$r['user_id']]);
  set_session((int) $r['user_id']);
  ok(['user' => user_out(user_by_id((int) $r['user_id']))]);
}

fail(404, 'Unbekannte Aktion.');
