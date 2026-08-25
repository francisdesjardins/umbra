---
name: dialog-debug
description: Debug dialog/slide-dialog animation, positioning and lifecycle state by driving a real browser against any modal in the playground and measuring what actually renders. Use when a modal visibly misbehaves (jumps/pops instead of sliding, wrong size, stuck open, wrong direction) and unit/component tests pass but the live app looks wrong.
---

# Dialog Debug

A reusable Playwright probe (`probe.mjs`) that drives **any modal in the playground** by its id
and measures what the browser actually paints — transform trajectories, per-frame rendered
positions, box sizes, teardown behavior, and the library's own debug logs. Use it instead of
writing (and throwing away) one-off scripts.

## Why this exists

Component tests (`transition: none` + `getComputedStyle`) confirm _logic_ but not _rendered
motion_. Several real bugs here were invisible to tests and to naive measurement:

- A slide whose `transform` animates correctly but whose **rendered box never moves** (a positive
  translate expanded document overflow and shifted the layout to cancel it → "zoom/pop").
- Timing flukes: `getComputedStyle` sampled too early catches the `display:none` pre-open frames.
- Size controls silently clamped by a template's `minWidth`.

The probe measures **`getBoundingClientRect` per animation frame** and counts **distinct rendered
positions** — the reliable signal for "did it actually slide?".

## Prerequisites

1. Dev server running: `yarn dev` (Vite, auto-detected on ports 3000–3010).
2. Run from the **project root** so `playwright` resolves from `node_modules`.

## Usage

```bash
# Did every direction actually slide (not jump/pop)? distinct>=8 = slide, <=2 = jump.
node .claude/skills/dialog-debug/probe.mjs --mode slide                 # modal, all 4 dirs
node .claude/skills/dialog-debug/probe.mjs --mode slide --non-modal     # contained
node .claude/skills/dialog-debug/probe.mjs --mode slide --portal        # portal
node .claude/skills/dialog-debug/probe.mjs --mode slide --id slide-preset-drawer

# Frame-by-frame transform(px) + rect for one direction.
node .claude/skills/dialog-debug/probe.mjs --mode trajectory --id slide-preset-drawer

# Which (direction × mode) combos respond to the SIZE pane? (slow: 16 page loads)

# Does toggling a structural prop while open tear down cleanly (not stuck)?
node .claude/skills/dialog-debug/probe.mjs --mode state --toggle Portal --non-modal
node .claude/skills/dialog-debug/probe.mjs --mode state --toggle Non-modal

# The library's own lifecycle/manager logs during open/close.
node .claude/skills/dialog-debug/probe.mjs --mode logs --id slide-preset-drawer

# Watch it happen (visible browser, slowed):
node .claude/skills/dialog-debug/probe.mjs --mode slide --id slide-preset-drawer --headed --slow
```

### Flags

| Flag                   | Meaning                                                       |
| ---------------------- | ------------------------------------------------------------- |
| `--mode`               | `slide` (default) · `trajectory` · `size` · `state` · `logs`  |
| `--dir`                | `Left`/`Right`/`Top`/`Bottom` (default: all four for `slide`) |
| `--non-modal`          | check the Non-modal box                                       |
| `--portal`             | check the Portal box                                          |
| `--unit`               | `px`/`vw`/`vh`/`%` (size mode)                                |
| `--width` / `--height` | numbers for the SIZE pane inputs                              |
| `--toggle`             | `Non-modal` or `Portal` (state mode)                          |
| `--url`                | override the dev URL (skip port auto-detect)                  |
| `--headed` / `--slow`  | show the browser / slow it down                               |

## Reading results

- **slide**: `distinct` = number of unique rendered positions during the entrance. `>=8` is a real
  slide; `<=2` means it jumped/popped. `span` is total travel in px (≈ panel size along the axis).
- **trajectory**: `tx`/`ty` are the resolved transform in px; `pos` is the rendered edge. If `tx`
  changes but `pos` doesn't, an ancestor is shifting to cancel the transform (overflow/containing-block).
- **size**: the measured `WxH` per combo — spot which don't track the configured size (usually a
  template `min*/max*` clamp, or a full-bleed cross axis by design).

## Extending

Add a new `--mode` branch in `probe.mjs`. Keep the reliable pattern: **wait for `[open]`, then
sample `getBoundingClientRect` every `requestAnimationFrame`** — never sample before open, and
prefer rendered geometry over `getComputedStyle` transforms alone.
