import { useState } from 'react';
import { useDialog } from '../../react.js';

/**
 * Three stops in a panel. `containFocus` is a prop so the same stops walk out when off and wrap
 * when on; the outside button sits *before* the panel so a forward Tab has a destination —
 * otherwise "left the dialog" and "left the page" look the same to `document.activeElement`.
 */
export function FocusContainmentHarness({
  containFocus,
  nonModal = true,
}: {
  readonly containFocus: boolean;
  readonly nonModal?: boolean;
}) {
  const modal = useDialog({
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
 * A roving-tabindex toolbar — one stop, arrow keys inside — which no harness of ordinary buttons
 * can show: `button:not([disabled])` collects all three while the browser stops on one, and they
 * land *after* the real last stop, so "the last one" never matches and the wrap never fires.
 */
export function RovingToolbarHarness() {
  const modal = useDialog({
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
          {/* What bare `checkVisibility()` waves through: a `visibility: hidden` wrapper with a
              `tabindex`, last — a hidden file input in a visible layout is exactly this. */}
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
 * A dialog ending in an `<iframe>`: a press inside one reaches no listener in the parent, so a
 * `keydown` approach cannot see the Tab that leaves it — but the browser walks onto a marker.
 */
export function FramedContentHarness() {
  const modal = useDialog({
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
 * A panel whose middle stop can be hidden. `display: none` rather than `disabled`, because the
 * selector already excludes a disabled control and would pass without consulting visibility.
 */
export function HiddenStopHarness() {
  const [hideMiddle, setHideMiddle] = useState(false);

  const modal = useDialog({
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
 * A panel ending in a `contenteditable` editor — a Tab stop with no `tabindex`, `href` or control
 * tag, so a scan of those never proposes it and the wrap hands focus back where it started.
 */
export function EditableContentHarness() {
  const modal = useDialog({
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
 * Only a `contenteditable` inside: the Tab recovery has nothing to move to, and WebKit does not
 * descend from a focused `<dialog>`, so the keyboard is stuck. No `containFocus`, deliberately —
 * the recovery is the unconditional half and must not need the flag.
 */
export function EditableOnlyHarness() {
  const modal = useDialog({
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
 * A modal with a **non-modal panel opened inside it**, where the recovery's scan can meet a dialog
 * that is not its own: `focusFirstAvailable` walks a plain `querySelectorAll` where every other
 * `focus-policy.ts` lookup uses `queryOwn`. Non-modal so the dead-space click can be made at all,
 * and only `Shift+Tab` discriminates — it scans from the end, where the nested button sits.
 */
export function NestedPanelScanHarness() {
  const panel = useDialog({
    id: 'nested-scan-panel',
    nonModal: true,
    ariaLabel: 'Panel inside the modal',
    // Sized so it overlays the top of the region and leaves the dead space below it clickable —
    // a full-region panel would swallow the click that puts focus on the `<dialog>` element.
    style: { width: '120px', height: '90px' },
    render: () => {
      return (
        <button data-testid="nested-panel-button" type="button">
          Panel stop
        </button>
      );
    },
  });

  const outer = useDialog({
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
