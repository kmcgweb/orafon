# ORAFON website

เว็บแนะนำสินค้าของ บริษัท โอราโนส จำกัด — https://orafon.co.th (ไทย `/` · อังกฤษ `/en/`)

## แก้ไขข้อมูล
- **หลังบ้าน:** https://orafon.co.th/admin/ → "Sign In Using Access Token" (GitHub fine-grained token, สิทธิ์ Contents read/write เฉพาะ repo นี้)
- บันทึกแล้วเว็บอัปเดตเองภายใน ~1–2 นาที (GitHub Actions build → branch `deploy` → Plesk)
- ข้อมูลทั้งหมดอยู่ใน `content/` (แก้ผ่านหลังบ้าน หรือแก้ไฟล์ตรง ๆ แล้ว push ก็ได้)
  - `refrigerants/` ข้อมูลสากลต่อเบอร์น้ำยา · `brands/` · `products/` · `articles/` · `pages/` · `settings/site.yml`

## รันในเครื่อง
```bash
npm install
npm start          # http://localhost:8080 (ดู /admin/ → Work with Local Repository ได้)
npm run build      # สร้างไฟล์ใน _site/
```

## โครงสร้าง
- `eleventy.config.js` โหลด `content/*.yml` (Sveltia i18n single_file: บล็อก `th:` / `en:`) และ filter ต่าง ๆ
- `src/*.njk` หน้าเว็บ · `src/_includes/` layout และ macro · `src/_data/i18n.js` ข้อความ UI สองภาษา
- `src/contact-php.njk` → `/contact.php` ส่งแบบฟอร์มเข้าอีเมล (`form_email` ใน settings)
- `.github/workflows/build.yml` build และ publish ไป branch `deploy` (ห้ามแก้ branch `deploy` ด้วยมือ)
