import { AppButton } from '@/shared/ui/AppButton';
import { ExampleLayout } from '@/entities/example';
import { FormModal } from '@/entities/modal-template/ui/mui/form-modal';
import * as Shared from '@/entities/modal-template/ui/mui/shared';
import TextField from '@mui/material/TextField';
import { createResultStore } from '@/shared/lib/createResultStore';
import { useForm } from '@/shared/lib/use-form';
import { useModal } from 'umbra/react';
import { useStore } from '@/shared/lib/use-store';

export const MODAL_ID = 'mui-form-example';

export type FormValues = { name: string; email: string };

const resultStore = createResultStore();

/**
 * The same form as the vanilla card; the comparison is the page. Values, messages, their timing and
 * the submit gate are shared byte-for-byte from `@/shared/lib/use-form`, so only `TextField` and
 * `<input>` differ. `field('email')` returns plain DOM props, so the spread needs no adapter.
 */
export function MuiFormExample() {
  const { result } = useStore(resultStore);

  const form = useForm<FormValues>({
    id: MODAL_ID,
    initialValues: { name: '', email: '' },
    // Not shared: the mechanism belongs in `shared/lib`, the domain rule to the example.
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

  // MUI wires `aria-describedby` from `helperText`; ours would dangle on the wrapper.
  const { 'aria-describedby': _nameDescribedBy, ...nameField } = form.field('name');
  const { 'aria-describedby': _emailDescribedBy, ...emailField } = form.field('email');

  // Payload and reasons once: `action('submmit')` would not compile, and `onClose` is exhaustive.
  const formModal = useModal({
    id: MODAL_ID,
    ariaLabelledBy: `${MODAL_ID}-title`,
    prepare: () => {
      form.reset();
    },
    render: ({ action, error }) => {
      return (
        <FormModal.DefaultLayout
          sx={{ minWidth: 'min(475px, 100%)', maxWidth: 'min(800px, 100%)', maxHeight: '70vh' }}
        >
          <FormModal.Header>
            <Shared.Heading id={`${MODAL_ID}-title`}>Create User</Shared.Heading>
            <Shared.Detail>Fill out the form below to create a new user account.</Shared.Detail>
            {error && (
              <Shared.AlertContent severity="error" sx={{ mt: 2 }}>
                {error.message}
              </Shared.AlertContent>
            )}
          </FormModal.Header>

          <FormModal.Content>
            {/* `helperText`, not our own element — the flavour difference the page exists to show.
                MUI owns `aria-describedby` on the input and ignores one handed to the wrapper
                (measured: our id reached the root, the input announced nothing), so the association
                is MUI's here and hand-made in the vanilla card. */}
            <TextField
              fullWidth
              label="Name"
              {...nameField}
              error={form.errors.name !== undefined}
              helperText={form.errors.name ?? ''}
            />

            <TextField
              fullWidth
              label="Email"
              type="email"
              {...emailField}
              error={form.errors.email !== undefined}
              helperText={form.errors.email ?? ''}
            />
          </FormModal.Content>

          <FormModal.Footer>
            <Shared.Button variant="outlined" {...action('cancel')}>
              Cancel
            </Shared.Button>
            <Shared.Button
              variant="contained"
              {...action('submit', async (close) => {
                // `submit` calls back only if nothing is wrong, and no `close` keeps the modal open.
                await form.submit(async (values) => {
                  // Deterministic, so the two-UI comparison is not a coin toss.
                  await new Promise((resolve) => {
                    setTimeout(resolve, 700);
                  });
                  close(values);
                });
              })}
            >
              Create User
            </Shared.Button>
          </FormModal.Footer>
        </FormModal.DefaultLayout>
      );
    },
    onClose: (closeResult) => {
      resultStore.setResult(
        closeResult.reason === 'submit'
          ? `User created: ${closeResult.data.name} (${closeResult.data.email})`
          : `Form closed with reason: ${closeResult.reason}`
      );
    },
  });

  return (
    <ExampleLayout result={result} modals={formModal.Modal}>
      {/* The shell's button, not MUI's: the trigger is the playground's chrome, and the two cards
          on this page must differ in the modal alone for the comparison to say anything. That MUI's
          button takes `action()`'s props is proven in the footer, where it matters. */}
      <AppButton
        variant="contained"
        size="small"
        onClick={() => {
          void formModal.open();
        }}
      >
        Open MUI Form
      </AppButton>
    </ExampleLayout>
  );
}
