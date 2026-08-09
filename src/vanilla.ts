/**
 * `umbra/vanilla` — the binding for a `<dialog>` you wrote yourself.
 *
 * The third binding, and deliberately **not** the same shape as the other two. `umbra/react` and
 * `umbra/solid` render a dialog *and* its contents from a `render` callback; a vanilla binding
 * that did the same would have to ship a renderer, which is the one thing this library refuses to
 * do. So this one is a **controller**: the element and everything in it is markup you already
 * have, and what it drives is the lifecycle.
 *
 * That is the difference, and it is the whole of it. Everything a modal *is* — phases and the
 * entrance/exit animation, `prepare` with its `AbortSignal`, the dismiss key on the dialog, on
 * its native `cancel` and at the window for a non-blocking panel, click-outside, backdrop
 * hit-testing, opening focus and restoration after a failed action, the registration that makes
 * it addressable by id from another microfrontend, the typed close and `openAndWait` — is the
 * same code the hook bindings run, called in the same order.
 *
 * `bindAction` is the one addition, and it exists because nothing here re-renders: it attaches an
 * action to a button and keeps `disabled`, `data-loading` and `aria-busy` in step, which is the
 * half a renderer does elsewhere.
 *
 * **No framework, optional or otherwise.** This entry point imports nothing React or Solid ship,
 * so it resolves in exactly the environments the root does — a plain page, an Astro island, a web
 * component, a server-rendered app with a sprinkle of JavaScript. The root is re-exported
 * wholesale below, so those apps import from this one path.
 */

export { bindDialog } from './vanilla/bind-dialog.js';
export type { BindDialogOptions, DialogController, DialogSnapshot } from './vanilla/types.js';

// The framework-agnostic core, re-exported wholesale: `dialogManager`, `createStore`,
// `dialogPlacement`, `applyStyle`, `Key`. One import path.
//
// Every relative specifier carries its `.js` extension — `tsc` copies them into the emitted
// `.d.ts` verbatim, and an extensionless one is invalid on `moduleResolution: node16`/`nodenext`.
export * from './index.js';

// The vocabulary a controller's callbacks speak. `CloseResult`, `ModalPhase` and
// `ModalStoreSnapshot` are deliberately absent: they ship from the root, which this file
// re-exports wholesale.
export type { ModalHandle, ModalVariant, AwaitedClose } from './core/types.js';

// Actions are bound rather than rendered here, but they are the same actions — the options a
// caller passes to `bindAction`, and the props it applies on their behalf.
export type {
  ActionButtonProps,
  ActionClickEvent,
  ActionCloseFn,
  ActionOptions,
  HotkeyDef,
} from './actions/types.js';
