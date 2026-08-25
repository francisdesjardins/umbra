import Alert from '@mui/material/Alert';
import { AppButton } from '@/shared/ui/AppButton';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { ExampleLayout } from '@/entities/example';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { type Theme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { createResultStore } from '@/shared/lib/createResultStore';
import { useForm } from '@/shared/lib/use-form';
import { useDialog } from 'umbra/react';
import { useStore } from '@/shared/lib/use-store';

export const MODAL_ID = 'mui-form-example';

export type FormValues = { name: string; email: string };

const resultStore = createResultStore();

/**
 * The same form as the vanilla card; the comparison is the page. Values, messages, their timing and
 * the submit gate are shared byte-for-byte from `@/shared/lib/use-form`, so only `TextField` and
 * `<input>` differ. `field('email')` returns plain DOM props, so the spread needs no adapter.
 *
 * **Written against MUI directly, with no template layer in between**, because the layer is what a
 * reader would otherwise have to learn first: the interesting part of this file is where the
 * library's DOM contract meets a component kit's props, and an indirection over that seam hides
 * exactly the line worth reading.
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
  const formDialog = useDialog({
    id: MODAL_ID,
    ariaLabelledBy: `${MODAL_ID}-title`,
    prepare: () => {
      form.reset();
    },
    render: ({ action, error }) => {
      // **The seam, and the reason this example is not templated.** The library ships the running
      // state as the DOM attribute `data-loading`, because a core agnostic of the UI cannot know
      // your kit's word for it — MUI says `loading`, another says `busy`, a third has nothing. So
      // the mapping is one line, here, in the only place that knows the answer.
      //
      // **Read, not removed.** The props are spread whole and `loading` is derived beside them, so
      // the attribute still reaches the DOM: it is the documented styling contract
      // (`button[data-loading='true'] { … }`) and the only form the library ships the state in.
      // Destructuring it out maps the flag and silently drops the hook — measured, by taking it
      // away and finding no attribute on the rendered button.
      //
      // Reading it here is safe *in React*, where `action()` runs again on every render. Its live
      // fields are getters for the benefit of a fine-grained renderer; under Solid, pulling one out
      // into a `const` would freeze it.
      const submit = action('submit', async (close) => {
        // `submit` calls back only if nothing is wrong, and no `close` keeps the modal open.
        await form.submit(async (values) => {
          // Deterministic, so the two-UI comparison is not a coin toss.
          await new Promise((resolve) => {
            setTimeout(resolve, 700);
          });
          close(values);
        });
      });

      return (
        <Box
          sx={{
            minWidth: 'min(475px, 100%)',
            maxWidth: 'min(800px, 100%)',
            maxHeight: '70vh',
            borderRadius: 2,
            p: 3,
            /**
             * The border drawn inside the box rather than on its edge — `src/CLAUDE.md`'s "move the
             * border inward". A `<dialog>` keeps the UA's `fit-content` and centres with
             * `margin: auto`, so its box lands on a fractional pixel (measured: top 300.734, bottom
             * 599.25, shared exactly by this element); a 1px `border` then occupies that last
             * fraction and the compositor keeps what it likes of it, which lost the bottom edge
             * while the sides were fine. An inset shadow paints inside the border box, on whole
             * pixels regardless.
             */
            boxShadow: (theme: Theme) => {
              return `inset 0 0 0 1px ${theme.palette.divider}`;
            },
            backgroundColor: 'var(--dialog-bg)',
            backgroundImage: 'none',
          }}
        >
          <Stack
            spacing={2}
            component="form"
            onSubmit={(event) => {
              // Nothing here submits to a server; the action buttons own the outcome.
              event.preventDefault();
            }}
          >
            <Box sx={{ mb: 2, '& > *': { display: 'block' } }}>
              <Typography id={`${MODAL_ID}-title`} variant="h6" color="text.primary">
                Create User
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Fill out the form below to create a new user account.
              </Typography>
              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error.message}
                </Alert>
              )}
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* `helperText`, not our own element — the flavour difference the page exists to show.
                  MUI owns `aria-describedby` on the input and ignores one handed to the wrapper
                  (measured: our id reached the root, the input announced nothing), so the
                  association is MUI's here and hand-made in the vanilla card. */}
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
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
              <Button variant="outlined" {...action('cancel')}>
                Cancel
              </Button>
              {/* `loading` disables the button itself, so no second `disabled` is needed. */}
              <Button variant="contained" {...submit} loading={submit['data-loading']}>
                Create User
              </Button>
            </Box>
          </Stack>
        </Box>
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
    <ExampleLayout result={result} modals={formDialog.Dialog}>
      {/* The shell's button, not MUI's: the trigger is the playground's chrome, and the two cards
          on this page must differ in the modal alone for the comparison to say anything. That MUI's
          button takes `action()`'s props is proven in the footer, where it matters. */}
      <AppButton
        variant="contained"
        size="small"
        onClick={() => {
          void formDialog.open();
        }}
      >
        Open MUI Form
      </AppButton>
    </ExampleLayout>
  );
}
