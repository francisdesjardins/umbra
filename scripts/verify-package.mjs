#!/usr/bin/env node
/**
 * Verifies the *built* package the way a consumer resolves it.
 *
 * `type-check` compiles `src/`, which says nothing about whether the published artifact is
 * usable: the `exports` map, the emitted `.d.ts` layout and the entry-point split are only
 * exercised by importing the package from outside. Those failures cannot be patched away
 * after a release, so they are worth catching before one.
 *
 * Checks, against `dist/`:
 *   1. both entry points resolve — types and all — under `moduleResolution: NodeNext`
 *   2. the root's transitive graph contains no `react` import (the optional-peer promise)
 *   3. the React binding really does re-export the root
 *   4. the inference the type model promises survives into the emitted `.d.ts` — the global
 *      `DocumentEventMap` augmentation, `ModalInfo`'s `exists` discrimination, the typed
 *      close payload, and a payload declared once on an action and *inferred* at the modal,
 *      each with a matching `@ts-expect-error` so a widened type fails too
 *
 * Run after `yarn build`; wired into `prepublishOnly`.
 */
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(REPO, 'dist');
const TSC = join(REPO, 'node_modules', 'typescript-7', 'bin', 'tsc');

let failures = 0;
const report = (ok, label, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
};

try {
  readdirSync(DIST);
} catch {
  console.error('FAIL dist/ not found — run `yarn build` first.');
  process.exit(1);
}

// ── 1 + 3. Resolve both entry points as an external consumer ─────────────────

const sandbox = mkdtempSync(join(tmpdir(), 'dialog-verify-'));
try {
  const pkgDir = join(sandbox, 'node_modules', 'umbra');
  mkdirSync(pkgDir, { recursive: true });
  cpSync(DIST, join(pkgDir, 'dist'), { recursive: true });
  cpSync(join(REPO, 'package.json'), join(pkgDir, 'package.json'));

  writeFileSync(
    join(sandbox, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        target: 'ES2024',
        lib: ['ES2024', 'DOM'],
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        jsx: 'react-jsx',
        strict: true,
        noEmit: true,
        skipLibCheck: true,
      },
      include: ['*.ts'],
    })
  );

  // Root: only framework-agnostic symbols, the way a non-React service imports them.
  writeFileSync(
    join(sandbox, 'root.ts'),
    [
      "import { dialogManager, createDialogManager, createStore } from 'umbra';",
      "import { normalizeError, Key, setLogLevel } from 'umbra';",
      "import type { ModalInfo, ModalPhase, DialogManager } from 'umbra';",
      'export const used = [dialogManager, createDialogManager, createStore,',
      '  normalizeError, Key, setLogLevel];',
      'export type Used = [ModalInfo, DialogManager];',
      '// A root consumer must be able to name the types the ones it was handed refer to.',
      'declare const info: ModalInfo;',
      'export const phase: ModalPhase = info.phase;',
    ].join('\n')
  );

  // Binding: the hooks, plus a root symbol to prove the re-export reaches consumers.
  writeFileSync(
    join(sandbox, 'react-entry.ts'),
    [
      "import { useModal, useMessageModal, useSlideModal } from 'umbra/react';",
      "import { ModalOutlet, dialogManager } from 'umbra/react';",
      'export const used = [useModal, useMessageModal, useSlideModal,',
      '  ModalOutlet, dialogManager];',
    ].join('\n')
  );

  // The controller binding: no framework at all, so it must resolve for a consumer who installed
  // neither peer — which is exactly what the leak walk below checks.
  writeFileSync(
    join(sandbox, 'vanilla-entry.ts'),
    [
      "import { bindDialog, dialogManager, Key } from 'umbra/vanilla';",
      "import type { DialogController } from 'umbra/vanilla';",
      'export const used = [bindDialog, dialogManager, Key];',
      'export type Used = [DialogController];',
    ].join('\n')
  );

  // The second binding, resolved the same way — same hook names, same re-exported root. A
  // consumer must be able to import it without React installed, which is what the leak walk
  // below checks; here it is the `exports` entry and the emitted `.d.ts` that are on trial.
  writeFileSync(
    join(sandbox, 'solid-entry.ts'),
    [
      "import { useModal, useMessageModal, useSlideModal } from 'umbra/solid';",
      "import { ModalOutlet, fromStore, dialogManager } from 'umbra/solid';",
      'export const used = [useModal, useMessageModal, useSlideModal,',
      '  ModalOutlet, fromStore, dialogManager];',
    ].join('\n')
  );

  // Type-level promises that only hold if the emitted `.d.ts` carries them: the global
  // `DocumentEventMap` augmentation, the `exists`-discriminated `ModalInfo`, the payload
  // typing on `handle.close`, and the payload *inference* that lets a consumer declare it
  // once. Each `@ts-expect-error` doubles as a negative assertion — an unused directive is
  // itself an error, so a widened type fails this run.
  writeFileSync(
    join(sandbox, 'inference.ts'),
    [
      "import { MODAL_OPEN_EVENT, MODAL_CLOSE_EVENT, dialogManager } from 'umbra';",
      "import { useModal } from 'umbra/react';",
      "import type { ModalHandle } from 'umbra/react';",
      '',
      '// No cast: the augmentation must survive into the published declarations.',
      'document.addEventListener(MODAL_OPEN_EVENT, (event) => {',
      '  const id: string = event.detail.id;',
      '  void id;',
      '});',
      'document.addEventListener(MODAL_CLOSE_EVENT, (event) => {',
      '  const reason: string | undefined = event.detail.reason;',
      '  void reason;',
      '});',
      '',
      "const info = dialogManager.lookup('some-modal');",
      'export const template = info.exists ? info.template : undefined;',
      '// @ts-expect-error registration-time facts need narrowing on `exists`',
      'export const unguarded = info.template;',
      '',
      'declare const typed: ModalHandle<{ id: string }>;',
      "typed.close('ok', { id: 'a' });",
      '// @ts-expect-error the payload is the one the modal declares, not `unknown`',
      "typed.close('ok', 42);",
      '',
      '// Reasons declared on the hook are enforced at every door. This holds only if the',
      '// published declarations carry `TReason` through the factory, the handle and onClose.',
      "const modal = useModal<{ id: string }, 'save' | 'cancel'>({",
      "  id: 'declared',",
      '  render: ({ action, handle }) => {',
      "    action('save', (close) => { close({ id: 'a' }); });",
      "    action('cancel');",
      '    // @ts-expect-error not one of the declared reasons',
      "    action('savee');",
      "    handle.close('cancel');",
      '    return null;',
      '  },',
      '  onClose: (result) => {',
      "    const reason: 'save' | 'cancel' | 'dismiss' = result.reason;",
      '    const id: string | undefined = result.data?.id;',
      '    void [reason, id];',
      '  },',
      '});',
      'void modal.hasRunningAction;',
    ].join('\n')
  );

  try {
    execFileSync(process.execPath, [TSC, '-p', join(sandbox, 'tsconfig.json')], {
      stdio: 'pipe',
      encoding: 'utf8',
    });
    report(true, 'both entry points resolve for an external consumer (NodeNext)');
  } catch (error) {
    const output = `${error.stdout ?? ''}${error.stderr ?? ''}`.trim();
    report(false, 'both entry points resolve for an external consumer (NodeNext)');
    console.error(output.split('\n').slice(0, 12).join('\n'));
  }
} finally {
  rmSync(sandbox, { recursive: true, force: true });
}

// ── 1b. Every relative specifier in the declarations carries an extension ─────
//
// `tsc` copies relative specifiers into the emitted `.d.ts` verbatim, and an extensionless one
// is invalid under `moduleResolution: node16`/`nodenext`. The failure is silent in the worst
// possible way: `skipLibCheck: true` — a common default, and what the sandbox above uses —
// suppresses the resolution error, so every type imported across a module boundary degrades to
// an error type the checker lets through. The package then appears to type-check while
// providing no type safety at all.
//
// Checked statically because it is an invariant of the emitted artifact, not something a
// single consumer file happens to exercise: one extensionless specifier anywhere in the graph
// silently kills the types that flow through it.

const collectDeclarations = (dir) => {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...collectDeclarations(full));
    else if (entry.name.endsWith('.d.ts')) found.push(full);
  }
  return found;
};

const declarations = collectDeclarations(DIST);
const extensionless = [];
for (const file of declarations) {
  for (const match of readFileSync(file, 'utf8').matchAll(/from\s*["'](\.[^"']*)["']/g)) {
    const specifier = match[1];
    if (!specifier.endsWith('.js')) {
      extensionless.push(`${file.replace(DIST, 'dist')} -> ${specifier}`);
    }
  }
}
report(
  declarations.length > 0 && extensionless.length === 0,
  'every relative specifier in the emitted .d.ts carries an extension',
  `${declarations.length} declaration files${
    extensionless.length > 0 ? ` — ${extensionless.length} bad: ${extensionless[0]}, …` : ''
  }`
);

// ── 2. Each entry ships exactly its own framework ────────────────────────────

/** The frameworks the package can bind to, by the bare specifiers each one owns. */
const FRAMEWORKS = {
  react: ['react', 'react-dom'],
  solid: ['solid-js'],
};

const frameworkOf = (specifier) => {
  return Object.keys(FRAMEWORKS).find((name) => {
    return FRAMEWORKS[name].some((root) => {
      return specifier === root || specifier.startsWith(`${root}/`);
    });
  });
};

const walk = (entry) => {
  const seen = new Set();
  const leaks = [];
  const stack = [entry];

  while (stack.length > 0) {
    const file = stack.pop();
    if (seen.has(file)) continue;
    seen.add(file);

    let source;
    try {
      source = readFileSync(file, 'utf8');
    } catch {
      continue;
    }

    for (const match of source.matchAll(/from\s*["']([^"']+)["']/g)) {
      const specifier = match[1];
      const framework = frameworkOf(specifier);
      if (framework !== undefined) {
        leaks.push({ framework, detail: `${file.replace(DIST, 'dist')} -> ${specifier}` });
        continue;
      }
      if (specifier.startsWith('.')) {
        stack.push(join(dirname(file), specifier));
      }
    }
  }

  return { seen, leaks };
};

const frameworksIn = (result) => {
  return new Set(
    result.leaks.map((leak) => {
      return leak.framework;
    })
  );
};
const describe = (result) => {
  return result.leaks
    .map((leak) => {
      return leak.detail;
    })
    .join(', ');
};

const root = walk(join(DIST, 'esm', 'index.js'));
report(
  root.leaks.length === 0 && root.seen.size > 3,
  'the built root imports no framework',
  `${root.seen.size} modules${root.leaks.length > 0 ? ` — LEAKS: ${describe(root)}` : ''}`
);

// Mirror assertions: if the walker resolved nothing, the check above passes for the wrong
// reason. Each binding must reach its own framework — and only its own, or installing one
// binding's peer would be a condition for using the other.
for (const [entry, own, other] of [
  ['react.js', 'react', 'solid'],
  ['solid.js', 'solid', 'react'],
]) {
  const result = walk(join(DIST, 'esm', entry));
  const reached = frameworksIn(result);
  report(reached.has(own), `the built ${own} binding does import ${own} (walker is not blind)`);
  report(
    !reached.has(other),
    `the built ${own} binding imports no ${other}`,
    reached.has(other) ? describe(result) : ''
  );
}

// The controller binding renders nothing, so it reaches for nothing — it must resolve wherever
// the root does, for a consumer who installed neither optional peer.
const vanilla = walk(join(DIST, 'esm', 'vanilla.js'));
report(
  vanilla.leaks.length === 0 && vanilla.seen.size > 3,
  'the built vanilla binding imports no framework',
  `${vanilla.seen.size} modules${vanilla.leaks.length > 0 ? ` — LEAKS: ${describe(vanilla)}` : ''}`
);

console.log(failures === 0 ? '\nPACKAGE OK' : `\n${failures} PACKAGE CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
