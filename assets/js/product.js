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

  // pack size picker -> quote / LINE links carry the chosen size
  var name = root.getAttribute("data-name");
  var lineId = root.getAttribute("data-line");
  var contact = root.getAttribute("data-contact");
  var lineMsg = root.getAttribute("data-linemsg");

  function currentSize() {
    var a = document.querySelector(".pkg-opt.active");
    return a ? a.getAttribute("data-label") : "";
  }
  function updateLinks() {
    var size = currentSize();
    var qs = "?product=" + encodeURIComponent(name) + (size ? "&size=" + encodeURIComponent(size) : "");
    document.querySelectorAll(".js-quote").forEach(function (a) { a.href = contact + qs; });
    if (lineId) {
      var text = lineMsg + " " + name + (size ? " — " + size : "");
      document.querySelectorAll(".js-line").forEach(function (a) {
        a.href = "https://line.me/R/oaMessage/" + encodeURIComponent(lineId) + "/?" + encodeURIComponent(text);
      });
    }
  }
  document.querySelectorAll(".pkg-opt").forEach(function (o) {
    o.addEventListener("click", function () {
      document.querySelectorAll(".pkg-opt").forEach(function (x) {
        x.classList.toggle("active", x === o);
        x.setAttribute("aria-pressed", x === o);
      });
      updateLinks();
    });
  });
  updateLinks();
})();
