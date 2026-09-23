// Client-side filtering for /products/. State is mirrored in the URL (?q=&label=&class=&brand=&ref=)
(function () {
  var bar = document.getElementById("filters");
  var grid = document.getElementById("grid");
  if (!bar || !grid) return;
  var cards = Array.prototype.slice.call(grid.querySelectorAll(".prod-card"));
  var count = document.getElementById("count");
  var empty = document.getElementById("empty");
  var reset = document.getElementById("reset");
  var q = document.getElementById("q");
  var selects = Array.prototype.slice.call(bar.querySelectorAll("select[data-key]"));
  var state = { q: "" };
  var params = new URLSearchParams(location.search);

  q.value = state.q = params.get("q") || "";
  selects.forEach(function (s) {
    var key = s.getAttribute("data-key");
    s.value = params.get(key) || "";
    if (s.selectedIndex < 0) s.value = ""; // unknown value in URL
    state[key] = s.value;
  });

  function has(card, key, v) {
    return (" " + (card.getAttribute("data-" + key) || "") + " ").indexOf(" " + v + " ") !== -1;
  }

  function apply() {
    var terms = state.q.toLowerCase().trim().split(/\s+/).filter(Boolean);
    var n = 0;
    cards.forEach(function (c) {
      var ok = selects.every(function (s) {
        var key = s.getAttribute("data-key");
        return !state[key] || has(c, key === "label" ? "labels" : key, state[key]);
      }) && terms.every(function (t) { return c.dataset.text.indexOf(t) !== -1; });
      c.hidden = !ok;
      if (ok) n++;
    });
    count.textContent = count.dataset.tpl.replace("{n}", n);
    if (cards.length) empty.hidden = n > 0;
    var active = false;
    selects.forEach(function (s) { var on = !!s.value; s.classList.toggle("on", on); active = active || on; });
    reset.hidden = !(active || state.q);
    var p = new URLSearchParams();
    Object.keys(state).forEach(function (k) { if (state[k]) p.set(k, state[k]); });
    history.replaceState(null, "", location.pathname + (p.toString() ? "?" + p : ""));
  }

  selects.forEach(function (s) {
    s.addEventListener("change", function () { state[s.getAttribute("data-key")] = s.value; apply(); });
  });
  q.addEventListener("input", function () { state.q = q.value; apply(); });
  reset.addEventListener("click", function () {
    q.value = state.q = "";
    selects.forEach(function (s) { s.value = ""; state[s.getAttribute("data-key")] = ""; });
    apply();
  });

  apply();
})();
