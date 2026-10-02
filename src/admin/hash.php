<?php
/**
 * Password hash generator for /admin/auth.php users.
 * Type a password, copy the hash into orafon-admin/config.php. Nothing is stored or logged.
 */
declare(strict_types=1);
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');

$hash = '';
$err = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $p = (string) ($_POST['password'] ?? '');
    if (mb_strlen($p) < 10) { $err = 'รหัสผ่านต้องยาวอย่างน้อย 10 ตัวอักษร'; }
    else { $hash = password_hash($p, PASSWORD_DEFAULT); }
}
$e = fn(string $s) => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
?><!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>สร้างรหัสผ่านหลังบ้าน</title>
<style>body{font-family:system-ui,"Noto Sans Thai",sans-serif;max-width:560px;margin:48px auto;padding:0 16px;color:#0f172a}input,textarea{width:100%;box-sizing:border-box;font-size:15px;padding:10px;border:1px solid #cbd5e1;border-radius:10px}textarea{font-family:monospace;height:70px}button{margin-top:12px;height:44px;padding:0 20px;border:0;border-radius:10px;background:#1F3F9F;color:#fff;font-weight:700;cursor:pointer}.err{color:#b91c1c}p{color:#475569;font-size:14px}</style></head><body>
<h1>สร้างรหัสผ่านหลังบ้าน</h1>
<p>พิมพ์รหัสผ่านที่ต้องการ (อย่างน้อย 10 ตัว) แล้วคัดลอกข้อความที่ได้ไปใส่ในไฟล์ <code>orafon-admin/config.php</code> หน้านี้ไม่เก็บรหัสผ่านไว้</p>
<form method="post"><input name="password" type="password" autocomplete="new-password" required placeholder="รหัสผ่าน"><button>สร้าง</button></form>
<?php if ($err): ?><p class="err"><?= $e($err) ?></p><?php endif; ?>
<?php if ($hash): ?><p>คัดลอกบรรทัดนี้:</p><textarea readonly onclick="this.select()"><?= $e($hash) ?></textarea><?php endif; ?>
</body></html>
