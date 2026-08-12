<?php
/* ═══════════════════════════════════════════════════════════════════════════
   MADEX WAVIES — core library
   Database, schema, auth, helpers. Never edited by hand.
   ═══════════════════════════════════════════════════════════════════════════ */
declare(strict_types=1);
date_default_timezone_set('Asia/Dubai');

const DEFAULT_PASSWORD = '00711';

function cfg(): array {
  $f = __DIR__ . '/config.php';
  if (!file_exists($f)) json_out(['error' => 'Not installed yet — open /install.php'], 503);
  return require $f;
}

function db(): PDO {
  static $pdo = null;
  if ($pdo) return $pdo;
  $c = cfg();
  try {
    $pdo = new PDO(
      "mysql:host={$c['host']};dbname={$c['name']};charset=utf8mb4",
      $c['user'], $c['pass'],
      [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
       PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
       PDO::ATTR_EMULATE_PREPARES => false]
    );
  } catch (Throwable $e) {
    json_out(['error' => 'Database connection failed. Check /install.php settings.'], 500);
  }
  return $pdo;
}

function q(string $sql, array $args = []): PDOStatement {
  $st = db()->prepare($sql); $st->execute($args); return $st;
}
function all(string $sql, array $args = []): array { return q($sql, $args)->fetchAll(); }
function one(string $sql, array $args = []): ?array { $r = q($sql, $args)->fetch(); return $r ?: null; }

function json_out($data, int $code = 200): void {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  header('X-Content-Type-Options: nosniff');
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
  exit;
}

function param(string $k, $default = null) {
  static $body = null;
  if ($body === null) {
    $body = [];
    $raw = file_get_contents('php://input');
    if ($raw) { $j = json_decode($raw, true); if (is_array($j)) $body = $j; }
  }
  if (isset($_GET[$k]))  return $_GET[$k];
  if (isset($_POST[$k])) return $_POST[$k];
  if (isset($body[$k]))  return $body[$k];
  return $default;
}

function hash_pw(string $p): string { return password_hash($p, PASSWORD_DEFAULT); }
function check_pw(string $p, string $h): bool { return password_verify($p, $h); }

/* ── schema ───────────────────────────────────────────────────────────── */
function create_schema(PDO $pdo): void {
  $t = [
"CREATE TABLE IF NOT EXISTS users (
  username VARCHAR(64) PRIMARY KEY,
  pass_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','owner') NOT NULL DEFAULT 'owner',
  chain_id VARCHAR(48) NOT NULL DEFAULT '',
  name VARCHAR(120) DEFAULT '',
  active TINYINT(1) NOT NULL DEFAULT 1,
  created DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

"CREATE TABLE IF NOT EXISTS tenants (
  chain_id VARCHAR(48) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  status ENUM('live','paused') NOT NULL DEFAULT 'live',
  plan VARCHAR(48) DEFAULT '', fee DECIMAL(10,2) DEFAULT 0,
  expiry DATE NULL, owner_name VARCHAR(120) DEFAULT '',
  owner_phone VARCHAR(32) DEFAULT '', notes TEXT,
  brand VARCHAR(16) DEFAULT '', brand2 VARCHAR(16) DEFAULT '', glow VARCHAR(16) DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

"CREATE TABLE IF NOT EXISTS branches (
  chain_id VARCHAR(48) NOT NULL, branch_id VARCHAR(48) NOT NULL,
  name VARCHAR(160) NOT NULL, wa VARCHAR(24) DEFAULT '',
  hours VARCHAR(80) DEFAULT '', active TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (chain_id, branch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

"CREATE TABLE IF NOT EXISTS categories (
  chain_id VARCHAR(48) NOT NULL, cat_id VARCHAR(48) NOT NULL,
  title VARCHAR(120) NOT NULL, title_ar VARCHAR(120) DEFAULT '',
  icon VARCHAR(16) DEFAULT '', dayparts VARCHAR(80) DEFAULT 'morning,noon,evening,night',
  sort INT DEFAULT 0, active TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (chain_id, cat_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

"CREATE TABLE IF NOT EXISTS items (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  chain_id VARCHAR(48) NOT NULL, cat_id VARCHAR(48) NOT NULL,
  name VARCHAR(160) NOT NULL, name_ar VARCHAR(160) DEFAULT '',
  price DECIMAL(10,2) NOT NULL DEFAULT 0, photo VARCHAR(300) DEFAULT '',
  popular TINYINT(1) NOT NULL DEFAULT 0, available TINYINT(1) NOT NULL DEFAULT 1,
  sort INT DEFAULT 0,
  UNIQUE KEY uniq_item (chain_id, name),
  INDEX idx_cat (chain_id, cat_id, sort)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

"CREATE TABLE IF NOT EXISTS overrides (
  chain_id VARCHAR(48) NOT NULL, item VARCHAR(160) NOT NULL,
  field VARCHAR(24) NOT NULL, value VARCHAR(500) DEFAULT '',
  updated DATETIME NOT NULL,
  PRIMARY KEY (chain_id, item, field)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

"CREATE TABLE IF NOT EXISTS offers (
  chain_id VARCHAR(48) NOT NULL, code VARCHAR(40) NOT NULL,
  type ENUM('pct','flat') NOT NULL DEFAULT 'pct',
  value DECIMAL(10,2) NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1, expiry DATE NULL,
  note VARCHAR(200) DEFAULT '',
  PRIMARY KEY (chain_id, code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

"CREATE TABLE IF NOT EXISTS rewards (
  chain_id VARCHAR(48) NOT NULL, min_spend DECIMAL(10,2) NOT NULL,
  item VARCHAR(160) NOT NULL, deal_price DECIMAL(10,2) NOT NULL,
  label VARCHAR(200) DEFAULT '', active TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (chain_id, min_spend)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

"CREATE TABLE IF NOT EXISTS orders (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  ts DATETIME NOT NULL, chain_id VARCHAR(48) NOT NULL,
  branch VARCHAR(160) DEFAULT '', zone VARCHAR(80) DEFAULT '',
  daypart VARCHAR(16) DEFAULT '', customer VARCHAR(120) DEFAULT '',
  phone VARCHAR(32) DEFAULT '', address VARCHAR(255) DEFAULT '',
  otype VARCHAR(24) DEFAULT '', items TEXT,
  subtotal DECIMAL(10,2) DEFAULT 0, promo VARCHAR(40) DEFAULT '',
  discount DECIMAL(10,2) DEFAULT 0, total DECIMAL(10,2) DEFAULT 0,
  payment VARCHAR(40) DEFAULT '', dtime VARCHAR(40) DEFAULT '',
  notes VARCHAR(500) DEFAULT '', up_shown VARCHAR(400) DEFAULT '',
  up_taken VARCHAR(400) DEFAULT '', up_rev DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(24) DEFAULT 'New',
  INDEX idx_chain_ts (chain_id, ts), INDEX idx_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

"CREATE TABLE IF NOT EXISTS errors (
  id BIGINT AUTO_INCREMENT PRIMARY KEY, ts DATETIME NOT NULL,
  source VARCHAR(60) DEFAULT '', chain_id VARCHAR(48) DEFAULT '',
  branch VARCHAR(160) DEFAULT '', message VARCHAR(400) DEFAULT '',
  detail TEXT, agent VARCHAR(200) DEFAULT '', notified VARCHAR(16) DEFAULT 'no'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

"CREATE TABLE IF NOT EXISTS audit (
  id BIGINT AUTO_INCREMENT PRIMARY KEY, ts DATETIME NOT NULL,
  username VARCHAR(64) DEFAULT '', role VARCHAR(16) DEFAULT '',
  action VARCHAR(60) DEFAULT '', detail VARCHAR(400) DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

"CREATE TABLE IF NOT EXISTS sessions (
  token CHAR(64) PRIMARY KEY, username VARCHAR(64) NOT NULL,
  role VARCHAR(16) NOT NULL, chain_id VARCHAR(48) DEFAULT '',
  expires DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
  ];
  foreach ($t as $sql) $pdo->exec($sql);
}

/* ── auth ─────────────────────────────────────────────────────────────── */
function current_user(): ?array {
  $tok = (string) param('token', '');
  if ($tok === '') return null;
  $s = one("SELECT * FROM sessions WHERE token=? AND expires > NOW()", [$tok]);
  if (!$s) return null;
  $u = one("SELECT username, role, chain_id, name, active FROM users WHERE username=?",
           [$s['username']]);
  if (!$u || !(int)$u['active']) return null;
  return ['username'=>$u['username'],'role'=>$u['role'],
          'chainId'=>$u['chain_id'],'name'=>$u['name']];
}
function require_user(): array {
  $u = current_user();
  if (!$u) json_out(['error' => 'Session expired — please log in again'], 401);
  return $u;
}
/** ADMIN IS GOD — true for every restaurant. Owner: only their own. */
function scope_ok(array $u, ?string $chain): bool {
  if ($u['role'] === 'admin') return true;
  return $chain !== null && (string)$u['chainId'] === (string)$chain;
}
function require_admin(array $u): void {
  if ($u['role'] !== 'admin') json_out(['error' => 'Admin only'], 403);
}
function require_scope(array $u, ?string $chain): void {
  if (!scope_ok($u, $chain)) json_out(['error' => 'Not your restaurant'], 403);
}

function audit(array $u, string $action, string $detail = ''): void {
  q("INSERT INTO audit (ts,username,role,action,detail) VALUES (NOW(),?,?,?,?)",
    [$u['username'], $u['role'], $action, mb_substr($detail, 0, 400)]);
}

/* ── error inbox + email alert ────────────────────────────────────────── */
function record_error(string $src, ?string $chain, ?string $branch,
                      string $msg, string $detail = '', string $agent = ''): string {
  try {
    $dup = one("SELECT id FROM errors WHERE message=? AND source=?
                AND ts > (NOW() - INTERVAL 30 MINUTE) LIMIT 1", [$msg, $src]);
    $notified = 'no';
    if (!$dup) {
      $c = cfg();
      $to = $c['admin_email'] ?? '';
      if ($to) {
        $body = "An error was reported in the Madex Wavies system.\n\n"
              . "WHERE : $src\n"
              . "SHOP  : " . ($chain ?: '—') . "\n"
              . "BRANCH: " . ($branch ?: '—') . "\n"
              . "WHEN  : " . date('Y-m-d H:i:s') . " (Dubai)\n\n"
              . "WHAT WENT WRONG\n$msg\n\n"
              . "DETAIL\n" . ($detail ?: '—') . "\n\n"
              . "DEVICE\n" . ($agent ?: '—') . "\n\n"
              . "— open the portal ▸ Errors tab for the full list.";
        $subject = '⚠️ Madex Wavies error — ' . ($chain ?: 'system') . ($branch ? " / $branch" : '');
        $headers = 'From: Madex Wavies <no-reply@' . ($_SERVER['HTTP_HOST'] ?? 'localhost') . ">\r\n"
                 . "Content-Type: text/plain; charset=utf-8\r\n";
        $notified = @mail($to, $subject, $body, $headers) ? 'yes' : 'mail-failed';
      }
    }
    q("INSERT INTO errors (ts,source,chain_id,branch,message,detail,agent,notified)
       VALUES (NOW(),?,?,?,?,?,?,?)",
      [$src, $chain ?: '', $branch ?: '', mb_substr($msg,0,400),
       mb_substr($detail,0,2000), mb_substr($agent,0,200), $notified]);
    return $notified;
  } catch (Throwable $e) { return 'log-failed'; }
}

/* ── seed data for a fresh install ───────────────────────────────────── */
function seed(PDO $pdo, string $adminUser, string $adminPass): void {
  q("INSERT IGNORE INTO users (username,pass_hash,role,chain_id,name,active,created)
     VALUES (?,?,'admin','*','Madex Wavies',1,NOW())", [$adminUser, hash_pw($adminPass)]);

  $tenants = [
    ['mashad','Mashad Restaurant','#A03818','#D9772F','#FFB547'],
    ['teajunction','Tea Junction Cafe','#15594C','#2E9B80','#7BE3C0'],
  ];
  foreach ($tenants as $t)
    q("INSERT IGNORE INTO tenants (chain_id,name,status,plan,fee,brand,brand2,glow)
       VALUES (?,?,'live','trial',149,?,?,?)", $t);

  $branches = [
    ['mashad','alqusais','Al Qusais 2 — Al Nahda St (Main)','97143342848','11:00 AM – 12:00 AM'],
    ['mashad','horalanz','Hor Al Anz East — Abu Hail','97142690722','6:00 AM – 12:30 AM'],
    ['mashad','dohard','Al Qusais Ind. 1 — Doha Road','97142587733','6:00 AM – 11:30 PM'],
    ['mashad','burdubai','Bur Dubai — Rafa Road','97143939006','7:00 AM – 12:00 AM'],
    ['teajunction','alnahda','Al Nahda 2 — Bori Bldg, 7A St','971552102535','Open 24 Hours'],
    ['teajunction','burdubai','Bur Dubai — Oud Metha (Shisha)','97143576677','9:00 AM – 3:00 AM'],
    ['teajunction','festival','Dubai Festival City Mall','971552102535','10:00 AM – 12:00 AM'],
    ['teajunction','altwar','Al Twar','971552102535','Daily'],
  ];
  foreach ($branches as $b)
    q("INSERT IGNORE INTO branches (chain_id,branch_id,name,wa,hours,active)
       VALUES (?,?,?,?,?,1)", $b);

  $rewards = [
    ['mashad',40,'Fresh Juice',5,'Spend AED 40 → any juice for AED 5'],
    ['mashad',70,'Strawberry Falooda',7,'Spend AED 70 → falooda for AED 7'],
    ['mashad',110,'Tandoor Mix Platter',35,'Spend AED 110 → mix platter AED 10 off'],
    ['teajunction',40,'Mint Mojito',5,'Spend AED 40 → any mojito for AED 5'],
    ['teajunction',70,'Special Falooda',7,'Spend AED 70 → falooda for AED 7'],
    ['teajunction',110,'Burj Al Arab Club',15,'Spend AED 110 → Burj Club AED 7 off'],
  ];
  foreach ($rewards as $r)
    q("INSERT IGNORE INTO rewards (chain_id,min_spend,item,deal_price,label,active)
       VALUES (?,?,?,?,?,1)", $r);

  foreach (['mashad','teajunction'] as $c)
    q("INSERT IGNORE INTO offers (chain_id,code,type,value,active,note)
       VALUES (?,'MADEX10','pct',10,1,'10% off food')", [$c]);

  seed_menu($pdo);
}

/** Load the full menu into MySQL from menu-seed.json (first install only). */
function seed_menu(PDO $pdo): void {
  $f = dirname(__DIR__) . '/menu-seed.json';
  if (!file_exists($f)) return;
  if ((int) one("SELECT COUNT(*) n FROM items")['n'] > 0) return;   // already seeded
  $seed = json_decode((string) file_get_contents($f), true);
  if (!is_array($seed)) return;
  foreach ($seed as $chain => $cats) {
    foreach ($cats as $c) {
      q("INSERT IGNORE INTO categories (chain_id,cat_id,title,title_ar,icon,dayparts,sort,active)
         VALUES (?,?,?,?,?,?,?,1)",
        [$chain, $c['id'], $c['title'], $c['ar'] ?? '', $c['icon'] ?? '',
         implode(',', $c['dayparts'] ?? []), $c['sort'] ?? 0]);
      foreach (($c['items'] ?? []) as $it) {
        q("INSERT IGNORE INTO items
           (chain_id,cat_id,name,name_ar,price,photo,popular,available,sort)
           VALUES (?,?,?,?,?,?,?,1,?)",
          [$chain, $c['id'], $it['name'], $it['ar'] ?? '', (float)($it['price'] ?? 0),
           $it['photo'] ?? '', (int)($it['popular'] ?? 0), (int)($it['sort'] ?? 0)]);
      }
    }
  }
}
