// Product page: gallery thumbs, tabs, "show more", pack-size picker, quote/LINE links
(function () {
  var root = document.getElementById("product");
  if (!root) return;

  // gallery
  var mainImg = document.getElementById("mainImg");
  document.querySelectorAll(".thumb").forEach(function (t) {
    t.addEventListener("click", function () {
      document.querySelectorAll(".thumb").forEach(function (x) { x.classList.remove("active"); });
      t.classList.add("active");
      if (mainImg) mainImg.src = t.getAttribute("data-src");
    });
  });

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
