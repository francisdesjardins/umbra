/**
 * `umbra` — the dialog manager itself. Plain TypeScript, no framework.
 *
 * This is the library: a registry of dialogs addressed by id, a state machine per dialog, a
 * body scroll lock, a lifecycle event stream, and the state/async primitives that go with
 * them. It has no opinion about how anything renders, and **React is not required to use
 * it** — the package resolves and runs with React absent entirely.
 *
 * Bindings live on their own entry points and are the optional layer. Each re-exports
 * everything here, so an app imports from one path and never needs this one:
 *
 * - `umbra/react` — `useModal`, the template hooks, `ModalOutlet`, the manager hooks.
 * - `umbra/solid` — the same surface for Solid, plus `fromStore`.
 * - `umbra/vanilla` — `bindDialog`, a controller over a `<dialog>` you wrote yourself. No
 *   framework at all.
 *
 * A fourth (Vue, a web component) is the same shape: subscribe to a store, render a `<dialog>`,
 * register it with the manager. Nothing in this module needs to change to support one.
 *
 * A caller with no renderer at all — a service, an API client, a router guard, a worker, an SSR
 * path — imports straight from here. That freedom is enforced by
 * `src/__tests__/entry-isolation.test.ts`, which walks this module's real import graph. It is
 * not a comment to be trusted; it is a test.
 */

// ── The manager ──────────────────────────────────────────────────────────────

export {
  MODAL_CLOSE_EVENT,
  MODAL_OPEN_EVENT,
  createDialogManager,
  createOpenRequest,
  dialogManager,
} from './manager/dialog-manager.js';
export { setLogLevel } from './utils/logger.js';

export type {
  DialogManager,
  DialogManagerEvent,
  DialogManagerSubscriber,
  ModalCloseEventDetail,
  ModalOpenEventDetail,
  OpenRequest,
  OpenRequestContext,
  OpenRequestDispatch,
  OpenRequestHandler,
  OpenRequestOutcome,
  RegisterOptions,
} from './manager/dialog-manager.js';

export type {
  ModalInfo,
  ModalLookup,
  RegisteredModalInfo,
  UnregisteredModalInfo,
} from './manager/types.js';

// The vocabulary the manager's own public surface speaks: `ModalInfo.phase` is a `ModalPhase`,
// and the store port a `DialogManager` registers reports a `ModalStoreSnapshot`, whose
// `closeResult` is a `CloseResult`. A root consumer that can name `ModalInfo` but not
// `ModalPhase` cannot write the annotation the type it was handed requires.
//
// The hook-shaped types next to them (`ModalHandle`, `UseModalOptions`, `UseModalReturn`) stay
// on `./react`: they describe rendering a dialog, which is what a binding does. Nothing here
// can hand you one.
export type { CloseResult, ModalPhase, ModalStoreSnapshot } from './core/types.js';

// Placement is the one piece of a binding's rendering job that is not framework work: it is a
// table of CSS, and getting it wrong is what makes an inline non-modal dialog jump. Shipping it
// from the root means the React binding, a future one, and a host written by hand all position
// a dialog identically — see `core/placement.ts`.
export { dialogPlacement } from './core/placement.js';
export type {
  DialogHostStyle,
  DialogPlacement,
  DialogPlacementOptions,
  DialogPositionStyle,
} from './core/placement.js';

// The style vocabulary those tables are written in, and the one way to write one onto an element.
// A binding that owns its DOM node — Solid's does, and so does a hand-written connector — has no
// renderer to hand a style object to, so `applyStyle` is the other half of `dialogPlacement`
// being data: here is the table, and here is how it is applied.
export { applyStyle } from './core/style.js';
export type { DialogStyle } from './core/style.js';

// ── State ────────────────────────────────────────────────────────────────────
//
// The reactive cell the library actually runs on: the modal store, the action engine, the
// outlet and the manager are all built on it. The rule is **export what the library runs on and
// would otherwise be duplicated; do not export what it does not use** — keeping this private
// would force a second copy of the same file into the playground, which is worse than the name
// it saves.
//
// `StoreContract` is the `{ subscribe, getSnapshot }` pair every store satisfies, and precisely
// what `useSyncExternalStore` — and Solid's `from`, and a Vue `ref` bridge — consume, so reading
// a store needs no helper from us.
//
// What is *not* here is everything built over it. `useStore`, `createStoreContext`, `watch` and
// `shallowEqual` had no caller inside the library, and a dialog manager is not where anyone
// looks for state management — least of all when the same author ships `stardust` for exactly
// that. They live in the playground now, as patterns to copy.

export { createStore } from './store/create-store.js';
export type {
  CreateStoreOptions,
  GenericStore,
  Store,
  StoreApi,
  StoreContract,
} from './store/create-store.js';

// ── Errors ───────────────────────────────────────────────────────────────────
//
// The one general-purpose helper the library itself needs: it turns whatever an action handler
// throws into the `Error` the modal reports on `error`. It ships because a caller composing its
// own handler wants that same normalisation.
//
// Async coordination — a mutex, single-flight, a fetch-state machine — is user-land, and lives
// in the playground as reference code to copy, on the same terms as the modal templates. A
// dialog manager is not where anyone would look for a mutex.

export { normalizeError } from './utils/normalize-error.js';

// ── Keys ─────────────────────────────────────────────────────────────────────

export { formatHotkeyLabel, matchesHotkey } from './utils/hotkey-utils.js';
export { Key } from './utils/keys.js';
export type { KeyValue } from './utils/keys.js';
