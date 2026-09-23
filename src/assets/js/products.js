// Client-side filtering for /products/. State is mirrored in the URL (?q=&class=&brand=&ref=)
(function () {
  var bar = document.getElementById("filters");
  var grid = document.getElementById("grid");
  if (!bar || !grid) return;
  var cards = Array.prototype.slice.call(grid.querySelectorAll(".prod-card"));
  var count = document.getElementById("count");
  var empty = document.getElementById("empty");
  var q = document.getElementById("q");
  var state = { q: "", class: "", brand: "", ref: "" };

  var params = new URLSearchParams(location.search);
  Object.keys(state).forEach(function (k) { state[k] = params.get(k) || ""; });
  q.value = state.q;

  function syncButtons() {
    bar.querySelectorAll("[data-group]").forEach(function (row) {
      var g = row.getAttribute("data-group");
      row.querySelectorAll(".filter").forEach(function (b) {
        b.classList.toggle("active", b.getAttribute("data-v") === state[g]);
      });
    });
  }

  function apply() {
    var terms = state.q.toLowerCase().trim().split(/\s+/).filter(Boolean);
    var n = 0;
    cards.forEach(function (c) {
      var ok =
        (!state.class || c.dataset.class === state.class) &&
        (!state.brand || c.dataset.brand === state.brand) &&
        (!state.ref || c.dataset.ref === state.ref) &&
        terms.every(function (t) { return c.dataset.text.indexOf(t) !== -1; });
      c.hidden = !ok;
      if (ok) n++;
    });
    count.textContent = count.dataset.tpl.replace("{n}", n);
    if (cards.length) empty.hidden = n > 0;
    var p = new URLSearchParams();
    Object.keys(state).forEach(function (k) { if (state[k]) p.set(k, state[k]); });
    var qs = p.toString();
    history.replaceState(null, "", location.pathname + (qs ? "?" + qs : ""));
    syncButtons();
  }

  bar.addEventListener("click", function (e) {
    var b = e.target.closest(".filter");
    if (!b) return;
    state[b.closest("[data-group]").getAttribute("data-group")] = b.getAttribute("data-v");
    apply();
  });
  q.addEventListener("input", function () { state.q = q.value; apply(); });

  apply();
})();
