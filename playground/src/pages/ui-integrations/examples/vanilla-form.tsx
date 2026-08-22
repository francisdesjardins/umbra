import { AppButton } from '@/shared/ui/AppButton';
import { ExampleLayout } from '@/entities/example';
import * as VanillaFormModal from '@/entities/modal-template/ui/vanilla/form-modal';
import * as Shared from '@/entities/modal-template/ui/vanilla/shared';
import { createResultStore } from '@/shared/lib/createResultStore';
import { useForm } from '@/shared/lib/use-form';
import { useModal } from 'umbra/react';
import { useStore } from '@/shared/lib/use-store';

export const MODAL_ID = 'vanilla-form-example';

export type FormValues = { name: string; email: string };

const resultStore = createResultStore();

/**
 * The same form as the MUI card; the diff between the two files is the page's subject. `useForm`
 * and `useModal` are identical down to the validator; only markup differs — `VanillaFormModal.Input`
 * for `TextField`, `FieldError` for `FormHelperText`, a bare `<input>` taking `field('email')`'s
 * plain DOM props with no adapter.
 */
export function VanillaFormExample() {
  const { result } = useStore(resultStore);

  const form = useForm<FormValues>({
    id: MODAL_ID,
    initialValues: { name: '', email: '' },
    validate: (values) => {
      return {
        name: values.name ? undefined : 'Name is required',
        email: !values.email
          ? 'Email is required'
          : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)
            ? undefined
            : 'Invalid email format',
      };
    },
  });

  // Same two type arguments as the MUI version; only the markup below differs.
  const formModal = useModal({
    id: MODAL_ID,
    ariaLabelledBy: `${MODAL_ID}-title`,
    prepare: () => {
      form.reset();
    },
    render: ({ action, error }) => {
      return (
        <VanillaFormModal.DefaultLayout
          style={{ minWidth: 'min(475px, 100%)', maxWidth: 'min(800px, 100%)', maxHeight: '70vh' }}
        >
          <VanillaFormModal.Header>
            <Shared.Heading id={`${MODAL_ID}-title`}>Create User</Shared.Heading>
            <Shared.Detail>Fill out the form below to create a new user account.</Shared.Detail>
            {error && (
              <Shared.Alert title="Error" severity="error">
                {error.message}
              </Shared.Alert>
            )}
          </VanillaFormModal.Header>
          <VanillaFormModal.Content>
            <VanillaFormModal.FieldGroup>
              <VanillaFormModal.Label htmlFor={`${MODAL_ID}-name`}>Name</VanillaFormModal.Label>
              <VanillaFormModal.Input
                id={`${MODAL_ID}-name`}
                type="text"
                {...form.field('name')}
                error={form.errors.name !== undefined}
              />
              {/* The id `field()` pointed `aria-describedby` at; unrendered, it dangles. */}
              {form.errors.name !== undefined && (
                <VanillaFormModal.FieldError id={form.errorId('name')}>
                  {form.errors.name}
                </VanillaFormModal.FieldError>
              )}
            </VanillaFormModal.FieldGroup>

            <VanillaFormModal.FieldGroup>
              <VanillaFormModal.Label htmlFor={`${MODAL_ID}-email`}>Email</VanillaFormModal.Label>
              <VanillaFormModal.Input
                id={`${MODAL_ID}-email`}
                type="email"
                {...form.field('email')}
                error={form.errors.email !== undefined}
              />
              {form.errors.email !== undefined && (
                <VanillaFormModal.FieldError id={form.errorId('email')}>
                  {form.errors.email}
                </VanillaFormModal.FieldError>
              )}
            </VanillaFormModal.FieldGroup>
          </VanillaFormModal.Content>
          <VanillaFormModal.Footer>
            <Shared.Button {...action('cancel')}>Cancel</Shared.Button>
            <Shared.Button
              variant="primary"
              {...action('submit', async (close) => {
                await form.submit(async (values) => {
                  await new Promise((resolve) => {
                    setTimeout(resolve, 700);
                  });
                  close(values);
                });
              })}
            >
              Create User
            </Shared.Button>
          </VanillaFormModal.Footer>
        </VanillaFormModal.DefaultLayout>
      );
    },
    onClose: (closeResult) => {
      resultStore.setResult(
        closeResult.reason === 'submit' && closeResult.data
          ? `User created: ${closeResult.data.name} (${closeResult.data.email})`
          : `Form closed with reason: ${closeResult.reason}`
      );
    },
  });

  return (
    <ExampleLayout result={result} modals={formModal.Modal}>
      <AppButton
        variant="contained"
        size="small"
        onClick={() => {
          void formModal.open();
        }}
      >
        Open Vanilla Form
      </AppButton>
    </ExampleLayout>
  );
}
