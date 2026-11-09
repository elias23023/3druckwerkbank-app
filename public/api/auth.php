<?php
declare(strict_types=1);
require __DIR__ . '/_lib.php';
same_origin();
$a = $_GET['a'] ?? '';
$c = cfg();

if ($a === 'me') { $u = current_user(); ok(['user' => $u ? user_out($u) : null]); }

if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail(405, 'Nur POST.');
$in = body();
$str = fn(string $k, int $max = 300): string => is_string($in[$k] ?? null) ? substr($in[$k], 0, $max) : '';

if ($a === 'logout') { clear_session(); ok(); }

if ($a === 'register') {
  $email = strtolower(trim($str('email'))); $pw = $str('password', 1000);
  throttle($email);
  if (!valid_email($email)) fail(400, 'Bitte eine gültige E-Mail-Adresse angeben.');
  if (strlen($pw) < 8) fail(400, 'Das Passwort braucht mindestens 8 Zeichen.');
  $pdo = db();
  $st = $pdo->prepare('SELECT id FROM users WHERE email = ?'); $st->execute([$email]);
  // Ein bestehendes Konto (auch eines, das bisher nur mit Google genutzt wird) bekommt nie auf diesem Weg ein Passwort.
  if ($st->fetch()) fail(409, 'Für diese E-Mail gibt es schon ein Konto. Bitte anmelden oder „Passwort vergessen“ nutzen.', 'exists');
  $pdo->prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)')->execute([$email, password_hash($pw, PASSWORD_DEFAULT), substr((string) strstr($email, '@', true), 0, 120)]);
  $id = (int) $pdo->lastInsertId();
  set_session($id);
  ok(['user' => user_out(user_by_id($id))]);
}

if ($a === 'login') {
  $email = strtolower(trim($str('email'))); $pw = $str('password', 1000);
  throttle($email);
  $st = db()->prepare('SELECT id, password_hash FROM users WHERE email = ?'); $st->execute([$email]); $u = $st->fetch();
  // auch ohne Treffer einen Hash prüfen, damit die Antwortzeit nicht verrät, ob es die Adresse gibt
  $hash = ($u && $u['password_hash'] !== null) ? $u['password_hash'] : '$2y$10$C1bwEntRdT00MQFHu56SWuSAzrfYreAmq9k1DtY.FKGdnsXSAA6Ai';
  $valid = password_verify($pw, $hash);
  if (!$u || $u['password_hash'] === null || !$valid) fail(401, 'E-Mail oder Passwort stimmen nicht.', 'credentials');
  if (password_needs_rehash($u['password_hash'], PASSWORD_DEFAULT)) db()->prepare('UPDATE users SET password_hash = ? WHERE id = ?')->execute([password_hash($pw, PASSWORD_DEFAULT), $u['id']]);
  set_session((int) $u['id']);
  ok(['user' => user_out(user_by_id((int) $u['id']))]);
}

if ($a === 'google') {
  throttle();
  $clientId = (string) ($c['google_client_id'] ?? '');
  if ($clientId === '') fail(503, 'Google-Anmeldung ist nicht eingerichtet.', 'not_configured');
  $claims = verify_google_id_token($str('credential', 5000), $clientId);
  if (!$claims) fail(401, 'Google-Anmeldung konnte nicht geprüft werden. Bitte noch einmal versuchen.');
  if (($claims['email_verified'] ?? false) !== true && ($claims['email_verified'] ?? '') !== 'true') fail(401, 'Die Google-E-Mail ist nicht bestätigt.');
  $email = strtolower(trim($claims['email'])); $sub = (string) $claims['sub'];
  if (!valid_email($email) || $sub === '' || strlen($sub) > 64) fail(401, 'Google-Anmeldung konnte nicht geprüft werden. Bitte noch einmal versuchen.');
  $name = isset($claims['name']) && is_string($claims['name']) ? substr($claims['name'], 0, 120) : null;
  $pic = isset($claims['picture']) && is_string($claims['picture']) && strlen($claims['picture']) <= 500 && str_starts_with($claims['picture'], 'https://') ? $claims['picture'] : null;
  $pdo = db();
  $st = $pdo->prepare('SELECT id FROM users WHERE google_sub = ?'); $st->execute([$sub]); $u = $st->fetch();
  if ($u) {
    $pdo->prepare('UPDATE users SET name = COALESCE(name, ?), avatar_url = ?, email_verified = 1 WHERE id = ?')->execute([$name, $pic, $u['id']]); $id = (int) $u['id'];
  } else {
    $st = $pdo->prepare('SELECT id, google_sub, password_hash, email_verified FROM users WHERE email = ?'); $st->execute([$email]); $u = $st->fetch();
    if ($u && $u['google_sub'] !== null) fail(409, 'Diese E-Mail ist bereits mit einem anderen Google-Konto verknüpft.', 'exists');
    if ($u) {
      $id = (int) $u['id'];
      // Konto mit Passwort, dessen E-Mail nie bestätigt wurde: Das Passwort könnte von jemand anderem stammen. Es wird entfernt,
      // alle bisherigen Sitzungen enden. Die Werkstatt bleibt; ein neues Passwort gibt es über „Passwort vergessen“.
      if ($u['password_hash'] !== null && (int) $u['email_verified'] !== 1) {
        $pdo->prepare('UPDATE users SET password_hash = NULL WHERE id = ?')->execute([$id]);
        $pdo->prepare('DELETE FROM sessions WHERE user_id = ?')->execute([$id]);
        $pdo->prepare('DELETE FROM resets WHERE user_id = ?')->execute([$id]);
      }
      $pdo->prepare('UPDATE users SET google_sub = ?, name = COALESCE(name, ?), avatar_url = ?, email_verified = 1 WHERE id = ?')->execute([$sub, $name, $pic, $id]);
    } else {
      $pdo->prepare('INSERT INTO users (email, google_sub, name, avatar_url, email_verified) VALUES (?, ?, ?, ?, 1)')->execute([$email, $sub, $name ?? substr((string) strstr($email, '@', true), 0, 120), $pic]); $id = (int) $pdo->lastInsertId();
    }
  }
  set_session($id);
  ok(['user' => user_out(user_by_id($id))]);
}

if ($a === 'reset-request') {
  $email = strtolower(trim($str('email')));
  throttle($email);
  // immer gleich und sofort antworten (verrät nicht, ob die Adresse existiert); die E-Mail geht danach raus
  echo json_encode(['ok' => true]);
  if (function_exists('fastcgi_finish_request')) fastcgi_finish_request(); elseif (function_exists('litespeed_finish_request')) litespeed_finish_request(); else { @ob_flush(); flush(); }
  if (valid_email($email)) {
    $st = db()->prepare('SELECT id FROM users WHERE email = ?'); $st->execute([$email]); $u = $st->fetch();
    if ($u) {
      $token = bin2hex(random_bytes(32));
      db()->prepare('DELETE FROM resets WHERE user_id = ? OR expires_at < NOW()')->execute([$u['id']]);
      db()->prepare('INSERT INTO resets (token_hash, user_id, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))')->execute([hash('sha256', $token), $u['id']]);
      $base = base_url();
      $link = $base . '/#/konto/reset/' . $token;
      $from = (string) ($c['mail_from'] ?? '');
      if (!valid_email($from)) $from = 'no-reply@' . parse_url($base, PHP_URL_HOST);
      @mail($email, '=?UTF-8?B?' . base64_encode('3Druckwerkbank: Passwort zurücksetzen') . '?=', "Hallo,\n\nüber diesen Link kannst du in der nächsten Stunde ein neues Passwort setzen:\n$link\n\nWenn du das nicht warst, ignoriere diese E-Mail.\n", "From: 3Druckwerkbank <$from>\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: 8bit");
    }
  }
  exit;
}

if ($a === 'reset') {
  throttle();
  $token = $str('token', 200); $pw = $str('password', 1000);
  if (strlen($pw) < 8) fail(400, 'Das Passwort braucht mindestens 8 Zeichen.');
  if (!preg_match('/^[a-f0-9]{64}$/', $token)) fail(400, 'Der Link ist ungültig oder abgelaufen.');
  $st = db()->prepare('SELECT user_id FROM resets WHERE token_hash = ? AND expires_at > NOW()'); $st->execute([hash('sha256', $token)]); $r = $st->fetch();
  if (!$r) fail(400, 'Der Link ist ungültig oder abgelaufen.');
  // Wer den Link aus der E-Mail hat, hat die Adresse bestätigt.
  db()->prepare('UPDATE users SET password_hash = ?, email_verified = 1 WHERE id = ?')->execute([password_hash($pw, PASSWORD_DEFAULT), $r['user_id']]);
  db()->prepare('DELETE FROM resets WHERE user_id = ?')->execute([$r['user_id']]);
  db()->prepare('DELETE FROM sessions WHERE user_id = ?')->execute([$r['user_id']]);
  set_session((int) $r['user_id']);
  ok(['user' => user_out(user_by_id((int) $r['user_id']))]);
}

fail(404, 'Unbekannte Aktion.');
