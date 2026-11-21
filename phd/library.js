/* =============================================================================
   library.js — "Papers through my eyes" · Library
   Opening a paper (link #<id>) turns it into a page bar: one segment per page,
   with a circle for every mark. Moving along the bar (pointer, wheel, arrow
   keys, or scrolling in the vertical layout) shows the nearest mark's note.
   Data: _data/papers.yml and _data/mark_types.yml, injected as window.PAPERS
   and window.MARK_TYPES by phd/library.html.
   ============================================================================= */
(function () {
  "use strict";
  var PAPERS = window.PAPERS || [];
  var TYPES = window.MARK_TYPES || [];
  var listEl = document.getElementById("lib-list");
  var paperEl = document.getElementById("lib-paper");
  if (!listEl || !paperEl) return;

  var baseTitle = document.title;
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var ORIENT_KEY = "zf-bar-orient";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function typeIndex(key) {
    for (var i = 0; i < TYPES.length; i++) if (TYPES[i].key === key) return i;
    return TYPES.length;
  }
  function typeLabel(key) {
    var t = TYPES[typeIndex(key)];
    return t ? t.label : key;
  }
  function findPaper(id) {
    for (var i = 0; i < PAPERS.length; i++) if (PAPERS[i].id === id) return PAPERS[i];
    return null;
  }
  function getOrient() {
    try {
      var o = localStorage.getItem(ORIENT_KEY);
      if (o === "h" || o === "v") return o;
    } catch (e) {}
    return window.matchMedia("(max-width: 640px)").matches ? "v" : "h";
  }
  function saveOrient(o) {
    try {
      localStorage.setItem(ORIENT_KEY, o);
    } catch (e) {}
  }
  function refreshGrid() {
    if (window.zf && window.zf.refresh) window.zf.refresh();
  }
  /* animate between two states with the View Transitions API when available */
  function transition(update) {
    if (!reduced && document.startViewTransition) {
      var vt = document.startViewTransition(update);
      return vt.finished.catch(function () {});
    }
    update();
    return Promise.resolve();
  }
  function miniOf(id) {
    var card = listEl.querySelector('[data-id="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]');
    return card && card.querySelector(".pmini");
  }

  /* ---------------- state of the open paper ---------------- */
  var S = null;

  function prepareMarks(p) {
    var marks = (p.marks || []).map(function (m) {
      return { page: +m.page, type: m.type, title: m.title, text: m.text, quote: m.quote };
    });
    marks.sort(function (a, b) {
      return a.page - b.page || typeIndex(a.type) - typeIndex(b.type);
    });
    var perPage = {};
    marks.forEach(function (m, i) {
      m.i = i;
      m.off = perPage[m.page] || 0; // stack marks that share a page
      perPage[m.page] = m.off + 1;
      m.x = ((m.page - 0.5) / p.pages) * 100; // position along the bar, in %
    });
    return marks;
  }

  function ticks(pages) {
    var out = [1];
    var step = pages > 60 ? 10 : 5;
    for (var n = step; n < pages; n += step) out.push(n);
    if (out[out.length - 1] !== pages) out.push(pages);
    return out;
  }

  function render(p, orient) {
    var marks = prepareMarks(p);
    var counts = {};
    marks.forEach(function (m) {
      counts[m.type] = (counts[m.type] || 0) + 1;
    });
    var doi = p.doi ? ' · <a href="https://doi.org/' + esc(p.doi) + '" target="_blank" rel="noopener">doi:' + esc(p.doi) + "</a>" : "";

    var h = "";
    h += '<div class="zf-row pb-head">';
    h += '<a class="zf-label b pb-back" href="#">← Library</a>';
    h += '<h1 class="zf-big b pb-title">' + esc(p.title) + "</h1>";
    h += '<div class="b pb-meta">';
    h += '<p class="zf-meta">' + esc(p.authors) + " · " + esc(p.year) + " · " + esc(p.pages) + " pages</p>";
    h += '<p class="zf-meta">' + esc(p.venue) + doi + "</p>";
    if (p.summary) h += '<p class="pb-sum">' + esc(p.summary) + "</p>";
    h += "</div>";
    h += '<div class="b pb-toggle" role="group" aria-label="Direction of the bar">';
    h += '<button type="button" data-o="h"><span class="pb-ico pb-ico--h" aria-hidden="true"></span>Horizontal</button>';
    h += '<button type="button" data-o="v"><span class="pb-ico pb-ico--v" aria-hidden="true"></span>Vertical</button>';
    h += "</div></div>";

    h += '<div class="zf-row">';
    h += '<div class="w-full b pb-legend" role="group" aria-label="Show or hide kinds of marks">';
    TYPES.forEach(function (t) {
      h +=
        '<button type="button" class="t-' + esc(t.key) + '" data-type="' + esc(t.key) + '" aria-pressed="true"><i aria-hidden="true"></i>' +
        esc(t.label) + " <b>" + (counts[t.key] || 0) + "</b></button>";
    });
    h += "</div>";

    h += '<div class="w-full b pb-box">';
    h += '<div class="pb pb--' + orient + '" style="--pages:' + +p.pages + '">';
    h += '<div class="pb-notearea"><div class="pb-note is-empty" aria-live="polite"></div><span class="pb-stem" aria-hidden="true"></span></div>';
    h +=
      '<div class="pb-track" tabindex="0" role="group" aria-label="Page bar: ' + esc(p.pages) + " pages, " + marks.length +
      ' marks. Use the arrow keys to move between marks.">';
    h += '<div class="pb-bar"><span class="pb-fill"></span></div><span class="pb-cursor" aria-hidden="true"></span>';
    ticks(p.pages).forEach(function (n, k) {
      h += '<span class="pb-tick" style="--x:' + ((n - 0.5) / p.pages) * 100 + '" aria-hidden="true">' + (k === 0 ? "<small>p.</small>" : "") + n + "</span>";
    });
    marks.forEach(function (m) {
      h +=
        '<button type="button" class="pb-mark t-' + esc(m.type) + '" tabindex="-1" data-i="' + m.i + '" style="--x:' + m.x + ";--off:" + m.off +
        '" aria-label="Page ' + m.page + ", " + esc(typeLabel(m.type)) + ": " + esc(m.title) + '"></button>';
    });
    h += "</div></div></div></div>";

    paperEl.innerHTML = h;
    S = {
      paper: p,
      marks: marks,
      active: -1,
      orient: orient,
      off: {},
      hover: false,
      root: paperEl.querySelector(".pb"),
      track: paperEl.querySelector(".pb-track"),
      bar: paperEl.querySelector(".pb-bar"),
      note: paperEl.querySelector(".pb-note"),
      stem: paperEl.querySelector(".pb-stem"),
      area: paperEl.querySelector(".pb-notearea"),
      btns: Array.prototype.slice.call(paperEl.querySelectorAll(".pb-mark")),
    };
    syncToggle();
    showEmpty();
    bind();
  }

  /* ---------------- notes ---------------- */
  function hintText() {
    return S.orient === "v"
      ? "Scroll down the bar, or use ↑ ↓, to read each mark."
      : "Move along the bar, scroll on it, or use ← →, to read each mark.";
  }
  function showEmpty() {
    S.note.className = "pb-note is-empty";
    S.note.innerHTML = hintText();
    S.root.style.setProperty("--p", "0%");
    layout();
  }
  function setActive(i) {
    if (!S || i === S.active) return;
    if (S.active >= 0) S.btns[S.active].classList.remove("is-active");
    S.active = i;
    if (i < 0) return showEmpty();
    var m = S.marks[i];
    S.btns[i].classList.add("is-active");
    var visible = visibleMarks();
    var h = "";
    h += '<div class="pb-note-top"><i aria-hidden="true"></i><span>' + esc(typeLabel(m.type)) + "</span>";
    h += '<span class="pg">p. ' + m.page + "</span><span>" + (visible.indexOf(m) + 1) + "/" + visible.length + "</span></div>";
    h += "<h3>" + esc(m.title) + "</h3>";
    if (m.text) h += "<p>" + esc(m.text) + "</p>";
    if (m.quote) h += "<q>" + esc(m.quote) + "</q>";
    S.note.className = "pb-note t-" + m.type;
    S.note.innerHTML = h;
    S.root.style.setProperty("--p", m.x + "%");
    layout();
  }
  /* place the note next to its mark, kept inside the box */
  function layout() {
    if (!S) return;
    var m = S.active >= 0 ? S.marks[S.active] : null;
    var areaW = S.area.clientWidth,
      noteW = S.note.offsetWidth,
      noteH = S.note.offsetHeight;
    if (S.orient === "h") {
      var bw = S.bar.offsetWidth;
      var mx = m ? (m.x / 100) * bw : 0;
      var nx = Math.max(0, Math.min(areaW - noteW, mx - noteW / 2));
      S.note.style.setProperty("--nx", nx + "px");
      S.stem.style.setProperty("--sx", mx + "px");
    } else {
      var th = S.track.offsetHeight;
      var my = m ? (m.x / 100) * th : 0;
      var ny = Math.max(0, Math.min(th - noteH, my - 22));
      S.note.style.setProperty("--ny", ny + "px");
      S.stem.style.setProperty("--sy", my + "px");
    }
  }

  /* ---------------- moving along the bar ---------------- */
  function visibleMarks() {
    return S.marks.filter(function (m) {
      return !S.off[m.type];
    });
  }
  function nearest(pos) {
    var best = -1,
      bd = Infinity;
    S.marks.forEach(function (m) {
      if (S.off[m.type]) return;
      var d = Math.abs(m.x - pos);
      if (d < bd) {
        bd = d;
        best = m.i;
      }
    });
    return best;
  }
  function step(dir) {
    var vis = visibleMarks();
    if (!vis.length) return false;
    var cur = vis.indexOf(S.marks[S.active]);
    var next = cur < 0 ? (dir > 0 ? 0 : vis.length - 1) : cur + dir;
    if (next < 0 || next >= vis.length) return false;
    setActive(vis[next].i);
    if (S.orient === "v") scrollMarkIntoView(vis[next]);
    return true;
  }
  function scrollMarkIntoView(m) {
    var r = S.btns[m.i].getBoundingClientRect();
    var target = window.scrollY + r.top - window.innerHeight * 0.45;
    window.scrollTo({ top: target, behavior: reduced ? "auto" : "smooth" });
  }
  function fraction(e) {
    var r = S.bar.getBoundingClientRect();
    var f = S.orient === "h" ? (e.clientX - r.left) / r.width : (e.clientY - r.top) / r.height;
    return Math.max(0, Math.min(1, f));
  }

  function bind() {
    paperEl.querySelector(".pb-back").addEventListener("click", function (e) {
      e.preventDefault();
      history.pushState(null, "", location.pathname + location.search);
      route(true);
    });

    Array.prototype.forEach.call(paperEl.querySelectorAll(".pb-toggle button"), function (b) {
      b.addEventListener("click", function () {
        var o = b.getAttribute("data-o");
        if (o === S.orient) return;
        saveOrient(o);
        transition(function () {
          S.orient = o;
          S.root.className = "pb pb--" + o;
          syncToggle();
          if (S.active < 0) showEmpty();
          else layout();
        }).then(refreshGrid);
        refreshGrid();
      });
    });

    Array.prototype.forEach.call(paperEl.querySelectorAll(".pb-legend button"), function (b) {
      b.addEventListener("click", function () {
        var t = b.getAttribute("data-type");
        S.off[t] = !S.off[t];
        b.setAttribute("aria-pressed", S.off[t] ? "false" : "true");
        S.btns.forEach(function (btn, i) {
          btn.classList.toggle("is-off", !!S.off[S.marks[i].type]);
        });
        if (S.active >= 0 && S.off[S.marks[S.active].type]) setActive(-1);
        else if (S.active >= 0) {
          var keep = S.active;
          S.active = -1;
          setActive(keep); // refresh the "n / total" counter
        }
      });
    });

    var track = S.track;
    track.addEventListener("pointermove", function (e) {
      var f = fraction(e);
      S.hover = true;
      S.root.classList.add("is-hover");
      var r = S.bar.getBoundingClientRect();
      if (S.orient === "h") S.root.style.setProperty("--cx", f * r.width + "px");
      else S.root.style.setProperty("--cy", f * r.height + "px");
      var i = nearest(f * 100);
      if (i >= 0) setActive(i);
    });
    track.addEventListener("pointerleave", function () {
      S.hover = false;
      S.root.classList.remove("is-hover");
    });
    track.addEventListener("click", function (e) {
      var btn = e.target.closest(".pb-mark");
      if (btn) setActive(+btn.getAttribute("data-i"));
      track.focus({ preventScroll: true });
    });
    track.addEventListener("keydown", function (e) {
      var k = e.key;
      if (k === "ArrowRight" || k === "ArrowDown") {
        if (step(1)) e.preventDefault();
      } else if (k === "ArrowLeft" || k === "ArrowUp") {
        if (step(-1)) e.preventDefault();
      } else if (k === "Home" || k === "End") {
        var vis = visibleMarks();
        if (vis.length) {
          e.preventDefault();
          var m = vis[k === "Home" ? 0 : vis.length - 1];
          setActive(m.i);
          if (S.orient === "v") scrollMarkIntoView(m);
        }
      }
    });
    /* horizontal: scrolling on the bar steps through the marks */
    var acc = 0;
    track.addEventListener(
      "wheel",
      function (e) {
        if (S.orient !== "h") return;
        var d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        acc += d;
        if (Math.abs(acc) < 40) {
          e.preventDefault();
          return;
        }
        var moved = step(acc > 0 ? 1 : -1);
        acc = 0;
        if (moved) e.preventDefault(); // at either end, let the page scroll on
      },
      { passive: false }
    );
  }

  /* vertical: the mark nearest the middle of the screen is the active one */
  var scrollQueued = false;
  window.addEventListener(
    "scroll",
    function () {
      if (!S || S.orient !== "v" || S.hover || paperEl.hidden || scrollQueued) return;
      scrollQueued = true;
      requestAnimationFrame(function () {
        scrollQueued = false;
        var r = S.track.getBoundingClientRect();
        var mid = window.innerHeight * 0.45;
        if (r.bottom < 0 || r.top > window.innerHeight) return;
        var f = Math.max(0, Math.min(1, (mid - r.top) / r.height));
        var i = nearest(f * 100);
        if (i >= 0) setActive(i);
      });
    },
    { passive: true }
  );
  window.addEventListener("resize", function () {
    if (S) layout();
  });

  function syncToggle() {
    Array.prototype.forEach.call(paperEl.querySelectorAll(".pb-toggle button"), function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-o") === S.orient ? "true" : "false");
    });
  }

  /* ---------------- routing: #<paper id> opens that paper ---------------- */
  var lastId = null;
  function showPaper(p) {
    render(p, getOrient());
    listEl.hidden = true;
    paperEl.hidden = false;
    document.title = p.title + " · " + baseTitle;
    lastId = p.id;
  }
  function showList() {
    paperEl.hidden = true;
    paperEl.innerHTML = "";
    listEl.hidden = false;
    document.title = baseTitle;
    S = null;
  }
  function route(animate) {
    var id = decodeURIComponent(location.hash.replace(/^#/, ""));
    var p = id ? findPaper(id) : null;
    if (!animate) {
      if (p) showPaper(p);
      else showList();
      refreshGrid();
      return;
    }
    // the card's small bar grows into the big bar (and shrinks back)
    var opening = !!p;
    var mini = miniOf(opening ? p.id : lastId);
    if (opening && mini) mini.style.viewTransitionName = "pbar";
    transition(function () {
      if (mini) mini.style.viewTransitionName = opening ? "" : "pbar";
      if (p) showPaper(p);
      else showList();
      window.scrollTo(0, 0);
      refreshGrid();
    }).then(function () {
      if (mini) mini.style.viewTransitionName = "";
      refreshGrid();
    });
  }
  window.addEventListener("hashchange", function () {
    route(true);
  });
  route(false);
})();
