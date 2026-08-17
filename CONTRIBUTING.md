# Contributing

First, the honest frame — the README's [How this repo is run](README.md#how-this-repo-is-run)
section is the contract: one maintainer, commits to `main`, no semver, names free to improve
between two commits. Contributions are welcome inside that frame, and an issue before a large PR
will save you work I would hate to see wasted.

## Setup

Node ≥ 24 and Yarn 4 via [Corepack](https://nodejs.org/api/corepack.html):

```bash
corepack enable
yarn install       # one install at the root covers the playground workspace too
yarn dev           # playground on :3000
```

## Before a PR

```bash
yarn check         # type-check + lint (strict) + format + docs — the pre-commit gate
yarn test          # unit + component, and CT runs on three engines
```

Both must be green. A behaviour change needs a test that was red before the change — several
recent fixes note "verified red with the fix removed" in their commit message, and that is the
bar, not a flourish.

## What will get asked of a change

The deep rules live in [CLAUDE.md](CLAUDE.md) and [src/CLAUDE.md](src/CLAUDE.md), and they are
written for exactly this purpose — the short list that comes up most:

- **Framework-free by default.** New logic goes under the core unless it genuinely needs a
  renderer; if adding it to one binding would mean adding it to the other, it is core. The
  entry-isolation tests will fail a framework import that sneaks into the root.
- **No UI ships.** Ever. Reference markup belongs in the playground's templates.
- **A compatibility fact goes in the matrix** (`src/__tests__/compatibility-matrix.ts`), not in
  prose — and a ✓ cell cites the test that proves it.
- **Comments say why, never what or used-to.** The CHANGELOG is the history, and your change
  needs an entry in the current date's block.
- **Conventional Commits**, present tense, and the message explains the reasoning — read
  `git log` for the house style before writing one.

## Issues

A reproduction beats a description: the playground's `/warzone` route exists to build one
against, and its source is the shape a good issue attaches. For accessibility findings, say which
engine and which assistive technology — the matrix records claims per engine, and a report that
names one is actionable the day it arrives.

Security reports go through [SECURITY.md](SECURITY.md), not the issue tracker.
