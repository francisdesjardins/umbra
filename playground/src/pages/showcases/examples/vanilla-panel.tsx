import { ExampleLayout } from '@/entities/example';
import * as FormDialog from '@/entities/dialog-template/ui/vanilla/form-dialog';
import * as PanelDialog from '@/entities/dialog-template/ui/vanilla/panel-dialog';
import * as Shared from '@/entities/dialog-template/ui/vanilla/shared';
import { createResultStore } from '@/shared/lib/createResultStore';
import { createImmerStore } from '@/shared/lib/immer-store';
import { simulateApiCall } from '@/shared/lib/simulate-api-call';
import { SelectionDropdown } from '@/shared/ui/SelectionDropdown';
import type { ReactNode } from 'react';
import { Key, useMessageDialog } from 'umbra/react';
import { useStore } from '@/shared/lib/use-store';

// ── Types ──────────────────────────────────────────────────────────────────

export type SetupValues = {
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
  {
    builder: (api) => {
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
    },
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

/** A radio row: fieldset semantics carry the group name a `FormLabel` carried in MUI. */
function RadioRow({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  readonly legend: string;
  readonly name: string;
  readonly value: string;
  readonly options: ReadonlyArray<{ readonly value: string; readonly label: string }>;
  readonly onChange: (value: string) => void;
}) {
  return (
    <fieldset style={{ border: 'none', margin: 0, padding: 0 }}>
      <legend
        style={{
          padding: 0,
          marginBottom: 8,
          fontSize: 'var(--font-size-sm)',
          color: 'var(--dialog-text-secondary)',
        }}
      >
        {legend}
      </legend>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {options.map((option) => {
          return (
            <label
              key={option.value}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 'var(--font-size-sm)',
                cursor: 'pointer',
                // The label is the target, so it carries the 2.5.8 floor the bare input misses.
                minHeight: 24,
              }}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={value === option.value}
                onChange={() => {
                  onChange(option.value);
                }}
                style={{ accentColor: 'var(--color-primary)' }}
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Label over control, the column every field shares. */
function Field({
  label,
  htmlFor,
  children,
}: {
  readonly label: string;
  readonly htmlFor: string;
  readonly children: ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <FormDialog.Label htmlFor={htmlFor}>{label}</FormDialog.Label>
      {children}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export const DIALOG_ID = 'vanilla-panel-steps';

export function VanillaPanelExample() {
  const { result } = useStore(resultStore);
  const setup = useStore(setupStore);

  // Template hooks infer the payload from `actions`; `submit` is the only one carrying a payload.
  const dialog = useMessageDialog({
    id: DIALOG_ID,
    // A string: the heading is the *step* and changes three times while the dialog stays open.
    ariaLabel: 'Project setup',
    render: ({ action, error }) => {
      const title = STEP_TITLES[setup.step] ?? STEP_TITLES[0];

      // `100%`, not `92vw`: the UA caps a `<dialog>` at `calc(100% - 6px - 2em)` — 337px on a 375px
      // phone — so a viewport-sized panel asks 345 and overflows by 8px. They agree above ~475px.
      return (
        <PanelDialog.PanelContainer style={{ width: 'min(600px, 100%)' }}>
          <PanelDialog.PanelHeader>
            <PanelDialog.HeaderActionLayout
              content={
                <div>
                  <Shared.OverflownTypography>{title}</Shared.OverflownTypography>
                  <Shared.Detail>
                    Step {setup.step + 1} of {STEP_COUNT}
                  </Shared.Detail>
                </div>
              }
              actions={
                <>
                  {/* ── "Use recommended" icon button — a native `title`, not a tooltip widget ── */}
                  <button
                    type="button"
                    aria-label="Apply recommended settings"
                    title={
                      isRecommended(setup)
                        ? 'Using recommended settings'
                        : 'Apply recommended settings'
                    }
                    onClick={() => {
                      setupStore.resetToRecommended();
                    }}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      padding: 4,
                      display: 'inline-flex',
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden
                      style={{
                        width: 18,
                        height: 18,
                        // A fill, never text: the amber is 3.19:1 on the surface, fine for an icon.
                        fill: isRecommended(setup)
                          ? 'var(--color-primary)'
                          : 'var(--dialog-text-secondary)',
                      }}
                    >
                      <path d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z" />
                    </svg>
                  </button>

                  {/* ── "Jump to" dropdown — the element the platform already ships ── */}
                  <SelectionDropdown
                    id={`${DIALOG_ID}-step`}
                    aria-label="Jump to step"
                    compact
                    value={setup.step}
                    onChange={(e) => {
                      setupStore.setStep(Number(e.target.value));
                    }}
                  >
                    {STEP_TITLES.map((label, i) => {
                      return (
                        <option key={label} value={i}>
                          Step {i + 1}
                        </option>
                      );
                    })}
                  </SelectionDropdown>

                  {/* No explicit `type`: the action spread already carries `type="button"`. */}
                  <button
                    aria-label="Close"
                    {...action('close')}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--dialog-text-secondary)',
                      cursor: 'pointer',
                      padding: 4,
                      display: 'inline-flex',
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden
                      style={{ width: 18, height: 18, fill: 'currentColor' }}
                    >
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                    </svg>
                  </button>
                </>
              }
            />
          </PanelDialog.PanelHeader>
          <PanelDialog.Divider />
          {/* Scroll inside the padded area, not around it: a scrollbar on the outer box runs the
              panel's rounded border; inset by the content padding it clears border and radius. */}
          <PanelDialog.PanelContent>
            {/* Pinned so the panel keeps one height across the three steps rather than resizing
                under the reader — measured against the tallest of them, since a pin below that
                makes every step scroll. The vh guard is for a phone shorter than the pin. */}
            <Shared.OverflowContainer style={{ height: 'min(340px, 42vh)' }}>
              {/* ── Step 1: Project Details ────────────────────── */}
              {setup.step === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <Shared.Heading>Core settings</Shared.Heading>
                  <Field label="Pipeline name" htmlFor={`${DIALOG_ID}-name`}>
                    <FormDialog.Input
                      id={`${DIALOG_ID}-name`}
                      value={setup.name}
                      onChange={(e) => {
                        setupStore.setName(e.target.value);
                      }}
                    />
                  </Field>
                  <Field label="Environment" htmlFor={`${DIALOG_ID}-environment`}>
                    <SelectionDropdown
                      id={`${DIALOG_ID}-environment`}
                      value={setup.environment}
                      onChange={(e) => {
                        setupStore.setEnvironment(e.target.value);
                      }}
                      block
                    >
                      <option value="development">Development</option>
                      <option value="staging">Staging</option>
                      <option value="production">Production</option>
                    </SelectionDropdown>
                  </Field>
                  <RadioRow
                    legend="Region"
                    name={`${DIALOG_ID}-region`}
                    value={setup.region}
                    options={[
                      { value: 'us-east-1', label: 'US East' },
                      { value: 'eu-west-1', label: 'EU West' },
                      { value: 'ap-southeast-1', label: 'AP Southeast' },
                    ]}
                    onChange={(value) => {
                      setupStore.setRegion(value);
                    }}
                  />
                </div>
              )}

              {/* ── Step 2: Permissions ────────────────────────── */}
              {setup.step === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <Shared.Heading>Access control</Shared.Heading>
                  <Field label="Access level" htmlFor={`${DIALOG_ID}-access`}>
                    <SelectionDropdown
                      id={`${DIALOG_ID}-access`}
                      value={setup.accessLevel}
                      onChange={(e) => {
                        setupStore.setAccessLevel(e.target.value);
                      }}
                      block
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                    </SelectionDropdown>
                  </Field>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 'var(--font-size-sm)',
                      cursor: 'pointer',
                      minHeight: 24,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={setup.notifications}
                      onChange={(e) => {
                        setupStore.setNotifications(e.target.checked);
                      }}
                      style={{ accentColor: 'var(--color-primary)' }}
                    />
                    Send email notifications on pipeline runs
                  </label>
                  <RadioRow
                    legend="Run schedule"
                    name={`${DIALOG_ID}-schedule`}
                    value={setup.schedule}
                    options={[
                      { value: 'hourly', label: 'Hourly' },
                      { value: 'daily', label: 'Daily' },
                      { value: 'weekly', label: 'Weekly' },
                      { value: 'manual', label: 'Manual only' },
                    ]}
                    onChange={(value) => {
                      setupStore.setSchedule(value);
                    }}
                  />
                  <Shared.Hint>
                    Only admins can delete resources. Editors can manage settings.
                  </Shared.Hint>
                </div>
              )}

              {/* ── Step 3: Review ─────────────────────────────── */}
              {setup.step === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <Shared.Heading>Confirm changes</Shared.Heading>
                  {error && <Shared.Alert severity="error">{error.message}</Shared.Alert>}
                  <div
                    style={{
                      padding: 16,
                      border: '1px solid var(--panel-border)',
                      borderRadius: 6,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      fontSize: 'var(--font-size-sm)',
                    }}
                  >
                    <span>
                      <strong>Name:</strong> {setup.name}
                    </span>
                    <span>
                      <strong>Environment:</strong> {setup.environment}
                    </span>
                    <span>
                      <strong>Region:</strong> {setup.region}
                    </span>
                    <span>
                      <strong>Access level:</strong> {setup.accessLevel}
                    </span>
                    <span>
                      <strong>Notifications:</strong> {setup.notifications ? 'Yes' : 'No'}
                    </span>
                    <span>
                      <strong>Schedule:</strong> {setup.schedule}
                    </span>
                  </div>
                  <Shared.Message>Press Submit or Enter to apply these settings.</Shared.Message>
                </div>
              )}
            </Shared.OverflowContainer>
          </PanelDialog.PanelContent>
          <PanelDialog.Divider />
          <PanelDialog.PanelFooter justify={setup.step === 0 ? 'end' : 'space-between'}>
            {setup.step > 0 && (
              <Shared.Button
                {...action('back', () => {
                  setupStore.setStep(Math.max(setup.step - 1, 0));
                })}
              >
                Back
              </Shared.Button>
            )}
            {setup.step === STEP_COUNT - 1 ? (
              <Shared.Button
                variant="primary"
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
                variant="primary"
                {...action('next', () => {
                  setupStore.setStep(Math.min(setup.step + 1, STEP_COUNT - 1));
                })}
              >
                Next
              </Shared.Button>
            )}
          </PanelDialog.PanelFooter>
        </PanelDialog.PanelContainer>
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

  // ── Open the dialog and await how it closed ───────────────────────────────

  const handleOpen = () => {
    void (async () => {
      try {
        const [err, closeResult] = await dialog.openAndWait();
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
        // The open is fire-and-forget, so a rejection has nowhere to go but the console.
      }
    })();
  };

  return (
    <ExampleLayout result={result} dialogs={dialog.Dialog}>
      <Shared.Button variant="primary" onClick={handleOpen}>
        Open Vanilla Panel
      </Shared.Button>
    </ExampleLayout>
  );
}
