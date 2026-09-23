// Home banner slider: crossfade, autoplay (paused on hover/focus/hidden tab), arrows, dots, swipe, keyboard.
(function () {
  var root = document.getElementById("heroSlider");
  if (!root) return;
  var slides = Array.prototype.slice.call(root.querySelectorAll(".hs-slide"));
  if (slides.length < 2) return;
  var dots = Array.prototype.slice.call(root.querySelectorAll(".hs-dots button"));
  var i = 0, timer = null, DELAY = 6000;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function go(n) {
    i = (n + slides.length) % slides.length;
    slides.forEach(function (s, k) {
      var on = k === i;
      s.classList.toggle("active", on);
      s.setAttribute("aria-hidden", on ? "false" : "true");
      s.querySelectorAll("a,button").forEach(function (el) { el.tabIndex = on ? 0 : -1; });
    });
    dots.forEach(function (d, k) { d.classList.toggle("active", k === i); d.setAttribute("aria-selected", k === i); });
  }
  function play() { if (!reduce) { stop(); timer = setInterval(function () { go(i + 1); }, DELAY); } }
  function stop() { if (timer) clearInterval(timer); timer = null; }

  root.querySelector(".hs-nav.prev").addEventListener("click", function () { go(i - 1); play(); });
  root.querySelector(".hs-nav.next").addEventListener("click", function () { go(i + 1); play(); });
  dots.forEach(function (d, k) { d.addEventListener("click", function () { go(k); play(); }); });

  root.addEventListener("mouseenter", stop);
  root.addEventListener("mouseleave", play);
  root.addEventListener("focusin", stop);
  root.addEventListener("focusout", play);
  document.addEventListener("visibilitychange", function () { document.hidden ? stop() : play(); });
  root.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") { go(i - 1); } else if (e.key === "ArrowRight") { go(i + 1); }
  });

  var x0 = null;
  root.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; stop(); }, { passive: true });
  root.addEventListener("touchend", function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) go(dx < 0 ? i + 1 : i - 1);
    x0 = null; play();
  });

  go(0);
  play();
})();
