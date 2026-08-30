import type { PortalTarget } from './types.js';

// ── Placement ────────────────────────────────────────────────────────────────
//
// Where a dialog is positioned from, as data rather than markup.
//
// `showModal()` promotes a dialog into the top layer and needs no positioning; `show()` does not,
// so a non-modal dialog is positioned like any other element — and *what against* is the whole
// question. One answer here, so every binding agrees.

/**
 * Whether `portal` names a destination at all.
 *
 * Read the way {@link PortalTarget} defines it and nowhere else: `true` means `document.body` and a
 * function names its own host, so **both portal** — only `false`, or nothing, leaves the dialog
 * where it was declared. Its own function because two readers have to agree, and a shorthand that
 * happens to be right for the boolean (`portal !== true`) silently calls a host getter *inline*.
 *
 * @internal
 */
export function namesAPortal(portal: PortalTarget | undefined): boolean {
  return portal !== undefined && portal !== false;
}

/**
 * Whether these options describe the **contained** arrangement: non-modal, and rendered where it
 * was declared rather than portaled anywhere.
 *
 * The answer decides two things that must agree — the placement the runtime resolves, and the
 * geometry a slide template writes onto the element — so it is asked once.
 *
 * @internal
 */
export function isContainedArrangement(options: {
  readonly nonModal?: boolean | undefined;
  readonly portal?: PortalTarget | undefined;
}): boolean {
  return options.nonModal === true && !namesAPortal(options.portal);
}

/**
 * Styles for the element a contained dialog is positioned against.
 *
 * Spelled out property by property rather than typed as a general style object, because it is a
 * fixed answer and not a free-form one — and because a literal type is assignable to *every*
 * binding's style type, which a general one is not. Read the reasoning on
 * {@link dialogPlacement}.
 */
export type DialogHostStyle = {
  readonly position: 'absolute';
  readonly inset: 0;
  readonly minHeight: 0;
  readonly pointerEvents: 'none';
  readonly overflow?: 'clip' | undefined;
};

/** Positioning styles for the `<dialog>` itself — empty for a top-layer (dialog) dialog. */
export type DialogPositionStyle = {
  readonly position?: 'fixed' | 'absolute' | undefined;
  readonly inset?: 0 | undefined;
  readonly pointerEvents?: 'auto' | undefined;
};

/**
 * Styles for a scrim a non-modal dialog draws itself — `null` for a modal one, which has the
 * browser's `::backdrop`.
 *
 * No `zIndex`: the stacking position is the manager's answer (`getZIndex(id)`), not the
 * placement's, and a table that guessed one would be wrong the moment two dialogs are open.
 */
export type DialogBackdropStyle = {
  readonly position: 'fixed' | 'absolute';
  readonly inset: 0;
  readonly background: string;
};

/** The three elements a placement has an opinion about. */
export type DialogPlacement = {
  /**
   * Styles for the element the dialog is positioned against, or `null` when there is nothing
   * to host — a top-layer dialog and a viewport-anchored one answer to the viewport.
   *
   * When this is non-null the dialog **must** be rendered inside an element carrying these
   * styles, and that element must have a size: the dialog fills it.
   */
  readonly host: DialogHostStyle | null;
  /** Positioning styles for the `<dialog>` itself. */
  readonly dialog: DialogPositionStyle;
  /**
   * Styles for a scrim, when this dialog is one that has to draw its own — `null` otherwise.
   *
   * **Why the library has an opinion at all, having none about UI.** `show()` gets no
   * `::backdrop`, so a non-modal dialog that wants to block what is behind it has to put an
   * element there. That element is not decoration: it decides whether the page underneath is
   * clickable, and it has to sit in the same coordinate space as the dialog — `fixed` beside a
   * viewport-anchored one, `absolute` inside the host of a contained one. Getting that pair wrong
   * is a scrim that scrolls away from its dialog or covers the wrong region, and every binding
   * would derive it identically.
   *
   * So this is the geometry, not the element: nothing is rendered here, and the caller supplies
   * the `z-index` and whatever the scrim should do when clicked. The colour reads the same
   * `--dialog-backdrop` the native one does, so a non-modal panel and a modal dialog in the same
   * theme are the same shade without anyone restating it.
   */
  readonly backdrop: DialogBackdropStyle | null;
};

export type DialogPlacementOptions = {
  /** `dialog.show()` rather than `showModal()` — no backdrop, no top layer. */
  readonly nonModal?: boolean | undefined;
  /** Rendered into `document.body` rather than inline in the tree. */
  readonly portal?: boolean | undefined;
  /**
   * Clip the host, for a dialog whose animation slides it past the host's edge. Without it a
   * positive translate (right/bottom) grows the document's scrollable area and shifts the
   * layout by the same amount, which cancels the slide.
   */
  readonly clip?: boolean | undefined;
};

const CONTAINED_HOST: DialogHostStyle = {
  // Absolute, not a block in the flow: a contained dialog covers something already in its
  // region, and a `height: 100%` block is laid out *after* that content, pushing it out of a
  // clipped region the moment the dialog mounts. Overlaying is what "contained" means.
  position: 'absolute',
  inset: 0,
  minHeight: 0,
  // The host exists to be a containing block and nothing else. Without this it is also an
  // invisible hit target the size of its region, so everything behind it stops being clickable
  // the moment a contained dialog mounts, open or not. The dialog takes its own hits back below.
  pointerEvents: 'none',
};

/**
 * The same colour the native `::backdrop` reads, so the two cannot drift.
 *
 * A theme that sets `--dialog-backdrop` moves both; the fallback is the library's own default,
 * repeated here rather than imported because `dialog-styles.ts` writes CSS text and this is a
 * style object — one string in two shapes is cheaper than making a stylesheet module a dependency
 * of a pure table.
 */
const BACKDROP_COLOUR = 'var(--dialog-backdrop, rgba(0, 0, 0, 0.7))';

const VIEWPORT_BACKDROP: DialogBackdropStyle = {
  position: 'fixed',
  inset: 0,
  background: BACKDROP_COLOUR,
};

const CONTAINED_BACKDROP: DialogBackdropStyle = {
  position: 'absolute',
  inset: 0,
  background: BACKDROP_COLOUR,
};

/**
 * The positioning contract for one dialog variant.
 *
 * Three cases, and the reason each exists:
 *
 * - **dialog** — `showModal()` puts the dialog in the top layer, above everything and anchored
 *   to the viewport whatever its ancestors do. No host, no positioning.
 * - **non-modal, portaled** — rendered into `document.body`, so `fixed` anchors it to the
 *   viewport. Use for edge-anchored or centred panels that float over the page.
 * - **non-modal, contained** — rendered inline, so `fixed` would resolve against the nearest
 *   transformed or `will-change` ancestor instead of the viewport, and the dialog jumps when
 *   some parent animates. `absolute` against a host the library owns is immune to that: the
 *   closest positioned ancestor always wins. The cost is that the host must be sized, since
 *   the dialog fills it.
 *
 * @example
 * // A userland host for a contained slide panel — the same contract the React binding uses.
 * const { host, dialog } = dialogPlacement({ nonModal: true, clip: true });
 * Object.assign(panelRegion.style, host);
 * Object.assign(dialogElement.style, dialog);
 */
export function dialogPlacement(options: DialogPlacementOptions = {}): DialogPlacement {
  const { nonModal = false, portal = false, clip = false } = options;

  if (!nonModal) {
    // The browser draws this one's backdrop, and it is in the top layer where nothing else can
    // come between it and the page.
    return { host: null, dialog: {}, backdrop: null };
  }

  if (portal) {
    return {
      host: null,
      dialog: { position: 'fixed', inset: 0 },
      backdrop: VIEWPORT_BACKDROP,
    };
  }

  return {
    host: clip ? { ...CONTAINED_HOST, overflow: 'clip' } : CONTAINED_HOST,
    // `pointerEvents: 'auto'` undoes the host's `none` for the dialog itself, so the panel is
    // interactive while the region around it stays as clickable as it was before.
    dialog: { position: 'absolute', inset: 0, pointerEvents: 'auto' },
    // Absolute like the dialog it sits under, so it covers the host's region and no more — the
    // point of a contained dialog is that it answers to that region rather than to the viewport.
    backdrop: CONTAINED_BACKDROP,
  };
}
