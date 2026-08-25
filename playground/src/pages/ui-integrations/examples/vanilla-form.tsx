import { AppButton } from '@/shared/ui/AppButton';
import { ExampleLayout } from '@/entities/example';
import * as Shared from '@/entities/modal-template/ui/vanilla/shared';
import buttonRowStyles from '@/entities/modal-template/ui/vanilla/shared/ButtonRow.module.css';
import { createResultStore } from '@/shared/lib/createResultStore';
import styles from '@/entities/modal-template/ui/vanilla/form-modal/styles.module.css';
import { useForm } from '@/shared/lib/use-form';
import { useDialog } from 'umbra/react';
import { useScrollRegion } from '@/entities/modal-template/ui/shared/scroll-region';
import { useStore } from '@/shared/lib/use-store';

export const MODAL_ID = 'vanilla-form-example';

export type FormValues = { name: string; email: string };

const resultStore = createResultStore();

/**
 * The same form as the MUI card; the diff between the two files is the page's subject. `useForm`
 * and `useDialog` are identical down to the validator; only markup differs — a bare `<input>` taking
 * `field('email')`'s plain DOM props with no adapter, and an error element the caller associates by
 * hand where MUI's `helperText` does it for you.
 *
 * **Written as plain elements over the template stylesheet**, so the file shows what a consumer
 * writes rather than what this repo happens to have factored out. Two things resist that and are
 * kept as imports rather than copied, because inlining either would teach the wrong lesson: the
 * scroll region's keyboard half, and the shared button row.
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

  /**
   * WCAG 2.1.1, and the reason this is a hook call rather than markup: a scroller with no focusable
   * child is keyboard-unreachable, Chromium and Firefox add the Tab stop and **WebKit does not**, so
   * the stop is declared. It is only applied while the content actually overflows, which takes a
   * measurement — hence a hook, called here in the component body, since the `render` callback below
   * runs inside another component's render pass and is no place for one.
   */
  const { ref: contentRef, regionProps } = useScrollRegion<HTMLDivElement>('Dialog content');

  // Same two type arguments as the MUI version; only the markup below differs.
  const formModal = useDialog({
    id: MODAL_ID,
    ariaLabelledBy: `${MODAL_ID}-title`,
    prepare: () => {
      form.reset();
    },
    render: ({ action, error }) => {
      return (
        <div
          className={styles['formLayout']}
          style={{ minWidth: 'min(475px, 100%)', maxWidth: 'min(800px, 100%)', maxHeight: '70vh' }}
        >
          <div className={styles['formHeader']}>
            <Shared.Heading id={`${MODAL_ID}-title`}>Create User</Shared.Heading>
            <Shared.Detail>Fill out the form below to create a new user account.</Shared.Detail>
            {error && (
              <Shared.Alert title="Error" severity="error">
                {error.message}
              </Shared.Alert>
            )}
          </div>

          <div className={styles['formContent']} ref={contentRef} {...regionProps}>
            <div className={styles['fieldGroup']}>
              <label htmlFor={`${MODAL_ID}-name`} className={styles['label']}>
                Name
              </label>
              {/* Spread, not enumerated: naming `id`/`type`/`value`/`onChange` by hand is how a
                  wrapper drops `onBlur`, `name`, `aria-invalid` and `aria-describedby` — losing
                  blur-time validation and the error association without anything failing. */}
              <input
                id={`${MODAL_ID}-name`}
                type="text"
                className={`${styles['input']}${form.errors.name === undefined ? '' : ` ${styles['error']}`}`}
                {...form.field('name')}
              />
              {/* The id `field()` pointed `aria-describedby` at; unrendered, it dangles. */}
              {form.errors.name !== undefined && (
                <div className={styles['fieldError']} id={form.errorId('name')}>
                  {form.errors.name}
                </div>
              )}
            </div>

            <div className={styles['fieldGroup']}>
              <label htmlFor={`${MODAL_ID}-email`} className={styles['label']}>
                Email
              </label>
              <input
                id={`${MODAL_ID}-email`}
                type="email"
                className={`${styles['input']}${form.errors.email === undefined ? '' : ` ${styles['error']}`}`}
                {...form.field('email')}
              />
              {form.errors.email !== undefined && (
                <div className={styles['fieldError']} id={form.errorId('email')}>
                  {form.errors.email}
                </div>
              )}
            </div>
          </div>

          {/* Two classes, and the outer one is not decoration: `buttonRow` owns the gap and the
              placement for every vanilla family, because one rule copied three ways drifted into
              three different gaps and a footer with no `display: flex` at all. */}
          <div className={`${buttonRowStyles['buttonRow']} ${styles['formFooter']}`}>
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
          </div>
        </div>
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
