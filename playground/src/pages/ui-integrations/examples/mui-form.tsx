import { ExampleLayout } from '@/entities/example/ui/ExampleLayout';
import { FormModal } from '@/entities/modal-template/ui/mui/form-modal';
import * as Shared from '@/entities/modal-template/ui/mui/shared';
import { FormHelperText, TextField } from '@mui/material';
import { createResultStore } from '@/shared/lib/createResultStore';
import { useForm } from '@/shared/lib/use-form';
import { useModal } from 'umbra/react';
import { useStore } from '@/shared/lib/use-store';

export const MODAL_ID = 'mui-form-example';

type FormValues = { name: string; email: string };

const resultStore = createResultStore();

/**
 * The same form as the vanilla card, and the comparison is the page.
 *
 * **Everything below the `useForm` call is markup.** The values, the messages, when a message is
 * allowed to appear, and the submit gate all live in `@/shared/lib/use-form` and are byte-for-byte
 * the same for both flavours — so what is left in this file is `TextField` where the other has
 * `<input>`, and nothing else. Before that helper existed each card carried its own store, its own
 * setters and its own copy of these validation strings, which meant the pair demonstrated two
 * implementations that happened to agree rather than one shared behaviour.
 *
 * `field('email')` returns plain DOM props, which is why MUI's `TextField` takes the whole set
 * spread onto it with no adapter — the same trick the library's own `action(reason)` uses.
 */
export function MuiFormExample() {
  const { result } = useStore(resultStore);

  const form = useForm<FormValues>({
    id: MODAL_ID,
    initialValues: { name: '', email: '' },
    // The domain rule, and deliberately not shared: the mechanism belongs in `shared/lib`, what
    // counts as a valid user belongs to the example, where a reader of "View Code" can see it.
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

  // The payload and the reasons are declared here, once: `action('submmit')` would not compile,
  // and the `switch` in `onClose` is exhaustive.
  const formModal = useModal<FormValues, 'cancel' | 'submit'>({
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
            <TextField
              fullWidth
              label="Name"
              {...form.field('name')}
              error={form.errors.name !== undefined}
            />
            {/* Rendered under the id `field()` pointed `aria-describedby` at, so the message is
                announced rather than merely shown. MUI's own `helperText` would render its own id
                and the reference would resolve to nothing. */}
            {form.errors.name !== undefined && (
              <FormHelperText error id={form.errorId('name')}>
                {form.errors.name}
              </FormHelperText>
            )}

            <TextField
              fullWidth
              label="Email"
              type="email"
              {...form.field('email')}
              error={form.errors.email !== undefined}
            />
            {form.errors.email !== undefined && (
              <FormHelperText error id={form.errorId('email')}>
                {form.errors.email}
              </FormHelperText>
            )}
          </FormModal.Content>

          <FormModal.Footer>
            <Shared.Button variant="outlined" {...action('cancel')}>
              Cancel
            </Shared.Button>
            <Shared.Button
              variant="contained"
              {...action('submit', async (close) => {
                // `submit` runs the validator and calls back only if nothing is wrong, so the
                // early return that used to sit here — and its copy in the vanilla card — is gone.
                // An action whose handler never calls `close` leaves the modal open, which is
                // exactly what a failed validation wants.
                await form.submit(async (values) => {
                  // Deterministic: this page's subject is the same hooks wearing two different
                  // UIs, and a submit that fails a third of the time makes that comparison a
                  // coin toss. The error states are demonstrated on the Modal Actions page.
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
        closeResult.reason === 'submit' && closeResult.data
          ? `User created: ${closeResult.data.name} (${closeResult.data.email})`
          : `Form closed with reason: ${closeResult.reason}`
      );
    },
  });

  return (
    <ExampleLayout result={result} modals={formModal.Modal}>
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
