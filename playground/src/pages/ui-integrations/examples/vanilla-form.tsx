import { ExampleLayout } from '@/entities/example/ui/ExampleLayout';
import * as VanillaFormModal from '@/entities/modal-template/ui/vanilla/form-modal';
import * as Shared from '@/entities/modal-template/ui/vanilla/shared';
import { createImmerStore } from '@/shared/lib/immer-store';
import { simulateApiCall } from '@/shared/lib/simulate-api-call';
import { Button } from '@mui/material';
import { defineAction, useModal, useModalActions, useStore } from 'umbra/react';

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

  const actions = useModalActions({
    cancel: defineAction(),
    submit: defineAction<FormValues>(),
  });

  // No type argument: `defineAction<FormValues>()` already said what this modal closes with,
  // and it reaches the hook through `actions`.
  const formModal = useModal({
    id: MODAL_ID,
    actions,
    onOpen: () => {
      store.resetForm();
    },
    render: () => {
      return (
        <VanillaFormModal.DefaultLayout style={{ minWidth: 475, maxWidth: 800, maxHeight: '70vh' }}>
          <VanillaFormModal.Header>
            <Shared.Heading>Create User</Shared.Heading>
            <Shared.Detail>Fill out the form below to create a new user account.</Shared.Detail>
            {actions.error && (
              <Shared.Alert title="Error" severity="error">
                {actions.error.message}
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
            <Shared.Button {...actions.cancel()}>Cancel</Shared.Button>
            <Shared.Button
              variant="primary"
              {...actions.submit(async (close) => {
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

                await simulateApiCall('submit form', 1000);
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
