// Site-wide motion, kept quiet and corporate: sections and cards ease in as they scroll into view
// (staggered within a row), trust numbers count up, the header firms up once the page scrolls,
// and a thin progress line tracks reading position. Everything is skipped for prefers-reduced-motion,
// and without JS nothing is hidden (the hidden state only applies under html.mo).
(function () {
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var root = document.documentElement;
  var header = document.getElementById("siteHeader");

  // header shadow + reading progress (cheap: one rAF per scroll burst)
  var bar = document.createElement("div");
  bar.className = "mo-progress";
  bar.setAttribute("aria-hidden", "true");
  document.body.appendChild(bar);
  var ticking = false;
  function onScroll() {
    ticking = false;
    var y = window.scrollY, max = document.documentElement.scrollHeight - window.innerHeight;
    if (header) header.classList.toggle("is-scrolled", y > 8);
    bar.style.transform = "scaleX(" + (max > 0 ? Math.min(1, y / max) : 0) + ")";
  }
  window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  if (reduce || !("IntersectionObserver" in window)) return;

  // what eases in; siblings of the same parent are staggered by --i
  var SEL = [
    "main .section .kicker", "main .section h2.display", "main .section .lead",
    ".prod-card", ".class-tile", ".brand-card", ".lxp", ".wide-banner", ".trust-item",
    ".dl-item", ".dl-join-card", ".ab-timeline > li", "main .prose > *", ".ab-hero .container > *",
    ".contact-card", ".info-card", ".art-card", ".faq-item"
  ].join(",");
  var items = Array.prototype.slice.call(document.querySelectorAll(SEL)).filter(function (el) {
    return !el.closest(".mega, .mg3, header.site, .lx-hero, [hidden]");
  });
  var groups = new Map();
  items.forEach(function (el) {
    var n = groups.get(el.parentNode) || 0;
    groups.set(el.parentNode, n + 1);
    el.style.setProperty("--i", Math.min(n, 7));
    el.classList.add("mo-rv");
    if (el.matches("h2.display")) el.classList.add("mo-ul");
  });
  root.classList.add("mo");

  function reveal(el) {
    el.classList.add("mo-in");
    io.unobserve(el);
    // once it has landed, drop the reveal classes so the element's own hover transitions apply again
    setTimeout(function () { el.classList.remove("mo-rv", "mo-in"); el.classList.add("mo-done"); }, 1400);
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) reveal(e.target); });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  items.forEach(function (el) { io.observe(el); });

  // filtered lists (products, dealers) un-hide cards later: show those straight away
  new MutationObserver(function (list) {
    list.forEach(function (m) { if (m.target.classList && m.target.classList.contains("mo-rv") && !m.target.hidden) reveal(m.target); });
  }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ["hidden"] });

  // count up the leading number of each trust stat ("29+", "1,200", "24/7" keeps its suffix)
  var nums = Array.prototype.slice.call(document.querySelectorAll(".trust-item .n"));
  var cio = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      cio.unobserve(e.target);
      var el = e.target, txt = el.textContent, m = txt.match(/^(\D*)([\d,]+)(.*)$/);
      if (!m) return;
      var end = parseInt(m[2].replace(/,/g, ""), 10), comma = m[2].indexOf(",") !== -1, t0 = null;
      if (!end || end > 1e7) return;
      function step(t) {
        if (!t0) t0 = t;
        var p = Math.min(1, (t - t0) / 1400), v = Math.round(end * (1 - Math.pow(1 - p, 3)));
        el.textContent = m[1] + (comma ? v.toLocaleString("en-US") : v) + m[3];
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }, { threshold: 0.5 });
  nums.forEach(function (n) { cio.observe(n); });
})();
