import { ExampleLayout } from '@/entities/example/ui/ExampleLayout';
import * as Shared from '@/entities/modal-template/ui/mui/shared';
import { ContentTransition } from '@/entities/modal-template/ui/mui/shared/content';
import * as SlideModal from '@/entities/modal-template/ui/mui/slide-modal';
import { mergeSx } from '@/entities/modal-template/ui/shared/sxUtils';
import { createImmerStore } from '@/shared/lib/immer-store';
import {
  Box,
  Checkbox,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import {
  Key,
  dialogManager,
  useSlideModal,
  type SlideAlign,
  type SlideDirection,
  type ActionFactory,
} from 'umbra/react';
import { useStore } from '@/shared/lib/use-store';

const MODAL_ID = 'slide-modal-configurator';

/**
 * Close the panel whenever a configuration option changes.
 *
 * Every option re-configures the panel: `direction`/`align` change its animation and
 * positioning, `nonModal`/`portal` change its DOM structure, size changes its box. A panel
 * left open across such a switch **teleports** to the new configuration instead of animating
 * (and structural switches remount the `<dialog>` mid-flight), which is exactly the kind of
 * half-applied state a configurator must not show. Closing first guarantees the next Open
 * plays a clean transition from the new configuration.
 *
 * Safe to call when already closed — `close()` is a no-op for a closed modal.
 */
function closeForReconfigure() {
  dialogManager.close(MODAL_ID, 'config-change');
}

const DIRECTION_LABELS: Record<SlideDirection, string> = {
  left: 'Left',
  right: 'Right',
  top: 'Top',
  bottom: 'Bottom',
};

const DIRECTIONS: SlideDirection[] = ['left', 'right', 'top', 'bottom'];

const ALIGN_OPTIONS: { value: SlideAlign; label: string }[] = [
  { value: 'stretch', label: 'stretch (default)' },
  { value: 'start', label: 'start' },
  { value: 'center', label: 'center' },
  { value: 'end', label: 'end' },
];

type DismissKeyMode = 'escape' | 'delete' | 'none';
type SizeUnit = 'px' | 'vw' | 'vh' | '%';

const DISMISS_KEY_OPTIONS: { value: DismissKeyMode; label: string }[] = [
  { value: 'escape', label: 'Key.Escape (default)' },
  { value: 'delete', label: 'Key.Delete' },
  { value: 'none', label: 'false (disabled)' },
];

const UNIT_RANGES: Record<SizeUnit, { min: number; max: number; step: number; default: number }> = {
  px: { min: 100, max: 900, step: 10, default: 420 },
  vw: { min: 10, max: 100, step: 1, default: 30 },
  vh: { min: 10, max: 100, step: 1, default: 40 },
  '%': { min: 10, max: 100, step: 1, default: 40 },
};

/**
 * Grouped store for all UI state (showcases >1 depth grouping).
 * - modal: { direction, nonModal, portal, allowBackdropClick, allowClickOutside, dismissKeyMode, openDelay }
 * - size: { unit, width, height }
 * - result: string | null
 */
const INITIAL_STATE = {
  modal: {
    direction: 'right' as SlideDirection,
    align: 'stretch' as SlideAlign,
    nonModal: false,
    portal: false,
    allowBackdropClick: true,
    allowClickOutside: false,
    dismissKeyMode: 'escape' as DismissKeyMode,
    openDelay: 0,
  },
  size: {
    unit: 'px' as SizeUnit,
    width: UNIT_RANGES['px'].default,
    height: 300,
  },
  result: null as string | null,
};

const store = createImmerStore(INITIAL_STATE, (api) => {
  return {
    setModal<K extends keyof typeof INITIAL_STATE.modal>(
      key: K,
      value: (typeof INITIAL_STATE.modal)[K]
    ) {
      closeForReconfigure();
      api.update((draft) => {
        draft.modal[key] = value;
      });
    },
    setSize<K extends keyof typeof INITIAL_STATE.size>(
      key: K,
      value: (typeof INITIAL_STATE.size)[K]
    ) {
      closeForReconfigure();
      api.update((draft) => {
        draft.size[key] = value;
      });
    },
    setResult(value: string | null) {
      // Not a configuration option — never closes the panel.
      api.update((draft) => {
        draft.result = value;
      });
    },
    reset() {
      closeForReconfigure();
      api.reset();
    },
    setSizeUnitAndReset(unit: SizeUnit) {
      closeForReconfigure();
      api.update((draft) => {
        draft.size.unit = unit;
        const range = UNIT_RANGES[unit];
        draft.size.width = range.default;
        draft.size.height = range.default;
      });
    },
  };
});

export function SlideModalConfiguratorExample() {
  const { modal, size, result } = useStore(store);

  // DISMISS_KEY_OPTIONS is used in JSX below

  const dismissKey =
    modal.dismissKeyMode === 'escape'
      ? Key.Escape
      : modal.dismissKeyMode === 'delete'
        ? Key.Delete
        : false;

  // Non-modal + no-portal is "contained" mode: the panel is sized against its host box,
  // not the viewport — so the panel's full-bleed cross axis is `100%`, not `100dvw/dvh`.
  const isContained = modal.nonModal && !modal.portal;

  // Which size axes actually affect the panel, given direction × align. The main axis (the
  // one the panel slides along) is always driven by the size controls; the cross axis is only
  // driven when `align` is NOT stretch — `stretch` fills it edge-to-edge, so that control
  // would silently do nothing. Disable what has no effect instead of letting it mislead.
  const isHorizontalSlide = modal.direction === 'left' || modal.direction === 'right';
  const isStretched = modal.align === 'stretch';
  const widthApplies = isHorizontalSlide || !isStretched;
  const heightApplies = !isHorizontalSlide || !isStretched;
  const crossAxisNote = `align: stretch fills the ${isHorizontalSlide ? 'height' : 'width'} (${
    isContained ? 'container' : 'viewport'
  })`;

  const getConfiguratorSx = (dir: SlideDirection) => {
    const horizontal = dir === 'left' || dir === 'right';
    const vertical = dir === 'top' || dir === 'bottom';
    const fullW = isContained ? '100%' : '100dvw';
    const fullH = isContained ? '100%' : '100dvh';
    // With a non-stretch `align` the panel is content-sized on the cross axis — so the
    // configured size drives BOTH axes there, instead of the cross axis going full-bleed.
    const stretched = modal.align === 'stretch';
    const configuredW = `${String(size.width)}${size.unit}`;
    const configuredH = `${String(size.height)}${size.unit}`;
    const crossW = stretched ? fullW : configuredW;
    const crossH = stretched ? fullH : configuredH;
    return {
      width: horizontal ? { xs: fullW, sm: configuredW } : crossW,
      height: vertical ? { xs: fullH, sm: configuredH } : crossH,
      // Override the template's default drawer min/max clamps (SlideModal.DefaultLayout pins
      // horizontal drawers to minWidth 320 / maxWidth 640) so the SIZE controls drive the
      // panel exactly across the full range — the configurator's whole point.
      minWidth: 0,
      minHeight: 0,
      maxWidth: fullW,
      maxHeight: fullH,
    };
  };

  // `action` is threaded rather than closed over: actions are declared by being rendered, so
  // a helper that draws one needs the factory the render callback was handed.
  const renderSlide = (dir: SlideDirection, action: ActionFactory) => {
    return (
      <SlideModal.DefaultLayout direction={dir} sx={getConfiguratorSx(dir)}>
        <SlideModal.Header>
          <SlideModal.Title>Slide Modal Configurator</SlideModal.Title>
        </SlideModal.Header>
        <SlideModal.Content>
          <Stack spacing={2}>
            <Shared.Heading>{DIRECTION_LABELS[dir]} slide</Shared.Heading>
            <Shared.DetailList
              items={[
                `Mode: ${modal.nonModal ? 'Non-modal' : 'Modal'}`,
                `Align: ${modal.align}`,
                `Portal: ${modal.portal ? 'enabled' : 'disabled'}`,
                modal.nonModal
                  ? `Click outside dismiss: ${modal.allowClickOutside ? 'enabled' : 'disabled'}`
                  : `Backdrop click dismiss: ${modal.allowBackdropClick ? 'enabled' : 'disabled'}`,
                `Dismiss key: ${modal.dismissKeyMode === 'none' ? 'disabled' : modal.dismissKeyMode}`,
                `Size: width ${String(size.width)}${size.unit} x height ${String(size.height)}${size.unit}`,
              ]}
            />
            <Shared.Message>
              This panel is driven by slide-modal configuration controls in the helpers.
            </Shared.Message>
          </Stack>
        </SlideModal.Content>
        <SlideModal.Footer>
          <Shared.Button variant="outlined" {...action('close')}>
            Close
          </Shared.Button>
        </SlideModal.Footer>
      </SlideModal.DefaultLayout>
    );
  };

  // Only crossfade a loading state when there is an actual async delay to wait on.
  // With openDelay = 0 the panel should just slide in — no spurious "Loading…" flash
  // fading in over the slide.
  const renderPanel = (dir: SlideDirection, isPreparing: boolean, action: ActionFactory) => {
    if (modal.openDelay <= 0) {
      return renderSlide(dir, action);
    }
    return (
      <ContentTransition
        pending={isPreparing}
        fallback={
          <SlideModal.DefaultLayout
            direction={dir}
            sx={mergeSx(getConfiguratorSx(dir), { justifyContent: 'center' })}
          >
            <SlideModal.Content sx={{ flex: undefined }}>
              <Stack spacing={2} sx={{ alignItems: 'center', justifyContent: 'center' }}>
                <CircularProgress size={40} />
                <Typography color="text.secondary">Loading...</Typography>
              </Stack>
            </SlideModal.Content>
          </SlideModal.DefaultLayout>
        }
      >
        {renderSlide(dir, action)}
      </ContentTransition>
    );
  };

  const panel = useSlideModal(
    modal.nonModal
      ? {
          id: MODAL_ID,
          direction: modal.direction,
          align: modal.align,
          nonModal: true,
          portal: modal.portal,
          dismissKey,
          dismissOnClickOutside: modal.allowClickOutside,
          onOpen: async () => {
            if (modal.openDelay > 0) {
              await new Promise((resolve) => {
                return setTimeout(resolve, modal.openDelay);
              });
            }
          },
          render: ({ direction: dir, isPreparing, action }) => {
            return renderPanel(dir, isPreparing, action);
          },
          onClose: (closeResult) => {
            store.setResult(`Closed: ${closeResult.reason}`);
          },
        }
      : {
          id: MODAL_ID,
          direction: modal.direction,
          align: modal.align,
          portal: modal.portal,
          dismissKey,
          dismissOnBackdropClick: modal.allowBackdropClick,
          onOpen: async () => {
            if (modal.openDelay > 0) {
              await new Promise((resolve) => {
                return setTimeout(resolve, modal.openDelay);
              });
            }
          },
          render: ({ direction: dir, isPreparing, action }) => {
            return renderPanel(dir, isPreparing, action);
          },
          onClose: (closeResult) => {
            store.setResult(`Closed: ${closeResult.reason}`);
          },
        }
  );

  const handleUnitChange = (_: React.MouseEvent<HTMLElement>, next: SizeUnit | null) => {
    if (next === null) {
      return;
    }
    store.setSizeUnitAndReset(next);
  };

  const range = UNIT_RANGES[size.unit];

  // Contained mode (see above) anchors to its nearest positioned ancestor instead of the
  // viewport. Give it a sized, relative stage so the slide has a real box to enter from.
  // Modal/portal modes escape this wrapper.
  const modals = isContained ? (
    <Box
      sx={{
        position: 'relative',
        height: 360,
        overflow: 'hidden',
        border: '1px dashed',
        borderColor: 'divider',
        borderRadius: 1,
      }}
    >
      {panel.Modal}
    </Box>
  ) : (
    panel.Modal
  );

  return (
    <ExampleLayout result={result} modals={modals}>
      <Stack spacing={2} sx={{ width: '100%' }}>
        {/* Open button + status */}
        <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
          <Shared.Button
            variant="contained"
            size="small"
            onClick={async () => {
              await panel.open();
              const [, closeResult] = await panel.waitForClose();
              store.setResult(
                `${DIRECTION_LABELS[modal.direction]}: ${closeResult?.reason ?? 'unknown'}`
              );
            }}
          >
            Open
          </Shared.Button>
          <Typography variant="body2" color="text.secondary">
            {DIRECTION_LABELS[modal.direction]} — {modal.nonModal ? 'Non-modal' : 'Modal'} — Portal{' '}
            {modal.portal ? 'on' : 'off'} — align {modal.align}
          </Typography>
        </Stack>

        {/* Config panel */}
        <Stack
          direction="row"
          spacing={0}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            overflow: 'hidden',
          }}
        >
          {/* Section: Mode */}
          <Box
            sx={{
              p: 1.5,
              flex: '1 1 33.333%',
              minWidth: 0,
            }}
          >
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ display: 'block', mb: 1, lineHeight: 1 }}
            >
              Mode
            </Typography>
            <Stack spacing={0.5}>
              <FormControl size="small" fullWidth>
                <InputLabel>Direction</InputLabel>
                <Select
                  label="Direction"
                  value={modal.direction}
                  onChange={(e) => {
                    store.setModal('direction', e.target.value);
                  }}
                >
                  {DIRECTIONS.map((d) => {
                    return (
                      <MenuItem key={d} value={d}>
                        {DIRECTION_LABELS[d]}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
              <FormControl size="small" fullWidth>
                <InputLabel>Align</InputLabel>
                <Select
                  label="Align"
                  value={modal.align}
                  onChange={(e) => {
                    store.setModal('align', e.target.value);
                  }}
                >
                  {ALIGN_OPTIONS.map((option) => {
                    return (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={modal.nonModal}
                    onChange={(e) => {
                      store.setModal('nonModal', e.target.checked);
                    }}
                    size="small"
                  />
                }
                label={<Typography variant="body2">Non-modal</Typography>}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={modal.portal}
                    onChange={(e) => {
                      store.setModal('portal', e.target.checked);
                    }}
                    size="small"
                  />
                }
                label={<Typography variant="body2">Portal</Typography>}
              />
            </Stack>
          </Box>

          <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />

          {/* Section: Dismiss */}
          <Box
            sx={{
              p: 1.5,
              flex: '1 1 33.333%',
              minWidth: 0,
            }}
          >
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ display: 'block', mb: 1, lineHeight: 1 }}
            >
              Dismiss
            </Typography>
            <Stack spacing={0.5}>
              <FormControl size="small" fullWidth>
                <InputLabel>Key</InputLabel>
                <Select
                  label="Key"
                  value={modal.dismissKeyMode}
                  onChange={(e) => {
                    store.setModal('dismissKeyMode', e.target.value);
                  }}
                >
                  {DISMISS_KEY_OPTIONS.map((option) => {
                    return (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
              {modal.nonModal ? (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={modal.allowClickOutside}
                      onChange={(e) => {
                        store.setModal('allowClickOutside', e.target.checked);
                      }}
                      size="small"
                    />
                  }
                  label={<Typography variant="body2">Click outside</Typography>}
                />
              ) : (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={modal.allowBackdropClick}
                      onChange={(e) => {
                        store.setModal('allowBackdropClick', e.target.checked);
                      }}
                      size="small"
                    />
                  }
                  label={<Typography variant="body2">Backdrop click</Typography>}
                />
              )}
            </Stack>
          </Box>

          <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />

          {/* Section: Size */}
          <Box
            sx={{
              p: 1.5,
              flex: '1 1 33.333%',
              minWidth: 0,
            }}
          >
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ display: 'block', mb: 1, lineHeight: 1 }}
            >
              Size
            </Typography>
            <Stack spacing={1}>
              <ToggleButtonGroup
                value={size.unit}
                exclusive
                onChange={handleUnitChange}
                size="small"
                fullWidth
              >
                {(['px', 'vw', 'vh', '%'] as SizeUnit[]).map((u) => {
                  return (
                    <ToggleButton key={u} value={u} sx={{ py: 0.25, fontSize: '0.7rem' }}>
                      {u}
                    </ToggleButton>
                  );
                })}
              </ToggleButtonGroup>

              <Box>
                <Stack
                  direction="row"
                  sx={{ justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Typography
                    variant="caption"
                    color={widthApplies ? 'text.secondary' : 'text.disabled'}
                  >
                    Width{widthApplies ? '' : ' (n/a)'}
                  </Typography>
                  <TextField
                    type="number"
                    size="small"
                    disabled={!widthApplies}
                    value={size.width}
                    onChange={(e) => {
                      store.setSize('width', Number(e.target.value));
                    }}
                    sx={{ width: 90 }}
                    slotProps={{ htmlInput: { min: range.min, max: range.max } }}
                  />
                </Stack>
                <Slider
                  disabled={!widthApplies}
                  value={size.width}
                  min={range.min}
                  max={range.max}
                  step={range.step}
                  size="small"
                  onChange={(_, v) => {
                    if (typeof v !== 'number') {
                      return;
                    }
                    store.setSize('width', v);
                  }}
                />
              </Box>

              <Box>
                <Stack
                  direction="row"
                  sx={{ justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Typography
                    variant="caption"
                    color={heightApplies ? 'text.secondary' : 'text.disabled'}
                  >
                    Height{heightApplies ? '' : ' (n/a)'}
                  </Typography>
                  <TextField
                    type="number"
                    size="small"
                    disabled={!heightApplies}
                    value={size.height}
                    onChange={(e) => {
                      store.setSize('height', Number(e.target.value));
                    }}
                    sx={{ width: 90 }}
                    slotProps={{ htmlInput: { min: range.min, max: range.max } }}
                  />
                </Stack>
                <Slider
                  disabled={!heightApplies}
                  value={size.height}
                  min={range.min}
                  max={range.max}
                  step={range.step}
                  size="small"
                  onChange={(_, v) => {
                    if (typeof v !== 'number') {
                      return;
                    }
                    store.setSize('height', v);
                  }}
                />
              </Box>

              {/* Explain the disabled axis instead of leaving a dead control unexplained. */}
              {(!widthApplies || !heightApplies) && (
                <Typography variant="caption" color="text.disabled">
                  {crossAxisNote} — switch align to size both axes.
                </Typography>
              )}

              <Box>
                <Stack
                  direction="row"
                  sx={{ justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Typography variant="caption" color="text.secondary">
                    Async open delay (ms)
                  </Typography>
                  <TextField
                    type="number"
                    size="small"
                    value={modal.openDelay}
                    onChange={(e) => {
                      store.setModal('openDelay', Math.max(0, Number(e.target.value)));
                    }}
                    sx={{ width: 90 }}
                    slotProps={{ htmlInput: { min: 0 } }}
                  />
                </Stack>
              </Box>
            </Stack>
          </Box>
        </Stack>

        <Shared.Hint>
          Toggle options above. Use the panel&apos;s <strong>Close</strong> to test dismiss policy.
          Width applies to left/right slides; height applies to top/bottom slides. With{' '}
          <strong>align: stretch</strong> the cross axis fills the viewport (or container);{' '}
          <strong>start/center/end</strong> pin a content-sized panel, so both width and height
          apply.
        </Shared.Hint>
      </Stack>
    </ExampleLayout>
  );
}
