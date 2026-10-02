<?php
/**
 * ORAFON admin sign-in (username + password) for Sveltia CMS.
 *
 * Sveltia opens this page in a popup (backend.base_url + auth_endpoint in config.yml).
 * After a correct username/password it hands the CMS the GitHub token stored on the
 * server, using the same popup message protocol as "Sign in with GitHub".
 *
 * Secrets live OUTSIDE the web root, in ../orafon-admin/config.php (next to httpdocs):
 *   <?php return [
 *     'origin' => 'https://orafon.co.th',
 *     'token'  => 'github_pat_...',            // fine-grained, Contents read/write on kmcgweb/orafon
 *     'users'  => [ 'somchai' => '$2y$10$...' ] // hashes from /admin/hash.php
 *   ];
 */

declare(strict_types=1);

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');
header('X-Frame-Options: DENY');
header("Content-Security-Policy: frame-ancestors 'none'");
header('Referrer-Policy: no-referrer');

// Look for orafon-admin/ next to httpdocs (this file is httpdocs/admin/auth.php)
$candidates = array_filter([
    getenv('ORAFON_ADMIN_DIR') ?: null,
    dirname(__DIR__, 2) . '/orafon-admin',
    isset($_SERVER['DOCUMENT_ROOT']) ? dirname($_SERVER['DOCUMENT_ROOT']) . '/orafon-admin' : null,
]);
$dir = reset($candidates);
foreach ($candidates as $c) { if (@is_file($c . '/config.php')) { $dir = $c; break; } }
$cfgFile = $dir . '/config.php';
$cfg = @is_file($cfgFile) ? require $cfgFile : null;

function h(string $s): string { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); }

function page(string $title, string $body, string $script = ''): void {
    echo '<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
       . '<meta name="robots" content="noindex,nofollow"><title>' . h($title) . '</title><style>'
       . 'body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,"Noto Sans Thai",sans-serif;background:linear-gradient(135deg,#EDF2FB,#EAF6EE);color:#0f172a}'
       . '.box{width:min(360px,92vw);background:#fff;border-radius:18px;padding:32px 28px;box-shadow:0 20px 40px -20px rgba(31,63,159,.35)}'
       . 'img{height:34px;display:block;margin:0 auto 18px}h1{font-size:18px;text-align:center;margin:0 0 20px}'
       . 'label{display:block;font-size:14px;font-weight:600;margin:14px 0 6px}input{width:100%;box-sizing:border-box;height:44px;border:1px solid #cbd5e1;border-radius:10px;padding:0 12px;font-size:15px}'
       . 'input:focus{outline:none;border-color:#1F3F9F;box-shadow:0 0 0 3px rgba(31,63,159,.15)}'
       . 'button{width:100%;height:46px;margin-top:22px;border:0;border-radius:10px;background:linear-gradient(135deg,#1F3F9F,#2A6FDB);color:#fff;font-size:15px;font-weight:700;cursor:pointer}'
       . '.err{background:#fef2f2;color:#b91c1c;border-radius:10px;padding:10px 12px;font-size:14px;margin-bottom:6px}.ok{text-align:center;color:#475569;font-size:14px}'
       . '</style></head><body><div class="box"><img src="/assets/img/orafon-logo.png" alt="ORAFON">' . $body . '</div>' . $script . '</body></html>';
    exit;
}

if (!is_array($cfg) || empty($cfg['token']) || empty($cfg['users']) || empty($cfg['origin'])) {
    http_response_code(500);
    if ($cfg === null) {
        $why = 'ไม่พบไฟล์ตั้งค่า ระบบค้นหาที่:<br>' . implode('<br>', array_map(fn($c) => '<code>' . h($c) . '/config.php</code>', array_unique($candidates)));
        $why .= '<br><br>โฟลเดอร์ orafon-admin: ' . (@is_dir($dir) ? 'พบ' : 'ไม่พบ');
        if (@is_dir($dir)) {
            $files = @scandir($dir) ?: [];
            $why .= '<br>ไฟล์ในโฟลเดอร์: ' . h(implode(', ', array_diff($files, ['.', '..'])) ?: '(ว่าง)');
        }
        $ob = (string) ini_get('open_basedir');
        if ($ob !== '') { $why .= '<br>open_basedir: <code>' . h($ob) . '</code>'; }
    } elseif (!is_array($cfg)) {
        $why = 'พบไฟล์ config.php แล้ว แต่รูปแบบไม่ถูกต้อง (ต้องขึ้นต้นด้วย &lt;?php return [ และปิดด้วย ];)';
    } else {
        $missing = array_keys(array_filter(['origin' => empty($cfg['origin']), 'token' => empty($cfg['token']), 'users' => empty($cfg['users'])]));
        $why = 'พบไฟล์ config.php แล้ว แต่ยังขาดค่า: <b>' . h(implode(', ', $missing)) . '</b>';
    }
    page('ORAFON Admin', '<h1>ยังไม่ได้ตั้งค่าระบบล็อกอิน</h1><p class="ok" style="text-align:left;word-break:break-all">' . $why . '</p>');
}

/* ---- rate limit: 5 failed attempts per IP per 15 minutes ---- */
$ip = $_SERVER['REMOTE_ADDR'] ?? '0';
$rlDir = $dir . '/ratelimit';
if (!is_dir($rlDir)) { @mkdir($rlDir, 0700, true); }
$rlFile = $rlDir . '/' . hash('sha256', $ip) . '.json';
$now = time();
$fails = array_values(array_filter(
    is_file($rlFile) ? (json_decode((string) file_get_contents($rlFile), true) ?: []) : [],
    fn($t) => is_int($t) && $t > $now - 900
));
$locked = count($fails) >= 5;

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $user = strtolower(trim((string) ($_POST['username'] ?? '')));
    $pass = (string) ($_POST['password'] ?? '');
    $hash = $cfg['users'][$user] ?? null;

    if ($locked) {
        $error = 'ใส่รหัสผิดหลายครั้ง กรุณารอ 15 นาทีแล้วลองใหม่';
    } elseif (is_string($hash) && $user !== '' && password_verify($pass, $hash)) {
        @unlink($rlFile);
        @file_put_contents($dir . '/login.log', date('c') . "\t" . $user . "\t" . $ip . "\n", FILE_APPEND | LOCK_EX);

        $origin = (string) $cfg['origin'];
        $msg = 'authorization:github:success:' . json_encode(['token' => (string) $cfg['token'], 'provider' => 'github']);
        $script = '<script>(function(){var o=' . json_encode($origin) . ',m=' . json_encode($msg) . ';'
            . 'if(!window.opener){document.querySelector(".ok").textContent="กรุณาเปิดหน้านี้จากปุ่มล็อกอินใน /admin";return;}'
            . 'window.addEventListener("message",function(e){if(e.origin!==o)return;window.opener.postMessage(m,o);setTimeout(function(){window.close()},300);},false);'
            . 'window.opener.postMessage("authorizing:github",o);})();</script>';
        page('ORAFON Admin', '<h1>เข้าสู่ระบบสำเร็จ</h1><p class="ok">สวัสดี ' . h($user) . ' — กำลังกลับไปหน้าหลังบ้าน…</p>', $script);
    } else {
        if (!$locked) {
            $fails[] = $now;
            @file_put_contents($rlFile, json_encode($fails), LOCK_EX);
        }
        usleep(400000);
        $error = 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
    }
}

$action = h(strtok($_SERVER['REQUEST_URI'] ?? '/admin/auth.php', '#') ?: '/admin/auth.php');
page('ORAFON Admin — เข้าสู่ระบบ',
    '<h1>เข้าสู่ระบบหลังบ้าน</h1>'
    . ($error ? '<div class="err">' . h($error) . '</div>' : '')
    . '<form method="post" action="' . $action . '" autocomplete="on">'
    . '<label for="u">ชื่อผู้ใช้</label><input id="u" name="username" autocomplete="username" required autofocus>'
    . '<label for="p">รหัสผ่าน</label><input id="p" name="password" type="password" autocomplete="current-password" required>'
    . '<button type="submit">เข้าสู่ระบบ</button></form>');
