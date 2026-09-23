// Site navigation: desktop mega menu (hover + click + keyboard) and the mobile slide-in drawer.
(function () {
  var header = document.getElementById("siteHeader");
  if (!header) return;

  /* ---------- mega menu ---------- */
  var items = Array.prototype.slice.call(header.querySelectorAll("[data-mega]"));
  var canHover = window.matchMedia("(hover: hover) and (min-width: 1024px)");
  var closeTimer = null;

  function setOpen(item, open) {
    item.classList.toggle("open", open);
    item.querySelector("button").setAttribute("aria-expanded", open ? "true" : "false");
  }
  function closeAll(except) { items.forEach(function (it) { if (it !== except) setOpen(it, false); }); }

  items.forEach(function (item) {
    var btn = item.querySelector("button");
    btn.addEventListener("click", function () {
      var open = !item.classList.contains("open");
      closeAll(item);
      setOpen(item, open);
    });
    item.addEventListener("mouseenter", function () {
      if (!canHover.matches) return;
      clearTimeout(closeTimer);
      closeAll(item);
      setOpen(item, true);
    });
    item.addEventListener("mouseleave", function () {
      if (!canHover.matches) return;
      closeTimer = setTimeout(function () { setOpen(item, false); }, 160);
    });
    item.addEventListener("focusout", function (e) {
      if (!item.contains(e.relatedTarget)) setOpen(item, false);
    });
  });
  document.addEventListener("click", function (e) { if (!header.contains(e.target)) closeAll(); });

  /* ---------- products mega: preview card follows the hovered product ---------- */
  var preview = document.getElementById("megaPreview");
  if (preview) {
    var part = function (r) { return preview.querySelector('[data-role="' + r + '"]'); };
    var initial = { href: preview.getAttribute("href"), art: part("art").innerHTML, kicker: part("kicker").textContent,
      name: part("name").textContent, tag: part("tag").textContent, chips: part("chips").innerHTML };
    var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
    // same drawing as the cylinder() macro in partials/macros.njk
    var cyl = function (num, c1, c2) {
      var big = String(num || "").replace(/^R-?/i, "");
      var fs = big.length <= 3 ? 22 : big.length <= 4 ? 17 : 13;
      return '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + esc(num) + '">' +
        '<defs><linearGradient id="g-mega-p" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + c1 + '"/><stop offset="1" stop-color="' + c2 + '"/></linearGradient></defs>' +
        '<rect x="74" y="40" width="52" height="130" rx="16" fill="#fff" stroke="' + c1 + '" stroke-width="3"/>' +
        '<rect x="74" y="40" width="52" height="34" rx="16" fill="url(#g-mega-p)"/><rect x="90" y="24" width="20" height="20" rx="5" fill="' + c1 + '"/>' +
        '<text x="100" y="120" font-family="Plus Jakarta Sans,sans-serif" font-size="' + fs + '" font-weight="800" fill="' + c1 + '" text-anchor="middle">' + esc(big) + '</text>' +
        '<text x="100" y="142" font-family="Plus Jakarta Sans,sans-serif" font-size="11" font-weight="600" fill="' + c2 + '" text-anchor="middle">' + esc(num) + '</text></svg>';
    };
    var current = null, swapTimer = null;
    var show = function (a) {
      if (a === current) return;
      current = a;
      header.querySelectorAll(".mg-list a.previewing").forEach(function (x) { x.classList.remove("previewing"); });
      preview.classList.add("swap");
      clearTimeout(swapTimer);
      swapTimer = setTimeout(function () {
        if (a) {
          a.classList.add("previewing");
          var d = a.dataset;
          preview.setAttribute("href", a.getAttribute("href"));
          part("art").innerHTML = d.img ? '<img src="' + esc(d.img) + '" alt="">' : cyl(d.num, d.c1, d.c2);
          part("kicker").textContent = d.kicker;
          part("name").textContent = d.name;
          part("tag").textContent = d.tag;
          part("chips").innerHTML = (d.chips ? d.chips.split("|") : []).map(function (c) { return "<i>" + esc(c) + "</i>"; }).join("");
        } else {
          preview.setAttribute("href", initial.href);
          part("art").innerHTML = initial.art;
          part("kicker").textContent = initial.kicker;
          part("name").textContent = initial.name;
          part("tag").textContent = initial.tag;
          part("chips").innerHTML = initial.chips;
        }
        preview.classList.remove("swap");
      }, 90);
    };
    header.querySelectorAll(".mg-list a[data-prev]").forEach(function (a) {
      a.addEventListener("mouseenter", function () { show(a); });
      a.addEventListener("focus", function () { show(a); });
    });
    // reopening the menu starts again from the featured product
    var productsItem = preview.closest("[data-mega]");
    new MutationObserver(function () { if (!productsItem.classList.contains("open")) show(null); })
      .observe(productsItem, { attributes: true, attributeFilter: ["class"] });
  }

  /* ---------- drawer ---------- */
  var drawer = document.getElementById("navDrawer");
  var backdrop = document.querySelector(".drawer-backdrop");
  var burger = header.querySelector(".burger");
  var lastFocus = null;

  function openDrawer(focusId) {
    lastFocus = document.activeElement;
    backdrop.hidden = false;
    document.body.classList.add("drawer-open");
    drawer.setAttribute("aria-hidden", "false");
    burger.setAttribute("aria-expanded", "true");
    setTimeout(function () {
      var el = (focusId && document.getElementById(focusId)) || drawer.querySelector(".dr-close");
      if (el) el.focus();
    }, 220);
  }
  function closeDrawer() {
    document.body.classList.remove("drawer-open");
    drawer.setAttribute("aria-hidden", "true");
    burger.setAttribute("aria-expanded", "false");
    setTimeout(function () { backdrop.hidden = true; }, 250);
    if (lastFocus) lastFocus.focus();
  }
  document.querySelectorAll("[data-drawer-open]").forEach(function (b) {
    b.addEventListener("click", function () { openDrawer(b.getAttribute("data-focus")); });
  });
  document.querySelectorAll("[data-drawer-close]").forEach(function (b) { b.addEventListener("click", closeDrawer); });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (document.body.classList.contains("drawer-open")) closeDrawer();
    else closeAll();
  });
  // leaving the mobile layout (e.g. rotating a tablet) closes the drawer
  window.matchMedia("(min-width: 1024px)").addEventListener("change", function (m) {
    if (m.matches && document.body.classList.contains("drawer-open")) closeDrawer();
  });
})();
