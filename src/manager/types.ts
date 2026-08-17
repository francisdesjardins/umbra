import type { ModalPhase } from '../core/types.js';

/** The state every `ModalInfo` reports, registered or not. */
type ModalInfoBase = {
  /** The modal identifier. */
  readonly id: string;
  /** Current lifecycle phase. `'closed'` for unregistered modals. */
  readonly phase: ModalPhase;
  /**
   * Whether the dialog is on screen (`phase !== 'closed'`) — true through the exit animation too.
   * `phase` is the finer answer; this is the one an observer usually wants.
   */
  readonly isVisible: boolean;
  /**
   * Whether the modal's `prepare` is still running — on screen, content not ready; `false` for
   * unregistered modals. The second axis, and usually what an observer is really asking: `phase`
   * reaches `'open'` on the frame after the `<dialog>` is shown however long preparing takes, so a
   * dialog that loads something sits at `phase: 'open'` with `isPreparing: true` for the duration.
   */
  readonly isPreparing: boolean;
  /**
   * Whether this is the dialog in front — and so the one that answers the dismiss key and owns a
   * click outside. `false` for every non-modal dialog while any modal one is open.
   */
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
   * Which template built it, as its creator named it at registration — any string, never
   * interpreted by the library. It lets a cross-cutting listener (analytics, a handler that only
   * cares about drawers) tell one kind of dialog from another without its own id-to-kind table, and
   * lets a `prioritize` policy order by kind. `useModal` defaults to `'modal'`, `useSlideModal`
   * reports `'slide'`, and a template you write should name itself too. Distinct from `nonModal`
   * below, which reaches the DOM as `data-modal-type`: one word for both would contradict itself,
   * a `nonModal` dialog naming no template defaulting to `'modal'`.
   */
  readonly template: string;
  /** Whether the modal uses `dialog.show()` instead of `dialog.showModal()`. */
  readonly nonModal: boolean;
};

/**
 * The null-object answer for an id nobody registered: enough to ask the usual questions
 * (`isVisible`, `phase`) without an optional-chaining dance, and nothing that would be a lie.
 */
export type UnregisteredModalInfo = ModalInfoBase & {
  /** The discriminant: no modal is registered under this id. */
  readonly exists: false;
};

/**
 * Rich snapshot of a modal's state at query time, discriminated by `exists` — always returned by
 * `lookup(id)`, never `undefined`. Reading `template` or `nonModal` requires narrowing on `exists`
 * first, which is the point. Queries that can only return registered modals are typed
 * {@link RegisteredModalInfo} and need no narrowing at all.
 */
export type ModalInfo = RegisteredModalInfo | UnregisteredModalInfo;

/**
 * Collection-level query API returned by `dialogManager.lookup()`. Every method reads live state at
 * call time (imperative, not reactive); counts and existence checks derive from the returned arrays
 * — `getOpen().length`, `getOpen('modal').length > 0`, `getClosed().length`.
 */
export type ModalLookup = {
  /** Get modal info by id. Returns null-object default for unregistered ids. */
  get(id: string): ModalInfo;
  /** Check if a modal is registered. */
  exists(id: string): boolean;
  /**
   * Get the open dialog in front — the most recently opened **modal** one, or whichever a
   * `dialogManager.prioritize` policy put there. A non-modal dialog is never in front of a modal one.
   */
  getForeground(): RegisteredModalInfo | undefined;
  /**
   * Get currently open modals in stack order, bottom first, so the index is the stack position:
   * non-modal first (the platform's rule, not a policy's), then `dialogManager.prioritize`, then
   * open order. Optionally filtered to `'modal'` (`showModal()`) or `'non-modal'` (`dialog.show()`)
   * — the `nonModal` option's words and `data-modal-type`'s, one distinction with one vocabulary.
   */
  getOpen(filter?: 'modal' | 'non-modal'): RegisteredModalInfo[];

  // ── Per-modal queries ───────────────────────────────────────────────────

  /** Whether a specific dialog is on screen, exit animation included. */
  isVisible(id: string): boolean;
  /** Check if a specific modal is the topmost open modal by id. */
  isForeground(id: string): boolean;

  // ── Registration queries ────────────────────────────────────────────────

  /** Get all registered-but-closed modals. */
  getClosed(): RegisteredModalInfo[];
  /** Get total count of registered modals (open + closed). */
  getRegisteredCount(): number;
};
