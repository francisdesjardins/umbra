import { useState } from 'react';
import { useModal } from '../../react.js';

/**
 * A non-modal panel with three stops, and a button outside it to tab into.
 *
 * `containFocus` is what is under test, so it is a prop of the harness rather than a constant: the
 * same three stops have to walk out when it is off and wrap when it is on, or the test is measuring
 * something else.
 *
 * The outside button sits *before* the panel in document order so a forward Tab from the last stop
 * has somewhere to go that is not the address bar — otherwise "focus left the dialog" and "focus
 * left the page" look the same to `document.activeElement`.
 */
export function FocusContainmentHarness({
  containFocus,
  nonModal = true,
}: {
  readonly containFocus: boolean;
  readonly nonModal?: boolean;
}) {
  const modal = useModal({
    id: 'focus-containment',
    ...(nonModal ? { nonModal: true as const } : { nonModal: false as const }),
    containFocus,
    ariaLabel: 'Contained panel',
    render: () => {
      return (
        <>
          <button data-testid="inside-first" type="button">
            First
          </button>
          <button data-testid="inside-middle" type="button">
            Middle
          </button>
          <button data-testid="inside-last" type="button">
            Last
          </button>
          {/* The empty half of a panel — a footer's leftover space, a paragraph, the area below
              the last button. Nothing here is focusable, which is the point: clicking it is the
              ordinary way a user puts focus nowhere. */}
          <p data-testid="dead-space" style={{ height: 80 }}>
            Nothing to focus here.
          </p>
        </>
      );
    },
  });

  return (
    <>
      <button data-testid="outside" type="button">
        Outside
      </button>
      <button
        data-testid="open"
        onClick={() => {
          void modal.open();
        }}
        type="button"
      >
        Open
      </button>
      {modal.Modal}
    </>
  );
}

/**
 * A dialog holding a toolbar built the way toolbars are built: one tab stop, arrow keys inside.
 *
 * This is the shape that defeated the first implementation, and no harness made of ordinary
 * buttons can show it. A *roving tabindex* toolbar gives one button `tabindex="0"` and every other
 * `tabindex="-1"`, so a selector that matches `button:not([disabled])` collects them all while the
 * browser stops on one. The extras land *after* the dialog's real last stop in document order,
 * which is what makes the comparison against "the last one" answer never — the wrap does not fire
 * and the keyboard walks out, with the containment looking present the whole time.
 */
export function RovingToolbarHarness() {
  const modal = useModal({
    id: 'focus-containment-toolbar',
    nonModal: true,
    containFocus: true,
    ariaLabel: 'Panel with a toolbar',
    render: () => {
      return (
        <>
          <button data-testid="inside-first" type="button">
            First
          </button>
          <button data-testid="inside-last" type="button">
            Last
          </button>
          {/* After the real last stop, and none of it tabbable. */}
          <div aria-label="Formatting" role="toolbar">
            <button data-testid="tool-bold" tabIndex={-1} type="button">
              B
            </button>
            <button data-testid="tool-italic" tabIndex={-1} type="button">
              I
            </button>
            <button data-testid="tool-underline" tabIndex={-1} type="button">
              U
            </button>
          </div>
          {/* The other shape that is not a stop, and the one bare `checkVisibility()` waves
              through: a wrapper hidden with `visibility`, carrying a `tabindex` and sitting last.
              A hidden file input inside a visible layout is exactly this. */}
          <div
            data-testid="hidden-wrapper"
            role="presentation"
            style={{ visibility: 'hidden' }}
            tabIndex={0}
          >
            <input data-testid="hidden-file" type="file" />
          </div>
        </>
      );
    },
  });

  return (
    <>
      <button data-testid="outside" type="button">
        Outside
      </button>
      <button
        data-testid="open"
        onClick={() => {
          void modal.open();
        }}
        type="button"
      >
        Open
      </button>
      {modal.Modal}
    </>
  );
}

/**
 * A dialog whose last thing inside is a separate document.
 *
 * An editor is an `<iframe>`, and a press made inside one is invisible to every listener in the
 * parent: a `keydown` approach cannot see the Tab that takes focus out of it. A marker does not
 * need to — the browser walks out of the frame and lands on it.
 */
export function FramedContentHarness() {
  const modal = useModal({
    id: 'focus-containment-frame',
    nonModal: true,
    containFocus: true,
    ariaLabel: 'Panel with a frame',
    render: () => {
      return (
        <>
          <button data-testid="inside-first" type="button">
            First
          </button>
          <iframe
            data-testid="editor"
            srcDoc="<!doctype html><button autofocus>In the frame</button>"
            title="Editor"
          />
        </>
      );
    },
  });

  return (
    <>
      <button data-testid="outside" type="button">
        Outside
      </button>
      <button
        data-testid="open"
        onClick={() => {
          void modal.open();
        }}
        type="button"
      >
        Open
      </button>
      {modal.Modal}
    </>
  );
}

/**
 * A panel whose middle stop can be hidden, to check what counts as a destination.
 *
 * The hidden one is `display: none` rather than `disabled`, because the selector already excludes
 * a disabled control and would pass this test without ever consulting visibility.
 */
export function HiddenStopHarness() {
  const [hideMiddle, setHideMiddle] = useState(false);

  const modal = useModal({
    id: 'focus-containment-hidden',
    nonModal: true,
    containFocus: true,
    ariaLabel: 'Panel with a hidden stop',
    render: () => {
      return (
        <>
          <button data-testid="inside-first" type="button">
            First
          </button>
          <button
            data-testid="inside-middle"
            style={hideMiddle ? { display: 'none' } : undefined}
            type="button"
          >
            Middle
          </button>
          <button data-testid="inside-last" type="button">
            Last
          </button>
        </>
      );
    },
  });

  return (
    <>
      <button
        data-testid="hide-middle"
        onClick={() => {
          setHideMiddle(true);
        }}
        type="button"
      >
        Hide the middle
      </button>
      <button
        data-testid="open"
        onClick={() => {
          void modal.open();
        }}
        type="button"
      >
        Open
      </button>
      {modal.Modal}
    </>
  );
}

/**
 * A panel whose far end is a `contenteditable` editor — a stop no form-control selector names.
 *
 * An editable region is a Tab stop the browser walks to without `tabindex`, `href` or a control
 * tag, so a scan built from those alone never proposes it: the wrap from the first stop had
 * nowhere to land and handed focus straight back to where it started, with the containment
 * looking present the whole time.
 */
export function EditableContentHarness() {
  const modal = useModal({
    id: 'focus-containment-editable',
    nonModal: true,
    containFocus: true,
    ariaLabel: 'Panel with an editor',
    render: () => {
      return (
        <>
          <button data-testid="inside-first" type="button">
            First
          </button>
          <div
            contentEditable
            data-testid="editor-surface"
            style={{ minHeight: 40 }}
            suppressContentEditableWarning
          >
            Type here
          </div>
        </>
      );
    },
  });

  return (
    <>
      <button data-testid="outside" type="button">
        Outside
      </button>
      <button
        data-testid="open"
        onClick={() => {
          void modal.open();
        }}
        type="button"
      >
        Open
      </button>
      {modal.Modal}
    </>
  );
}

/**
 * A dialog whose **only** focusable content is a `contenteditable` editor.
 *
 * The worst case of the same miss: with nothing else for the scan to find, the unconditional Tab
 * recovery had nothing to move to — on WebKit, which does not descend from a focused `<dialog>`
 * element on its own, that is a keyboard stuck on the element with only the mouse to free it. No
 * `containFocus`, deliberately: the recovery is the unconditional half and must not need the flag.
 */
export function EditableOnlyHarness() {
  const modal = useModal({
    id: 'focus-containment-editable-only',
    nonModal: true,
    ariaLabel: 'Editor panel',
    render: () => {
      return (
        <>
          <div
            contentEditable
            data-testid="editor-surface"
            style={{ minHeight: 40 }}
            suppressContentEditableWarning
          >
            Type here
          </div>
          <p data-testid="dead-space" style={{ height: 80 }}>
            Nothing to focus here.
          </p>
        </>
      );
    },
  });

  return (
    <>
      <button
        data-testid="open"
        onClick={() => {
          void modal.open();
        }}
        type="button"
      >
        Open
      </button>
      {modal.Modal}
    </>
  );
}

/**
 * A modal with a **non-modal panel opened inside it**, which is where the Tab recovery's scan can
 * meet a dialog that is not its own.
 *
 * `focusFirstAvailable` walks `dialog.querySelectorAll(FOCUSABLE)` — every other lookup in
 * `focus-policy.ts` goes through `queryOwn`, which drops elements belonging to a dialog nested
 * inside this one. Nesting is the documented shape here, not an exotic one: a modal owns the top
 * layer, so the only way to open a second dialog is from inside the first one's `render`, and its
 * element lands in this subtree.
 *
 * **The panel is non-modal deliberately, and so is the direction the test presses.** A nested
 * *modal* panel would put the top layer over this dialog's dead space, so the click that starts the
 * whole thing could not be made. And a forward Tab is answered correctly by accident — the outer
 * dialog's own button is first in document order either way. Only `Shift+Tab`, which scans from the
 * end, can tell "this dialog's last stop" from "the last stop anywhere underneath it".
 */
export function NestedPanelScanHarness() {
  const panel = useModal({
    id: 'nested-scan-panel',
    nonModal: true,
    ariaLabel: 'Panel inside the modal',
    // Sized and contained, so it overlays the top of the modal's region and leaves the dead space
    // below it clickable — the click is what puts focus on the `<dialog>` element in the first
    // place, and a full-region panel would swallow it.
    style: { width: '120px', height: '90px' },
    render: () => {
      return (
        <button data-testid="nested-panel-button" type="button">
          Panel stop
        </button>
      );
    },
  });

  const outer = useModal({
    id: 'nested-scan-outer',
    ariaLabel: 'Outer modal',
    style: { width: '420px', height: '420px' },
    render: () => {
      return (
        <>
          <button data-testid="outer-first" type="button">
            Outer first
          </button>
          <button
            data-testid="outer-open-panel"
            onClick={() => {
              void panel.open();
            }}
            type="button"
          >
            Open the panel inside
          </button>
          <button data-testid="outer-last" type="button">
            Outer last
          </button>
          <p data-testid="outer-dead-space" style={{ height: 260 }}>
            Nothing to focus here.
          </p>
          {/* After the outer's own stops in document order, which is what makes the reversed scan
              reach it first. */}
          {panel.Modal}
        </>
      );
    },
  });

  return (
    <>
      <button
        data-testid="open-outer"
        onClick={() => {
          void outer.open();
        }}
        type="button"
      >
        Open
      </button>
      {outer.Modal}
    </>
  );
}
