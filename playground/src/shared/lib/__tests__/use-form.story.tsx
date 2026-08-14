import { useState } from 'react';
import { useForm } from '../use-form';

type Values = { name: string; email: string; agree: boolean };

/**
 * A form with two text fields and one value `field()` refuses.
 *
 * The `agree` flag is not decoration: it is the case that proves the hook is generic over value
 * types while `field()` stays honest about only serving text. It is set through `set`, and the
 * checkbox renders itself.
 */
export function UseFormHarness() {
  // React state rather than a DOM write: the next render would overwrite anything poked
  // straight into the element, which is a harness bug that reads as a hook bug.
  const [submitted, setSubmitted] = useState('');

  const form = useForm<Values>({
    id: 'harness',
    initialValues: { name: '', email: '', agree: false },
    validate: (values) => {
      return {
        name: values.name ? undefined : 'Name is required',
        email: values.email.includes('@') ? undefined : 'Invalid email',
        agree: values.agree ? undefined : 'You must agree',
      };
    },
  });

  return (
    <div>
      <input data-testid="name" {...form.field('name')} />
      <div data-testid="name-error" id={form.errorId('name')}>
        {form.errors.name ?? ''}
      </div>

      <input data-testid="email" {...form.field('email')} />
      <div data-testid="email-error" id={form.errorId('email')}>
        {form.errors.email ?? ''}
      </div>

      <input
        data-testid="agree"
        type="checkbox"
        checked={form.values.agree}
        onChange={(event) => {
          form.set('agree', event.target.checked);
        }}
      />
      <div data-testid="agree-error">{form.errors.agree ?? ''}</div>

      <button
        data-testid="submit"
        onClick={() => {
          void form.submit((values) => {
            setSubmitted(values.email);
          });
        }}
        type="button"
      >
        Submit
      </button>
      <button
        data-testid="reset"
        onClick={() => {
          form.reset();
        }}
        type="button"
      >
        Reset
      </button>

      <div data-testid="submitted">{submitted}</div>
      <div data-testid="described-by">{form.field('email')['aria-describedby'] ?? 'none'}</div>
    </div>
  );
}
