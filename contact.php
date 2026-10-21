<?php
/*
 * ORAFON quote / contact form handler.
 * GENERATED at build time from content/settings/site.yml — edit the settings in /admin, not this file.
 * Works on PHP 7.0+. Sends plain-text mail through the server's mail() (Plesk mail server).
 */
const MAIL_TO = 'it@km-chemical.co.th';
const MAIL_FROM = 'no-reply@orafon.co.th';
const MAX_PER_HOUR = 5;

$lang = (isset($_POST['lang']) && $_POST['lang'] === 'en') ? 'en' : 'th';
$base = $lang === 'en' ? '/en' : '';
// "quote" = sent from the quote list page (/quote/) with an item list; errors go back there
$isQuote = isset($_POST['kind']) && $_POST['kind'] === 'quote';
$back = $isQuote ? '/quote/' : '/contact/';

function go($url) { header('Location: ' . $url, true, 303); exit; }
function done($base, $ok) { global $back; go($base . ($ok ? '/thanks/' : $back . '?error=1')); }

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') go($base . $back);

// Honeypot filled or submitted too fast: pretend success, send nothing.
if (!empty($_POST['website'])) done($base, true);
$ts = isset($_POST['ts']) ? (int) $_POST['ts'] : 0;
if ($ts > 0 && (time() - $ts) < 3) done($base, true);

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

// Rate limit per IP (stored outside the web root when possible).
$ip = $_SERVER['REMOTE_ADDR'] ?? '0';
$dir = dirname(__DIR__) . '/tmp/orafon-contact';
if (!is_dir($dir) && !@mkdir($dir, 0700, true)) $dir = sys_get_temp_dir() . '/orafon-contact';
if (!is_dir($dir)) @mkdir($dir, 0700, true);
$file = $dir . '/' . hash('sha256', $ip);
$now = time();
$hits = [];
if (is_file($file)) {
    foreach (explode(',', (string) @file_get_contents($file)) as $t) {
        if ((int) $t > $now - 3600) $hits[] = (int) $t;
    }
}
if (count($hits) >= MAX_PER_HOUR) done($base, false);
$hits[] = $now;
@file_put_contents($file, implode(',', $hits), LOCK_EX);

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
