import { ExampleLayout } from '@/entities/example/ui/ExampleLayout';
import { FormModal } from '@/entities/modal-template/ui/mui/form-modal';
import * as Shared from '@/entities/modal-template/ui/mui/shared';
import { createImmerStore } from '@/shared/lib/immer-store';
import { TextField } from '@mui/material';
import {
  asyncFulfilled,
  asyncIdle,
  asyncRejected,
  type AsyncState,
} from '@/shared/lib/async-state';
import { useModal } from 'umbra/react';
import { useStore } from '@/shared/lib/use-store';

export const MODAL_ID = 'mui-form-example';

type FormValues = { name: string; email: string };

type FormState = {
  submitResult: AsyncState<FormValues>;
  values: FormValues;
  errors: Partial<FormValues>;
};

const formInitial: FormState = {
  submitResult: asyncIdle,
  values: { name: '', email: '' },
  errors: {},
};

const store = createImmerStore(formInitial, (api) => {
  return {
    setValue(key: keyof FormValues, value: string) {
      api.update((d) => {
        d.values = { ...d.values, [key]: value };
        if (d.errors[key] !== undefined) {
          const { [key]: _removed, ...rest } = d.errors;
          d.errors = rest;
        }
      });
    },
    setErrors(errors: Partial<FormValues>) {
      api.update((d) => {
        d.errors = errors;
      });
    },
    resetForm() {
      api.reset();
    },
    setSubmitResult(result: AsyncState<FormValues>) {
      api.update((d) => {
        d.submitResult = result;
      });
    },
  };
});

export function MuiFormExample() {
  const { submitResult, values, errors } = useStore(store);

  // The payload and the reasons are declared here, once: `action('submmit')` would not compile,
  // and the `switch` in `onClose` is exhaustive.
  const formModal = useModal<FormValues, 'cancel' | 'submit'>({
    id: MODAL_ID,
    prepare: () => {
      store.resetForm();
    },
    render: ({ action, error }) => {
      return (
        <FormModal.DefaultLayout
          sx={{ minWidth: 'min(475px, 90vw)', maxWidth: 'min(800px, 92vw)', maxHeight: '70vh' }}
        >
          <FormModal.Header>
            <Shared.Heading>Create User</Shared.Heading>
            <Shared.Detail>Fill out the form below to create a new user account.</Shared.Detail>
            {error && (
              <Shared.AlertContent severity="error" sx={{ mt: 2 }}>
                {error.message}
              </Shared.AlertContent>
            )}
          </FormModal.Header>

          <FormModal.Content>
            <TextField
              fullWidth
              label="Name"
              value={values.name}
              onChange={(e) => {
                store.setValue('name', e.target.value);
              }}
              error={!!errors.name}
              helperText={errors.name}
            />

            <TextField
              fullWidth
              label="Email"
              type="email"
              value={values.email}
              onChange={(e) => {
                store.setValue('email', e.target.value);
              }}
              error={!!errors.email}
              helperText={errors.email}
            />
          </FormModal.Content>

          <FormModal.Footer>
            <Shared.Button variant="outlined" {...action('cancel')}>
              Cancel
            </Shared.Button>
            <Shared.Button
              variant="contained"
              {...action('submit', async (close) => {
                const snap = store.getSnapshot();
                const newErrors: Partial<FormValues> = {};
                if (!snap.values.name) {
                  newErrors.name = 'Name is required';
                }
                if (!snap.values.email) {
                  newErrors.email = 'Email is required';
                } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(snap.values.email)) {
                  newErrors.email = 'Invalid email format';
                }

                if (Object.keys(newErrors).length > 0) {
                  store.setErrors(newErrors);
                  return;
                }

                // Deterministic: this page's subject is the same hooks wearing two different
                // UIs, and a submit that fails a third of the time makes that comparison a
                // coin toss. The error states are demonstrated on the Modal Actions page.
                await new Promise((resolve) => {
                  setTimeout(resolve, 700);
                });
                close(snap.values);
              })}
            >
              Create User
            </Shared.Button>
          </FormModal.Footer>
        </FormModal.DefaultLayout>
      );
    },
    onClose: (closeResult) => {
      if (closeResult.reason === 'submit' && closeResult.data) {
        store.setSubmitResult(asyncFulfilled(closeResult.data));
      } else {
        store.setSubmitResult(asyncRejected(new Error(closeResult.reason)));
      }
    },
  });

  const resultMessage =
    submitResult.status === 'fulfilled'
      ? `User created: ${submitResult.data.name} (${submitResult.data.email})`
      : submitResult.status === 'rejected'
        ? `Form closed with reason: ${submitResult.error.message}`
        : null;

  return (
    <ExampleLayout result={resultMessage} modals={formModal.Modal}>
      <Shared.Button
        variant="contained"
        size="small"
        onClick={() => {
          void formModal.open();
        }}
      >
        Open MUI Form
      </Shared.Button>
    </ExampleLayout>
  );
}
