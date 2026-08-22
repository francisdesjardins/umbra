import { ExampleLayout } from '@/entities/example';
import * as SlideModal from '@/entities/modal-template/ui/vanilla/slide-modal';
import * as Shared from '@/entities/modal-template/ui/vanilla/shared';
import { focusRingSpace } from '@/entities/modal-template/ui/shared/tokens';
import { createResultStore } from '@/shared/lib/createResultStore';
import { useAnnouncer } from '@/shared/lib/use-announcer';
import { useStore } from '@/shared/lib/use-store';
import { AppButton } from '@/shared/ui/AppButton';
import styles from '@/pages/slide-modal/examples/slide-presets.module.css';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Key, useSlideModal } from 'umbra/react';

export const DRAWER_ID = 'slide-preset-drawer';
export const SHEET_ID = 'slide-preset-sheet';
export const PALETTE_ID = 'slide-preset-palette';
export const INSPECTOR_ID = 'slide-preset-inspector';

const resultStore = createResultStore();

/**
 * The four slide shapes, one hook each rather than one panel with switches: `direction` and `align`
 * decide animation and placement, so a hook changing direction between opens leaves by one edge and
 * returns by another.
 */

/** Every preset shows its own option block, because the options *are* the lesson. */
function Panel({
  title,
  options,
  children,
}: {
  readonly title: string;
  readonly options: string;
  readonly children?: ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, minWidth: 0 }}>
      <Shared.Heading>{title}</Shared.Heading>
      {children}
      <pre
        style={{
          margin: 0,
          padding: 12,
          borderRadius: 6,
          border: '1px solid var(--slide-border)',
          fontFamily: 'monospace',
          fontSize: '0.75rem',
          overflowX: 'auto',
          color: 'var(--slide-text-secondary, var(--modal-text-secondary))',
        }}
      >
        {options}
      </pre>
    </div>
  );
}

/** Settings drawer: the default shape. Full height, slides from the right, blocks the page. */
function useDrawerPreset() {
  return useSlideModal({
    id: DRAWER_ID,
    direction: 'right',
    ariaLabel: 'Settings drawer',
    render: ({ direction, action }) => {
      return (
        <SlideModal.DefaultLayout direction={direction}>
          <SlideModal.Header>
            <SlideModal.Title>Settings</SlideModal.Title>
          </SlideModal.Header>
          <SlideModal.Content>
            <Panel
              title="Right drawer"
              options={"direction: 'right'\n// align defaults to 'stretch' — full height"}
            >
              <Shared.Message>
                The default: the panel fills the cross axis, so it reads as a drawer attached to the
                edge.
              </Shared.Message>
            </Panel>
          </SlideModal.Content>
          <SlideModal.Footer>
            <Shared.Button variant="primary" {...action('close', { focusOnOpen: true })}>
              Done
            </Shared.Button>
          </SlideModal.Footer>
        </SlideModal.DefaultLayout>
      );
    },
    onClose: (r) => {
      resultStore.setResult(`Drawer closed: ${r.reason}`);
    },
  });
}

/** Bottom sheet: the same hook, one word different. */
function useSheetPreset() {
  return useSlideModal({
    id: SHEET_ID,
    direction: 'bottom',
    ariaLabel: 'Bottom sheet',
    render: ({ direction, action }) => {
      return (
        <SlideModal.DefaultLayout direction={direction}>
          <SlideModal.Content>
            <Panel title="Bottom sheet" options={"direction: 'bottom'"}>
              <Shared.Message>
                Same options as the drawer with one word changed. Sizing is yours — the library
                places the box and never decides how big it is.
              </Shared.Message>
            </Panel>
          </SlideModal.Content>
          <SlideModal.Footer>
            <Shared.Button variant="primary" {...action('close', { focusOnOpen: true })}>
              Done
            </Shared.Button>
          </SlideModal.Footer>
        </SlideModal.DefaultLayout>
      );
    },
    onClose: (r) => {
      resultStore.setResult(`Sheet closed: ${r.reason}`);
    },
  });
}

/** Command palette: drops from the top, pinned to the middle of the cross axis. */
function usePalettePreset() {
  return useSlideModal({
    id: PALETTE_ID,
    direction: 'top',
    align: 'center',
    ariaLabel: 'Command palette',
    render: ({ direction, action }) => {
      return (
        <SlideModal.DefaultLayout direction={direction}>
          <SlideModal.Content>
            <Panel
              title="Command palette"
              options={"direction: 'top'\nalign: 'center'   // content-sized on the cross axis"}
            >
              <Shared.Message>
                A non-stretch <code>align</code> makes the panel content-sized across the slide, so
                it is a floating card rather than a full-width bar.
              </Shared.Message>
            </Panel>
          </SlideModal.Content>
          <SlideModal.Footer>
            {/* Claimed because this palette's overflowing scroll region (`useScrollRegion`) would
                otherwise win the opening focus; the other three match it. */}
            <Shared.Button variant="primary" {...action('close', { focusOnOpen: true })}>
              Close
            </Shared.Button>
          </SlideModal.Footer>
        </SlideModal.DefaultLayout>
      );
    },
    onClose: (r) => {
      resultStore.setResult(`Palette closed: ${r.reason}`);
    },
  });
}

/** The rows the contained inspector slides over — a list is what makes a details pane make sense. */
const ROWS = [
  { id: 'r-1', name: 'Invoice 1043', detail: 'Paid · 3 items · $128.40' },
  { id: 'r-2', name: 'Invoice 1044', detail: 'Pending · 1 item · $19.99' },
  { id: 'r-3', name: 'Invoice 1045', detail: 'Draft · 7 items · $412.00' },
];

/**
 * Contained inspector: non-modal, no portal, over a region of the page — not the shared drawer
 * layout (400px wide, viewport height), since a contained panel is only as big as its host box.
 */
function useInspectorPreset(
  selected: (typeof ROWS)[number] | null,
  onNavigate: (delta: 1 | -1) => void
) {
  return useSlideModal({
    id: INSPECTOR_ID,
    direction: 'right',
    nonModal: true,
    portal: false,
    containFocus: true,
    dismissOnClickOutside: false,
    ariaLabel: 'Row details',
    // A share of the host, not a fixed width: the host is what decides how big this can be.
    style: { width: '62%' },
    // The library leaves arrow keys alone and this handler only sees presses raised inside the
    // panel, so ↑/↓ can browse the host's rows while `containFocus` keeps focus parked on Close.
    // Bare arrows only — a held modifier stays native — and only because nothing in this panel
    // edits text: an input or a role="listbox" inside would need the arrows for itself.
    onKeyDown: (event) => {
      if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) {
        return;
      }
      if (event.key === Key.ArrowDown) {
        event.preventDefault();
        onNavigate(1);
      } else if (event.key === Key.ArrowUp) {
        event.preventDefault();
        onNavigate(-1);
      }
    },
    render: ({ action }) => {
      return (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--slide-bg)',
            color: 'var(--slide-text)',
            fontFamily: 'var(--font-family)',
            borderLeft: '1px solid var(--slide-border)',
            boxShadow: 'var(--modal-shadow)',
          }}
        >
          <div
            style={{
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              padding: 16,
              paddingBottom: 8,
            }}
          >
            <Shared.Heading>{selected?.name ?? 'Details'}</Shared.Heading>
            <Shared.Detail>{selected?.detail ?? '—'}</Shared.Detail>
          </div>

          {/* The prose scrolls; the action bar below does not. A panel this size is a phone's
              worth of room, and `marginTop: auto` pushed Close straight out of the host. */}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 16px' }}>
            <Shared.Hint>
              Slides inside the card, not over the page — and the rows behind it stay clickable,
              because nothing entered the top layer. ↑ and ↓ switch rows while focus stays on Close.
            </Shared.Hint>
          </div>

          <div
            style={{
              flexShrink: 0,
              display: 'flex',
              justifyContent: 'flex-end',
              padding: 12,
              borderTop: '1px solid var(--slide-border)',
            }}
          >
            <Shared.Button {...action('close', { focusOnOpen: true })}>Close</Shared.Button>
          </div>
        </div>
      );
    },
    onClose: (r) => {
      resultStore.setResult(`Inspector closed: ${r.reason}`);
    },
  });
}

/** A rectangle with one edge filled says "it comes from there"; buttons over code read as a bar. */
function ShapeTile({
  label,
  options,
  edge,
  dashed = false,
  onOpen,
}: {
  readonly label: string;
  readonly options: string;
  readonly edge: 'right' | 'bottom' | 'top';
  readonly dashed?: boolean;
  readonly onOpen: () => Promise<void> | void;
}) {
  const band =
    edge === 'right'
      ? { top: 3, right: 3, bottom: 3, width: '34%' }
      : edge === 'bottom'
        ? { left: 3, right: 3, bottom: 3, height: '38%' }
        : { left: '22%', right: '22%', top: 3, height: '38%' };

  return (
    <button
      type="button"
      className={styles['shapeTile']}
      onClick={() => {
        void onOpen();
      }}
    >
      <div
        aria-hidden
        className={dashed ? `${styles['thumb']} ${styles['thumbDashed']}` : styles['thumb']}
      >
        <div className={styles['band']} style={band} />
      </div>
      <span className={styles['tileLabel']}>{label}</span>
      <span className={styles['tileOptions']}>{options}</span>
    </button>
  );
}

export function SlidePresetsExample() {
  const { result } = useStore(resultStore);
  const drawer = useDrawerPreset();
  const sheet = useSheetPreset();
  const palette = usePalettePreset();
  const { announce, region } = useAnnouncer();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const selected = selectedIndex === null ? null : (ROWS[selectedIndex] ?? null);

  const navigate = (delta: 1 | -1) => {
    const next = Math.min(ROWS.length - 1, Math.max(0, (selectedIndex ?? 0) + delta));
    const row = ROWS[next];
    if (row === undefined || next === selectedIndex) {
      return;
    }
    setSelectedIndex(next);
    // Focus never leaves Close, so without this the panel's new content changes silently.
    announce(`${row.name} — ${row.detail}`);
  };

  const inspector = useInspectorPreset(selected, navigate);

  return (
    <ExampleLayout
      result={result}
      modals={
        <>
          {drawer.Modal}
          {sheet.Modal}
          {palette.Modal}
        </>
      }
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--app-space-4)',
          width: '100%',
          minWidth: 0,
        }}
      >
        <div style={{ display: 'flex', gap: 'var(--app-space-3)', flexWrap: 'wrap' }}>
          <ShapeTile
            label="Right drawer"
            options="direction: 'right'"
            edge="right"
            onOpen={drawer.open}
          />
          <ShapeTile
            label="Bottom sheet"
            options="direction: 'bottom'"
            edge="bottom"
            onOpen={sheet.open}
          />
          <ShapeTile
            label="Command palette"
            options="direction: 'top' · align: 'center'"
            edge="top"
            onOpen={palette.open}
          />
          <ShapeTile
            label="Contained panel"
            options="nonModal · portal: false"
            edge="right"
            dashed
            onOpen={async () => {
              setSelectedIndex(0);
              await inspector.open();
            }}
          />
        </div>

        {/* A contained panel is only as big as its host, so the host is a real card with rows. */}
        <div>
          <span
            style={{
              fontSize: 'var(--app-text-xs)',
              lineHeight: 1.66,
              color: 'var(--app-text-secondary)',
            }}
          >
            Contained panel — a details pane inside a card, not an overlay on the page. While it is
            open, ↑ and ↓ move through the rows:
          </span>
          <div
            style={{
              position: 'relative',
              height: 220,
              marginTop: 'var(--app-space-1)',
              // Clips the panel into the card and the row focus rings with it, so both boxes pad.
              overflow: 'hidden',
              paddingBlock: focusRingSpace,
              border: '1px solid var(--app-divider)',
              borderRadius: 'var(--app-radius)',
              background: 'var(--app-paper)',
            }}
          >
            {/* Scroll-into-view parks a tabbed-to button flush against the edge, clipping its ring;
                `scroll-padding` moves that edge inward, and the padding covers the resting case. */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                overflowY: 'auto',
                paddingBlock: focusRingSpace,
                scrollPaddingBlock: focusRingSpace,
              }}
            >
              {ROWS.map((row, index) => {
                return (
                  <div
                    key={row.id}
                    className={
                      selected?.id === row.id
                        ? `${styles['row']} ${styles['rowSelected']}`
                        : styles['row']
                    }
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 'var(--app-text-md)', lineHeight: 1.43 }}>
                        {row.name}
                      </p>
                      <span
                        style={{
                          fontSize: 'var(--app-text-xs)',
                          lineHeight: 1.66,
                          color: 'var(--app-text-secondary)',
                        }}
                      >
                        {row.detail}
                      </span>
                    </div>
                    {/* Still clickable while the panel is open — nothing entered the top layer. */}
                    <AppButton
                      size="small"
                      variant="text"
                      onClick={async () => {
                        setSelectedIndex(index);
                        await inspector.open();
                      }}
                    >
                      Details
                    </AppButton>
                  </div>
                );
              })}
            </div>
            {inspector.Modal}
          </div>
        </div>
        {/* Outside the dialog on purpose — see useAnnouncer for why a region inside `render`
            would announce nothing. */}
        {region}
      </div>
    </ExampleLayout>
  );
}
