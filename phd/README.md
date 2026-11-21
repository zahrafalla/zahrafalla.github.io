# Papers through my eyes

The PhD project of this site, at `/phd/`. It has three sections:

| Section       | Page                 | Status                                                    |
| ------------- | -------------------- | --------------------------------------------------------- |
| Library       | `phd/library.html`   | The papers I have read; each opens as a page bar.         |
| Paper collage | `phd/collage.html`   | Coming soon.                                              |
| Overview      | `phd/overview.html`  | Coming soon.                                              |

## The page bar

Opening a paper in the Library turns it into a bar with one segment per page. Each circle on the bar is a mark:

| Colour | Kind                  | Meaning                                       |
| ------ | --------------------- | --------------------------------------------- |
| blue   | Theory                | a theory, model or concept the paper puts forward |
| orange | Experiment            | a study, its method or its results            |
| green  | Important for my work | something that matters for my PhD             |
| purple | Idea for my thesis    | an idea the page gave me                      |

Moving along the bar (pointer, scroll wheel, arrow keys, or scrolling the page in the vertical layout) shows the nearest
mark's note. The Horizontal / Vertical buttons switch the bar's direction; the choice is remembered.

## Adding a paper

All papers live in **`_data/papers.yml`**. Copy a whole block (starting with `- id:`) and change it. Each mark needs a
`page`, a `type` (`theory`, `experiment`, `important` or `idea`), a `title` and a `text`; a short verbatim `quote` is
optional. The four kinds of marks are defined in `_data/mark_types.yml`, and their colours in `assets/zf/zf.css`
(`--m-theory`, `--m-experiment`, `--m-important`, `--m-idea`).

The behaviour of the bar is in `phd/library.js`.
