<?php
declare(strict_types=1);
require __DIR__ . '/_lib.php';
same_origin();
$u = require_user();
$pdo = db();
const TS = "DATE_FORMAT(updated_at, '%Y-%m-%dT%H:%i:%s.%f')";
$iso = fn(string $t): string => substr($t, 0, 23) . 'Z';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  $st = $pdo->prepare('SELECT state, ' . TS . ' AS u FROM werkstatt WHERE user_id = ?'); $st->execute([$u['id']]); $r = $st->fetch();
  if (!$r) ok(['state' => null, 'updatedAt' => null]);
  ok(['state' => json_decode($r['state'], true), 'updatedAt' => $iso($r['u'])]);
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT' || $_SERVER['REQUEST_METHOD'] === 'POST') {
  $in = body();
  $state = $in['state'] ?? null;
  if (!is_array($state) || ($state['version'] ?? null) !== 1 || !is_array($state['projects'] ?? null)) fail(400, 'Kein gültiger Werkstatt-Stand.');
  $json = json_encode($state, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  if ($json === false) fail(400, 'Stand lässt sich nicht speichern.');
  if (strlen($json) > 12 * 1024 * 1024) fail(413, 'Der Stand ist zu groß (über 12 MB). Bitte große Fotos verkleinern.');
  $force = ($in['force'] ?? false) === true;
  $known = is_string($in['ifUpdatedAt'] ?? null) ? $in['ifUpdatedAt'] : '';
  // Schutz vor Überschreiben: Gibt es schon einen Stand, muss der Aufrufer genau diesen kennen (ifUpdatedAt) oder ausdrücklich
  // überschreiben wollen (force). Prüfen und Schreiben laufen in einer Transaktion mit Zeilensperre.
  $pdo->beginTransaction();
  try {
    $st = $pdo->prepare('SELECT ' . TS . ' AS u FROM werkstatt WHERE user_id = ? FOR UPDATE'); $st->execute([$u['id']]); $r = $st->fetch();
    if ($r && !$force && ($known === '' || $iso($r['u']) > $known)) { $pdo->rollBack(); fail(409, 'Im Konto liegt ein anderer Stand als auf diesem Gerät.', 'conflict'); }
    $pdo->prepare('INSERT INTO werkstatt (user_id, state, updated_at) VALUES (?, ?, UTC_TIMESTAMP(3)) ON DUPLICATE KEY UPDATE state = VALUES(state), updated_at = GREATEST(VALUES(updated_at), updated_at + INTERVAL 1000 MICROSECOND)')->execute([$u['id'], $json]);
    $st = $pdo->prepare('SELECT ' . TS . ' AS u FROM werkstatt WHERE user_id = ?'); $st->execute([$u['id']]); $r = $st->fetch();
    $pdo->commit();
  } catch (Throwable $e) { if ($pdo->inTransaction()) $pdo->rollBack(); throw $e; }
  ok(['updatedAt' => $iso($r['u'])]);
}

fail(405, 'Methode nicht erlaubt.');
