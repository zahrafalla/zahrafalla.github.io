# Papers through my eyes

The PhD project of this site, at `/phd/`: the **Paper organizer** in the main menu. It has three sections:

| Section       | Page                 | Status                                                    |
| ------------- | -------------------- | --------------------------------------------------------- |
| Library       | `phd/library.html`   | The papers I have read; each opens as a paragraph grid.   |
| Paper collage | `phd/collage.html`   | The papers I will write, collaged from passages.          |
| Overview      | `phd/overview.html`  | Timeline, people and connections.                         |

## The paragraph grid

Opening a paper in the Library turns it into a grid: one column per page, one cell per paragraph. A marked paragraph
is a coloured cell:

| Colour | Kind                  | Meaning                                        |
| ------ | --------------------- | ---------------------------------------------- |
| blue   | Theory                | a theory or model the paper uses or argues for |
| yellow | New framework         | a new framework the paper puts forward         |
| sky    | New concept           | a new concept or term it introduces            |
| orange | Experiment            | a study, its method or its results             |
| pink   | People                | a person whose work the paragraph is about     |
| green  | Important for my work | something that matters for my PhD              |
| purple | Idea to build         | an idea the paragraph gave me                  |
| red    | Gap                   | something not known or not done yet            |

Hovering or clicking a coloured cell (or the arrow keys) shows its note under the grid. The kinds at the top switch
each colour on and off.

Under the grid come the paper's **experiments**: a matrix of what each one measures, then one card per experiment
(conditions, what is manipulated and measured, tools, result). The page button on a card shows that page in the grid.
Then **In my papers**: where the paper goes in the papers I'm writing.

## Adding a paper

All papers live in **`_data/papers.yml`**. Copy a whole block (starting with `- id:`) and change it. Each mark needs a
`page`, a `type` (`theory`, `framework`, `concept`, `experiment`, `people`, `important`, `idea` or `gap`), a `title` and a
`text`; a short verbatim `quote` is optional. The eight kinds are defined in `_data/mark_types.yml`, and their colours
in `assets/zf/zf.css` (`--m-theory`, `--m-framework`, …).

**Paragraphs.** A paper has `paras_per_page` cells per page (6 if not given). A mark can say which paragraph of its page
it is with `para` (1 = the first). Marks without `para` are spread down their page's column, so their place within the
page is only an estimate; add `para` when you want it exact.

**From Zotero.** Marks can come from my own Zotero notes and highlights: `from: note` or `from: highlight`. They show
a "My note" / "My highlight" tag, notes get a white corner in the grid, and `original` keeps a note in its original
language (Persian) under its English text. Their `para` comes from where the annotation sits on the page. Research
questions with `from: notes` (in `_data/my_papers.yml`) came from my notes and are filled squares in Connections; a
person's `my_note` (in `_data/overview.yml`) shows on the back of their card.

**Experiments** go in the same block, under `experiments:` (title, page, own or cited `by`, n, who, design,
conditions, manipulated, measured, tools, result, and `tags`: what it measures, keys from `_data/measures.yml`).

Besides its marks, each paper block has four short lists that feed the Overview, so a new paper only needs this
one block:

| Field       | What it holds                                                        | Example                          |
| ----------- | -------------------------------------------------------------------- | -------------------------------- |
| `ideas`     | ids of the ideas it touches (`concepts` in `_data/overview.yml`)     | `[grounded, simulation, maths]`  |
| `builds_on` | ids of older works it builds on (`roots` in `_data/overview.yml`)    | `[barsalou-1999]`                |
| `mentions`  | ids of people it mentions (`people` in `_data/overview.yml`)         | `[goldin-meadow, alibali]`       |
| `cites`     | ids of other papers in `papers.yml` it cites                         | `[barsalou]`                     |

Each paper also needs a `color` and a 2–4 letter `short` code, both unique, for its squares and tiles.

The Library has Find (title, author, year or idea), Sort (newest, oldest, A–Z, most marks) and a Cards / List
view; with more than 24 papers it opens as a list. Each card shows a small version of the paper's grid. The
behaviour of the grid and the list is in `phd/library.js`.

## The papers I will write (Paper collage)

The papers I plan to write, and their sections, live in **`_data/my_papers.yml`**. Passages are attached to the paper
they come from, under `uses:` in `_data/papers.yml`: each one names my paper (`paper`), the section (`section`), the
`page`, a `type`, the verbatim `passage` and a `suggest`ed text for my paper. Each read paper also has a `color` and a
`short` code for its tiles.

- `/phd/collage/` (`phd/collage.html`) is the cover: one tile per paper I will write, with a mosaic of its passages.
- Each paper I will write has its own page, built from `_includes/zf/collage-sheet.liquid`:
  `phd/collage-embodied-learning.html` and `phd/collage-cel-math-vr.html`. To add a third paper, add it to
  `my_papers.yml` and copy one of these files, changing `permalink` and `my_paper`.
- On a paper's page every passage is one coloured tile. Hovering shows its text, clicking pins it, and the coloured
  squares at the top (one per read paper, with its count) show only the passages from that paper; hovering a square
  shows its name. The behaviour is in `phd/collage.js`.
- Each paper I will write can list its research `questions` (`key`, `title`, `ideas`). They are shown in the Overview.
  The current ones are drafts.

## Overview

`/phd/overview/` shows the papers three ways, switched by the bar at the top (`#timeline`, `#people`, `#connections`).
Most of it is computed from the per-paper fields above; `_data/overview.yml` holds the things that are not about one
paper:

- `roots`: older works the papers build on (timeline). Who cites them comes from `builds_on`.
- `people`: researchers worth knowing, `author: true` for authors I've read. Which papers mention them comes from
  `mentions`; each person's coloured squares are those papers.
- `concepts` and `concept_groups`: the ideas. Which papers touch them comes from `ideas`.

**Connections** is the network: papers, ideas, my research questions (square nodes) and citations. Hovering a question
lights up the papers that support it. The layout is computed in the browser (`phd/overview.js`) and snapped to the
grid; "Rearrange" tries another layout.

All views are designed for 100+ papers (tested with 100 synthetic ones): lists get Find and "Show all", long animations
are capped, the timeline stacks papers by year, and long papers scroll sideways in their grid.
