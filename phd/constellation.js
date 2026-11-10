/* =========================================================================
   constellation.js — 3D map of how your papers relate through shared words
   -------------------------------------------------------------------------
   Planets  = papers (colour = dominant theme, ring = themes covered)
   Lines    = papers that share DNA concepts (brighter = more in common)
   Stars    = ideas: concepts supported by several papers (+ a research prompt)
   No libraries: a tiny 3D projection on a <canvas>.
   ========================================================================= */
(function(){
  "use strict";
  const LEX = window.LEX, THEMES = LEX.THEMES;
  const $ = s => document.querySelector(s);
  const esc = s => String(s==null?"":s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
  const nav = document.querySelector(".topnav");
  document.documentElement.style.setProperty("--navh", (nav ? nav.offsetHeight : 49) + "px");

  const FAM_THEME = { "Collaboration & social":"collaborative", "Embodiment & gesture":"embodied",
    "Learning & cognition":"learning", "Mathematics":"mathematics", "VR, HCI & immersion":"vr" };
  const THEME_HEX = Object.fromEntries(THEMES.map(t => [t.key, t.hex]));
  const rgb = hex => { const n = parseInt(hex.slice(1),16); return [n>>16&255, n>>8&255, n&255]; };
  const rgba = (hex,a) => { const [r,g,b] = rgb(hex); return `rgba(${r},${g},${b},${a})`; };
  function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a);
    t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
  const rnd = mulberry32(11);

  /* ===================== DATA ===================== */
  const RAW = Array.isArray(window.PAPERS) ? window.PAPERS : [];
  if(!RAW.length){ $("#empty").style.display = "flex"; }
  let noDna = 0;
  const conceptLabel = s => s.startsWith("theme:") ? ((THEMES.find(t=>t.key===s.slice(6))||{}).label + " (theme)") : LEX.label(s);
  const conceptHex = s => s.startsWith("theme:") ? THEME_HEX[s.slice(6)] : (THEME_HEX[FAM_THEME[LEX.familyOf(s)]] || "#9aa6bb");

  const papers = RAW.map((p,i) => {
    const kw = p.keywords || {};
    const themes = THEMES.filter(t => kw[t.key]).map(t => t.key);
    let dna = p.dna && Object.keys(p.dna).length ? p.dna : null;
    if(!dna){ noDna++; dna = {}; themes.forEach(t => dna["theme:"+t] = 1); }
    const sc = {};
    Object.entries(dna).forEach(([s,n]) => {
      const th = s.startsWith("theme:") ? s.slice(6) : FAM_THEME[LEX.familyOf(s)];
      if(th && themes.includes(th)) sc[th] = (sc[th]||0) + n;
    });
    const dom = Object.keys(sc).sort((a,b)=>sc[b]-sc[a])[0] || themes[0] || null;
    return { kind:"paper", id:"p"+i, title:p.title||"Untitled", year:p.year||"", themes, dna, dom,
      color: dom ? THEME_HEX[dom] : "#9aa6bb", size: 4.5 + 1.4*Math.sqrt(Object.keys(dna).length),
      x:0,y:0,z:0, vx:0,vy:0,vz:0 };
  });

  /* similarity between papers: cosine over sqrt-weighted concept counts */
  papers.forEach(p => { p._v = {}; let n = 0;
    for(const [k,c] of Object.entries(p.dna)){ p._v[k] = Math.sqrt(c); n += c; } p._norm = Math.sqrt(n) || 1; });
  const allEdges = [];
  for(let i=0;i<papers.length;i++) for(let j=i+1;j<papers.length;j++){
    const a = papers[i], b = papers[j]; let dot = 0; const shared = [];
    for(const k in a._v) if(b._v[k]){ dot += a._v[k]*b._v[k]; shared.push([k, Math.min(a.dna[k], b.dna[k])]); }
    if(!dot) continue;
    shared.sort((x,y)=>y[1]-x[1]);
    allEdges.push({ a, b, sim: dot/(a._norm*b._norm), shared: shared.map(s=>s[0]) });
  }
  const keep = new Set();
  papers.forEach(p => allEdges.filter(e => e.a===p || e.b===p).sort((x,y)=>y.sim-x.sim).slice(0,5).forEach(e => keep.add(e)));
  allEdges.forEach(e => { if(e.sim >= 0.4) keep.add(e); });
  const edges = [...keep];
  const edgesOf = p => allEdges.filter(e => e.a===p || e.b===p).sort((x,y)=>y.sim-x.sim);

  /* idea stars: concepts supported by 2+ papers */
  const conc = {};
  papers.forEach(p => Object.entries(p.dna).forEach(([s,n]) => {
    if(s.startsWith("theme:")) return;
    (conc[s] = conc[s] || { stem:s, papers:[], total:0 }).papers.push(p); conc[s].total += n;
  }));
  let stars = Object.values(conc).filter(c => c.papers.length >= 2)
    .map(c => ({ ...c, score: c.papers.length + 0.08*c.total }))
    .sort((a,b)=>b.score-a.score).slice(0, 14);
  const maxScore = Math.max(1, ...stars.map(s=>s.score));
  stars = stars.map((c,i) => {
    const co = {};
    c.papers.forEach(p => Object.keys(p.dna).forEach(k => { if(k!==c.stem && !k.startsWith("theme:")) co[k]=(co[k]||0)+1; }));
    const best = Object.entries(co).sort((a,b)=>b[1]-a[1])[0];
    const partner = best && best[1] >= 2 ? best : null;
    const spark = LEX.sparkFor(c.stem), k = c.papers.length;
    const text = spark ? spark.s : partner
      ? `Bring “${LEX.label(c.stem)}” together with “${LEX.label(partner[0])}” — ${partner[1]} of your papers already connect them, so a study uniting both stands on solid ground.`
      : `“${LEX.label(c.stem)}” recurs across ${k} papers — a promising thread to build on.`;
    const th = new Set(); c.papers.forEach(p => p.themes.forEach(t => th.add(t)));
    return { kind:"star", id:"s"+i, stem:c.stem, label:LEX.label(c.stem), papers:c.papers, total:c.total, score:c.score,
      strength: k>=5 ? "Strong" : k>=3 ? "Growing" : "Emerging", text,
      partner: partner ? { label:LEX.label(partner[0]), n:partner[1] } : null,
      themes:[...th], size: 4 + 6*(c.score/maxScore), phase: rnd()*6.283, x:0,y:0,z:0, vx:0,vy:0,vz:0 };
  });
  const starLinks = [];
  for(let i=0;i<stars.length;i++) for(let j=i+1;j<stars.length;j++){
    const n = stars[i].papers.filter(p => stars[j].papers.includes(p)).length;
    if(n >= 2) starLinks.push({ a:stars[i], b:stars[j], n });
  }
  const nodes = [...papers, ...stars];
  const byId = Object.fromEntries(nodes.map(n => [n.id, n]));

  /* ===================== 3D LAYOUT (force simulation) ===================== */
  papers.forEach(p => { const u=rnd()*2-1, t=rnd()*6.283, r=170*Math.cbrt(rnd()), s=Math.sqrt(1-u*u);
    p.x=r*s*Math.cos(t); p.y=r*u; p.z=r*s*Math.sin(t); });
  stars.forEach(s => { let x=0,y=0,z=0; s.papers.forEach(p=>{x+=p.x;y+=p.y;z+=p.z;}); const n=s.papers.length;
    s.x=x/n+rnd()*30-15; s.y=y/n+rnd()*30-15; s.z=z/n+rnd()*30-15; });
  function spring(a,b,rest,k){ const dx=b.x-a.x, dy=b.y-a.y, dz=b.z-a.z, d=Math.sqrt(dx*dx+dy*dy+dz*dz)||.01, f=(d-rest)*k;
    a.vx+=dx/d*f; a.vy+=dy/d*f; a.vz+=dz/d*f; b.vx-=dx/d*f; b.vy-=dy/d*f; b.vz-=dz/d*f; }
  const ITER = 420;
  for(let it=0; it<ITER; it++){
    const cool = 1 - it/ITER*0.85;
    for(let i=0;i<nodes.length;i++) for(let j=i+1;j<nodes.length;j++){
      const a=nodes[i], b=nodes[j], dx=a.x-b.x, dy=a.y-b.y, dz=a.z-b.z, d2=dx*dx+dy*dy+dz*dz+1, d=Math.sqrt(d2);
      const k = (a.kind==="star" && b.kind==="star") ? 6000 : 9500, f = k/d2*cool;
      a.vx+=dx/d*f; a.vy+=dy/d*f; a.vz+=dz/d*f; b.vx-=dx/d*f; b.vy-=dy/d*f; b.vz-=dz/d*f;
    }
    edges.forEach(e => spring(e.a, e.b, 55 + 170*(1-e.sim), 0.012 + 0.045*e.sim));
    stars.forEach(s => s.papers.forEach(p => spring(s, p, 62, 0.018)));
    nodes.forEach(n => { n.vx-=n.x*0.0035; n.vy-=n.y*0.0035; n.vz-=n.z*0.0035;
      n.vx=clamp(n.vx,-18,18); n.vy=clamp(n.vy,-18,18); n.vz=clamp(n.vz,-18,18);
      n.x+=n.vx; n.y+=n.vy; n.z+=n.vz; n.vx*=0.8; n.vy*=0.8; n.vz*=0.8; });
  }
  (function normalise(){ if(!nodes.length) return; let cx=0,cy=0,cz=0; nodes.forEach(n=>{cx+=n.x;cy+=n.y;cz+=n.z;});
    cx/=nodes.length; cy/=nodes.length; cz/=nodes.length;
    const ds = nodes.map(n=>{ n.x-=cx; n.y-=cy; n.z-=cz; return Math.hypot(n.x,n.y,n.z); }).sort((a,b)=>a-b);
    const R = ds[Math.floor(ds.length*0.85)] || 1;          // robust to a few far outliers
    const s=230/R; nodes.forEach(n=>{ n.x*=s; n.y*=s; n.z*=s; }); })();

  /* ===================== CAMERA & CANVAS ===================== */
  const cvs = $("#sky"), ctx = cvs.getContext("2d");
  let W=0, H=0, DPR=1, F=600;
  function resize(){ DPR = Math.min(2, window.devicePixelRatio||1); W = cvs.clientWidth; H = cvs.clientHeight;
    cvs.width = W*DPR; cvs.height = H*DPR; ctx.setTransform(DPR,0,0,DPR,0,0); F = 0.95*Math.min(W,H); }
  window.addEventListener("resize", resize); resize();

  const cam  = { yaw:0.7, pitch:-0.28, dist:1500, tx:0, ty:0, tz:0, cx:0 };
  const goal = { dist:560, tx:0, ty:0, tz:0 };
  const ui = { links:true, stars:true, labels:true, spin:true, strength:0.12, filter:new Set() };
  let hovered=null, selected=null, idleSince=0, dragging=false;

  function project(x,y,z){
    const vx=x-cam.tx, vy=y-cam.ty, vz=z-cam.tz, cy=Math.cos(cam.yaw), sy=Math.sin(cam.yaw), cp=Math.cos(cam.pitch), sp=Math.sin(cam.pitch);
    const x1=vx*cy - vz*sy, z1=vx*sy + vz*cy, y2=vy*cp - z1*sp, z2=vy*sp + z1*cp, depth=z2+cam.dist;
    if(depth < 8) return null;
    const s = F/depth; return { x: W/2 + cam.cx + x1*s, y: H/2 + y2*s, s, depth };
  }

  /* far background: starfield + soft nebulae (directions only → infinite distance) */
  const sky = Array.from({length:1100}, () => { const u=rnd()*2-1, t=rnd()*6.283, s=Math.sqrt(1-u*u);
    return { x:s*Math.cos(t), y:u, z:s*Math.sin(t), b:rnd(), ph:rnd()*6.28 }; });
  const nebulae = [ {d:[0.6,-0.3,0.7], c:"#ff8a4c"}, {d:[-0.7,0.2,0.5], c:"#6b93ff"}, {d:[0.1,0.5,-0.85], c:"#ff6fae"}, {d:[-0.4,-0.6,-0.6], c:"#2fd2be"} ];
  function dirProject(x,y,z){ const cy=Math.cos(cam.yaw), sy=Math.sin(cam.yaw), cp=Math.cos(cam.pitch), sp=Math.sin(cam.pitch);
    const x1=x*cy-z*sy, z1=x*sy+z*cy, y2=y*cp-z1*sp, z2=y*sp+z1*cp; if(z2<0.05) return null;
    return { x: W/2 + cam.cx + x1/z2*F*0.6, y: H/2 + y2/z2*F*0.6 }; }

  /* ===================== FOCUS & FILTER ===================== */
  const passes = n => {
    if(!ui.filter.size) return true;
    if(n.kind==="paper") return [...ui.filter].every(t => n.themes.includes(t));
    return n.papers.some(p => [...ui.filter].every(t => p.themes.includes(t)));
  };
  const visibleEdge = e => e.sim >= ui.strength && passes(e.a) && passes(e.b);
  function focusSet(){
    const a = selected || hovered; if(!a) return null;
    const s = new Set([a]);
    if(a.kind==="paper"){ edges.forEach(e => { if(visibleEdge(e) && (e.a===a||e.b===a)) s.add(e.a===a?e.b:e.a); });
      stars.forEach(st => { if(st.papers.includes(a)) s.add(st); }); }
    else { a.papers.forEach(p => s.add(p)); starLinks.forEach(l => { if(l.a===a) s.add(l.b); if(l.b===a) s.add(l.a); }); }
    return s;
  }

  /* ===================== RENDER LOOP ===================== */
  function line(p,q,stroke,w,dash){ ctx.beginPath(); ctx.setLineDash(dash||[]); ctx.strokeStyle=stroke; ctx.lineWidth=w;
    ctx.moveTo(p.x,p.y); ctx.lineTo(q.x,q.y); ctx.stroke(); }
  function textAt(str,x,y,color,size,weight,align){
    ctx.font = `${weight||600} ${size}px -apple-system,"Segoe UI",Roboto,Arial,sans-serif`; ctx.textAlign = align||"center";
    ctx.textBaseline = "middle"; ctx.lineWidth = 3.2; ctx.strokeStyle = "rgba(4,6,13,.85)"; ctx.setLineDash([]);
    ctx.strokeText(str,x,y); ctx.fillStyle = color; ctx.fillText(str,x,y); }
  const fogOf = p => clamp(1 - (p.depth - cam.dist)/900, 0.3, 1);

  function frame(t){
    /* camera easing */
    cam.dist += (goal.dist-cam.dist)*0.075; cam.tx += (goal.tx-cam.tx)*0.075; cam.ty += (goal.ty-cam.ty)*0.075; cam.tz += (goal.tz-cam.tz)*0.075;
    const open = $("#detail").classList.contains("open");
    const leftW = (W>820 && !(open && W<=1180)) ? 332 : 0, rightW = (W>820 && open) ? 382 : 0;
    cam.cx += ((leftW-rightW)/2 - cam.cx)*0.08;
    if(ui.spin && !dragging && t-idleSince > 2500) cam.yaw += 0.0011;

    /* background */
    const bg = ctx.createRadialGradient(W/2+cam.cx, H/2, 0, W/2+cam.cx, H/2, Math.max(W,H)*0.75);
    bg.addColorStop(0,"#0b1330"); bg.addColorStop(0.55,"#060a1a"); bg.addColorStop(1,"#03040a");
    ctx.globalCompositeOperation="source-over"; ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);
    ctx.globalCompositeOperation="lighter";
    nebulae.forEach(nb => { const p=dirProject(...nb.d); if(!p) return; const R=Math.min(W,H)*0.55;
      const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,R); g.addColorStop(0,rgba(nb.c,.075)); g.addColorStop(1,rgba(nb.c,0));
      ctx.fillStyle=g; ctx.fillRect(p.x-R,p.y-R,2*R,2*R); });
    sky.forEach(s => { const p=dirProject(s.x,s.y,s.z); if(!p || p.x<0||p.y<0||p.x>W||p.y>H) return;
      const a=(0.25+0.6*s.b)*(0.75+0.25*Math.sin(t*0.0015+s.ph)); ctx.fillStyle=`rgba(220,230,255,${a.toFixed(3)})`;
      const r=s.b>0.93?1.5:s.b>0.7?1:0.6; ctx.fillRect(p.x-r/2,p.y-r/2,r,r); });

    if(!nodes.length){ requestAnimationFrame(frame); return; }
    nodes.forEach(n => n._p = project(n.x,n.y,n.z));
    const fs = focusSet(), active = selected || hovered;
    const nodeAlpha = n => { let a = passes(n) ? 1 : 0.1; if(fs && !fs.has(n)) a *= 0.16; return a; };

    /* idea constellation lines (star ↔ star) */
    if(ui.stars) starLinks.forEach(l => { const p=l.a._p, q=l.b._p; if(!p||!q) return;
      const hl = active && (l.a===active || l.b===active);
      const a = (hl ? 0.55 : 0.16) * Math.min(fogOf(p),fogOf(q)) * Math.min(nodeAlpha(l.a),nodeAlpha(l.b)) * (hl?1:1);
      line(p,q,`rgba(255,210,122,${a.toFixed(3)})`, hl?1.4:0.8); });

    /* star → supporting-paper threads */
    if(ui.stars) stars.forEach(s => { const p=s._p; if(!p) return;
      const on = active===s || (active && active.kind==="paper" && fs && fs.has(s));
      if(!on && active) return;
      s.papers.forEach(pp => { const q=pp._p; if(!q) return;
        const a = (on ? 0.5 : 0.045) * Math.min(fogOf(p),fogOf(q)) * (passes(pp)?1:0.2);
        line(p,q,`rgba(255,210,122,${a.toFixed(3)})`, on?1.1:0.7, on?[3,4]:[]); }); });

    /* paper ↔ paper word links */
    const labelsLater = [];
    if(ui.links) edges.forEach(e => { if(!visibleEdge(e)) return; const p=e.a._p, q=e.b._p; if(!p||!q) return;
      const hl = active && active.kind==="paper" && (e.a===active || e.b===active);
      let a = (0.07 + 0.5*e.sim) * Math.min(fogOf(p),fogOf(q));
      if(active && !hl) a *= 0.12; if(hl) a = Math.min(1, 0.45 + e.sim);
      const g = ctx.createLinearGradient(p.x,p.y,q.x,q.y); g.addColorStop(0, rgba(e.a.color,a)); g.addColorStop(1, rgba(e.b.color,a));
      line(p,q,g, hl ? 1.3+2.4*e.sim : 0.5+1.5*e.sim);
      if(hl && ui.labels) labelsLater.push({ x:(p.x+q.x)/2, y:(p.y+q.y)/2, s:e.shared.slice(0,2).map(conceptLabel).join(" · ") });
    });

    /* nodes, far → near */
    const order = nodes.filter(n=>n._p).sort((a,b)=>b._p.depth-a._p.depth);
    order.forEach(n => n.kind==="paper" ? drawPaper(n, nodeAlpha(n), t) : (ui.stars && drawStar(n, nodeAlpha(n), t)));

    /* labels on top */
    ctx.globalCompositeOperation="source-over";
    /* candidate labels, placed by priority so they never overlap */
    const cands = [];
    order.forEach(n => {
      const p=n._p, a=nodeAlpha(n); if(a<0.15 && n!==active) return;
      const R = n.size*p.s, inFocus = fs && fs.has(n);
      if(n.kind==="star"){ if(!ui.stars || (!ui.labels && n!==active && !inFocus)) return;
        cands.push({ n, s:"✦ "+n.label, x:p.x, y:p.y+R*2.4+9, size:n===active?13:11.5, w:700,
          col:`rgba(255,214,140,${(0.92*a*fogOf(p)).toFixed(2)})`, pr:(n===active?1e6:inFocus?1e5:0) + n.score*100 + 1000/p.depth });
      } else {
        const show = n===active || inFocus || (ui.labels && R>9);
        if(!show) return; const tt = n.title.length>38 ? n.title.slice(0,36)+"…" : n.title;
        cands.push({ n, s:tt, x:p.x, y:p.y+R*1.9+10, size:n===active?12.5:11, w:n===active?700:600,
          col:`rgba(232,237,247,${(0.92*a*fogOf(p)).toFixed(2)})`, pr:(n===active?1e6:inFocus?1e5:0) + R*10 });
      }
    });
    labelsLater.forEach(l => cands.push({ s:l.s, x:l.x, y:l.y, size:11, w:650, col:"rgba(235,240,250,.95)", pr:5e5 }));
    cands.sort((a,b)=>b.pr-a.pr);
    const placed = [];
    cands.forEach(c => {
      ctx.font = `${c.w} ${c.size}px -apple-system,"Segoe UI",Roboto,Arial,sans-serif`;
      const w = ctx.measureText(c.s).width + 6, h = c.size + 4, r = { x1:c.x-w/2, x2:c.x+w/2, y1:c.y-h/2, y2:c.y+h/2 };
      const hit = placed.some(q => r.x1<q.x2 && r.x2>q.x1 && r.y1<q.y2 && r.y2>q.y1);
      if(hit && c.pr < 1e6) return;
      placed.push(r); textAt(c.s, c.x, c.y, c.col, c.size, c.w);
    });
    requestAnimationFrame(frame);
  }

  function drawPaper(n, alpha, t){
    const p=n._p, R=Math.max(1.6, n.size*p.s), fog=fogOf(p), a=alpha*fog;
    ctx.globalCompositeOperation="lighter";
    const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,R*3.4); g.addColorStop(0,rgba(n.color,.42*a)); g.addColorStop(1,rgba(n.color,0));
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(p.x,p.y,R*3.4,0,6.283); ctx.fill();
    ctx.globalCompositeOperation="source-over";
    const c=ctx.createRadialGradient(p.x-R*.35,p.y-R*.35,R*.1,p.x,p.y,R);
    c.addColorStop(0,`rgba(255,255,255,${(.95*a).toFixed(3)})`); c.addColorStop(.35,rgba(n.color,a)); c.addColorStop(1,rgba(n.color,.55*a));
    ctx.fillStyle=c; ctx.beginPath(); ctx.arc(p.x,p.y,R,0,6.283); ctx.fill();
    /* theme ring = the paper's thesis DNA */
    const slot=6.283/5, rr=R*1.6; ctx.lineWidth=Math.max(1.1,R*.2); ctx.setLineDash([]);
    THEMES.forEach((th,i) => { ctx.beginPath(); ctx.strokeStyle = n.themes.includes(th.key) ? rgba(th.hex,.9*a) : `rgba(255,255,255,${(.07*a).toFixed(3)})`;
      ctx.arc(p.x,p.y,rr,-1.571+i*slot+0.12,-1.571+(i+1)*slot-0.12); ctx.stroke(); });
    if(n===selected || n===hovered){ const pulse=1+0.08*Math.sin(t*0.006);
      ctx.beginPath(); ctx.strokeStyle="rgba(255,255,255,.85)"; ctx.lineWidth=1.3; ctx.arc(p.x,p.y,R*2.15*pulse,0,6.283); ctx.stroke(); }
  }

  function drawStar(n, alpha, t){
    const p=n._p, tw=1+0.18*Math.sin(t*0.0022+n.phase), R=Math.max(1.4, n.size*p.s*tw), a=alpha*fogOf(p);
    ctx.globalCompositeOperation="lighter";
    const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,R*4.5); g.addColorStop(0,`rgba(255,214,140,${(.55*a).toFixed(3)})`);
    g.addColorStop(.4,`rgba(255,160,90,${(.14*a).toFixed(3)})`); g.addColorStop(1,"rgba(255,140,80,0)");
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(p.x,p.y,R*4.5,0,6.283); ctx.fill();
    const spike=(len,wid,rot,al)=>{ ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(rot); ctx.fillStyle=`rgba(255,236,190,${al.toFixed(3)})`;
      ctx.beginPath(); ctx.moveTo(0,-len); ctx.lineTo(wid,0); ctx.lineTo(0,len); ctx.lineTo(-wid,0); ctx.closePath(); ctx.fill(); ctx.restore(); };
    spike(R*3.4, R*.22, 0, .85*a); spike(R*3.4, R*.22, 1.5708, .85*a);
    spike(R*1.7, R*.14, .785, .4*a); spike(R*1.7, R*.14, -.785, .4*a);
    ctx.fillStyle=`rgba(255,255,255,${a.toFixed(3)})`; ctx.beginPath(); ctx.arc(p.x,p.y,R*.55,0,6.283); ctx.fill();
    if(n===selected){ ctx.globalCompositeOperation="source-over"; ctx.beginPath(); ctx.strokeStyle="rgba(255,214,140,.8)";
      ctx.lineWidth=1.2; ctx.setLineDash([2,4]); ctx.arc(p.x,p.y,R*5.2,0,6.283); ctx.stroke(); ctx.setLineDash([]); }
  }

  /* ===================== PICKING & INPUT ===================== */
  function pick(mx,my){
    let best=null, bd=1e9;
    nodes.forEach(n => { const p=n._p; if(!p || (n.kind==="star" && !ui.stars)) return;
      const R = n.size*p.s*(n.kind==="star"?1.6:1) + 7, d = Math.hypot(p.x-mx, p.y-my);
      if(d<=R && p.depth<bd){ bd=p.depth; best=n; } });
    return best;
  }
  const tip = $("#tip");
  function showTip(n,mx,my){
    if(!n){ tip.classList.remove("show"); return; }
    tip.innerHTML = n.kind==="paper" ? `${esc(n.title)}${n.year?` <span style="color:#8e9ab0">· ${esc(n.year)}</span>`:""}`
      : `<span style="color:#ffd27a">✦ ${esc(n.label)}</span> — supported by ${n.papers.length} papers`;
    tip.style.left = Math.min(mx+14, W-290)+"px"; tip.style.top = (my+14)+"px"; tip.classList.add("show");
  }

  const pts = new Map(); let down=null, pinch=null;
  cvs.addEventListener("pointerdown", e => { cvs.setPointerCapture(e.pointerId); pts.set(e.pointerId,{x:e.offsetX,y:e.offsetY});
    down = { x:e.offsetX, y:e.offsetY, yaw:cam.yaw, pitch:cam.pitch, moved:0, pan:e.shiftKey||e.button===2, tx:goal.tx, ty:goal.ty, tz:goal.tz };
    dragging = true; idleSince = performance.now(); cvs.classList.add("grabbing"); });
  cvs.addEventListener("pointermove", e => {
    const mx=e.offsetX, my=e.offsetY;
    if(pts.has(e.pointerId)) pts.set(e.pointerId,{x:mx,y:my});
    if(pts.size===2){ const [a,b]=[...pts.values()], d=Math.hypot(a.x-b.x,a.y-b.y);
      if(pinch) goal.dist = clamp(goal.dist*pinch/d, 25, 1700); pinch=d; if(down) down.moved=99; return; }
    if(down){ const dx=mx-down.x, dy=my-down.y; down.moved=Math.max(down.moved, Math.hypot(dx,dy));
      if(down.pan){ const k=cam.dist/F, c=Math.cos(cam.yaw), s=Math.sin(cam.yaw);
        goal.tx=down.tx-(dx*c)*k; goal.tz=down.tz+(dx*s)*k; goal.ty=down.ty-dy*k; cam.tx=goal.tx; cam.ty=goal.ty; cam.tz=goal.tz; }
      else { cam.yaw = down.yaw + dx*0.0055; cam.pitch = clamp(down.pitch + dy*0.0055, -1.45, 1.45); }
      idleSince = performance.now(); showTip(null); return; }
    hovered = pick(mx,my); cvs.classList.toggle("pointing", !!hovered); showTip(hovered,mx,my);
  });
  const up = e => { pts.delete(e.pointerId); if(pts.size<2) pinch=null;
    if(down && down.moved<5 && pts.size===0){ const n=pick(e.offsetX,e.offsetY); n ? select(n) : deselect(); }
    if(pts.size===0){ down=null; dragging=false; cvs.classList.remove("grabbing"); } idleSince=performance.now(); };
  cvs.addEventListener("pointerup", up); cvs.addEventListener("pointercancel", up);
  cvs.addEventListener("pointerleave", () => { if(!down){ hovered=null; showTip(null); } });
  cvs.addEventListener("contextmenu", e => e.preventDefault());
  cvs.addEventListener("wheel", e => { e.preventDefault(); idleSince=performance.now();
    const zin = e.deltaY<0; goal.dist = clamp(goal.dist*(zin?1/1.13:1.13), 25, 1700);
    if(zin && hovered){ goal.tx+=(hovered.x-goal.tx)*0.18; goal.ty+=(hovered.y-goal.ty)*0.18; goal.tz+=(hovered.z-goal.tz)*0.18; }
  }, {passive:false});
  window.addEventListener("keydown", e => {
    if(e.target.tagName==="INPUT") return;
    if(e.key==="Escape") deselect();
    if(e.key==="+"||e.key==="=") goal.dist=clamp(goal.dist/1.25,25,1700);
    if(e.key==="-") goal.dist=clamp(goal.dist*1.25,25,1700);
    if(e.key==="ArrowLeft") cam.yaw-=0.12; if(e.key==="ArrowRight") cam.yaw+=0.12;
    if(e.key==="ArrowUp") cam.pitch=clamp(cam.pitch-0.1,-1.45,1.45); if(e.key==="ArrowDown") cam.pitch=clamp(cam.pitch+0.1,-1.45,1.45);
    idleSince=performance.now();
  });

  /* ===================== SELECTION & DETAIL PANEL ===================== */
  function flyTo(n, d){ goal.tx=n.x; goal.ty=n.y; goal.tz=n.z; goal.dist=d; idleSince=performance.now(); }
  function select(n){ selected=n; flyTo(n, n.kind==="star"?300:240); renderDetail(n);
    $("#detail").classList.add("open"); document.body.classList.add("detail-open"); }
  function deselect(){ selected=null; $("#detail").classList.remove("open"); document.body.classList.remove("detail-open");
    goal.tx=0; goal.ty=0; goal.tz=0; goal.dist=Math.max(goal.dist,520); }
  $("#closeDetail").onclick = deselect;

  const tchip = k => { const t=THEMES.find(x=>x.key===k); return `<span class="tchip" style="--c:${t.hex}">● ${esc(t.label)}</span>`; };
  function renderDetail(n){
    const body = $("#detailBody");
    if(n.kind==="paper"){
      const dna = Object.entries(n.dna).sort((a,b)=>b[1]-a[1]).slice(0,9), mx = Math.max(1,...dna.map(d=>d[1]));
      const links = edgesOf(n).slice(0,7), sup = stars.filter(s=>s.papers.includes(n));
      body.innerHTML = `
        <div class="kind">Paper${n.year?` · ${esc(n.year)}`:""}</div>
        <div class="dt">${esc(n.title)}</div>
        <div>${n.themes.map(tchip).join("") || '<span class="meta">No themes tagged</span>'}</div>
        <a href="paper.html?id=${n.id.slice(1)}" style="display:inline-block;margin-top:10px;padding:8px 13px;border-radius:10px;background:linear-gradient(135deg,#2fd2be,#1a9e8f);color:#04201c;font-weight:750;font-size:13px;text-decoration:none">Open full analysis →</a>
        <div class="dh">🧬 DNA — its strongest concepts</div>
        ${dna.map(([k,c]) => `<div class="dna-row"><span class="t">${esc(conceptLabel(k))}</span><span class="tr"><i style="width:${Math.round(c/mx*100)}%;background:${conceptHex(k)}"></i></span><span class="n">${c}</span></div>`).join("")}
        ${n.dna && Object.keys(n.dna).some(k=>k.startsWith("theme:")) ? `<p class="meta">No word‑DNA saved for this paper yet — re‑analyse it on <a href="add-paper.html" style="color:#2fd2be">Analyze a paper</a> to connect it by words.</p>`:""}
        ${sup.length ? `<div class="dh">✦ Supports these ideas</div><div class="words">${sup.map(s=>`<span class="w" data-go="${s.id}" style="cursor:pointer;color:#ffd27a">✦ ${esc(s.label)}</span>`).join("")}</div>`:""}
        <div class="dh">Connected papers · shared words</div>
        ${links.length ? links.map(e => { const o = e.a===n ? e.b : e.a; return `
          <div class="link" data-go="${o.id}"><div class="lt">${esc(o.title)}<span>${Math.round(e.sim*100)}%</span></div>
          <div class="words">${e.shared.slice(0,6).map(w=>`<span class="w">${esc(conceptLabel(w))}</span>`).join("")}</div></div>`; }).join("")
          : `<p class="meta">No shared words with other papers yet.</p>`}`;
    } else {
      const col = n.strength==="Strong" ? "#ffd27a" : n.strength==="Growing" ? "#ffb35c" : "#c9d1df";
      const rel = starLinks.filter(l=>l.a===n||l.b===n).map(l=>l.a===n?l.b:l.a);
      body.innerHTML = `
        <div class="kind" style="color:#ffd27a">✦ Idea star</div>
        <div class="dt">${esc(n.label)}</div>
        <span class="badge" style="background:${col}22;color:${col};border:1px solid ${col}55">${n.strength} support</span>
        <span class="meta">&nbsp; ${n.papers.length} papers · ${n.total} mentions</span>
        <div class="ideatext">💡 ${esc(n.text)}</div>
        ${n.partner ? `<div class="meta">Often appears with <b style="color:#e9edf5">${esc(n.partner.label)}</b> (${n.partner.n} papers)</div>`:""}
        <div class="dh">Themes it bridges</div><div>${n.themes.map(tchip).join("")}</div>
        <div class="dh">Supporting papers</div>
        ${n.papers.slice().sort((a,b)=>(b.dna[n.stem]||0)-(a.dna[n.stem]||0)).map(p=>`
          <div class="link" data-go="${p.id}"><div class="lt">${esc(p.title)}<span>${p.dna[n.stem]}×</span></div></div>`).join("")}
        ${rel.length ? `<div class="dh">Connected ideas</div><div class="words">${rel.map(s=>`<span class="w" data-go="${s.id}" style="cursor:pointer;color:#ffd27a">✦ ${esc(s.label)}</span>`).join("")}</div>`:""}`;
    }
    body.scrollTop = 0;
  }
  $("#detailBody").addEventListener("click", e => { const g=e.target.closest("[data-go]"); if(g && byId[g.dataset.go]) select(byId[g.dataset.go]); });

  /* ===================== CONTROLS ===================== */
  $("#themeChips").innerHTML = THEMES.map(t => `<button class="chip" data-k="${t.key}" aria-pressed="false" style="--c:${t.hex}"><span class="dot"></span>${esc(t.label)}</button>`).join("");
  $("#themeChips").querySelectorAll(".chip").forEach(b => b.onclick = () => {
    const k=b.dataset.k; ui.filter.has(k) ? ui.filter.delete(k) : ui.filter.add(k); b.setAttribute("aria-pressed", ui.filter.has(k)); });
  [["tLinks","links"],["tStars","stars"],["tLabels","labels"],["tSpin","spin"]].forEach(([id,k]) => $("#"+id).onchange = e => ui[k] = e.target.checked);
  $("#strength").oninput = e => { ui.strength = e.target.value/100; $("#strengthVal").textContent = e.target.value+"%"; };
  $("#titles").innerHTML = papers.map(p => `<option value="${esc(p.title)}">`).join("");
  $("#search").addEventListener("change", e => { const q=e.target.value.trim().toLowerCase(); if(!q) return;
    const hit = papers.find(p=>p.title.toLowerCase()===q) || papers.find(p=>p.title.toLowerCase().includes(q)); if(hit) select(hit); });
  $("#ideas").innerHTML = stars.length ? stars.map(s => `
    <div class="idea" data-go="${s.id}"><span class="st">✦</span>
      <span class="nm">${esc(s.label)}<small>${s.papers.length} papers · ${s.strength}</small></span>
      <span class="bar"><i style="width:${Math.round(s.score/maxScore*100)}%"></i></span></div>`).join("")
    : `<p class="sub">Ideas appear when at least two papers share a concept. Analyse more papers to light up stars.</p>`;
  $("#ideas").addEventListener("click", e => { const g=e.target.closest("[data-go]"); if(g){ select(byId[g.dataset.go]);
    if(W<=820) $("#controls").classList.remove("open"); } });
  $("#zoom").querySelectorAll("button").forEach(b => b.onclick = () => { idleSince=performance.now();
    if(b.dataset.z==="in") goal.dist=clamp(goal.dist/1.3,25,1700); else if(b.dataset.z==="out") goal.dist=clamp(goal.dist*1.3,25,1700);
    else { deselect(); goal.dist=560; cam.pitch=-0.28; } });
  $("#menuBtn").onclick = () => $("#controls").classList.toggle("open");
  $("#legend").innerHTML = THEMES.map(t=>`<span><i style="background:${t.hex}"></i>${esc(t.label)}</span>`).join("") +
    `<span style="color:#ffd27a">✦ idea star</span><span>◯ ring = themes covered</span><span>— shared words</span>` +
    (window.PAPERS_IS_SAMPLE ? `<span style="color:#8e9ab0">· sample data</span>` : "");
  if(noDna && papers.length){ const nt=$("#notice"); nt.style.display="block";
    nt.innerHTML = `${noDna} of ${papers.length} papers have no word‑DNA yet, so they only connect by theme. Re‑analyse them on <a href="add-paper.html" style="color:#2fd2be">Analyze a paper</a> to link them by words.`; }
  setTimeout(() => { const h=$("#hint"); if(h) h.style.opacity="0"; }, 7000);

  requestAnimationFrame(frame);
  /* deep link from a paper page: constellation.html?paper=3 */
  const deep = parseInt(new URLSearchParams(location.search).get("paper"), 10);
  if(papers[deep]) setTimeout(() => select(papers[deep]), 900);
  window.__constellation = { papers, stars, edges, starLinks, select };   // for debugging
})();
