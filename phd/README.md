# Thesis Literature Map

An interactive website that maps the papers you have read against the five
themes of your PhD:

> **Collaborative · Embodied · Learning · Mathematics · Virtual Reality**

It shows **what percentage of your papers** cover each theme and each
*combination* of themes, in four "ways of seeing":

- **Coverage** — how much each theme appears
- **Connections** — a heat‑map of which themes appear together
- **Combinations** — which groups of 2, 3, 4 or all 5 themes cluster together
- **Papers** — the full, searchable list

Everything is **static** (plain HTML/JS), so it runs for **free** on GitHub
Pages. Visitors (your supervisor) only click buttons — they never upload
anything.

---

## The files

| File             | What it is |
|------------------|------------|
| `index.html`         | **Overview** — the heat‑map dashboard of your five themes. |
| `constellation.html` + `constellation.js` | **Constellation** — a 3D universe of your papers: planets = papers, lines = shared words, golden stars = ideas that several papers support. Drag to orbit, scroll to fly in, click anything. |
| `library.html`       | **Library** — a gallery of every paper, each with its own DNA‑burst fingerprint. Search, filter, sort; click a paper to open it. |
| `paper.html`         | **One paper's full analysis** (read‑only, for visitors): summary, theme DNA, zoomable 🧬 DNA lens, idea sparks, evidence sentences, connected papers and the ideas it supports. |
| `analysis-view.js`   | Draws the analysis cards — shared by the Analyze page and the paper pages, so visitors see exactly what you saw. |
| `add-paper.html`     | **Analyze a paper** — drop a PDF, get its analysis, then add it (with its full analysis) to `papers.js`. |
| `papers.js`          | Your data — each paper's themes, its DNA (concept fingerprint) and its saved analysis. Powers every page. |
| `lexicon.js`         | The shared vocabulary: theme words, DNA‑lens concepts and idea prompts. Edit here to tune detection. |
| `nav.js`             | The top navigation bar shared by every page. |
| `README.md`          | This guide. |

Upload **all** of these files to GitHub together.

To just **look at it now**, double‑click `index.html` — it opens in your
browser with sample data. No internet or install needed.

---

## How does it "read" the paper? (your question)

A website on GitHub Pages has **no server** — it cannot run any code on a
computer in the cloud. So the reading happens **inside your own browser**:

1. You open `add-paper.html` (the **Analyze a paper** page) and drag your PDF
   onto it.
2. A small library called **pdf.js** (made by Mozilla, free) pulls the text
   out of the PDF **right there in your browser**. The PDF never leaves your
   computer and is never uploaded anywhere.
3. The page then does a **close reading of the text** and shows you, instantly:
   - a short **summary** (its key sentences) and the abstract if it finds one;
   - a **Theme DNA** bar + a "signature" strip showing *where* each of your five
     themes appears across the paper;
   - a **🧬 DNA lens** — related concepts from your research field that show up
     (gesture, scaffolding, presence, spatial reasoning, manipulatives…);
   - **💡 idea sparks** — prompts to turn those concepts into new directions;
   - **evidence** — the actual sentences that mention each theme;
   - the paper's **key phrases**.
4. It ticks the five themes it thinks the paper is about. **You check and fix
   the ticks** — you always have the final say.
5. Click **Add to my collection**, then **Download papers.js** and replace the
   old `papers.js`.

That's it. Because *you* generate `papers.js` and commit it, your supervisor
only ever sees the finished chart — they never touch a PDF.

> **Honest note:** this analysis runs entirely in your browser with smart text
> rules — not a cloud AI (that would need a paid server, so it wouldn't be free
> or static). It's a genuine close reading of the words; always glance at the
> ticks before saving.

> ⚠️ **Running the reader:** open the Analyze page from your **live GitHub Pages
> link**, or with the local‑server command below. If you *double‑click* the file
> straight from your folder, some browsers block PDF reading for security and
> nothing will appear.
>
> Local‑server command (run it once inside the project folder, then open
> `http://localhost:8000/add-paper.html`):
>
> ```bash
> python -m http.server 8000
> ```

---

## Put it online with GitHub Pages (free, ~5 minutes)

1. Make a free account at <https://github.com> if you don't have one.
2. Click **New repository**. Name it e.g. `thesis-map`. Keep it **Public**
   (Pages is free for public repos). Click **Create repository**.
3. On the repo page click **Add file → Upload files**, then drag in
   `index.html`, `papers.js`, `add-paper.html` and `README.md`.
   Click **Commit changes**.
4. Go to **Settings → Pages** (left menu).
5. Under **Build and deployment → Source**, choose **Deploy from a branch**.
   Set **Branch** to `main` and the folder to `/ (root)`. Click **Save**.
6. Wait ~1 minute, then refresh. GitHub shows your live link, like:

   `https://YOUR-USERNAME.github.io/thesis-map/`

7. Send that link to your supervisor. Done.

---

## Adding more papers later

1. Open `add-paper.html` (double‑click the local file, or open it on your live
   site — it works the same).
2. Click **Load current papers.js** so you keep the papers already there.
3. Drag in your new PDFs, check the ticks, edit titles/years if needed.
4. Click **Download papers.js**.
5. On GitHub: open your repo → click `papers.js` → the pencil **Edit** icon →
   delete everything → paste the new file's contents → **Commit changes**.
   (Or use **Add file → Upload files** and drop the new `papers.js` to replace
   it.)
6. Your live site updates automatically within a minute.

---

## What visitors see when they click a paper

Every paper you add is saved **with its full analysis**, so on the live site
anyone can go to **Library → click a paper** (or click a title on the Overview,
or "Open full analysis" in the Constellation) and read the same analysis you
saw. Papers added before this update show a "Basic reading" until you
re‑analyse their PDF.

**About quotes:** the abstract and evidence sentences are short quotations from
the papers, and your GitHub repo is public. Next to *Add to my collection* there
is a tick box. Untick it for a paper to publish only its numbers, concepts and
charts, without any quoted text.

## Tuning the word detection (optional)

Open `lexicon.js`. Each theme has a `terms` list of words/stems that count
toward it, `LENS` holds the DNA‑lens concepts, and `SPARKS` holds the idea
prompts. If detection misses something, add a word there (for example add
`"vive"` or `"metaquest"` to the `vr` theme). Save, reload, re‑drop the PDF.

> Papers added **before** the DNA update only connect by theme in the
> constellation. Re‑analyse them once so they connect by shared words too.
