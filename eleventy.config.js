import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import markdownIt from "markdown-it";

const LANGS = ["th", "en"];
const DEFAULT_LANG = "th";
const CONTENT = "content";
const LABELS = ["recommended", "popular", "bestseller", "new"];
const CLASS_ORDER = ["HFO", "HFO Blend", "HFC", "HFC Blend", "HCFC", "HC", "Natural"];
const md = markdownIt({ html: false, linkify: true, breaks: true });

/* ---------- content loading ----------
   Each YAML file is one entry saved by Sveltia CMS in i18n "single_file" form:
     th: { ...all fields... }
     en: { ...translated fields only... }
   localize() merges the requested language over Thai, so an empty English
   field falls back to the Thai value. */
function readYaml(file) {
  return yaml.load(fs.readFileSync(file, "utf8")) || {};
}

function loadFolder(name) {
  const dir = path.join(CONTENT, name);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /\.ya?ml$/.test(f))
    .map((f) => ({ slug: f.replace(/\.ya?ml$/, ""), raw: readYaml(path.join(dir, f)) }));
}

function isEmpty(v) {
  return v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
}

function localize(raw, lang) {
  const out = { ...(raw[DEFAULT_LANG] || {}) };
  if (lang !== DEFAULT_LANG) {
    for (const [k, v] of Object.entries(raw[lang] || {})) if (!isEmpty(v)) out[k] = v;
  }
  return out;
}

const byOrder = (a, b) =>
  (a.order ?? 999) - (b.order ?? 999) || String(a.name || a.number || a.title).localeCompare(String(b.name || b.number || b.title));

function buildDb() {
  const folders = {
    refrigerants: loadFolder("refrigerants"),
    brands: loadFolder("brands"),
    products: loadFolder("products"),
    articles: loadFolder("articles"),
  };
  const file = (p) => (fs.existsSync(path.join(CONTENT, p)) ? readYaml(path.join(CONTENT, p)) : {});
  const singles = {
    site: file("settings/site.yml"),
    home: file("pages/home.yml"),
    about: file("pages/about.yml"),
    privacy: file("pages/privacy.yml"),
    terms: file("pages/terms.yml"),
  };

  const db = {};
  for (const lang of LANGS) {
    const L = (list) => list.map(({ slug, raw }) => ({ ...localize(raw, lang), slug }));
    const refrigerants = L(folders.refrigerants).sort(byOrder);
    const brands = L(folders.brands).sort(byOrder);
    const refMap = Object.fromEntries(refrigerants.map((r) => [r.slug, r]));
    const brandMap = Object.fromEntries(brands.map((b) => [b.slug, b]));

    const products = L(folders.products)
      .filter((p) => !p.draft)
      .map((p) => {
        const ref = refMap[p.refrigerant] || null;
        const brandObj = brandMap[p.brand] || null;
        const searchText = [p.name, p.tagline, ref?.number, ref?.class, brandObj?.name, ...(p.packages || []).map((k) => k.sku)]
          .filter(Boolean).join(" ").toLowerCase();
        // labels: recommended | popular | bestseller | new  (old "featured: true" counts as recommended)
        const labels = LABELS.filter((l) => (p.labels || []).includes(l) || (l === "recommended" && p.featured));
        return { ...p, ref, brandObj, searchText, labels };
      })
      .sort(byOrder);

    for (const r of refrigerants) {
      r.products = products.filter((p) => p.refrigerant === r.slug);
      // where a grade links to: its only product, or the product list filtered to that grade
      r.url = r.products.length === 1 ? `/products/${r.products[0].slug}/` : `/products/?ref=${r.slug}`;
      // "replaces" is free text (R-22 etc.); link it when we have a page for it
      r.replacesLinks = (r.replaces || []).map((num) => ({ number: num, slug: refNumberToSlug(num, refrigerants) }));
      r.replacedBy = refrigerants
        .filter((o) => (o.replaces || []).some((x) => norm(x) === norm(r.number)))
        .map((o) => ({ number: o.number, slug: o.slug }));
    }
    // A–Z with natural number order (R-22 before R-134a); "order" is still used for featured/home
    const az = (a, b) => String(a.name).localeCompare(String(b.name), "en", { numeric: true, sensitivity: "base" });
    const productsAZ = [...products].sort(az);
    for (const b of brands) b.products = productsAZ.filter((p) => p.brand === b.slug);

    const articles = L(folders.articles)
      .filter((a) => !a.draft)
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    const one = (k) => localize(singles[k], lang);
    db[lang] = {
      refrigerants, brands, products, articles, refMap, brandMap,
      productMap: Object.fromEntries(products.map((p) => [p.slug, p])),
      productsAZ,
      featured: products.filter((p) => p.labels.includes("recommended")),
      usedLabels: LABELS.filter((l) => products.some((p) => p.labels.includes(l))),
      classCounts: CLASS_ORDER.map((c) => ({ class: c, n: products.filter((p) => p.ref && p.ref.class === c).length })).filter((x) => x.n),
      refsByClass: CLASS_ORDER.map((c) => ({ class: c, items: refrigerants.filter((r) => r.class === c) })).filter((g) => g.items.length),
      safetyCounts: Object.fromEntries(["A1", "A2L", "A2", "A3", "B1", "B2L"].map((s) => [s, refrigerants.filter((r) => r.safety === s && r.products.length).length])),
      retrofitPairs: refrigerants.reduce((n, r) => n + (r.replaces || []).length, 0),
      documents: products.flatMap((p) => (p.documents || []).map((d) => ({ ...d, product: p }))),
      site: one("site"), home: one("home"), about: one("about"), privacy: one("privacy"), terms: one("terms"),
      classes: [...new Set(refrigerants.filter((r) => r.products.length).map((r) => r.class))],
    };
  }
  return db;
}

const norm = (s) => String(s).toUpperCase().replace(/[^A-Z0-9]/g, "");
function refNumberToSlug(num, refrigerants) {
  const hit = refrigerants.find((r) => norm(r.number) === norm(num));
  return hit ? hit.slug : null;
}

/* pagination helper: one entry per (language × item) */
const perLang = (db, key) => LANGS.flatMap((lang) => db[lang][key].map((item) => ({ lang, item })));

export default function (eleventyConfig) {
  eleventyConfig.addWatchTarget(CONTENT);

  eleventyConfig.addGlobalData("langs", LANGS);
  eleventyConfig.addGlobalData("db", buildDb);
  eleventyConfig.addGlobalData("productPages", () => perLang(buildDb(), "products"));
  eleventyConfig.addGlobalData("refrigerantPages", () => perLang(buildDb(), "refrigerants"));
  eleventyConfig.addGlobalData("brandPages", () => perLang(buildDb(), "brands"));
  eleventyConfig.addGlobalData("articlePages", () => perLang(buildDb(), "articles"));
  eleventyConfig.addGlobalData("buildYear", () => new Date().getFullYear());

  // "/products/" + "en" -> "/en/products/"
  eleventyConfig.addFilter("u", (p, lang) => (lang && lang !== DEFAULT_LANG ? `/${lang}${p}` : p));
  // banner links: external URLs untouched, site paths localized, else the linked product's page
  eleventyConfig.addFilter("bannerHref", (b, lang) => {
    const loc = (p) => (lang && lang !== DEFAULT_LANG ? `/${lang}${p}` : p);
    if (b.url) return /^https?:\/\//.test(b.url) ? b.url : loc(b.url);
    return b.product ? loc(`/products/${b.product}/`) : loc("/products/");
  });
  eleventyConfig.addFilter("md", (s) => (s ? md.render(String(s)) : ""));
  eleventyConfig.addFilter("mdInline", (s) => (s ? md.renderInline(String(s)) : ""));
  eleventyConfig.addFilter("shortNum", (num) => String(num || "").replace(/^R-?/i, ""));
  eleventyConfig.addFilter("kg", (n) => (n === undefined || n === null || n === "" ? "" : Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 })));
  // GWP spans 1 … ~15,000, so bars use a log scale (0–100%)
  eleventyConfig.addFilter("gwpBar", (g) => {
    const n = parseFloat(String(g).replace(/[^0-9.]/g, "")) || 0;
    return Math.max(3, Math.min(100, Math.round((Math.log10(n + 1) / Math.log10(15000)) * 100)));
  });
  // % GWP reduction from old -> new (capped at 99 so tiny values never read as "100%")
  eleventyConfig.addFilter("gwpSaving", (oldG, newG) => {
    const o = parseFloat(String(oldG).replace(/[^0-9.]/g, "")), n = parseFloat(String(newG).replace(/[^0-9.]/g, ""));
    return o > 0 && n >= 0 && n < o ? Math.min(99, Math.round((1 - n / o) * 100)) : 0;
  });
  eleventyConfig.addFilter("json", (v) => JSON.stringify(v).replace(/</g, "\\u003c"));
  eleventyConfig.addFilter("dateFmt", (d, lang) => {
    if (!d) return "";
    const dt = new Date(d);
    return dt.toLocaleDateString(lang === "en" ? "en-GB" : "th-TH", { year: "numeric", month: "long", day: "numeric" });
  });
  eleventyConfig.addFilter("isoDate", (d) => (d ? new Date(d).toISOString().slice(0, 10) : ""));
  eleventyConfig.addFilter("absUrl", (p, site) => `${(site || "").replace(/\/$/, "")}${p}`);
  eleventyConfig.addFilter("phpStr", (s) => String(s ?? "").replace(/\\/g, "\\\\").replace(/'/g, "\\'"));

  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/admin": "admin" });
  eleventyConfig.addPassthroughCopy({ "src/.htaccess": ".htaccess" });

  return {
    dir: { input: "src", output: "_site", includes: "_includes", data: "_data" },
    templateFormats: ["njk"],
    htmlTemplateEngine: "njk",
  };
}
