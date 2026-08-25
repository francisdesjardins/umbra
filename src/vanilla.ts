/**
 * `umbra/vanilla` — the binding for a `<dialog>` you wrote yourself.
 *
 * Deliberately **not** the shape of the other two: they render a dialog *and* its contents, which
 * a vanilla binding could match only by shipping a renderer. So this one is a **controller** — the
 * markup is yours, the lifecycle is ours. Everything a dialog *is* (phases and animation, `prepare`
 * with its `AbortSignal`, the dismiss key on the dialog, on native `cancel` and at the window for a
 * non-modal panel, click-outside, backdrop hit-testing, opening focus and restoration after a failed
 * action, the registration that makes it addressable by id from another microfrontend, the typed
 * close and `openAndWait`) is the hook bindings' code, in the same order; `bindAction` is the one
 * addition, and only because nothing here re-renders.
 *
 * **No framework, optional or otherwise** — this entry point imports nothing React or Solid ship,
 * so it resolves wherever the root does: a plain page, an Astro island, a web component, a
 * server-rendered app with a sprinkle of JavaScript.
 */

export { bindDialog } from './vanilla/bind-dialog.js';
export type { BindDialogOptions, DialogController, DialogSnapshot } from './vanilla/types.js';

// The core, wholesale, so this is the one import path. The `.js` is load-bearing — see the note on
// `./react`'s copy of this line.
export * from './index.js';

// The vocabulary a controller's callbacks speak; `CloseResult`, `DialogPhase` and
// `DialogStoreSnapshot` are absent because the root has them.
export type { DialogHandle, DialogVariant, AwaitedClose } from './core/types.js';

// Bound rather than rendered here, but the same actions: what `bindAction` takes and applies.
export type {
  ActionButtonProps,
  ActionClickEvent,
  ActionCloseFn,
  ActionOptions,
  ActionReason,
  HotkeyDef,
} from './actions/types.js';
