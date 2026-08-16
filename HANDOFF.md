# Verification handoff — `claude/uncovered-code-testing-cjo9i1`

**This is not the backlog.** The backlog is `yarn todo`, generated from
[the compatibility matrix](src/__tests__/compatibility-matrix.ts) so there is one answer to "is
anything still open" rather than two that drift — see the rule in [CLAUDE.md](CLAUDE.md). This file
is something narrower and shorter-lived: the checks **this branch's environment could not physically
run**, and the two open questions the work left. Delete it when the branch merges; nothing generates
it and nothing gates it.

Everything below was written by an agent whose sandbox has one browser and no access to Playwright's
CDN. Treat each item as unverified rather than as suspected-broken — nothing here is a known failure.

---

## 1. The engine matrix — blocking, and the only item that could hide a real defect

**Status: never run. Chromium only.**

`yarn test:component` runs three projects (`component`, `component-firefox`, `component-webkit`).
Only the first ran, and not by the normal path: the sandbox ships Chromium build **1194** while this
repo's `@playwright/test` 1.62.1 wants **1234**, so the suite was driven with a temporary
`launchOptions.executablePath` pointing at `/opt/pw-browsers/chromium`. **That override was never
committed** — `playwright.config.ts` on this branch is byte-identical to `main`.

Firefox and WebKit cannot be installed here at all: `npx playwright install firefox` fails with

```
403 'request blocked: no rule or allowlist entry allows host "cdn.playwright.dev"'
403 'request blocked: … "playwright.download.prss.microsoft.com"'
```

So this is an environment limit, not a skipped step.

```bash
yarn install --immutable
yarn playwright install --with-deps chromium firefox webkit
yarn test:component          # all three engines
```

**Why this one matters more than the rest.** WebKit has produced two real defects in this repo
already — it does not focus a `<button>` on click, which is what surfaced `chooseActionRunner`'s
ordering, and it swallows a Tab that `attachFocusContainment` recovers. Both live in the focus paths.
Two matrix cells are still open on exactly that ground (`focus restored after a failed action —
umbra/solid`, and the `reconcileOpen — umbra/vanilla` caveat), so a three-engine run is what turns
this branch's green into a claim.

Everything this branch touched that a browser can see: `manager/scroll-lock.ts` (rewired onto
`lock-ledger.ts`) and `utils/logger.ts` (rewired onto `safe-storage.ts`). Both are reached by the
whole suite, so a full run is the check — no targeted test to point you at.

## 2. Coverage — re-measure **both** numbers or neither

Measured here on 2026-08-15, Chromium via the override above:

| Project   | Statements                     | Branches   |
| --------- | ------------------------------ | ---------- |
| unit      | **95.67%**                     | **97.16%** |
| component | **92.18%** (over **54** files) | 82.55%     |

[CLAUDE.md](CLAUDE.md) carries the pair and says to re-measure both together. If the component number
moves on a real browser matrix, update both lines there in one edit.

```bash
yarn test:unit:coverage
CT_COVERAGE=1 yarn test:component:coverage
```

One gotcha that is in no file: **editing `scripts/vite-plugin-ct-coverage.mjs` invalidates neither CT
cache.** Delete `playwright/.cache-coverage/` by hand if the report comes back empty.

## 3. Two questions the work left open — judgement calls, not tasks

Neither is a defect. Both are decisions that are yours.

**Three exports are used only inside their own file.** `checkTransitionsDisabled` and `runDialogExit`
(`core/dialog-lifecycle.ts`), and `SCROLLBAR_WIDTH_VAR` (`manager/scroll-lock.ts`). None reaches
`src/index.ts`, so none is public surface, and unlike `isNullish` — removed on 2026-08-14 — all three
have real callers. Dropping the `export` keyword is cosmetic churn in lifecycle code, and one of them
may be exported to keep a future test's reach. Left alone deliberately.

**`applyStyle` is a root export with no API.md chapter.** So are `DialogStyle`, `StyleTarget`,
`DialogPlacement`, `isKeyClaimedByPopup` and about fifteen types. Some of that is fine — API.md is
prose, not a generated reference, and the playground's `/api` is the generated one. But **nothing
gates it**: the matrix chapter is checked by `yarn docs:matrix:check`, typedoc catches an unexported
type in a public signature, and `api-categories.test.ts` catches a missing playground category —
none of them notices a root export API.md never mentions. That is how `parseHotkey` went undocumented
long enough for this branch to find it. A gate would fail on ~20 names today, most of them types,
so it needs a decision about what it should demand before it can be written.

## 4. Already checked here — no action needed

Recorded so nobody repeats it: every markdown link in `CLAUDE.md`, `src/CLAUDE.md`,
`store/CLAUDE.md`, `playground/CLAUDE.md`, `API.md` and `README.md` resolves to a real path; the
binding-size claim in `src/CLAUDE.md` holds once it says which file it counts (`use-modal` 204/221,
`bind-dialog` 264 code lines — the folders around them are 442/492/306, which is what made it look
wrong); every
non-glob entry in `.c8rc.json`'s exclude list still exists; the `react/` ⇄ `solid/` mirror matches the
file list in `src/CLAUDE.md`; the `attach*` inventory matches `src/core/`; every root export has a
playground `CATEGORIES` entry; and the logging namespace table agrees across `logger.ts`,
`src/CLAUDE.md` and `API.md`. `yarn check` and `yarn verify:all` pass.
