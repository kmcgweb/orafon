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

  // time the form was opened (simple bot check on the server)
  document.getElementById("ts").value = Math.floor(Date.now() / 1000);

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
