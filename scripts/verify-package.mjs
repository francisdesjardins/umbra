#!/usr/bin/env node
/**
 * Verifies the *built* package as a consumer resolves it: `type-check` compiles `src/` and says
 * nothing about the `exports` map, the emitted `.d.ts` layout or the entry split, and those
 * failures outlive a release. Against `dist/` — both entries resolve (types included) under
 * `moduleResolution: NodeNext`; the root's graph imports no `react` (the optional-peer promise);
 * the React binding re-exports the root; the promised inference survives into the `.d.ts` (the
 * `DocumentEventMap` augmentation, `DialogInfo`'s `exists` discrimination, the typed close payload,
 * a payload declared once on an action and *inferred* at the modal), each with a matching
 * `@ts-expect-error` so a widened type fails too. Run after `yarn build`; in `prepublishOnly`.
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
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(REPO, 'dist');
const TSC = join(REPO, 'node_modules', 'typescript-7', 'bin', 'tsc');

let failures = 0;
const report = (ok, said) => {
  const { label, detail = '' } = said;
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
      "import type { DialogInfo, DialogPhase, DialogManager } from 'umbra';",
      'export const used = [dialogManager, createDialogManager, createStore,',
      '  normalizeError, Key, setLogLevel];',
      'export type Used = [DialogInfo, DialogManager];',
      '// A root consumer must be able to name the types the ones it was handed refer to.',
      'declare const info: DialogInfo;',
      'export const phase: DialogPhase = info.phase;',
    ].join('\n')
  );

  // Binding: the hooks, plus a root symbol to prove the re-export reaches consumers.
  writeFileSync(
    join(sandbox, 'react-entry.ts'),
    [
      "import { useDialog, useMessageDialog, useSlideDialog } from 'umbra/react';",
      "import { DialogOutlet, dialogManager } from 'umbra/react';",
      'export const used = [useDialog, useMessageDialog, useSlideDialog,',
      '  DialogOutlet, dialogManager];',
    ].join('\n')
  );

  // The controller binding: no framework, so it must resolve for a consumer with neither peer.
  writeFileSync(
    join(sandbox, 'vanilla-entry.ts'),
    [
      "import { bindDialog, dialogManager, Key } from 'umbra/vanilla';",
      "import type { DialogController } from 'umbra/vanilla';",
      'export const used = [bindDialog, dialogManager, Key];',
      'export type Used = [DialogController];',
    ].join('\n')
  );

  // The second binding: same hook names, same re-exported root — its `exports` entry and `.d.ts`.
  writeFileSync(
    join(sandbox, 'solid-entry.ts'),
    [
      "import { useDialog, useMessageDialog, useSlideDialog } from 'umbra/solid';",
      "import { DialogOutlet, fromStore, dialogManager } from 'umbra/solid';",
      'export const used = [useDialog, useMessageDialog, useSlideDialog,',
      '  DialogOutlet, fromStore, dialogManager];',
    ].join('\n')
  );

  // Type-level promises that hold only if the emitted `.d.ts` carries them. Each
  // `@ts-expect-error` is a negative assertion: an unused directive is itself an error.
  writeFileSync(
    join(sandbox, 'inference.ts'),
    [
      "import { DIALOG_OPEN_EVENT, DIALOG_CLOSE_EVENT, dialogManager } from 'umbra';",
      "import { useDialog } from 'umbra/react';",
      "import type { DialogHandle } from 'umbra/react';",
      '',
      '// No cast: the augmentation must survive into the published declarations.',
      'document.addEventListener(DIALOG_OPEN_EVENT, (event) => {',
      '  const id: string = event.detail.id;',
      '  void id;',
      '});',
      'document.addEventListener(DIALOG_CLOSE_EVENT, (event) => {',
      '  const reason: string | undefined = event.detail.reason;',
      '  void reason;',
      '});',
      '',
      "const info = dialogManager.lookup('some-modal');",
      'export const template = info.exists ? info.template : undefined;',
      '// @ts-expect-error registration-time facts need narrowing on `exists`',
      'export const unguarded = info.template;',
      '',
      'declare const typed: DialogHandle<{ id: string }>;',
      "typed.close('ok', { id: 'a' });",
      '// @ts-expect-error the payload is the one the modal declares, not `unknown`',
      "typed.close('ok', 42);",
      '',
      '// Reasons declared on the hook are enforced at every door. This holds only if the',
      '// published declarations carry `TReason` through the factory, the handle and onClose.',
      "const modal = useDialog<{ id: string }, 'save' | 'cancel'>({",
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
    report(true, { label: 'both entry points resolve for an external consumer (NodeNext)' });
  } catch (error) {
    const output = `${error.stdout ?? ''}${error.stderr ?? ''}`.trim();
    report(false, { label: 'both entry points resolve for an external consumer (NodeNext)' });
    console.error(output.split('\n').slice(0, 12).join('\n'));
  }
} finally {
  rmSync(sandbox, { recursive: true, force: true });
}

// ── 1b. Every relative specifier in the declarations carries an extension ─────
// `tsc` copies relative specifiers into the emitted `.d.ts` verbatim, and an extensionless one is
// invalid under `moduleResolution: node16`/`nodenext` — silently, since `skipLibCheck: true` (a
// common default, and what the sandbox above uses) suppresses the resolution error and every type
// crossing that boundary degrades to an error type: the package type-checks with no type safety.
// Checked statically because it is an invariant of the artifact, not of one consumer file.

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
report(declarations.length > 0 && extensionless.length === 0, {
  label: 'every relative specifier in the emitted .d.ts carries an extension',
  detail: `${declarations.length} declaration files${
    extensionless.length > 0 ? ` — ${extensionless.length} bad: ${extensionless[0]}, …` : ''
  }`,
});

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
report(root.leaks.length === 0 && root.seen.size > 3, {
  label: 'the built root imports no framework',
  detail: `${root.seen.size} modules${root.leaks.length > 0 ? ` — LEAKS: ${describe(root)}` : ''}`,
});

// Mirror assertions — else a blind walker passes the check above, and one peer would gate both.
for (const [entry, own, other] of [
  ['react.js', 'react', 'solid'],
  ['solid.js', 'solid', 'react'],
]) {
  const result = walk(join(DIST, 'esm', entry));
  const reached = frameworksIn(result);
  report(reached.has(own), {
    label: `the built ${own} binding does import ${own} (walker is not blind)`,
  });
  report(!reached.has(other), {
    label: `the built ${own} binding imports no ${other}`,
    detail: reached.has(other) ? describe(result) : '',
  });
}

// The controller binding renders nothing, so it must resolve for a consumer with neither peer.
const vanilla = walk(join(DIST, 'esm', 'vanilla.js'));
report(vanilla.leaks.length === 0 && vanilla.seen.size > 3, {
  label: 'the built vanilla binding imports no framework',
  detail: `${vanilla.seen.size} modules${vanilla.leaks.length > 0 ? ` — LEAKS: ${describe(vanilla)}` : ''}`,
});

// ── The React Compiler actually ran ─────────────────────────────────────────
// `react({ babel: … })` is accepted under this Vite and transforms *nothing*, so the bundle once
// shipped uncompiled while the source was documented as compiled. Both halves are asserted — a
// `compiler-runtime` import alone survives a build that compiled one trivial function and bailed.
const compiled = readFileSync(join(DIST, 'esm', 'react', 'use-dialog.js'), 'utf8');
const hasRuntime = compiled.includes('react/compiler-runtime');
const hasMemoCache = /\bc\(\d+\)/.test(compiled);
report(hasRuntime && hasMemoCache, {
  label: 'the React binding is compiled — compiler-runtime imported and a memo cache allocated',
  // Only on failure, and it names which half is missing — two different problems.
  detail:
    hasRuntime && hasMemoCache
      ? ''
      : hasRuntime
        ? 'no `c(n)` allocation, so the hook itself was not lowered'
        : 'no `react/compiler-runtime` import at all — the plugin did not run',
});

// The Solid binding must not be: the compiler names hooks by convention and it exports `useDialog`.
const solidSource = readFileSync(join(DIST, 'esm', 'solid', 'use-dialog.js'), 'utf8');
report(!solidSource.includes('compiler-runtime'), {
  label: 'the Solid binding is not compiled — no compiler-runtime in it',
});

// ── The React binding survives a server render ───────────────────────────────
//
// Every hook here reads its store through `useSyncExternalStore`, which throws outright when no
// server reader is given — so a single missing third argument takes down the whole render of any
// page that mounts a modal, and does it in the consumer's app rather than in this repo. Asserted on
// the built artifact for the reason the compiler checks are: the source cannot show whether what
// shipped still does it.
//
// The output is inspected rather than merely awaited, because a hook that rendered nothing would
// also "not throw" — the same blindness the import walker's positive halves exist to catch.
{
  const { renderToString } = await import('react-dom/server');
  const { createElement } = await import('react');
  const { useDialog } = await import(pathToFileURL(join(DIST, 'esm', 'react.js')).href);

  let html = '';
  let threw = '';
  try {
    html = renderToString(
      createElement(() => {
        return useDialog({
          id: 'ssr-check',
          ariaLabel: 'SSR check',
          render: () => {
            return null;
          },
        }).Modal;
      })
    );
  } catch (error) {
    threw = error instanceof Error ? error.message : String(error);
  }

  // A closed dialog, and closed is the only honest server answer: the top layer is enterable from
  // `showModal()` alone, so no served HTML can hand back an open modal one.
  const rendered = html.includes('<dialog') && html.includes('data-dialog-id="ssr-check"');
  report(threw === '' && rendered && !html.includes(' open'), {
    label: 'the React binding server-renders — a closed <dialog>, with no DOM in scope',
    detail: threw !== '' ? threw : rendered ? '' : `rendered nothing useful: ${html.slice(0, 80)}`,
  });
}

console.log(failures === 0 ? '\nPACKAGE OK' : `\n${failures} PACKAGE CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
