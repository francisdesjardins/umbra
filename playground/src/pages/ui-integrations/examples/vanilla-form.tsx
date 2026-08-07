import { ExampleLayout } from '@/entities/example/ui/ExampleLayout';
import * as VanillaFormModal from '@/entities/modal-template/ui/vanilla/form-modal';
import * as Shared from '@/entities/modal-template/ui/vanilla/shared';
import { createImmerStore } from '@/shared/lib/immer-store';
import { Button } from '@mui/material';
import { useModal } from 'umbra/react';
import { useStore } from '@/shared/lib/use-store';

export const MODAL_ID = 'vanilla-form-example';

type FormValues = { name: string; email: string };

type FormState = {
  result: string | null;
  values: FormValues;
  errors: Partial<FormValues>;
};

const INITIAL_STATE: FormState = {
  result: null,
  values: { name: '', email: '' },
  errors: {},
};

const store = createImmerStore(INITIAL_STATE, (api) => {
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
    setResult(result: string | null) {
      api.update((d) => {
        d.result = result;
      });
    },
  };
});

export function VanillaFormExample() {
  const { result, values, errors } = useStore(store);

  // Same two type arguments as the MUI version above — the hooks are identical, only the markup
  // below differs. That is the whole point of this page.
  const formModal = useModal<FormValues, 'cancel' | 'submit'>({
    id: MODAL_ID,
    onOpen: () => {
      store.resetForm();
    },
    render: ({ action, error }) => {
      return (
        <VanillaFormModal.DefaultLayout
          style={{ minWidth: 'min(475px, 90vw)', maxWidth: 'min(800px, 92vw)', maxHeight: '70vh' }}
        >
          <VanillaFormModal.Header>
            <Shared.Heading>Create User</Shared.Heading>
            <Shared.Detail>Fill out the form below to create a new user account.</Shared.Detail>
            {error && (
              <Shared.Alert title="Error" severity="error">
                {error.message}
              </Shared.Alert>
            )}
          </VanillaFormModal.Header>
          <VanillaFormModal.Content>
            <VanillaFormModal.FieldGroup>
              <VanillaFormModal.Label htmlFor="name">Name</VanillaFormModal.Label>
              <VanillaFormModal.Input
                id="name"
                type="text"
                value={values.name}
                onChange={(e) => {
                  store.setValue('name', e.target.value);
                }}
                error={!!errors.name}
              />
              {errors.name && (
                <VanillaFormModal.FieldError>{errors.name}</VanillaFormModal.FieldError>
              )}
            </VanillaFormModal.FieldGroup>

            <VanillaFormModal.FieldGroup>
              <VanillaFormModal.Label htmlFor="email">Email</VanillaFormModal.Label>
              <VanillaFormModal.Input
                id="email"
                type="email"
                value={values.email}
                onChange={(e) => {
                  store.setValue('email', e.target.value);
                }}
                error={!!errors.email}
              />
              {errors.email && (
                <VanillaFormModal.FieldError>{errors.email}</VanillaFormModal.FieldError>
              )}
            </VanillaFormModal.FieldGroup>
          </VanillaFormModal.Content>
          <VanillaFormModal.Footer>
            <Shared.Button {...action('cancel')}>Cancel</Shared.Button>
            <Shared.Button
              variant="primary"
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
          </VanillaFormModal.Footer>
        </VanillaFormModal.DefaultLayout>
      );
    },
    onClose: (closeResult) => {
      if (closeResult.reason === 'submit' && closeResult.data) {
        store.setResult(`User created: ${closeResult.data.name} (${closeResult.data.email})`);
      } else {
        store.setResult(`Form closed with reason: ${closeResult.reason}`);
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
        Open Vanilla Form
      </Button>
    </ExampleLayout>
  );
}
