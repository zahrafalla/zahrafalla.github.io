/* =============================================================================
   cv.js — the CV page (_layouts/zf-cv.liquid, data in _data/cv.yml)
   - the ID card tilts towards the pointer
   - the research statement appears word by word
   - rails of cards you can drag, with arrows and a progress bar
   - a periodic table of skills
   - honours as ranks: "better than 99.96%" bars that fill
   - the contents list fills a small bar for each section as you read it
   (titles, reveals, counters and accordions come from home.js)
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
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function plain(html) {
    var d = document.createElement("div");
    d.innerHTML = String(html == null ? "" : html);
    return d.textContent.trim();
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
      { rootMargin: margin || "0px 0px -12% 0px" }
    );
    els.forEach(function (el) {
      io.observe(el);
    });
  }
  function flash(el) {
    if (!el) return;
    el.classList.remove("is-flash");
    void el.offsetWidth;
    el.classList.add("is-flash");
  }
  /* ======================================================================
     the ID card tilts towards the pointer
     ====================================================================== */
  $$("[data-tilt]").forEach(function (card) {
    if (reduced || !window.matchMedia("(pointer: fine)").matches) return;
    card.addEventListener("pointermove", function (e) {
      var r = card.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width,
        py = (e.clientY - r.top) / r.height;
      card.style.setProperty("--ry", ((px - 0.5) * 14).toFixed(2) + "deg");
      card.style.setProperty("--rx", ((0.5 - py) * 10).toFixed(2) + "deg");
      card.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
      card.style.setProperty("--my", (py * 100).toFixed(1) + "%");
      card.classList.add("is-tilt");
    });
    card.addEventListener("pointerleave", function () {
      card.style.setProperty("--rx", "0deg");
      card.style.setProperty("--ry", "0deg");
      card.classList.remove("is-tilt");
    });
  });

  /* ======================================================================
     the statement appears word by word
     ====================================================================== */
  $$("[data-words]").forEach(function (p) {
    var words = p.textContent.trim().split(/\s+/);
    p.setAttribute("aria-label", p.textContent.trim());
    p.innerHTML = words
      .map(function (w, i) {
        return '<span aria-hidden="true" style="--i:' + i + '">' + esc(w) + "</span>";
      })
      .join(" ");
    p.classList.add("is-split");
  });
  onView($$("[data-words]"), function (p) {
    p.classList.add("is-in");
  });

  /* ======================================================================
     rails: drag, arrows, a progress bar
     ====================================================================== */
  $$("[data-rail]").forEach(function (rail) {
    var track = $(".cv-rail-track", rail),
      bar = $(".cv-rail-bar i", rail),
      btns = $$(".cv-rail-btn", rail);
    function update() {
      var max = track.scrollWidth - track.clientWidth;
      var f = max > 0 ? track.scrollLeft / max : 1;
      var seen = max > 0 ? track.clientWidth / track.scrollWidth : 1;
      bar.style.width = (seen * 100).toFixed(1) + "%";
      bar.style.left = (f * (1 - seen) * 100).toFixed(1) + "%";
      btns[0].disabled = track.scrollLeft <= 2;
      btns[1].disabled = track.scrollLeft >= max - 2;
      rail.classList.toggle("is-static", max <= 24); // nothing to scroll: no arrows
    }
    btns.forEach(function (b) {
      b.addEventListener("click", function () {
        var card = $(".cv-card", track);
        var step = card ? card.getBoundingClientRect().width : track.clientWidth * 0.8;
        track.scrollBy({ left: +b.getAttribute("data-dir") * step, behavior: reduced ? "auto" : "smooth" });
      });
    });
    // drag to scroll with a mouse (touch scrolls natively)
    var down = false,
      sx = 0,
      sl = 0,
      moved = false;
    track.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      down = true;
      moved = false;
      sx = e.clientX;
      sl = track.scrollLeft;
      track.classList.add("is-drag");
    });
    window.addEventListener("pointermove", function (e) {
      if (!down) return;
      var dx = e.clientX - sx;
      if (Math.abs(dx) > 4) moved = true;
      track.scrollLeft = sl - dx;
    });
    window.addEventListener("pointerup", function () {
      if (!down) return;
      down = false;
      track.classList.remove("is-drag");
    });
    track.addEventListener(
      "click",
      function (e) {
        if (moved) {
          e.preventDefault();
          e.stopPropagation();
        }
      },
      true
    );
    track.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
    onView([rail], function () {
      rail.classList.add("is-in");
    });
  });

  /* ======================================================================
     a periodic table of skills
     ====================================================================== */
  var GROUP_COLORS = ["var(--m-theory)", "var(--m-experiment)", "var(--m-important)", "var(--m-idea)", "var(--m-framework)", "var(--m-concept)"];
  // split "R, Python (NumPy, Pandas), MATLAB" on the commas outside brackets
  function splitSkills(v) {
    var out = [],
      depth = 0,
      cur = "";
    plain(v)
      .split("")
      .forEach(function (ch) {
        if (ch === "(") depth++;
        if (ch === ")") depth--;
        if (ch === "," && depth === 0) {
          if (cur.trim()) out.push(cur.trim());
          cur = "";
        } else cur += ch;
      });
    if (cur.trim()) out.push(cur.trim());
    return out;
  }
  function symbol(name) {
    var base = name.replace(/\(.*?\)/g, "").trim();
    var words = base.split(/[\s\-/&]+/).filter(Boolean);
    var w0 = words[0] || base;
    if (/^[A-Z0-9#+]+$/.test(w0)) return w0.slice(0, 3);
    if (words.length > 1) return w0.charAt(0).toUpperCase() + words[1].charAt(0).toLowerCase();
    return w0.charAt(0).toUpperCase() + (w0.charAt(1) || "").toLowerCase();
  }
  $$(".cv-ptable[data-skills]").forEach(function (box) {
    var groups;
    try {
      groups = JSON.parse(box.getAttribute("data-skills"));
    } catch (e) {
      return;
    }
    var n = 0,
      tiles = "",
      legend = "";
    groups.forEach(function (g, gi) {
      var c = GROUP_COLORS[gi % GROUP_COLORS.length];
      var skills = splitSkills(g.value);
      legend +=
        '<button type="button" data-g="' + gi + '" style="--c:' + c + '"><i></i>' + esc(plain(g.name)) + " <b>" + skills.length + "</b></button>";
      skills.forEach(function (s) {
        n++;
        var detail = (s.match(/\((.*)\)/) || [])[1] || "";
        var name = s.replace(/\s*\(.*\)/, ""),
          sym = symbol(s);
        // "R", "DDM": the name would only repeat the symbol
        var nameHtml = name.toUpperCase() === sym.toUpperCase() ? "" : '<span class="cv-el-name">' + esc(name) + "</span>";
        tiles +=
          '<div class="cv-el" data-g="' +
          gi +
          '" style="--c:' +
          c +
          ";--i:" +
          (n - 1) +
          '" tabindex="0">' +
          '<span class="cv-el-n">' +
          n +
          "</span>" +
          '<b class="cv-el-s">' +
          esc(sym) +
          "</b>" +
          nameHtml +
          (detail ? '<span class="cv-el-d">' + esc(detail) + "</span>" : "") +
          "</div>";
      });
    });
    box.innerHTML =
      '<div class="cv-ptable-legend" role="group" aria-label="Highlight a group">' + legend + '</div><div class="cv-ptable-grid">' + tiles + "</div>";
    box.classList.add("is-built");
    var grid = $(".cv-ptable-grid", box);
    $$(".cv-ptable-legend button", box).forEach(function (b) {
      var g = b.getAttribute("data-g");
      var on = function () {
        grid.classList.add("is-dim");
        $$(".cv-el", grid).forEach(function (el) {
          el.classList.toggle("is-hl", el.getAttribute("data-g") === g);
        });
      };
      var off = function () {
        if (b.getAttribute("aria-pressed") === "true") return;
        grid.classList.remove("is-dim");
      };
      b.addEventListener("pointerenter", on);
      b.addEventListener("focus", on);
      b.addEventListener("pointerleave", off);
      b.addEventListener("blur", off);
      b.addEventListener("click", function () {
        var pressed = b.getAttribute("aria-pressed") === "true";
        $$(".cv-ptable-legend button", box).forEach(function (x) {
          x.setAttribute("aria-pressed", "false");
        });
        if (pressed) {
          grid.classList.remove("is-dim");
        } else {
          b.setAttribute("aria-pressed", "true");
          on();
        }
      });
    });
    onView([grid], function () {
      grid.classList.add("is-in");
    });
  });

  /* ======================================================================
     honours as ranks
     ====================================================================== */
  function fmt(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  $$(".cv-honour").forEach(function (li) {
    var t = $(".cv-honour-t", li).textContent;
    var among = t.match(/(\d[\d,]*)\s*(st|nd|rd|th)\s+among\s+([\d,]+)\+?/i);
    var place = t.match(/(\d+)\s*(st|nd|rd|th)\b/i);
    var h = "";
    if (among) {
      var rank = +among[1].replace(/,/g, ""),
        total = +among[3].replace(/,/g, "");
      var better = Math.max(0, (1 - rank / total) * 100);
      var dec = better > 99.9 ? 2 : 1;
      h +=
        '<span class="cv-rank"><b>' +
        fmt(rank) +
        "<sup>" +
        among[2] +
        "</sup></b><small>of " +
        fmt(total) +
        (/\+/.test(among[0]) ? "+" : "") +
        "</small></span>";
      h +=
        '<span class="cv-better"><span class="cv-better-bar"><i style="--w:' +
        better.toFixed(3) +
        '%"></i></span><span class="cv-better-t">better than <b data-to="' +
        better.toFixed(dec) +
        '">' +
        better.toFixed(dec) +
        "</b>%</span></span>";
      li.classList.add("is-rank");
    } else if (place) {
      h += '<span class="cv-medal" aria-hidden="true"><b>' + place[1] + "<sup>" + place[2] + "</sup></b></span>";
      li.classList.add("is-medal");
    }
    if (h) li.insertAdjacentHTML("afterbegin", '<div class="cv-honour-viz">' + h + "</div>");
  });
  onView($$(".cv-honours"), function (ol) {
    ol.classList.add("is-in");
    if (reduced) return;
    $$(".cv-better-t b", ol).forEach(function (b) {
      var to = parseFloat(b.getAttribute("data-to")),
        dec = (b.getAttribute("data-to").split(".")[1] || "").length,
        t0 = null;
      function step(t) {
        if (!t0) t0 = t;
        var f = Math.min(1, (t - t0) / 1400);
        b.textContent = (to * (1 - Math.pow(1 - f, 4))).toFixed(dec);
        if (f < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  });

  /* ======================================================================
     the award stamp shows the place from the text ("2nd Place Award" → 2nd)
     ====================================================================== */
  $$(".cv-stamp-c[data-place]").forEach(function (t) {
    var m = t.getAttribute("data-place").match(/(\d+)\s*(st|nd|rd|th)/i);
    if (m) t.textContent = m[1] + m[2];
  });

  /* ======================================================================
     the contents list: a small bar fills as you read each section
     ====================================================================== */
  var links = $$(".zf-cv-index a");
  var secs = links.map(function (a) {
    return document.getElementById(a.getAttribute("href").slice(1));
  });
  var queued = false;
  function readBars() {
    queued = false;
    var mid = window.innerHeight * 0.45;
    secs.forEach(function (s, i) {
      if (!s) return;
      var r = s.getBoundingClientRect();
      var f = Math.max(0, Math.min(1, (mid - r.top) / Math.max(1, r.height)));
      links[i].style.setProperty("--f", f.toFixed(3));
      links[i].classList.toggle("is-done", f >= 1);
    });
  }
  window.addEventListener(
    "scroll",
    function () {
      if (!queued) {
        queued = true;
        requestAnimationFrame(readBars);
      }
    },
    { passive: true }
  );
  readBars();
  // a jump from the contents flashes the section's title
  links.forEach(function (a, i) {
    a.addEventListener("click", function () {
      setTimeout(function () {
        flash(secs[i] && secs[i].querySelector(".cv-h"));
      }, 400);
    });
  });

  void root;
})();
