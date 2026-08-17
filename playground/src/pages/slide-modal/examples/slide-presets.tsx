import { ExampleLayout } from '@/entities/example';
import * as Shared from '@/entities/modal-template/ui/mui/shared';
import * as SlideModal from '@/entities/modal-template/ui/mui/slide-modal';
import { focusRingSpace } from '@/entities/modal-template/ui/shared/tokens';
import { createResultStore } from '@/shared/lib/createResultStore';
import { useStore } from '@/shared/lib/use-store';
import { Box, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { useSlideModal } from 'umbra/react';

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
    <Stack sx={{ gap: 1.5, p: 2, minWidth: 0 }}>
      <Typography variant="h6">{title}</Typography>
      {children}
      <Box
        component="pre"
        sx={{
          m: 0,
          p: 1.5,
          borderRadius: 1,
          bgcolor: 'action.hover',
          fontFamily: 'monospace',
          fontSize: '0.75rem',
          overflowX: 'auto',
          color: 'text.secondary',
        }}
      >
        {options}
      </Box>
    </Stack>
  );
}

/** Settings drawer: the default shape. Full height, slides from the right, blocks the page. */
function useDrawerPreset() {
  return useSlideModal<void, 'close'>({
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
            <Shared.Button variant="contained" {...action('close', { focusOnOpen: true })}>
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
  return useSlideModal<void, 'close'>({
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
            <Shared.Button variant="contained" {...action('close', { focusOnOpen: true })}>
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
  return useSlideModal<void, 'close'>({
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
            <Shared.Button variant="contained" {...action('close', { focusOnOpen: true })}>
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
function useInspectorPreset(selected: (typeof ROWS)[number] | null) {
  return useSlideModal<void, 'close'>({
    id: INSPECTOR_ID,
    direction: 'right',
    nonModal: true,
    portal: false,
    containFocus: true,
    dismissOnClickOutside: false,
    ariaLabel: 'Row details',
    // A share of the host, not a fixed width: the host is what decides how big this can be.
    style: { width: '62%' },
    render: ({ action }) => {
      return (
        <Stack
          sx={{
            height: '100%',
            width: '100%',
            p: 2,
            gap: 1,
            bgcolor: 'background.paper',
            borderLeft: 1,
            borderColor: 'divider',
            boxShadow: 3,
          }}
        >
          <Typography variant="subtitle2">{selected?.name ?? 'Details'}</Typography>
          <Typography variant="body2" color="text.secondary">
            {selected?.detail ?? '—'}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 'auto' }}>
            Slides inside the card, not over the page — and the rows behind it stay clickable,
            because nothing entered the top layer.
          </Typography>
          <Shared.Button
            size="small"
            variant="outlined"
            {...action('close', { focusOnOpen: true })}
          >
            Close
          </Shared.Button>
        </Stack>
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
    <Stack
      component="button"
      type="button"
      onClick={() => {
        void onOpen();
      }}
      sx={{
        gap: 1,
        p: 1.5,
        // `minWidth: 0` lets the monospace option line wrap instead of setting the tile's floor.
        flex: '1 1 150px',
        minWidth: 0,
        alignItems: 'flex-start',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1.5,
        bgcolor: 'background.paper',
        color: 'text.primary',
        font: 'inherit',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'border-color 120ms, transform 120ms',
        '&:hover': { borderColor: 'primary.main', transform: 'translateY(-1px)' },
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: 'relative',
          width: 58,
          height: 40,
          borderRadius: 1,
          border: dashed ? '1px dashed' : '1px solid',
          borderColor: 'text.disabled',
          bgcolor: 'action.hover',
        }}
      >
        <Box sx={{ position: 'absolute', borderRadius: 0.5, bgcolor: 'primary.main', ...band }} />
      </Box>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontFamily: 'monospace', overflowWrap: 'anywhere' }}
      >
        {options}
      </Typography>
    </Stack>
  );
}

export function SlidePresetsExample() {
  const { result } = useStore(resultStore);
  const drawer = useDrawerPreset();
  const sheet = useSheetPreset();
  const palette = usePalettePreset();
  const [selected, setSelected] = useState<(typeof ROWS)[number] | null>(null);
  const inspector = useInspectorPreset(selected);

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
      <Stack sx={{ gap: 2, width: '100%', minWidth: 0 }}>
        <Stack direction="row" sx={{ gap: 1.5, flexWrap: 'wrap' }}>
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
              setSelected(ROWS[0] ?? null);
              await inspector.open();
            }}
          />
        </Stack>

        {/* A contained panel is only as big as its host, so the host is a real card with rows. */}
        <Box>
          <Typography variant="caption" color="text.secondary">
            Contained panel — a details pane inside a card, not an overlay on the page:
          </Typography>
          <Box
            sx={{
              position: 'relative',
              height: 220,
              mt: 0.5,
              // Clips the panel into the card and the row focus rings with it, so both boxes pad.
              overflow: 'hidden',
              py: focusRingSpace,
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              bgcolor: 'background.paper',
            }}
          >
            {/* Scroll-into-view parks a tabbed-to button flush against the edge, clipping its ring;
                `scroll-padding` moves that edge inward, and the padding covers the resting case. */}
            <Stack
              sx={{
                height: '100%',
                overflowY: 'auto',
                py: focusRingSpace,
                scrollPaddingBlock: focusRingSpace,
              }}
            >
              {ROWS.map((row) => {
                return (
                  <Stack
                    key={row.id}
                    direction="row"
                    sx={{
                      px: 2,
                      py: 1.25,
                      gap: 2,
                      alignItems: 'center',
                      borderBottom: 1,
                      borderColor: 'divider',
                      bgcolor: selected?.id === row.id ? 'action.selected' : undefined,
                    }}
                  >
                    <Stack sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2">{row.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {row.detail}
                      </Typography>
                    </Stack>
                    {/* Still clickable while the panel is open — nothing entered the top layer. */}
                    <Shared.Button
                      size="small"
                      variant="text"
                      onClick={async () => {
                        setSelected(row);
                        await inspector.open();
                      }}
                    >
                      Details
                    </Shared.Button>
                  </Stack>
                );
              })}
            </Stack>
            {inspector.Modal}
          </Box>
        </Box>
      </Stack>
    </ExampleLayout>
  );
}
