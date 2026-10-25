// Quote page: render the list from cart.js, edit quantities, and send it with the contact details to /contact.php
(function () {
  var ul = document.getElementById("qtItems");
  if (!ul || !window.QuoteCart) return;
  var form = document.getElementById("qtForm");
  var empty = document.getElementById("qtEmpty");
  var more = document.getElementById("qtMore");
  var clearBtn = document.getElementById("qtClear");
  var count = document.getElementById("qtCount");
  var L = ul.dataset;
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };

  function render() {
    var items = QuoteCart.items();
    var has = items.length > 0;
    empty.hidden = has; form.hidden = !has; more.hidden = !has; clearBtn.hidden = !has;
    count.textContent = has ? "(" + items.length + ")" : "";
    ul.innerHTML = items.map(function (i) {
      return '<li class="qt-item" data-id="' + esc(i.id) + '">' +
        '<a class="qt-img" href="' + esc(i.url) + '">' + (i.img ? '<img src="' + esc(i.img) + '" alt="" loading="lazy">' : "") + "</a>" +
        '<span class="qt-txt"><a href="' + esc(i.url) + '"><b>' + esc(i.name) + "</b></a><span>" + esc(i.size || L.sizeNone) + "</span></span>" +
        '<div class="pd-qty" role="group" aria-label="' + esc(L.qty) + '"><button type="button" data-step="-1" aria-label="−">−</button>' +
        '<input type="number" inputmode="numeric" min="1" max="9999" value="' + i.qty + '" aria-label="' + esc(L.qty) + '">' +
        '<button type="button" data-step="1" aria-label="+">+</button></div>' +
        '<button type="button" class="qt-del" aria-label="' + esc(L.remove) + " " + esc(i.name) + '">✕</button></li>';
    }).join("");
    fill(items);
  }
  // what the server receives: one plain line per item
  function fill(items) {
    document.getElementById("qtItemsField").value = items.map(function (i, n) {
      return (n + 1) + ". " + i.name + (i.size ? " — " + i.size : "") + " × " + i.qty;
    }).join("\n");
    document.getElementById("qtProduct").value = items.length ? items[0].name + (items.length > 1 ? " +" + (items.length - 1) : "") : "";
  }

  ul.addEventListener("click", function (e) {
    var li = e.target.closest(".qt-item"); if (!li) return;
    var id = li.getAttribute("data-id");
    if (e.target.closest(".qt-del")) { QuoteCart.remove(id); return; }
    var step = e.target.closest("[data-step]");
    if (step) {
      var input = li.querySelector("input");
      var v = Math.max(1, (parseInt(input.value, 10) || 1) + parseInt(step.getAttribute("data-step"), 10));
      QuoteCart.setQty(id, v);
    }
  });
  ul.addEventListener("change", function (e) {
    var li = e.target.closest(".qt-item");
    if (li && e.target.matches("input")) QuoteCart.setQty(li.getAttribute("data-id"), e.target.value);
  });
  clearBtn.addEventListener("click", function () { QuoteCart.clear(); });
  document.addEventListener("quote:change", render);

  if (new URLSearchParams(location.search).get("error")) {
    document.getElementById("formErr").hidden = false;
    try { sessionStorage.removeItem("orafon-quote-sent"); } catch (e) {}
  }
  // spam guard: signed token + "a person used the form" flag (cart.js)
  if (window.FormGuard) window.FormGuard(form);
  form.addEventListener("submit", function () { fill(QuoteCart.items()); QuoteCart.markSent(); });
  render();
})();
