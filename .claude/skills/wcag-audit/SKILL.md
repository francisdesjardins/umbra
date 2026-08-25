---
name: wcag-audit
description: Measure WCAG 2.2 AA contrast and keyboard-focus visibility against a real Chrome, on the page as it actually renders — including inside open dialogs and the states a button press produces. Use before claiming a palette, a theme change or a new page is accessible, and after any edit to colours, tokens or a component library's theme.
---

# WCAG audit

`audit.mjs` drives a real Chrome over the DevTools protocol, walks the routes you name in both
colour schemes, and reports every text or boundary pair under its threshold — plus every
focusable element the keyboard cannot find.

No dependencies. Node's global `WebSocket` speaks CDP directly, the same way `chrome-cdp` does.

## Why not read the stylesheet

The two commonest ways a palette fails AA are both invisible to source review, and this repo had
one of each:

- **`rgba()` text is composited**, and an ancestor's `opacity` multiplies a ratio that was never
  measured with it. The landing page's footer ornament read as `text.secondary` in the source —
  a perfectly good 5.74:1 — and rendered at 4.3:1 because of an `opacity: 0.6` two lines below.
- **A component library can resolve a token against you.** MUI derives `contrastText` through
  `getContrastText`, gated by `palette.contrastThreshold`, which defaults to **3** — AA for large
  text only. White scores 3.19:1 on `#d97706`, clears 3, and gets picked. Every contained button
  in the app shipped at 3.19:1 while the palette looked deliberate.

The audit found 28 distinct failures across nine routes that a careful read of the theme had not.

## Usage

```bash
node .claude/skills/wcag-audit/audit.mjs --attach --base http://localhost:3000 \
  --route / --route /getting-started --route /api \
  --focus
```

**On Windows, run it from PowerShell, not Git Bash.** MSYS rewrites a bare `/` argument into a
Windows path, so `--route /` arrives as `C:/Program Files/Git/` and the navigation fails with an
unhelpful `Cannot navigate to invalid URL`.

| Flag              | Does                                                                      |
| ----------------- | ------------------------------------------------------------------------- |
| `--base <url>`    | Origin to audit (default `http://localhost:3000`)                         |
| `--route <path>`  | Route to visit; repeatable                                                |
| `--crawl <sel>`   | Harvest same-origin hrefs from a nav selector on the first route          |
| `--scheme <name>` | `light` \| `dark`; repeatable. Default: both                              |
| `--launch`        | Start a throwaway Chrome instead of attaching to one on `--port`          |
| `--open <sel>`    | Click this on each route, scan the dialog it opened, then Escape          |
| `--then <step>`   | Inside the open dialog, click this and scan again — see below             |
| `--focus`         | Tab through the page for real and report elements with no focus indicator |
| `--no-non-text`   | Skip the 1.4.11 pass over control boundaries and icons                    |
| `--min <n>`       | Override the normal-text threshold (default 4.5)                          |
| `--json <file>`   | Write every finding, ungrouped                                            |

Exit code is 1 when anything failed, so it drops into a gate.

## The states a resting page never shows

A dialog at rest is the easy half. The error banner a failed action renders and the busy state a
running one shows are new colours on a surface the resting scan never saw — and the most likely
to have been styled by hand.

```bash
--open "text:Delete a file" --then "text:Delete"
```

`text:` matches a button by its visible label, because the interesting buttons in a dialog are
named and not classed — a generated class name is the wrong handle for "the one that says
Delete", and CSS has no text predicate. A plain CSS selector works too.

The report always prints **how many surfaces it scanned and how many were inside a dialog**, and
lists any `--open` / `--then` that matched nothing. A green report over a dialog that never opened
is the one failure mode that would make this tool worse than useless.

## Focus is measured with a real Tab, and it has to be

Three things were measured here rather than assumed, each of which silently breaks the obvious
implementation:

1. **A programmatic `focus()` does not match `:focus-visible`.** Chrome gates it on how focus
   arrived. A pass run cold reports every button on the page as bare — 288 of them, here.
2. **One real `Tab` fixes that**, and then `focus()` does match. But a component library that
   marks focus with a **class its own listener adds** (MUI's `.Mui-focusVisible`) still never gets
   the class, so a second, quieter false positive replaces the first.
3. So the walk sends real `Tab` presses and reads `document.activeElement` at each stop, against a
   resting snapshot taken from an unfocused clone. It stops when it lands on an index it has
   already seen — the tab cycle closing.

The report separates **no indicator at all** from **marked by colour alone**. The second passes
2.4.7 and is the first thing a washed-out panel loses, which is the whole reason this exists.

What that found here: `ButtonBase` zeroes the UA outline and `.Mui-focusVisible` resolved to _no
visual change whatsoever_ — outline, box-shadow, border, background and both pseudo-elements
byte-identical focused and not. Every button, sidebar entry and card link was focusable with
nothing on screen to say which one had it. The fix was one global rule, and it needed
`body :focus-visible` rather than `:focus-visible`: `.MuiButtonBase-root` is the same specificity
and is injected later, so the bare selector gave plain links a ring and every MUI button silently
nothing.

## What it does not measure

Stated so a green report is not read as more than it is:

- **Backgrounds it cannot reduce to one colour.** An element under a gradient or an image is
  counted as unmeasurable and skipped rather than guessed at.
- **Overlap.** An element painted over another is measured against its own ancestors' backgrounds,
  not against whatever is really behind it on screen.
- **`backdrop-filter`.** Judge those by eye.
- **Anything inside an iframe.** Point `--base` at the frame's own URL and audit it as a page.
- **Non-text beyond form controls and icons.** 1.4.11 is broader than that.
- **Everything that is not contrast or focus** — names, landmarks, order, labels, motion.

Disabled controls are reported separately and not counted as failures: 1.4.3 exempts them.

## Related

- `chrome-cdp` — which CSS rule won a property, and which ones lost to it
- `dom-probe` — what is actually there, and what a click really hit
- `playground-smoke` — every route loads clean
