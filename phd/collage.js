/* =============================================================================
   collage.js — "Papers through my eyes" · Paper collage
   - tiles fall into the grid, section by section, as they scroll into view
   - hovering a tile shows its passage and suggested text in a card;
     clicking pins the card (Esc or a click elsewhere closes it)
   - the source buttons at the top filter the tiles to one paper I've read;
     hovering a source previews its tiles
   ============================================================================= */
(function () {
  "use strict";
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $$ = function (s, el) {
    return Array.prototype.slice.call((el || document).querySelectorAll(s));
  };

  /* ---------- entrance: tiles and mosaic squares fall into place ---------- */
  var groups = $$(".cl-sec, .cl-cover, .cl-head");
  if (reduced || !("IntersectionObserver" in window)) {
    groups.forEach(function (g) {
      g.classList.add("is-in");
    });
  } else {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add("is-in");
            io.unobserve(en.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px" }
    );
    groups.forEach(function (g) {
      io.observe(g);
    });
  }
  // once a section has finished arriving, later changes (filtering) use short delays
  $$(".cl-sec").forEach(function (sec) {
    var tiles = $$(".cl-tile", sec);
    tiles.forEach(function (t, k) {
      t.style.setProperty("--k", k);
    });
    setTimeout(function check() {
      if (sec.classList.contains("is-in")) {
        setTimeout(function () {
          sec.classList.add("is-ready");
        }, 900);
      } else setTimeout(check, 300);
    }, 300);
  });

  /* ---------- count up ---------- */
  $$("[data-count]").forEach(function (el) {
    var to = +el.getAttribute("data-count");
    if (reduced || !to) return;
    var t0 = null;
    function step(t) {
      if (!t0) t0 = t;
      var f = Math.min(1, (t - t0) / 900);
      el.textContent = Math.round(to * (1 - Math.pow(1 - f, 3)));
      if (f < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  });

  var sheet = document.getElementById("cl-sheet");
  var card = document.getElementById("cl-card");
  if (!sheet || !card) return;
  var tiles = $$(".cl-tile[data-src]", sheet);

  /* ---------- the card ---------- */
  var openTile = null,
    pinned = false,
    hideTimer = 0;

  function place() {
    if (!openTile) return;
    var r = openTile.getBoundingClientRect();
    var vw = document.documentElement.clientWidth,
      vh = window.innerHeight;
    var w = card.offsetWidth,
      h = card.offsetHeight,
      gap = 14,
      x,
      y,
      side;
    if (r.right + gap + w <= vw - 12) {
      x = r.right + gap;
      side = "right";
    } else if (r.left - gap - w >= 12) {
      x = r.left - gap - w;
      side = "left";
    } else {
      x = Math.max(12, Math.min(vw - w - 12, r.left));
      side = "below";
    }
    if (side === "below") {
      y = r.bottom + gap;
      if (y + h > vh - 12) y = Math.max(12, r.top - gap - h);
    } else {
      y = Math.max(12, Math.min(vh - h - 12, r.top - 8));
    }
    card.style.setProperty("--x", x + "px");
    card.style.setProperty("--y", y + "px");
    card.setAttribute("data-side", side);
  }
  function show(tile, pin) {
    clearTimeout(hideTimer);
    if (openTile !== tile) {
      if (openTile) openTile.classList.remove("is-open");
      openTile = tile;
      tile.classList.add("is-open");
      var tpl = tile.querySelector("template");
      card.innerHTML = tpl ? tpl.innerHTML : "";
      card.style.setProperty("--c", tile.style.getPropertyValue("--c"));
      card.hidden = false;
      card.classList.remove("is-on");
      void card.offsetWidth; // restart the pop-in animation
      card.classList.add("is-on");
      tiles.forEach(function (t) {
        t.classList.toggle("is-sib", t !== tile && t.dataset.src === tile.dataset.src);
      });
    }
    pinned = !!pin;
    card.classList.toggle("is-pinned", pinned);
    place();
  }
  function hide() {
    clearTimeout(hideTimer);
    if (openTile) openTile.classList.remove("is-open");
    openTile = null;
    pinned = false;
    card.hidden = true;
    card.classList.remove("is-on", "is-pinned");
    tiles.forEach(function (t) {
      t.classList.remove("is-sib");
    });
  }
  function hideSoon() {
    if (pinned) return;
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hide, 160);
  }

  tiles.forEach(function (t) {
    t.addEventListener("pointerenter", function (e) {
      if (e.pointerType === "mouse" && !pinned) show(t, false);
    });
    t.addEventListener("pointerleave", function (e) {
      if (e.pointerType === "mouse") hideSoon();
    });
    t.addEventListener("click", function (e) {
      e.stopPropagation();
      if (openTile === t && pinned) hide();
      else show(t, true);
    });
    t.addEventListener("focus", function () {
      if (!pinned) show(t, false);
    });
    t.addEventListener("blur", function () {
      setTimeout(function () {
        if (!card.contains(document.activeElement)) hideSoon();
      }, 0);
    });
  });
  card.addEventListener("pointerenter", function () {
    clearTimeout(hideTimer);
  });
  card.addEventListener("pointerleave", hideSoon);
  card.addEventListener("click", function (e) {
    e.stopPropagation();
  });
  document.addEventListener("click", function () {
    if (openTile) hide();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && openTile) {
      var t = openTile;
      hide();
      t.focus({ preventScroll: true });
    }
  });
  var queued = false;
  function requeue() {
    if (!openTile || queued) return;
    queued = true;
    requestAnimationFrame(function () {
      queued = false;
      place();
    });
  }
  window.addEventListener("scroll", requeue, { passive: true });
  window.addEventListener("resize", requeue);

  /* ---------- filter by the paper a passage comes from ---------- */
  var sources = $$(".cl-source", sheet);
  var active = "";
  function applyFilter(src) {
    active = src;
    sources.forEach(function (b) {
      b.setAttribute("aria-pressed", (b.dataset.src || "") === src ? "true" : "false");
    });
    // tiles that change state ripple in reading order
    var k = 0;
    tiles.forEach(function (t) {
      var out = !!src && t.dataset.src !== src;
      if (out !== t.classList.contains("is-out")) t.style.setProperty("--f", k++ * 18 + "ms");
      t.classList.toggle("is-out", out);
      t.tabIndex = out ? -1 : 0;
    });
    $$(".cl-sec", sheet).forEach(function (sec) {
      var any = $$(".cl-tile[data-src]", sec).some(function (t) {
        return !t.classList.contains("is-out");
      });
      sec.classList.toggle("is-quiet", !!src && !any);
    });
    if (openTile && openTile.classList.contains("is-out")) hide();
  }
  // the squares are small (there will be 100+ papers): their names show in the header
  var now = sheet.querySelector(".cl-sources-now");
  function nameOf(b) {
    var name = b.querySelector(".cl-source-t b"),
      count = b.querySelector(".cl-source-t small");
    return (name ? name.textContent.trim() : "") + (count ? " · " + count.textContent.trim() : "");
  }
  function showName(b) {
    if (now) now.textContent = nameOf(b || sources.filter(function (x) { return (x.dataset.src || "") === active; })[0] || sources[sources.length - 1]);
  }
  sources.forEach(function (b) {
    b.addEventListener("click", function () {
      var src = b.dataset.src || "";
      applyFilter(src === active ? "" : src);
      showName(null);
    });
    b.addEventListener("pointerenter", function (e) {
      showName(b);
      if (e.pointerType !== "mouse" || !b.dataset.src) return;
      sheet.classList.add("is-preview");
      tiles.forEach(function (t) {
        t.classList.toggle("is-hl", t.dataset.src === b.dataset.src);
      });
    });
    b.addEventListener("pointerleave", function () {
      showName(null);
      sheet.classList.remove("is-preview");
      tiles.forEach(function (t) {
        t.classList.remove("is-hl");
      });
    });
    b.addEventListener("focus", function () {
      showName(b);
    });
  });
})();
