// Generic list filter used by Technical Center pages.
// Markup: [data-filter] root → rows [data-f-group="key"] of .filter buttons (data-v), optional input[data-f-search],
// items [data-f-item] with data-<key> and data-text, count [data-f-count data-tpl="… {n} …"], empty box [data-f-empty].
// URL query (?key=value&q=) preselects filters.
(function () {
  document.querySelectorAll("[data-filter]").forEach(function (root) {
    var items = Array.prototype.slice.call(root.querySelectorAll("[data-f-item]"));
    var search = root.querySelector("[data-f-search]");
    var count = root.querySelector("[data-f-count]");
    var empty = root.querySelector("[data-f-empty]");
    var groups = Array.prototype.slice.call(root.querySelectorAll("[data-f-group]"));
    var state = { q: "" };
    var params = new URLSearchParams(location.search);

    groups.forEach(function (g) {
      var key = g.getAttribute("data-f-group");
      var want = params.get(key) || "";
      var exists = g.querySelector('.filter[data-v="' + want + '"]');
      state[key] = exists ? want : "";
    });
    if (search) { state.q = params.get("q") || ""; search.value = state.q; }

    function apply() {
      var terms = state.q.toLowerCase().trim().split(/\s+/).filter(Boolean);
      var n = 0;
      items.forEach(function (it) {
        var ok = groups.every(function (g) {
          var key = g.getAttribute("data-f-group");
          return !state[key] || (" " + (it.getAttribute("data-" + key) || "") + " ").indexOf(" " + state[key] + " ") !== -1;
        }) && terms.every(function (t) { return (it.getAttribute("data-text") || "").indexOf(t) !== -1; });
        it.hidden = !ok;
        if (ok) n++;
      });
      if (count) count.textContent = count.getAttribute("data-tpl").replace("{n}", n);
      if (empty) empty.hidden = n > 0;
      groups.forEach(function (g) {
        var key = g.getAttribute("data-f-group");
        g.querySelectorAll(".filter").forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-v") === state[key]); });
      });
      var p = new URLSearchParams();
      Object.keys(state).forEach(function (k) { if (state[k]) p.set(k, state[k]); });
      history.replaceState(null, "", location.pathname + (p.toString() ? "?" + p : "") + location.hash);
    }

    root.addEventListener("click", function (e) {
      var b = e.target.closest("[data-f-group] .filter");
      if (!b) return;
      state[b.closest("[data-f-group]").getAttribute("data-f-group")] = b.getAttribute("data-v");
      apply();
    });
    if (search) search.addEventListener("input", function () { state.q = search.value; apply(); });
    apply();
  });
})();
