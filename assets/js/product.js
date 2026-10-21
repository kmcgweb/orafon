// Product page: gallery thumbs, tabs, "show more", pack-size picker, quote/LINE links
(function () {
  var root = document.getElementById("product");
  if (!root) return;

  // gallery: thumbs, prev/next arrows, swipe, click-to-zoom lightbox (arrow keys / Esc)
  var mainImg = document.getElementById("mainImg");
  var thumbs = Array.prototype.slice.call(document.querySelectorAll(".thumb"));
  var srcs = thumbs.length ? thumbs.map(function (t) { return t.getAttribute("data-src"); }) : (mainImg ? [mainImg.getAttribute("src")] : []);
  var cur = 0;
  var lb = document.getElementById("lightbox"), lbImg = document.getElementById("lbImg");
  var galIdx = document.getElementById("galIdx"), lbIdx = document.getElementById("lbIdx");
  function show(i) {
    if (!srcs.length) return;
    cur = (i + srcs.length) % srcs.length;
    if (mainImg) { mainImg.classList.add("swap"); mainImg.src = srcs[cur]; setTimeout(function () { mainImg.classList.remove("swap"); }, 180); }
    if (lbImg) lbImg.src = srcs[cur];
    thumbs.forEach(function (t, k) { t.classList.toggle("active", k === cur); });
    if (galIdx) galIdx.textContent = cur + 1;
    if (lbIdx) lbIdx.textContent = cur + 1;
  }
  thumbs.forEach(function (t, k) { t.addEventListener("click", function () { show(k); }); });
  document.querySelectorAll(".gal-prev, .lb-prev").forEach(function (b) { b.addEventListener("click", function (e) { e.stopPropagation(); show(cur - 1); }); });
  document.querySelectorAll(".gal-next, .lb-next").forEach(function (b) { b.addEventListener("click", function (e) { e.stopPropagation(); show(cur + 1); }); });
  function swipe(el) {
    var x0 = null;
    el.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    el.addEventListener("touchend", function (e) {
      if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 40 && srcs.length > 1) show(cur + (dx < 0 ? 1 : -1));
    });
  }
  var mainBox = document.querySelector(".main-img"); if (mainBox) swipe(mainBox);
  var lastFocus = null;
  function openLb() { if (!lb) return; lastFocus = document.activeElement; lb.hidden = false; document.body.style.overflow = "hidden"; lb.querySelector(".lb-close").focus(); }
  function closeLb() { if (!lb) return; lb.hidden = true; document.body.style.overflow = ""; if (lastFocus) lastFocus.focus(); }
  var opener = document.querySelector(".gal-open"); if (opener) opener.addEventListener("click", openLb);
  if (lb) {
    swipe(lb);
    lb.querySelector(".lb-close").addEventListener("click", closeLb);
    lb.addEventListener("click", function (e) { if (e.target === lb) closeLb(); });
    document.addEventListener("keydown", function (e) {
      if (lb.hidden) return;
      if (e.key === "Escape") closeLb();
      else if (e.key === "ArrowLeft") show(cur - 1);
      else if (e.key === "ArrowRight") show(cur + 1);
    });
  }

  // tabs
  var nav = document.querySelector(".tabs-nav");
  if (nav) {
    nav.addEventListener("click", function (e) {
      var b = e.target.closest(".tab-btn");
      if (!b) return;
      nav.querySelectorAll(".tab-btn").forEach(function (x) {
        x.classList.toggle("active", x === b);
        x.setAttribute("aria-selected", x === b);
      });
      document.querySelectorAll(".tab-pane").forEach(function (p) {
        p.classList.toggle("active", p.getAttribute("data-pane") === b.getAttribute("data-tab"));
      });
    });
  }

  // show more / less
  document.querySelectorAll("[data-collapse]").forEach(function (btn) {
    var el = document.getElementById(btn.getAttribute("data-collapse"));
    if (!el) return;
    if (el.scrollHeight <= 280) { el.classList.remove("clamped"); btn.parentElement.hidden = true; return; }
    btn.addEventListener("click", function () {
      var open = !el.classList.toggle("clamped");
      btn.setAttribute("aria-expanded", open);
      btn.querySelector(".lbl").textContent = btn.getAttribute(open ? "data-less" : "data-more");
      btn.querySelector(".ci").style.transform = open ? "rotate(180deg)" : "";
    });
  });

  // quote list: a quantity per pack size -> "add" puts them in the shared list (cart.js); LINE message carries the same picks
  var d = root.dataset;
  var lineId = d.line, lineMsg = d.linemsg;
  var rows = Array.prototype.slice.call(document.querySelectorAll(".pq-row"));
  var err = document.getElementById("qErr");
  function qtyOf(input) { var n = parseInt(input.value, 10); return n > 0 ? Math.min(n, 9999) : 0; }
  function picks() {
    return rows.map(function (r) { return { size: r.getAttribute("data-size"), qty: qtyOf(r.querySelector("input")) }; })
      .filter(function (x) { return x.qty > 0; });
  }
  function updateLine() {
    if (!lineId) return;
    var what = picks().map(function (x) { return (x.size ? x.size + " " : "") + "× " + x.qty; }).join(", ");
    var text = lineMsg + " " + d.name + (what ? " — " + what : "");
    document.querySelectorAll(".js-line").forEach(function (a) {
      a.href = "https://line.me/R/oaMessage/" + encodeURIComponent(lineId) + "/?" + encodeURIComponent(text);
    });
  }
  rows.forEach(function (r) {
    var input = r.querySelector("input");
    function sync() { r.classList.toggle("has-qty", qtyOf(input) > 0); if (err) err.hidden = true; updateLine(); }
    r.querySelectorAll("[data-step]").forEach(function (b) {
      b.addEventListener("click", function () { input.value = Math.max(0, qtyOf(input) + parseInt(b.getAttribute("data-step"), 10)); sync(); });
    });
    input.addEventListener("input", sync);
    input.addEventListener("blur", function () { input.value = qtyOf(input); });
    sync();
  });
  var addBtn = document.getElementById("addQuote");
  if (addBtn && window.QuoteCart) {
    addBtn.addEventListener("click", function () {
      var list = picks();
      if (!list.length) { if (err) err.hidden = false; return; }
      QuoteCart.add(list.map(function (x) { return { slug: d.slug, name: d.name, url: d.url, img: d.img, size: x.size, qty: x.qty }; }));
      var esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
      QuoteCart.toast('<span>' + esc(d.added) + ': <b>' + esc(d.name) + '</b></span><a href="' + esc(d.quoteUrl) + '">' + esc(d.view) + ' →</a>');
      // reset the pickers (a single size keeps 1)
      rows.forEach(function (r) { var i = r.querySelector("input"); i.value = rows.length === 1 ? 1 : 0; r.classList.toggle("has-qty", rows.length === 1); });
      updateLine();
    });
  }
  updateLine();

  // side menu: a link to a collapsed section opens it; highlight the section in view
  var sideLinks = Array.prototype.slice.call(document.querySelectorAll(".pd-side-link"));
  sideLinks.forEach(function (a) {
    a.addEventListener("click", function () {
      var el = document.querySelector(a.getAttribute("href"));
      if (el && el.tagName === "DETAILS") el.open = true;
    });
  });
  if ("IntersectionObserver" in window && sideLinks.length) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        sideLinks.forEach(function (a) { a.classList.toggle("on", a.getAttribute("href") === "#" + e.target.id); });
      });
    }, { rootMargin: "-30% 0px -60% 0px" });
    sideLinks.forEach(function (a) { var el = document.querySelector(a.getAttribute("href")); if (el) io.observe(el); });
  }
})();
