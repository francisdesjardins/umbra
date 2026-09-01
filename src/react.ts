/**
 * `umbra/react` — the React binding.
 *
 * One of several bindings over the framework-agnostic manager in `./index`, adding the hooks, the
 * `<dialog>` rendering and the React-flavoured store access; the root is re-exported below, so a
 * React app imports this one path. A binding's job is small and this file is the map of it.
 */

export { DialogOutlet } from './react/dialog-outlet.js';
export { useDialog } from './react/use-dialog.js';

export { useMessageDialog } from './react/templates/use-message-dialog.js';
export { useSlideDialog } from './react/templates/use-slide-dialog.js';

export { DialogManagerProvider, useDialogManagerContext } from './react/dialog-manager-context.js';
export { useDialogManager } from './react/use-dialog-manager.js';
export type { DialogManagerSnapshot } from './react/use-dialog-manager.js';
export { useLookup } from './react/use-lookup.js';

// The core, wholesale, so a React consumer needs one import path. This line is where dropping a
// `.js` extension goes most visibly wrong: `export *` cannot enumerate an unresolvable module, so
// the entry would look as though the root's names had vanished. `verify-package.mjs` fails on any
// extensionless specifier.
export * from './index.js';

// `CloseResult`, `DialogPhase` and `DialogStoreSnapshot` are absent: naming them again would be a
// duplicate export, not a convenience.
export type { DialogHandle, DialogRenderArgs, DialogVariant, AwaitedClose } from './core/types.js';

// The four the core leaves open, with style and node turned to `CSSProperties` and `ReactNode`.
export type {
  DialogAnimation,
  UseDialogBaseOptions,
  UseDialogOptions,
  UseDialogReturn,
} from './react/types.js';

// Actions are declared by being rendered — `render` is handed an `ActionFactory` and there is no
// controller to build — so what ships is the vocabulary for naming what a caller is given.
export type {
  ActionButtonProps,
  ActionClickEvent,
  ActionCloseFn,
  ActionFactory,
  ActionOptions,
  ActionReason,
  ActionRunContext,
  HotkeyDef,
} from './actions/types.js';

export type {
  MessageDialogRenderContext,
  MessageDialogType,
  UseMessageDialogOptions,
  UseMessageDialogReturn,
} from './react/templates/use-message-dialog.js';
export type {
  SlideAlign,
  SlideDirection,
  SlideDialogRenderContext,
  UseSlideDialogOptions,
  UseSlideDialogReturn,
} from './react/templates/use-slide-dialog.js';
