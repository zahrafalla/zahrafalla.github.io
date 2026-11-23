/* =============================================================================
   overview.js — "Papers through my eyes" · Overview
   Three ways of looking at the papers, switched by the bar at the top:
   01 Timeline     papers stacked by year + the older works they cite
   02 People       cards that turn over; sorted, searchable, "show all"
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
    }
    if (view === "timeline") replay($("#ov-tl"));
    if (view === "connections") replay($("#ov-net"));
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
     01 · TIMELINE — the axis, stacks and lanes all size themselves
     ====================================================================== */
  function buildTimeline() {
    var svg = $("#ov-tl");
    if (!svg) return;
    var SPLIT = 2000;
    var years = papers
      .map(function (p) {
        return +p.year;
      })
      .concat(
        roots.map(function (r) {
          return +r.year;
        })
      );
    var minYear = Math.min.apply(null, years.concat([1990])),
      maxYear = Math.max.apply(null, years.concat([2019])) + 1;
    var start = Math.floor(minYear / 10) * 10;
    var dec = Math.max(3, (SPLIT - start) / 10); // one cell per decade before 2000
    function tx(y) {
      return y < SPLIT ? 0.5 + (y - start) / 10 : dec + 0.5 + (y - SPLIT);
    }
    var W = Math.ceil(dec + (maxYear - SPLIT) + 1);

    // papers stack up in their year's column
    var stack = {},
      maxStack = 1;
    papers
      .slice()
      .sort(function (a, b) {
        return a.year - b.year || (a.cite < b.cite ? -1 : 1);
      })
      .forEach(function (p) {
        // stack by grid column: before 2000 a whole decade shares one column
        var y = +p.year,
          col = y < SPLIT ? "d" + Math.floor((y - start) / 10) : "y" + y;
        p.k = stack[col] = (stack[col] || 0) + 1;
        maxStack = Math.max(maxStack, p.k);
        p.x = y < SPLIT ? Math.floor((y - start) / 10) + 0.5 : tx(y);
      });
    var top = maxStack + 1.3; // bottom of the paper lane
    papers.forEach(function (p) {
      p.y = top - 0.5 - (p.k - 1);
    });

    // roots on lanes below, packed so labels do not overlap
    var rs = roots.slice().sort(function (a, b) {
      return a.year - b.year;
    });
    var laneEnd = [],
      lanes = 1;
    rs.forEach(function (r) {
      r.x = tx(+r.year);
      var w = 0.35 + (r.who.length + 5) * 0.135;
      for (var l = 0; l < 200; l++) {
        if (laneEnd[l] == null || laneEnd[l] < r.x - 0.2) {
          r.lane = l;
          laneEnd[l] = r.x + w;
          lanes = Math.max(lanes, l + 1);
          break;
        }
      }
      r.y = top + 1.6 + r.lane * 0.62;
    });
    var H = Math.ceil(top + 1.6 + lanes * 0.62 + 1.2);
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.style.minWidth = W * 26 + "px"; // a cell may shrink to 26px before the timeline scrolls sideways
    svg.classList.toggle("is-many", papers.length > 12);
    svg.innerHTML = "";

    var g = el("g", { class: "ov-grid" }, svg);
    for (var x = 0; x <= W; x++) el("line", { x1: x, y1: 0, x2: x, y2: H }, g);
    for (var y = 0; y <= H; y++) el("line", { x1: 0, y1: y, x2: W, y2: y }, g);
    el("path", { class: "ov-break", d: "M" + dec + " 0.2 l-0.15 0.3 l0.3 0.3 l-0.3 0.3 l0.3 0.3 l-0.15 0.3 V" + (H - 0.7) }, svg);
    var lab = el("g", { class: "ov-lab" }, svg);
    el("text", { x: 0.25, y: 0.62 }, lab).textContent = "PAPERS I'VE READ · " + papers.length;
    el("text", { x: 0.25, y: top + 0.9 }, lab).textContent = "WHAT THEY BUILD ON · " + roots.length;
    el("text", { x: dec + 0.25, y: 0.62 }, lab).textContent = "2000 → ONE CELL PER YEAR";
    var ticks = el("g", { class: "ov-ticks" }, svg);
    for (var d = start; d < SPLIT; d += 10) el("text", { x: tx(d), y: H - 0.4, "text-anchor": "middle" }, ticks).textContent = d;
    var every = maxYear - SPLIT > 30 ? 5 : 2;
    for (var yr = SPLIT; yr < maxYear; yr += every) el("text", { x: tx(yr), y: H - 0.4, "text-anchor": "middle" }, ticks).textContent = yr;

    var links = el("g", { class: "ov-links" }, svg);
    var nodes = el("g", { class: "ov-nodes" }, svg);
    var order = 0;
    rs.forEach(function (r) {
      r.in.forEach(function (pid) {
        var p = byId[pid],
          pi = papers.indexOf(p),
          ym = top + 0.35 + (pi % 7) * 0.12;
        el("path", { d: "M" + p.x + " " + p.y + " V" + ym + " H" + r.x + " V" + (r.y - 0.17), pathLength: 1, "data-p": pid, "data-r": r.id, style: "--c:" + p.color + ";--o:" + order++ }, links);
      });
    });
    rs.forEach(function (r, i) {
      var gg = el("g", { class: "ov-root", tabindex: 0, "data-r": r.id, style: "--o:" + i }, nodes);
      el("circle", { cx: r.x, cy: r.y, r: 0.17 }, gg);
      el("text", { x: r.x + 0.3, y: r.y + 0.08 }, gg).textContent = r.who + " " + r.year;
      ["mouseenter", "focus"].forEach(function (ev) {
        gg.addEventListener(ev, function () {
          focusTl({ root: r });
        });
      });
    });
    papers.forEach(function (p, i) {
      var gg = el("g", { class: "ov-paper", tabindex: 0, "data-p": p.id, style: "--c:" + p.color + ";--o:" + i }, nodes);
      el("circle", { cx: p.x, cy: p.y, r: 0.42 }, gg);
      el("text", { x: p.x, y: p.y + 0.08, "text-anchor": "middle" }, gg).textContent = p.short;
      ["mouseenter", "focus"].forEach(function (ev) {
        gg.addEventListener(ev, function () {
          focusTl({ paper: p });
        });
      });
      gg.addEventListener("click", function () {
        location.href = OV.library + "#" + p.id;
      });
    });
    svg.addEventListener("mouseleave", function () {
      focusTl(null);
    });
    focusTl(null);
  }
  function focusTl(f) {
    var svg = $("#ov-tl"),
      info = $("#ov-tl-info");
    if (!svg) return;
    svg.classList.toggle("is-focus", !!f);
    $$("path, .ov-root, .ov-paper", svg).forEach(function (n) {
      n.classList.remove("is-on");
    });
    if (!f) {
      info.innerHTML =
        '<p class="ov-info-k">Timeline</p><h3>' + papers.length + " papers · " + roots.length +
        " older works</h3><p>Hover a paper to see what it builds on, or an older work to see who cites it. Click a paper to open its bar.</p>";
      return;
    }
    if (f.paper) {
      var p = f.paper;
      $$('[data-p="' + p.id + '"]', svg).forEach(function (x) {
        x.classList.add("is-on");
      });
      p.builds_on.forEach(function (rid) {
        var r = $('.ov-root[data-r="' + rid + '"]', svg);
        if (r) r.classList.add("is-on");
      });
      info.innerHTML =
        '<p class="ov-info-k" style="--c:' + esc(p.color) + '"><i></i>' + esc(p.cite) + "</p><h3>" + esc(p.title) + "</h3><p>" + esc(p.authors) + " · " + esc(p.year) +
        " · builds on " + p.builds_on.length + " of the older works shown.</p>" + '<p><a class="zf-red" href="' + esc(OV.library) + "#" + esc(p.id) + '">Open its page bar →</a></p>';
    } else {
      var r = f.root;
      $$('[data-r="' + r.id + '"]', svg).forEach(function (x) {
        x.classList.add("is-on");
      });
      r.in.forEach(function (pid) {
        var pn = $('.ov-paper[data-p="' + pid + '"]', svg);
        if (pn) pn.classList.add("is-on");
      });
      info.innerHTML =
        '<p class="ov-info-k">' + esc(r.year) + "</p><h3>" + esc(r.who) + " · " + esc(r.title) + "</h3><p>" + esc(r.note) + '</p><p class="ov-chips">Cited by ' +
        r.in.map(function (id) { return chip(id); }).join("") + "</p>";
    }
  }

  /* ======================================================================
     02 · PEOPLE: sort by mentions, find, show all, turn over
     ====================================================================== */
  var groupsEls = $$(".ov-people");
  groupsEls.forEach(function (box) {
    var cards = $$(".ov-person", box);
    cards
      .sort(function (a, b) {
        return +b.dataset.n - +a.dataset.n;
      })
      .forEach(function (c) {
        box.appendChild(c);
      });
    var limit = +box.dataset.limit || 12;
    if (cards.length > limit) {
      box.classList.add("is-clipped");
      cards.forEach(function (c, i) {
        if (i >= limit) c.classList.add("is-extra");
      });
      var more = document.createElement("button");
      more.type = "button";
      more.className = "ov-more b";
      more.textContent = "Show all " + cards.length + " →";
      more.addEventListener("click", function () {
        box.classList.toggle("is-clipped");
        more.textContent = box.classList.contains("is-clipped") ? "Show all " + cards.length + " →" : "Show fewer ↑";
        refreshGrid();
      });
      box.parentNode.insertBefore(more, box.nextSibling);
    }
  });
  $$(".ov-person").forEach(function (b) {
    b.addEventListener("click", function () {
      b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") === "true" ? "false" : "true");
    });
  });
  var find = $("#ov-people-find");
  if (find) {
    find.addEventListener("input", function () {
      var q = find.value.trim().toLowerCase();
      groupsEls.forEach(function (box) {
        box.classList.toggle("is-finding", !!q);
        $$(".ov-person", box).forEach(function (c) {
          c.hidden = !!q && c.dataset.find.indexOf(q) < 0;
        });
      });
      refreshGrid();
    });
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
