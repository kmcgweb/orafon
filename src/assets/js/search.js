// Live product search in the header (and the mobile drawer): matching products drop down as you type.
// Index: /search.json (/en/search.json), loaded on first focus. Enter opens the highlighted product,
// or the full results page when nothing is highlighted.
(function () {
  var forms = Array.prototype.slice.call(document.querySelectorAll("form.search, form.dr-search"));
  if (!forms.length) return;
  var lang = document.documentElement.lang === "en" ? "en" : "th";
  var url = lang === "en" ? "/en/search.json" : "/search.json";
  var index = null, loading = null;
  // "R-32", "r32" and "R 32" all match each other
  function norm(s) { return String(s || "").toLowerCase().replace(/[\s\-‑_.()®]/g, ""); }
  function load() {
    if (index || loading) return loading;
    loading = fetch(url).then(function (r) { return r.json(); }).then(function (d) {
      index = d.map(function (p) { p.z = norm(p.n + " " + p.k); p.nz = norm(p.n); return p; });
    }).catch(function () { index = []; });
    return loading;
  }
  function find(q) {
    var words = q.toLowerCase().split(/\s+/).map(norm).filter(Boolean);
    if (!words.length || !index) return [];
    return index.filter(function (p) { return words.every(function (w) { return p.z.indexOf(w) >= 0; }); })
      .map(function (p) { var w = words.join(""); return { p: p, s: p.nz.indexOf(w) === 0 ? 0 : p.nz.indexOf(w) > 0 ? 1 : 2 }; })
      .sort(function (a, b) { return a.s - b.s || a.p.n.localeCompare(b.p.n, undefined, { numeric: true }); })
      .slice(0, 8).map(function (x) { return x.p; });
  }
  function esc(s) { return String(s || "").replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  forms.forEach(function (form) {
    var input = form.querySelector('input[name="q"]');
    if (!input) return;
    var box = document.createElement("div");
    box.className = "sr-pop"; box.hidden = true; box.setAttribute("role", "listbox");
    form.appendChild(box);
    input.setAttribute("autocomplete", "off");
    input.setAttribute("role", "combobox"); input.setAttribute("aria-expanded", "false");
    var sel = -1, results = [];

    function render() {
      var q = input.value.trim();
      if (!q) { close(); return; }
      results = find(q); sel = -1;
      var all = form.getAttribute("action") + "?q=" + encodeURIComponent(q);
      if (!results.length) {
        box.innerHTML = '<p class="sr-none">' + (lang === "en" ? "No products match " : "ไม่พบสินค้าที่ตรงกับ ") + "“" + esc(q) + "”</p>";
      } else {
        box.innerHTML = results.map(function (p, k) {
          return '<a class="sr-item" role="option" id="sr-' + k + '" href="' + esc(p.u) + '">' +
            (p.i ? '<img src="' + esc(p.i) + '" alt="" loading="lazy">' : '<span class="sr-noimg"></span>') +
            '<span class="sr-txt"><b>' + esc(p.n) + '</b><small>' + esc([p.c, p.t].filter(Boolean).join(" · ")) + "</small></span></a>";
        }).join("") + '<a class="sr-all" href="' + esc(all) + '">' + (lang === "en" ? "See all results" : "ดูผลการค้นหาทั้งหมด") + " →</a>";
      }
      box.hidden = false; input.setAttribute("aria-expanded", "true");
    }
    function close() { box.hidden = true; input.setAttribute("aria-expanded", "false"); sel = -1; }
    function mark() {
      Array.prototype.forEach.call(box.querySelectorAll(".sr-item"), function (a, k) { a.classList.toggle("on", k === sel); });
    }

    input.addEventListener("focus", function () { load(); if (input.value.trim()) render(); });
    input.addEventListener("input", function () { if (index) render(); else { var p = load(); if (p) p.then(render); } });
    input.addEventListener("keydown", function (e) {
      if (box.hidden) return;
      if (e.key === "ArrowDown") { e.preventDefault(); sel = Math.min(sel + 1, results.length - 1); mark(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); sel = Math.max(sel - 1, -1); mark(); }
      else if (e.key === "Escape") { close(); }
      else if (e.key === "Enter" && sel >= 0 && results[sel]) { e.preventDefault(); location.href = results[sel].u; }
    });
    document.addEventListener("click", function (e) { if (!form.contains(e.target)) close(); });
  });
})();
