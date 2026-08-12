<?php
/* ═══════════════════════════════════════════════════════════════════════════
   MADEX WAVIES — API
   One endpoint for everything: orders, config, portal, admin.
   Same origin as the pages, so no CORS and no JSONP.
   ═══════════════════════════════════════════════════════════════════════════ */
require __DIR__ . '/lib.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code(204); exit; }

$action = (string) param('action', '');
$chain  = param('chain');
$chain  = $chain === null ? null : (string) $chain;

try {
switch ($action) {

/* ═════════ PUBLIC — order pages ═════════ */

case 'config': {
  $t = one("SELECT * FROM tenants WHERE chain_id=?", [$chain]);
  if (!$t) json_out(['status' => 'unknown']);
  json_out([
    'status' => $t['status'],
    'name'   => $t['name'],
    'brand'  => $t['brand'], 'brand2' => $t['brand2'], 'glow' => $t['glow'],
    'branches' => array_map(fn($b) => [
        'id'=>$b['branch_id'],'name'=>$b['name'],'wa'=>$b['wa'],
        'hours'=>$b['hours'],'active'=>(bool)(int)$b['active']],
      all("SELECT * FROM branches WHERE chain_id=? ORDER BY branch_id", [$chain])),
    'offers' => array_map(fn($o) => [
        'code'=>$o['code'],'type'=>$o['type'],'value'=>(float)$o['value'],'note'=>$o['note']],
      all("SELECT * FROM offers WHERE chain_id=? AND active=1
           AND (expiry IS NULL OR expiry >= CURDATE())", [$chain])),
    'rewards' => array_map(fn($r) => [
        'minSpend'=>(float)$r['min_spend'],'item'=>$r['item'],
        'dealPrice'=>(float)$r['deal_price'],'label'=>$r['label']],
      all("SELECT * FROM rewards WHERE chain_id=? AND active=1 ORDER BY min_spend", [$chain])),
    'overrides' => array_map(fn($o) => [
        'item'=>$o['item'],'field'=>$o['field'],'value'=>$o['value']],
      all("SELECT * FROM overrides WHERE chain_id=?", [$chain])),
    'menu' => build_menu($chain),
  ]);
}

case 'order': {                       /* the customer page posts here */
  if (!$chain) json_out(['error' => 'Missing restaurant'], 400);
  $t = one("SELECT status FROM tenants WHERE chain_id=?", [$chain]);
  if (!$t) json_out(['error' => 'Unknown restaurant'], 404);
  if ($t['status'] !== 'live') json_out(['error' => 'Ordering is paused'], 423);

  q("INSERT INTO orders
     (ts,chain_id,branch,zone,daypart,customer,phone,address,otype,items,
      subtotal,promo,discount,total,payment,dtime,notes,up_shown,up_taken,up_rev,status)
     VALUES (NOW(),?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'New')", [
    $chain,
    (string)param('branch',''),   (string)param('zone',''),
    (string)param('daypart',''),  (string)param('name',''),
    (string)param('phone',''),    (string)param('address',''),
    (string)param('orderType',''),(string)param('items',''),
    (float) param('subtotal',0),  (string)param('promoCode',''),
    (float) param('discount',0),  (float) param('total',0),
    (string)param('payment',''),  (string)param('deliveryTime',''),
    (string)param('notes',''),    (string)param('upsellShown',''),
    (string)param('upsellTaken',''), (float)param('upsellRevenue',0),
  ]);
  json_out(['ok' => true, 'id' => (int) db()->lastInsertId()]);
}

case 'logError': {
  $n = record_error((string)param('source','unknown'), $chain, (string)param('branch',''),
        mb_substr((string)param('message',''),0,400),
        mb_substr((string)param('detail',''),0,2000),
        mb_substr((string)param('agent',''),0,200));
  json_out(['ok' => true, 'notified' => $n]);
}

case 'login': {
  $u = one("SELECT * FROM users WHERE LOWER(username)=LOWER(?)", [(string)param('username','')]);
  if (!$u || !(int)$u['active'] || !check_pw((string)param('password',''), $u['pass_hash']))
    json_out(['error' => 'Invalid login'], 401);
  $tok = bin2hex(random_bytes(32));
  q("INSERT INTO sessions (token,username,role,chain_id,expires)
     VALUES (?,?,?,?, NOW() + INTERVAL 12 HOUR)",
    [$tok, $u['username'], $u['role'], $u['chain_id']]);
  audit(['username'=>$u['username'],'role'=>$u['role']], 'login');
  json_out(['token'=>$tok,'role'=>$u['role'],'chainId'=>$u['chain_id'],
            'name'=>$u['name'],'username'=>$u['username']]);
}
}

/* ═════════ EVERYTHING BELOW NEEDS A SESSION ═════════ */
$me = require_user();

switch ($action) {

case 'me':
case 'tenants': {
  $rows = $me['role'] === 'admin'
    ? all("SELECT * FROM tenants ORDER BY name")
    : all("SELECT * FROM tenants WHERE chain_id=?", [$me['chainId']]);
  $tenants = array_map(fn($t) => [
    'chainId'=>$t['chain_id'],'name'=>$t['name'],'status'=>$t['status'],
    'plan'=>$t['plan'],'fee'=>$t['fee'],'expiry'=>$t['expiry'],
    'ownerName'=>$t['owner_name'],'ownerPhone'=>$t['owner_phone'],
    'notes'=>$t['notes'],'ordersUrl'=>'local'], $rows);
  json_out($action === 'me'
    ? ['me'=>$me,'tenants'=>$tenants,'admin'=>$me['role']==='admin']
    : ['tenants'=>$tenants]);
}

case 'orders': {                      /* dashboard + portal read here */
  require_scope($me, $chain);
  $rows = all("SELECT * FROM orders WHERE chain_id=? ORDER BY ts DESC LIMIT 5000", [$chain]);
  json_out(['orders' => array_map(fn($o) => [
    'ts'=>$o['ts'],'branch'=>$o['branch'],'zone'=>$o['zone'],'daypart'=>$o['daypart'],
    'customer'=>$o['customer'],'phone'=>$o['phone'],'address'=>$o['address'],
    'type'=>$o['otype'],'items'=>$o['items'],'subtotal'=>(float)$o['subtotal'],
    'promo'=>$o['promo'],'discount'=>(float)$o['discount'],'total'=>(float)$o['total'],
    'payment'=>$o['payment'],'time'=>$o['dtime'],'notes'=>$o['notes'],
    'upShown'=>$o['up_shown'],'upTaken'=>$o['up_taken'],'upRev'=>(float)$o['up_rev'],
    'status'=>$o['status']], $rows)]);
}

/* ───── TENANTS ───── */
case 'setStatus': {
  require_admin($me);
  $s = param('status') === 'paused' ? 'paused' : 'live';
  q("UPDATE tenants SET status=? WHERE chain_id=?", [$s, $chain]);
  audit($me, 'setStatus', "$chain → $s");
  json_out(['ok' => true]);
}
case 'saveTenant': {
  require_admin($me);
  if (!$chain) json_out(['error' => 'Chain ID required'], 400);
  q("INSERT INTO tenants (chain_id,name,status,plan,fee,expiry,owner_name,owner_phone,notes)
     VALUES (?,?,?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE name=VALUES(name),plan=VALUES(plan),fee=VALUES(fee),
       expiry=VALUES(expiry),owner_name=VALUES(owner_name),
       owner_phone=VALUES(owner_phone),notes=VALUES(notes)",
    [$chain, (string)param('name',''), (string)param('status','live'),
     (string)param('plan',''), (float)param('fee',0),
     param('expiry') ?: null, (string)param('ownerName',''),
     (string)param('ownerPhone',''), (string)param('notes','')]);
  audit($me, 'saveTenant', (string)$chain);
  json_out(['ok' => true]);
}

/* ───── BRANCHES ───── */
case 'branches':
  require_scope($me, $chain);
  json_out(['branches' => array_map(fn($b) => [
    'chainId'=>$b['chain_id'],'branchId'=>$b['branch_id'],'name'=>$b['name'],
    'wa'=>$b['wa'],'hours'=>$b['hours'],'active'=>(int)$b['active'] ? 'yes' : 'no'],
    all("SELECT * FROM branches WHERE chain_id=? ORDER BY branch_id", [$chain]))]);

case 'saveBranch': {
  require_scope($me, $chain);
  $bid = preg_replace('/[^a-z0-9]/', '', strtolower((string)param('branchId','')));
  if ($bid === '') json_out(['error' => 'Branch ID required'], 400);
  $wa = preg_replace('/[^0-9]/', '', (string)param('wa',''));
  if ($wa !== '' && !preg_match('/^9715?[0-9]{7,9}$/', $wa))
    json_out(['error' => 'WhatsApp must look like 9715XXXXXXXX (no + or spaces)'], 400);
  q("INSERT INTO branches (chain_id,branch_id,name,wa,hours,active) VALUES (?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE name=VALUES(name),wa=VALUES(wa),
       hours=VALUES(hours),active=VALUES(active)",
    [$chain, $bid, (string)param('name',''), $wa, (string)param('hours',''),
     param('active') === 'no' ? 0 : 1]);
  audit($me, 'saveBranch', "$chain · $bid");
  json_out(['ok' => true]);
}
case 'deleteBranch': {
  require_admin($me);
  q("DELETE FROM branches WHERE chain_id=? AND branch_id=?", [$chain, (string)param('branchId','')]);
  audit($me, 'deleteBranch', "$chain · " . param('branchId'));
  json_out(['ok' => true]);
}


/* ───── MENU: add / edit / remove items and categories ───── */
case 'menu':
  require_scope($me, $chain);
  json_out(['menu' => build_menu($chain), 'flat' => flat_items($chain)]);

case 'saveItem': {
  require_scope($me, $chain);
  $name = trim((string) param('name', ''));
  $cat  = trim((string) param('catId', ''));
  if ($name === '') json_out(['error' => 'Item name is required'], 400);
  if ($cat === '')  json_out(['error' => 'Choose a category'], 400);
  $price = (float) param('price', 0);
  if ($price < 0) json_out(['error' => 'Price cannot be negative'], 400);
  $id = (int) param('id', 0);

  if ($id > 0) {
    $clash = one("SELECT id FROM items WHERE chain_id=? AND name=? AND id<>?", [$chain,$name,$id]);
    if ($clash) json_out(['error' => 'Another item already uses that name'], 409);
    q("UPDATE items SET cat_id=?,name=?,name_ar=?,price=?,photo=?,popular=?,available=?,sort=?
       WHERE id=? AND chain_id=?",
      [$cat,$name,(string)param('nameAr',''),$price,(string)param('photo',''),
       param('popular')?1:0, param('available')==='no'?0:1, (int)param('sort',0), $id, $chain]);
    audit($me,'editItem',"$chain · $name");
    json_out(['ok'=>true,'id'=>$id]);
  }
  if (one("SELECT id FROM items WHERE chain_id=? AND name=?", [$chain,$name]))
    json_out(['error' => 'An item with that name already exists'], 409);
  q("INSERT INTO items (chain_id,cat_id,name,name_ar,price,photo,popular,available,sort)
     VALUES (?,?,?,?,?,?,?,?,?)",
    [$chain,$cat,$name,(string)param('nameAr',''),$price,(string)param('photo',''),
     param('popular')?1:0, param('available')==='no'?0:1, (int)param('sort',999)]);
  audit($me,'addItem',"$chain · $name");
  json_out(['ok'=>true,'id'=>(int)db()->lastInsertId()]);
}

case 'deleteItem': {
  require_scope($me, $chain);
  $it = one("SELECT name FROM items WHERE id=? AND chain_id=?", [(int)param('id',0), $chain]);
  if (!$it) json_out(['error' => 'Item not found'], 404);
  q("DELETE FROM items WHERE id=? AND chain_id=?", [(int)param('id',0), $chain]);
  q("DELETE FROM rewards WHERE chain_id=? AND item=?", [$chain, $it['name']]);
  audit($me,'deleteItem',"$chain · " . $it['name']);
  json_out(['ok'=>true]);
}

case 'saveCategory': {
  require_scope($me, $chain);
  $cid = preg_replace('/[^a-z0-9]/','', strtolower((string)param('catId','')));
  if ($cid === '') json_out(['error' => 'Category ID required (letters and numbers)'], 400);
  if (trim((string)param('title','')) === '') json_out(['error' => 'Category name required'], 400);
  $dp = (string) param('dayparts', 'morning,noon,evening,night');
  q("INSERT INTO categories (chain_id,cat_id,title,title_ar,icon,dayparts,sort,active)
     VALUES (?,?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE title=VALUES(title),title_ar=VALUES(title_ar),
       icon=VALUES(icon),dayparts=VALUES(dayparts),sort=VALUES(sort),active=VALUES(active)",
    [$chain,$cid,(string)param('title',''),(string)param('titleAr',''),
     (string)param('icon','🍽️'),$dp,(int)param('sort',999), param('active')==='no'?0:1]);
  audit($me,'saveCategory',"$chain · $cid");
  json_out(['ok'=>true]);
}

case 'deleteCategory': {
  require_scope($me, $chain);
  $cid = (string) param('catId','');
  $n = (int) one("SELECT COUNT(*) n FROM items WHERE chain_id=? AND cat_id=?", [$chain,$cid])['n'];
  if ($n > 0) json_out(['error' => "Move or delete the $n item(s) in this category first"], 409);
  q("DELETE FROM categories WHERE chain_id=? AND cat_id=?", [$chain,$cid]);
  audit($me,'deleteCategory',"$chain · $cid");
  json_out(['ok'=>true]);
}

case 'uploadPhoto': {
  require_scope($me, $chain);
  if (!isset($_FILES['photo'])) json_out(['error' => 'No file received'], 400);
  $f = $_FILES['photo'];
  if (($f['error'] ?? 1) !== UPLOAD_ERR_OK) json_out(['error' => 'Upload failed — try a smaller file'], 400);
  if ($f['size'] > 6 * 1024 * 1024) json_out(['error' => 'Image must be under 6 MB'], 400);
  $info = @getimagesize($f['tmp_name']);
  if (!$info) json_out(['error' => 'That file is not an image'], 400);
  $ext = ['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp'][$info['mime']] ?? null;
  if (!$ext) json_out(['error' => 'Use a JPG, PNG or WEBP image'], 400);

  $dir = dirname(__DIR__) . '/photos';
  if (!is_dir($dir)) @mkdir($dir, 0755, true);
  if (!is_writable($dir)) json_out(['error' => 'The photos folder is not writable — set it to 755'], 500);

  $slug = preg_replace('/[^a-z0-9]+/','-', strtolower((string)param('name','dish')));
  $slug = trim((string)$slug,'-') ?: 'dish';
  $file = $slug . '-' . substr((string)time(), -6) . '.' . $ext;

  // downscale to 460px square-ish and re-encode as jpg to keep pages fast
  $saved = false;
  if (function_exists('imagecreatetruecolor')) {
    $src = match($info['mime']) {
      'image/jpeg' => @imagecreatefromjpeg($f['tmp_name']),
      'image/png'  => @imagecreatefrompng($f['tmp_name']),
      'image/webp' => function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($f['tmp_name']) : null,
      default => null };
    if ($src) {
      $w = imagesx($src); $h = imagesy($src); $s = min($w,$h);
      $dst = imagecreatetruecolor(460,460);
      imagefill($dst,0,0,imagecolorallocate($dst,30,26,24));
      imagecopyresampled($dst,$src,0,0,(int)(($w-$s)/2),(int)(($h-$s)/2),460,460,$s,$s);
      $file = $slug . '-' . substr((string)time(), -6) . '.jpg';
      $saved = imagejpeg($dst, "$dir/$file", 80);
      imagedestroy($src); imagedestroy($dst);
    }
  }
  if (!$saved && !move_uploaded_file($f['tmp_name'], "$dir/$file"))
    json_out(['error' => 'Could not save the image'], 500);

  $url = 'photos/' . $file;
  if (param('item')) {
    q("UPDATE items SET photo=? WHERE chain_id=? AND name=?", [$url, $chain, (string)param('item')]);
    audit($me,'uploadPhoto',"$chain · " . param('item'));
  }
  json_out(['ok'=>true,'url'=>$url]);
}

/* ───── MENU OVERRIDES ───── */
case 'overrides':
  require_scope($me, $chain);
  json_out(['overrides' => array_map(fn($o) => [
    'chainId'=>$o['chain_id'],'item'=>$o['item'],'field'=>$o['field'],'value'=>$o['value']],
    all("SELECT * FROM overrides WHERE chain_id=?", [$chain]))]);

case 'setOverride': {
  require_scope($me, $chain);
  q("INSERT INTO overrides (chain_id,item,field,value,updated) VALUES (?,?,?,?,NOW())
     ON DUPLICATE KEY UPDATE value=VALUES(value),updated=NOW()",
    [$chain, (string)param('item',''), (string)param('field',''), (string)param('value','')]);
  audit($me, 'setOverride', "$chain · " . param('item') . ' · ' . param('field') . '=' . param('value'));
  json_out(['ok' => true]);
}
case 'clearOverride': {
  require_scope($me, $chain);
  q("DELETE FROM overrides WHERE chain_id=? AND item=? AND field=?",
    [$chain, (string)param('item',''), (string)param('field','')]);
  audit($me, 'clearOverride', "$chain · " . param('item'));
  json_out(['ok' => true]);
}

/* ───── OFFERS ───── */
case 'offers':
  require_scope($me, $chain);
  json_out(['offers' => array_map(fn($o) => [
    'chainId'=>$o['chain_id'],'code'=>$o['code'],'type'=>$o['type'],
    'value'=>(float)$o['value'],'active'=>(int)$o['active']?'yes':'no',
    'expiry'=>$o['expiry'],'note'=>$o['note']],
    all("SELECT * FROM offers WHERE chain_id=? ORDER BY code", [$chain]))]);

case 'saveOffer': {
  require_scope($me, $chain);
  $code = strtoupper(trim((string)param('code','')));
  if ($code === '') json_out(['error' => 'Promo code cannot be empty'], 400);
  q("INSERT INTO offers (chain_id,code,type,value,active,expiry,note) VALUES (?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE type=VALUES(type),value=VALUES(value),
       active=VALUES(active),expiry=VALUES(expiry),note=VALUES(note)",
    [$chain, $code, param('type')==='flat'?'flat':'pct', (float)param('value',0),
     param('active')==='no'?0:1, param('expiry') ?: null, (string)param('note','')]);
  audit($me, 'saveOffer', "$chain · $code");
  json_out(['ok' => true]);
}
case 'deleteOffer': {
  require_scope($me, $chain);
  q("DELETE FROM offers WHERE chain_id=? AND code=?",
    [$chain, strtoupper((string)param('code',''))]);
  audit($me, 'deleteOffer', "$chain · " . param('code'));
  json_out(['ok' => true]);
}

/* ───── REWARD LADDER ───── */
case 'rewards':
  require_scope($me, $chain);
  json_out(['rewards' => array_map(fn($r) => [
    'chainId'=>$r['chain_id'],'minSpend'=>(float)$r['min_spend'],'item'=>$r['item'],
    'dealPrice'=>(float)$r['deal_price'],'label'=>$r['label'],
    'active'=>(int)$r['active']?'yes':'no'],
    all("SELECT * FROM rewards WHERE chain_id=? ORDER BY min_spend", [$chain]))]);

case 'saveReward': {
  require_scope($me, $chain);
  $min = (float) param('minSpend', 0); $dp = (float) param('dealPrice', -1);
  if ($min <= 0) json_out(['error' => 'Spend amount must be greater than 0'], 400);
  if ($dp < 0)   json_out(['error' => 'Deal price cannot be negative'], 400);
  if (!param('item')) json_out(['error' => 'Choose the reward item'], 400);
  q("INSERT INTO rewards (chain_id,min_spend,item,deal_price,label,active) VALUES (?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE item=VALUES(item),deal_price=VALUES(deal_price),
       label=VALUES(label),active=VALUES(active)",
    [$chain, $min, (string)param('item',''), $dp,
     (string)param('label',''), param('active')==='no'?0:1]);
  audit($me, 'saveReward', "$chain · AED $min → " . param('item'));
  json_out(['ok' => true]);
}
case 'deleteReward': {
  require_scope($me, $chain);
  q("DELETE FROM rewards WHERE chain_id=? AND min_spend=?", [$chain, (float)param('minSpend',0)]);
  audit($me, 'deleteReward', "$chain · AED " . param('minSpend'));
  json_out(['ok' => true]);
}

/* ───── USERS ───── */
case 'users':
  require_admin($me);
  json_out(['users' => array_map(fn($u) => [
    'username'=>$u['username'],'role'=>$u['role'],'chainId'=>$u['chain_id'],
    'name'=>$u['name'],'active'=>(int)$u['active']?'yes':'no','created'=>$u['created']],
    all("SELECT * FROM users ORDER BY role, username"))]);

case 'saveUser': {
  require_admin($me);
  $un = trim((string) param('username', ''));
  if ($un === '') json_out(['error' => 'Username is required'], 400);
  $role = param('role') === 'admin' ? 'admin' : 'owner';
  $ex = one("SELECT pass_hash, created FROM users WHERE username=?", [$un]);
  $hash = param('password') ? hash_pw((string)param('password'))
        : ($ex['pass_hash'] ?? hash_pw(DEFAULT_PASSWORD));
  q("INSERT INTO users (username,pass_hash,role,chain_id,name,active,created)
     VALUES (?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE pass_hash=VALUES(pass_hash),role=VALUES(role),
       chain_id=VALUES(chain_id),name=VALUES(name),active=VALUES(active)",
    [$un, $hash, $role, $role === 'admin' ? '*' : (string)param('chainId',''),
     (string)param('name',''), param('active') === 'no' ? 0 : 1,
     $ex['created'] ?? date('Y-m-d H:i:s')]);
  audit($me, 'saveUser', "$un → $role");
  json_out(['ok' => true]);
}

case 'changePassword': {
  $target = ($me['role'] === 'admin' && param('target')) ? (string)param('target') : $me['username'];
  $new = (string) param('newPassword', '');
  if (mb_strlen($new) < 4) json_out(['error' => 'Password must be at least 4 characters'], 400);
  $u = one("SELECT pass_hash FROM users WHERE username=?", [$target]);
  if (!$u) json_out(['error' => 'No such user'], 404);
  if ($target === $me['username'] && $me['role'] !== 'admin'
      && !check_pw((string)param('oldPassword',''), $u['pass_hash']))
    json_out(['error' => 'Current password is wrong'], 403);
  q("UPDATE users SET pass_hash=? WHERE username=?", [hash_pw($new), $target]);
  audit($me, 'changePassword', $target);
  json_out(['ok' => true]);
}
case 'resetToDefault': {
  require_admin($me);
  q("UPDATE users SET pass_hash=? WHERE username=?",
    [hash_pw(DEFAULT_PASSWORD), (string)param('target','')]);
  audit($me, 'resetToDefault', (string)param('target',''));
  json_out(['ok' => true, 'password' => DEFAULT_PASSWORD]);
}

/* ───── ERRORS / HEALTH / AUDIT ───── */
case 'errors':
  require_admin($me);
  json_out(['errors' => array_map(fn($e) => [
    'ts'=>$e['ts'],'source'=>$e['source'],'chain'=>$e['chain_id'],'branch'=>$e['branch'],
    'message'=>$e['message'],'detail'=>$e['detail'],'notified'=>$e['notified']],
    all("SELECT * FROM errors ORDER BY id DESC LIMIT 200"))]);

case 'clearErrors':
  require_admin($me);
  q("DELETE FROM errors");
  audit($me, 'clearErrors');
  json_out(['ok' => true]);

case 'testAlert': {
  require_admin($me);
  $c = cfg();
  $n = record_error('portal · test', $chain ?: 'system', '',
        'Test alert from the portal',
        'You pressed Send test alert. If this email arrived, alerting works.', 'portal');
  json_out(['ok' => true, 'notified' => $n, 'email' => $c['admin_email'] ?? '']);
}

case 'health': {
  require_admin($me);
  $c = cfg();
  $out = [];
  foreach (all("SELECT * FROM tenants ORDER BY name") as $t) {
    $bs = all("SELECT * FROM branches WHERE chain_id=?", [$t['chain_id']]);
    $bad = array_values(array_map(fn($b) => $b['name'],
      array_filter($bs, fn($b) => !preg_match('/^9715[0-9]{8}$/', (string)$b['wa']))));
    $out[] = [
      'chainId'=>$t['chain_id'], 'name'=>$t['name'], 'status'=>$t['status'],
      'branches'=>count($bs), 'badNumbers'=>$bad, 'ordersUrl'=>true,
      'owners'=>(int) one("SELECT COUNT(*) n FROM users WHERE role='owner' AND chain_id=?",
                          [$t['chain_id']])['n'],
      'offers'=>(int) one("SELECT COUNT(*) n FROM offers WHERE chain_id=?", [$t['chain_id']])['n'],
      'rewards'=>(int) one("SELECT COUNT(*) n FROM rewards WHERE chain_id=?", [$t['chain_id']])['n'],
      'orders'=>(int) one("SELECT COUNT(*) n FROM orders WHERE chain_id=?", [$t['chain_id']])['n'],
    ];
  }
  json_out(['health' => $out, 'adminEmail' => $c['admin_email'] ?? '']);
}

case 'audit':
  require_admin($me);
  json_out(['audit' => array_map(fn($a) => [
    'ts'=>$a['ts'],'user'=>$a['username'],'role'=>$a['role'],
    'action'=>$a['action'],'detail'=>$a['detail']],
    all("SELECT * FROM audit ORDER BY id DESC LIMIT 300"))]);

case 'logout':
  q("DELETE FROM sessions WHERE token=?", [(string)param('token','')]);
  json_out(['ok' => true]);

default:
  json_out(['error' => 'Unknown action: ' . $action], 400);
}

/* ── menu builders ── */
function build_menu(string $chain): array {
  $cats = all("SELECT * FROM categories WHERE chain_id=? AND active=1 ORDER BY sort, title", [$chain]);
  $out = [];
  foreach ($cats as $c) {
    $items = all("SELECT * FROM items WHERE chain_id=? AND cat_id=? ORDER BY sort, name",
                 [$chain, $c['cat_id']]);
    if (!$items) continue;
    $out[$c['cat_id']] = [
      't'  => $c['title'], 'ar' => $c['title_ar'], 'ic' => $c['icon'],
      'dp' => array_values(array_filter(explode(',', (string)$c['dayparts']))),
      'i'  => array_map(fn($i) => array_filter([
        'n' => $i['name'], 'a' => $i['name_ar'], 'p' => (float)$i['price'],
        'img' => $i['photo'] ?: null,
        'h' => (int)$i['popular'] ?: null,
        'off' => (int)$i['available'] ? null : true,
      ], fn($v) => $v !== null), $items),
    ];
  }
  return $out;
}
function flat_items(string $chain): array {
  return array_map(fn($i) => [
    'id'=>(int)$i['id'],'catId'=>$i['cat_id'],'name'=>$i['name'],'nameAr'=>$i['name_ar'],
    'price'=>(float)$i['price'],'photo'=>$i['photo'],
    'popular'=>(int)$i['popular'],'available'=>(int)$i['available'] ? 'yes' : 'no',
    'sort'=>(int)$i['sort']],
    all("SELECT * FROM items WHERE chain_id=? ORDER BY cat_id, sort, name", [$chain]));
}

} catch (Throwable $e) {
  record_error('api', $chain, '', $e->getMessage(),
    basename($e->getFile()) . ':' . $e->getLine(), 'php');
  json_out(['error' => 'Server error — the admin has been alerted.'], 500);
}
