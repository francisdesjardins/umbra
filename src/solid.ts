/**
 * `umbra/solid` — the Solid binding.
 *
 * A sibling of `./react`, not a port: both sit on the same core, and each adds only how its
 * framework schedules effects and owns nodes. **The surface is React's**, deliberately, so a team
 * running both writes the same modal twice with the same words. Three differences, all renderer:
 *
 * - Live values (`isVisible`, `isPreparing`, `hasRunningAction`, `error`) are **getters** over
 *   signals, so inside JSX each subscribes that one expression. Therefore **do not destructure the
 *   render args** — `render: ({ isPreparing })` freezes the value, as destructuring props does
 *   anywhere in Solid; read through the context, `render: (ctx) => <Show when={ctx.isPreparing}>…`.
 * - {@link useLookup} returns an accessor, because `DialogInfo` is a discriminated union and an
 *   object of getters cannot be one without losing the narrowing.
 * - `portal: true` leaves `Modal` as `null`: a Solid modal owns its element, so the binding mounts
 *   it into `document.body` and there is nothing left for the caller to place.
 *
 * Solid is an **optional** peer dependency — this entry point is the only thing that touches it —
 * and the root is re-exported wholesale below, so an app imports this one path.
 */

export { useDialog } from './solid/use-dialog.js';
export { DialogOutlet } from './solid/dialog-outlet.js';

export { useMessageDialog } from './solid/templates/use-message-dialog.js';
export { useSlideDialog } from './solid/templates/use-slide-dialog.js';

export { DialogManagerProvider, useDialogManagerContext } from './solid/dialog-manager-context.js';
export { useDialogManager } from './solid/use-dialog-manager.js';
export type { DialogManagerSnapshot } from './solid/use-dialog-manager.js';
export { useLookup } from './solid/use-lookup.js';

// The bridge to a Solid signal: what a consumer needs to read any store this package hands it.
export { fromStore } from './solid/from-store.js';

// The core, wholesale, so a Solid consumer needs one import path. The `.js` is load-bearing — see
// the note on `./react`'s copy of this line.
export * from './index.js';

// `CloseResult`, `DialogPhase` and `DialogStoreSnapshot` are absent: the root re-export has them.
export type { DialogHandle, DialogRenderArgs, DialogVariant, AwaitedClose } from './core/types.js';

// The four the core leaves open, turned to Solid: `DialogStyle` and `JSX.Element` — `./react`'s
// names and meanings, a different instantiation.
export type {
  DialogAnimation,
  UseDialogBaseOptions,
  UseDialogOptions,
  UseDialogReturn,
} from './solid/types.js';

export type {
  ActionButtonProps,
  ActionClickEvent,
  ActionCloseFn,
  ActionFactory,
  ActionOptions,
  ActionReason,
  HotkeyDef,
} from './actions/types.js';

export type {
  MessageDialogRenderContext,
  MessageDialogType,
  UseMessageDialogOptions,
  UseMessageDialogReturn,
} from './solid/templates/use-message-dialog.js';
export type {
  SlideAlign,
  SlideDirection,
  SlideDialogRenderContext,
  UseSlideDialogOptions,
  UseSlideDialogReturn,
} from './solid/templates/use-slide-dialog.js';
