/* =============================================================================
   overview.js — "Papers through my eyes" · Overview
   Three ways of looking at the papers, switched by the bar at the top:
   01 Timeline     a river of time: older works left, my papers right, threads between
   02 People       a skyline of citations, a detail panel, and cards that turn over
   03 Connections  papers, shared ideas and my research questions as a
                   network of shapes on a grid (force layout, snapped)
   (Each paper's experiments are shown under its grid in the Library.)
   Everything is built from window.OV (written by phd/overview.html). Every
   link between a paper and the rest lives in the paper's own block in
   _data/papers.yml (ideas, builds_on, mentions, cites), so the views grow
   with the library — they are sized from the data, not by hand.
   ============================================================================= */
(function () {
  "use strict";
  var OV = window.OV || {};
  var SVGNS = "http://www.w3.org/2000/svg";
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, el) {
    return (el || document).querySelector(s);
  };
  var $$ = function (s, el) {
    return Array.prototype.slice.call((el || document).querySelectorAll(s));
  };
  function el(name, attrs, parent) {
    var n = document.createElementNS(SVGNS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function refreshGrid() {
    if (window.zf && window.zf.refresh) window.zf.refresh();
  }

  /* ---------- the data, with links derived from the papers ---------- */
  var papers = OV.papers || [];
  var byId = {};
  papers.forEach(function (p) {
    byId[p.id] = p;
    p.ideas = p.ideas || [];
    p.builds_on = p.builds_on || [];
    p.cites = p.cites || [];
    p.uses = p.uses || [];
    p.marks = p.marks || [];
  });
  var roots = (OV.roots || []).map(function (r) {
    return Object.assign({}, r, {
      in: papers
        .filter(function (p) {
          return p.builds_on.indexOf(r.id) >= 0;
        })
        .map(function (p) {
          return p.id;
        }),
    });
  });
  var concepts = (OV.concepts || []).map(function (c) {
    return Object.assign({}, c, {
      in: papers
        .filter(function (p) {
          return p.ideas.indexOf(c.id) >= 0;
        })
        .map(function (p) {
          return p.id;
        }),
    });
  });
  var conceptById = {};
  concepts.forEach(function (c) {
    conceptById[c.id] = c;
  });
  var citations = [];
  papers.forEach(function (p) {
    p.cites.forEach(function (to) {
      if (byId[to]) citations.push({ from: p.id, to: to });
    });
  });
  var questions = [];
  (OV.myPapers || []).forEach(function (mp, k) {
    (mp.questions || []).forEach(function (q) {
      questions.push(Object.assign({ paper: mp, letter: "ABCDEFGHIJ".charAt(k) }, q));
    });
  });
  function groupColor(key) {
    var g = (OV.groups || []).filter(function (x) {
      return x.key === key;
    })[0];
    return g ? g.color : "#f2eee4";
  }
  function chip(id, page) {
    var p = byId[id];
    if (!p) return "";
    return '<a class="ov-chip" style="--c:' + esc(p.color) + '" href="' + esc(OV.library) + "#" + esc(p.id) + (page ? "/p" + page : "") + '" title="' + esc(p.cite) + '">' + esc(p.short) + "</a>";
  }
  /* the papers that support a research question: those using any of its ideas */
  function support(q) {
    return papers.filter(function (p) {
      return q.ideas.some(function (i) {
        return p.ideas.indexOf(i) >= 0;
      });
    });
  }

  /* ---------- count up ---------- */
  $$("[data-count]").forEach(function (n) {
    var to = +n.getAttribute("data-count");
    if (reduced || !to) return;
    var t0 = null;
    n.textContent = "0";
    function step(t) {
      if (!t0) t0 = t;
      var f = Math.min(1, (t - t0) / 1100);
      n.textContent = Math.round(to * (1 - Math.pow(1 - f, 3)));
      if (f < 1) requestAnimationFrame(step);
    }
    setTimeout(function () {
      requestAnimationFrame(step);
    }, 200);
  });

  /* ======================================================================
     THE BAR: switch between the views
     ====================================================================== */
  var nav = $(".ov-nav");
  var tabs = $$(".ov-nav a");
  var panels = $$(".ov-panel");
  var ink = $(".ov-nav-ink");
  var built = {};
  function moveInk(tab) {
    if (!ink || !tab) return;
    ink.style.setProperty("--l", tab.offsetLeft + "px");
    ink.style.setProperty("--w", tab.offsetWidth + "px");
    ink.style.setProperty("--t", tab.offsetTop + tab.offsetHeight - 5 + "px");
  }
  function activate(view, scroll) {
    if (
      !panels.some(function (p) {
        return p.dataset.view === view;
      })
    )
      view = "timeline";
    tabs.forEach(function (t) {
      var on = t.dataset.view === view;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.classList.toggle("is-active", on);
      if (on) moveInk(t);
    });
    panels.forEach(function (p) {
      var on = p.dataset.view === view;
      p.hidden = !on;
      p.classList.remove("is-enter");
      if (on) {
        void p.offsetWidth;
        p.classList.add("is-enter");
      }
    });
    if (!built[view]) {
      built[view] = true;
      if (view === "timeline") buildTimeline();
      if (view === "connections") buildNetwork(1);
      if (view === "people") buildPeople();
    }
    if (view === "timeline") replayTimeline();
    if (view === "connections") replay($("#ov-net"));
    if (view === "people") replay($("#pp-chart"));
    refreshGrid();
    if (scroll && nav) {
      var r = nav.getBoundingClientRect();
      if (r.top < 0 || r.top > window.innerHeight * 0.4) window.scrollTo({ top: window.scrollY + r.top - 16, behavior: reduced ? "auto" : "smooth" });
    }
  }
  function replay(node) {
    if (!node || reduced) return;
    node.classList.remove("is-drawn");
    void node.getBoundingClientRect();
    requestAnimationFrame(function () {
      node.classList.add("is-drawn");
    });
  }
  tabs.forEach(function (t) {
    t.addEventListener("click", function (e) {
      e.preventDefault();
      history.replaceState(null, "", "#" + t.dataset.view);
      activate(t.dataset.view, true);
    });
  });
  window.addEventListener("resize", function () {
    moveInk($(".ov-nav a.is-active"));
    if (net && !pinned) focusNet(null); // re-measures the info panel if its width changed
  });

  /* ======================================================================
     01 · TIMELINE — a river of time
     A vertical spine of years (quiet stretches folded away). The older works
     my papers build on sit on the left, my papers on the right; curved threads
     join each paper to what it builds on. The spine fills with ink as you
     scroll, and a bar of every year at the top jumps to any year.
     ====================================================================== */
  var TL = { built: false, pinned: null, links: [] };
  var CATS = {};
  (OV.categories || []).forEach(function (c) {
    CATS[c.key] = c;
  });
  function buildTimeline() {
    var river = $("#tl-river"),
      yearsBox = $("#tl-years");
    if (!river || !yearsBox) return;
    var items = [];
    roots.forEach(function (r) {
      items.push({ kind: "root", id: r.id, year: +r.year, r: r });
    });
    papers.forEach(function (p) {
      items.push({ kind: "paper", id: p.id, year: +p.year, p: p });
    });
    var years = {};
    items.forEach(function (it) {
      (years[it.year] = years[it.year] || []).push(it);
    });
    var list = Object.keys(years)
      .map(Number)
      .sort(function (a, b) {
        return a - b;
      });
    var minY = list[0],
      maxY = Math.max(list[list.length - 1], new Date().getFullYear());

    /* ---- the numbers at the top ---- */
    var ages = [];
    papers.forEach(function (p) {
      p.builds_on.forEach(function (rid) {
        var r = roots.filter(function (x) {
          return x.id === rid;
        })[0];
        if (r) ages.push(+p.year - +r.year);
      });
    });
    ages.sort(function (a, b) {
      return a - b;
    });
    var median = ages.length ? ages[Math.floor(ages.length / 2)] : 0;
    var oldest = roots.slice().sort(function (a, b) {
      return a.year - b.year;
    })[0];
    var newest = papers.slice().sort(function (a, b) {
      return b.year - a.year;
    })[0];
    var stats = $("#tl-stats");
    if (stats) {
      stats.innerHTML =
        '<div class="tl-stat"><b data-to="' + (maxY - minY) + '">' + (maxY - minY) + "</b><span>years of ideas<em>" + minY + " → " + maxY + "</em></span></div>" +
        '<div class="tl-stat"><b data-to="' + roots.length + '">' + roots.length + "</b><span>older works<em>my papers build on</em></span></div>" +
        '<div class="tl-stat"><b data-to="' + median + '">' + median + "</b><span>years old<em>a typical cited idea</em></span></div>";
    }
    var quote = $("#tl-quote");
    if (quote && oldest)
      quote.innerHTML = "<em>Oldest idea · " + esc(oldest.who) + " " + oldest.year + "</em>“" + esc(oldest.note || oldest.title) + "”";

    /* ---- the river: one row per year that has something, folded gaps between ---- */
    var h = "",
      lastDecade = null;
    list.forEach(function (y, i) {
      if (i > 0 && y - list[i - 1] > 1) {
        var gap = y - list[i - 1] - 1;
        h += '<div class="tl-gap" style="--g:' + Math.min(gap, 30) + '"><span>' + gap + (gap === 1 ? " quiet year" : " quiet years") + "</span></div>";
      }
      var dec = Math.floor(y / 10) * 10;
      var its = years[y];
      var left = its.filter(function (it) { return it.kind === "root"; }),
        right = its.filter(function (it) { return it.kind === "paper"; });
      h += '<div class="tl-year" data-year="' + y + '" id="tl-y' + y + '">';
      if (dec !== lastDecade) h += '<span class="tl-decade" aria-hidden="true">' + dec + "s</span>";
      lastDecade = dec;
      h += '<div class="tl-side is-left">';
      left.forEach(function (it, k) {
        var r = it.r;
        h +=
          '<button type="button" class="tl-item tl-root" data-r="' + esc(r.id) + '" style="--k:' + k + '"><i class="tl-dot"></i>' +
          '<span class="tl-who">' + esc(r.who) + " <em>" + r.year + "</em></span>" +
          '<span class="tl-title">' + esc(r.title) + "</span>" +
          (r.note ? '<span class="tl-note">' + esc(r.note) + "</span>" : "") +
          '<span class="tl-by" aria-label="Cited by ' + r.in.length + ' of my papers">' +
          r.in.map(function (pid) { return '<i style="--c:' + esc(byId[pid].color) + '" title="' + esc(byId[pid].cite) + '"></i>'; }).join("") +
          "<small>" + (r.in.length ? "cited by " + r.in.length : "") + "</small></span></button>";
      });
      h += "</div>";
      h += '<div class="tl-mid"><b>' + y + '</b><i style="--n:' + Math.min(its.length, 6) + '"></i></div>';
      h += '<div class="tl-side is-right">';
      right.forEach(function (it, k) {
        var p = it.p,
          cat = CATS[p.category];
        h +=
          '<a class="tl-item tl-paper" href="' + esc(OV.library) + "#" + esc(p.id) + '" data-p="' + esc(p.id) + '" style="--c:' + esc(p.color) + ";--k:" + k + '"><i class="tl-dot"></i>' +
          '<span class="tl-code">' + esc(p.short) + "</span>" +
          '<span class="tl-body"><span class="tl-title">' + esc(p.title) + "</span>" +
          '<span class="tl-auth">' + esc(p.authors) + "</span>" +
          '<span class="tl-meta">' + (cat ? '<span class="tl-cat" style="--cat:' + esc(cat.color) + '"><i></i>' + esc(cat.label) + "</span>" : "") +
          "<span>builds on " + p.builds_on.length + "</span><span>" + p.marks.length + " marks</span></span></span></a>";
      });
      h += "</div></div>";
    });
    yearsBox.innerHTML = h;
    river.style.setProperty("--mid", Math.max(120, Math.min(300, papers.length * 16 + 40)) + "px");

    /* ---- the bar of every year at the top ---- */
    var scrub = $("#tl-scrub");
    if (scrub) {
      var start = Math.floor(minY / 10) * 10,
        n = maxY - start + 1,
        sh = '<div class="tl-sc-track" style="--n:' + n + '">';
      for (var y = start; y <= maxY; y++) {
        var its = years[y] || [];
        sh += '<button type="button" class="tl-sc-y' + (its.length ? " has" : "") + (y % 10 === 0 ? " is-dec" : "") + '" data-year="' + y + '" title="' + y + (its.length ? ": " + its.map(function (it) { return it.kind === "root" ? it.r.who : it.p.short; }).join(", ") : "") + '"' + (its.length ? "" : ' tabindex="-1"') + ">";
        its
          .slice()
          .sort(function (a, b) { return a.kind === b.kind ? 0 : a.kind === "root" ? -1 : 1; })
          .forEach(function (it, k) {
            sh += '<i class="' + (it.kind === "root" ? "is-root" : "is-paper") + '" style="--k:' + k + (it.kind === "paper" ? ";--c:" + esc(it.p.color) : "") + '"></i>';
          });
        if (y % 10 === 0) sh += "<small>" + y + "</small>";
        sh += "</button>";
      }
      sh += '<span class="tl-sc-view" aria-hidden="true"></span></div>';
      sh =
        '<p class="tl-sc-key zf-meta"><b>Every year since ' + start + '</b><span><i class="is-root"></i>older work</span><span><i class="is-paper"></i>paper I read</span><span class="tl-sc-hint">click a year to jump</span></p>' +
        sh;
      scrub.innerHTML = sh;
      scrub.addEventListener("click", function (e) {
        var b = e.target.closest(".tl-sc-y");
        if (!b) return;
        var y = +b.dataset.year,
          target = list.filter(function (x) { return x >= y; })[0] || list[list.length - 1];
        var row = $("#tl-y" + target);
        if (row) {
          var top = row.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.3;
          window.scrollTo({ top: top, behavior: reduced ? "auto" : "smooth" });
          row.classList.remove("is-flash");
          void row.offsetWidth;
          row.classList.add("is-flash");
        }
      });
    }

    /* ---- hover and focus: light up the threads of one item ---- */
    yearsBox.addEventListener("pointerover", function (e) {
      var it = e.target.closest(".tl-item");
      if (it && !TL.pinned) focusTl(it);
    });
    yearsBox.addEventListener("pointerleave", function () {
      if (!TL.pinned) focusTl(null);
    });
    yearsBox.addEventListener("focusin", function (e) {
      var it = e.target.closest(".tl-item");
      if (it) focusTl(it);
    });
    yearsBox.addEventListener("click", function (e) {
      var it = e.target.closest(".tl-root");
      if (!it) return;
      TL.pinned = TL.pinned === it ? null : it;
      $$(".tl-root.is-pinned", yearsBox).forEach(function (x) {
        x.classList.remove("is-pinned");
      });
      if (TL.pinned) it.classList.add("is-pinned");
      focusTl(TL.pinned);
    });

    /* ---- items arrive as they scroll into view ---- */
    if ("IntersectionObserver" in window && !reduced) {
      TL.io = new IntersectionObserver(
        function (es) {
          es.forEach(function (e) {
            if (e.isIntersecting) {
              e.target.classList.add("is-in");
              TL.io.unobserve(e.target);
            }
          });
        },
        { rootMargin: "0px 0px -8% 0px" },
      );
    }
    observeRows();

    window.addEventListener("scroll", inkTick, { passive: true });
    window.addEventListener("resize", function () {
      clearTimeout(TL.rt);
      TL.rt = setTimeout(drawLinks, 120);
    });
    if ("ResizeObserver" in window) new ResizeObserver(function () {
      clearTimeout(TL.rt);
      TL.rt = setTimeout(drawLinks, 60);
    }).observe(yearsBox);
    TL.built = true;
    requestAnimationFrame(function () {
      drawLinks();
      inkTick();
    });
  }
  function observeRows() {
    $$(".tl-year, .tl-gap", $("#tl-years")).forEach(function (row) {
      if (TL.io) TL.io.observe(row);
      else row.classList.add("is-in");
    });
  }

  /* where a dot sits inside the river, ignoring the slide-in transforms */
  function dotXY(node, river) {
    var x = 0,
      y = 0,
      n = node;
    while (n && n !== river) {
      x += n.offsetLeft;
      y += n.offsetTop;
      n = n.offsetParent;
    }
    return [x + node.offsetWidth / 2, y + node.offsetHeight / 2];
  }
  /* a metro map: each paper has its own lane down the middle; its older works join the lane
     with rounded corners, and the lane runs to the paper */
  function metro(ax, ay, lx, bx, by) {
    var r = Math.min(10, Math.abs(by - ay) / 2, Math.abs(lx - ax), Math.abs(bx - lx));
    var s1 = lx > ax ? 1 : -1,
      sy = by >= ay ? 1 : -1,
      s2 = bx > lx ? 1 : -1;
    return (
      "M" + ax + " " + ay + " H" + (lx - s1 * r) + " Q" + lx + " " + ay + " " + lx + " " + (ay + sy * r) + " V" + (by - sy * r) + " Q" + lx + " " + by + " " + (lx + s2 * r) + " " + by + " H" + bx
    );
  }
  function drawLinks() {
    var river = $("#tl-river"),
      svg = $("#tl-links"),
      mid = $(".tl-year .tl-mid", river);
    if (!river || !svg || !mid || !river.offsetParent) return;
    var W = river.clientWidth,
      H = river.clientHeight;
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("width", W);
    svg.setAttribute("height", H);
    var m0 = dotXY(mid, river)[0] - mid.offsetWidth / 2,
      mw = mid.offsetWidth;
    var order = papers.slice().sort(function (a, b) {
      return a.year - b.year || (a.cite < b.cite ? -1 : 1);
    });
    var lane = {};
    order.forEach(function (p, i) {
      lane[p.id] = m0 + 10 + ((i + 0.5) * (mw - 20)) / order.length;
    });
    var s = "",
      k = 0;
    order.forEach(function (p) {
      var pn = $('.tl-paper[data-p="' + p.id + '"] .tl-dot', river);
      if (!pn) return;
      var b = dotXY(pn, river);
      p.builds_on.forEach(function (rid) {
        var rn = $('.tl-root[data-r="' + rid + '"] .tl-dot', river);
        if (!rn) return;
        var a = dotXY(rn, river);
        s += '<path d="' + metro(a[0], a[1], lane[p.id], b[0], b[1]) + '" pathLength="1" data-p="' + p.id + '" data-r="' + rid + '" style="--c:' + p.color + ";--o:" + k++ + '"/>';
      });
    });
    svg.innerHTML = s;
    svg.classList.remove("is-drawn");
    void svg.getBoundingClientRect();
    svg.classList.add("is-drawn");
    if (TL.pinned || TL.focus) focusTl(TL.pinned || TL.focus);
  }
  /* the ink in the spine follows the reader down the river; the bar on top shows which years are on screen */
  function inkTick() {
    if (TL.raf) return;
    TL.raf = requestAnimationFrame(function () {
      TL.raf = 0;
      var river = $("#tl-river");
      if (!river || !river.offsetParent) return;
      var r = river.getBoundingClientRect(),
        mid = window.innerHeight * 0.55;
      var f = Math.max(0, Math.min(1, (mid - r.top) / Math.max(1, r.height)));
      river.style.setProperty("--flow", f.toFixed(4));
      var rows = $$(".tl-year", river),
        vis = rows.filter(function (row) {
          var b = row.getBoundingClientRect();
          return b.bottom > 60 && b.top < window.innerHeight;
        });
      var view = $(".tl-sc-view"),
        track = $(".tl-sc-track");
      if (view && track && vis.length) {
        var y1 = +vis[0].dataset.year,
          y2 = +vis[vis.length - 1].dataset.year;
        var a = $('.tl-sc-y[data-year="' + y1 + '"]', track),
          b = $('.tl-sc-y[data-year="' + y2 + '"]', track);
        if (a && b) {
          view.style.left = a.offsetLeft + "px";
          view.style.width = b.offsetLeft + b.offsetWidth - a.offsetLeft + "px";
          view.style.opacity = r.top < window.innerHeight && r.bottom > 0 ? 1 : 0;
        }
      }
      rows.forEach(function (row) {
        var b = row.getBoundingClientRect();
        row.classList.toggle("is-now", b.top < mid && b.bottom > mid);
      });
    });
  }
  function focusTl(item) {
    var river = $("#tl-river");
    if (!river) return;
    TL.focus = item;
    river.classList.toggle("is-focus", !!item);
    $$(".is-on", river).forEach(function (n) {
      n.classList.remove("is-on");
    });
    if (!item) return;
    item.classList.add("is-on");
    var sel = item.dataset.p ? '[data-p="' + item.dataset.p + '"]' : '[data-r="' + item.dataset.r + '"]';
    $$("#tl-links path" + sel, river).forEach(function (path) {
      path.classList.add("is-on");
      path.parentNode.appendChild(path); // on top
      var other = item.dataset.p ? '.tl-root[data-r="' + path.dataset.r + '"]' : '.tl-paper[data-p="' + path.dataset.p + '"]';
      var o = $(other, river);
      if (o) o.classList.add("is-on");
    });
  }
  function replayTimeline() {
    if (!TL.built || reduced) return;
    $$(".tl-year, .tl-gap", $("#tl-years")).forEach(function (row) {
      row.classList.remove("is-in");
    });
    observeRows();
    $$("#tl-stats .tl-stat b").forEach(function (b) {
      countUp(b, +b.dataset.to);
    });
    requestAnimationFrame(function () {
      drawLinks();
      inkTick();
    });
  }
  function countUp(node, to) {
    var t0 = performance.now(),
      dur = 900;
    (function step(t) {
      var f = Math.min(1, (t - t0) / dur);
      node.textContent = Math.round(to * (1 - Math.pow(1 - f, 3)));
      if (f < 1) requestAnimationFrame(step);
    })(t0);
  }

  /* ======================================================================
     02 · PEOPLE — a skyline of citations, a detail panel, and cards
     Each person is a column of small squares, one per citation in my papers'
     own text, coloured by the paper that cites them (cite_counts in each
     paper's block). "Through" a paper re-sorts everything by that paper.
     ====================================================================== */
  var PP = { who: "all", sort: "cites", through: "", q: "", pinned: null, all: false };
  var CARD_LIMIT = 16;
  var people = (OV.people || []).map(function (x) {
    var per = [];
    papers.forEach(function (p) {
      var n = (p.cite_counts || {})[x.id] || 0;
      if (n || (p.mentions || []).indexOf(x.id) >= 0) per.push({ p: p, n: n });
    });
    var total = per.reduce(function (a, b) {
      return a + b.n;
    }, 0);
    var parts = x.name.split(" ");
    return Object.assign({}, x, {
      per: per,
      total: total,
      npapers: per.length,
      last: parts[parts.length - 1],
      initials: (parts[0][0] + parts[parts.length - 1][0]).toUpperCase(),
      find: (x.name + " " + (x.known || "") + " " + (x.idea || "")).toLowerCase(),
    });
  });
  var pById = {};
  people.forEach(function (x) {
    pById[x.id] = x;
  });

  /* a small PRNG so each person's portrait is the same on every visit */
  function seeded(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
    return function () {
      h = Math.imul(h ^ (h >>> 15), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return ((h ^= h >>> 16) >>> 0) / 4294967296;
    };
  }
  /* pixel portrait: 5×5, mirrored like a face, coloured by the papers that cite the person */
  function portrait(x, size) {
    var rnd = seeded(x.id),
      cols = [];
    x.per.forEach(function (e) {
      for (var i = 0; i < Math.max(1, e.n); i++) cols.push(e.p.color);
    });
    if (!cols.length) cols.push("var(--paper-2)");
    var s = '<svg class="pp-face" viewBox="0 0 5 5" width="' + size + '" height="' + size + '" aria-hidden="true">';
    for (var r = 0; r < 5; r++) {
      for (var c = 0; c < 3; c++) {
        if (rnd() < 0.42) continue;
        var col = cols[Math.floor(rnd() * cols.length)];
        var d = (r * 3 + c) * 0.03;
        s += '<rect x="' + c + '" y="' + r + '" width="1" height="1" fill="' + col + '" style="--d:' + d + 's"/>';
        if (c < 2) s += '<rect x="' + (4 - c) + '" y="' + r + '" width="1" height="1" fill="' + col + '" style="--d:' + d + 's"/>';
      }
    }
    return s + "</svg>";
  }
  function countIn(x) {
    if (!PP.through) return x.total;
    var e = x.per.filter(function (e) {
      return e.p.id === PP.through;
    })[0];
    return e ? e.n : 0;
  }
  function visible() {
    return people.filter(function (x) {
      if (PP.who === "author" && !x.author) return false;
      if (PP.who === "other" && x.author) return false;
      if (PP.q && x.find.indexOf(PP.q) < 0) return false;
      if (PP.through && !x.per.some(function (e) { return e.p.id === PP.through; })) return false;
      return true;
    });
  }
  function sorted(list) {
    var by = {
      cites: function (a, b) {
        return countIn(b) - countIn(a) || b.npapers - a.npapers || (a.last < b.last ? -1 : 1);
      },
      papers: function (a, b) {
        return b.npapers - a.npapers || countIn(b) - countIn(a);
      },
      az: function (a, b) {
        return a.last.localeCompare(b.last);
      },
    }[PP.sort];
    return list.slice().sort(by);
  }

  var chart = $("#pp-chart"),
    info = $("#pp-info"),
    cardsBox = $("#pp-cards");
  /* how many squares side by side in a column, and how many citations a square stands for */
  var maxTotal = Math.max.apply(null, people.map(function (x) { return x.total; }).concat([1]));
  var WIDE = maxTotal > 160 ? 4 : maxTotal > 70 ? 3 : 2;
  var PER = Math.max(1, Math.ceil(maxTotal / (WIDE * 34)));

  function buildChart() {
    if (!chart) return;
    var h = "";
    people.forEach(function (x, i) {
      var blocks = "",
        k = 0;
      x.per.forEach(function (e) {
        var n = Math.ceil(e.n / PER);
        for (var j = 0; j < n; j++) blocks += '<i data-p="' + esc(e.p.id) + '" style="--c:' + esc(e.p.color) + ";--k:" + k++ + '"></i>';
      });
      if (!k) blocks = '<i class="is-zero" style="--k:0"></i>';
      h +=
        '<button type="button" class="pp-col' + (x.author ? " is-author" : "") + '" role="listitem" data-id="' + esc(x.id) + '" style="--i:' + i + '" aria-label="' +
        esc(x.name) + ", " + x.total + " citations in " + x.npapers + ' papers">' +
        '<b class="pp-n">' + x.total + '</b><span class="pp-stack" style="--wide:' + WIDE + '">' + blocks + "</span>" +
        '<span class="pp-name">' + esc(x.last) + "</span></button>";
    });
    chart.innerHTML = h;
    chart.style.setProperty("--rows", Math.ceil(maxTotal / PER / WIDE));
    chart.addEventListener("pointerover", function (e) {
      var c = e.target.closest(".pp-col");
      if (c && !PP.pinned) showInfo(pById[c.dataset.id]);
    });
    chart.addEventListener("pointerleave", function () {
      if (!PP.pinned) showInfo(null);
    });
    chart.addEventListener("focusin", function (e) {
      var c = e.target.closest(".pp-col");
      if (c) showInfo(pById[c.dataset.id]);
    });
    chart.addEventListener("click", function (e) {
      var c = e.target.closest(".pp-col");
      if (!c) return;
      pin(PP.pinned === c.dataset.id ? null : c.dataset.id);
    });
    chart.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      var cols = $$(".pp-col:not([hidden])", chart);
      var i = cols.indexOf(document.activeElement);
      var n = cols[i + (e.key === "ArrowRight" ? 1 : -1)];
      if (n) {
        e.preventDefault();
        n.focus();
      }
    });
  }
  function pin(id) {
    PP.pinned = id;
    $$(".pp-col", chart).forEach(function (c) {
      c.classList.toggle("is-pinned", c.dataset.id === id);
    });
    showInfo(id ? pById[id] : null);
    if (id) {
      var card = cardsBox.querySelector('.pp-card[data-id="' + id + '"]');
      if (card && card.hidden && !PP.all) {
        PP.all = true;
        apply(false);
      }
      card = cardsBox.querySelector('.pp-card[data-id="' + id + '"]');
      if (card) {
        card.classList.remove("is-flash");
        void card.offsetWidth;
        card.classList.add("is-flash");
      }
    }
  }

  function bars(x) {
    var max = Math.max.apply(null, x.per.map(function (e) { return e.n; }).concat([1]));
    return x.per
      .slice()
      .sort(function (a, b) { return b.n - a.n; })
      .map(function (e) {
        return (
          '<li style="--c:' + esc(e.p.color) + ";--w:" + Math.max(4, (e.n / max) * 100) + '%"><span>' + esc(e.p.short) + '</span><i></i><b>' + e.n + "</b></li>"
        );
      })
      .join("");
  }
  function showInfo(x) {
    if (!info) return;
    var h;
    if (!x) {
      var vis = visible(),
        tot = vis.reduce(function (a, y) { return a + countIn(y); }, 0),
        top = sorted(vis)[0];
      var tp = PP.through ? byId[PP.through] : null;
      h =
        '<p class="pp-i-kick">' + (tp ? "Through " + esc(tp.cite) : "Everyone my papers cite") + "</p>" +
        '<p class="pp-i-big"><b>' + vis.length + "</b> people</p>" +
        '<p class="pp-i-big"><b>' + tot + "</b> citations</p>" +
        (top ? '<p class="pp-i-top">Most cited: <b>' + esc(top.name) + "</b> (" + countIn(top) + ")</p>" : "") +
        '<p class="pp-i-hint">Point at a column to meet the person; click to keep them here. Each square is ' +
        (PER > 1 ? PER + " citations" : "one citation") + ", coloured by the paper that cites them.</p>";
      info.className = "pp-info is-empty";
    } else {
      h =
        '<div class="pp-i-head">' + portrait(x, 64) + '<div><p class="pp-i-kick">' + (x.author ? "Author of a paper I read" : "Cited by my papers") + "</p>" +
        "<h3>" + esc(x.name) + "</h3>" + (x.where ? "<small>" + esc(x.where) + "</small>" : "") + "</div></div>" +
        '<p class="pp-i-known">' + esc(x.known) + "</p>" +
        (x.idea ? '<p class="pp-i-idea">' + esc(x.idea) + "</p>" : "") +
        '<p class="pp-i-sub"><b>' + x.total + "</b> citations in " + x.npapers + " of " + papers.length + " papers</p>" +
        '<ul class="pp-bars">' + bars(x) + "</ul>" +
        (x.my_note ? '<p class="pp-i-mine"><em>✎ My note</em> ' + esc(x.my_note) + "</p>" : "") +
        (x.read ? '<p class="pp-i-read"><em>Read</em> ' + esc(x.read) + "</p>" : "");
      info.className = "pp-info";
    }
    info.innerHTML = h;
  }

  function buildCards() {
    if (!cardsBox) return;
    var h = "";
    people.forEach(function (x) {
      var code = "";
      x.per.forEach(function (e) {
        for (var j = 0; j < Math.min(e.n, 60); j++) code += '<i style="--c:' + esc(e.p.color) + '"></i>';
      });
      h +=
        '<button type="button" class="pp-card' + (x.author ? " is-author" : "") + (x.my_note ? " has-note" : "") + '" data-id="' + esc(x.id) + '" aria-pressed="false">' +
        '<span class="pp-front b">' +
        '<span class="pp-c-top">' + portrait(x, 56) + '<span class="pp-c-rank"><em>#00</em><b>' + x.total + "</b><small>citations</small></span></span>" +
        '<b class="pp-c-name">' + esc(x.name) + "</b>" +
        '<small class="pp-c-known">' + esc(x.known) + "</small>" +
        (x.idea ? '<span class="pp-c-tease">' + esc(x.idea) + "</span>" : "") +
        (x.my_note ? '<span class="pp-c-mine">✎ My note</span>' : "") +
        '<span class="pp-code" aria-hidden="true">' + (code || '<i class="is-zero"></i>') + "</span>" +
        '<span class="pp-c-foot"><span>' + (x.author ? "★ Author" : "Cited") + "</span><span>in " + x.npapers + " of " + papers.length + " papers</span></span>" +
        "</span>" +
        '<span class="pp-back b">' +
        '<b class="pp-c-name">' + esc(x.name) + "</b>" + (x.where ? "<small>" + esc(x.where) + "</small>" : "") +
        '<span class="pp-c-idea">' + esc(x.idea || x.known) + "</span>" +
        (x.my_note ? '<span class="pp-c-note"><em>✎ My note</em>' + esc(x.my_note) + "</span>" : "") +
        (x.read ? '<span class="pp-c-read"><em>Read</em>' + esc(x.read) + "</span>" : "") +
        "</span></button>";
    });
    h += '<button type="button" class="pp-more b" hidden></button>';
    cardsBox.innerHTML = h;
    cardsBox.addEventListener("click", function (e) {
      var more = e.target.closest(".pp-more");
      if (more) {
        PP.all = !PP.all;
        apply(false);
        return;
      }
      var c = e.target.closest(".pp-card");
      if (c) c.setAttribute("aria-pressed", c.getAttribute("aria-pressed") === "true" ? "false" : "true");
    });
    cardsBox.addEventListener("pointerover", function (e) {
      var c = e.target.closest(".pp-card");
      $$(".pp-col.is-hot", chart).forEach(function (x) {
        x.classList.remove("is-hot");
      });
      if (c) {
        var col = chart.querySelector('.pp-col[data-id="' + c.dataset.id + '"]');
        if (col) col.classList.add("is-hot");
      }
    });
  }

  /* re-order with a smooth slide (FLIP): remember where things were, move them, animate the difference */
  function flip(nodes, reorder) {
    var before = new Map();
    nodes.forEach(function (n) {
      if (!n.hidden) before.set(n, n.getBoundingClientRect());
    });
    reorder();
    if (reduced) return;
    nodes.forEach(function (n) {
      if (n.hidden) return;
      var a = before.get(n),
        b = n.getBoundingClientRect();
      if (!a) {
        n.animate([{ opacity: 0, transform: "scale(0.6)" }, { opacity: 1, transform: "none" }], { duration: 380, easing: "cubic-bezier(.3,1.4,.5,1)" });
        return;
      }
      var dx = a.left - b.left,
        dy = a.top - b.top;
      if (dx || dy)
        n.animate([{ transform: "translate(" + dx + "px," + dy + "px)" }, { transform: "none" }], { duration: 520, easing: "cubic-bezier(.3,1,.4,1)" });
    });
  }
  function apply(animate) {
    var list = sorted(visible());
    var order = {};
    list.forEach(function (x, i) {
      order[x.id] = i;
    });
    var cols = $$(".pp-col", chart),
      cards = $$(".pp-card", cardsBox);
    var run = function () {
      cols
        .slice()
        .sort(function (a, b) {
          return (order[a.dataset.id] == null ? 1e6 : order[a.dataset.id]) - (order[b.dataset.id] == null ? 1e6 : order[b.dataset.id]);
        })
        .forEach(function (c) {
          c.hidden = order[c.dataset.id] == null;
          chart.appendChild(c);
          var x = pById[c.dataset.id];
          c.querySelector(".pp-n").textContent = countIn(x);
          $$("i[data-p]", c).forEach(function (i) {
            i.classList.toggle("is-off", !!PP.through && i.dataset.p !== PP.through);
          });
        });
      var more = cardsBox.querySelector(".pp-more");
      cards
        .slice()
        .sort(function (a, b) {
          return (order[a.dataset.id] == null ? 1e6 : order[a.dataset.id]) - (order[b.dataset.id] == null ? 1e6 : order[b.dataset.id]);
        })
        .forEach(function (c) {
          var i = order[c.dataset.id];
          c.hidden = i == null || (!PP.all && !PP.q && i >= CARD_LIMIT);
          var rk = c.querySelector(".pp-c-rank em");
          if (rk && i != null) rk.textContent = "#" + (i < 9 ? "0" : "") + (i + 1);
          c.querySelector(".pp-c-rank b").textContent = countIn(pById[c.dataset.id]);
          cardsBox.insertBefore(c, more);
        });
      var extra = list.length - CARD_LIMIT;
      more.hidden = PP.q || extra <= 0;
      more.textContent = PP.all ? "Show fewer ↑" : "Show all " + list.length + " people →";
    };
    if (animate) flip(cols.concat(cards), run);
    else run();
    if (!PP.pinned || order[PP.pinned] == null) {
      PP.pinned = null;
      showInfo(null);
    }
    refreshGrid();
  }

  function buildPeople() {
    if (!chart || !cardsBox) return;
    buildChart();
    buildCards();
    // "Through" one paper: a chip per paper, in its colour
    var chips = $(".pp-papers");
    if (chips) {
      var ch = '<button type="button" data-through="" aria-pressed="true">All papers</button>';
      papers.forEach(function (p) {
        ch += '<button type="button" data-through="' + esc(p.id) + '" aria-pressed="false" style="--c:' + esc(p.color) + '" title="' + esc(p.cite) + '"><i></i>' + esc(p.short) + "</button>";
      });
      chips.insertAdjacentHTML("beforeend", ch);
      chips.addEventListener("click", function (e) {
        var b = e.target.closest("button");
        if (!b) return;
        PP.through = b.dataset.through;
        $$("button", chips).forEach(function (x) {
          x.setAttribute("aria-pressed", x === b ? "true" : "false");
        });
        chart.classList.toggle("is-through", !!PP.through);
        apply(true);
      });
    }
    $$(".pp-seg button").forEach(function (b) {
      b.addEventListener("click", function () {
        var key = b.dataset.who ? "who" : "sort";
        PP[key] = b.dataset[key];
        $$("button", b.parentNode).forEach(function (x) {
          x.setAttribute("aria-pressed", x === b ? "true" : "false");
        });
        apply(true);
      });
    });
    var find = $("#pp-find");
    if (find)
      find.addEventListener("input", function () {
        PP.q = find.value.trim().toLowerCase();
        apply(false);
      });
    apply(false);
  }

  /* ======================================================================
     03 · CONNECTIONS — papers, ideas and my questions on a grid that grows
     ====================================================================== */
  var NW = 14,
    NH = 10,
    net = null,
    pinned = null;
  function graph() {
    var nodes = [],
      edges = [],
      idx = {};
    papers.forEach(function (p) {
      idx[p.id] = nodes.length;
      nodes.push({ id: p.id, kind: "paper", label: p.short, name: p.cite, color: p.color, paper: p, num: p.short });
    });
    var ci = 0;
    concepts.forEach(function (c) {
      idx[c.id] = nodes.length;
      nodes.push({
        id: c.id,
        kind: c.group === "gap" ? "gap" : c.group === "hub" ? "hub" : "concept",
        name: c.label,
        text: c.text,
        color: groupColor(c.group),
        group: c.group,
        num: ("0" + ++ci).slice(-2),
      });
    });
    questions.forEach(function (q) {
      idx["q:" + q.id] = nodes.length;
      nodes.push({ id: q.id, kind: "rq", name: q.id.toUpperCase(), text: q.text, q: q, color: "#f2eee4", num: q.id.toUpperCase() });
    });
    concepts.forEach(function (c) {
      c.in.forEach(function (pid) {
        edges.push({ a: idx[c.id], b: idx[pid], kind: c.group === "gap" ? "gap" : "link" });
      });
    });
    citations.forEach(function (c) {
      edges.push({ a: idx[c.from], b: idx[c.to], kind: "cite" });
    });
    questions.forEach(function (q) {
      q.ideas.forEach(function (cid) {
        if (idx[cid] != null) edges.push({ a: idx["q:" + q.id], b: idx[cid], kind: "rq" });
      });
    });
    nodes.forEach(function (n, i) {
      n.i = i;
      n.deg = edges.filter(function (e) {
        return e.a === i || e.b === i;
      }).length;
    });
    // the grid grows with the number of nodes (about three cells each)
    NW = Math.max(14, Math.ceil(Math.sqrt(nodes.length * 3 * 1.4)));
    NH = Math.max(10, Math.ceil(NW / 1.4));
    return { nodes: nodes, edges: edges };
  }
  function layout(G, seed) {
    var s = seed || 1;
    function rnd() {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    }
    var n = G.nodes.length,
      cx = NW / 2,
      cy = NH / 2;
    G.nodes.forEach(function (nd, i) {
      var a = (i / n) * Math.PI * 2 + rnd() * 0.8,
        rad = nd.kind === "paper" ? NH * 0.22 : nd.kind === "rq" ? NH * 0.42 : NH * 0.34;
      nd.x = cx + Math.cos(a) * rad * 1.3;
      nd.y = cy + Math.sin(a) * rad;
    });
    var k = Math.sqrt(((NW - 2) * (NH - 2)) / n) * 0.95,
      temp = NW / 9;
    for (var it = 0; it < 420; it++) {
      G.nodes.forEach(function (v) {
        v.dx = 0;
        v.dy = 0;
      });
      for (var i = 0; i < n; i++)
        for (var j = i + 1; j < n; j++) {
          var a = G.nodes[i],
            b = G.nodes[j],
            dx = a.x - b.x,
            dy = a.y - b.y,
            d = Math.max(0.05, Math.hypot(dx, dy)),
            f = (k * k) / d;
          a.dx += (dx / d) * f;
          a.dy += (dy / d) * f;
          b.dx -= (dx / d) * f;
          b.dy -= (dy / d) * f;
        }
      G.edges.forEach(function (e) {
        var a = G.nodes[e.a],
          b = G.nodes[e.b],
          dx = a.x - b.x,
          dy = a.y - b.y,
          d = Math.max(0.05, Math.hypot(dx, dy)),
          f = ((d * d) / k) * (e.kind === "cite" ? 0.6 : 1);
        a.dx -= (dx / d) * f;
        a.dy -= (dy / d) * f;
        b.dx += (dx / d) * f;
        b.dy += (dy / d) * f;
      });
      G.nodes.forEach(function (v) {
        v.dx += (cx - v.x) * 0.05;
        v.dy += (cy - v.y) * 0.05;
        var d = Math.max(0.01, Math.hypot(v.dx, v.dy)),
          m = Math.min(d, temp);
        v.x = Math.min(NW - 1, Math.max(1, v.x + (v.dx / d) * m));
        v.y = Math.min(NH - 1, Math.max(1, v.y + (v.dy / d) * m));
      });
      temp = Math.max(0.02, temp * 0.985);
    }
    var taken = {};
    G.nodes
      .slice()
      .sort(function (a, b) {
        return b.deg - a.deg;
      })
      .forEach(function (v) {
        var best = null,
          bd = Infinity;
        for (var gx = 1; gx <= NW - 1; gx++)
          for (var gy = 1; gy <= NH - 1; gy++) {
            if (taken[gx + "," + gy]) continue;
            var d = Math.hypot(gx - v.x, gy - v.y);
            if (d < bd) {
              bd = d;
              best = [gx, gy];
            }
          }
        v.gx = best[0];
        v.gy = best[1];
        taken[best[0] + "," + best[1]] = 1;
      });
  }
  /* lines like the reference picture: a 45° segment, then a straight one */
  function octo(a, b) {
    var dx = b.gx - a.gx,
      dy = b.gy - a.gy,
      s = Math.min(Math.abs(dx), Math.abs(dy));
    return "M" + a.gx + " " + a.gy + " L" + (a.gx + Math.sign(dx) * s) + " " + (a.gy + Math.sign(dy) * s) + " L" + b.gx + " " + b.gy;
  }
  function buildNetwork(seed) {
    var svg = $("#ov-net");
    if (!svg) return;
    var G = graph();
    layout(G, seed);
    net = G;
    svg.innerHTML = "";
    svg.setAttribute("viewBox", "0 0 " + NW + " " + NH);
    var grid = el("g", { class: "ov-grid" }, svg);
    for (var x = 0; x <= NW; x++) el("line", { x1: x, y1: 0, x2: x, y2: NH }, grid);
    for (var y = 0; y <= NH; y++) el("line", { x1: 0, y1: y, x2: NW, y2: y }, grid);
    var eg = el("g", { class: "ov-edges" }, svg);
    G.edges.forEach(function (e, i) {
      e.node = el("path", { d: octo(G.nodes[e.a], G.nodes[e.b]), pathLength: 1, class: "ov-e ov-e--" + e.kind, style: "--o:" + i }, eg);
    });
    var ng = el("g", { class: "ov-vertices" }, svg);
    G.nodes.forEach(function (v, i) {
      var g = el("g", { class: "ov-v ov-v--" + v.kind + (v.q && v.q.from === "notes" ? " is-mine" : ""), tabindex: 0, style: "--c:" + v.color + ";--o:" + i + ";transform:translate(" + v.gx + "px," + v.gy + "px)" }, ng);
      if (v.kind === "rq") {
        el("rect", { class: "ov-dot", x: -0.42, y: -0.42, width: 0.84, height: 0.84 }, g);
        el("text", { y: 0.08, "text-anchor": "middle" }, g).textContent = v.name;
        el("text", { class: "ov-num", x: 0.5, y: 0.75 }, g).textContent = v.q.letter;
      } else {
        var r = v.kind === "paper" ? 0.46 : v.kind === "hub" ? 0.44 : 0.38;
        if (v.kind === "gap") el("circle", { class: "ov-pulse", r: r }, g);
        el("circle", { class: "ov-dot", r: r }, g);
        if (v.kind === "paper") el("text", { y: 0.08, "text-anchor": "middle" }, g).textContent = v.label;
        if (v.kind !== "paper" || papers.length <= 30) el("text", { class: "ov-num", x: r + 0.08, y: r + 0.3 }, g).textContent = v.kind === "paper" ? v.paper.year : v.num;
      }
      v.g = g;
      g.addEventListener("mouseenter", function () {
        if (!pinned) focusNet(v);
      });
      g.addEventListener("focus", function () {
        focusNet(v);
      });
      g.addEventListener("click", function (ev) {
        ev.stopPropagation();
        pinned = pinned === v ? null : v;
        focusNet(pinned || v);
      });
    });
    svg.onmouseleave = function () {
      if (!pinned) focusNet(null);
    };
    svg.onclick = function () {
      pinned = null;
      focusNet(null);
    };
    buildLegend(G);
    focusNet(null);
    // measure again once the web fonts have loaded (text wraps differently)
    if (document.fonts && document.fonts.ready)
      document.fonts.ready.then(function () {
        infoW = 0;
        focusNet(pinned);
      });
  }
  function neighbours(v) {
    var set = {};
    net.edges.forEach(function (e) {
      if (e.a === v.i) set[e.b] = 1;
      if (e.b === v.i) set[e.a] = 1;
    });
    return set;
  }
  function tag(n) {
    return '<span class="ov-tag" style="--c:' + esc(n.color) + '"><i></i>' + esc(n.num) + " " + esc(n.name) + "</span>";
  }
  // The info panel sits above the legend. If its height followed its text, hovering a legend
  // item could push that item out from under the mouse, and the page would flicker. So the
  // panel is as tall as its tallest text, measured whenever its width changes.
  var infoW = 0,
    measuring = false;
  function sizeInfo(info) {
    var max = 0,
      keep = pinned;
    info.style.height = "";
    infoW = info.offsetWidth;
    measuring = true;
    [null].concat(net.nodes).forEach(function (n) {
      focusNet(n);
      max = Math.max(max, info.offsetHeight);
    });
    measuring = false;
    info.style.height = max + "px"; // fixed: longer text scrolls inside, the legend never moves
    focusNet(keep);
  }
  function focusNet(v) {
    var svg = $("#ov-net"),
      info = $("#ov-net-info");
    if (!svg || !net) return;
    if (!measuring && info.offsetWidth && info.offsetWidth !== infoW) sizeInfo(info);
    svg.classList.toggle("is-focus", !!v);
    var nb = v ? neighbours(v) : {};
    // a question also lights up the papers behind its ideas
    var extra = {};
    if (v && v.kind === "rq")
      support(v.q).forEach(function (p) {
        extra[net.nodes.filter(function (n) { return n.id === p.id; })[0].i] = 1;
      });
    net.nodes.forEach(function (n) {
      n.g.classList.toggle("is-on", !!v && (n === v || nb[n.i] || extra[n.i]));
      n.g.classList.toggle("is-self", n === v);
    });
    net.edges.forEach(function (e) {
      var on = !!v && (e.a === v.i || e.b === v.i || (v.kind === "rq" && nb[e.a] && extra[e.b]) || (v.kind === "rq" && nb[e.b] && extra[e.a]));
      e.node.classList.toggle("is-on", on);
    });
    $$("#ov-net-legend li").forEach(function (li) {
      li.classList.toggle("is-on", !!v && +li.dataset.i === v.i);
    });
    if (!v) {
      info.innerHTML =
        '<p class="ov-info-k">Connections</p><h3>' + papers.length + " papers · " + concepts.length + " ideas · " + questions.length +
        ' questions</h3><p>Lines link papers to the ideas they use and my questions (squares) to the ideas they need. <b class="ov-red">Red lines</b>: one paper cites another. Hover or click a shape.</p><button type="button" class="ov-shuffle" id="ov-shuffle">Rearrange ↻</button>';
      var sh = $("#ov-shuffle");
      if (sh)
        sh.addEventListener("click", function (e) {
          e.stopPropagation();
          rearrange();
        });
      return;
    }
    var list = Object.keys(nb).map(function (k) {
      return net.nodes[k];
    });
    if (v.kind === "paper") {
      var p = v.paper;
      var cites = citations.filter(function (c) {
        return c.from === p.id;
      });
      var citedBy = citations.filter(function (c) {
        return c.to === p.id;
      });
      info.innerHTML =
        '<p class="ov-info-k" style="--c:' + esc(p.color) + '"><i></i>' + esc(p.cite) + "</p><h3>" + esc(p.title) + '</h3><p class="ov-chips">' +
        list.filter(function (n) { return n.kind !== "paper"; }).map(tag).join("") + "</p>" +
        (cites.length ? '<p class="ov-chips">Cites ' + cites.map(function (c) { return chip(c.to); }).join("") + "</p>" : "") +
        (citedBy.length ? '<p class="ov-chips">Cited by ' + citedBy.map(function (c) { return chip(c.from); }).join("") + "</p>" : "") +
        '<p><a class="zf-red" href="' + esc(OV.library) + "#" + esc(p.id) + '">Open its page bar →</a></p>';
    } else if (v.kind === "rq") {
      var sup = support(v.q);
      info.innerHTML =
        '<p class="ov-info-k"><i class="ov-sq-i"></i>' + esc(v.name) + " · " + esc(v.q.paper.label) + " · " + (v.q.from === "notes" ? "from my notes" : "draft") + "</p><h3>" + esc(v.q.text) +
        '</h3><p class="ov-chips">Needs ' + list.map(tag).join("") + '</p><p class="ov-chips">Supported by ' + sup.length + " paper" + (sup.length === 1 ? "" : "s") + " " +
        sup.map(function (p) { return chip(p.id); }).join("") + "</p>";
    } else {
      var ps = list.filter(function (n) {
        return n.kind === "paper";
      });
      var qs = list.filter(function (n) {
        return n.kind === "rq";
      });
      info.innerHTML =
        '<p class="ov-info-k" style="--c:' + esc(v.color) + '"><i></i>' + esc(v.num) + " · " + esc(v.kind === "gap" ? "my gap" : v.group) + "</p><h3>" + esc(v.name) + "</h3><p>" + esc(v.text) +
        '</p><p class="ov-chips">In ' + ps.length + " " + ps.map(function (n) { return chip(n.id); }).join("") + "</p>" +
        (qs.length ? '<p class="ov-chips">Needed by ' + qs.map(tag).join("") + "</p>" : "");
    }
  }
  function buildLegend(G) {
    var ol = $("#ov-net-legend");
    if (!ol) return;
    ol.innerHTML = G.nodes
      .filter(function (n) {
        return n.kind !== "paper";
      })
      .map(function (n) {
        return '<li data-i="' + n.i + '" style="--c:' + esc(n.color) + '" class="ov-lg--' + n.kind + (n.q && n.q.from === "notes" ? " is-mine" : "") + '"><i></i><b>' + esc(n.num) + "</b>" + esc(n.kind === "rq" ? n.text : n.name) + "</li>";
      })
      .join("");
    $$("li", ol).forEach(function (li) {
      var v = G.nodes[+li.dataset.i];
      li.addEventListener("mouseenter", function () {
        if (!pinned) focusNet(v);
      });
      li.addEventListener("mouseleave", function () {
        if (!pinned) focusNet(null);
      });
      li.addEventListener("click", function () {
        pinned = pinned === v ? null : v;
        focusNet(pinned || v);
      });
    });
  }
  var seedNo = 1;
  function rearrange() {
    if (!net) return;
    seedNo = (seedNo * 7 + 3) % 97 || 5;
    layout(net, seedNo);
    pinned = null;
    var svg = $("#ov-net");
    svg.classList.add("is-moving");
    net.nodes.forEach(function (v) {
      v.g.style.transform = "translate(" + v.gx + "px," + v.gy + "px)";
    });
    net.edges.forEach(function (e) {
      e.node.setAttribute("d", octo(net.nodes[e.a], net.nodes[e.b]));
    });
    setTimeout(
      function () {
        svg.classList.remove("is-moving");
        replay(svg);
      },
      reduced ? 0 : 650
    );
    focusNet(null);
  }

  /* ---------- start ---------- */
  activate((location.hash || "#timeline").slice(1), false);
  window.addEventListener("hashchange", function () {
    activate((location.hash || "#timeline").slice(1), true);
  });
})();
