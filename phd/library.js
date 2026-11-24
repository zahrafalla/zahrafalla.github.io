/* =============================================================================
   library.js — "Papers through my eyes" · Library
   Opening a paper (link #<id>) turns it into a grid: one column per page, one
   cell per paragraph. A marked paragraph is coloured by its kind (theory, new
   framework, new concept, experiment, people, important for my work, idea to
   build, gap). Hover or click a coloured cell, or use the arrow keys, to read
   its note. Under the grid: the paper's experiments and where it goes in the
   papers I'm writing.
   Data: _data/papers.yml, _data/mark_types.yml and _data/measures.yml, injected
   as window.PAPERS, window.MARK_TYPES and window.MEASURES by phd/library.html.
   ============================================================================= */
(function () {
  "use strict";
  var PAPERS = window.PAPERS || [];
  var TYPES = window.MARK_TYPES || [];
  var MEASURES = window.MEASURES || [];
  var MY_PAPERS = window.MY_PAPERS || []; // the papers I will write (_data/my_papers.yml)
  var listEl = document.getElementById("lib-list");
  var paperEl = document.getElementById("lib-paper");
  if (!listEl || !paperEl) return;

  var baseTitle = document.title;
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var PARAS_PER_PAGE = 6; // default cells per page when a paper doesn't say

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
  /* page n of the paper as printed (journal articles start at e.g. 617) */
  function printed(p, n) {
    return p.first_page ? +p.first_page + n - 1 : n;
  }

  function hash(str) {
    var h = 7;
    String(str || "").split("").forEach(function (ch) {
      h = (h * 31 + ch.charCodeAt(0)) % 100003;
    });
    return h;
  }

  /* ---------------- hidden notes ----------------
     A hidden mark or experiment is stored encrypted in papers.yml (`locked:`, made by
     bin/zf-notes.js). Visitors see a hatched cell. After the password is typed, the browser
     decrypts them (AES-GCM, key from PBKDF2) and, on a local preview, can hide or show more.
     The password is kept only in this tab (sessionStorage). */
  var LOCK = window.LOCK || null;
  var OWNER = null;
  var HELPERS = ["/__zf/notes", "http://127.0.0.1:4001/__zf/notes"];
  function isShut(it) {
    return !!(it && it.locked && !it._hid);
  }
  function b64bytes(str) {
    var bin = atob(str),
      u = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u;
  }
  function deriveKey(pw) {
    return crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]).then(function (base) {
      return crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: b64bytes(LOCK.salt), iterations: +LOCK.iterations, hash: "SHA-256" },
        base,
        { name: "AES-GCM", length: 256 },
        false,
        ["decrypt"],
      );
    });
  }
  function openBox(key, b64) {
    var all = b64bytes(b64);
    return crypto.subtle.decrypt({ name: "AES-GCM", iv: all.slice(0, 12) }, key, all.slice(12)).then(function (buf) {
      return new TextDecoder().decode(buf);
    });
  }
  /* check the password, then decrypt every hidden item in place */
  function unlockAll(pw) {
    if (!LOCK || !window.crypto || !crypto.subtle) return Promise.reject(new Error("unsupported"));
    return deriveKey(pw)
      .then(function (key) {
        return openBox(key, LOCK.check).then(function (t) {
          if (t !== "zf-ok") throw new Error("wrong");
          return key;
        });
      })
      .catch(function () {
        throw new Error("wrong");
      })
      .then(function (key) {
        var jobs = [];
        PAPERS.forEach(function (p) {
          ["marks", "experiments"].forEach(function (list) {
            (p[list] || []).forEach(function (it, i) {
              if (!isShut(it)) return;
              jobs.push(
                openBox(key, it.locked).then(function (t) {
                  var item = JSON.parse(t).item;
                  item._hid = true;
                  p[list][i] = item;
                }),
              );
            });
          });
        });
        return Promise.all(jobs);
      });
  }
  /* ask the local helper (the preview server, or `node bin/zf-notes.js serve`) to change papers.yml */
  function askHelper(body, i) {
    i = i || 0;
    return fetch(HELPERS[i], { method: "POST", headers: { "content-type": "application/json" }, body: body })
      .then(function (r) {
        return r.json();
      })
      .catch(function (e) {
        if (i + 1 < HELPERS.length) return askHelper(body, i + 1);
        throw e;
      });
  }
  var toastEl = null,
    toastT = 0;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement("p");
      toastEl.className = "zf-toast b";
      toastEl.setAttribute("role", "status");
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add("is-on");
    clearTimeout(toastT);
    toastT = setTimeout(function () {
      toastEl.classList.remove("is-on");
    }, 5200);
  }
  function lockBtnHtml(cls) {
    return (
      '<button type="button" class="lib-lock zf-meta ' + cls + '" aria-pressed="' + (OWNER ? "true" : "false") + '"><span class="lk-ico" aria-hidden="true"></span><span class="lk-txt">' +
      (OWNER ? "Hidden notes shown · lock" : "Hidden notes") + "</span></button>"
    );
  }
  /* the hide button: always on the local preview, and on the live site once unlocked */
  var LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  var EYE_OFF =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M4 20 20 4" stroke="currentColor" stroke-width="2"/></svg>';
  var EYE_ON =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>';
  function hideBtn(list, k, hidden) {
    if (!LOCK || !(OWNER || LOCAL)) return "";
    var label = hidden ? "Hidden from visitors. Click to show it again" : "Hide from visitors";
    return (
      '<button type="button" class="pg-hide" data-list="' + list + '" data-k="' + k + '" data-hide="' + (hidden ? "0" : "1") + '" title="' + label + '" aria-label="' + label + '">' +
      (hidden ? EYE_ON : EYE_OFF) + "<span>" + (hidden ? "Show" : "Hide") + "</span></button>"
    );
  }
  var pendingHide = null; // a hide asked for before the password was typed

  var dlg = null;
  function askPassword() {
    if (!dlg) {
      dlg = document.createElement("dialog");
      dlg.className = "zf-lockdlg";
      dlg.innerHTML =
        '<form class="b" method="dialog"><p class="zf-meta">Hidden notes</p><h2>Password</h2>' +
        '<label class="zf-sr" for="zf-pw">Password</label><input id="zf-pw" type="password" autocomplete="current-password" required />' +
        '<p class="lk-err" aria-live="assertive"></p>' +
        '<div class="lk-row"><button type="button" value="cancel">Cancel</button><button type="submit">Unlock</button></div></form>';
      document.body.appendChild(dlg);
      var form = dlg.querySelector("form"),
        input = dlg.querySelector("input"),
        err = dlg.querySelector(".lk-err");
      dlg.querySelector('button[value="cancel"]').addEventListener("click", function () {
        dlg.close();
      });
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var pw = input.value;
        err.textContent = "Checking…";
        form.classList.remove("is-wrong");
        unlockAll(pw).then(
          function () {
            OWNER = pw;
            try {
              sessionStorage.setItem("zf-pw", pw);
            } catch (x) {}
            input.value = "";
            err.textContent = "";
            dlg.close();
            ownerChanged();
            if (pendingHide) {
              var job = pendingHide;
              pendingHide = null;
              setHidden(job[0], job[1], job[2]);
            } else toast("Hidden notes are shown, with a dashed outline. Only on this tab.");
          },
          function (x) {
            err.textContent = x.message === "unsupported" ? "This browser cannot decrypt here (it needs https or localhost)." : "That is not the password.";
            void form.offsetWidth;
            form.classList.add("is-wrong");
            input.select();
          },
        );
      });
    }
    dlg.querySelector(".lk-err").textContent = pendingHide ? "Type the password to hide this from visitors." : "";
    dlg.showModal();
    dlg.querySelector("input").focus();
  }
  function toggleLock() {
    if (!OWNER) return askPassword();
    try {
      sessionStorage.removeItem("zf-pw");
    } catch (x) {}
    location.reload();
  }
  /* hide (or show again) item k of the open paper's marks or experiments */
  function setHidden(list, k, hide) {
    if (!S) return;
    if (!OWNER) {
      pendingHide = [list, k, hide];
      return askPassword();
    }
    var p = S.paper,
      item = p[list][k];
    var body = JSON.stringify({ password: OWNER, paper: p.id, list: list, k: k, hide: hide, item: hide ? item : null });
    askHelper(body).then(
      function (r) {
        if (!r || !r.ok) return toast((r && r.error) || "That did not work.");
        if (hide) item._hid = true;
        else {
          delete item._hid;
          delete item.locked;
        }
        rerender();
        toast((hide ? "Hidden from visitors" : "Visible to visitors again") + ". Saved in _data/papers.yml; the live site changes when you push.");
      },
      function () {
        toast("Hiding works from the local preview: run  node bin/zf-notes.js serve  next to it (see phd/README.md).");
      },
    );
  }

  /* ---------------- where each mark sits: page (column) and paragraph (row) ----------------
     A mark may give its paragraph (`para`, 1 = first). Marks without one are spread down
     their page's column, in the order they appear in the data. */
  function placeMarks(p) {
    var ppp = +p.paras_per_page || PARAS_PER_PAGE;
    var marks = (p.marks || []).map(function (m, k) {
      // `from`: "note" or "highlight" when the mark comes from my own Zotero annotations
      if (isShut(m)) return { page: +m.page, para: +m.para || 0, type: "locked", title: "Hidden note", k: k, shut: true };
      return { page: +m.page, para: +m.para || 0, type: m.type, title: m.title, text: m.text, quote: m.quote, from: m.from, original: m.original, k: k, hid: !!m._hid };
    });
    var byPage = {};
    marks.forEach(function (m) {
      (byPage[m.page] = byPage[m.page] || []).push(m);
    });
    var rows = ppp;
    Object.keys(byPage).forEach(function (pg) {
      rows = Math.max(rows, byPage[pg].length);
      byPage[pg].forEach(function (m) {
        rows = Math.max(rows, m.para);
      });
    });
    Object.keys(byPage).forEach(function (pg) {
      var list = byPage[pg],
        taken = {};
      list.forEach(function (m) {
        if (m.para) {
          // two marks on one paragraph: the second moves to the next free one
          var r = m.para - 1;
          while (taken[r] && r < rows - 1) r++;
          m.row = r;
          taken[r] = 1;
        }
      });
      var free = list.filter(function (m) {
        return !m.para;
      });
      free.sort(function (a, b) {
        return a.k - b.k;
      });
      // no paragraph given: spread them down the column, starting at a row picked from the
      // first title (fixed, so the grid looks the same on every visit)
      var start = free.length ? hash(free[0].title) % rows : 0;
      free.forEach(function (m, j) {
        var want = (start + Math.floor((j * rows) / free.length)) % rows,
          best = -1;
        for (var d = 0; d < rows && best < 0; d++) {
          if (want + d < rows && !taken[want + d]) best = want + d;
          else if (want - d >= 0 && !taken[want - d]) best = want - d;
        }
        m.row = best < 0 ? 0 : best;
        taken[m.row] = 1;
      });
    });
    marks.sort(function (a, b) {
      return a.page - b.page || a.row - b.row;
    });
    marks.forEach(function (m, i) {
      m.i = i;
    });
    return { marks: marks, rows: rows };
  }

  /* ---------------- the small grid on each card ---------------- */
  function drawMinis() {
    Array.prototype.forEach.call(listEl.querySelectorAll(".pmini[data-id]"), function (box) {
      var p = findPaper(box.getAttribute("data-id"));
      if (!p) return;
      var g = placeMarks(p);
      box.style.setProperty("--pages", p.pages);
      box.style.setProperty("--rows", g.rows);
      box.innerHTML = g.marks
        .map(function (m) {
          return '<i class="t-' + esc(m.type) + (m.hid ? " is-hid" : "") + '" style="--x:' + (m.page - 1) + ";--y:" + m.row + '"></i>';
        })
        .join("");
    });
  }
  drawMinis();

  /* ---------------- state of the open paper ---------------- */
  var S = null;

  /* page numbers along the grid: first, last, and every 5th printed page between */
  function ticks(p) {
    var pages = p.pages,
      step = pages > 60 ? 10 : 5,
      out = [1];
    for (var n = 2; n < pages; n++) {
      if (printed(p, n) % step === 0 && n > 2 && n < pages - 1) out.push(n);
    }
    out.push(pages);
    return out;
  }

  function render(p) {
    var g = placeMarks(p),
      marks = g.marks,
      rows = g.rows;
    var counts = {},
      at = {};
    marks.forEach(function (m) {
      counts[m.type] = (counts[m.type] || 0) + 1;
      at[m.page + ":" + m.row] = m;
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
    h += "</div>";

    h += '<div class="zf-row">';
    h += '<div class="w-full b pb-legend" role="group" aria-label="Show or hide kinds of marks">';
    TYPES.forEach(function (t) {
      var n = counts[t.key] || 0;
      h +=
        '<button type="button" class="t-' + esc(t.key) + (n ? "" : " is-none") + '" data-type="' + esc(t.key) + '" aria-pressed="true"><i aria-hidden="true"></i>' +
        esc(t.label) + " <b>" + n + "</b></button>";
    });
    h += "</div>";

    h += '<div class="w-full b pg-box">';
    h += '<div class="pgd" style="--pages:' + +p.pages + ";--rows:" + rows + '">';
    h += '<div class="pg-wrap">';
    h += '<p class="pg-cap zf-meta">A column is a page, a cell is a paragraph. A cell with a white corner is one of my own notes from Zotero.' + (LOCK ? lockBtnHtml("pb-lockbtn") : "") + "</p>";
    h +=
      '<div class="pg-grid" tabindex="0" role="group" aria-label="' + esc(p.pages) + " pages, " + marks.length +
      ' marked paragraphs. Use the arrow keys to move between them.">';
    for (var pg = 1; pg <= p.pages; pg++) {
      for (var r = 0; r < rows; r++) {
        var m = at[pg + ":" + r];
        if (m)
          h +=
            '<button type="button" class="pg-c is-m t-' + esc(m.type) + (m.from === "note" ? " is-mine" : "") + (m.hid ? " is-hid" : "") + '" tabindex="-1" data-i="' + m.i + '" data-p="' + pg +
            '" style="--p:' + (pg - 1) + '" aria-label="Page ' + printed(p, pg) + ", paragraph " + (r + 1) + ", " + (m.shut ? "a hidden note" : esc(typeLabel(m.type)) + ": " + esc(m.title)) + '"></button>';
        else h += '<span class="pg-c" data-p="' + pg + '" style="--p:' + (pg - 1) + '"></span>';
      }
    }
    h += "</div>";
    h += '<div class="pg-ticks" aria-hidden="true">';
    ticks(p).forEach(function (n, k) {
      h += '<span style="--t:' + n + '">' + (k === 0 ? "<small>p.</small>" : "") + printed(p, n) + "</span>";
    });
    h += "</div></div>";
    h += '<div class="pg-note is-empty" aria-live="polite"></div>';
    h += "</div></div></div>";
    h += expHtml(p);
    h += usesHtml(p);

    paperEl.innerHTML = h;
    S = {
      paper: p,
      marks: marks,
      active: -1,
      off: {},
      root: paperEl.querySelector(".pgd"),
      grid: paperEl.querySelector(".pg-grid"),
      note: paperEl.querySelector(".pg-note"),
      btns: [],
    };
    Array.prototype.forEach.call(paperEl.querySelectorAll(".pg-c.is-m"), function (b) {
      S.btns[+b.getAttribute("data-i")] = b;
    });
    sizeCells();
    showEmpty();
    bind();
  }

  /* cells are square, as big as fit (10–44px); a long paper scrolls sideways */
  function sizeCells() {
    if (!S) return;
    var wrap = S.root.querySelector(".pg-wrap");
    var w = wrap.clientWidth;
    var cs = Math.max(10, Math.min(44, Math.floor((w - 2) / S.paper.pages)));
    S.root.style.setProperty("--cs", cs + "px");
  }

  /* ---------------- the experiments in this paper ---------------- */
  /* the back of an experiment card: my draft of the same study as a VR task */
  var VR_ICON =
    '<svg class="ov-vr-ico" viewBox="0 0 24 14" aria-hidden="true"><path d="M2 2h20v9h-7l-2-3h-2l-2 3H2z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="7" cy="6" r="1.6" fill="currentColor"/><circle cx="17" cy="6" r="1.6" fill="currentColor"/></svg>';
  function vrFace(p, e, vr) {
    var h = '<div class="ov-exp-face is-vr" inert>';
    h += '<button type="button" class="ov-vr-btn is-back" aria-pressed="true"><b>←</b><span>The paper’s study</span></button>';
    h += '<div class="ov-vr-stage" aria-hidden="true"><i></i></div>';
    h += '<header><span>' + esc(p.short) + " · VR</span><span>Draft design</span></header>";
    h += '<div class="ov-vr-body"><div class="ov-vr-a">';
    h += "<h3>" + esc(vr.title) + "</h3>";
    if (vr.principles && vr.principles.length) {
      h += '<p class="ov-vr-prin">' + vr.principles.map(function (x) {
        return "<span>" + esc(x) + "</span>";
      }).join("") + "</p>";
    }
    h += '<dl class="ov-vr-dl"><dt>Scene</dt><dd>' + esc(vr.scene) + "</dd><dt>Task</dt><dd>" + esc(vr.task) + "</dd></dl>";
    if (vr.conditions && vr.conditions.length) {
      h += '<ol class="ov-vr-conds" aria-label="Conditions">';
      vr.conditions.forEach(function (c, i) {
        h += '<li style="--k:' + i + '"><b>' + esc(c.name) + "</b><span>" + esc(c.does) + "</span></li>";
      });
      h += "</ol>";
    }
    h += '</div><div class="ov-vr-b">';
    if (vr.measures && vr.measures.length) {
      h += '<p class="ov-vr-h">Measures</p><ul class="ov-vr-ms">' + vr.measures.map(function (x) {
        return "<li>" + esc(x) + "</li>";
      }).join("") + "</ul>";
    }
    if (vr.why) h += '<p class="ov-exp-r ov-vr-why"><b>Why VR</b> ' + esc(vr.why) + "</p>";
    if (vr.watch) h += '<p class="ov-vr-watch"><b>Watch out</b> ' + esc(vr.watch) + "</p>";
    return h + "</div></div></div>";
  }
  function setFlip(card, toVr) {
    var faces = card.querySelectorAll(".ov-exp-face");
    var grid = card.parentNode;
    var cols = getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length;
    card.classList.toggle("is-flipped", toVr);
    card.classList.toggle("is-wide", toVr && cols >= 2);
    faces[0].inert = toVr;
    faces[1].inert = !toVr;
  }
  function flipExp(card, toVr) {
    var cards = Array.prototype.slice.call(card.parentNode.children);
    cards.forEach(function (c, i) {
      c.style.viewTransitionName = "exp-" + i;
      c.style.viewTransitionClass = "exp";
    });
    transition(function () {
      setFlip(card, toVr);
      refreshGrid();
    }).then(function () {
      cards.forEach(function (c) {
        c.style.viewTransitionName = "";
        c.style.viewTransitionClass = "";
      });
      refreshGrid();
      var r = card.getBoundingClientRect();
      if (r.top < 70 || r.top > innerHeight * 0.6) {
        window.scrollTo({ top: window.scrollY + r.top - 90, behavior: reduced ? "auto" : "smooth" });
      }
      var focus = card.querySelector(toVr ? ".is-vr .ov-vr-btn" : ".is-paper .ov-vr-btn");
      if (focus) focus.focus({ preventScroll: true });
    });
  }

  function expHtml(p) {
    var ex = [],
      nShut = 0;
    (p.experiments || []).forEach(function (e, k) {
      if (isShut(e)) nShut++;
      else ex.push(Object.assign({ _k: k }, e));
    });
    if (!ex.length && !nShut) return "";
    var h = '<div class="zf-row pb-exps">';
    h += '<div class="zf-row zf-shead"><p class="zf-label b"><span class="n">↓</span> Experiments</p>';
    h += '<h2 class="zf-h zf-big b">What it tests and measures</h2></div>';
    // the matrix: experiments × what gets measured
    if (ex.length) h += '<div class="w-full b ov-matrix" style="--cols:' + MEASURES.length + '">';
    h += '<div class="ov-mx-row ov-mx-head"><span class="ov-mx-name zf-meta">Experiment</span>';
    MEASURES.forEach(function (m) {
      h += '<span class="ov-mx-col"><span>' + esc(m.label) + "</span></span>";
    });
    h += "</div>";
    ex.forEach(function (e, k) {
      h += '<button type="button" class="ov-mx-row" data-exp="' + esc(e.id) + '" style="--c:' + esc(p.color) + ";--i:" + k + '">';
      h += '<span class="ov-mx-name"><b>' + esc(e.title) + "</b><small>" + (e.own ? "Own study" : "Cites " + esc(e.by)) + "</small></span>";
      MEASURES.forEach(function (m) {
        var on = (e.tags || []).indexOf(m.key) >= 0;
        h += '<span class="ov-mx-cell">' + (on ? '<i title="' + esc(m.label) + '"></i>' : "") + "</span>";
      });
      h += "</button>";
    });
    h += "</div>";
    // one card per experiment
    h += '<div class="w-full zf-tiles ov-exps">';
    ex.forEach(function (e) {
      var list = function (xs) {
        return (xs || [])
          .map(function (x) {
            return "<span>" + esc(x) + "</span>";
          })
          .join("");
      };
      var vr = e.vr;
      h += '<article class="ov-exp b' + (vr ? " has-vr" : "") + (e._hid ? " is-hid" : "") + '" data-exp="' + esc(e.id) + '" style="--c:' + esc(p.color) + '">';
      h += '<div class="ov-exp-face is-paper">';
      if (vr) h += '<button type="button" class="ov-vr-btn" aria-pressed="false">' + VR_ICON + "<span>Reimagine in VR</span><b>→</b></button>";
      h += "<header><span>" + esc(p.short) + "</span><span>" + (e.own ? "Own study" : "Cited · " + esc(e.by)) + "</span>";
      h += '<button type="button" class="ov-exp-pg" data-page="' + +e.page + '" title="Show this page in the grid">p. ' + printed(p, +e.page) + "</button>";
      h += hideBtn("experiments", e._k, e._hid) + "</header>";
      h += "<h3>" + esc(e.title) + "</h3>";
      h += '<p class="ov-exp-who"><b>' + (e.n ? "N = " + esc(e.n) : "N not given") + "</b> · " + esc(e.who) + "</p>";
      h += '<div class="ov-exp-design" aria-label="Conditions">';
      (e.conditions || []).forEach(function (c, i) {
        h += '<span style="--k:' + i + '">' + esc(c) + "</span>";
      });
      h += "</div>";
      h += '<p class="ov-exp-d">' + esc(e.design) + "</p>";
      h += "<dl><dt>Manipulated</dt><dd>" + list(e.manipulated) + "</dd><dt>Measured</dt><dd>" + list(e.measured) + "</dd>";
      h += '<dt>Tools</dt><dd class="ov-exp-tools">' + list(e.tools) + "</dd></dl>";
      h += '<p class="ov-exp-r">' + esc(e.result) + "</p>";
      h += "</div>";
      if (vr) h += vrFace(p, e, vr);
      h += "</article>";
    });
    if (nShut)
      h +=
        '<article class="ov-exp b is-shut"><div class="ov-exp-face"><header><span>' + esc(p.short) + "</span><span>Hidden</span></header><h3>" + nShut +
        (nShut === 1 ? " hidden experiment" : " hidden experiments") +
        '</h3><p>I keep these to myself for now.</p><button type="button" class="pg-unlock">Unlock with the password</button></div></article>';
    h += "</div></div>";
    return h;
  }

  /* under the grid: where this paper goes in the papers I will write */
  function usesHtml(p) {
    var uses = p.uses || [];
    if (!uses.length || !MY_PAPERS.length) return "";
    var collage = (window.COLLAGE_URL || "../collage/").replace(/\/?$/, "/");
    var cols = "";
    MY_PAPERS.forEach(function (mp, k) {
      var mine = uses.filter(function (u) {
        return u.paper === mp.id;
      });
      if (!mine.length) return;
      var order = (mp.sections || []).map(function (s) {
        return s.key;
      });
      mine.sort(function (a, b) {
        return order.indexOf(a.section) - order.indexOf(b.section) || a.page - b.page;
      });
      var title = function (key) {
        var s = (mp.sections || []).filter(function (x) {
          return x.key === key;
        })[0];
        return s ? s.title : key;
      };
      cols += '<div class="b pb-use">';
      cols += '<div class="pb-use-head"><span class="l" aria-hidden="true">' + "ABCDEFGHIJ".charAt(k) + "</span>";
      cols += "<b>" + esc(mp.title) + "</b>";
      cols += '<a class="zf-red" href="' + esc(collage) + esc(mp.id) + '/">' + esc(mp.label) + " in the collage →</a></div><ol>";
      mine.forEach(function (u) {
        cols += '<li><span class="sec">' + esc(title(u.section)) + "</span>";
        cols +=
          '<button type="button" class="pg t-' + esc(u.type) + '" data-page="' + +u.page + '" aria-label="Show page ' + printed(p, +u.page) +
          ' on the bar"><i aria-hidden="true"></i>p. ' + printed(p, +u.page) + "</button>";
        cols += "<p>" + esc(u.suggest) + "</p></li>";
      });
      cols += "</ol></div>";
    });
    if (!cols) return "";
    return (
      '<div class="zf-row pb-uses"><div class="zf-row zf-shead"><p class="zf-label b"><span class="n">↓</span> In my papers</p>' +
      '<h2 class="zf-h zf-big b">Where this paper goes</h2></div>' + cols + "</div>"
    );
  }

  /* ---------------- the note ---------------- */
  function hintText() {
    return "Hover or click a coloured cell, or use the arrow keys, to read what I marked there.";
  }
  function showEmpty() {
    S.note.className = "pg-note is-empty";
    S.note.innerHTML = '<p class="pg-hint">' + hintText() + "</p>";
  }
  function setActive(i) {
    if (!S || i === S.active) return;
    if (S.active >= 0 && S.btns[S.active]) S.btns[S.active].classList.remove("is-active");
    S.active = i;
    if (i < 0) return showEmpty();
    var m = S.marks[i];
    S.btns[i].classList.add("is-active");
    var visible = visibleMarks();
    var h = "";
    if (m.shut) {
      h += '<div class="pb-note-top"><i aria-hidden="true"></i><span>Hidden</span><span class="pgn">p. ' + printed(S.paper, m.page) + " · ¶" + (m.row + 1) + "</span>";
      h += "<span>" + (visible.indexOf(m) + 1) + "/" + visible.length + "</span></div>";
      h += "<h3>A hidden note</h3><p>I keep this one to myself for now.</p>";
      h += '<button type="button" class="pg-unlock">Unlock with the password</button>';
      S.note.className = "pg-note t-locked";
      S.note.innerHTML = h;
      return;
    }
    h += '<div class="pb-note-top"><i aria-hidden="true"></i><span>' + esc(typeLabel(m.type)) + "</span>";
    if (m.from) h += '<span class="pg-from pg-from--' + esc(m.from) + '">' + (m.from === "note" ? "✎ My note" : "▌My highlight") + "</span>";
    h += '<span class="pgn">p. ' + printed(S.paper, m.page) + " · ¶" + (m.row + 1) + "</span><span>" + (visible.indexOf(m) + 1) + "/" + visible.length + "</span>";
    h += hideBtn("marks", m.k, m.hid) + "</div>";
    if (m.hid) h += '<p class="pg-hid-tag">Hidden from visitors</p>';
    h += "<h3>" + esc(m.title) + "</h3>";
    if (m.text) h += "<p>" + esc(m.text) + "</p>";
    if (m.quote) h += "<q>" + esc(m.quote) + "</q>";
    if (m.original) h += '<p class="pg-orig" dir="auto" lang="fa">' + esc(m.original) + "</p>";
    S.note.className = "pg-note t-" + m.type + (m.hid ? " is-hid" : "");
    S.note.innerHTML = h;
  }

  /* ---------------- moving between marks ---------------- */
  function visibleMarks() {
    return S.marks.filter(function (m) {
      return !S.off[m.type];
    });
  }
  function step(dir) {
    var vis = visibleMarks();
    if (!vis.length) return false;
    var cur = vis.indexOf(S.marks[S.active]);
    var next = cur < 0 ? (dir > 0 ? 0 : vis.length - 1) : cur + dir;
    if (next < 0 || next >= vis.length) return false;
    setActive(vis[next].i);
    reveal(S.btns[vis[next].i]);
    return true;
  }
  /* keep a cell in view inside the grid's sideways scroll */
  function reveal(cell) {
    if (!cell) return;
    var wrap = S.root.querySelector(".pg-wrap");
    var cr = cell.getBoundingClientRect(),
      wr = wrap.getBoundingClientRect();
    if (cr.left < wr.left || cr.right > wr.right) wrap.scrollLeft += cr.left - wr.left - wr.width / 2;
  }
  function flashPage(n) {
    Array.prototype.forEach.call(S.grid.querySelectorAll('.pg-c[data-p="' + n + '"]'), function (c) {
      c.classList.remove("is-flash");
      void c.offsetWidth;
      c.classList.add("is-flash");
    });
  }

  function bind() {
    Array.prototype.forEach.call(paperEl.querySelectorAll(".ov-vr-btn"), function (b) {
      b.addEventListener("click", function () {
        flipExp(b.closest(".ov-exp"), !b.classList.contains("is-back"));
      });
    });
    Array.prototype.forEach.call(paperEl.querySelectorAll(".pb-use .pg, .ov-exp-pg"), function (b) {
      b.addEventListener("click", function () {
        goToPage(+b.getAttribute("data-page"));
      });
    });
    // a row of the matrix scrolls to its card
    Array.prototype.forEach.call(paperEl.querySelectorAll(".ov-mx-row[data-exp]"), function (r) {
      r.addEventListener("click", function () {
        var card = paperEl.querySelector('.ov-exp[data-exp="' + r.getAttribute("data-exp") + '"]');
        if (!card) return;
        card.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
        card.classList.remove("is-flash");
        void card.offsetWidth;
        card.classList.add("is-flash");
      });
    });

    paperEl.querySelector(".pb-back").addEventListener("click", function (e) {
      e.preventDefault();
      history.pushState(null, "", location.pathname + location.search);
      route(true);
    });

    Array.prototype.forEach.call(paperEl.querySelectorAll(".pb-legend button"), function (b) {
      b.addEventListener("click", function () {
        var t = b.getAttribute("data-type");
        S.off[t] = !S.off[t];
        b.setAttribute("aria-pressed", S.off[t] ? "false" : "true");
        S.marks.forEach(function (m) {
          S.btns[m.i].classList.toggle("is-off", !!S.off[m.type]);
        });
        if (S.active >= 0 && S.off[S.marks[S.active].type]) setActive(-1);
        else if (S.active >= 0) {
          var keep = S.active;
          S.active = -1;
          setActive(keep); // refresh the "n / total" counter
        }
      });
    });

    var grid = S.grid;
    grid.addEventListener("pointerover", function (e) {
      var c = e.target.closest(".pg-c.is-m");
      if (c && !c.classList.contains("is-off")) setActive(+c.getAttribute("data-i"));
    });
    grid.addEventListener("click", function (e) {
      var c = e.target.closest(".pg-c.is-m");
      if (c && !c.classList.contains("is-off")) setActive(+c.getAttribute("data-i"));
      grid.focus({ preventScroll: true });
    });
    grid.addEventListener("keydown", function (e) {
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
          reveal(S.btns[m.i]);
        }
      }
    });
  }
  window.addEventListener("resize", function () {
    if (S) sizeCells();
  });

  /* draw the open paper again (after unlocking or hiding), keeping its state */
  function rerender() {
    drawMinis();
    if (!S) return;
    var act = S.active,
      y = window.scrollY,
      flipped = Array.prototype.map.call(paperEl.querySelectorAll(".ov-exp.is-flipped"), function (c) {
        return c.getAttribute("data-exp");
      });
    render(S.paper);
    sizeCells();
    flipped.forEach(function (id) {
      var c = paperEl.querySelector('.ov-exp[data-exp="' + id + '"]');
      if (c && c.classList.contains("has-vr")) setFlip(c, true);
    });
    if (act >= 0 && S.marks[act]) setActive(act);
    window.scrollTo(0, y);
    refreshGrid();
  }
  function ownerChanged() {
    document.documentElement.classList.toggle("zf-owner", !!OWNER);
    var top = document.getElementById("lib-lock");
    if (top) {
      top.setAttribute("aria-pressed", OWNER ? "true" : "false");
      top.querySelector(".lk-txt").textContent = OWNER ? "Hidden notes shown · lock" : "Hidden notes";
    }
    rerender();
  }
  document.addEventListener("click", function (e) {
    var t = e.target.closest(".lib-lock, .pg-unlock, .pg-hide");
    if (!t || !LOCK) return;
    if (t.classList.contains("pg-hide")) setHidden(t.getAttribute("data-list"), +t.getAttribute("data-k"), t.getAttribute("data-hide") === "1");
    else if (t.classList.contains("pg-unlock")) askPassword();
    else toggleLock();
  });
  if (!LOCK) {
    var lb = document.getElementById("lib-lock");
    if (lb) lb.hidden = true;
  } else {
    try {
      var savedPw = sessionStorage.getItem("zf-pw");
      if (savedPw)
        unlockAll(savedPw).then(
          function () {
            OWNER = savedPw;
            ownerChanged();
          },
          function () {
            sessionStorage.removeItem("zf-pw");
          },
        );
    } catch (x) {}
  }

  /* ---------------- routing: #<paper id> opens that paper ---------------- */
  var lastId = null;
  function showPaper(p) {
    render(p);
    listEl.hidden = true;
    paperEl.hidden = false;
    document.title = p.title + " · " + baseTitle;
    lastId = p.id;
    sizeCells();
  }
  function showList() {
    paperEl.hidden = true;
    paperEl.innerHTML = "";
    listEl.hidden = false;
    document.title = baseTitle;
    S = null;
  }
  /* jump to page n (links like #kirsh-2013/p8 from the collage): its first mark, or the column flashes */
  function goToPage(n) {
    if (!S || !n) return;
    var m = null;
    S.marks.forEach(function (x) {
      if (!m && x.page === n && !S.off[x.type]) m = x;
    });
    if (m) setActive(m.i);
    flashPage(n);
    var target = m ? S.btns[m.i] : S.grid.querySelector('.pg-c[data-p="' + n + '"]');
    S.grid.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
    reveal(target);
  }
  function parseHash() {
    var h = decodeURIComponent(location.hash.replace(/^#/, ""));
    var mm = h.match(/^(.*?)(?:\/p(\d+))?$/);
    return { id: mm[1], page: mm[2] ? +mm[2] : 0 };
  }
  function route(animate) {
    var where = parseHash();
    var id = where.id;
    var p = id ? findPaper(id) : null;
    var later = function () {
      if (where.page)
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            goToPage(where.page);
          });
        });
    };
    // same paper, another page: just move in the grid
    if (p && S && S.paper.id === p.id && !paperEl.hidden) {
      goToPage(where.page);
      return;
    }
    if (!animate) {
      if (p) showPaper(p);
      else showList();
      refreshGrid();
      later();
      return;
    }
    // the card's small grid grows into the big grid (and shrinks back)
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
      later();
    });
  }
  window.addEventListener("hashchange", function () {
    route(true);
  });
  /* ---------------- the list: categories, find and sort (built for 100+ papers) ---------------- */
  var cardsBox = document.getElementById("lib-cards");
  var findBox = document.getElementById("lib-find");
  var countEl = document.getElementById("lib-count");
  if (cardsBox) {
    var cards = Array.prototype.slice.call(cardsBox.querySelectorAll(".lib-group:not(.lib-rank) .pcard"));
    var groups = Array.prototype.slice.call(cardsBox.querySelectorAll(".lib-group:not(.lib-rank)"));
    // sorting by what a paper gave me: one ranked list across the categories
    var FACTORS = {
      exp: ["experiment", "experiments", "Ranked by experiments"],
      idea: ["idea to build", "ideas to build", "Ranked by ideas to build"],
      gap: ["gap", "gaps", "Ranked by gaps"],
      know: ["theory & knowledge mark", "theory & knowledge marks", "Ranked by theory & knowledge"],
      nov: ["new framework or concept", "new frameworks & concepts", "Ranked by novelty"],
    };
    var rankBy = "";
    var rankSec = cardsBox.querySelector(".lib-rank");
    var buildRank = function (key) {
      var list = cards.slice().sort(function (a, b) {
        return b.dataset[key] - a.dataset[key] || b.dataset.year - a.dataset.year;
      });
      var max = Math.max(1, +list[0].dataset[key]);
      var ol = rankSec.querySelector("ol");
      ol.innerHTML = "";
      list.forEach(function (card, i) {
        var n = +card.dataset[key];
        var li = document.createElement("li");
        var a = card.cloneNode(true);
        a.classList.add("is-ranked");
        a.style.setProperty("--k", i);
        a.insertAdjacentHTML("afterbegin", '<span class="prow-r">' + (i < 9 ? "0" : "") + (i + 1) + "</span>");
        a.querySelector(".prow-n").innerHTML =
          '<b style="--w:' + Math.round((n / max) * 100) + '%"></b><em>' + (n ? n + " " + FACTORS[key][n === 1 ? 0 : 1] : "none") + "</em>";
        li.appendChild(a);
        ol.appendChild(li);
      });
      rankSec.querySelector(".lib-rank-t").textContent = FACTORS[key][2];
    };
    var onlyCat = "";
    var sorters = {
      new: function (a, b) {
        return b.dataset.year - a.dataset.year;
      },
      old: function (a, b) {
        return a.dataset.year - b.dataset.year;
      },
      az: function (a, b) {
        return a.dataset.title < b.dataset.title ? -1 : 1;
      },
      marks: function (a, b) {
        return b.dataset.marks - a.dataset.marks;
      },
    };
    var applyList = function () {
      var q = findBox ? findBox.value.trim().toLowerCase() : "";
      var shown = 0;
      var match = function (c) {
        return (
          !q ||
          q.split(/\s+/).every(function (w) {
            return c.dataset.find.indexOf(w) >= 0;
          })
        );
      };
      if (rankSec) rankSec.hidden = !rankBy;
      if (rankBy) {
        groups.forEach(function (g) {
          g.hidden = true;
        });
        Array.prototype.forEach.call(rankSec.querySelectorAll("li"), function (li) {
          var c = li.firstChild;
          var hit = match(c) && (!onlyCat || c.dataset.cat === onlyCat);
          li.hidden = !hit;
          if (hit) shown++;
        });
        rankSec.querySelector(".lib-group-n").textContent = shown + (shown === 1 ? " paper" : " papers");
        if (countEl) countEl.textContent = q || onlyCat ? shown + " of " + cards.length + " papers" : cards.length + " papers";
        refreshGrid();
        return;
      }
      groups.forEach(function (g) {
        var inGroup = 0;
        var gc = g.querySelectorAll(".pcard");
        Array.prototype.forEach.call(gc, function (c) {
          var hit = !q || q.split(/\s+/).every(function (w) {
            return c.dataset.find.indexOf(w) >= 0;
          });
          (c.parentNode.tagName === "LI" ? c.parentNode : c).hidden = !hit;
          if (hit) inGroup++;
        });
        var off = onlyCat && g.dataset.cat !== onlyCat;
        // while searching, groups with no hits fold away; an empty category stays visible as a gap
        g.hidden = off || (q && !inGroup);
        if (!off) shown += inGroup;
        var n = g.querySelector(".lib-group-n");
        if (n) n.textContent = (q ? inGroup + " of " + gc.length : gc.length) + (gc.length === 1 ? " paper" : " papers");
      });
      if (countEl) countEl.textContent = q || onlyCat ? shown + " of " + cards.length + " papers" : cards.length + " papers";
      refreshGrid();
    };
    /* the category dropdown: a button and a listbox (arrows, Enter, Esc, click outside) */
    var dd = document.getElementById("lib-dd");
    if (dd) {
      var ddBtn = dd.querySelector(".lib-dd-btn"),
        ddMenu = dd.querySelector(".lib-dd-menu"),
        opts = Array.prototype.slice.call(ddMenu.querySelectorAll("[role=option]"));
      var openDd = function (open, focusSel) {
        ddMenu.hidden = !open;
        ddBtn.setAttribute("aria-expanded", open ? "true" : "false");
        dd.classList.toggle("is-open", open);
        var bar = dd.closest(".lib-tools");
        if (bar) bar.classList.toggle("is-raised", open); // keep the menu above the boxes below
        if (open) {
          var cur = ddMenu.querySelector('[aria-selected="true"]') || opts[0];
          (focusSel === "last" ? opts[opts.length - 1] : cur).focus();
        }
      };
      var choose = function (o) {
        onlyCat = o.dataset.cat;
        opts.forEach(function (x) {
          x.setAttribute("aria-selected", x === o ? "true" : "false");
        });
        var v = ddBtn.querySelector(".lib-dd-v");
        v.style.setProperty("--cat", o.style.getPropertyValue("--cat"));
        v.classList.toggle("is-all", !o.dataset.cat);
        v.querySelector("b").textContent = o.querySelector("span").textContent;
        dd.classList.toggle("is-set", !!onlyCat);
        openDd(false);
        ddBtn.focus();
        applyList();
      };
      ddBtn.addEventListener("click", function () {
        openDd(ddMenu.hidden);
      });
      ddBtn.addEventListener("keydown", function (e) {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          openDd(true, e.key === "ArrowUp" ? "last" : "");
        }
      });
      ddMenu.addEventListener("click", function (e) {
        var o = e.target.closest("[role=option]");
        if (o) choose(o);
      });
      ddMenu.addEventListener("keydown", function (e) {
        var i = opts.indexOf(document.activeElement);
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          var n = opts[(i + (e.key === "ArrowDown" ? 1 : -1) + opts.length) % opts.length];
          n.focus();
        } else if (e.key === "Home" || e.key === "End") {
          e.preventDefault();
          opts[e.key === "Home" ? 0 : opts.length - 1].focus();
        } else if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (i >= 0) choose(opts[i]);
        } else if (e.key === "Escape" || e.key === "Tab") {
          openDd(false);
          if (e.key === "Escape") ddBtn.focus();
        }
      });
      document.addEventListener("click", function (e) {
        if (!ddMenu.hidden && !dd.contains(e.target)) openDd(false);
      });
    }
    // cards or a compact list (one line per paper, for long libraries)
    var views = document.querySelectorAll(".lib-view button");
    if (!views.length) cardsBox.classList.remove("is-list");
    var setView = function (v) {
      cardsBox.classList.toggle("is-list", v === "list");
      Array.prototype.forEach.call(views, function (x) {
        x.setAttribute("aria-pressed", x.dataset.view === v ? "true" : "false");
      });
      try {
        localStorage.setItem("zf-lib-view", v);
      } catch (e) {}
      refreshGrid();
    };
    Array.prototype.forEach.call(views, function (b) {
      b.addEventListener("click", function () {
        setView(b.dataset.view);
      });
    });
    try {
      var saved = localStorage.getItem("zf-lib-view");
      if (views.length) {
        if (saved) setView(saved);
        else if (cards.length > 24) setView("list");
      }
    } catch (e) {}
    // sorting happens inside each category
    Array.prototype.forEach.call(document.querySelectorAll(".lib-sort:not(.lib-view) button"), function (b, i, all) {
      b.addEventListener("click", function () {
        Array.prototype.forEach.call(all, function (x) {
          x.setAttribute("aria-pressed", x === b ? "true" : "false");
        });
        rankBy = FACTORS[b.dataset.sort] ? b.dataset.sort : "";
        if (rankBy) {
          buildRank(rankBy);
          applyList();
          return;
        }
        groups.forEach(function (g) {
          var box = g.querySelector(".lib-rows");
          if (!box) return;
          Array.prototype.slice
            .call(box.querySelectorAll(".pcard"))
            .sort(sorters[b.dataset.sort])
            .forEach(function (c) {
              box.appendChild(c.parentNode); // the <li>
            });
        });
        applyList();
      });
    });
    if (findBox) findBox.addEventListener("input", applyList);
  }

  route(false);
})();
