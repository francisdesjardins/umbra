/**
 * The one stylesheet the library ships, and the roots it has to be adopted into.
 *
 * Two rules and a rule about where they live. `document.adoptedStyleSheets` does **not** cross a
 * shadow boundary, so a `<dialog>` inside a web component was getting the UA's own backdrop —
 * measured at `rgba(0, 0, 0, 0.1)` against this sheet's `rgba(0, 0, 0, 0.7)` — while
 * `--dialog-backdrop` was documented as settable "anywhere above the dialog". Custom properties
 * do inherit through a shadow root; the rule that reads one does not follow.
 *
 * So the sheet is adopted per **root**: the document, plus the shadow root of any dialog that
 * lives in one. One `CSSStyleSheet` shared by all of them — a constructed sheet may be adopted by
 * a document and by its shadow roots at once, and adopting the same object twice is what the
 * `WeakSet` below prevents.
 *
 * The body-lock rule rides along and is simply inert inside a shadow root: `body[…]` matches
 * nothing there. Splitting the sheet to avoid one dead selector would cost a second object and a
 * second adoption for no behaviour.
 */

/**
 * Attribute the lock sets on `<body>`, and the hook the `overflow: hidden` rule keys off.
 *
 * Declared here rather than beside `lockBodyScroll` because the rule that reads it is here: the
 * selector and the `setAttribute` have to agree, and a constant they both import is what makes
 * that structural instead of remembered.
 */
export const BODY_LOCK_ATTR = 'data-dialog-open';

let sheet: CSSStyleSheet | null = null;
/** Roots that have already adopted it — weak, so a detached shadow root is collectable. */
const adopted = new WeakSet<Document | ShadowRoot>();

function build(): CSSStyleSheet {
  const built = new CSSStyleSheet();
  // Only the overflow rule lives here: the scrollbar compensation is an inline style set by
  // `lockBodyScroll()`, measured at lock time against the page's own padding, which CSS cannot
  // express. The backdrop is a custom property so overriding it is a declaration rather than a
  // specificity fight.
  built.replaceSync(`
    body[${BODY_LOCK_ATTR}] {
      overflow: hidden;
    }
    dialog::backdrop {
      background: var(--dialog-backdrop, rgba(0, 0, 0, 0.7));
    }
  `);
  return built;
}

/**
 * Adopt the library's stylesheet into `root`, once.
 *
 * Idempotent per root and safe to call on every open, which is what lets the DOM layer call it
 * from `showDialog` without knowing whether this dialog's tree has been seen before.
 */
export function ensureDialogStyles(root: Document | ShadowRoot): void {
  if (adopted.has(root)) {
    return;
  }
  sheet ??= build();
  root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
  adopted.add(root);
}

/**
 * The root a dialog's styles have to be adopted into: its shadow root, or the document.
 *
 * `getRootNode()` is the whole of the question — it answers `Document` for an ordinary dialog and
 * the `ShadowRoot` for one inside a component. Anything else (a detached fragment) has nothing to
 * adopt into and is left alone.
 */
export function styleRootOf(element: Element): Document | ShadowRoot | null {
  const root = element.getRootNode();
  return root instanceof ShadowRoot || root instanceof Document ? root : null;
}
