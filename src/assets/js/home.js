// Home hero (corporate split slider): parallax slide of the picture layers on the left and the copy in the diagonal panel,
// with numbered tabs whose line fills over the slide's time. Autoplay pauses on hover/focus/hidden tab;
// arrows, swipe and keyboard also move it. Motion is dropped for prefers-reduced-motion.
(function () {
  var root = document.getElementById("heroSlider");
  if (!root) return;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var slides = Array.prototype.slice.call(root.querySelectorAll(".dk-slide"));
  var texts = Array.prototype.slice.call(root.querySelectorAll(".dk-text"));
  var tabs = Array.prototype.slice.call(root.querySelectorAll(".dk-dots button"));
  var i = 0, timer = null, DELAY = 7000;
  root.style.setProperty("--delay", DELAY + "ms");

  // GWP counts up when its slide comes in
  function countUp(el) {
    var end = parseFloat(String(el.getAttribute("data-count")).replace(/[^0-9.]/g, ""));
    if (!end || reduce) return;
    var t0 = null, dur = 1100;
    function step(t) {
      if (!t0) t0 = t;
      var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(end * e).toLocaleString("en-US");
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function go(n, dir) {
    if (!texts.length) return;
    var from = i;
    i = (n + texts.length) % texts.length;
    // direction of travel drives which side layers enter from and leave to
    if (!dir) dir = n < from ? -1 : 1;
    root.style.setProperty("--dir", dir);
    if (from !== i && slides[i]) {
      slides[i].classList.add("prep");          // park it on the entry side without animating
      void slides[i].offsetWidth;
      slides[i].classList.remove("prep");
      slides.forEach(function (s, k) { s.classList.toggle("leaving", k === from); });
      clearTimeout(go.t);
      go.t = setTimeout(function () { slides.forEach(function (s) { s.classList.remove("leaving"); }); }, 1400);
    }
    texts.forEach(function (t, k) {
      var on = k === i;
      t.classList.toggle("active", on);
      t.setAttribute("aria-hidden", on ? "false" : "true");
      t.querySelectorAll("a,button").forEach(function (el) { el.tabIndex = on ? 0 : -1; });
    });
    slides.forEach(function (s, k) { s.classList.toggle("active", k === i); });
    // each slide has its own panel colour
    var t = texts[i];
    if (t && t.getAttribute("data-p1")) {
      root.style.setProperty("--panel", t.getAttribute("data-p1"));
      root.style.setProperty("--panel2", t.getAttribute("data-p2"));
    }
    tabs.forEach(function (b, k) {
      b.classList.remove("active");
      b.setAttribute("aria-selected", k === i);
    });
    // restart the progress line on the active tab
    if (tabs[i]) { void tabs[i].offsetWidth; tabs[i].classList.add("active"); }
    texts[i].querySelectorAll("[data-count]").forEach(countUp);
  }
  function play() { if (!reduce && texts.length > 1) { stop(); root.classList.remove("paused"); timer = setInterval(function () { go(i + 1, 1); }, DELAY); } }
  function stop() { if (timer) clearInterval(timer); timer = null; root.classList.add("paused"); }

  var prev = root.querySelector(".dk-arrow.prev"), next = root.querySelector(".dk-arrow.next");
  if (prev) prev.addEventListener("click", function () { go(i - 1, -1); play(); });
  if (next) next.addEventListener("click", function () { go(i + 1, 1); play(); });
  tabs.forEach(function (b, k) { b.addEventListener("click", function () { go(k); play(); }); });

  root.addEventListener("mouseenter", stop);
  root.addEventListener("mouseleave", play);
  root.addEventListener("focusin", stop);
  root.addEventListener("focusout", play);
  document.addEventListener("visibilitychange", function () { document.hidden ? stop() : play(); });
  root.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") go(i - 1, -1); else if (e.key === "ArrowRight") go(i + 1, 1);
  });
  var x0 = null;
  root.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; stop(); }, { passive: true });
  root.addEventListener("touchend", function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) { if (dx < 0) go(i + 1, 1); else go(i - 1, -1); }
    x0 = null; play();
  });

  // mouse parallax on the picture side: layers drift against each other as the pointer moves
  var media = root.querySelector(".dk-media"), raf = 0;
  if (media && !reduce && window.matchMedia("(hover: hover)").matches) {
    root.addEventListener("mousemove", function (e) {
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        var r = root.getBoundingClientRect();
        root.style.setProperty("--mx", (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
        root.style.setProperty("--my", (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
      });
    });
    root.addEventListener("mouseleave", function () { root.style.setProperty("--mx", 0); root.style.setProperty("--my", 0); });
  }

  go(0, 1);
  play();
})();

// wide banner: once it is on screen, the orbs glide in and settle, then the logo comes into focus (CSS does the motion)
(function () {
  var wb = document.querySelector(".wide-banner");
  if (!wb || !wb.querySelector(".wb-bg") || !("IntersectionObserver" in window)) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  wb.classList.add("wb-anim");
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { wb.classList.add("in"); io.disconnect(); } });
  }, { threshold: 0.35 });
  io.observe(wb);
})();
