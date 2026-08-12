<?php
/* ═══════════════════════════════════════════════════════════════════════════
   MADEX WAVIES — one-page installer
   Open  https://mozonbroast.ae/install.php  and fill the form.
   No PHP or MySQL knowledge needed. Delete this file when it says so.
   ═══════════════════════════════════════════════════════════════════════════ */
declare(strict_types=1);
date_default_timezone_set('Asia/Dubai');
$CFG  = __DIR__ . '/api/config.php';
$done = false; $err = ''; $adminUser = 'madex'; $adminPass = '00711';

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
  $host = trim($_POST['host'] ?? 'localhost');
  $name = trim($_POST['name'] ?? '');
  $user = trim($_POST['user'] ?? '');
  $pass = (string)($_POST['pass'] ?? '');
  $mail = trim($_POST['mail'] ?? '');
  $adminUser = trim($_POST['au'] ?? 'madex') ?: 'madex';
  $adminPass = (string)($_POST['ap'] ?? '00711') ?: '00711';

  try {
    if ($name === '' || $user === '') throw new Exception('Database name and username are required.');
    $pdo = new PDO("mysql:host=$host;dbname=$name;charset=utf8mb4", $user, $pass,
      [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

    $php = "<?php\nreturn " . var_export([
      'host' => $host, 'name' => $name, 'user' => $user, 'pass' => $pass,
      'admin_email' => $mail ?: 'gasulgachuu@gmail.com',
    ], true) . ";\n";
    if (!is_dir(__DIR__ . '/api')) mkdir(__DIR__ . '/api', 0755, true);
    if (file_put_contents($CFG, $php) === false)
      throw new Exception('Could not write api/config.php — set the api folder to writable (755) and retry.');

    require __DIR__ . '/api/lib.php';
    create_schema($pdo);
    seed($pdo, $adminUser, $adminPass);
    $done = true;
  } catch (Throwable $e) { $err = $e->getMessage(); }
}
$installed = file_exists($CFG);
?><!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Madex Wavies — Install</title>
<link rel="icon" href="assets/favicon.png">
<style>
:root{--bg:#0D0C0F;--surf:#161519;--surf2:#1E1D23;--line:#2A2830;--txt:#F2F0F4;
 --dim:#8E8A98;--ok:#3DD68C;--bad:#FF6B5A;--acc:#4FE9DA}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--txt);font-family:-apple-system,BlinkMacSystemFont,
 'Segoe UI',Roboto,system-ui,sans-serif;display:flex;justify-content:center;padding:26px 16px 60px}
.w{width:100%;max-width:560px}
.brand{text-align:center;margin-bottom:26px}
.brand img{width:88px;height:88px;border-radius:22px;margin:0 auto 12px;display:block}
.brand h1{margin:0;font-size:23px;letter-spacing:-.6px}
.brand p{margin:5px 0 0;color:var(--dim);font-size:13px}
.card{background:var(--surf);border:1px solid var(--line);border-radius:16px;padding:20px;margin-bottom:14px}
.card h2{margin:0 0 4px;font-size:15px}
.card .c{color:var(--dim);font-size:12.5px;line-height:1.6;margin-bottom:14px}
label{display:block;font-size:11px;font-weight:700;color:var(--dim);margin:13px 0 5px;
 letter-spacing:.6px;text-transform:uppercase}
input{width:100%;padding:13px;border:1px solid var(--line);border-radius:11px;
 background:var(--surf2);color:var(--txt);font-size:15px}
input:focus{outline:0;border-color:var(--acc)}
button{width:100%;margin-top:20px;padding:15px;border:0;border-radius:12px;background:var(--acc);
 color:#04211E;font-weight:800;font-size:15px;cursor:pointer}
.ok{background:rgba(61,214,140,.1);border:1px solid rgba(61,214,140,.35);color:#8FEBBB}
.bad{background:rgba(255,107,90,.1);border:1px solid rgba(255,107,90,.35);color:#FF9E92}
.note{border-radius:12px;padding:13px;font-size:13px;line-height:1.65;margin-bottom:14px}
ol{margin:0;padding-left:19px;font-size:13px;color:var(--dim);line-height:1.9}
ol b{color:var(--txt)}
code{background:var(--surf2);padding:2px 7px;border-radius:6px;font-size:12.5px;color:var(--acc)}
a{color:var(--acc)}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
@media(max-width:520px){.grid{grid-template-columns:1fr}}
</style></head><body><div class="w">

<div class="brand">
  <img src="assets/logo-192.png" alt="Madex Wavies" onerror="this.style.display='none'">
  <h1>MADEX WAVIES</h1><p>One-time setup · about 3 minutes</p>
</div>

<?php if ($done): ?>
  <div class="note ok">
    <b>Installed.</b> Everything is on your own server now — no Google, no Apps Script, no spreadsheets.
  </div>
  <div class="card">
    <h2>Your login</h2>
    <div class="c">Use this at <a href="portal.html">portal.html</a></div>
    <p style="font-size:16px;margin:0">Username <b><?= htmlspecialchars($adminUser) ?></b><br>
       Password <b><?= htmlspecialchars($adminPass) ?></b></p>
  </div>
  <div class="card">
    <h2>Last two steps</h2>
    <ol>
      <li><b>Delete install.php</b> from your File Manager — it must not stay online</li>
      <li>Open <a href="portal.html">portal.html</a>, sign in, and change your password in Settings</li>
    </ol>
  </div>
<?php else: ?>

  <?php if ($err): ?><div class="note bad"><b>Could not install.</b><br><?= htmlspecialchars($err) ?></div><?php endif; ?>
  <?php if ($installed): ?><div class="note bad"><b>Already installed.</b> Running this again will
    reset the database connection. Delete <code>install.php</code> if you are done.</div><?php endif; ?>

  <div class="card">
    <h2>Almost done</h2>
    <div class="c">In your hosting panel, create a MySQL database and a user, and give that user
      <b>all privileges</b> on it. Write down the four values it shows you — that's all you need.</div>
    <ol>
      <li>✅ Database created — <code>madexwaves-353036351e3c</code></li>
      <li>✅ User created — <code>madexwaves</code></li>
      <li>Panel → <b>MySQL Databases</b> → on the <code>madexwaves</code> row, click the
          <b>🔑 key</b> next to <b>New password</b>, copy it, press <b>Save</b></li>
      <li>Paste that password below</li>
    </ol>
  </div>

  <form method="post">
    <div class="card">
      <h2>Database</h2>
      <div class="c">Already filled in from your ServerByt account. <b>You only need to paste the password.</b></div>
      <label>Host</label><input name="host" value="sdb-74.hosting.stackcp.net" required>
      <label>Database name</label><input name="name" value="madexwaves-353036351e3c" required>
      <label>Database username</label><input name="user" value="madexwaves" required>
      <label>Database password</label><input name="pass" type="text" placeholder="paste the password you generated" autofocus>
    </div>

    <div class="card">
      <h2>Your admin login</h2>
      <div class="c">This is how you sign into the portal. Change the password after first login.</div>
      <div class="grid">
        <div><label>Username</label><input name="au" value="madex" required></div>
        <div><label>Password</label><input name="ap" value="00711" required></div>
      </div>
      <label>Send error alerts to</label>
      <input name="mail" type="email" value="gasulgachuu@gmail.com" required>
      <button type="submit">Install now</button>
    </div>
  </form>
<?php endif; ?>

<p style="text-align:center;color:#5A5766;font-size:11.5px;margin-top:22px">
  Madex Wavies · Al Nahda 2, Dubai</p>
</div></body></html>
