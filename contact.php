<?php
/*
 * ORAFON quote / contact form handler.
 * GENERATED at build time from content/settings/site.yml — edit the settings in /admin, not this file.
 * Works on PHP 7.0+. Sends plain-text mail through the server's mail() (Plesk mail server).
 *
 * Spam protection (no third-party service, nothing extra for visitors to do):
 *  1. Signed one-time token: the page fetches GET /contact.php?token=1 (assets/js/cart.js FormGuard);
 *     a POST without a valid, unused, not-too-new / not-too-old token is not sent.
 *  2. Human interaction flag (keyboard/touch/mouse inside the form) and a hidden honeypot field.
 *  3. Content rules: no links in name/company/phone, at most one link in the message, no HTML/BBCode links.
 *  4. Limits: per visitor per hour and per day, and for the whole site per hour; identical repeats are dropped.
 * Suspected bots get the normal "thanks" page so they learn nothing; only the reason (no personal data) is logged.
 */
const MAIL_TO = 'it@km-chemical.co.th';
const MAIL_FROM = 'no-reply@orafon.co.th';
const MAX_PER_HOUR = 5;          // one visitor (IP)
const MAX_PER_DAY = 15;          // one visitor (IP)
const MAX_SITE_PER_HOUR = 40;    // everyone together
const TOKEN_MIN_AGE = 4;         // seconds: faster than this is a script
const TOKEN_MAX_AGE = 21600;     // 6 hours: older tokens must be refreshed (reload the page)
const DUPLICATE_WINDOW = 3600;   // same message again within an hour is not sent twice

// Working files live outside the web root when possible.
$dir = dirname(__DIR__) . '/tmp/orafon-contact';
if (!is_dir($dir) && !@mkdir($dir, 0700, true)) $dir = sys_get_temp_dir() . '/orafon-contact';
if (!is_dir($dir)) @mkdir($dir, 0700, true);
$now = time();

function secret_key($dir) {
    $f = $dir . '/secret.key';
    $k = is_file($f) ? trim((string) @file_get_contents($f)) : '';
    if (strlen($k) < 32) {
        $k = bin2hex(random_bytes(32));
        if (@file_put_contents($f, $k, LOCK_EX) === false) $k = hash('sha256', __FILE__ . php_uname() . $dir);
        @chmod($f, 0600);
    }
    return $k;
}
function sign_token($dir, $t, $n) { return hash_hmac('sha256', $t . '|' . $n, secret_key($dir)); }

// --- token for the form (called by the page's script) ---
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'GET' && isset($_GET['token'])) {
    header('Content-Type: application/json; charset=UTF-8');
    header('Cache-Control: no-store, max-age=0');
    header('X-Robots-Tag: noindex');
    $t = $now;
    $n = bin2hex(random_bytes(12));
    echo json_encode(['t' => $t, 'n' => $n, 's' => sign_token($dir, $t, $n)]);
    exit;
}

$lang = (isset($_POST['lang']) && $_POST['lang'] === 'en') ? 'en' : 'th';
$base = $lang === 'en' ? '/en' : '';
// "quote" = sent from the quote list page (/quote/) with an item list; errors go back there
$isQuote = isset($_POST['kind']) && $_POST['kind'] === 'quote';
$back = $isQuote ? '/quote/' : '/contact/';

function go($url) { header('Location: ' . $url, true, 303); exit; }
function done($base, $ok) { global $back; go($base . ($ok ? '/thanks/' : $back . '?error=1')); }
// a suspected bot: show the normal thanks page, send nothing, note only the reason
function spam($reason) {
    global $dir, $base;
    $log = $dir . '/spam.log';
    if (is_file($log) && filesize($log) > 200000) @file_put_contents($log, '', LOCK_EX);
    @file_put_contents($log, date('Y-m-d H:i:s') . ' ' . $reason . "\n", FILE_APPEND | LOCK_EX);
    done($base, true);
}
// small "time list" files: keep entries newer than $window, optionally add one
function recent($file, $window, $add = null) {
    $now = time(); $keep = [];
    if (is_file($file)) {
        foreach (explode("\n", (string) @file_get_contents($file)) as $line) {
            $p = explode(' ', trim($line), 2);
            if (count($p) === 2 && (int) $p[0] > $now - $window) $keep[] = $p;
        }
    }
    if ($add !== null) { $keep[] = [$now, $add]; @file_put_contents($file, implode("\n", array_map(function ($p) { return $p[0] . ' ' . $p[1]; }, $keep)), LOCK_EX); }
    return $keep;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') go($base . $back);

// 1) honeypot
if (!empty($_POST['website'])) spam('honeypot');

// 2) token: missing = the page's script did not run (show the error so a real person can retry);
//    forged, reused, too fast = bot
$t = isset($_POST['t']) ? (string) $_POST['t'] : '';
$n = isset($_POST['n']) ? (string) $_POST['n'] : '';
$s = isset($_POST['s']) ? (string) $_POST['s'] : '';
if ($t === '' || $n === '' || $s === '') done($base, false);
if (!ctype_digit($t) || !preg_match('/^[a-f0-9]{24}$/', $n) || !hash_equals(sign_token($dir, $t, $n), $s)) spam('bad-token');
$age = $now - (int) $t;
if ($age < TOKEN_MIN_AGE) spam('too-fast');
if ($age > TOKEN_MAX_AGE) done($base, false);
$used = $dir . '/tokens-used';
foreach (recent($used, TOKEN_MAX_AGE) as $p) { if ($p[1] === $n) spam('token-reused'); }
recent($used, TOKEN_MAX_AGE, $n);

// 3) a person used the form (typed, tapped or clicked inside it)
if (($_POST['hi'] ?? '') !== '1') spam('no-interaction');

function field($key, $max) {
    $v = isset($_POST[$key]) ? trim((string) $_POST[$key]) : '';
    $v = str_replace("\0", '', $v);
    return function_exists('mb_substr') ? mb_substr($v, 0, $max, 'UTF-8') : substr($v, 0, $max);
}
function oneLine($v) { return trim(preg_replace('/[\r\n\t]+/', ' ', $v)); }

$name    = oneLine(field('name', 120));
$company = oneLine(field('company', 160));
$phone   = oneLine(field('phone', 40));
$email   = oneLine(field('email', 160));
$ctype   = oneLine(field('ctype', 80));
$product = oneLine(field('product', 200));
$message = field('message', 3000);
$items   = $isQuote ? trim(field('items', 6000)) : '';
$consent = !empty($_POST['consent']);

if ($name === '' || $phone === '' || !$consent) done($base, false);
if ($isQuote && $items === '') done($base, false);
if (!preg_match('/^[0-9+\-\s().]{6,40}$/', $phone)) done($base, false);
if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) done($base, false);

// 4) content: link spam
$linkRe = '~(https?://|www\.|\[url|<a\s|href=)~i';
if (preg_match($linkRe, $name . ' ' . $company . ' ' . $phone . ' ' . $product)) spam('link-in-field');
if (preg_match('~(\[url|<a\s|href=)~i', $message . ' ' . $items)) spam('html-link');
if (preg_match_all('~(https?://|www\.)~i', $message) > 1) spam('many-links');

// 5) limits: this visitor per hour / per day, whole site per hour
$ip = $_SERVER['REMOTE_ADDR'] ?? '0';
$ipFile = $dir . '/ip-' . hash('sha256', $ip);
if (count(recent($ipFile, 3600)) >= MAX_PER_HOUR || count(recent($ipFile, 86400)) >= MAX_PER_DAY) done($base, false);
$siteFile = $dir . '/site-hour';
if (count(recent($siteFile, 3600)) >= MAX_SITE_PER_HOUR) done($base, false);

// 6) identical message again (double click, refresh, flood): do not send twice
$raw = $phone . '|' . $email . '|' . $message . '|' . $items;
$fingerprint = hash('sha256', function_exists('mb_strtolower') ? mb_strtolower($raw, 'UTF-8') : strtolower($raw));
$dupFile = $dir . '/recent-messages';
foreach (recent($dupFile, DUPLICATE_WINDOW) as $p) { if ($p[1] === $fingerprint) done($base, true); }

recent($ipFile, 86400, 'x');
recent($siteFile, 3600, 'x');
recent($dupFile, DUPLICATE_WINDOW, $fingerprint);

$itemCount = $items === '' ? 0 : count(preg_split('/\r\n|\r|\n/', $items));
$subject = $isQuote
    ? 'ORAFON ขอใบเสนอราคา / Quote request: ' . ($company !== '' ? $company : $name) . " ($itemCount)"
    : 'ORAFON Website: ' . ($product !== '' ? $product : $name);
$body = ($isQuote ? "คำขอใบเสนอราคาจากเว็บไซต์ / Website quote request\n" : "มีการส่งแบบฟอร์มจากเว็บไซต์ / New website enquiry\n")
      . "----------------------------------------\n"
      . "Name:     $name\n"
      . "Company:  $company\n"
      . "Phone:    $phone\n"
      . "Email:    $email\n"
      . "Type:     $ctype\n"
      . "Product:  $product\n"
      . "Language: $lang\n"
      . "----------------------------------------\n"
      . ($isQuote ? "รายการสินค้า / Items ($itemCount):\n" . $items . "\n----------------------------------------\n" : '')
      . $message . "\n\n"
      . "PDPA consent: yes\n"
      . 'Sent: ' . date('Y-m-d H:i:s') . ' · IP: ' . $ip . "\n";

$headers = [
    'From: ORAFON Website <' . MAIL_FROM . '>',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
];
if ($email !== '') $headers[] = 'Reply-To: ' . $email;

$ok = @mail(MAIL_TO, '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, implode("\r\n", $headers), '-f' . MAIL_FROM);
done($base, $ok);
