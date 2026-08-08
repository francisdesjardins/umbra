---
name: chrome-cdp
description: Attach to a real Chrome over the DevTools protocol to click, type, screenshot — and, the reason it exists, ask which CSS rule actually won a property and which ones lost to it. Use when an element looks wrong and the computed value does not say why, when an inline style or a library's own styling might be outranking a stylesheet, or when you need to inspect the page a browser already has open rather than a fresh one.
---

# Chrome CDP

One script (`cdp.mjs`) that speaks the Chrome DevTools Protocol directly — no Playwright, no
dependencies, Node's built-in `WebSocket`. It attaches to a Chrome that is **already running**
and drives the tab you point it at.

## What it does that `dom-probe` cannot

`dom-probe` reports **computed** values. A computed value looks identical whether your rule
produced it or something outranked you, so it can tell you a dialog is transparent and never
tell you why.

`--probe css:<selector>` prints every rule that matches, in cascade order, with the winner of
each property marked and every loser labelled with what beat it:

```
css dialog: 3 layer(s), lowest priority first
  dialog   [user agent]
      background-color: canvas       ✗ lost to element style attribute (inline)
  dialog   [stylesheet]
      background: var(--panel)       ✗ lost to element style attribute (inline)
      border: 1px solid var(--line)  ✗ lost to element style attribute (inline)
  element style attribute (inline)
    ✓ background: transparent
    ✓ border: none
```

That output is the whole reason for this skill. It named, in one command, why a `<dialog>`
styled by a perfectly good stylesheet rule came out invisible: this library writes
`background: transparent; border: none; padding: 0` **inline** on the element it owns, because
it ships no UI and the box is yours to fill. Three separate sessions have now rediscovered that
by guessing.

## Prerequisites

A Chrome listening on the debugging port. Either bring your own:

```bash
chrome --remote-debugging-port=9222
```

…or let the script start a throwaway one, which is usually what you want:

```bash
node .claude/skills/chrome-cdp/cdp.mjs --launch http://localhost:3000/ --do "shot:landing"
```

**A Chrome already running on your normal profile ignores `--remote-debugging-port`** and simply
hands the URL to the existing process — the commonest way this looks broken. `--launch` uses a
separate profile directory for exactly that reason.

## Usage

```bash
node .claude/skills/chrome-cdp/cdp.mjs [--launch <url> | --attach] [--do <step>]... [--probe <question>]...
```

Steps and questions run **in the order you type them**, interleaved, so the call reads as a
script and each answer describes the state at that moment.

### Target

| Flag             | Does                                                             |
| ---------------- | ---------------------------------------------------------------- |
| `--launch <url>` | Start Chrome on a throwaway profile with debugging on            |
| `--attach`       | Use a Chrome already listening (default)                         |
| `--port <n>`     | Debugging port, default `9222`                                   |
| `--match <text>` | Pick the tab whose URL or title contains this; default the first |
| `--list`         | Print the open tabs and exit                                     |

### Steps (`--do`)

| Step                      | Does                                                             |
| ------------------------- | ---------------------------------------------------------------- |
| `click:<sel>`             | Hit-tests the centre, then clicks; errors if something covers it |
| `click-at:<x>,<y>`        | Synthetic mouse input at viewport coordinates                    |
| `key:<Key>`               | `Enter`, `Escape`, `Tab`, `ArrowDown`, or a single character     |
| `fill:<sel>=<text>`       | Sets the value through the native setter, then fires the events  |
| `eval:<js>`               | Evaluate in the page and print the result                        |
| `settle:<sel>`            | Wait until the element's box stops changing                      |
| `wait:<ms>` / `nav:<url>` | Pause / navigate                                                 |
| `shot:<name>[@<sel>]`     | Screenshot the page, or clipped to one element                   |

### Questions (`--probe`)

| Question                     | Answers                                                       |
| ---------------------------- | ------------------------------------------------------------- |
| `css:<sel>[=prop,…]`         | **Every matching rule, cascade order, winners and losers**    |
| `computed:<sel>=<p,…>`       | Computed values                                               |
| `box:<sel>`                  | Border box in viewport coordinates                            |
| `text:<sel>` / `count:<sel>` | `innerText`, so a log panel stays multi-line / how many match |
| `at:<x>,<y>`                 | What is under a point, with its ancestor chain                |

Console errors, warnings and uncaught exceptions are reported at the end unless `--quiet`.

## Limits worth knowing before you fight them

- **`--do click:` does not use synthetic mouse input, and that is deliberate.** Measured here:
  `Input.dispatchMouseEvent` delivers `mouseMoved` every time and drops `mousePressed` /
  `mouseReleased` often enough to be useless — the box, the coordinates and `elementFromPoint`
  all read correct while no event ever arrives, so a silent listener proves nothing. `click:`
  therefore hit-tests the centre explicitly (and errors naming whatever covers it) and then
  dispatches in the page. **When the input path itself is the question — backdrop hit-testing,
  click-outside, drag — use `dom-probe`,** which drives real input through Playwright.
- **`--do fill:` sets the value through the native setter**, not `Input.insertText`. React
  installs a value tracker on the element; typed text alone leaves it convinced nothing changed
  and the state never updates.
- **Selectors do not cross into iframes.** For a framed page, point `--match` (or `--launch`) at
  the frame's own URL and drive it as a page.
- `--probe css:` splits on the **last** `=`, so a selector may contain one:
  `css:dialog[data-modal-id='x']=background,border-top-width` works.

## Related

- `dom-probe` — Playwright, a fresh browser, hit-testing and top-layer questions. Reach for it
  when the question is "what is _there_"; reach for this one when it is "why does it look
  like _that_".
- `dialog-debug` — per-frame motion measurement for slide animations.
- `playground-smoke` — every route loads clean.
