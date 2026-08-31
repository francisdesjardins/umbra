# .claude/settings.json — Hooks & Automation

This file configures VS Code agent automation for the umbra project via two hook types:

## PostToolUse Hook — Auto-format on Edit

**Trigger:** After every `Edit`/`Write` tool call (e.g., creating or editing a file)

**What it does:** Runs Prettier on the edited file to enforce code formatting

```bash
yarn prettier --write --ignore-unknown <file>
```

**Why:** Ensures consistent formatting without the agent needing to think about it. Formatter runs in isolation, so the agent can focus on logic, not style.

**Timeout:** 30 seconds per file

**Status message:** "Formatting with Prettier"

---

## Stop Hooks — Validation on Turn End

**Trigger:** When the agent's turn ends (before handing back to user)

**What it does:** Runs three validation checks in sequence:

### 1. Type Check (TypeScript 7)

```bash
node node_modules/typescript-7/bin/tsc --noEmit -p tsconfig.json
```

- **Purpose:** Catch type errors before the user sees them
- **Timeout:** 120 seconds
- **Status message:** "Type-checking (TS 7)"
- **Fails the turn if:** tsc exits non-zero (any type error)

**Why TypeScript 7 specifically?** This repo uses TS 7 for library code (via tsgolint for oxlint type-awareness), not the default TS 6. The monorepo pins both.

### 2. Lint (oxlint, type-aware)

```bash
yarn lint --deny-warnings
```

- **Purpose:** Enforce style, detect dead code, surface type-aware issues
- **Timeout:** 120 seconds
- **Status message:** "Running oxlint (type-aware)"
- **Fails the turn if:** oxlint finds warnings or errors (with `--deny-warnings`)

**Why type-aware?** oxlint runs through tsgolint's type-aware half, catching issues TypeScript's own linter would miss (like unsafe property access with `noUncheckedIndexedAccess`).

### 3. Doc Budget Check

```bash
yarn playwright test -c playwright.config.ts --project=unit --grep "the agent instructions have a budget"
```

- **Purpose:** Ensure prose documentation files don't exceed word budgets
- **Timeout:** 120 seconds
- **Status message:** "Checking the CLAUDE.md word budget"
- **Fails the turn if:** Test fails (doc budget exceeded)

**Affected files:**

- `CLAUDE.md` (main)
- `src/CLAUDE.md` (library)
- `playground/CLAUDE.md` (examples)

**Why?** Long documentation drifts and becomes unreadable. The budget (e.g., 1800 words for `CLAUDE.md`) forces concision and clarity.

**Test location:** [src/**tests**/doc-budget.test.ts](../src/__tests__/doc-budget.test.ts) — lists each file, its limit, and the cutoff point.

---

## Permissions — Blocked Commands

The settings also block dangerous operations:

| Pattern            | Blocked | Reason                               |
| ------------------ | ------- | ------------------------------------ |
| `git push --force` | ❌ Yes  | Prevents force-pushing (destructive) |
| `git push -f`      | ❌ Yes  | Prevents force-pushing (short form)  |
| `git reset --hard` | ❌ Yes  | Prevents losing local changes        |
| `git clean -fd`    | ❌ Yes  | Prevents deleting untracked files    |
| `git stash clear`  | ❌ Yes  | Prevents losing stashed work         |
| `git stash drop`   | ❌ Yes  | Prevents losing stashed work         |
| `git rebase`       | ❌ Yes  | Prevents interactive rebase mishaps  |
| `rm -rf …`         | ❌ Yes  | Prevents deleting directories        |

**Why?** These are one-way operations. If an agent runs them by mistake, work is lost. Better to require explicit user confirmation.

---

## How It All Works Together

```
Agent runs yarn build
        ↓
File written to src/foo.tsx
        ↓
PostToolUse Hook
  ├─ Prettier runs → src/foo.tsx formatted
  └─ Status: "Formatting with Prettier"
        ↓
Agent's turn ends
        ↓
Stop Hooks (in order)
  ├─ tsc --noEmit → ❌ Type errors? Turn fails, agent sees errors
  ├─ yarn lint --deny-warnings → ❌ Warnings? Turn fails, agent sees lint issues
  └─ yarn playwright test (budget) → ❌ Docs too long? Turn fails, agent sees budget exceeded
        ↓
All three pass?
  └─ ✓ Agent's turn complete, user sees clean code + passing checks
```

**If any check fails:** The turn stops, error output is shown to the agent, and it can fix the issue before handing back.

---

## Adjusting Timeouts

Each hook has a `timeout` field (in seconds). To increase a timeout:

1. Open `.claude/settings.json`
2. Find the hook's `timeout` value (e.g., `"timeout": 120`)
3. Increase it (e.g., `"timeout": 180` for 3 minutes)

**Common reasons to increase:**

- Type-check times out on a large refactor → increase to 180
- Lint is slow in a large monorepo → increase to 180
- Doc budget test is slow with many files → increase to 150

---

## Disabling Hooks

To temporarily disable a hook (e.g., to speed up testing):

1. Remove the hook object from the array, or
2. Set `"disabled": true` (if that field exists), or
3. Comment out the `hooks` array entirely

**Not recommended:** These hooks catch real issues. Disable only for debugging, then re-enable.

---

## Adding New Hooks

To add a new PostToolUse or Stop hook:

1. Edit `.claude/settings.json`
2. Add to the appropriate `hooks` array
3. Include: `type` (always `"command"` for shell commands), `command`, `timeout`, `statusMessage`

Example:

```json
{
  "type": "command",
  "command": "yarn build && node scripts/verify-package.mjs",
  "timeout": 60,
  "statusMessage": "Verifying package artifacts"
}
```

---

## Troubleshooting

**"PostToolUse hook timed out"**

- Prettier is taking >30 seconds (unlikely)
- File is very large and Prettier is slow
- Fix: Increase `timeout` to 60

**"Stop hook failed: tsc --noEmit"**

- Type errors in your edits
- Fix: Agent sees the error and can correct it
- You can also run `yarn type-check` manually to see all errors

**"Doc budget exceeded"**

- Your prose documentation got too long
- Fix: Trim to the limit (shown in test output) or raise the budget in [doc-budget.test.ts](../src/__tests__/doc-budget.test.ts)
- Budget is intentional; increase only if you're documenting a complex new feature

**Hook doesn't run after edit**

- Check: Did the edit use the `Edit`/`Write` tool? (Other tools don't trigger PostToolUse)
- Check: Is the hook properly formatted in `.claude/settings.json` (valid JSON)?
- Fix: Manual format: `yarn format`

---

## Related

- **[.claude/commands/add-example.md](add-example.md)** — Adds example; triggers PostToolUse hook
- **[.claude/commands/store-engineer.md](store-engineer.md)** — Generates store code; triggers PostToolUse hook
- **[.claude/skills/](.)** — Each skill's code is also formatted + validated by these hooks
- **[src/**tests**/doc-budget.test.ts](../src/__tests__/doc-budget.test.ts)** — Define budgets for CLAUDE.md files
