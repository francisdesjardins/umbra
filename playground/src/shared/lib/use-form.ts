import { useState } from 'react';
import { createStore } from 'umbra/react';
import { useStore } from './use-store';

// ── A form, small enough to read ──────────────────────────────────────────────
// A stand-in, not a form library — no schema, resolver, field array, uncontrolled mode or ref
// registration; wanting any of those means wanting React Hook Form. It exists so `/ui-integrations`
// can claim the same hook wears two UIs: with the logic shared, the MUI and vanilla forms differ
// only in what they render rather than being two implementations that happen to agree.

/**
 * The keys whose value is a `string`, and therefore the only ones {@link Form.field} can serve.
 *
 * A text input's props are honest to produce, where a checkbox wants `checked`, a number input a
 * parse and a date picker whatever that library decided — inventing one shape for all of them is
 * where a form helper becomes React Hook Form. So `field(name)` is a type error on a non-string
 * field and everything else goes through {@link Form.set}, which asks for the value in its own
 * type: the same narrowing the library does with `ActionReason<TReason>`.
 */
export type TextKeys<TValues> = {
  [K in keyof TValues]: TValues[K] extends string ? K : never;
}[keyof TValues] &
  string;

/**
 * One message per invalid field, keyed by any field — not only the text ones. Spelled with the
 * `| undefined` suffix rather than `Partial<Record<…>>` because under `exactOptionalPropertyTypes`
 * a validator returning `{ email: undefined }` for a valid field does not satisfy a plain
 * `Partial`.
 */
export type FieldErrors<TValues> = {
  readonly [K in keyof TValues & string]?: string | undefined;
};

/** Given the current values, say which fields are wrong. Called on submit and on blur. */
export type FormValidator<TValues> = (values: TValues) => FieldErrors<TValues>;

/**
 * What a control needs, as plain DOM props — the same shape `action(reason)` returns. Every field
 * is a DOM attribute or event, so MUI's `TextField` and a bare `<input>` both take the whole set
 * spread onto them with no adapter, which is what lets the two examples differ only in markup.
 */
export type FieldProps = {
  readonly name: string;
  readonly value: string;
  readonly onChange: (event: { readonly target: { readonly value: string } }) => void;
  readonly onBlur: () => void;
  /** Present only while the field is showing an error, so a clean field announces nothing. */
  readonly 'aria-invalid': boolean;
  /** The id of the element rendering this field's message — see {@link Form.errorId}. */
  readonly 'aria-describedby': string | undefined;
};

export type Form<TValues> = {
  /** The current values. Controlled: the caller renders them and nothing else holds them. */
  readonly values: TValues;
  /**
   * The messages to render, which is **not** everything `validate` returned: a message appears once
   * its field has been changed *and* blurred, or once a submit was attempted. Flagging an email on
   * the third character is true and useless; flagging an untouched field — blurred because a button
   * press moved focus off whatever the dialog autofocused — is the form complaining about itself.
   */
  readonly errors: FieldErrors<TValues>;
  /** The props for one text field, ready to spread. Not available on other value types. */
  readonly field: (name: TextKeys<TValues>) => FieldProps;
  /**
   * Set any field, including the ones `field` refuses — a checkbox calls `set('agree', checked)`
   * and renders itself, so nothing here had to guess what a checkbox's props look like.
   */
  readonly set: <K extends keyof TValues>(name: K, value: TValues[K]) => void;
  /** The id this field's message must be rendered under, so `aria-describedby` resolves. */
  readonly errorId: (name: keyof TValues & string) => string;
  /**
   * Validate, then run `onValid` only if nothing is wrong. Returns a promise so an async `onValid`
   * can be awaited: an action handler stays "running" for as long as the promise it returns, which
   * is what keeps a submit button disabled while the work happens.
   */
  readonly submit: (onValid: (values: TValues) => void | Promise<void>) => Promise<void>;
  /** Back to the initial values, with every message and every blur forgotten. */
  readonly reset: () => void;
};

/**
 * @param id - Prefix for the generated error-element ids, so two forms on one page do not collide.
 * @param initialValues - Also what `reset` returns to.
 * @param validate - Pure: values in, messages out. Called on blur and on submit.
 */
export function useForm<TValues extends Record<string, unknown>>({
  id,
  initialValues,
  validate,
}: {
  readonly id: string;
  readonly initialValues: TValues;
  readonly validate: FormValidator<TValues>;
}): Form<TValues> {
  // The library's own cell, not `useState`: a reader can `select` one field and re-render on that
  // alone, and a test can drive the store with no renderer. Per hook call, not module scope, so two
  // forms on one page are two forms rather than one shared draft.
  const [store] = useState(() => {
    return createStore(
      { values: initialValues, shown: new Set<string>(), changed: new Set<string>() },
      {
        builder: ({ set }) => {
          return {
            change(name: string, value: unknown) {
              set((s) => {
                return {
                  ...s,
                  values: { ...s.values, [name]: value },
                  changed: new Set(s.changed).add(name),
                };
              });
            },
            /** Let these fields show their message from now on. */
            reveal(names: readonly string[]) {
              set((s) => {
                const shown = new Set(s.shown);
                for (const name of names) {
                  shown.add(name);
                }
                return { ...s, shown };
              });
            },
            clear() {
              set({ values: initialValues, shown: new Set(), changed: new Set() });
            },
          };
        },
      }
    );
  });

  const { values, shown, changed } = useStore(store);

  const found = validate(values);
  // Copied rather than `Object.fromEntries` + a cast: the keys come from the validator's output so
  // they are keys of `TValues` by construction, and `Object.assign` says so without an `as`.
  const errors: FieldErrors<TValues> = {};
  for (const [name, message] of Object.entries(found)) {
    if (message !== undefined && shown.has(name)) {
      Object.assign(errors, { [name]: message });
    }
  }

  const errorId = (name: keyof TValues & string): string => {
    return `${id}-${name}-error`;
  };

  return {
    values,
    errors,
    errorId,

    set: (name, value) => {
      store.change(String(name), value);
    },

    field: (name) => {
      const message = errors[name];
      return {
        name,
        // Narrowed by `TextKeys` at the call site, so the constraint is taken on trust here alone
        // rather than cast at every consumer.
        value: values[name] as string,
        onChange: (event) => {
          store.change(name, event.target.value);
        },
        onBlur: () => {
          // Only once they have typed: leaving an untouched field — what any button press does to
          // the one the dialog autofocused — is named at submit, not here.
          if (changed.has(name)) {
            store.reveal([name]);
          }
        },
        'aria-invalid': message !== undefined,
        // Omitted, not empty, when clean: a describedby pointing at an unrendered element is a
        // reference a screen reader resolves to nothing.
        'aria-describedby': message === undefined ? undefined : errorId(name),
      };
    },

    submit: async (onValid) => {
      const problems = validate(values);
      // Filtered on the value, not counted by key: a validator returns `{ email: undefined }` for a
      // field that is fine, and `Object.keys` counts that as a problem, so a clean form never
      // submits.
      const names = Object.entries(problems)
        .filter(([, message]) => {
          return message !== undefined;
        })
        .map(([name]) => {
          return name;
        });
      if (names.length > 0) {
        // Every wrong field at once: a submit says the user is finished, so one problem at a time
        // would be three round trips.
        store.reveal(names);
        return;
      }
      await onValid(values);
    },

    reset: () => {
      store.clear();
    },
  };
}
