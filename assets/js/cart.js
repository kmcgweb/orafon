// Quote list ("cart" for quotations): kept in localStorage, shared by every page.
// Item: { id: slug|size, slug, name, url, img, size, qty }. No prices — the list is sent as a quote request.
(function () {
  var KEY = "orafon-quote";
  var SENT = "orafon-quote-sent";

  function read() {
    try { var v = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return []; }
  }
  function write(items) {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) {}
    badge();
    document.dispatchEvent(new CustomEvent("quote:change", { detail: items }));
  }
  function clampQty(n) { n = parseInt(n, 10); return n > 0 ? Math.min(n, 9999) : 0; }

  var api = {
    items: read,
    count: function () { return read().reduce(function (n, i) { return n + 1; }, 0); },
    // add (or increase) several lines at once
    add: function (lines) {
      var items = read();
      lines.forEach(function (l) {
        var q = clampQty(l.qty); if (!q) return;
        var id = l.slug + "|" + (l.size || "");
        var hit = items.filter(function (i) { return i.id === id; })[0];
        if (hit) hit.qty = clampQty(hit.qty + q);
        else items.push({ id: id, slug: l.slug, name: l.name, url: l.url, img: l.img || "", size: l.size || "", qty: q });
      });
      write(items);
    },
    setQty: function (id, qty) {
      var q = clampQty(qty);
      write(read().map(function (i) { if (i.id === id) i.qty = q || 1; return i; }));
    },
    remove: function (id) { write(read().filter(function (i) { return i.id !== id; })); },
    clear: function () { write([]); },
    // the quote page sets this before submitting; the thanks page clears the list
    markSent: function () { try { sessionStorage.setItem(SENT, "1"); } catch (e) {} },
  };
  window.QuoteCart = api;

  function badge() {
    var n = read().length;
    document.querySelectorAll("[data-quote-count]").forEach(function (el) {
      el.textContent = n;
      el.hidden = !n;
    });
  }

  // small confirmation after adding
  var toastTimer;
  api.toast = function (html) {
    var t = document.getElementById("quoteToast");
    if (!t) {
      t = document.createElement("div");
      t.id = "quoteToast"; t.className = "quote-toast"; t.setAttribute("role", "status");
      document.body.appendChild(t);
    }
    t.innerHTML = html;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 4000);
  };

  // thanks page after a quote was sent: empty the list
  if (document.body.classList.contains("page-thanks")) {
    try { if (sessionStorage.getItem(SENT)) { sessionStorage.removeItem(SENT); api.clear(); } } catch (e) {}
  }
  // keep tabs in sync
  window.addEventListener("storage", function (e) { if (e.key === KEY) { badge(); document.dispatchEvent(new CustomEvent("quote:change", { detail: read() })); } });
  badge();
})();
