import { ExampleLayout } from '@/entities/example/ui/ExampleLayout';
import * as PanelModal from '@/entities/modal-template/ui/mui/panel-modal';
import * as Shared from '@/entities/modal-template/ui/mui/shared';
import { createResultStore } from '@/shared/lib/createResultStore';
import { createImmerStore } from '@/shared/lib/immer-store';
import { simulateApiCall } from '@/shared/lib/simulate-api-call';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloseIcon from '@mui/icons-material/Close';
import {
  Box,
  Checkbox,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { Key, useMessageModal } from 'umbra/react';
import { useStore } from '@/shared/lib/use-store';

// ── Types ──────────────────────────────────────────────────────────────────

type SetupValues = {
  name: string;
  environment: string;
  region: string;
  accessLevel: string;
  notifications: boolean;
  schedule: string;
};

const RECOMMENDED: SetupValues = {
  name: 'Production Export v2',
  environment: 'production',
  region: 'us-east-1',
  accessLevel: 'admin',
  notifications: true,
  schedule: 'daily',
};

// ── Module-level store ────────────────────────────────────────────────────

type SetupState = SetupValues & { step: number };

const setupStore = createImmerStore<SetupState, SetupStoreMethods>(
  { step: 0, ...RECOMMENDED },
  (api) => {
    return {
      resetToRecommended() {
        api.update((draft) => {
          Object.assign(draft, RECOMMENDED);
        });
      },
      resetAll() {
        api.reset();
      },
      setStep(step: number) {
        api.update((draft) => {
          draft.step = step;
        });
      },
      setName(name: string) {
        api.update((draft) => {
          draft.name = name;
        });
      },
      setEnvironment(environment: string) {
        api.update((draft) => {
          draft.environment = environment;
        });
      },
      setRegion(region: string) {
        api.update((draft) => {
          draft.region = region;
        });
      },
      setAccessLevel(accessLevel: string) {
        api.update((draft) => {
          draft.accessLevel = accessLevel;
        });
      },
      setNotifications(notifications: boolean) {
        api.update((draft) => {
          draft.notifications = notifications;
        });
      },
      setSchedule(schedule: string) {
        api.update((draft) => {
          draft.schedule = schedule;
        });
      },
    };
  }
);

type SetupStoreMethods = {
  resetToRecommended: () => void;
  resetAll: () => void;
  setStep: (step: number) => void;
  setName: (name: string) => void;
  setEnvironment: (environment: string) => void;
  setRegion: (region: string) => void;
  setAccessLevel: (accessLevel: string) => void;
  setNotifications: (notifications: boolean) => void;
  setSchedule: (schedule: string) => void;
};

// ── Result store ──────────────────────────────────────────────────────────

const resultStore = createResultStore();

// ── Step titles ────────────────────────────────────────────────────────────

const STEP_TITLES = [
  'Project Details & Infrastructure Configuration',
  'Team Permissions & Access Control Policies',
  'Review & Confirm Changes',
] as const;

const STEP_COUNT = STEP_TITLES.length;

// ── Helpers ─────────────────────────────────────────────────────────────────

function isRecommended(state: SetupValues): boolean {
  return (
    state.name === RECOMMENDED.name &&
    state.environment === RECOMMENDED.environment &&
    state.region === RECOMMENDED.region &&
    state.accessLevel === RECOMMENDED.accessLevel &&
    state.notifications === RECOMMENDED.notifications &&
    state.schedule === RECOMMENDED.schedule
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export const MODAL_ID = 'panel-modal-steps';

export function MuiPanelExample() {
  const { result } = useStore(resultStore);
  const setup = useStore(setupStore);

  // Template hooks infer the payload from `actions` too — `submit` is the only action that
  // carries one, so `SetupValues` is what this modal closes with.
  const modal = useMessageModal<SetupValues, 'back' | 'close' | 'next' | 'submit'>({
    id: MODAL_ID,
    // A string, because the heading below is the *step* and changes three times while the dialog
    // stays open. The wizard is one thing to the user; which step they are on is content, and the
    // "Step 2 of 3" line beside the heading says it.
    ariaLabel: 'Project setup',
    render: ({ action, error }) => {
      const title = STEP_TITLES[setup.step] ?? STEP_TITLES[0];

      // `100%`, not `92vw`. The UA caps a `<dialog>` at `calc(100% - 6px - 2em)` — 337px on a
      // 375px phone — so a panel sized against the *viewport* asks for 345 and overflows its own
      // dialog by eight pixels: cut off on the right, and its rounded corner with it. Above about
      // 475px the two agree and nothing shows, which is why this only ever appeared on a phone.
      // Sizing against the dialog's own box cannot disagree with it.
      return (
        <PanelModal.PanelContainer sx={{ width: 'min(600px, 100%)' }}>
          <PanelModal.PanelHeader>
            <PanelModal.HeaderActionLayout
              content={
                <Box>
                  <Shared.OverflownTypography variant="h6" sx={{ fontWeight: 600 }}>
                    {title}
                  </Shared.OverflownTypography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                    Step {setup.step + 1} of {STEP_COUNT}
                  </Typography>
                </Box>
              }
              actions={
                <>
                  {/* ── "Use recommended" icon button ─────────── */}
                  <Tooltip
                    title={
                      isRecommended(setup)
                        ? 'Using recommended settings'
                        : 'Apply recommended settings'
                    }
                    arrow
                    slotProps={{ popper: { disablePortal: true } }}
                  >
                    <IconButton
                      size="small"
                      aria-label="Apply recommended settings"
                      color={isRecommended(setup) ? 'primary' : 'default'}
                      onClick={() => {
                        setupStore.resetToRecommended();
                      }}
                    >
                      <AutoAwesomeIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  {/* ── "Jump to" dropdown ────────────────────── */}
                  <FormControl size="small" sx={{ minWidth: 100 }}>
                    <Select
                      value={setup.step}
                      variant="outlined"
                      sx={{ fontSize: '0.8125rem', height: 32 }}
                      MenuProps={{ disablePortal: true }}
                      onChange={(e) => {
                        setupStore.setStep(e.target.value);
                      }}
                    >
                      {STEP_TITLES.map((label, i) => {
                        return (
                          <MenuItem key={label} value={i} sx={{ fontSize: '0.8125rem' }}>
                            Step {i + 1}
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </FormControl>

                  <IconButton size="small" aria-label="Close" {...action('close')}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </>
              }
            />
          </PanelModal.PanelHeader>
          <Divider />
          <Shared.OverflowContainer
            sx={{
              height: 350,
            }}
            overflowSx={{
              '& > div': {
                pr: 'calc(24px - var(--scrollbar-width))',
              },
            }}
          >
            <PanelModal.PanelContent>
              {/* ── Step 1: Project Details ────────────────────── */}
              {setup.step === 0 && (
                <Stack spacing={2.5}>
                  <Shared.Heading>Core settings</Shared.Heading>
                  <TextField
                    label="Pipeline name"
                    size="small"
                    fullWidth
                    value={setup.name}
                    onChange={(e) => {
                      setupStore.setName(e.target.value);
                    }}
                  />
                  <FormControl size="small" fullWidth>
                    <InputLabel>Environment</InputLabel>
                    <Select
                      label="Environment"
                      value={setup.environment}
                      MenuProps={{ disablePortal: true }}
                      onChange={(e) => {
                        setupStore.setEnvironment(e.target.value);
                      }}
                    >
                      <MenuItem value="development">Development</MenuItem>
                      <MenuItem value="staging">Staging</MenuItem>
                      <MenuItem value="production">Production</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl>
                    <FormLabel>Region</FormLabel>
                    <RadioGroup
                      row
                      value={setup.region}
                      onChange={(e) => {
                        setupStore.setRegion(e.target.value);
                      }}
                    >
                      <FormControlLabel
                        value="us-east-1"
                        control={<Radio size="small" />}
                        label="US East"
                      />
                      <FormControlLabel
                        value="eu-west-1"
                        control={<Radio size="small" />}
                        label="EU West"
                      />
                      <FormControlLabel
                        value="ap-southeast-1"
                        control={<Radio size="small" />}
                        label="AP Southeast"
                      />
                    </RadioGroup>
                  </FormControl>
                </Stack>
              )}

              {/* ── Step 2: Permissions ────────────────────────── */}
              {setup.step === 1 && (
                <Stack spacing={2.5}>
                  <Shared.Heading>Access control</Shared.Heading>
                  <FormControl size="small" fullWidth>
                    <InputLabel>Access level</InputLabel>
                    <Select
                      label="Access level"
                      value={setup.accessLevel}
                      MenuProps={{ disablePortal: true }}
                      onChange={(e) => {
                        setupStore.setAccessLevel(e.target.value);
                      }}
                    >
                      <MenuItem value="viewer">Viewer</MenuItem>
                      <MenuItem value="editor">Editor</MenuItem>
                      <MenuItem value="admin">Admin</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={setup.notifications}
                        onChange={(e) => {
                          setupStore.setNotifications(e.target.checked);
                        }}
                      />
                    }
                    label="Send email notifications on pipeline runs"
                  />
                  <FormControl>
                    <FormLabel>Run schedule</FormLabel>
                    <RadioGroup
                      value={setup.schedule}
                      onChange={(e) => {
                        setupStore.setSchedule(e.target.value);
                      }}
                    >
                      <FormControlLabel
                        value="hourly"
                        control={<Radio size="small" />}
                        label="Hourly"
                      />
                      <FormControlLabel
                        value="daily"
                        control={<Radio size="small" />}
                        label="Daily"
                      />
                      <FormControlLabel
                        value="weekly"
                        control={<Radio size="small" />}
                        label="Weekly"
                      />
                      <FormControlLabel
                        value="manual"
                        control={<Radio size="small" />}
                        label="Manual only"
                      />
                    </RadioGroup>
                  </FormControl>
                  <Shared.Hint>
                    Only admins can delete resources. Editors can manage settings.
                  </Shared.Hint>
                </Stack>
              )}

              {/* ── Step 3: Review ─────────────────────────────── */}
              {setup.step === 2 && (
                <Stack spacing={2}>
                  <Shared.Heading>Confirm changes</Shared.Heading>
                  {error && (
                    <Shared.AlertContent severity="error">{error.message}</Shared.AlertContent>
                  )}
                  <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                    <Stack spacing={1}>
                      <Typography variant="body2">
                        <strong>Name:</strong> {setup.name}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Environment:</strong> {setup.environment}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Region:</strong> {setup.region}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Access level:</strong> {setup.accessLevel}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Notifications:</strong> {setup.notifications ? 'Yes' : 'No'}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Schedule:</strong> {setup.schedule}
                      </Typography>
                    </Stack>
                  </Box>
                  <Shared.Message>Press Submit or Enter to apply these settings.</Shared.Message>
                </Stack>
              )}
            </PanelModal.PanelContent>
          </Shared.OverflowContainer>
          <Divider />
          <PanelModal.PanelFooter justify={setup.step === 0 ? 'end' : 'space-between'}>
            {setup.step > 0 && (
              <Shared.Button
                variant="outlined"
                {...action('back', () => {
                  setupStore.setStep(Math.max(setup.step - 1, 0));
                })}
              >
                Back
              </Shared.Button>
            )}
            {setup.step === STEP_COUNT - 1 ? (
              <Shared.Button
                variant="contained"
                {...action('submit', {
                  hotkey: Key.Enter,
                  onAction: async (close) => {
                    await simulateApiCall('Create pipeline');
                    const snap = setupStore.getSnapshot();
                    close({
                      name: snap.name,
                      environment: snap.environment,
                      region: snap.region,
                      accessLevel: snap.accessLevel,
                      notifications: snap.notifications,
                      schedule: snap.schedule,
                    });
                  },
                })}
              >
                Submit
              </Shared.Button>
            ) : (
              <Shared.Button
                variant="contained"
                {...action('next', () => {
                  setupStore.setStep(Math.min(setup.step + 1, STEP_COUNT - 1));
                })}
              >
                Next
              </Shared.Button>
            )}
          </PanelModal.PanelFooter>
        </PanelModal.PanelContainer>
      );
    },
    onClose: (r) => {
      setupStore.resetAll();
      if (r.data !== undefined) {
        resultStore.setResult(
          `Submitted: ${r.data.name} (${r.data.environment}, ${r.data.region}, ${r.data.accessLevel})`
        );
      } else {
        resultStore.setResult(`Closed: ${r.reason}`);
      }
    },
  });

  // ── Open the modal and await how it closed ───────────────────────────────

  const handleOpen = () => {
    void (async () => {
      try {
        const [err, closeResult] = await modal.openAndWait();
        if (err !== null) {
          resultStore.setResult(`Error: ${err.message}`);
          return;
        }
        if (closeResult.data !== undefined) {
          resultStore.setResult(
            `openAndWait → submitted: ${closeResult.data.name} (${closeResult.data.environment})`
          );
        } else {
          resultStore.setResult(`openAndWait → dismissed: ${closeResult.reason}`);
        }
      } catch {
        // fire-and-forget safety net
      }
    })();
  };

  return (
    <ExampleLayout result={result} modals={modal.Modal}>
      <Shared.Button variant="contained" size="small" onClick={handleOpen}>
        Open Panel Modal
      </Shared.Button>
    </ExampleLayout>
  );
}
