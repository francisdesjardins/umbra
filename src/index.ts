/**
 * `umbra` — the dialog manager itself. Plain TypeScript, no framework.
 *
 * A registry of dialogs addressed by id, a state machine per dialog, a body scroll lock, a
 * lifecycle event stream and the state primitives that go with them — no opinion about rendering,
 * so a caller with no renderer (a service, a router guard, a worker, an SSR path) imports straight
 * from here, which `src/__tests__/entry-isolation.test.ts` enforces off the real import graph.
 *
 * Bindings are the optional layer, each on its own entry point re-exporting everything here so an
 * app imports one path. A fourth — Vue, a web component — changes nothing in this module.
 */

export {
  DIALOG_CLOSE_EVENT,
  DIALOG_OPEN_EVENT,
  createDialogManager,
  createOpenRequest,
  dialogManager,
} from './manager/dialog-manager.js';
export { setLogLevel } from './utils/logger.js';

export type {
  DialogManager,
  DialogManagerEvent,
  DialogManagerSubscriber,
  DialogCloseEventDetail,
  DialogOpenEventDetail,
  OpenRequest,
  OpenRequestContext,
  OpenRequestDispatch,
  OpenRequestHandler,
  OpenRequestOutcome,
  RegisterOptions,
} from './manager/dialog-manager.js';

export type {
  DialogInfo,
  DialogLookup,
  RegisteredDialogInfo,
  UnregisteredDialogInfo,
} from './manager/types.js';

// Both halves of `dialogManager.prioritize`: an app declares such a policy in its own module.
export type { StackDialog, StackPriority } from './manager/stack-order.js';

// The vocabulary the manager's own surface speaks: a consumer who can name `DialogInfo` but not
// `DialogPhase` cannot write the annotation it requires. The hook-shaped types beside them describe
// rendering, so they stay on a binding.
export type { CloseResult, DialogPhase, DialogStoreSnapshot, PortalTarget } from './core/types.js';

// The registry, and the types derived from it. `DialogRegistry` is exported so a project can
// augment it — an interface nobody can name is an interface nobody can merge into — and `DialogId`
// because it is what every door on the manager now says, so a consumer annotating one needs it.
// `CloseOf` is here for the same reason: it is what a declared dialog's close *is*, so a function
// taking one has to be able to say so.
export type {
  CloseOf,
  DataOf,
  DataOfReason,
  DialogContract,
  DialogId,
  DialogRegistry,
  PayloadFreeReasonOf,
  PayloadOf,
  ReasonOf,
  RegisteredDialogId,
} from './core/registry.js';

// The same rule for `onError`'s payload: `DialogErrorSource` ships beside `DialogFailure` because its
// doc promises an exhaustive `switch`, and one whose type has no name is not one. (`docs:check`
// cannot ask for these, reaching them only through `UseDialogBaseOptions`.)
export type { DialogErrorSource, DialogFailure } from './core/types.js';

// The reserved close reason, value and type: `CloseResult.reason` is `TReason | DismissReason`, and
// comparing against it should not mean retyping the string.
export { DISMISS_REASON } from './core/dismiss-reason.js';
export type { DismissCause, DismissReason } from './core/dismiss-reason.js';

// The one piece of a binding's rendering job that is not framework work — a table of CSS whose
// mistakes make an inline non-modal dialog jump — so every binding positions one identically.
export { dialogPlacement } from './core/placement.js';
export type {
  DialogHostStyle,
  DialogBackdropStyle,
  DialogPlacement,
  DialogPlacementOptions,
  DialogPositionStyle,
} from './core/placement.js';

// Their vocabulary, plus the one way to write a style onto an element that owns no renderer.
export { applyStyle } from './core/style.js';
export type { DialogStyle, StyleTarget, StyleWrite } from './core/style.js';

// The question a surface answering a key over a page must ask before acting on it: driving its own
// key, it has none of our dismiss listeners to inherit the rule from, and a second copy drifts.
export { isKeyClaimedByPopup } from './core/attach-keydown.js';

// Its sibling, for the same callers: the top layer swallows outside clicks, so a second dialog opens
// inside the first and its keys bubble through — the outer one must drop them or answer for it.
export { isOwnEventTarget } from './utils/dialog-scope.js';

// The decision a controlled wrapper makes on every pass, so nobody rediscovers that it turns on
// `phase` and not `isVisible`: the crossing between a boolean prop and an imperative library.
export { reconcileOpen } from './core/reconcile-open.js';
export type { OpenReconciliation } from './core/reconcile-open.js';

// The reactive cell the dialog store, the action engine, the outlet and the manager all run on. The
// rule is **export what the library runs on and would otherwise be duplicated** — private, this
// would force a second copy into the playground. `StoreContract` is the `{ subscribe, getSnapshot }`
// pair `useSyncExternalStore`, Solid's `from` and a Vue `ref` bridge consume; what is built *over*
// it (`useStore`, `createStoreContext`, `watch`, `shallowEqual`) had no caller here.
export { createStore } from './store/create-store.js';
export type {
  CreateDomainStoreOptions,
  CreateStoreOptions,
  GenericStore,
  Store,
  StoreApi,
  StoreContract,
} from './store/create-store.js';

// The one general-purpose helper the library needs — it turns whatever an action handler throws
// into the `Error` reported on `error`, and a caller composing its own wants the same. Async
// coordination is user-land, and lives in the playground to copy.
export { normalizeError } from './utils/normalize-error.js';

// Two formatters, because a hotkey has two audiences: `formatHotkeyLabel` for a person reading a
// menu item (`Ctrl`, the keycap spelling), `formatAriaKeyshortcuts` for the platform, where every
// token must be a `KeyboardEvent.key` value — `Control`, and `Space` for the key whose value is a
// space and so cannot sit in a space-delimited list. The library dispatches by the second, so a
// wrapper building the attribute needs it; `parseHotkey` is the way back in, for a shortcut off
// configuration or the wire without an unchecked cast or a validator per call site.
export {
  formatAriaKeyshortcuts,
  formatHotkeyLabel,
  matchesHotkey,
  parseHotkey,
} from './utils/hotkey-utils.js';
export { Key } from './utils/keys.js';
export type { KeyValue } from './utils/keys.js';
// Named by the root's own signatures, so a framework-free consumer must be able to name it too.
export type { HotkeyDef } from './actions/types.js';
