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
