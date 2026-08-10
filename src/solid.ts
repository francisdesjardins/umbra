/**
 * `umbra/solid` — the Solid binding.
 *
 * A sibling of `./react`, not a port of it. Both sit on the same framework-agnostic core: the
 * modal store, the action engine, the manager, the `attach*` DOM wiring, the placement table and
 * the slide geometry are all shared, and what each binding adds is how its framework schedules
 * effects and owns nodes. That is the claim `src/index.ts` makes about React being one binding,
 * cashed a second time.
 *
 * **The surface is React's**, deliberately, so a team running both frameworks writes the same
 * modal twice with the same words. Two differences, and both are the renderer's rather than a
 * choice:
 *
 * - Live values (`isVisible`, `isPreparing`, `hasRunningAction`, `error`) are **getters** over
 *   signals. `modal.isVisible` reads the same way it does in React; inside JSX it subscribes that
 *   one expression instead of re-rendering a component.
 * - {@link useLookup} returns an accessor, because `ModalInfo` is a discriminated union and an
 *   object of getters cannot be one without losing the narrowing.
 *
 * Because they are getters, **do not destructure the render args** — `render: ({ isPreparing })`
 * reads the value once and freezes it, exactly as destructuring props does anywhere in Solid.
 * Take the context and read through it: `render: (ctx) => <Show when={ctx.isPreparing}>…`.
 *
 * `portal: true` is the one place the two bindings' surfaces differ, and it is the renderer's
 * difference: React's `createPortal` returns a node you still have to render, while a Solid modal
 * owns its element, so the binding mounts it into `document.body` itself and `Modal` is `null`.
 *
 * The root is re-exported wholesale below, so a Solid app imports from this one path.
 *
 * Solid is an **optional** peer dependency: this entry point is the only thing in the package
 * that touches it, and the root resolves with it absent — the same bargain `react` gets.
 */

export { useModal } from './solid/use-modal.js';
export { ModalOutlet } from './solid/modal-outlet.js';

export { useMessageModal } from './solid/templates/use-message-modal.js';
export { useSlideModal } from './solid/templates/use-slide-modal.js';

export { DialogManagerProvider, useDialogManagerContext } from './solid/dialog-manager-context.js';
export { useDialogManager } from './solid/use-dialog-manager.js';
export type { DialogManagerSnapshot } from './solid/use-dialog-manager.js';
export { useLookup } from './solid/use-lookup.js';

// The bridge from the library's store contract to a Solid signal. Public because it is what a
// consumer needs to read any store this package hands it — the manager's, a modal's — and
// because the alternative is every app writing the same six lines.
export { fromStore } from './solid/from-store.js';

// The framework-agnostic core, re-exported wholesale: `dialogManager`, `createStore`,
// `dialogPlacement`, `applyStyle`, `Key`. A Solid consumer needs exactly one import path.
//
// Every relative specifier carries its `.js` extension — `tsc` copies them into the emitted
// `.d.ts` verbatim, and an extensionless one is invalid on `moduleResolution: node16`/`nodenext`.
export * from './index.js';

// `CloseResult`, `ModalPhase` and `ModalStoreSnapshot` are deliberately absent: they are part of
// the framework-agnostic vocabulary and ship from the root, which this file re-exports wholesale.
export type { ModalHandle, ModalRenderArgs, ModalVariant, AwaitedClose } from './core/types.js';

// The four the core leaves open, turned to Solid: `DialogStyle` for styles, `JSX.Element` for
// nodes. Same names as `./react` exports, same meanings, different instantiation.
export type {
  ModalAnimation,
  UseModalBaseOptions,
  UseModalOptions,
  UseModalReturn,
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
  MessageModalRenderContext,
  MessageModalType,
  UseMessageModalOptions,
  UseMessageModalReturn,
} from './solid/templates/use-message-modal.js';
export type {
  SlideAlign,
  SlideDirection,
  SlideModalRenderContext,
  UseSlideModalOptions,
  UseSlideModalReturn,
} from './solid/templates/use-slide-modal.js';
