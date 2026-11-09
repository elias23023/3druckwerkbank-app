<?php
declare(strict_types=1);
require __DIR__ . '/_lib.php';
same_origin();
$u = require_user();
$pdo = db();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  $st = $pdo->prepare('SELECT state, DATE_FORMAT(updated_at, "%Y-%m-%dT%H:%i:%s.%fZ") AS updated_at FROM werkstatt WHERE user_id = ?'); $st->execute([$u['id']]); $r = $st->fetch();
  if (!$r) ok(['state' => null, 'updatedAt' => null]);
  ok(['state' => json_decode($r['state'], true), 'updatedAt' => substr($r['updated_at'], 0, 23) . 'Z']);
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT' || $_SERVER['REQUEST_METHOD'] === 'POST') {
  $in = body();
  $state = $in['state'] ?? null;
  if (!is_array($state) || ($state['version'] ?? null) !== 1 || !isset($state['projects'])) fail(400, 'Kein gültiger Werkstatt-Stand.');
  $json = json_encode($state, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  if ($json === false) fail(400, 'Stand lässt sich nicht speichern.');
  if (strlen($json) > 12 * 1024 * 1024) fail(413, 'Der Stand ist zu groß (über 12 MB). Bitte große Fotos verkleinern.');
  // Schutz vor Überschreiben eines neueren Standes von einem anderen Gerät: optionales ifUpdatedAt
  if (!empty($in['ifUpdatedAt'])) {
    $st = $pdo->prepare('SELECT DATE_FORMAT(updated_at, "%Y-%m-%dT%H:%i:%s.%fZ") AS u FROM werkstatt WHERE user_id = ?'); $st->execute([$u['id']]); $r = $st->fetch();
    if ($r && substr($r['u'], 0, 23) . 'Z' > $in['ifUpdatedAt']) fail(409, 'Auf einem anderen Gerät gibt es einen neueren Stand.', 'conflict');
  }
  $pdo->prepare('INSERT INTO werkstatt (user_id, state, updated_at) VALUES (?, ?, UTC_TIMESTAMP(3)) ON DUPLICATE KEY UPDATE state = VALUES(state), updated_at = VALUES(updated_at)')->execute([$u['id'], $json]);
  $st = $pdo->prepare('SELECT DATE_FORMAT(updated_at, "%Y-%m-%dT%H:%i:%s.%fZ") AS u FROM werkstatt WHERE user_id = ?'); $st->execute([$u['id']]); $r = $st->fetch();
  ok(['updatedAt' => substr($r['u'], 0, 23) . 'Z']);
}

fail(405, 'Methode nicht erlaubt.');
