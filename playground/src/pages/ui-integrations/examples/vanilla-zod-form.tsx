import { ExampleLayout } from '@/entities/example/ui/ExampleLayout';
import * as VanillaFormModal from '@/entities/modal-template/ui/vanilla/form-modal';
import styles from '@/entities/modal-template/ui/vanilla/form-modal/styles.module.css';
import * as Shared from '@/entities/modal-template/ui/vanilla/shared';
import { createImmerStore } from '@/shared/lib/immer-store';
import { isNullish } from '@/shared/lib/is-nullish';
import { simulateApiCall } from '@/shared/lib/simulate-api-call';
import { Button } from '@mui/material';
import { useModal } from 'umbra/react';
import { useStore } from '@/shared/lib/use-store';
import { z } from 'zod';

export const MODAL_ID = 'vanilla-zod-form-example';

// ── Zod schema — single source of truth for validation ──────────────────────

const phoneSchema = z.object({
  number: z.string().min(10, { message: 'Enter a valid phone number' }),
  label: z.enum(['home', 'work', 'mobile']),
});

const userSchema = z.object({
  name: z.string().min(2, { message: 'Must be at least 2 characters' }),
  email: z.email({ message: 'Please enter a valid email address' }),
  username: z
    .string()
    .min(3, { message: 'Must be 3–20 characters' })
    .max(20, { message: 'Must be 3–20 characters' })
    .regex(/^[a-zA-Z0-9_]+$/, { message: 'Letters, numbers, and underscores only' }),
  address: z.object({
    city: z.string().min(1, { message: 'City is required' }),
    country: z.string().min(2, { message: 'Country is required' }),
  }),
  phones: z.array(phoneSchema).min(1, { message: 'Add at least one phone number' }),
});

type UserForm = z.infer<typeof userSchema>;
type Phone = z.infer<typeof phoneSchema>;
type PhoneLabel = Phone['label'];

const PHONE_LABELS: ReadonlyArray<PhoneLabel> = ['home', 'work', 'mobile'];

const INITIAL_FORM: UserForm = {
  name: '',
  email: '',
  username: '',
  address: { city: '', country: '' },
  phones: [{ number: '', label: 'mobile' }],
};

// ── Zod issue path → flat string key ────────────────────────────────────────
// e.g. ['phones', 0, 'number'] → 'phones[0].number'
function zodPathKey(path: ReadonlyArray<PropertyKey>): string {
  return path.reduce<string>((acc, seg, i) => {
    if (typeof seg === 'number') {
      return `${acc}[${String(seg)}]`;
    }
    if (typeof seg === 'symbol') {
      return acc;
    }
    return i === 0 ? seg : `${acc}.${seg}`;
  }, '');
}

function phoneNumberKey(index: number): string {
  return `phones[${String(index)}].number`;
}

// ── Form flow store ──────────────────────────────────────────────────────────
//
// A single store manages the entire form lifecycle via three slices:
//
//   values  — the live form data (immer `update` mutates fields and the phones
//             array in place)
//   errors  — flat path → first Zod error message; wrapped in { map } so the
//             Record index signature stays inside getSnapshot() and doesn't
//             bleed into the method surface
//   result  — the submit outcome displayed in the ExampleLayout banner
//
// Why one store instead of three?
//   • resetForm() resets all three slices in a single update() notification —
//     no cross-store coordination, no risk of components seeing an intermediate
//     "values reset but errors still visible" state.
//   • validate() reads values and writes errors atomically inside one update.
//   • The component subscribes to each slice independently, so render granularity
//     is identical to the three-store version — only values-slice changes
//     re-render the field grid, only errors-slice changes re-render the hints.

type FormFlowSnapshot = {
  values: UserForm;
  errors: { map: Record<string, string> };
  result: string | null;
};

const PHONE_DEFAULTS: Phone = { number: '', label: 'mobile' };

const INITIAL_SNAPSHOT: FormFlowSnapshot = {
  values: structuredClone(INITIAL_FORM),
  errors: { map: {} },
  result: null,
};

// One store, three slices (values / errors / result). immer's `update` mutates a
// draft directly, so nested arrays, key deletes and whole-slice replacements all
// happen in place — no path helpers or array-method factories needed.
const formFlowStore = createImmerStore(INITIAL_SNAPSHOT, (api) => {
  return {
    // ── values slice ────────────────────────────────────────────────────────
    values: {
      // Scalar fields only (phones has its own helpers). All are string-valued.
      setField(
        path: 'name' | 'username' | 'email' | 'address.city' | 'address.country',
        value: string
      ): void {
        api.update((d) => {
          if (path === 'address.city') {
            d.values.address.city = value;
          } else if (path === 'address.country') {
            d.values.address.country = value;
          } else {
            d.values[path] = value;
          }
        });
      },
      phones: {
        add(): void {
          api.update((d) => {
            d.values.phones.push(structuredClone(PHONE_DEFAULTS));
          });
        },
        remove(index: number): void {
          api.update((d) => {
            d.values.phones.splice(index, 1);
          });
        },
        set(index: number, partial: Partial<Phone>): void {
          api.update((d) => {
            const phone = d.values.phones[index];
            if (phone) {
              Object.assign(phone, partial);
            }
          });
        },
      },
    },

    // ── errors slice ────────────────────────────────────────────────────────
    errors: {
      setAll(map: Record<string, string>): void {
        api.update((d) => {
          d.errors.map = map;
        });
      },
      clear(path: string): void {
        api.update((d) => {
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- path-keyed error map
          delete d.errors.map[path];
        });
      },
    },

    // ── result slice ──────────────────────────────────────────────────────────
    setResult(result: string | null): void {
      api.update((d) => {
        d.result = result;
      });
    },

    // validate() reads values, computes Zod errors, and writes the errors slice.
    validate(): { success: true; data: UserForm } | { success: false } {
      const parsed = userSchema.safeParse(api.get().values);
      if (parsed.success) {
        api.update((d) => {
          d.errors.map = {};
        });
        return { success: true, data: parsed.data };
      }
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = zodPathKey(issue.path);
        if (!errors[key]) {
          errors[key] = issue.message;
        }
      }
      api.update((d) => {
        d.errors.map = errors;
      });
      return { success: false };
    },

    // A single update() = one notification, so components never see a torn state
    // where values are blank but stale errors are still visible.
    resetForm(): void {
      api.reset();
    },
  };
});

// ── Component — subscribes to store slices, renders, nothing more ───────────

export function VanillaZodFormExample() {
  const result = useStore(formFlowStore, (s) => {
    return s.result;
  });
  const values = useStore(formFlowStore, (s) => {
    return s.values;
  });
  const errors = useStore(formFlowStore, (s) => {
    return s.errors.map;
  });

  // `UserForm` is inferred from zod, then from `actions` — declared once, restated nowhere.
  const formModal = useModal<UserForm, 'cancel' | 'submit'>({
    id: MODAL_ID,
    onOpen: () => {
      formFlowStore.resetForm();
    },
    render: ({ action, error }) => {
      return (
        <VanillaFormModal.DefaultLayout
          style={{
            minWidth: 440,
            maxWidth: 600,
            maxHeight: '72vh',
            padding: '14px',
            gap: '8px',
          }}
        >
          <VanillaFormModal.Header>
            <Shared.Heading>Create Account</Shared.Heading>
            <Shared.Detail>
              <code>createStore</code> + immer <code>update</code>, Zod on submit, CSS{' '}
              <code>:user-invalid</code> + <code>:has()</code> for field feedback.
            </Shared.Detail>
            {error && (
              <Shared.Alert title="Validation Error" severity="error">
                {error.message}
              </Shared.Alert>
            )}
          </VanillaFormModal.Header>

          <VanillaFormModal.Content>
            {/* ── Profile — 2-column grid ──────────────────────── */}
            <div className={styles['formGrid']}>
              <VanillaFormModal.FieldGroup>
                <VanillaFormModal.Label htmlFor="zod-name" required>
                  Full Name
                </VanillaFormModal.Label>
                <input
                  id="zod-name"
                  className={styles['input']}
                  required
                  minLength={2}
                  value={values.name}
                  onChange={(e) => {
                    formFlowStore.values.setField('name', e.target.value);
                    formFlowStore.errors.clear('name');
                  }}
                />
                <span
                  className={styles['fieldHint']}
                  data-error={!isNullish(errors['name']) ? '' : undefined}
                >
                  {errors['name'] ?? 'At least 2 characters'}
                </span>
              </VanillaFormModal.FieldGroup>

              <VanillaFormModal.FieldGroup>
                <VanillaFormModal.Label htmlFor="zod-username" required>
                  Username
                </VanillaFormModal.Label>
                <input
                  id="zod-username"
                  className={styles['input']}
                  required
                  minLength={3}
                  maxLength={20}
                  pattern="[a-zA-Z0-9_]+"
                  value={values.username}
                  onChange={(e) => {
                    formFlowStore.values.setField('username', e.target.value);
                    formFlowStore.errors.clear('username');
                  }}
                />
                <span
                  className={styles['fieldHint']}
                  data-error={!isNullish(errors['username']) ? '' : undefined}
                >
                  {errors['username'] ?? '3–20 chars: letters, numbers, _'}
                </span>
              </VanillaFormModal.FieldGroup>

              <div className={styles['formGridFull']}>
                <VanillaFormModal.FieldGroup>
                  <VanillaFormModal.Label htmlFor="zod-email" required>
                    Email
                  </VanillaFormModal.Label>
                  <input
                    id="zod-email"
                    className={styles['input']}
                    type="email"
                    required
                    value={values.email}
                    onChange={(e) => {
                      formFlowStore.values.setField('email', e.target.value);
                      formFlowStore.errors.clear('email');
                    }}
                  />
                  <span
                    className={styles['fieldHint']}
                    data-error={!isNullish(errors['email']) ? '' : undefined}
                  >
                    {errors['email'] ?? 'Valid email address'}
                  </span>
                </VanillaFormModal.FieldGroup>
              </div>
            </div>

            {/* ── Address — 2-column grid ──────────────────────── */}
            <Shared.Section title="Address">
              <div className={styles['formGrid']}>
                <VanillaFormModal.FieldGroup>
                  <VanillaFormModal.Label htmlFor="zod-city" required>
                    City
                  </VanillaFormModal.Label>
                  <input
                    id="zod-city"
                    className={styles['input']}
                    required
                    value={values.address.city}
                    onChange={(e) => {
                      formFlowStore.values.setField('address.city', e.target.value);
                      formFlowStore.errors.clear('address.city');
                    }}
                  />
                  <span
                    className={styles['fieldHint']}
                    data-error={!isNullish(errors['address.city']) ? '' : undefined}
                  >
                    {errors['address.city'] ?? 'Required'}
                  </span>
                </VanillaFormModal.FieldGroup>

                <VanillaFormModal.FieldGroup>
                  <VanillaFormModal.Label htmlFor="zod-country" required>
                    Country
                  </VanillaFormModal.Label>
                  <input
                    id="zod-country"
                    className={styles['input']}
                    required
                    minLength={2}
                    value={values.address.country}
                    onChange={(e) => {
                      formFlowStore.values.setField('address.country', e.target.value);
                      formFlowStore.errors.clear('address.country');
                    }}
                  />
                  <span
                    className={styles['fieldHint']}
                    data-error={!isNullish(errors['address.country']) ? '' : undefined}
                  >
                    {errors['address.country'] ?? 'At least 2 characters'}
                  </span>
                </VanillaFormModal.FieldGroup>
              </div>
            </Shared.Section>

            {/* ── Phones — dynamic array via immer update ───── */}
            <Shared.Section title="Phone Numbers">
              {values.phones.map((phone, i) => {
                return (
                  <div key={String(i)} className={styles['arrayRow']}>
                    <VanillaFormModal.FieldGroup>
                      <input
                        id={`zod-phone-${String(i)}`}
                        aria-label={`Phone number ${String(i + 1)}`}
                        className={styles['input']}
                        type="tel"
                        required
                        minLength={10}
                        placeholder="e.g. 5141234567"
                        value={phone.number}
                        onChange={(e) => {
                          formFlowStore.values.phones.set(i, { number: e.target.value });
                          formFlowStore.errors.clear(phoneNumberKey(i));
                        }}
                      />
                      <span
                        className={styles['fieldHint']}
                        data-error={!isNullish(errors[phoneNumberKey(i)]) ? '' : undefined}
                      >
                        {errors[phoneNumberKey(i)] ?? 'At least 10 digits'}
                      </span>
                    </VanillaFormModal.FieldGroup>

                    <select
                      aria-label={`Phone type ${String(i + 1)}`}
                      className={styles['select']}
                      value={phone.label}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === 'home' || v === 'work' || v === 'mobile') {
                          formFlowStore.values.phones.set(i, { label: v });
                        }
                      }}
                    >
                      {PHONE_LABELS.map((l) => {
                        return (
                          <option key={l} value={l}>
                            {l.charAt(0).toUpperCase() + l.slice(1)}
                          </option>
                        );
                      })}
                    </select>

                    {values.phones.length > 1 && (
                      <button
                        className={styles['removeBtn']}
                        type="button"
                        aria-label={`Remove phone ${String(i + 1)}`}
                        onClick={() => {
                          formFlowStore.values.phones.remove(i);
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}

              {errors['phones'] && (
                <span className={styles['fieldHint']} data-error="">
                  {errors['phones']}
                </span>
              )}

              <button
                className={styles['addBtn']}
                type="button"
                onClick={() => {
                  formFlowStore.values.phones.add();
                }}
              >
                + Add Phone
              </button>
            </Shared.Section>
          </VanillaFormModal.Content>

          <VanillaFormModal.Footer>
            <Shared.Button {...action('cancel')}>Cancel</Shared.Button>
            <Shared.Button
              variant="primary"
              {...action('submit', async (close) => {
                const validation = formFlowStore.validate();
                if (!validation.success) {
                  return;
                }
                await simulateApiCall('create account', 1000);
                close(validation.data);
              })}
            >
              Create Account
            </Shared.Button>
          </VanillaFormModal.Footer>
        </VanillaFormModal.DefaultLayout>
      );
    },
    onClose: (closeResult) => {
      if (closeResult.reason === 'submit' && closeResult.data) {
        const { name, username, address, phones } = closeResult.data;
        formFlowStore.setResult(
          `${name} (@${username}) · ${address.city}, ${address.country} · ${String(phones.length)} phone(s)`
        );
      } else {
        formFlowStore.setResult(`Closed: ${closeResult.reason}`);
      }
    },
  });

  return (
    <ExampleLayout result={result} modals={formModal.Modal}>
      <Button
        variant="contained"
        size="small"
        onClick={() => {
          void formModal.open();
        }}
      >
        Open Zod Form
      </Button>
    </ExampleLayout>
  );
}
