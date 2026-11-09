<?php
declare(strict_types=1);
require __DIR__ . '/_lib.php';
// Ohne Konfiguration: nicht eingerichtet (503 mit kind not_configured). Mit Konfiguration: ob Google aktiv ist und ob jemand angemeldet ist.
$c = cfg();
$u = null;
try { $u = current_user(); } catch (Throwable $e) { $u = null; }
ok(['configured' => true, 'google' => !empty($c['google_client_id']), 'googleClientId' => $c['google_client_id'] ?? null, 'user' => $u ? user_out($u) : null]);
