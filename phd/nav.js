/* nav.js — the top navigation bar shared by every page. */
(function(){
  "use strict";
  const LINKS = [
    { href:"index.html",         label:"Overview",        icon:"▦" },
    { href:"library.html",       label:"Library",         icon:"📚" },
    { href:"constellation.html", label:"Constellation",   icon:"✦" },
    { href:"add-paper.html",     label:"Analyze a paper", icon:"🧬" },
  ];
  let here = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  if(here === "paper.html") here = "library.html";      // a paper page lives inside the Library

  const css = `
  .topnav{position:sticky; top:0; z-index:60; display:flex; align-items:center; gap:14px;
    padding:9px 16px; background:rgba(9,12,22,.88); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px);
    border-bottom:1px solid rgba(255,255,255,.08); font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;}
  .topnav .brand{display:flex; align-items:center; gap:9px; color:#eef2f8; text-decoration:none; white-space:nowrap;}
  .topnav .logo{width:26px; height:26px; border-radius:50%; flex:none;
    background:radial-gradient(circle at 50% 50%, #fff 0 9%, #ffcf7a 10% 22%, rgba(255,140,90,.55) 23% 48%, rgba(255,120,80,0) 70%);
    box-shadow:0 0 14px rgba(255,170,100,.55);}
  .topnav .bt{font-weight:750; font-size:14px; letter-spacing:-.01em; line-height:1.1;}
  .topnav .bs{font-size:10.5px; color:#8f9bb0; letter-spacing:.06em; text-transform:uppercase;}
  .topnav .links{display:flex; gap:4px; margin-left:auto; overflow-x:auto; scrollbar-width:none;}
  .topnav .links::-webkit-scrollbar{display:none;}
  .topnav a.nl{display:inline-flex; align-items:center; gap:7px; padding:7px 13px; border-radius:999px;
    color:#c3ccdb; text-decoration:none; font-size:13.5px; font-weight:650; white-space:nowrap; transition:.15s;}
  .topnav a.nl:hover{background:rgba(255,255,255,.08); color:#fff;}
  .topnav a.nl.on{background:linear-gradient(135deg,#2fd2be,#1a9e8f); color:#04201c; box-shadow:0 4px 16px rgba(47,210,190,.25);}
  .topnav a.nl .ic{font-size:13px; opacity:.9;}
  @media (max-width:640px){ .topnav .bsub,.topnav .bs{display:none;} .topnav a.nl{padding:7px 10px; font-size:13px;} }
  @media (max-width:420px){ .topnav .bt{display:none;} }`;

  const style = document.createElement("style"); style.textContent = css; document.head.appendChild(style);

  const nav = document.createElement("nav");
  nav.className = "topnav"; nav.setAttribute("aria-label","Main");
  nav.innerHTML =
    `<a class="brand" href="index.html"><span class="logo" aria-hidden="true"></span>
       <span><div class="bt">Literature Universe</div><div class="bs">Collaborative · Embodied · Math · VR</div></span></a>
     <div class="links">${LINKS.map(l =>
       `<a class="nl${l.href===here?" on":""}" href="${l.href}"${l.href===here?' aria-current="page"':""}><span class="ic">${l.icon}</span>${l.label}</a>`
     ).join("")}</div>`;
  document.body.insertBefore(nav, document.body.firstChild);
})();
