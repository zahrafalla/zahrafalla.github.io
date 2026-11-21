/* =============================================================================
   zf.js — behaviour for the grid-board design
   - theme toggle (light / dark, remembered)
   - mobile menu
   - grid snapping: every box is rounded up to whole cells so its edges sit
     exactly on the board's grid lines
   - a grid cell follows the pointer
   - rotating word in the hero, CV index highlighting, PhD "sky" drawing
   ============================================================================= */
(function () {
  "use strict";
  var root = document.documentElement;
  var $ = function (s, el) {
    return (el || document).querySelector(s);
  };
  var $$ = function (s, el) {
    return Array.prototype.slice.call((el || document).querySelectorAll(s));
  };
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- theme ---------- */
  var themeBtn = $("#zf-theme");
  function syncThemeLabel() {
    if (!themeBtn) return;
    var dark = root.getAttribute("data-theme") === "dark";
    var lbl = themeBtn.querySelector("span");
    if (lbl) lbl.textContent = dark ? "Light" : "Dark";
  }
  function setTheme(t, persist) {
    root.setAttribute("data-theme", t);
    if (persist) {
      try {
        localStorage.setItem("zf-theme", t);
      } catch (e) {}
    }
    syncThemeLabel();
    document.dispatchEvent(new CustomEvent("zf:theme"));
  }
  syncThemeLabel();
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      setTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark", true);
    });
  }

  /* ---------- mobile menu ---------- */
  var burger = $("#zf-burger"),
    links = $("#zf-links");
  if (burger && links) {
    burger.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      burger.textContent = open ? "Close" : "Menu";
    });
    $$("a", links).forEach(function (a) {
      a.addEventListener("click", function () {
        links.classList.remove("open");
        burger.setAttribute("aria-expanded", "false");
        burger.textContent = "Menu";
      });
    });
  }

  /* ---------- grid geometry ---------- */
  var board = $("#zf-board");
  var cell = 48;
  function cols() {
    return parseInt(getComputedStyle(root).getPropertyValue("--cols"), 10) || 26;
  }
  function gutter() {
    return parseFloat(getComputedStyle(root).getPropertyValue("--gut")) || 24;
  }
  function measureCell() {
    var w = root.clientWidth; // excludes the scrollbar, unlike 100vw
    cell = Math.max(24, Math.min(48, Math.floor((w - 2 * gutter()) / cols())));
    root.style.setProperty("--cell", cell + "px");
  }

  /* boxes snap to whole cells: height = n·cell + 1 (the extra pixel is the
     closing border, cancelled by the box's -1px bottom margin) */
  var SNAP = ".zf-board > main .b, .zf-board > main .snap, .zf-board > main > .phd-app, .zf-foot .b";
  var snapping = false;
  function snapAll() {
    if (!board) return;
    snapping = true;
    var els = $$(SNAP).filter(function (el) {
      return el.offsetParent !== null || getComputedStyle(el).position === "fixed";
    });
    els.forEach(function (el) {
      el.style.minHeight = "";
    });
    var hs = els.map(function (el) {
      return el.getBoundingClientRect().height;
    });
    els.forEach(function (el, i) {
      var n = Math.max(1, Math.ceil((hs[i] - 1) / cell - 0.02));
      el.style.minHeight = n * cell + 1 + "px";
    });
    snapping = false;
  }
  var queued = false;
  function queueSnap() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () {
      queued = false;
      snapAll();
    });
  }
  function relayout() {
    measureCell();
    snapAll();
  }
  relayout();
  root.classList.add("zf-ready");
  window.addEventListener("resize", relayout);
  window.addEventListener("load", relayout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
  if ("ResizeObserver" in window) {
    var ro = new ResizeObserver(function () {
      if (!snapping) queueSnap();
    });
    // also catches PhD app pages, which render their content after load
    $$(SNAP).forEach(function (el) {
      ro.observe(el);
    });
  }
  $$("img").forEach(function (img) {
    if (!img.complete) img.addEventListener("load", queueSnap);
  });

  /* ---------- the cell under the pointer ---------- */
  var hc = $(".zf-hovercell");
  if (board && hc && window.matchMedia("(pointer: fine)").matches && !reduced) {
    board.addEventListener("pointermove", function (e) {
      var r = board.getBoundingClientRect();
      var x = Math.floor((e.clientX - r.left) / cell),
        y = Math.floor((e.clientY - r.top) / cell);
      hc.style.transform = "translate(" + (x * cell + 1) + "px," + (y * cell + 1) + "px)";
      hc.classList.add("on");
    });
    board.addEventListener("pointerleave", function () {
      hc.classList.remove("on");
    });
  }

  /* ---------- rotating word ---------- */
  $$(".zf-rotate[data-words]").forEach(function (el) {
    var words = el.getAttribute("data-words").split("|"),
      i = 0;
    if (words.length < 2 || reduced) return;
    setInterval(function () {
      i = (i + 1) % words.length;
      el.textContent = words[i];
    }, 2200);
  });

  /* ---------- CV index: highlight the section in view ---------- */
  var idx = $$(".zf-cv-index a");
  if (idx.length && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          idx.forEach(function (a) {
            a.classList.toggle("is-active", a.getAttribute("href") === "#" + en.target.id);
          });
        });
      },
      { rootMargin: "-30% 0px -60% 0px" }
    );
    $$(".zf-cv-sec").forEach(function (s) {
      io.observe(s);
    });
  }

  /* ---------- PhD "sky": papers on grid points, linked by shared ideas ---------- */
  $$("canvas[data-sky]").forEach(function (cv) {
    var ctx = cv.getContext("2d");
    var themes = ["--c-collaborative", "--c-embodied", "--c-learning", "--c-mathematics", "--c-vr"];
    var seed = 7;
    function rnd() {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    }
    var nodes = [],
      edges = [],
      W = 0,
      H = 0,
      dpr = 1,
      t0 = performance.now();
    function css(n) {
      return getComputedStyle(root).getPropertyValue(n).trim();
    }
    function build() {
      var r = cv.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = r.width;
      H = r.height;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      seed = 7;
      nodes = [];
      edges = [];
      var gx = Math.floor(W / cell),
        gy = Math.floor(H / cell);
      var used = {};
      var count = Math.min(26, Math.max(8, Math.round(gx * gy * 0.22)));
      for (var k = 0; k < count * 3 && nodes.length < count; k++) {
        var x = 1 + Math.floor(rnd() * (gx - 1)),
          y = 1 + Math.floor(rnd() * (gy - 1));
        if (used[x + "," + y]) continue;
        used[x + "," + y] = 1;
        nodes.push({ x: x * cell, y: y * cell, c: themes[Math.floor(rnd() * themes.length)], s: rnd() < 0.2 });
      }
      nodes.forEach(function (a, ai) {
        nodes
          .map(function (b, bi) {
            return { bi: bi, d: Math.hypot(a.x - b.x, a.y - b.y) };
          })
          .filter(function (o) {
            return o.bi > ai;
          })
          .sort(function (p, q) {
            return p.d - q.d;
          })
          .slice(0, 2)
          .forEach(function (o) {
            if (o.d < cell * 4.5) edges.push([ai, o.bi]);
          });
      });
    }
    function draw(now) {
      var ink = css("--ink"),
        red = css("--red");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1;
      edges.forEach(function (e) {
        var a = nodes[e[0]],
          b = nodes[e[1]];
        ctx.beginPath();
        // orthogonal "circuit" path along the grid lines
        ctx.moveTo(a.x + 0.5, a.y + 0.5);
        ctx.lineTo(b.x + 0.5, a.y + 0.5);
        ctx.lineTo(b.x + 0.5, b.y + 0.5);
        ctx.stroke();
      });
      // a signal travelling along the links
      if (edges.length) {
        var t = ((now - t0) / 1400) % edges.length,
          e = edges[Math.floor(t)],
          f = t - Math.floor(t),
          a = nodes[e[0]],
          b = nodes[e[1]];
        var lx = Math.abs(b.x - a.x),
          ly = Math.abs(b.y - a.y),
          L = lx + ly || 1,
          d = f * L,
          px,
          py;
        if (d <= lx) {
          px = a.x + Math.sign(b.x - a.x) * d;
          py = a.y;
        } else {
          px = b.x;
          py = a.y + Math.sign(b.y - a.y) * (d - lx);
        }
        ctx.fillStyle = red;
        ctx.fillRect(px - 3, py - 3, 7, 7);
      }
      nodes.forEach(function (n) {
        var sz = n.s ? 14 : 10;
        ctx.fillStyle = css(n.c);
        ctx.fillRect(n.x - sz / 2 + 0.5, n.y - sz / 2 + 0.5, sz, sz);
        ctx.strokeStyle = ink;
        ctx.strokeRect(n.x - sz / 2 + 0.5, n.y - sz / 2 + 0.5, sz, sz);
      });
    }
    var visible = true,
      raf = 0;
    function loop(now) {
      draw(now);
      if (visible && !reduced) raf = requestAnimationFrame(loop);
    }
    function start() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);
    }
    build();
    start();
    window.addEventListener("resize", function () {
      build();
      start();
    });
    document.addEventListener("zf:theme", start);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) {
        visible = en[0].isIntersecting;
        if (visible) start();
      }).observe(cv);
    }
  });
})();
