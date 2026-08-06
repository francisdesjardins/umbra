import type { ModalPhase } from '../core/types.js';

/** The state every `ModalInfo` reports, registered or not. */
type ModalInfoBase = {
  /** The modal identifier. */
  readonly id: string;
  /** Current lifecycle phase. `'closed'` for unregistered modals. */
  readonly phase: ModalPhase;
  /** Whether the modal is currently open (`phase !== 'closed'`). */
  readonly isOpen: boolean;
  /**
   * Whether the modal's `onOpen` is still running — it is on screen, its content is not ready.
   * `false` for unregistered modals.
   *
   * The second axis, and the one an observer usually wants. `phase` describes the `<dialog>`
   * element and reaches `'open'` on the animation frame after it is shown, so `'opening'` lasts
   * a single frame no matter how long the modal takes to prepare — asking `phase` "is it ready
   * yet" always answers yes. A dialog that loads something sits at `phase: 'open'` with
   * `isPreparing: true` for as long as the load takes, and that is the state a watcher elsewhere
   * in the app is really asking about.
   */
  readonly isPreparing: boolean;
  /** Whether this is the topmost open modal. */
  readonly isForeground: boolean;
  /** Timestamp when the modal entered the opening phase. `0` for unregistered or never-opened. */
  readonly openedAt: number;
};

/**
 * A modal the manager knows about. Registration-time facts are plain, always-present fields
 * here — they cannot be absent, because the modal registered them.
 */
export type RegisteredModalInfo = ModalInfoBase & {
  /** The discriminant: this modal is registered. */
  readonly exists: true;
  /**
   * The label its creator gave it, set at registration.
   *
   * Any string, and purely informational — nothing in the library reads it. It exists so an
   * application can tell one kind of dialog from another across a cross-cutting listener
   * (analytics, a handler that only cares about drawers) without keeping its own id-to-kind
   * table. `useModal` defaults to `'modal'`, `useSlideModal` reports `'slide'`, and a template
   * you write should name itself too.
   */
  readonly modalType: string;
  /** Whether the modal uses `dialog.show()` instead of `dialog.showModal()`. */
  readonly nonModal: boolean;
};

/**
 * The null-object answer for an id nobody registered: enough to ask the usual questions
 * (`isOpen`, `phase`) without an optional-chaining dance, and nothing that would be a lie.
 */
export type UnregisteredModalInfo = ModalInfoBase & {
  /** The discriminant: no modal is registered under this id. */
  readonly exists: false;
};

/**
 * Rich snapshot of a modal's state at query time, discriminated by `exists`.
 *
 * Always returned by `lookup(id)` — never `undefined`. Reading `modalType` or `nonModal` off
 * one requires narrowing with `exists` first, which is the point: those are registration-time
 * facts and an unregistered modal has none. Queries that can only ever return registered
 * modals (`getOpen`, `getClosed`, `getForeground`, `openDialogs`) are typed
 * {@link RegisteredModalInfo} and need no narrowing at all.
 */
export type ModalInfo = RegisteredModalInfo | UnregisteredModalInfo;

/**
 * Collection-level query API returned by `dialogManager.lookup()`.
 *
 * All methods read live state at call time (imperative, not reactive).
 * Counts and existence checks are derivable from the returned arrays:
 * `getOpen().length`, `getOpen('blocking').length > 0`, `getClosed().length`.
 */
export type ModalLookup = {
  /** Get modal info by id. Returns null-object default for unregistered ids. */
  get(id: string): ModalInfo;
  /** Check if a modal is registered. */
  exists(id: string): boolean;
  /** Get the topmost (most recently opened) open modal, or `undefined` if none are open. */
  getForeground(): RegisteredModalInfo | undefined;
  /**
   * Get currently open modals in open order, bottom of the stack first — so the index is the
   * stack position. Optionally filter to `'blocking'` (`showModal()`) or `'non-blocking'`
   * (`dialog.show()`) dialogs.
   */
  getOpen(filter?: 'blocking' | 'non-blocking'): RegisteredModalInfo[];

  // ── Per-modal queries ───────────────────────────────────────────────────

  /** Check if a specific modal is currently open by id. */
  isOpen(id: string): boolean;
  /** Check if a specific modal is the topmost open modal by id. */
  isForeground(id: string): boolean;

  // ── Registration queries ────────────────────────────────────────────────

  /** Get all registered-but-closed modals. */
  getClosed(): RegisteredModalInfo[];
  /** Get total count of registered modals (open + closed). */
  getRegisteredCount(): number;
};
