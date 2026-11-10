/* =========================================================================
   analysis-view.js — renders a paper's analysis (shared by add-paper.html
   and paper.html, so your supervisor sees exactly what you saw).

   AnalysisView.fromLive(a)        live analysis  -> view model
   AnalysisView.fromPaper(p)       saved paper    -> view model
   AnalysisView.compact(a, quotes) live analysis  -> small object saved in papers.js
   AnalysisView.render(el, vm)     draw all the analysis cards into el
   AnalysisView.miniBurst(dna)     tiny DNA-burst SVG (a paper's visual fingerprint)
   ========================================================================= */
(function(){
  "use strict";
  const LEX = window.LEX;
  const esc = s => String(s==null?"":s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const H2 = (t,sub) => `<h2>${t}</h2>${sub?`<p class="av-sub">${sub}</p>`:""}`;
  const MINI_H = "font-size:11.5px;font-weight:800;color:var(--muted,#5c6673);text-transform:uppercase;letter-spacing:.05em;margin:0 0 6px";

  /* ---------- styles (scoped to .av) ---------- */
  const css = `
  .av .av-card{background:var(--panel,#fff); border:1px solid var(--line,#e5e9ef); border-radius:var(--radius,14px);
    padding:20px; box-shadow:var(--shadow,0 6px 18px rgba(16,24,40,.06)); margin-top:16px;}
  .av h2{font-size:12px; letter-spacing:.07em; text-transform:uppercase; color:var(--muted,#5c6673); font-weight:800; margin:0 0 12px;}
  .av .av-sub{color:var(--muted,#5c6673); font-size:13.5px; margin:-4px 0 12px;}
  .av .av-q{font-size:14px; color:var(--muted,#5c6673); font-style:italic; margin:0 0 14px; line-height:1.6;}
  .av .av-key{padding:8px 0 8px 14px; border-left:3px solid var(--accent,#0e9f8e); margin:9px 0; font-size:14px; line-height:1.55;}
  .av .av-note{font-size:13px; color:var(--muted,#5c6673); background:color-mix(in srgb,var(--accent,#0e9f8e) 8%,transparent);
    border:1px dashed color-mix(in srgb,var(--accent,#0e9f8e) 35%,transparent); border-radius:10px; padding:10px 12px;}
  .av .tbar{display:grid; grid-template-columns:118px 1fr 54px; align-items:center; gap:10px; padding:6px 0;}
  .av .tname{font-weight:650; font-size:13.5px; display:flex; gap:7px; align-items:center;}
  .av .tname .dot,.av .chip .dot,.av details summary .dot{width:10px;height:10px;border-radius:50%;background:var(--dot);flex:none;}
  .av .track{height:14px; background:color-mix(in srgb,var(--ink,#15181d) 7%, transparent); border-radius:999px; overflow:hidden;}
  .av .fill{height:100%; border-radius:999px; background:var(--dot);}
  .av .tcount{text-align:right; font-size:13px; color:var(--muted,#5c6673); font-variant-numeric:tabular-nums;}
  .av .barlane{display:grid; grid-template-columns:118px 1fr; gap:10px; align-items:center; margin:5px 0;}
  .av .barlane .tname{font-size:12px;}
  .av .barcode{display:flex; gap:1px; height:24px; border-radius:6px; overflow:hidden; background:color-mix(in srgb,var(--ink,#15181d) 5%, transparent);}
  .av .barcode i{flex:1;}
  .av .barcap{font-size:11.5px; color:var(--muted,#5c6673); margin:2px 0 0 128px;}
  .av .chips{display:flex; flex-wrap:wrap; gap:7px;}
  .av .chip{display:inline-flex; align-items:center; gap:6px; font-size:12.5px; font-weight:650; padding:4px 10px; border-radius:999px;
    color:var(--dot); background:color-mix(in srgb,var(--dot) 15%, transparent);}
  .av .chip .dot{width:7px;height:7px;} .av .chip .n{opacity:.7; font-weight:700;}
  .av .fam{margin:12px 0 4px; font-size:12px; font-weight:800; letter-spacing:.04em; color:var(--muted,#5c6673); text-transform:uppercase;}
  .av .famblock{border-radius:8px; transition:background .12s;}
  .av .famblock:hover{background:color-mix(in srgb,var(--ink,#15181d) 4%, transparent);}
  .av .spark{display:flex; gap:11px; padding:10px 0; border-top:1px solid var(--line,#e5e9ef);}
  .av .spark:first-of-type{border-top:none;}
  .av .spark .st{font-weight:700; font-size:13.5px;} .av .spark .sp{font-size:13px; color:var(--muted,#5c6673); margin-top:1px;}
  .av details.ev{border:1px solid var(--line,#e5e9ef); border-radius:10px; padding:4px 12px; margin:8px 0; background:var(--bg,#f5f7f9);}
  .av details.ev summary{cursor:pointer; font-weight:650; font-size:13.5px; padding:8px 0; display:flex; gap:8px; align-items:center;}
  .av details.ev p{font-size:13px; margin:6px 0 12px; padding-left:17px; border-left:2px solid color-mix(in srgb,var(--dot) 50%,transparent); line-height:1.55;}
  .av mark{background:color-mix(in srgb,var(--accent,#0e9f8e) 30%, transparent); color:inherit; padding:0 2px; border-radius:3px;}
  .av .cloud{display:flex; flex-wrap:wrap; gap:8px 14px; align-items:baseline;}
  .av .cloud .w{font-weight:650; line-height:1.15;} .av .cloud .w span{color:var(--muted,#5c6673); font-size:11px; font-weight:600;}
  /* DNA lens burst */
  .av .lensviz{position:relative; margin:2px 0 14px; border-radius:14px; overflow:hidden; padding:8px;
    background:radial-gradient(130% 130% at 50% 46%, #141d3a 0%, #0a1024 55%, #05070f 100%); border:1px solid #121a33;}
  .av .lensviz svg{display:block; width:100%; max-width:560px; height:auto; margin:0 auto; cursor:grab; touch-action:none; user-select:none;}
  .av .lensviz.grabbing svg{cursor:grabbing;}
  .av .ray{animation:avdraw .75s cubic-bezier(.2,.7,.2,1) forwards; transition:opacity .15s;}
  .av .tip{opacity:0; animation:avtip .45s ease forwards;}
  @keyframes avdraw{to{stroke-dashoffset:0;}} @keyframes avtip{to{opacity:1;}}
  .av .rayg:hover .ray{stroke-width:3.6px;}
  .av .lensviz.dimmed .rayg:not(.on) .ray,.av .lensviz.dimmed .rayg:not(.on) .tip,.av .lensviz.dimmed .rayg:not(.on) .rlabel{opacity:.08;}
  .av .center{filter:drop-shadow(0 0 7px rgba(255,255,255,.85));}
  .av .rlabel{font-size:var(--fs,12px); font-weight:650; opacity:0; pointer-events:none; transition:opacity .2s;
    paint-order:stroke; stroke:#070a17; stroke-width:calc(var(--fs,12px) * .32); stroke-linejoin:round; font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif;}
  .av .rlabel.top{opacity:.85;} .av .lensviz.zoomed .rlabel{opacity:.95;} .av .rayg:hover .rlabel{opacity:1;}
  .av .lenstip{position:absolute; pointer-events:none; left:0; top:0; background:rgba(8,12,24,.94); color:#fff; border:1px solid rgba(255,255,255,.16);
    border-radius:8px; padding:5px 9px; font-size:12px; font-weight:650; opacity:0; transition:opacity .1s; white-space:nowrap; z-index:5;}
  .av .lenstip.show{opacity:1;}
  .av .zoombar{position:absolute; right:12px; top:12px; display:flex; gap:4px; align-items:center; background:rgba(8,12,24,.72);
    border:1px solid rgba(255,255,255,.12); border-radius:10px; padding:4px;}
  .av .zoombar button{width:30px; height:30px; border:none; border-radius:7px; background:transparent; color:#e8ecf5; font-size:17px; font-weight:700; cursor:pointer;}
  .av .zoombar button:hover{background:rgba(255,255,255,.12);}
  .av .zlevel{color:#9aa6bb; font-size:11.5px; font-weight:700; min-width:42px; text-align:center;}
  .av .zhint{position:absolute; left:14px; bottom:10px; color:rgba(220,228,240,.45); font-size:11px; pointer-events:none;}
  .av .lenslegend{font-size:12px; color:var(--muted,#5c6673); text-align:center; margin:-2px 0 10px;}
  @media (max-width:560px){ .av .tbar{grid-template-columns:92px 1fr 40px;} .av .barlane{grid-template-columns:92px 1fr;} .av .barcap{margin-left:102px;} }
  @media (prefers-reduced-motion: reduce){ .av .ray,.av .tip{animation:none; stroke-dashoffset:0; opacity:1;} }`;
  if(!document.getElementById("av-css")){ const st=document.createElement("style"); st.id="av-css"; st.textContent=css; document.head.appendChild(st); }

  /* ---------- view models ---------- */
  function lensFromDna(dna){
    const lens = {};
    Object.entries(dna||{}).forEach(([t,n]) => { const f = LEX.familyOf(t); (lens[f]=lens[f]||[]).push({t,n}); });
    Object.values(lens).forEach(a => a.sort((x,y)=>y.n-x.n));
    const ordered = {}; Object.keys(LEX.LENS).forEach(f => { if(lens[f]) ordered[f]=lens[f]; });
    return ordered;
  }
  function fromLive(a){
    return { title:a.title, year:a.year, pages:a.pages, words:a.wordCount, abstract:a.abstract, summary:a.summary||[],
      themes:a.themes.map(t=>({ key:t.key, label:t.label, short:t.short, color:t.color, count:t.count, present:t.present,
        evidence:(t.evidence||[]).map(e=>({s:e.s, hit:e.hit})), bins:t.bins })),
      lens:a.lens||{}, sparks:a.sparks||[], concepts:a.concepts||[], partial:false };
  }
  function fromPaper(p){
    const A = p.analysis || null, kw = p.keywords || {}, dna = p.dna || {};
    const themes = LEX.THEMES.map(th => { const st = A && A.themes && A.themes[th.key];
      return { key:th.key, label:th.label, short:th.short, color:th.color, present:!!kw[th.key],
        count: st ? st.n : null, evidence: st && st.ev ? st.ev.map(([s,hit])=>({s,hit})) : [],
        bins: st && st.bins ? st.bins.split("").map(Number) : null }; });
    const sparks = A && A.sparks
      ? A.sparks.map(([t,n]) => ({ t, n, s:(LEX.sparkFor(t)||{}).s || "" })).filter(x=>x.s)
      : LEX.SPARKS.map(sp => { const k = Object.keys(dna).find(d => d===sp.t || d.startsWith(sp.t) || sp.t.startsWith(d));
          return k ? { t:sp.t, n:dna[k], s:sp.s } : null; }).filter(Boolean);
    const concepts = A && A.concepts ? A.concepts
      : Object.entries(dna).sort((a,b)=>b[1]-a[1]).slice(0,20).map(([k,n])=>[LEX.label(k),n]);
    return { title:p.title, year:p.year, authors:p.authors, pages:A&&A.pages, words:A&&A.words,
      abstract:A&&A.abstract || "", summary:A&&A.summary || [], themes, lens:lensFromDna(dna), sparks, concepts, partial:!A };
  }
  function compact(a, quotes){
    const themes = {};
    a.themes.forEach(t => { themes[t.key] = { n:t.count,
      ev: quotes ? (t.evidence||[]).map(e=>[e.s, e.hit]) : [],
      bins: (t.bins||[]).map(v=>Math.min(9,v)).join("") }; });
    return { v:1, pages:a.pages, words:a.wordCount, abstract: quotes ? (a.abstract||"") : "", summary: quotes ? (a.summary||[]) : [],
      themes, concepts:(a.concepts||[]).slice(0,22), sparks:(a.sparks||[]).map(s=>[s.t, s.n]) };
  }

  /* ---------- helpers ---------- */
  function highlight(s, term){
    if(!term) return esc(s);
    try{ const re=new RegExp("("+term.trim().replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"[a-z]*)","ig");
      return esc(s).replace(re, m=>"<mark>"+m+"</mark>"); }catch(e){ return esc(s); }
  }

  /* ---------- the radial DNA burst ---------- */
  function burstRays(lens, cx, cy, minR, maxR, gap){
    const fams = Object.keys(lens), all = [];
    fams.forEach(f => lens[f].forEach(x => all.push(x)));
    const maxN = Math.max(1, ...all.map(r=>r.n)), total = all.length || 1, usable = Math.PI*2 - fams.length*gap;
    let ang = -Math.PI/2; const rays = [];
    fams.forEach(f => { const items = lens[f].slice().sort((x,y)=>y.n-x.n), span = usable*(items.length/total), hue = LEX.FAM_HUE[f]||{h:0,s:0};
      items.forEach((it,i) => { const slot = items.length>1 ? span*((i+0.5)/items.length) : span/2;
        rays.push({ fam:f, t:it.t, n:it.n, angle:ang+slot, len:minR+Math.sqrt(it.n/maxN)*(maxR-minR), hue:hue.h, sat:hue.s, nl:it.n/maxN }); });
      ang += span + gap; });
    return rays;
  }
  function miniBurst(dna){
    const rays = burstRays(lensFromDna(dna), 50, 50, 11, 45, 0.08);
    const lines = rays.map(r => { const x=50+Math.cos(r.angle)*r.len, y=50+Math.sin(r.angle)*r.len, l=50+r.nl*24;
      return `<line x1="50" y1="50" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="hsla(${r.hue},${r.sat}%,${l}%,${(.55+r.nl*.4).toFixed(2)})" stroke-width="${(.7+r.nl*1.5).toFixed(2)}" stroke-linecap="round"/>`+
        `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(.7+r.nl*1.3).toFixed(2)}" fill="hsla(${r.hue},${r.sat}%,${Math.min(82,l+14)}%,.95)"/>`; }).join("");
    return `<svg viewBox="0 0 100 100" aria-hidden="true"><defs><radialGradient id="mg" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="rgba(255,150,90,.22)"/><stop offset="100%" stop-color="rgba(0,0,0,0)"/></radialGradient></defs>`+
      `<circle cx="50" cy="50" r="48" fill="url(#mg)"/>${lines}<circle cx="50" cy="50" r="1.8" fill="#fff"/></svg>`;
  }

  function lensCard(vm){
    const fams = Object.keys(vm.lens);
    if(!fams.length) return `<div class="av-card">${H2("🧬 DNA lens — concepts related to your work")}<p class="av-sub">No related concepts were detected in this paper.</p></div>`;
    const rays = burstRays(vm.lens, 300, 300, 58, 256, 0.06);
    const topSet = new Set(rays.slice().sort((x,y)=>y.n-x.n).slice(0,6));
    const rings = [72,120,168,216].map(r=>`<circle cx="300" cy="300" r="${r}" fill="none" stroke="rgba(255,228,200,.05)" vector-effect="non-scaling-stroke"/>`).join("");
    const rayHtml = rays.map((r,i) => {
      const x2=300+Math.cos(r.angle)*r.len, y2=300+Math.sin(r.angle)*r.len, lx=300+Math.cos(r.angle)*(r.len+8), ly=300+Math.sin(r.angle)*(r.len+8);
      const l=48+r.nl*26, col=`hsla(${r.hue},${r.sat}%,${l}%,${(.5+r.nl*.45).toFixed(2)})`, tipc=`hsla(${r.hue},${r.sat}%,${Math.min(82,l+16)}%,.95)`, d=i*6;
      return `<g class="rayg" data-fam="${esc(r.fam)}" data-name="${esc(LEX.label(r.t))}" data-n="${r.n}">`+
        `<line class="ray" x1="300" y1="300" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${col}" stroke-width="${(1+r.nl*2.2).toFixed(2)}" stroke-linecap="round" vector-effect="non-scaling-stroke" style="stroke-dasharray:${r.len.toFixed(1)};stroke-dashoffset:${r.len.toFixed(1)};animation-delay:${d}ms"/>`+
        `<circle class="tip" cx="${x2.toFixed(1)}" cy="${y2.toFixed(1)}" r="${(1.3+r.nl*2.3).toFixed(2)}" fill="${tipc}" style="animation-delay:${d+240}ms"/>`+
        `<text class="rlabel${topSet.has(r)?" top":""}" x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="${Math.cos(r.angle)>=0?"start":"end"}" dominant-baseline="middle" fill="${tipc}">${esc(LEX.label(r.t))} ${r.n}</text></g>`;
    }).join("");
    const chips = fams.map(f => `<div class="famblock" data-fam="${esc(f)}"><div class="fam">${esc(f)}</div>
      <div class="chips">${vm.lens[f].map(x=>`<span class="chip" style="--dot:${LEX.LENS_COLOR[f]}"><span class="dot"></span>${esc(LEX.label(x.t))}<span class="n">${x.n}</span></span>`).join("")}</div></div>`).join("");
    return `<div class="av-card">${H2("🧬 DNA lens — concepts related to your work","Ideas from the research neighbourhood that show up in this paper. Each ray is a concept; longer = more mentions; colour = research area.")}
      <div class="lensviz"><svg viewBox="0 0 600 600" role="img" aria-label="Radial map of concepts in this paper">
        <defs><radialGradient id="avGlow" cx="50%" cy="48%" r="52%"><stop offset="0%" stop-color="rgba(255,150,90,.15)"/><stop offset="55%" stop-color="rgba(255,120,80,.04)"/><stop offset="100%" stop-color="rgba(0,0,0,0)"/></radialGradient></defs>
        <rect x="-600" y="-600" width="1800" height="1800" fill="url(#avGlow)"/>${rings}${rayHtml}<circle class="center" cx="300" cy="300" r="3.4" fill="#fff"/></svg>
        <div class="lenstip"></div>
        <div class="zoombar"><button data-z="in" title="Zoom in">+</button><button data-z="out" title="Zoom out">−</button><button data-z="reset" title="Reset">⟲</button><span class="zlevel">100%</span></div>
        <div class="zhint">scroll to zoom · drag to move · double‑click to reset</div></div>
      <div class="lenslegend">Zoom in to read every label · hover a research area below to isolate it</div>${chips}</div>`;
  }

  function wireLens(root){
    const viz = root.querySelector(".lensviz"); if(!viz) return;
    const svg = viz.querySelector("svg"), lvl = viz.querySelector(".zlevel"), tip = viz.querySelector(".lenstip");
    const FULL=600, MIN=110; let vb={x:0,y:0,w:FULL};
    const apply = () => { const pad=FULL*.35; vb.x=Math.max(-pad,Math.min(FULL-vb.w+pad,vb.x)); vb.y=Math.max(-pad,Math.min(FULL-vb.w+pad,vb.y));
      svg.setAttribute("viewBox",`${vb.x.toFixed(1)} ${vb.y.toFixed(1)} ${vb.w.toFixed(1)} ${vb.w.toFixed(1)}`);
      lvl.textContent=Math.round(FULL/vb.w*100)+"%"; svg.style.setProperty("--fs",(11.5*vb.w/Math.max(1,svg.clientWidth)).toFixed(2)+"px");
      viz.classList.toggle("zoomed", FULL/vb.w>=1.45); };
    const zoomAt = (f,sx,sy) => { const nw=Math.max(MIN,Math.min(FULL,vb.w/f)); vb.x=sx-(sx-vb.x)*(nw/vb.w); vb.y=sy-(sy-vb.y)*(nw/vb.w); vb.w=nw; apply(); };
    const toSvg = e => { const r=svg.getBoundingClientRect(); return {x:vb.x+(e.clientX-r.left)/r.width*vb.w, y:vb.y+(e.clientY-r.top)/r.height*vb.w}; };
    viz.addEventListener("wheel", e=>{ e.preventDefault(); const p=toSvg(e); zoomAt(e.deltaY<0?1.18:1/1.18,p.x,p.y); }, {passive:false});
    let drag=null;
    svg.addEventListener("pointerdown", e=>{ drag={x:e.clientX,y:e.clientY,vx:vb.x,vy:vb.y}; svg.setPointerCapture(e.pointerId); viz.classList.add("grabbing"); });
    svg.addEventListener("pointermove", e=>{ if(!drag) return; const r=svg.getBoundingClientRect(); vb.x=drag.vx-(e.clientX-drag.x)/r.width*vb.w; vb.y=drag.vy-(e.clientY-drag.y)/r.height*vb.w; apply(); });
    const end=()=>{ drag=null; viz.classList.remove("grabbing"); };
    svg.addEventListener("pointerup",end); svg.addEventListener("pointercancel",end);
    svg.addEventListener("dblclick", ()=>{ vb={x:0,y:0,w:FULL}; apply(); });
    viz.querySelectorAll(".zoombar button").forEach(b=> b.onclick=()=>{ const c=vb.x+vb.w/2, d=vb.y+vb.w/2;
      if(b.dataset.z==="in") zoomAt(1.4,c,d); else if(b.dataset.z==="out") zoomAt(1/1.4,c,d); else { vb={x:0,y:0,w:FULL}; apply(); } });
    viz.addEventListener("mousemove", e=>{ const g=e.target.closest(".rayg");
      if(g && !drag){ const r=viz.getBoundingClientRect(); tip.textContent=g.dataset.name+" · "+g.dataset.n+"×"; tip.classList.add("show");
        tip.style.left=Math.max(4,Math.min(e.clientX-r.left+12, r.width-tip.offsetWidth-6))+"px"; tip.style.top=(e.clientY-r.top+10)+"px"; }
      else tip.classList.remove("show"); });
    viz.addEventListener("mouseleave", ()=>tip.classList.remove("show"));
    root.querySelectorAll(".famblock").forEach(fb=>{
      fb.addEventListener("mouseenter",()=>{ viz.classList.add("dimmed"); root.querySelectorAll(".rayg").forEach(g=>g.classList.toggle("on",g.dataset.fam===fb.dataset.fam)); });
      fb.addEventListener("mouseleave",()=>{ viz.classList.remove("dimmed"); root.querySelectorAll(".rayg").forEach(g=>g.classList.remove("on")); }); });
    window.addEventListener("resize", apply); apply();
  }

  /* ---------- render everything ---------- */
  function render(el, vm){
    el.classList.add("av");
    const parts = [];
    const partialNote = `<p class="av-note">The full reading of this paper hasn’t been saved yet, so this page shows what is known from its concept fingerprint. Re‑analyse the PDF on <b>Analyze a paper</b> to add its summary and evidence.</p>`;

    /* gist */
    let gist = "";
    if(vm.abstract) gist += `<div style="${MINI_H}">Abstract (from the paper)</div><p class="av-q">${esc(vm.abstract)}</p>`;
    if(vm.summary && vm.summary.length) gist += `<div style="${MINI_H}">Key sentences</div>${vm.summary.map(s=>`<div class="av-key">${esc(s)}</div>`).join("")}`;
    if(!gist) gist = vm.partial ? partialNote : `<p class="av-sub">No summary saved for this paper.</p>`;
    parts.push(`<div class="av-card">${H2("In short — the gist")}${gist}</div>`);

    /* theme DNA */
    const counted = vm.themes.some(t=>t.count!=null), maxT = Math.max(1, ...vm.themes.map(t=>t.count||0));
    let th = counted
      ? vm.themes.map(t=>`<div class="tbar" style="--dot:${t.color}"><div class="tname"><span class="dot"></span>${esc(t.label)}${t.present?"":' <span style="color:var(--muted);font-weight:500;font-size:11px">(not ticked)</span>'}</div>
          <div class="track"><div class="fill" style="width:${Math.round((t.count||0)/maxT*100)}%"></div></div><div class="tcount">${t.count||0}</div></div>`).join("")
      : `<div class="chips">${vm.themes.filter(t=>t.present).map(t=>`<span class="chip" style="--dot:${t.color}"><span class="dot"></span>${esc(t.label)}</span>`).join("") || '<span class="av-sub">No themes ticked.</span>'}</div>`;
    if(vm.themes.some(t=>t.bins && t.bins.some(v=>v>0))){
      th += `<div style="margin-top:16px"><div style="${MINI_H}">Signature — where each theme appears across the paper</div>`+
        vm.themes.map(t=>{ const bins=t.bins||[], mx=Math.max(1,...bins);
          return `<div class="barlane" style="--dot:${t.color}"><div class="tname"><span class="dot"></span>${esc(t.short)}</div><div class="barcode">${
            bins.map(v=>`<i style="background:${v?`color-mix(in srgb, ${t.color} ${Math.round(25+v/mx*75)}%, transparent)`:"transparent"}"></i>`).join("")}</div></div>`; }).join("")+
        `<div class="barcap">left = start of paper · right = end</div></div>`;
    }
    parts.push(`<div class="av-card">${H2("Theme DNA — how strongly the five thesis themes appear")}${th}</div>`);

    /* lens */
    parts.push(lensCard(vm));

    /* sparks */
    if(vm.sparks.length) parts.push(`<div class="av-card">${H2("💡 Idea sparks")}${vm.sparks.map(sp=>`
      <div class="spark"><div style="font-size:18px">💡</div><div><div class="st">“${esc(LEX.label(sp.t))}” appears ${sp.n}×</div><div class="sp">${esc(sp.s)}</div></div></div>`).join("")}</div>`);

    /* evidence */
    const ev = vm.themes.filter(t=>t.evidence && t.evidence.length);
    if(ev.length) parts.push(`<div class="av-card">${H2("Evidence — the sentences behind each theme")}${ev.map(t=>`
      <details class="ev" style="--dot:${t.color}" ${t.present?"open":""}><summary><span class="dot"></span>${esc(t.label)}${t.count!=null?` — ${t.count} mention${t.count===1?"":"s"}`:""}</summary>
      ${t.evidence.map(e=>`<p>${highlight(e.s, e.hit)}</p>`).join("")}</details>`).join("")}</div>`);

    /* key phrases */
    if(vm.concepts.length){ const mx=Math.max(...vm.concepts.map(c=>c[1])), mn=Math.min(...vm.concepts.map(c=>c[1]));
      parts.push(`<div class="av-card">${H2("Key phrases in this paper")}<div class="cloud">${vm.concepts.map(([w,n])=>
        `<span class="w" style="font-size:${(13+(n-mn)/(mx-mn||1)*13).toFixed(1)}px">${esc(w)} <span>${n}</span></span>`).join("")}</div></div>`); }

    el.innerHTML = parts.join("");
    wireLens(el);
  }

  window.AnalysisView = { fromLive, fromPaper, compact, render, miniBurst, lensFromDna };
})();
