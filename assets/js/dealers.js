// Dealer locator (/dealers/): text + province filter, "near me" distance sort, and a Leaflet map whose pins
// stay in sync with the list (click a shop -> fly to its pin; click a pin -> highlight the shop).
(function () {
  var list = document.getElementById("dlList");
  if (!list) return;
  var items = Array.prototype.slice.call(list.querySelectorAll(".dl-item"));
  var q = document.getElementById("dlq");
  var prov = document.getElementById("dlProv");
  var near = document.getElementById("dlNear");
  var count = document.getElementById("dlCount");
  var empty = document.getElementById("dlEmpty");
  var msg = document.getElementById("dlMsg");
  var me = null, map = null, pins = {}, meMarker = null;

  function km(a, b, c, d) {
    var r = Math.PI / 180, x = Math.sin((c - a) * r / 2), y = Math.sin((d - b) * r / 2);
    return 12742 * Math.asin(Math.sqrt(x * x + Math.cos(a * r) * Math.cos(c * r) * y * y));
  }
  function pos(el) { return { lat: parseFloat(el.getAttribute("data-lat")), lng: parseFloat(el.getAttribute("data-lng")) }; }

  function apply() {
    var terms = q.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
    var pv = prov.value, n = 0, shown = [];
    items.forEach(function (el) {
      var ok = (!pv || el.getAttribute("data-prov") === pv) &&
        terms.every(function (t) { return el.getAttribute("data-text").indexOf(t) !== -1; });
      el.hidden = !ok;
      var pin = pins[el.getAttribute("data-id")];
      if (pin && map) { ok ? pin.addTo(map) : pin.remove(); }
      if (ok) { n++; shown.push(el); }
    });
    count.textContent = count.getAttribute("data-tpl").replace("{n}", n);
    if (items.length) {
      empty.hidden = n > 0;
      empty.querySelector("p").textContent = empty.getAttribute("data-none");
    }
    fit(shown);
  }

  function fit(shown) {
    if (!map) return;
    var pts = shown.map(pos).filter(function (p) { return !isNaN(p.lat) && !isNaN(p.lng); }).map(function (p) { return [p.lat, p.lng]; });
    if (me) pts.push([me.lat, me.lng]);
    if (pts.length === 1) map.flyTo(pts[0], 12, { duration: 0.8 });
    else if (pts.length) map.flyToBounds(pts, { padding: [40, 40], maxZoom: 12, duration: 0.8 });
  }

  function select(id, fly) {
    items.forEach(function (el) { el.classList.toggle("on", el.getAttribute("data-id") === id); });
    var el = list.querySelector('[data-id="' + id + '"]');
    var pin = pins[id];
    if (pin && map) {
      if (fly) map.flyTo(pin.getLatLng(), 14, { duration: 0.8 });
      pin.openPopup();
    }
    if (el && !fly) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  q.addEventListener("input", apply);
  prov.addEventListener("change", apply);
  items.forEach(function (el) {
    var go = function () { select(el.getAttribute("data-id"), true); };
    el.addEventListener("click", function (e) { if (!e.target.closest("a")) go(); });
    el.addEventListener("keydown", function (e) { if (e.key === "Enter") go(); });
  });

  // near me: sort shops by distance and show it on each card
  near.addEventListener("click", function () {
    if (!navigator.geolocation) return say(near.getAttribute("data-fail"));
    var label = near.querySelector("span"), txt = label.textContent;
    label.textContent = near.getAttribute("data-busy");
    near.disabled = true;
    navigator.geolocation.getCurrentPosition(function (p) {
      label.textContent = txt; near.disabled = false; near.classList.add("on"); say("");
      me = { lat: p.coords.latitude, lng: p.coords.longitude };
      items.forEach(function (el) {
        var d = pos(el), k = isNaN(d.lat) ? Infinity : km(me.lat, me.lng, d.lat, d.lng);
        el._km = k;
        var tag = el.querySelector(".dl-km");
        if (isFinite(k)) { tag.textContent = (k < 10 ? k.toFixed(1) : Math.round(k)) + " " + (document.documentElement.lang === "th" ? "กม." : "km"); tag.hidden = false; }
      });
      items.sort(function (a, b) { return a._km - b._km; }).forEach(function (el) { list.appendChild(el); });
      if (map && window.L) {
        if (meMarker) meMarker.remove();
        meMarker = L.marker([me.lat, me.lng], { icon: L.divIcon({ className: "dl-me", iconSize: [18, 18] }) }).addTo(map);
      }
      apply();
    }, function () {
      label.textContent = txt; near.disabled = false;
      say(near.getAttribute("data-fail"));
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 });
  });
  function say(t) { msg.textContent = t; msg.hidden = !t; }

  // map (Leaflet loads deferred from the CDN; without it the list still works)
  function initMap() {
    if (!window.L || map) return;
    map = L.map("dlMap", { scrollWheelZoom: false, zoomControl: true, attributionControl: true }).setView([13.2, 100.9], 6);
    // OpenStreetMap tiles, toned down to grey in CSS (.dl-map .leaflet-tile-pane) so the pins carry the colour
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
    items.forEach(function (el) {
      var p = pos(el);
      if (isNaN(p.lat) || isNaN(p.lng)) return;
      var id = el.getAttribute("data-id");
      var name = el.querySelector("h3").textContent.trim();
      var where = el.querySelector(".dl-where").textContent;
      var go = el.querySelector(".dl-actions .go");
      var pop = document.createElement("div");
      pop.className = "dl-pop";
      var b = document.createElement("b"); b.textContent = name; pop.appendChild(b);
      var s = document.createElement("span"); s.textContent = where; pop.appendChild(s);
      if (go) { var a = go.cloneNode(true); pop.appendChild(a); }
      pins[id] = L.marker([p.lat, p.lng], { icon: L.divIcon({ className: "dl-marker", html: "<i></i>", iconSize: [34, 42], iconAnchor: [17, 40], popupAnchor: [0, -38] }) })
        .bindPopup(pop, { closeButton: false, offset: [0, 0] })
        .on("click", function () { select(id, false); })
        .addTo(map);
    });
    apply();
  }
  if (window.L) initMap(); else window.addEventListener("load", initMap);
  apply();
})();
