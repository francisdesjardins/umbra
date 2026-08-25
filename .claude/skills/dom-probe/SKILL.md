---
name: dom-probe
description: Ask a real Chrome what a page actually rendered — what element is under a point, what a click really hit, whether a dialog is in the top layer, what the computed box is once transitions settle. Use when behaviour disagrees with the code, when a click "does nothing", or before claiming anything about how something looks or behaves in a browser.
---

# DOM Probe

One reusable script (`probe.mjs`) that drives a page through ordered steps and then answers ordered
questions about what the browser actually produced. It exists so that "let me check in the browser"
does not mean writing, debugging and discarding a script every time.

## When to reach for it

- A click, a key or a drag **does nothing** and the code says it should.
- Something is on screen but a test cannot reach it, or vice versa.
- You are about to write "it works in the browser" — this is how you earn that sentence.
- A dialog looks right but stacks, scrolls or blocks clicks wrongly.

Not for assertions you want to keep. Those belong in a `*.ct.tsx`; this is for finding out _what to
assert_.

## Prerequisites

Run from the **project root** so `@playwright/test` resolves, with a dev server up
(`yarn workspace umbra-playground dev --port 4403`).

## Usage

```bash
node .claude/skills/dom-probe/probe.mjs --url <url> [--do <step>]... [--probe <question>]...
```

**Steps and questions run in the order you type them, interleaved.** `--do open --probe at:20,20
--do close --probe count:dialog` reads as a script and answers each question against the state at
that moment. Both flags repeat.

### Steps (`--do`)

| Step                     | Does                                                             |
| ------------------------ | ---------------------------------------------------------------- |
| `click:<selector>`       | Clicks the first match (Playwright selector syntax, `>>` chains) |
| `click-at:<x>,<y>`       | Clicks viewport coordinates                                      |
| `key:<Key>`              | Presses a key — `Escape`, `Enter`, `F5`                          |
| `fill:<selector>=<text>` | Types into a field                                               |
| `wait:<ms>`              | Pauses                                                           |
| `settle:<selector>`      | Waits until the element's box stops changing                     |
| `shot:<name>`            | Screenshot into `--out`                                          |

### Questions (`--probe`)

| Question                     | Answers                                                               |
| ---------------------------- | --------------------------------------------------------------------- |
| `at:<x>,<y>`                 | The element under a point **and its ancestor chain**, with boxes      |
| `rects:<sel>[,<sel>…]`       | Box, `position`, `z-index`, `pointer-events`, `display`               |
| `styles:<sel>=<prop>[,…]`    | Named computed properties                                             |
| `toplayer:<sel>`             | Whether it matches `:modal` — really in the top layer                 |
| `events:<x>,<y>`             | Clicks there and reports the capture-phase `mousedown`/`click` target |
| `count:<sel>` / `text:<sel>` | How many match / its text                                             |

Console errors, warnings and uncaught page errors are always reported at the end.

### Flags

`--url` (required) · `--out <dir>` (screenshots, default `./probe-shots`) · `--channel <name>`
(default `chrome`, the installed one) · `--viewport WxH` (default `1440x900`) · `--headless` ·
`--slow <ms>` · `--help`

## The two lessons paid for in hours

**`settle:` before any coordinate probe.** A dialog that scales up from `0.95` is smaller and
inset for the length of its open transition, so a point near the corner lands on the backdrop
instead of the content. The click reports "nothing happened", which is true and completely
misleading. This was diagnosed once as a broken backdrop handler; it was a 200 ms transition.

**`at:` before believing any theory about a click.** The ancestor chain names the element that
actually received the event. It settles "is MUI's backdrop swallowing this?", "did the portal put
it under the dialog?" and "is my overlay `pointer-events: none`?" in one command, without a guess.

## Examples

```bash
# Is the dialog really in the top layer, and what is under the corner?
node .claude/skills/dom-probe/probe.mjs --url http://127.0.0.1:4403/priorx \
  --do "click:section#direct-call-sites >> role=button[name='Archiver la salle']" \
  --do "settle:dialog[data-testid='modal-direct-message-dialog']" \
  --probe "toplayer:dialog[data-testid='modal-direct-message-dialog']" \
  --probe "at:20,20"

# What does an outside click actually hit — the native backdrop, or MUI's container?
node .claude/skills/dom-probe/probe.mjs --url http://127.0.0.1:4403/priorx \
  --do "click:[data-testid=open]" --do "settle:dialog" --probe "events:20,20"

# Does the page load clean, and does it look right? (watch it happen)
node .claude/skills/dom-probe/probe.mjs --url http://127.0.0.1:4403/priorx \
  --do "shot:landing" --probe "count:dialog"
```

## Related

- `dialog-debug` — the slide-dialog configurator specifically, with per-frame motion measurement.
  Reach for that one when the question is "did it _animate_", this one when it is "what is _there_".
- `playground-smoke` — every route loads and its examples open.
