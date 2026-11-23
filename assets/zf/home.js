/* =============================================================================
   home.js — the home page (About)
   - big titles slide up letter by letter; boxes wipe open as they scroll in
   - the rotating word rolls like a slot machine
   - the portrait is revealed cell by cell, on the board's own grid
   - "A decision, live": a drift diffusion model the pointer can push
   - numbers count up; accordions; the "Beyond the lab" preview
   ============================================================================= */
(function () {
  "use strict";
  var root = document.documentElement;
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, el) {
    return (el || document).querySelector(s);
  };
  var $$ = function (s, el) {
    return Array.prototype.slice.call((el || document).querySelectorAll(s));
  };
  function css(n) {
    return getComputedStyle(root).getPropertyValue(n).trim();
  }
  function cellSize() {
    return parseFloat(css("--cell")) || 48;
  }
  function onView(els, fn, margin) {
    if (reduced || !("IntersectionObserver" in window)) {
      els.forEach(fn);
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            io.unobserve(en.target);
            fn(en.target);
          }
        });
      },
      { rootMargin: margin || "0px 0px -10% 0px" }
    );
    els.forEach(function (el) {
      io.observe(el);
    });
  }

  /* ---------- split titles into letters (words stay together) ---------- */
  $$("[data-split]").forEach(function (el) {
    var i = 0;
    var words = el.textContent.trim().split(/\s+/);
    el.setAttribute("aria-label", el.textContent.trim());
    el.innerHTML = words
      .map(function (w) {
        return (
          '<span class="hm-w" aria-hidden="true">' +
          w
            .split("")
            .map(function (ch) {
              return '<span class="hm-ch" style="--i:' + i++ + '">' + ch.replace(/&/, "&amp;").replace(/</, "&lt;") + "</span>";
            })
            .join("") +
          "</span>"
        );
      })
      .join(" ");
    el.classList.add("is-split");
  });
  onView($$("[data-split]"), function (el) {
    el.classList.add("is-in");
  });

  /* ---------- boxes wipe open as they arrive ---------- */
  onView($$(".hm-rv"), function (el) {
    el.classList.add("is-in");
    setTimeout(function () {
      el.classList.add("is-done"); // drop the clip so sticky children and focus rings work
    }, 900);
  });

  /* ---------- the rotating word rolls ---------- */
  $$(".hm-roll").forEach(function (roll) {
    var track = $(".hm-roll-track", roll),
      words = $$("span", track),
      i = 0;
    function size() {
      roll.style.width = words[i].offsetWidth + "px";
      track.style.transform = "translateY(" + -words[i].offsetTop + "px)";
    }
    size();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(size);
    window.addEventListener("resize", size);
    if (reduced || words.length < 2) return;
    setInterval(function () {
      i = (i + 1) % words.length;
      size();
    }, 2300);
  });

  /* ---------- portrait: the grid cells lift off one by one ---------- */
  $$(".hm-portrait").forEach(function (fig) {
    var box = $(".hm-cells", fig);
    function build() {
      var c = cellSize(),
        cols = Math.max(1, Math.round(fig.clientWidth / c)),
        rows = Math.max(1, Math.round(fig.clientHeight / c)),
        n = cols * rows,
        order = [];
      for (var k = 0; k < n; k++) order.push(k);
      // a fixed shuffle, so the reveal looks the same each visit
      var seed = 11;
      for (var j = n - 1; j > 0; j--) {
        seed = (seed * 16807) % 2147483647;
        var r = seed % (j + 1),
          t = order[j];
        order[j] = order[r];
        order[r] = t;
      }
      box.style.gridTemplateColumns = "repeat(" + cols + ", 1fr)";
      box.innerHTML = order
        .map(function (o) {
          return '<i style="--o:' + o + '"></i>';
        })
        .join("");
    }
    build();
    var w = fig.clientWidth;
    window.addEventListener("resize", function () {
      if (fig.clientWidth !== w) {
        w = fig.clientWidth;
        build();
      }
    });
    onView([fig], function () {
      setTimeout(function () {
        fig.classList.add("is-in");
      }, 300);
    });
  });

  /* ---------- count up ---------- */
  onView($$("[data-count]"), function (el) {
    var raw = el.getAttribute("data-count"),
      to = parseFloat(raw);
    if (!isFinite(to) || reduced) return;
    var dec = (raw.split(".")[1] || "").length,
      t0 = null;
    function step(t) {
      if (!t0) t0 = t;
      var f = Math.min(1, (t - t0) / 1100);
      el.textContent = (to * (1 - Math.pow(1 - f, 3))).toFixed(dec);
      if (f < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  });

  /* ---------- glyphs draw themselves; hovering redraws ---------- */
  $$(".hm-glyph").forEach(function (g) {
    g.addEventListener("pointerenter", function () {
      if (reduced) return;
      g.classList.remove("is-draw");
      void g.offsetWidth;
      g.classList.add("is-draw");
    });
  });
  onView($$(".hm-glyph"), function (g) {
    g.classList.add("is-draw");
  });

  /* ---------- accordions (experiments, beyond the lab) ---------- */
  var preview = $("#hm-preview");
  var wide = window.matchMedia("(min-width: 961px)");
  function showPreview(item) {
    if (!preview || !item) return;
    var t = $(".hm-acc-t", item).textContent,
      yr = $(".hm-acc-yr", item).textContent,
      inn = $(".hm-acc-in", item).textContent,
      body = $(".hm-acc-panel ul", item);
    preview.innerHTML =
      '<p class="zf-meta hm-preview-k">' +
      yr +
      "</p><h3>" +
      t +
      "</h3>" +
      (inn.trim() ? '<p class="zf-meta">' + inn + "</p>" : "") +
      (body ? "<ul>" + body.innerHTML + "</ul>" : "");
    preview.classList.remove("is-swap");
    void preview.offsetWidth;
    preview.classList.add("is-swap");
  }
  $$(".hm-acc").forEach(function (acc) {
    var list = acc.classList.contains("hm-acc--list");
    var items = $$(".hm-acc-item", acc);
    function open(item, only) {
      items.forEach(function (it) {
        var on = it === item ? (only ? true : !it.classList.contains("is-open")) : list ? false : it.classList.contains("is-open");
        it.classList.toggle("is-open", on);
        $(".hm-acc-btn", it).setAttribute("aria-expanded", on ? "true" : "false");
      });
      if (list) {
        acc.classList.add("has-active");
        items.forEach(function (it) {
          it.classList.toggle("is-active", it === item);
        });
        showPreview(item);
      }
    }
    items.forEach(function (it) {
      var btn = $(".hm-acc-btn", it);
      btn.addEventListener("click", function () {
        open(it, list && wide.matches);
      });
      if (list)
        btn.addEventListener("pointerenter", function (e) {
          if (e.pointerType === "mouse" && wide.matches) open(it, true);
        });
    });
    if (list) open(items[0], true);
  });

  /* ---------- "A decision, live": a drift diffusion model ---------- */
  var ddm = $("#hm-ddm");
  if (ddm) {
    var cv = $("canvas", ddm),
      ctx = cv.getContext("2d"),
      stage = $(".hm-ddm-stage", ddm),
      flash = $("#hm-ddm-flash"),
      count = $("#hm-ddm-n");
    var W = 0,
      H = 0,
      dpr = 1,
      top = 0,
      bot = 0,
      mid = 0;
    var colors = {};
    var trials = [], // finished paths, drawn faint
      path = [],
      x = 0,
      y = 0,
      drift = 0,
      push = null, // the pointer's push, -1..1
      pause = 0,
      n = 0,
      ups = 0,
      seed = 3;
    function rand() {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    }
    function gauss() {
      var u = rand() || 1e-9,
        v = rand();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }
    function readColors() {
      colors = { ink: css("--ink"), red: css("--red"), paper: css("--paper"), up: css("--m-theory"), down: css("--m-experiment") };
    }
    function resize() {
      var r = stage.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = r.width;
      H = r.height;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      top = Math.round(H * 0.16);
      bot = Math.round(H * 0.84);
      mid = (top + bot) / 2;
      trials = [];
      newTrial();
    }
    function newTrial() {
      x = 10;
      y = mid;
      path = [[x, y]];
      drift = (rand() - 0.5) * 1.2; // each trial has its own evidence strength
    }
    function step() {
      var amp = (bot - top) / 2;
      var d = push === null ? drift : drift * 0.3 + push * 2.2;
      x += W / 150;
      y -= d * amp * 0.012 + gauss() * amp * 0.06;
      path.push([x, y]);
      if (y <= top || y >= bot || x >= W - 10) {
        var up = y <= top || (x >= W - 10 && y < mid);
        y = Math.max(top, Math.min(bot, y));
        path[path.length - 1][1] = y;
        n++;
        if (up) ups++;
        trials.push({ p: path, up: up });
        if (trials.length > 7) trials.shift();
        var ms = Math.round(250 + (x / W) * 1200);
        flash.textContent = (up ? "Left" : "Right") + " · " + ms + " ms";
        flash.className = "hm-ddm-flash is-on " + (up ? "is-up" : "is-down");
        count.textContent = n + (n === 1 ? " decision" : " decisions") + " · " + ups + " ↑ " + (n - ups) + " ↓";
        pause = 34;
      }
    }
    function line(p, color, width, alpha) {
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      p.forEach(function (pt, i) {
        if (i) ctx.lineTo(pt[0], pt[1]);
        else ctx.moveTo(pt[0], pt[1]);
      });
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      // bounds and the start line
      ctx.strokeStyle = colors.ink;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, top + 0.5);
      ctx.lineTo(W, top + 0.5);
      ctx.moveTo(0, bot + 0.5);
      ctx.lineTo(W, bot + 0.5);
      ctx.stroke();
      ctx.setLineDash([3, 4]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(10, mid + 0.5);
      ctx.lineTo(W, mid + 0.5);
      ctx.stroke();
      ctx.setLineDash([]);
      // the pointer's push, as an arrow at the left edge
      if (push !== null) {
        ctx.fillStyle = colors.red;
        var py = mid - push * (bot - top) * 0.4;
        ctx.fillRect(2, Math.min(py, mid), 4, Math.abs(mid - py));
      }
      trials.forEach(function (t, i) {
        line(t.p, t.up ? colors.up : colors.down, 1.25, 0.18 + (0.3 * (i + 1)) / trials.length);
        var e = t.p[t.p.length - 1];
        ctx.fillStyle = t.up ? colors.up : colors.down;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(e[0] - 3, e[1] - 3, 6, 6);
        ctx.globalAlpha = 1;
      });
      line(path, colors.ink, 1.75, 1);
      var h = path[path.length - 1];
      ctx.fillStyle = colors.red;
      ctx.fillRect(h[0] - 4, h[1] - 4, 8, 8);
      ctx.strokeStyle = colors.ink;
      ctx.lineWidth = 1;
      ctx.strokeRect(h[0] - 4 + 0.5, h[1] - 4 + 0.5, 8, 8);
    }
    var visible = true,
      raf = 0,
      last = 0;
    function loop(t) {
      raf = requestAnimationFrame(loop);
      if (!visible || t - last < 28) return; // ~35 steps a second
      last = t;
      if (pause > 0) {
        if (--pause === 0) {
          flash.classList.remove("is-on");
          newTrial();
        }
      } else step();
      draw();
    }
    readColors();
    resize();
    if (reduced) {
      // one finished decision, drawn still
      while (pause === 0) step();
      draw();
    } else raf = requestAnimationFrame(loop);
    var rw = W;
    window.addEventListener("resize", function () {
      if (Math.abs(stage.getBoundingClientRect().width - rw) > 1) {
        resize();
        rw = W;
      }
    });
    document.addEventListener("zf:theme", function () {
      readColors();
      draw();
    });
    if ("IntersectionObserver" in window)
      new IntersectionObserver(function (en) {
        visible = en[0].isIntersecting;
      }).observe(ddm);
    ddm.addEventListener("pointermove", function (e) {
      var r = stage.getBoundingClientRect();
      push = Math.max(-1, Math.min(1, (mid - (e.clientY - r.top)) / ((bot - top) / 2)));
      ddm.classList.add("is-push");
    });
    ddm.addEventListener("pointerleave", function () {
      push = null;
      ddm.classList.remove("is-push");
    });
  }
})();
