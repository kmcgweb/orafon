// Contact page: prefill from ?product=&size=, show server error, keep LINE/mailto in sync with the form
(function () {
  var form = document.getElementById("quoteForm");
  if (!form) return;
  var params = new URLSearchParams(location.search);
  var product = form.querySelector("[name=product]");
  var message = form.querySelector("[name=message]");

  var p = params.get("product") || "";
  var size = params.get("size") || "";
  if (p) product.value = p;
  if (size && !message.value) message.value = size + "\n";
  if (params.get("error")) document.getElementById("formErr").hidden = false;


  // spam guard: signed token + "a person used the form" flag (cart.js)
  if (window.FormGuard) window.FormGuard(form);

  var lineId = form.getAttribute("data-line");
  var lineMsg = form.getAttribute("data-linemsg");
  function sync() {
    var what = [product.value, message.value.trim()].filter(Boolean).join(" — ");
    if (lineId) {
      form.querySelectorAll(".js-line").forEach(function (a) {
        a.href = "https://line.me/R/oaMessage/" + encodeURIComponent(lineId) + "/?" + encodeURIComponent(lineMsg + (what ? " " + what : ""));
      });
    }
    form.querySelectorAll(".js-mail").forEach(function (a) {
      var base = a.href.split("?")[0];
      a.href = base + (what ? "?subject=" + encodeURIComponent(product.value || "Enquiry") + "&body=" + encodeURIComponent(what) : "");
    });
  }
  product.addEventListener("input", sync);
  message.addEventListener("input", sync);
  sync();
})();

// Contact map: the Google embed is heavy, so load it only after the page itself has finished,
// when the map is near the screen; the placeholder stays until the map has painted.
(function () {
  var box = document.querySelector(".ct-map");
  var f = box && box.querySelector("iframe[data-src]");
  if (!f) return;
  var started = false;
  function go() {
    if (started) return; started = true;
    f.addEventListener("load", function () { box.classList.add("ready"); });
    f.src = f.getAttribute("data-src");
  }
  function whenNear() {
    if (!("IntersectionObserver" in window)) return go();
    var io = new IntersectionObserver(function (es) {
      if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); go(); }
    }, { rootMargin: "400px 0px" });
    io.observe(box);
  }
  if (document.readyState === "complete") whenNear();
  else window.addEventListener("load", whenNear);
})();
