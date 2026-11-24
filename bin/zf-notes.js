#!/usr/bin/env node
/* Hidden notes for "Papers through my eyes" (phd/).

   A hidden mark or experiment stays in _data/papers.yml, but encrypted: its text is replaced
   by `locked: "<base64>"` (AES-256-GCM, key from the password with PBKDF2-SHA256). Visitors see
   a hatched cell; after typing the password on the page, the browser decrypts it.
   The password itself is never stored: _data/lock.yml only holds a salt and an encrypted
   check value.

   Usage (from the repository root, Node 18+, no packages needed):
     node bin/zf-notes.js init              set or change the password (asks for it)
     node bin/zf-notes.js serve [port]      helper for the "Hide from visitors" buttons while
                                            you preview the site locally (default port 4001)

   Changing the password only works while nothing is hidden (show everything first). */
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const CHECK = "zf-ok";
const ITERATIONS = 250000;

function files(repo) {
  return { papers: path.join(repo, "_data", "papers.yml"), lock: path.join(repo, "_data", "lock.yml") };
}

/* ---------- crypto (the browser does the same with Web Crypto) ---------- */
function key(password, lock) {
  return crypto.pbkdf2Sync(String(password), Buffer.from(lock.salt, "base64"), lock.iterations, 32, "sha256");
}
function encrypt(k, text) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", k, iv);
  const body = Buffer.concat([c.update(text, "utf8"), c.final()]);
  return Buffer.concat([iv, body, c.getAuthTag()]).toString("base64");
}
function decrypt(k, b64) {
  const all = Buffer.from(b64, "base64");
  const d = crypto.createDecipheriv("aes-256-gcm", k, all.subarray(0, 12));
  d.setAuthTag(all.subarray(all.length - 16));
  return Buffer.concat([d.update(all.subarray(12, all.length - 16)), d.final()]).toString("utf8");
}

function readLock(repo) {
  const f = files(repo).lock;
  if (!fs.existsSync(f)) throw new Error("No _data/lock.yml yet: run  node bin/zf-notes.js init");
  const s = fs.readFileSync(f, "utf8");
  const get = (k) => (s.match(new RegExp("^" + k + ':\\s*"?([^"\\n]+)"?', "m")) || [])[1];
  return { salt: get("salt"), iterations: +get("iterations"), check: get("check") };
}
function verify(repo, password) {
  const lock = readLock(repo);
  const k = key(password, lock);
  try {
    if (decrypt(k, lock.check) === CHECK) return k;
  } catch (e) {}
  return null;
}

/* ---------- finding item k of a paper's marks or experiments in the YAML text ---------- */
function locate(lines, paper, list, k) {
  let i = lines.findIndex((l) => l === "- id: " + paper);
  if (i < 0) throw new Error("paper not found: " + paper);
  let end = lines.findIndex((l, j) => j > i && l.startsWith("- id: "));
  if (end < 0) end = lines.length;
  const sec = lines.findIndex((l, j) => j > i && j < end && l === "  " + list + ":");
  if (sec < 0) throw new Error(paper + " has no " + list);
  let secEnd = lines.findIndex((l, j) => j > sec && j < end && /^ {0,2}\S/.test(l));
  if (secEnd < 0) secEnd = end;
  const starts = [];
  for (let j = sec + 1; j < secEnd; j++) if (lines[j].startsWith("    - ")) starts.push(j);
  if (k < 0 || k >= starts.length) throw new Error(list + " " + k + " not found in " + paper);
  let a = starts[k],
    b = k + 1 < starts.length ? starts[k + 1] : secEnd;
  // blank lines and comments just before the next item belong to the next item
  while (b - 1 > a && (!lines[b - 1].trim() || lines[b - 1].trim().startsWith("#"))) b--;
  return [a, b];
}

/* hide: replace the item's lines by its encrypted copy; show: put the original lines back */
function setHidden(repo, { password, paper, list, k, hide, item }) {
  if (list !== "marks" && list !== "experiments") throw new Error("only marks and experiments can be hidden");
  const kk = verify(repo, password);
  if (!kk) return { ok: false, status: 403, error: "Wrong password" };
  const f = files(repo).papers;
  const nl = "\n";
  const lines = fs.readFileSync(f, "utf8").replace(/\r\n/g, nl).split(nl);
  const [a, b] = locate(lines, paper, list, +k);
  const raw = lines.slice(a, b);
  const isLocked = raw.some((l) => /^ {6}locked: /.test(l) || /^ {4}- locked: /.test(l));
  let out, locked;
  if (hide) {
    if (isLocked) return { ok: false, status: 409, error: "Already hidden" };
    if (!item || typeof item !== "object") throw new Error("missing item");
    // a cheap check that the page and the file agree on which item this is
    if (list === "marks" && !raw.some((l) => new RegExp("^ {4}[- ] page: " + +item.page + "$").test(l)))
      return { ok: false, status: 409, error: "papers.yml changed since the page was built; reload" };
    if (list === "experiments" && !raw.some((l) => l === "    - id: " + item.id))
      return { ok: false, status: 409, error: "papers.yml changed since the page was built; reload" };
    const clean = Object.assign({}, item);
    Object.keys(clean).forEach((x) => x.startsWith("_") && delete clean[x]);
    delete clean.locked;
    const yaml = raw.map((l) => l.replace(/^ {4}/, "")).join(nl);
    locked = encrypt(kk, JSON.stringify({ item: clean, yaml: yaml }));
    out = [];
    if (list === "marks") {
      out.push("    - page: " + +item.page);
      if (item.para) out.push("      para: " + +item.para);
      out.push('      locked: "' + locked + '"');
    } else out.push('    - locked: "' + locked + '"');
  } else {
    if (!isLocked) return { ok: false, status: 409, error: "Not hidden" };
    const line = raw.find((l) => /locked: /.test(l));
    const b64 = line.split("locked:")[1].trim().replace(/^"|"$/g, "");
    const payload = JSON.parse(decrypt(kk, b64));
    out = payload.yaml.split(nl).map((l) => (l ? "    " + l : l));
  }
  lines.splice(a, b - a, ...out);
  fs.writeFileSync(f, lines.join(nl));
  return { ok: true, locked: locked || null };
}

/* ---------- a tiny local server for the buttons on the page ---------- */
function readBody(req) {
  return new Promise((resolve, reject) => {
    let s = "";
    req.on("data", (c) => {
      s += c;
      if (s.length > 1e6) req.destroy();
    });
    req.on("end", () => resolve(s));
    req.on("error", reject);
  });
}
/* handles POST /__zf/notes; returns true when it answered the request */
async function handle(repo, req, res, after) {
  if (!req.url.startsWith("/__zf/notes")) return false;
  const origin = req.headers.origin || "";
  const local = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  if (local) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Headers", "content-type");
  }
  const send = (status, obj) => {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(obj));
  };
  if (req.method === "OPTIONS") return res.writeHead(204).end(), true;
  if (req.method === "GET") return send(200, { ok: true }), true;
  if (origin && !local) return send(403, { ok: false, error: "local pages only" }), true;
  try {
    const r = setHidden(repo, JSON.parse(await readBody(req)));
    if (r.ok && after) await after();
    send(r.ok ? 200 : r.status || 400, r);
  } catch (e) {
    send(400, { ok: false, error: String(e.message || e) });
  }
  return true;
}

function ask(q) {
  const rl = require("readline").createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((r) => rl.question(q, (a) => (rl.close(), r(a))));
}

async function main() {
  const repo = process.cwd();
  const [cmd, arg] = process.argv.slice(2);
  if (cmd === "init") {
    const papers = fs.readFileSync(files(repo).papers, "utf8");
    if (/^\s+(- )?locked: /m.test(papers)) throw new Error("Some notes are hidden: show them all before changing the password.");
    const pw = process.env.ZF_PASSWORD || (await ask("New password: "));
    if (!pw) throw new Error("empty password");
    const lock = { salt: crypto.randomBytes(16).toString("base64"), iterations: ITERATIONS };
    lock.check = encrypt(key(pw, lock), CHECK);
    fs.writeFileSync(
      files(repo).lock,
      "# Hidden notes (see bin/zf-notes.js). Not the password: a salt and an encrypted check value.\n" +
        'salt: "' +
        lock.salt +
        '"\niterations: ' +
        lock.iterations +
        '\ncheck: "' +
        lock.check +
        '"\n'
    );
    console.log("Wrote _data/lock.yml");
  } else if (cmd === "serve") {
    const port = +arg || 4001;
    require("http")
      .createServer(async (req, res) => {
        if (!(await handle(repo, req, res))) res.writeHead(404).end();
      })
      .listen(port, "127.0.0.1", () => console.log("Hidden-notes helper on http://127.0.0.1:" + port));
  } else {
    console.log("node bin/zf-notes.js init | serve [port]");
  }
}

module.exports = { handle, setHidden, verify };
if (require.main === module)
  main().catch((e) => {
    console.error(e.message || e);
    process.exit(1);
  });
