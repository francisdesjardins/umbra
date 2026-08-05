/**
 * `umbra/react` — the React binding.
 *
 * One of possibly several bindings over the framework-agnostic manager in `./index`. It adds
 * the hooks, the `<dialog>` rendering, and the React-flavoured store access; everything
 * else — the manager, the store engine, the async helpers, the key utilities — is re-exported
 * from the root below, so a React app imports from this one path and never needs the other.
 *
 * A binding's job is small and this file is the map of it: subscribe to a modal store,
 * render a `<dialog>`, register it with the manager. A Solid or Vue binding would sit
 * alongside this file and share everything under it.
 */

export { ModalOutlet } from './core/modal-outlet.js';
export { useModal } from './core/use-modal.js';

export { useMessageModal } from './templates/use-message-modal.js';
export { useSlideModal } from './templates/use-slide-modal.js';

export {
  DialogManagerProvider,
  useDialogManagerContext,
} from './manager/dialog-manager-context.js';
export { useDialogManager } from './manager/use-dialog-manager.js';
export type { DialogManagerSnapshot } from './manager/use-dialog-manager.js';
export { useLookup } from './manager/use-lookup.js';

// The framework-agnostic core, re-exported wholesale: dialogManager, createStore, watch, the
// async helpers, Key. A React consumer needs exactly one import path.
//
// Every relative specifier in `src/` carries its `.js` extension — `tsc` copies them into the
// emitted `.d.ts` verbatim, and an extensionless one is invalid on `moduleResolution:
// node16`/`nodenext`. This line is where that goes most visibly wrong if it is ever "tidied
// away": `export *` cannot enumerate an unresolvable module, so this entry point would appear
// to be missing `dialogManager`, `createStore`, `Key` and everything else the root owns, while
// the runtime bundle has them all. `scripts/verify-package.mjs` fails on any extensionless
// specifier in the built declarations.
export * from './index.js';

// `CloseResult`, `ModalPhase` and `ModalStoreSnapshot` are deliberately absent: they are part
// of the framework-agnostic vocabulary and ship from the root, which this file re-exports
// wholesale. Naming them again here would be a duplicate export, not a convenience.
export type {
  ModalAnimation,
  ModalHandle,
  ModalRenderArgs,
  ModalVariant,
  UseModalBaseOptions,
  UseModalOptions,
  UseModalReturn,
  WaitForCloseResult,
} from './core/types.js';

// Actions are declared by being rendered — `render` is handed an `ActionFactory`, and there is
// no controller to build or pass in. What ships is the vocabulary a caller needs to name what
// it is given: the factory, its options, and the props it returns.
export type {
  ActionButtonProps,
  ActionClickEvent,
  ActionCloseFn,
  ActionFactory,
  ActionOptions,
  HotkeyDef,
} from './actions/types.js';

export type {
  MessageModalRenderContext,
  MessageModalType,
  UseMessageModalOptions,
  UseMessageModalReturn,
} from './templates/use-message-modal.js';
export type {
  SlideAlign,
  SlideDirection,
  SlideModalRenderContext,
  UseSlideModalOptions,
  UseSlideModalReturn,
} from './templates/use-slide-modal.js';
